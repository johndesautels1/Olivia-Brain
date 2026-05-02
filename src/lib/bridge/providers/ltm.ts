/**
 * LtmKnowledgeProvider — Universal Knowledge Provider for the London Tech Map
 *
 * Implements the {@link UniversalKnowledgeProvider} contract against the LTM
 * public v1 API surface (`<CLUES_LONDON_BASE_URL>/api/v1/*`). LTM is
 * read-only from this repo: this provider issues HTTPS GETs only, and
 * never modifies LTM state.
 *
 * ## Reliability guarantees
 *
 * - **Bounded latency.** Every HTTP call carries an
 *   {@link AbortSignal.timeout} ({@link QUERY_TIMEOUT_MS}). On timeout the
 *   provider returns a structured {@link QueryResult} with `success: false`
 *   and a `timed out` phrase in the summary; it never hangs the caller.
 * - **Observable.** Every `data.query` call opens an OTel span via
 *   {@link withTraceSpan}. Span attributes carry the intent and HTTP
 *   outcome. The user's NL query string is never written to spans or
 *   logs — only the classified intent and request-shape metadata.
 * - **Degrades gracefully.** When `CLUES_LONDON_BASE_URL` /
 *   `CLUES_LONDON_V1_API_KEY` are unset the provider drops into a
 *   vocabulary-only mode: it still registers, still healthchecks `true`,
 *   and returns clean "not configured" results from `data.query`.
 * - **Typed errors.** Non-2xx responses are converted into
 *   {@link LtmKnowledgeError}; the provider never throws to the registry,
 *   it always converts to a structured `QueryResult`.
 *
 * ## What this provider answers
 *
 * | Intent         | LTM endpoint                          | NL trigger keywords                |
 * | -------------- | ------------------------------------- | ---------------------------------- |
 * | organizations  | GET /api/v1/organizations             | organisation, organization, company, startup, sector |
 * | districts      | GET /api/v1/districts                 | district, borough, neighbourhood, area |
 *
 * ## What this provider does NOT answer
 *
 * - People, events, funding rounds, programs — those v1 endpoints are not
 *   yet exposed by LTM and adding them requires LTM-side work which is
 *   out of scope for this repo (LTM is read-only).
 * - Olivia conversations / memory — that is `OliviaSelfProvider`.
 * - Real-time tools / actions — exposed via `lib/tools` and the agent
 *   runner, not the bridge.
 *
 * ## Auth contract
 *
 * - HTTP header: `Authorization: Bearer ${CLUES_LONDON_V1_API_KEY}`.
 * - LTM-side env var holding the accepted keys: `LTCI_API_KEYS` (plural,
 *   comma-separated). Per LTM `src/lib/api-key.ts`. This repo only needs
 *   one of those keys; the LTM operator manages the list.
 * - Rate limit on the LTM side: 60 req / minute per IP. The provider
 *   surfaces 429 cleanly as a `QueryResult` failure.
 *
 * ## Testing
 *
 * Inject a custom fetch via the constructor (`new LtmKnowledgeProvider({
 * fetch: mockFetch })`) or pass `null` to either `baseUrl` / `apiKey` to
 * exercise the unconfigured path. See `__tests__/ltm.test.ts`.
 */

import { randomUUID } from "crypto";

import { getServerEnv } from "@/lib/config/env";
import { withTraceSpan } from "@/lib/observability/tracer";
import type {
  ActionResult,
  AnswerResult,
  AppEvent,
  AppResults,
  EventCallback,
  Flow,
  FlowState,
  GeneratedOutput,
  NaturalLanguageQuery,
  OutputType,
  ProviderMetadata,
  QueryContext,
  QueryResult,
  QuestionProgress,
  TermDefinition,
  UKPAction,
  UKPQuestion,
  UniversalKnowledgeProvider,
  UserData,
} from "../types";

/* ─── Constants ──────────────────────────────────────────────────────────── */

const APP_ID = "ltm-london-tech-map";
const APP_NAME = "London Tech Map";
const APP_VERSION = "0.1.0";
const DOMAIN = "ltm";

const CONSUMER_APP_ID = "olivia-brain";

/** Per-query HTTP timeout. LTM cold paths can be slow; 15s is the calendar adapter's value too. */
const QUERY_TIMEOUT_MS = 15_000;
/** Healthcheck timeout. Tighter to fail fast in registry probes. */
const HEALTHCHECK_TIMEOUT_MS = 5_000;
/** Hard cap on row count regardless of caller-supplied limit. */
const MAX_LIMIT = 200;
/** Default row count when caller does not specify. */
const DEFAULT_LIMIT = 25;

