-- Track V Session V1 — Valuation Foundation (2026-05-07)
--
-- Adds 6 valuation-domain tables to Olivia Brain:
--   1. valuation_subjects     — user company being valued (6 JSON evidence cols)
--   2. valuation_runs         — single execution of the 10-method engine
--   3. valuation_sensitivities — tornado-chart sensitivity rows
--   4. financial_snapshots    — point-in-time financial records
--   5. deal_room_sessions     — valuation-context negotiation simulator
--                                (NOT the sales-domain DealRoomSession dropped in C1)
--   6. deal_room_messages     — turns in a DealRoomSession
--
-- Adaptations from LTM source schema:
--   - cuid → UUID (matches OB UUID convention from C1)
--   - userProfileId → userId (Clerk userId direct, no UserProfile relation)
--   - LTM-domain FKs (UserProfile, AnalysisResult, Organization, Document)
--     dropped to plain UUID/UUID[] strings; bridge V2 reads via UKP if needed
--
-- Apply: paste into Supabase SQL Editor and Run (Option B path, identical
-- workflow to 01-add-calendar-foundation.sql + 02-add-voice-olivia-foundation.sql).

-- CreateTable
CREATE TABLE "valuation_subjects" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "companyName" TEXT NOT NULL,
    "sector" TEXT,
    "subsector" TEXT,
    "stage" TEXT,
    "businessModel" TEXT,
    "financialDataJson" JSONB,
    "qualitativeJson" JSONB,
    "ipDataJson" JSONB,
    "marketDataJson" JSONB,
    "capitalDataJson" JSONB,
    "fundingDataJson" JSONB,
    "analysisResultId" UUID,
    "completenessScore" DECIMAL(5,2),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "valuation_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "valuation_runs" (
    "id" UUID NOT NULL,
    "valuationSubjectId" UUID NOT NULL,
    "buyerType" TEXT,
    "targetMatchOrgId" UUID,
    "inputSnapshotJson" JSONB NOT NULL,
    "resultJson" JSONB NOT NULL,
    "methodWeightsJson" JSONB,
    "confidenceScore" DECIMAL(5,2),
    "status" TEXT NOT NULL DEFAULT 'completed',
    "runDurationMs" INTEGER,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "valuation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "valuation_sensitivities" (
    "id" UUID NOT NULL,
    "valuationRunId" UUID NOT NULL,
    "variableName" TEXT NOT NULL,
    "baseValue" DECIMAL(18,2) NOT NULL,
    "lowValue" DECIMAL(18,2) NOT NULL,
    "highValue" DECIMAL(18,2) NOT NULL,
    "lowValuation" DECIMAL(18,2) NOT NULL,
    "highValuation" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "valuation_sensitivities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_snapshots" (
    "id" UUID NOT NULL,
    "valuationSubjectId" UUID NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "annualRevenue" DECIMAL(18,2),
    "arr" DECIMAL(18,2),
    "grossMarginPct" DECIMAL(5,2),
    "ebitda" DECIMAL(18,2),
    "burnMonthly" DECIMAL(18,2),
    "growthYoYPct" DECIMAL(5,2),
    "cashOnHand" DECIMAL(18,2),
    "runwayMonths" INTEGER,
    "customerCount" INTEGER,
    "sourceDocumentIds" UUID[],
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_room_sessions" (
    "id" UUID NOT NULL,
    "valuationRunId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "buyerType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "overallScore" DECIMAL(5,2),
    "rubricScoresJson" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_room_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_room_messages" (
    "id" UUID NOT NULL,
    "dealRoomSessionId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "exhibitsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_room_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "valuation_subjects_userId_createdAt_idx" ON "valuation_subjects"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "valuation_subjects_analysisResultId_idx" ON "valuation_subjects"("analysisResultId");

-- CreateIndex
CREATE INDEX "valuation_runs_valuationSubjectId_createdAt_idx" ON "valuation_runs"("valuationSubjectId", "createdAt");

-- CreateIndex
CREATE INDEX "valuation_runs_targetMatchOrgId_idx" ON "valuation_runs"("targetMatchOrgId");

-- CreateIndex
CREATE INDEX "valuation_sensitivities_valuationRunId_idx" ON "valuation_sensitivities"("valuationRunId");

-- CreateIndex
CREATE UNIQUE INDEX "valuation_sensitivities_valuationRunId_variableName_key" ON "valuation_sensitivities"("valuationRunId", "variableName");

-- CreateIndex
CREATE INDEX "financial_snapshots_valuationSubjectId_snapshotDate_idx" ON "financial_snapshots"("valuationSubjectId", "snapshotDate");

-- CreateIndex
CREATE INDEX "deal_room_sessions_userId_createdAt_idx" ON "deal_room_sessions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "deal_room_sessions_valuationRunId_idx" ON "deal_room_sessions"("valuationRunId");

-- CreateIndex
CREATE INDEX "deal_room_messages_dealRoomSessionId_createdAt_idx" ON "deal_room_messages"("dealRoomSessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "valuation_runs" ADD CONSTRAINT "valuation_runs_valuationSubjectId_fkey" FOREIGN KEY ("valuationSubjectId") REFERENCES "valuation_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valuation_sensitivities" ADD CONSTRAINT "valuation_sensitivities_valuationRunId_fkey" FOREIGN KEY ("valuationRunId") REFERENCES "valuation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_snapshots" ADD CONSTRAINT "financial_snapshots_valuationSubjectId_fkey" FOREIGN KEY ("valuationSubjectId") REFERENCES "valuation_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_room_sessions" ADD CONSTRAINT "deal_room_sessions_valuationRunId_fkey" FOREIGN KEY ("valuationRunId") REFERENCES "valuation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_room_messages" ADD CONSTRAINT "deal_room_messages_dealRoomSessionId_fkey" FOREIGN KEY ("dealRoomSessionId") REFERENCES "deal_room_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
