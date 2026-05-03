import prisma from "@/lib/db/client";
import type {
  AttendanceStatus,
  CalendarCategory,
  CalendarEntryType,
  CalendarPriority,
  CalendarPrepTaskStatus,
  CalendarSyncProvider as SyncProvider,
  OliviaRecommendationStatus,
  WebhookSubscriptionStatus,
} from "@prisma/client";

// =============================================================================
// CALENDAR ENTRY QUERIES
// =============================================================================

const CALENDAR_ENTRY_SELECT = {
  id: true,
  userId: true,
  title: true,
  description: true,
  location: true,
  virtualUrl: true,
  startDatetime: true,
  endDatetime: true,
  allDay: true,
  entryType: true,
  category: true,
  priority: true,
  tagsJson: true,
  isAiGenerated: true,
  aiConfidenceScore: true,
  aiSource: true,
  rrule: true,
  recurrenceParentId: true,
  ecosystemOrgName: true,
  investmentStage: true,
  externalCalendarId: true,
  externalProvider: true,
  attendanceStatus: true,
  attendanceNote: true,
  rescheduledFromId: true,
  rescheduledFromDate: true,
  isVip: true,
  isArchived: true,
  createdAt: true,
  updatedAt: true,
  prepTasks: {
    where: { isArchived: false },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      dueAt: true,
      dueOffsetHours: true,
      completedAt: true,
    },
    orderBy: { dueAt: "asc" as const },
  },
  reminders: {
    select: {
      id: true,
      reminderMinutes: true,
      reminderType: true,
      isSent: true,
    },
  },
  attendees: {
    where: { isArchived: false },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      socialUrl: true,
      role: true,
      rsvpStatus: true,
      isOrganizer: true,
      responseNote: true,
      notifiedAt: true,
      respondedAt: true,
    },
    orderBy: { isOrganizer: "desc" as const },
  },
} as const;

export interface CalendarEntryWithDetails {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  location: string | null;
  virtualUrl: string | null;
  startDatetime: string;
  endDatetime: string;
  allDay: boolean;
  entryType: string;
  category: string;
  priority: string;
  tags: string[];
  isAiGenerated: boolean;
  aiConfidenceScore: number | null;
  aiSource: string | null;
  rrule: string | null;
  recurrenceParentId: string | null;
  ecosystemOrgName: string | null;
  investmentStage: string | null;
  externalCalendarId: string | null;
  externalProvider: string | null;
  attendanceStatus: string;
  attendanceNote: string | null;
  rescheduledFromId: string | null;
  rescheduledFromDate: string | null;
  isVip: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  prepTasks: {
    id: string;
    title: string;
    status: string;
    priority: string;
    dueAt: string | null;
    dueOffsetHours: number | null;
    completedAt: string | null;
  }[];
  reminders: {
    id: string;
    reminderMinutes: number;
    reminderType: string;
    isSent: boolean;
  }[];
  attendees: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    socialUrl: string | null;
    role: string;
    rsvpStatus: string;
    isOrganizer: boolean;
    responseNote: string | null;
    notifiedAt: string | null;
    respondedAt: string | null;
  }[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseCalendarEntry(e: any): CalendarEntryWithDetails {
  let tags: string[] = [];
  if (Array.isArray(e.tagsJson)) {
    tags = e.tagsJson as string[];
  }
  return {
    id: e.id,
    userId: e.userId,
    title: e.title,
    description: e.description,
    location: e.location,
    virtualUrl: e.virtualUrl,
    startDatetime: e.startDatetime.toISOString(),
    endDatetime: e.endDatetime.toISOString(),
    allDay: e.allDay,
    entryType: e.entryType,
    category: e.category,
    priority: e.priority,
    tags,
    isAiGenerated: e.isAiGenerated,
    aiConfidenceScore: e.aiConfidenceScore ? Number(e.aiConfidenceScore) : null,
    aiSource: e.aiSource,
    rrule: e.rrule,
    recurrenceParentId: e.recurrenceParentId,
    ecosystemOrgName: e.ecosystemOrgName,
    investmentStage: e.investmentStage,
    externalCalendarId: e.externalCalendarId,
    externalProvider: e.externalProvider,
    attendanceStatus: e.attendanceStatus,
    attendanceNote: e.attendanceNote,
    rescheduledFromId: e.rescheduledFromId,
    rescheduledFromDate: e.rescheduledFromDate?.toISOString() || null,
    isVip: e.isVip ?? false,
    isArchived: e.isArchived,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    prepTasks: (e.prepTasks || []).map(
      (t: {
        id: string;
        title: string;
        status: string;
        priority: string;
        dueAt: Date | null;
        dueOffsetHours: number | null;
        completedAt: Date | null;
      }) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueAt: t.dueAt?.toISOString() || null,
        dueOffsetHours: t.dueOffsetHours,
        completedAt: t.completedAt?.toISOString() || null,
      })
    ),
    reminders: e.reminders || [],
    attendees: (e.attendees || []).map(
      (a: {
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        socialUrl: string | null;
        role: string;
        rsvpStatus: string;
        isOrganizer: boolean;
        responseNote: string | null;
        notifiedAt: Date | null;
        respondedAt: Date | null;
      }) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        phone: a.phone,
        socialUrl: a.socialUrl,
        role: a.role,
        rsvpStatus: a.rsvpStatus,
        isOrganizer: a.isOrganizer,
        responseNote: a.responseNote,
        notifiedAt: a.notifiedAt?.toISOString() || null,
        respondedAt: a.respondedAt?.toISOString() || null,
      })
    ),
  };
}