const VOCABULARY: ReadonlyArray<TermDefinition> = Object.freeze([
  {
    term: "organisation",
    definition:
      "A company, accelerator, VC fund, programme, or other operating entity " +
      "tracked in the London Tech Map. Carries sector, type, employee range, " +
      "funding stage, and a district location.",
    synonyms: ["organization", "company", "firm", "startup"],
    relatedTerms: ["sector", "fundingStage", "district"],
  },
  {
    term: "district",
    definition:
      "A named area of London (Shoreditch, Canary Wharf, etc.). Carries a " +
      "borough, lat/long, transport / healthcare / walkability scores, and " +
      "denormalised counts of organisations and events.",
    synonyms: ["neighbourhood", "area"],
    relatedTerms: ["borough", "transportScore"],
  },
  {
    term: "borough",
    definition:
      "A London local authority (Hackney, Tower Hamlets, etc.). One borough " +
      "contains many districts.",
  },
  {
    term: "sector",
    definition:
      "Primary industry sector of an organisation (e.g. AI, FinTech, " +
      "ClimateTech). Used as a filter on the organisations endpoint.",
  },
  {
    term: "fundingStage",
    definition:
      "Capital-raising stage of an organisation (Pre-Seed, Seed, Series A/B/C, " +
      "Growth, Public, Acquired). Surfaced in organisation listings.",
  },
]);

/* ─── Intent classification ──────────────────────────────────────────────── */

/** Discrete intents this provider can answer. */
type LtmIntent = "organizations" | "districts" | "unknown";

/**
 * Classify an NL query into a discrete intent.
 *
 * v1 — regex-based, deterministic, English-only. Same TODO as
 * OliviaSelfProvider: replace with an LLM-routed classifier in week 2.
 */
function classifyIntent(query: string): LtmIntent {
  const lower = query.toLowerCase();
  if (
    /\b(organi[sz]ations?|compan(?:y|ies)|startups?|firms?|funds?|vcs?|accelerators?|sectors?)\b/.test(
      lower,
    )
  ) {
    return "organizations";
  }
  if (
    /\b(districts?|boroughs?|neighbou?rhoods?|areas?|locations?)\b/.test(lower)
  ) {
    return "districts";
  }
  return "unknown";
}

/* ─── HTTP helpers ───────────────────────────────────────────────────────── */

/** Discriminated outcome of an HTTP call wrapped in {@link runHttpRequest}. */
type HttpOutcome<T> =
  | { readonly ok: true; readonly data: T; readonly status: number }
  | {
      readonly ok: false;
      readonly status: number | null;
      readonly timedOut: boolean;
      readonly reason: string;
    };

/**
 * Typed error class for LTM HTTP failures. Not thrown to the registry —
 * the provider converts these into structured `QueryResult` failures.
 * Preserved as a class so future consumers (cascade orchestrator, agent
 * runner) can pattern-match on the error type and on `retryable`.
 */
export class LtmKnowledgeError extends Error {
  readonly code: string;
  readonly status: number | null;
  readonly retryable: boolean;

  constructor(opts: {
    code: string;
    message: string;
    status: number | null;
    retryable?: boolean;
  }) {
    super(opts.message);
    this.name = "LtmKnowledgeError";
    this.code = opts.code;
    this.status = opts.status;
    this.retryable = opts.retryable ?? false;
  }
}

/** Optional fetch override for testing. Mirrors the global fetch signature. */
export type FetchLike = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

/** Configuration the provider was constructed with. Frozen at construction. */
interface ResolvedConfig {
  readonly baseUrl: string | null;
  readonly apiKey: string | null;
  readonly fetch: FetchLike;
}

/** Build the Authorization headers + observability headers for one request. */
function buildHeaders(apiKey: string, traceId: string): Headers {
  return new Headers({
    Accept: "application/json",
    Authorization: `Bearer ${apiKey}`,
    "x-olivia-app-id": CONSUMER_APP_ID,
    "x-olivia-trace-id": traceId,
  });
}

/** Categorise a thrown value as a timeout, abort, or generic failure. */
function classifyFailure(label: string, timeoutMs: number, err: unknown) {
  if (err instanceof DOMException && err.name === "AbortError") {
    return {
      status: null as number | null,
      timedOut: true,
      reason: `${label} timed out after ${timeoutMs}ms`,
    };
  }
  const message = err instanceof Error ? err.message : String(err);
  if (/abort/i.test(message)) {
    return {
      status: null,
      timedOut: true,
      reason: `${label} timed out after ${timeoutMs}ms`,
    };
  }
  return { status: null, timedOut: false, reason: `${label} threw: ${message}` };
}

