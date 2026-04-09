/**
 * AirNow API Adapter
 *
 * FREE EPA API - requires free API key registration
 * Docs: https://docs.airnowapi.org/
 *
 * Used for: Air quality data for relocation health assessment
 * Coverage: United States
 *
 * Rate limits: 500 requests/hour (free tier)
 */

import { getServerEnv } from "@/lib/config/env";

const DEFAULT_TIMEOUT_MS = 10_000;
const AIRNOW_API_BASE = "https://www.airnowapi.org";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AQICategory =
  | "Good"
  | "Moderate"
  | "Unhealthy for Sensitive Groups"
  | "Unhealthy"
  | "Very Unhealthy"
  | "Hazardous";

export type Pollutant = "O3" | "PM2.5" | "PM10" | "CO" | "NO2" | "SO2";

export interface AQIObservation {
  DateObserved: string;
  HourObserved: number;
  LocalTimeZone: string;
  ReportingArea: string;
  StateCode: string;
  Latitude: number;
  Longitude: number;
  ParameterName: Pollutant;
  AQI: number;
  Category: {
    Number: number;
    Name: AQICategory;
  };
}

export interface AQIForecast {
  DateIssue: string;
  DateForecast: string;
  ReportingArea: string;
  StateCode: string;
  Latitude: number;
  Longitude: number;
  ParameterName: Pollutant;
  AQI: number;
  Category: {
    Number: number;
    Name: AQICategory;
  };
  ActionDay: boolean;
  Discussion?: string;
}

export interface MonitoringSite {
  StationId: string;
  StationName: string;
  Status: string;
  AgencyId: string;
  AgencyName: string;
  EPARegion: string;
  Latitude: number;
  Longitude: number;
  Elevation: number;
  GMTOffset: number;
  CountryCode: string;
  CBSA_Id: string;
  CBSA_Name: string;
  StateAbbreviation: string;
  StateFIPS: string;
  CountyFIPS: string;
  CountyName: string;
  SiteAddress?: string;
}

export interface AirQualitySummary {
  location: string;
  state: string;
  latitude: number;
  longitude: number;
  currentAQI: number;
  primaryPollutant: Pollutant;
  category: AQICategory;
  healthRecommendation: string;
  pollutants: {
    name: Pollutant;
    aqi: number;
    category: AQICategory;
  }[];
}

export class AirNowAdapterError extends Error {
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
    this.name = "AirNowAdapterError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

// ─── Configuration ───────────────────────────────────────────────────────────

function getAirNowConfig() {
  const env = getServerEnv();
  return {
    apiKey: env.AIRNOW_API_KEY,
  };
}

export function isAirNowConfigured(): boolean {
  const { apiKey } = getAirNowConfig();
  return Boolean(apiKey);
}

function assertConfigured() {
  const { apiKey } = getAirNowConfig();
  if (!apiKey) {
    throw new AirNowAdapterError({
      code: "AIRNOW_NOT_CONFIGURED",
      message: "AirNow API key must be configured.",
      status: 503,
    });
  }
  return { apiKey };
}

// ─── Core Request Function ───────────────────────────────────────────────────

interface RequestOptions {
  params?: Record<string, string | number | undefined>;
  timeoutMs?: number;
}

async function requestAirNow<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { apiKey } = assertConfigured();

  const url = new URL(`${AIRNOW_API_BASE}${endpoint}`);
  url.searchParams.set("format", "application/json");
  url.searchParams.set("API_KEY", apiKey);

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
    throw new AirNowAdapterError({
      code: "AIRNOW_REQUEST_FAILED",
      message: `AirNow API request failed with HTTP ${response.status}`,
      status: response.status,
      retryable: response.status >= 500 || response.status === 429,
    });
  }

  return response.json() as Promise<T>;
}

// ─── Public API Functions ────────────────────────────────────────────────────

/**
 * Get current air quality by ZIP code
 */
export async function getCurrentAQIByZip(
  zipCode: string,
  distance?: number
): Promise<AQIObservation[]> {
  return requestAirNow<AQIObservation[]>("/aq/observation/zipCode/current/", {
    params: {
      zipCode,
      distance: distance ?? 25,
    },
  });
}

/**
 * Get current air quality by latitude/longitude
 */
export async function getCurrentAQIByLatLon(
  lat: number,
  lon: number,
  distance?: number
): Promise<AQIObservation[]> {
  return requestAirNow<AQIObservation[]>("/aq/observation/latLong/current/", {
    params: {
      latitude: lat,
      longitude: lon,
      distance: distance ?? 25,
    },
  });
}

