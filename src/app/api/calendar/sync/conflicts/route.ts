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

// GET — Fetch pending sync conflicts
export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 20, windowMs: 60_000, prefix: "cal-conflicts" });
  if (limited) return limited;

  const userId = await getUserProfileId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conflicts = await prisma.calendarSyncConflict.findMany({
    where: {
      resolution: "pending",
      syncAccount: { userId },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    conflicts: conflicts.map((c) => ({
      ...c,
      resolvedAt: c.resolvedAt?.toISOString() || null,
      createdAt: c.createdAt.toISOString(),
    })),
  });
}

// POST — Resolve a conflict
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 20, windowMs: 60_000, prefix: "cal-conflicts" });
  if (limited) return limited;

  const userId = await getUserProfileId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { conflictId, resolution } = body;

    if (!conflictId || !resolution) {
      return NextResponse.json(
        { error: "conflictId and resolution required" },
        { status: 400 }
      );
    }

    // Verify ownership through sync account
    const conflict = await prisma.calendarSyncConflict.findFirst({
      where: {
        id: conflictId,
        syncAccount: { userId },
      },
      include: { syncAccount: { select: { provider: true } } },
    });

    if (!conflict) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Apply resolution
    if (resolution === "remote_wins" && conflict.localEntryId && conflict.remoteDataJson) {
      const remote = conflict.remoteDataJson as Record<string, string>;
      await prisma.calendarEntry.update({
        where: { id: conflict.localEntryId },
        data: {
          title: remote.title || undefined,
          startDatetime: remote.startDatetime
            ? new Date(remote.startDatetime)
            : undefined,
        },
      });
    }

    // Mark conflict as resolved
    await prisma.calendarSyncConflict.update({
      where: { id: conflictId },
      data: {
        resolution: resolution as "local_wins" | "remote_wins" | "merged" | "dismissed",
        resolvedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Conflict resolution error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
