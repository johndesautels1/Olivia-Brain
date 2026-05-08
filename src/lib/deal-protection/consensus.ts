/**
 * Track P Session P7 — Multi-LLM consensus orchestrator.
 *
 * Runs N evaluators in parallel against the same term sheet, then
 * Opus judges. Different intents on the parallel evaluator calls
 * bias the cascade toward different primary providers, giving
 * directional model-diversity even on top of the existing fallback
 * chain.
 *
 * Always resolves; never throws on the happy path. If every
 * evaluator AND the judge mock out, the result still has well-formed
 * shape (median-of-evaluator-scores + a deterministic dissent
 * narrative).
 */
import { z } from 'zod';

import { runModelCascade } from '@/lib/services/model-cascade';
import { withTraceSpan } from '@/lib/observability/tracer';

import { SMART_BANDS_BY_ID } from './bands';
import type { ClauseAnalysis } from './clause-types';
import {
  buildEvaluatorPrompt,
  buildOpusJudgePrompt,
} from './consensus-prompts';
import {
  CONSENSUS_DEFAULT_EVALUATORS,
  ConsensusVerdictSchema,
  EvaluatorVerdictResponseSchema,
  type ConsensusResult,
  type ConsensusVerdict,
  type EvaluatorVerdict,
} from './consensus-types';
import { clampSmartScore, getSmartBand } from './smart-score';
import type { SmartBand } from './types';

export interface GenerateConsensusOptions {
  readonly companyName?: string;
  readonly companySector?: string;
  readonly investorNames: ReadonlyArray<string>;
  readonly clauseAnalyses: ReadonlyArray<ClauseAnalysis>;
  readonly evaluatorCount?: number;
  readonly conversationId: string;
}

/**
 * Run N parallel evaluators + 1 Opus consensus call. Returns the
 * structured result with per-evaluator verdicts + judge consensus +
 * cascade attempts trail.
 */
export async function generateConsensus(
  opts: GenerateConsensusOptions,
): Promise<ConsensusResult> {
  return withTraceSpan(
    'olivia.deal_protection.consensus',
    {
      'olivia.evaluator_count': opts.evaluatorCount ?? CONSENSUS_DEFAULT_EVALUATORS,
      'olivia.clause_count': opts.clauseAnalyses.length,
    },
    async () => {
      const count = Math.max(2, Math.min(5, opts.evaluatorCount ?? CONSENSUS_DEFAULT_EVALUATORS));

      /* Bias each evaluator toward a different primary provider via
         the intent field. Using a small set of intents the cascade
         knows about — ordering chosen to spread the providers. */
      const intents = ['operations', 'questionnaire', 'research', 'judge', 'operations'] as const;

      const evaluatorPromises = Array.from({ length: count }, (_, i) =>
        runEvaluator({
          ...opts,
          evaluatorIndex: i,
          intent: intents[i] ?? 'operations',
          conversationId: `${opts.conversationId}-eval-${i}`,
        }),
      );
      const evaluatorResults = await Promise.all(evaluatorPromises);
      const evaluators = evaluatorResults.map((r) => r.verdict);
      const evaluatorAttempts = evaluatorResults.flatMap((r) => r.attempts);

      const allEvaluatorsLive = evaluatorResults.every((r) => r.verdict.runtimeMode === 'live');

      const judgeResult = await runOpusJudge(evaluators, `${opts.conversationId}-judge`);
      const verdict = judgeResult.verdict;
      const judgeAttempts = judgeResult.attempts;
      const judgeLive = judgeResult.runtimeMode === 'live';

      const runtimeMode: 'live' | 'mock' = allEvaluatorsLive && judgeLive ? 'live' : 'mock';
      const attempts = [...evaluatorAttempts, ...judgeAttempts];

      return {
        evaluators,
        verdict,
        generatedAt: new Date().toISOString(),
        runtimeMode,
        attempts,
      };
    },
  );
}

// ─────────────────────────────────────────────────────────────────────
// Internals
// ─────────────────────────────────────────────────────────────────────

interface EvaluatorRunResult {
  readonly verdict: EvaluatorVerdict;
  readonly attempts: ReadonlyArray<{
    readonly providerId: string;
    readonly modelId: string;
    readonly success: boolean;
    readonly durationMs: number;
  }>;
}

