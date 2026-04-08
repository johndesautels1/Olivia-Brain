import { MemoryClient } from "mem0ai";
import { createClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/config/env";

export interface Mem0Memory {
  id: string;
  memory: string;
  hash?: string;
  metadata?: Record<string, unknown>;
  score?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AddMemoryOptions {
  clientId: string;
  content: string;
  memoryType?: string;
  metadata?: Record<string, unknown>;
  importanceScore?: number;
  ttlDays?: number;
}

export interface SearchMemoryOptions {
  clientId: string;
  query: string;
  limit?: number;
  memoryType?: string;
}

export interface Mem0Service {
  addMemory(options: AddMemoryOptions): Promise<Mem0Memory[]>;
  searchMemories(options: SearchMemoryOptions): Promise<Mem0Memory[]>;
  getMemories(clientId: string, limit?: number): Promise<Mem0Memory[]>;
  deleteMemory(memoryId: string): Promise<void>;
  syncToSupabase(clientId: string): Promise<number>;
}

class Mem0ServiceImpl implements Mem0Service {
  private client: MemoryClient;
  private supabase;

  constructor(apiKey: string, supabaseUrl?: string, supabaseKey?: string) {
    this.client = new MemoryClient({ apiKey });

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      });
    }
  }

  async addMemory(options: AddMemoryOptions): Promise<Mem0Memory[]> {
    const { clientId, content, memoryType = "general", metadata = {}, importanceScore = 0.5, ttlDays } = options;

    const messages = [{ role: "user" as const, content }];

    const result = await this.client.add(messages, {
      user_id: clientId,
      metadata: {
        ...metadata,
        memory_type: memoryType,
        importance_score: importanceScore,
      },
    });

    // Result is an array of memories from Mem0 SDK
    const rawMemories = Array.isArray(result) ? result : [];

    // Map to our Mem0Memory interface
    const memories: Mem0Memory[] = rawMemories
      .filter((m) => m.id && m.memory)
      .map((m) => ({
        id: m.id,
        memory: m.memory ?? "",
        hash: m.hash,
        metadata: m.metadata as Record<string, unknown> | undefined,
        score: m.score,
        created_at: m.created_at instanceof Date ? m.created_at.toISOString() : m.created_at,
        updated_at: m.updated_at instanceof Date ? m.updated_at.toISOString() : m.updated_at,
      }));

    // Sync to Supabase for local backup if available
    if (this.supabase && memories.length > 0) {
      const expiresAt = ttlDays
        ? new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      for (const mem of memories) {
        await this.supabase.from("mem0_memories").upsert(
          {
            client_id: clientId,
            mem0_id: mem.id,
            memory_type: memoryType,
            content: mem.memory,
            metadata: { ...metadata, hash: mem.hash },
            importance_score: importanceScore,
            expires_at: expiresAt,
            last_accessed_at: new Date().toISOString(),
          },
          { onConflict: "mem0_id" }
        );
      }
    }

    return memories;
  }

  async searchMemories(options: SearchMemoryOptions): Promise<Mem0Memory[]> {
    const { clientId, query, limit = 5, memoryType } = options;

    const result = await this.client.search(query, {
      user_id: clientId,
      limit,
    });

    // Result is an array of memories from Mem0 SDK
    const rawMemories = Array.isArray(result) ? result : [];

    // Map to our Mem0Memory interface
    let memories: Mem0Memory[] = rawMemories
      .filter((m) => m.id && m.memory)
      .map((m) => ({
        id: m.id,
        memory: m.memory ?? "",
        hash: m.hash,
        metadata: m.metadata as Record<string, unknown> | undefined,
        score: m.score,
        created_at: m.created_at instanceof Date ? m.created_at.toISOString() : m.created_at,
        updated_at: m.updated_at instanceof Date ? m.updated_at.toISOString() : m.updated_at,
      }));

    // Filter by memory type if specified
    if (memoryType) {
      memories = memories.filter(
        (m) => m.metadata?.memory_type === memoryType
      );
    }

    // Update last_accessed_at in Supabase
    if (this.supabase && memories.length > 0) {
      const mem0Ids = memories.map((m) => m.id);
      await this.supabase
        .from("mem0_memories")
        .update({ last_accessed_at: new Date().toISOString() })
        .in("mem0_id", mem0Ids);
    }

    return memories;
  }

  async getMemories(clientId: string, limit = 20): Promise<Mem0Memory[]> {
    const result = await this.client.getAll({
      user_id: clientId,
      limit,
    });

    // Result is an array of memories from Mem0 SDK
    const rawMemories = Array.isArray(result) ? result : [];

    return rawMemories
      .filter((m) => m.id && m.memory)
      .map((m) => ({
        id: m.id,
        memory: m.memory ?? "",
        hash: m.hash,
        metadata: m.metadata as Record<string, unknown> | undefined,
        score: m.score,
        created_at: m.created_at instanceof Date ? m.created_at.toISOString() : m.created_at,
        updated_at: m.updated_at instanceof Date ? m.updated_at.toISOString() : m.updated_at,
      }));
  }

  async deleteMemory(memoryId: string): Promise<void> {
    await this.client.delete(memoryId);

    // Also delete from Supabase backup
    if (this.supabase) {
      await this.supabase.from("mem0_memories").delete().eq("mem0_id", memoryId);
    }
  }

  async syncToSupabase(clientId: string): Promise<number> {
    if (!this.supabase) {
      return 0;
    }

    const memories = await this.getMemories(clientId, 100);
    let synced = 0;

    for (const mem of memories) {
      const { error } = await this.supabase.from("mem0_memories").upsert(
        {
          client_id: clientId,
          mem0_id: mem.id,
          memory_type: (mem.metadata?.memory_type as string) ?? "general",
          content: mem.memory,
          metadata: mem.metadata ?? {},
          importance_score: (mem.metadata?.importance_score as number) ?? 0.5,
          last_accessed_at: new Date().toISOString(),
        },
        { onConflict: "mem0_id" }
      );

      if (!error) {
        synced++;
      }
    }

    return synced;
  }
}

class NoOpMem0Service implements Mem0Service {
  async addMemory(): Promise<Mem0Memory[]> {
    console.warn("[Mem0] MEM0_API_KEY not configured - memory not persisted");
    return [];
  }

  async searchMemories(): Promise<Mem0Memory[]> {
    return [];
  }

  async getMemories(): Promise<Mem0Memory[]> {
    return [];
  }

  async deleteMemory(): Promise<void> {}

  async syncToSupabase(): Promise<number> {
    return 0;
  }
}

let mem0Service: Mem0Service | undefined;

export function getMem0Service(): Mem0Service {
  if (!mem0Service) {
    const env = getServerEnv();

    if (env.MEM0_API_KEY) {
      mem0Service = new Mem0ServiceImpl(
        env.MEM0_API_KEY,
        env.SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY
      );
    } else {
      mem0Service = new NoOpMem0Service();
    }
  }

  return mem0Service;
}
