/**
 * WalkScore API Adapter
 *
 * Free tier: 5,000 calls/day for consumer-facing apps
 * Docs: https://www.walkscore.com/professional/api.php
 *
 * Used for: Walkability, transit, and bike scores for locations
 * Coverage: United States and Canada
 */

import { getServerEnv } from "@/lib/config/env";

const DEFAULT_TIMEOUT_MS = 10_000;
const WALKSCORE_API_BASE = "https://api.walkscore.com";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WalkScoreRequest {
  lat: number;
  lon: number;
  address?: string;
  transit?: boolean;  // Include Transit Score (requires premium)
  bike?: boolean;     // Include Bike Score (requires premium)
}

export interface WalkScoreResponse {
  status: number;
  walkscore: number;
  description: string;
  updated: string;
  logo_url: string;
  more_info_icon: string;
  more_info_link: string;
  ws_link: string;
  help_link: string;
  snapped_lat: number;
  snapped_lon: number;
  transit?: TransitScore;
  bike?: BikeScore;
}

export interface TransitScore {
  score: number;
  description: string;
  summary: string;
}

export interface BikeScore {
  score: number;
  description: string;
}

export interface WalkScoreError {
  status: number;
  message: string;
}

// Status codes from WalkScore API
export const WALKSCORE_STATUS = {
  1: "Walk Score successfully returned",
  2: "Score is being calculated and is not currently available",
  30: "Invalid latitude/longitude",
  31: "Walk Score API internal error",
  40: "Your WSAPIKEY is invalid",
  41: "Your daily API quota has been exceeded",
  42: "Your IP address has been blocked",
} as const;

