/**
 * CLUES London Tech Map — Ecosystem Adapter
 *
 * Sprint 4.6 Item 2 — HTTP client adapter for the London Tech Map platform.
 * Covers the tech ecosystem data surface: companies, people, events, stats,
 * and semantic search. The calendar subsystem is already handled by
 * src/lib/adapters/london-calendar.ts — this adapter covers everything else.
 *
 * Reuses CLUES_LONDON_BASE_URL + CLUES_LONDON_INTERNAL_API_KEY (no new env vars).
 * Endpoint namespace: /api/internal/olivia/ecosystem/*
 */

import { randomUUID } from "crypto";

import { getServerEnv } from "@/lib/config/env";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Health check response from the ecosystem service */
export interface LondonEcosystemHealthSnapshot {
  ok: boolean;
  service: string;
  version: string;
  caller?: string;
  capabilities: string[];
}

/** Company in the London tech ecosystem */
export interface LondonTechCompany {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  sector: string;
  subSectors?: string[];
  stage: "pre-seed" | "seed" | "series-a" | "series-b" | "series-c" | "growth" | "public" | "acquired" | "unknown";
  foundedYear?: number;
  employeeCount?: number;
  headquarters?: string;
  website?: string;
  linkedinUrl?: string;
  crunchbaseUrl?: string;
  fundingTotalGbp?: number;
  lastFundingRound?: string;
  lastFundingDate?: string;
  investors?: string[];
  tags?: string[];
  score?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Company search/filter query */
export interface LondonCompanySearchQuery {
  q?: string;
  sector?: string;
  stage?: string;
  minEmployees?: number;
  maxEmployees?: number;
  minFunding?: number;
  maxFunding?: number;
  tags?: string;
  sortBy?: "name" | "score" | "founded" | "funding" | "employees" | "updated";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

/** Person in the London tech ecosystem */
export interface LondonTechPerson {
  id: string;
  name: string;
  slug?: string;
  title?: string;
  company?: string;
  companyId?: string;
  role: "founder" | "ceo" | "cto" | "cfo" | "investor" | "advisor" | "operator" | "other";
  bio?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  email?: string;
  tags?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** People search query */
export interface LondonPeopleSearchQuery {
  q?: string;
  role?: string;
  company?: string;
  tags?: string;
  sortBy?: "name" | "role" | "company" | "updated";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

/** Tech event in London */
export interface LondonTechEvent {
  id: string;
  title: string;
  description?: string;
  eventType: "conference" | "meetup" | "hackathon" | "workshop" | "demo-day" | "pitch-event" | "networking" | "webinar" | "other";
  organizer?: string;
  organizerId?: string;
  venue?: string;
  address?: string;
  virtualUrl?: string;
  isVirtual: boolean;
  startDatetime: string;
  endDatetime?: string;
  registrationUrl?: string;
  cost?: string;
  tags?: string[];
  attendeeCount?: number;
  createdAt: string;
  updatedAt: string;
}

/** Events list query */
export interface LondonEventsQuery {
  q?: string;
  eventType?: string;
  startAfter?: string;
  startBefore?: string;
  isVirtual?: boolean;
  tags?: string;
  sortBy?: "date" | "title" | "attendees" | "updated";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

/** Aggregate ecosystem statistics */
export interface LondonEcosystemStats {
  totalCompanies: number;
  totalPeople: number;
  totalEvents: number;
  companiesBySector: Record<string, number>;
  companiesByStage: Record<string, number>;
  totalFundingGbp: number;
  avgCompanyScore: number;
  topSectors: Array<{ sector: string; count: number }>;
  recentActivity: {
    newCompanies30d: number;
    newPeople30d: number;
    upcomingEvents30d: number;
  };
  lastUpdated: string;
}

/** Semantic search request */
export interface LondonEcosystemSearchRequest {
  query: string;
  entityTypes?: Array<"company" | "person" | "event">;
  limit?: number;
}

/** Semantic search result */
export interface LondonEcosystemSearchResult {
  success: boolean;
  query: string;
  results: LondonEcosystemSearchHit[];
  totalHits: number;
  processingMs: number;
}

export interface LondonEcosystemSearchHit {
  entityType: "company" | "person" | "event";
  entityId: string;
  title: string;
  snippet: string;
  score: number;
  data: Record<string, unknown>;
}

/** Paginated list wrapper */
export interface LondonEcosystemPaginatedList<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/** Error response payload */
export interface LondonEcosystemErrorPayload {
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
  health: "/api/internal/olivia/ecosystem/health",
  companies: "/api/internal/olivia/ecosystem/companies",
  people: "/api/internal/olivia/ecosystem/people",
  events: "/api/internal/olivia/ecosystem/events",
  stats: "/api/internal/olivia/ecosystem/stats",
  search: "/api/internal/olivia/ecosystem/search",
} as const;

function getCompanyEndpoint(companyId: string) {
  return `${ENDPOINTS.companies}/${encodeURIComponent(companyId)}`;
}

function getPersonEndpoint(personId: string) {
  return `${ENDPOINTS.people}/${encodeURIComponent(personId)}`;
}

function getEventEndpoint(eventId: string) {
  return `${ENDPOINTS.events}/${encodeURIComponent(eventId)}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class LondonTechMapAdapterError extends Error {
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
    this.name = "LondonTechMapAdapterError";
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
    baseUrl: env.CLUES_LONDON_BASE_URL,
    apiKey: env.CLUES_LONDON_INTERNAL_API_KEY,
  };
}

/** Check if the adapter has both base URL and API key configured. */
export function isLondonTechMapConfigured(): boolean {
  const { baseUrl, apiKey } = getAdapterConfig();
  return Boolean(baseUrl && apiKey);
}

function assertConfigured() {
  const { baseUrl, apiKey } = getAdapterConfig();

  if (!baseUrl || !apiKey) {
    throw new LondonTechMapAdapterError({
      code: "LONDON_TECH_MAP_NOT_CONFIGURED",
      message:
        "CLUES London base URL and internal API key must both be configured before the ecosystem adapter can be used.",
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
    const errorPayload = payload as LondonEcosystemErrorPayload;
    return new LondonTechMapAdapterError({
      code: errorPayload.error.code || "LONDON_TECH_MAP_REQUEST_FAILED",
      message: errorPayload.error.message || fallbackMessage,
      status,
      retryable: Boolean(errorPayload.error.retryable),
      details: errorPayload.error.details ?? [],
    });
  }

  return new LondonTechMapAdapterError({
    code: "LONDON_TECH_MAP_REQUEST_FAILED",
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
      `London Tech Map ecosystem adapter request failed with HTTP ${response.status}.`,
    );
  }

  return payload as T;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPED ENDPOINT METHODS
// ═══════════════════════════════════════════════════════════════════════════════

/** Health check — GET /api/internal/olivia/ecosystem/health */
export async function getLondonEcosystemHealth() {
  return request<LondonEcosystemHealthSnapshot>(ENDPOINTS.health);
}

/** Search/filter companies — GET /api/internal/olivia/ecosystem/companies */
export async function searchCompanies(
  query: LondonCompanySearchQuery = {},
) {
  return request<LondonEcosystemPaginatedList<LondonTechCompany>>(
    ENDPOINTS.companies,
    {
      query: {
        q: query.q,
        sector: query.sector,
        stage: query.stage,
        minEmployees: query.minEmployees,
        maxEmployees: query.maxEmployees,
        minFunding: query.minFunding,
        maxFunding: query.maxFunding,
        tags: query.tags,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        limit: query.limit,
        offset: query.offset,
      },
    },
  );
}

/** Get single company — GET /api/internal/olivia/ecosystem/companies/:id */
export async function getCompany(companyId: string) {
  return request<LondonTechCompany>(getCompanyEndpoint(companyId));
}

/** Search people — GET /api/internal/olivia/ecosystem/people */
export async function searchPeople(
  query: LondonPeopleSearchQuery = {},
) {
  return request<LondonEcosystemPaginatedList<LondonTechPerson>>(
    ENDPOINTS.people,
    {
      query: {
        q: query.q,
        role: query.role,
        company: query.company,
        tags: query.tags,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        limit: query.limit,
        offset: query.offset,
      },
    },
  );
}

/** Get single person — GET /api/internal/olivia/ecosystem/people/:id */
export async function getPerson(personId: string) {
  return request<LondonTechPerson>(getPersonEndpoint(personId));
}

/** List events — GET /api/internal/olivia/ecosystem/events */
export async function listEvents(query: LondonEventsQuery = {}) {
  return request<LondonEcosystemPaginatedList<LondonTechEvent>>(
    ENDPOINTS.events,
    {
      query: {
        q: query.q,
        eventType: query.eventType,
        startAfter: query.startAfter,
        startBefore: query.startBefore,
        isVirtual: query.isVirtual,
        tags: query.tags,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        limit: query.limit,
        offset: query.offset,
      },
    },
  );
}

/** Get single event — GET /api/internal/olivia/ecosystem/events/:id */
export async function getEvent(eventId: string) {
  return request<LondonTechEvent>(getEventEndpoint(eventId));
}

/** Get aggregate ecosystem stats — GET /api/internal/olivia/ecosystem/stats */
export async function getEcosystemStats() {
  return request<LondonEcosystemStats>(ENDPOINTS.stats);
}

/** Semantic search across ecosystem — POST /api/internal/olivia/ecosystem/search */
export async function semanticSearch(
  searchRequest: LondonEcosystemSearchRequest,
) {
  return request<LondonEcosystemSearchResult>(ENDPOINTS.search, {
    method: "POST",
    body: searchRequest,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export interface LondonTechMapAdapter {
  getHealth: typeof getLondonEcosystemHealth;
  searchCompanies: typeof searchCompanies;
  getCompany: typeof getCompany;
  searchPeople: typeof searchPeople;
  getPerson: typeof getPerson;
  listEvents: typeof listEvents;
  getEvent: typeof getEvent;
  getEcosystemStats: typeof getEcosystemStats;
  semanticSearch: typeof semanticSearch;
}

let cachedAdapter: LondonTechMapAdapter | null | undefined;

/**
 * Singleton factory. Returns the adapter if configured, or null if
 * CLUES_LONDON_BASE_URL / CLUES_LONDON_INTERNAL_API_KEY are missing.
 */
export function getLondonTechMapAdapter(): LondonTechMapAdapter | null {
  if (cachedAdapter !== undefined) return cachedAdapter;

  if (!isLondonTechMapConfigured()) {
    cachedAdapter = null;
    return null;
  }

  cachedAdapter = {
    getHealth: getLondonEcosystemHealth,
    searchCompanies,
    getCompany,
    searchPeople,
    getPerson,
    listEvents,
    getEvent,
    getEcosystemStats,
    semanticSearch,
  };

  return cachedAdapter;
}
