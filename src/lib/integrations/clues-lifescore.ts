/**
 * CLUES LifeScore — Platform Adapter
 *
 * Sprint 4.6 Item 3 — HTTP client adapter for clueslifescore.com.
 * Holistic life scoring platform for relocation decisions — aggregate scores,
 * per-module breakdowns, city comparisons, recommendations, and assessments.
 *
 * Item 4 (20 LifeScore Module Apps) builds on top of this core adapter
 * with individual module-level endpoints.
 *
 * Env vars: CLUES_LIFESCORE_BASE_URL + CLUES_LIFESCORE_INTERNAL_API_KEY
 * (matches registry.ts naming convention).
 */

import { randomUUID } from "crypto";

import { getServerEnv } from "@/lib/config/env";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Health check response */
export interface LifeScoreHealthSnapshot {
  ok: boolean;
  service: string;
  version: string;
  caller?: string;
  capabilities: string[];
}

/** User's LifeScore profile */
export interface LifeScoreUserProfile {
  userId: string;
  name?: string;
  email?: string;
  status: "new" | "onboarding" | "active" | "complete" | "archived";
  modulesCompleted: number;
  modulesTotal: number;
  overallProgress: number;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

/** Aggregate LifeScore for a user */
export interface LifeScoreOverall {
  userId: string;
  overallScore: number;
  confidence: number;
  marginOfError: number;
  tier: "red" | "orange" | "yellow" | "blue" | "green";
  modulesScored: number;
  modulesTotal: number;
  lastCalculatedAt: string;
  breakdown: LifeScoreDimensionScore[];
}

/** Score for a single dimension/category */
export interface LifeScoreDimensionScore {
  dimensionId: string;
  dimensionName: string;
  score: number;
  weight: number;
  weightedScore: number;
  tier: "red" | "orange" | "yellow" | "blue" | "green";
}

/** Per-module score entry */
export interface LifeScoreModuleScore {
  moduleId: string;
  moduleName: string;
  category: string;
  score: number;
  confidence: number;
  questionsAnswered: number;
  questionsTotal: number;
  isComplete: boolean;
  tier: "red" | "orange" | "yellow" | "blue" | "green";
  lastUpdatedAt: string;
}

/** Per-module scores response */
export interface LifeScoreModuleScoresResponse {
  userId: string;
  modules: LifeScoreModuleScore[];
  completedCount: number;
  totalCount: number;
}

/** City LifeScore profile */
export interface LifeScoreCityProfile {
  cityId: string;
  cityName: string;
  state?: string;
  country: string;
  overallScore: number;
  tier: "red" | "orange" | "yellow" | "blue" | "green";
  population?: number;
  costOfLivingIndex?: number;
  dimensions: LifeScoreCityDimension[];
  highlights: string[];
  concerns: string[];
  lastUpdatedAt: string;
}

/** City dimension score */
export interface LifeScoreCityDimension {
  dimensionId: string;
  dimensionName: string;
  score: number;
  tier: "red" | "orange" | "yellow" | "blue" | "green";
  dataPoints: number;
  sources: string[];
}

/** City search query */
export interface LifeScoreCitySearchQuery {
  q?: string;
  country?: string;
  state?: string;
  minScore?: number;
  maxScore?: number;
  sortBy?: "name" | "score" | "population" | "cost" | "updated";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

/** City comparison request */
export interface LifeScoreCityComparisonRequest {
  cityIds: string[];
  dimensions?: string[];
  includeUserWeights?: boolean;
}

/** City comparison response */
export interface LifeScoreCityComparison {
  userId: string;
  cities: LifeScoreCityComparisonEntry[];
  winner?: string;
  winnerCityId?: string;
  summary: string;
  comparedAt: string;
}

export interface LifeScoreCityComparisonEntry {
  cityId: string;
  cityName: string;
  overallScore: number;
  userWeightedScore?: number;
  tier: "red" | "orange" | "yellow" | "blue" | "green";
  dimensions: LifeScoreCityDimension[];
  rank: number;
  pros: string[];
  cons: string[];
}

/** Recommendation for a user */
export interface LifeScoreRecommendation {
  id: string;
  cityId: string;
  cityName: string;
  overallScore: number;
  userWeightedScore: number;
  rank: number;
  matchPercentage: number;
  reasons: string[];
  warnings: string[];
  tier: "red" | "orange" | "yellow" | "blue" | "green";
}

/** Recommendations response */
export interface LifeScoreRecommendationsResponse {
  userId: string;
  recommendations: LifeScoreRecommendation[];
  basedOnModules: number;
  confidence: number;
  generatedAt: string;
}

/** Assessment submission */
export interface LifeScoreAssessmentSubmission {
  moduleId: string;
  answers: Record<string, unknown>;
}

/** Assessment submission result */
export interface LifeScoreAssessmentResult {
  success: boolean;
  userId: string;
  moduleId: string;
  answersAccepted: number;
  answersRejected: number;
  errors?: string[];
  moduleScore?: number;
  overallScoreImpact?: number;
  progress: {
    moduleProgress: number;
    overallProgress: number;
  };
}

/** Paginated list wrapper */
export interface LifeScorePaginatedList<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/** Error response payload */
export interface LifeScoreErrorPayload {
  error: {
    code: string;
    message: string;
    retryable?: boolean;
    details?: string[];
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_TIMEOUT_MS = 15_000;
const OLIVIA_APP_ID = "olivia-brain";

const ENDPOINTS = {
  health: "/api/internal/olivia/health",
  users: "/api/internal/olivia/users",
  compare: "/api/internal/olivia/compare",
  cities: "/api/internal/olivia/cities",
} as const;

function getUserEndpoint(userId: string) {
  return `${ENDPOINTS.users}/${encodeURIComponent(userId)}`;
}

function getUserScoreEndpoint(userId: string) {
  return `${getUserEndpoint(userId)}/score`;
}

function getUserModulesEndpoint(userId: string) {
  return `${getUserEndpoint(userId)}/modules`;
}

function getUserRecommendationsEndpoint(userId: string) {
  return `${getUserEndpoint(userId)}/recommendations`;
}

function getUserAssessmentEndpoint(userId: string) {
  return `${getUserEndpoint(userId)}/assessment`;
}

function getCityEndpoint(cityId: string) {
  return `${ENDPOINTS.cities}/${encodeURIComponent(cityId)}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class LifeScoreAdapterError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryable: boolean;
  readonly details: string[];

  constructor({
    code,
    message,
    status,
    retryable = false,
    details = [],
  }: {
    code: string;
    message: string;
    status: number;
    retryable?: boolean;
    details?: string[];
  }) {
    super(message);
    this.name = "LifeScoreAdapterError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
    this.details = details;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG & AUTH
// ═══════════════════════════════════════════════════════════════════════════════

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue>;

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: QueryParams;
  idempotencyKey?: string;
  traceId?: string;
  timeoutMs?: number;
};

function getAdapterConfig() {
  const env = getServerEnv();
  return {
    baseUrl: env.CLUES_LIFESCORE_BASE_URL,
    apiKey: env.CLUES_LIFESCORE_INTERNAL_API_KEY,
  };
}

/** Check if the adapter has both base URL and API key configured. */
export function isLifeScoreConfigured(): boolean {
  const { baseUrl, apiKey } = getAdapterConfig();
  return Boolean(baseUrl && apiKey);
}

function assertConfigured() {
  const { baseUrl, apiKey } = getAdapterConfig();

  if (!baseUrl || !apiKey) {
    throw new LifeScoreAdapterError({
      code: "LIFESCORE_NOT_CONFIGURED",
      message:
        "CLUES LifeScore base URL and internal API key must both be configured before the adapter can be used.",
      status: 503,
    });
  }

  return { baseUrl, apiKey };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HTTP HELPER
// ═══════════════════════════════════════════════════════════════════════════════

function buildUrl(pathname: string, query?: QueryParams) {
  const { baseUrl } = assertConfigured();
  const url = new URL(pathname, baseUrl);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

function buildHeaders(options: RequestOptions = {}) {
  const { apiKey } = assertConfigured();

  const headers = new Headers({
    Accept: "application/json",
    "x-olivia-app-id": OLIVIA_APP_ID,
    "x-olivia-signature": apiKey,
    "x-olivia-trace-id": options.traceId ?? randomUUID(),
  });

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (options.idempotencyKey) {
    headers.set("x-olivia-idempotency-key", options.idempotencyKey);
  }

  return headers;
}

function buildAdapterError(
  status: number,
  payload: unknown,
  fallbackMessage: string,
) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object"
  ) {
    const errorPayload = payload as LifeScoreErrorPayload;
    return new LifeScoreAdapterError({
      code: errorPayload.error.code || "LIFESCORE_REQUEST_FAILED",
      message: errorPayload.error.message || fallbackMessage,
      status,
      retryable: Boolean(errorPayload.error.retryable),
      details: errorPayload.error.details ?? [],
    });
  }

  return new LifeScoreAdapterError({
    code: "LIFESCORE_REQUEST_FAILED",
    message: fallbackMessage,
    status,
  });
}

async function parseResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

async function request<T>(
  pathname: string,
  options: RequestOptions = {},
): Promise<T> {
  const url = buildUrl(pathname, options.query);
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: buildHeaders(options),
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
    signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    throw buildAdapterError(
      response.status,
      payload,
      `CLUES LifeScore adapter request failed with HTTP ${response.status}.`,
    );
  }

  return payload as T;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPED ENDPOINT METHODS
// ═══════════════════════════════════════════════════════════════════════════════

/** Health check — GET /api/internal/olivia/health */
export async function getLifeScoreHealth() {
  return request<LifeScoreHealthSnapshot>(ENDPOINTS.health);
}

/** Get user profile — GET /api/internal/olivia/users/:id */
export async function getUserProfile(userId: string) {
  return request<LifeScoreUserProfile>(getUserEndpoint(userId));
}

/** Get user's overall LifeScore — GET /api/internal/olivia/users/:id/score */
export async function getOverallScore(userId: string) {
  return request<LifeScoreOverall>(getUserScoreEndpoint(userId));
}

/** Get per-module scores — GET /api/internal/olivia/users/:id/modules */
export async function getModuleScores(userId: string) {
  return request<LifeScoreModuleScoresResponse>(
    getUserModulesEndpoint(userId),
  );
}

/** Compare cities side-by-side — POST /api/internal/olivia/compare */
export async function compareCities(
  userId: string,
  comparisonRequest: LifeScoreCityComparisonRequest,
) {
  return request<LifeScoreCityComparison>(ENDPOINTS.compare, {
    method: "POST",
    body: { userId, ...comparisonRequest },
  });
}

/** Get single city LifeScore profile — GET /api/internal/olivia/cities/:id */
export async function getCityScore(cityId: string) {
  return request<LifeScoreCityProfile>(getCityEndpoint(cityId));
}

/** Search/filter scored cities — GET /api/internal/olivia/cities */
export async function searchCities(query: LifeScoreCitySearchQuery = {}) {
  return request<LifeScorePaginatedList<LifeScoreCityProfile>>(
    ENDPOINTS.cities,
    {
      query: {
        q: query.q,
        country: query.country,
        state: query.state,
        minScore: query.minScore,
        maxScore: query.maxScore,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        limit: query.limit,
        offset: query.offset,
      },
    },
  );
}

/** Get top city recommendations — GET /api/internal/olivia/users/:id/recommendations */
export async function getRecommendations(userId: string) {
  return request<LifeScoreRecommendationsResponse>(
    getUserRecommendationsEndpoint(userId),
  );
}

/** Submit module assessment answers — POST /api/internal/olivia/users/:id/assessment */
export async function submitAssessment(
  userId: string,
  submission: LifeScoreAssessmentSubmission,
) {
  return request<LifeScoreAssessmentResult>(
    getUserAssessmentEndpoint(userId),
    {
      method: "POST",
      body: submission,
      idempotencyKey: randomUUID(),
    },
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export interface LifeScoreAdapter {
  getHealth: typeof getLifeScoreHealth;
  getUserProfile: typeof getUserProfile;
  getOverallScore: typeof getOverallScore;
  getModuleScores: typeof getModuleScores;
  compareCities: typeof compareCities;
  getCityScore: typeof getCityScore;
  searchCities: typeof searchCities;
  getRecommendations: typeof getRecommendations;
  submitAssessment: typeof submitAssessment;
}

let cachedAdapter: LifeScoreAdapter | null | undefined;

/**
 * Singleton factory. Returns the adapter if configured, or null if
 * CLUES_LIFESCORE_BASE_URL / CLUES_LIFESCORE_INTERNAL_API_KEY are missing.
 */
export function getLifeScoreAdapter(): LifeScoreAdapter | null {
  if (cachedAdapter !== undefined) return cachedAdapter;

  if (!isLifeScoreConfigured()) {
    cachedAdapter = null;
    return null;
  }

  cachedAdapter = {
    getHealth: getLifeScoreHealth,
    getUserProfile,
    getOverallScore,
    getModuleScores,
    compareCities,
    getCityScore,
    searchCities,
    getRecommendations,
    submitAssessment,
  };

  return cachedAdapter;
}
