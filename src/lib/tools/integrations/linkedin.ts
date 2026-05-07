/**
 * LinkedIn read-only integration for Q3 auto-fill.
 *
 * Reads company headcount + profile metadata for the connected LinkedIn
 * organisation page. Mock-mode returns a deterministic plausible payload
 * when LINKEDIN_API_KEY is absent.
 *
 * LTM audit (2026-05-07): no LTM client — this is OB-original. LinkedIn's
 * official Marketing Developer Platform requires partner approval; the
 * realistic flow ships via Composio's LinkedIn integration once enabled.
 */

import { getServerEnv } from "@/lib/config/env";
import { type IntegrationResponse, withMockFallback } from "./_types";

export interface LinkedInCompanyProfile {
  /** LinkedIn company URN (e.g. "urn:li:organization:1234"). */
  urn: string;
  name: string;
  /** Bucketed headcount range as LinkedIn returns it. */
  headcountRange: "1-10" | "11-50" | "51-200" | "201-500" | "501-1000" | "1001-5000" | "5001+";
  /** Best-effort exact employee count. */
  employeeCountEstimate: number;
  industry: string;
  foundedYear: number | null;
  websiteUrl: string | null;
  /** ISO country code, e.g. "GB". */
  hqCountry: string | null;
}

const MOCK_PAYLOAD: LinkedInCompanyProfile = {
  urn: "urn:li:organization:0",
  name: "Example Company",
  headcountRange: "11-50",
  employeeCountEstimate: 23,
  industry: "Software",
  foundedYear: 2023,
  websiteUrl: null,
  hqCountry: "GB",
};

/** Fetch LinkedIn company profile by URN. */
export async function fetchLinkedInCompany(
  companyUrn: string,
): Promise<IntegrationResponse<LinkedInCompanyProfile>> {
  const { LINKEDIN_API_KEY } = getServerEnv();
  if (!LINKEDIN_API_KEY) {
    return {
      ok: true,
      data: { ...MOCK_PAYLOAD, urn: companyUrn },
      mockMode: true,
      source: { integration: "linkedin", fetchedAt: new Date().toISOString(), confidence: 0.5 },
    };
  }

  return withMockFallback(
    "linkedin",
    async (signal) => {
      const id = encodeURIComponent(companyUrn.split(":").pop() ?? "");
      const res = await fetch(`https://api.linkedin.com/v2/organizations/${id}`, {
        headers: { Authorization: `Bearer ${LINKEDIN_API_KEY}` },
        signal,
      });
      if (!res.ok) throw new Error(`linkedin_${res.status}`);
      const json = (await res.json()) as {
        id: number | string;
        name?: { localized?: Record<string, string> };
        staffCountRange?: { start?: number; end?: number };
        industry?: string;
        foundedOn?: { year?: number };
        websiteUrl?: string;
        locations?: Array<{ country?: string }>;
      };

      const start = json.staffCountRange?.start ?? 0;
      const end = json.staffCountRange?.end ?? 10;
      const headcountRange = bucketHeadcount(start, end);

      return {
        urn: companyUrn,
        name:
          Object.values(json.name?.localized ?? {})[0] ?? MOCK_PAYLOAD.name,
        headcountRange,
        employeeCountEstimate: Math.round((start + end) / 2),
        industry: json.industry ?? "Unknown",
        foundedYear: json.foundedOn?.year ?? null,
        websiteUrl: json.websiteUrl ?? null,
        hqCountry: json.locations?.[0]?.country ?? null,
      };
    },
    { ...MOCK_PAYLOAD, urn: companyUrn },
  );
}

function bucketHeadcount(
  start: number,
  end: number,
): LinkedInCompanyProfile["headcountRange"] {
  const high = end || start;
  if (high <= 10) return "1-10";
  if (high <= 50) return "11-50";
  if (high <= 200) return "51-200";
  if (high <= 500) return "201-500";
  if (high <= 1000) return "501-1000";
  if (high <= 5000) return "1001-5000";
  return "5001+";
}
