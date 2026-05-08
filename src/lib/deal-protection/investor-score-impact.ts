/**
 * Track P Session P4 — Investor reputation → smart-score tilt.
 *
 * The reputation tilt is **modest by design** (default ±8 max).
 * Reputation is a contextual signal, not a clause-level finding —
 * a known-aggressive investor on an otherwise standard term sheet
 * should nudge the recommendation toward "negotiate harder," but
 * never override the clause analysis.
 *
 * # Cap-aware composition (with `analyze.ts`)
 *
 *   - Negative tilt always allowed (a bad investor on a bad deal
 *     reinforces the verdict).
 *   - Positive tilt is capped by the clause-level severity ceilings:
 *       any 'critical' clause → final score ≤ CRITICAL_CEILING (39)
 *       any 'high' clause     → final score ≤ HIGH_CEILING (79)
 *     A famous investor cannot lift a deal with a critical clause
 *     out of orange. Single dealbreakers stay dealbreakers.
 *
 * # Formula
 *
 *   matched = records with reputationScore in [0, 100]
 *   if matched.length === 0: tilt = 0
 *   else:
 *       avg = mean(matched.reputationScore)
 *       centered = (avg - 50) / 50    // -1.0 to +1.0
 *       tilt = round(centered * REPUTATION_TILT_MAX)
 *
 *   A reputation score of 100 → +REPUTATION_TILT_MAX
 *   A reputation score of   0 → -REPUTATION_TILT_MAX
 *   A reputation score of  50 → 0 (neutral)
 */

import { CRITICAL_CEILING, HIGH_CEILING } from './aggregate';

/** Maximum absolute tilt the reputation lookup can apply. Locked 2026-05-08. */
export const REPUTATION_TILT_MAX = 8 as const;

/**
 * Compute the reputation tilt for a list of reputation scores. Returns
 * 0 when the list is empty. Always returns an integer in
 * [-REPUTATION_TILT_MAX, +REPUTATION_TILT_MAX].
 */
export function computeReputationTilt(reputationScores: ReadonlyArray<number>): number {
  if (reputationScores.length === 0) return 0;
  let sum = 0;
  let count = 0;
  for (const s of reputationScores) {
    if (!Number.isFinite(s)) continue;
    /* Defensive clamp — DB column is Decimal(5,2) so values are
       structurally bounded, but a float drift would otherwise skew
       the average without warning. */
    const clamped = Math.max(0, Math.min(100, s));
    sum += clamped;
    count += 1;
  }
  if (count === 0) return 0;
  const avg = sum / count;
  const centered = (avg - 50) / 50; // -1.0 to +1.0
  const raw = centered * REPUTATION_TILT_MAX;
  /* Round half-away-from-zero so a -7.5 stays at -8 and +7.5 stays at +8. */
  const sign = raw < 0 ? -1 : 1;
  return sign * Math.round(Math.abs(raw));
}

/**
 * Apply a reputation tilt to an aggregated smart score, respecting
 * the clause-level severity caps from P3.
 *
 * @param aggregatedScore   The score from `aggregateClauseAnalyses`,
 *                            already cap-applied if a critical / high
 *                            clause was present.
 * @param tilt              The reputation tilt from `computeReputationTilt`.
 * @param hadCriticalCap    Whether the aggregator applied the critical cap.
 * @param hadHighCap        Whether the aggregator applied the high cap.
 * @returns The cap-aware tilted score, clamped to [0, 100].
 */
export function applyReputationTilt(opts: {
  readonly aggregatedScore: number;
  readonly tilt: number;
  readonly hadCriticalCap: boolean;
  readonly hadHighCap: boolean;
}): number {
  const tilted = opts.aggregatedScore + opts.tilt;
  /* Caps win even when tilt is positive. Negative tilt always allowed. */
  let capped = tilted;
  if (opts.hadCriticalCap) {
    capped = Math.min(capped, CRITICAL_CEILING);
  } else if (opts.hadHighCap) {
    capped = Math.min(capped, HIGH_CEILING);
  }
  if (!Number.isFinite(capped)) return 0;
  if (capped < 0) return 0;
  if (capped > 100) return 100;
  return capped;
}

/* Re-export the ceilings as a stable barrel — callers in `analyze.ts`
   and tests don't need to reach into `aggregate.ts` directly. */
export { CRITICAL_CEILING, HIGH_CEILING };
