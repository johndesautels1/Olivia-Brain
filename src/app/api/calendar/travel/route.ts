import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";
import { rateLimit } from "@/lib/rate-limit";
import {
  estimateTravelTime,
  insertTravelBuffers,
  clearTravelBuffers,
} from "@/lib/calendar/travel-buffer";

// Replaced for Olivia Brain — userId IS the canonical user ID directly
// (Olivia Brain's calendar/voice/olivia models use `userId String @db.Uuid`,
// not a UserProfile FK). Kept the function name for minimal call-site churn.
async function getUserProfileId(): Promise<string | null> {
  const { userId } = await getAuthSession();
  return userId;
}

/**
 * GET /api/calendar/travel?origin=...&destination=...
 *
 * Estimate travel time between two London locations.
 */
export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 20, windowMs: 60_000, prefix: "cal-travel" });
  if (limited) return limited;

  const userId = await getUserProfileId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const origin = searchParams.get("origin");
  const destination = searchParams.get("destination");

  if (!origin || !destination) {
    return NextResponse.json(
      { error: "origin and destination query params required" },
      { status: 400 }
    );
  }

  try {
    const estimate = await estimateTravelTime(origin, destination);
    return NextResponse.json({ estimate });
  } catch (err) {
    console.error("Travel estimate error:", err);
    return NextResponse.json(
      { error: "Failed to estimate travel time" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendar/travel
 *
 * Body: { action: "insert" | "clear", date?: string }
 *
 * insert: Calculate and insert travel buffers for the specified day (default today).
 * clear: Remove all auto-generated travel buffers for the specified day.
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 10, windowMs: 60_000, prefix: "cal-travel-mut" });
  if (limited) return limited;

  const userId = await getUserProfileId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const action = body.action as string;
    const targetDate = body.date ? new Date(body.date) : undefined;

    if (action === "insert") {
      const result = await insertTravelBuffers(userId, targetDate);
      return NextResponse.json(result);
    }

    if (action === "clear") {
      const cleared = await clearTravelBuffers(userId, targetDate);
      return NextResponse.json({ cleared });
    }

    return NextResponse.json(
      { error: "action must be 'insert' or 'clear'" },
      { status: 400 }
    );
  } catch (err) {
    console.error("Travel buffer action error:", err);
    return NextResponse.json(
      { error: "Failed to process travel buffer action" },
      { status: 500 }
    );
  }
}
