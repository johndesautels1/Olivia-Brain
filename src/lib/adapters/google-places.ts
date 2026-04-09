/**
 * Google Places API Adapter
 *
 * Pay-as-you-go pricing with free tier (10,000 requests/month for Essentials SKUs)
 * Docs: https://developers.google.com/maps/documentation/places/web-service
 *
 * Used for: Local amenities, points of interest, place details
 */

import { getServerEnv } from "@/lib/config/env";

const DEFAULT_TIMEOUT_MS = 10_000;
const PLACES_API_BASE = "https://places.googleapis.com/v1";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PlaceLocation {
  latitude: number;
  longitude: number;
}

export interface PlaceCircle {
  center: PlaceLocation;
  radius: number; // meters, max 50000
}

export interface PlaceSearchRequest {
  textQuery?: string;
  includedType?: string;
  locationBias?: {
    circle: PlaceCircle;
  };
  locationRestriction?: {
    circle: PlaceCircle;
  };
  maxResultCount?: number; // 1-20
  languageCode?: string;
  regionCode?: string;
}

export interface PlaceNearbyRequest {
  locationRestriction: {
    circle: PlaceCircle;
  };
  includedTypes?: string[];
  excludedTypes?: string[];
  maxResultCount?: number;
  languageCode?: string;
  regionCode?: string;
}

export interface PlaceResult {
  id: string;
  displayName?: {
    text: string;
    languageCode: string;
  };
  formattedAddress?: string;
  location?: PlaceLocation;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: 'PRICE_LEVEL_FREE' | 'PRICE_LEVEL_INEXPENSIVE' | 'PRICE_LEVEL_MODERATE' | 'PRICE_LEVEL_EXPENSIVE' | 'PRICE_LEVEL_VERY_EXPENSIVE';
  types?: string[];
  primaryType?: string;
  primaryTypeDisplayName?: {
    text: string;
    languageCode: string;
  };
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  regularOpeningHours?: {
    openNow?: boolean;
    weekdayDescriptions?: string[];
  };
  businessStatus?: 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';
  editorialSummary?: {
    text: string;
    languageCode: string;
  };
}

export interface PlaceSearchResponse {
  places: PlaceResult[];
  nextPageToken?: string;
}

export interface PlaceDetailsResponse extends PlaceResult {
  reviews?: {
    name: string;
    relativePublishTimeDescription: string;
    rating: number;
    text: {
      text: string;
      languageCode: string;
    };
    authorAttribution: {
      displayName: string;
      uri: string;
      photoUri: string;
    };
  }[];
  photos?: {
    name: string;
    widthPx: number;
    heightPx: number;
    authorAttributions: {
      displayName: string;
      uri: string;
      photoUri: string;
    }[];
  }[];
}

export class GooglePlacesAdapterError extends Error {
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
    this.name = "GooglePlacesAdapterError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

// ─── Configuration ───────────────────────────────────────────────────────────

function getGooglePlacesConfig() {
  const env = getServerEnv();
  return {
    apiKey: env.GOOGLE_PLACES_API_KEY,
  };
}

export function isGooglePlacesConfigured(): boolean {
  const { apiKey } = getGooglePlacesConfig();
  return Boolean(apiKey);
}

function assertConfigured() {
  const { apiKey } = getGooglePlacesConfig();
  if (!apiKey) {
    throw new GooglePlacesAdapterError({
      code: "GOOGLE_PLACES_NOT_CONFIGURED",
      message: "Google Places API key must be configured.",
      status: 503,
    });
  }
  return { apiKey };
}

// ─── Field Masks (controls billing - only request what you need) ─────────────

const BASIC_FIELDS = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.types",
  "places.primaryType",
  "places.businessStatus",
].join(",");

const STANDARD_FIELDS = [
  ...BASIC_FIELDS.split(","),
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.regularOpeningHours",
  "places.websiteUri",
  "places.nationalPhoneNumber",
].join(",");

const DETAILS_FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "types",
  "primaryType",
  "primaryTypeDisplayName",
  "businessStatus",
  "rating",
  "userRatingCount",
  "priceLevel",
  "regularOpeningHours",
  "websiteUri",
  "nationalPhoneNumber",
  "internationalPhoneNumber",
  "editorialSummary",
  "reviews",
  "photos",
].join(",");

// ─── Core Request Function ───────────────────────────────────────────────────

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  fieldMask?: string;
  timeoutMs?: number;
}

