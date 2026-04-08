import { createClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/config/env";
import { getEmbeddingsService } from "./embeddings";

export interface KnowledgeChunk {
  id: string;
  source: string;
  chunkIndex: number;
  chunkText: string;
  metadata: Record<string, unknown>;
  clientId?: string;
  createdAt: string;
}

export interface AddKnowledgeOptions {
  source: string;
  content: string;
  clientId?: string;
  metadata?: Record<string, unknown>;
  chunkSize?: number;
  chunkOverlap?: number;
  ttlDays?: number;
}

export interface SearchKnowledgeOptions {
  query: string;
  clientId?: string;
  limit?: number;
  threshold?: number;
}

export interface SearchResult {
  chunk: KnowledgeChunk;
  similarity: number;
}

export interface KnowledgeService {
  addKnowledge(options: AddKnowledgeOptions): Promise<KnowledgeChunk[]>;
  searchKnowledge(options: SearchKnowledgeOptions): Promise<SearchResult[]>;
  deleteBySource(source: string, clientId?: string): Promise<number>;
}

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentChunk = "";

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());

      // Keep overlap from end of previous chunk
      const words = currentChunk.split(/\s+/);
      const overlapWords = words.slice(-Math.ceil(overlap / 5));
      currentChunk = overlapWords.join(" ") + " " + sentence;
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

class SupabaseKnowledgeService implements KnowledgeService {
  private supabase;
  private embeddings = getEmbeddingsService();

  constructor(url: string, key: string) {
    this.supabase = createClient(url, key, {
      auth: { persistSession: false },
    });
  }

  async addKnowledge(options: AddKnowledgeOptions): Promise<KnowledgeChunk[]> {
    const {
      source,
      content,
      clientId,
      metadata = {},
      chunkSize = 1000,
      chunkOverlap = 200,
      ttlDays,
    } = options;

    // Delete existing chunks from this source first
    await this.deleteBySource(source, clientId);

    // Chunk the content
    const chunks = chunkText(content, chunkSize, chunkOverlap);

    if (chunks.length === 0) {
      return [];
    }

    // Generate embeddings for all chunks
    const embeddings = await this.embeddings.embedMany(chunks);

    // Calculate expires_at if TTL is set
    const expiresAt = ttlDays
      ? new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Insert chunks with embeddings
    const insertData = chunks.map((chunkText, index) => ({
      source,
      chunk_index: index,
      chunk_text: chunkText,
      metadata: { ...metadata, total_chunks: chunks.length },
      embedding: JSON.stringify(embeddings[index].embedding),
      client_id: clientId ?? null,
      expires_at: expiresAt,
    }));

    const { data, error } = await this.supabase
      .from("knowledge_chunks")
      .insert(insertData)
      .select("id, source, chunk_index, chunk_text, metadata, client_id, created_at");

    if (error) {
      throw new Error(`Failed to insert knowledge chunks: ${error.message}`);
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      source: row.source,
      chunkIndex: row.chunk_index,
      chunkText: row.chunk_text,
      metadata: row.metadata,
      clientId: row.client_id,
      createdAt: row.created_at,
    }));
  }

  async searchKnowledge(options: SearchKnowledgeOptions): Promise<SearchResult[]> {
    const { query, clientId, limit = 5, threshold = 0.7 } = options;

    // Generate embedding for query
    const { embedding } = await this.embeddings.embed(query);

    // Call the semantic search function
    const { data, error } = await this.supabase.rpc("match_knowledge_chunks", {
      query_embedding: JSON.stringify(embedding),
      p_client_id: clientId ?? null,
      match_threshold: threshold,
      match_count: limit,
    });

    if (error) {
      throw new Error(`Knowledge search failed: ${error.message}`);
    }

    return (data ?? []).map((row: {
      id: string;
      source: string;
      chunk_text: string;
      metadata: Record<string, unknown>;
      similarity: number;
    }) => ({
      chunk: {
        id: row.id,
        source: row.source,
        chunkIndex: 0,
        chunkText: row.chunk_text,
        metadata: row.metadata,
        createdAt: "",
      },
      similarity: row.similarity,
    }));
  }

  async deleteBySource(source: string, clientId?: string): Promise<number> {
    let query = this.supabase.from("knowledge_chunks").delete().eq("source", source);

    if (clientId) {
      query = query.eq("client_id", clientId);
    }

    const { data, error } = await query.select("id");

    if (error) {
      throw new Error(`Failed to delete knowledge chunks: ${error.message}`);
    }

    return data?.length ?? 0;
  }
}

class NoOpKnowledgeService implements KnowledgeService {
  async addKnowledge(): Promise<KnowledgeChunk[]> {
    console.warn("[Knowledge] Supabase not configured - knowledge not stored");
    return [];
  }

  async searchKnowledge(): Promise<SearchResult[]> {
    return [];
  }

  async deleteBySource(): Promise<number> {
    return 0;
  }
}

let knowledgeService: KnowledgeService | undefined;

export function getKnowledgeService(): KnowledgeService {
  if (!knowledgeService) {
    const env = getServerEnv();

    if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      knowledgeService = new SupabaseKnowledgeService(
        env.SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY
      );
    } else {
      knowledgeService = new NoOpKnowledgeService();
    }
  }

  return knowledgeService;
}
