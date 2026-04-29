/**
 * Regrid (LandGrid) API Adapter
 *
 * Regrid provides nationwide parcel data: boundaries, land use,
 * zoning, owner info, tax data, and GIS features.
 *
 * Docs: https://regrid.com/api
 * Auth: API key via header (x-api-key)
 * Used for: Parcel boundaries, zoning, land use, lot data
 * Coverage: United States (155M+ parcels)
 */

import { getServerEnv } from "@/lib/config/env";

const DEFAULT_TIMEOUT_MS = 15_000;
const REGRID_API_BASE = "https://app.regrid.com/api/v2";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RegridParcel {
  id: string;
  type: "Feature";
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
  properties: RegridParcelProperties;
}

export interface RegridParcelProperties {
  /** Assessor Parcel Number */
  parcelnumb: string;
  /** Alternate APN format */
  parcelnumb_no_formatting?: string;
  /** FIPS code */
  fips: string;
  /** State name */
  state2: string;
  /** County name */
  county: string;
  /** Full situs address */
  address: string;
  /** Situs city */
  scity: string;
  /** Situs state */
  sstate: string;
  /** Situs ZIP */
  szip: string;
  /** Owner name */
  owner: string;
  /** Second owner name */
  owner2?: string;
  /** Mailing address */
  mail_addres?: string;
  /** Mailing city */
  mail_city?: string;
  /** Mailing state */
  mail_state2?: string;
  /** Mailing ZIP */
  mail_zip?: string;
  /** Land use code */
  usecode?: string;
  /** Land use description */
  usedesc?: string;
  /** Zoning code */
  zession?: string;
  /** Zoning description */
  zoning_description?: string;
  /** Lot area in acres */
  ll_gisacre?: number;
  /** Lot area in sqft */
  ll_gissqft?: number;
  /** Assessed land value */
  landval?: number;
  /** Assessed improvement value */
  improvval?: number;
  /** Total assessed value */
  parval?: number;
  /** Tax amount */
  taxamt?: number;
  /** Year built */
  yearbuilt?: number;
  /** Building area sqft */
  building_sqft?: number;
  /** Bedrooms */
  bedrooms?: number;
  /** Bathrooms */
  bathrooms?: number;
  /** Number of stories */
  story_count?: number;
  /** Number of buildings on parcel */
  building_count?: number;
  /** Property class */
  propclass?: string;
  /** Subdivision name */
  subdivision?: string;
  /** Legal description */
  legaldesc?: string;
  /** Last sale date */
  saledate?: string;
  /** Last sale price */
  saleprice?: number;
  /** Latitude of parcel centroid */
  lat?: number;
  /** Longitude of parcel centroid */
  lon?: number;
}

export interface RegridSearchResult {
  type: "FeatureCollection";
  features: RegridParcel[];
  metadata?: {
    total: number;
    page: number;
    perPage: number;
  };
}

// ─── Error ───────────────────────────────────────────────────────────────────

export class RegridAdapterError extends Error {
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
    this.name = "RegridAdapterError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

// ─── Configuration ──────────────────────────────────────────────────────────

function getRegridConfig() {
  const env = getServerEnv();
  return { apiKey: env.REGRID_API_KEY };
}

export function isRegridConfigured(): boolean {
  return Boolean(getRegridConfig().apiKey);
}

function assertConfigured() {
  const { apiKey } = getRegridConfig();
  if (!apiKey) {
    throw new RegridAdapterError({
      code: "REGRID_NOT_CONFIGURED",
      message: "Regrid API key must be configured.",
      status: 503,
    });
  }
  return { apiKey };
}

// ─── Core Request Function ──────────────────────────────────────────────────

async function regridRequest<T>(
  path: string,
  params?: Record<string, string | number>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const { apiKey } = assertConfigured();

  const url = new URL(`${REGRID_API_BASE}${path}`);
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
      "x-api-key": apiKey,
    },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new RegridAdapterError({
      code: `REGRID_HTTP_${response.status}`,
      message: `Regrid API failed: HTTP ${response.status} ${response.statusText}`,
      status: response.status,
      retryable: response.status >= 500 || response.status === 429,
    });
  }

  return (await response.json()) as T;
}

// ─── Public API Functions ───────────────────────────────────────────────────

/**
 * Search parcels by address.
 */
export async function searchByAddress(
  address: string,
  options?: { page?: number; perPage?: number }
): Promise<RegridSearchResult> {
  return regridRequest<RegridSearchResult>("/parcels/address", {
    query: address,
    page: options?.page ?? 1,
    per_page: options?.perPage ?? 10,
  });
}

/**
 * Get a parcel by its Regrid ID.
 */
export async function getParcel(parcelId: string): Promise<RegridParcel> {
  const result = await regridRequest<RegridSearchResult>(
    `/parcels/${parcelId}`
  );
  if (!result.features || result.features.length === 0) {
    throw new RegridAdapterError({
      code: "REGRID_NOT_FOUND",
      message: `Parcel ${parcelId} not found.`,
      status: 404,
    });
  }
  return result.features[0];
}

/**
 * Search parcels by APN within a county (FIPS code).
 */
export async function searchByAPN(
  apn: string,
  fips: string
): Promise<RegridSearchResult> {
  return regridRequest<RegridSearchResult>("/parcels/apn", {
    parcelnumb: apn,
    fips,
  });
}

/**
 * Search parcels by geographic point (lat/lon).
 */
export async function searchByPoint(
  lat: number,
  lon: number
): Promise<RegridSearchResult> {
  return regridRequest<RegridSearchResult>("/parcels/point", {
    lat,
    lon,
  });
}

/**
 * Search parcels by owner name within a county.
 */
export async function searchByOwner(
  ownerName: string,
  fips: string,
  options?: { page?: number; perPage?: number }
): Promise<RegridSearchResult> {
  return regridRequest<RegridSearchResult>("/parcels/owner", {
    owner: ownerName,
    fips,
    page: options?.page ?? 1,
    per_page: options?.perPage ?? 25,
  });
}

/**
 * Get parcel boundary GeoJSON for a specific address.
 * Returns the polygon geometry suitable for map rendering.
 */
export async function getParcelBoundary(
  address: string
): Promise<RegridParcel["geometry"] | null> {
  const result = await searchByAddress(address, { perPage: 1 });
  if (result.features.length === 0) return null;
  return result.features[0].geometry;
}

/**
 * Get zoning and land use info for a property.
 */
export async function getZoningInfo(
  address: string
): Promise<{
  zoneCode: string | null;
  zoneDescription: string | null;
  landUseCode: string | null;
  landUseDescription: string | null;
  propertyClass: string | null;
  lotAcres: number | null;
  lotSqft: number | null;
} | null> {
  const result = await searchByAddress(address, { perPage: 1 });
  if (result.features.length === 0) return null;

  const p = result.features[0].properties;
  return {
    zoneCode: p.zession ?? null,
    zoneDescription: p.zoning_description ?? null,
    landUseCode: p.usecode ?? null,
    landUseDescription: p.usedesc ?? null,
    propertyClass: p.propclass ?? null,
    lotAcres: p.ll_gisacre ?? null,
    lotSqft: p.ll_gissqft ?? null,
  };
}
