-- Track B Session 8b-routes — Documents engine write surface (2026-05-08, LTM-aligned revision)
--
-- **LTM-aligned shapes.** Every table here mirrors the equivalent LTM
-- model in `D:\London-Tech-Map\prisma\schema.prisma` so OB nests
-- cleanly inside LTM as the home tenant. Column names + table names
-- match LTM byte-for-byte. The minimum-viable subset of LTM fields
-- ships in this migration; LTM-only optional fields that reference
-- tables OB doesn't have yet (TargetList, PackageTemplate, Person,
-- Organization, etc.) are deliberately omitted and re-added when
-- those tables port in.
--
-- Tables added (LTM map in parens):
--   document_bookmarks  (LTM.DocumentBookmark, line 1955)
--   packages            (LTM.Package, line 1461)
--   package_documents   (LTM.PackageDocument, line 1499)
--   document_shares     (LTM.DocumentShare, line 1411)
--
-- **Two user-id conventions, both deliberately following LTM:**
-- - `userProfileId` on `document_bookmarks` — LTM's bookmark table
--   FKs to `UserProfile`. OB doesn't have UserProfile yet (lands in
--   Session 8d alongside the Document model). Until then, the column
--   stores the raw Clerk userId / `STUB_USER_ID` env value. Naming
--   for the destination shape lets a follow-up migration add the FK
--   without renaming any column.
-- - `ownerUserId` on `packages` and `document_shares` — LTM stores
--   the raw Clerk userId directly here (no FK to UserProfile). No
--   follow-up renaming needed.
--
-- `documentId` is a loose `TEXT` column (no FK to a `documents`
-- table) because OB doesn't have a Document model yet. The FK lands
-- in Session 8d alongside the Document model port.
--
-- # Apply
--
-- Paste into Supabase SQL Editor and Run. Order: independent of all
-- earlier migrations.
--
-- # Verify
--
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public'
--     AND table_name IN ('document_bookmarks', 'packages',
--                        'package_documents', 'document_shares')
--   ORDER BY table_name;
-- -- Expect 4 rows.

-- ─── document_bookmarks ──────────────────────────────────────────────────────

CREATE TABLE "document_bookmarks" (
    "id"            UUID         NOT NULL DEFAULT gen_random_uuid(),
    "userProfileId" TEXT         NOT NULL,
    "documentId"    TEXT         NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_bookmarks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "document_bookmarks_userProfileId_documentId_key"
    ON "document_bookmarks"("userProfileId", "documentId");

CREATE INDEX "document_bookmarks_userProfileId_idx"
    ON "document_bookmarks"("userProfileId");

CREATE INDEX "document_bookmarks_documentId_idx"
    ON "document_bookmarks"("documentId");

-- ─── packages ────────────────────────────────────────────────────────────────

CREATE TABLE "packages" (
    "id"            UUID         NOT NULL DEFAULT gen_random_uuid(),
    "name"          TEXT         NOT NULL,
    "ownerUserId"   TEXT,
    "outreachGoal"  TEXT         NOT NULL,
    "packageStatus" TEXT         NOT NULL DEFAULT 'draft',
    "summary"       TEXT,
    "shareToken"    TEXT,
    "expiresAt"     TIMESTAMP(3),
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "packages_shareToken_key"
    ON "packages"("shareToken");

CREATE INDEX "packages_ownerUserId_idx"
    ON "packages"("ownerUserId");

CREATE INDEX "packages_outreachGoal_idx"
    ON "packages"("outreachGoal");

CREATE INDEX "packages_packageStatus_idx"
    ON "packages"("packageStatus");

CREATE INDEX "packages_shareToken_idx"
    ON "packages"("shareToken");

-- ─── package_documents ───────────────────────────────────────────────────────

CREATE TABLE "package_documents" (
    "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
    "packageId"   UUID         NOT NULL,
    "documentId"  TEXT         NOT NULL,
    "sortOrder"   INTEGER      NOT NULL DEFAULT 0,
    "isRequired"  BOOLEAN      NOT NULL DEFAULT true,
    "customIntro" TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "package_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "package_documents_packageId_documentId_key"
    ON "package_documents"("packageId", "documentId");

CREATE INDEX "package_documents_packageId_idx"
    ON "package_documents"("packageId");

CREATE INDEX "package_documents_documentId_idx"
    ON "package_documents"("documentId");

CREATE INDEX "package_documents_sortOrder_idx"
    ON "package_documents"("sortOrder");

-- LTM uses ON DELETE Restrict here so deleting a Package while it
-- has documents is rejected. Preserved for parity with LTM.
ALTER TABLE "package_documents"
    ADD CONSTRAINT "package_documents_packageId_fkey"
    FOREIGN KEY ("packageId") REFERENCES "packages"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── document_shares ─────────────────────────────────────────────────────────

CREATE TABLE "document_shares" (
    "id"             UUID         NOT NULL DEFAULT gen_random_uuid(),
    "documentId"     TEXT         NOT NULL,
    "ownerUserId"    TEXT         NOT NULL,
    "shareToken"     TEXT         NOT NULL,
    "recipientEmail" TEXT,
    "recipientName"  TEXT,
    "message"        TEXT,
    "expiresAt"      TIMESTAMP(3),
    "isRevoked"      BOOLEAN      NOT NULL DEFAULT false,
    "viewCount"      INTEGER      NOT NULL DEFAULT 0,
    "lastViewedAt"   TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_shares_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "document_shares_shareToken_key"
    ON "document_shares"("shareToken");

CREATE INDEX "document_shares_documentId_idx"
    ON "document_shares"("documentId");

CREATE INDEX "document_shares_ownerUserId_idx"
    ON "document_shares"("ownerUserId");

CREATE INDEX "document_shares_shareToken_idx"
    ON "document_shares"("shareToken");
