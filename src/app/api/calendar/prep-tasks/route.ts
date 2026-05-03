import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";
import { rateLimit } from "@/lib/rate-limit";
import { generatePrepPlan } from "@/lib/calendar/olivia-engine";
import { logCalendarInteraction } from "@/lib/queries/calendar";

// Replaced for Olivia Brain — userId IS the canonical user ID directly
// (Olivia Brain's calendar/voice/olivia models use `userId String @db.Uuid`,
// not a UserProfile FK). Kept the function name for minimal call-site churn.
async function getUserProfileId(): Promise<string | null> {
  const { userId } = await getAuthSession();
  return userId;
}

// GET — Fetch prep tasks for a calendar entry
export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 15, windowMs: 60_000, prefix: "cal-prep" });
  if (limited) return limited;

  const userId = await getUserProfileId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const entryId = searchParams.get("entryId");

  if (!entryId) {
    return NextResponse.json(
      { error: "entryId param required" },
      { status: 400 }
    );
  }

  // Verify ownership
  const entry = await prisma.calendarEntry.findFirst({
    where: { id: entryId, userId },
    select: { id: true },
  });
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const tasks = await prisma.calendarPrepTask.findMany({
    where: { calendarEntryId: entryId, isArchived: false },
    orderBy: [{ priority: "asc" }, { dueAt: "asc" }],
  });

  return NextResponse.json({
    tasks: tasks.map((t) => ({
      ...t,
      dueAt: t.dueAt?.toISOString() || null,
      completedAt: t.completedAt?.toISOString() || null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
  });
}

// POST — Generate prep tasks via Olivia or create manually
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 15, windowMs: 60_000, prefix: "cal-prep" });
  if (limited) return limited;

  const userId = await getUserProfileId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // ── AI Generate ──
    if (body.action === "generate" && body.calendarEntryId) {
      // Fetch the calendar entry
      const entry = await prisma.calendarEntry.findFirst({
        where: { id: body.calendarEntryId, userId, isArchived: false },
        select: {
          id: true,
          title: true,
          category: true,
          description: true,
          startDatetime: true,
          ecosystemOrgName: true,
          investmentStage: true,
          // linkedOrg dropped — Organization model not in Olivia Brain schema
        },
      });

      if (!entry) {
        return NextResponse.json({ error: "Entry not found" }, { status: 404 });
      }

      const prepPlan = await generatePrepPlan({
        title: entry.title,
        category: entry.category,
        description: entry.description || "",
        datetime: entry.startDatetime.toISOString(),
        organizerName: entry.ecosystemOrgName || undefined,
        investmentStage: entry.investmentStage || undefined,
      });

      if (!prepPlan) {
        return NextResponse.json({
          tasks: [],
          message: "Prep tasks are not enabled for this event category.",
        });
      }

      // Create prep tasks in DB
      const created = await Promise.all(
        prepPlan.prep_tasks.map((task) => {
          // Calculate actual due date from offset
          let dueAt: Date | undefined;
          if (task.due_date_offset_hours) {
            dueAt = new Date(
              entry.startDatetime.getTime() +
                task.due_date_offset_hours * 60 * 60 * 1000
            );
          }

          return prisma.calendarPrepTask.create({
            data: {
              calendarEntryId: entry.id,
              title: task.title,
              description: task.description,
              priority: (task.priority as "critical" | "high" | "medium" | "low") || "medium",
              dueAt,
              dueOffsetHours: task.due_date_offset_hours,
              linkedDocumentType: task.linked_document_type,
              autoGenerate: task.auto_generate,
            },
          });
        })
      );

      return NextResponse.json({
        tasks: created.map((t) => ({
          ...t,
          dueAt: t.dueAt?.toISOString() || null,
          completedAt: t.completedAt?.toISOString() || null,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
        })),
        agenda: prepPlan.agenda,
        talkingPoints: prepPlan.key_talking_points,
        questions: prepPlan.questions_to_prepare,
        briefing: prepPlan.olivia_briefing,
      });
    }

    // ── Manual Create ──
    if (body.calendarEntryId && body.title) {
      const entry = await prisma.calendarEntry.findFirst({
        where: { id: body.calendarEntryId, userId },
        select: { id: true },
      });
      if (!entry) {
        return NextResponse.json({ error: "Entry not found" }, { status: 404 });
      }

      const task = await prisma.calendarPrepTask.create({
        data: {
          calendarEntryId: body.calendarEntryId,
          title: body.title,
          description: body.description || null,
          priority: body.priority || "medium",
          dueAt: body.dueAt ? new Date(body.dueAt) : null,
        },
      });

      return NextResponse.json({
        task: {
          ...task,
          dueAt: task.dueAt?.toISOString() || null,
          completedAt: task.completedAt?.toISOString() || null,
          createdAt: task.createdAt.toISOString(),
          updatedAt: task.updatedAt.toISOString(),
        },
      });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (err) {
    console.error("Prep task error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT — Update prep task status
export async function PUT(req: NextRequest) {
  const limited = rateLimit(req, { limit: 15, windowMs: 60_000, prefix: "cal-prep" });
  if (limited) return limited;

  const userId = await getUserProfileId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { taskId, status } = body;

    if (!taskId || !status) {
      return NextResponse.json(
        { error: "taskId and status required" },
        { status: 400 }
      );
    }

    // Verify ownership through calendar entry
    const task = await prisma.calendarPrepTask.findFirst({
      where: { id: taskId, calendarEntry: { userId } },
      select: { id: true, calendarEntryId: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.calendarPrepTask.update({
      where: { id: taskId },
      data: {
        status,
        completedAt: status === "completed" ? new Date() : null,
      },
    });

    // Log interaction
    await logCalendarInteraction({
      userId,
      calendarEntryId: task.calendarEntryId,
      interactionType:
        status === "completed" ? "completed_prep_task" : "skipped_prep_task",
    });

    return NextResponse.json({
      task: {
        ...updated,
        dueAt: updated.dueAt?.toISOString() || null,
        completedAt: updated.completedAt?.toISOString() || null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("Prep task update error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
