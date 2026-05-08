/**
 * Quantara Q7 — persona synthesis cascade prompts.
 *
 * The synthesis call uses `intent: "questionnaire"` so the cascade
 * starts with Gemini (paragraphical extraction primary). The prompt
 * asks for strict JSON output matching `CombinedPersonaPayloadSchema`
 * — the orchestrator then `safeParse`s the response and falls back
 * to a deterministic mock-mode synthesis if parsing fails.
 *
 * # Why JSON output (not free-text)
 *
 * Downstream consumers (Pitch Deck Studio, Business Plan generator)
 * will read structured fields — `archetype`, `riskTolerance`,
 * `differentiators[]`, `idealCustomer` — not paragraphs. Asking the
 * model for JSON up-front avoids a second extraction pass.
 *
 * # Prompt-stability discipline
 *
 * If this prompt changes in a non-additive way (renames / removes
 * fields), bump `PERSONA_SCHEMA_VERSION` in `./types.ts` so existing
 * records can be detected as stale and offered a regenerate prompt.
 */
import {
  type CompanyPersonaPayload,
  type FounderPersonaPayload,
  FOUNDER_ARCHETYPE_VALUES,
  RISK_TOLERANCE_VALUES,
} from './types';

/**
 * Snapshot of the Quantara state passed to the synthesis prompt.
 * Captured shape so the prompt builder doesn't need to reach into the
 * canonical schema directly — keeps coupling shallow.
 */
export interface PersonaSynthesisContext {
  readonly companyName: string;
  /** Active target round type, if set. e.g. "Series A". */
  readonly targetRoundType?: string;
  /** Active vertical id, if non-generic. e.g. "ai_saas". */
  readonly verticalId?: string;
  /**
   * Flat key-value pairs labelled for the prompt. Includes filled
   * canonical fields, supplementary entries for the active round,
   * and vertical entries for the active vertical. Empty strings are
   * skipped at the call site.
   */
  readonly facts: ReadonlyArray<{ readonly label: string; readonly value: string }>;
}

/**
 * Build the user prompt for one synthesis call. The model is asked to
 * emit a single JSON object with `founder` + `company` keys matching
 * the Zod payload schemas in `./types.ts`.
 */
export function buildPersonaSynthesisPrompt(
  ctx: PersonaSynthesisContext,
): string {
  const archetypes = FOUNDER_ARCHETYPE_VALUES.join(' | ');
  const risk = RISK_TOLERANCE_VALUES.join(' | ');

  const factsBlock =
    ctx.facts.length === 0
      ? '(no founder facts provided)'
      : ctx.facts.map((f) => `- ${f.label}: ${f.value}`).join('\n');

  const context = [
    `Company name: ${ctx.companyName || '(not provided)'}`,
    ctx.targetRoundType
      ? `Target round type: ${ctx.targetRoundType}`
      : 'Target round type: (not provided)',
    ctx.verticalId
      ? `Vertical: ${ctx.verticalId}`
      : 'Vertical: (not provided)',
  ].join('\n');

  return [
    'You are synthesising a coherent founder + company persona pair from a',
    'completed Quantara founder-valuation intake. Your output anchors',
    "downstream pitch-deck, business-plan, and marketing copy — accuracy and",
    'narrative coherence matter more than rhetorical flourish.',
    '',
    '## Subject context',
    context,
    '',
    '## Founder facts',
    factsBlock,
    '',
    '## Output contract',
    'Return a SINGLE JSON object with exactly two top-level keys: `founder`',
    'and `company`. No prose, no markdown, no code fences. The shape is:',
    '',
    '```',
    '{',
    '  "founder": {',
    '    "summary": string (one paragraph, 20-2000 chars),',
    '    "narrativeAngle": string (one line, 8-280 chars),',
    `    "strengths": string[2-8] (each 2-280 chars),`,
    '    "workingStyle": string (8-500 chars),',
    `    "archetype": one of [ ${archetypes} ],`,
    `    "riskTolerance": one of [ ${risk} ],`,
    '    "gaps": string[0-6] (each 2-280 chars),',
    '    "openQuestions": string[0-6] (each 2-280 chars)',
    '  },',
    '  "company": {',
    '    "summary": string (one paragraph, 20-2000 chars),',
    '    "positioning": string (8-500 chars),',
    '    "tractionStory": string (20-1500 chars),',
    '    "differentiators": string[2-8] (each 2-280 chars),',
    '    "idealCustomer": string (4-280 chars),',
    '    "defensibility": string (8-500 chars),',
    '    "watchOuts": string[0-6] (each 2-280 chars),',
    '    "openQuestions": string[0-6] (each 2-280 chars)',
    '  }',
    '}',
    '```',
    '',
    'Constraints:',
    '- Coherence: the company `tractionStory` and the founder `narrativeAngle`',
    '  must reinforce each other.',
    '- Specificity: every `strengths` / `differentiators` / `watchOuts` item',
    '  cites a concrete signal from the facts above. No generic platitudes.',
    '- Honesty: if the data is thin, say so in the relevant `gaps` /',
    '  `openQuestions` rather than inventing strengths.',
    '- Output ONLY the JSON object. Do not wrap it in code fences. Do not',
    '  prepend or append any commentary.',
  ].join('\n');
}

/**
 * Deterministic mock synthesis used when the cascade returns no
 * configured providers OR when JSON parsing fails. Surfaces visibly
 * as `runtimeMode: "mock"` so the UI can label the persona.
 *
 * Intentionally generic — the mock mode is a placeholder, not a
 * substitute for a live cascade synthesis.
 */
export function buildMockPersonaPayload(ctx: PersonaSynthesisContext): {
  founder: FounderPersonaPayload;
  company: CompanyPersonaPayload;
} {
  const company = ctx.companyName || 'this company';
  const round = ctx.targetRoundType ?? 'an upcoming round';
  const vertical = ctx.verticalId ?? 'general';

  return {
    founder: {
      summary: `Mock-mode founder persona for ${company}. Live cascade synthesis is unavailable; this placeholder will be replaced when API keys are configured.`,
      narrativeAngle: `${company} is preparing for ${round}. (mock-mode placeholder)`,
      strengths: [
        'Founder persona is in a placeholder state until a live cascade synthesis runs.',
        'Configure ANTHROPIC_API_KEY / OPENAI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY to enable real synthesis.',
      ],
      workingStyle:
        'Working style placeholder. Live synthesis derives this from team + risk + projections answers.',
      archetype: 'first_time_founder',
      riskTolerance: 'medium',
      gaps: [
        'Real synthesis pending — set provider keys + retry to populate this section.',
      ],
      openQuestions: [
        'Cascade has not yet run with live LLM keys; persona is a deterministic placeholder.',
      ],
    },
    company: {
      summary: `Mock-mode company persona for ${company} (${vertical}). Live cascade synthesis is unavailable; this placeholder will be replaced when API keys are configured.`,
      positioning: `${company} placeholder positioning — live cascade required.`,
      tractionStory: `Traction story placeholder for ${company}. The live cascade synthesis will derive this from financials, market sizing, and the active vertical schedule. Expected to be replaced once provider keys are present.`,
      differentiators: [
        'Differentiators placeholder — live cascade required.',
        'Configure provider keys to enable synthesis.',
      ],
      idealCustomer: 'Placeholder ideal customer — live cascade required.',
      defensibility:
        'Defensibility placeholder — live cascade synthesis derives this from IP / moat + vertical entries.',
      watchOuts: [
        'Mock-mode placeholder — no real watch-outs identified yet.',
      ],
      openQuestions: [
        'Synthesis pending until provider keys land.',
      ],
    },
  };
}
