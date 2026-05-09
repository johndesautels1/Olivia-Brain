/**
 * OLIVIA BRAIN - AVATAR VENDOR DECISION RUBRIC
 * =============================================
 *
 * Track O5c session 3. Per `docs/O5_AVATAR_LIPSYNC_RESEARCH.md §5`:
 *
 *   composite = latency × 0.4 + lip-sync MOS × 0.4 + cost × 0.2
 *
 * "Latency" and "cost" are inversely good (lower is better) so they
 * are normalised within the candidate set and inverted before
 * composing. MOS is positively good (higher is better) and normalised
 * directly. The composite is in the range [0, 1] where 1 is best.
 *
 * Pure functions only — no I/O, no Prisma, no React. The page at
 * `/admin/avatar-eval/decision` and the harness panel both read from
 * `prisma.avatarEvalRun` then pass arrays through here.
 */

import type { EvalVendor } from "./eval-scripts";

export interface AvatarRunInput {
  vendor: string;
  latencyMs: number;
  mosScore: number | null;
  costCents: number | null;
}

export interface VendorAggregate {
  vendor: EvalVendor | string;
  runCount: number;
  /** Median wall-clock latency in ms across all runs. */
  medianLatencyMs: number;
  /** Mean MOS across runs that have a score (null if none scored). */
  meanMosScore: number | null;
  /** Mean cost in cents across runs that have a cost (null if none). */
  meanCostCents: number | null;
}

export interface VendorRanking extends VendorAggregate {
  /** Composite score in [0, 1]; higher is better. */
  composite: number;
  /** Latency component (already inverted: 1 = best). */
  latencyComponent: number;
  /** MOS component (1 = best). */
  mosComponent: number;
  /** Cost component (already inverted: 1 = best). */
  costComponent: number;
}

export interface RubricWeights {
  latency: number;
  mos: number;
  cost: number;
}

export const DEFAULT_RUBRIC_WEIGHTS: RubricWeights = {
  latency: 0.4,
  mos: 0.4,
  cost: 0.2,
};

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function meanOrNull(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return sum / values.length;
}

/**
 * Group raw runs by vendor and reduce each group to summary stats.
 * Vendors with zero runs are absent from the output.
 */
export function aggregateRunsByVendor(
  runs: readonly AvatarRunInput[],
): VendorAggregate[] {
  const buckets = new Map<string, AvatarRunInput[]>();
  for (const r of runs) {
    const list = buckets.get(r.vendor) ?? [];
    list.push(r);
    buckets.set(r.vendor, list);
  }

  const aggregates: VendorAggregate[] = [];
  for (const [vendor, list] of buckets) {
    const latencies = list.map((r) => r.latencyMs);
    const mosScores = list
      .map((r) => r.mosScore)
      .filter((v): v is number => v != null);
    const costs = list
      .map((r) => r.costCents)
      .filter((v): v is number => v != null);

    aggregates.push({
      vendor,
      runCount: list.length,
      medianLatencyMs: median(latencies),
      meanMosScore: meanOrNull(mosScores),
      meanCostCents: meanOrNull(costs),
    });
  }
  return aggregates;
}

/**
 * Linear normalisation to [0, 1]. When `invertLowerBetter` is true,
 * the lower raw value gets the higher normalised value (used for
 * latency + cost). For tied candidate sets (max === min), every
 * entry gets 1 — "no penalty for being tied" — regardless of
 * direction. Inverting AFTER `1.0` would silently flip ties to 0
 * and falsely punish every candidate.
 */
function normalise(
  values: readonly number[],
  invertLowerBetter = false,
): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 1);
  return values.map((v) => {
    const norm = (v - min) / (max - min);
    return invertLowerBetter ? 1 - norm : norm;
  });
}

/**
 * Apply the rubric to a set of vendor aggregates and return them
 * ranked by composite score (descending). Vendors missing MOS data
 * are excluded — the rubric weights MOS at 40% and a missing score
 * makes the composite incomparable.
 */
export function rankVendors(
  aggregates: readonly VendorAggregate[],
  weights: RubricWeights = DEFAULT_RUBRIC_WEIGHTS,
): VendorRanking[] {
  const scored = aggregates.filter((a) => a.meanMosScore != null);
  if (scored.length === 0) return [];

  const latencies = scored.map((a) => a.medianLatencyMs);
  const mosScores = scored.map((a) => a.meanMosScore as number);
  const costs = scored.map((a) => a.meanCostCents ?? 0);

  // Latency + cost are inverted (lower raw → higher component). MOS is
  // direct (higher raw → higher component). Inversion is pushed
  // inside `normalise` so tie-handling (every entry → 1.0) doesn't
  // silently flip to 0 for the inverted dimensions.
  const latencyN = normalise(latencies, true);
  const mosN = normalise(mosScores, false);
  const costN = normalise(costs, true);

  const rankings: VendorRanking[] = scored.map((a, i) => ({
    ...a,
    latencyComponent: latencyN[i],
    mosComponent: mosN[i],
    costComponent: costN[i],
    composite:
      latencyN[i] * weights.latency +
      mosN[i] * weights.mos +
      costN[i] * weights.cost,
  }));

  return rankings.sort((a, b) => b.composite - a.composite);
}
