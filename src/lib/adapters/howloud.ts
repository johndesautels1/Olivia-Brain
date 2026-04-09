/**
 * HowLoud API Adapter
 *
 * Paid API - pay-as-you-go pricing
 * Docs: https://howloud.com/api/
 *
 * Used for: Noise pollution data for relocation quality-of-life assessment
 * Coverage: United States
 *
 * Pricing: ~$0.002 per lookup
 */

import { getServerEnv } from "@/lib/config/env";

const DEFAULT_TIMEOUT_MS = 10_000;
const HOWLOUD_API_BASE = "https://api.howloud.com/v1";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SoundscoreCategory =
  | "Very Quiet"
  | "Quiet"
  | "Moderate"
  | "Noisy"
  | "Very Noisy";

export type NoiseSourceCategory =
  | "traffic"
  | "airport"
  | "local"
  | "score";

export interface SoundscoreResult {
  soundscore: number;
  soundscoreCategory: SoundscoreCategory;
  trafficScore: number;
  airportScore: number;
  localScore: number;
  sources: NoiseSource[];
  address?: string;
  latitude: number;
  longitude: number;
}

export interface NoiseSource {
  type: string;
  name: string;
  distance: number;
  distanceUnit: "miles" | "km";
  noiseLevel: "low" | "moderate" | "high";
  direction?: string;
}

export interface BulkSoundscoreResult {
  results: SoundscoreResult[];
  failedCount: number;
}

