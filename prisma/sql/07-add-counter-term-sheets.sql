-- Track P Session P6 — Counter Term Sheet (2026-05-08)
--
-- Adds the `counter_term_sheets` table for cascade-drafted founder-side
-- counter term sheets. Append-only with a per-analysis `versionNumber`
-- so the negotiation history is auditable. Cascading delete from
-- `deal_analyses` so counters don't orphan a soft-deleted analysis.
--
-- Cross-doc inheritance happens at generation time (the orchestrator
-- pulls company / sector / round context from the parent
-- ValuationSubject + DealAnalysis); this table stores only the
-- redline output + audit trail.
--
-- # Apply
--
-- Paste into Supabase SQL Editor and Run. Order: AFTER
-- 06-add-deal-protection-foundation.sql (depends on `deal_analyses`).

-- CreateTable
CREATE TABLE "counter_term_sheets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "dealAnalysisId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "redlinedMarkdown" TEXT NOT NULL,
    "changesJson" JSONB,
    "founderNotes" TEXT,
    "modelTrailJson" JSONB,
    "runtimeMode" TEXT NOT NULL DEFAULT 'mock',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "counter_term_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "counter_term_sheets_userId_generatedAt_idx"
    ON "counter_term_sheets"("userId", "generatedAt");

-- CreateIndex
CREATE INDEX "counter_term_sheets_dealAnalysisId_versionNumber_idx"
    ON "counter_term_sheets"("dealAnalysisId", "versionNumber");

-- AddForeignKey
ALTER TABLE "counter_term_sheets"
    ADD CONSTRAINT "counter_term_sheets_dealAnalysisId_fkey"
    FOREIGN KEY ("dealAnalysisId") REFERENCES "deal_analyses"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
