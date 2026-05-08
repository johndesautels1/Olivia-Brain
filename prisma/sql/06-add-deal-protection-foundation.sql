-- Track P Session P1 — Deal Protection Foundation (2026-05-08)
--
-- Adds 2 deal-protection-domain tables to Olivia Brain:
--   1. deal_analyses          — single Deal Protection run on a term sheet
--                                (cascading FK to valuation_subjects)
--   2. investor_reputations   — lookup table of London-ecosystem investors
--                                (seeded by P4)
--
-- Both tables append-only — re-running on a revised term sheet creates a
-- new row; investor reputation entries soft-delete via isActive +
-- isArchived rather than DELETE.
--
-- Apply: paste into Supabase SQL Editor and Run.

-- CreateTable
CREATE TABLE "deal_analyses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "valuationSubjectId" UUID NOT NULL,
    "smartScore" DECIMAL(5,2) NOT NULL,
    "smartBand" TEXT NOT NULL,
    "bandLanguage" TEXT NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "investorSignal" TEXT NOT NULL,
    "termSheetText" TEXT,
    "investorNamesJson" JSONB,
    "clauseAnalysisJson" JSONB,
    "confidenceScore" DECIMAL(3,2) NOT NULL,
    "modelTrailJson" JSONB,
    "runtimeMode" TEXT NOT NULL DEFAULT 'mock',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "deal_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investor_reputations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "investorType" TEXT NOT NULL,
    "geographicFocus" TEXT,
    "stageFocusJson" JSONB,
    "sectorFocusJson" JSONB,
    "reputationScore" DECIMAL(5,2) NOT NULL,
    "reputationBand" TEXT NOT NULL,
    "patternsJson" JSONB,
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'seed',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investor_reputations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deal_analyses_userId_generatedAt_idx"
    ON "deal_analyses"("userId", "generatedAt");

-- CreateIndex
CREATE INDEX "deal_analyses_valuationSubjectId_generatedAt_idx"
    ON "deal_analyses"("valuationSubjectId", "generatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "investor_reputations_name_key"
    ON "investor_reputations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "investor_reputations_slug_key"
    ON "investor_reputations"("slug");

-- CreateIndex
CREATE INDEX "investor_reputations_investorType_isActive_idx"
    ON "investor_reputations"("investorType", "isActive");

-- CreateIndex
CREATE INDEX "investor_reputations_reputationBand_isActive_idx"
    ON "investor_reputations"("reputationBand", "isActive");

-- AddForeignKey
ALTER TABLE "deal_analyses"
    ADD CONSTRAINT "deal_analyses_valuationSubjectId_fkey"
    FOREIGN KEY ("valuationSubjectId") REFERENCES "valuation_subjects"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
