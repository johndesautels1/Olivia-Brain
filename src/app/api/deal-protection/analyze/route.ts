/**
 * `/api/deal-protection/analyze` — Track P Session P3 (P6 added GET).
 *
 * POST body: `{ subjectId: string; termSheetText: string }`
 *      returns: `{ ok: true, report: DealRiskReport }`
 * GET  query: `?subjectId=…` (list latest analyses) OR `?id=…` (single)
 *      returns: `{ ok: true, analyses: […] }` or `{ ok: true, analysis: … }`
 *
 * Pipeline: validate → load own subject → parser → classifier →
 * aggregate → persist DealAnalysis → return DealRiskReport.
 *
 * Auth + rate-limit + soft-failure mirror `/api/founder-intake/personas`.
 *
 * # Persistence
 *
 * Append-only — re-running on a revised term sheet creates a new
 * `DealAnalysis` row so the founder can compare versions across
 * negotiation cycles. `isArchived` lets ops soft-delete bad runs
 * without losing audit history.
 *
 * # Operator action owed
 *
 * `prisma/sql/06-add-deal-protection-foundation.sql` must be applied
 * to Supabase before this route can persist. The orchestrator
 * (analyzeTermSheet) runs cleanly without the table; only the
 * `prisma.dealAnalysis.create` call requires the migration.
 */
import type { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { getAuthSession } from '@/lib/auth/session';
import prisma from '@/lib/db/client';
import { rateLimit } from '@/lib/rate-limit';

import { analyzeTermSheet } from '@/lib/deal-protection/analyze';
import { PARSER_TEXT_CHAR_LIMIT } from '@/lib/deal-protection/parser-types';
import type { DealRiskReport } from '@/lib/deal-protection/report-types';

const MIN_TERM_SHEET_CHARS = 40 as const;

interface PostBody {
  subjectId?: unknown;
  termSheetText?: unknown;
}

function badRequest(message: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

// ─────────────────────────────────────────────────────────────────────
// POST — analyze a term sheet, persist the run, return the report.
// ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  /* Analysis is expensive (cascade × N clauses); 5/min is generous
     for human use and aborts runaway loops. */
  const limited = rateLimit(request, {
    limit: 5,
    windowMs: 60_000,
    prefix: 'deal-protection-analyze',
  });
  if (limited) return limited;

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return badRequest('Invalid JSON body');
  }

  const subjectId =
    typeof body.subjectId === 'string' ? body.subjectId.trim() : undefined;
  if (!subjectId) return badRequest('subjectId is required');

  const termSheetTextRaw =
    typeof body.termSheetText === 'string' ? body.termSheetText : undefined;
  if (!termSheetTextRaw) return badRequest('termSheetText is required');

  const termSheetText = termSheetTextRaw.slice(0, PARSER_TEXT_CHAR_LIMIT);
  if (termSheetText.trim().length < MIN_TERM_SHEET_CHARS) {
    return badRequest(
      `termSheetText must be at least ${MIN_TERM_SHEET_CHARS} characters`,
    );
  }

  let userId: string;
  try {
    const session = await getAuthSession();
    if (!session.userId) return badRequest('Unauthorized', 401);
    userId = session.userId;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Auth unavailable';
    return badRequest(msg, 503);
  }

  try {
    const subject = await prisma.valuationSubject.findFirst({
      where: { id: subjectId, userId, isArchived: false },
      select: { id: true },
    });
    if (!subject) return badRequest('Subject not found', 404);

    const payload = await analyzeTermSheet({
      valuationSubjectId: subject.id,
      termSheetText,
      conversationId: `deal-protection-${userId}-${Date.now().toString(36)}`,
    });

    const persisted = await prisma.dealAnalysis.create({
      data: {
        userId,
        valuationSubjectId: subject.id,
        smartScore: payload.smartScore,
        smartBand: payload.band.band,
        bandLanguage: payload.band.language,
        recommendedAction: payload.band.action,
        investorSignal: payload.band.investorSignal,
        termSheetText,
        investorNamesJson: asJson(payload.investorNames),
        clauseAnalysisJson: asJson(payload.clauseAnalyses),
        confidenceScore: payload.confidenceScore,
        modelTrailJson: asJson({ attempts: payload.attempts }),
        runtimeMode: payload.runtimeMode,
      },
      select: { id: true, generatedAt: true },
    });

    const report: DealRiskReport = {
      ...payload,
      dealAnalysisId: persisted.id,
      generatedAt: persisted.generatedAt.toISOString(),
    };

    return NextResponse.json({ ok: true, report });
  } catch (err) {
    console.error('[api/deal-protection/analyze POST] Error:', err);
    return badRequest('Deal-protection analysis failed', 500);
  }
}

