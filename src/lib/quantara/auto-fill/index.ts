/**
 * Quantara Q3 — auto-fill barrel.
 *
 * Public surface for the "Let Olivia complete the rest" orchestrator.
 * The Q3 API route (`/api/founder-intake/auto-fill`) and the Q3 UI
 * (`IntakeForm`'s sidebar dispatch) consume from here so the
 * underlying extractor file structure stays free to evolve.
 */
export {
  type QuantaraSuggestion,
  type QuantaraSuggestionSource,
  type QuantaraSuggestionSourceId,
  type AutoFillContext,
  type AutoFillSummary,
  SUGGESTION_SOURCE_LABEL,
} from "./types";

export { runAutoFill } from "./orchestrator";

export { extractStripeSuggestions } from "./extractors/stripe";
export { extractGitHubSuggestions } from "./extractors/github";
export { extractCompaniesHouseSuggestions } from "./extractors/companies-house";
export { extractLinkedInSuggestions } from "./extractors/linkedin";
export { extractQuickBooksSuggestions } from "./extractors/quickbooks";
export { extractXeroSuggestions } from "./extractors/xero";
export { extractSupabaseSuggestions } from "./extractors/supabase";
export { extractFounderDefaultsSuggestions } from "./extractors/founder-defaults";
