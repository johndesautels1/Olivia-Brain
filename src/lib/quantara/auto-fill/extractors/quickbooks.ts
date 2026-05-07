/**
 * QuickBooks Online → Quantara field extractor.
 *
 * Reads trailing-12-months P&L rollups. Maps revenue / expenses /
 * cash on hand into core financial fields. Net margin and burn rate
 * are derived rather than read direct — confidence steps down
 * accordingly.
 */
import {
  fetchQuickBooksRollup,
  type IntegrationResponse,
  type QuickBooksRollup,
} from "@/lib/tools/integrations";
import {
  SUGGESTION_SOURCE_LABEL,
  type QuantaraSuggestion,
} from "../types";

const DEFAULT_REALM = "0";

function penceToGbp(pence: number): number {
  return Math.round(pence / 100);
}

export async function extractQuickBooksSuggestions(
  realmId?: string,
): Promise<ReadonlyArray<QuantaraSuggestion>> {
  const target = realmId ?? DEFAULT_REALM;
  const res: IntegrationResponse<QuickBooksRollup> = await fetchQuickBooksRollup(target);
  if (!res.ok || !res.data) return [];
  const r = res.data;
  const baseSource = {
    integration: "quickbooks" as const,
    label: SUGGESTION_SOURCE_LABEL.quickbooks,
    fetchedAt: res.source.fetchedAt,
    mockMode: res.mockMode,
  };

  const revenue = penceToGbp(r.revenueTtmPence);
  const expenses = penceToGbp(r.expensesTtmPence);
  const netIncome = penceToGbp(r.netIncomeTtmPence);
  const cashOnHand = penceToGbp(r.cashOnHandPence);

  const monthlyBurn =
    netIncome < 0 ? Math.round(Math.abs(netIncome) / 12) : Math.round(expenses / 12);
  const netMarginPct =
    revenue > 0 ? Number(((netIncome / revenue) * 100).toFixed(1)) : 0;
  const runwayMonths =
    monthlyBurn > 0 ? Math.round(cashOnHand / monthlyBurn) : 0;

  return [
    {
      fieldId: "f1",
      value: revenue,
      confidence: Math.max(0, res.source.confidence - 0.15),
      source: { ...baseSource, note: "TTM revenue (Stripe wins on tie)" },
    },
    {
      fieldId: "f5",
      value: 70,
      confidence: Math.max(0, res.source.confidence - 0.40),
      source: { ...baseSource, note: "Heuristic SaaS gross margin" },
    },
    {
      fieldId: "f6",
      value: netMarginPct,
      confidence: Math.max(0, res.source.confidence - 0.10),
      source: { ...baseSource, note: "Derived from TTM net income / revenue" },
    },
    {
      fieldId: "f7",
      value: netIncome,
      confidence: Math.max(0, res.source.confidence - 0.15),
      source: { ...baseSource, note: "TTM net income (proxy for EBITDA)" },
    },
    {
      fieldId: "f8",
      value: monthlyBurn,
      confidence: Math.max(0, res.source.confidence - 0.20),
      source: { ...baseSource, note: "Derived from TTM expenses / 12" },
    },
    {
      fieldId: "f15",
      value: cashOnHand,
      confidence: res.source.confidence,
      source: { ...baseSource, note: "Cash on hand from balance sheet" },
    },
    ...(runwayMonths > 0
      ? [
          {
            fieldId: "f9" as const,
            value: runwayMonths,
            confidence: Math.max(0, res.source.confidence - 0.25),
            source: {
              ...baseSource,
              note: "Cash on hand ÷ monthly burn",
            },
          },
        ]
      : []),
  ];
}