/**
 * Get calendar entries for a user within a date range.
 * This is the primary query used by the calendar UI.
 */
export async function getCalendarEntries(
  userId: string,
  rangeStart: Date,
  rangeEnd: Date,
  options?: {
    category?: CalendarCategory;
    entryType?: CalendarEntryType;
    priority?: CalendarPriority;
    includeArchived?: boolean;
  }
) {
  const where: Record<string, unknown> = {
    userId,
    startDatetime: { lte: rangeEnd },
    endDatetime: { gte: rangeStart },
  };

  if (!options?.includeArchived) {
    where.isArchived = false;
  }
  if (options?.category) {
    where.category = options.category;
  }
  if (options?.entryType) {
    where.entryType = options.entryType;
  }
  if (options?.priority) {
    where.priority = options.priority;
  }

  const entries = await prisma.calendarEntry.findMany({
    where,
    select: CALENDAR_ENTRY_SELECT,
    orderBy: { startDatetime: "asc" },
  });

  return entries.map(parseCalendarEntry);
}

/**
 * Get a single calendar entry by ID (with ownership check).
 */
export async function getCalendarEntryById(
  entryId: string,
  userId: string
) {
  const entry = await prisma.calendarEntry.findFirst({
    where: { id: entryId, userId, isArchived: false },
    select: CALENDAR_ENTRY_SELECT,
  });

  return entry ? parseCalendarEntry(entry) : null;
}

/**
 * Get today's entries for a user (for daily briefing / agenda rail).
 */
export async function getTodayEntries(userId: string, timezone: string = "Europe/London") {
  const now = new Date();
  // Construct day boundaries in the user's timezone
  const dayStart = new Date(
    now.toLocaleDateString("en-US", { timeZone: timezone }) + " 00:00:00"
  );
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  return getCalendarEntries(userId, dayStart, dayEnd);
}

/**
 * Get upcoming entries for the next N days (default 14).
 */
export async function getUpcomingCalendarEntries(
  userId: string,
  days: number = 14
) {
  const now = new Date();
  const futureDate = new Date(now);
  futureDate.setDate(futureDate.getDate() + days);

  return getCalendarEntries(userId, now, futureDate);
}

/**
 * Create a new calendar entry.
 */
