/**
 * Stripe → Quantara field extractor.
 *
 * Maps `StripeMetrics` → suggestions for ARR / MRR / paying customers /
 * monthly churn / GRR. ARR is `mrrPence × 12` so it ships at slightly
 * lower confidence than MRR (which is read direct).
 */
import {
  fetchStripeMetrics,
  type IntegrationResponse,
  type StripeMetrics,
} from "@/lib/tools/integrations";
import {
  SUGGESTION_SOURCE_LABEL,
  type QuantaraSuggestion,
} from "../types";

/**
 * Convert pence to GBP. Stripe reports `unit_amount` in the smallest
 * currency unit per https://docs.stripe.com/api/prices/object — for
 * GBP that's pence. Q1 schemas (`f1`, `f2`) expect GBP whole-pound.
 */
function penceToGbp(pence: number): number {
  return Math.round(pence / 100);
}

export async function extractStripeSuggestions(): Promise<
  ReadonlyArray<QuantaraSuggestion>
> {
  const res: IntegrationResponse<StripeMetrics> = await fetchStripeMetrics();
  if (!res.ok || !res.data) return [];
  const m = res.data;
  const baseSource = {
    integration: "stripe" as const,
    label: SUGGESTION_SOURCE_LABEL.stripe,
    fetchedAt: res.source.fetchedAt,
    mockMode: res.mockMode,
  };

  const suggestions: QuantaraSuggestion[] = [
    {
      fieldId: "f2",
      value: penceToGbp(m.mrrPence),
      confidence: res.source.confidence,
      source: { ...baseSource, note: "MRR from active subscriptions" },
    },
    {
      fieldId: "f1",
      value: penceToGbp(m.arrPence),
      confidence: Math.max(0, res.source.confidence - 0.05),
      source: { ...baseSource, note: "ARR derived from MRR × 12" },
    },
    {
      fieldId: "f24",
      value: m.customerCount,
      confidence: res.source.confidence,
      source: { ...baseSource, note: "Distinct paying customer count" },
    },
    {
      fieldId: "f27",
      value: Number((m.churnRate * 100).toFixed(2)),
      confidence: res.source.confidence,
      source: { ...baseSource, note: "Monthly churn from cancelled subs" },
    },
    {
      fieldId: "f14",
      value: Number(((1 - m.churnRate) * 100).toFixed(1)),
      confidence: Math.max(0, res.source.confidence - 0.10),
      source: { ...baseSource, note: "GRR ≈ 100 − monthly churn ×100" },
    },
  ];

  return suggestions;
}
