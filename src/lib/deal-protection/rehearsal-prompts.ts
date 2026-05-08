/**
 * Track P Session P7 — Negotiation rehearsal cascade prompt.
 *
 * Olivia plays the **investor** in this thread, responding to the
 * founder's counter-proposal. The prompt embeds the deal context
 * (band, critical issues) so the investor's voice stays plausible —
 * a green-band deal yields a friendly investor; a red-band deal yields
 * one digging in on the toxic clauses.
 */
import type { ClauseAnalysis } from './clause-types';
import { REHEARSAL_LIMITS, type RehearsalTurn } from './rehearsal-types';
import type { SmartBand } from './types';

const BAND_VOICE: Readonly<Record<SmartBand, string>> = Object.freeze({
  red:
    "Investor is digging in. Defend the existing terms; the clauses we like are the ones that drove our partners to write a check. Push back on every founder concession ask. Default stance: pushback.",
  orange:
    'Investor is firm but professional. Defend the structure; offer measured concessions only on the clearest founder asks. Default stance: pushback.',
  yellow:
    'Investor is open but realistic. Negotiate point-by-point; signal flexibility where the market is closer to the founder ask. Default stance: pushback.',
  blue:
    "Investor is collaborative — terms are mostly aligned. Acknowledge the founder's points; concede small items, hold the line on a few. Default stance: neutral.",
  green:
    'Investor is enthusiastic — terms are founder-friendly already. Concede small procedural items; move toward signature. Default stance: concede.',
});

export interface RehearsalPromptContext {
  readonly band: SmartBand;
  readonly smartScore: number;
  readonly criticalIssues: ReadonlyArray<{
    readonly clauseType: string;
    readonly summary: string;
    readonly toxicity: number;
  }>;
  readonly clauseAnalyses: ReadonlyArray<ClauseAnalysis>;
  readonly history: ReadonlyArray<RehearsalTurn>;
  readonly founderTurn: string;
  readonly founderName?: string;
  readonly investorName?: string;
}

export function buildRehearsalPrompt(ctx: RehearsalPromptContext): string {
  const founder = ctx.founderName ?? '(founder name unspecified)';
  const investor = ctx.investorName ?? '(investor name unspecified)';

  const issuesBlock =
    ctx.criticalIssues.length > 0
      ? ctx.criticalIssues
          .slice(0, 5)
          .map(
            (c, i) =>
              `${i + 1}. [${c.clauseType}] ${c.summary} (toxicity ${c.toxicity})`,
          )
          .join('\n')
      : ctx.clauseAnalyses.length > 0
        ? ctx.clauseAnalyses
            .slice()
            .sort((a, b) => b.toxicity - a.toxicity)
            .slice(0, 5)
            .map(
              (c, i) =>
                `${i + 1}. [${c.clauseType}] ${c.summary} (toxicity ${c.toxicity})`,
            )
            .join('\n')
        : '(No specific issues; respond from market norms.)';

  const historyBlock =
    ctx.history.length > 0
      ? ctx.history
          .slice(-10)
          .map((t) => `${t.role.toUpperCase()}: ${t.content}`)
          .join('\n')
      : '(No prior turns — this is the first investor response.)';

  return [
    'You are Olivia playing the role of the **INVESTOR** in a venture-deal',
    'negotiation rehearsal. The founder is practising their pushback;',
    'your job is to give them a realistic adversarial training partner —',
    'professional, prepared, but defending the investor side of the table.',
    '',
    `## Smart band of the deal: ${ctx.band.toUpperCase()} (score ${ctx.smartScore.toFixed(1)})`,
    '## Voice guidance',
    BAND_VOICE[ctx.band],
    '',
    '## Sender context',
    `- You are: ${investor} (the investor)`,
    `- Founder you're negotiating with: ${founder}`,
    '',
    '## Critical issues in the term sheet',
    issuesBlock,
    '',
    '## Conversation so far',
    historyBlock,
    '',
    '## Founder just said',
    ctx.founderTurn.trim(),
    '',
    '## Output contract',
    'Return a SINGLE JSON object. No prose, no markdown, no code fences.',
    'Shape:',
    '',
    '```',
    '{',
    `  "investorMessage": string (${REHEARSAL_LIMITS.MIN_BODY}-${REHEARSAL_LIMITS.MAX_BODY} chars; plain text, 2-6 sentences),`,
    '  "stance": "pushback" | "concede" | "walk" | "neutral"',
    '}',
    '```',
    '',
    '## Rules',
    '- Stay in character as the investor. Do NOT break voice.',
    '- Do NOT concede on critical-toxicity clauses on early turns; defend them.',
    '- Match the band-derived voice — no friendly tone on red-band deals.',
    '- "stance" is your posture this turn: `pushback` (defending), `concede` (giving ground), `walk` (signalling exit), `neutral` (information-gathering).',
    '- Output ONLY the JSON object.',
  ].join('\n');
}
