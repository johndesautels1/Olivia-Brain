/**
 * OLIVIA BRAIN — Pitch Intelligence API
 *
 * GET: Returns pitch module stats and available data
 */

import { NextResponse } from "next/server";
import {
  getPitchModuleStats,
  DECKS,
  BIZ_TEMPLATES,
  PERSONAS,
  THEMES,
  DOC_CATEGORIES,
} from "@/lib/pitch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const stats = getPitchModuleStats();

  return NextResponse.json({
    success: true,
    stats,
    data: {
      archetypeCount: DECKS.length,
      templateCount: BIZ_TEMPLATES.length,
      personaCount: PERSONAS.length,
      themeCount: Object.keys(THEMES).length,
      documentCategories: DOC_CATEGORIES.length,
    },
  });
}
