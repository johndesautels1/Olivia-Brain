/**
 * Supabase → Quantara field extractor.
 *
 * Project usage stats. Distinct daily-active users in the auth.users
 * table over 7 days are extrapolated to a monthly active user
 * estimate (× 4 floor — under-counts uniques across the full month).
 */
import {
  fetchSupabaseStats,
  type IntegrationResponse,
  type SupabaseProjectStats,
} from "@/lib/tools/integrations";
import {
  SUGGESTION_SOURCE_LABEL,
  type QuantaraSuggestion,
} from "../types";

export async function extractSupabaseSuggestions(): Promise<
  ReadonlyArray<QuantaraSuggestion>
> {
  const res: IntegrationResponse<SupabaseProjectStats> = await fetchSupabaseStats();
  if (!res.ok || !res.data) return [];
  const s = res.data;
  const baseSource = {
    integration: "supabase" as const,
    label: SUGGESTION_SOURCE_LABEL.supabase,
    fetchedAt: res.source.fetchedAt,
    mockMode: res.mockMode,
  };

  /* DAU × 4 ≈ MAU floor. Real MAU varies with cohort overlap; the
     × 4 multiplier gives a conservative starting point. */
  const mau = Math.max(s.dailyActiveUsers7d, s.dailyActiveUsers7d * 4);

  return [
    {
      fieldId: "f26",
      value: mau,
      confidence: Math.max(0, res.source.confidence - 0.20),
      source: { ...baseSource, note: "DAU × 4 (under-counts MAU)" },
    },
  ];
}
