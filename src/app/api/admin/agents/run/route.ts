/**
 * POST /api/admin/agents/run
 *
 * Execute a single agent manually
 */

import { NextResponse } from "next/server";
import { executeAgent } from "@/lib/agents";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { agentId, input } = body;

    if (!agentId) {
      return NextResponse.json(
        { error: "agentId is required" },
        { status: 400 }
      );
    }

    const result = await executeAgent({
      agentId,
      triggeredBy: "manual",
      input: input ?? {},
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Agent run error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
