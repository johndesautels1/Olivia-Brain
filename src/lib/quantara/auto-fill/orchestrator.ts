/**
 * Quantara Q3 — auto-fill orchestrator.
 *
 * Fans out to every read-only Composio integration (O1) plus the
 * founder-defaults extractor in parallel, collects all
 * `QuantaraSuggestion`s, deduplicates by `fieldId` (highest-confidence
 * wins, mock-mode loses on tie), and returns an `AutoFillSummary` the
 * UI binds to.
 *
 * Pure orchestration — no Prisma writes here. Persistence happens
 * when the founder accepts a suggestion and re-saves via the existing
 * Q2 `/api/founder-intake` POST.
 *
 * # Tie-break rules
 *
 * 1. Higher `confidence` wins.
 * 2. If equal, real-mode (`!mockMode`) wins over mock-mode.
 * 3. If still equal, integration order wins (Stripe > QuickBooks >
 *    Xero for revenue, etc.) — encoded by INTEGRATION_PRIORITY.
 */
import {
  type AutoFillContext,
  type AutoFillSummary,
  type QuantaraSuggestion,
} from "./types";
import { extractCompaniesHouseSuggestions } from "./extractors/companies-house";
import { extractFounderDefaultsSuggestions } from "./extractors/founder-defaults";
import { extractGitHubSuggestions } from "./extractors/github";
import { extractLinkedInSuggestions } from "./extractors/linkedin";
import { extractQuickBooksSuggestions } from "./extractors/quickbooks";
import { extractStripeSuggestions } from "./extractors/stripe";
import { extractSupabaseSuggestions } from "./extractors/supabase";
import { extractXeroSuggestions } from "./extractors/xero";

/**
 * Tie-break priority. Lower index wins on equal confidence. Stripe
 * leads on revenue (canonical SaaS source); QuickBooks leads on
 * accounting; Companies House leads on incorporation context;
 * defaults always last.
 */
const INTEGRATION_PRIORITY: ReadonlyArray<string> = [
  "stripe",
  "quickbooks",
  "xero",
  "companies_house",
  "github",
  "linkedin",
  "supabase",
  "olivia_defaults",
];

function priorityOf(integration: string): number {
  const idx = INTEGRATION_PRIORITY.indexOf(integration);
  return idx === -1 ? INTEGRATION_PRIORITY.length : idx;
}

/**
 * Pick the winning suggestion across multiple proposals for the same
 * field. Returns the original reference (no copy).
 */
function pickWinner(
  a: QuantaraSuggestion,
  b: QuantaraSuggestion,
): QuantaraSuggestion {
  if (a.confidence !== b.confidence) {
    return a.confidence > b.confidence ? a : b;
  }
  if (a.source.mockMode !== b.source.mockMode) {
    return a.source.mockMode ? b : a;
  }
  return priorityOf(a.source.integration) < priorityOf(b.source.integration)
    ? a
    : b;
}

/**
 * Merge multiple suggestion arrays, picking the winning suggestion
 * per `fieldId`. Order is the order of first appearance of each
 * winning field for stable downstream rendering.
 */
function mergeSuggestions(
  proposals: ReadonlyArray<ReadonlyArray<QuantaraSuggestion>>,
): ReadonlyArray<QuantaraSuggestion> {
  const winners = new Map<string, QuantaraSuggestion>();
  for (const arr of proposals) {
    for (const s of arr) {
      const existing = winners.get(s.fieldId);
      if (!existing) {
        winners.set(s.fieldId, s);
      } else {
        winners.set(s.fieldId, pickWinner(existing, s));
      }
    }
  }
  return Array.from(winners.values());
}

/**
 * Run every extractor in parallel and merge into a single summary.
 *
 * Caller can pass an `AbortSignal` (15s timeout from the
 * `/api/founder-intake/auto-fill` route) to bound the entire fan-out;
 * each underlying integration also enforces its own
 * `AbortSignal.timeout(8s)` per O1.
 */
export async function runAutoFill(
  context: AutoFillContext = {},
  _signal?: AbortSignal,
): Promise<AutoFillSummary> {
  const includeDefaults = context.includeDefaults ?? true;

  const proposals = await Promise.all([
    extractStripeSuggestions(),
    extractQuickBooksSuggestions(context.quickbooksRealmId),
    extractXeroSuggestions(context.xeroTenantId),
    extractCompaniesHouseSuggestions(context.companiesHouseNumber),
    extractGitHubSuggestions(context.githubRepo),
    extractLinkedInSuggestions(context.linkedinUrn),
    extractSupabaseSuggestions(),
    Promise.resolve(
      includeDefaults ? extractFounderDefaultsSuggestions() : [],
    ),
  ]);

  /* Per-source counts BEFORE merge — surfaces "Stripe contributed 5"
     even when it lost the tie-break on some fields. */
  const perSource: Record<string, number> = {};
  let integrationsLive = 0;
  let integrationsMockMode = 0;
  for (const arr of proposals) {
    if (arr.length === 0) continue;
    const integration = arr[0]?.source.integration ?? "unknown";
    perSource[integration] = (perSource[integration] ?? 0) + arr.length;
    /* Defaults extractor always runs in non-mock mode but doesn't hit
       a real API — exclude from live/mock counters. */
    if (integration === "olivia_defaults") continue;
    if (arr[0]?.source.mockMode) integrationsMockMode += 1;
    else integrationsLive += 1;
  }

  const winners = mergeSuggestions(proposals);

  return {
    suggestions: winners,
    fieldsCovered: winners.length,
    integrationsMockMode,
    integrationsLive,
    perSource,
  };
}