export async function createCalendarEntry(data: {
  userId: string;
  title: string;
  startDatetime: Date;
  endDatetime: Date;
  category: CalendarCategory;
  entryType?: CalendarEntryType;
  priority?: CalendarPriority;
  description?: string;
  location?: string;
  virtualUrl?: string;
  allDay?: boolean;
  tagsJson?: string[];
  isAiGenerated?: boolean;
  aiConfidenceScore?: number;
  aiSource?: string;
  rrule?: string;
  recurrenceParentId?: string;
  ecosystemOrgName?: string;
  investmentStage?: string;
  externalCalendarId?: string;
  externalProvider?: "google" | "outlook" | "calendly" | "ical_url";
  rescheduledFromId?: string;
  rescheduledFromDate?: Date;
  isVip?: boolean;
}) {
  const entry = await prisma.calendarEntry.create({
    data: {
      userId: data.userId,
      title: data.title,
      startDatetime: data.startDatetime,
      endDatetime: data.endDatetime,
      category: data.category,
      entryType: data.entryType || "event",
      priority: data.priority || "medium",
      description: data.description,
      location: data.location,
      virtualUrl: data.virtualUrl,
      allDay: data.allDay || false,
      tagsJson: data.tagsJson || [],
      isAiGenerated: data.isAiGenerated || false,
      aiConfidenceScore: data.aiConfidenceScore,
      aiSource: data.aiSource,
      rrule: data.rrule,
      recurrenceParentId: data.recurrenceParentId,
      ecosystemOrgName: data.ecosystemOrgName,
      investmentStage: data.investmentStage,
      externalCalendarId: data.externalCalendarId,
      externalProvider: data.externalProvider,
      rescheduledFromId: data.rescheduledFromId,
      rescheduledFromDate: data.rescheduledFromDate,
      isVip: data.isVip || false,
    },
    select: CALENDAR_ENTRY_SELECT,
  });

  return parseCalendarEntry(entry);
}

/**
 * Update a calendar entry (with ownership check).
 */
export async function updateCalendarEntry(
  entryId: string,
  userId: string,
  data: {
    title?: string;
    description?: string;
    location?: string;
    virtualUrl?: string;
    startDatetime?: Date;
    endDatetime?: Date;
    allDay?: boolean;
    entryType?: CalendarEntryType;
    category?: CalendarCategory;
    priority?: CalendarPriority;
    tagsJson?: string[];
    rrule?: string;
    ecosystemOrgName?: string;
    investmentStage?: string;
    attendanceStatus?: AttendanceStatus;
    attendanceNote?: string | null;
    rescheduledFromId?: string | null;
    rescheduledFromDate?: Date | null;
    isVip?: boolean;
  }
) {
  // Verify ownership first
  const existing = await prisma.calendarEntry.findFirst({
    where: { id: entryId, userId },
    select: { id: true },
  });
  if (!existing) return null;

  const entry = await prisma.calendarEntry.update({
    where: { id: entryId },
    data,
    select: CALENDAR_ENTRY_SELECT,
  });

  return parseCalendarEntry(entry);
}

/**
 * Soft-delete a calendar entry (with ownership check).
 */
export async function archiveCalendarEntry(
  entryId: string,
  userId: string
) {
  const existing = await prisma.calendarEntry.findFirst({
    where: { id: entryId, userId, isArchived: false },
    select: { id: true },
  });
  if (!existing) return false;

  await prisma.calendarEntry.update({
    where: { id: entryId },
    data: { isArchived: true },
  });

  return true;
}

// =============================================================================
// CALENDAR PREFERENCES
// =============================================================================

export async function getCalendarPreferences(userId: string) {
  return prisma.calendarPreferences.findUnique({
    where: { userId },
  });
}

export async function upsertCalendarPreferences(
  userId: string,
  data: {
    timezone?: string;
    defaultView?: string;
    densityMode?: string;
    workingHoursStart?: number;
    workingHoursEnd?: number;
    workingDaysJson?: number[];
    defaultEventDuration?: number;
    briefingTime?: string;
    startupStage?: string;
    focusAreasJson?: string[];
    oliviaEnabled?: boolean;
    voiceInputEnabled?: boolean;
    autoSendVoice?: boolean;
    travelBufferEnabled?: boolean;
    travelBufferMinutes?: number;
  }
) {
  return prisma.calendarPreferences.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}

// =============================================================================
// PREP TASKS
// =============================================================================

export async function getCalendarPrepTasks(
  calendarEntryId: string,
  userId: string
) {
  // Verify the entry belongs to the user
  const entry = await prisma.calendarEntry.findFirst({
    where: { id: calendarEntryId, userId },
    select: { id: true },
  });
  if (!entry) return [];

  return prisma.calendarPrepTask.findMany({
    where: { calendarEntryId, isArchived: false },
    orderBy: [{ priority: "asc" }, { dueAt: "asc" }],
  });
}

export async function updatePrepTaskStatus(
  taskId: string,
  userId: string,
  status: CalendarPrepTaskStatus
) {
  // Verify ownership through the calendar entry
  const task = await prisma.calendarPrepTask.findFirst({
    where: { id: taskId, calendarEntry: { userId } },
    select: { id: true },
  });
  if (!task) return null;

  return prisma.calendarPrepTask.update({
    where: { id: taskId },
    data: {
      status,
      completedAt: status === "completed" ? new Date() : null,
    },
  });
}

