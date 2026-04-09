/**
 * Travel Buddy AI Visa Requirements API Adapter
 *
 * Free tier: 120-200 requests/month
 * Paid tiers: Starting at $4.99/month for 3,000 requests
 * Docs: https://travel-buddy.ai/api/
 *
 * Used for: Visa requirements lookup for relocation planning
 * Coverage: 210 countries
 */

import { getServerEnv } from "@/lib/config/env";

const DEFAULT_TIMEOUT_MS = 10_000;
const TRAVEL_BUDDY_API_BASE = "https://travel-buddy.ai/api/v2";

// ─── Types ───────────────────────────────────────────────────────────────────

export type VisaStatus =
  | "visa_free"
  | "visa_on_arrival"
  | "evisa"
  | "eta"
  | "visa_required"
  | "restricted"
  | "unknown";

export type VisaColor =
  | "green"   // Visa-free
  | "blue"    // Visa on arrival / eTA
  | "yellow"  // eVisa available
  | "red";    // Visa required

export interface VisaCheckRequest {
  passport: string;     // ISO 3166-1 alpha-2 country code
  destination: string;  // ISO 3166-1 alpha-2 country code
}

export interface VisaCheckResponse {
  data: {
    passport: CountryInfo;
    destination: CountryInfo;
    visa: VisaRequirement;
    entry: EntryRequirements;
    registration?: RegistrationRequirements;
    links: OfficialLinks;
  };
  meta: {
    version: string;
    language: string;
    generated_at: string;
  };
}

export interface CountryInfo {
  code: string;
  name: string;
  region?: string;
}

export interface VisaRequirement {
  status: VisaStatus;
  color: VisaColor;
  primary_rule: string;
  secondary_rule?: string;
  exception_rule?: string;
  stay_duration?: {
    days: number;
    period?: string;  // e.g., "per 180 days"
  };
  validity?: {
    days: number;
    type?: string;  // e.g., "single entry", "multiple entry"
  };
  notes?: string[];
}

export interface EntryRequirements {
  passport_validity: {
    months: number;
    from: "entry" | "exit" | "visa_application";
  };
  blank_pages?: number;
  proof_of_funds?: boolean;
  return_ticket?: boolean;
  accommodation_proof?: boolean;
  covid_requirements?: string;
  additional?: string[];
}

export interface RegistrationRequirements {
  required: boolean;
  deadline_days?: number;
  authority?: string;
  notes?: string;
}

export interface OfficialLinks {
  embassy?: string;
  evisa_portal?: string;
  immigration?: string;
  government?: string;
}

export interface MapColorsRequest {
  passport: string;
}

export interface MapColorsResponse {
  data: {
    passport: CountryInfo;
    destinations: {
      green: string[];   // Visa-free countries
      blue: string[];    // Visa on arrival / eTA
      yellow: string[];  // eVisa available
      red: string[];     // Visa required
    };
    summary: {
      visa_free_count: number;
      total_countries: number;
      mobility_score: number;
    };
  };
  meta: {
    version: string;
    language: string;
    generated_at: string;
  };
}

export interface PassportRankRequest {
  weights?: {
    visa_free?: number;
    visa_on_arrival?: number;
    evisa?: number;
  };
  top?: number;
}

export interface PassportRankResponse {
  data: {
    rankings: {
      rank: number;
      passport: CountryInfo;
      scores: {
        visa_free: number;
        visa_on_arrival: number;
        evisa: number;
        total: number;
        weighted: number;
      };
    }[];
  };
  meta: {
    version: string;
    language: string;
    generated_at: string;
  };
}

export class TravelBuddyAdapterError extends Error {
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
    this.name = "TravelBuddyAdapterError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

// ─── Configuration ───────────────────────────────────────────────────────────

function getTravelBuddyConfig() {
  const env = getServerEnv();
  return {
    apiKey: env.TRAVEL_BUDDY_API_KEY,
  };
}

export function isTravelBuddyConfigured(): boolean {
  const { apiKey } = getTravelBuddyConfig();
  return Boolean(apiKey);
}

function assertConfigured() {
  const { apiKey } = getTravelBuddyConfig();
  if (!apiKey) {
    throw new TravelBuddyAdapterError({
      code: "TRAVEL_BUDDY_NOT_CONFIGURED",
      message: "Travel Buddy API key must be configured.",
      status: 503,
    });
  }
  return { apiKey };
}

// ─── Core Request Function ───────────────────────────────────────────────────

interface RequestOptions {
  body?: unknown;
  timeoutMs?: number;
}

async function requestTravelBuddy<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { apiKey } = assertConfigured();

