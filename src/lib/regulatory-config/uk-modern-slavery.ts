/**
 * UK Modern Slavery Act 2015, section 54 — reporting-threshold constants.
 *
 * Companies whose annual turnover meets or exceeds the threshold below
 * MUST publish a Modern Slavery Statement (s.54). Smaller companies
 * often choose to publish voluntarily as an enterprise-buyer-readiness
 * signal. This module is the single source of truth across Olivia
 * Brain; per Architecture Standards Law 6 (~/CLAUDE.md), no agent or
 * route may inline `36_000_000` / `"£36M"` literals. Updates land
 * here and propagate to every consumer.
 *
 * Authoritative source:
 *   https://www.gov.uk/government/publications/transparency-in-supply-chains-a-practical-guide
 *
 * `validUntil` invariant: bump on each annual review or on any
 * Home Office / HM Treasury announcement that changes the threshold.
 * The Law-6 stale-config guard (sibling
 * `__tests__/uk-modern-slavery.test.ts`) fails when `validUntil` is
 * within 90 days of expiry, giving the team a quarter to extend the
 * date or update the value before downstream agents start surfacing
 * stale advice.
 *
 * Held to Apple / IBM / Microsoft / Google 2026 leading coding
 * practices per `~/CLAUDE.md` and
 * `docs/api-specs/_MASTER_REGISTER.md` section 10.4.
 */

export const UK_MODERN_SLAVERY = {
  /** UK statutory turnover threshold in GBP (currently £36M). */
  turnoverThresholdGbp: 36_000_000 as const,

  /** Jurisdiction the threshold applies to. */
  jurisdiction: "UK" as const,

  /** Citation for the threshold — used in generated statements. */
  legislation: "Modern Slavery Act 2015, s.54" as const,

  /** Authoritative source URL — kept for citation + future review. */
  source:
    "https://www.gov.uk/government/publications/transparency-in-supply-chains-a-practical-guide" as const,

  /**
   * Date (ISO 8601, YYYY-MM-DD) beyond which the threshold should be
   * re-verified. The stale-config guard fails if this is within 90
   * days of `today`. Bump on each annual review (or sooner if the
   * statute changes).
   */
  validUntil: "2026-12-31" as const,
} as const;

export type UkModernSlavery = typeof UK_MODERN_SLAVERY;

/**
 * Human-readable formatted threshold string in £NNm form (e.g. "£36M").
 * Centralised so callers do not re-derive the formatting and risk
 * drift when the value changes.
 */
export function formatUkModernSlaveryThreshold(): string {
  const millions = UK_MODERN_SLAVERY.turnoverThresholdGbp / 1_000_000;
  return `£${millions.toFixed(0)}M`;
}
