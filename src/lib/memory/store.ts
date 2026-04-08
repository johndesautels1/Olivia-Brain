import { createClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/config/env";

export interface ConversationTurn {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface ConversationStore {
  appendTurn(turn: Omit<ConversationTurn, "id" | "createdAt">): Promise<ConversationTurn>;
  getRecentTurns(conversationId: string, limit?: number): Promise<ConversationTurn[]>;
  recall(conversationId: string, query: string, limit?: number): Promise<string[]>;
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
  async appendTurn(
    turn: Omit<ConversationTurn, "id" | "createdAt">,
  ): Promise<ConversationTurn> {
    const bucket = getMemoryBucket();
    const record: ConversationTurn = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...turn,
    };
    const turns = bucket.turnsByConversation.get(turn.conversationId) ?? [];

    turns.push(record);
    bucket.turnsByConversation.set(turn.conversationId, turns);

    return record;
  }

  async getRecentTurns(conversationId: string, limit = 8) {
    const bucket = getMemoryBucket();
    const turns = bucket.turnsByConversation.get(conversationId) ?? [];

    return turns.slice(-limit);
  }

  async recall(conversationId: string, query: string, limit = 4) {
    const turns = await this.getRecentTurns(conversationId, 12);

    return turns
      .sort((left, right) => rankTurn(right, query) - rankTurn(left, query))
      .slice(0, limit)
      .map((turn) => `${turn.role}: ${turn.content}`);
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

  async appendTurn(
    turn: Omit<ConversationTurn, "id" | "createdAt">,
  ): Promise<ConversationTurn> {
    await this.client.from("conversations").upsert(
      {
        id: turn.conversationId,
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
      },
      {
        onConflict: "id",
      },
    );

    const { data, error } = await this.client
      .from("conversation_turns")
      .insert({
        conversation_id: turn.conversationId,
        role: turn.role,
        content: turn.content,
        metadata: turn.metadata ?? {},
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
      metadata: data.metadata,
    };
  }

  async getRecentTurns(conversationId: string, limit = 8) {
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

  async recall(conversationId: string, query: string, limit = 4) {
    const turns = await this.getRecentTurns(conversationId, 12);

    return turns
      .sort((left, right) => rankTurn(right, query) - rankTurn(left, query))
      .slice(0, limit)
      .map((turn) => `${turn.role}: ${turn.content}`);
  }
}

class SafeConversationStore implements ConversationStore {
  constructor(
    private readonly primary: ConversationStore,
    private readonly fallback: ConversationStore,
  ) {}

  async appendTurn(turn: Omit<ConversationTurn, "id" | "createdAt">) {
    try {
      return await this.primary.appendTurn(turn);
    } catch {
      return this.fallback.appendTurn(turn);
    }
  }

  async getRecentTurns(conversationId: string, limit?: number) {
    try {
      return await this.primary.getRecentTurns(conversationId, limit);
    } catch {
      return this.fallback.getRecentTurns(conversationId, limit);
    }
  }

  async recall(conversationId: string, query: string, limit?: number) {
    try {
      return await this.primary.recall(conversationId, query, limit);
    } catch {
      return this.fallback.recall(conversationId, query, limit);
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
