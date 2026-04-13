/**
 * LifeScore Module Apps — Individual Module Adapter
 *
 * Sprint 4.6 Item 4 — Per-module adapter for the 23 freestanding LifeScore
 * assessment modules. Each module covers ~100 questions across a life dimension.
 * One generic adapter handles all modules via module ID routing.
 *
 * 6 Tiers / 23 Modules:
 *   Survival (3):       safety_security, health_wellness, climate_weather
 *   Foundation (4):     legal_immigration, financial_banking, housing_property, professional_career
 *   Infrastructure (4): technology_connectivity, transportation_mobility, education_learning, social_values_governance
 *   Lifestyle (4):      food_dining, shopping_services, outdoor_recreation, entertainment_nightlife
 *   Connection (3):     family_children, neighborhood_urban_design, environment_community_appearance
 *   Identity (5):       religion_spirituality, sexual_beliefs_practices_laws, arts_culture, cultural_heritage_traditions, pets_animals
 *
 * No new env vars — reuses CLUES_LIFESCORE_BASE_URL + CLUES_LIFESCORE_INTERNAL_API_KEY from Item 3.
 * Endpoint namespace: /api/internal/olivia/modules/*
 */

import { randomUUID } from "crypto";

import { getServerEnv } from "@/lib/config/env";

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export type LifeScoreModuleTier =
  | "survival"
  | "foundation"
  | "infrastructure"
  | "lifestyle"
  | "connection"
  | "identity";

export interface LifeScoreModuleRegistryEntry {
  id: string;
  name: string;
  shortName: string;
  tier: LifeScoreModuleTier;
  tierOrder: number;
  description: string;
  questionCount: number;
}

export const LIFESCORE_MODULE_REGISTRY: LifeScoreModuleRegistryEntry[] = [
  // TIER 1: SURVIVAL — Can I survive here?
  { id: "safety_security", name: "Safety & Security", shortName: "Safety", tier: "survival", tierOrder: 1, description: "Crime rates, political stability, emergency services, and personal safety", questionCount: 100 },
  { id: "health_wellness", name: "Health & Wellness", shortName: "Health", tier: "survival", tierOrder: 2, description: "Healthcare system quality, medical access, wellness infrastructure", questionCount: 100 },
  { id: "climate_weather", name: "Climate & Weather", shortName: "Climate", tier: "survival", tierOrder: 3, description: "Temperature, humidity, sunshine, natural disasters, air quality, and seasons", questionCount: 100 },

  // TIER 2: FOUNDATION — Can I legally/financially exist here?
  { id: "legal_immigration", name: "Legal & Immigration", shortName: "Legal", tier: "foundation", tierOrder: 1, description: "Visa pathways, residency programs, rule of law, and legal system", questionCount: 100 },
  { id: "financial_banking", name: "Financial & Banking", shortName: "Finance", tier: "foundation", tierOrder: 2, description: "Banking access, tax structure, cost of living, and financial services", questionCount: 100 },
  { id: "housing_property", name: "Housing & Property Preferences", shortName: "Housing", tier: "foundation", tierOrder: 3, description: "Cost, availability, types, rental/purchase options, and neighborhoods", questionCount: 100 },
  { id: "professional_career", name: "Professional & Career Development", shortName: "Career", tier: "foundation", tierOrder: 4, description: "Job market, remote work infrastructure, entrepreneurship, coworking", questionCount: 100 },

  // TIER 3: INFRASTRUCTURE — Can I function daily here?
  { id: "technology_connectivity", name: "Technology & Connectivity", shortName: "Tech", tier: "infrastructure", tierOrder: 1, description: "Internet speed, tech ecosystem, digital infrastructure, and innovation", questionCount: 100 },
  { id: "transportation_mobility", name: "Transportation & Mobility", shortName: "Transport", tier: "infrastructure", tierOrder: 2, description: "Transit systems, walkability, car dependency, rail networks, and airports", questionCount: 100 },
  { id: "education_learning", name: "Education & Learning", shortName: "Education", tier: "infrastructure", tierOrder: 3, description: "Schools, universities, continuing education, and learning culture", questionCount: 100 },
  { id: "social_values_governance", name: "Social Values & Governance", shortName: "Values", tier: "infrastructure", tierOrder: 4, description: "Political freedom, social tolerance, civic engagement, personal liberty", questionCount: 100 },

  // TIER 4: LIFESTYLE — Can I enjoy life here?
  { id: "food_dining", name: "Food & Dining", shortName: "Food", tier: "lifestyle", tierOrder: 1, description: "Restaurant scene, grocery access, dietary options, and food culture", questionCount: 100 },
  { id: "shopping_services", name: "Shopping & Services", shortName: "Shopping", tier: "lifestyle", tierOrder: 2, description: "Retail, convenience, international products, delivery services", questionCount: 100 },
  { id: "outdoor_recreation", name: "Outdoor & Recreation", shortName: "Outdoors", tier: "lifestyle", tierOrder: 3, description: "Parks, hiking, sports facilities, beaches, and nature access", questionCount: 100 },
  { id: "entertainment_nightlife", name: "Entertainment & Nightlife", shortName: "Entertainment", tier: "lifestyle", tierOrder: 4, description: "Venues, events, concerts, nightlife, and cultural programming", questionCount: 100 },

  // TIER 5: CONNECTION — Can I build a life here?
  { id: "family_children", name: "Family & Children", shortName: "Family", tier: "connection", tierOrder: 1, description: "Family services, child safety, schools, pediatric care", questionCount: 100 },
  { id: "neighborhood_urban_design", name: "Neighborhood & Urban Design", shortName: "Neighborhood", tier: "connection", tierOrder: 2, description: "Street-level livability, walkability, public spaces, urban planning", questionCount: 100 },
  { id: "environment_community_appearance", name: "Environment & Community Appearance", shortName: "Environment", tier: "connection", tierOrder: 3, description: "Cleanliness, green space, aesthetic quality, environmental standards", questionCount: 100 },

  // TIER 6: IDENTITY — Can I be myself here?
  { id: "religion_spirituality", name: "Religion & Spirituality", shortName: "Spiritual", tier: "identity", tierOrder: 1, description: "Places of worship, religious tolerance, and spiritual communities", questionCount: 100 },
  { id: "sexual_beliefs_practices_laws", name: "Sexual Beliefs, Practices & Laws", shortName: "Sexual Freedom", tier: "identity", tierOrder: 2, description: "LGBTQ+ rights, personal freedom, legal protections, social acceptance", questionCount: 100 },
  { id: "arts_culture", name: "Arts & Culture", shortName: "Arts", tier: "identity", tierOrder: 3, description: "Museums, galleries, creative communities, and intellectual life", questionCount: 100 },
  { id: "cultural_heritage_traditions", name: "Cultural Heritage & Traditions", shortName: "Heritage", tier: "identity", tierOrder: 4, description: "Local customs, integration expectations, belonging, cultural identity", questionCount: 100 },
  { id: "pets_animals", name: "Pets & Animals", shortName: "Pets", tier: "identity", tierOrder: 5, description: "Pet-friendly policies, veterinary care, animal welfare, and pet housing", questionCount: 100 },
];

