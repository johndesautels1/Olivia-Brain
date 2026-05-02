/**
 * OliviaSelfProvider — Universal Knowledge Provider for Olivia Brain's own data
 *
 * Implements the UKP interface against Olivia Brain's own database
 * (conversations, memory layers, episodes). This is the "standalone mode"
 * provider from MERGE_PLAN.md Phase 1.
 *
 * What it answers:
 *   - "list my recent conversations" → conversations table
 *   - "what do you remember about me?" / "what facts?" → semantic_memories
 *
 * What it does NOT answer (yet):
 *   - Domain queries about LTM (organisations, events, districts) → that's
 *     LtmKnowledgeProvider, next session.
 *   - Questionnaire flows → CLUES domain, separate provider.
 *
 * Auth: Supabase service-role client. Falls back gracefully (returns null /
 * empty results / unhealthy) when SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY
 * is missing — so the provider can register in mock-mode environments.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/config/env";
import type {
  AnswerResult,
  AppEvent,
  AppResults,
  ActionResult,
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

const APP_ID = "olivia-brain";
const APP_NAME = "Olivia Brain";
const APP_VERSION = "0.1.0";
const DOMAIN = "olivia";

const VOCABULARY: TermDefinition[] = [
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
];

/** Lightweight intent detection on the raw query string. */
type SelfIntent = "conversations" | "memories" | "episodes" | "unknown";
function classifyIntent(query: string): SelfIntent {
  const lower = query.toLowerCase();
  if (/conversation|chat|thread|history|talk(ed)?|spoke/.test(lower)) {
    return "conversations";
  }
  if (/memor|remember|recall|fact|prefer|know about/.test(lower)) {
    return "memories";
  }
  if (/episode|session summary|recap/.test(lower)) {
    return "episodes";
  }
  return "unknown";
}

export class OliviaSelfProvider implements UniversalKnowledgeProvider {
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

  private supabase: SupabaseClient | null;
  private subscribers = new Map<string, Set<EventCallback>>();

  constructor(opts?: { supabase?: SupabaseClient | null }) {
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

  // ─── VOCABULARY ────────────────────────────────────────────────────────────
  readonly vocabulary = {
    getTerms: (): TermDefinition[] => VOCABULARY,
    getExplanation: (term: string): string | undefined => {
      const lower = term.toLowerCase();
      const hit = VOCABULARY.find(
        (t) =>
          t.term.toLowerCase() === lower ||
          t.synonyms?.some((s) => s.toLowerCase() === lower),
      );
      return hit?.definition;
    },
    getAliases: (term: string): string[] => {
      const lower = term.toLowerCase();
      return (
        VOCABULARY.find((t) => t.term.toLowerCase() === lower)?.synonyms ?? []
      );
    },
  };

  // ─── FLOWS ─────────────────────────────────────────────────────────────────
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

  // ─── QUESTIONS ─────────────────────────────────────────────────────────────
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

  // ─── DATA ──────────────────────────────────────────────────────────────────
  readonly data = {
    query: async (q: NaturalLanguageQuery): Promise<QueryResult> => {
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
      const limit = q.limit ?? 10;

      if (intent === "conversations") {
        let builder = this.supabase
          .from("conversations")
          .select("id, title, created_at, last_message_at, metadata")
          .order("last_message_at", { ascending: false })
          .limit(limit);
        if (userId) builder = builder.eq("client_id", userId);

        const { data, error } = await builder;
        if (error) {
          return {
            success: false,
            data: null,
            summary: `conversations query failed: ${error.message}`,
          };
        }
        const rows = data ?? [];
        return {
          success: true,
          data: rows,
          summary:
            rows.length === 0
              ? userId
                ? `No conversations found for client ${userId}.`
                : "No conversations found."
              : `Found ${rows.length} recent conversation${rows.length === 1 ? "" : "s"}.`,
          confidence: 0.9,
        };
      }

      if (intent === "memories") {
        let builder = this.supabase
          .from("semantic_memories")
          .select(
            "id, content, category, confidence, last_reinforced_at, client_id",
          )
          .order("confidence", { ascending: false })
          .limit(limit);
        if (userId) builder = builder.eq("client_id", userId);

        const { data, error } = await builder;
        if (error) {
          return {
            success: false,
            data: null,
            summary: `semantic_memories query failed: ${error.message}`,
          };
        }
        const rows = data ?? [];
        return {
          success: true,
          data: rows,
          summary:
            rows.length === 0
              ? "No semantic memories on file."
              : `Recalled ${rows.length} ${userId ? "private" : "public"} memor${rows.length === 1 ? "y" : "ies"}.`,
          confidence: 0.85,
        };
      }

      if (intent === "episodes") {
        let builder = this.supabase
          .from("episodes")
          .select("id, title, summary, topics, outcome, start_at, end_at")
          .order("end_at", { ascending: false })
          .limit(limit);
        if (userId) builder = builder.eq("client_id", userId);

        const { data, error } = await builder;
        if (error) {
          return {
            success: false,
            data: null,
            summary: `episodes query failed: ${error.message}`,
          };
        }
        const rows = data ?? [];
        return {
          success: true,
          data: rows,
          summary:
            rows.length === 0
              ? "No episodes recorded yet."
              : `Found ${rows.length} recent episode${rows.length === 1 ? "" : "s"}.`,
          confidence: 0.85,
        };
      }

      return {
        success: false,
        data: null,
        summary:
          `OliviaSelfProvider does not know how to answer "${q.query}". ` +
          `It can answer questions about conversations, memories, and episodes.`,
        confidence: 1.0,
      };
    },

    getUserData: async (userId: string): Promise<UserData | null> => {
      if (!this.supabase || !userId) return null;

      const [convCount, memCount, episodeCount] = await Promise.all([
        this.supabase
          .from("conversations")
          .select("id", { count: "exact", head: true })
          .eq("client_id", userId),
        this.supabase
          .from("semantic_memories")
          .select("id", { count: "exact", head: true })
          .eq("client_id", userId),
        this.supabase
          .from("episodes")
          .select("id", { count: "exact", head: true })
          .eq("client_id", userId),
      ]);

      return {
        userId,
        metadata: {
          conversationCount: convCount.count ?? 0,
          semanticMemoryCount: memCount.count ?? 0,
          episodeCount: episodeCount.count ?? 0,
        },
      };
    },

    getResults: async (_userId: string): Promise<AppResults | null> => null,
  };

  // ─── ACTIONS ───────────────────────────────────────────────────────────────
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

  // ─── OUTPUTS ───────────────────────────────────────────────────────────────
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

  // ─── EVENTS ────────────────────────────────────────────────────────────────
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

  /** Internal hook for emitting events from elsewhere in Olivia Brain. */
  publish(event: AppEvent): void {
    const subs = this.subscribers.get(event.type);
    if (!subs) return;
    for (const cb of subs) {
      try {
        cb(event);
      } catch (err) {
        console.error(`[OliviaSelfProvider] subscriber error on ${event.type}:`, err);
      }
    }
  }

  // ─── LIFECYCLE ─────────────────────────────────────────────────────────────
  async healthCheck(): Promise<boolean> {
    if (!this.supabase) {
      // No DB configured: provider still functions (vocabulary, stubs).
      // Mark healthy so the registry doesn't drop it.
      return true;
    }
    try {
      const { error } = await this.supabase
        .from("admin_audit_logs")
        .select("id", { head: true, count: "exact" })
        .limit(1);
      return !error;
    } catch {
      return false;
    }
  }
}
