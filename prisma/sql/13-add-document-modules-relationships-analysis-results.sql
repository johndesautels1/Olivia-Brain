DO $$ BEGIN
  CREATE TYPE "ModuleType" AS ENUM ('intro','problem','solution','market','product','methodology_module','pricing','licensing','implementation','roadmap_module','case_study','sample_output','financials','closing','appendix');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "DocRelationshipType" AS ENUM ('supports','derived_from','bundled_with','supersedes','references','required_before','upsell_after');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "document_modules" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "moduleName" TEXT NOT NULL,
  "moduleType" "ModuleType" NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "contentBody" TEXT,
  "variableSchemaJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "document_modules_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "document_modules_documentId_idx" ON "document_modules" ("documentId");
CREATE INDEX IF NOT EXISTS "document_modules_moduleType_idx" ON "document_modules" ("moduleType");
CREATE INDEX IF NOT EXISTS "document_modules_sortOrder_idx" ON "document_modules" ("sortOrder");

CREATE TABLE IF NOT EXISTS "document_relationships" (
  "id" TEXT NOT NULL,
  "fromDocumentId" TEXT NOT NULL,
  "toDocumentId" TEXT NOT NULL,
  "relationshipType" "DocRelationshipType" NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_relationships_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "document_relationships_fromDocumentId_idx" ON "document_relationships" ("fromDocumentId");
CREATE INDEX IF NOT EXISTS "document_relationships_toDocumentId_idx" ON "document_relationships" ("toDocumentId");
CREATE INDEX IF NOT EXISTS "document_relationships_relationshipType_idx" ON "document_relationships" ("relationshipType");

CREATE TABLE IF NOT EXISTS "analysis_results" (
  "id" TEXT NOT NULL,
  "userProfileId" TEXT NOT NULL,
  "outreachGoal" TEXT NOT NULL,
  "companyProfile" JSONB NOT NULL,
  "topMatches" JSONB NOT NULL,
  "orgNames" JSONB NOT NULL,
  "timings" JSONB,
  "videoMetadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "analysis_results_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "analysis_results_userProfileId_createdAt_idx" ON "analysis_results" ("userProfileId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "valuation_subjects" ALTER COLUMN "analysisResultId" TYPE TEXT USING "analysisResultId"::TEXT;
EXCEPTION WHEN undefined_table THEN null; WHEN undefined_column THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "document_modules" ADD CONSTRAINT "document_modules_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; WHEN undefined_table THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "document_relationships" ADD CONSTRAINT "document_relationships_fromDocumentId_fkey" FOREIGN KEY ("fromDocumentId") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; WHEN undefined_table THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "document_relationships" ADD CONSTRAINT "document_relationships_toDocumentId_fkey" FOREIGN KEY ("toDocumentId") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; WHEN undefined_table THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "analysis_results" ADD CONSTRAINT "analysis_results_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "user_profiles"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; WHEN undefined_table THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "valuation_subjects" ADD CONSTRAINT "valuation_subjects_analysisResultId_fkey" FOREIGN KEY ("analysisResultId") REFERENCES "analysis_results"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; WHEN undefined_table THEN null; END $$;
