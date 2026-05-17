/* ═══════════════════════════════════════════════════════════════════════════
   Companies House Provider — UK Government company registry (not an LLM)
   API: https://developer.company-information.service.gov.uk
   Auth: HTTP Basic (API key as username, no password)
   ═══════════════════════════════════════════════════════════════════════════ */

import type {
  CascadeProvider,
  CascadeResult,
  CascadeTaskId,
  TaskResultMap,
} from "../types";
import { PROVIDER_CONFIGS } from "../types";
import {
  advancedSearch,
  searchCompanies,
  getCompanyProfile,
  getOfficers,
  TECH_SIC_CODES,
  type CHCompanySearchItem,
  type CHOfficer,
} from "@/lib/companies-house/client";

export function createCompaniesHouseProvider(): CascadeProvider {
  const config = PROVIDER_CONFIGS.companies_house;

  return {
    id: "companies_house",

    isConfigured(): boolean {
      return !!process.env[config.apiKeyEnvVar];
    },

    async execute<K extends CascadeTaskId>(
      taskId: K,
      _prompt: string,
    ): Promise<CascadeResult<TaskResultMap[K]>> {
      const apiKey = process.env[config.apiKeyEnvVar];
      if (!apiKey) {
        return emptyResult(taskId, [
          `${config.apiKeyEnvVar} not configured`,
        ]);
      }

      const startTime = Date.now();
      console.log(`[companies-house] Starting execute for task: ${taskId}`);

      try {
        const data = await executeTask(apiKey, taskId);
        const executionTimeMs = Date.now() - startTime;
        console.log(`[companies-house] Task ${taskId} completed: ${data.length} results in ${executionTimeMs}ms`);

        return {
          taskId,
          provider: "companies_house",
          modelId: "companies-house-api",
          timestamp: new Date().toISOString(),
          executionTimeMs,
          data: data as unknown as TaskResultMap[K][],
          metadata: {
            totalResults: data.length,
            sourcesCited: data.length,
            avgConfidence: 0.95,
            geographicScope: "london",
            dateRange: "official records",
          },
          errors: [],
        };
      } catch (err) {
        console.error(`[companies-house] Task ${taskId} failed: ${err instanceof Error ? err.message : String(err)}`);
        return emptyResult(taskId, [
          `Companies House request failed: ${err instanceof Error ? err.message : String(err)}`,
        ]);
      }
    },
  };
}

async function executeTask(
  apiKey: string,
  taskId: CascadeTaskId,
): Promise<unknown[]> {
  switch (taskId) {
    case "london_ai_ecosystem":
      return discoverLondonTechCompanies(apiKey);
    case "london_founder_profiles":
      return discoverFounders(apiKey);
    case "london_funding_rounds":
      return verifyFundingCompanies(apiKey);
    case "livability_scores":
    case "london_ecosystem_insights":
    case "london_research_reports":
      return [];
    default:
      return [];
  }
}

async function discoverLondonTechCompanies(apiKey: string): Promise<unknown[]> {
  const results: unknown[] = [];

  try {
    const sicBatches = [
      TECH_SIC_CODES.slice(0, 5),
      TECH_SIC_CODES.slice(5),
    ];

    for (const sicBatch of sicBatches) {
      const searchResult = await advancedSearch(apiKey, {
        location: "london",
        sicCodes: sicBatch,
        companyStatus: "active",
        size: 100,
      });
      console.log(`[companies-house] Advanced search SIC batch returned ${searchResult.items?.length ?? 0} results`);

      for (const item of searchResult.items ?? []) {
        results.push(mapCompanyToEcosystem(item));
      }
    }
  } catch (err) {
    console.warn(`[companies-house] Advanced search failed, falling back to basic search: ${err instanceof Error ? err.message : String(err)}`);

    const techKeywords = [
      "london AI startup",
      "london software company",
      "london fintech",
      "london deep tech",
    ];

    for (const keyword of techKeywords) {
      try {
        const searchResult = await searchCompanies(apiKey, keyword, 20);
        console.log(`[companies-house] Basic search "${keyword}" returned ${searchResult.items?.length ?? 0} results`);

        for (const item of searchResult.items ?? []) {
          results.push(mapCompanyToEcosystem(item));
        }
      } catch (innerErr) {
        console.error(`[companies-house] Basic search "${keyword}" failed: ${innerErr instanceof Error ? innerErr.message : String(innerErr)}`);
      }
    }
  }

  console.log(`[companies-house] discoverLondonTechCompanies total: ${results.length}`);
  return results;
}

