/**
 * Plan-tier shape — re-exports the canonical types from
 * `@/lib/require-tier` so callers that follow LTM's `@/types/plan-tier`
 * convention continue to compile.
 */

import { TIER_METADATA, type PlanTier } from "@/lib/require-tier";

export type { PlanTier } from "@/lib/require-tier";
export { TIER_METADATA, tierAtLeast } from "@/lib/require-tier";

/**
 * LTM exposes a `TIER_DISPLAY_NAMES` lookup keyed by tier id; OB derives
 * the same shape from `TIER_METADATA` so consumers can drop in unchanged.
 */
export const TIER_DISPLAY_NAMES: Record<PlanTier, string> = {
  free: TIER_METADATA.free.displayName,
  developer: TIER_METADATA.developer.displayName,
  executive: TIER_METADATA.executive.displayName,
  enterprise: TIER_METADATA.enterprise.displayName,
};
