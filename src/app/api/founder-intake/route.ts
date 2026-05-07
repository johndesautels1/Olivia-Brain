/**
 * `/api/founder-intake` — Quantara intake save / load route.
 *
 * Track Q Session Q2. Persists the 56-field founder-valuation intake
 * payload onto `ValuationSubject` using the round-trip helpers
 * canonicalised in Q1 (`src/lib/quantara/field-mapping.ts`):
 *
 *   - `quantaraToValuationSubject(values)` projects Quantara values
 *     into engine-shaped JSON columns.
 *   - `mergeQuantaraIntoSubject(current, values)` preserves untouched
 *     subkeys (e.g. existing engine-only `ebitdaMarginPct` written by
 *     Track V routes) — partial saves don't clobber the rest of the
 *     subject's JSON columns.
 *
 * # Auth (pre-Clerk)
 *
 * `getAuthSession()` returns a stub-tier session reading
 * `process.env.STUB_USER_ID` in dev/preview. Track F Session 18 wires
 * Clerk and replaces the session helper body in one line — route code
 * stays identical.
 *
 * # Endpoints
 *
 * - `POST /api/founder-intake` — create-or-update by `(userId, companyName)`.
 *   Body: `{ companyName, values: QuantaraValues, subjectId? }`.
 *   Returns: `{ ok, subjectId, completenessScore, fieldsFilled, fieldsTotal }`.
 * - `GET /api/founder-intake?subjectId=…` — fetch values for a subject.
 *   Returns: `{ ok, subjectId, companyName, values, completenessScore }`.
 *
 * # Rate limiting
 *
 * 12 saves / minute / client. Mirrors the conservative ceilings on
 * other write routes (`/api/valuation/subject` = 10/min). The form
 * batches user keystrokes locally and only POSTs on Save.
 */
import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";
import { rateLimit } from "@/lib/rate-limit";
import {
  QuantaraValuesSchema,
  SupplementaryValuesSchema,
  mergeQuantaraIntoSubject,
  mergeSupplementaryIntoQuantaraJson,
  quantaraToValuationSubject,
  readSupplementaryFromQuantaraJson,
  valuationSubjectToQuantara,
  type QuantaraValuationSubjectShape,
  type QuantaraValues,
  type SupplementaryValues,
} from "@/lib/quantara";

import { overallCompleteness } from "@/components/quantara/completeness";

interface PostBody {
  companyName?: unknown;
  values?: unknown;
  /** Q5 — multi-round supplementary values map. Optional. */
  supplementaryValues?: unknown;
  subjectId?: unknown;
}

