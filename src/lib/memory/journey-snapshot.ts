/**
 * Journey Snapshot Service
 * Sprint 4.3 — Advanced Memory (Item 6: Snapshot-Resume State)
 *
 * Point-in-time serialization of journey state so a client can disconnect
 * for weeks and Olivia can resume exactly where they left off — no re-reading
 * the entire transcript, no re-inferring context.
 *
 * - Always private (client_id required)
 * - Links to active procedure (procedural_memories) for workflow continuity
 * - Links to conversation events via last_event_sequence for partial replay
 * - LLM-generated context_summary for instant orientation
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

import { getServerEnv } from "@/lib/config/env";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SnapshotType = "auto" | "checkpoint";

export interface JourneySnapshot {
  id: string;
  conversationId: string;
  clientId: string;
  snapshotType: SnapshotType;
  activeProcedureId: string | null;
  procedureStepIndex: number;
  collectedData: Record<string, unknown>;
  pendingQuestions: string[];
  contextSummary: string;
  sentiment: string | null;
  lastEventSequence: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface CaptureSnapshotOptions {
  /** Which conversation to snapshot */
  conversationId: string;
  /** Client who owns this journey (required) */
  clientId: string;
  /** auto (system-generated) or checkpoint (explicit save point) */
  snapshotType?: SnapshotType;
  /** Currently active procedure ID (if a workflow is running) */
  activeProcedureId?: string;
  /** Current step index in the active procedure */
  procedureStepIndex?: number;
  /** Key-value pairs of data collected so far */
  collectedData?: Record<string, unknown>;
  /** Questions still waiting for answers */
  pendingQuestions?: string[];
  /** Last detected client sentiment */
  sentiment?: string;
  /** Any additional metadata */
  metadata?: Record<string, unknown>;
  /**
   * Recent conversation context to summarize.
   * If provided, the service generates a context_summary via LLM.
   * If omitted, provide contextSummary directly.
   */
  recentContext?: string;
  /** Pre-computed context summary (skips LLM call if provided) */
  contextSummary?: string;
}

export interface GetClientSnapshotsOptions {
  /** Client ID to look up */
  clientId: string;
  /** Maximum results (default: 20) */
  limit?: number;
}

// ─── Service Interface ───────────────────────────────────────────────────────

export interface JourneySnapshotService {
  captureSnapshot(options: CaptureSnapshotOptions): Promise<JourneySnapshot>;
  getLatestSnapshot(conversationId: string): Promise<JourneySnapshot | null>;
  getClientSnapshots(options: GetClientSnapshotsOptions): Promise<JourneySnapshot[]>;
  resumeFromSnapshot(snapshotId: string): Promise<JourneySnapshot | null>;
  deleteSnapshot(snapshotId: string): Promise<void>;
}

// ─── Supabase Implementation ─────────────────────────────────────────────────

class SupabaseJourneySnapshotService implements JourneySnapshotService {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Capture a point-in-time snapshot of the current journey state.
   * If recentContext is provided, generates a context_summary via LLM.
   * Automatically fetches the latest event sequence from the ledger.
   */
  async captureSnapshot(
    options: CaptureSnapshotOptions
  ): Promise<JourneySnapshot> {
    const {
      conversationId,
      clientId,
      snapshotType = "auto",
      activeProcedureId,
      procedureStepIndex = 0,
      collectedData = {},
      pendingQuestions = [],
      sentiment,
      metadata = {},
      recentContext,
      contextSummary: providedSummary,
    } = options;

    // Generate context summary via LLM if not provided
    const contextSummary =
      providedSummary ?? (await this.generateContextSummary(recentContext));

    // Get latest event sequence number from the conversation ledger
    const lastEventSequence =
      await this.getLastEventSequence(conversationId);

    const row = {
      conversation_id: conversationId,
      client_id: clientId,
      snapshot_type: snapshotType,
      active_procedure_id: activeProcedureId ?? null,
      procedure_step_index: procedureStepIndex,
      collected_data: collectedData,
      pending_questions: pendingQuestions,
      context_summary: contextSummary,
      sentiment: sentiment ?? null,
      last_event_sequence: lastEventSequence,
      metadata,
    };

    const { data: inserted, error } = await this.supabase
      .from("journey_snapshots")
      .insert(row)
      .select("id, created_at")
      .single();

    if (error) {
      throw new Error(
        `[JourneySnapshot] Failed to capture snapshot: ${error.message}`
      );
    }

    return {
      id: inserted.id,
      conversationId,
      clientId,
      snapshotType,
      activeProcedureId: activeProcedureId ?? null,
      procedureStepIndex,
      collectedData,
      pendingQuestions,
      contextSummary,
      sentiment: sentiment ?? null,
      lastEventSequence,
      metadata,
      createdAt: inserted.created_at,
    };
  }

  /**
   * Get the most recent snapshot for a conversation.
   * Primary resume entry point — "where were we?"
   */
  async getLatestSnapshot(
    conversationId: string
  ): Promise<JourneySnapshot | null> {
    const { data, error } = await this.supabase
      .from("journey_snapshots")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(
        `[JourneySnapshot] Latest snapshot lookup failed: ${error.message}`
      );
    }

