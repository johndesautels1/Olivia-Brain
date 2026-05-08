/**
 * Track P Session P5 — Email-draft orchestrator.
 *
 * Wraps the cascade with the same three soft-failure-mode pattern as
 * the rest of Track P (Q7 / P2 / P3): cascade mock-mode → template
 * fallback; JSON parse failure → template fallback; schema rejection →
 * template fallback. Always resolves; never throws on the happy path.
 *
 * Pure orchestration — no Prisma writes here. Routes that need to
 * persist drafts (e.g. P6 WarRoom integration) wrap this orchestrator.
 */
import { z } from 'zod';

import { runModelCascade } from '@/lib/services/model-cascade';
import { withTraceSpan } from '@/lib/observability/tracer';

import type { ClauseClassificationAttempt } from './clause-types';
import {
  EMAIL_DRAFT_LIMITS,
  buildEmailDraftPrompt,
} from './email-prompts';
import {
  EMAIL_TONES,
  renderTemplateDraft,
  type EmailDraftContext,
  type EmailDraftPayload,
  type EmailTone,
} from './email-templates';

const EmailToneSchema = z.enum([
  'walk_away',
  'caution',
  'negotiate_hard',
  'counter_minor',
  'sign',
] as const);

const CascadeEmailSchema = z.object({
  subject: z
    .string()
    .min(EMAIL_DRAFT_LIMITS.SUBJECT_MIN)
    .max(EMAIL_DRAFT_LIMITS.SUBJECT_MAX),
  body: z
    .string()
    .min(EMAIL_DRAFT_LIMITS.BODY_MIN)
    .max(EMAIL_DRAFT_LIMITS.BODY_MAX),
});

export interface GenerateEmailDraftOptions {
  readonly context: EmailDraftContext;
  /** Conversation id for the cascade trace. Should be analysis-scoped. */
  readonly conversationId: string;
}

export interface EmailDraftResult extends EmailDraftPayload {
  readonly providerId: string;
  readonly modelId: string;
  readonly runtimeMode: 'live' | 'mock';
  readonly attempts: ReadonlyArray<ClauseClassificationAttempt>;
}

/**
 * Generate a per-band email draft. Always resolves; falls back to the
 * deterministic template when the cascade is offline or its output
 * doesn't parse / validate.
 */
export async function generateEmailDraft(
  opts: GenerateEmailDraftOptions,
): Promise<EmailDraftResult> {
  return withTraceSpan(
    'olivia.deal_protection.generate_email_draft',
    {
      'olivia.smart_band': opts.context.report.band.band,
      'olivia.smart_score': opts.context.report.smartScore,
    },
    async () => {
      const tone: EmailTone = EMAIL_TONES[opts.context.report.band.band].tone;
      const cascade = await runModelCascade({
        conversationId: opts.conversationId,
        message: buildEmailDraftPrompt(opts.context),
        intent: 'operations',
        recalledContext: [],
        integrationSnapshot: {},
      });

      const attempts: ReadonlyArray<ClauseClassificationAttempt> =
        cascade.attempts.map((a) => ({
          providerId: a.providerId,
          modelId: a.modelId,
          success: a.success,
          durationMs: a.durationMs,
        }));

      if (cascade.runtimeMode === 'mock') {
        return mockResult(opts.context, tone, cascade, attempts);
      }

      const parsed = parseAndValidateCascade(cascade.text);
      if (!parsed) {
        return mockResult(opts.context, tone, cascade, attempts);
      }

      /* Optional `tone` field on the model output; we always overwrite
         with the canonical band-derived tone so a hallucinated tone
         can't leak through. */
      const validatedTone = EmailToneSchema.parse(tone);

      return {
        subject: parsed.subject,
        body: parsed.body,
        tone: validatedTone,
        providerId: cascade.providerId,
        modelId: cascade.modelId,
        runtimeMode: 'live',
        attempts,
      };
    },
  );
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

function parseAndValidateCascade(
  text: string,
): z.infer<typeof CascadeEmailSchema> | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    return null;
  }
  const validated = CascadeEmailSchema.safeParse(parsed);
  return validated.success ? validated.data : null;
}

function mockResult(
  context: EmailDraftContext,
  tone: EmailTone,
  cascade: { providerId: string; modelId: string },
  attempts: ReadonlyArray<ClauseClassificationAttempt>,
): EmailDraftResult {
  const draft = renderTemplateDraft(context);
  return {
    subject: draft.subject,
    body: draft.body,
    tone,
    providerId: cascade.providerId,
    modelId: cascade.modelId,
    runtimeMode: 'mock',
    attempts,
  };
}
