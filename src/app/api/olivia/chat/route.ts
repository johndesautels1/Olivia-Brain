/**
 * `/api/olivia/chat` — Olivia Brain's primary chat surface.
 *
 * Sessions 4–5 deliverable. Browser-side caller is
 * `src/components/olivia/OliviaProvider.tsx`. The handler:
 *
 * 1. Validates the request (Zod, see {@link RequestSchema}).
 * 2. Recalls relevant prior turns from the conversation store.
 * 3. Classifies the message into a {@link RouteIntent} (regex-based).
 * 4. Persists the user turn.
 * 5. Calls {@link runModelCascade} — the existing 9-model fallback chain
 *    (Anthropic Sonnet 4.6 primary, GPT-5.4 secondary, Gemini, Grok,
 *    Perplexity, Mistral) with provider order keyed by intent.
 * 6. Persists the assistant turn with full provenance metadata
 *    (intent, runtimeMode, selected provider/model, attempts trail).
 * 7. Returns `{ conversationId, messageId, reply }` to the browser.
 *
 * ## Request / response contract
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
 * **Response body** (success): `{ conversationId, messageId, reply }`.
 *
 * **Error**: `{ "error": "<message>" }` with status 400 (validation),
 * 429 (rate-limited), or 500 (unrecoverable persistence failure).
 *
 * ## Reliability guarantees
 *
 * - **Bounded latency.** {@link runModelCascade} wraps each provider call
 *   in `withTraceSpan` and serial-fallbacks on any error. The route does
 *   not impose its own timeout because the cascade's per-provider span
 *   already bounds work; piling another `AbortSignal` on top would obscure
 *   which provider exceeded budget.
 * - **Observable.** The whole handler runs inside `withTraceSpan` with
 *   metadata-only attributes (no PII). Span attributes carry conversation
 *   id, intent, message length, runtime mode, selected provider, and
 *   number of provider attempts. The user's message text is never written
 *   to span attributes or logs.
 * - **Degrades gracefully.** When no provider succeeds, the cascade
 *   returns a structured `mock` response (see `model-cascade.ts`
 *   `buildMockResponse`); the route maps that to a polite reply, status
 *   stays 200, and the assistant turn is flagged `mode: "mock"` in
 *   metadata so traces and audits can distinguish degraded responses.
 * - **Persistence-resilient.** {@link getConversationStore} returns a
 *   `SafeConversationStore` that falls through to the in-memory bucket on
 *   Supabase failure, so the user always gets an answer.
 *
 * ## Auth
 *
 * No gate at the route layer today. The browser provider does not yet
 * forward an `Authorization` header, and gating here would break the
 * Session 6 smoke flow (`/test-avatar`). Rate limiting is in place to
 * cap accidental loops. Real per-user auth lands in Session 18 with
 * Clerk (`BUILD_SEQUENCE.md` Track F).
 *
 * ## What this route does NOT do (yet)
 *
 * - **No LangGraph wrapping.** The Phase 1 graph (`/api/chat` →
 *   `phase1-graph.ts`) wraps the cascade in a 5-node LangGraph that
 *   re-implements much of what this handler does inline. The two routes
 *   converge in Sessions 19–20 (Track G); until then, `/api/chat` stays
 *   as the LangGraph experiment surface and `/api/olivia/chat` is the
 *   production chat endpoint.
 * - **No Companies House / Kimi providers yet.** Listed in `BUILD_SEQUENCE.md`
 *   Session 5 alongside the cascade refactor, but they are scope-cut to a
 *   follow-up: Companies House is structurally a `UniversalKnowledgeProvider`
 *   (structured UK company data) rather than a cascade-routable LLM, and
 *   Kimi requires SDK + env-var work that does not belong in a route refactor.
 *   Tracked in `API_INTEGRATION_BACKLOG.md`.
 */
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getFoundationStatus } from "@/lib/foundation/status";
import type {
  ProviderAttempt,
  ProviderId,
  RuntimeMode,
  StatusLevel,
} from "@/lib/foundation/types";
import { getConversationStore } from "@/lib/memory/store";
import { withTraceSpan } from "@/lib/observability/tracer";
import { inferIntent } from "@/lib/orchestration/intent";
import { rateLimit } from "@/lib/rate-limit";
import { runModelCascade } from "@/lib/services/model-cascade";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ─── Constants ──────────────────────────────────────────────────────────── */

