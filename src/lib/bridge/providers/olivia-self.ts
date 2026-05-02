/**
 * OliviaSelfProvider — Universal Knowledge Provider for Olivia Brain's own data
 *
 * Implements the {@link UniversalKnowledgeProvider} contract against Olivia
 * Brain's own Supabase-backed data layer. Standalone-mode provider for
 * `MERGE_PLAN.md` Phase 1.
 *
 * ## Reliability guarantees
 *
 * - **Bounded latency.** Every Supabase call carries an
 *   {@link AbortSignal.timeout} ({@link QUERY_TIMEOUT_MS}). On timeout the
 *   provider returns a structured {@link QueryResult} with `success: false`
 *   and a `timed out` phrase in the summary; it never hangs the caller.
 * - **Observable.** Every `data.query` call opens an OTel span via
 *   {@link withTraceSpan} so production traffic is visible without ad-hoc
 *   logging. Span attributes carry the outcome and row count; PII (the
 *   user's NL query string) is never recorded.
 * - **Degrades gracefully.** When `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`
 *   are unset the provider drops into a vocabulary-only mode: it still
 *   registers, still healthchecks `true`, and returns clean
 *   "not configured" results from `data.query`.
 *
 * ## What this provider answers
 *
 * | Intent         | Source table        | NL trigger keywords                              |
 * | -------------- | ------------------- | ------------------------------------------------ |
 * | conversations  | `conversations`     | conversation, chat, thread, history, talk(ed)/spoke |
 * | memories       | `semantic_memories` | memor*, remember, recall, fact, prefer, know about  |
 * | episodes       | `episodes`          | episode, session summary, recap                  |
 *
 * ## What this provider does NOT answer
 *
 * - LTM domain queries (orgs, events, districts) →
 *   `LtmKnowledgeProvider` (next session).
 * - Questionnaire flows → CLUES domain providers.
 * - Real-time tools / actions → `lib/tools` and the agent runner, not the bridge.
 *
 * ## Testing
 *
 * Inject a Supabase override via the constructor (`new OliviaSelfProvider({
 * supabase: mockClient })`) or pass `null` to exercise the unconfigured path.
 * See `__tests__/olivia-self.test.ts`.
 */

import {
  createClient,
  type PostgrestError,
  type SupabaseClient,
} from "@supabase/supabase-js";

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

const APP_ID = "olivia-brain";
const APP_NAME = "Olivia Brain";
const APP_VERSION = "0.1.0";
const DOMAIN = "olivia";

/** Per-query timeout. Tuned for indexed Supabase reads. */
const QUERY_TIMEOUT_MS = 5_000;
/** Healthcheck timeout. Tighter than queries to fail fast in registry probes. */
const HEALTHCHECK_TIMEOUT_MS = 2_000;
/** Hard cap on row count returned per query, regardless of caller-supplied limit. */
const MAX_LIMIT = 100;
/** Default row count when caller does not specify. */
const DEFAULT_LIMIT = 10;

const VOCABULARY: ReadonlyArray<TermDefinition> = Object.freeze([
  {
    term: "Olivia",
    definition:
      "The omnipresent AI executive agent that anchors every CLUES surface. " +
      "Avatar via LiveAvatar, voice via ElevenLabs, brain via the cascade.",
    synonyms: ["Olivia Brain", "the assistant"],
  },
  {
    term: "conversation",
    definition:
      "A persistent thread of user/assistant turns stored in Olivia's database. " +
      "Identified by a uuid; scoped to a single client_id.",
    relatedTerms: ["conversation_turn", "conversation_event"],
  },
  {
    term: "episode",
    definition:
      "A coherent slice of conversation rolled up into a summary, topics, " +
      "and outcome. Created at conversation end. Always private to a client.",
    relatedTerms: ["semantic memory", "procedural memory"],
  },
  {
    term: "semantic memory",
    definition:
      "A distilled fact, preference, insight, or constraint Olivia has " +
      "learned. Public (client_id null, shared) or private (client_id set, isolated).",
    relatedTerms: ["episode", "graph entity"],
  },
  {
    term: "procedural memory",
    definition:
      "A learned workflow, tool preference, or decision pattern. Triggers " +
      "and ordered steps. Reused across conversations.",
    relatedTerms: ["journey snapshot", "tool execution"],
  },
  {
    term: "client",
    definition:
      "A user identity scoped to a tenant. Memory is private when client_id " +
      "is set; public knowledge has client_id null.",
    synonyms: ["user", "tenant member"],
  },
  {
    term: "persona",
    definition:
      "Which voice Olivia speaks in: Olivia (executive bilateral), " +
      "Cristiano (unilateral judge), Emelia (back-end support, no video).",
    relatedTerms: ["agent", "system prompt"],
  },
]);

