/* ═══════════════════════════════════════════════════════════════════════════
   Companies House REST API Client
   Base URL: https://api.company-information.service.gov.uk
   Auth: HTTP Basic (API key as username, no password)
   Docs: https://developer.company-information.service.gov.uk
   ═══════════════════════════════════════════════════════════════════════════ */

const BASE_URL = "https://api.company-information.service.gov.uk";

/** Build the Basic Auth header from the API key */
function authHeader(apiKey: string): string {
  const encoded = Buffer.from(`${apiKey}:`).toString("base64");
  return `Basic ${encoded}`;
}

/** Rate-limited fetch with retry (CH rate limit is 600/5min) */
async function chFetch(
  path: string,
  apiKey: string,
  params?: Record<string, string>,
): Promise<Response> {
  const url = new URL(path, BASE_URL);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }
  }

  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url.toString(), {
      headers: { Authorization: authHeader(apiKey) },
      signal: AbortSignal.timeout(30_000),
    });

    // Rate limited — back off and retry
    if (res.status === 429 && attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      continue;
    }

    return res;
  }

  throw new Error("Companies House: max retries exceeded");
}

/* ── Response Types ── */

export interface CHCompanySearchItem {
  company_number: string;
  title: string; // company name
  company_status: string;
  company_type: string;
  date_of_creation: string;
  date_of_cessation?: string;
  address_snippet?: string;
  address?: CHAddress;
  description?: string;
  sic_codes?: string[];
}

export interface CHSearchResult {
  items: CHCompanySearchItem[];
  total_results: number;
  items_per_page: number;
  start_index: number;
}

export interface CHAddress {
  address_line_1?: string;
  address_line_2?: string;
  care_of?: string;
  country?: string;
  locality?: string;
  po_box?: string;
  postal_code?: string;
  premises?: string;
  region?: string;
}

export interface CHCompanyProfile {
  company_name: string;
  company_number: string;
  company_status: string;
  company_status_detail?: string;
  type: string;
  date_of_creation: string;
  date_of_cessation?: string;
  sic_codes?: string[];
  registered_office_address?: CHAddress;
  previous_company_names?: { name: string; effective_from: string; ceased_on: string }[];
  jurisdiction?: string;
  has_charges?: boolean;
  has_insolvency_history?: boolean;
  can_file?: boolean;
  links?: {
    self?: string;
    filing_history?: string;
    officers?: string;
    persons_with_significant_control?: string;
    charges?: string;
  };
}

export interface CHOfficer {
  name: string;
  officer_role: string;
  appointed_on?: string;
  resigned_on?: string;
  nationality?: string;
  country_of_residence?: string;
  occupation?: string;
  date_of_birth?: { month: number; year: number };
  address?: CHAddress;
  links?: { officer?: { appointments?: string } };
}

export interface CHOfficerList {
  items: CHOfficer[];
  active_count: number;
  resigned_count: number;
  total_results: number;
  items_per_page: number;
  start_index: number;
}

export interface CHAdvancedSearchResult {
  items: CHCompanySearchItem[];
  top_hit?: CHCompanySearchItem;
  total_results: number;
  hits?: number;
}

/* ── Public API Functions ── */

/**
 * Search companies by name.
 * GET /search/companies?q=...
 */
export async function searchCompanies(
  apiKey: string,
  query: string,
  itemsPerPage = 20,
  startIndex = 0,
): Promise<CHSearchResult> {
  const res = await chFetch("/search/companies", apiKey, {
    q: query,
    items_per_page: String(itemsPerPage),
    start_index: String(startIndex),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CH search ${res.status}: ${text}`);
  }

  return res.json();
}

/**
 * Advanced search — filter by location, SIC codes, status, dates.
 * GET /advanced-search/companies
 */
export async function advancedSearch(
  apiKey: string,
  opts: {
    location?: string;
    sicCodes?: string[];
    companyStatus?: string;
    companyNameIncludes?: string;
    incorporatedFrom?: string;
    incorporatedTo?: string;
    size?: number;
    startIndex?: number;
  },
): Promise<CHAdvancedSearchResult> {
  const params: Record<string, string> = {};
  if (opts.location) params.location = opts.location;
  if (opts.sicCodes?.length) params.sic_codes = opts.sicCodes.join(",");
  if (opts.companyStatus) params.company_status = opts.companyStatus;
  if (opts.companyNameIncludes) params.company_name_includes = opts.companyNameIncludes;
  if (opts.incorporatedFrom) params.incorporated_from = opts.incorporatedFrom;
  if (opts.incorporatedTo) params.incorporated_to = opts.incorporatedTo;
  if (opts.size) params.size = String(opts.size);
  if (opts.startIndex) params.start_index = String(opts.startIndex);

  const res = await chFetch("/advanced-search/companies", apiKey, params);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CH advanced search ${res.status}: ${text}`);
  }

  return res.json();
}

