/**
 * `/api/deal-protection/rehearsal` — Track P Session P7.
 *
 * POST  generate the next investor turn in a negotiation rehearsal.
 *         Body: { dealAnalysisId, history?, founderTurn, founderName?, investorName? }.
 *         Looks up the analysis (own-row only) → reconstructs the
 *         deal context → calls `generateRehearsalTurn` → returns
 *         { investorMessage, stance, runtimeMode }.
 *
 * Stateless on the server side — the founder's UI owns the thread.
 *
 * Auth: pre-Clerk `getAuthSession()` stub (W-015).
 */
import { NextRequest, NextResponse } from 'next/server';

import { getAuthSession } from '@/lib/auth/session';
import prisma from '@/lib/db/client';
import { rateLimit } from '@/lib/rate-limit';

import type {
  ClauseAnalysis,
  ClauseType,
  Severity,
} from '@/lib/deal-protection/clause-types';
import { generateRehearsalTurn } from '@/lib/deal-protection/rehearsal';
import { RehearsalPostBodySchema } from '@/lib/deal-protection/rehearsal-types';
import type { CriticalIssue } from '@/lib/deal-protection/report-types';
import type { SmartBand } from '@/lib/deal-protection/types';

export const dynamic = 'force-dynamic';

function badRequest(message: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 20,
    windowMs: 60_000,
    prefix: 'deal-protection-rehearsal',
  });
  if (limited) return limited;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }
  const validated = RehearsalPostBodySchema.safeParse(raw);
  if (!validated.success) {
    return badRequest(
      `Validation failed: ${validated.error.issues.map((i) => i.message).join('; ')}`,
    );
  }
  const body = validated.data;

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
    const analysis = await prisma.dealAnalysis.findFirst({
      where: { id: body.dealAnalysisId, userId, isArchived: false },
      select: {
        id: true,
        smartScore: true,
        smartBand: true,
        clauseAnalysisJson: true,
      },
    });
    if (!analysis) return badRequest('Deal analysis not found', 404);

    const band = parseBand(analysis.smartBand);
    if (!band) return badRequest('Persisted band is invalid', 500);

    const clauseAnalyses = parseClauseAnalyses(analysis.clauseAnalysisJson);
    const criticalIssues: ReadonlyArray<CriticalIssue> = clauseAnalyses
      .filter((c) => c.severity === 'critical')
      .sort((a, b) => b.toxicity - a.toxicity)
      .slice(0, 5)
      .map((c) => ({
        clauseType: c.clauseType,
        summary: c.summary,
        toxicity: c.toxicity,
      }));

    const result = await generateRehearsalTurn({
      band,
      smartScore: Number(analysis.smartScore),
      criticalIssues,
      clauseAnalyses,
      history: body.history ?? [],
      founderTurn: body.founderTurn,
      founderName: body.founderName,
      investorName: body.investorName,
      conversationId: `deal-protection-rehearsal-${analysis.id}`,
    });

    return NextResponse.json({
      ok: true,
      turn: {
        investorMessage: result.investorMessage,
        stance: result.stance,
        runtimeMode: result.runtimeMode,
      },
    });
  } catch (err) {
    console.error('[api/deal-protection/rehearsal POST] Error:', err);
    return badRequest('Rehearsal turn failed', 500);
  }
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

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
