/**
 * LinkedIn → Quantara field extractor.
 *
 * Headcount estimate from the `staffCountRange` Marketing Developer
 * Platform field. Confidence is moderate; LinkedIn's bands are wider
 * than Companies House officer counts but include non-officer staff.
 */
import {
  fetchLinkedInCompany,
  type IntegrationResponse,
  type LinkedInCompanyProfile,
} from "@/lib/tools/integrations";
import {
  SUGGESTION_SOURCE_LABEL,
  type QuantaraSuggestion,
} from "../types";

const DEFAULT_URN = "urn:li:organization:0";

export async function extractLinkedInSuggestions(
  urn?: string,
): Promise<ReadonlyArray<QuantaraSuggestion>> {
  const target = urn ?? DEFAULT_URN;
  const res: IntegrationResponse<LinkedInCompanyProfile> =
    await fetchLinkedInCompany(target);
  if (!res.ok || !res.data) return [];
  const profile = res.data;
  const baseSource = {
    integration: "linkedin" as const,
    label: SUGGESTION_SOURCE_LABEL.linkedin,
    fetchedAt: res.source.fetchedAt,
    mockMode: res.mockMode,
  };

  return [
    {
      fieldId: "f40",
      value: profile.employeeCountEstimate,
      confidence: Math.max(0, res.source.confidence - 0.10),
      source: { ...baseSource, note: `LinkedIn headcount range ${profile.headcountRange}` },
    },
  ];
}
