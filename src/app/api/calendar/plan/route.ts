import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";
import { rateLimit } from "@/lib/rate-limit";
import { generateDailyBriefForUser } from "@/lib/calendar/daily-brief";

// Replaced for Olivia Brain — userId IS the canonical user ID directly
// (Olivia Brain's calendar/voice/olivia models use `userId String @db.Uuid`,
// not a UserProfile FK). Kept the function name for minimal call-site churn.
async function getUserProfileId(): Promise<string | null> {
  const { userId } = await getAuthSession();
  return userId;
}

/**
 * GET /api/calendar/plan — Generate a daily planning brief for the authenticated user.
 * Returns Olivia's structured daily brief with schedule overview, priorities,
 * suggested focus blocks, and heads-up items.
 */
export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 5, windowMs: 60_000, prefix: "cal-plan" });
  if (limited) return limited;

  const userId = await getUserProfileId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const brief = await generateDailyBriefForUser(userId);
    return NextResponse.json(brief);
  } catch (err) {
    console.error("[Calendar Plan] Error generating daily brief:", err);
    return NextResponse.json(
      { error: "Failed to generate daily brief" },
      { status: 500 }
    );
  }
}
