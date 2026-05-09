-- Track O5c session 1 - Avatar A/B harness foundation (2026-05-09)
--
-- Adds one table: avatar_eval_runs (Prisma model: AvatarEvalRun).
-- One row per (vendor, script) MOS rating run. Drives the avatar A/B
-- dashboard at /admin/avatar-eval and the vendor decision rubric:
--     latency * 0.4 + lip-sync MOS * 0.4 + cost * 0.2
-- See docs/O5_AVATAR_LIPSYNC_RESEARCH.md section 5.
--
-- ASCII-only intentionally. Unicode characters (em dash, section sign,
-- multiplication sign) in SQL comments have been observed to mangle
-- the leading -- comment marker via autocorrect on the chat ->
-- clipboard -> Supabase paste path, producing
--     ERROR: 42601: syntax error
-- See README.md "ABSOLUTE RULE" section for the inline-paste contract.
--
-- # Apply
--
-- Paste into Supabase SQL Editor and Run, OR:
--   npx prisma db execute --schema prisma/schema.prisma --file prisma/sql/10-add-avatar-eval-run.sql
--
-- Idempotent: every CREATE uses IF NOT EXISTS.
--
-- # Verify
--
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public'
--     AND table_name = 'avatar_eval_runs';
-- -- Expect 1 row.

CREATE TABLE IF NOT EXISTS "avatar_eval_runs" (
  "id"             UUID           NOT NULL DEFAULT gen_random_uuid(),
  "vendor"         TEXT           NOT NULL,
  "scriptId"       TEXT           NOT NULL,
  "scriptCategory" TEXT           NOT NULL,
  "scriptText"     TEXT           NOT NULL,
  "latencyMs"      INTEGER        NOT NULL,
  "mosScore"       DOUBLE PRECISION,
  "costCents"      INTEGER,
  "raterId"        TEXT,
  "notes"          TEXT,
  "metadata"       JSONB          NOT NULL DEFAULT '{}'::jsonb,
  "createdAt"      TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "avatar_eval_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "avatar_eval_runs_vendor_createdAt_idx"
  ON "avatar_eval_runs" ("vendor", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "avatar_eval_runs_scriptId_vendor_idx"
  ON "avatar_eval_runs" ("scriptId", "vendor");
