/**
 * CLUES Intelligence — Smart Score Engine
 *
 * Normalizes raw LLM consensus scores → 0-100 Smart Scores.
 * Applies judge overrides, dual scoring (legal vs lived),
 * confidence levels, and source aggregation.
 *
 * This is the core scoring math. It does NOT handle:
 * - Category rollup (see categoryRollup.ts)
 * - Relative scoring (see relativeScoring.ts)
 * - Winner determination (see relativeScoring.ts)
 *
 * Flow:
 *   OrchestrationResult + JudgeReport → MetricSmartScore[]
 */

import type {
  OrchestrationResult,
  MetricConsensus,
  LocationConsensus,
  EvaluationMetric,
} from '../types/evaluation';
import type { JudgeReport, MetricOverride } from '../types/judge';
import type {
  MetricSmartScore,
  MetricSource,
  DualScore,
  ConfidenceLevel,
} from '../types/smartScore';
import {
  CONFIDENCE_THRESHOLDS,
  DEFAULT_LAW_LIVED_RATIO,
} from '../types/smartScore';

// ─── Confidence Level Calculation ────────────────────────────

/**
 * Derive confidence level from standard deviation (§15.5).
 *   σ < 5  → unanimous
 *   σ < 12 → strong
 *   σ < 20 → moderate
 *   σ ≥ 20 → split
 */
export function getConfidenceLevel(stdDev: number): ConfidenceLevel {
  if (stdDev < CONFIDENCE_THRESHOLDS.unanimous) return 'unanimous';
  if (stdDev < CONFIDENCE_THRESHOLDS.strong) return 'strong';
  if (stdDev < CONFIDENCE_THRESHOLDS.moderate) return 'moderate';
  return 'split';
}

// ─── Score Normalization ─────────────────────────────────────

/**
 * Clamp a score to the 0-100 range, rounded to 2 decimal places.
 * Note: evaluationOrchestrator uses integer rounding (Math.round) for consensus
 * scores; this retains 2-decimal precision for weighted/averaged Smart Scores.
 */
export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score * 100) / 100));
}

/**
 * Normalize a raw numeric value to 0-100 using linear interpolation.
 * Used for metrics with known min/max ranges.
 */
export function normalizeNumeric(
  value: number,
  min: number,
  max: number,
  lowerIsBetter: boolean = false
): number {
  if (max === min) return 50; // Avoid division by zero
  const normalized = ((value - min) / (max - min)) * 100;
  const score = lowerIsBetter ? 100 - normalized : normalized;
  return clampScore(score);
}

/**
 * Normalize a boolean value to a score.
 */
export function normalizeBoolean(
  value: boolean,
  lowerIsBetter: boolean = false
): number {
  const score = value ? 100 : 0;
  return lowerIsBetter ? 100 - score : score;
}

// ─── Dual Scoring (Legal vs Lived) ───────────────────────────

/**
 * Categories where dual scoring (legal vs lived) is applicable.
 * These categories frequently have divergence between law and practice.
 */
const DUAL_SCORE_CATEGORIES = new Set([
  'safety_security',
  'legal_immigration',
  'social_values_governance',
  'sexual_beliefs_practices_laws',
  'religion_spirituality',
]);

/**
 * Check if a metric should use dual scoring based on its category.
 */
export function isDualScoreMetric(category: string): boolean {
  return DUAL_SCORE_CATEGORIES.has(category);
}

/**
 * Compute dual score from legal and enforcement values.
 *
 * Default: 50/50 weighting (§15.3)
 * Conservative mode: MIN(legal, enforcement) for pessimistic view
 */
export function computeDualScore(
  legalScore: number,
  enforcementScore: number,
  legalWeight: number = DEFAULT_LAW_LIVED_RATIO.legal,
  enforcementWeight: number = DEFAULT_LAW_LIVED_RATIO.lived
): DualScore {
  const combined = clampScore(
    legalScore * legalWeight + enforcementScore * enforcementWeight
  );
  const conservative = Math.min(legalScore, enforcementScore);

  return {
    legalScore: clampScore(legalScore),
    enforcementScore: clampScore(enforcementScore),
    legalWeight,
    enforcementWeight,
    combinedScore: combined,
    conservativeScore: clampScore(conservative),
  };
}

// ─── Judge Override Application ──────────────────────────────

/**
 * Build a lookup map from judge overrides for fast access.
 * Key format: "metric_id:location"
 */
function buildOverrideMap(
  overrides: MetricOverride[]
): Map<string, MetricOverride> {
  const map = new Map<string, MetricOverride>();
  for (const override of overrides) {
    map.set(`${override.metric_id}:${override.location}`, override);
  }
  return map;
}

// ─── Core: Consensus → MetricSmartScore ──────────────────────

/**
 * Convert a MetricConsensus + LocationConsensus into a MetricSmartScore
 * for a specific location, applying any judge overrides.
 */
