-- Track B Session 8b-routes — Documents engine write surface (2026-05-08)
--
-- Adds 4 tables for the workspace shell's write actions:
--   document_bookmarks  — user-owned bookmarks; toggle endpoint
--   document_packages   — user-owned outreach bundles
--   package_items       — documents inside a package (composition)
--   document_shares     — per-document share links with recipient + expiry
--
-- `documentId` is a loose `TEXT` column — no FK to a `documents`
-- table because OB doesn't have a Document Prisma model yet (lands in
-- Session 8d alongside the documents app routes). Consumers tolerate
-- dangling references; a 404 from the documents reader is the right
-- behaviour when a bookmark or share points at a doc that hasn't been
-- ported yet.
--
-- `userId` is a `TEXT` column (not `UUID`) so both Clerk's `user_xxx`
-- IDs and dev/test `STUB_USER_ID` env values resolve cleanly. This
-- diverges from earlier OB migrations (CounterTermSheet uses `UUID`
-- on `userId`); deliberate — the older shape would have rejected the
-- real Clerk format once Track F's keys are configured on Vercel.
--
-- # Apply
--
-- Paste into Supabase SQL Editor and Run. Order: independent of all
-- earlier migrations. Idempotent — re-running is safe (each CREATE
-- guarded by IF NOT EXISTS at the index/constraint level via the
-- `_pkey` and `_key` naming Prisma uses; the table CREATEs will fail
-- if the table already exists, but in that case nothing else to do).
--
-- # Verify
--
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public'
--     AND table_name IN ('document_bookmarks', 'document_packages',
--                        'package_items', 'document_shares')
--   ORDER BY table_name;
-- -- Expect 4 rows.

-- ─── document_bookmarks ──────────────────────────────────────────────────────

-- CreateTable
CREATE TABLE "document_bookmarks" (
    "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
    "userId"     TEXT         NOT NULL,
    "documentId" TEXT         NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_bookmarks_userId_documentId_key"
    ON "document_bookmarks"("userId", "documentId");

-- CreateIndex
CREATE INDEX "document_bookmarks_userId_createdAt_idx"
    ON "document_bookmarks"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "document_bookmarks_documentId_idx"
    ON "document_bookmarks"("documentId");

-- ─── document_packages ───────────────────────────────────────────────────────

-- CreateTable
CREATE TABLE "document_packages" (
    "id"            UUID         NOT NULL DEFAULT gen_random_uuid(),
    "userId"        TEXT         NOT NULL,
    "name"          TEXT         NOT NULL,
    "outreachGoal"  TEXT         NOT NULL,
    "packageStatus" TEXT         NOT NULL DEFAULT 'draft',
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_packages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_packages_userId_createdAt_idx"
    ON "document_packages"("userId", "createdAt" DESC);

-- ─── package_items ───────────────────────────────────────────────────────────

-- CreateTable
CREATE TABLE "package_items" (
    "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
    "packageId"  UUID         NOT NULL,
    "documentId" TEXT         NOT NULL,
    "position"   INTEGER      NOT NULL DEFAULT 0,
    "addedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "package_items_packageId_documentId_key"
    ON "package_items"("packageId", "documentId");

-- CreateIndex
CREATE INDEX "package_items_packageId_position_idx"
    ON "package_items"("packageId", "position");

-- AddForeignKey
ALTER TABLE "package_items"
    ADD CONSTRAINT "package_items_packageId_fkey"
    FOREIGN KEY ("packageId") REFERENCES "document_packages"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── document_shares ─────────────────────────────────────────────────────────

-- CreateTable
CREATE TABLE "document_shares" (
    "id"             UUID         NOT NULL DEFAULT gen_random_uuid(),
    "userId"         TEXT         NOT NULL,
    "documentId"     TEXT         NOT NULL,
    "shareToken"     TEXT         NOT NULL,
    "recipientEmail" TEXT,
    "recipientName"  TEXT,
    "message"        TEXT,
    "expiresAt"      TIMESTAMP(3),
    "isRevoked"      BOOLEAN      NOT NULL DEFAULT false,
    "viewCount"      INTEGER      NOT NULL DEFAULT 0,
    "lastViewedAt"   TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_shares_shareToken_key"
    ON "document_shares"("shareToken");

-- CreateIndex
CREATE INDEX "document_shares_userId_createdAt_idx"
    ON "document_shares"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "document_shares_documentId_idx"
    ON "document_shares"("documentId");