/**
 * Get air quality forecast by ZIP code
 */
export async function getForecastByZip(
  zipCode: string,
  date?: string,
  distance?: number
): Promise<AQIForecast[]> {
  return requestAirNow<AQIForecast[]>("/aq/forecast/zipCode/", {
    params: {
      zipCode,
      date,
      distance: distance ?? 25,
    },
  });
}

/**
 * Get air quality forecast by latitude/longitude
 */
export async function getForecastByLatLon(
  lat: number,
  lon: number,
  date?: string,
  distance?: number
): Promise<AQIForecast[]> {
  return requestAirNow<AQIForecast[]>("/aq/forecast/latLong/", {
    params: {
      latitude: lat,
      longitude: lon,
      date,
      distance: distance ?? 25,
    },
  });
}

/**
 * Get historical air quality observations
 */
export async function getHistoricalAQI(
  zipCode: string,
  startDate: string,
  endDate: string
): Promise<AQIObservation[]> {
  return requestAirNow<AQIObservation[]>("/aq/observation/zipCode/historical/", {
    params: {
      zipCode,
      startDate,
      endDate,
    },
  });
}

// ─── Convenience Functions ───────────────────────────────────────────────────

/**
 * Get air quality summary for a location
 */
export async function getAirQualitySummary(
  lat: number,
  lon: number
): Promise<AirQualitySummary | null> {
  const observations = await getCurrentAQIByLatLon(lat, lon);

  if (observations.length === 0) return null;

  // Find the worst AQI
  const sorted = observations.sort((a, b) => b.AQI - a.AQI);
  const worst = sorted[0];

  return {
    location: worst.ReportingArea,
    state: worst.StateCode,
    latitude: worst.Latitude,
    longitude: worst.Longitude,
    currentAQI: worst.AQI,
    primaryPollutant: worst.ParameterName,
    category: worst.Category.Name,
    healthRecommendation: getHealthRecommendation(worst.Category.Name),
    pollutants: observations.map((o) => ({
      name: o.ParameterName,
      aqi: o.AQI,
      category: o.Category.Name,
    })),
  };
}

/**
 * Get air quality score for relocation analysis (0-100, higher = better air)
 */
export async function getAirQualityScore(
  lat: number,
  lon: number
): Promise<{
  latitude: number;
  longitude: number;
  score: number;
  currentAQI: number;
  category: AQICategory;
  primaryPollutant: Pollutant | null;
  interpretation: string;
}> {
  const summary = await getAirQualitySummary(lat, lon);

  if (!summary) {
    return {
      latitude: lat,
      longitude: lon,
      score: 75, // Default moderate score when no data
      currentAQI: 0,
      category: "Good",
      primaryPollutant: null,
      interpretation: "No air quality data available for this location",
    };
  }

  // Convert AQI to score (inverse relationship)
  // AQI 0-50 (Good) = Score 80-100
  // AQI 51-100 (Moderate) = Score 60-79
  // AQI 101-150 (USG) = Score 40-59
  // AQI 151-200 (Unhealthy) = Score 20-39
  // AQI 201+ = Score 0-19
  let score: number;
  const aqi = summary.currentAQI;

  if (aqi <= 50) {
    score = 100 - (aqi / 50) * 20; // 80-100
  } else if (aqi <= 100) {
    score = 80 - ((aqi - 50) / 50) * 20; // 60-80
  } else if (aqi <= 150) {
    score = 60 - ((aqi - 100) / 50) * 20; // 40-60
  } else if (aqi <= 200) {
    score = 40 - ((aqi - 150) / 50) * 20; // 20-40
  } else {
    score = Math.max(0, 20 - ((aqi - 200) / 100) * 20); // 0-20
  }

  score = Math.round(score);

  let interpretation: string;
  if (score >= 80) interpretation = "Excellent air quality - minimal health concerns";
  else if (score >= 60) interpretation = "Good air quality - acceptable for most people";
  else if (score >= 40) interpretation = "Moderate air quality - sensitive groups may be affected";
  else if (score >= 20) interpretation = "Poor air quality - health effects possible for all";
  else interpretation = "Very poor air quality - significant health risks";

  return {
    latitude: lat,
    longitude: lon,
    score,
    currentAQI: summary.currentAQI,
    category: summary.category,
    primaryPollutant: summary.primaryPollutant,
    interpretation,
  };
}

/**
 * Compare air quality between multiple locations
 */
