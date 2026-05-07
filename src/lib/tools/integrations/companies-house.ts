/**
 * Companies House read-only integration for Q3 auto-fill (UK-first).
 *
 * Reads UK company registration, filings, and officer data via the public
 * Companies House API. Mock-mode returns a deterministic plausible payload
 * when COMPANIES_HOUSE_API_KEY is absent.
 *
 * Companies House uses HTTP Basic auth with the API key as the username and
 * an empty password — the standard pattern they document.
 */

import { getServerEnv } from "@/lib/config/env";
import { type IntegrationResponse, withMockFallback } from "./_types";

export interface CompaniesHouseProfile {
  companyNumber: string;
  companyName: string;
  status: "active" | "dissolved" | "liquidation" | "administration" | "voluntary-arrangement" | string;
  /** ISO date the company was incorporated. */
  incorporatedAt: string | null;
  /** SIC industry codes returned by Companies House. */
  sicCodes: string[];
  /** Number of currently-appointed officers (fetched separately). */
  activeOfficersCount: number;
  /** Latest accounts category (e.g. "small", "micro-entity", "full"). */
  lastAccountsCategory: string | null;
  /** Registered office address as a single-line string. */
  registeredOfficeAddress: string | null;
}

const MOCK_PAYLOAD: CompaniesHouseProfile = {
  companyNumber: "00000000",
  companyName: "Example Company Ltd",
  status: "active",
  incorporatedAt: "2023-04-12",
  sicCodes: ["62012", "63110"],
  activeOfficersCount: 3,
  lastAccountsCategory: "micro-entity",
  registeredOfficeAddress: "1 Example Street, London, EC1A 1AA",
};

/** Fetch Companies House profile + officer count for a UK company number.
 *  Mock-mode signalled via `mockMode: true` on the response. */
export async function fetchCompaniesHouseProfile(
  companyNumber: string,
): Promise<IntegrationResponse<CompaniesHouseProfile>> {
  const { COMPANIES_HOUSE_API_KEY } = getServerEnv();
  if (!COMPANIES_HOUSE_API_KEY) {
    return {
      ok: true,
      data: { ...MOCK_PAYLOAD, companyNumber },
      mockMode: true,
      source: { integration: "companies_house", fetchedAt: new Date().toISOString(), confidence: 0.5 },
    };
  }

  return withMockFallback(
    "companies_house",
    async (signal) => {
      const auth = `Basic ${Buffer.from(`${COMPANIES_HOUSE_API_KEY}:`).toString("base64")}`;
      const headers = { Authorization: auth };
      const num = encodeURIComponent(companyNumber);

      const profileRes = await fetch(
        `https://api.company-information.service.gov.uk/company/${num}`,
        { headers, signal },
      );
      if (!profileRes.ok) throw new Error(`ch_${profileRes.status}`);
      const profile = (await profileRes.json()) as {
        company_name?: string;
        company_status?: string;
        date_of_creation?: string;
        sic_codes?: string[];
        accounts?: { last_accounts?: { type?: string } };
        registered_office_address?: {
          address_line_1?: string;
          address_line_2?: string;
          locality?: string;
          postal_code?: string;
        };
      };

      // Officers endpoint — fetched independently; defensive against rate limits.
      let activeOfficersCount = 0;
      try {
        const officersRes = await fetch(
          `https://api.company-information.service.gov.uk/company/${num}/officers?register_type=directors&items_per_page=100`,
          { headers, signal },
        );
        if (officersRes.ok) {
          const officers = (await officersRes.json()) as { active_count?: number };
          activeOfficersCount = officers.active_count ?? 0;
        }
      } catch {
        /* keep 0; officer count is non-critical */
      }

      const addr = profile.registered_office_address;
      const registeredOfficeAddress = addr
        ? [addr.address_line_1, addr.address_line_2, addr.locality, addr.postal_code]
            .filter(Boolean)
            .join(", ")
        : null;

      return {
        companyNumber,
        companyName: profile.company_name ?? MOCK_PAYLOAD.companyName,
        status: (profile.company_status ?? "active") as CompaniesHouseProfile["status"],
        incorporatedAt: profile.date_of_creation ?? null,
        sicCodes: profile.sic_codes ?? [],
        activeOfficersCount,
        lastAccountsCategory: profile.accounts?.last_accounts?.type ?? null,
        registeredOfficeAddress,
      };
    },
    { ...MOCK_PAYLOAD, companyNumber },
  );
}