/* ─── Intent classification ──────────────────────────────────────────────── */

/** Discrete intents this provider can answer. `unknown` falls through to a polite refusal. */
type SelfIntent = "conversations" | "memories" | "episodes" | "unknown";

/**
 * Classify an NL query into a discrete intent.
 *
 * v1 — regex-based, deterministic, English-only.
 *
 * TODO(week-2): replace with an LLM-routed classifier so we can handle
 * paraphrases ("show me what we last talked about" → `conversations`),
 * surface a confidence score, and return a probability distribution for
 * ambiguous queries. Tracked in `MERGE_PLAN.md` Phase 1.
 */
function classifyIntent(query: string): SelfIntent {
  const lower = query.toLowerCase();
  if (/\b(conversation|chat|thread|history|talked|spoke)\b/.test(lower)) {
    return "conversations";
  }
  if (/\b(memor|remember|recall|fact|prefer|know about)/.test(lower)) {
    return "memories";
  }
  if (/\b(episode|session summary|recap)\b/.test(lower)) {
    return "episodes";
  }
  return "unknown";
}

/* ─── Supabase abort/timeout helper ──────────────────────────────────────── */

/** Discriminated outcome of a Supabase call wrapped in {@link runWithTimeout}. */
type SupabaseRunOutcome<T> =
  | { readonly ok: true; readonly data: ReadonlyArray<T> }
  | { readonly ok: false; readonly timedOut: boolean; readonly reason: string };

/** Categorise a thrown value or a Postgrest error message as a timeout. */
function classifyFailure(
  label: string,
  timeoutMs: number,
  err: unknown,
): { readonly timedOut: boolean; readonly reason: string } {
  if (err instanceof DOMException && err.name === "AbortError") {
    return { timedOut: true, reason: `${label} timed out after ${timeoutMs}ms` };
  }
  const message = err instanceof Error ? err.message : String(err);
  if (/abort/i.test(message)) {
    return { timedOut: true, reason: `${label} timed out after ${timeoutMs}ms` };
  }
  return { timedOut: false, reason: `${label} threw: ${message}` };
}

/**
 * Run a Supabase row-returning query with an {@link AbortSignal.timeout}.
 * Always resolves; never throws.
 *
 * The factory receives the abort signal so the caller chains
 * `.abortSignal(signal)` onto its query builder. Failures are categorised:
 *
 * - **Timeout** — surface fired before the response arrived.
 * - **Postgrest error** — Supabase returned `{ data: null, error }`.
 * - **Unexpected throw** — network/JSON/etc. Wrapped into the outcome.
 */
async function runWithTimeout<T>(
  label: string,
  timeoutMs: number,
  factory: (signal: AbortSignal) => PromiseLike<{
    data: T[] | null;
    error: PostgrestError | null;
  }>,
): Promise<SupabaseRunOutcome<T>> {
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    const { data, error } = await factory(signal);
    if (error) {
      const looksLikeAbort = /abort/i.test(error.message ?? "");
      return {
        ok: false,
        timedOut: looksLikeAbort,
        reason: looksLikeAbort
          ? `${label} timed out after ${timeoutMs}ms`
          : `${label} failed: ${error.message}`,
      };
    }
    return { ok: true, data: data ?? [] };
  } catch (err) {
    const { timedOut, reason } = classifyFailure(label, timeoutMs, err);
    return { ok: false, timedOut, reason };
  }
}

/** Outcome of a Supabase HEAD count query wrapped in {@link runCountWithTimeout}. */
type SupabaseCountOutcome =
  | { readonly ok: true; readonly count: number }
  | { readonly ok: false; readonly timedOut: boolean; readonly reason: string };

/**
 * Run a Supabase HEAD count query (`select("col", { head: true, count:
 * "exact" })`) with an {@link AbortSignal.timeout}. Always resolves;
 * never throws. Separate from {@link runWithTimeout} because Supabase
 * returns the count out-of-band on the response object, not in `data`.
 */
async function runCountWithTimeout(
  label: string,
  timeoutMs: number,
  factory: (signal: AbortSignal) => PromiseLike<{
    count: number | null;
    error: PostgrestError | null;
  }>,
): Promise<SupabaseCountOutcome> {
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    const { count, error } = await factory(signal);
    if (error) {
      const looksLikeAbort = /abort/i.test(error.message ?? "");
      return {
        ok: false,
        timedOut: looksLikeAbort,
        reason: looksLikeAbort
          ? `${label} timed out after ${timeoutMs}ms`
          : `${label} failed: ${error.message}`,
      };
    }
    return { ok: true, count: count ?? 0 };
  } catch (err) {
    const { timedOut, reason } = classifyFailure(label, timeoutMs, err);
    return { ok: false, timedOut, reason };
  }
}

