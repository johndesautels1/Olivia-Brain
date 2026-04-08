import { NextResponse } from "next/server";
import { z } from "zod";

import { invokePhase1Graph } from "@/lib/orchestration/phase1-graph";
import { withTraceSpan } from "@/lib/observability/tracer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().trim().min(1).max(4000),
  forceMock: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const payload = requestSchema.parse(await request.json());

    const response = await withTraceSpan(
      "olivia.chat_request",
      {
        "olivia.hasConversationId": Boolean(payload.conversationId),
      },
      async () =>
        invokePhase1Graph({
          conversationId: payload.conversationId ?? crypto.randomUUID(),
          userMessage: payload.message,
          forceMock: payload.forceMock,
        }),
    );

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error while handling chat.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