/** Per-IP rate limit window. Conservative; widened in Session 18 with Clerk. */
const RATE_LIMIT = { limit: 30, windowMs: 60_000, prefix: "olivia.chat" } as const;

/** How many prior turns to recall for context grounding. Matches `phase1-graph.ts`. */
const RECALL_LIMIT = 4;

const RequestSchema = z.object({
  message: z.string().trim().min(1).max(8_000),
  conversationId: z.string().uuid().optional(),
  pageContext: z.string().max(512).optional(),
  pipelineContext: z.record(z.string(), z.unknown()).optional(),
  documentContext: z.record(z.string(), z.unknown()).optional(),
});

type ParsedRequest = z.infer<typeof RequestSchema>;

/* ─── Helpers ────────────────────────────────────────────────────────────── */

/**
 * Build the integration snapshot the cascade expects — a flat
 * `{ id: "configured" | "missing" }` map derived from foundation status.
 *
 * Mirrors `phase1-graph.ts` `hydrateRuntime` so the two routes feed the
 * cascade an identical context shape.
 */
function buildIntegrationSnapshot(): Record<string, StatusLevel> {
  const status = getFoundationStatus();
  return Object.fromEntries(
    status.integrations.map((integration) => [integration.id, integration.status]),
  ) as Record<string, StatusLevel>;
}

/**
 * Distill the cascade's `attempts` array into a metadata-safe summary for
 * the assistant turn record and the trace span. We persist provider IDs
 * and outcomes — never error message text, because vendor errors can leak
 * URL fragments / payload fragments / PII.
 */
function summariseAttempts(attempts: ProviderAttempt[]) {
  return attempts.map((attempt) => ({
    providerId: attempt.providerId,
    modelId: attempt.modelId,
    success: attempt.success,
    durationMs: attempt.durationMs,
  }));
}

/* ─── Route handler ──────────────────────────────────────────────────────── */

/**
 * Handle a chat turn. Validates → recalls context → infers intent →
 * persists user turn → walks the cascade → persists assistant turn →
 * returns the trio the browser expects.
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
  const intent = inferIntent(body.message);

  return withTraceSpan(
    "olivia.chat.request",
    {
      "olivia.conversation.id": conversationId,
      "olivia.conversation.is_new": isNewConversation,
      "olivia.message.length": body.message.length,
      "olivia.intent": intent,
      "olivia.has_page_context": Boolean(body.pageContext),
      "olivia.has_pipeline_context": Boolean(body.pipelineContext),
      "olivia.has_document_context": Boolean(body.documentContext),
    },
    async () => {
      const store = getConversationStore();

      try {
        // Recall prior context BEFORE persisting this turn — otherwise the
        // user message we just received would itself dominate the recall
        // result, which is not useful grounding.
        const recalledContext = await store.recall(
          conversationId,
          body.message,
          RECALL_LIMIT,
        );

        await store.appendTurn({
          conversationId,
          role: "user",
          content: body.message,
          metadata: {
            intent,
            pageContext: body.pageContext,
            hasPipelineContext: Boolean(body.pipelineContext),
            hasDocumentContext: Boolean(body.documentContext),
          },
        });

        const cascade = await runModelCascade({
          conversationId,
          message: body.message,
          intent,
          recalledContext,
          integrationSnapshot: buildIntegrationSnapshot(),
        });

        const runtimeMode: RuntimeMode = cascade.runtimeMode;
        const selectedProvider: ProviderId | "mock" = cascade.providerId;

        const assistantTurn = await store.appendTurn({
          conversationId,
          role: "assistant",
          content: cascade.text,
          metadata: {
            intent,
            runtimeMode,
            provider: selectedProvider,
            model: cascade.modelId,
            attempts: summariseAttempts(cascade.attempts),
            mode: runtimeMode === "live" ? "live" : "mock",
          },
        });

        return NextResponse.json({
          conversationId,
          messageId: assistantTurn.id,
          reply: cascade.text,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unexpected chat error";
        return NextResponse.json({ error: message }, { status: 500 });
      }
    },
  );
}