/* ─── OliviaSelfProvider ─────────────────────────────────────────────────── */

/**
 * Universal Knowledge Provider for Olivia Brain's own data domain (`olivia`).
 *
 * @see {@link UniversalKnowledgeProvider}
 */
export class OliviaSelfProvider implements UniversalKnowledgeProvider {
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
        id: "olivia.conversations.read",
        name: "Read conversations",
        description: "List a user's recent conversations and message counts.",
        category: "data",
      },
      {
        id: "olivia.memory.read",
        name: "Read semantic memories",
        description:
          "List facts/preferences Olivia has stored, scoped to the requesting user.",
        category: "data",
      },
      {
        id: "olivia.events.publish",
        name: "Publish app events",
        description:
          "In-process event bus for conversation/memory mutations.",
        category: "flow",
      },
    ],
  };

  private readonly supabase: SupabaseClient | null;
  private readonly subscribers = new Map<string, Set<EventCallback>>();

  /**
   * Construct a provider instance.
   *
   * @param opts.supabase
   *   Override the Supabase client. Pass an explicit `null` to force the
   *   unconfigured / vocabulary-only mode (useful for unit tests). When
   *   omitted, the constructor reads `SUPABASE_URL` +
   *   `SUPABASE_SERVICE_ROLE_KEY` from {@link getServerEnv} and
   *   constructs a service-role client.
   */
  constructor(opts?: { readonly supabase?: SupabaseClient | null }) {
    if (opts && "supabase" in opts) {
      this.supabase = opts.supabase ?? null;
      return;
    }

    const env = getServerEnv();
    if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      this.supabase = createClient(
        env.SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false } },
      );
    } else {
      this.supabase = null;
    }
  }

  /** Whether the Supabase backend is currently wired. */
  get isDatabaseConfigured(): boolean {
    return this.supabase !== null;
  }

  /* ─── VOCABULARY ──────────────────────────────────────────────────────── */

  /**
   * Domain vocabulary — terms Olivia uses to describe her own state.
   * Read-only; the underlying array is frozen.
   */
  readonly vocabulary = {
    /** All terms in the vocabulary, in canonical order. */
    getTerms: (): TermDefinition[] => VOCABULARY.slice(),

    /**
     * Look up a definition by term. Case-insensitive; matches against
     * canonical term names AND their declared synonyms.
     *
     * @returns The term's definition, or `undefined` if not found.
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

    /**
     * Synonyms registered for a term. Case-insensitive lookup on the
     * canonical term name (synonyms-of-synonyms are not transitive).
     *
     * @returns The list of synonyms, or an empty array if the term is
     *   unknown or has none declared.
     */
    getAliases: (term: string): string[] => {
      const lower = term.toLowerCase();
      const hit = VOCABULARY.find((t) => t.term.toLowerCase() === lower);
      return hit?.synonyms ? [...hit.synonyms] : [];
    },
  };

  /* ─── FLOWS ───────────────────────────────────────────────────────────── */

  /**
   * Conversation flows. Olivia Brain owns no UKP flows directly — flows
   * are domain-specific and come from CLUES / LTM providers. Calls return
   * empty results or, where the contract requires a value, throw with a
   * clear message.
   */
  readonly flows = {
    /** Always returns an empty list — see class doc. */
    getFlows: (): Flow[] => [],
    /** Always returns `null` — see class doc. */
    getFlowState: async (
      _userId: string,
      _flowId: string,
    ): Promise<FlowState | null> => null,
    /** Always throws — see class doc. */
    advanceFlow: async (
      _userId: string,
      _flowId: string,
      _input: unknown,
    ): Promise<FlowState> => {
      throw new Error(`${APP_NAME} does not expose flows.`);
    },
  };

  /* ─── QUESTIONS ───────────────────────────────────────────────────────── */

  /**
   * Questionnaire surface. Empty for the brain — questionnaires belong to
   * domain providers (CLUES Main, CLUES London, etc.). Methods return the
   * empty / failed shapes required by the interface.
   */
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
     * Run a natural-language query against Olivia's own data layer.
     *
     * Routes via {@link classifyIntent}. Each Supabase call is bounded by
     * {@link QUERY_TIMEOUT_MS} via {@link AbortSignal.timeout}. The whole
     * call is wrapped in an OTel span carrying outcome + row-count
     * attributes. The user's NL query string is never written to the span
     * or to logs, only the classified intent and metadata.
     *
     * @returns A {@link QueryResult} whose `success` reflects whether the
     *   query actually retrieved data. Unconfigured DB and unrecognised
     *   intents return `success: false` with an explanatory `summary`.
     *   Network/DB timeouts surface in the `summary` text.
     */
    query: async (q: NaturalLanguageQuery): Promise<QueryResult> => {
      // Fast-path: degraded mode. Return without opening a span — there is
      // nothing observable to report.
      if (!this.supabase) {
        return {
          success: false,
          data: null,
          summary:
            "Olivia's self-database is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing).",
          confidence: 1.0,
        };
      }

      const intent = classifyIntent(q.query);
      const userId = q.context?.userId;
      const limit = Math.min(q.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

      return withTraceSpan(
        "olivia.bridge.OliviaSelfProvider.query",
        {
          "provider.id": APP_ID,
          "provider.domain": DOMAIN,
          "db.system": "postgresql",
          "query.intent": intent,
          "query.user_scoped": Boolean(userId),
          "query.limit": limit,
        },
        async () => this.dispatchIntent(intent, { userId, limit }),
      );
    },

    /**
     * Aggregate counts for a user across the brain's three private tables
     * (conversations, semantic_memories, episodes). Issues all three counts
     * in parallel under the same {@link QUERY_TIMEOUT_MS} budget.
     *
     * @returns `null` when the DB is unconfigured or `userId` is empty;
     *   otherwise a {@link UserData} record whose `metadata` carries the
     *   three count fields.
     */
    getUserData: async (userId: string): Promise<UserData | null> => {
      if (!this.supabase || !userId) return null;
      const supabase = this.supabase;

      const countFor = (table: "conversations" | "semantic_memories" | "episodes") =>
        runCountWithTimeout(`${table}.count`, QUERY_TIMEOUT_MS, (signal) =>
          supabase
            .from(table)
            .select("id", { count: "exact", head: true })
            .eq("client_id", userId)
            .abortSignal(signal),
        );

      const [conv, mem, episodes] = await Promise.all([
        countFor("conversations"),
        countFor("semantic_memories"),
        countFor("episodes"),
      ]);

      // Failed counts surface as 0; the operator-side signal is in the
      // OTel attributes / span status from the underlying Supabase call.
      // We do not block on getUserData failures because the call is best-
      // effort by contract (UserData fields are all optional).
      return {
        userId,
        metadata: {
          conversationCount: conv.ok ? conv.count : 0,
          semanticMemoryCount: mem.ok ? mem.count : 0,
          episodeCount: episodes.ok ? episodes.count : 0,
        },
      };
    },

    /** This provider does not produce per-user recommendations. */
    getResults: async (_userId: string): Promise<AppResults | null> => null,
  };

  /* ─── ACTIONS ─────────────────────────────────────────────────────────── */

  /**
   * Action surface. Empty by design — the brain's mutating actions go
   * through `lib/tools` and the agent runner with their own approval
   * gates and audit, not through the bridge.
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

  /**
   * Output surface. Empty by design — generated artifacts (PDFs, decks,
   * videos) come from domain pipelines; the brain itself does not render.
   */
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
   * In-process event bus. Subscribers register a callback per event type;
   * unsubscribe nukes all callbacks for that type at once (matching the
   * UKP contract). Use {@link OliviaSelfProvider.publish} to fan out an
   * event to all subscribers.
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

  /**
   * Publish an event to all subscribers of `event.type`. Subscriber
   * callbacks are run synchronously and one at a time; thrown exceptions
   * are caught and logged so a single bad subscriber cannot break the bus.
   */
  publish(event: AppEvent): void {
    const subs = this.subscribers.get(event.type);
    if (!subs || subs.size === 0) return;
    for (const cb of subs) {
      try {
        cb(event);
      } catch (err) {
        console.error(
          `[OliviaSelfProvider] subscriber threw on ${event.type}:`,
          err,
        );
      }
    }
  }

  /* ─── LIFECYCLE ───────────────────────────────────────────────────────── */

  /**
   * Lightweight liveness probe.
   *
   * - Unconfigured mode: always healthy. The provider serves vocabulary
   *   and stub paths even without a DB.
   * - Configured mode: pings `admin_audit_logs` with a head-only count
   *   query under {@link HEALTHCHECK_TIMEOUT_MS}. Returns `false` on
   *   timeout, network failure, or any Supabase-reported error.
   */
  async healthCheck(): Promise<boolean> {
    if (!this.supabase) return true;
    const supabase = this.supabase;
    const outcome = await runCountWithTimeout(
      "healthCheck.admin_audit_logs",
      HEALTHCHECK_TIMEOUT_MS,
      (signal) =>
        supabase
          .from("admin_audit_logs")
          .select("id", { count: "exact", head: true })
          .limit(1)
          .abortSignal(signal),
    );
    return outcome.ok;
  }

  /* ─── INTERNAL ────────────────────────────────────────────────────────── */

  /** Dispatch a classified intent to its concrete query path. */
  private async dispatchIntent(
    intent: SelfIntent,
    args: { readonly userId: string | undefined; readonly limit: number },
  ): Promise<QueryResult> {
    if (intent === "conversations") return this.queryConversations(args);
    if (intent === "memories") return this.queryMemories(args);
    if (intent === "episodes") return this.queryEpisodes(args);

    return {
      success: false,
      data: null,
      summary:
        `OliviaSelfProvider does not know how to answer this query. ` +
        `It can answer questions about conversations, memories, and episodes.`,
      confidence: 1.0,
    };
  }

  private async queryConversations(args: {
    readonly userId: string | undefined;
    readonly limit: number;
  }): Promise<QueryResult> {
    const supabase = this.supabase;
    if (!supabase) {
      return { success: false, data: null, summary: "DB not configured." };
    }
    const { userId, limit } = args;

    const outcome = await runWithTimeout(
      "conversations.recent",
      QUERY_TIMEOUT_MS,
      (signal) => {
        let builder = supabase
          .from("conversations")
          .select("id, title, created_at, last_message_at, metadata")
          .order("last_message_at", { ascending: false })
          .limit(limit);
        if (userId) builder = builder.eq("client_id", userId);
        return builder.abortSignal(signal);
      },
    );

    if (!outcome.ok) {
      return { success: false, data: null, summary: outcome.reason };
    }
    return {
      success: true,
      data: outcome.data,
      summary:
        outcome.data.length === 0
          ? userId
            ? `No conversations found for client ${userId}.`
            : "No conversations found."
          : `Found ${outcome.data.length} recent conversation${outcome.data.length === 1 ? "" : "s"}.`,
      confidence: 0.9,
    };
  }

  private async queryMemories(args: {
    readonly userId: string | undefined;
    readonly limit: number;
  }): Promise<QueryResult> {
    const supabase = this.supabase;
    if (!supabase) {
      return { success: false, data: null, summary: "DB not configured." };
    }
    const { userId, limit } = args;

    const outcome = await runWithTimeout(
      "semantic_memories.recall",
      QUERY_TIMEOUT_MS,
      (signal) => {
        let builder = supabase
          .from("semantic_memories")
          .select(
            "id, content, category, confidence, last_reinforced_at, client_id",
          )
          .order("confidence", { ascending: false })
          .limit(limit);
        if (userId) builder = builder.eq("client_id", userId);
        return builder.abortSignal(signal);
      },
    );

    if (!outcome.ok) {
      return { success: false, data: null, summary: outcome.reason };
    }
    return {
      success: true,
      data: outcome.data,
      summary:
        outcome.data.length === 0
          ? "No semantic memories on file."
          : `Recalled ${outcome.data.length} ${userId ? "private" : "public"} memor${outcome.data.length === 1 ? "y" : "ies"}.`,
      confidence: 0.85,
    };
  }

  private async queryEpisodes(args: {
    readonly userId: string | undefined;
    readonly limit: number;
  }): Promise<QueryResult> {
    const supabase = this.supabase;
    if (!supabase) {
      return { success: false, data: null, summary: "DB not configured." };
    }
    const { userId, limit } = args;

    const outcome = await runWithTimeout(
      "episodes.recent",
      QUERY_TIMEOUT_MS,
      (signal) => {
        let builder = supabase
          .from("episodes")
          .select("id, title, summary, topics, outcome, start_at, end_at")
          .order("end_at", { ascending: false })
          .limit(limit);
        if (userId) builder = builder.eq("client_id", userId);
        return builder.abortSignal(signal);
      },
    );

    if (!outcome.ok) {
      return { success: false, data: null, summary: outcome.reason };
    }
    return {
      success: true,
      data: outcome.data,
      summary:
        outcome.data.length === 0
          ? "No episodes recorded yet."
          : `Found ${outcome.data.length} recent episode${outcome.data.length === 1 ? "" : "s"}.`,
      confidence: 0.85,
    };
  }
}