// ─────────────────────────────────────────────────────────────────────
// GET — list analyses by subjectId, or fetch single by id.
// ─────────────────────────────────────────────────────────────────────

const LIST_LIMIT = 20 as const;

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 60,
    windowMs: 60_000,
    prefix: 'deal-protection-analyze-read',
  });
  if (limited) return limited;

  const params = request.nextUrl.searchParams;
  const id = params.get('id');
  const subjectId = params.get('subjectId');
  if (!id && !subjectId) {
    return badRequest('Either id or subjectId is required');
  }

  let userId: string;
  try {
    const session = await getAuthSession();
    if (!session.userId) return badRequest('Unauthorized', 401);
    userId = session.userId;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Auth unavailable';
    return badRequest(msg, 503);
  }

  try {
    if (id) {
      const row = await prisma.dealAnalysis.findFirst({
        where: { id, userId, isArchived: false },
      });
      if (!row) return badRequest('Deal analysis not found', 404);
      return NextResponse.json({
        ok: true,
        analysis: serializeAnalysisRow(row),
      });
    }

    /* List by subjectId — verify the subject belongs to the caller
       before exposing any analyses against it. */
    const subject = await prisma.valuationSubject.findFirst({
      where: { id: subjectId!, userId, isArchived: false },
      select: { id: true },
    });
    if (!subject) return badRequest('Subject not found', 404);

    const rows = await prisma.dealAnalysis.findMany({
      where: { valuationSubjectId: subject.id, userId, isArchived: false },
      orderBy: { generatedAt: 'desc' },
      take: LIST_LIMIT,
    });
    return NextResponse.json({
      ok: true,
      analyses: rows.map(serializeAnalysisRow),
    });
  } catch (err) {
    console.error('[api/deal-protection/analyze GET] Error:', err);
    return badRequest('Fetch failed', 500);
  }
}

/* Type-narrowing helper — Prisma row → JSON-safe shape. The full
   DealRiskReport is reconstructed by the caller (WarRoom panel) using
   the same `band` lookup as the email-draft route. We surface the
   persisted row plus the parsed JSON columns. */
interface DealAnalysisRow {
  id: string;
  userId: string;
  valuationSubjectId: string;
  smartScore: { toNumber: () => number } | number;
  smartBand: string;
  bandLanguage: string;
  recommendedAction: string;
  investorSignal: string;
  termSheetText: string | null;
  investorNamesJson: unknown;
  clauseAnalysisJson: unknown;
  confidenceScore: { toNumber: () => number } | number;
  modelTrailJson: unknown;
  runtimeMode: string;
  generatedAt: Date;
  isArchived: boolean;
}

function serializeAnalysisRow(row: DealAnalysisRow) {
  const decimalToNumber = (v: { toNumber: () => number } | number): number =>
    typeof v === 'number' ? v : v.toNumber();
  return {
    id: row.id,
    valuationSubjectId: row.valuationSubjectId,
    smartScore: decimalToNumber(row.smartScore),
    smartBand: row.smartBand,
    bandLanguage: row.bandLanguage,
    recommendedAction: row.recommendedAction,
    investorSignal: row.investorSignal,
    termSheetText: row.termSheetText,
    investorNames: Array.isArray(row.investorNamesJson) ? row.investorNamesJson : [],
    clauseAnalyses: Array.isArray(row.clauseAnalysisJson) ? row.clauseAnalysisJson : [],
    confidenceScore: decimalToNumber(row.confidenceScore),
    runtimeMode: row.runtimeMode,
    generatedAt: row.generatedAt.toISOString(),
  };
}
