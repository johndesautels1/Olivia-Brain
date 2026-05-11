-- 11-add-agent-handler-foundation.sql
-- Track H S21 -- foundation tables for LTM-style agent handlers.
-- ASCII-only inside comments to dodge Supabase paste corruption (see
-- README ABSOLUTE RULE).
--
-- What this migration adds:
--   1. CollectionType enum (12 LTM-aligned values).
--   2. document_collections table (slug-keyed grouping for Documents).
--   3. document_versions table (append-only edit history).
--   4. user_company_profiles table (per-founder company profile, minimum
--      subset of LTM's UserCompanyProfile; privacy-contract-safe, no
--      deadline columns).
--   5. Three foreign keys:
--        documents.collectionId -> document_collections.id  (Restrict)
--        document_versions.documentId -> documents.id        (Restrict)
--        user_company_profiles.userProfileId -> user_profiles.id (Cascade)
--   6. Seeds the 12 DocumentCollection rows so agent handlers can call
--      spawnDocumentFromAgent({collectionSlug: 'legal-compliance'})
--      without operator setup.
--
-- Idempotent: every CREATE uses IF NOT EXISTS; FK adds are wrapped in
-- DO blocks that swallow duplicate_object errors. INSERTs use
-- ON CONFLICT DO NOTHING.

-- 1) CollectionType enum
DO $$ BEGIN
  CREATE TYPE "CollectionType" AS ENUM (
    'company_core',
    'pitch_decks',
    'strategic_partnerships',
    'product_technology',
    'financials_models',
    'licensing_commercial',
    'legal_compliance',
    'due_diligence',
    'sales_marketing',
    'methodology',
    'sample_reports',
    'acquisition_exit'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2) document_collections
CREATE TABLE IF NOT EXISTS "document_collections" (
  "id"             TEXT             NOT NULL,
  "name"           TEXT             NOT NULL,
  "slug"           TEXT             NOT NULL,
  "description"    TEXT,
  "collectionType" "CollectionType" NOT NULL,
  "isActive"       BOOLEAN          NOT NULL DEFAULT true,
  "createdAt"      TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3)     NOT NULL,
  CONSTRAINT "document_collections_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_collections_slug_key"
  ON "document_collections" ("slug");
CREATE INDEX IF NOT EXISTS "document_collections_collectionType_idx"
  ON "document_collections" ("collectionType");
CREATE INDEX IF NOT EXISTS "document_collections_isActive_idx"
  ON "document_collections" ("isActive");

-- 3) document_versions
CREATE TABLE IF NOT EXISTS "document_versions" (
  "id"               TEXT         NOT NULL,
  "documentId"       TEXT         NOT NULL,
  "versionNumber"    INTEGER      NOT NULL,
  "titleSnapshot"    TEXT,
  "contentSnapshot"  TEXT,
  "filePathSnapshot" TEXT,
  "changeNotes"      TEXT,
  "createdBy"        TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "document_versions_documentId_idx"
  ON "document_versions" ("documentId");
CREATE INDEX IF NOT EXISTS "document_versions_versionNumber_idx"
  ON "document_versions" ("versionNumber");

-- 4) user_company_profiles  (minimum subset; deadline columns NEVER live here)
CREATE TABLE IF NOT EXISTS "user_company_profiles" (
  "id"                   TEXT             NOT NULL,
  "userProfileId"        TEXT             NOT NULL,
  "companyName"          TEXT             NOT NULL,
  "primarySector"        TEXT,
  "headquartersLocation" TEXT,
  "employeeCount"        INTEGER,
  "arr"                  DOUBLE PRECISION,
  "totalRaised"          DOUBLE PRECISION,
  "regulatoryBody"       TEXT,
  "certifications"       TEXT[]           NOT NULL DEFAULT '{}'::TEXT[],
  "customerCount"        INTEGER,
  "createdAt"            TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3)     NOT NULL,
  CONSTRAINT "user_company_profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_company_profiles_userProfileId_key"
  ON "user_company_profiles" ("userProfileId");
CREATE INDEX IF NOT EXISTS "user_company_profiles_primarySector_idx"
  ON "user_company_profiles" ("primarySector");

-- 5) Foreign keys
DO $$ BEGIN
  ALTER TABLE "documents"
    ADD CONSTRAINT "documents_collectionId_fkey"
    FOREIGN KEY ("collectionId") REFERENCES "document_collections"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "document_versions"
    ADD CONSTRAINT "document_versions_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "documents"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "user_company_profiles"
    ADD CONSTRAINT "user_company_profiles_userProfileId_fkey"
    FOREIGN KEY ("userProfileId") REFERENCES "user_profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 6) Seed the 12 LTM-aligned collections (idempotent via id+ON CONFLICT)
INSERT INTO "document_collections"
  ("id", "name", "slug", "description", "collectionType", "isActive", "createdAt", "updatedAt")
VALUES
  ('cdoc_company_core',           'Company Core',           'company-core',           'Foundational corporate documents',                'company_core',           true, NOW(), NOW()),
  ('cdoc_pitch_decks',            'Pitch Decks',            'pitch-decks',            'Investor-facing slide decks',                     'pitch_decks',            true, NOW(), NOW()),
  ('cdoc_strategic_partnerships', 'Strategic Partnerships', 'strategic-partnerships', 'Partnership memoranda and co-marketing assets',   'strategic_partnerships', true, NOW(), NOW()),
  ('cdoc_product_technology',     'Product & Technology',   'product-technology',     'Technical and product specifications',            'product_technology',     true, NOW(), NOW()),
  ('cdoc_financials_models',      'Financials & Models',    'financials-models',      'Financial statements and valuation models',       'financials_models',      true, NOW(), NOW()),
  ('cdoc_licensing_commercial',   'Licensing & Commercial', 'licensing-commercial',   'License agreements and commercial terms',         'licensing_commercial',   true, NOW(), NOW()),
  ('cdoc_legal_compliance',       'Legal & Compliance',     'legal-compliance',       'Legal agreements and compliance artefacts (DPIA)', 'legal_compliance',       true, NOW(), NOW()),
  ('cdoc_due_diligence',          'Due Diligence',          'due-diligence',          'Diligence room exhibits and disclosures',         'due_diligence',          true, NOW(), NOW()),
  ('cdoc_sales_marketing',        'Sales & Marketing',      'sales-marketing',        'Sales collateral and marketing assets',           'sales_marketing',        true, NOW(), NOW()),
  ('cdoc_methodology',            'Methodology',            'methodology',            'Internal methodology and how-we-work docs',       'methodology',            true, NOW(), NOW()),
  ('cdoc_sample_reports',         'Sample Reports',         'sample-reports',         'Anonymised sample outputs',                       'sample_reports',         true, NOW(), NOW()),
  ('cdoc_acquisition_exit',       'Acquisition & Exit',     'acquisition-exit',       'M and A + exit-readiness documents',              'acquisition_exit',       true, NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

-- Verify (should return 3 rows):
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public'
--     AND table_name IN ('document_collections', 'document_versions', 'user_company_profiles');
--
-- Verify the 12 seeded collections:
-- SELECT slug, name FROM "document_collections" ORDER BY slug;
