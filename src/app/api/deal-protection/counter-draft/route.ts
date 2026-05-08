/**
 * `/api/deal-protection/counter-draft` — Track P Session P6.
 *
 * POST  generate + persist a counter term sheet draft for a given
 *         DealAnalysis. Cross-doc inheritance: pulls company name +
 *         sector + round context from the parent ValuationSubject,
 *         and per-clause counter language from the persisted P2
 *         clause analyses. Auto-increments `versionNumber` per
 *         analysis so the negotiation history is auditable.
 * GET   list counter drafts for a given dealAnalysisId. Most-recent
 *         first; pass `?dealAnalysisId=…` (required).
 *
 * Auth: pre-Clerk `getAuthSession()` stub (W-015), consistent with
 * the rest of `/api/deal-protection/*`.
 *
 * # Operator action owed
 *
 * `prisma/sql/07-add-counter-term-sheets.sql` must be applied to
 * Supabase before this route can persist. The orchestrator
 * (`generateCounterDraft`) runs cleanly without the table; only the
 * `prisma.counterTermSheet.*` calls require the migration.
 */
import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { getAuthSession } from '@/lib/auth/session';
import prisma from '@/lib/db/client';
import { rateLimit } from '@/lib/rate-limit';

import { SMART_BANDS_BY_ID } from '@/lib/deal-protection/bands';
import type {
  ClauseAnalysis,
  ClauseType,
  Severity,
} from '@/lib/deal-protection/clause-types';
import { generateCounterDraft } from '@/lib/deal-protection/counter-term-sheet';
import { CounterDraftPostBodySchema } from '@/lib/deal-protection/counter-term-sheet-types';
import type { SmartBand } from '@/lib/deal-protection/types';

export const dynamic = 'force-dynamic';

const LIST_LIMIT = 50 as const;

function badRequest(message: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function asJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return (value ?? Prisma.JsonNull) as Prisma.InputJsonValue | typeof Prisma.JsonNull;
}

// ─────────────────────────────────────────────────────────────────────
// POST — generate + persist a new counter draft.
// ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 5,
    windowMs: 60_000,
    prefix: 'deal-protection-counter-draft-write',
  });
  if (limited) return limited;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const validated = CounterDraftPostBodySchema.safeParse(raw);
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
    /* Cross-doc inheritance — pull the analysis + parent subject in
       one query so the orchestrator gets company / sector / round
       context without an extra round trip. */
    const analysis = await prisma.dealAnalysis.findFirst({
      where: { id: body.dealAnalysisId, userId, isArchived: false },
      select: {
        id: true,
        smartScore: true,
        smartBand: true,
        clauseAnalysisJson: true,
        investorNamesJson: true,
        valuationSubject: {
          select: { companyName: true, sector: true },
        },
      },
    });
    if (!analysis) return badRequest('Deal analysis not found', 404);

    const band = parseBand(analysis.smartBand);
    if (!band) return badRequest('Persisted band is invalid', 500);

    const clauseAnalyses = parseClauseAnalyses(analysis.clauseAnalysisJson);
    const investorNames = parseInvestorNames(analysis.investorNamesJson);
    const roundContextSummary = buildRoundContext(investorNames);

    const draft = await generateCounterDraft({
      band,
      smartScore: Number(analysis.smartScore),
      clauseAnalyses,
      companyName: body.companyName ?? analysis.valuationSubject.companyName,
      companySector: analysis.valuationSubject.sector ?? undefined,
      founderName: body.founderName,
      recipientName: body.recipientName,
      roundContextSummary,
      conversationId: `deal-protection-counter-${analysis.id}`,
    });

    /* Auto-increment versionNumber per analysis. Two queries kept simple
       — the unique-by-(dealAnalysisId, versionNumber) shape isn't a
       schema constraint; we read max-then-insert. Race condition risk
       is minimal at 5/min rate limit. */
    const lastVersion = await prisma.counterTermSheet.findFirst({
      where: { dealAnalysisId: analysis.id },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });
    const versionNumber = (lastVersion?.versionNumber ?? 0) + 1;

    const row = await prisma.counterTermSheet.create({
      data: {
        userId,
        dealAnalysisId: analysis.id,
        versionNumber,
        redlinedMarkdown: draft.redlinedMarkdown,
        changesJson: asJson(draft.changes),
        modelTrailJson: asJson({ attempts: draft.attempts }),
        runtimeMode: draft.runtimeMode,
      },
      select: {
        id: true,
        versionNumber: true,
        runtimeMode: true,
        generatedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      draft: {
        id: row.id,
        dealAnalysisId: analysis.id,
        versionNumber: row.versionNumber,
        runtimeMode: row.runtimeMode,
        generatedAt: row.generatedAt.toISOString(),
        preamble: draft.preamble,
        changes: draft.changes,
        closing: draft.closing,
        redlinedMarkdown: draft.redlinedMarkdown,
      },
    });
  } catch (err) {
    console.error('[api/deal-protection/counter-draft POST] Error:', err);
    return badRequest('Counter draft generation failed', 500);
  }
}

// ─────────────────────────────────────────────────────────────────────
// GET — list counter drafts for a given dealAnalysisId.
// ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 60,
    windowMs: 60_000,
    prefix: 'deal-protection-counter-draft-read',
  });
  if (limited) return limited;

  const dealAnalysisId = request.nextUrl.searchParams.get('dealAnalysisId');
  if (!dealAnalysisId) return badRequest('dealAnalysisId is required');

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
    /* Verify the analysis belongs to the caller before exposing its
       counter drafts. */
    const analysis = await prisma.dealAnalysis.findFirst({
      where: { id: dealAnalysisId, userId, isArchived: false },
      select: { id: true },
    });
    if (!analysis) return badRequest('Deal analysis not found', 404);

    const rows = await prisma.counterTermSheet.findMany({
      where: { dealAnalysisId, isArchived: false },
      orderBy: { versionNumber: 'desc' },
      take: LIST_LIMIT,
      select: {
        id: true,
        versionNumber: true,
        redlinedMarkdown: true,
        changesJson: true,
        founderNotes: true,
        runtimeMode: true,
        generatedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      drafts: rows.map((r) => ({
        id: r.id,
        dealAnalysisId,
        versionNumber: r.versionNumber,
        redlinedMarkdown: r.redlinedMarkdown,
        changes: Array.isArray(r.changesJson) ? r.changesJson : [],
        founderNotes: r.founderNotes,
        runtimeMode: r.runtimeMode,
        generatedAt: r.generatedAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error('[api/deal-protection/counter-draft GET] Error:', err);
    return badRequest('Counter draft list failed', 500);
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

function parseInvestorNames(raw: unknown): ReadonlyArray<string> {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === 'string');
}

function buildRoundContext(investorNames: ReadonlyArray<string>): string {
  if (investorNames.length === 0) return '(no investor named)';
  return `Investors mentioned: ${investorNames.slice(0, 5).join(', ')}`;
}
