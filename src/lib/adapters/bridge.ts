/**
 * Bridge Interactive (Zillow Group) API Adapter
 *
 * Bridge Interactive provides RESTful access to MLS data, property details,
 * valuations, and market statistics. Now part of Zillow Group.
 *
 * Docs: https://bridgedataoutput.com/docs/explorer
 * Used for: Property search, valuations (Zestimate-style), market stats
 * Coverage: United States
 */

import { getServerEnv } from "@/lib/config/env";

const DEFAULT_TIMEOUT_MS = 15_000;
const BRIDGE_API_BASE = "https://api.bridgedataoutput.com/api/v2";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BridgePropertyQuery {
  /** City name */
  city?: string;
  /** State abbreviation (e.g. "FL") */
  stateOrProvince?: string;
  /** ZIP code */
  postalCode?: string;
  /** Minimum list price */
  "ListPrice.gte"?: number;
  /** Maximum list price */
  "ListPrice.lte"?: number;
  /** Minimum bedrooms */
  "BedroomsTotal.gte"?: number;
  /** Minimum bathrooms */
  "BathroomsTotalInteger.gte"?: number;
  /** Minimum living area sqft */
  "LivingArea.gte"?: number;
  /** Maximum living area sqft */
  "LivingArea.lte"?: number;
  /** Property type */
  PropertyType?: string;
  /** Listing status */
  StandardStatus?: string;
  /** Results per page (max 200) */
  limit?: number;
  /** Pagination offset */
  offset?: number;
  /** Sort field */
  sortBy?: string;
  /** Sort direction */
  sortOrder?: "asc" | "desc";
}

export interface BridgeProperty {
  Id: string;
  ListingKey: string;
  ListingId: string;
  StandardStatus: string;
  ListPrice: number;
  ClosePrice?: number;
  City: string;
  StateOrProvince: string;
  PostalCode: string;
  UnparsedAddress: string;
  Latitude?: number;
  Longitude?: number;
  BedroomsTotal?: number;
  BathroomsTotalInteger?: number;
  LivingArea?: number;
  LotSizeAcres?: number;
  LotSizeSquareFeet?: number;
  YearBuilt?: number;
  PropertyType?: string;
  PropertySubType?: string;
  ListingContractDate?: string;
  CloseDate?: string;
  DaysOnMarket?: number;
  ListAgentFullName?: string;
  ListOfficeName?: string;
  PublicRemarks?: string;
  Media?: BridgeMedia[];
}

export interface BridgeMedia {
  MediaURL: string;
  MediaCategory: string;
  Order: number;
}

export interface BridgeSearchResult {
  bundle: BridgeProperty[];
  total: number;
  limit: number;
  offset: number;
}

export interface BridgeValuation {
  Id: string;
  estimatedValue: number;
  estimatedValueLow: number;
  estimatedValueHigh: number;
  confidence: number;
  asOfDate: string;
  address: string;
}

export interface BridgeMarketStats {
  medianListPrice: number;
  medianSoldPrice: number;
  averageDaysOnMarket: number;
  activeListings: number;
  newListings: number;
  closedSales: number;
  monthsOfSupply: number;
  listToSoldRatio: number;
}

// ─── Error ───────────────────────────────────────────────────────────────────

export class BridgeAdapterError extends Error {
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
    this.name = "BridgeAdapterError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

// ─── Configuration ──────────────────────────────────────────────────────────

function getBridgeConfig() {
  const env = getServerEnv();
  return { apiKey: env.BRIDGE_API_KEY };
}

export function isBridgeConfigured(): boolean {
  return Boolean(getBridgeConfig().apiKey);
}

function assertConfigured() {
  const { apiKey } = getBridgeConfig();
  if (!apiKey) {
    throw new BridgeAdapterError({
      code: "BRIDGE_NOT_CONFIGURED",
      message: "Bridge API key must be configured.",
      status: 503,
    });
  }
  return { apiKey };
}

// ─── Core Request Function ──────────────────────────────────────────────────

async function bridgeRequest<T>(
  path: string,
  params?: Record<string, string | number>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const { apiKey } = assertConfigured();

  const url = new URL(`${BRIDGE_API_BASE}${path}`);
  url.searchParams.set("access_token", apiKey);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new BridgeAdapterError({
      code: `BRIDGE_HTTP_${response.status}`,
      message: `Bridge API request failed: HTTP ${response.status} ${response.statusText}`,
      status: response.status,
      retryable: response.status >= 500 || response.status === 429,
    });
  }

