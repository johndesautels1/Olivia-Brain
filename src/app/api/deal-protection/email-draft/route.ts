/**
 * `/api/deal-protection/email-draft` — Track P Session P5.
 *
 * POST  generate a band-tuned founder-side reply email for a given
 *         DealAnalysis. Looks up the analysis (own-row only) → pulls
 *         smart band + critical issues + clause analyses → calls
 *         `generateEmailDraft` (cascade-driven with per-band template
 *         fallback) → returns `{ subject, body, tone, runtimeMode }`.
 *
 * No persistence — the draft is ephemeral. The founder copies into
 * their own email client (or P6 WarRoom integration uses the result
 * directly).
 *
 * Auth: pre-Clerk `getAuthSession()` stub (W-015).
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getAuthSession } from '@/lib/auth/session';
import prisma from '@/lib/db/client';
import { rateLimit } from '@/lib/rate-limit';

import { generateEmailDraft } from '@/lib/deal-protection/email-drafts';
import {
  SMART_BANDS_BY_ID,
} from '@/lib/deal-protection/bands';
import type {
  ClauseAnalysis,
  ClauseType,
  Severity,
} from '@/lib/deal-protection/clause-types';
import type { CriticalIssue } from '@/lib/deal-protection/report-types';
import type { SmartBand } from '@/lib/deal-protection/types';

export const dynamic = 'force-dynamic';

const PostBodySchema = z.object({
  dealAnalysisId: z.string().min(1),
  founderName: z.string().min(1).max(120).optional(),
  companyName: z.string().min(1).max(120).optional(),
  recipientName: z.string().min(1).max(120).optional(),
});

function badRequest(message: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 10,
    windowMs: 60_000,
    prefix: 'deal-protection-email-draft',
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
        bandLanguage: true,
        recommendedAction: true,
        investorSignal: true,
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

    const result = await generateEmailDraft({
      conversationId: `deal-protection-email-${analysis.id}`,
      context: {
        report: {
          smartScore: Number(analysis.smartScore),
          band: SMART_BANDS_BY_ID[band],
          criticalIssues,
          walkAwayReasons: band === 'red' ? buildWalkAwayReasons(criticalIssues) : [],
          clauseAnalyses,
        },
        founderName: body.founderName,
        companyName: body.companyName,
        recipientName: body.recipientName,
      },
    });

    return NextResponse.json({
      ok: true,
      draft: {
        subject: result.subject,
        body: result.body,
        tone: result.tone,
        runtimeMode: result.runtimeMode,
      },
    });
  } catch (err) {
    console.error('[api/deal-protection/email-draft POST] Error:', err);
    return badRequest('Email draft generation failed', 500);
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

function buildWalkAwayReasons(
  critical: ReadonlyArray<CriticalIssue>,
): ReadonlyArray<string> {
  return critical.map(
    (c) =>
      `${c.clauseType
        .split('_')
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ')}: ${c.summary}`,
  );
}
