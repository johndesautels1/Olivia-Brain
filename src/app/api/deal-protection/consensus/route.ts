/**
 * `/api/deal-protection/consensus` — Track P Session P7.
 *
 * POST  multi-LLM consensus on a persisted DealAnalysis. Runs N
 *         evaluators in parallel (different intents bias the cascade
 *         toward different primary providers); Opus judges. Body:
 *         { dealAnalysisId, evaluatorCount? } — caller decides when
 *         to invoke (high-stakes offers, buyouts).
 *
 * Stateless — consensus is not persisted in P7 (caller can re-run
 * cheaply if needed).
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
import { generateConsensus } from '@/lib/deal-protection/consensus';
import { ConsensusPostBodySchema } from '@/lib/deal-protection/consensus-types';

export const dynamic = 'force-dynamic';

function badRequest(message: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(request: NextRequest) {
  /* Consensus is expensive (N parallel cascade calls + judge). Tight
     rate limit — 3 per minute per IP. */
  const limited = rateLimit(request, {
    limit: 3,
    windowMs: 60_000,
    prefix: 'deal-protection-consensus',
  });
  if (limited) return limited;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }
  const validated = ConsensusPostBodySchema.safeParse(raw);
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
        clauseAnalysisJson: true,
        investorNamesJson: true,
        valuationSubject: {
          select: { companyName: true, sector: true },
        },
      },
    });
    if (!analysis) return badRequest('Deal analysis not found', 404);

    const clauseAnalyses = parseClauseAnalyses(analysis.clauseAnalysisJson);
    const investorNames = parseInvestorNames(analysis.investorNamesJson);

    const result = await generateConsensus({
      companyName: analysis.valuationSubject.companyName,
      companySector: analysis.valuationSubject.sector ?? undefined,
      investorNames,
      clauseAnalyses,
      evaluatorCount: body.evaluatorCount,
      conversationId: `deal-protection-consensus-${analysis.id}`,
    });

    return NextResponse.json({ ok: true, consensus: result });
  } catch (err) {
    console.error('[api/deal-protection/consensus POST] Error:', err);
    return badRequest('Consensus failed', 500);
  }
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

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

function parseInvestorNames(raw: unknown): ReadonlyArray<string> {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === 'string');
}