export const LIFESCORE_MODULE_MAP: Record<string, LifeScoreModuleRegistryEntry> =
  LIFESCORE_MODULE_REGISTRY.reduce(
    (acc, mod) => ({ ...acc, [mod.id]: mod }),
    {} as Record<string, LifeScoreModuleRegistryEntry>,
  );

export const VALID_MODULE_IDS = new Set(LIFESCORE_MODULE_REGISTRY.map((m) => m.id));

// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Module info/metadata from the platform */
export interface LifeScoreModuleInfo {
  moduleId: string;
  name: string;
  shortName: string;
  tier: LifeScoreModuleTier;
  description: string;
  questionCount: number;
  isAvailable: boolean;
  version: string;
  lastUpdatedAt: string;
}

/** Question from a module */
export interface LifeScoreModuleQuestion {
  id: string;
  moduleId: string;
  sectionId?: string;
  index: number;
  text: string;
  description?: string;
  type: "single-select" | "multi-select" | "slider" | "range" | "yes-no" | "text" | "ranking" | "likert" | "dealbreaker";
  options?: Array<{ value: string; label: string; description?: string }>;
  validation?: {
    required?: boolean;
    minValue?: number;
    maxValue?: number;
    minLength?: number;
    maxLength?: number;
  };
  dependsOn?: string[];
  preFillable?: boolean;
  preFillValue?: unknown;
}

/** Questions response */
export interface LifeScoreModuleQuestionsResponse {
  moduleId: string;
  userId: string;
  questions: LifeScoreModuleQuestion[];
  totalRemaining: number;
  batchSize: number;
}

/** Answer submission */
export interface LifeScoreModuleAnswerSubmission {
  questionId: string;
  answer: unknown;
}

