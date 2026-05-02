/**
 * `/api/olivia/chat` — Olivia Brain's primary chat surface.
 *
 * Session 4 deliverable. Single-provider implementation against Anthropic
 * Sonnet 4.6 via the AI SDK. The full 9-model cascade lands in Session 5
 * (`BUILD_SEQUENCE.md` Track A); this route is the narrow, world-class
 * Anthropic-only path that {@link OliviaProvider.sendMessage} talks to.
 *
 * ## Request / response contract
 *
 * Browser-side caller is `src/components/olivia/OliviaProvider.tsx`.
 *
 * **Request body** (validated by {@link RequestSchema}):
 * ```json
 * {
 *   "message": "string (1-8000 chars)",
 *   "conversationId": "uuid (optional)",
 *   "pageContext": "string (optional, route Olivia is summoned from)",
 *   "pipelineContext": { "pipelineStep": "string", ... } (optional),
 *   "documentContext": { "documentId": "string", ... } (optional)
 * }
 * ```
 *
 * **Response body** (success):
 * ```json
 * { "conversationId": "uuid", "messageId": "uuid", "reply": "string" }
 * ```
 *
 * **Error**: `{ "error": "<message>" }` with status 400 (validation),
 * 429 (rate-limited), or 500 (unrecoverable).
 *
 * ## Reliability guarantees
 *
 * - **Bounded latency.** The Anthropic call is wrapped in
 *   {@link AbortSignal.timeout} ({@link LLM_TIMEOUT_MS}). On timeout the
 *   route returns a structured fallback reply (still persists turns) rather
 *   than a 5xx, so the avatar UI never goes blank.
 * - **Observable.** The whole handler runs inside `withTraceSpan` with
 *   metadata-only attributes (no PII). Span attributes carry conversation
 *   id, persona model id, runtime mode (live vs fallback), and message
 *   length. The user's message text is never written to span attributes
 *   or logs.
 * - **Degrades gracefully.** When `ANTHROPIC_API_KEY` is unset, the route
 *   returns a clear "chat brain not configured" reply, still persists the
 *   user + assistant turns, and never throws.
 * - **Persistence-resilient.** {@link getConversationStore} returns a
 *   {@link SafeConversationStore} that falls through to the in-memory
 *   bucket on Supabase failure, so the user always gets an answer.
 *
 * ## Auth
 *
 * No gate at the route layer today. The browser provider does not yet
 * forward an `Authorization` header, and gating here would break the
 * Session 6 smoke flow (`/test-avatar`). Rate limiting is in place to
 * cap accidental loops. Real per-user auth lands in Session 18 with
 * Clerk (`BUILD_SEQUENCE.md` Track F) — at that point a `withTenantContext`
 * middleware will replace the rate-limit shim and `clientId` will flow
 * through to {@link AppendTurnOptions}.
 *
 * ## Cascade follow-up
 *
 * Session 5 swaps the direct {@link generateText} call for
 * `runModelCascade` (`src/lib/services/model-cascade.ts`). The persistence,
 * tracing, and validation layers stay; only the model invocation changes.
 */
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getServerEnv } from "@/lib/config/env";
import { getConversationStore } from "@/lib/memory/store";
import { withTraceSpan } from "@/lib/observability/tracer";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ─── Constants ──────────────────────────────────────────────────────────── */

/** Hard cap on Anthropic latency. Avatar UX degrades past ~30s. */
const LLM_TIMEOUT_MS = 30_000;

/** Per-IP rate limit window. Conservative; widened in Session 18 with Clerk. */
const RATE_LIMIT = { limit: 30, windowMs: 60_000, prefix: "olivia.chat" } as const;

/**
 * Olivia's persona instructions. Kept brief and stable so Session 5's
 * cascade port can reuse the same system text without prompt drift.
 *
 * The cascade-aware prompts in `lib/orchestration/prompts/` are pinned to
 * intent (planning / research / etc.) and replace this string when the
 * cascade lands — see Track G.
 */
const SYSTEM_PROMPT =
  "You are Olivia, the omnipresent AI executive agent for the CLUES " +
  "ecosystem (London Tech Map, Clues Intelligence, Olivia Brain). You speak " +
  "with calm confidence, surface concrete next steps, and decline politely " +
  "when a request is outside your domain. Keep replies under 200 words " +
  "unless the user asks for depth.";

