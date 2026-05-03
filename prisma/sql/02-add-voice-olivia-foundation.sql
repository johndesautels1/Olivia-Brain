-- CreateTable
CREATE TABLE "olivia_conversations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID,
    "sessionToken" TEXT NOT NULL,
    "title" TEXT,
    "pageContext" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'chat',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "olivia_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "olivia_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversationId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "toolName" TEXT,
    "toolArgs" JSONB,
    "toolResult" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "olivia_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "olivia_presentations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversationId" UUID,
    "userId" UUID,
    "generationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "gammaUrl" TEXT,
    "exportUrl" TEXT,
    "exportFormat" TEXT,
    "title" TEXT,
    "inputSummary" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "olivia_presentations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "olivia_consents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "consentType" TEXT NOT NULL,
    "consentVersion" TEXT NOT NULL DEFAULT '1.0',
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,

    CONSTRAINT "olivia_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "olivia_guardrails" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "replacement" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'block',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "olivia_guardrails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "olivia_user_memories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "factKey" TEXT NOT NULL,
    "factValue" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "source" TEXT NOT NULL DEFAULT 'conversation',
    "sourceMessageId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "olivia_user_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_conversations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "callSid" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "callerPhone" TEXT NOT NULL,
    "calledPhone" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "recordingUrl" TEXT,
    "recordingSid" TEXT,
    "conversationType" TEXT NOT NULL DEFAULT 'general',
    "fullTranscript" TEXT NOT NULL,
    "extractedData" JSONB,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "extractedAt" TIMESTAMP(3),
    "userId" UUID,
    "voiceContactId" UUID,
    "calendarEntryId" UUID,
    "memoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "generatedDocumentId" TEXT,
    "generatedPackageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "company" TEXT,
    "role" TEXT,
    "location" TEXT,
    "industry" TEXT,
    "companySize" TEXT,
    "needs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "goals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "painPoints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "communicationStyle" TEXT,
    "bestContactMethod" TEXT,
    "bestContactTime" TEXT,
    "timezone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'lead',
    "source" TEXT NOT NULL DEFAULT 'voice_call',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_action_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversationId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "assignedTo" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "completedAt" TIMESTAMP(3),
    "completionNote" TEXT,
    "calendarEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_action_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "olivia_conversations_sessionToken_key" ON "olivia_conversations"("sessionToken");

-- CreateIndex
CREATE INDEX "olivia_conversations_userId_createdAt_idx" ON "olivia_conversations"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "olivia_conversations_sessionToken_idx" ON "olivia_conversations"("sessionToken");

-- CreateIndex
CREATE INDEX "olivia_messages_conversationId_createdAt_idx" ON "olivia_messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "olivia_presentations_userId_createdAt_idx" ON "olivia_presentations"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "olivia_presentations_conversationId_idx" ON "olivia_presentations"("conversationId");

-- CreateIndex
CREATE INDEX "olivia_consents_userId_idx" ON "olivia_consents"("userId");

-- CreateIndex
CREATE INDEX "olivia_consents_consentType_granted_idx" ON "olivia_consents"("consentType", "granted");

-- CreateIndex
CREATE UNIQUE INDEX "olivia_consents_userId_consentType_key" ON "olivia_consents"("userId", "consentType");

-- CreateIndex
CREATE INDEX "olivia_guardrails_category_isActive_idx" ON "olivia_guardrails"("category", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "olivia_guardrails_category_value_key" ON "olivia_guardrails"("category", "value");

-- CreateIndex
CREATE INDEX "olivia_user_memories_userId_isActive_idx" ON "olivia_user_memories"("userId", "isActive");

-- CreateIndex
CREATE INDEX "olivia_user_memories_userId_category_idx" ON "olivia_user_memories"("userId", "category");

-- CreateIndex
CREATE INDEX "olivia_user_memories_sourceMessageId_idx" ON "olivia_user_memories"("sourceMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "olivia_user_memories_userId_category_factKey_key" ON "olivia_user_memories"("userId", "category", "factKey");

-- CreateIndex
CREATE UNIQUE INDEX "voice_conversations_callSid_key" ON "voice_conversations"("callSid");

-- CreateIndex
CREATE INDEX "voice_conversations_callSid_idx" ON "voice_conversations"("callSid");

-- CreateIndex
CREATE INDEX "voice_conversations_direction_idx" ON "voice_conversations"("direction");

-- CreateIndex
CREATE INDEX "voice_conversations_callerPhone_idx" ON "voice_conversations"("callerPhone");

-- CreateIndex
CREATE INDEX "voice_conversations_status_idx" ON "voice_conversations"("status");

-- CreateIndex
CREATE INDEX "voice_conversations_conversationType_idx" ON "voice_conversations"("conversationType");

-- CreateIndex
CREATE INDEX "voice_conversations_userId_idx" ON "voice_conversations"("userId");

-- CreateIndex
CREATE INDEX "voice_conversations_voiceContactId_idx" ON "voice_conversations"("voiceContactId");

-- CreateIndex
CREATE INDEX "voice_conversations_startedAt_idx" ON "voice_conversations"("startedAt");

-- CreateIndex
CREATE INDEX "voice_conversations_generatedDocumentId_idx" ON "voice_conversations"("generatedDocumentId");

-- CreateIndex
CREATE INDEX "voice_conversations_generatedPackageId_idx" ON "voice_conversations"("generatedPackageId");

-- CreateIndex
CREATE INDEX "voice_contacts_phone_idx" ON "voice_contacts"("phone");

-- CreateIndex
CREATE INDEX "voice_contacts_email_idx" ON "voice_contacts"("email");

-- CreateIndex
CREATE INDEX "voice_contacts_status_idx" ON "voice_contacts"("status");

-- CreateIndex
CREATE INDEX "voice_contacts_company_idx" ON "voice_contacts"("company");

-- CreateIndex
CREATE INDEX "voice_action_items_conversationId_idx" ON "voice_action_items"("conversationId");

-- CreateIndex
CREATE INDEX "voice_action_items_assignedTo_idx" ON "voice_action_items"("assignedTo");

-- CreateIndex
CREATE INDEX "voice_action_items_status_idx" ON "voice_action_items"("status");

-- CreateIndex
CREATE INDEX "voice_action_items_dueDate_idx" ON "voice_action_items"("dueDate");

-- CreateIndex
CREATE INDEX "voice_action_items_priority_idx" ON "voice_action_items"("priority");

-- AddForeignKey
ALTER TABLE "olivia_messages" ADD CONSTRAINT "olivia_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "olivia_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "olivia_presentations" ADD CONSTRAINT "olivia_presentations_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "olivia_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_conversations" ADD CONSTRAINT "voice_conversations_voiceContactId_fkey" FOREIGN KEY ("voiceContactId") REFERENCES "voice_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_conversations" ADD CONSTRAINT "voice_conversations_calendarEntryId_fkey" FOREIGN KEY ("calendarEntryId") REFERENCES "calendar_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_action_items" ADD CONSTRAINT "voice_action_items_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "voice_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

