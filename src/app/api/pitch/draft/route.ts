/**
 * OLIVIA BRAIN — Business Plan Section Drafting API
 *
 * POST: Draft a business plan section with LLM + web search
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { draftPlanSection, type OptimizeConfig } from "@/lib/pitch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const requestSchema = z.object({
  sectionTitle: z.string().min(1),
  existingContent: z.string().optional().default(""),
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
    const { sectionTitle, existingContent, config } = payload;

    const result = await draftPlanSection(
      sectionTitle,
      existingContent,
      config as OptimizeConfig
    );

    return NextResponse.json({
      success: true,
      sectionTitle,
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to draft section";

    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