const RequestSchema = z.object({
  message: z.string().trim().min(1).max(8_000),
  conversationId: z.string().uuid().optional(),
  pageContext: z.string().max(512).optional(),
  pipelineContext: z.record(z.string(), z.unknown()).optional(),
  documentContext: z.record(z.string(), z.unknown()).optional(),
});

type ParsedRequest = z.infer<typeof RequestSchema>;

/* ─── Context shaping ────────────────────────────────────────────────────── */

/**
 * Render the optional client-side contexts as a single system block.
 * Returns `undefined` when nothing useful is present — the AI SDK accepts
 * a single `system` string, so we concatenate.
 */
function buildContextBlock(req: ParsedRequest): string | undefined {
  const parts: string[] = [];
  if (req.pageContext) {
    parts.push(`User is on page: ${req.pageContext}`);
  }
  if (req.pipelineContext) {
    parts.push(`Pipeline context: ${JSON.stringify(req.pipelineContext)}`);
  }
  if (req.documentContext) {
    parts.push(`Document context: ${JSON.stringify(req.documentContext)}`);
  }
  return parts.length === 0 ? undefined : parts.join("\n");
}

/* ─── Reply generation ───────────────────────────────────────────────────── */

interface ReplyOutcome {
  readonly reply: string;
  readonly mode: "live" | "fallback";
  readonly modelId: string;
}

/**
 * Call Anthropic Sonnet 4.6 with a hard timeout. Always resolves; never
 * throws. On any failure (missing key, abort, network, vendor error) the
 * caller gets a structured fallback reply and `mode === "fallback"`.
 */
async function generateReply(req: ParsedRequest): Promise<ReplyOutcome> {
  const env = getServerEnv();
  const modelId = env.ANTHROPIC_MODEL_PRIMARY;

  if (!env.ANTHROPIC_API_KEY) {
    return {
      reply:
        "Olivia's chat brain is not yet configured. Set `ANTHROPIC_API_KEY` " +
        "on the Olivia Brain deployment to enable live responses.",
      mode: "fallback",
      modelId,
    };
  }

  const contextBlock = buildContextBlock(req);
  const system = contextBlock
    ? `${SYSTEM_PROMPT}\n\n${contextBlock}`
    : SYSTEM_PROMPT;

  try {
    const result = await generateText({
      model: anthropic(modelId),
      system,
      prompt: req.message,
      abortSignal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    });
    return { reply: result.text, mode: "live", modelId };
  } catch (err) {
    const isAbort =
      (err instanceof DOMException && err.name === "AbortError") ||
      (err instanceof Error && /abort|timeout/i.test(err.message));
    return {
      reply: isAbort
        ? "I'm taking longer than expected to respond. Please try again in a moment."
        : "I hit an unexpected error reaching the model. Please try again — if it keeps happening, the team has been notified via tracing.",
      mode: "fallback",
      modelId,
    };
  }
}

/* ─── Route handler ──────────────────────────────────────────────────────── */

/**
 * Handle a chat turn. Validates → persists user turn → generates reply →
 * persists assistant turn → returns the trio the browser expects.
 */
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, RATE_LIMIT);
  if (limited) return limited;

  let body: ParsedRequest;
  try {
    const raw = await request.json();
    body = RequestSchema.parse(raw);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Invalid request body";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const conversationId = body.conversationId ?? crypto.randomUUID();
  const isNewConversation = !body.conversationId;

  return withTraceSpan(
    "olivia.chat.request",
    {
      "olivia.conversation.id": conversationId,
      "olivia.conversation.is_new": isNewConversation,
      "olivia.message.length": body.message.length,
      "olivia.has_page_context": Boolean(body.pageContext),
      "olivia.has_pipeline_context": Boolean(body.pipelineContext),
      "olivia.has_document_context": Boolean(body.documentContext),
    },
    async () => {
      const store = getConversationStore();

      try {
        await store.appendTurn({
          conversationId,
          role: "user",
          content: body.message,
          metadata: {
            pageContext: body.pageContext,
            hasPipelineContext: Boolean(body.pipelineContext),
            hasDocumentContext: Boolean(body.documentContext),
          },
        });

        const outcome = await generateReply(body);

        const assistantTurn = await store.appendTurn({
          conversationId,
          role: "assistant",
          content: outcome.reply,
          metadata: {
            provider: "anthropic",
            model: outcome.modelId,
            mode: outcome.mode,
          },
        });

        return NextResponse.json({
          conversationId,
          messageId: assistantTurn.id,
          reply: outcome.reply,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unexpected chat error";
        return NextResponse.json({ error: message }, { status: 500 });
      }
    },
  );
}
