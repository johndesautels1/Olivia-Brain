/**
 * GET/PATCH /api/admin/toggles
 *
 * Get all feature toggles or update a toggle
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const toggles = await prisma.feature_toggles.findMany();
    return NextResponse.json(toggles);
  } catch (error) {
    console.error("Toggles fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { key, enabled } = body;

    if (!key || typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "key and enabled (boolean) are required" },
        { status: 400 }
      );
    }

    const toggle = await prisma.feature_toggles.upsert({
      where: { key },
      update: { enabled, updated_at: new Date() },
      create: { key, enabled },
    });

    return NextResponse.json(toggle);
  } catch (error) {
    console.error("Toggle update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
