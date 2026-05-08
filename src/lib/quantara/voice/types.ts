/**
 * Quantara Q7 — voice-extraction type contracts.
 *
 * # What this is
 *
 * Voice mode lets the founder speak instead of type. The flow:
 *
 *   1. Browser captures audio via MediaRecorder.
 *   2. Audio posts to `/api/voice/transcribe` (existing C3 route) →
 *      transcript string + provider metadata.
 *   3. Transcript posts to `/api/founder-intake/voice-extract` (Q7 route) →
 *      cascade parses utterances into structured field values, returned
 *      as `QuantaraSuggestion[]` (the same shape Q3 auto-fill returns).
 *   4. Suggestions land in the IntakeForm's existing suggestion map;
 *      founder accepts/rejects per field via the existing chip flow.
 *
 * Reusing `QuantaraSuggestion` (instead of inventing a parallel type)
 * keeps the per-field accept/reject UX identical and lets the truth-
 * score cascade (Q4) compare voice-derived values against API
 * references the same way it compares Composio-derived values.
 *
 * # Why JSON output from the cascade
 *
 * Same rationale as Q7 persona synthesis — downstream UI binds to
 * structured fields, so asking the model for JSON up-front avoids a
 * second extraction pass.
 */
import { z } from 'zod';

/**
 * Single field-extraction emitted by the cascade. Stays close to
 * `QuantaraSuggestion` so the orchestrator can adapt it directly.
 */
export const VoiceExtractionItemSchema = z.object({
  /** Canonical Quantara field id (`f1`..`f56`). */
  fieldId: z.string().regex(/^f([1-9]|[1-4][0-9]|5[0-6])$/),
  /** Extracted value — type-checked against the field schema downstream. */
  value: z.unknown(),
  /** 0.0–1.0. Founder-stated values default to high (≥ 0.7). */
  confidence: z.number().min(0).max(1),
  /** Brief one-line note explaining the extraction (e.g. "founder said
   *  'around 2.4 million ARR'"). Surfaces in the per-field source chip. */
  note: z.string().max(280).optional(),
});
export type VoiceExtractionItem = z.infer<typeof VoiceExtractionItemSchema>;

/**
 * Top-level cascade response shape. The model returns an `extractions`
 * array keyed by `fieldId`. Empty array means "I heard the transcript
 * but couldn't extract any canonical fields" — a legitimate state
 * (e.g. a clarifying question that doesn't directly answer a field).
 */
export const VoiceExtractionPayloadSchema = z.object({
  extractions: z.array(VoiceExtractionItemSchema).max(30),
});
export type VoiceExtractionPayload = z.infer<typeof VoiceExtractionPayloadSchema>;

/**
 * Result of one voice-extract call. `suggestions` are already
 * adapted to `QuantaraSuggestion` shape for direct merging into
 * the IntakeForm's suggestion map.
 */
export interface VoiceExtractionResult {
  readonly transcript: string;
  readonly extractions: ReadonlyArray<VoiceExtractionItem>;
  readonly providerId: string;
  readonly modelId: string;
  readonly runtimeMode: 'live' | 'mock';
}
