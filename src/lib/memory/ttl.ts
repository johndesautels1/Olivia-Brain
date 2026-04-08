import { createClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/config/env";

export interface TTLCleanupResult {
  deletedCount: number;
  decayedCount: number;
}

export interface TTLConfig {
  conversationTurnsTTLDays?: number;
  knowledgeChunksTTLDays?: number;
  mem0MemoriesTTLDays?: number;
  decayFactor?: number;
  accessThresholdDays?: number;
}

export interface TTLService {
  cleanupExpired(): Promise<number>;
  decayImportance(config?: { decayFactor?: number; accessThresholdDays?: number }): Promise<number>;
  setTTL(table: "conversation_turns" | "knowledge_chunks" | "mem0_memories", id: string, ttlDays: number): Promise<void>;
  runMaintenanceCycle(config?: TTLConfig): Promise<TTLCleanupResult>;
}

class SupabaseTTLService implements TTLService {
  private supabase;

  constructor(url: string, key: string) {
    this.supabase = createClient(url, key, {
      auth: { persistSession: false },
    });
  }

  async cleanupExpired(): Promise<number> {
    const { data, error } = await this.supabase.rpc("cleanup_expired_memories");

    if (error) {
      throw new Error(`TTL cleanup failed: ${error.message}`);
    }

    return data ?? 0;
  }

  async decayImportance(config?: { decayFactor?: number; accessThresholdDays?: number }): Promise<number> {
    const { decayFactor = 0.95, accessThresholdDays = 30 } = config ?? {};

    const { data, error } = await this.supabase.rpc("decay_memory_importance", {
      decay_factor: decayFactor,
      access_threshold_days: accessThresholdDays,
    });

    if (error) {
      throw new Error(`Importance decay failed: ${error.message}`);
    }

    return data ?? 0;
  }

  async setTTL(
    table: "conversation_turns" | "knowledge_chunks" | "mem0_memories",
    id: string,
    ttlDays: number
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await this.supabase.from(table).update({ expires_at: expiresAt }).eq("id", id);

    if (error) {
      throw new Error(`Failed to set TTL: ${error.message}`);
    }
  }

  async runMaintenanceCycle(config?: TTLConfig): Promise<TTLCleanupResult> {
    const {
      decayFactor = 0.95,
      accessThresholdDays = 30,
    } = config ?? {};

    // Step 1: Clean up expired entries
    const deletedCount = await this.cleanupExpired();

    // Step 2: Decay importance scores for stale memories
    const decayedCount = await this.decayImportance({ decayFactor, accessThresholdDays });

    return { deletedCount, decayedCount };
  }
}

class NoOpTTLService implements TTLService {
  async cleanupExpired(): Promise<number> {
    console.warn("[TTL] Supabase not configured");
    return 0;
  }

  async decayImportance(): Promise<number> {
    return 0;
  }

  async setTTL(): Promise<void> {}

  async runMaintenanceCycle(): Promise<TTLCleanupResult> {
    return { deletedCount: 0, decayedCount: 0 };
  }
}

let ttlService: TTLService | undefined;

export function getTTLService(): TTLService {
  if (!ttlService) {
    const env = getServerEnv();

    if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      ttlService = new SupabaseTTLService(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    } else {
      ttlService = new NoOpTTLService();
    }
  }

  return ttlService;
}

// Default TTL configurations for different memory types
export const DEFAULT_TTL_CONFIG = {
  // Short-lived memories (7 days)
  ephemeral: 7,

  // Standard memories (30 days)
  standard: 30,

  // Long-term memories (90 days)
  longTerm: 90,

  // Permanent memories (null = no expiry)
  permanent: null,
} as const;

// Memory type to TTL mapping
export const MEMORY_TYPE_TTL: Record<string, number | null> = {
  // Conversation context - short lived
  context: DEFAULT_TTL_CONFIG.ephemeral,

  // User preferences - long term
  preference: DEFAULT_TTL_CONFIG.longTerm,

  // Facts about the user - permanent
  fact: DEFAULT_TTL_CONFIG.permanent,

  // Task-related memories - standard
  task: DEFAULT_TTL_CONFIG.standard,

  // General memories - standard
  general: DEFAULT_TTL_CONFIG.standard,
};
