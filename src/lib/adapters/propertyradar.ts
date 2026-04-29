/**
 * PropertyRadar API Adapter
 *
 * PropertyRadar provides property owner data, targeting/filtering,
 * property characteristics, equity estimates, and lien data.
 *
 * Docs: https://developers.propertyradar.com/
 * Auth: Bearer token
 * Used for: Owner data, property targeting, equity analysis
 * Coverage: United States (strongest in California, expanding nationally)
 */

import { getServerEnv } from "@/lib/config/env";

const DEFAULT_TIMEOUT_MS = 15_000;
const PR_API_BASE = "https://api.propertyradar.com/v1";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PRPropertyQuery {
  /** State abbreviation (required) */
  state: string;
  /** County name */
  county?: string;
  /** City name */
  city?: string;
  /** ZIP code */
  zip?: string;
  /** Property type filter */
  propertyType?: PRPropertyType;
  /** Minimum estimated value */
  minValue?: number;
  /** Maximum estimated value */
  maxValue?: number;
  /** Minimum equity percent */
  minEquityPercent?: number;
  /** Maximum equity percent */
  maxEquityPercent?: number;
  /** Owner occupied filter */
  ownerOccupied?: boolean;
  /** Absentee owner filter */
  absenteeOwner?: boolean;
  /** Corporate owned filter */
  corporateOwned?: boolean;
  /** Minimum years owned */
  minYearsOwned?: number;
  /** Maximum years owned */
  maxYearsOwned?: number;
  /** Minimum bedrooms */
  minBedrooms?: number;
  /** Minimum building sqft */
  minBuildingSqft?: number;
  /** Maximum building sqft */
  maxBuildingSqft?: number;
  /** Pre-foreclosure filter */
  preForeclosure?: boolean;
  /** Results per page (max 100) */
  limit?: number;
  /** Pagination offset */
  offset?: number;
}

export type PRPropertyType =
  | "SFR"
  | "Condo"
  | "Townhouse"
  | "Multi-Family"
  | "Land"
  | "Commercial"
  | "Mobile";

export interface PRProperty {
  RadarId: string;
  APN: string;
  SitusAddress: string;
  SitusCity: string;
  SitusState: string;
  SitusZip: string;
  SitusCounty: string;
  Latitude: number;
  Longitude: number;
  PropertyType: string;
  Bedrooms: number;
  Bathrooms: number;
  BuildingSqft: number;
  LotSqft: number;
  YearBuilt: number;
  Stories: number;
  Pool: boolean;
  EstimatedValue: number;
  EstimatedEquity: number;
  EstimatedEquityPercent: number;
  TotalLoans: number;
  TotalLoanBalance: number;
  Owner: PROwnerInfo;
  LastSale: PRLastSale;
  Tax: PRTaxInfo;
  Liens?: PRLien[];
}

export interface PROwnerInfo {
  Names: string[];
  MailingAddress: string;
  MailingCity: string;
  MailingState: string;
  MailingZip: string;
  OwnerOccupied: boolean;
  OwnershipType: string;
  CorporateOwned: boolean;
  YearsOwned: number;
  AcquisitionDate: string;
}

export interface PRLastSale {
  Date: string;
  Price: number;
  DocumentType: string;
}

export interface PRTaxInfo {
  AssessedTotal: number;
  AssessedLand: number;
  AssessedImprovement: number;
  TaxAmount: number;
  TaxYear: number;
}

export interface PRLien {
  Type: string;
  Amount: number;
  Date: string;
  Lender: string;
  Position: number;
}

export interface PRSearchResult {
  results: PRProperty[];
  total: number;
  limit: number;
  offset: number;
}

// ─── Error ───────────────────────────────────────────────────────────────────

