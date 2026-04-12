/**
 * Conversation Ledger Service
 * Sprint 4.3 — Advanced Memory (Item 5: Event-Sourced Conversation Ledger)
 *
 * Structured event log layered on top of conversation_turns.
 * Every meaningful thing that happens in a conversation gets a typed event:
 * messages, tool calls, intent changes, errors, feedback, memory operations.
 *
 * Supports:
 * - Replay: rebuild conversation state from ordered events
 * - Projections: aggregate counts by event type
 * - Correction chains: link retries/edits to their originals via parent_event_id
 *
 * Does NOT replace conversation_turns — purely additive.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/config/env";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ConversationEventType =
  | "message_sent"
  | "tool_invoked"
  | "tool_result"
  | "intent_detected"
  | "strategy_changed"
  | "error_occurred"
  | "feedback_received"
  | "memory_recalled"
  | "memory_stored"
  | "session_started"
  | "session_ended";

export type EventActor = "user" | "olivia" | "system";

export interface ConversationEvent {
  id: string;
  conversationId: string;
  clientId: string | null;
  eventType: ConversationEventType;
  sequenceNum: number;
  payload: Record<string, unknown>;
  actor: EventActor;
  parentEventId: string | null;
  createdAt: string;
}

export interface AppendEventOptions {
  /** Which conversation this event belongs to */
  conversationId: string;
  /** Typed event identifier */
  eventType: ConversationEventType;
  /** Event-specific structured data */
  payload: Record<string, unknown>;
  /** Who caused it: user, olivia, or system */
  actor: EventActor;
  /** Client ID for isolation (optional — null for system-level events) */
  clientId?: string;
  /** Link to a parent event (for corrections, retries, follow-ups) */
  parentEventId?: string;
}

export interface ReplayEventsOptions {
  /** Which conversation to replay */
  conversationId: string;
  /** Filter to specific event types (null = all types) */
  eventTypes?: ConversationEventType[];
  /** Start replaying after this sequence number (for partial replay / resume) */
  afterSequence?: number;
  /** Maximum events to return (default: 1000) */
  limit?: number;
}

export interface EventCountEntry {
  eventType: ConversationEventType;
  count: number;
}

// ─── Service Interface ───────────────────────────────────────────────────────

export interface ConversationLedgerService {
  appendEvent(options: AppendEventOptions): Promise<ConversationEvent>;
  replayEvents(options: ReplayEventsOptions): Promise<ConversationEvent[]>;
  getEventCounts(conversationId: string): Promise<EventCountEntry[]>;
  getEventChain(eventId: string): Promise<ConversationEvent[]>;
  getLastEventByType(
    conversationId: string,
    eventType: ConversationEventType
  ): Promise<ConversationEvent | null>;
}

// ─── Supabase Implementation ─────────────────────────────────────────────────

class SupabaseConversationLedgerService implements ConversationLedgerService {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Append a typed event to the conversation ledger.
   * Auto-assigns the next sequence number for strict ordering.
   */
  async appendEvent(options: AppendEventOptions): Promise<ConversationEvent> {
    const {
      conversationId,
      eventType,
      payload,
      actor,
      clientId,
      parentEventId,
    } = options;

    // Get the next sequence number for this conversation
    const nextSeq = await this.getNextSequenceNum(conversationId);

    const row = {
      conversation_id: conversationId,
      client_id: clientId ?? null,
      event_type: eventType,
      sequence_num: nextSeq,
      payload,
      actor,
      parent_event_id: parentEventId ?? null,
    };

    const { data: inserted, error } = await this.supabase
      .from("conversation_events")
      .insert(row)
      .select("id, created_at")
      .single();

    if (error) {
      throw new Error(
        `[ConversationLedger] Failed to append event: ${error.message}`
      );
    }

    return {
      id: inserted.id,
      conversationId,
      clientId: clientId ?? null,
      eventType,
      sequenceNum: nextSeq,
      payload,
      actor,
      parentEventId: parentEventId ?? null,
      createdAt: inserted.created_at,
    };
  }

  /**
   * Replay conversation events in strict sequence order.
   * Supports type filtering and sequence offset for partial replay.
   */
  async replayEvents(
    options: ReplayEventsOptions
  ): Promise<ConversationEvent[]> {
    const {
      conversationId,
      eventTypes,
      afterSequence = 0,
      limit = 1000,
    } = options;

    const { data, error } = await this.supabase.rpc(
      "get_conversation_events",
      {
        p_conversation_id: conversationId,
        p_event_types: eventTypes ?? null,
        p_after_sequence: afterSequence,
        p_limit: limit,
      }
    );

    if (error) {
      throw new Error(
        `[ConversationLedger] Replay failed: ${error.message}`
      );
    }

    return (data ?? []).map(this.rowToEvent);
  }

