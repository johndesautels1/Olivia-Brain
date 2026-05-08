/**
 * Track P Session P6 — Counter term sheet orchestrator.
 *
 * Cascade-driven redline generation with deterministic per-band template
 * fallback. Three soft-failure modes (matches Q7/P2/P3/P5 pattern):
 *
 *   1. Cascade returns mock-mode → deterministic template fallback
 *   2. JSON parse failure → template fallback
 *   3. Zod schema rejection → template fallback
 *
 * Pure orchestration — no Prisma writes here. The
 * `/api/deal-protection/counter-draft` route persists the result.
 *
 * Renders the structured payload as markdown for direct paste-into-
 * email use. Markdown shape:
 *
 *   <preamble>
 *
 *   ## Redlines
 *
 *   ### 1. <Clause Type>
 *   **Original:** …
 *   **Counter:** …
 *   **Rationale:** …
 *
 *   ### 2. <Clause Type>
 *   …
 *
 *   <closing>
 */
import { z } from 'zod';

import { runModelCascade } from '@/lib/services/model-cascade';
import { withTraceSpan } from '@/lib/observability/tracer';

import type { ClauseAnalysis, ClauseClassificationAttempt } from './clause-types';
import { buildCounterDraftPrompt, type CounterPromptContext } from './counter-term-sheet-prompts';
import { renderTemplateCounterDraft } from './counter-term-sheet-templates';
import {
  CounterDraftPayloadSchema,
  type CounterChange,
  type CounterDraftPayload,
  type CounterDraftResult,
} from './counter-term-sheet-types';
import type { SmartBand } from './types';

export interface GenerateCounterDraftOptions {
  readonly band: SmartBand;
  readonly smartScore: number;
  readonly clauseAnalyses: ReadonlyArray<ClauseAnalysis>;
  readonly companyName?: string;
  readonly companySector?: string;
  readonly founderName?: string;
  readonly recipientName?: string;
  readonly roundContextSummary?: string;
  /** Conversation id for the cascade trace. Should be analysis-scoped. */
  readonly conversationId: string;
}

/**
 * Generate a counter term sheet draft. Always resolves; falls back to
 * the deterministic template when the cascade is offline or its output
 * doesn't parse / validate.
 */
export async function generateCounterDraft(
  opts: GenerateCounterDraftOptions,
): Promise<CounterDraftResult> {
  return withTraceSpan(
    'olivia.deal_protection.generate_counter_draft',
    {
      'olivia.smart_band': opts.band,
      'olivia.smart_score': opts.smartScore,
      'olivia.clause_count': opts.clauseAnalyses.length,
    },
    async () => {
      const promptCtx: CounterPromptContext = {
        band: opts.band,
        smartScore: opts.smartScore,
        clauseAnalyses: opts.clauseAnalyses,
        companyName: opts.companyName,
        companySector: opts.companySector,
        founderName: opts.founderName,
        recipientName: opts.recipientName,
        roundContextSummary: opts.roundContextSummary,
      };

      const cascade = await runModelCascade({
        conversationId: opts.conversationId,
        message: buildCounterDraftPrompt(promptCtx),
        intent: 'operations',
        recalledContext: [],
        integrationSnapshot: {},
      });

      const attempts: ReadonlyArray<ClauseClassificationAttempt> =
        cascade.attempts.map((a) => ({
          providerId: a.providerId,
          modelId: a.modelId,
          success: a.success,
          durationMs: a.durationMs,
        }));

      if (cascade.runtimeMode === 'mock') {
        return mockResult(opts, cascade, attempts);
      }

      const parsed = parseAndValidateCascade(cascade.text);
      if (!parsed) {
        return mockResult(opts, cascade, attempts);
      }

      const redlinedMarkdown = renderCounterMarkdown(parsed);
      return {
        ...parsed,
        redlinedMarkdown,
        providerId: cascade.providerId,
        modelId: cascade.modelId,
        runtimeMode: 'live',
        attempts,
      };
    },
  );
}

/**
 * Render a structured counter payload as the markdown blob persisted
 * onto `CounterTermSheet.redlinedMarkdown`. Pure function; safe to
 * call from non-async code paths.
 */
export function renderCounterMarkdown(payload: CounterDraftPayload): string {
  const lines: string[] = [];
  lines.push(payload.preamble.trim());
  lines.push('');
  lines.push('## Redlines');
  lines.push('');
  payload.changes.forEach((change, idx) => {
    lines.push(`### ${idx + 1}. ${formatClauseType(change.clauseType)}`);
    lines.push('');
    lines.push(`**Original:** ${change.originalText.trim()}`);
    lines.push('');
    lines.push(`**Counter:** ${change.counterText.trim()}`);
    lines.push('');
    lines.push(`**Rationale:** ${change.rationale.trim()}`);
    lines.push('');
  });
  lines.push(payload.closing.trim());
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────
// Internals
// ─────────────────────────────────────────────────────────────────────

function parseAndValidateCascade(
  text: string,
): z.infer<typeof CounterDraftPayloadSchema> | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    return null;
  }
  const validated = CounterDraftPayloadSchema.safeParse(parsed);
  return validated.success ? validated.data : null;
}

function mockResult(
  opts: GenerateCounterDraftOptions,
  cascade: { providerId: string; modelId: string },
  attempts: ReadonlyArray<ClauseClassificationAttempt>,
): CounterDraftResult {
  const payload = renderTemplateCounterDraft({
    band: opts.band,
    clauseAnalyses: opts.clauseAnalyses,
    companyName: opts.companyName,
    founderName: opts.founderName,
    recipientName: opts.recipientName,
  });
  const redlinedMarkdown = renderCounterMarkdown(payload);
  return {
    ...payload,
    redlinedMarkdown,
    providerId: cascade.providerId,
    modelId: cascade.modelId,
    runtimeMode: 'mock',
    attempts,
  };
}

function formatClauseType(t: string): string {
  return t
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

export type { CounterChange };
