/**
 * Tampa Bay Brokerage Stack — John E. Desautels & Associates Adapter
 *
 * Sprint 4.6 Item 8 — HTTP client adapter for the Tampa Bay brokerage
 * platform. Client lifecycle management, transaction tracking, listings,
 * activity timelines, document access, and pipeline analytics.
 *
 * Env vars: BROKERAGE_BASE_URL + BROKERAGE_INTERNAL_API_KEY
 * (matches registry.ts naming convention).
 */

import { randomUUID } from "crypto";

import { getServerEnv } from "@/lib/config/env";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Health check response */
export interface BrokerageHealthSnapshot {
  ok: boolean;
  service: string;
  version: string;
  caller?: string;
  capabilities: string[];
}

/** Brokerage client profile */
export interface BrokerageClient {
  clientId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  clientType: "buyer" | "seller" | "both" | "investor" | "referral" | "past";
  status: "lead" | "active" | "under-contract" | "closed" | "nurture" | "archived";
  source?: string;
  assignedAgent?: string;
  tags?: string[];
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  lastContactedAt?: string;
  metadata?: Record<string, unknown>;
}

/** Client search query */
export interface BrokerageClientSearchQuery {
  q?: string;
  clientType?: string;
  status?: string;
  assignedAgent?: string;
  tags?: string;
  sortBy?: "name" | "status" | "created" | "lastContacted" | "updated";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

/** Real estate transaction */
export interface BrokerageTransaction {
  transactionId: string;
  clientId: string;
  clientName: string;
  propertyAddress: string;
  city: string;
  state: string;
  zipCode: string;
  transactionType: "purchase" | "sale" | "lease" | "referral";
  status: "prospect" | "showing" | "offer-submitted" | "offer-accepted" | "under-contract" | "inspection" | "appraisal" | "clear-to-close" | "closed" | "fallen-through" | "cancelled";
  listPrice?: number;
  offerPrice?: number;
  contractPrice?: number;
  closingPrice?: number;
  commissionRate?: number;
  commissionAmount?: number;
  listingAgent?: string;
  buyerAgent?: string;
  closingDate?: string;
  contractDate?: string;
  inspectionDate?: string;
  appraisalDate?: string;
  milestones: TransactionMilestone[];
  createdAt: string;
  updatedAt: string;
}

export interface TransactionMilestone {
  id: string;
  name: string;
  status: "pending" | "in_progress" | "complete" | "waived" | "failed";
  dueDate?: string;
  completedAt?: string;
  notes?: string;
}

/** Transaction search query */
export interface BrokerageTransactionSearchQuery {
  clientId?: string;
  status?: string;
  transactionType?: string;
  closingAfter?: string;
  closingBefore?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: "price" | "status" | "closing" | "created" | "updated";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

/** Property listing */
export interface BrokerageListing {
  listingId: string;
  mlsNumber?: string;
  propertyAddress: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: "single-family" | "condo" | "townhouse" | "multi-family" | "land" | "commercial" | "other";
  status: "coming-soon" | "active" | "pending" | "under-contract" | "sold" | "withdrawn" | "expired";
  listPrice: number;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  lotSizeSqFt?: number;
  yearBuilt?: number;
  description?: string;
  photos?: string[];
  listingAgent: string;
  listedAt: string;
  daysOnMarket: number;
  showingCount?: number;
  offerCount?: number;
  updatedAt: string;
}

/** Listings search query */
export interface BrokerageListingSearchQuery {
  q?: string;
  status?: string;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  minBathrooms?: number;
  city?: string;
  zipCode?: string;
  sortBy?: "price" | "listed" | "dom" | "updated";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

/** Client activity/communication timeline entry */
export interface BrokerageTimelineEntry {
  id: string;
  clientId: string;
  type: "call" | "email" | "text" | "meeting" | "showing" | "note" | "document" | "milestone" | "system";
  direction?: "inbound" | "outbound";
  subject?: string;
  summary: string;
  details?: string;
  actor: string;
  relatedTransactionId?: string;
  relatedListingId?: string;
  createdAt: string;
}

/** Timeline query */
export interface BrokerageTimelineQuery {
  type?: string;
  startAfter?: string;
  startBefore?: string;
  limit?: number;
  offset?: number;
}

/** Client document */
export interface BrokerageDocument {
  id: string;
  clientId: string;
  transactionId?: string;
  title: string;
  documentType: "contract" | "disclosure" | "addendum" | "inspection" | "appraisal" | "title" | "closing" | "correspondence" | "other";
  status: "draft" | "pending-signature" | "signed" | "executed" | "expired" | "voided";
  url?: string;
  mimeType?: string;
  sizeBytes?: number;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

/** Pipeline statistics */
export interface BrokeragePipelineStats {
  totalActiveClients: number;
  totalActiveTransactions: number;
  totalActiveListings: number;
  dealsByStage: Array<{
    stage: string;
    count: number;
    totalValue: number;
  }>;
  closedThisMonth: number;
  closedThisMonthVolume: number;
  closedThisYear: number;
  closedThisYearVolume: number;
  projectedClosings30d: number;
  projectedVolume30d: number;
  avgDaysToClose: number;
  conversionRate: number;
  lastUpdatedAt: string;
}

/** Paginated list wrapper */
export interface BrokeragePaginatedList<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/** Error response payload */
export interface BrokerageErrorPayload {
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
  clients: "/api/internal/olivia/clients",
  transactions: "/api/internal/olivia/transactions",
  listings: "/api/internal/olivia/listings",
  pipeline: "/api/internal/olivia/pipeline",
} as const;

function getClientEndpoint(clientId: string) {
  return `${ENDPOINTS.clients}/${encodeURIComponent(clientId)}`;
}

function getClientTimelineEndpoint(clientId: string) {
  return `${getClientEndpoint(clientId)}/timeline`;
}

function getClientDocumentsEndpoint(clientId: string) {
  return `${getClientEndpoint(clientId)}/documents`;
}

function getTransactionEndpoint(transactionId: string) {
  return `${ENDPOINTS.transactions}/${encodeURIComponent(transactionId)}`;
}

function getListingEndpoint(listingId: string) {
  return `${ENDPOINTS.listings}/${encodeURIComponent(listingId)}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class BrokerageAdapterError extends Error {
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
    this.name = "BrokerageAdapterError";
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
    baseUrl: env.BROKERAGE_BASE_URL,
    apiKey: env.BROKERAGE_INTERNAL_API_KEY,
  };
}

/** Check if the adapter has both base URL and API key configured. */
export function isBrokerageConfigured(): boolean {
  const { baseUrl, apiKey } = getAdapterConfig();
  return Boolean(baseUrl && apiKey);
}

function assertConfigured() {
  const { baseUrl, apiKey } = getAdapterConfig();

  if (!baseUrl || !apiKey) {
    throw new BrokerageAdapterError({
      code: "BROKERAGE_NOT_CONFIGURED",
      message:
        "Brokerage base URL and internal API key must both be configured before the adapter can be used.",
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
    const errorPayload = payload as BrokerageErrorPayload;
    return new BrokerageAdapterError({
      code: errorPayload.error.code || "BROKERAGE_REQUEST_FAILED",
      message: errorPayload.error.message || fallbackMessage,
      status,
      retryable: Boolean(errorPayload.error.retryable),
      details: errorPayload.error.details ?? [],
    });
  }

  return new BrokerageAdapterError({
    code: "BROKERAGE_REQUEST_FAILED",
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
      `Brokerage adapter request failed with HTTP ${response.status}.`,
    );
  }

  return payload as T;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPED ENDPOINT METHODS
// ═══════════════════════════════════════════════════════════════════════════════

/** Health check — GET /api/internal/olivia/health */
export async function getBrokerageHealth() {
  return request<BrokerageHealthSnapshot>(ENDPOINTS.health);
}

/** Get client profile — GET /api/internal/olivia/clients/:id */
export async function getClient(clientId: string) {
  return request<BrokerageClient>(getClientEndpoint(clientId));
}

/** Search/filter clients — GET /api/internal/olivia/clients */
export async function searchClients(
  query: BrokerageClientSearchQuery = {},
) {
  return request<BrokeragePaginatedList<BrokerageClient>>(
    ENDPOINTS.clients,
    {
      query: {
        q: query.q,
        clientType: query.clientType,
        status: query.status,
        assignedAgent: query.assignedAgent,
        tags: query.tags,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        limit: query.limit,
        offset: query.offset,
      },
    },
  );
}

/** Get transaction detail — GET /api/internal/olivia/transactions/:id */
export async function getTransaction(transactionId: string) {
  return request<BrokerageTransaction>(
    getTransactionEndpoint(transactionId),
  );
}

/** List transactions — GET /api/internal/olivia/transactions */
export async function listTransactions(
  query: BrokerageTransactionSearchQuery = {},
) {
  return request<BrokeragePaginatedList<BrokerageTransaction>>(
    ENDPOINTS.transactions,
    {
      query: {
        clientId: query.clientId,
        status: query.status,
        transactionType: query.transactionType,
        closingAfter: query.closingAfter,
        closingBefore: query.closingBefore,
        minPrice: query.minPrice,
        maxPrice: query.maxPrice,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        limit: query.limit,
        offset: query.offset,
      },
    },
  );
}

/** Get listings — GET /api/internal/olivia/listings */
export async function getListings(
  query: BrokerageListingSearchQuery = {},
) {
  return request<BrokeragePaginatedList<BrokerageListing>>(
    ENDPOINTS.listings,
    {
      query: {
        q: query.q,
        status: query.status,
        propertyType: query.propertyType,
        minPrice: query.minPrice,
        maxPrice: query.maxPrice,
        minBedrooms: query.minBedrooms,
        minBathrooms: query.minBathrooms,
        city: query.city,
        zipCode: query.zipCode,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        limit: query.limit,
        offset: query.offset,
      },
    },
  );
}

/** Get single listing — GET /api/internal/olivia/listings/:id */
export async function getListing(listingId: string) {
  return request<BrokerageListing>(getListingEndpoint(listingId));
}

/** Get client activity timeline — GET /api/internal/olivia/clients/:id/timeline */
export async function getClientTimeline(
  clientId: string,
  query: BrokerageTimelineQuery = {},
) {
  return request<BrokeragePaginatedList<BrokerageTimelineEntry>>(
    getClientTimelineEndpoint(clientId),
    {
      query: {
        type: query.type,
        startAfter: query.startAfter,
        startBefore: query.startBefore,
        limit: query.limit,
        offset: query.offset,
      },
    },
  );
}

/** Get client documents — GET /api/internal/olivia/clients/:id/documents */
export async function getClientDocuments(clientId: string) {
  return request<BrokeragePaginatedList<BrokerageDocument>>(
    getClientDocumentsEndpoint(clientId),
  );
}

/** Get pipeline stats — GET /api/internal/olivia/pipeline */
export async function getPipelineStats() {
  return request<BrokeragePipelineStats>(ENDPOINTS.pipeline);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export interface TampaBrokerageAdapter {
  getHealth: typeof getBrokerageHealth;
  getClient: typeof getClient;
  searchClients: typeof searchClients;
  getTransaction: typeof getTransaction;
  listTransactions: typeof listTransactions;
  getListings: typeof getListings;
  getListing: typeof getListing;
  getClientTimeline: typeof getClientTimeline;
  getClientDocuments: typeof getClientDocuments;
  getPipelineStats: typeof getPipelineStats;
}

let cachedAdapter: TampaBrokerageAdapter | null | undefined;

/**
 * Singleton factory. Returns the adapter if configured, or null if
 * BROKERAGE_BASE_URL / BROKERAGE_INTERNAL_API_KEY are missing.
 */
export function getTampaBrokerageAdapter(): TampaBrokerageAdapter | null {
  if (cachedAdapter !== undefined) return cachedAdapter;

  if (!isBrokerageConfigured()) {
    cachedAdapter = null;
    return null;
  }

  cachedAdapter = {
    getHealth: getBrokerageHealth,
    getClient,
    searchClients,
    getTransaction,
    listTransactions,
    getListings,
    getListing,
    getClientTimeline,
    getClientDocuments,
    getPipelineStats,
  };

  return cachedAdapter;
}