async function runEvaluator(opts: {
  readonly companyName?: string;
  readonly companySector?: string;
  readonly investorNames: ReadonlyArray<string>;
  readonly clauseAnalyses: ReadonlyArray<ClauseAnalysis>;
  readonly evaluatorIndex: number;
  readonly intent: 'operations' | 'questionnaire' | 'research' | 'judge';
  readonly conversationId: string;
}): Promise<EvaluatorRunResult> {
  const cascade = await runModelCascade({
    conversationId: opts.conversationId,
    message: buildEvaluatorPrompt({
      companyName: opts.companyName,
      companySector: opts.companySector,
      investorNames: opts.investorNames,
      clauseAnalyses: opts.clauseAnalyses,
      evaluatorIndex: opts.evaluatorIndex,
    }),
    intent: opts.intent,
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
    return {
      verdict: makeFallbackEvaluatorVerdict(opts.clauseAnalyses, cascade),
      attempts,
    };
  }

  const parsed = parseEvaluatorJson(cascade.text);
  if (!parsed) {
    return {
      verdict: makeFallbackEvaluatorVerdict(opts.clauseAnalyses, cascade),
      attempts,
    };
  }

  const score = clampSmartScore(parsed.smartScore);
  return {
    verdict: {
      providerId: cascade.providerId,
      modelId: cascade.modelId,
      smartScore: score,
      smartBand: getSmartBand(score),
      headline: parsed.headline,
      runtimeMode: 'live',
    },
    attempts,
  };
}

interface JudgeRunResult {
  readonly verdict: ConsensusVerdict;
  readonly runtimeMode: 'live' | 'mock';
  readonly attempts: ReadonlyArray<{
    readonly providerId: string;
    readonly modelId: string;
    readonly success: boolean;
    readonly durationMs: number;
  }>;
}

async function runOpusJudge(
  evaluators: ReadonlyArray<EvaluatorVerdict>,
  conversationId: string,
): Promise<JudgeRunResult> {
  const cascade = await runModelCascade({
    conversationId,
    message: buildOpusJudgePrompt({ evaluators }),
    intent: 'judge',
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
    return {
      verdict: deterministicConsensus(evaluators),
      runtimeMode: 'mock',
      attempts,
    };
  }

  const parsed = parseConsensusJson(cascade.text);
  if (!parsed) {
    return {
      verdict: deterministicConsensus(evaluators),
      runtimeMode: 'mock',
      attempts,
    };
  }

  return {
    verdict: parsed,
    runtimeMode: 'live',
    attempts,
  };
}

function parseEvaluatorJson(
  text: string,
): z.infer<typeof EvaluatorVerdictResponseSchema> | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    return null;
  }
  const validated = EvaluatorVerdictResponseSchema.safeParse(parsed);
  return validated.success ? validated.data : null;
}

function parseConsensusJson(
  text: string,
): z.infer<typeof ConsensusVerdictSchema> | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    return null;
  }
  const validated = ConsensusVerdictSchema.safeParse(parsed);
  return validated.success ? validated.data : null;
}

function makeFallbackEvaluatorVerdict(
  clauseAnalyses: ReadonlyArray<ClauseAnalysis>,
  cascade: { providerId: string; modelId: string },
): EvaluatorVerdict {
  /* Deterministic fallback — average toxicity inverted, capped per
     severity bands. Mirrors the P3 aggregator in spirit (without
     the cap-aware caps; this is a fallback, not the canonical path). */
  if (clauseAnalyses.length === 0) {
    return {
      providerId: cascade.providerId,
      modelId: cascade.modelId,
      smartScore: 50,
      smartBand: getSmartBand(50),
      headline: 'No clauses available — neutral fallback score.',
      runtimeMode: 'mock',
    };
  }
  const avgToxicity =
    clauseAnalyses.reduce((acc, c) => acc + c.toxicity, 0) / clauseAnalyses.length;
  const score = clampSmartScore(100 - avgToxicity);
  return {
    providerId: cascade.providerId,
    modelId: cascade.modelId,
    smartScore: score,
    smartBand: getSmartBand(score),
    headline: 'Deterministic fallback — averaged clause toxicity inverted.',
    runtimeMode: 'mock',
  };
}

function deterministicConsensus(
  evaluators: ReadonlyArray<EvaluatorVerdict>,
): ConsensusVerdict {
  if (evaluators.length === 0) {
    return {
      consensusScore: 50,
      consensusBand: getSmartBand(50),
      dissentSummary: 'No evaluators available; fallback to neutral.',
      agreementLevel: 'split',
    };
  }
  const scores = evaluators.map((e) => e.smartScore).sort((a, b) => a - b);
  const median = scores[Math.floor(scores.length / 2)];
  const spread = scores[scores.length - 1] - scores[0];
  const agreementLevel: ConsensusVerdict['agreementLevel'] =
    spread <= 5 ? 'strong' : spread <= 15 ? 'moderate' : spread <= 25 ? 'low' : 'split';
  const consensusScore = clampSmartScore(median);
  const consensusBand: SmartBand = getSmartBand(consensusScore);

  const summary =
    evaluators.length === 0
      ? 'No evaluators returned a verdict.'
      : `Median consensus across ${evaluators.length} evaluators: score ${consensusScore.toFixed(0)} (${consensusBand}). Score spread ${spread.toFixed(0)} points (${agreementLevel} agreement). Per-evaluator: ${evaluators
          .map((e) => `${e.providerId}=${e.smartScore.toFixed(0)}`)
          .join(', ')}.`;

  /* Touch the SMART_BANDS_BY_ID export so downstream consumers can
     enrich the consensus with per-band metadata if desired. */
  void SMART_BANDS_BY_ID;

  return {
    consensusScore,
    consensusBand,
    dissentSummary: summary,
    agreementLevel,
  };
}
