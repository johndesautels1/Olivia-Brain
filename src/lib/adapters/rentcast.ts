/**
 * Rentcast API Adapter
 *
 * Rentcast provides rental estimates, rental market data, rental
 * comparables, and long-term rental listings.
 *
 * Docs: https://developers.rentcast.io/reference
 * Auth: API key via header (X-Api-Key)
 * Used for: Rental estimates, market rent data, rental comps
 * Coverage: United States
 */

import { getServerEnv } from "@/lib/config/env";

const DEFAULT_TIMEOUT_MS = 15_000;
const RENTCAST_API_BASE = "https://api.rentcast.io/v1";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RCRentEstimate {
  rent: number;
  rentRangeLow: number;
  rentRangeHigh: number;
  longitude: number;
  latitude: number;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  propertyType: string;
  lastUpdated: string;
}

export interface RCMarketRent {
  zipCode: string;
  city: string;
  state: string;
  averageRent: number;
  medianRent: number;
  minRent: number;
  maxRent: number;
  averageRentPerSqft: number;
  totalListings: number;
  bedrooms: number | null;
  propertyType: string | null;
  lastUpdated: string;
}

export interface RCRentalComparable {
  id: string;
  formattedAddress: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  propertyType: string;
  rent: number;
  rentPerSqft: number;
  daysOnMarket: number;
  listedDate: string;
  distance: number;
  correlation: number;
}

export interface RCRentalListing {
  id: string;
  formattedAddress: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  propertyType: string;
  rent: number;
  listedDate: string;
  daysOnMarket: number;
  photos?: string[];
  description?: string;
  petPolicy?: string;
  laundry?: string;
  parking?: string;
}

export type RCPropertyType =
  | "Single Family"
  | "Condo"
  | "Townhouse"
  | "Apartment"
  | "Multi-Family"
  | "Manufactured";

// ─── Error ───────────────────────────────────────────────────────────────────

export class RentcastAdapterError extends Error {
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
    this.name = "RentcastAdapterError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

// ─── Configuration ──────────────────────────────────────────────────────────

function getRCConfig() {
  const env = getServerEnv();
  return { apiKey: env.RENTCAST_API_KEY };
}

export function isRentcastConfigured(): boolean {
  return Boolean(getRCConfig().apiKey);
}

function assertConfigured() {
  const { apiKey } = getRCConfig();
  if (!apiKey) {
    throw new RentcastAdapterError({
      code: "RENTCAST_NOT_CONFIGURED",
      message: "Rentcast API key must be configured.",
      status: 503,
    });
  }
  return { apiKey };
}

// ─── Core Request Function ──────────────────────────────────────────────────

async function rcRequest<T>(
  path: string,
  params?: Record<string, string | number>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const { apiKey } = assertConfigured();

  const url = new URL(`${RENTCAST_API_BASE}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-Api-Key": apiKey,
    },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new RentcastAdapterError({
      code: `RENTCAST_HTTP_${response.status}`,
      message: `Rentcast API failed: HTTP ${response.status} ${response.statusText}`,
      status: response.status,
      retryable: response.status >= 500 || response.status === 429,
    });
  }

  return (await response.json()) as T;
}

// ─── Public API Functions ───────────────────────────────────────────────────

/**
 * Get a rent estimate for a specific property address.
 */
export async function getRentEstimate(
  address: string,
  options?: {
    bedrooms?: number;
    bathrooms?: number;
    sqft?: number;
    propertyType?: RCPropertyType;
  }
): Promise<RCRentEstimate> {
  const params: Record<string, string | number> = { address };

  if (options?.bedrooms !== undefined) params.bedrooms = options.bedrooms;
  if (options?.bathrooms !== undefined) params.bathrooms = options.bathrooms;
  if (options?.sqft !== undefined) params.squareFootage = options.sqft;
  if (options?.propertyType) params.propertyType = options.propertyType;

  return rcRequest<RCRentEstimate>("/avm/rent/long-term", params);
}

/**
 * Get market rent statistics for a ZIP code.
 */
export async function getMarketRent(
  zipCode: string,
  options?: {
    bedrooms?: number;
    propertyType?: RCPropertyType;
  }
): Promise<RCMarketRent> {
  const params: Record<string, string | number> = { zipCode };

  if (options?.bedrooms !== undefined) params.bedrooms = options.bedrooms;
  if (options?.propertyType) params.propertyType = options.propertyType;

  return rcRequest<RCMarketRent>("/market/rent/zipcode", params);
}

/**
 * Get rental comparables near a property.
 */
export async function getRentalComps(
  address: string,
  options?: {
    bedrooms?: number;
    bathrooms?: number;
    sqft?: number;
    propertyType?: RCPropertyType;
    radius?: number;
    limit?: number;
  }
): Promise<RCRentalComparable[]> {
  const params: Record<string, string | number> = { address };

  if (options?.bedrooms !== undefined) params.bedrooms = options.bedrooms;
  if (options?.bathrooms !== undefined) params.bathrooms = options.bathrooms;
  if (options?.sqft !== undefined) params.squareFootage = options.sqft;
  if (options?.propertyType) params.propertyType = options.propertyType;
  if (options?.radius !== undefined) params.radius = options.radius;
  if (options?.limit !== undefined) params.limit = options.limit;

  return rcRequest<RCRentalComparable[]>("/avm/rent/comparables", params);
}

/**
 * Get active rental listings in an area.
 */
export async function getRentalListings(
  zipCode: string,
  options?: {
    bedrooms?: number;
    propertyType?: RCPropertyType;
    minRent?: number;
    maxRent?: number;
    limit?: number;
  }
): Promise<RCRentalListing[]> {
  const params: Record<string, string | number> = { zipCode };

  if (options?.bedrooms !== undefined) params.bedrooms = options.bedrooms;
  if (options?.propertyType) params.propertyType = options.propertyType;
  if (options?.minRent !== undefined) params.minRent = options.minRent;
  if (options?.maxRent !== undefined) params.maxRent = options.maxRent;
  if (options?.limit !== undefined) params.limit = options.limit;

  return rcRequest<RCRentalListing[]>("/listings/rental/long-term", params);
}

/**
 * Get a comprehensive rental analysis for an investment property.
 * Combines estimate, market data, and comps.
 */
export async function getRentalAnalysis(
  address: string,
  zipCode: string,
  options?: { bedrooms?: number; bathrooms?: number; sqft?: number }
): Promise<{
  estimate: RCRentEstimate;
  marketRent: RCMarketRent;
  comparables: RCRentalComparable[];
  rentVsMarket: number | null;
}> {
  const [estimate, marketRent, comparables] = await Promise.all([
    getRentEstimate(address, options),
    getMarketRent(zipCode, { bedrooms: options?.bedrooms }),
    getRentalComps(address, { ...options, limit: 10 }),
  ]);

  // How this property's rent compares to market median (percentage)
  let rentVsMarket: number | null = null;
  if (estimate.rent > 0 && marketRent.medianRent > 0) {
    rentVsMarket =
      ((estimate.rent - marketRent.medianRent) / marketRent.medianRent) * 100;
  }

  return { estimate, marketRent, comparables, rentVsMarket };
}
