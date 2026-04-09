/**
 * WhereNext Cost of Living API Adapter
 *
 * FREE API - CC BY 4.0 license (attribution required)
 * Docs: https://getwherenext.com/blog/free-numbeo-alternative-cost-of-living
 *
 * Used for: Cost of living comparisons for relocation planning
 * Coverage: 380 cities across 95 countries
 *
 * Alternative to Numbeo ($50-500/month)
 */

const DEFAULT_TIMEOUT_MS = 10_000;
const WHERENEXT_API_BASE = "https://api.getwherenext.com/v1";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CityIndex {
  city: string;
  country: string;
  iso_code: string;
  region?: string;
  overall_index: number;
  rent_index: number;
  groceries_index: number;
  restaurants_index: number;
  transport_index: number;
  utilities_index: number;
  local_purchasing_power_index?: number;
  last_updated: string;
}

export interface CountryIndex {
  country: string;
  iso_code: string;
  region: string;
  overall_index: number;
  rent_index: number;
  groceries_index: number;
  restaurants_index: number;
  transport_index: number;
  utilities_index: number;
  quality_of_life_index?: number;
  safety_index?: number;
  healthcare_index?: number;
  last_updated: string;
}

export interface RelocationIndex {
  country: string;
  iso_code: string;
  relocation_score: number;
  dimensions: {
    cost_of_living: number;
    quality_of_life: number;
    safety: number;
    healthcare: number;
    internet_speed: number;
    english_proficiency: number;
    visa_accessibility: number;
  };
  last_updated: string;
}

export interface DigitalNomadVisa {
  country: string;
  iso_code: string;
  visa_name: string;
  duration_months: number;
  min_income_usd?: number;
  tax_status?: string;
  remote_work_allowed: boolean;
  application_fee_usd?: number;
  processing_time_days?: number;
  renewability?: string;
  requirements?: string[];
  official_link?: string;
}

export interface ExpatTaxRate {
  country: string;
  iso_code: string;
  income_tiers: {
    income_level: "50k" | "100k" | "200k";
    effective_rate_percent: number;
    marginal_rate_percent: number;
    notes?: string;
  }[];
  territorial_taxation: boolean;
  tax_treaties_count?: number;
  last_updated: string;
}

export interface CostComparison {
  base_city: CityIndex;
  target_city: CityIndex;
  comparison: {
    overall_difference_percent: number;
    rent_difference_percent: number;
    groceries_difference_percent: number;
    restaurants_difference_percent: number;
    transport_difference_percent: number;
    utilities_difference_percent: number;
    salary_needed_to_maintain_lifestyle: number; // percentage of base salary
  };
}

export class WhereNextAdapterError extends Error {
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
    this.name = "WhereNextAdapterError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

// ─── Configuration ───────────────────────────────────────────────────────────

// WhereNext API is free and doesn't require an API key
export function isWhereNextConfigured(): boolean {
  return true; // Always configured - no API key needed
}

// ─── Core Request Function ───────────────────────────────────────────────────

interface RequestOptions {
  params?: Record<string, string | number | undefined>;
  timeoutMs?: number;
}

async function requestWhereNext<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const url = new URL(`${WHERENEXT_API_BASE}${endpoint}`);

  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new WhereNextAdapterError({
      code: "WHERENEXT_REQUEST_FAILED",
      message: `WhereNext API request failed with HTTP ${response.status}`,
      status: response.status,
      retryable: response.status >= 500,
    });
  }

  const payload = await response.json();
  return payload as T;
}

// ─── Public API Functions ────────────────────────────────────────────────────

/**
 * Get cost of living data for all cities
 */
export async function getAllCities(): Promise<CityIndex[]> {
  return requestWhereNext<CityIndex[]>("/cost-of-living/cities");
}

/**
 * Get cost of living data for a specific city
 */
export async function getCityIndex(
  city: string,
  country: string
): Promise<CityIndex | null> {
  const cities = await getAllCities();
  return cities.find(
    (c) =>
      c.city.toLowerCase() === city.toLowerCase() &&
      c.country.toLowerCase() === country.toLowerCase()
  ) || null;
}

/**
 * Get cost of living data for all countries
 */
export async function getAllCountries(): Promise<CountryIndex[]> {
  return requestWhereNext<CountryIndex[]>("/cost-of-living/countries");
}

/**
 * Get cost of living data for a specific country
 */
export async function getCountryIndex(
  countryOrCode: string
): Promise<CountryIndex | null> {
  const countries = await getAllCountries();
  const normalized = countryOrCode.toLowerCase();
  return countries.find(
    (c) =>
      c.country.toLowerCase() === normalized ||
      c.iso_code.toLowerCase() === normalized
  ) || null;
}

/**
 * Get global relocation index for all countries
 */
export async function getRelocationIndex(): Promise<RelocationIndex[]> {
  return requestWhereNext<RelocationIndex[]>("/relocation-index");
}

/**
 * Get digital nomad visa information
 */
export async function getDigitalNomadVisas(): Promise<DigitalNomadVisa[]> {
  return requestWhereNext<DigitalNomadVisa[]>("/digital-nomad-visas");
}

/**
 * Get expat tax rates
 */
export async function getExpatTaxRates(): Promise<ExpatTaxRate[]> {
  return requestWhereNext<ExpatTaxRate[]>("/expat-tax-rates");
}

// ─── Convenience Functions ───────────────────────────────────────────────────

/**
 * Compare cost of living between two cities
 */