export async function createPrepTask(data: {
  calendarEntryId: string;
  title: string;
  description?: string;
  priority?: CalendarPriority;
  dueAt?: Date;
  dueOffsetHours?: number;
  linkedDocumentType?: string;
  autoGenerate?: boolean;
}) {
  return prisma.calendarPrepTask.create({ data });
}

// =============================================================================
// INTERACTIONS (behavior tracking)
// =============================================================================

export async function logCalendarInteraction(data: {
  userId: string;
  calendarEntryId?: string;
  interactionType:
    | "created"
    | "updated"
    | "deleted"
    | "moved"
    | "accepted_suggestion"
    | "dismissed_suggestion"
    | "snoozed_suggestion"
    | "completed_prep_task"
    | "skipped_prep_task"
    | "rsvp_changed"
    | "attendance_changed";
  metadataJson?: Record<string, unknown>;
}) {
  return prisma.calendarInteraction.create({
    data: {
      userId: data.userId,
      calendarEntryId: data.calendarEntryId,
      interactionType: data.interactionType,
      metadataJson: data.metadataJson
        ? (data.metadataJson as unknown as import("@prisma/client").Prisma.InputJsonValue)
        : undefined,
    },
  });
}

// =============================================================================
// OLIVIA RECOMMENDATIONS
// =============================================================================

/**
 * Archive expired recommendations based on:
 * 1. eventDraftJson.suggested_datetime — expire the calendar day after the event
 * 2. Urgency-based TTL when no event draft exists:
 *    - immediate/today: expire at end of creation day
 *    - this_week: expire 7 days after creation
 *    - when_relevant: expire 14 days after creation
 */
export async function archiveExpiredRecommendations(userId?: string) {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  // Fetch all pending, non-archived recommendations (scoped to user if provided)
  const pending = await prisma.oliviaCalendarRecommendation.findMany({
    where: {
      ...(userId ? { userId } : {}),
      status: "pending",
      isArchived: false,
    },
    select: {
      id: true,
      urgency: true,
      eventDraftJson: true,
      createdAt: true,
    },
  });

  const idsToArchive: string[] = [];

  for (const rec of pending) {
    let expired = false;

    // 1. Check eventDraftJson.suggested_datetime if present
    const draft = rec.eventDraftJson as Record<string, unknown> | null;
    if (draft?.suggested_datetime && typeof draft.suggested_datetime === "string") {
      const eventDate = new Date(draft.suggested_datetime);
      if (!isNaN(eventDate.getTime())) {
        // Expire the calendar day after the event date
        const dayAfterEvent = new Date(eventDate);
        dayAfterEvent.setDate(dayAfterEvent.getDate() + 1);
        dayAfterEvent.setHours(0, 0, 0, 0);
        if (now >= dayAfterEvent) {
          expired = true;
        }
      }
    }

    // 2. Urgency-based TTL (fallback when no event draft date or date hasn't expired)
    if (!expired) {
      const createdAt = new Date(rec.createdAt);
      const dayAfterCreation = new Date(createdAt);
      dayAfterCreation.setDate(dayAfterCreation.getDate() + 1);
      dayAfterCreation.setHours(0, 0, 0, 0);

      switch (rec.urgency) {
        case "immediate":
        case "today":
          // Expire the calendar day after creation
          if (now >= dayAfterCreation) expired = true;
          break;
        case "this_week": {
          const sevenDaysAfter = new Date(createdAt);
          sevenDaysAfter.setDate(sevenDaysAfter.getDate() + 7);
          sevenDaysAfter.setHours(0, 0, 0, 0);
          if (now >= sevenDaysAfter) expired = true;
          break;
        }
        case "when_relevant": {
          const fourteenDaysAfter = new Date(createdAt);
          fourteenDaysAfter.setDate(fourteenDaysAfter.getDate() + 14);
          fourteenDaysAfter.setHours(0, 0, 0, 0);
          if (now >= fourteenDaysAfter) expired = true;
          break;
        }
      }
    }

    if (expired) idsToArchive.push(rec.id);
  }

  if (idsToArchive.length > 0) {
    await prisma.oliviaCalendarRecommendation.updateMany({
      where: { id: { in: idsToArchive } },
      data: { isArchived: true, dismissedAt: now },
    });
  }

  return idsToArchive.length;
}