export class PropertyRadarAdapterError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryable: boolean;

  constructor({
    code,
    message,
    status,
    retryable = false,
  }: {
    code: string;
    message: string;
    status: number;
    retryable?: boolean;
  }) {
    super(message);
    this.name = "PropertyRadarAdapterError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

// ─── Configuration ──────────────────────────────────────────────────────────

function getPRConfig() {
  const env = getServerEnv();
  return { apiToken: env.PROPERTYRADAR_API_TOKEN };
}

export function isPropertyRadarConfigured(): boolean {
  return Boolean(getPRConfig().apiToken);
}

function assertConfigured() {
  const { apiToken } = getPRConfig();
  if (!apiToken) {
    throw new PropertyRadarAdapterError({
      code: "PR_NOT_CONFIGURED",
      message: "PropertyRadar API token must be configured.",
      status: 503,
    });
  }
  return { apiToken };
}

// ─── Core Request Function ──────────────────────────────────────────────────

async function prRequest<T>(
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>,
  params?: Record<string, string | number>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const { apiToken } = assertConfigured();

  const url = new URL(`${PR_API_BASE}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url.toString(), {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new PropertyRadarAdapterError({
      code: `PR_HTTP_${response.status}`,
      message: `PropertyRadar API failed: HTTP ${response.status} ${response.statusText}`,
      status: response.status,
      retryable: response.status >= 500 || response.status === 429,
    });
  }

  return (await response.json()) as T;
}

// ─── Public API Functions ───────────────────────────────────────────────────

/**
 * Search properties using PropertyRadar's targeting criteria.
 */
export async function searchProperties(
  query: PRPropertyQuery
): Promise<PRSearchResult> {
  const criteria: Record<string, unknown> = {
    state: query.state,
  };

  if (query.county) criteria.county = query.county;
  if (query.city) criteria.city = query.city;
  if (query.zip) criteria.zip = query.zip;
  if (query.propertyType) criteria.propertyType = query.propertyType;
  if (query.minValue !== undefined) criteria.minEstimatedValue = query.minValue;
  if (query.maxValue !== undefined) criteria.maxEstimatedValue = query.maxValue;
  if (query.minEquityPercent !== undefined)
    criteria.minEquityPercent = query.minEquityPercent;
  if (query.maxEquityPercent !== undefined)
    criteria.maxEquityPercent = query.maxEquityPercent;
  if (query.ownerOccupied !== undefined)
    criteria.ownerOccupied = query.ownerOccupied;
  if (query.absenteeOwner !== undefined)
    criteria.absenteeOwner = query.absenteeOwner;
  if (query.corporateOwned !== undefined)
    criteria.corporateOwned = query.corporateOwned;
  if (query.minYearsOwned !== undefined)
    criteria.minYearsOwned = query.minYearsOwned;
  if (query.maxYearsOwned !== undefined)
    criteria.maxYearsOwned = query.maxYearsOwned;
  if (query.minBedrooms !== undefined) criteria.minBedrooms = query.minBedrooms;
  if (query.minBuildingSqft !== undefined)
    criteria.minBuildingSqft = query.minBuildingSqft;
  if (query.maxBuildingSqft !== undefined)
    criteria.maxBuildingSqft = query.maxBuildingSqft;
  if (query.preForeclosure !== undefined)
    criteria.preForeclosure = query.preForeclosure;

  return prRequest<PRSearchResult>("POST", "/properties/search", {
    criteria,
    limit: query.limit ?? 25,
    offset: query.offset ?? 0,
  });
}

/**
 * Look up a single property by its RadarId.
 */
export async function getProperty(radarId: string): Promise<PRProperty> {
  return prRequest<PRProperty>("GET", `/properties/${radarId}`);
}

/**
 * Look up a property by address.
 */
export async function getPropertyByAddress(
  address: string,
  city: string,
  state: string,
  zip: string
): Promise<PRProperty | null> {
  const result = await prRequest<PRSearchResult>("POST", "/properties/search", {
    criteria: {
      state,
      city,
      zip,
      address,
    },
    limit: 1,
    offset: 0,
  });

  return result.results.length > 0 ? result.results[0] : null;
}

/**
 * Find absentee owners in an area (common investor targeting use case).
 */
export async function findAbsenteeOwners(
  state: string,
  city: string,
  options?: {
    minEquityPercent?: number;
    minYearsOwned?: number;
    propertyType?: PRPropertyType;
    limit?: number;
  }
): Promise<PRSearchResult> {
  return searchProperties({
    state,
    city,
    absenteeOwner: true,
    ownerOccupied: false,
    minEquityPercent: options?.minEquityPercent ?? 30,
    minYearsOwned: options?.minYearsOwned,
    propertyType: options?.propertyType ?? "SFR",
    limit: options?.limit ?? 50,
  });
}

/**
 * Find pre-foreclosure properties in an area.
 */
export async function findPreForeclosures(
  state: string,
  city: string,
  options?: {
    propertyType?: PRPropertyType;
    limit?: number;
  }
): Promise<PRSearchResult> {
  return searchProperties({
    state,
    city,
    preForeclosure: true,
    propertyType: options?.propertyType ?? "SFR",
    limit: options?.limit ?? 50,
  });
}

/**
 * Find high-equity properties (potential seller leads).
 */
export async function findHighEquityProperties(
  state: string,
  city: string,
  options?: {
    minEquityPercent?: number;
    minYearsOwned?: number;
    limit?: number;
  }
): Promise<PRSearchResult> {
  return searchProperties({
    state,
    city,
    minEquityPercent: options?.minEquityPercent ?? 50,
    minYearsOwned: options?.minYearsOwned ?? 10,
    limit: options?.limit ?? 50,
  });
}
