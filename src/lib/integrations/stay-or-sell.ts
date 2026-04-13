/**
 * Stay or Sell™ Advisor — FL Coastal Property Decision Engine
 *
 * Sprint 4.6 Item 7 — HTTP client adapter for the Stay or Sell™ platform.
 * Helps Florida coastal homeowners decide whether to stay in or sell their
 * property based on risk factors (flooding, storms, insurance trajectory,
 * erosion), market analysis, equity position, and what-if scenarios.
 *
 * Env vars: STAY_OR_SELL_BASE_URL + STAY_OR_SELL_API_KEY
 */

import { randomUUID } from "crypto";

import { getServerEnv } from "@/lib/config/env";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Health check response */
export interface StayOrSellHealthSnapshot {
  ok: boolean;
  service: string;
  version: string;
  caller?: string;
  capabilities: string[];
}

/** Full property risk/assessment profile */
export interface StayOrSellPropertyAssessment {
  propertyId: string;
  address: string;
  city: string;
  county: string;
  state: string;
  zipCode: string;
  propertyType: "single-family" | "condo" | "townhouse" | "manufactured" | "multi-family" | "other";
  yearBuilt?: number;
  squareFeet?: number;
  lotSizeSqFt?: number;
  distanceToCoastMiles?: number;
  elevation?: number;
  floodZone?: string;
  currentEstimatedValue?: number;
  lastSalePrice?: number;
  lastSaleDate?: string;
  overallRiskScore: number;
  overallRiskTier: "low" | "moderate" | "elevated" | "high" | "critical";
  recommendation: "strong-stay" | "stay" | "neutral" | "sell" | "strong-sell";
  lastAssessedAt: string;
}

/** Risk factors breakdown */
export interface StayOrSellRiskFactors {
  propertyId: string;
  overallRiskScore: number;
  factors: StayOrSellRiskFactor[];
  lastUpdatedAt: string;
}

export interface StayOrSellRiskFactor {
  id: string;
  category: "flood" | "storm" | "erosion" | "sea-level" | "insurance" | "structural" | "environmental";
  name: string;
  description: string;
  score: number;
  severity: "low" | "moderate" | "elevated" | "high" | "critical";
  trend: "improving" | "stable" | "worsening" | "rapidly-worsening";
  dataPoints: string[];
  sources: string[];
}

/** Market analysis for a property */
export interface StayOrSellMarketAnalysis {
  propertyId: string;
  currentEstimatedValue: number;
  valueTrend12m: number;
  valueTrend36m: number;
  medianAreaPrice: number;
  medianPricePerSqFt: number;
  daysOnMarketAvg: number;
  inventoryLevel: "low" | "balanced" | "high";
  buyerDemand: "strong" | "moderate" | "weak";
  comparables: StayOrSellComparable[];
  marketOutlook: "bullish" | "neutral" | "bearish";
  lastUpdatedAt: string;
}

export interface StayOrSellComparable {
  address: string;
  salePrice: number;
  saleDate: string;
  squareFeet?: number;
  pricePerSqFt?: number;
  distanceMiles: number;
  daysOnMarket: number;
}

/** Equity position */
export interface StayOrSellEquityPosition {
  propertyId: string;
  currentEstimatedValue: number;
  outstandingMortgage?: number;
  estimatedEquity: number;
  equityPercentage: number;
  originalPurchasePrice?: number;
  purchaseDate?: string;
  totalAppreciation?: number;
  appreciationPercentage?: number;
  estimatedNetProceeds?: number;
  closingCostEstimate?: number;
  capitalGainsEstimate?: number;
  lastCalculatedAt: string;
}

/** Insurance outlook */
export interface StayOrSellInsuranceOutlook {
  propertyId: string;
  currentAnnualPremium?: number;
  projectedPremium1yr?: number;
  projectedPremium3yr?: number;
  projectedPremium5yr?: number;
  premiumTrend: "decreasing" | "stable" | "increasing" | "rapidly-increasing";
  floodInsuranceRequired: boolean;
  windstormInsuranceRequired: boolean;
  citizensEligible: boolean;
  privateMarketOptions: number;
  riskFactors: string[];
  lastUpdatedAt: string;
}