    return data ? this.rowToSnapshot(data) : null;
  }

  /**
   * Get all snapshots for a client across all conversations.
   * Shows Olivia: "This client has N active journeys."
   */
  async getClientSnapshots(
    options: GetClientSnapshotsOptions
  ): Promise<JourneySnapshot[]> {
    const { clientId, limit = 20 } = options;

    const { data, error } = await this.supabase
      .from("journey_snapshots")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(
        `[JourneySnapshot] Client snapshots lookup failed: ${error.message}`
      );
    }

    return (data ?? []).map(this.rowToSnapshot);
  }

  /**
   * Load a specific snapshot by ID for resumption.
   * Returns the full state object so Olivia knows exactly where to continue.
   */
  async resumeFromSnapshot(
    snapshotId: string
  ): Promise<JourneySnapshot | null> {
    const { data, error } = await this.supabase
      .from("journey_snapshots")
      .select("*")
      .eq("id", snapshotId)
      .maybeSingle();

    if (error) {
      throw new Error(
        `[JourneySnapshot] Resume lookup failed: ${error.message}`
      );
    }

    return data ? this.rowToSnapshot(data) : null;
  }

  /**
   * Delete a snapshot when a journey is complete.
   * Conversations, events, and episodes remain — only the snapshot is removed.
   */
  async deleteSnapshot(snapshotId: string): Promise<void> {
    const { error } = await this.supabase
      .from("journey_snapshots")
      .delete()
      .eq("id", snapshotId);

    if (error) {
      throw new Error(
        `[JourneySnapshot] Failed to delete snapshot: ${error.message}`
      );
    }
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Generate a short context summary via LLM.
   * Describes where the journey currently stands in 1-2 sentences.
   */
  private async generateContextSummary(
    recentContext?: string
  ): Promise<string> {
    if (!recentContext) {
      return "No recent context available for summarization.";
    }

    try {
      const env = getServerEnv();
      const result = await generateText({
        model: anthropic(env.ANTHROPIC_MODEL_PRIMARY),
        system:
          "You are a concise summarizer. Given recent conversation context, " +
          "write a 1-2 sentence summary of where the journey currently stands. " +
          "Focus on: what the client wants, what has been accomplished, and what " +
          "remains to be done. Be specific and actionable.",
        prompt: recentContext,
        temperature: 0.2,
        maxOutputTokens: 150,
      });

      return result.text.trim();
    } catch {
      // If LLM fails, return a fallback rather than crashing
      return "Context summary generation failed — review conversation history for current state.";
    }
  }

  /**
   * Get the latest event sequence number for a conversation from the ledger.
   * Returns 0 if no events exist yet.
   */
  private async getLastEventSequence(
    conversationId: string
  ): Promise<number> {
    const { data, error } = await this.supabase
      .from("conversation_events")
      .select("sequence_num")
      .eq("conversation_id", conversationId)
      .order("sequence_num", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      // Ledger table may not exist yet or have no events — not fatal
      return 0;
    }

    return data ? (data.sequence_num as number) : 0;
  }

  /**
   * Convert a Supabase row to a JourneySnapshot object.
   */
  private rowToSnapshot(row: Record<string, unknown>): JourneySnapshot {
    return {
      id: row.id as string,
      conversationId: row.conversation_id as string,
      clientId: row.client_id as string,
      snapshotType: row.snapshot_type as SnapshotType,
      activeProcedureId: (row.active_procedure_id as string) ?? null,
      procedureStepIndex: row.procedure_step_index as number,
      collectedData:
        (row.collected_data as Record<string, unknown>) ?? {},
      pendingQuestions: (row.pending_questions as string[]) ?? [],
      contextSummary: row.context_summary as string,
      sentiment: (row.sentiment as string) ?? null,
      lastEventSequence: row.last_event_sequence as number,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      createdAt: row.created_at as string,
    };
  }
}

// ─── NoOp Fallback ───────────────────────────────────────────────────────────

class NoOpJourneySnapshotService implements JourneySnapshotService {
  async captureSnapshot(
    options: CaptureSnapshotOptions
  ): Promise<JourneySnapshot> {
    console.warn(
      "[JourneySnapshot] No Supabase configured — snapshot not persisted"
    );
    return {
      id: "noop",
      conversationId: options.conversationId,
      clientId: options.clientId,
      snapshotType: options.snapshotType ?? "auto",
      activeProcedureId: options.activeProcedureId ?? null,
      procedureStepIndex: options.procedureStepIndex ?? 0,
      collectedData: options.collectedData ?? {},
      pendingQuestions: options.pendingQuestions ?? [],
      contextSummary:
        options.contextSummary ?? "NoOp — no snapshot persisted.",
      sentiment: options.sentiment ?? null,
      lastEventSequence: 0,
      metadata: options.metadata ?? {},
      createdAt: new Date().toISOString(),
    };
  }

  async getLatestSnapshot(): Promise<JourneySnapshot | null> {
    console.warn(
      "[JourneySnapshot] No Supabase configured — returning null"
    );
    return null;
  }

  async getClientSnapshots(): Promise<JourneySnapshot[]> {
    console.warn(
      "[JourneySnapshot] No Supabase configured — returning empty"
    );
    return [];
  }

  async resumeFromSnapshot(): Promise<JourneySnapshot | null> {
    console.warn(
      "[JourneySnapshot] No Supabase configured — returning null"
    );
    return null;
  }

  async deleteSnapshot(): Promise<void> {
    console.warn(
      "[JourneySnapshot] No Supabase configured — delete skipped"
    );
  }
}

// ─── Singleton Factory ───────────────────────────────────────────────────────

let journeySnapshotService: JourneySnapshotService | undefined;

/**
 * Get the journey snapshot service singleton.
 * Returns Supabase-backed service if configured, otherwise NoOp fallback.
 */
export function getJourneySnapshotService(): JourneySnapshotService {
  if (!journeySnapshotService) {
    const env = getServerEnv();

    if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      journeySnapshotService = new SupabaseJourneySnapshotService(
        env.SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY
      );
    } else {
      journeySnapshotService = new NoOpJourneySnapshotService();
    }
  }

  return journeySnapshotService;
}
