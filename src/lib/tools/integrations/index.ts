/**
 * Q3 read-only integrations registry (Track O Session O1).
 *
 * Q3's "Let Olivia complete the rest" auto-fill button calls these to populate
 * fields on the Quantara 56-field intake form. Each integration:
 *
 * - Returns an `IntegrationResponse<T>` with a `mockMode` flag.
 * - Falls back to a deterministic plausible payload when its API key is
 *   absent (so the form ships day 1).
 * - Carries `source.confidence` in 0.5 (mock) / 0.9 (real) so Q4's
 *   truth-score-agent can reconcile against user-entered values.
 */

export { fetchStripeMetrics, type StripeMetrics } from "./stripe";
export { fetchGitHubRepoStats, type GitHubRepoStats } from "./github";
export { fetchLinkedInCompany, type LinkedInCompanyProfile } from "./linkedin";
export { fetchQuickBooksRollup, type QuickBooksRollup } from "./quickbooks";
export { fetchXeroRollup, type XeroRollup } from "./xero";
export {
  fetchCompaniesHouseProfile,
  type CompaniesHouseProfile,
} from "./companies-house";
export { fetchSupabaseStats, type SupabaseProjectStats } from "./supabase";

export {
  type IntegrationResponse,
  type IntegrationSource,
  MOCK_MODE_CONFIDENCE,
  REAL_API_CONFIDENCE,
  INTEGRATION_TIMEOUT_MS,
} from "./_types";

/** Stable ids the Q3 UI uses to render the source chip ("Stripe-derived",
 *  "GitHub-derived", etc.). One per integration. */
export const Q3_INTEGRATION_IDS = [
  "stripe",
  "github",
  "linkedin",
  "quickbooks",
  "xero",
  "companies_house",
  "supabase",
] as const;

export type Q3IntegrationId = (typeof Q3_INTEGRATION_IDS)[number];
