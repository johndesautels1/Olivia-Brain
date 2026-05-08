-- Track Q Session Q7 — Persona Synthesis Foundation (2026-05-08)
--
-- Adds 2 cascade-derived persona tables to Olivia Brain:
--   1. founder_personas  — synthesised from Quantara team / risk /
--                           projections / strategic + Q5 supplementary
--   2. company_personas  — synthesised from Quantara financials /
--                           market / IP / capital + Q6 vertical schedule
--
-- Both records are appended (not overwritten) on each manual regenerate
-- so the founder can compare versions. Cascading delete from
-- valuation_subjects so personas don't orphan a soft-deleted subject.
--
-- # Why both at once
--
-- The Q7 cascade synthesis emits a coherent founder + company pair in
-- a single call so the two stay narratively aligned. Splitting into
-- separate calls would risk drift (the company persona referencing a
-- founder narrative angle the founder persona doesn't carry).
--
-- # Why JSON columns for strengths / gaps / differentiators / watch-outs
--
-- The synthesis output shape will evolve once downstream consumers
-- (Pitch Deck Studio, Business Plan generator) lock their input
-- contracts. JSON columns let the shape change without schema churn;
-- `personaSchemaVersion` integer documents the current shape and gives
-- the Brain Enrichment Engine a clean invalidation key when a
-- non-additive change lands.
--
-- # Apply
--
-- Paste into Supabase SQL Editor and Run (Option B path, identical
-- workflow to 01-add-calendar-foundation.sql / 02-add-voice-olivia-
-- foundation.sql / 03-add-valuation-foundation.sql / 04-add-quantara-
-- foundation.sql).

-- CreateTable
CREATE TABLE "founder_personas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "valuationSubjectId" UUID NOT NULL,
    "summary" TEXT NOT NULL,
    "narrativeAngle" TEXT NOT NULL,
    "strengthsJson" JSONB NOT NULL,
    "gapsJson" JSONB NOT NULL,
    "personaSchemaVersion" INTEGER NOT NULL DEFAULT 1,
    "modelTrailJson" JSONB NOT NULL,
    "runtimeMode" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "founder_personas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_personas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "valuationSubjectId" UUID NOT NULL,
    "summary" TEXT NOT NULL,
    "positioning" TEXT NOT NULL,
    "tractionStory" TEXT NOT NULL,
    "differentiatorsJson" JSONB NOT NULL,
    "watchOutsJson" JSONB NOT NULL,
    "personaSchemaVersion" INTEGER NOT NULL DEFAULT 1,
    "modelTrailJson" JSONB NOT NULL,
    "runtimeMode" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "company_personas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "founder_personas_userId_generatedAt_idx"
    ON "founder_personas"("userId", "generatedAt");

-- CreateIndex
CREATE INDEX "founder_personas_valuationSubjectId_generatedAt_idx"
    ON "founder_personas"("valuationSubjectId", "generatedAt");

-- CreateIndex
CREATE INDEX "company_personas_userId_generatedAt_idx"
    ON "company_personas"("userId", "generatedAt");

-- CreateIndex
CREATE INDEX "company_personas_valuationSubjectId_generatedAt_idx"
    ON "company_personas"("valuationSubjectId", "generatedAt");

-- AddForeignKey
ALTER TABLE "founder_personas"
    ADD CONSTRAINT "founder_personas_valuationSubjectId_fkey"
    FOREIGN KEY ("valuationSubjectId") REFERENCES "valuation_subjects"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_personas"
    ADD CONSTRAINT "company_personas_valuationSubjectId_fkey"
    FOREIGN KEY ("valuationSubjectId") REFERENCES "valuation_subjects"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
