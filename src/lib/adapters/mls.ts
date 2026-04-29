/**
 * MLS Data Feeds Adapter (RESO Web API)
 *
 * The Real Estate Standards Organization (RESO) Web API is the modern
 * replacement for RETS. Most MLS providers now expose OData-based endpoints.
 *
 * Used for: Active/sold listing data, property details, photos, agent info
 * Coverage: US and Canada (varies by MLS provider)
 *
 * Note: Each MLS provider has its own base URL and credentials.
 * Olivia supports configuring a primary MLS feed via env vars.
 * Additional feeds can be registered at runtime via addFeed().
 */

import { getServerEnv } from "@/lib/config/env";

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 200;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MLSFeedConfig {
  name: string;
  baseUrl: string;
  apiKey?: string;
  bearerToken?: string;
  authType: "bearer" | "apikey" | "basic";
  username?: string;
  password?: string;
}

export interface MLSListingQuery {
  /** City name filter */
  city?: string;
  /** State or province code (e.g. "FL", "CA") */
  stateOrProvince?: string;
  /** ZIP / postal code */
  postalCode?: string;
  /** Minimum list price */
  minPrice?: number;
  /** Maximum list price */
  maxPrice?: number;
  /** Minimum bedrooms */
  minBedrooms?: number;
  /** Minimum bathrooms */
  minBathrooms?: number;
  /** Minimum living area in sqft */
  minLivingArea?: number;
  /** Maximum living area in sqft */
  maxLivingArea?: number;
  /** Property type filter (e.g. "Residential", "Condo") */
  propertyType?: string;
  /** Listing status filter */
  status?: MLSListingStatus;
  /** Number of results to return (max 200) */
  top?: number;
  /** Number of results to skip (pagination) */
  skip?: number;
  /** OData $orderby clause */
  orderBy?: string;
  /** Raw OData $filter to append (advanced usage) */
  rawFilter?: string;
}

export type MLSListingStatus =
  | "Active"
  | "Pending"
  | "Sold"
  | "Withdrawn"
  | "Expired"
  | "ActiveUnderContract";

export interface MLSListing {
  ListingKey: string;
  ListingId: string;
  StandardStatus: string;
  ListPrice: number;
  ClosePrice?: number;
  OriginalListPrice?: number;
  City: string;
  StateOrProvince: string;
  PostalCode: string;
  StreetNumberNumeric?: number;
  StreetName?: string;
  StreetSuffix?: string;
  UnparsedAddress?: string;
  Latitude?: number;
  Longitude?: number;
  BedroomsTotal?: number;
  BathroomsTotalInteger?: number;
  LivingArea?: number;
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
  PhotosCount?: number;
  Media?: MLSMedia[];
}

export interface MLSMedia {
  MediaKey: string;
  MediaURL: string;
  MediaCategory: string;
  ShortDescription?: string;
  Order: number;
}

export interface MLSSearchResult {
  "@odata.count"?: number;
  "@odata.nextLink"?: string;
  value: MLSListing[];
}

// ─── Error ───────────────────────────────────────────────────────────────────

export class MLSAdapterError extends Error {
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
    this.name = "MLSAdapterError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

// ─── Feed Registry ──────────────────────────────────────────────────────────

const feedRegistry: Map<string, MLSFeedConfig> = new Map();

function getPrimaryFeedConfig(): MLSFeedConfig | null {
  const env = getServerEnv();
  if (!env.MLS_RESO_BASE_URL) return null;

  return {
    name: "primary",
    baseUrl: env.MLS_RESO_BASE_URL.replace(/\/+$/, ""),
    bearerToken: env.MLS_RESO_BEARER_TOKEN,
    apiKey: env.MLS_RESO_API_KEY,
    authType: env.MLS_RESO_BEARER_TOKEN ? "bearer" : "apikey",
  };
}

export function isMLSConfigured(): boolean {
  return getPrimaryFeedConfig() !== null;
}

/**
 * Register an additional MLS feed at runtime (e.g. for multi-MLS support).
 */
export function addFeed(config: MLSFeedConfig): void {
  feedRegistry.set(config.name, config);
}

function getFeed(name?: string): MLSFeedConfig {
  if (name && feedRegistry.has(name)) {
    return feedRegistry.get(name)!;
  }

  const primary = getPrimaryFeedConfig();
  if (primary) return primary;

  throw new MLSAdapterError({
    code: "MLS_NOT_CONFIGURED",
    message:
      "No MLS feed configured. Set MLS_RESO_BASE_URL and auth credentials.",
    status: 503,
  });
}

// ─── Auth Headers ───────────────────────────────────────────────────────────

function getAuthHeaders(feed: MLSFeedConfig): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  switch (feed.authType) {
    case "bearer":
      if (!feed.bearerToken) {
        throw new MLSAdapterError({
          code: "MLS_AUTH_MISSING",
          message: `Bearer token missing for feed "${feed.name}"`,
          status: 401,
        });
      }
      headers["Authorization"] = `Bearer ${feed.bearerToken}`;
      break;
    case "apikey":
      if (!feed.apiKey) {
        throw new MLSAdapterError({
          code: "MLS_AUTH_MISSING",
          message: `API key missing for feed "${feed.name}"`,
          status: 401,
        });
      }
      headers["x-api-key"] = feed.apiKey;
      break;
    case "basic":
      if (!feed.username || !feed.password) {
        throw new MLSAdapterError({
          code: "MLS_AUTH_MISSING",
          message: `Basic auth credentials missing for feed "${feed.name}"`,
          status: 401,
        });
      }
      headers["Authorization"] =
        "Basic " +
        Buffer.from(`${feed.username}:${feed.password}`).toString("base64");
      break;
  }

