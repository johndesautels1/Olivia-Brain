import { createClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/config/env";
import { getEmbeddingsService } from "./embeddings";

export interface ConversationSearchResult {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  createdAt: string;
  similarity: number;
}

export interface SemanticSearchOptions {
  query: string;
  conversationId?: string;
  clientId?: string;
  limit?: number;
  threshold?: number;
}

export interface SemanticSearchService {
  search(options: SemanticSearchOptions): Promise<ConversationSearchResult[]>;
  embedConversationTurn(turnId: string, content: string): Promise<void>;
  embedUnembeddedTurns(limit?: number): Promise<number>;
}

class SupabaseSemanticSearchService implements SemanticSearchService {
  private supabase;
  private embeddings = getEmbeddingsService();

  constructor(url: string, key: string) {
    this.supabase = createClient(url, key, {
      auth: { persistSession: false },
    });
  }

  async search(options: SemanticSearchOptions): Promise<ConversationSearchResult[]> {
    const { query, conversationId, clientId, limit = 5, threshold = 0.7 } = options;

    // Generate embedding for query
    const { embedding } = await this.embeddings.embed(query);

    // Call the semantic search function
    const { data, error } = await this.supabase.rpc("match_conversation_turns", {
      query_embedding: JSON.stringify(embedding),
      p_conversation_id: conversationId ?? null,
      p_client_id: clientId ?? null,
      match_threshold: threshold,
      match_count: limit,
    });

    if (error) {
      throw new Error(`Semantic search failed: ${error.message}`);
    }

    return (data ?? []).map((row: {
      id: string;
      conversation_id: string;
      role: string;
      content: string;
      created_at: string;
      similarity: number;
    }) => ({
      id: row.id,
      conversationId: row.conversation_id,
      role: row.role,
      content: row.content,
      createdAt: row.created_at,
      similarity: row.similarity,
    }));
  }

  async embedConversationTurn(turnId: string, content: string): Promise<void> {
    const { embedding } = await this.embeddings.embed(content);

    const { error } = await this.supabase
      .from("conversation_turns")
      .update({ embedding: JSON.stringify(embedding) })
      .eq("id", turnId);

    if (error) {
      throw new Error(`Failed to embed turn: ${error.message}`);
    }
  }

  async embedUnembeddedTurns(limit = 100): Promise<number> {
    // Get turns without embeddings
    const { data: turns, error: fetchError } = await this.supabase
      .from("conversation_turns")
      .select("id, content")
      .is("embedding", null)
      .limit(limit);

    if (fetchError) {
      throw new Error(`Failed to fetch unembedded turns: ${fetchError.message}`);
    }

    if (!turns || turns.length === 0) {
      return 0;
    }

    // Generate embeddings in batches
    const batchSize = 20;
    let embedded = 0;

    for (let i = 0; i < turns.length; i += batchSize) {
      const batch = turns.slice(i, i + batchSize);
      const contents = batch.map((t) => t.content);
      const embeddings = await this.embeddings.embedMany(contents);

      // Update each turn with its embedding
      for (let j = 0; j < batch.length; j++) {
        const { error } = await this.supabase
          .from("conversation_turns")
          .update({ embedding: JSON.stringify(embeddings[j].embedding) })
          .eq("id", batch[j].id);

        if (!error) {
          embedded++;
        }
      }
    }

    return embedded;
  }
}

class NoOpSemanticSearchService implements SemanticSearchService {
  async search(): Promise<ConversationSearchResult[]> {
    console.warn("[SemanticSearch] Supabase not configured");
    return [];
  }

  async embedConversationTurn(): Promise<void> {}

  async embedUnembeddedTurns(): Promise<number> {
    return 0;
  }
}

let semanticSearchService: SemanticSearchService | undefined;

export function getSemanticSearchService(): SemanticSearchService {
  if (!semanticSearchService) {
    const env = getServerEnv();

    if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      semanticSearchService = new SupabaseSemanticSearchService(
        env.SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY
      );
    } else {
      semanticSearchService = new NoOpSemanticSearchService();
    }
  }

  return semanticSearchService;
}