export async function getActiveRecommendations(userId: string) {
  // Clean up expired recommendations before fetching
  await archiveExpiredRecommendations(userId);

  return prisma.oliviaCalendarRecommendation.findMany({
    where: {
      userId,
      status: "pending",
      isArchived: false,
    },
    orderBy: [{ urgency: "asc" }, { createdAt: "desc" }],
    take: 10,
  });
}

export async function updateRecommendationStatus(
  recommendationId: string,
  userId: string,
  status: OliviaRecommendationStatus
) {
  const rec = await prisma.oliviaCalendarRecommendation.findFirst({
    where: { id: recommendationId, userId },
    select: { id: true },
  });
  if (!rec) return null;

  return prisma.oliviaCalendarRecommendation.update({
    where: { id: recommendationId },
    data: {
      status,
      actedAt: status === "accepted" ? new Date() : undefined,
      dismissedAt: status === "dismissed" ? new Date() : undefined,
    },
  });
}

// =============================================================================
// ATTENDEES
// =============================================================================

export async function getCalendarEntryAttendees(
  calendarEntryId: string,
  userId: string
) {
  // Verify the entry belongs to the user
  const entry = await prisma.calendarEntry.findFirst({
    where: { id: calendarEntryId, userId },
    select: { id: true },
  });
  if (!entry) return [];

  return prisma.calendarEntryAttendee.findMany({
    where: { calendarEntryId, isArchived: false },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      rsvpStatus: true,
      isOrganizer: true,
      responseNote: true,
      notifiedAt: true,
      respondedAt: true,
    },
    orderBy: [{ isOrganizer: "desc" }, { name: "asc" }],
  });
}

export async function addAttendeeToEntry(
  calendarEntryId: string,
  userId: string,
  data: {
    name: string;
    email?: string;
    role?: "required" | "optional" | "organizer" | "speaker";
    rsvpStatus?: "pending" | "accepted" | "declined" | "tentative";
    isOrganizer?: boolean;
  }
) {
  // Verify the entry belongs to the user
  const entry = await prisma.calendarEntry.findFirst({
    where: { id: calendarEntryId, userId },
    select: { id: true },
  });
  if (!entry) return null;

  return prisma.calendarEntryAttendee.create({
    data: {
      calendarEntryId,
      name: data.name,
      email: data.email || null,
      role: data.role || "required",
      rsvpStatus: data.rsvpStatus || "pending",
      isOrganizer: data.isOrganizer || false,
    },
  });
}

export async function updateAttendee(
  attendeeId: string,
  userId: string,
  data: {
    name?: string;
    email?: string;
    role?: "required" | "optional" | "organizer" | "speaker";
    rsvpStatus?: "pending" | "accepted" | "declined" | "tentative";
    isOrganizer?: boolean;
    responseNote?: string;
  }
) {
  // Verify ownership through the calendar entry
  const attendee = await prisma.calendarEntryAttendee.findFirst({
    where: { id: attendeeId, calendarEntry: { userId } },
    select: { id: true },
  });
  if (!attendee) return null;

  return prisma.calendarEntryAttendee.update({
    where: { id: attendeeId },
    data: {
      ...data,
      respondedAt:
        data.rsvpStatus && data.rsvpStatus !== "pending"
          ? new Date()
          : undefined,
    },
  });
}

export async function removeAttendeeFromEntry(
  attendeeId: string,
  userId: string
) {
  // Verify ownership through the calendar entry
  const attendee = await prisma.calendarEntryAttendee.findFirst({
    where: { id: attendeeId, calendarEntry: { userId } },
    select: { id: true },
  });
  if (!attendee) return false;

  await prisma.calendarEntryAttendee.update({
    where: { id: attendeeId },
    data: { isArchived: true },
  });

  return true;
}