export async function compareCities(
  baseCity: string,
  baseCountry: string,
  targetCity: string,
  targetCountry: string
): Promise<CostComparison | null> {
  const cities = await getAllCities();

  const base = cities.find(
    (c) =>
      c.city.toLowerCase() === baseCity.toLowerCase() &&
      c.country.toLowerCase() === baseCountry.toLowerCase()
  );

  const target = cities.find(
    (c) =>
      c.city.toLowerCase() === targetCity.toLowerCase() &&
      c.country.toLowerCase() === targetCountry.toLowerCase()
  );

  if (!base || !target) return null;

  const calcDiff = (baseVal: number, targetVal: number) =>
    Math.round(((targetVal - baseVal) / baseVal) * 100);

  return {
    base_city: base,
    target_city: target,
    comparison: {
      overall_difference_percent: calcDiff(base.overall_index, target.overall_index),
      rent_difference_percent: calcDiff(base.rent_index, target.rent_index),
      groceries_difference_percent: calcDiff(base.groceries_index, target.groceries_index),
      restaurants_difference_percent: calcDiff(base.restaurants_index, target.restaurants_index),
      transport_difference_percent: calcDiff(base.transport_index, target.transport_index),
      utilities_difference_percent: calcDiff(base.utilities_index, target.utilities_index),
      salary_needed_to_maintain_lifestyle: Math.round((target.overall_index / base.overall_index) * 100),
    },
  };
}

/**
 * Find cheapest cities in a region
 */
export async function findCheapestCities(
  region?: string,
  limit: number = 10
): Promise<CityIndex[]> {
  let cities = await getAllCities();

  if (region) {
    cities = cities.filter(
      (c) => c.region?.toLowerCase() === region.toLowerCase()
    );
  }

  return cities
    .sort((a, b) => a.overall_index - b.overall_index)
    .slice(0, limit);
}

/**
 * Find cities within a budget range (compared to a base city)
 */
export async function findCitiesInBudget(
  baseSalary: number,
  baseCity: string,
  baseCountry: string,
  minBudgetPercent: number = 50,
  maxBudgetPercent: number = 100
): Promise<{
  city: string;
  country: string;
  equivalent_salary_needed: number;
  savings_percent: number;
  overall_index: number;
}[]> {
  const cities = await getAllCities();

  const base = cities.find(
    (c) =>
      c.city.toLowerCase() === baseCity.toLowerCase() &&
      c.country.toLowerCase() === baseCountry.toLowerCase()
  );

  if (!base) return [];

  return cities
    .map((c) => {
      const ratio = c.overall_index / base.overall_index;
      const equivalentSalary = Math.round(baseSalary * ratio);
      const savingsPercent = Math.round((1 - ratio) * 100);

      return {
        city: c.city,
        country: c.country,
        equivalent_salary_needed: equivalentSalary,
        savings_percent: savingsPercent,
        overall_index: c.overall_index,
        _ratio: ratio * 100,
      };
    })
    .filter(
      (c) => c._ratio >= minBudgetPercent && c._ratio <= maxBudgetPercent
    )
    .sort((a, b) => a.equivalent_salary_needed - b.equivalent_salary_needed)
    .map(({ _ratio, ...rest }) => rest);
}

/**
 * Get countries with digital nomad visas sorted by relocation score
 */
export async function getTopDigitalNomadDestinations(
  limit: number = 20
): Promise<{
  country: string;
  iso_code: string;
  visa_name: string;
  duration_months: number;
  min_income_usd?: number;
  relocation_score?: number;
}[]> {
  const [visas, relocationData] = await Promise.all([
    getDigitalNomadVisas(),
    getRelocationIndex(),
  ]);

  const relocationMap = new Map(
    relocationData.map((r) => [r.iso_code, r.relocation_score])
  );

  return visas
    .map((v) => ({
      country: v.country,
      iso_code: v.iso_code,
      visa_name: v.visa_name,
      duration_months: v.duration_months,
      min_income_usd: v.min_income_usd,
      relocation_score: relocationMap.get(v.iso_code),
    }))
    .sort((a, b) => (b.relocation_score ?? 0) - (a.relocation_score ?? 0))
    .slice(0, limit);
}

// ─── Index Interpretation ────────────────────────────────────────────────────

export function interpretCostIndex(index: number): {
  level: "very_low" | "low" | "moderate" | "high" | "very_high";
  description: string;
  emoji: string;
} {
  // Indices are typically normalized to NYC = 100
  if (index < 40) {
    return {
      level: "very_low",
      description: "Very affordable - less than half of NYC costs",
      emoji: "💚",
    };
  }
  if (index < 60) {
    return {
      level: "low",
      description: "Affordable - significantly below NYC costs",
      emoji: "💰",
    };
  }
  if (index < 80) {
    return {
      level: "moderate",
      description: "Moderate - somewhat below NYC costs",
      emoji: "📊",
    };
  }
  if (index < 100) {
    return {
      level: "high",
      description: "Expensive - approaching NYC costs",
      emoji: "💸",
    };
  }
  return {
    level: "very_high",
    description: "Very expensive - at or above NYC costs",
    emoji: "🔥",
  };
}

// ─── Attribution (required for CC BY 4.0) ────────────────────────────────────

export const WHERENEXT_ATTRIBUTION = {
  text: "Data provided by WhereNext (getwherenext.com) under CC BY 4.0 license",
  url: "https://getwherenext.com",
  license: "CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
};
