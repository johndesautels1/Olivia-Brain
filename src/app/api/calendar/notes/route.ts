import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";
import { rateLimit } from "@/lib/rate-limit";

// Replaced for Olivia Brain — userId IS the canonical user ID directly
// (Olivia Brain's calendar/voice/olivia models use `userId String @db.Uuid`,
// not a UserProfile FK). Kept the function name for minimal call-site churn.
async function getUserProfileId(): Promise<string | null> {
  const { userId } = await getAuthSession();
  return userId;
}

// GET — List notes (optionally filtered by calendarEntryId)
export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000, prefix: "cal-notes" });
  if (limited) return limited;

  const userId = await getUserProfileId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const entryId = searchParams.get("entryId");

  const where: Record<string, unknown> = { userId, isArchived: false };
  if (entryId) where.calendarEntryId = entryId;

  const notes = await prisma.calendarNote.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      content: true,
      drawingData: true,
      calendarEntryId: true,
      createdAt: true,
      updatedAt: true,
      calendarEntry: {
        select: { id: true, title: true, startDatetime: true },
      },
    },
  });

  return NextResponse.json({
    notes: notes.map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
      calendarEntry: n.calendarEntry
        ? {
            ...n.calendarEntry,
            startDatetime: n.calendarEntry.startDatetime.toISOString(),
          }
        : null,
    })),
  });
}

// POST — Create a new note
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000, prefix: "cal-notes" });
  if (limited) return limited;

  const userId = await getUserProfileId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    const note = await prisma.calendarNote.create({
      data: {
        userId,
        title: body.title || "Untitled Note",
        content: body.content || null,
        drawingData: body.drawingData || null,
        calendarEntryId: body.calendarEntryId || null,
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (err) {
    console.error("Calendar note create error:", err);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}

// PUT — Update a note
export async function PUT(req: NextRequest) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000, prefix: "cal-notes" });
  if (limited) return limited;

  const userId = await getUserProfileId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const noteId = searchParams.get("id");
  if (!noteId) {
    return NextResponse.json({ error: "id param required" }, { status: 400 });
  }

  try {
    const body = await req.json();

    // Verify ownership
    const existing = await prisma.calendarNote.findFirst({
      where: { id: noteId, userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.content !== undefined) updateData.content = body.content;
    if (body.drawingData !== undefined) updateData.drawingData = body.drawingData;
    if (body.calendarEntryId !== undefined) updateData.calendarEntryId = body.calendarEntryId || null;

    const note = await prisma.calendarNote.update({
      where: { id: noteId },
      data: updateData,
    });

    return NextResponse.json(note);
  } catch (err) {
    console.error("Calendar note update error:", err);
    return NextResponse.json({ error: "Failed to update note" }, { status: 500 });
  }
}

// DELETE — Archive a note
export async function DELETE(req: NextRequest) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000, prefix: "cal-notes" });
  if (limited) return limited;

  const userId = await getUserProfileId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const noteId = searchParams.get("id");
  if (!noteId) {
    return NextResponse.json({ error: "id param required" }, { status: 400 });
  }

  const existing = await prisma.calendarNote.findFirst({
    where: { id: noteId, userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.calendarNote.update({
    where: { id: noteId },
    data: { isArchived: true },
  });

  return NextResponse.json({ success: true });
}
