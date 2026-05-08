/**
 * `/api/founder-intake/personas` — Q7 persona synthesis.
 *
 * POST body: `{ subjectId: string }`
 *      returns: `{ ok, founder, company, providerId, modelId,
 *                  runtimeMode, generatedAt }`
 *
 * GET  query: `?subjectId=...`
 *      returns: `{ ok, founder?, company? }` — most-recent non-archived
 *      pair for the subject, or `null`s if none exist yet.
 *
 * # Gating
 *
 * Synthesis is gated on `completenessScore >= 80` (matches the FinalCTA
 * threshold in `IntakeForm`). Founders who haven't reached that level
 * receive a 422 with the current score so the UI can render a helpful
 * "fill more first" hint rather than a generic error.
 *
 * # Persistence
 *
 * New synthesis runs are APPENDED, not overwritten — the founder can
 * compare versions across regenerations. `isArchived` lets ops soft-
 * delete bad synthesis runs without losing audit history.
 *
 * # Auth + rate-limit
 *
 * Pre-Clerk stub session like the rest of Q1–Q6. 3 syntheses / 5 min
 * per client — synthesis is expensive (full cascade) and shouldn't be
 * spammed; the front-end debounces to once-per-click anyway.
 */
import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";
import { rateLimit } from "@/lib/rate-limit";
import {
  QUANTARA_VERTICAL_BY_ID,
  QUANTARA_VERTICALS,
  readSupplementaryFromQuantaraJson,
  readVerticalFromQuantaraJson,
  synthesizePersonas,
  valuationSubjectToQuantara,
  type PersonaSynthesisContext,
  type QuantaraValuationSubjectShape,
  type VerticalId,
} from "@/lib/quantara";
import { QUANTARA_FIELDS_BY_ID } from "@/lib/quantara/schema";
import {
  QUANTARA_SUPPLEMENTARY_BY_ID,
  getSupplementaryFieldsForRound,
} from "@/lib/quantara/metamorphic";
import { QUANTARA_VERTICAL_FIELDS_BY_ID } from "@/lib/quantara/metamorphic/vertical-schedules";
import { overallCompleteness } from "@/components/quantara/completeness";

const SYNTHESIS_GATE_PERCENT = 80 as const;

interface PostBody {
  subjectId?: unknown;
}

