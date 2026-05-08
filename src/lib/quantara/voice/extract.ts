/**
 * Quantara Q7 — cascade-driven voice extraction.
 *
 * Takes a transcript string + the founder's current canonical values
 * (so the model can avoid re-emitting fields the founder already
 * filled), runs `runModelCascade` with `intent: "questionnaire"`, and
 * returns a typed `VoiceExtractionResult` ready to be adapted into
 * `QuantaraSuggestion[]` at the route boundary.
 *
 * Pure orchestration — no Prisma writes here.
 */
import { QUANTARA_FIELDS, type QuantaraValues } from '@/lib/quantara';
import { runModelCascade } from '@/lib/services/model-cascade';
import { withTraceSpan } from '@/lib/observability/tracer';

import {
  VoiceExtractionPayloadSchema,
  type VoiceExtractionItem,
  type VoiceExtractionResult,
} from './types';

const MAX_TRANSCRIPT_LENGTH = 4000;

/**
 * Build the cascade prompt for voice extraction. Includes a compact
 * field manifest (id, label, schema kind, unit) so the model knows
 * what's available to extract without dumping the full Zod schemas.
 */
export function buildVoiceExtractionPrompt(
  transcript: string,
  filledFieldIds: ReadonlyArray<string>,
): string {
  const truncated = transcript.length > MAX_TRANSCRIPT_LENGTH
    ? transcript.slice(0, MAX_TRANSCRIPT_LENGTH) + '… (truncated)'
    : transcript;

  const fieldManifest = QUANTARA_FIELDS.map((f) => {
    const filled = filledFieldIds.includes(f.id) ? ' [already filled]' : '';
    const hint = f.hint ? ` (${f.hint})` : '';
    return `- ${f.id}: ${f.label}${hint}${filled}`;
  }).join('\n');

  return [
    'You are extracting structured Quantara intake field values from a',
    'founder voice transcript. The founder is filling out a 56-field',
    'valuation intake by speaking naturally; your job is to identify',
    'which fields they spoke about and what values to suggest.',
    '',
    '## Transcript',
    truncated,
    '',
    '## Quantara field manifest',
    fieldManifest,
    '',
    '## Output contract',
    'Return a SINGLE JSON object. No prose, no markdown, no code fences.',
    'Shape:',
    '',
    '```',
    '{',
    '  "extractions": [',
    '    {',
    '      "fieldId": "f1",',
    '      "value": 2400000,',
    '      "confidence": 0.85,',
    '      "note": "founder said \'around 2.4 million pounds ARR\'"',
    '    }',
    '  ]',
    '}',
    '```',
    '',
    'Rules:',
    '- Only emit extractions you can DIRECTLY tie to the transcript.',
    '  Do not invent values. Do not infer values from industry benchmarks.',
    '- Numbers: emit as JSON numbers, not strings (e.g. 2_400_000 → 2400000).',
    '- Percentages: emit as numeric percent (e.g. 40% → 40, not 0.40).',
    '- Currency: emit GBP amounts as plain numbers (e.g. £2.4M → 2400000).',
    '- Confidence: 0.85+ when the founder stated the value explicitly;',
    '  0.6–0.8 when the value is implied or paraphrased; <0.6 if uncertain.',
    '  Never below 0.5 — if it would be, omit the extraction entirely.',
    '- Already-filled fields: it is FINE to re-emit them if the founder',
    '  explicitly updates the value in the transcript. Otherwise skip.',
    '- Empty array is a valid output ("no Quantara fields mentioned").',
    '- Output ONLY the JSON object. No commentary.',
  ].join('\n');
}

/**
 * Run cascade extraction against a transcript. Always resolves; never
 * throws on the happy path. Falls back to an empty extraction list on
 * cascade mock-mode or JSON parse failure (no fabricated suggestions
 * — better to surface zero results than misleading ones).
 */
export async function extractFromTranscript(
  transcript: string,
  currentValues: QuantaraValues,
  userId: string,
): Promise<VoiceExtractionResult> {
  const filledFieldIds = (Object.keys(currentValues) as Array<keyof QuantaraValues>)
    .filter((id) => currentValues[id] !== undefined && currentValues[id] !== null)
    .map((id) => String(id));

  return withTraceSpan(
    'olivia.quantara.voice_extract',
    {
      'olivia.transcript_length': transcript.length,
      'olivia.filled_field_count': filledFieldIds.length,
    },
    async () => {
      const conversationId = `quantara-voice-${userId}`;
      const cascade = await runModelCascade({
        conversationId,
        message: buildVoiceExtractionPrompt(transcript, filledFieldIds),
        intent: 'questionnaire',
        recalledContext: [],
        integrationSnapshot: {},
      });

      /* Mock-mode → empty extractions. No fabrication. */
      if (cascade.runtimeMode === 'mock') {
        return {
          transcript,
          extractions: [],
          providerId: cascade.providerId,
          modelId: cascade.modelId,
          runtimeMode: 'mock',
        };
      }

      const parsed = tryParseJson(cascade.text);
      if (!parsed.ok) {
        return {
          transcript,
          extractions: [],
          providerId: cascade.providerId,
          modelId: cascade.modelId,
          runtimeMode: 'mock',
        };
      }

      const validation = VoiceExtractionPayloadSchema.safeParse(parsed.value);
      if (!validation.success) {
        return {
          transcript,
          extractions: [],
          providerId: cascade.providerId,
          modelId: cascade.modelId,
          runtimeMode: 'mock',
        };
      }

      return {
        transcript,
        extractions: validation.data.extractions as ReadonlyArray<VoiceExtractionItem>,
        providerId: cascade.providerId,
        modelId: cascade.modelId,
        runtimeMode: 'live',
      };
    },
  );
}

function tryParseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  try {
    return { ok: true, value: JSON.parse(candidate) };
  } catch {
    return { ok: false };
  }
}
