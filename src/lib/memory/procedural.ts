/**
 * Procedural Memory Service
 * Sprint 4.3 — Advanced Memory (Item 4: Procedural Memory Layer)
 *
 * Stores learned procedures, workflows, tool preferences, and patterns that
 * Olivia has discovered produce good outcomes. Procedures are ranked by
 * success/failure counts so Olivia gravitates toward what works.
 *
 * - Public procedures (client_id = null): universal, shared across all clients
 * - Private procedures (client_id = value): client-specific workflows
 * - Success/failure tracking: reinforces effective procedures
 * - Semantic matching: "when should I use this?" via trigger embeddings
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/config/env";
import { getEmbeddingsService } from "./embeddings";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ProceduralCategory =
  | "workflow"
  | "tool_preference"
  | "communication_style"
  | "evaluation_pattern";

export interface ProcedureStep {
  order: number;
  action: string;
  toolRef?: string;
  params?: Record<string, unknown>;
  notes?: string;
}

export interface Procedure {
  id: string;
  clientId: string | null;
  name: string;
  description: string;
  trigger: string;
  steps: ProcedureStep[];
  category: ProceduralCategory;
  successCount: number;
  failureCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** Present only in search results */
  similarity?: number;
}

export interface LearnProcedureOptions {
  /** Short name for the procedure ("Flood Zone Risk Assessment") */
  name: string;
  /** What this procedure accomplishes */
  description: string;
  /** When to use it ("client asks about flood zones") */
  trigger: string;
  /** Ordered steps with optional tool references */
  steps: ProcedureStep[];
  /** Category of the procedure (default: "workflow") */
  category?: ProceduralCategory;
  /** If provided, procedure is private to this client. If omitted, universal. */
  clientId?: string;
}

export interface FindProceduresOptions {
  /** Situation description to search semantically ("client wants a valuation") */
  query: string;
  /** Client ID — returns universal + this client's private procedures */
  clientId?: string;
  /** Filter by category */
  category?: ProceduralCategory;
  /** Include deactivated procedures (default: false) */
  includeInactive?: boolean;
  /** Maximum results (default: 10) */
  limit?: number;
  /** Minimum similarity threshold (default: 0.5) */
  threshold?: number;
}

export interface GetByCategoryOptions {
  /** Category to filter by */
  category: ProceduralCategory;
  /** Client ID — returns universal + this client's private procedures */
  clientId?: string;
  /** Include deactivated procedures (default: false) */
  includeInactive?: boolean;
}

// ─── Service Interface ───────────────────────────────────────────────────────

export interface ProceduralMemoryService {
  learnProcedure(options: LearnProcedureOptions): Promise<Procedure>;
  findProcedures(options: FindProceduresOptions): Promise<Procedure[]>;
  recordOutcome(procedureId: string, success: boolean): Promise<void>;
  getProceduresByCategory(options: GetByCategoryOptions): Promise<Procedure[]>;
  deactivateProcedure(procedureId: string): Promise<void>;
}

// ─── Supabase Implementation ─────────────────────────────────────────────────

