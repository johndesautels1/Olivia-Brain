import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";
import { rateLimit } from "@/lib/rate-limit";
import {
  searchCalendarMemory,
  embedPendingEntries,
  embedCalendarEntry,
} from "@/lib/calendar/calendar-memory";

// Replaced for Olivia Brain — userId IS the canonical user ID directly
// (Olivia Brain's calendar/voice/olivia models use `userId String @db.Uuid`,
// not a UserProfile FK). Kept the function name for minimal call-site churn.
async function getUserProfileId(): Promise<string | null> {
  const { userId } = await getAuthSession();
  return userId;
}

/**
 * GET /api/calendar/memory?q=...&threshold=0.65&limit=8
 *
 * Semantic search across calendar memory embeddings.
 * Returns calendar entries ranked by cosine similarity to the query.
 */
export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 15, windowMs: 60_000, prefix: "cal-memory" });
  if (limited) return limited;

  const userId = await getUserProfileId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: "q query param required (min 2 chars)" },
      { status: 400 }
    );
  }

  const threshold = parseFloat(searchParams.get("threshold") || "0.65");
  const limit = parseInt(searchParams.get("limit") || "8", 10);

  try {
    const results = await searchCalendarMemory(userId, query, {
      matchThreshold: isNaN(threshold) ? 0.65 : threshold,
      matchCount: isNaN(limit) ? 8 : Math.min(limit, 20),
    });

    return NextResponse.json({ results });
  } catch (err) {
    console.error("Calendar memory search error:", err);
    return NextResponse.json(
      { error: "Failed to search calendar memory" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendar/memory
 *
 * Body: { action: "embed_entry", entryId: string }
 *    or { action: "embed_pending", batchSize?: number }
 *
 * embed_entry: Generate embedding for a specific calendar entry.
 * embed_pending: Batch-embed entries that don't have embeddings yet.
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 10, windowMs: 60_000, prefix: "cal-memory-mut" });
  if (limited) return limited;

  const userId = await getUserProfileId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const action = body.action as string;

    if (action === "embed_entry") {
      const entryId = body.entryId as string;
      if (!entryId) {
        return NextResponse.json(
          { error: "entryId required" },
          { status: 400 }
        );
      }

      const success = await embedCalendarEntry(entryId, userId);
      return NextResponse.json({ success });
    }

    if (action === "embed_pending") {
      const batchSize = Math.min(body.batchSize || 10, 25);
      const result = await embedPendingEntries(userId, batchSize);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "action must be 'embed_entry' or 'embed_pending'" },
      { status: 400 }
    );
  } catch (err) {
    console.error("Calendar memory action error:", err);
    return NextResponse.json(
      { error: "Failed to process calendar memory action" },
      { status: 500 }
    );
  }
}