async function discoverFounders(apiKey: string): Promise<unknown[]> {
  const results: unknown[] = [];
  let companies: CHCompanySearchItem[] = [];

  try {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const fromDate = twoYearsAgo.toISOString().split("T")[0];

    const searchResult = await advancedSearch(apiKey, {
      location: "london",
      sicCodes: TECH_SIC_CODES.slice(0, 5),
      companyStatus: "active",
      incorporatedFrom: fromDate,
      size: 30,
    });
    console.log(`[companies-house] Advanced founder search returned ${searchResult.items?.length ?? 0} companies`);
    companies = (searchResult.items ?? []).slice(0, 15);
  } catch (err) {
    console.warn(`[companies-house] Advanced search failed for founders, falling back: ${err instanceof Error ? err.message : String(err)}`);

    try {
      const searchResult = await searchCompanies(apiKey, "london technology", 20);
      console.log(`[companies-house] Basic founder search returned ${searchResult.items?.length ?? 0} companies`);
      companies = (searchResult.items ?? []).slice(0, 15);
    } catch (innerErr) {
      console.error(`[companies-house] Basic search also failed: ${innerErr instanceof Error ? innerErr.message : String(innerErr)}`);
    }
  }

  for (const company of companies) {
    try {
      const officers = await getOfficers(apiKey, company.company_number, 10);
      const directors = (officers.items ?? []).filter(
        (o) => o.officer_role === "director" && !o.resigned_on,
      );
      console.log(`[companies-house] ${company.title} (${company.company_number}): ${directors.length} active directors`);

      for (const director of directors.slice(0, 2)) {
        results.push(mapOfficerToFounder(director, company));
      }
    } catch (err) {
      console.warn(`[companies-house] Officer lookup failed for ${company.company_number}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`[companies-house] discoverFounders total: ${results.length}`);
  return results;
}

async function verifyFundingCompanies(apiKey: string): Promise<unknown[]> {
  const results: unknown[] = [];
  let companies: CHCompanySearchItem[] = [];

  try {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const fromDate = oneYearAgo.toISOString().split("T")[0];

    const searchResult = await advancedSearch(apiKey, {
      location: "london",
      sicCodes: TECH_SIC_CODES.slice(0, 5),
      companyStatus: "active",
      incorporatedFrom: fromDate,
      size: 50,
    });
    console.log(`[companies-house] Advanced funding search returned ${searchResult.items?.length ?? 0} companies`);
    companies = (searchResult.items ?? []).slice(0, 30);
  } catch (err) {
    console.warn(`[companies-house] Advanced search failed for funding, falling back: ${err instanceof Error ? err.message : String(err)}`);

    try {
      const searchResult = await searchCompanies(apiKey, "london tech startup", 30);
      console.log(`[companies-house] Basic funding search returned ${searchResult.items?.length ?? 0} companies`);
      companies = (searchResult.items ?? []).slice(0, 30);
    } catch (innerErr) {
      console.error(`[companies-house] Basic search also failed: ${innerErr instanceof Error ? innerErr.message : String(innerErr)}`);
    }
  }

  for (const item of companies) {
    try {
      const profile = await getCompanyProfile(apiKey, item.company_number);
      results.push({
        companyName: profile.company_name,
        companyNumber: profile.company_number,
        companyStatus: profile.company_status,
        dateOfCreation: profile.date_of_creation,
        sicCodes: profile.sic_codes ?? [],
        registeredAddress: formatAddress(profile.registered_office_address),
        sourceUrl: `https://find-and-update.company-information.service.gov.uk/company/${profile.company_number}`,
        verifiedLondon: true,
        verifiedActive: profile.company_status === "active",
      });
    } catch (err) {
      console.warn(`[companies-house] Profile lookup failed for ${item.company_number}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`[companies-house] verifyFundingCompanies total: ${results.length}`);
  return results;
}

function mapCompanyToEcosystem(item: CHCompanySearchItem): Record<string, unknown> {
  return {
    companyName: item.title,
    companyNumber: item.company_number,
    aiSubsector: sicToSubsector(item.sic_codes),
    companyType: "startup",
    district: localityToDistrict(item.address?.locality),
    foundedYear: item.date_of_creation ? new Date(item.date_of_creation).getFullYear() : null,
    employeeRange: null,
    totalFunding: null,
    description: `Registered UK company (${item.company_type}). SIC: ${(item.sic_codes ?? []).join(", ")}`,
    website: null,
    sourceUrl: `https://find-and-update.company-information.service.gov.uk/company/${item.company_number}`,
  };
}

function mapOfficerToFounder(
  officer: CHOfficer,
  company: CHCompanySearchItem,
): Record<string, unknown> {
  return {
    fullName: officer.name,
    companyName: company.title,
    companyWebsite: null,
    companyLinkedinUrl: null,
    role: officer.officer_role === "director" ? "Director" : officer.officer_role,
    sector: sicToSubsector(company.sic_codes),
    district: localityToDistrict(company.address?.locality),
    foundedYear: company.date_of_creation
      ? new Date(company.date_of_creation).getFullYear()
      : null,
    fundingRaisedTotal: null,
    latestRound: null,
    linkedinUrl: null,
    bioSummary: `${officer.officer_role} at ${company.title}. Appointed ${officer.appointed_on ?? "unknown"}.${officer.nationality ? ` Nationality: ${officer.nationality}.` : ""}${officer.occupation ? ` Occupation: ${officer.occupation}.` : ""}`,
    sourceUrls: [
      `https://find-and-update.company-information.service.gov.uk/company/${company.company_number}/officers`,
    ],
    notableFacts: [
      `Companies House verified director`,
      `Appointed: ${officer.appointed_on ?? "pre-1992"}`,
    ],
  };
}

function formatAddress(
  addr?: { address_line_1?: string; address_line_2?: string; locality?: string; postal_code?: string; region?: string },
): string {
  if (!addr) return "Unknown";
  return [addr.address_line_1, addr.address_line_2, addr.locality, addr.region, addr.postal_code]
    .filter(Boolean)
    .join(", ");
}

function sicToSubsector(sicCodes?: string[]): string {
  if (!sicCodes || sicCodes.length === 0) return "Technology";
  const code = sicCodes[0];
  if (code === "62012" || code === "58290") return "Software Development";
  if (code === "62011" || code === "62020") return "IT Consultancy";
  if (code === "63110") return "AI Infrastructure";
  if (code === "63120") return "Web Platform";
  if (code === "72190") return "R&D / Deep Tech";
  if (code === "58210") return "Gaming";
  if (code === "26110") return "Hardware";
  if (code === "62090") return "IT Services";
  return "Technology";
}

function localityToDistrict(locality?: string): string | null {
  if (!locality) return null;
  const lower = locality.toLowerCase();
  const mapping: Record<string, string> = {
    "london": null as unknown as string,
    "shoreditch": "shoreditch",
    "hoxton": "hoxton",
    "old street": "old-street",
    "clerkenwell": "clerkenwell",
    "farringdon": "farringdon",
    "bloomsbury": "bloomsbury",
    "soho": "soho",
    "covent garden": "covent-garden",
    "mayfair": "mayfair",
    "marylebone": "marylebone",
    "islington": "islington",
    "angel": "angel",
    "paddington": "paddington",
    "chelsea": "chelsea",
    "hampstead": "hampstead",
    "bermondsey": "bermondsey",
    "peckham": "peckham",
    "stratford": "stratford",
    "richmond": "richmond",
    "notting hill": "notting-hill",
    "white city": "white-city",
    "canary wharf": "canary-wharf",
    "kings cross": "kings-cross",
    "king's cross": "kings-cross",
    "deptford": "deptford",
  };

  for (const [key, value] of Object.entries(mapping)) {
    if (lower.includes(key) && value) return value;
  }

  if (lower.includes("london") || lower.includes("ec") || lower.includes("wc")) {
    return "city-of-london";
  }

  return null;
}

function emptyResult<K extends CascadeTaskId>(
  taskId: K,
  errors: string[],
): CascadeResult<TaskResultMap[K]> {
  return {
    taskId,
    provider: "companies_house",
    modelId: "companies-house-api",
    timestamp: new Date().toISOString(),
    executionTimeMs: 0,
    data: [],
    metadata: {
      totalResults: 0,
      sourcesCited: 0,
      avgConfidence: 0,
      geographicScope: "london",
      dateRange: "",
    },
    errors,
  };
}
