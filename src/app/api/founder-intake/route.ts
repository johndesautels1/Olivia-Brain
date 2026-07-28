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
  QUANTARA_VERTICAL_BY_ID,
  QuantaraValuesSchema,
  SupplementaryValuesSchema,
  VerticalValuesSchema,
  mergeQuantaraIntoSubject,
  mergeSupplementaryIntoQuantaraJson,
  mergeVerticalIntoQuantaraJson,
  quantaraToValuationSubject,
  readSupplementaryFromQuantaraJson,
  readVerticalFromQuantaraJson,
  valuationSubjectToQuantara,
  type QuantaraValuationSubjectShape,
  type QuantaraValues,
  type SupplementaryValues,
  type VerticalId,
  type VerticalValues,
} from "@/lib/quantara";

import { overallCompleteness } from "@/components/quantara/completeness";

interface PostBody {
  companyName?: unknown;
  values?: unknown;
  /** Q5 — multi-round supplementary values map. Optional. */
  supplementaryValues?: unknown;
  /** Q6 — active vertical id (writes to ValuationSubject.sector). Optional. */
  vertical?: unknown;
  /** Q6 — multi-vertical schedule values map. Optional. */
  verticalValues?: unknown;
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

  /* Q6 — vertical + vertical-schedule values. Both optional. The
     vertical id is whitelisted against the canonical descriptor map
     so an arbitrary string can never reach `ValuationSubject.sector`
     via this route. */
  let vertical: VerticalId | undefined;
  if (typeof body.vertical === "string" && body.vertical.length > 0) {
    if (!(body.vertical in QUANTARA_VERTICAL_BY_ID)) {
      return badRequest(`Invalid vertical: ${body.vertical}`);
    }
    vertical = body.vertical as VerticalId;
  }

  const verticalParse = VerticalValuesSchema.safeParse(
    body.verticalValues ?? {},
  );
  if (!verticalParse.success) {
    return badRequest(
      `Invalid verticalValues: ${verticalParse.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }
  const verticalValues = verticalParse.data as unknown as VerticalValues;
  const hasVertical = Object.keys(verticalValues).length > 0;

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
    const existing = subjectIdRaw
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
      let finalQuantaraJson = hasSupplementary
        ? mergeSupplementaryIntoQuantaraJson(
            merged.quantaraJson ?? null,
            supplementaryValues,
          )
        : merged.quantaraJson;
      /* Q6 — vertical merge runs as a third pass under the `vertical`
         namespace. Distinct from supplementary, distinct from canonical
         field subkeys. Per-vertical entries preserve. */
      if (hasVertical) {
        finalQuantaraJson = mergeVerticalIntoQuantaraJson(
          finalQuantaraJson ?? null,
          verticalValues,
        );
      }
      const summary = overallCompleteness(values);

      const updated = await prisma.valuationSubject.update({
        where: { id: existing.id },
        data: {
          companyName,
          /* Q6 — when vertical is supplied, persist to the top-level
             `sector` column so engine-side queries see it. When not
             supplied, leave whatever was there (don't clobber with null). */
          ...(vertical ? { sector: vertical } : {}),
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
    let initialQuantaraJson = hasSupplementary
      ? mergeSupplementaryIntoQuantaraJson(
          projection.quantaraJson ?? null,
          supplementaryValues,
        )
      : projection.quantaraJson;
    /* Q6 — fold vertical schedule values under the `vertical` namespace. */
    if (hasVertical) {
      initialQuantaraJson = mergeVerticalIntoQuantaraJson(
        initialQuantaraJson ?? null,
        verticalValues,
      );
    }
    const summary = overallCompleteness(values);
    const created = await prisma.valuationSubject.create({
      data: {
        userId,
        companyName,
        ...(vertical ? { sector: vertical } : {}),
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
        vertical: null,
        verticalValues: {},
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
    /* Q6 — extract per-vertical schedule values from the `vertical`
       namespace. The vertical id itself comes from the top-level
       `sector` column. Both empty when the subject was saved before
       Q6 shipped. */
    const verticalValues = readVerticalFromQuantaraJson(
      shape.quantaraJson ?? null,
    );
    /* Whitelist sector against the canonical descriptor map so a
       legacy / freeform sector string doesn't crash the UI when it
       expects a typed VerticalId. */
    const verticalCandidate = subject.sector;
    const vertical: VerticalId | null =
      typeof verticalCandidate === "string" &&
      verticalCandidate in QUANTARA_VERTICAL_BY_ID
        ? (verticalCandidate as VerticalId)
        : null;
    return NextResponse.json({
      ok: true,
      subjectId: subject.id,
      companyName: subject.companyName,
      values,
      supplementaryValues,
      vertical,
      verticalValues,
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
  /* Q6 — sector holds the vertical id; selected so GET can hydrate the
     form's vertical state and POST's update path can compare. */
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
