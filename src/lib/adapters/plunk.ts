/**
 * Plunk AI Property Valuation Adapter
 *
 * Plunk provides AI-powered property valuations, renovation ROI estimates,
 * neighborhood insights, and home improvement recommendations.
 *
 * Docs: https://docs.plunk.com/
 * Auth: API key via header
 * Used for: Property valuations, renovation ROI, neighborhood data
 * Coverage: United States
 */

import { getServerEnv } from "@/lib/config/env";

const DEFAULT_TIMEOUT_MS = 15_000;
const PLUNK_API_BASE = "https://api.getplunk.com/v1";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PlunkValuation {
  estimatedValue: number;
  valueLow: number;
  valueHigh: number;
  confidence: number;
  pricePerSqft: number;
  lastUpdated: string;
  valueChange1Year: number;
  valueChangePercent1Year: number;
  valueForecast1Year: number;
  valueForecastPercent1Year: number;
}

export interface PlunkPropertySummary {
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: number;
  longitude: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  lotSizeSqft: number;
  yearBuilt: number;
  propertyType: string;
  valuation: PlunkValuation;
}

export interface PlunkRenovationROI {
  projectType: string;
  description: string;
  estimatedCost: number;
  estimatedCostLow: number;
  estimatedCostHigh: number;
  estimatedValueAdd: number;
  roi: number;
  timeToComplete: string;
  priority: "high" | "medium" | "low";
}

export interface PlunkNeighborhoodInsight {
  medianHomeValue: number;
  medianRent: number;
  valueGrowth1Year: number;
  valueGrowth5Year: number;
  homeownershipRate: number;
  medianIncome: number;
  populationDensity: number;
  walkScore?: number;
  schoolRating?: number;
  crimeIndex?: number;
}

export interface PlunkComparable {
  address: string;
  city: string;
  state: string;
  zip: string;
  distance: number;
  salePrice: number;
  saleDate: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  yearBuilt: number;
  pricePerSqft: number;
}

// ─── Error ───────────────────────────────────────────────────────────────────

export class PlunkAdapterError extends Error {
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
    this.name = "PlunkAdapterError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

// ─── Configuration ──────────────────────────────────────────────────────────

function getPlunkConfig() {
  const env = getServerEnv();
  return { apiKey: env.PLUNK_API_KEY };
}

export function isPlunkConfigured(): boolean {
  return Boolean(getPlunkConfig().apiKey);
}

function assertConfigured() {
  const { apiKey } = getPlunkConfig();
  if (!apiKey) {
    throw new PlunkAdapterError({
      code: "PLUNK_NOT_CONFIGURED",
      message: "Plunk API key must be configured.",
      status: 503,
    });
  }
  return { apiKey };
}

// ─── Core Request Function ──────────────────────────────────────────────────

async function plunkRequest<T>(
  path: string,
  params?: Record<string, string | number>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const { apiKey } = assertConfigured();

  const url = new URL(`${PLUNK_API_BASE}${path}`);
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
    throw new PlunkAdapterError({
      code: `PLUNK_HTTP_${response.status}`,
      message: `Plunk API failed: HTTP ${response.status} ${response.statusText}`,
      status: response.status,
      retryable: response.status >= 500 || response.status === 429,
    });
  }

  return (await response.json()) as T;
}

// ─── Public API Functions ───────────────────────────────────────────────────

/**
 * Get an AI-powered property valuation.
 */
export async function getValuation(
  address: string,
  zip: string
): Promise<PlunkValuation> {
  return plunkRequest<PlunkValuation>("/property/valuation", {
    address,
    zip,
  });
}

/**
 * Get a full property summary including valuation.
 */
export async function getPropertySummary(
  address: string,
  zip: string
): Promise<PlunkPropertySummary> {
  return plunkRequest<PlunkPropertySummary>("/property/summary", {
    address,
    zip,
  });
}

/**
 * Get renovation ROI estimates for a property.
 * Returns ranked list of improvement projects with cost/value-add/ROI.
 */
export async function getRenovationROI(
  address: string,
  zip: string
): Promise<PlunkRenovationROI[]> {
  return plunkRequest<PlunkRenovationROI[]>("/property/renovations", {
    address,
    zip,
  });
}

/**
 * Get neighborhood insights for an area.
 */
export async function getNeighborhoodInsights(
  address: string,
  zip: string
): Promise<PlunkNeighborhoodInsight> {
  return plunkRequest<PlunkNeighborhoodInsight>("/neighborhood/insights", {
    address,
    zip,
  });
}

/**
 * Get comparable sales near a property.
 */
export async function getComparables(
  address: string,
  zip: string,
  options?: { radius?: number; limit?: number; months?: number }
): Promise<PlunkComparable[]> {
  return plunkRequest<PlunkComparable[]>("/property/comparables", {
    address,
    zip,
    ...(options?.radius !== undefined && { radius: options.radius }),
    ...(options?.limit !== undefined && { limit: options.limit }),
    ...(options?.months !== undefined && { months: options.months }),
  });
}

/**
 * Get a comprehensive investment package for a property.
 * Combines valuation, renovation ROI, neighborhood data, and comps.
 */
export async function getInvestmentPackage(
  address: string,
  zip: string
): Promise<{
  property: PlunkPropertySummary;
  renovations: PlunkRenovationROI[];
  neighborhood: PlunkNeighborhoodInsight;
  comparables: PlunkComparable[];
}> {
  const [property, renovations, neighborhood, comparables] = await Promise.all([
    getPropertySummary(address, zip),
    getRenovationROI(address, zip),
    getNeighborhoodInsights(address, zip),
    getComparables(address, zip),
  ]);

  return { property, renovations, neighborhood, comparables };
}
