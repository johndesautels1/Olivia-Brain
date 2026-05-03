/**
 * Video Embeddings — Transcript Chunking + OpenAI Embedding Generation
 *
 * Used by G2-227 to chunk transcripts into ~45-second windows with
 * 10-second overlap, generate vector embeddings via OpenAI
 * text-embedding-3-small, and store in video_transcript_chunks.
 *
 * Used by the search API to embed queries and call match_video_chunks().
 */

import prisma from "@/lib/db/client";

// ─────────────────────────────────────────────
// Transcript Chunking
// ─────────────────────────────────────────────

export interface TranscriptChunk {
  chunkIndex: number;
  startSeconds: number;
  endSeconds: number;
  text: string;
}

/**
 * Split transcript text into overlapping chunks.
 *
 * Strategy: ~45 seconds of content per chunk with 10-second overlap.
 * Since we don't have precise timestamps for every word, we estimate
 * based on average speaking rate (~150 words/minute = 2.5 words/sec).
 *
 * For transcripts without timing data, we chunk by word count:
 * - ~112 words per 45-second chunk (2.5 words/sec × 45s)
 * - ~25 words overlap (10 seconds)
 */
export function chunkTranscript(
  text: string,
  chunkDurationSec = 45,
  overlapSec = 10,
): TranscriptChunk[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const wordsPerSecond = 2.5;
  const chunkWordCount = Math.round(chunkDurationSec * wordsPerSecond);
  const overlapWordCount = Math.round(overlapSec * wordsPerSecond);
  const stepSize = chunkWordCount - overlapWordCount;

  const chunks: TranscriptChunk[] = [];
  let chunkIndex = 0;

  for (let i = 0; i < words.length; i += stepSize) {
    const chunkWords = words.slice(i, i + chunkWordCount);
    if (chunkWords.length < 10) break; // Skip tiny trailing chunks

    const startSeconds = Math.round(i / wordsPerSecond);
    const endSeconds = Math.round((i + chunkWords.length) / wordsPerSecond);

    chunks.push({
      chunkIndex,
      startSeconds,
      endSeconds,
      text: chunkWords.join(" "),
    });

    chunkIndex++;
  }

  return chunks;
}

// ─────────────────────────────────────────────
// OpenAI Embedding Generation
// ─────────────────────────────────────────────

/**
 * Generate a 1536-dimensional embedding vector via OpenAI text-embedding-3-small.
 * Cost: ~$0.00002 per 1K tokens (~$0.02 per 1M tokens).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  // Truncate to ~8000 tokens (~32K chars) to stay within model limits
  const truncated = text.slice(0, 32000);

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: truncated,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI embeddings API ${res.status}: ${errText}`);
  }

  const json = await res.json();
  return json.data?.[0]?.embedding ?? [];
}

// ─────────────────────────────────────────────
// Semantic Search
// ─────────────────────────────────────────────

export interface SearchResult {
  id: string;
  videoId: string;
  chunkIndex: number;
  startSeconds: number;
  endSeconds: number;
  text: string;
  similarity: number;
  videoTitle: string;
  videoSlug: string;
  videoPlatformId: string;
  channelTitle: string | null;
  thumbnailUrl: string | null;
}

/**
 * Search video transcripts using semantic similarity.
 * Embeds the query, then calls match_video_chunks() via Prisma raw SQL.
 */
export async function semanticSearch(
  query: string,
  options: {
    matchThreshold?: number;
    matchCount?: number;
  } = {},
): Promise<SearchResult[]> {
  const { matchThreshold = 0.7, matchCount = 10 } = options;

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  if (queryEmbedding.length === 0) {
    return [];
  }

  // Call the match_video_chunks() function via raw SQL
  // This requires pgvector extension + match_video_chunks() function to exist in Supabase.
  // If not enabled yet, return empty results with a warning instead of crashing.
  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  let results: {
    id: string;
    video_id: string;
    chunk_index: number;
    start_seconds: number;
    end_seconds: number;
    text: string;
    similarity: number;
    video_title: string;
    video_slug: string;
    video_platform_id: string;
    channel_title: string | null;
    thumbnail_url: string | null;
  }[];

  try {
    results = await prisma.$queryRawUnsafe(
      `SELECT * FROM match_video_chunks($1::vector, $2, $3)`,
      embeddingStr,
      matchThreshold,
      matchCount,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // pgvector not enabled or function doesn't exist — return empty results
    if (msg.includes("match_video_chunks") || msg.includes("vector") || msg.includes("does not exist")) {
      console.warn("[Video Search] pgvector not enabled or match_video_chunks() not created. Run prisma/sql/add-pgvector.sql in Supabase SQL Editor.");
      return [];
    }
    throw err;
  }

  return results.map((r) => ({
    id: r.id,
    videoId: r.video_id,
    chunkIndex: r.chunk_index,
    startSeconds: r.start_seconds,
    endSeconds: r.end_seconds,
    text: r.text,
    similarity: r.similarity,
    videoTitle: r.video_title,
    videoSlug: r.video_slug,
    videoPlatformId: r.video_platform_id,
    channelTitle: r.channel_title,
    thumbnailUrl: r.thumbnail_url,
  }));
}
