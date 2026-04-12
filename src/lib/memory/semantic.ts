/**
 * Semantic Memory Service
 * Sprint 4.3 — Advanced Memory (Item 3: Semantic Memory Layer)
 *
 * Stores distilled facts, preferences, insights, and constraints that Olivia
 * carries forward as persistent knowledge — not tied to a specific conversation.
 *
 * - Public facts (client_id = null): shared across all clients (world knowledge)
 * - Private facts (client_id = value): isolated to owning client
 * - Contradiction detection: new facts that conflict supersede old ones
 * - Confidence reinforcement: repeated facts gain higher confidence
 * - Decay: unreinforced facts lose confidence over time
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/config/env";
import { getEmbeddingsService } from "./embeddings";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SemanticCategory =
  | "preference"
  | "fact"
  | "insight"
  | "constraint"
  | "learned_skill";

export interface SemanticFact {
  id: string;
  clientId: string | null;
  content: string;
  category: SemanticCategory;
  confidence: number;
  sourceEpisodeIds: string[];
  entityIds: string[];
  supersededBy: string | null;
  lastReinforcedAt: string;
  createdAt: string;
  /** Present only in search results */
  similarity?: number;
}

export interface LearnFactOptions {
  /** The fact content ("Client prefers modern architecture") */
  content: string;
  /** Category of the fact */
  category: SemanticCategory;
  /** If provided, fact is private to this client. If omitted, public knowledge. */
  clientId?: string;
  /** Initial confidence score 0-1 (default: 0.7) */
  confidence?: number;
  /** Episode IDs where this fact was extracted from */
  sourceEpisodeIds?: string[];
  /** Knowledge graph entity IDs this fact relates to */
  entityIds?: string[];
  /**
   * Similarity threshold for contradiction detection.
   * Facts above this similarity with conflicting content get superseded.
   * Default: 0.85 (very similar facts likely about the same thing)
   */
  contradictionThreshold?: number;
}

export interface RecallFactsOptions {
  /** Text query to search semantically */
  query: string;
  /** Client ID — returns public facts + this client's private facts */
  clientId?: string;
  /** Filter by category */
  category?: SemanticCategory;
  /** Include facts that have been superseded (default: false) */
  includeSuperseded?: boolean;
  /** Maximum results (default: 10) */
  limit?: number;
  /** Minimum similarity threshold (default: 0.5) */
  threshold?: number;
}

export interface DecayOptions {
  /** Days since last reinforcement before decay kicks in (default: 60) */
  thresholdDays?: number;
  /** Multiply confidence by this factor (default: 0.9) */
  decayFactor?: number;
  /** Minimum confidence floor — facts won't decay below this (default: 0.1) */
  minConfidence?: number;
}

// ─── Service Interface ───────────────────────────────────────────────────────

export interface SemanticMemoryService {
  learnFact(options: LearnFactOptions): Promise<SemanticFact>;
  recallFacts(options: RecallFactsOptions): Promise<SemanticFact[]>;
  reinforceFact(factId: string): Promise<void>;
  getFactsForEntity(entityId: string, clientId?: string): Promise<SemanticFact[]>;
  decayUnreinforcedFacts(options?: DecayOptions): Promise<number>;
}

// ─── Supabase Implementation ─────────────────────────────────────────────────