/** Answer result */
export interface LifeScoreModuleAnswerResult {
  success: boolean;
  moduleId: string;
  questionId: string;
  accepted: boolean;
  error?: string;
  effects?: Array<{
    type: "skip_question" | "unlock_module" | "update_score" | "trigger_flow";
    target: string;
    details?: Record<string, unknown>;
  }>;
  progress: {
    answered: number;
    total: number;
    percentage: number;
  };
}

/** Module progress */
export interface LifeScoreModuleProgress {
  moduleId: string;
  userId: string;
  answered: number;
  total: number;
  skipped: number;
  percentage: number;
  isComplete: boolean;
  confidence: number;
  marginOfError: number;
  startedAt?: string;
  lastAnsweredAt?: string;
}

/** Module score */
export interface LifeScoreModuleScoreResult {
  moduleId: string;
  userId: string;
  score: number;
  tier: "red" | "orange" | "yellow" | "blue" | "green";
  confidence: number;
  dimensionBreakdown: Array<{
    dimensionId: string;
    dimensionName: string;
    score: number;
    weight: number;
  }>;
  isComplete: boolean;
  calculatedAt: string;
}

/** Module reset result */
export interface LifeScoreModuleResetResult {
  success: boolean;
  moduleId: string;
  userId: string;
  answersCleared: number;
  resetAt: string;
}

/** All modules list response */
export interface LifeScoreModulesListResponse {
  modules: Array<LifeScoreModuleInfo & {
    userProgress?: {
      answered: number;
      total: number;
      percentage: number;
      isComplete: boolean;
      score?: number;
    };
  }>;
  totalModules: number;
  completedModules: number;
}

/** Error response payload */
export interface LifeScoreModuleErrorPayload {
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
  modules: "/api/internal/olivia/modules",
} as const;

function getModuleEndpoint(moduleId: string) {
  return `${ENDPOINTS.modules}/${encodeURIComponent(moduleId)}`;
}

function getModuleQuestionsEndpoint(moduleId: string) {
  return `${getModuleEndpoint(moduleId)}/questions`;
}

function getModuleAnswersEndpoint(moduleId: string) {
  return `${getModuleEndpoint(moduleId)}/answers`;
}

function getModuleProgressEndpoint(moduleId: string) {
  return `${getModuleEndpoint(moduleId)}/progress`;
}

function getModuleScoreEndpoint(moduleId: string) {
  return `${getModuleEndpoint(moduleId)}/score`;
}