export class WalkScoreAdapterError extends Error {
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
    this.name = "WalkScoreAdapterError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

// ─── Configuration ───────────────────────────────────────────────────────────

function getWalkScoreConfig() {
  const env = getServerEnv();
  return {
    apiKey: env.WALKSCORE_API_KEY,
  };
}

export function isWalkScoreConfigured(): boolean {
  const { apiKey } = getWalkScoreConfig();
  return Boolean(apiKey);
}

function assertConfigured() {
  const { apiKey } = getWalkScoreConfig();
  if (!apiKey) {
    throw new WalkScoreAdapterError({
      code: "WALKSCORE_NOT_CONFIGURED",
      message: "WalkScore API key must be configured.",
      status: 503,
    });
  }
  return { apiKey };
}

// ─── Core Request Function ───────────────────────────────────────────────────

async function requestWalkScore(
  request: WalkScoreRequest,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<WalkScoreResponse> {
  const { apiKey } = assertConfigured();

  const params = new URLSearchParams({
    format: "json",
    wsapikey: apiKey,
    lat: request.lat.toString(),
    lon: request.lon.toString(),
  });

  if (request.address) {
    params.set("address", request.address);
  }

  if (request.transit) {
    params.set("transit", "1");
  }

  if (request.bike) {
    params.set("bike", "1");
  }

  const url = `${WALKSCORE_API_BASE}/score?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new WalkScoreAdapterError({
      code: "WALKSCORE_HTTP_ERROR",
      message: `WalkScore API request failed with HTTP ${response.status}`,
      status: response.status,
      retryable: response.status >= 500,
    });
  }

  const payload = await response.json() as WalkScoreResponse;

  // Check WalkScore-specific status codes
  if (payload.status !== 1) {
    const statusMessage = WALKSCORE_STATUS[payload.status as keyof typeof WALKSCORE_STATUS] || "Unknown error";

    throw new WalkScoreAdapterError({
      code: `WALKSCORE_STATUS_${payload.status}`,
      message: statusMessage,
      status: payload.status,
      retryable: payload.status === 2 || payload.status === 31, // Score calculating or internal error
    });
  }

  return payload;
}

// ─── Public API Functions ────────────────────────────────────────────────────

/**
 * Get Walk Score for a location
 * Free tier: 5,000 calls/day
 */
export async function getWalkScore(
  lat: number,
  lon: number,
  address?: string
): Promise<WalkScoreResponse> {
  return requestWalkScore({ lat, lon, address });
}

/**
 * Get Walk Score, Transit Score, and Bike Score for a location
 * Note: Transit and Bike scores may require premium API access
 */
export async function getFullScores(
  lat: number,
  lon: number,
  address?: string
): Promise<WalkScoreResponse> {
  return requestWalkScore({
    lat,
    lon,
    address,
    transit: true,
    bike: true,
  });
}

// ─── Score Interpretation ────────────────────────────────────────────────────

export type WalkScoreCategory =
  | "walker_paradise"
  | "very_walkable"
  | "somewhat_walkable"
  | "car_dependent"
  | "almost_all_errands_require_car";

export function interpretWalkScore(score: number): {
  category: WalkScoreCategory;
  description: string;
  emoji: string;
} {
  if (score >= 90) {
    return {
      category: "walker_paradise",
      description: "Daily errands do not require a car",
      emoji: "🚶‍♂️",
    };
  }
  if (score >= 70) {
    return {
      category: "very_walkable",
      description: "Most errands can be accomplished on foot",
      emoji: "👟",
    };
  }
  if (score >= 50) {
    return {
      category: "somewhat_walkable",
      description: "Some errands can be accomplished on foot",
      emoji: "🚗",
    };
  }
  if (score >= 25) {
    return {
      category: "car_dependent",
      description: "Most errands require a car",
      emoji: "🚙",
    };
  }
  return {
    category: "almost_all_errands_require_car",
    description: "Almost all errands require a car",
    emoji: "🛻",
  };
}

export function interpretTransitScore(score: number): {
  description: string;
  emoji: string;
} {
  if (score >= 90) {
    return { description: "Excellent Transit", emoji: "🚇" };
  }
  if (score >= 70) {
    return { description: "Excellent Transit", emoji: "🚌" };
  }
  if (score >= 50) {
    return { description: "Good Transit", emoji: "🚍" };
  }
  if (score >= 25) {
    return { description: "Some Transit", emoji: "🚏" };
  }
  return { description: "Minimal Transit", emoji: "🚶" };
}

export function interpretBikeScore(score: number): {
  description: string;
  emoji: string;
} {
  if (score >= 90) {
    return { description: "Biker's Paradise", emoji: "🚴" };
  }
  if (score >= 70) {
    return { description: "Very Bikeable", emoji: "🚲" };
  }
  if (score >= 50) {
    return { description: "Bikeable", emoji: "🚲" };
  }
  return { description: "Minimal Bike Infrastructure", emoji: "🚗" };
}

// ─── Convenience Functions ───────────────────────────────────────────────────

/**
 * Get a comprehensive walkability summary for a location
 */
export async function getWalkabilitySummary(
  lat: number,
  lon: number,
  address?: string
): Promise<{
  walkScore: number;
  walkCategory: WalkScoreCategory;
  walkDescription: string;
  transitScore?: number;
  transitDescription?: string;
  bikeScore?: number;
  bikeDescription?: string;
  link: string;
}> {
  const response = await getFullScores(lat, lon, address);
  const walkInterp = interpretWalkScore(response.walkscore);

  const result: {
    walkScore: number;
    walkCategory: WalkScoreCategory;
    walkDescription: string;
    transitScore?: number;
    transitDescription?: string;
    bikeScore?: number;
    bikeDescription?: string;
    link: string;
  } = {
    walkScore: response.walkscore,
    walkCategory: walkInterp.category,
    walkDescription: walkInterp.description,
    link: response.ws_link,
  };

  if (response.transit) {
    result.transitScore = response.transit.score;
    result.transitDescription = response.transit.description;
  }

  if (response.bike) {
    result.bikeScore = response.bike.score;
    result.bikeDescription = response.bike.description;
  }

  return result;
}