  return (await response.json()) as T;
}

// ─── Public API Functions ───────────────────────────────────────────────────

/**
 * Search for properties using the Bridge Interactive API.
 */
export async function searchProperties(
  query: BridgePropertyQuery
): Promise<BridgeSearchResult> {
  const params: Record<string, string | number> = {};

  if (query.city) params["City"] = query.city;
  if (query.stateOrProvince) params["StateOrProvince"] = query.stateOrProvince;
  if (query.postalCode) params["PostalCode"] = query.postalCode;
  if (query["ListPrice.gte"]) params["ListPrice.gte"] = query["ListPrice.gte"];
  if (query["ListPrice.lte"]) params["ListPrice.lte"] = query["ListPrice.lte"];
  if (query["BedroomsTotal.gte"])
    params["BedroomsTotal.gte"] = query["BedroomsTotal.gte"];
  if (query["BathroomsTotalInteger.gte"])
    params["BathroomsTotalInteger.gte"] = query["BathroomsTotalInteger.gte"];
  if (query["LivingArea.gte"])
    params["LivingArea.gte"] = query["LivingArea.gte"];
  if (query["LivingArea.lte"])
    params["LivingArea.lte"] = query["LivingArea.lte"];
  if (query.PropertyType) params["PropertyType"] = query.PropertyType;
  if (query.StandardStatus) params["StandardStatus"] = query.StandardStatus;
  if (query.limit) params["limit"] = query.limit;
  if (query.offset) params["offset"] = query.offset;
  if (query.sortBy) params["sortBy"] = query.sortBy;
  if (query.sortOrder) params["sortOrder"] = query.sortOrder;

  return bridgeRequest<BridgeSearchResult>("/OData/Property", params);
}

/**
 * Get a single property by its listing key.
 */
export async function getProperty(
  listingKey: string
): Promise<BridgeProperty> {
  return bridgeRequest<BridgeProperty>(`/OData/Property('${listingKey}')`);
}

/**
 * Get an automated valuation for an address.
 */
export async function getValuation(
  address: string,
  postalCode: string
): Promise<BridgeValuation> {
  return bridgeRequest<BridgeValuation>("/valuation", {
    address,
    postalCode,
  });
}

/**
 * Get market statistics for a geographic area.
 */
export async function getMarketStats(
  city: string,
  stateOrProvince: string,
  options?: { propertyType?: string; months?: number }
): Promise<BridgeMarketStats> {
  const params: Record<string, string | number> = {
    City: city,
    StateOrProvince: stateOrProvince,
  };

  if (options?.propertyType) params["PropertyType"] = options.propertyType;
  if (options?.months) params["months"] = options.months;

  return bridgeRequest<BridgeMarketStats>("/market/stats", params);
}

/**
 * Get active listings in a specific area.
 */
export async function getActiveListings(
  city: string,
  stateOrProvince: string,
  options?: {
    minPrice?: number;
    maxPrice?: number;
    minBedrooms?: number;
    limit?: number;
  }
): Promise<BridgeSearchResult> {
  return searchProperties({
    city,
    stateOrProvince,
    StandardStatus: "Active",
    "ListPrice.gte": options?.minPrice,
    "ListPrice.lte": options?.maxPrice,
    "BedroomsTotal.gte": options?.minBedrooms,
    limit: options?.limit ?? 25,
    sortBy: "ListPrice",
    sortOrder: "desc",
  });
}