function badRequest(message: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

// ─────────────────────────────────────────────────────────────────────
// POST — synthesize a fresh founder + company persona pair.
// ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 3,
    windowMs: 5 * 60_000,
    prefix: "founder-intake-personas-write",
  });
  if (limited) return limited;

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return badRequest("Invalid JSON body");
  }

  const subjectId =
    typeof body.subjectId === "string" ? body.subjectId : undefined;
  if (!subjectId) return badRequest("subjectId is required");

  let userId: string;
  try {
    const session = await getAuthSession();
    if (!session.userId) return badRequest("Unauthorized", 401);
    userId = session.userId;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Auth unavailable";
    return badRequest(msg, 503);
  }

  try {
    const subject = await prisma.valuationSubject.findFirst({
      where: { id: subjectId, userId, isArchived: false },
      select: subjectSelect,
    });
    if (!subject) return badRequest("Subject not found", 404);

    const shape = toShape(subject);
    const values = valuationSubjectToQuantara(shape);
    const summary = overallCompleteness(values);
    if (summary.percent < SYNTHESIS_GATE_PERCENT) {
      return NextResponse.json(
        {
          ok: false,
          error: `Persona synthesis is gated on ≥ ${SYNTHESIS_GATE_PERCENT}% completeness. Current: ${summary.percent}%.`,
          completenessScore: summary.percent,
        },
        { status: 422 },
      );
    }

    const supplementaryValues = readSupplementaryFromQuantaraJson(
      shape.quantaraJson ?? null,
    );
    const verticalValues = readVerticalFromQuantaraJson(
      shape.quantaraJson ?? null,
    );

    const targetRoundType =
      typeof values.f23 === "string" ? values.f23 : undefined;
    const verticalId: VerticalId | undefined =
      typeof subject.sector === "string" &&
      subject.sector in QUANTARA_VERTICAL_BY_ID
        ? (subject.sector as VerticalId)
        : undefined;

    /* Build the prompt context — flat label/value pairs. Skip empty
       string values so the model isn't asked to reason over noise. */
    const facts: Array<{ label: string; value: string }> = [];
    for (const [fieldId, raw] of Object.entries(values) as Array<
      [keyof typeof QUANTARA_FIELDS_BY_ID, unknown]
    >) {
      if (raw === undefined || raw === null) continue;
      const def = QUANTARA_FIELDS_BY_ID[fieldId];
      if (!def) continue;
      const value = formatValue(raw);
      if (!value) continue;
      facts.push({ label: def.label, value });
    }
    /* Q5 supplementary — only the active round's entries. */
    if (targetRoundType) {
      const supForRound = supplementaryValues[targetRoundType as never];
      if (supForRound) {
        for (const [fieldId, raw] of Object.entries(supForRound)) {
          if (raw === undefined || raw === null) continue;
          const def = QUANTARA_SUPPLEMENTARY_BY_ID[
            fieldId as keyof typeof QUANTARA_SUPPLEMENTARY_BY_ID
          ];
          if (!def) continue;
          const value = formatValue(raw);
          if (!value) continue;
          facts.push({ label: `[${targetRoundType}] ${def.label}`, value });
        }
      }
      /* Touch helper to keep the function visible; real consumer is
         the prompt-context build above. */
      void getSupplementaryFieldsForRound;
    }
    /* Q6 vertical — only the active vertical's entries. */
    if (verticalId && verticalId !== "generic") {
      const verForVertical = verticalValues[verticalId];
      if (verForVertical) {
        const verticalLabel =
          QUANTARA_VERTICAL_BY_ID[verticalId]?.label ?? verticalId;
        for (const [fieldId, raw] of Object.entries(verForVertical)) {
          if (raw === undefined || raw === null) continue;
          const def = QUANTARA_VERTICAL_FIELDS_BY_ID[
            fieldId as keyof typeof QUANTARA_VERTICAL_FIELDS_BY_ID
          ];
          if (!def) continue;
          const value = formatValue(raw);
          if (!value) continue;
          facts.push({ label: `[${verticalLabel}] ${def.label}`, value });
        }
      }
      /* Touch helper to keep the descriptor list referenced. */
      void QUANTARA_VERTICALS;
    }

    const ctx: PersonaSynthesisContext = {
      companyName: subject.companyName,
      targetRoundType,
      verticalId,
      facts,
    };

    const result = await synthesizePersonas(ctx, userId);

    /* Persist both records in parallel. Both share the same
       valuationSubjectId + userId + runtimeMode + modelTrail so they
       audit together. */
    const [founderRow, companyRow] = await Promise.all([
      prisma.founderPersona.create({
        data: {
          userId,
          valuationSubjectId: subjectId,
          summary: result.founder.summary,
          narrativeAngle: result.founder.narrativeAngle,
          strengthsJson: asJson({
            strengths: result.founder.strengths,
            workingStyle: result.founder.workingStyle,
            archetype: result.founder.archetype,
            riskTolerance: result.founder.riskTolerance,
          }),
          gapsJson: asJson({
            gaps: result.founder.gaps,
            openQuestions: result.founder.openQuestions,
          }),
          personaSchemaVersion: result.schemaVersion,
          modelTrailJson: asJson({
            providerId: result.providerId,
            modelId: result.modelId,
            attempts: result.attempts,
          }),
          runtimeMode: result.runtimeMode,
        },
        select: { id: true, generatedAt: true },
      }),
      prisma.companyPersona.create({
        data: {
          userId,
          valuationSubjectId: subjectId,
          summary: result.company.summary,
          positioning: result.company.positioning,
          tractionStory: result.company.tractionStory,
          differentiatorsJson: asJson({
            differentiators: result.company.differentiators,
            idealCustomer: result.company.idealCustomer,
            defensibility: result.company.defensibility,
          }),
          watchOutsJson: asJson({
            watchOuts: result.company.watchOuts,
            openQuestions: result.company.openQuestions,
          }),
          personaSchemaVersion: result.schemaVersion,
          modelTrailJson: asJson({
            providerId: result.providerId,
            modelId: result.modelId,
            attempts: result.attempts,
          }),
          runtimeMode: result.runtimeMode,
        },
        select: { id: true, generatedAt: true },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      founder: { ...result.founder, id: founderRow.id, generatedAt: founderRow.generatedAt },
      company: { ...result.company, id: companyRow.id, generatedAt: companyRow.generatedAt },
      providerId: result.providerId,
      modelId: result.modelId,
      runtimeMode: result.runtimeMode,
    });
  } catch (err) {
    console.error("[api/founder-intake/personas POST] Error:", err);
    return badRequest("Persona synthesis failed", 500);
  }
}

// ─────────────────────────────────────────────────────────────────────
// GET — return the most-recent persona pair for a subject.
// ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 30,
    windowMs: 60_000,
    prefix: "founder-intake-personas-read",
  });
  if (limited) return limited;

  const subjectId = request.nextUrl.searchParams.get("subjectId");
  if (!subjectId) return badRequest("subjectId is required");

  let userId: string;
  try {
    const session = await getAuthSession();
    if (!session.userId) return badRequest("Unauthorized", 401);
    userId = session.userId;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Auth unavailable";
    return badRequest(msg, 503);
  }

  try {
    const [founder, company] = await Promise.all([
      prisma.founderPersona.findFirst({
        where: { userId, valuationSubjectId: subjectId, isArchived: false },
        orderBy: { generatedAt: "desc" },
      }),
      prisma.companyPersona.findFirst({
        where: { userId, valuationSubjectId: subjectId, isArchived: false },
        orderBy: { generatedAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      founder: founder ?? null,
      company: company ?? null,
    });
  } catch (err) {
    console.error("[api/founder-intake/personas GET] Error:", err);
    return badRequest("Persona fetch failed", 500);
  }
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

const subjectSelect = {
  id: true,
  companyName: true,
  sector: true,
  financialDataJson: true,
  qualitativeJson: true,
  ipDataJson: true,
  marketDataJson: true,
  capitalDataJson: true,
  fundingDataJson: true,
  quantaraJson: true,
} as const;

interface SubjectRow {
  id: string;
  companyName: string;
  sector: string | null;
  financialDataJson: unknown;
  qualitativeJson: unknown;
  ipDataJson: unknown;
  marketDataJson: unknown;
  capitalDataJson: unknown;
  fundingDataJson: unknown;
  quantaraJson: unknown;
}

function toShape(row: SubjectRow): QuantaraValuationSubjectShape {
  return {
    companyName: row.companyName,
    sector: row.sector,
    financialDataJson: row.financialDataJson as
      | Record<string, unknown>
      | null
      | undefined,
    qualitativeJson: row.qualitativeJson as
      | Record<string, unknown>
      | null
      | undefined,
    ipDataJson: row.ipDataJson as Record<string, unknown> | null | undefined,
    marketDataJson: row.marketDataJson as
      | Record<string, unknown>
      | null
      | undefined,
    capitalDataJson: row.capitalDataJson as
      | Record<string, unknown>
      | null
      | undefined,
    fundingDataJson: row.fundingDataJson as
      | Record<string, unknown>
      | null
      | undefined,
    quantaraJson: row.quantaraJson as
      | Record<string, unknown>
      | null
      | undefined,
  };
}

/**
 * Format a stored value for the synthesis prompt. Returns an empty
 * string for unsupported shapes so the caller can skip them.
 */
function formatValue(raw: unknown): string {
  if (raw === undefined || raw === null) return "";
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return String(raw);
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : "";
  }
  if (typeof raw === "boolean") {
    return raw ? "yes" : "no";
  }
  if (Array.isArray(raw)) {
    return raw
      .filter((v) => typeof v === "string" || typeof v === "number")
      .join(", ");
  }
  return "";
}
