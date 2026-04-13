/**
 * CLUES Intelligence LTD Adapter
 *
 * Sprint 4.6 Item 1 — HTTP client adapter for CLUES Intelligence LTD (UK flagship).
 * Olivia's bridge to the relocation analytics, client workflow, and deliverables platform.
 *
 * Pattern: typed HTTP client with config check, error class, private request helper,
 * typed endpoint methods, and singleton factory. Mirrors london-calendar.ts adapter.
 */

import { randomUUID } from "crypto";

import { getServerEnv } from "@/lib/config/env";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Health check response from CLUES Intelligence internal API */
export interface CluesIntelligenceHealthSnapshot {
  ok: boolean;
  service: string;
  version: string;
  caller?: string;
  capabilities: string[];
}

/** Client profile from CLUES Intelligence */
export interface CluesIntelligenceClientProfile {
  clientId: string;
  name: string;
  email?: string;
  phone?: string;
  status: "active" | "onboarding" | "paused" | "archived";
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

/** Client workflow state */
export interface CluesIntelligenceWorkflowState {
  clientId: string;
  currentPhase: string;
  phaseIndex: number;
  totalPhases: number;
  progress: number;
  milestones: WorkflowMilestone[];
  startedAt: string;
  lastUpdatedAt: string;
  isComplete: boolean;
}

export interface WorkflowMilestone {
  id: string;
  name: string;
  status: "pending" | "in_progress" | "complete" | "skipped";
  completedAt?: string;
}

/** Relocation case summary */
export interface CluesIntelligenceRelocation {
  id: string;
  clientId: string;
  originCity: string;
  targetCities: string[];
  status: "draft" | "active" | "evaluating" | "decided" | "complete" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

/** Relocation list query */
export interface CluesIntelligenceRelocationsQuery {
  clientId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

/** Relocation report */
export interface CluesIntelligenceRelocationReport {
  relocationId: string;
  clientId: string;
  generatedAt: string;
  summary: string;
  cityComparisons: CityComparison[];
  recommendation?: string;
  confidenceScore?: number;
}

export interface CityComparison {
  city: string;
  overallScore: number;
  categories: Record<string, number>;
  highlights: string[];
  concerns: string[];
}

/** Questionnaire submission */
export interface CluesIntelligenceQuestionnaireSubmission {
  moduleId: string;
  answers: Record<string, unknown>;
}

/** Questionnaire submission result */
export interface CluesIntelligenceQuestionnaireResult {
  success: boolean;
  clientId: string;
  moduleId: string;
  answersAccepted: number;
  answersRejected: number;
  errors?: string[];
  progress?: {
    moduleProgress: number;
    overallProgress: number;
  };
}

/** Client deliverable */
export interface CluesIntelligenceDeliverable {
  id: string;
  clientId: string;
  type: "report" | "presentation" | "comparison" | "summary" | "custom";
  title: string;
  status: "pending" | "generating" | "ready" | "expired";
  url?: string;
  generatedAt?: string;
  expiresAt?: string;
}

/** Analysis trigger request */
export interface CluesIntelligenceAnalysisRequest {
  clientId: string;
  analysisType: "relocation_match" | "cost_comparison" | "lifestyle_fit" | "risk_assessment" | "full_evaluation";
  parameters?: Record<string, unknown>;
}

/** Analysis trigger result */
export interface CluesIntelligenceAnalysisResult {
  success: boolean;
  analysisId: string;
  clientId: string;
  analysisType: string;
  status: "queued" | "running" | "complete" | "failed";
  estimatedDurationMs?: number;
  resultUrl?: string;
}

/** Paginated list wrapper */
export interface CluesIntelligencePaginatedList<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/** Error response payload from CLUES Intelligence */
export interface CluesIntelligenceErrorPayload {
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
  health: "/api/internal/health",
  clients: "/api/internal/clients",
  relocations: "/api/internal/relocations",
  analysis: "/api/internal/analysis",
} as const;

function getClientEndpoint(clientId: string) {
  return `${ENDPOINTS.clients}/${encodeURIComponent(clientId)}`;
}

function getClientWorkflowEndpoint(clientId: string) {
  return `${getClientEndpoint(clientId)}/workflow`;
}

function getClientQuestionnaireEndpoint(clientId: string) {
  return `${getClientEndpoint(clientId)}/questionnaire`;
}

function getClientDeliverablesEndpoint(clientId: string) {
  return `${getClientEndpoint(clientId)}/deliverables`;
}

function getRelocationReportEndpoint(relocationId: string) {
  return `${ENDPOINTS.relocations}/${encodeURIComponent(relocationId)}/report`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class CluesIntelligenceAdapterError extends Error {
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
    this.name = "CluesIntelligenceAdapterError";
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
    baseUrl: env.CLUES_INTELLIGENCE_BASE_URL,
    apiKey: env.CLUES_INTELLIGENCE_API_KEY,
  };
}

/** Check if the adapter has both base URL and API key configured. */
export function isCluesIntelligenceConfigured(): boolean {
  const { baseUrl, apiKey } = getAdapterConfig();
  return Boolean(baseUrl && apiKey);
}

function assertConfigured() {
  const { baseUrl, apiKey } = getAdapterConfig();

  if (!baseUrl || !apiKey) {
    throw new CluesIntelligenceAdapterError({
      code: "CLUES_INTELLIGENCE_NOT_CONFIGURED",
      message:
        "CLUES Intelligence base URL and API key must both be configured before the adapter can be used.",
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
    const errorPayload = payload as CluesIntelligenceErrorPayload;
    return new CluesIntelligenceAdapterError({
      code: errorPayload.error.code || "CLUES_INTELLIGENCE_REQUEST_FAILED",
      message: errorPayload.error.message || fallbackMessage,
      status,
      retryable: Boolean(errorPayload.error.retryable),
      details: errorPayload.error.details ?? [],
    });
  }

  return new CluesIntelligenceAdapterError({
    code: "CLUES_INTELLIGENCE_REQUEST_FAILED",
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
      `CLUES Intelligence adapter request failed with HTTP ${response.status}.`,
    );
  }

  return payload as T;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPED ENDPOINT METHODS
// ═══════════════════════════════════════════════════════════════════════════════

/** Health check — GET /api/internal/health */
export async function getCluesIntelligenceHealth() {
  return request<CluesIntelligenceHealthSnapshot>(ENDPOINTS.health);
}

/** Get client profile — GET /api/internal/clients/:id */
export async function getClientProfile(clientId: string) {
  return request<CluesIntelligenceClientProfile>(getClientEndpoint(clientId));
}

/** Get client workflow state — GET /api/internal/clients/:id/workflow */
export async function getClientWorkflow(clientId: string) {
  return request<CluesIntelligenceWorkflowState>(
    getClientWorkflowEndpoint(clientId),
  );
}

/** List relocations — GET /api/internal/relocations */
export async function listRelocations(
  query: CluesIntelligenceRelocationsQuery = {},
) {
  return request<CluesIntelligencePaginatedList<CluesIntelligenceRelocation>>(
    ENDPOINTS.relocations,
    {
      query: {
        clientId: query.clientId,
        status: query.status,
        limit: query.limit,
        offset: query.offset,
      },
    },
  );
}

/** Get relocation report — GET /api/internal/relocations/:id/report */
export async function getRelocationReport(relocationId: string) {
  return request<CluesIntelligenceRelocationReport>(
    getRelocationReportEndpoint(relocationId),
  );
}

/** Submit questionnaire answers — POST /api/internal/clients/:id/questionnaire */
export async function submitQuestionnaire(
  clientId: string,
  submission: CluesIntelligenceQuestionnaireSubmission,
) {
  return request<CluesIntelligenceQuestionnaireResult>(
    getClientQuestionnaireEndpoint(clientId),
    {
      method: "POST",
      body: submission,
      idempotencyKey: randomUUID(),
    },
  );
}

/** Get client deliverables — GET /api/internal/clients/:id/deliverables */
export async function getDeliverables(clientId: string) {
  return request<CluesIntelligencePaginatedList<CluesIntelligenceDeliverable>>(
    getClientDeliverablesEndpoint(clientId),
  );
}

/** Trigger analysis — POST /api/internal/analysis */
export async function triggerAnalysis(
  analysisRequest: CluesIntelligenceAnalysisRequest,
) {
  return request<CluesIntelligenceAnalysisResult>(ENDPOINTS.analysis, {
    method: "POST",
    body: analysisRequest,
    idempotencyKey: randomUUID(),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export interface CluesIntelligenceAdapter {
  getHealth: typeof getCluesIntelligenceHealth;
  getClientProfile: typeof getClientProfile;
  getClientWorkflow: typeof getClientWorkflow;
  listRelocations: typeof listRelocations;
  getRelocationReport: typeof getRelocationReport;
  submitQuestionnaire: typeof submitQuestionnaire;
  getDeliverables: typeof getDeliverables;
  triggerAnalysis: typeof triggerAnalysis;
}

let cachedAdapter: CluesIntelligenceAdapter | null | undefined;

/**
 * Singleton factory. Returns the adapter if configured, or null if
 * CLUES_INTELLIGENCE_BASE_URL / CLUES_INTELLIGENCE_API_KEY are missing.
 */
export function getCluesIntelligenceAdapter(): CluesIntelligenceAdapter | null {
  if (cachedAdapter !== undefined) return cachedAdapter;

  if (!isCluesIntelligenceConfigured()) {
    cachedAdapter = null;
    return null;
  }

  cachedAdapter = {
    getHealth: getCluesIntelligenceHealth,
    getClientProfile,
    getClientWorkflow,
    listRelocations,
    getRelocationReport,
    submitQuestionnaire,
    getDeliverables,
    triggerAnalysis,
  };

  return cachedAdapter;
}
