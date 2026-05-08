/**
 * Plan-tier types + pure helpers.
 *
 * **Source of truth for plan-tier shape** — `@/lib/require-tier`
 * imports from this file (not the other way around) so client
 * components can pull `PlanTier` / `tierAtLeast` / `TIER_DISPLAY_NAMES`
 * without transitively pulling `@clerk/nextjs/server` into the
 * client SSR bundle.
 *
 * This split landed in Track B Session 8d-routes-2 to fix a Vercel
 * build error: `ValuationWorkbench` (a client component) imported
 * `PlanTier` from `@/types/plan-tier`, which previously re-exported
 * from `@/lib/require-tier`, which imports `getAuthSession` from
 * `auth/session`, which imports `auth` from `@clerk/nextjs/server`.
 * The Clerk server module is server-only — bundling it into the
 * client SSR pass made `npm run build` fail with "Client Component
 * SSR" errors. Inverting the import direction (this file is now the
 * source; require-tier consumes it) breaks the chain.
 */

export type PlanTier = "free" | "developer" | "executive" | "enterprise";

const TIER_ORDER: Record<PlanTier, number> = {
  free: 0,
  developer: 1,
  executive: 2,
  enterprise: 3,
};

export const TIER_METADATA: Record<PlanTier, { displayName: string }> = {
  free: { displayName: "Free" },
  developer: { displayName: "Developer" },
  executive: { displayName: "Executive" },
  enterprise: { displayName: "Enterprise" },
};

export function tierAtLeast(actual: PlanTier, required: PlanTier): boolean {
  return TIER_ORDER[actual] >= TIER_ORDER[required];
}

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
