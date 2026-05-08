-- Track B Session 8d — Documents foundation (2026-05-08)
--
-- **Apply AFTER 08-add-documents-engine-write-surface.sql.** This
-- migration depends on the 4 tables 08 creates (document_bookmarks,
-- packages, package_documents, document_shares) — it adds FK
-- constraints from those tables to the new `documents` and
-- `user_profiles` tables, and it tightens `packages.outreachGoal` +
-- `packages.packageStatus` from TEXT to enum types.
--
-- Tables added:
--   user_profiles — keyed off Clerk's userId (LTM line 1694, min subset)
--   documents     — LTM line 1189, min subset
--
-- Enums added (12):
--   PlanTier, OutreachGoal, PackageStatus, DocumentType, DocAudienceType,
--   PurposeType, FormatType, ContentSourceType, ConfidentialityLevel,
--   DocStatus, DocAuthoringState, DocSourceKind
--
-- FK constraints added on existing 08 tables:
--   document_bookmarks.userProfileId → user_profiles.id
--   document_bookmarks.documentId    → documents.id
--   document_shares.documentId       → documents.id
--   package_documents.documentId     → documents.id
--
-- # Apply
--
-- Paste into Supabase SQL Editor and Run. Order: AFTER
-- 08-add-documents-engine-write-surface.sql. Idempotent on enum +
-- table creates; the FK ALTER TABLEs are not idempotent — re-running
-- will fail with "constraint already exists." If you need to re-run,
-- drop the FK constraints by name first.
--
-- # Verify
--
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public'
--     AND table_name IN ('documents', 'user_profiles')
--   ORDER BY table_name;
-- -- Expect 2 rows.
--
-- SELECT typname FROM pg_type
--   WHERE typname IN ('PlanTier','OutreachGoal','PackageStatus',
--                     'DocumentType','DocAudienceType','PurposeType',
--                     'FormatType','ContentSourceType','ConfidentialityLevel',
--                     'DocStatus','DocAuthoringState','DocSourceKind')
--   ORDER BY typname;
-- -- Expect 12 rows.

-- ─── Enums ─────────────────────────────────────────────────────────────────

CREATE TYPE "PlanTier" AS ENUM ('free', 'developer', 'executive', 'enterprise');

CREATE TYPE "OutreachGoal" AS ENUM (
  'fundraising', 'strategic_partnership', 'white_label', 'pilot',
  'reseller', 'acquisition', 'enterprise_sales'
);

CREATE TYPE "PackageStatus" AS ENUM (
  'draft', 'ready', 'sent', 'viewed', 'engaged', 'closed', 'package_archived'
);

CREATE TYPE "DocumentType" AS ENUM (
  'executive_summary', 'company_overview', 'founder_bio', 'investor_deck',
  'strategic_partner_deck', 'enterprise_deck', 'white_label_deck',
  'acquisition_teaser', 'product_overview', 'technical_architecture',
  'methodology_whitepaper', 'financial_model', 'pricing_sheet',
  'licensing_sheet', 'proposal', 'roadmap', 'integration_guide',
  'sample_report', 'term_sheet', 'legal_agreement', 'diligence_doc',
  'marketing_doc'
);

CREATE TYPE "DocAudienceType" AS ENUM (
  'investor', 'strategic_partner', 'enterprise_client', 'white_label_partner',
  'acquirer', 'reseller', 'media', 'internal'
);

CREATE TYPE "PurposeType" AS ENUM (
  'fundraising', 'partnership', 'licensing', 'pilot',
  'acquisition', 'diligence', 'education', 'outreach'
);

CREATE TYPE "FormatType" AS ENUM (
  'markdown', 'richtext', 'block_json', 'docx', 'pptx', 'pdf', 'spreadsheet', 'link'
);

CREATE TYPE "ContentSourceType" AS ENUM (
  'stored_file', 'rich_text', 'generated_template', 'external_link'
);

CREATE TYPE "ConfidentialityLevel" AS ENUM (
  'public_access', 'internal', 'confidential', 'nda_required'
);

CREATE TYPE "DocStatus" AS ENUM ('draft', 'active', 'archived');

CREATE TYPE "DocAuthoringState" AS ENUM ('draft', 'in_progress', 'complete');

CREATE TYPE "DocSourceKind" AS ENUM (
  'user_upload', 'business_library', 'general_library',
  'studio_olivia', 'voice_dictation', 'authored'
);

-- ─── user_profiles ─────────────────────────────────────────────────────────

