import { createOpenAI } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";

import { getServerEnv } from "@/lib/config/env";

export interface EmbeddingResult {
  embedding: number[];
  usage: { tokens: number };
}

export interface EmbeddingsService {
  embed(text: string): Promise<EmbeddingResult>;
  embedMany(texts: string[]): Promise<EmbeddingResult[]>;
}

class OpenAIEmbeddingsService implements EmbeddingsService {
  private model;

  constructor(apiKey: string) {
    const openai = createOpenAI({ apiKey });
    this.model = openai.embedding("text-embedding-3-small");
  }

  async embed(text: string): Promise<EmbeddingResult> {
    const result = await embed({
      model: this.model,
      value: text,
    });

    return {
      embedding: result.embedding,
      usage: { tokens: result.usage?.tokens ?? 0 },
    };
  }

  async embedMany(texts: string[]): Promise<EmbeddingResult[]> {
    if (texts.length === 0) {
      return [];
    }

    const result = await embedMany({
      model: this.model,
      values: texts,
    });

    return result.embeddings.map((emb, i) => ({
      embedding: emb,
      usage: { tokens: Math.ceil((result.usage?.tokens ?? 0) / texts.length) },
    }));
  }
}

class NoOpEmbeddingsService implements EmbeddingsService {
  async embed(): Promise<EmbeddingResult> {
    console.warn("[Embeddings] OPENAI_API_KEY not configured - returning zero vector");
    return {
      embedding: new Array(1536).fill(0),
      usage: { tokens: 0 },
    };
  }

  async embedMany(texts: string[]): Promise<EmbeddingResult[]> {
    return texts.map(() => ({
      embedding: new Array(1536).fill(0),
      usage: { tokens: 0 },
    }));
  }
}

let embeddingsService: EmbeddingsService | undefined;

export function getEmbeddingsService(): EmbeddingsService {
  if (!embeddingsService) {
    const env = getServerEnv();

    if (env.OPENAI_API_KEY) {
      embeddingsService = new OpenAIEmbeddingsService(env.OPENAI_API_KEY);
    } else {
      embeddingsService = new NoOpEmbeddingsService();
    }
  }

  return embeddingsService;
}
