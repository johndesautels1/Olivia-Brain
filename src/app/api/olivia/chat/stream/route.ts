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
import { getConversationStore } from "@/lib/memory/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const RECALL_LIMIT = 4;

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
  const store = getConversationStore();

  /* Recall + persist user turn BEFORE streaming starts so the cascade
   * sees prior context AND we have a record even if the client
   * disconnects mid-stream. Both calls are best-effort — a persistence
   * failure should not block the user from getting a reply. */
  let recalledContext: string[] = [];
  try {
    recalledContext = await store.recall(
      conversationId,
      payload.message,
      RECALL_LIMIT,
    );
  } catch {
    /* Ignore — stream still works without recall. */
  }
  try {
    await store.appendTurn({
      conversationId,
      role: "user",
      content: payload.message,
      metadata: {
        intent,
        spoke,
        pageContext: payload.pageContext,
      },
    });
  } catch {
    /* Ignore. */
  }

  const stream = await runModelCascadeStream({
    conversationId,
    message: payload.message,
    intent,
    spoke,
    recalledContext,
    integrationSnapshot: {},
  });

  const spokeLabel = getSpokeDescriptor(spoke).label;

  /* Mock — return full text in one chunk + persist the assistant
   * turn so multi-turn UI works even without provider keys. */
  if (isMock(stream)) {
    return streamingResponse(
      async function* () {
        yield stream.text;
        try {
          await store.appendTurn({
            conversationId,
            role: "assistant",
            content: stream.text,
            metadata: {
              intent,
              spoke,
              runtimeMode: "mock",
              provider: "mock",
              model: "phase1-local-fallback",
            },
          });
        } catch {
          /* Persistence failure shouldn't break the stream. */
        }
      },
      {
        provider: "mock",
        model: "phase1-local-fallback",
        spoke,
        spokeLabel,
        conversationId,
      },
    );
  }

  /* Live — pipe through. Capture the final text via the source
   * generator so we can persist the assistant turn after the stream
   * settles, BEFORE the duration marker. */
  return streamingResponse(
    async function* () {
      let finalText = "";
      try {
        for await (const chunk of stream.textStream) {
          finalText += chunk;
          yield chunk;
        }
        await stream.done;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "stream failed";
        yield `\n\n[stream error: ${msg}]`;
      }
      /* Best-effort persistence after the stream settles. */
      try {
        await store.appendTurn({
          conversationId,
          role: "assistant",
          content: finalText,
          metadata: {
            intent,
            spoke,
            runtimeMode: "live",
            provider: stream.providerId,
            model: stream.modelId,
          },
        });
      } catch {
        /* Ignore. */
      }
    },
    {
      provider: stream.providerId,
      model: stream.modelId,
      spoke,
      spokeLabel,
      conversationId,
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
    conversationId: string;
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
      "X-Olivia-Conversation-Id": provenance.conversationId,
    },
  });
}

function cryptoRandomId(): string {
  /* Cheap unique-enough id for the cascade trace span. The
   * non-streaming /api/olivia/chat persists conversations; this
   * endpoint is fire-and-forget for now. */
  return `stream-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