  /**
   * Get aggregate event counts by type for a conversation.
   * Useful for projections: "how many tool calls?", "how many errors?"
   */
  async getEventCounts(conversationId: string): Promise<EventCountEntry[]> {
    const { data, error } = await this.supabase.rpc(
      "get_conversation_event_counts",
      {
        p_conversation_id: conversationId,
      }
    );

    if (error) {
      throw new Error(
        `[ConversationLedger] Event counts failed: ${error.message}`
      );
    }

    return (data ?? []).map(
      (row: Record<string, unknown>) => ({
        eventType: row.event_type as ConversationEventType,
        count: Number(row.event_count),
      })
    );
  }

  /**
   * Follow the parent_event_id chain from an event back to its root.
   * Returns the chain in chronological order (root first, target last).
   * Useful for seeing: correction → original, retry → original trigger.
   */
  async getEventChain(eventId: string): Promise<ConversationEvent[]> {
    const chain: ConversationEvent[] = [];
    let currentId: string | null = eventId;

    // Walk up the chain (max 20 hops to prevent infinite loops)
    let hops = 0;
    while (currentId && hops < 20) {
      const { data, error } = await this.supabase
        .from("conversation_events")
        .select("*")
        .eq("id", currentId)
        .single();

      if (error || !data) {
        break;
      }

      const event = this.rowToEvent(data);
      chain.unshift(event); // prepend — root ends up first
      currentId = event.parentEventId;
      hops++;
    }

    return chain;
  }

  /**
   * Get the most recent event of a specific type in a conversation.
   * "When was the last tool call?", "When did the session start?"
   */
  async getLastEventByType(
    conversationId: string,
    eventType: ConversationEventType
  ): Promise<ConversationEvent | null> {
    const { data, error } = await this.supabase
      .from("conversation_events")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("event_type", eventType)
      .order("sequence_num", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(
        `[ConversationLedger] Last event lookup failed: ${error.message}`
      );
    }

    return data ? this.rowToEvent(data) : null;
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Get the next sequence number for a conversation.
   * Returns max(sequence_num) + 1, or 1 if no events exist yet.
   */
  private async getNextSequenceNum(conversationId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from("conversation_events")
      .select("sequence_num")
      .eq("conversation_id", conversationId)
      .order("sequence_num", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(
        `[ConversationLedger] Sequence lookup failed: ${error.message}`
      );
    }

    return data ? (data.sequence_num as number) + 1 : 1;
  }

  /**
   * Convert a Supabase row to a ConversationEvent object.
   */
  private rowToEvent(row: Record<string, unknown>): ConversationEvent {
    return {
      id: row.id as string,
      conversationId: row.conversation_id as string,
      clientId: (row.client_id as string) ?? null,
      eventType: row.event_type as ConversationEventType,
      sequenceNum: row.sequence_num as number,
      payload: (row.payload as Record<string, unknown>) ?? {},
      actor: row.actor as EventActor,
      parentEventId: (row.parent_event_id as string) ?? null,
      createdAt: row.created_at as string,
    };
  }
}

// ─── NoOp Fallback ───────────────────────────────────────────────────────────

class NoOpConversationLedgerService implements ConversationLedgerService {
  private sequenceCounters = new Map<string, number>();

  async appendEvent(options: AppendEventOptions): Promise<ConversationEvent> {
    console.warn(
      "[ConversationLedger] No Supabase configured — event not persisted"
    );
    const seq =
      (this.sequenceCounters.get(options.conversationId) ?? 0) + 1;
    this.sequenceCounters.set(options.conversationId, seq);

    return {
      id: "noop",
      conversationId: options.conversationId,
      clientId: options.clientId ?? null,
      eventType: options.eventType,
      sequenceNum: seq,
      payload: options.payload,
      actor: options.actor,
      parentEventId: options.parentEventId ?? null,
      createdAt: new Date().toISOString(),
    };
  }

  async replayEvents(): Promise<ConversationEvent[]> {
    console.warn(
      "[ConversationLedger] No Supabase configured — returning empty"
    );
    return [];
  }

  async getEventCounts(): Promise<EventCountEntry[]> {
    console.warn(
      "[ConversationLedger] No Supabase configured — returning empty"
    );
    return [];
  }

  async getEventChain(): Promise<ConversationEvent[]> {
    console.warn(
      "[ConversationLedger] No Supabase configured — returning empty"
    );
    return [];
  }

  async getLastEventByType(): Promise<ConversationEvent | null> {
    console.warn(
      "[ConversationLedger] No Supabase configured — returning null"
    );
    return null;
  }
}

// ─── Singleton Factory ───────────────────────────────────────────────────────

let conversationLedgerService: ConversationLedgerService | undefined;

/**
 * Get the conversation ledger service singleton.
 * Returns Supabase-backed service if configured, otherwise NoOp fallback.
 */
export function getConversationLedgerService(): ConversationLedgerService {
  if (!conversationLedgerService) {
    const env = getServerEnv();

    if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      conversationLedgerService = new SupabaseConversationLedgerService(
        env.SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY
      );
    } else {
      conversationLedgerService = new NoOpConversationLedgerService();
    }
  }

  return conversationLedgerService;
}