  const url = `${TRAVEL_BUDDY_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-RapidAPI-Proxy-Secret": apiKey,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  });

  const payload = await response.json();

  if (!response.ok) {
    const errorMessage = payload?.error?.message || payload?.message || `Travel Buddy API request failed with HTTP ${response.status}`;

    throw new TravelBuddyAdapterError({
      code: "TRAVEL_BUDDY_REQUEST_FAILED",
      message: errorMessage,
      status: response.status,
      retryable: response.status >= 500 || response.status === 429,
    });
  }

  return payload as T;
}

// ─── Public API Functions ────────────────────────────────────────────────────

/**
 * Check visa requirements for a specific passport/destination combination
 */
export async function checkVisaRequirements(
  passportCountry: string,
  destinationCountry: string
): Promise<VisaCheckResponse> {
  return requestTravelBuddy<VisaCheckResponse>("/visa/check", {
    body: {
      passport: passportCountry.toUpperCase(),
      destination: destinationCountry.toUpperCase(),
    },
  });
}

/**
 * Get visa-free map colors for a passport
 * Returns all 210 destinations grouped by visa requirement color
 */
export async function getVisaMapColors(
  passportCountry: string
): Promise<MapColorsResponse> {
  return requestTravelBuddy<MapColorsResponse>("/visa/map", {
    body: {
      passport: passportCountry.toUpperCase(),
    },
  });
}

/**
 * Get passport rankings with custom weights
 */
export async function getPassportRankings(
  options?: PassportRankRequest
): Promise<PassportRankResponse> {
  return requestTravelBuddy<PassportRankResponse>("/passport/rank/custom", {
    body: {
      weights: options?.weights ?? {
        visa_free: 1,
        visa_on_arrival: 0.7,
        evisa: 0.5,
      },
      top: options?.top ?? 50,
    },
  });
}

// ─── Convenience Functions ───────────────────────────────────────────────────

/**
 * Check if visa is required for travel
 */
export async function isVisaRequired(
  passportCountry: string,
  destinationCountry: string
): Promise<{
  required: boolean;
  status: VisaStatus;
  stayDays?: number;
  notes?: string[];
}> {
  const result = await checkVisaRequirements(passportCountry, destinationCountry);
  const visa = result.data.visa;

  return {
    required: visa.status === "visa_required" || visa.status === "restricted",
    status: visa.status,
    stayDays: visa.stay_duration?.days,
    notes: visa.notes,
  };
}

/**
 * Get visa-free destinations for a passport
 */
export async function getVisaFreeDestinations(
  passportCountry: string
): Promise<{
  visaFree: string[];
  visaOnArrival: string[];
  eVisa: string[];
  mobilityScore: number;
}> {
  const result = await getVisaMapColors(passportCountry);
  const destinations = result.data.destinations;

  return {
    visaFree: destinations.green,
    visaOnArrival: destinations.blue,
    eVisa: destinations.yellow,
    mobilityScore: result.data.summary.mobility_score,
  };
}

/**
 * Compare visa access between two passports
 */
export async function comparePassports(
  passport1: string,
  passport2: string
): Promise<{
  passport1: {
    code: string;
    visaFreeCount: number;
    mobilityScore: number;
  };
  passport2: {
    code: string;
    visaFreeCount: number;
    mobilityScore: number;
  };
  passport1Only: string[];
  passport2Only: string[];
  both: string[];
}> {
  const [result1, result2] = await Promise.all([
    getVisaMapColors(passport1),
    getVisaMapColors(passport2),
  ]);

  const visaFree1 = new Set(result1.data.destinations.green);
  const visaFree2 = new Set(result2.data.destinations.green);

  const passport1Only = [...visaFree1].filter(c => !visaFree2.has(c));
  const passport2Only = [...visaFree2].filter(c => !visaFree1.has(c));
  const both = [...visaFree1].filter(c => visaFree2.has(c));

  return {
    passport1: {
      code: passport1.toUpperCase(),
      visaFreeCount: result1.data.summary.visa_free_count,
      mobilityScore: result1.data.summary.mobility_score,
    },
    passport2: {
      code: passport2.toUpperCase(),
      visaFreeCount: result2.data.summary.visa_free_count,
      mobilityScore: result2.data.summary.mobility_score,
    },
    passport1Only,
    passport2Only,
    both,
  };
}

// ─── Visa Status Interpretation ──────────────────────────────────────────────

export function interpretVisaStatus(status: VisaStatus): {
  emoji: string;
  label: string;
  description: string;
  actionRequired: boolean;
} {
  switch (status) {
    case "visa_free":
      return {
        emoji: "✅",
        label: "Visa Free",
        description: "No visa required for entry",
        actionRequired: false,
      };
    case "visa_on_arrival":
      return {
        emoji: "🛬",
        label: "Visa on Arrival",
        description: "Visa can be obtained upon arrival at the airport",
        actionRequired: false,
      };
    case "eta":
      return {
        emoji: "📱",
        label: "Electronic Travel Authorization",
        description: "Simple online authorization required before travel",
        actionRequired: true,
      };
    case "evisa":
      return {
        emoji: "💻",
        label: "e-Visa",
        description: "Electronic visa application required before travel",
        actionRequired: true,
      };
    case "visa_required":
      return {
        emoji: "📋",
        label: "Visa Required",
        description: "Must apply for visa at embassy/consulate before travel",
        actionRequired: true,
      };
    case "restricted":
      return {
        emoji: "🚫",
        label: "Restricted",
        description: "Travel may not be permitted or severely restricted",
        actionRequired: true,
      };
    default:
      return {
        emoji: "❓",
        label: "Unknown",
        description: "Visa requirements unknown - check official sources",
        actionRequired: true,
      };
  }
}

// ─── Common Country Codes ────────────────────────────────────────────────────

export const COMMON_PASSPORT_CODES = {
  US: "United States",
  GB: "United Kingdom",
  CA: "Canada",
  AU: "Australia",
  NZ: "New Zealand",
  DE: "Germany",
  FR: "France",
  IT: "Italy",
  ES: "Spain",
  JP: "Japan",
  KR: "South Korea",
  SG: "Singapore",
  AE: "United Arab Emirates",
  BR: "Brazil",
  MX: "Mexico",
  IN: "India",
  CN: "China",
  ZA: "South Africa",
} as const;

export const POPULAR_DESTINATIONS = {
  // Europe
  PT: "Portugal",
  ES: "Spain",
  IT: "Italy",
  FR: "France",
  GR: "Greece",
  HR: "Croatia",
  // Americas
  MX: "Mexico",
  CR: "Costa Rica",
  CO: "Colombia",
  // Asia
  TH: "Thailand",
  VN: "Vietnam",
  ID: "Indonesia",
  MY: "Malaysia",
  PH: "Philippines",
  // Middle East
  AE: "UAE",
  // Africa
  ZA: "South Africa",
  MA: "Morocco",
} as const;
