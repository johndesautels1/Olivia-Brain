/**
 * OLIVIA BRAIN — Business Plan Templates API
 *
 * GET: Get all 12 templates with optional scoring
 */

import { NextResponse } from "next/server";
import { BIZ_TEMPLATES, scoreTemplates, type DeckCategory } from "@/lib/pitch";

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
  const london = searchParams.get("london") === "true";
  const ai = searchParams.get("ai") === "true" || industry === "AI";
  const limit = parseInt(searchParams.get("limit") || "6", 10);

  const category = CATEGORY_MAP[industry] || "classic";

  const scored = scoreTemplates(stage, category, { london, ai });
  const topTemplates = scored.slice(0, Math.min(limit, 12));

  return NextResponse.json({
    success: true,
    count: topTemplates.length,
    totalAvailable: BIZ_TEMPLATES.length,
    filters: { stage, industry, london, ai },
    templates: topTemplates,
  });
}