/** Decision engine request */
export interface StayOrSellDecisionRequest {
  propertyId: string;
  ownerPreferences?: {
    timeHorizon?: "1yr" | "3yr" | "5yr" | "10yr" | "indefinite";
    riskTolerance?: "conservative" | "moderate" | "aggressive";
    financialPriority?: "maximize-equity" | "minimize-risk" | "cash-flow" | "lifestyle";
    relocationWillingness?: "eager" | "open" | "reluctant" | "unwilling";
  };
}

/** Decision engine result */
export interface StayOrSellDecisionResult {
  success: boolean;
  propertyId: string;
  recommendation: "strong-stay" | "stay" | "neutral" | "sell" | "strong-sell";
  confidenceScore: number;
  stayScore: number;
  sellScore: number;
  summary: string;
  keyFactors: Array<{
    factor: string;
    impact: "supports-stay" | "supports-sell" | "neutral";
    weight: number;
    explanation: string;
  }>;
  financialProjection: {
    holdValue5yr: number;
    sellNowNetProceeds: number;
    breakEvenYears?: number;
    annualCostToHold: number;
  };
  riskWarnings: string[];
  generatedAt: string;
}

/** What-if scenario */
export interface StayOrSellScenario {
  id: string;
  name: string;
  description: string;
  timeHorizon: string;
  assumptions: Record<string, unknown>;
  projectedValue: number;
  projectedEquity: number;
  projectedInsuranceCost: number;
  totalCostToHold: number;
  netOutcome: number;
  riskLevel: "low" | "moderate" | "elevated" | "high" | "critical";
  recommendation: "stay" | "sell" | "neutral";
}

/** Scenarios response */
export interface StayOrSellScenariosResponse {
  propertyId: string;
  scenarios: StayOrSellScenario[];
  bestScenario: string;
  worstScenario: string;
  generatedAt: string;
}

