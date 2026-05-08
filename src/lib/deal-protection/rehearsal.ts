/**
 * Track P Session P7 — Negotiation rehearsal orchestrator.
 *
 * Pure orchestration — caller persists the thread (or stays stateless).
 * Three soft-failure modes match the Q7/P2/P3/P5/P6 pattern: cascade
 * mock-mode → deterministic fallback; JSON parse failure → fallback;
 * Zod schema rejection → fallback.
 */
import { runModelCascade } from '@/lib/services/model-cascade';
import { withTraceSpan } from '@/lib/observability/tracer';

import type { ClauseAnalysis } from './clause-types';
import type { CriticalIssue } from './report-types';
import { buildRehearsalPrompt } from './rehearsal-prompts';
import {
  CascadeRehearsalSchema,
  REHEARSAL_STANCE_BY_BAND,
  type RehearsalResponse,
  type RehearsalTurn,
} from './rehearsal-types';
import type { SmartBand } from './types';

export interface GenerateRehearsalTurnOptions {
  readonly band: SmartBand;
  readonly smartScore: number;
  readonly criticalIssues: ReadonlyArray<CriticalIssue>;
  readonly clauseAnalyses: ReadonlyArray<ClauseAnalysis>;
  readonly history: ReadonlyArray<RehearsalTurn>;
  readonly founderTurn: string;
  readonly founderName?: string;
  readonly investorName?: string;
  readonly conversationId: string;
}

/**
 * Generate the next investor turn given the founder's latest message.
 * Always resolves; falls back to a deterministic per-band response on
 * any soft failure.
 */
export async function generateRehearsalTurn(
  opts: GenerateRehearsalTurnOptions,
): Promise<RehearsalResponse> {
  return withTraceSpan(
    'olivia.deal_protection.rehearsal',
    {
      'olivia.smart_band': opts.band,
      'olivia.smart_score': opts.smartScore,
      'olivia.history_turns': opts.history.length,
    },
    async () => {
      const cascade = await runModelCascade({
        conversationId: opts.conversationId,
        message: buildRehearsalPrompt({
          band: opts.band,
          smartScore: opts.smartScore,
          criticalIssues: opts.criticalIssues,
          clauseAnalyses: opts.clauseAnalyses,
          history: opts.history,
          founderTurn: opts.founderTurn,
          founderName: opts.founderName,
          investorName: opts.investorName,
        }),
        intent: 'operations',
        recalledContext: [],
        integrationSnapshot: {},
      });

      const attempts = cascade.attempts.map((a) => ({
        providerId: a.providerId,
        modelId: a.modelId,
        success: a.success,
        durationMs: a.durationMs,
      }));

      if (cascade.runtimeMode === 'mock') {
        return mockResponse(opts, cascade, attempts);
      }

      const parsed = parseAndValidate(cascade.text);
      if (!parsed) {
        return mockResponse(opts, cascade, attempts);
      }

      return {
        investorMessage: parsed.investorMessage,
        stance: parsed.stance,
        providerId: cascade.providerId,
        modelId: cascade.modelId,
        runtimeMode: 'live',
        attempts,
      };
    },
  );
}

// ─────────────────────────────────────────────────────────────────────
// Internals
// ─────────────────────────────────────────────────────────────────────

function parseAndValidate(text: string): { investorMessage: string; stance: 'pushback' | 'concede' | 'walk' | 'neutral' } | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    return null;
  }
  const validated = CascadeRehearsalSchema.safeParse(parsed);
  return validated.success ? validated.data : null;
}

function mockResponse(
  opts: GenerateRehearsalTurnOptions,
  cascade: { providerId: string; modelId: string },
  attempts: ReadonlyArray<{ providerId: string; modelId: string; success: boolean; durationMs: number }>,
): RehearsalResponse {
  const stance = REHEARSAL_STANCE_BY_BAND[opts.band] ?? 'neutral';
  const investorMessage = renderTemplateInvestorTurn(opts.band, opts.criticalIssues, opts.founderTurn);
  return {
    investorMessage,
    stance,
    providerId: cascade.providerId,
    modelId: cascade.modelId,
    runtimeMode: 'mock',
    attempts,
  };
}

/* Per-band deterministic fallback. Anchored in the band tone so a
   founder rehearsing against mock-mode still gets directionally
   useful pushback (or assent on green deals). */
function renderTemplateInvestorTurn(
  band: SmartBand,
  criticalIssues: ReadonlyArray<CriticalIssue>,
  founderTurn: string,
): string {
  const issuePhrase =
    criticalIssues.length > 0
      ? criticalIssues
          .slice(0, 2)
          .map((c) => formatClauseType(c.clauseType))
          .join(' and ')
      : 'the structure as drafted';
  const founderEcho = founderTurn.length > 80 ? founderTurn.slice(0, 80).trim() + '…' : founderTurn.trim();

  switch (band) {
    case 'red':
      return [
        `I hear your point on "${founderEcho}", but our partners have been very clear on ${issuePhrase}. These are not items we can revisit at this stage — they reflect how we've underwritten our exposure.`,
        `If you'd prefer not to proceed on this structure I'd understand, but we can't move on these terms.`,
      ].join(' ');
    case 'orange':
      return [
        `Thanks — I see what you're trying to achieve with "${founderEcho}". We can possibly find some flexibility, but ${issuePhrase} sit at the core of what our IC approved.`,
        `Help me understand what's driving this from your side — is this a counsel preference or a strategic ask?`,
      ].join(' ');
    case 'yellow':
      return [
        `That's a fair pushback on "${founderEcho}". We can explore alternative language on ${issuePhrase}, but I'd want to understand the trade you're proposing in return.`,
        `Could you walk me through your specific counter-language on the top one or two items?`,
      ].join(' ');
    case 'blue':
      return [
        `Reasonable point on "${founderEcho}". We're aligned on most of the structure already; ${issuePhrase} is something I think we can find common ground on.`,
        `Send me your proposed redline and I'll bring it back to my partners.`,
      ].join(' ');
    case 'green':
    default:
      return [
        `Happy to consider "${founderEcho}". The terms are already in line with what we both want here.`,
        `Send me whatever procedural language you'd like and we can move to definitive docs.`,
      ].join(' ');
  }
}

function formatClauseType(t: string): string {
  return t
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}
