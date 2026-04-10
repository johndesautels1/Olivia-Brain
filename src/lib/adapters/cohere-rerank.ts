/**
 * Cohere Rerank API Adapter
 *
 * Free tier: 1,000 API calls/month (trial key)
 * Paid: Pay-as-you-go starting at $1/1000 searches
 * Docs: https://docs.cohere.com/reference/rerank
 *
 * Used for: Reranking search results to boost RAG precision
 * Coverage: Global (any language, but best for English)
 *
 * Models:
 * - rerank-english-v3.0 (best for English)
 * - rerank-multilingual-v3.0 (100+ languages)
 * - rerank-english-v2.0 (legacy)
 */

import { getServerEnv } from "@/lib/config/env";

const DEFAULT_TIMEOUT_MS = 30_000;
const COHERE_API_BASE = "https://api.cohere.ai/v1";

// ─── Types ───────────────────────────────────────────────────────────────────

export type RerankModel =
  | "rerank-english-v3.0"
  | "rerank-multilingual-v3.0"
  | "rerank-english-v2.0";

export interface RerankDocument {
  text: string;
  [key: string]: unknown; // Allow additional metadata
}

export interface RerankResult {
  index: number;
  relevance_score: number;
  document?: RerankDocument;
}

export interface RerankResponse {
  id: string;
  results: RerankResult[];
  meta: {
    api_version: {
      version: string;
    };
    billed_units?: {
      search_units: number;
    };
  };
}

export interface RerankOptions {
  model?: RerankModel;
  top_n?: number;
  return_documents?: boolean;
  max_chunks_per_doc?: number;
}

export interface EmbedOptions {
  model?: string;
  input_type?: "search_document" | "search_query" | "classification" | "clustering";
  truncate?: "NONE" | "START" | "END";
}

export interface EmbedResponse {
  id: string;
  embeddings: number[][];
  texts: string[];
  meta: {
    api_version: {
      version: string;
    };
    billed_units?: {
      input_tokens: number;
    };
  };
}