export class HowLoudAdapterError extends Error {
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
    this.name = "HowLoudAdapterError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

// ─── Configuration ───────────────────────────────────────────────────────────

function getHowLoudConfig() {
  const env = getServerEnv();
  return {
    apiKey: env.HOWLOUD_API_KEY,
  };
}

export function isHowLoudConfigured(): boolean {
  const { apiKey } = getHowLoudConfig();
  return Boolean(apiKey);
}

function assertConfigured() {
  const { apiKey } = getHowLoudConfig();
  if (!apiKey) {
    throw new HowLoudAdapterError({
      code: "HOWLOUD_NOT_CONFIGURED",
      message: "HowLoud API key must be configured.",
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

async function requestHowLoud<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { apiKey } = assertConfigured();

  const url = new URL(`${HOWLOUD_API_BASE}${endpoint}`);

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
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new HowLoudAdapterError({
      code: "HOWLOUD_REQUEST_FAILED",
      message: `HowLoud API request failed with HTTP ${response.status}`,
      status: response.status,
      retryable: response.status >= 500 || response.status === 429,
    });
  }

  return response.json() as Promise<T>;
}

// ─── Public API Functions ────────────────────────────────────────────────────

/**
 * Get Soundscore for an address
 */
export async function getSoundscoreByAddress(
  address: string
): Promise<SoundscoreResult> {
  return requestHowLoud<SoundscoreResult>("/soundscore", {
    params: { address },
  });
}

/**
 * Get Soundscore for latitude/longitude
 */
export async function getSoundscoreByLatLon(
  lat: number,
  lon: number
): Promise<SoundscoreResult> {
  return requestHowLoud<SoundscoreResult>("/soundscore", {
    params: {
      lat,
      lon,
    },
  });
}

/**
 * Get Soundscore with all noise details
 */
export async function getDetailedSoundscore(
  lat: number,
  lon: number
): Promise<SoundscoreResult & {
  trafficDetails: NoiseSource[];
  airportDetails: NoiseSource[];
  localDetails: NoiseSource[];
}> {
  const result = await requestHowLoud<SoundscoreResult>("/soundscore/detailed", {
    params: {
      lat,
      lon,
    },
  });

  // Categorize noise sources
  const trafficDetails = result.sources.filter(
    (s) => s.type.toLowerCase().includes("road") || s.type.toLowerCase().includes("highway")
  );
  const airportDetails = result.sources.filter(
    (s) => s.type.toLowerCase().includes("airport") || s.type.toLowerCase().includes("flight")
  );
  const localDetails = result.sources.filter(
    (s) =>
      !s.type.toLowerCase().includes("road") &&
      !s.type.toLowerCase().includes("highway") &&
      !s.type.toLowerCase().includes("airport") &&
      !s.type.toLowerCase().includes("flight")
  );

  return {
    ...result,
    trafficDetails,
    airportDetails,
    localDetails,
  };
}

// ─── Convenience Functions ───────────────────────────────────────────────────

/**
 * Get noise quality score for relocation analysis (0-100, higher = quieter)
 */
export async function getNoiseScore(
  lat: number,
  lon: number
): Promise<{
  latitude: number;
  longitude: number;
  score: number;
  soundscore: number;
  category: SoundscoreCategory;
  trafficScore: number;
  airportScore: number;
  localScore: number;
  interpretation: string;
  primaryNoiseSources: string[];
}> {
  const result = await getSoundscoreByLatLon(lat, lon);

  // HowLoud's soundscore is already 0-100 (100 = quietest)
  // We'll use it directly as our score
  const score = result.soundscore;

  let interpretation: string;
  if (score >= 80) interpretation = "Very quiet area - ideal for peace and relaxation";
  else if (score >= 60) interpretation = "Quiet neighborhood - minimal noise concerns";
  else if (score >= 40) interpretation = "Moderate noise levels - typical urban area";
  else if (score >= 20) interpretation = "Noisy area - may affect quality of life";
  else interpretation = "Very noisy area - significant noise pollution";

  // Get primary noise sources
  const primaryNoiseSources = result.sources
    .filter((s) => s.noiseLevel === "high" || s.noiseLevel === "moderate")
    .slice(0, 3)
    .map((s) => `${s.name} (${s.distance} ${s.distanceUnit})`);

  return {
    latitude: lat,
    longitude: lon,
    score,
    soundscore: result.soundscore,
    category: result.soundscoreCategory,
    trafficScore: result.trafficScore,
    airportScore: result.airportScore,
    localScore: result.localScore,
    interpretation,
    primaryNoiseSources,
  };
}

/**
 * Compare noise levels between multiple locations
 */
export async function compareNoiseLocations(
  locations: { lat: number; lon: number; name?: string }[]
): Promise<
  {
    name: string;
    latitude: number;
    longitude: number;
    soundscore: number;
    category: SoundscoreCategory;
    rank: number;
    interpretation: string;
  }[]
> {
  const results = await Promise.all(
    locations.map(async (loc, index) => {
      const score = await getNoiseScore(loc.lat, loc.lon);
      return {
        name: loc.name ?? `Location ${index + 1}`,
        latitude: loc.lat,
        longitude: loc.lon,
        soundscore: score.soundscore,
        category: score.category,
        interpretation: score.interpretation,
      };
    })
  );

  // Sort by soundscore (higher = quieter = better) and add ranks
  return results
    .sort((a, b) => b.soundscore - a.soundscore)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

/**
 * Check if location is suitable for noise-sensitive residents
 */
export async function isNoiseAcceptable(
  lat: number,
  lon: number,
  sensitivity: "low" | "medium" | "high" = "medium"
): Promise<{
  acceptable: boolean;
  soundscore: number;
  category: SoundscoreCategory;
  concerns: string[];
  recommendation: string;
}> {
  const result = await getSoundscoreByLatLon(lat, lon);

  // Thresholds based on sensitivity
  const thresholds = {
    low: 30,
    medium: 50,
    high: 70,
  };

  const threshold = thresholds[sensitivity];
  const acceptable = result.soundscore >= threshold;

  const concerns: string[] = [];

  if (result.trafficScore < 50) {
    concerns.push("High traffic noise exposure");
  }
  if (result.airportScore < 50) {
    concerns.push("Airport flight path noise");
  }
  if (result.localScore < 50) {
    concerns.push("Local noise sources (businesses, bars, etc.)");
  }

  let recommendation: string;
  if (acceptable) {
    if (concerns.length === 0) {
      recommendation = "Location meets noise requirements with no significant concerns.";
    } else {
      recommendation = `Location meets minimum requirements but has some noise concerns: ${concerns.join(", ")}.`;
    }
  } else {
    recommendation = `Location does not meet noise requirements for ${sensitivity} sensitivity. Consider locations with soundscore above ${threshold}.`;
  }

  return {
    acceptable,
    soundscore: result.soundscore,
    category: result.soundscoreCategory,
    concerns,
    recommendation,
  };
}

// ─── Soundscore Interpretation ───────────────────────────────────────────────

export function interpretSoundscore(soundscore: number): {
  category: SoundscoreCategory;
  color: string;
  level: "excellent" | "good" | "moderate" | "poor" | "very_poor";
  description: string;
  typicalEnvironment: string;
} {
  if (soundscore >= 80) {
    return {
      category: "Very Quiet",
      color: "green",
      level: "excellent",
      description: "Exceptionally quiet area",
      typicalEnvironment: "Rural areas, quiet suburbs, nature preserves",
    };
  }
  if (soundscore >= 60) {
    return {
      category: "Quiet",
      color: "lightgreen",
      level: "good",
      description: "Peaceful with minimal noise intrusion",
      typicalEnvironment: "Residential suburbs, quiet neighborhoods",
    };
  }
  if (soundscore >= 40) {
    return {
      category: "Moderate",
      color: "yellow",
      level: "moderate",
      description: "Average noise levels, some activity",
      typicalEnvironment: "Mixed residential/commercial, near main roads",
    };
  }
  if (soundscore >= 20) {
    return {
      category: "Noisy",
      color: "orange",
      level: "poor",
      description: "Noticeable noise from multiple sources",
      typicalEnvironment: "Urban areas, near highways, commercial districts",
    };
  }
  return {
    category: "Very Noisy",
    color: "red",
    level: "very_poor",
    description: "Significant noise pollution",
    typicalEnvironment: "Downtown, near airports, industrial areas",
  };
}

export function interpretSubscore(score: number, type: NoiseSourceCategory): {
  level: "low" | "moderate" | "high";
  description: string;
} {
  const descriptions: Record<NoiseSourceCategory, Record<string, string>> = {
    traffic: {
      high: "Low traffic noise - away from busy roads",
      moderate: "Some traffic noise - near moderate traffic",
      low: "High traffic noise - near highways or busy streets",
    },
    airport: {
      high: "No airport noise impact",
      moderate: "Occasional aircraft noise",
      low: "Frequent aircraft noise - under flight path",
    },
    local: {
      high: "No local noise sources nearby",
      moderate: "Some local noise (businesses, etc.)",
      low: "Multiple local noise sources (bars, venues, etc.)",
    },
    score: {
      high: "Excellent overall noise environment",
      moderate: "Average noise environment",
      low: "Poor noise environment",
    },
  };

  let level: "low" | "moderate" | "high";
  if (score >= 70) level = "high";
  else if (score >= 40) level = "moderate";
  else level = "low";

  return {
    level,
    description: descriptions[type][level],
  };
}