/**
 * Get full company profile by company number.
 * GET /company/{companyNumber}
 */
export async function getCompanyProfile(
  apiKey: string,
  companyNumber: string,
): Promise<CHCompanyProfile> {
  const res = await chFetch(`/company/${companyNumber}`, apiKey);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CH profile ${res.status}: ${text}`);
  }

  return res.json();
}

/**
 * Get officers (directors, secretaries) for a company.
 * GET /company/{company_number}/officers
 */
export async function getOfficers(
  apiKey: string,
  companyNumber: string,
  itemsPerPage = 50,
  startIndex = 0,
): Promise<CHOfficerList> {
  const res = await chFetch(
    `/company/${companyNumber}/officers`,
    apiKey,
    {
      items_per_page: String(itemsPerPage),
      start_index: String(startIndex),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CH officers ${res.status}: ${text}`);
  }

  return res.json();
}

/**
 * Search officers by name.
 * GET /search/officers?q=...
 */
export async function searchOfficers(
  apiKey: string,
  query: string,
  itemsPerPage = 20,
  startIndex = 0,
): Promise<{ items: CHOfficer[]; total_results: number }> {
  const res = await chFetch("/search/officers", apiKey, {
    q: query,
    items_per_page: String(itemsPerPage),
    start_index: String(startIndex),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CH officer search ${res.status}: ${text}`);
  }

  return res.json();
}

/* ── Filing History Types ── */

export interface CHFilingHistoryItem {
  transaction_id: string;
  category: string;        // "accounts", "annual-return", "confirmation-statement", etc.
  type: string;            // e.g. "AA", "AA01", "CS01"
  date: string;            // filing date YYYY-MM-DD
  description: string;
  description_values?: Record<string, string>;
  action_date?: string;
  links?: {
    self?: string;
    document_metadata?: string;
  };
  pages?: number;
  paper_filed?: boolean;
}

export interface CHFilingHistoryList {
  items: CHFilingHistoryItem[];
  total_count: number;
  items_per_page: number;
  start_index: number;
  filing_history_status: string;
}

/* ── Filing History Functions ── */

/**
 * Get filing history for a company. Filter by category to get only accounts.
 * GET /company/{companyNumber}/filing-history?category=accounts
 */
export async function getFilingHistory(
  apiKey: string,
  companyNumber: string,
  opts?: { category?: string; itemsPerPage?: number; startIndex?: number },
): Promise<CHFilingHistoryList> {
  const params: Record<string, string> = {};
  if (opts?.category) params.category = opts.category;
  if (opts?.itemsPerPage) params.items_per_page = String(opts.itemsPerPage);
  if (opts?.startIndex) params.start_index = String(opts.startIndex);

  const res = await chFetch(
    `/company/${companyNumber}/filing-history`,
    apiKey,
    params,
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CH filing history ${res.status}: ${text}`);
  }

  return res.json();
}

/**
 * Get document metadata for a specific filing (contains download link).
 * GET /company/{companyNumber}/filing-history/{transactionId}
 */
export async function getFilingDocument(
  apiKey: string,
  companyNumber: string,
  transactionId: string,
): Promise<{ links?: { document?: string }; pages?: number; resources?: Record<string, unknown> }> {
  const res = await chFetch(
    `/company/${companyNumber}/filing-history/${transactionId}`,
    apiKey,
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CH filing document ${res.status}: ${text}`);
  }

  return res.json();
}

/** Tech-related SIC codes for London tech company discovery */
export const TECH_SIC_CODES = [
  "62011", // Computer consultancy activities
  "62012", // Business and domestic software development
  "62020", // Information technology consultancy activities
  "62090", // Other information technology service activities
  "63110", // Data processing, hosting and related activities
  "63120", // Web portals
  "58210", // Publishing of computer games
  "58290", // Other software publishing
  "72190", // Other R&D on natural sciences and engineering
  "26110", // Manufacture of electronic components
];