class SupabaseSemanticMemoryService implements SemanticMemoryService {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Learn a new fact. Before inserting, checks for contradictions —
   * semantically similar existing facts get superseded by this new one.
   */
  async learnFact(options: LearnFactOptions): Promise<SemanticFact> {
    const {
      content,
      category,
      clientId,
      confidence = 0.7,
      sourceEpisodeIds = [],
      entityIds = [],
      contradictionThreshold = 0.85,
    } = options;

    // Generate embedding for the fact
    const embeddingsService = getEmbeddingsService();
    const { embedding } = await embeddingsService.embed(content);

    // Check for contradictions — find very similar existing facts
    const { data: similar } = await this.supabase.rpc(
      "match_semantic_memories",
      {
        query_embedding: JSON.stringify(embedding),
        p_client_id: clientId ?? null,
        p_category: category,
        p_include_superseded: false,
        match_threshold: contradictionThreshold,
        match_count: 5,
      }
    );

    // Insert the new fact
    const row = {
      client_id: clientId ?? null,
      content,
      category,
      confidence,
      source_episode_ids: sourceEpisodeIds,
      entity_ids: entityIds,
      embedding: JSON.stringify(embedding),
      last_reinforced_at: new Date().toISOString(),
    };

    const { data: inserted, error: insertError } = await this.supabase
      .from("semantic_memories")
      .insert(row)
      .select("id, created_at")
      .single();

    if (insertError) {
      throw new Error(
        `[SemanticMemory] Failed to learn fact: ${insertError.message}`
      );
    }

    // Supersede contradicting facts (point them to this new fact)
    if (similar && similar.length > 0) {
      const supersededIds = similar
        .filter(
          (s: Record<string, unknown>) =>
            (s.id as string) !== inserted.id &&
            (s.content as string) !== content
        )
        .map((s: Record<string, unknown>) => s.id as string);

      if (supersededIds.length > 0) {
        await this.supabase
          .from("semantic_memories")
          .update({ superseded_by: inserted.id })
          .in("id", supersededIds);
      }
    }

    return {
      id: inserted.id,
      clientId: clientId ?? null,
      content,
      category,
      confidence,
      sourceEpisodeIds,
      entityIds,
      supersededBy: null,
      lastReinforcedAt: row.last_reinforced_at,
      createdAt: inserted.created_at,
    };
  }

  /**
   * Recall facts via semantic similarity search.
   * Returns public facts + facts private to the given client.
   * Excludes superseded facts by default.
   */
  async recallFacts(options: RecallFactsOptions): Promise<SemanticFact[]> {
    const {
      query,
      clientId,
      category,
      includeSuperseded = false,
      limit = 10,
      threshold = 0.5,
    } = options;

    const embeddingsService = getEmbeddingsService();
    const { embedding } = await embeddingsService.embed(query);

    const { data, error } = await this.supabase.rpc(
      "match_semantic_memories",
      {
        query_embedding: JSON.stringify(embedding),
        p_client_id: clientId ?? null,
        p_category: category ?? null,
        p_include_superseded: includeSuperseded,
        match_threshold: threshold,
        match_count: limit,
      }
    );

    if (error) {
      throw new Error(
        `[SemanticMemory] Recall failed: ${error.message}`
      );
    }

    return (data ?? []).map(this.rowToFact);
  }

  /**
   * Reinforce a fact — bump confidence and update last_reinforced_at.
   * Called when a fact is confirmed again in conversation.
   * Confidence increases by 10% of the remaining gap to 1.0, capped at 1.0.
   */
  async reinforceFact(factId: string): Promise<void> {
    // Fetch current confidence
    const { data: current, error: fetchError } = await this.supabase
      .from("semantic_memories")
      .select("confidence")
      .eq("id", factId)
      .single();

    if (fetchError) {
      throw new Error(
        `[SemanticMemory] Failed to fetch fact for reinforcement: ${fetchError.message}`
      );
    }

    if (!current) {
      throw new Error(`[SemanticMemory] Fact "${factId}" not found`);
    }

    // Asymptotic reinforcement: gain 10% of remaining gap to 1.0
    const currentConfidence = current.confidence as number;
    const newConfidence = Math.min(
      1.0,
      currentConfidence + (1.0 - currentConfidence) * 0.1
    );

    const { error: updateError } = await this.supabase
      .from("semantic_memories")
      .update({
        confidence: newConfidence,
        last_reinforced_at: new Date().toISOString(),
      })
      .eq("id", factId);

    if (updateError) {
      throw new Error(
        `[SemanticMemory] Failed to reinforce fact: ${updateError.message}`
      );
    }
  }