export function computeMetricSmartScore(
  consensus: MetricConsensus,
  locationConsensus: LocationConsensus,
  metricMeta: EvaluationMetric | undefined,
  override: MetricOverride | undefined,
  useConservativeScoring: boolean = false
): MetricSmartScore {
  // Start with consensus mean as the raw score
  const rawConsensusScore = clampScore(locationConsensus.mean);

  // Apply judge override if present
  const judgeOverridden = override !== undefined;
  const finalScore = judgeOverridden
    ? clampScore(override.judgeScore)
    : rawConsensusScore;

  // Compute dual score if applicable and judge provided legal/enforcement scores
  let dualScore: DualScore | undefined;
  const category = metricMeta?.category ?? '';
  if (isDualScoreMetric(category) && override?.legalScore != null && override?.enforcementScore != null) {
    dualScore = computeDualScore(
      override.legalScore,
      override.enforcementScore
    );
  }

  // Use dual combined score (or conservative) as final if dual scoring applies
  const effectiveScore =
    dualScore != null
      ? useConservativeScoring
        ? dualScore.conservativeScore
        : dualScore.combinedScore
      : finalScore;

  // Confidence from stdDev
  const confidence = getConfidenceLevel(consensus.stdDev);

  return {
    metric_id: consensus.metric_id,
    fieldId: metricMeta?.fieldId ?? consensus.metric_id,
    description: metricMeta?.description ?? '',
    category,
    source_paragraph: metricMeta?.source_paragraph ?? 0,
    data_type: metricMeta?.data_type ?? 'numeric',

    score: effectiveScore,
    rawConsensusScore,
    judgeOverridden,
    judgeScore: judgeOverridden ? override.judgeScore : undefined,
    judgeExplanation: judgeOverridden ? override.judgeExplanation : undefined,

    dualScore,

    confidence,
    stdDev: consensus.stdDev,
    contributingModels: consensus.contributingModels,

    sources: extractSources(locationConsensus),
  };
}

/**
 * Extract source citations from a LocationConsensus.
 *
 * M1 KNOWN GAP: This is a stub. Returns [] for every metric.
 *
 * The raw LLM evaluation responses DO contain source strings (each LLM's
 * `data_justification` and `source` fields are populated via Tavily research).
 * Those strings survive into JudgeLLMScore.source for judge review. However,
 * no code currently transforms them into MetricSource[] objects ({ name, url,
 * excerpt }) at the Smart Score level.
 *
 * To fix: LocationConsensus needs to carry forward aggregated source strings
 * from the evaluation phase. Then this function should parse URLs from those
 * strings and build MetricSource[] objects. Until then, the `sources` field
 * on every MetricSmartScore is always [].
 */
function extractSources(_locationConsensus: LocationConsensus): MetricSource[] {
  // TODO: Aggregate source citations from upstream LLM evaluation responses.
  // The data exists in EvaluatorResult.response.evaluations[].metric_scores[].source
  // but LocationConsensus does not currently carry it through.
  return [];
}

// ─── Main Engine: Compute All MetricSmartScores ──────────────

/**
 * The main entry point for the Smart Score engine.
 *
 * Takes the full orchestration result + judge report and produces
 * MetricSmartScore[] for every (metric, location) pair.
 *
 * @returns Map of location → MetricSmartScore[]
 */
export function computeAllMetricSmartScores(
  orchestrationResult: OrchestrationResult,
  judgeReport: JudgeReport | null,
  metrics: EvaluationMetric[],
  useConservativeScoring: boolean = false
): Map<string, MetricSmartScore[]> {
  // Build lookup maps
  const metricMap = new Map<string, EvaluationMetric>();
  for (const m of metrics) {
    metricMap.set(m.id, m);
  }

  const overrideMap = judgeReport
    ? buildOverrideMap(judgeReport.metricOverrides)
    : new Map<string, MetricOverride>();

  // Collect all consensus results across all waves/categories
  const allConsensus: MetricConsensus[] = [];
  for (const wave of orchestrationResult.waves) {
    for (const batch of wave.results) {
      allConsensus.push(...batch.consensus);
    }
  }

  // Build per-location scores
  const locationScores = new Map<string, MetricSmartScore[]>();

  for (const consensus of allConsensus) {
    const metricMeta = metricMap.get(consensus.metric_id);

    for (const locConsensus of consensus.locations) {
      const key = locConsensus.location;
      const override = overrideMap.get(
        `${consensus.metric_id}:${locConsensus.location}`
      );

      const smartScore = computeMetricSmartScore(
        consensus,
        locConsensus,
        metricMeta,
        override,
        useConservativeScoring
      );

      if (!locationScores.has(key)) {
        locationScores.set(key, []);
      }
      locationScores.get(key)!.push(smartScore);
    }
  }

  return locationScores;
}

// ─── Utility: Score Statistics ───────────────────────────────

/**
 * Compute mean of an array of numbers, excluding nulls/NaNs.
 */
export function mean(values: number[]): number {
  const valid = values.filter((v) => !isNaN(v));
  if (valid.length === 0) return 0;
  return valid.reduce((sum, v) => sum + v, 0) / valid.length;
}

/**
 * Compute median of an array of numbers.
 */
export function median(values: number[]): number {
  const sorted = [...values].filter((v) => !isNaN(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Compute sample standard deviation (Bessel's correction: n-1).
 *
 * Why n-1, not n: With 3-5 LLMs responding per metric, the scores are a
 * sample of the full evaluator panel (not all 5 always respond). Population
 * stdDev (÷n) underestimates true spread by 10-20% at n=3, which can let
 * genuinely disputed metrics slip past the σ>15 judge-review threshold.
 * Using n-1 is the conservative choice — it inflates σ slightly, sending
 * borderline metrics to Opus judge review rather than letting them pass.
 *
 * This matches evaluationOrchestrator.computeStdDev() (M1 fix).
 * Both functions MUST use the same divisor to prevent confidence drift.
 */
export function stdDev(values: number[]): number {
  const valid = values.filter((v) => !isNaN(v));
  if (valid.length < 2) return 0;
  const avg = mean(valid);
  const squaredDiffs = valid.map((v) => (v - avg) ** 2);
  return Math.sqrt(squaredDiffs.reduce((s, d) => s + d, 0) / (valid.length - 1));
}
