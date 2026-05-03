import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";
import { rateLimit } from "@/lib/rate-limit";
import {
  addAttendeeToEntry,
  updateAttendee,
  removeAttendeeFromEntry,
  getCalendarEntryAttendees,
} from "@/lib/queries/calendar";

// Replaced for Olivia Brain — userId IS the canonical user ID directly
// (Olivia Brain's calendar/voice/olivia models use `userId String @db.Uuid`,
// not a UserProfile FK). Kept the function name for minimal call-site churn.
async function getUserProfileId(): Promise<string | null> {
  const { userId } = await getAuthSession();
  return userId;
}

// GET — Fetch attendees for a calendar entry
export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000, prefix: "cal-attendees" });
  if (limited) return limited;

  const userId = await getUserProfileId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const entryId = searchParams.get("entryId");

  if (!entryId) {
    return NextResponse.json(
      { error: "entryId query param required" },
      { status: 400 }
    );
  }

  const attendees = await getCalendarEntryAttendees(entryId, userId);

  return NextResponse.json({ attendees });
}

// POST — Add an attendee to a calendar entry
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000, prefix: "cal-attendees" });
  if (limited) return limited;

  const userId = await getUserProfileId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    if (!body.calendarEntryId || !body.name) {
      return NextResponse.json(
        { error: "calendarEntryId and name are required" },
        { status: 400 }
      );
    }

    const attendee = await addAttendeeToEntry(
      body.calendarEntryId,
      userId,
      {
        name: body.name,
        email: body.email || undefined,
        role: body.role || undefined,
        rsvpStatus: body.rsvpStatus || undefined,
        // linkedPersonId dropped — Person model not in Olivia Brain schema
        isOrganizer: body.isOrganizer || false,
      }
    );

    if (!attendee) {
      return NextResponse.json(
        { error: "Calendar entry not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json(attendee, { status: 201 });
  } catch (err) {
    console.error("Add attendee error:", err);
    return NextResponse.json(
      { error: "Failed to add attendee" },
      { status: 500 }
    );
  }
}

// PUT — Update an attendee
export async function PUT(req: NextRequest) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000, prefix: "cal-attendees" });
  if (limited) return limited;

  const userId = await getUserProfileId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const attendeeId = searchParams.get("id");
  if (!attendeeId) {
    return NextResponse.json({ error: "id param required" }, { status: 400 });
  }

  try {
    const body = await req.json();

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.role !== undefined) updateData.role = body.role;
    if (body.rsvpStatus !== undefined) updateData.rsvpStatus = body.rsvpStatus;
    // linkedPersonId dropped — Person model not in Olivia Brain schema
    if (body.isOrganizer !== undefined) updateData.isOrganizer = body.isOrganizer;
    if (body.responseNote !== undefined) updateData.responseNote = body.responseNote;

    const attendee = await updateAttendee(attendeeId, userId, updateData);

    if (!attendee) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(attendee);
  } catch (err) {
    console.error("Update attendee error:", err);
    return NextResponse.json(
      { error: "Failed to update attendee" },
      { status: 500 }
    );
  }
}

// DELETE — Remove (soft-archive) an attendee
export async function DELETE(req: NextRequest) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000, prefix: "cal-attendees" });
  if (limited) return limited;

  const userId = await getUserProfileId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const attendeeId = searchParams.get("id");
  if (!attendeeId) {
    return NextResponse.json({ error: "id param required" }, { status: 400 });
  }

  const success = await removeAttendeeFromEntry(attendeeId, userId);
  if (!success) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
