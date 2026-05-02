/**
 * OLIVIA BRAIN — Pitch Slide Optimization API
 *
 * POST: Optimize a single slide or batch of slides
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { optimizeSlide, type OptimizeConfig, type SlideOptimizeInput } from "@/lib/pitch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const slideSchema = z.object({
  id: z.string(),
  type: z.string(),
  text: z.string().optional().default(""),
  fields: z.record(z.string(), z.string()).optional().default({}),
});

const requestSchema = z.object({
  slides: z.array(slideSchema).min(1).max(20),
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
    const { slides, config } = payload;

    const results = await Promise.all(
      slides.map(async (slide) => {
        try {
          const result = await optimizeSlide(
            slide as SlideOptimizeInput,
            config as OptimizeConfig
          );
          return {
            slideId: slide.id,
            success: true,
            result,
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return {
            slideId: slide.id,
            success: false,
            error: message,
          };
        }
      })
    );

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: true,
      optimized: successCount,
      total: slides.length,
      results,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to optimize slides";

    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
