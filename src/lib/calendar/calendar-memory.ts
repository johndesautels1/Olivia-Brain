/**
 * Calendar Memory — pgvector embeddings for semantic calendar search
 *
 * Embeds calendar entry descriptions using OpenAI text-embedding-3-small
 * (1536 dimensions) and stores them in calendar_memory_chunks for
 * cosine-similarity semantic search.
 *
 * Follows the VideoTranscriptChunk pattern — uses prisma.$executeRawUnsafe
 * for vector operations since Prisma can't natively handle pgvector types.
 */

import prisma from "@/lib/db/client";
import { generateEmbedding } from "@/lib/video/embeddings";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CalendarMemoryResult {
  id: string;
  calendarEntryId: string;
  text: string;
  similarity: number;
  entryTitle: string;
  entryCategory: string;
  entryStart: string;
  entryEnd: string;
  entryLocation: string | null;
}

export interface EmbedResult {
  entriesProcessed: number;
  chunksCreated: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Build embeddable text from a calendar entry
// ---------------------------------------------------------------------------

function buildEmbeddingText(entry: {
  title: string;
  description?: string | null;
  category: string;
  location?: string | null;
  ecosystemOrgName?: string | null;
  investmentStage?: string | null;
  tagsJson?: unknown;
  startDatetime: Date;
}): string {
  const parts: string[] = [];

  parts.push(`Event: ${entry.title}`);
  parts.push(`Category: ${entry.category.replace(/_/g, " ")}`);

  if (entry.description) {
    parts.push(`Description: ${entry.description}`);
  }
  if (entry.location) {
    parts.push(`Location: ${entry.location}`);
  }
  if (entry.ecosystemOrgName) {
    parts.push(`Organization: ${entry.ecosystemOrgName}`);
  }
  if (entry.investmentStage) {
    parts.push(`Investment stage: ${entry.investmentStage.replace(/_/g, " ")}`);
  }

  const tags = Array.isArray(entry.tagsJson) ? entry.tagsJson : [];
  if (tags.length > 0) {
    parts.push(`Tags: ${tags.join(", ")}`);
  }

  // Include date context for temporal awareness
  const dateStr = entry.startDatetime.toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  parts.push(`Date: ${dateStr}`);

  return parts.join(". ");
}

// ---------------------------------------------------------------------------
// Embed a single calendar entry
// ---------------------------------------------------------------------------

/**
 * Generate and store an embedding for a calendar entry.
 * Creates/updates a CalendarMemoryChunk with the vector.
 */
export async function embedCalendarEntry(
  calendarEntryId: string,
  userId: string
): Promise<boolean> {
  const entry = await prisma.calendarEntry.findFirst({
    where: { id: calendarEntryId, userId, isArchived: false },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      location: true,
      ecosystemOrgName: true,
      investmentStage: true,
      tagsJson: true,
      startDatetime: true,
    },
  });

  if (!entry) return false;

  const text = buildEmbeddingText(entry);

  try {
    const embedding = await generateEmbedding(text);
    if (embedding.length === 0) return false;

    const embeddingStr = `[${embedding.join(",")}]`;

    // Upsert via raw SQL (Prisma can't handle vector type)
    await prisma.$executeRawUnsafe(
      `INSERT INTO calendar_memory_chunks (id, "userId", "calendarEntryId", "chunkIndex", text, embedding, "createdAt")
       VALUES (gen_random_uuid(), $1, $2, 0, $3, $4::vector, NOW())
       ON CONFLICT ("calendarEntryId", "chunkIndex") DO UPDATE
       SET text = EXCLUDED.text, embedding = EXCLUDED.embedding`,
      userId,
      calendarEntryId,
      text,
      embeddingStr
    );

    return true;
  } catch (err) {
    console.error(`[Calendar Memory] Failed to embed entry ${calendarEntryId}:`, err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Batch embed un-embedded entries for a user
// ---------------------------------------------------------------------------

/**
 * Find calendar entries without embeddings and generate them.
 * Processes up to `batchSize` entries per call.
 */
export async function embedPendingEntries(
  userId: string,
  batchSize: number = 10
): Promise<EmbedResult> {
  const result: EmbedResult = { entriesProcessed: 0, chunksCreated: 0, errors: [] };

  // Find entries that don't have memory chunks yet
  const entries = await prisma.calendarEntry.findMany({
    where: {
      userId,
      isArchived: false,
      memoryChunks: { none: {} },
    },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      location: true,
      ecosystemOrgName: true,
      investmentStage: true,
      tagsJson: true,
      startDatetime: true,
    },
    orderBy: { startDatetime: "desc" },
    take: batchSize,
  });

  for (const entry of entries) {
    result.entriesProcessed++;
    const text = buildEmbeddingText(entry);

    try {
      const embedding = await generateEmbedding(text);
      if (embedding.length === 0) {
        result.errors.push(`${entry.title}: empty embedding returned`);
        continue;
      }

      const embeddingStr = `[${embedding.join(",")}]`;

      await prisma.$executeRawUnsafe(
        `INSERT INTO calendar_memory_chunks (id, "userId", "calendarEntryId", "chunkIndex", text, embedding, "createdAt")
         VALUES (gen_random_uuid(), $1, $2, 0, $3, $4::vector, NOW())
         ON CONFLICT ("calendarEntryId", "chunkIndex") DO UPDATE
         SET text = EXCLUDED.text, embedding = EXCLUDED.embedding`,
        userId,
        entry.id,
        text,
        embeddingStr
      );

      result.chunksCreated++;
    } catch (err) {
      result.errors.push(
        `${entry.title}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Semantic search across calendar memory
// ---------------------------------------------------------------------------

/**
 * Search calendar memory by semantic similarity.
 * Uses the match_calendar_memory() PostgreSQL function for cosine distance search.
 */
export async function searchCalendarMemory(
  userId: string,
  query: string,
  options: {
    matchThreshold?: number;
    matchCount?: number;
  } = {}
): Promise<CalendarMemoryResult[]> {
  const { matchThreshold = 0.65, matchCount = 8 } = options;

  const queryEmbedding = await generateEmbedding(query);
  if (queryEmbedding.length === 0) return [];

  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  try {
    const results: {
      id: string;
      calendar_entry_id: string;
      text: string;
      similarity: number;
      entry_title: string;
      entry_category: string;
      entry_start: Date;
      entry_end: Date;
      entry_location: string | null;
    }[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM match_calendar_memory($1, $2::vector, $3, $4)`,
      userId,
      embeddingStr,
      matchThreshold,
      matchCount
    );

    return results.map((r) => ({
      id: r.id,
      calendarEntryId: r.calendar_entry_id,
      text: r.text,
      similarity: r.similarity,
      entryTitle: r.entry_title,
      entryCategory: r.entry_category,
      entryStart: r.entry_start instanceof Date ? r.entry_start.toISOString() : String(r.entry_start),
      entryEnd: r.entry_end instanceof Date ? r.entry_end.toISOString() : String(r.entry_end),
      entryLocation: r.entry_location,
    }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("match_calendar_memory") ||
      msg.includes("vector") ||
      msg.includes("does not exist")
    ) {
      console.warn(
        "[Calendar Memory] pgvector function not found. Run prisma/sql/add-calendar-memory.sql in Supabase SQL Editor."
      );
      return [];
    }
    throw err;
  }
}