export class CohereRerankAdapterError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryable: boolean;

  constructor({
    code,
    message,
    status,
    retryable = false,
  }: {
    code: string;
    message: string;
    status: number;
    retryable?: boolean;
  }) {
    super(message);
    this.name = "CohereRerankAdapterError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

// ─── Configuration ───────────────────────────────────────────────────────────

function getCohereConfig() {
  const env = getServerEnv();
  return {
    apiKey: env.COHERE_API_KEY,
  };
}

export function isCohereConfigured(): boolean {
  const { apiKey } = getCohereConfig();
  return Boolean(apiKey);
}

function assertConfigured() {
  const { apiKey } = getCohereConfig();
  if (!apiKey) {
    throw new CohereRerankAdapterError({
      code: "COHERE_NOT_CONFIGURED",
      message: "Cohere API key must be configured.",
      status: 503,
    });
  }
  return { apiKey };
}

// ─── Core Request Function ───────────────────────────────────────────────────

interface RequestOptions {
  body: unknown;
  timeoutMs?: number;
}

async function requestCohere<T>(
  endpoint: string,
  options: RequestOptions
): Promise<T> {
  const { apiKey } = assertConfigured();

  const url = `${COHERE_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(options.body),
    signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new CohereRerankAdapterError({
      code: "COHERE_REQUEST_FAILED",
      message: payload?.message ?? `Cohere API request failed with HTTP ${response.status}`,
      status: response.status,
      retryable: response.status >= 500 || response.status === 429,
    });
  }

  return payload as T;
}

// ─── Public API Functions ────────────────────────────────────────────────────

/**
 * Rerank documents by relevance to a query
 */
export async function rerank(
  query: string,
  documents: (string | RerankDocument)[],
  options?: RerankOptions
): Promise<RerankResponse> {
  // Convert string documents to document objects
  const docs = documents.map((d) =>
    typeof d === "string" ? { text: d } : d
  );

  return requestCohere<RerankResponse>("/rerank", {
    body: {
      query,
      documents: docs,
      model: options?.model ?? "rerank-english-v3.0",
      top_n: options?.top_n,
      return_documents: options?.return_documents ?? true,
      max_chunks_per_doc: options?.max_chunks_per_doc,
    },
  });
}

/**
 * Rerank with multilingual support
 */
export async function rerankMultilingual(
  query: string,
  documents: (string | RerankDocument)[],
  options?: Omit<RerankOptions, "model">
): Promise<RerankResponse> {
  return rerank(query, documents, {
    ...options,
    model: "rerank-multilingual-v3.0",
  });
}

/**
 * Generate embeddings for documents
 */
export async function embed(
  texts: string[],
  options?: EmbedOptions
): Promise<EmbedResponse> {
  return requestCohere<EmbedResponse>("/embed", {
    body: {
      texts,
      model: options?.model ?? "embed-english-v3.0",
      input_type: options?.input_type ?? "search_document",
      truncate: options?.truncate ?? "END",
    },
  });
}

// ─── Convenience Functions ───────────────────────────────────────────────────

/**
 * Rerank and return top N results with scores
 */
export async function rerankTopN<T extends Record<string, unknown>>(
  query: string,
  documents: T[],
  textField: keyof T,
  topN: number = 5
): Promise<(T & { _relevanceScore: number; _rank: number })[]> {
  // Extract texts for reranking
  const texts = documents.map((d) => String(d[textField]));

  const response = await rerank(query, texts, {
    top_n: topN,
    return_documents: false,
  });

  // Map results back to original documents with scores
  return response.results.map((r, rank) => ({
    ...documents[r.index],
    _relevanceScore: r.relevance_score,
    _rank: rank + 1,
  }));
}

/**
 * Rerank search results and filter by relevance threshold
 */
export async function rerankWithThreshold<T extends Record<string, unknown>>(
  query: string,
  documents: T[],
  textField: keyof T,
  threshold: number = 0.5
): Promise<(T & { _relevanceScore: number })[]> {
  const texts = documents.map((d) => String(d[textField]));

  const response = await rerank(query, texts, {
    return_documents: false,
  });

  // Filter by threshold and map back to documents
  return response.results
    .filter((r) => r.relevance_score >= threshold)
    .map((r) => ({
      ...documents[r.index],
      _relevanceScore: r.relevance_score,
    }));
}

/**
 * Semantic search: embed query, find similar documents
 */
export async function semanticSearch<T extends Record<string, unknown>>(
  query: string,
  documents: T[],
  textField: keyof T,
  topN: number = 5,
  options?: {
    rerankModel?: RerankModel;
    minScore?: number;
  }
): Promise<{
  results: (T & { _relevanceScore: number; _rank: number })[];
  query: string;
  totalDocuments: number;
}> {
  const texts = documents.map((d) => String(d[textField]));

  // Use rerank for semantic similarity
  const response = await rerank(query, texts, {
    model: options?.rerankModel ?? "rerank-english-v3.0",
    top_n: topN,
    return_documents: false,
  });

  // Filter by min score if specified
  let results = response.results;
  const minScore = options?.minScore;
  if (minScore !== undefined) {
    results = results.filter((r) => r.relevance_score >= minScore);
  }

  return {
    results: results.map((r, rank) => ({
      ...documents[r.index],
      _relevanceScore: r.relevance_score,
      _rank: rank + 1,
    })),
    query,
    totalDocuments: documents.length,
  };
}

/**
 * RAG reranking pipeline: takes retrieval results and reranks for precision
 */
export async function ragRerank<T extends { content: string; source?: string; [key: string]: unknown }>(
  query: string,
  retrievalResults: T[],
  options?: {
    topN?: number;
    minScore?: number;
    model?: RerankModel;
  }
): Promise<{
  rerankedResults: (T & { relevanceScore: number; originalRank: number; newRank: number })[];
  droppedCount: number;
  metadata: {
    query: string;
    model: RerankModel;
    inputCount: number;
    outputCount: number;
  };
}> {
  const model = options?.model ?? "rerank-english-v3.0";
  const topN = options?.topN ?? retrievalResults.length;
  const minScore = options?.minScore ?? 0;

  // Store original ranks
  const docsWithOriginalRank = retrievalResults.map((doc, i) => ({
    ...doc,
    _originalRank: i + 1,
  }));

  const response = await rerank(
    query,
    docsWithOriginalRank.map((d) => d.content),
    {
      model,
      top_n: topN,
      return_documents: false,
    }
  );

  // Filter and map results
  const filtered = response.results.filter((r) => r.relevance_score >= minScore);

  const rerankedResults = filtered.map((r, newRank) => ({
    ...docsWithOriginalRank[r.index],
    relevanceScore: r.relevance_score,
    originalRank: docsWithOriginalRank[r.index]._originalRank,
    newRank: newRank + 1,
  }));

  // Remove internal field
  rerankedResults.forEach((r) => {
    delete (r as Record<string, unknown>)._originalRank;
  });

  return {
    rerankedResults,
    droppedCount: retrievalResults.length - rerankedResults.length,
    metadata: {
      query,
      model,
      inputCount: retrievalResults.length,
      outputCount: rerankedResults.length,
    },
  };
}

/**
 * Cross-encoder style comparison: compare query against single document
 */
export async function compareRelevance(
  query: string,
  document: string
): Promise<{
  relevanceScore: number;
  isRelevant: boolean;
  confidence: "high" | "medium" | "low";
}> {
  const response = await rerank(query, [document], {
    return_documents: false,
  });

  const score = response.results[0]?.relevance_score ?? 0;

  let confidence: "high" | "medium" | "low";
  if (score > 0.8 || score < 0.2) confidence = "high";
  else if (score > 0.6 || score < 0.4) confidence = "medium";
  else confidence = "low";

  return {
    relevanceScore: score,
    isRelevant: score >= 0.5,
    confidence,
  };
}

// ─── Utility Functions ───────────────────────────────────────────────────────

/**
 * Calculate rerank improvement metrics
 */
export function calculateRerankMetrics(
  results: { originalRank: number; newRank: number; relevanceScore: number }[]
): {
  avgScoreImprovement: number;
  rankChanges: { improved: number; unchanged: number; dropped: number };
  topNPrecision: Record<number, number>;
} {
  let improved = 0;
  let unchanged = 0;
  let dropped = 0;

  for (const r of results) {
    if (r.newRank < r.originalRank) improved++;
    else if (r.newRank === r.originalRank) unchanged++;
    else dropped++;
  }

  // Calculate precision at different N values
  const topNPrecision: Record<number, number> = {};
  for (const n of [1, 3, 5, 10]) {
    const topN = results.filter((r) => r.newRank <= n);
    const relevant = topN.filter((r) => r.relevanceScore >= 0.5);
    topNPrecision[n] = topN.length > 0 ? relevant.length / topN.length : 0;
  }

  const avgScore = results.length > 0
    ? results.reduce((sum, r) => sum + r.relevanceScore, 0) / results.length
    : 0;

  return {
    avgScoreImprovement: avgScore,
    rankChanges: { improved, unchanged, dropped },
    topNPrecision,
  };
}

/**
 * Interpret relevance score
 */
export function interpretRelevanceScore(score: number): {
  level: "highly_relevant" | "relevant" | "somewhat_relevant" | "not_relevant";
  description: string;
  color: string;
} {
  if (score >= 0.8) {
    return {
      level: "highly_relevant",
      description: "Highly relevant - strong semantic match",
      color: "green",
    };
  }
  if (score >= 0.5) {
    return {
      level: "relevant",
      description: "Relevant - good semantic match",
      color: "blue",
    };
  }
  if (score >= 0.3) {
    return {
      level: "somewhat_relevant",
      description: "Somewhat relevant - partial match",
      color: "yellow",
    };
  }
  return {
    level: "not_relevant",
    description: "Not relevant - weak or no match",
    color: "red",
  };
}