export async function bulkSetAttendees(
  calendarEntryId: string,
  userId: string,
  attendees: {
    name: string;
    email?: string;
    phone?: string;
    socialUrl?: string;
    role?: "required" | "optional" | "organizer" | "speaker";
    rsvpStatus?: "pending" | "accepted" | "declined" | "tentative";
    isOrganizer?: boolean;
  }[]
) {
  // Verify the entry belongs to the user
  const entry = await prisma.calendarEntry.findFirst({
    where: { id: calendarEntryId, userId },
    select: { id: true },
  });
  if (!entry) return null;

  // Soft-archive existing attendees and create new ones in a transaction
  await prisma.$transaction([
    prisma.calendarEntryAttendee.updateMany({
      where: { calendarEntryId, isArchived: false },
      data: { isArchived: true },
    }),
    ...attendees.map((a) =>
      prisma.calendarEntryAttendee.create({
        data: {
          calendarEntryId,
          name: a.name,
          email: a.email || null,
          phone: a.phone || null,
          socialUrl: a.socialUrl || null,
          role: a.role || "required",
          rsvpStatus: a.rsvpStatus || "pending",
          isOrganizer: a.isOrganizer || false,
        },
      })
    ),
  ]);

  return prisma.calendarEntryAttendee.findMany({
    where: { calendarEntryId, isArchived: false },
    orderBy: [{ isOrganizer: "desc" }, { name: "asc" }],
  });
}

// =============================================================================
// VOICE TRANSCRIPTION LOG
// =============================================================================

export async function logVoiceTranscription(data: {
  userId: string;
  rawTranscript: string;
  parsedResultJson?: Record<string, unknown>;
  calendarEntryId?: string;
  confidenceScore?: number;
  durationMs?: number;
  wasAccepted?: boolean;
}) {
  return prisma.voiceTranscriptionLog.create({
    data: {
      userId: data.userId,
      rawTranscript: data.rawTranscript,
      parsedResultJson: data.parsedResultJson
        ? (data.parsedResultJson as unknown as import("@prisma/client").Prisma.InputJsonValue)
        : undefined,
      calendarEntryId: data.calendarEntryId,
      confidenceScore: data.confidenceScore,
      durationMs: data.durationMs,
      wasAccepted: data.wasAccepted,
    },
  });
}

// =============================================================================
// FOUNDER WEEK
// =============================================================================

export async function getFounderWeek(userId: string, weekStartDate: Date) {
  return prisma.founderWeek.findUnique({
    where: {
      userId_weekStartDate: { userId, weekStartDate },
    },
  });
}

export async function upsertFounderWeek(
  userId: string,
  weekStartDate: Date,
  data: {
    meetingsCount?: number;
    networkingCount?: number;
    focusHours?: number;
    prepTasksCompleted?: number;
    prepTasksTotal?: number;
    suggestionsAccepted?: number;
    suggestionsDismissed?: number;
    topCategoriesJson?: string[];
    oliviaSummary?: string;
  }
) {
  return prisma.founderWeek.upsert({
    where: {
      userId_weekStartDate: { userId, weekStartDate },
    },
    create: { userId, weekStartDate, ...data },
    update: data,
  });
}

// =============================================================================
// WEBHOOK STATE
// =============================================================================