  /**
   * Get all facts linked to a specific knowledge graph entity.
   * Returns public facts + facts private to the given client.
   * Excludes superseded facts.
   */
  async getFactsForEntity(
    entityId: string,
    clientId?: string
  ): Promise<SemanticFact[]> {
    let query = this.supabase
      .from("semantic_memories")
      .select("*")
      .contains("entity_ids", [entityId])
      .is("superseded_by", null)
      .order("confidence", { ascending: false });

    if (clientId) {
      query = query.or(
        `client_id.is.null,client_id.eq.${clientId}`
      );
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(
        `[SemanticMemory] Entity fact lookup failed: ${error.message}`
      );
    }

    return (data ?? []).map(this.rowToFact);
  }

  /**
   * Decay confidence of facts not reinforced within the threshold period.
   * Uses the decay_semantic_memories RPC function.
   * Returns the number of facts decayed.
   */
  async decayUnreinforcedFacts(options?: DecayOptions): Promise<number> {
    const {
      thresholdDays = 60,
      decayFactor = 0.9,
      minConfidence = 0.1,
    } = options ?? {};

    const { data, error } = await this.supabase.rpc(
      "decay_semantic_memories",
      {
        p_threshold_days: thresholdDays,
        p_decay_factor: decayFactor,
        p_min_confidence: minConfidence,
      }
    );

    if (error) {
      throw new Error(
        `[SemanticMemory] Decay failed: ${error.message}`
      );
    }

    return (data as number) ?? 0;
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Convert a Supabase row to a SemanticFact object.
   */
  private rowToFact(row: Record<string, unknown>): SemanticFact {
    return {
      id: row.id as string,
      clientId: (row.client_id as string) ?? null,
      content: row.content as string,
      category: row.category as SemanticCategory,
      confidence: row.confidence as number,
      sourceEpisodeIds: (row.source_episode_ids as string[]) ?? [],
      entityIds: (row.entity_ids as string[]) ?? [],
      supersededBy: (row.superseded_by as string) ?? null,
      lastReinforcedAt: row.last_reinforced_at as string,
      createdAt: row.created_at as string,
      ...(row.similarity !== undefined
        ? { similarity: row.similarity as number }
        : {}),
    };
  }
}

// ─── NoOp Fallback ───────────────────────────────────────────────────────────

class NoOpSemanticMemoryService implements SemanticMemoryService {
  async learnFact(options: LearnFactOptions): Promise<SemanticFact> {
    console.warn("[SemanticMemory] No Supabase configured — fact not persisted");
    return {
      id: "noop",
      clientId: options.clientId ?? null,
      content: options.content,
      category: options.category,
      confidence: options.confidence ?? 0.7,
      sourceEpisodeIds: options.sourceEpisodeIds ?? [],
      entityIds: options.entityIds ?? [],
      supersededBy: null,
      lastReinforcedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
  }

  async recallFacts(): Promise<SemanticFact[]> {
    console.warn("[SemanticMemory] No Supabase configured — returning empty");
    return [];
  }

  async reinforceFact(): Promise<void> {
    console.warn("[SemanticMemory] No Supabase configured — reinforce skipped");
  }

  async getFactsForEntity(): Promise<SemanticFact[]> {
    console.warn("[SemanticMemory] No Supabase configured — returning empty");
    return [];
  }

  async decayUnreinforcedFacts(): Promise<number> {
    console.warn("[SemanticMemory] No Supabase configured — decay skipped");
    return 0;
  }
}

// ─── Singleton Factory ───────────────────────────────────────────────────────

let semanticMemoryService: SemanticMemoryService | undefined;

/**
 * Get the semantic memory service singleton.
 * Returns Supabase-backed service if configured, otherwise NoOp fallback.
 */
export function getSemanticMemoryService(): SemanticMemoryService {
  if (!semanticMemoryService) {
    const env = getServerEnv();

    if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      semanticMemoryService = new SupabaseSemanticMemoryService(
        env.SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY
      );
    } else {
      semanticMemoryService = new NoOpSemanticMemoryService();
    }
  }

  return semanticMemoryService;
}
