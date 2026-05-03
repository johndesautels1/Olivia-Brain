-- CreateEnum
CREATE TYPE "CalendarCategory" AS ENUM ('vc_meeting', 'angel_meeting', 'board_meeting', 'advisory_call', 'investor_update', 'founder_meeting', 'team_standup', 'one_on_one', 'conference_attend', 'meetup_attend', 'pitch_event', 'demo_day_attend', 'hackathon_attend', 'workshop_attend', 'networking_event', 'gala_awards', 'focus_time', 'deep_work', 'deal_prep', 'admin_block', 'email_block', 'funding_deadline', 'product_launch', 'hiring_milestone', 'legal_deadline', 'weekly_review', 'monthly_retrospective', 'quarterly_planning', 'annual_planning', 'personal_event', 'travel', 'lunch_meeting', 'coffee_chat', 'ecosystem_event', 'community_event', 'olivia_suggestion', 'synced_external');

-- CreateEnum
CREATE TYPE "CalendarEntryType" AS ENUM ('meeting', 'event', 'time_block', 'deadline', 'recurring', 'personal', 'signal', 'constraint', 'block', 'milestone', 'ritual');

-- CreateEnum
CREATE TYPE "CalendarPriority" AS ENUM ('critical', 'high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "CalendarSyncProvider" AS ENUM ('google', 'outlook', 'calendly', 'ical_url');

-- CreateEnum
CREATE TYPE "CalendarSyncDirection" AS ENUM ('inbound', 'outbound', 'bidirectional');

-- CreateEnum
CREATE TYPE "CalendarConflictResolution" AS ENUM ('pending', 'local_wins', 'remote_wins', 'merged', 'dismissed');

-- CreateEnum
CREATE TYPE "CalendarInteractionType" AS ENUM ('created', 'updated', 'deleted', 'moved', 'accepted_suggestion', 'dismissed_suggestion', 'snoozed_suggestion', 'completed_prep_task', 'skipped_prep_task', 'rsvp_changed', 'attendance_changed');

-- CreateEnum
CREATE TYPE "CalendarPrepTaskStatus" AS ENUM ('pending', 'in_progress', 'completed', 'skipped');

-- CreateEnum
CREATE TYPE "CalendarAttendeeRsvp" AS ENUM ('pending', 'accepted', 'declined', 'tentative');

-- CreateEnum
CREATE TYPE "CalendarAttendeeRole" AS ENUM ('required', 'optional', 'organizer', 'speaker');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('pending', 'attended', 'rescheduled', 'missed', 'cancelled');

-- CreateEnum
CREATE TYPE "WebhookSubscriptionStatus" AS ENUM ('active', 'expiring', 'expired', 'failed', 'revoked');

-- CreateEnum
CREATE TYPE "OliviaRecommendationType" AS ENUM ('proactive', 'reactive', 'scheduled');

-- CreateEnum
CREATE TYPE "OliviaRecommendationUrgency" AS ENUM ('immediate', 'today', 'this_week', 'when_relevant');

-- CreateEnum
CREATE TYPE "OliviaRecommendationStatus" AS ENUM ('pending', 'accepted', 'dismissed', 'snoozed', 'expired');

-- CreateTable
CREATE TABLE "calendar_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "virtualUrl" TEXT,
    "startDatetime" TIMESTAMP(3) NOT NULL,
    "endDatetime" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "entryType" "CalendarEntryType" NOT NULL DEFAULT 'event',
    "category" "CalendarCategory" NOT NULL,
    "priority" "CalendarPriority" NOT NULL DEFAULT 'medium',
    "tagsJson" JSONB,
    "isAiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "aiConfidenceScore" DECIMAL(3,2),
    "aiSource" TEXT,
    "rrule" TEXT,
    "recurrenceParentId" UUID,
    "ecosystemOrgName" TEXT,
    "investmentStage" TEXT,
    "externalCalendarId" TEXT,
    "externalProvider" "CalendarSyncProvider",
    "externalLastSyncAt" TIMESTAMP(3),
    "attendanceStatus" "AttendanceStatus" NOT NULL DEFAULT 'pending',
    "attendanceNote" TEXT,
    "rescheduledFromId" UUID,
    "rescheduledFromDate" TIMESTAMP(3),
    "isVip" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/London',
    "defaultView" TEXT NOT NULL DEFAULT 'week',
    "densityMode" TEXT NOT NULL DEFAULT 'standard',
    "workingHoursStart" INTEGER NOT NULL DEFAULT 9,
    "workingHoursEnd" INTEGER NOT NULL DEFAULT 18,
    "workingDaysJson" JSONB NOT NULL DEFAULT '[1,2,3,4,5]',
    "defaultEventDuration" INTEGER NOT NULL DEFAULT 60,
    "briefingTime" TEXT,
    "startupStage" TEXT,
    "focusAreasJson" JSONB,
    "oliviaEnabled" BOOLEAN NOT NULL DEFAULT true,
    "oliviaConfidenceScore" DECIMAL(3,2) NOT NULL DEFAULT 0.5,
    "voiceInputEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoSendVoice" BOOLEAN NOT NULL DEFAULT false,
    "travelBufferEnabled" BOOLEAN NOT NULL DEFAULT false,
    "travelBufferMinutes" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_prep_tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "calendarEntryId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "CalendarPrepTaskStatus" NOT NULL DEFAULT 'pending',
    "priority" "CalendarPriority" NOT NULL DEFAULT 'medium',
    "dueAt" TIMESTAMP(3),
    "dueOffsetHours" INTEGER,
    "linkedDocumentType" TEXT,
    "autoGenerate" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_prep_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_reminders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "calendarEntryId" UUID NOT NULL,
    "reminderMinutes" INTEGER NOT NULL,
    "reminderType" TEXT NOT NULL DEFAULT 'notification',
    "isSent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_entry_attendees" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "calendarEntryId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "socialUrl" TEXT,
    "role" "CalendarAttendeeRole" NOT NULL DEFAULT 'required',
    "rsvpStatus" "CalendarAttendeeRsvp" NOT NULL DEFAULT 'pending',
    "isOrganizer" BOOLEAN NOT NULL DEFAULT false,
    "responseNote" TEXT,
    "notifiedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_entry_attendees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_interactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "calendarEntryId" UUID,
    "interactionType" "CalendarInteractionType" NOT NULL,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_sync_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "provider" "CalendarSyncProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "providerEmail" TEXT,
    "accessTokenEnc" TEXT,
    "refreshTokenEnc" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "syncDirection" "CalendarSyncDirection" NOT NULL DEFAULT 'bidirectional',
    "syncToken" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "consecutiveErrors" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_sync_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_sync_conflicts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "syncAccountId" UUID NOT NULL,
    "localEntryId" TEXT,
    "externalEventId" TEXT,
    "conflictType" TEXT NOT NULL,
    "localDataJson" JSONB,
    "remoteDataJson" JSONB,
    "resolution" "CalendarConflictResolution" NOT NULL DEFAULT 'pending',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_sync_conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_webhook_states" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "syncAccountId" UUID NOT NULL,
    "provider" "CalendarSyncProvider" NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "callbackUrl" TEXT NOT NULL,
    "eventTypesJson" JSONB,
    "status" "WebhookSubscriptionStatus" NOT NULL DEFAULT 'active',
    "expiresAt" TIMESTAMP(3),
    "renewalAttemptedAt" TIMESTAMP(3),
    "renewedAt" TIMESTAMP(3),
    "lastDeliveryAt" TIMESTAMP(3),
    "lastDeliveryEventType" TEXT,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "lastFailureAt" TIMESTAMP(3),
    "lastFailureReason" TEXT,
    "providerMetaJson" JSONB,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_webhook_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_memory_chunks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "calendarEntryId" UUID NOT NULL,
    "chunkIndex" INTEGER NOT NULL DEFAULT 0,
    "text" TEXT NOT NULL,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_memory_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "olivia_calendar_recommendations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "type" "OliviaRecommendationType" NOT NULL,
    "urgency" "OliviaRecommendationUrgency" NOT NULL DEFAULT 'when_relevant',
    "status" "OliviaRecommendationStatus" NOT NULL DEFAULT 'pending',
    "message" TEXT NOT NULL,
    "reasoningJson" JSONB,
    "triggerType" TEXT,
    "triggerDescription" TEXT,
    "eventDraftJson" JSONB,
    "confidenceScore" DECIMAL(3,2),
    "actedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "snoozedUntil" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "olivia_calendar_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_transcription_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "rawTranscript" TEXT NOT NULL,
    "parsedResultJson" JSONB,
    "calendarEntryId" UUID,
    "confidenceScore" DECIMAL(3,2),
    "durationMs" INTEGER,
    "wasAccepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_transcription_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "founder_weeks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "weekStartDate" DATE NOT NULL,
    "meetingsCount" INTEGER NOT NULL DEFAULT 0,
    "networkingCount" INTEGER NOT NULL DEFAULT 0,
    "focusHours" DECIMAL(5,1) NOT NULL DEFAULT 0,
    "prepTasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "prepTasksTotal" INTEGER NOT NULL DEFAULT 0,
    "suggestionsAccepted" INTEGER NOT NULL DEFAULT 0,
    "suggestionsDismissed" INTEGER NOT NULL DEFAULT 0,
    "topCategoriesJson" JSONB,
    "oliviaSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "founder_weeks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "calendarEntryId" UUID,
    "title" TEXT NOT NULL DEFAULT 'Untitled Note',
    "content" TEXT,
    "drawingData" JSONB,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "calendar_entries_userId_startDatetime_idx" ON "calendar_entries"("userId", "startDatetime");

-- CreateIndex
CREATE INDEX "calendar_entries_userId_isArchived_idx" ON "calendar_entries"("userId", "isArchived");

-- CreateIndex
CREATE INDEX "calendar_entries_userId_category_idx" ON "calendar_entries"("userId", "category");

-- CreateIndex
CREATE INDEX "calendar_entries_userId_entryType_idx" ON "calendar_entries"("userId", "entryType");

-- CreateIndex
CREATE INDEX "calendar_entries_externalCalendarId_externalProvider_idx" ON "calendar_entries"("externalCalendarId", "externalProvider");

-- CreateIndex
CREATE INDEX "calendar_entries_recurrenceParentId_idx" ON "calendar_entries"("recurrenceParentId");

-- CreateIndex
CREATE INDEX "calendar_entries_rescheduledFromId_idx" ON "calendar_entries"("rescheduledFromId");

-- CreateIndex
CREATE INDEX "calendar_entries_attendanceStatus_idx" ON "calendar_entries"("attendanceStatus");

-- CreateIndex
CREATE INDEX "calendar_entries_isArchived_startDatetime_idx" ON "calendar_entries"("isArchived", "startDatetime");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_preferences_userId_key" ON "calendar_preferences"("userId");

-- CreateIndex
CREATE INDEX "calendar_prep_tasks_calendarEntryId_idx" ON "calendar_prep_tasks"("calendarEntryId");

-- CreateIndex
CREATE INDEX "calendar_prep_tasks_status_idx" ON "calendar_prep_tasks"("status");

-- CreateIndex
CREATE INDEX "calendar_prep_tasks_dueAt_idx" ON "calendar_prep_tasks"("dueAt");

-- CreateIndex
CREATE INDEX "calendar_prep_tasks_isArchived_idx" ON "calendar_prep_tasks"("isArchived");

-- CreateIndex
CREATE INDEX "calendar_reminders_calendarEntryId_idx" ON "calendar_reminders"("calendarEntryId");

-- CreateIndex
CREATE INDEX "calendar_reminders_isSent_idx" ON "calendar_reminders"("isSent");

-- CreateIndex
CREATE INDEX "calendar_entry_attendees_calendarEntryId_idx" ON "calendar_entry_attendees"("calendarEntryId");

-- CreateIndex
CREATE INDEX "calendar_entry_attendees_rsvpStatus_idx" ON "calendar_entry_attendees"("rsvpStatus");

-- CreateIndex
CREATE INDEX "calendar_entry_attendees_isArchived_idx" ON "calendar_entry_attendees"("isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_entry_attendees_calendarEntryId_email_key" ON "calendar_entry_attendees"("calendarEntryId", "email");

-- CreateIndex
CREATE INDEX "calendar_interactions_userId_createdAt_idx" ON "calendar_interactions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "calendar_interactions_interactionType_idx" ON "calendar_interactions"("interactionType");

-- CreateIndex
CREATE INDEX "calendar_interactions_calendarEntryId_idx" ON "calendar_interactions"("calendarEntryId");

-- CreateIndex
CREATE INDEX "calendar_sync_accounts_userId_idx" ON "calendar_sync_accounts"("userId");

-- CreateIndex
CREATE INDEX "calendar_sync_accounts_provider_idx" ON "calendar_sync_accounts"("provider");

-- CreateIndex
CREATE INDEX "calendar_sync_accounts_isActive_idx" ON "calendar_sync_accounts"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_sync_accounts_userId_provider_providerAccountId_key" ON "calendar_sync_accounts"("userId", "provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "calendar_sync_conflicts_syncAccountId_idx" ON "calendar_sync_conflicts"("syncAccountId");

-- CreateIndex
CREATE INDEX "calendar_sync_conflicts_resolution_idx" ON "calendar_sync_conflicts"("resolution");

-- CreateIndex
CREATE INDEX "calendar_webhook_states_syncAccountId_idx" ON "calendar_webhook_states"("syncAccountId");

-- CreateIndex
CREATE INDEX "calendar_webhook_states_provider_status_idx" ON "calendar_webhook_states"("provider", "status");

-- CreateIndex
CREATE INDEX "calendar_webhook_states_status_expiresAt_idx" ON "calendar_webhook_states"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "calendar_webhook_states_isArchived_idx" ON "calendar_webhook_states"("isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_webhook_states_provider_subscriptionId_key" ON "calendar_webhook_states"("provider", "subscriptionId");

-- CreateIndex
CREATE INDEX "calendar_memory_chunks_userId_idx" ON "calendar_memory_chunks"("userId");

-- CreateIndex
CREATE INDEX "calendar_memory_chunks_calendarEntryId_idx" ON "calendar_memory_chunks"("calendarEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_memory_chunks_calendarEntryId_chunkIndex_key" ON "calendar_memory_chunks"("calendarEntryId", "chunkIndex");

-- CreateIndex
CREATE INDEX "olivia_calendar_recommendations_userId_status_idx" ON "olivia_calendar_recommendations"("userId", "status");

-- CreateIndex
CREATE INDEX "olivia_calendar_recommendations_userId_createdAt_idx" ON "olivia_calendar_recommendations"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "olivia_calendar_recommendations_urgency_idx" ON "olivia_calendar_recommendations"("urgency");

-- CreateIndex
CREATE INDEX "olivia_calendar_recommendations_status_idx" ON "olivia_calendar_recommendations"("status");

-- CreateIndex
CREATE INDEX "olivia_calendar_recommendations_isArchived_idx" ON "olivia_calendar_recommendations"("isArchived");

-- CreateIndex
CREATE INDEX "voice_transcription_logs_userId_createdAt_idx" ON "voice_transcription_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "founder_weeks_userId_weekStartDate_idx" ON "founder_weeks"("userId", "weekStartDate");

-- CreateIndex
CREATE UNIQUE INDEX "founder_weeks_userId_weekStartDate_key" ON "founder_weeks"("userId", "weekStartDate");

-- CreateIndex
CREATE INDEX "calendar_notes_userId_isArchived_idx" ON "calendar_notes"("userId", "isArchived");

-- CreateIndex
CREATE INDEX "calendar_notes_userId_calendarEntryId_idx" ON "calendar_notes"("userId", "calendarEntryId");

-- CreateIndex
CREATE INDEX "calendar_notes_calendarEntryId_idx" ON "calendar_notes"("calendarEntryId");

-- AddForeignKey
ALTER TABLE "calendar_entries" ADD CONSTRAINT "calendar_entries_recurrenceParentId_fkey" FOREIGN KEY ("recurrenceParentId") REFERENCES "calendar_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_entries" ADD CONSTRAINT "calendar_entries_rescheduledFromId_fkey" FOREIGN KEY ("rescheduledFromId") REFERENCES "calendar_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_prep_tasks" ADD CONSTRAINT "calendar_prep_tasks_calendarEntryId_fkey" FOREIGN KEY ("calendarEntryId") REFERENCES "calendar_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_reminders" ADD CONSTRAINT "calendar_reminders_calendarEntryId_fkey" FOREIGN KEY ("calendarEntryId") REFERENCES "calendar_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_entry_attendees" ADD CONSTRAINT "calendar_entry_attendees_calendarEntryId_fkey" FOREIGN KEY ("calendarEntryId") REFERENCES "calendar_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_interactions" ADD CONSTRAINT "calendar_interactions_calendarEntryId_fkey" FOREIGN KEY ("calendarEntryId") REFERENCES "calendar_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_sync_conflicts" ADD CONSTRAINT "calendar_sync_conflicts_syncAccountId_fkey" FOREIGN KEY ("syncAccountId") REFERENCES "calendar_sync_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_webhook_states" ADD CONSTRAINT "calendar_webhook_states_syncAccountId_fkey" FOREIGN KEY ("syncAccountId") REFERENCES "calendar_sync_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_memory_chunks" ADD CONSTRAINT "calendar_memory_chunks_calendarEntryId_fkey" FOREIGN KEY ("calendarEntryId") REFERENCES "calendar_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_notes" ADD CONSTRAINT "calendar_notes_calendarEntryId_fkey" FOREIGN KEY ("calendarEntryId") REFERENCES "calendar_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