function badRequest(message: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/**
 * Coerce a merge-helper output into Prisma's JSON write type, dropping
 * `null` so the column stays untouched (we never want this route to
 * clobber a JSON column that the Track V engine has populated).
 */
function asJson(
  v: Record<string, unknown> | null | undefined,
): Prisma.InputJsonValue | undefined {
  if (v === null || v === undefined) return undefined;
  return v as Prisma.InputJsonValue;
}

// ─────────────────────────────────────────────────────────────────────
// POST — create or update an intake.
// ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 12,
    windowMs: 60_000,
    prefix: "founder-intake-write",
  });
  if (limited) return limited;

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return badRequest("Invalid JSON body");
  }

  const companyName = typeof body.companyName === "string" ? body.companyName.trim() : "";
  if (!companyName) return badRequest("companyName is required");

  const subjectIdRaw = typeof body.subjectId === "string" ? body.subjectId : undefined;

  const valuesParse = QuantaraValuesSchema.safeParse(body.values ?? {});
  if (!valuesParse.success) {
    return badRequest(
      `Invalid values: ${valuesParse.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }
  const values = valuesParse.data as QuantaraValues;

  /* Q5 — supplementary values are optional. When absent, we leave any
     prior supplementary entries on the subject untouched (the merge
     helper's no-op path). When present, validate strictly against the
     per-round Zod schemas in `SupplementaryValuesSchema`. */
  const supplementaryParse = SupplementaryValuesSchema.safeParse(
    body.supplementaryValues ?? {},
  );
  if (!supplementaryParse.success) {
    return badRequest(
      `Invalid supplementaryValues: ${supplementaryParse.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }
  const supplementaryValues =
    supplementaryParse.data as unknown as SupplementaryValues;
  const hasSupplementary = Object.keys(supplementaryValues).length > 0;

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
    /* Resolve target subject:
       1. If `subjectId` is supplied, look it up scoped to userId.
       2. Otherwise, find an existing non-archived subject by company name.
       3. Else, create one.
       Mutually exclusive — at most one subject is touched. */
    let existing = subjectIdRaw
      ? await prisma.valuationSubject.findFirst({
          where: { id: subjectIdRaw, userId, isArchived: false },
          select: shapeSelect,
        })
      : await prisma.valuationSubject.findFirst({
          where: { userId, companyName, isArchived: false },
          orderBy: { updatedAt: "desc" },
          select: shapeSelect,
        });

    if (existing) {
      const merged = mergeQuantaraIntoSubject(toShape(existing), values);
      /* Q5 — supplementary merge runs as a second pass on the
         already-merged quantaraJson so canonical-field subkeys land
         first and supplementary values nest under the
         `supplementary` namespace. Per-round entries don't clobber
         each other (see `mergeSupplementaryIntoQuantaraJson` tests). */
      const finalQuantaraJson = hasSupplementary
        ? mergeSupplementaryIntoQuantaraJson(
            merged.quantaraJson ?? null,
            supplementaryValues,
          )
        : merged.quantaraJson;
      const summary = overallCompleteness(values);

      const updated = await prisma.valuationSubject.update({
        where: { id: existing.id },
        data: {
          companyName,
          financialDataJson: asJson(merged.financialDataJson),
          ipDataJson: asJson(merged.ipDataJson),
          marketDataJson: asJson(merged.marketDataJson),
          capitalDataJson: asJson(merged.capitalDataJson),
          fundingDataJson: asJson(merged.fundingDataJson),
          quantaraJson: asJson(finalQuantaraJson),
          completenessScore: summary.percent,
        },
        select: { id: true, completenessScore: true },
      });

      return NextResponse.json({
        ok: true,
        subjectId: updated.id,
        companyName,
        completenessScore: Number(updated.completenessScore ?? summary.percent),
        fieldsFilled: summary.fieldsFilled,
        fieldsTotal: summary.fieldsTotal,
      });
    }

    /* Create new — project values directly (no merge target). */
    const projection = quantaraToValuationSubject(values);
    /* Q5 — fold supplementary values into the fresh quantaraJson. */
    const initialQuantaraJson = hasSupplementary
      ? mergeSupplementaryIntoQuantaraJson(
          projection.quantaraJson ?? null,
          supplementaryValues,
        )
      : projection.quantaraJson;
    const summary = overallCompleteness(values);
    const created = await prisma.valuationSubject.create({
      data: {
        userId,
        companyName,
        financialDataJson: asJson(projection.financialDataJson),
        ipDataJson: asJson(projection.ipDataJson),
        marketDataJson: asJson(projection.marketDataJson),
        capitalDataJson: asJson(projection.capitalDataJson),
        fundingDataJson: asJson(projection.fundingDataJson),
        quantaraJson: asJson(initialQuantaraJson),
        completenessScore: summary.percent,
      },
      select: { id: true },
    });

    return NextResponse.json({
      ok: true,
      subjectId: created.id,
      companyName,
      completenessScore: summary.percent,
      fieldsFilled: summary.fieldsFilled,
      fieldsTotal: summary.fieldsTotal,
    });
  } catch (err) {
    console.error("[api/founder-intake POST] Error:", err);
    return badRequest("Internal server error", 500);
  }
}

// ─────────────────────────────────────────────────────────────────────
// GET — load an intake by subjectId (resume flow).
// ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 30,
    windowMs: 60_000,
    prefix: "founder-intake-read",
  });
  if (limited) return limited;

  const subjectId = request.nextUrl.searchParams.get("subjectId");

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
    const subject = subjectId
      ? await prisma.valuationSubject.findFirst({
          where: { id: subjectId, userId, isArchived: false },
          select: { ...shapeSelect, completenessScore: true },
        })
      : await prisma.valuationSubject.findFirst({
          where: { userId, isArchived: false },
          orderBy: { updatedAt: "desc" },
          select: { ...shapeSelect, completenessScore: true },
        });

    if (!subject) {
      return NextResponse.json({
        ok: true,
        subjectId: null,
        companyName: null,
        values: {},
        supplementaryValues: {},
        completenessScore: 0,
      });
    }

    const shape = toShape(subject);
    const values = valuationSubjectToQuantara(shape);
    /* Q5 — extract per-round supplementary values from the
       `supplementary` namespace under quantaraJson. Empty when the
       subject was saved before Q5 shipped. */
    const supplementaryValues = readSupplementaryFromQuantaraJson(
      shape.quantaraJson ?? null,
    );
    return NextResponse.json({
      ok: true,
      subjectId: subject.id,
      companyName: subject.companyName,
      values,
      supplementaryValues,
      completenessScore: Number(subject.completenessScore ?? 0),
    });
  } catch (err) {
    console.error("[api/founder-intake GET] Error:", err);
    return badRequest("Internal server error", 500);
  }
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

const shapeSelect = {
  id: true,
  companyName: true,
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
