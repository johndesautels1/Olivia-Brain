/**
 * Companies House Q3 read-only integration for auto-fill.
 *
 * **Uses the ported LTM Companies House client** at
 * `src/lib/companies-house/client.ts` (byte-for-byte port from
 * `D:\London-Tech-Map\src\lib\companies-house\client.ts`). The LTM client
 * is production-grade: HTTP Basic auth, 600-req/5-min rate-limit retry
 * with exponential back-off, 30-second `AbortSignal.timeout`, full surface
 * (search / advanced search / profile / officers / filing history /
 * filing documents / tech SIC codes constant). This Q3 wrapper exposes
 * the narrow auto-fill slice; deeper Q4-Q7 work draws from the same
 * client without duplicating auth or fetch logic.
 *
 * Mock-mode returns a deterministic plausible payload when
 * COMPANIES_HOUSE_API_KEY is absent.
 */

import { getServerEnv } from "@/lib/config/env";
import {
  getCompanyProfile,
  getOfficers,
} from "@/lib/companies-house/client";
import { type IntegrationResponse, makeSource } from "./_types";

export interface CompaniesHouseProfile {
  companyNumber: string;
  companyName: string;
  status: string;
  /** ISO date the company was incorporated. */
  incorporatedAt: string | null;
  /** SIC industry codes returned by Companies House. */
  sicCodes: string[];
  /** Number of currently-appointed officers (fetched separately). */
  activeOfficersCount: number;
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
  registeredOfficeAddress: "1 Example Street, London, EC1A 1AA",
};

/** Fetch Companies House profile + officer count for a UK company number.
 *  Mock-mode signalled via `mockMode: true` on the response. Routes through
 *  the ported LTM client; a missing key short-circuits to mock without
 *  ever calling the real API. */
export async function fetchCompaniesHouseProfile(
  companyNumber: string,
): Promise<IntegrationResponse<CompaniesHouseProfile>> {
  const { COMPANIES_HOUSE_API_KEY } = getServerEnv();
  if (!COMPANIES_HOUSE_API_KEY) {
    return {
      ok: true,
      data: { ...MOCK_PAYLOAD, companyNumber },
      mockMode: true,
      source: makeSource("companies_house", true),
    };
  }

  try {
    // Officers endpoint can rate-limit independently; tolerate failure
    // there without losing the profile result.
    const [profile, officers] = await Promise.all([
      getCompanyProfile(COMPANIES_HOUSE_API_KEY, companyNumber),
      getOfficers(COMPANIES_HOUSE_API_KEY, companyNumber, 100, 0).catch(
        () => null,
      ),
    ]);

    const addr = profile.registered_office_address;
    const registeredOfficeAddress = addr
      ? [
          addr.address_line_1,
          addr.address_line_2,
          addr.locality,
          addr.postal_code,
        ]
          .filter(Boolean)
          .join(", ")
      : null;

    return {
      ok: true,
      data: {
        companyNumber,
        companyName: profile.company_name ?? MOCK_PAYLOAD.companyName,
        status: profile.company_status ?? "active",
        incorporatedAt: profile.date_of_creation ?? null,
        sicCodes: profile.sic_codes ?? [],
        activeOfficersCount: officers?.active_count ?? 0,
        registeredOfficeAddress,
      },
      mockMode: false,
      source: makeSource("companies_house", false),
    };
  } catch (error) {
    return {
      ok: true,
      data: { ...MOCK_PAYLOAD, companyNumber },
      mockMode: true,
      source: makeSource("companies_house", true),
      error: error instanceof Error ? error.name : "ch_fetch_failed",
    };
  }
}