/** Property search query */
export interface StayOrSellPropertySearchQuery {
  q?: string;
  city?: string;
  county?: string;
  zipCode?: string;
  minValue?: number;
  maxValue?: number;
  riskTier?: string;
  recommendation?: string;
  sortBy?: "value" | "risk" | "address" | "updated";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

/** Paginated list wrapper */
export interface StayOrSellPaginatedList<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/** Error response payload */
export interface StayOrSellErrorPayload {
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
  properties: "/api/internal/olivia/properties",
  decisions: "/api/internal/olivia/decisions",
} as const;

function getPropertyEndpoint(propertyId: string) {
  return `${ENDPOINTS.properties}/${encodeURIComponent(propertyId)}`;
}

function getPropertyRisksEndpoint(propertyId: string) {
  return `${getPropertyEndpoint(propertyId)}/risks`;
}

function getPropertyMarketEndpoint(propertyId: string) {
  return `${getPropertyEndpoint(propertyId)}/market`;
}

function getPropertyEquityEndpoint(propertyId: string) {
  return `${getPropertyEndpoint(propertyId)}/equity`;
}

function getPropertyInsuranceEndpoint(propertyId: string) {
  return `${getPropertyEndpoint(propertyId)}/insurance`;
}

function getPropertyScenariosEndpoint(propertyId: string) {
  return `${getPropertyEndpoint(propertyId)}/scenarios`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class StayOrSellAdapterError extends Error {
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
    this.name = "StayOrSellAdapterError";
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
    baseUrl: env.STAY_OR_SELL_BASE_URL,
    apiKey: env.STAY_OR_SELL_API_KEY,
  };
}

/** Check if the adapter has both base URL and API key configured. */
export function isStayOrSellConfigured(): boolean {
  const { baseUrl, apiKey } = getAdapterConfig();
  return Boolean(baseUrl && apiKey);
}

function assertConfigured() {
  const { baseUrl, apiKey } = getAdapterConfig();

  if (!baseUrl || !apiKey) {
    throw new StayOrSellAdapterError({
      code: "STAY_OR_SELL_NOT_CONFIGURED",
      message:
        "Stay or Sell base URL and API key must both be configured before the adapter can be used.",
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
    const errorPayload = payload as StayOrSellErrorPayload;
    return new StayOrSellAdapterError({
      code: errorPayload.error.code || "STAY_OR_SELL_REQUEST_FAILED",
      message: errorPayload.error.message || fallbackMessage,
      status,
      retryable: Boolean(errorPayload.error.retryable),
      details: errorPayload.error.details ?? [],
    });
  }

  return new StayOrSellAdapterError({
    code: "STAY_OR_SELL_REQUEST_FAILED",
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
      `Stay or Sell adapter request failed with HTTP ${response.status}.`,
    );
  }

  return payload as T;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPED ENDPOINT METHODS
// ═══════════════════════════════════════════════════════════════════════════════

/** Health check — GET /api/internal/olivia/health */
export async function getStayOrSellHealth() {
  return request<StayOrSellHealthSnapshot>(ENDPOINTS.health);
}

/** Get full property assessment — GET /api/internal/olivia/properties/:id */
export async function getPropertyAssessment(propertyId: string) {
  return request<StayOrSellPropertyAssessment>(
    getPropertyEndpoint(propertyId),
  );
}

/** Get risk factors — GET /api/internal/olivia/properties/:id/risks */
export async function getRiskFactors(propertyId: string) {
  return request<StayOrSellRiskFactors>(getPropertyRisksEndpoint(propertyId));
}

/** Get market analysis — GET /api/internal/olivia/properties/:id/market */
export async function getMarketAnalysis(propertyId: string) {
  return request<StayOrSellMarketAnalysis>(
    getPropertyMarketEndpoint(propertyId),
  );
}

/** Get equity position — GET /api/internal/olivia/properties/:id/equity */
export async function getEquityPosition(propertyId: string) {
  return request<StayOrSellEquityPosition>(
    getPropertyEquityEndpoint(propertyId),
  );
}

/** Get insurance outlook — GET /api/internal/olivia/properties/:id/insurance */
export async function getInsuranceOutlook(propertyId: string) {
  return request<StayOrSellInsuranceOutlook>(
    getPropertyInsuranceEndpoint(propertyId),
  );
}

/** Run decision engine — POST /api/internal/olivia/decisions */
export async function runDecisionEngine(
  decisionRequest: StayOrSellDecisionRequest,
) {
  return request<StayOrSellDecisionResult>(ENDPOINTS.decisions, {
    method: "POST",
    body: decisionRequest,
    idempotencyKey: randomUUID(),
  });
}

/** Get what-if scenarios — GET /api/internal/olivia/properties/:id/scenarios */
export async function getScenarios(propertyId: string) {
  return request<StayOrSellScenariosResponse>(
    getPropertyScenariosEndpoint(propertyId),
  );
}

/** Search FL coastal properties — GET /api/internal/olivia/properties */
export async function searchProperties(
  query: StayOrSellPropertySearchQuery = {},
) {
  return request<StayOrSellPaginatedList<StayOrSellPropertyAssessment>>(
    ENDPOINTS.properties,
    {
      query: {
        q: query.q,
        city: query.city,
        county: query.county,
        zipCode: query.zipCode,
        minValue: query.minValue,
        maxValue: query.maxValue,
        riskTier: query.riskTier,
        recommendation: query.recommendation,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        limit: query.limit,
        offset: query.offset,
      },
    },
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export interface StayOrSellAdapter {
  getHealth: typeof getStayOrSellHealth;
  getPropertyAssessment: typeof getPropertyAssessment;
  getRiskFactors: typeof getRiskFactors;
  getMarketAnalysis: typeof getMarketAnalysis;
  getEquityPosition: typeof getEquityPosition;
  getInsuranceOutlook: typeof getInsuranceOutlook;
  runDecisionEngine: typeof runDecisionEngine;
  getScenarios: typeof getScenarios;
  searchProperties: typeof searchProperties;
}

let cachedAdapter: StayOrSellAdapter | null | undefined;

/**
 * Singleton factory. Returns the adapter if configured, or null if
 * STAY_OR_SELL_BASE_URL / STAY_OR_SELL_API_KEY are missing.
 */
export function getStayOrSellAdapter(): StayOrSellAdapter | null {
  if (cachedAdapter !== undefined) return cachedAdapter;

  if (!isStayOrSellConfigured()) {
    cachedAdapter = null;
    return null;
  }

  cachedAdapter = {
    getHealth: getStayOrSellHealth,
    getPropertyAssessment,
    getRiskFactors,
    getMarketAnalysis,
    getEquityPosition,
    getInsuranceOutlook,
    runDecisionEngine,
    getScenarios,
    searchProperties,
  };

  return cachedAdapter;
}
