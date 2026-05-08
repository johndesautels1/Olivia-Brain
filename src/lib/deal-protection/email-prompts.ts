/**
 * Track P Session P5 — Email-draft cascade prompt.
 *
 * The prompt instructs Sonnet (`intent: "operations"`) to produce a
 * single founder-side reply email tuned to the deal's smart band.
 * Embeds the band's tone descriptor + the top critical issues so the
 * model has the specifics needed to write naturally — without the
 * specifics it would default to generic VC-email prose.
 *
 * Output contract (strict JSON, validated against Zod in
 * `email-drafts.ts`):
 *
 * ```
 * { "subject": "<short subject line>",
 *   "body":    "<plain-text email body, 4-12 sentences, no markdown>" }
 * ```
 */
import { EMAIL_TONES, type EmailDraftContext } from './email-templates';

const SUBJECT_MIN = 4 as const;
const SUBJECT_MAX = 120 as const;
const BODY_MIN = 80 as const;
const BODY_MAX = 2_500 as const;

export const EMAIL_DRAFT_LIMITS = Object.freeze({
  SUBJECT_MIN,
  SUBJECT_MAX,
  BODY_MIN,
  BODY_MAX,
});

export function buildEmailDraftPrompt(ctx: EmailDraftContext): string {
  const toneRec = EMAIL_TONES[ctx.report.band.band];
  const recipient = ctx.recipientName ?? '(investor name unspecified)';
  const founder = ctx.founderName ?? '(founder name unspecified)';
  const company = ctx.companyName ?? '(company name unspecified)';

  const issuesBlock =
    ctx.report.criticalIssues.length > 0
      ? ctx.report.criticalIssues
          .slice(0, 5)
          .map((c, i) => `${i + 1}. [${c.clauseType}] ${c.summary}`)
          .join('\n')
      : ctx.report.clauseAnalyses.length > 0
        ? ctx.report.clauseAnalyses
            .slice()
            .sort((a, b) => b.toxicity - a.toxicity)
            .slice(0, 5)
            .map((c, i) => `${i + 1}. [${c.clauseType}] ${c.summary}`)
            .join('\n')
        : '(No specific issues flagged.)';

  const walkAwayBlock =
    ctx.report.walkAwayReasons.length > 0
      ? ctx.report.walkAwayReasons.map((r, i) => `${i + 1}. ${r}`).join('\n')
      : '(N/A — band is not red.)';

  return [
    'You are drafting a founder-side reply email to a venture-deal term sheet.',
    'Match the tone strictly to the deal band; founders depend on this tone',
    'being correct so the message lands the intended way.',
    '',
    `## Smart band: ${ctx.report.band.band.toUpperCase()} (score ${ctx.report.smartScore.toFixed(1)})`,
    `## Tone: ${toneRec.tone}`,
    `## Tone descriptor`,
    toneRec.descriptor,
    '',
    '## Recipients + sender',
    `- Recipient: ${recipient}`,
    `- Founder/sender: ${founder}`,
    `- Company: ${company}`,
    '',
    '## Critical issues (top 5)',
    issuesBlock,
    '',
    '## Walk-away reasons (only when band = red)',
    walkAwayBlock,
    '',
    '## Output contract',
    'Return a SINGLE JSON object. No prose, no markdown, no code fences.',
    'Shape:',
    '',
    '```',
    '{',
    `  "subject": string (${SUBJECT_MIN}-${SUBJECT_MAX} chars, no quotes around the value),`,
    `  "body":    string (${BODY_MIN}-${BODY_MAX} chars, plain text, 4-12 sentences,`,
    '              line breaks via \\n; do not use markdown headers or asterisks)',
    '}',
    '```',
    '',
    '## Rules',
    '- Match the tone descriptor strictly; do not wander into other bands.',
    '- Reference the specific critical issues by name (not "various concerns").',
    "- For band=red: do not include a negotiation hook or 'happy to discuss' clause.",
    '- For band=green: do not list problems; reference fairness positively.',
    '- Use the recipient name only if provided; otherwise open with "Thank you," or similar.',
    '- Sign as the founder name if provided; otherwise as "the founding team" or similar.',
    '- Keep the subject under 120 chars and the body under 2,500 chars.',
    '- Output ONLY the JSON object. No commentary, no prefix, no suffix.',
  ].join('\n');
}