const WEBHOOK_STATE_SELECT = {
  id: true,
  syncAccountId: true,
  provider: true,
  subscriptionId: true,
  callbackUrl: true,
  eventTypesJson: true,
  status: true,
  expiresAt: true,
  renewalAttemptedAt: true,
  renewedAt: true,
  lastDeliveryAt: true,
  lastDeliveryEventType: true,
  consecutiveFailures: true,
  lastFailureAt: true,
  lastFailureReason: true,
  providerMetaJson: true,
  isArchived: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** Create a new webhook subscription record */
export async function createWebhookState(data: {
  syncAccountId: string;
  provider: SyncProvider;
  subscriptionId: string;
  callbackUrl: string;
  eventTypes?: string[];
  expiresAt?: Date;
  providerMeta?: Record<string, unknown>;
}) {
  return prisma.calendarWebhookState.create({
    data: {
      syncAccountId: data.syncAccountId,
      provider: data.provider,
      subscriptionId: data.subscriptionId,
      callbackUrl: data.callbackUrl,
      eventTypesJson: data.eventTypes || undefined,
      expiresAt: data.expiresAt || undefined,
      providerMetaJson: data.providerMeta
        ? (data.providerMeta as unknown as import("@prisma/client").Prisma.InputJsonValue)
        : undefined,
    },
    select: WEBHOOK_STATE_SELECT,
  });
}

/** Get all active webhook states for a sync account */
export async function getWebhookStates(syncAccountId: string) {
  return prisma.calendarWebhookState.findMany({
    where: { syncAccountId, isArchived: false },
    select: WEBHOOK_STATE_SELECT,
    orderBy: { createdAt: "desc" },
  });
}

/** Get active webhooks for a provider (across all accounts) */
export async function getActiveWebhooksByProvider(provider: SyncProvider) {
  return prisma.calendarWebhookState.findMany({
    where: {
      provider,
      status: { in: ["active", "expiring"] },
      isArchived: false,
    },
    select: {
      ...WEBHOOK_STATE_SELECT,
      syncAccount: {
        select: { id: true, userId: true, providerEmail: true },
      },
    },
    orderBy: { expiresAt: "asc" },
  });
}

/** Find a webhook state by provider + subscriptionId */
export async function getWebhookBySubscriptionId(
  provider: SyncProvider,
  subscriptionId: string
) {
  return prisma.calendarWebhookState.findUnique({
    where: {
      provider_subscriptionId: { provider, subscriptionId },
    },
    select: {
      ...WEBHOOK_STATE_SELECT,
      syncAccount: {
        select: { id: true, userId: true, providerEmail: true },
      },
    },
  });
}

/** Get webhooks that are expiring soon and need renewal */
export async function getExpiringWebhooks(withinHours: number = 24) {
  const threshold = new Date();
  threshold.setHours(threshold.getHours() + withinHours);

  return prisma.calendarWebhookState.findMany({
    where: {
      isArchived: false,
      status: { in: ["active", "expiring"] },
      expiresAt: { lte: threshold },
    },
    select: {
      ...WEBHOOK_STATE_SELECT,
      syncAccount: {
        select: { id: true, userId: true, provider: true, providerEmail: true },
      },
    },
    orderBy: { expiresAt: "asc" },
  });
}

/** Record a successful webhook delivery */
export async function recordWebhookDelivery(
  id: string,
  eventType: string
) {
  return prisma.calendarWebhookState.update({
    where: { id },
    data: {
      lastDeliveryAt: new Date(),
      lastDeliveryEventType: eventType,
      consecutiveFailures: 0,
      status: "active",
    },
    select: WEBHOOK_STATE_SELECT,
  });
}

/** Record a webhook delivery failure */
export async function recordWebhookFailure(
  id: string,
  reason: string
) {
  const current = await prisma.calendarWebhookState.findUnique({
    where: { id },
    select: { consecutiveFailures: true },
  });

  const failures = (current?.consecutiveFailures ?? 0) + 1;
  // Auto-mark as failed after 5 consecutive failures
  const newStatus: WebhookSubscriptionStatus = failures >= 5 ? "failed" : "active";

  return prisma.calendarWebhookState.update({
    where: { id },
    data: {
      consecutiveFailures: failures,
      lastFailureAt: new Date(),
      lastFailureReason: reason,
      status: newStatus,
    },
    select: WEBHOOK_STATE_SELECT,
  });
}

/** Update webhook status (e.g. after renewal or expiry) */
export async function updateWebhookStatus(
  id: string,
  data: {
    status?: WebhookSubscriptionStatus;
    expiresAt?: Date;
    subscriptionId?: string;
    renewedAt?: Date;
    renewalAttemptedAt?: Date;
    providerMeta?: Record<string, unknown>;
  }
) {
  return prisma.calendarWebhookState.update({
    where: { id },
    data: {
      status: data.status,
      expiresAt: data.expiresAt,
      subscriptionId: data.subscriptionId,
      renewedAt: data.renewedAt,
      renewalAttemptedAt: data.renewalAttemptedAt,
      providerMetaJson: data.providerMeta
        ? (data.providerMeta as unknown as import("@prisma/client").Prisma.InputJsonValue)
        : undefined,
    },
    select: WEBHOOK_STATE_SELECT,
  });
}

/** Soft-delete a webhook state (revoke) */
export async function archiveWebhookState(id: string) {
  return prisma.calendarWebhookState.update({
    where: { id },
    data: { isArchived: true, status: "revoked" },
    select: WEBHOOK_STATE_SELECT,
  });
}

/** Mark expiring webhooks that have passed their expiresAt */
export async function markExpiredWebhooks() {
  return prisma.calendarWebhookState.updateMany({
    where: {
      isArchived: false,
      status: { in: ["active", "expiring"] },
      expiresAt: { lte: new Date() },
    },
    data: { status: "expired" },
  });
}
