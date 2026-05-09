/**
 * `POST /api/olivia/chat/stream` — token-streaming chat endpoint
 * (Track O Session O3 — perceived latency).
 *
 * Mirrors `/api/olivia/chat`'s contract but pipes tokens as they
 * arrive from the primary configured provider. Mock-mode returns the
 * full deterministic reply in one chunk so the client sees identical
 * behavior whether keys are configured or not.
 *
 * Response is `text/plain; charset=utf-8` chunked. The client reads
 * `response.body` as a ReadableStream and updates UI per chunk.
 *
 * Trade-off vs `/api/olivia/chat` (the non-streaming endpoint): this
 * route does NOT do per-provider fallback mid-stream — if the first
 * provider fails partway, partial tokens are still delivered. Callers
 * that need strict fallback retry to the non-streaming endpoint after
 * a stream-side error.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import {
  runModelCascadeStream,
  type CascadeStreamMockResult,
  type CascadeStreamResult,
} from "@/lib/services/model-cascade";
import { inferIntent } from "@/lib/orchestration/intent";
import {
  detectSpokeFromMessage,
  getSpokeDescriptor,
} from "@/lib/orchestration/spoke-router";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

/* Mirror /api/olivia/chat's rate limit (30/min/IP) so a streaming
 * client can't bypass it by switching endpoints. */
const RATE_LIMIT = { limit: 30, windowMs: 60_000, prefix: "olivia.chat.stream" } as const;

const RequestSchema = z.object({
  message: z.string().min(1).max(8000),
  conversationId: z.string().optional(),
  pageContext: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, RATE_LIMIT);
  if (limited) return limited;

  let payload: z.infer<typeof RequestSchema>;
  try {
    payload = RequestSchema.parse(await request.json());
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "invalid request",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const intent = inferIntent(payload.message);
  const spoke = detectSpokeFromMessage(payload.message);
  const conversationId = payload.conversationId ?? cryptoRandomId();

  const stream = await runModelCascadeStream({
    conversationId,
    message: payload.message,
    intent,
    spoke,
    recalledContext: [],
    integrationSnapshot: {},
  });

  const spokeLabel = getSpokeDescriptor(spoke).label;

  /* Mock — return full text in one chunk so the client's incremental
   * UI still works without real provider keys. */
  if (isMock(stream)) {
    return streamingResponse(
      async function* () {
        yield stream.text;
      },
      {
        provider: "mock",
        model: "phase1-local-fallback",
        spoke,
        spokeLabel,
      },
    );
  }

  /* Live — pipe through. */
  return streamingResponse(
    async function* () {
      try {
        for await (const chunk of stream.textStream) {
          yield chunk;
        }
        await stream.done;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "stream failed";
        yield `\n\n[stream error: ${msg}]`;
      }
    },
    {
      provider: stream.providerId,
      model: stream.modelId,
      spoke,
      spokeLabel,
    },
  );
}

function isMock(
  result: CascadeStreamResult | CascadeStreamMockResult,
): result is CascadeStreamMockResult {
  return "kind" in result && result.kind === "mock";
}

function streamingResponse(
  source: () => AsyncGenerator<string, void, unknown>,
  provenance: {
    provider: string;
    model: string;
    spoke: string;
    spokeLabel: string;
  },
): Response {
  const encoder = new TextEncoder();
  const startedAt = Date.now();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of source()) {
          controller.enqueue(encoder.encode(chunk));
        }
        /* Trailers aren't well-supported in Vercel's streaming path
         * yet, so duration ships in the body's final no-op marker
         * (the client strips it). Provider + model + spoke went in
         * headers. */
        const durationMs = Date.now() - startedAt;
        controller.enqueue(
          encoder.encode(`\n<!--olivia:duration=${durationMs}-->`),
        );
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "X-Accel-Buffering": "no",
      "X-Olivia-Provider": provenance.provider,
      "X-Olivia-Model": provenance.model,
      "X-Olivia-Spoke": provenance.spoke,
      "X-Olivia-Spoke-Label": provenance.spokeLabel,
    },
  });
}

function cryptoRandomId(): string {
  /* Cheap unique-enough id for the cascade trace span. The
   * non-streaming /api/olivia/chat persists conversations; this
   * endpoint is fire-and-forget for now. */
  return `stream-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