export async function compareAirQuality(
  locations: { lat: number; lon: number; name?: string }[]
): Promise<
  {
    name: string;
    latitude: number;
    longitude: number;
    aqi: number;
    score: number;
    category: AQICategory;
    rank: number;
  }[]
> {
  const results = await Promise.all(
    locations.map(async (loc, index) => {
      const score = await getAirQualityScore(loc.lat, loc.lon);
      return {
        name: loc.name ?? `Location ${index + 1}`,
        latitude: loc.lat,
        longitude: loc.lon,
        aqi: score.currentAQI,
        score: score.score,
        category: score.category,
      };
    })
  );

  // Sort by score (higher = better) and add ranks
  return results
    .sort((a, b) => b.score - a.score)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

// ─── Health Recommendations ──────────────────────────────────────────────────

function getHealthRecommendation(category: AQICategory): string {
  switch (category) {
    case "Good":
      return "Air quality is satisfactory. Enjoy outdoor activities.";
    case "Moderate":
      return "Acceptable air quality. Unusually sensitive people should limit prolonged outdoor exertion.";
    case "Unhealthy for Sensitive Groups":
      return "People with respiratory or heart conditions, children, and older adults should limit prolonged outdoor exertion.";
    case "Unhealthy":
      return "Everyone may experience health effects. Sensitive groups should avoid prolonged outdoor exertion.";
    case "Very Unhealthy":
      return "Health alert: Everyone may experience more serious health effects. Avoid prolonged outdoor exertion.";
    case "Hazardous":
      return "Health warning of emergency conditions. Everyone should avoid all outdoor physical activity.";
    default:
      return "Air quality information unavailable.";
  }
}

// ─── AQI Interpretation ──────────────────────────────────────────────────────

export function interpretAQI(aqi: number): {
  category: AQICategory;
  color: string;
  level: "excellent" | "good" | "moderate" | "poor" | "very_poor" | "hazardous";
  description: string;
} {
  if (aqi <= 50) {
    return {
      category: "Good",
      color: "green",
      level: "excellent",
      description: "Air quality is satisfactory with little or no risk",
    };
  }
  if (aqi <= 100) {
    return {
      category: "Moderate",
      color: "yellow",
      level: "good",
      description: "Acceptable quality, may affect very sensitive individuals",
    };
  }
  if (aqi <= 150) {
    return {
      category: "Unhealthy for Sensitive Groups",
      color: "orange",
      level: "moderate",
      description: "Sensitive groups may experience health effects",
    };
  }
  if (aqi <= 200) {
    return {
      category: "Unhealthy",
      color: "red",
      level: "poor",
      description: "Everyone may begin to experience health effects",
    };
  }
  if (aqi <= 300) {
    return {
      category: "Very Unhealthy",
      color: "purple",
      level: "very_poor",
      description: "Health alert - everyone may experience serious effects",
    };
  }
  return {
    category: "Hazardous",
    color: "maroon",
    level: "hazardous",
    description: "Emergency conditions - entire population affected",
  };
}

export function interpretPollutant(pollutant: Pollutant): {
  fullName: string;
  source: string;
  healthEffects: string;
} {
  switch (pollutant) {
    case "O3":
      return {
        fullName: "Ozone",
        source: "Vehicle exhaust, industrial emissions, sunlight",
        healthEffects: "Respiratory issues, asthma triggers, lung damage",
      };
    case "PM2.5":
      return {
        fullName: "Fine Particulate Matter (PM2.5)",
        source: "Combustion, vehicle exhaust, wildfires, industrial processes",
        healthEffects: "Heart and lung disease, respiratory infections",
      };
    case "PM10":
      return {
        fullName: "Coarse Particulate Matter (PM10)",
        source: "Dust, pollen, construction, unpaved roads",
        healthEffects: "Respiratory irritation, aggravated asthma",
      };
    case "CO":
      return {
        fullName: "Carbon Monoxide",
        source: "Vehicle exhaust, fuel combustion",
        healthEffects: "Reduced oxygen delivery, cardiovascular effects",
      };
    case "NO2":
      return {
        fullName: "Nitrogen Dioxide",
        source: "Vehicle emissions, power plants",
        healthEffects: "Respiratory inflammation, reduced lung function",
      };
    case "SO2":
      return {
        fullName: "Sulfur Dioxide",
        source: "Power plants, industrial processes",
        healthEffects: "Respiratory symptoms, aggravated asthma",
      };
    default:
      return {
        fullName: pollutant,
        source: "Various sources",
        healthEffects: "May affect respiratory health",
      };
  }
}
