-- W-014 — match_calendar_memory() RPC for Olivia Brain (2026-05-08)
--
-- Ported from LTM (D:\London-Tech-Map\prisma\sql\add-calendar-memory.sql).
-- Enables cosine-similarity semantic search over the `calendar_memory_chunks`
-- table.
--
-- Prerequisite: pgvector extension must be enabled.
-- Run: CREATE EXTENSION IF NOT EXISTS vector;
--
-- Apply: Paste into Supabase SQL Editor and Run.

-- 1. Ensure pgvector extension exists
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add embedding column to calendar_memory_chunks if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calendar_memory_chunks' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE "calendar_memory_chunks" ADD COLUMN "embedding" vector(1536);
  END IF;
END $$;

-- 3. The match_calendar_memory RPC function
CREATE OR REPLACE FUNCTION match_calendar_memory(
  p_user_id uuid,
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.65,
  match_count int DEFAULT 8
)
RETURNS TABLE (
  id uuid,
  calendar_entry_id uuid,
  text text,
  similarity float,
  entry_title text,
  entry_category text,
  entry_start timestamptz,
  entry_end timestamptz,
  entry_location text
)
LANGUAGE sql STABLE
AS $$
  SELECT
    cmc.id,
    cmc."calendarEntryId" AS calendar_entry_id,
    cmc.text,
    1 - (cmc.embedding <=> query_embedding) AS similarity,
    ce.title AS entry_title,
    ce.category::text AS entry_category,
    ce."startDatetime" AS entry_start,
    ce."endDatetime" AS entry_end,
    ce.location AS entry_location
  FROM calendar_memory_chunks cmc
  JOIN calendar_entries ce ON ce.id = cmc."calendarEntryId"
  WHERE
    cmc."userId" = p_user_id
    AND cmc.embedding IS NOT NULL
    AND ce."isArchived" = false
    AND 1 - (cmc.embedding <=> query_embedding) > match_threshold
  ORDER BY cmc.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- 4. Index for faster similarity search
CREATE INDEX IF NOT EXISTS idx_calendar_memory_embedding
  ON calendar_memory_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 30);

-- 5. Index for user scoping
CREATE INDEX IF NOT EXISTS idx_calendar_memory_user
  ON calendar_memory_chunks ("userId");
