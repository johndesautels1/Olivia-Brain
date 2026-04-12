/**
 * Inngest Client & Event Catalog
 * Sprint 4.4 — Durable Execution (Item 2: Inngest Event-Driven Functions)
 *
 * Central Inngest client definition with typed event catalog.
 * Every event Olivia emits is defined here with its payload shape.
 * Functions in inngest-functions.ts subscribe to these events.
 *
 * Inngest handles: retries, concurrency control, step functions,
 * and durable execution — all Vercel-native.
 */

import { Inngest } from "inngest";

// ─── Event Payload Types ─────────────────────────────────────────────────────

/** Fired when a conversation ends (user disconnects or explicit end) */
export interface ConversationEndedEvent {
  data: {
    conversationId: string;
    clientId: string;
    turnCount: number;
    lastMessageAt: string;
  };
}

/** Fired when an episode is created from a conversation */
export interface EpisodeCreatedEvent {
  data: {
    episodeId: string;
    conversationId: string;
    clientId: string;
    topics: string[];
    summary: string;
  };
}

/** Scheduled trigger for memory maintenance (decay, cleanup) */
export interface MemoryMaintenanceEvent {
  data: {
    trigger: "scheduled" | "manual";
    targetClientId?: string;
  };
}

/** Fired when a procedure completes (success or failure) */
export interface ProcedureCompletedEvent {
  data: {
    procedureId: string;
    conversationId: string;
    clientId: string;
    success: boolean;
    durationMs: number;
  };
}

/** Fired when a long-running data crawl is requested */
export interface DataCrawlRequestedEvent {
  data: {
    url: string;
    conversationId: string;
    clientId?: string;
    extractionPrompt?: string;
  };
}

/** Fired when budget is exhausted to alert the system */
export interface BudgetExhaustedEvent {
  data: {
    conversationId: string;
    clientId: string | null;
    budgetType: string;
    consumed: number;
    maxAllowed: number;
  };
}

// ─── Event Catalog ───────────────────────────────────────────────────────────

/**
 * Complete type-safe event catalog for Olivia Brain.
 * Add new events here as the system grows.
 */
export type OliviaEvents = {
  "olivia/conversation.ended": ConversationEndedEvent;
  "olivia/episode.created": EpisodeCreatedEvent;
  "olivia/memory.maintenance": MemoryMaintenanceEvent;
  "olivia/procedure.completed": ProcedureCompletedEvent;
  "olivia/data.crawl.requested": DataCrawlRequestedEvent;
  "olivia/budget.exhausted": BudgetExhaustedEvent;
};

// ─── Client ──────────────────────────────────────────────────────────────────

/**
 * Singleton Inngest client for Olivia Brain.
 * Used by both function definitions and event emission.
 */
export const inngest = new Inngest({
  id: "olivia-brain",
  schemas: new Map() as never,
});
