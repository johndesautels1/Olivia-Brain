-- ============================================================================
-- 14-add-cristiano-verdict.sql
-- Cristiano verdict library — Olivia Brain
-- ============================================================================
--
-- Adds the cristiano_verdicts table that federates judge verdicts from
-- OB itself (/api/cristiano/judge) and from linked apps via the gateway
-- push endpoint (/api/gateway/cristiano/verdicts). Powers the three
-- Cristiano dashboard sub-tabs.
--
-- Idempotency: UNIQUE(user_id, request_hash) means re-firing the same
-- request for the same user returns the existing verdict instead of
-- double-rendering. Hash is the SHA256 hex of the canonicalised request
-- payload (see src/lib/cristiano/hash.ts).
--
-- Privacy: this table NEVER projects onto any public surface. userId is
-- the canonical owner key (mirrors the UserCompanyDeadline privacy
-- contract in ~/CLAUDE.md).
--
-- Schema-prisma reconciliation: this migration is paired byte-for-byte
-- with the CristianoVerdict model added to prisma/schema.prisma in the
-- same commit. Per feedback_raw_sql_columns_must_reconcile, both land
-- together so a future prisma db push cannot drop columns.
--
-- Operator action: apply via Supabase SQL editor on
-- db.lumfvloapckluhzvtgdn.supabase.co (Olivia Brain production). The
-- migration is idempotent — re-running is safe.
--
-- Held to Apple / Microsoft / Google 2026 leading coding practices per
-- ~/CLAUDE.md and docs/api-specs/_MASTER_REGISTER.md section 10.4.
-- ============================================================================

CREATE TABLE IF NOT EXISTS "cristiano_verdicts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,

    -- Verdict identity
    "kind" TEXT NOT NULL,
    "sourceApp" TEXT NOT NULL DEFAULT 'ob',
    "externalId" TEXT,

    -- Request payload (kept for replay)
    "requestPayload" JSONB NOT NULL,
    "requestHash" CHAR(64) NOT NULL,

    -- Verdict response
    "verdictBody" JSONB NOT NULL,
    "spokenScript" TEXT NOT NULL,
    "verdictTitle" TEXT NOT NULL,

    -- Presentation artifacts
    "preRenderedVideoUrl" TEXT,
    "thumbnailUrl" TEXT,
    "durationSeconds" INTEGER,

    -- Status + tracing
    "status" TEXT NOT NULL DEFAULT 'ready',
    "errorMessage" TEXT,
    "modelUsed" TEXT,
    "tokenInputCount" INTEGER,
    "tokenOutputCount" INTEGER,
    "latencyMs" INTEGER,

    -- Provenance
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "cristiano_verdicts_pkey" PRIMARY KEY ("id")
);

-- Idempotency constraint: (user, request hash) is unique. Re-firing
-- the same request from the same user returns the existing row.
CREATE UNIQUE INDEX IF NOT EXISTS "cristiano_verdicts_userId_requestHash_key"
    ON "cristiano_verdicts" ("userId", "requestHash");

-- Verdict library scrolling — newest verdicts first per user.
CREATE INDEX IF NOT EXISTS "cristiano_verdicts_userId_createdAt_idx"
    ON "cristiano_verdicts" ("userId", "createdAt" DESC);

-- Library filter by kind.
CREATE INDEX IF NOT EXISTS "cristiano_verdicts_userId_kind_idx"
    ON "cristiano_verdicts" ("userId", "kind");

-- Gateway push dedup — find by source-app external id.
CREATE INDEX IF NOT EXISTS "cristiano_verdicts_sourceApp_externalId_idx"
    ON "cristiano_verdicts" ("sourceApp", "externalId");