CREATE TABLE "user_profiles" (
    "id"                   TEXT         NOT NULL,
    "clerkUserId"          TEXT         NOT NULL,
    "displayName"          TEXT         NOT NULL,
    "headline"             TEXT,
    "bio"                  TEXT,
    "jobTitle"             TEXT,
    "company"              TEXT,
    "contactEmail"         TEXT,
    "phone"                TEXT,
    "isPublic"             BOOLEAN      NOT NULL DEFAULT true,
    "planTier"             "PlanTier"   NOT NULL DEFAULT 'free',
    "stripeCustomerId"     TEXT,
    "stripeSubscriptionId" TEXT,
    "subscriptionStatus"   TEXT,
    "currentPeriodEnd"     TIMESTAMP(3),
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_profiles_clerkUserId_key"
    ON "user_profiles"("clerkUserId");

CREATE UNIQUE INDEX "user_profiles_stripeCustomerId_key"
    ON "user_profiles"("stripeCustomerId");

CREATE UNIQUE INDEX "user_profiles_stripeSubscriptionId_key"
    ON "user_profiles"("stripeSubscriptionId");

-- ─── documents ─────────────────────────────────────────────────────────────

CREATE TABLE "documents" (
    "id"                TEXT                   NOT NULL,
    "collectionId"      TEXT,
    "title"             TEXT                   NOT NULL,
    "slug"              TEXT                   NOT NULL,
    "documentType"      "DocumentType"         NOT NULL,
    "audienceType"      "DocAudienceType"      NOT NULL,
    "purposeType"       "PurposeType"          NOT NULL,
    "formatType"        "FormatType"           NOT NULL,
    "summary"           TEXT,
    "contentSourceType" "ContentSourceType"    NOT NULL,
    "storagePathOrBody" TEXT,
    "previewText"       TEXT,
    "isModular"         BOOLEAN                NOT NULL DEFAULT false,
    "isTemplate"        BOOLEAN                NOT NULL DEFAULT false,
    "confidentiality"   "ConfidentialityLevel" NOT NULL DEFAULT 'internal',
    "status"            "DocStatus"            NOT NULL DEFAULT 'draft',
    "authoringState"    "DocAuthoringState"    NOT NULL DEFAULT 'draft',
    "sourceKind"        "DocSourceKind",
    "feedsValuation"    BOOLEAN                NOT NULL DEFAULT false,
    "ownerUserId"       TEXT,
    "sourceTemplateId"  TEXT,
    "createdAt"         TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3)           NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "documents_slug_key" ON "documents"("slug");

CREATE INDEX "documents_documentType_idx" ON "documents"("documentType");
CREATE INDEX "documents_audienceType_idx" ON "documents"("audienceType");
CREATE INDEX "documents_purposeType_idx" ON "documents"("purposeType");
CREATE INDEX "documents_confidentiality_idx" ON "documents"("confidentiality");
CREATE INDEX "documents_status_idx" ON "documents"("status");
CREATE INDEX "documents_ownerUserId_idx" ON "documents"("ownerUserId");
CREATE INDEX "documents_sourceTemplateId_idx" ON "documents"("sourceTemplateId");
CREATE INDEX "documents_status_audienceType_idx" ON "documents"("status", "audienceType");
CREATE INDEX "documents_status_updatedAt_idx" ON "documents"("status", "updatedAt");
CREATE INDEX "documents_ownerUserId_authoringState_idx" ON "documents"("ownerUserId", "authoringState");
CREATE INDEX "documents_ownerUserId_sourceKind_idx" ON "documents"("ownerUserId", "sourceKind");

CREATE UNIQUE INDEX "documents_ownerUserId_sourceTemplateId_key"
    ON "documents"("ownerUserId", "sourceTemplateId");

-- Self-relation for template-copy chain.
ALTER TABLE "documents"
    ADD CONSTRAINT "documents_sourceTemplateId_fkey"
    FOREIGN KEY ("sourceTemplateId") REFERENCES "documents"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── FK constraints on existing 08 tables ──────────────────────────────────

ALTER TABLE "document_bookmarks"
    ADD CONSTRAINT "document_bookmarks_userProfileId_fkey"
    FOREIGN KEY ("userProfileId") REFERENCES "user_profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "document_bookmarks"
    ADD CONSTRAINT "document_bookmarks_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "documents"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "document_shares"
    ADD CONSTRAINT "document_shares_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "documents"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "package_documents"
    ADD CONSTRAINT "package_documents_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "documents"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Tighten packages.outreachGoal + packages.packageStatus to enum ────────
-- Empty packages table at this point (08 creates them but no inserts
-- have happened). The USING clause is a defense-in-depth conversion
-- in case a row exists from manual testing.

ALTER TABLE "packages"
    ALTER COLUMN "outreachGoal" TYPE "OutreachGoal"
    USING "outreachGoal"::"OutreachGoal";

ALTER TABLE "packages"
    ALTER COLUMN "packageStatus" DROP DEFAULT,
    ALTER COLUMN "packageStatus" TYPE "PackageStatus"
    USING "packageStatus"::"PackageStatus",
    ALTER COLUMN "packageStatus" SET DEFAULT 'draft';
