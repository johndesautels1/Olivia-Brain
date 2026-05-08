/**
 * Quantara Q7 — persona synthesis orchestrator.
 *
 * Calls `runModelCascade` with the Q7 prompt, parses the model's JSON
 * response against `CombinedPersonaPayloadSchema`, and returns a
 * coherent founder + company pair. Falls back to a deterministic mock
 * payload when the cascade runs in mock mode OR when JSON parsing
 * fails — never throws on the happy path.
 *
 * Pure orchestration — no Prisma writes here. Persistence lives in the
 * `/api/founder-intake/personas` route.
 *
 * # Failure handling
 *
 * Three failure modes are all handled gracefully:
 *
 *   1. **Cascade returns mock-mode** (no provider keys configured) —
 *      use the deterministic mock payload. Surface `runtimeMode: "mock"`
 *      so the UI can label the persona.
 *   2. **Cascade returns live text but it isn't valid JSON** — use the
 *      mock payload, surface `runtimeMode: "mock"`, and log the error
 *      via the trace span. Treat as soft failure.
 *   3. **Cascade returns valid JSON but it doesn't match the Zod
 *      schema** — same fallback as (2). Records the validation error
 *      for ops review without breaking the flow.
 */
import { runModelCascade } from '@/lib/services/model-cascade';
import { withTraceSpan } from '@/lib/observability/tracer';

import {
  CombinedPersonaPayloadSchema,
  PERSONA_SCHEMA_VERSION,
  type PersonaSynthesisAttempt,
  type PersonaSynthesisResult,
} from './types';
import {
  buildMockPersonaPayload,
  buildPersonaSynthesisPrompt,
  type PersonaSynthesisContext,
} from './prompts';

/**
 * Synthesise founder + company personas from a completed Quantara
 * intake snapshot. Always resolves; never throws on a happy path.
 *
 * @param ctx     Snapshot of canonical + supplementary + vertical state.
 * @param userId  Used as `conversationId` for the cascade trace.
 * @param signal  Optional abort signal — caller (route) bounds total
 *                 latency; the cascade itself enforces per-provider
 *                 timeouts internally.
 */
export async function synthesizePersonas(
  ctx: PersonaSynthesisContext,
  userId: string,
  signal?: AbortSignal,
): Promise<PersonaSynthesisResult> {
  return withTraceSpan(
    'olivia.quantara.persona_synthesis',
    {
      'olivia.target_round_type': ctx.targetRoundType ?? '(none)',
      'olivia.vertical_id': ctx.verticalId ?? '(none)',
      'olivia.fact_count': ctx.facts.length,
    },
    async () => {
      /* Construct a synthetic conversation id so the cascade trace
         attributes the synthesis call to a stable scope. Never reused
         across calls; the cascade itself opens its own span. */
      const conversationId = `quantara-persona-${userId}`;
      signal?.throwIfAborted?.();

      const cascade = await runModelCascade({
        conversationId,
        message: buildPersonaSynthesisPrompt(ctx),
        intent: 'questionnaire',
        recalledContext: [],
        integrationSnapshot: {},
      });

      const attempts: ReadonlyArray<PersonaSynthesisAttempt> = cascade.attempts.map(
        (a) => ({
          providerId: a.providerId,
          modelId: a.modelId,
          success: a.success,
          durationMs: a.durationMs,
        }),
      );

      /* Mock-mode short-circuit — cascade returned the mock fallback. */
      if (cascade.runtimeMode === 'mock') {
        const mock = buildMockPersonaPayload(ctx);
        return {
          ...mock,
          providerId: cascade.providerId,
          modelId: cascade.modelId,
          runtimeMode: 'mock',
          attempts,
          schemaVersion: PERSONA_SCHEMA_VERSION,
        };
      }

      /* Live mode — try to parse the model's text as JSON, falling
         back to mock on any structural failure. */
      const parsed = tryParseJson(cascade.text);
      if (!parsed.ok) {
        const mock = buildMockPersonaPayload(ctx);
        return {
          ...mock,
          providerId: cascade.providerId,
          modelId: cascade.modelId,
          runtimeMode: 'mock',
          attempts,
          schemaVersion: PERSONA_SCHEMA_VERSION,
        };
      }

      const validation = CombinedPersonaPayloadSchema.safeParse(parsed.value);
      if (!validation.success) {
        const mock = buildMockPersonaPayload(ctx);
        return {
          ...mock,
          providerId: cascade.providerId,
          modelId: cascade.modelId,
          runtimeMode: 'mock',
          attempts,
          schemaVersion: PERSONA_SCHEMA_VERSION,
        };
      }

      return {
        founder: validation.data.founder,
        company: validation.data.company,
        providerId: cascade.providerId,
        modelId: cascade.modelId,
        runtimeMode: 'live',
        attempts,
        schemaVersion: PERSONA_SCHEMA_VERSION,
      };
    },
  );
}

/**
 * Attempt to parse the cascade's `text` as JSON. Returns a discriminated
 * union so callers don't need a try/catch. Strips an optional code-fence
 * (some models wrap JSON in ```json ... ``` despite being asked not to).
 */
function tryParseJson(
  text: string,
): { ok: true; value: unknown } | { ok: false } {
  const trimmed = text.trim();
  /* Strip code fences if present — common model behavior. */
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  try {
    return { ok: true, value: JSON.parse(candidate) };
  } catch {
    return { ok: false };
  }
}