  return headers;
}

// ─── OData Filter Builder ───────────────────────────────────────────────────

function buildFilter(query: MLSListingQuery): string {
  const conditions: string[] = [];

  if (query.city) {
    conditions.push(`City eq '${query.city}'`);
  }
  if (query.stateOrProvince) {
    conditions.push(`StateOrProvince eq '${query.stateOrProvince}'`);
  }
  if (query.postalCode) {
    conditions.push(`PostalCode eq '${query.postalCode}'`);
  }
  if (query.minPrice !== undefined) {
    conditions.push(`ListPrice ge ${query.minPrice}`);
  }
  if (query.maxPrice !== undefined) {
    conditions.push(`ListPrice le ${query.maxPrice}`);
  }
  if (query.minBedrooms !== undefined) {
    conditions.push(`BedroomsTotal ge ${query.minBedrooms}`);
  }
  if (query.minBathrooms !== undefined) {
    conditions.push(`BathroomsTotalInteger ge ${query.minBathrooms}`);
  }
  if (query.minLivingArea !== undefined) {
    conditions.push(`LivingArea ge ${query.minLivingArea}`);
  }
  if (query.maxLivingArea !== undefined) {
    conditions.push(`LivingArea le ${query.maxLivingArea}`);
  }
  if (query.propertyType) {
    conditions.push(`PropertyType eq '${query.propertyType}'`);
  }
  if (query.status) {
    conditions.push(`StandardStatus eq '${query.status}'`);
  }
  if (query.rawFilter) {
    conditions.push(query.rawFilter);
  }

  return conditions.join(" and ");
}

// ─── Core Request Function ──────────────────────────────────────────────────

async function resoRequest<T>(
  path: string,
  feed: MLSFeedConfig,
  params?: Record<string, string>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const url = new URL(`${feed.baseUrl}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: getAuthHeaders(feed),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new MLSAdapterError({
      code: `MLS_HTTP_${response.status}`,
      message: `MLS API request failed: HTTP ${response.status} ${response.statusText}`,
      status: response.status,
      retryable: response.status >= 500 || response.status === 429,
    });
  }

  return (await response.json()) as T;
}

// ─── Public API Functions ───────────────────────────────────────────────────

/**
 * Search MLS listings using RESO Web API OData queries.
 */
export async function searchListings(
  query: MLSListingQuery,
  feedName?: string
): Promise<MLSSearchResult> {
  const feed = getFeed(feedName);

  const params: Record<string, string> = {
    $count: "true",
    $top: String(
      Math.min(query.top ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
    ),
  };

  if (query.skip) {
    params["$skip"] = String(query.skip);
  }

  const filter = buildFilter(query);
  if (filter) {
    params["$filter"] = filter;
  }

  if (query.orderBy) {
    params["$orderby"] = query.orderBy;
  }

  return resoRequest<MLSSearchResult>("/Property", feed, params);
}

/**
 * Get a single listing by its ListingKey.
 */
export async function getListing(
  listingKey: string,
  feedName?: string
): Promise<MLSListing> {
  const feed = getFeed(feedName);
  return resoRequest<MLSListing>(`/Property('${listingKey}')`, feed);
}

/**
 * Get media (photos) for a listing.
 */
export async function getListingMedia(
  listingKey: string,
  feedName?: string
): Promise<MLSMedia[]> {
  const feed = getFeed(feedName);
  const result = await resoRequest<{ value: MLSMedia[] }>(
    `/Property('${listingKey}')/Media`,
    feed
  );
  return result.value;
}

/**
 * Get active listings in a specific city/state.
 */
export async function getActiveListings(
  city: string,
  stateOrProvince: string,
  options?: {
    minPrice?: number;
    maxPrice?: number;
    minBedrooms?: number;
    top?: number;
  },
  feedName?: string
): Promise<MLSSearchResult> {
  return searchListings(
    {
      city,
      stateOrProvince,
      status: "Active",
      orderBy: "ListPrice desc",
      ...options,
    },
    feedName
  );
}

/**
 * Get recently sold listings (comps) in an area.
 */
export async function getSoldComps(
  city: string,
  stateOrProvince: string,
  options?: {
    minPrice?: number;
    maxPrice?: number;
    top?: number;
  },
  feedName?: string
): Promise<MLSSearchResult> {
  return searchListings(
    {
      city,
      stateOrProvince,
      status: "Sold",
      orderBy: "CloseDate desc",
      top: options?.top ?? 50,
      ...options,
    },
    feedName
  );
}
