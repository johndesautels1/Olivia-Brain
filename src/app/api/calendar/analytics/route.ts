import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";
import { rateLimit } from "@/lib/rate-limit";
import {
  getInteractionStats,
  detectBehaviorPatterns,
  computeFounderWeek,
  generateWeekSummary,
} from "@/lib/calendar/behavior-engine";

// Replaced for Olivia Brain — userId IS the canonical user ID directly
// (Olivia Brain's calendar/voice/olivia models use `userId String @db.Uuid`,
// not a UserProfile FK). Kept the function name for minimal call-site churn.
async function getUserProfileId(): Promise<string | null> {
  const { userId } = await getAuthSession();
  return userId;
}

// GET — Fetch analytics: stats, patterns, weekly digest
export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 20, windowMs: 60_000, prefix: "cal-analytics" });
  if (limited) return limited;

  const userId = await getUserProfileId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  // ── Interaction stats ──
  if (action === "stats") {
    const daysBack = parseInt(searchParams.get("days") || "60");
    const stats = await getInteractionStats(userId, daysBack);
    return NextResponse.json(stats);
  }

  // ── Behavior patterns ──
  if (action === "patterns") {
    const patterns = await detectBehaviorPatterns(userId);
    return NextResponse.json({ patterns });
  }

  // ── Weekly digest ──
  if (action === "week") {
    const weekStr = searchParams.get("weekStart");
    const weekStart = weekStr ? new Date(weekStr) : undefined;
    const digest = await computeFounderWeek(userId, weekStart);
    return NextResponse.json(digest);
  }

  // ── Week history ──
  if (action === "history") {
    const weeks = await prisma.founderWeek.findMany({
      where: { userId },
      orderBy: { weekStartDate: "desc" },
      take: 12,
    });

    return NextResponse.json({
      weeks: weeks.map((w) => ({
        ...w,
        weekStartDate: w.weekStartDate.toISOString(),
        focusHours: Number(w.focusHours),
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.updatedAt.toISOString(),
      })),
    });
  }

  // ── Olivia confidence ──
  if (action === "confidence") {
    const prefs = await prisma.calendarPreferences.findUnique({
      where: { userId },
      select: { oliviaConfidenceScore: true },
    });
    return NextResponse.json({
      confidence: prefs?.oliviaConfidenceScore
        ? Number(prefs.oliviaConfidenceScore)
        : 0.5,
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// POST — Generate week summary or trigger pattern analysis
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 20, windowMs: 60_000, prefix: "cal-analytics" });
  if (limited) return limited;

  const userId = await getUserProfileId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // ── Generate week summary ──
    if (body.action === "generate_summary") {
      const weekStart = body.weekStart ? new Date(body.weekStart) : undefined;
      const summary = await generateWeekSummary(userId, weekStart);
      return NextResponse.json({ summary });
    }

    // ── Compute current week ──
    if (body.action === "compute_week") {
      const weekStart = body.weekStart ? new Date(body.weekStart) : undefined;
      const digest = await computeFounderWeek(userId, weekStart);
      return NextResponse.json(digest);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Analytics error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
