import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";
import { rateLimit } from "@/lib/rate-limit";
import {
  createCalendarEntry,
  updateCalendarEntry,
  archiveCalendarEntry,
  logCalendarInteraction,
  bulkSetAttendees,
} from "@/lib/queries/calendar";
// Document-aware prep-task attachment is deferred (Document model + linked-org
// queries not in Olivia Brain — re-port in Documents track post-Clerk).
import { expandRecurringEntries } from "@/lib/calendar/rrule-expand";
import type { CalendarCategory, CalendarEntryType, CalendarPriority } from "@prisma/client";

// Replaced for Olivia Brain — userId IS the canonical user ID directly
// (Olivia Brain's calendar/voice/olivia models use `userId String @db.Uuid`,
// not a UserProfile FK). Kept the function name for minimal call-site churn.
async function getUserProfileId(): Promise<string | null> {
  const { userId } = await getAuthSession();
  return userId;
}

// GET — Fetch calendar entries for a date range
export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000, prefix: "cal-entries" });
  if (limited) return limited;

  const userId = await getUserProfileId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json(
      { error: "start and end query params required" },
      { status: 400 }
    );
  }

  const rangeStart = new Date(start);
  const rangeEnd = new Date(end);

  if (isNaN(rangeStart.getTime()) || isNaN(rangeEnd.getTime())) {
    return NextResponse.json(
      { error: "Invalid date format" },
      { status: 400 }
    );
  }

  // Fetch personal entries only. Ecosystem events (LTM Event model) and
  // linkedEvent/linkedOrg/linkedPersonId selects are dropped — those models
  // belong to LTM-domain (Event-family + Person + Organization) and are not
  // in Olivia Brain's schema. Re-port in cluesintelligence Track L if needed.
  const personalEntries = await prisma.calendarEntry.findMany({
    where: {
      userId,
      isArchived: false,
      startDatetime: { lte: rangeEnd },
      endDatetime: { gte: rangeStart },
    },
    include: {
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
        orderBy: { dueAt: "asc" },
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
        orderBy: [{ isOrganizer: "desc" }, { name: "asc" }],
      },
    },
    orderBy: { startDatetime: "asc" },
  });

  const serializedPersonal = personalEntries.map((e) => ({
    ...e,
    startDatetime: e.startDatetime.toISOString(),
    endDatetime: e.endDatetime.toISOString(),
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    aiConfidenceScore: e.aiConfidenceScore ? Number(e.aiConfidenceScore) : null,
    tagsJson: Array.isArray(e.tagsJson) ? e.tagsJson : [],
    externalLastSyncAt: e.externalLastSyncAt?.toISOString() || null,
    prepTasks: e.prepTasks.map((t) => ({
      ...t,
      dueAt: t.dueAt?.toISOString() || null,
      completedAt: t.completedAt?.toISOString() || null,
    })),
    attendees: (e.attendees || []).map((a) => ({
      ...a,
      notifiedAt: a.notifiedAt?.toISOString() || null,
      respondedAt: a.respondedAt?.toISOString() || null,
    })),
  }));

  // Expand recurring entries into virtual instances within the queried range
  const expandedPersonal = expandRecurringEntries(serializedPersonal, rangeStart, rangeEnd);

  // Ecosystem events deferred — return empty array for shape stability.
  return NextResponse.json({
    personalEntries: expandedPersonal,
    ecosystemEvents: [],
  });
}

