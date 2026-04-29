/**
 * HouseCanary API Adapter
 *
 * HouseCanary provides property analytics: AVMs, rental estimates,
 * market forecasts, investment scoring, and property details.
 *
 * Docs: https://api-docs.housecanary.com/
 * Auth: HTTP Basic (API key + secret)
 * Used for: Property valuations, investment analytics, market forecasts
 * Coverage: United States
 */

import { getServerEnv } from "@/lib/config/env";

const DEFAULT_TIMEOUT_MS = 15_000;
const HC_API_BASE = "https://api.housecanary.com/v3";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HCAddressLookup {
  address: string;
  zipcode: string;
  city?: string;
  state?: string;
  unit?: string;
}

export interface HCValuation {
  price_mean: number;
  price_upr: number;
  price_lwr: number;
  fsd: number;
  quality: string;
  as_of_date: string;
}

export interface HCRentalEstimate {
  price_mean: number;
  price_upr: number;
  price_lwr: number;
  as_of_date: string;
}

export interface HCPropertyDetails {
  address: string;
  city: string;
  state: string;
  zipcode: string;
  county: string;
  latitude: number;
  longitude: number;
  bedrooms: number;
  bathrooms: number;
  building_area_sq_ft: number;
  lot_size_sq_ft: number;
  year_built: number;
  property_type: string;
  stories: number;
  pool: boolean;
  garage_type: string;
  garage_spaces: number;
  assessment_year: number;
  assessed_value: number;
  tax_amount: number;
}

export interface HCSaleHistory {
  date: string;
  price: number;
  event_type: string;
  record_type: string;
  buyer: string;
  seller: string;
}

export interface HCMarketForecast {
  month: string;
  forecast_percent_change: number;
  forecast_price_index: number;
}

export interface HCInvestmentScore {
  total_score: number;
  appreciation_score: number;
  rental_score: number;
  affordability_score: number;
  risk_score: number;
}

export interface HCResponse<T> {
  address_info: {
    address: string;
    city: string;
    state: string;
    zipcode: string;
    slug: string;
  };
  result: T;
}

// ─── Error ───────────────────────────────────────────────────────────────────

export class HouseCanaryAdapterError extends Error {
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
    this.name = "HouseCanaryAdapterError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

// ─── Configuration ──────────────────────────────────────────────────────────

function getHCConfig() {
  const env = getServerEnv();
  return {
    apiKey: env.HOUSECANARY_API_KEY,
    apiSecret: env.HOUSECANARY_API_SECRET,
  };
}

export function isHouseCanaryConfigured(): boolean {
  const { apiKey, apiSecret } = getHCConfig();
  return Boolean(apiKey && apiSecret);
}

function assertConfigured() {
  const { apiKey, apiSecret } = getHCConfig();
  if (!apiKey || !apiSecret) {
    throw new HouseCanaryAdapterError({
      code: "HC_NOT_CONFIGURED",
      message: "HouseCanary API key and secret must be configured.",
      status: 503,
    });
  }
  return { apiKey, apiSecret };
}

// ─── Core Request Function ──────────────────────────────────────────────────

async function hcRequest<T>(
  path: string,
  lookup: HCAddressLookup,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<HCResponse<T>> {
  const { apiKey, apiSecret } = assertConfigured();

  const url = new URL(`${HC_API_BASE}${path}`);
  url.searchParams.set("address", lookup.address);
  url.searchParams.set("zipcode", lookup.zipcode);
  if (lookup.city) url.searchParams.set("city", lookup.city);
  if (lookup.state) url.searchParams.set("state", lookup.state);
  if (lookup.unit) url.searchParams.set("unit", lookup.unit);

  const authHeader =
    "Basic " + Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: authHeader,
    },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new HouseCanaryAdapterError({
      code: `HC_HTTP_${response.status}`,
      message: `HouseCanary API failed: HTTP ${response.status} ${response.statusText}`,
      status: response.status,
      retryable: response.status >= 500 || response.status === 429,
    });
  }

  const payload = await response.json();

  // HouseCanary returns arrays for single-address lookups
  if (Array.isArray(payload) && payload.length > 0) {
    return payload[0] as HCResponse<T>;
  }

  return payload as HCResponse<T>;
}

// ─── Public API Functions ───────────────────────────────────────────────────

/**
 * Get an automated valuation (AVM) for a property.
 */
export async function getValuation(
  address: string,
  zipcode: string
): Promise<HCResponse<{ value: HCValuation }>> {
  return hcRequest<{ value: HCValuation }>("/property/value", {
    address,
    zipcode,
  });
}

/**
 * Get a rental value estimate for a property.
 */
export async function getRentalEstimate(
  address: string,
  zipcode: string
): Promise<HCResponse<{ value: HCRentalEstimate }>> {
  return hcRequest<{ value: HCRentalEstimate }>("/property/rental_value", {
    address,
    zipcode,
  });
}

/**
 * Get property details (beds, baths, sqft, year built, taxes, etc.)
 */
export async function getPropertyDetails(
  address: string,
  zipcode: string
): Promise<HCResponse<{ property: HCPropertyDetails }>> {
  return hcRequest<{ property: HCPropertyDetails }>("/property/details", {
    address,
    zipcode,
  });
}

/**
 * Get sale history for a property.
 */
export async function getSaleHistory(
  address: string,
  zipcode: string
): Promise<HCResponse<{ sales: HCSaleHistory[] }>> {
  return hcRequest<{ sales: HCSaleHistory[] }>("/property/sales_history", {
    address,
    zipcode,
  });
}

/**
 * Get ZIP-level market forecast (12-month price index prediction).
 */
export async function getMarketForecast(
  zipcode: string
): Promise<HCResponse<{ forecast: HCMarketForecast[] }>> {
  return hcRequest<{ forecast: HCMarketForecast[] }>(
    "/property/zip_hpi_forecast",
    { address: "", zipcode }
  );
}

/**
 * Get a comprehensive investment analysis for a property.
 * Combines valuation, rental estimate, and property details.
 */
export async function getInvestmentAnalysis(
  address: string,
  zipcode: string
): Promise<{
  valuation: HCValuation;
  rental: HCRentalEstimate;
  details: HCPropertyDetails;
  capRate: number | null;
  grossYield: number | null;
}> {
  const [valRes, rentalRes, detailsRes] = await Promise.all([
    getValuation(address, zipcode),
    getRentalEstimate(address, zipcode),
    getPropertyDetails(address, zipcode),
  ]);

  const value = valRes.result.value;
  const rental = rentalRes.result.value;
  const details = detailsRes.result.property;

  // Calculate investment metrics
  let capRate: number | null = null;
  let grossYield: number | null = null;

  if (value.price_mean > 0 && rental.price_mean > 0) {
    const annualRent = rental.price_mean * 12;
    grossYield = (annualRent / value.price_mean) * 100;

    // Estimate operating expenses at 40% of gross rent (rule of thumb)
    const noi = annualRent * 0.6;
    capRate = (noi / value.price_mean) * 100;
  }

  return {
    valuation: value,
    rental,
    details,
    capRate,
    grossYield,
  };
}
