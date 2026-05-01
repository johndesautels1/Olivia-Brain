/**
 * OLIVIA BRAIN — Pitch Coaching Chat API
 *
 * POST: Chat with Olivia for pitch deck and business plan advice
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { askOlivia, type OptimizeConfig } from "@/lib/pitch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const requestSchema = z.object({
  message: z.string().min(1).max(4000),
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
    const { message, config } = payload;

    const response = await askOlivia(message, config as OptimizeConfig);

    return NextResponse.json({
      success: true,
      role: "olivia",
      message: response,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to process chat";

    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
