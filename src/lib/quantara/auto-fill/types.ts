/**
 * Quantara Q3 — auto-fill type contracts.
 *
 * "Let Olivia complete the rest" surfaces a `QuantaraSuggestion` per
 * field, derived from one of the 7 read-only Composio integrations
 * shipped in O1 (`src/lib/tools/integrations/`) or from a baseline
 * founder-defaults extractor that contributes industry-benchmark
 * starting values at low confidence.
 *
 * The Q2 form holds these in a `Map<QuantaraFieldId, QuantaraSuggestion>`;
 * `IntakeField` renders a per-field source chip + accept (✓) / reject
 * (✗) / edit (manual override) affordance. Accept writes the suggested
 * value; reject dismisses; manual edit dismisses + writes the user's
 * value.
 *
 * Q4's truth-score-agent (post-Q3) compares user-entered values
 * against suggestions to surface discrepancy chips. That's a separate
 * code path; Q3 itself never persists rejected/edited deltas.
 */
import type { QuantaraFieldId } from "@/lib/quantara";
import type { Q3IntegrationId } from "@/lib/tools/integrations";

/** Stable source identifiers that surface in the per-field chip. */
export type QuantaraSuggestionSourceId =
  | Q3IntegrationId
  | "olivia_defaults";

/** Human-readable chip label shown next to the field. */
export const SUGGESTION_SOURCE_LABEL: Readonly<
  Record<QuantaraSuggestionSourceId, string>
> = Object.freeze({
  stripe: "Stripe-derived",
  github: "GitHub-derived",
  linkedin: "LinkedIn-derived",
  quickbooks: "QuickBooks-derived",
  xero: "Xero-derived",
  companies_house: "Companies-House-derived",
  supabase: "Supabase-derived",
  olivia_defaults: "Olivia industry benchmark",
});

export interface QuantaraSuggestionSource {
  /** Stable id (`stripe`, `github`, ..., `olivia_defaults`). */
  readonly integration: QuantaraSuggestionSourceId;
  /** Display label rendered in the per-field chip. */
  readonly label: string;
  /** ISO timestamp the value was fetched / derived. */
  readonly fetchedAt: string;
  /** Optional one-line note ("derived from MRR × 12", "industry median"). */
  readonly note?: string;
  /** Whether the upstream call ran in mock-mode. */
  readonly mockMode: boolean;
}

export interface QuantaraSuggestion {
  /** Which field the suggestion targets (e.g. `f1` for ARR). */
  readonly fieldId: QuantaraFieldId;
  /** Suggested value (typed per `QUANTARA_FIELDS_BY_ID[fieldId].schema`). */
  readonly value: unknown;
  /** 0.0–1.0. Higher = stronger evidence. */
  readonly confidence: number;
  readonly source: QuantaraSuggestionSource;
}

/**
 * Per-call orchestrator context. Every field is optional — when
 * absent the corresponding extractor either short-circuits to its
 * mock-mode payload or skips the integration entirely.
 */
export interface AutoFillContext {
  readonly companyName?: string;
  readonly companiesHouseNumber?: string;
  /** GitHub `owner/repo` shape. */
  readonly githubRepo?: string;
  /** LinkedIn organisation URN. */
  readonly linkedinUrn?: string;
  readonly quickbooksRealmId?: string;
  readonly xeroTenantId?: string;
  /** Whether to include the conservative founder-defaults extractor. */
  readonly includeDefaults?: boolean;
}

export interface AutoFillSummary {
  /** Map of `fieldId -> winning suggestion` (highest-confidence per field). */
  readonly suggestions: ReadonlyArray<QuantaraSuggestion>;
  /** Number of distinct fields covered. */
  readonly fieldsCovered: number;
  /** Number of integrations that ran in mock mode. */
  readonly integrationsMockMode: number;
  /** Number of integrations that ran live. */
  readonly integrationsLive: number;
  /** Per-source counts (e.g. `{ stripe: 5, quickbooks: 7, ... }`). */
  readonly perSource: Readonly<Record<string, number>>;
}