async function requestGooglePlaces<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { apiKey } = assertConfigured();

  const url = `${PLACES_API_BASE}${endpoint}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": apiKey,
  };

  if (options.fieldMask) {
    headers["X-Goog-FieldMask"] = options.fieldMask;
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  });

  const payload = await response.json();

  if (!response.ok) {
    const errorMessage = payload?.error?.message || `Google Places API request failed with HTTP ${response.status}`;
    const errorCode = payload?.error?.status || "GOOGLE_PLACES_REQUEST_FAILED";

    throw new GooglePlacesAdapterError({
      code: errorCode,
      message: errorMessage,
      status: response.status,
      retryable: response.status >= 500 || response.status === 429,
    });
  }

  return payload as T;
}

// ─── Public API Functions ────────────────────────────────────────────────────

/**
 * Text Search - search for places using a text query
 * Uses Essentials SKU pricing ($2.83 per 1000 for IDs only, more for details)
 */
export async function searchPlaces(
  request: PlaceSearchRequest,
  options: { includeDetails?: boolean } = {}
): Promise<PlaceSearchResponse> {
  return requestGooglePlaces<PlaceSearchResponse>("/places:searchText", {
    method: "POST",
    body: request,
    fieldMask: options.includeDetails ? STANDARD_FIELDS : BASIC_FIELDS,
  });
}

/**
 * Nearby Search - find places near a location
 * Uses Essentials SKU pricing
 */
export async function searchNearbyPlaces(
  request: PlaceNearbyRequest,
  options: { includeDetails?: boolean } = {}
): Promise<PlaceSearchResponse> {
  return requestGooglePlaces<PlaceSearchResponse>("/places:searchNearby", {
    method: "POST",
    body: request,
    fieldMask: options.includeDetails ? STANDARD_FIELDS : BASIC_FIELDS,
  });
}

/**
 * Get Place Details - get detailed info about a specific place
 * Uses higher-tier SKU pricing based on fields requested
 */
export async function getPlaceDetails(
  placeId: string,
  options: { fields?: string } = {}
): Promise<PlaceDetailsResponse> {
  return requestGooglePlaces<PlaceDetailsResponse>(`/places/${placeId}`, {
    method: "GET",
    fieldMask: options.fields ?? DETAILS_FIELDS,
  });
}

// ─── Convenience Functions ───────────────────────────────────────────────────

/**
 * Find restaurants near a location
 */
export async function findNearbyRestaurants(
  lat: number,
  lng: number,
  radiusMeters: number = 1500,
  maxResults: number = 10
): Promise<PlaceResult[]> {
  const response = await searchNearbyPlaces({
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: radiusMeters,
      },
    },
    includedTypes: ["restaurant", "cafe", "bar"],
    maxResultCount: maxResults,
  }, { includeDetails: true });

  return response.places || [];
}

/**
 * Find grocery stores near a location
 */
export async function findNearbyGroceryStores(
  lat: number,
  lng: number,
  radiusMeters: number = 2000,
  maxResults: number = 10
): Promise<PlaceResult[]> {
  const response = await searchNearbyPlaces({
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: radiusMeters,
      },
    },
    includedTypes: ["grocery_store", "supermarket"],
    maxResultCount: maxResults,
  }, { includeDetails: true });

  return response.places || [];
}

/**
 * Find healthcare facilities near a location
 */
export async function findNearbyHealthcare(
  lat: number,
  lng: number,
  radiusMeters: number = 5000,
  maxResults: number = 10
): Promise<PlaceResult[]> {
  const response = await searchNearbyPlaces({
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: radiusMeters,
      },
    },
    includedTypes: ["hospital", "doctor", "pharmacy", "dentist"],
    maxResultCount: maxResults,
  }, { includeDetails: true });

  return response.places || [];
}

/**
 * Find gyms and fitness centers near a location
 */
export async function findNearbyFitness(
  lat: number,
  lng: number,
  radiusMeters: number = 2000,
  maxResults: number = 10
): Promise<PlaceResult[]> {
  const response = await searchNearbyPlaces({
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: radiusMeters,
      },
    },
    includedTypes: ["gym", "fitness_center"],
    maxResultCount: maxResults,
  }, { includeDetails: true });

  return response.places || [];
}

/**
 * Search for any type of place by text query
 */
export async function findPlacesByQuery(
  query: string,
  lat?: number,
  lng?: number,
  radiusMeters: number = 10000,
  maxResults: number = 10
): Promise<PlaceResult[]> {
  const request: PlaceSearchRequest = {
    textQuery: query,
    maxResultCount: maxResults,
  };

  if (lat !== undefined && lng !== undefined) {
    request.locationBias = {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: radiusMeters,
      },
    };
  }

  const response = await searchPlaces(request, { includeDetails: true });
  return response.places || [];
}
