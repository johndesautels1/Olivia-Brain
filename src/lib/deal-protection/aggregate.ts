/**
 * Track P Session P3 — smart-score aggregation formula.
 *
 * Maps a list of `ClauseAnalysis` to a 0-100 smart score using
 * **severity-weighted toxicity with severity-band caps** (formula
 * locked 2026-05-08):
 *
 *   weights = { low: 1, medium: 2, high: 4, critical: 8 }
 *   weighted_avg_toxicity = Σ(w[sᵢ] × tᵢ) / Σ(w[sᵢ])
 *   base_score = 100 − weighted_avg_toxicity
 *   if any severity == 'critical':  smart_score = min(base, CRITICAL_CEILING)
 *   elif any severity == 'high':    smart_score = min(base, HIGH_CEILING)
 *   else:                            smart_score = base
 *
 * The caps are essential: a single ratchet anti-dilution clause + 19
 * boilerplate clauses must NOT show as green just because the average
 * is low. One critical clause is dealbreaker-shaped, not averageable.
 *
 * Empty clause list → smartScore = 50 (neutral) so the report is
 * structurally complete; the orchestrator overrides band copy to flag
 * "manual review."
 */
import {
  type ClauseAnalysis,
  type ClauseType,
  type Severity,
} from './clause-types';
import type { CriticalIssue } from './report-types';
import { clampSmartScore } from './smart-score';

const SEVERITY_WEIGHT: Readonly<Record<Severity, number>> = Object.freeze({
  low: 1,
  medium: 2,
  high: 4,
  critical: 8,
});

/** Severity-cap ceilings — see file header. */
export const CRITICAL_CEILING = 39 as const;
export const HIGH_CEILING = 79 as const;

/** Score returned when no clauses were extracted. */
export const NEUTRAL_EMPTY_SCORE = 50 as const;

/** Maximum number of critical issues surfaced in the report header. */
export const CRITICAL_ISSUE_LIMIT = 5 as const;

/** Result bundle from `aggregateClauseAnalyses`. */
export interface AggregationResult {
  /** 0-100 clamped smart score. */
  readonly smartScore: number;
  /** Top critical issues, sorted by toxicity desc. Empty when no `critical` clause. */
  readonly criticalIssues: ReadonlyArray<CriticalIssue>;
  /** True when the critical-band cap was applied. */
  readonly hadCriticalCap: boolean;
  /** True when the high-band cap was applied (and critical was not). */
  readonly hadHighCap: boolean;
  /** True when the input list was empty — caller overrides band copy in this case. */
  readonly emptyInput: boolean;
}

/**
 * Run the aggregation formula on a list of clause analyses.
 *
 * Always returns; never throws. Negative or non-finite toxicity values
 * inside individual clauses (shouldn't happen because P2 schema validates
 * 0-100) are clamped via `clampSmartScore` on the final result.
 */
export function aggregateClauseAnalyses(
  analyses: ReadonlyArray<ClauseAnalysis>,
): AggregationResult {
  if (analyses.length === 0) {
    return {
      smartScore: NEUTRAL_EMPTY_SCORE,
      criticalIssues: [],
      hadCriticalCap: false,
      hadHighCap: false,
      emptyInput: true,
    };
  }

  let weightedSum = 0;
  let weightTotal = 0;
  let hasCritical = false;
  let hasHigh = false;
  for (const a of analyses) {
    const w = SEVERITY_WEIGHT[a.severity];
    weightedSum += w * a.toxicity;
    weightTotal += w;
    if (a.severity === 'critical') hasCritical = true;
    else if (a.severity === 'high') hasHigh = true;
  }

  /* `weightTotal === 0` is unreachable because every Severity has weight ≥ 1
     and we already returned when analyses.length === 0; guard anyway. */
  const weightedAvg = weightTotal > 0 ? weightedSum / weightTotal : 0;
  const baseScore = 100 - weightedAvg;

  let smartScore = baseScore;
  if (hasCritical) {
    smartScore = Math.min(baseScore, CRITICAL_CEILING);
  } else if (hasHigh) {
    smartScore = Math.min(baseScore, HIGH_CEILING);
  }
  smartScore = clampSmartScore(smartScore);

  const criticalIssues: CriticalIssue[] = analyses
    .filter((a) => a.severity === 'critical')
    .sort((a, b) => b.toxicity - a.toxicity)
    .slice(0, CRITICAL_ISSUE_LIMIT)
    .map((a) => ({
      clauseType: a.clauseType,
      summary: a.summary,
      toxicity: a.toxicity,
    }));

  return {
    smartScore,
    criticalIssues,
    hadCriticalCap: hasCritical,
    hadHighCap: !hasCritical && hasHigh,
    emptyInput: false,
  };
}

/**
 * Derive walk-away reasons for a red-band report. Pulled from the
 * critical clauses' summaries plus a band-language preface.
 * Deterministic; no extra cascade call.
 */
export function deriveWalkAwayReasons(
  analyses: ReadonlyArray<ClauseAnalysis>,
  bandLanguage: string,
): ReadonlyArray<string> {
  const out: string[] = [];
  if (bandLanguage.trim().length > 0) {
    out.push(bandLanguage.trim());
  }
  const critical = analyses
    .filter((a) => a.severity === 'critical')
    .sort((a, b) => b.toxicity - a.toxicity)
    .slice(0, CRITICAL_ISSUE_LIMIT);
  for (const c of critical) {
    out.push(`${formatClauseType(c.clauseType)}: ${c.summary}`);
  }
  return out;
}

function formatClauseType(t: ClauseType): string {
  return t
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

/** Frozen constants exported for tests + downstream consumers. */
export const AGGREGATION_CONSTANTS = Object.freeze({
  SEVERITY_WEIGHT,
  CRITICAL_CEILING,
  HIGH_CEILING,
  NEUTRAL_EMPTY_SCORE,
  CRITICAL_ISSUE_LIMIT,
});
