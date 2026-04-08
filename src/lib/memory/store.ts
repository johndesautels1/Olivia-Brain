import { createClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/config/env";
import { getEmbeddingsService } from "./embeddings";

export interface ConversationTurn {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  clientId?: string;
  metadata?: Record<string, unknown>;
}

interface AppendTurnOptions extends Omit<ConversationTurn, "id" | "createdAt"> {
  generateEmbedding?: boolean;
  ttlDays?: number;
}

interface ConversationStore {
  appendTurn(turn: AppendTurnOptions): Promise<ConversationTurn>;
  getRecentTurns(conversationId: string, limit?: number, clientId?: string): Promise<ConversationTurn[]>;
  recall(conversationId: string, query: string, limit?: number, clientId?: string): Promise<string[]>;
  setConversationClient(conversationId: string, clientId: string): Promise<void>;
}

type MemoryBucket = {
  turnsByConversation: Map<string, ConversationTurn[]>;
};

declare global {
  var __oliviaMemoryBucket: MemoryBucket | undefined;
}

function getMemoryBucket() {
  if (!globalThis.__oliviaMemoryBucket) {
    globalThis.__oliviaMemoryBucket = {
      turnsByConversation: new Map<string, ConversationTurn[]>(),
    };
  }

  return globalThis.__oliviaMemoryBucket;
}

function tokenize(value: string) {
  return new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .filter((token) => token.length > 2),
  );
}

function rankTurn(turn: ConversationTurn, query: string) {
  const queryTokens = tokenize(query);
  const contentTokens = tokenize(turn.content);
  const overlap = Array.from(queryTokens).filter((token) =>
    contentTokens.has(token),
  ).length;
  const recencyBias = Number(new Date(turn.createdAt));

  return overlap * 1000 + recencyBias;
}

class InMemoryConversationStore implements ConversationStore {
  private conversationClients = new Map<string, string>();

  async appendTurn(turn: AppendTurnOptions): Promise<ConversationTurn> {
    const bucket = getMemoryBucket();
    const { generateEmbedding: _, ttlDays: __, ...turnData } = turn;
    const record: ConversationTurn = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...turnData,
    };
    const turns = bucket.turnsByConversation.get(turn.conversationId) ?? [];

    turns.push(record);
    bucket.turnsByConversation.set(turn.conversationId, turns);

    return record;
  }

  async getRecentTurns(conversationId: string, limit = 8, clientId?: string) {
    const bucket = getMemoryBucket();
    let turns = bucket.turnsByConversation.get(conversationId) ?? [];

    // Filter by client ID if specified
    if (clientId) {
      const convClientId = this.conversationClients.get(conversationId);
      if (convClientId && convClientId !== clientId) {
        return []; // Different client, no access
      }
    }

    return turns.slice(-limit);
  }

  async recall(conversationId: string, query: string, limit = 4, clientId?: string) {
    const turns = await this.getRecentTurns(conversationId, 12, clientId);

    return turns
      .sort((left, right) => rankTurn(right, query) - rankTurn(left, query))
      .slice(0, limit)
      .map((turn) => `${turn.role}: ${turn.content}`);
  }

  async setConversationClient(conversationId: string, clientId: string): Promise<void> {
    this.conversationClients.set(conversationId, clientId);
  }
}

