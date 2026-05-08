/**
 * `/api/deal-protection/versioning` — Track P Session P7.
 *
 * POST  diff two persisted DealAnalysis runs. Body:
 *         { priorAnalysisId, currentAnalysisId }. Both must belong to
 *         the caller. Returns the structured `AnalysisDiff` shape
 *         (score delta, band transition, new vs resolved critical
 *         issues, per-clause shifts, deterministic narrative summary).
 *
 * Stateless — diffs are not persisted (re-running is cheap).
 *
 * Auth: pre-Clerk `getAuthSession()` stub (W-015).
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getAuthSession } from '@/lib/auth/session';
import prisma from '@/lib/db/client';
import { rateLimit } from '@/lib/rate-limit';

import type {
  ClauseAnalysis,
  ClauseType,
  Severity,
} from '@/lib/deal-protection/clause-types';
import type { CriticalIssue } from '@/lib/deal-protection/report-types';
import type { SmartBand } from '@/lib/deal-protection/types';
import {
  compareAnalyses,
  type VersionedAnalysis,
} from '@/lib/deal-protection/versioning';

export const dynamic = 'force-dynamic';

const PostBodySchema = z.object({
  priorAnalysisId: z.string().min(1),
  currentAnalysisId: z.string().min(1),
});

function badRequest(message: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 30,
    windowMs: 60_000,
    prefix: 'deal-protection-versioning',
  });
  if (limited) return limited;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }
  const validated = PostBodySchema.safeParse(raw);
  if (!validated.success) {
    return badRequest(
      `Validation failed: ${validated.error.issues.map((i) => i.message).join('; ')}`,
    );
  }
  const body = validated.data;

  if (body.priorAnalysisId === body.currentAnalysisId) {
    return badRequest('priorAnalysisId and currentAnalysisId must differ');
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
    const [priorRow, currentRow] = await Promise.all([
      prisma.dealAnalysis.findFirst({
        where: { id: body.priorAnalysisId, userId, isArchived: false },
        select: rowSelect,
      }),
      prisma.dealAnalysis.findFirst({
        where: { id: body.currentAnalysisId, userId, isArchived: false },
        select: rowSelect,
      }),
    ]);
    if (!priorRow) return badRequest('priorAnalysisId not found', 404);
    if (!currentRow) return badRequest('currentAnalysisId not found', 404);

    const prior = toVersionedAnalysis(priorRow, 'prior');
    const current = toVersionedAnalysis(currentRow, 'current');

    const diff = compareAnalyses(prior, current);
    return NextResponse.json({ ok: true, diff });
  } catch (err) {
    console.error('[api/deal-protection/versioning POST] Error:', err);
    return badRequest('Diff failed', 500);
  }
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

const rowSelect = {
  id: true,
  smartScore: true,
  smartBand: true,
  clauseAnalysisJson: true,
  generatedAt: true,
} as const;

interface RawRow {
  id: string;
  smartScore: { toNumber: () => number } | number;
  smartBand: string;
  clauseAnalysisJson: unknown;
  generatedAt: Date;
}

function toVersionedAnalysis(row: RawRow, label: string): VersionedAnalysis {
  const smartScore = typeof row.smartScore === 'number' ? row.smartScore : row.smartScore.toNumber();
  const band = parseBand(row.smartBand) ?? 'yellow';
  const clauseAnalyses = parseClauseAnalyses(row.clauseAnalysisJson);
  const criticalIssues: ReadonlyArray<CriticalIssue> = clauseAnalyses
    .filter((c) => c.severity === 'critical')
    .sort((a, b) => b.toxicity - a.toxicity)
    .slice(0, 5)
    .map((c) => ({
      clauseType: c.clauseType,
      summary: c.summary,
      toxicity: c.toxicity,
    }));
  return {
    id: row.id,
    versionLabel: label,
    smartScore,
    smartBand: band,
    clauseAnalyses,
    criticalIssues,
    generatedAt: row.generatedAt.toISOString(),
  };
}

function parseBand(raw: string): SmartBand | null {
  return raw === 'red' ||
    raw === 'orange' ||
    raw === 'yellow' ||
    raw === 'blue' ||
    raw === 'green'
    ? raw
    : null;
}

function parseClauseAnalyses(raw: unknown): ReadonlyArray<ClauseAnalysis> {
  if (!Array.isArray(raw)) return [];
  const out: ClauseAnalysis[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    if (typeof o.text !== 'string') continue;
    if (typeof o.clauseType !== 'string') continue;
    if (typeof o.severity !== 'string') continue;
    if (typeof o.toxicity !== 'number') continue;
    if (typeof o.summary !== 'string') continue;
    if (typeof o.founderFriendlyAlternative !== 'string') continue;
    out.push({
      text: o.text,
      clauseType: o.clauseType as ClauseType,
      severity: o.severity as Severity,
      toxicity: o.toxicity,
      summary: o.summary,
      founderFriendlyAlternative: o.founderFriendlyAlternative,
      reasoning: typeof o.reasoning === 'string' ? o.reasoning : undefined,
      opusJudged: typeof o.opusJudged === 'boolean' ? o.opusJudged : false,
    });
  }
  return out;
}