// POST — Create a new calendar entry
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000, prefix: "cal-entries" });
  if (limited) return limited;

  const userId = await getUserProfileId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    const entry = await createCalendarEntry({
      userId,
      title: body.title,
      startDatetime: new Date(body.startDatetime),
      endDatetime: new Date(body.endDatetime),
      category: body.category as CalendarCategory,
      entryType: (body.entryType || "event") as CalendarEntryType,
      priority: (body.priority || "medium") as CalendarPriority,
      description: body.description || undefined,
      location: body.location || undefined,
      virtualUrl: body.virtualUrl || undefined,
      allDay: body.allDay || false,
      tagsJson: body.tags || undefined,
      rrule: body.rrule || undefined,
      isVip: body.isVip ?? undefined,
      // linkedEventId / linkedOrgId dropped — Event + Organization models not in Olivia Brain schema
      ecosystemOrgName: body.ecosystemOrgName || undefined,
      investmentStage: body.investmentStage || undefined,
      rescheduledFromId: body.rescheduledFromId || undefined,
      rescheduledFromDate: body.rescheduledFromDate ? new Date(body.rescheduledFromDate) : undefined,
    });

    // Save attendees if provided
    if (Array.isArray(body.attendees) && body.attendees.length > 0) {
      await bulkSetAttendees(entry.id, userId, body.attendees);
    }

    // Auto-attach documents deferred — Document model not in Olivia Brain.

    // Log interaction
    await logCalendarInteraction({
      userId,
      calendarEntryId: entry.id,
      interactionType: "created",
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    console.error("Calendar entry create error:", err);
    return NextResponse.json(
      { error: "Failed to create calendar entry" },
      { status: 500 }
    );
  }
}

// PUT — Update a calendar entry
export async function PUT(req: NextRequest) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000, prefix: "cal-entries" });
  if (limited) return limited;

  const userId = await getUserProfileId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const entryId = searchParams.get("id");
  if (!entryId) {
    return NextResponse.json({ error: "id param required" }, { status: 400 });
  }

  try {
    const body = await req.json();

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.location !== undefined) updateData.location = body.location;
    if (body.virtualUrl !== undefined) updateData.virtualUrl = body.virtualUrl;
    if (body.startDatetime !== undefined) updateData.startDatetime = new Date(body.startDatetime);
    if (body.endDatetime !== undefined) updateData.endDatetime = new Date(body.endDatetime);
    if (body.allDay !== undefined) updateData.allDay = body.allDay;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.entryType !== undefined) updateData.entryType = body.entryType;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.tags !== undefined) updateData.tagsJson = body.tags;
    if (body.rrule !== undefined) updateData.rrule = body.rrule;
    if (body.isVip !== undefined) updateData.isVip = body.isVip;
    if (body.attendanceStatus !== undefined) updateData.attendanceStatus = body.attendanceStatus;
    if (body.attendanceNote !== undefined) updateData.attendanceNote = body.attendanceNote;
    if (body.rescheduledFromId !== undefined) updateData.rescheduledFromId = body.rescheduledFromId;
    if (body.rescheduledFromDate !== undefined) updateData.rescheduledFromDate = body.rescheduledFromDate ? new Date(body.rescheduledFromDate) : null;

    const entry = await updateCalendarEntry(entryId, userId, updateData);

    if (!entry) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Update attendees if provided
    if (Array.isArray(body.attendees)) {
      await bulkSetAttendees(entryId, userId, body.attendees);
    }

    await logCalendarInteraction({
      userId,
      calendarEntryId: entry.id,
      interactionType: body.attendanceStatus !== undefined ? "attendance_changed" : "updated",
      ...(body.attendanceStatus !== undefined && {
        metadataJson: { attendanceStatus: body.attendanceStatus, attendanceNote: body.attendanceNote || null },
      }),
    });

    return NextResponse.json(entry);
  } catch (err) {
    console.error("Calendar entry update error:", err);
    const message = err instanceof Error ? err.message : "Failed to update calendar entry";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// DELETE — Archive a calendar entry
export async function DELETE(req: NextRequest) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000, prefix: "cal-entries" });
  if (limited) return limited;

  const userId = await getUserProfileId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const entryId = searchParams.get("id");
  if (!entryId) {
    return NextResponse.json({ error: "id param required" }, { status: 400 });
  }

  const success = await archiveCalendarEntry(entryId, userId);
  if (!success) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await logCalendarInteraction({
    userId,
    calendarEntryId: entryId,
    interactionType: "deleted",
  });

  return NextResponse.json({ success: true });
}
