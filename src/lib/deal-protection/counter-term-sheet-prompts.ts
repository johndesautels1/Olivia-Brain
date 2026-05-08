/**
 * Track P Session P6 — Counter term sheet cascade prompt.
 *
 * Sonnet (`intent: "operations"`) drafts the founder-side redlined
 * counter from: the smart band's tone, the per-clause analyses (with
 * the P2 `founderFriendlyAlternative` already computed), the parent
 * ValuationSubject's company/sector context, and an optional
 * recipient name.
 */
import type { ClauseAnalysis } from './clause-types';
import { COUNTER_DRAFT_LIMITS } from './counter-term-sheet-types';
import type { SmartBand } from './types';

export interface CounterPromptContext {
  readonly band: SmartBand;
  readonly smartScore: number;
  readonly clauseAnalyses: ReadonlyArray<ClauseAnalysis>;
  readonly companyName?: string;
  readonly companySector?: string;
  readonly founderName?: string;
  readonly recipientName?: string;
  readonly roundContextSummary?: string;
}

const TONE_BY_BAND: Readonly<Record<SmartBand, string>> = Object.freeze({
  red:
    'Polite-but-firm. Frame the redlines as conditions for moving forward at all. Do NOT include a "happy to discuss" softener; instead, signal that without these revisions the deal does not happen.',
  orange:
    'Diplomatic and detailed. Frame the redlines as substantive items that need revision before the deal can move forward.',
  yellow:
    'Professional and committed. Frame the redlines as bringing the document into market norms; the strategic shape of the deal is acceptable.',
  blue:
    'Warm and aligned. Frame the redlines as small surgical asks; everything else is acceptable.',
  green:
    'Warm and excited. Procedural notes only; no economic asks. Express readiness to move to definitive documentation.',
});

export function buildCounterDraftPrompt(ctx: CounterPromptContext): string {
  const recipient = ctx.recipientName ?? '(investor name unspecified)';
  const founder = ctx.founderName ?? '(founder name unspecified)';
  const company = ctx.companyName ?? '(company name unspecified)';
  const sector = ctx.companySector ?? '(sector unspecified)';
  const roundCtx = ctx.roundContextSummary ?? '(round context unspecified)';

  const issuesBlock = ctx.clauseAnalyses
    .slice()
    .sort((a, b) => b.toxicity - a.toxicity)
    .slice(0, COUNTER_DRAFT_LIMITS.CHANGES_MAX)
    .map(
      (c, i) =>
        [
          `${i + 1}. clauseType: ${c.clauseType}`,
          `   severity: ${c.severity} (toxicity ${c.toxicity})`,
          `   investor language: ${c.text}`,
          `   classifier summary: ${c.summary}`,
          `   suggested counter: ${c.founderFriendlyAlternative}`,
        ].join('\n'),
    )
    .join('\n\n');

  return [
    'You are drafting a founder-side redlined counter to a venture-deal',
    'term sheet. Your output is a structured set of clause-by-clause',
    "counters; the founder will copy this into counsel's redlining tool",
    'or paste into an email reply. Accuracy on clause boundaries +',
    'tone calibration to the deal band matter more than rhetorical flourish.',
    '',
    `## Smart band: ${ctx.band.toUpperCase()} (score ${ctx.smartScore.toFixed(1)})`,
    '## Tone',
    TONE_BY_BAND[ctx.band],
    '',
    '## Recipients + sender + cross-doc context',
    `- Recipient: ${recipient}`,
    `- Founder/sender: ${founder}`,
    `- Company: ${company}`,
    `- Sector: ${sector}`,
    `- Round context: ${roundCtx}`,
    '',
    '## Investor clauses to address',
    issuesBlock || '(No clauses available — produce a procedural counter only.)',
    '',
    '## Output contract',
    'Return a SINGLE JSON object. No prose, no markdown, no code fences.',
    'Shape:',
    '',
    '```',
    '{',
    `  "preamble": string (${COUNTER_DRAFT_LIMITS.PREAMBLE_MIN}-${COUNTER_DRAFT_LIMITS.PREAMBLE_MAX} chars; opens with "Hi <recipient>," when known, otherwise "Hi team,"),`,
    '  "changes": [',
    '    {',
    '      "clauseType": one of the 20 stable values,',
    '      "originalText": string (8-2000 chars; verbatim from the investor clause),',
    '      "counterText":  string (8-2000 chars; the founder-side redline),',
    '      "rationale":    string (8-500 chars; one-line "why" — market norms / risk to founder)',
    '    }',
    '  ],',
    `  "closing": string (${COUNTER_DRAFT_LIMITS.CLOSING_MIN}-${COUNTER_DRAFT_LIMITS.CLOSING_MAX} chars; sign-off + next-steps appropriate to the band)`,
    '}',
    '```',
    '',
    '## Rules',
    '- Match the tone strictly to the band described above.',
    '- One change per investor clause; do NOT bundle multiple clauses into a single redline.',
    '- For band=red: do not include a negotiation-friendly closing; signal that the redlines are conditions for moving forward.',
    '- For band=green: changes are procedural notes only (no economic asks); the closing expresses readiness to move to definitive docs.',
    '- `originalText` MUST be verbatim from the investor clause (do not paraphrase the input clause).',
    '- `counterText` is the proposed founder-side replacement. Be concrete (numbers, named carve-outs).',
    '- `rationale` is a single sentence — what the redline accomplishes vs market norms.',
    '- Output ONLY the JSON object. No commentary, no prefix, no suffix.',
  ].join('\n');
}
