/**
 * OLIVIA BRAIN — Pitch Deck Archetypes API
 *
 * GET: Get all 75 archetypes with optional scoring
 */

import { NextResponse } from "next/server";
import { DECKS, scoreDecks, type DeckCategory } from "@/lib/pitch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORY_MAP: Record<string, DeckCategory> = {
  AI: "ai_modern",
  SaaS: "saas",
  Fintech: "fintech",
  Proptech: "classic",
  Healthtech: "industry_template",
  Edtech: "industry_template",
  Consumer: "consumer",
  London: "london_uk",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const stage = searchParams.get("stage") || "Seed";
  const industry = searchParams.get("industry") || "AI";
  const traction = parseInt(searchParams.get("traction") || "0", 10);
  const london = searchParams.get("london") === "true";
  const ai = searchParams.get("ai") === "true" || industry === "AI";
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  const category = CATEGORY_MAP[industry] || "classic";

  const scored = scoreDecks(stage, category, traction, { london, ai });
  const topDecks = scored.slice(0, Math.min(limit, 75));

  return NextResponse.json({
    success: true,
    count: topDecks.length,
    totalAvailable: DECKS.length,
    filters: { stage, industry, traction, london, ai },
    archetypes: topDecks,
  });
}