class SupabaseProceduralMemoryService implements ProceduralMemoryService {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Learn a new procedure. Embeds the trigger text for semantic matching.
   */
  async learnProcedure(options: LearnProcedureOptions): Promise<Procedure> {
    const {
      name,
      description,
      trigger,
      steps,
      category = "workflow",
      clientId,
    } = options;

    // Generate embedding from the trigger text (what situation triggers this)
    const embeddingsService = getEmbeddingsService();
    const { embedding } = await embeddingsService.embed(trigger);

    const now = new Date().toISOString();
    const row = {
      client_id: clientId ?? null,
      name,
      description,
      trigger,
      steps: JSON.stringify(steps),
      category,
      success_count: 0,
      failure_count: 0,
      embedding: JSON.stringify(embedding),
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    const { data: inserted, error } = await this.supabase
      .from("procedural_memories")
      .insert(row)
      .select("id, created_at, updated_at")
      .single();

    if (error) {
      throw new Error(
        `[ProceduralMemory] Failed to learn procedure: ${error.message}`
      );
    }

    return {
      id: inserted.id,
      clientId: clientId ?? null,
      name,
      description,
      trigger,
      steps,
      category,
      successCount: 0,
      failureCount: 0,
      isActive: true,
      createdAt: inserted.created_at,
      updatedAt: inserted.updated_at,
    };
  }

  /**
   * Find procedures via semantic similarity over trigger descriptions.
   * Returns universal procedures + procedures private to the given client.
   * Only returns active procedures by default.
   */
  async findProcedures(options: FindProceduresOptions): Promise<Procedure[]> {
    const {
      query,
      clientId,
      category,
      includeInactive = false,
      limit = 10,
      threshold = 0.5,
    } = options;

    const embeddingsService = getEmbeddingsService();
    const { embedding } = await embeddingsService.embed(query);

    const { data, error } = await this.supabase.rpc(
      "match_procedural_memories",
      {
        query_embedding: JSON.stringify(embedding),
        p_client_id: clientId ?? null,
        p_category: category ?? null,
        p_include_inactive: includeInactive,
        match_threshold: threshold,
        match_count: limit,
      }
    );

    if (error) {
      throw new Error(
        `[ProceduralMemory] Search failed: ${error.message}`
      );
    }

    return (data ?? []).map(this.rowToProcedure);
  }

  /**
   * Record the outcome of using a procedure.
   * Increments success_count or failure_count and updates updated_at.
   */
  async recordOutcome(procedureId: string, success: boolean): Promise<void> {
    // Fetch current counts
    const { data: current, error: fetchError } = await this.supabase
      .from("procedural_memories")
      .select("success_count, failure_count")
      .eq("id", procedureId)
      .single();

    if (fetchError) {
      throw new Error(
        `[ProceduralMemory] Failed to fetch procedure for outcome: ${fetchError.message}`
      );
    }

    if (!current) {
      throw new Error(
        `[ProceduralMemory] Procedure "${procedureId}" not found`
      );
    }

    const update = success
      ? { success_count: (current.success_count as number) + 1 }
      : { failure_count: (current.failure_count as number) + 1 };

    const { error: updateError } = await this.supabase
      .from("procedural_memories")
      .update({
        ...update,
        updated_at: new Date().toISOString(),
      })
      .eq("id", procedureId);

    if (updateError) {
      throw new Error(
        `[ProceduralMemory] Failed to record outcome: ${updateError.message}`
      );
    }
  }

  /**
   * Get all procedures in a category.
   * Returns universal + client-private procedures, ordered by success rate.
   */
  async getProceduresByCategory(
    options: GetByCategoryOptions
  ): Promise<Procedure[]> {
    const { category, clientId, includeInactive = false } = options;

    let query = this.supabase
      .from("procedural_memories")
      .select("*")
      .eq("category", category)
      .order("success_count", { ascending: false });

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    if (clientId) {
      query = query.or(
        `client_id.is.null,client_id.eq.${clientId}`
      );
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(
        `[ProceduralMemory] Category lookup failed: ${error.message}`
      );
    }

    return (data ?? []).map(this.rowToProcedure);
  }

  /**
   * Deactivate a procedure (soft-delete via is_active = false).
   * The procedure remains in the database for historical reference
   * but won't appear in search results by default.
   */
  async deactivateProcedure(procedureId: string): Promise<void> {
    const { error } = await this.supabase
      .from("procedural_memories")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", procedureId);

    if (error) {
      throw new Error(
        `[ProceduralMemory] Failed to deactivate procedure: ${error.message}`
      );
    }
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Convert a Supabase row to a Procedure object.
   */
  private rowToProcedure(row: Record<string, unknown>): Procedure {
    return {
      id: row.id as string,
      clientId: (row.client_id as string) ?? null,
      name: row.name as string,
      description: row.description as string,
      trigger: row.trigger as string,
      steps: (typeof row.steps === "string"
        ? JSON.parse(row.steps as string)
        : row.steps) as ProcedureStep[],
      category: row.category as ProceduralCategory,
      successCount: row.success_count as number,
      failureCount: row.failure_count as number,
      isActive: row.is_active as boolean,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      ...(row.similarity !== undefined
        ? { similarity: row.similarity as number }
        : {}),
    };
  }
}

// ─── NoOp Fallback ───────────────────────────────────────────────────────────

class NoOpProceduralMemoryService implements ProceduralMemoryService {
  async learnProcedure(options: LearnProcedureOptions): Promise<Procedure> {
    console.warn(
      "[ProceduralMemory] No Supabase configured — procedure not persisted"
    );
    return {
      id: "noop",
      clientId: options.clientId ?? null,
      name: options.name,
      description: options.description,
      trigger: options.trigger,
      steps: options.steps,
      category: options.category ?? "workflow",
      successCount: 0,
      failureCount: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async findProcedures(): Promise<Procedure[]> {
    console.warn(
      "[ProceduralMemory] No Supabase configured — returning empty"
    );
    return [];
  }

  async recordOutcome(): Promise<void> {
    console.warn(
      "[ProceduralMemory] No Supabase configured — outcome not recorded"
    );
  }

  async getProceduresByCategory(): Promise<Procedure[]> {
    console.warn(
      "[ProceduralMemory] No Supabase configured — returning empty"
    );
    return [];
  }

  async deactivateProcedure(): Promise<void> {
    console.warn(
      "[ProceduralMemory] No Supabase configured — deactivation skipped"
    );
  }
}

// ─── Singleton Factory ───────────────────────────────────────────────────────

let proceduralMemoryService: ProceduralMemoryService | undefined;

/**
 * Get the procedural memory service singleton.
 * Returns Supabase-backed service if configured, otherwise NoOp fallback.
 */
export function getProceduralMemoryService(): ProceduralMemoryService {
  if (!proceduralMemoryService) {
    const env = getServerEnv();

    if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      proceduralMemoryService = new SupabaseProceduralMemoryService(
        env.SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY
      );
    } else {
      proceduralMemoryService = new NoOpProceduralMemoryService();
    }
  }

  return proceduralMemoryService;
}