/**
 * Run an HTTP GET against an LTM v1 endpoint. Always resolves; never throws.
 * Categorises failures (timeout, non-2xx, network error). On 2xx, parses
 * JSON and returns the body typed as `T`.
 */
async function runHttpRequest<T>(
  config: ResolvedConfig,
  label: string,
  pathname: string,
  query: Record<string, string | number | undefined>,
  timeoutMs: number,
): Promise<HttpOutcome<T>> {
  if (!config.baseUrl || !config.apiKey) {
    return {
      ok: false,
      status: null,
      timedOut: false,
      reason: `${label} unavailable: provider not configured`,
    };
  }

  const url = new URL(pathname, config.baseUrl);
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }

  const traceId = randomUUID();
  let response: Response;
  try {
    response = await config.fetch(url, {
      method: "GET",
      headers: buildHeaders(config.apiKey, traceId),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    return { ok: false, ...classifyFailure(label, timeoutMs, err) };
  }

  if (!response.ok) {
    let message = `${label} failed with HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { error?: string; message?: string };
      if (body.error) message = `${label} failed: ${body.error}`;
      else if (body.message) message = `${label} failed: ${body.message}`;
    } catch {
      // Body wasn't JSON — keep the generic message.
    }
    return {
      ok: false,
      status: response.status,
      timedOut: false,
      reason: message,
    };
  }

  try {
    const data = (await response.json()) as T;
    return { ok: true, data, status: response.status };
  } catch (err) {
    return {
      ok: false,
      status: response.status,
      timedOut: false,
      reason: `${label} returned invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/* ─── Wire-format types from LTM v1 ──────────────────────────────────────── */

/** Wire shape of one organisation row from `GET /api/v1/organizations`. */
export interface LtmOrganizationRow {
  id: string;
  name: string;
  slug: string;
  orgType: string | null;
  primarySector: string | null;
  descriptionShort: string | null;
  website: string | null;
  foundedYear: number | null;
  employeeRange: string | null;
  fundingStage: string | null;
  isFeatured: boolean;
  district: { name: string; slug: string } | null;
}

/** Wire shape of `GET /api/v1/organizations`. */
interface OrganizationsListResponse {
  data: LtmOrganizationRow[];
  total: number;
  limit: number;
  offset: number;
}

/** Wire shape of one district row from `GET /api/v1/districts`. */
export interface LtmDistrictRow {
  id: string;
  name: string;
  slug: string;
  borough: string | null;
  latitude: number | null;
  longitude: number | null;
  transportScore: number | null;
  healthcareScore: number | null;
  walkabilityScore: number | null;
  notes: string | null;
  organizationCount: number;
  eventCount: number;
}

/** Wire shape of `GET /api/v1/districts`. */
interface DistrictsListResponse {
  data: LtmDistrictRow[];
  total: number;
}

/* ─── LtmKnowledgeProvider ───────────────────────────────────────────────── */

/**
 * Universal Knowledge Provider for the London Tech Map domain (`ltm`).
 *
 * @see {@link UniversalKnowledgeProvider}
 */
export class LtmKnowledgeProvider implements UniversalKnowledgeProvider {
  /**
   * Identity and capability declaration. Frozen at construction.
   */
  readonly metadata: ProviderMetadata = {
    appId: APP_ID,
    appName: APP_NAME,
    version: APP_VERSION,
    domain: DOMAIN,
    capabilities: [
      {
        id: "ltm.organizations.list",
        name: "List organisations",
        description:
          "List LTM organisations with filters by sector, type, and district.",
        category: "data",
      },
      {
        id: "ltm.districts.list",
        name: "List districts",
        description:
          "List LTM districts with denormalised organisation/event counts.",
        category: "data",
      },
    ],
  };

  private readonly config: ResolvedConfig;
  private readonly subscribers = new Map<string, Set<EventCallback>>();

  /**
   * Construct a provider instance.
   *
   * @param opts.baseUrl
   *   Override `CLUES_LONDON_BASE_URL`. Pass `null` to force unconfigured
   *   mode (useful for tests).
   * @param opts.apiKey
   *   Override `CLUES_LONDON_V1_API_KEY`. Pass `null` to force unconfigured
   *   mode.
   * @param opts.fetch
   *   Override the global `fetch`. Useful for tests that need to
   *   intercept requests without spinning up a network listener.
   */
  constructor(opts?: {
    readonly baseUrl?: string | null;
    readonly apiKey?: string | null;
    readonly fetch?: FetchLike;
  }) {
    const env = opts ? null : getServerEnv();
    const baseUrl = opts && "baseUrl" in opts ? (opts.baseUrl ?? null) : (env?.CLUES_LONDON_BASE_URL ?? null);
    const apiKey = opts && "apiKey" in opts ? (opts.apiKey ?? null) : (env?.CLUES_LONDON_V1_API_KEY ?? null);
    this.config = Object.freeze({
      baseUrl,
      apiKey,
      fetch: opts?.fetch ?? ((input, init) => fetch(input, init)),
    });
  }

  /** Whether base URL + API key are both wired. */
  get isConfigured(): boolean {
    return this.config.baseUrl !== null && this.config.apiKey !== null;
  }

  /* ─── VOCABULARY ──────────────────────────────────────────────────────── */

  /** Domain vocabulary — terms LTM uses that Olivia should understand. */
  readonly vocabulary = {
    /** All terms in the vocabulary, in canonical order. */
    getTerms: (): TermDefinition[] => VOCABULARY.slice(),

    /**
     * Look up a definition by term. Case-insensitive; matches against
     * canonical term names AND their declared synonyms.
     */
    getExplanation: (term: string): string | undefined => {
      const lower = term.toLowerCase();
      const hit = VOCABULARY.find(
        (t) =>
          t.term.toLowerCase() === lower ||
          t.synonyms?.some((s) => s.toLowerCase() === lower),
      );
      return hit?.definition;
    },

    /** Synonyms for the canonical term name. Empty if unknown or none declared. */
    getAliases: (term: string): string[] => {
      const lower = term.toLowerCase();
      const hit = VOCABULARY.find((t) => t.term.toLowerCase() === lower);
      return hit?.synonyms ? [...hit.synonyms] : [];
    },
  };

  /* ─── FLOWS ───────────────────────────────────────────────────────────── */

  /** Conversation flows. LTM exposes none through the bridge. */
  readonly flows = {
    getFlows: (): Flow[] => [],
    getFlowState: async (
      _userId: string,
      _flowId: string,
    ): Promise<FlowState | null> => null,
    advanceFlow: async (
      _userId: string,
      _flowId: string,
      _input: unknown,
    ): Promise<FlowState> => {
      throw new Error(`${APP_NAME} does not expose flows.`);
    },
  };

  /* ─── QUESTIONS ───────────────────────────────────────────────────────── */

  /** Questionnaire surface. LTM exposes none through the bridge. */
  readonly questions = {
    getNextQuestions: async (
      _userId: string,
      _context?: QueryContext,
    ): Promise<UKPQuestion[]> => [],

    submitAnswer: async (
      _userId: string,
      questionId: string,
      _answer: unknown,
    ): Promise<AnswerResult> => ({
      success: false,
      questionId,
      error: `${APP_NAME} does not expose questions.`,
    }),

    getProgress: async (_userId: string): Promise<QuestionProgress> => ({
      totalQuestions: 0,
      answeredCount: 0,
      skippedCount: 0,
      percentage: 0,
      isComplete: true,
    }),
  };

  /* ─── DATA ────────────────────────────────────────────────────────────── */

  /** Data surface — the meat of this provider. */
  readonly data = {
    /**
     * Run a natural-language query against LTM's v1 API.
     *
     * Routes via {@link classifyIntent}. Wraps the dispatch in an OTel
     * span. Each HTTP call is bounded by {@link QUERY_TIMEOUT_MS} via
     * {@link AbortSignal.timeout}. The user's NL query string is never
     * written to the span or logs — only the classified intent and
     * structured filter metadata.
     */
    query: async (q: NaturalLanguageQuery): Promise<QueryResult> => {
      // Fast-path: degraded mode. No span — there is nothing observable.
      if (!this.isConfigured) {
        return {
          success: false,
          data: null,
          summary:
            "LTM provider is not configured (CLUES_LONDON_BASE_URL / CLUES_LONDON_V1_API_KEY missing).",
          confidence: 1.0,
        };
      }

      const intent = classifyIntent(q.query);
      const limit = Math.min(q.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
      const userId = q.context?.userId;

      return withTraceSpan(
        "olivia.bridge.LtmKnowledgeProvider.query",
        {
          "provider.id": APP_ID,
          "provider.domain": DOMAIN,
          "http.client": "ltm-v1",
          "query.intent": intent,
          "query.limit": limit,
          "query.user_scoped": Boolean(userId),
        },
        async () => {
          if (intent === "organizations") return this.queryOrganizations(limit);
          if (intent === "districts") return this.queryDistricts();
          return {
            success: false,
            data: null,
            summary:
              `LtmKnowledgeProvider does not know how to answer this query. ` +
              `It can answer questions about organisations and districts.`,
            confidence: 1.0,
          };
        },
      );
    },

    /**
     * Aggregate-shape user data is not meaningful for LTM — it is a
     * read-only public-data surface, not a per-user store. Always returns
     * `null`.
     */
    getUserData: async (_userId: string): Promise<UserData | null> => null,

    /** LTM does not produce per-user recommendations through the bridge. */
    getResults: async (_userId: string): Promise<AppResults | null> => null,
  };

  /* ─── ACTIONS ─────────────────────────────────────────────────────────── */

  /**
   * LTM is read-only via this bridge — all writes happen inside the LTM
   * app itself.
   */
  readonly actions = {
    getActions: (): UKPAction[] => [],
    executeAction: async (
      actionId: string,
      _params: Record<string, unknown>,
    ): Promise<ActionResult> => ({
      success: false,
      actionId,
      error: `${APP_NAME} does not expose actions through the bridge.`,
    }),
  };

  /* ─── OUTPUTS ─────────────────────────────────────────────────────────── */

  /** LTM artifact rendering happens inside LTM itself; not exposed here. */
  readonly outputs = {
    getOutputTypes: (): OutputType[] => [],
    generateOutput: async (
      _userId: string,
      typeId: string,
      _params?: Record<string, unknown>,
    ): Promise<GeneratedOutput> => ({
      success: false,
      outputType: typeId,
      error: `${APP_NAME} does not generate outputs through the bridge.`,
    }),
  };

  /* ─── EVENTS ──────────────────────────────────────────────────────────── */

  /**
   * In-process event bus. LTM does not push events into Olivia today, so
   * this bus is currently a placeholder for future server-sent-events or
   * webhook fan-out. Subscriber-error isolation matches OliviaSelfProvider.
   */
  readonly events = {
    subscribe: (eventType: string, callback: EventCallback): void => {
      const set = this.subscribers.get(eventType) ?? new Set<EventCallback>();
      set.add(callback);
      this.subscribers.set(eventType, set);
    },

    unsubscribe: (eventType: string): void => {
      this.subscribers.delete(eventType);
    },
  };

  /** Publish an event to all subscribers. Errors in subscribers are logged but isolated. */
  publish(event: AppEvent): void {
    const subs = this.subscribers.get(event.type);
    if (!subs || subs.size === 0) return;
    for (const cb of subs) {
      try {
        cb(event);
      } catch (err) {
        console.error(
          `[LtmKnowledgeProvider] subscriber threw on ${event.type}:`,
          err,
        );
      }
    }
  }

  /* ─── LIFECYCLE ───────────────────────────────────────────────────────── */

  /**
   * Lightweight liveness probe.
   *
   * - Unconfigured mode: always healthy (registry should not drop the
   *   provider just because env is unset; it serves vocabulary).
   * - Configured mode: pings `/api/v1/districts` under
   *   {@link HEALTHCHECK_TIMEOUT_MS}. Returns `false` on timeout, network
   *   error, or any non-2xx response.
   */
  async healthCheck(): Promise<boolean> {
    if (!this.isConfigured) return true;
    const outcome = await runHttpRequest<DistrictsListResponse>(
      this.config,
      "healthCheck.districts",
      "/api/v1/districts",
      {},
      HEALTHCHECK_TIMEOUT_MS,
    );
    return outcome.ok;
  }

  /* ─── INTERNAL ────────────────────────────────────────────────────────── */

  private async queryOrganizations(limit: number): Promise<QueryResult> {
    const outcome = await runHttpRequest<OrganizationsListResponse>(
      this.config,
      "organizations.list",
      "/api/v1/organizations",
      { limit },
      QUERY_TIMEOUT_MS,
    );
    if (!outcome.ok) {
      return { success: false, data: null, summary: outcome.reason };
    }
    const { data, total } = outcome.data;
    return {
      success: true,
      data,
      summary:
        data.length === 0
          ? "No organisations matched."
          : `Found ${data.length} organisation${data.length === 1 ? "" : "s"}` +
            (total > data.length ? ` (of ${total} total).` : "."),
      confidence: 0.9,
    };
  }

  private async queryDistricts(): Promise<QueryResult> {
    const outcome = await runHttpRequest<DistrictsListResponse>(
      this.config,
      "districts.list",
      "/api/v1/districts",
      {},
      QUERY_TIMEOUT_MS,
    );
    if (!outcome.ok) {
      return { success: false, data: null, summary: outcome.reason };
    }
    const { data, total } = outcome.data;
    return {
      success: true,
      data,
      summary:
        data.length === 0
          ? "No districts on record."
          : `Returned ${total} district${total === 1 ? "" : "s"}.`,
      confidence: 0.95,
    };
  }
}
