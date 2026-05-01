/**
 * OLIVIA BRAIN — Content Analysis API
 *
 * POST: Analyze pitch/plan content for investor readiness
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeContent, type OptimizeConfig } from "@/lib/pitch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const requestSchema = z.object({
  content: z.string().min(1),
  context: z.string().min(1), // e.g., "pitch deck slide", "business plan section"
  config: z.object({
    projectName: z.string().min(1),
    persona: z.enum(["Angel", "SeedVC", "SeriesA", "Strategic", "Buyout"]),
    industry: z.string().min(1),
    tone: z.string().min(1),
    stage: z.string().min(1),
  }),
});

export async function POST(request: Request) {
  try {
    const payload = requestSchema.parse(await request.json());
    const { content, context, config } = payload;

    const result = await analyzeContent(content, context, config as OptimizeConfig);

    return NextResponse.json({
      success: true,
      context,
      analysis: result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to analyze content";

    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
