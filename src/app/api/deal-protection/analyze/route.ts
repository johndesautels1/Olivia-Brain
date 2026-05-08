/**
 * `/api/deal-protection/analyze` — Track P Session P3.
 *
 * POST body: `{ subjectId: string; termSheetText: string }`
 *      returns: `{ ok: true, report: DealRiskReport }`
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