class SupabaseConversationStore implements ConversationStore {
  private client = createClient(
    getServerEnv().SUPABASE_URL!,
    getServerEnv().SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
      },
    },
  );

  async appendTurn(turn: AppendTurnOptions): Promise<ConversationTurn> {
    const { generateEmbedding = false, ttlDays, clientId, ...turnData } = turn;

    // Upsert conversation with client_id
    await this.client.from("conversations").upsert(
      {
        id: turn.conversationId,
        client_id: clientId ?? null,
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
      },
      {
        onConflict: "id",
      },
    );

    // Generate embedding if requested
    let embedding: number[] | null = null;
    if (generateEmbedding) {
      try {
        const embeddingsService = getEmbeddingsService();
        const result = await embeddingsService.embed(turn.content);
        embedding = result.embedding;
      } catch {
        // Continue without embedding if it fails
      }
    }

    // Calculate expires_at if TTL is set
    const expiresAt = ttlDays
      ? new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { data, error } = await this.client
      .from("conversation_turns")
      .insert({
        conversation_id: turn.conversationId,
        role: turn.role,
        content: turn.content,
        metadata: turn.metadata ?? {},
        embedding: embedding ? JSON.stringify(embedding) : null,
        expires_at: expiresAt,
      })
      .select("id, conversation_id, role, content, created_at, metadata")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Supabase could not insert conversation turn.");
    }

    return {
      id: data.id,
      conversationId: data.conversation_id,
      role: data.role,
      content: data.content,
      createdAt: data.created_at,
      clientId,
      metadata: data.metadata,
    };
  }

  async getRecentTurns(conversationId: string, limit = 8, clientId?: string) {
    // First verify client has access to this conversation
    if (clientId) {
      const { data: conv } = await this.client
        .from("conversations")
        .select("client_id")
        .eq("id", conversationId)
        .single();

      if (conv?.client_id && conv.client_id !== clientId) {
        return []; // Different client, no access
      }
    }

    const { data, error } = await this.client
      .from("conversation_turns")
      .select("id, conversation_id, role, content, created_at, metadata")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? [])
      .map((row) => ({
        id: row.id,
        conversationId: row.conversation_id,
        role: row.role,
        content: row.content,
        createdAt: row.created_at,
        metadata: row.metadata,
      }))
      .reverse();
  }

  async recall(conversationId: string, query: string, limit = 4, clientId?: string) {
    // Try semantic search first if embeddings are available
    try {
      const embeddingsService = getEmbeddingsService();
      const { embedding } = await embeddingsService.embed(query);

      const { data } = await this.client.rpc("match_conversation_turns", {
        query_embedding: JSON.stringify(embedding),
        p_conversation_id: conversationId,
        p_client_id: clientId ?? null,
        match_threshold: 0.7,
        match_count: limit,
      });

      if (data && data.length > 0) {
        return data.map((row: { role: string; content: string }) => `${row.role}: ${row.content}`);
      }
    } catch {
      // Fall back to token-based ranking
    }

    // Fallback: token-based ranking
    const turns = await this.getRecentTurns(conversationId, 12, clientId);

    return turns
      .sort((left, right) => rankTurn(right, query) - rankTurn(left, query))
      .slice(0, limit)
      .map((turn) => `${turn.role}: ${turn.content}`);
  }

  async setConversationClient(conversationId: string, clientId: string): Promise<void> {
    await this.client
      .from("conversations")
      .update({ client_id: clientId })
      .eq("id", conversationId);
  }
}

class SafeConversationStore implements ConversationStore {
  constructor(
    private readonly primary: ConversationStore,
    private readonly fallback: ConversationStore,
  ) {}

  async appendTurn(turn: AppendTurnOptions) {
    try {
      return await this.primary.appendTurn(turn);
    } catch {
      return this.fallback.appendTurn(turn);
    }
  }

  async getRecentTurns(conversationId: string, limit?: number, clientId?: string) {
    try {
      return await this.primary.getRecentTurns(conversationId, limit, clientId);
    } catch {
      return this.fallback.getRecentTurns(conversationId, limit, clientId);
    }
  }

  async recall(conversationId: string, query: string, limit?: number, clientId?: string) {
    try {
      return await this.primary.recall(conversationId, query, limit, clientId);
    } catch {
      return this.fallback.recall(conversationId, query, limit, clientId);
    }
  }

  async setConversationClient(conversationId: string, clientId: string): Promise<void> {
    try {
      await this.primary.setConversationClient(conversationId, clientId);
    } catch {
      await this.fallback.setConversationClient(conversationId, clientId);
    }
  }
}

export function getConversationStore(): ConversationStore {
  const env = getServerEnv();
  const fallbackStore = new InMemoryConversationStore();

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return fallbackStore;
  }

  return new SafeConversationStore(new SupabaseConversationStore(), fallbackStore);
}
