/**
 * Companies House → Quantara field extractor.
 *
 * Public UK companies-register data. Provides incorporation date
 * (founder-experience floor) and active officers count (team-size
 * floor — under-counts contractors and overseas staff).
 */
import {
  fetchCompaniesHouseProfile,
  type CompaniesHouseProfile,
  type IntegrationResponse,
} from "@/lib/tools/integrations";
import {
  SUGGESTION_SOURCE_LABEL,
  type QuantaraSuggestion,
} from "../types";

const DEFAULT_COMPANY_NUMBER = "00000000";

function yearsSince(iso: string | null): number | null {
  if (!iso) return null;
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return null;
  const ms = Date.now() - then;
  return Math.max(0, Math.round(ms / (365.25 * 24 * 60 * 60 * 1000)));
}

export async function extractCompaniesHouseSuggestions(
  companyNumber?: string,
): Promise<ReadonlyArray<QuantaraSuggestion>> {
  const target = companyNumber ?? DEFAULT_COMPANY_NUMBER;
  const res: IntegrationResponse<CompaniesHouseProfile> =
    await fetchCompaniesHouseProfile(target);
  if (!res.ok || !res.data) return [];
  const profile = res.data;
  const baseSource = {
    integration: "companies_house" as const,
    label: SUGGESTION_SOURCE_LABEL.companies_house,
    fetchedAt: res.source.fetchedAt,
    mockMode: res.mockMode,
  };

  const out: QuantaraSuggestion[] = [];

  const yearsTrading = yearsSince(profile.incorporatedAt);
  if (yearsTrading !== null) {
    out.push({
      fieldId: "f42",
      value: yearsTrading,
      confidence: Math.max(0, res.source.confidence - 0.20),
      source: {
        ...baseSource,
        note: "Years since incorporation (founder-experience floor)",
      },
    });
  }

  if (profile.activeOfficersCount > 0) {
    out.push({
      fieldId: "f40",
      value: profile.activeOfficersCount,
      confidence: Math.max(0, res.source.confidence - 0.40),
      source: { ...baseSource, note: "Active officers (under-counts FT staff)" },
    });
  }

  return out;
}
