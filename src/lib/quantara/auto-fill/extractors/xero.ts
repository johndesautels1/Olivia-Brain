/**
 * Xero → Quantara field extractor.
 *
 * UK-first accounting integration. Same shape as QuickBooks minus
 * cash-on-hand (Xero exposes it via a separate Balance Sheet endpoint
 * we don't pull in O1's narrow read-only client). Confidence is
 * strictly lower than QuickBooks for the overlapping fields so that
 * QB wins on tie-break when both are connected.
 */
import {
  fetchXeroRollup,
  type IntegrationResponse,
  type XeroRollup,
} from "@/lib/tools/integrations";
import {
  SUGGESTION_SOURCE_LABEL,
  type QuantaraSuggestion,
} from "../types";

const DEFAULT_TENANT = "0";

function penceToGbp(pence: number): number {
  return Math.round(pence / 100);
}

export async function extractXeroSuggestions(
  tenantId?: string,
): Promise<ReadonlyArray<QuantaraSuggestion>> {
  const target = tenantId ?? DEFAULT_TENANT;
  const res: IntegrationResponse<XeroRollup> = await fetchXeroRollup(target);
  if (!res.ok || !res.data) return [];
  const r = res.data;
  const baseSource = {
    integration: "xero" as const,
    label: SUGGESTION_SOURCE_LABEL.xero,
    fetchedAt: res.source.fetchedAt,
    mockMode: res.mockMode,
  };

  const revenue = penceToGbp(r.revenueTtmPence);
  const expenses = penceToGbp(r.expensesTtmPence);
  const netIncome = penceToGbp(r.netIncomeTtmPence);
  const monthlyBurn =
    netIncome < 0 ? Math.round(Math.abs(netIncome) / 12) : Math.round(expenses / 12);
  const netMarginPct =
    revenue > 0 ? Number(((netIncome / revenue) * 100).toFixed(1)) : 0;

  /* Confidence floor 0.05 below QuickBooks for shared fields. */
  return [
    {
      fieldId: "f1",
      value: revenue,
      confidence: Math.max(0, res.source.confidence - 0.20),
      source: { ...baseSource, note: "TTM revenue (Stripe / QB win on tie)" },
    },
    {
      fieldId: "f6",
      value: netMarginPct,
      confidence: Math.max(0, res.source.confidence - 0.15),
      source: { ...baseSource, note: "Derived from TTM net income / revenue" },
    },
    {
      fieldId: "f7",
      value: netIncome,
      confidence: Math.max(0, res.source.confidence - 0.20),
      source: { ...baseSource, note: "TTM net income (proxy for EBITDA)" },
    },
    {
      fieldId: "f8",
      value: monthlyBurn,
      confidence: Math.max(0, res.source.confidence - 0.25),
      source: { ...baseSource, note: "Derived from TTM expenses / 12" },
    },
  ];
}
