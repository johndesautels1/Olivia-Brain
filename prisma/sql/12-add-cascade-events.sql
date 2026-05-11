CREATE TABLE IF NOT EXISTS "cascade_events" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'success',
  "itemCount" INTEGER NOT NULL DEFAULT 0,
  "skippedCount" INTEGER NOT NULL DEFAULT 0,
  "durationMs" INTEGER,
  "errorMessage" TEXT,
  "metadata" JSONB,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cascade_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "cascade_events_taskId_idx" ON "cascade_events" ("taskId");
CREATE INDEX IF NOT EXISTS "cascade_events_completedAt_idx" ON "cascade_events" ("completedAt");
CREATE INDEX IF NOT EXISTS "cascade_events_taskId_completedAt_idx" ON "cascade_events" ("taskId", "completedAt");