function getModuleResetEndpoint(moduleId: string) {
  return `${getModuleEndpoint(moduleId)}/reset`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class LifeScoreModuleAdapterError extends Error {
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
    this.name = "LifeScoreModuleAdapterError";
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
export function isLifeScoreModulesConfigured(): boolean {
  const { baseUrl, apiKey } = getAdapterConfig();
  return Boolean(baseUrl && apiKey);
}

function assertConfigured() {
  const { baseUrl, apiKey } = getAdapterConfig();

  if (!baseUrl || !apiKey) {
    throw new LifeScoreModuleAdapterError({
      code: "LIFESCORE_MODULES_NOT_CONFIGURED",
      message:
        "CLUES LifeScore base URL and internal API key must both be configured before the module adapter can be used.",
      status: 503,
    });
  }

  return { baseUrl, apiKey };
}

function assertValidModuleId(moduleId: string) {
  if (!VALID_MODULE_IDS.has(moduleId)) {
    throw new LifeScoreModuleAdapterError({
      code: "INVALID_MODULE_ID",
      message: `Unknown LifeScore module ID "${moduleId}". Expected one of the 23 registered modules.`,
      status: 400,
      details: [`Valid module IDs: ${[...VALID_MODULE_IDS].join(", ")}`],
    });
  }
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
    const errorPayload = payload as LifeScoreModuleErrorPayload;
    return new LifeScoreModuleAdapterError({
      code: errorPayload.error.code || "LIFESCORE_MODULE_REQUEST_FAILED",
      message: errorPayload.error.message || fallbackMessage,
      status,
      retryable: Boolean(errorPayload.error.retryable),
      details: errorPayload.error.details ?? [],
    });
  }

  return new LifeScoreModuleAdapterError({
    code: "LIFESCORE_MODULE_REQUEST_FAILED",
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
      `LifeScore module adapter request failed with HTTP ${response.status}.`,
    );
  }

  return payload as T;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPED ENDPOINT METHODS
// ═══════════════════════════════════════════════════════════════════════════════

/** List all 23 modules with optional user progress — GET /api/internal/olivia/modules */
export async function listAllModules(userId?: string) {
  return request<LifeScoreModulesListResponse>(ENDPOINTS.modules, {
    query: { userId },
  });
}

/** Get module info/metadata — GET /api/internal/olivia/modules/:id */
export async function getModuleInfo(moduleId: string) {
  assertValidModuleId(moduleId);
  return request<LifeScoreModuleInfo>(getModuleEndpoint(moduleId));
}

/** Get next questions for user — GET /api/internal/olivia/modules/:id/questions */
export async function getModuleQuestions(moduleId: string, userId: string) {
  assertValidModuleId(moduleId);
  return request<LifeScoreModuleQuestionsResponse>(
    getModuleQuestionsEndpoint(moduleId),
    { query: { userId } },
  );
}

/** Submit a single answer — POST /api/internal/olivia/modules/:id/answers */
export async function submitModuleAnswer(
  moduleId: string,
  userId: string,
  submission: LifeScoreModuleAnswerSubmission,
) {
  assertValidModuleId(moduleId);
  return request<LifeScoreModuleAnswerResult>(
    getModuleAnswersEndpoint(moduleId),
    {
      method: "POST",
      body: { userId, ...submission },
      idempotencyKey: randomUUID(),
    },
  );
}

/** Get user's progress in a module — GET /api/internal/olivia/modules/:id/progress */
export async function getModuleProgress(moduleId: string, userId: string) {
  assertValidModuleId(moduleId);
  return request<LifeScoreModuleProgress>(
    getModuleProgressEndpoint(moduleId),
    { query: { userId } },
  );
}

/** Get module score result — GET /api/internal/olivia/modules/:id/score */
export async function getModuleScore(moduleId: string, userId: string) {
  assertValidModuleId(moduleId);
  return request<LifeScoreModuleScoreResult>(
    getModuleScoreEndpoint(moduleId),
    { query: { userId } },
  );
}

/** Reset module progress — POST /api/internal/olivia/modules/:id/reset */
export async function resetModule(moduleId: string, userId: string) {
  assertValidModuleId(moduleId);
  return request<LifeScoreModuleResetResult>(
    getModuleResetEndpoint(moduleId),
    {
      method: "POST",
      body: { userId },
      idempotencyKey: randomUUID(),
    },
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: GET MODULES BY TIER
// ═══════════════════════════════════════════════════════════════════════════════

/** Get all module registry entries for a given tier. */
export function getModulesByTier(tier: LifeScoreModuleTier): LifeScoreModuleRegistryEntry[] {
  return LIFESCORE_MODULE_REGISTRY.filter((m) => m.tier === tier);
}

/** Get the tier for a given module ID. */
export function getModuleTier(moduleId: string): LifeScoreModuleTier | undefined {
  return LIFESCORE_MODULE_MAP[moduleId]?.tier;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export interface LifeScoreModulesAdapter {
  listAllModules: typeof listAllModules;
  getModuleInfo: typeof getModuleInfo;
  getModuleQuestions: typeof getModuleQuestions;
  submitModuleAnswer: typeof submitModuleAnswer;
  getModuleProgress: typeof getModuleProgress;
  getModuleScore: typeof getModuleScore;
  resetModule: typeof resetModule;
  /** Local helpers (no HTTP) */
  getModulesByTier: typeof getModulesByTier;
  getModuleTier: typeof getModuleTier;
  registry: typeof LIFESCORE_MODULE_REGISTRY;
  moduleMap: typeof LIFESCORE_MODULE_MAP;
}

let cachedAdapter: LifeScoreModulesAdapter | null | undefined;

/**
 * Singleton factory. Returns the adapter if configured, or null if
 * CLUES_LIFESCORE_BASE_URL / CLUES_LIFESCORE_INTERNAL_API_KEY are missing.
 */
export function getLifeScoreModulesAdapter(): LifeScoreModulesAdapter | null {
  if (cachedAdapter !== undefined) return cachedAdapter;

  if (!isLifeScoreModulesConfigured()) {
    cachedAdapter = null;
    return null;
  }

  cachedAdapter = {
    listAllModules,
    getModuleInfo,
    getModuleQuestions,
    submitModuleAnswer,
    getModuleProgress,
    getModuleScore,
    resetModule,
    getModulesByTier,
    getModuleTier,
    registry: LIFESCORE_MODULE_REGISTRY,
    moduleMap: LIFESCORE_MODULE_MAP,
  };

  return cachedAdapter;
}
