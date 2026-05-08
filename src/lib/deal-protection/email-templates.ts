/**
 * Track P Session P5 — Per-band deterministic email-draft templates.
 *
 * Used as:
 *   1. **Mock-mode fallback** in `email-drafts.ts` when the cascade is
 *      offline or its output fails parse/schema.
 *   2. **Cascade prompt scaffold** — the cascade prompt references the
 *      per-band tone descriptors here so live drafts are stylistically
 *      aligned with the templates below.
 *
 * # Five tones (one per smart band, locked in `bands.ts` § P1)
 *
 *   - red    → walk-away (decisive, polite, no negotiation hook)
 *   - orange → caution    (diplomatic, signals serious concerns, asks for re-discussion)
 *   - yellow → negotiate-hard (detailed, lists specific clauses to revisit)
 *   - blue   → counter-minor (warm, surgical asks on 1-2 items)
 *   - green  → sign       (warm, expresses excitement, ready for definitive docs)
 *
 * Templates interpolate the report's `criticalIssues` / `walkAwayReasons` /
 * top-toxicity clauses so the deterministic fallback still surfaces the
 * specifics. Founder name / company name / recipient name are optional;
 * the templates degrade gracefully when they're absent.
 */
import type { ClauseAnalysis } from './clause-types';
import type { CriticalIssue, DealRiskReport } from './report-types';
import type { SmartBand } from './types';

/** Stable tone identifiers — must match the smart band ids one-for-one. */
export type EmailTone =
  | 'walk_away'
  | 'caution'
  | 'negotiate_hard'
  | 'counter_minor'
  | 'sign';

/** Per-band tone metadata. */
export interface EmailToneRecord {
  readonly band: SmartBand;
  readonly tone: EmailTone;
  /** One-line stylistic descriptor — used in the cascade prompt. */
  readonly descriptor: string;
}

export const EMAIL_TONES: Readonly<Record<SmartBand, EmailToneRecord>> = Object.freeze({
  red: {
    band: 'red',
    tone: 'walk_away',
    descriptor:
      'Decisive, polite-but-firm. No negotiation hook. Thanks the investor; declines specifically.',
  },
  orange: {
    band: 'orange',
    tone: 'caution',
    descriptor:
      'Diplomatic but signals material concerns. Lists 2-3 critical issues; asks for re-discussion.',
  },
  yellow: {
    band: 'yellow',
    tone: 'negotiate_hard',
    descriptor:
      'Detailed and professional. Lists 3-5 specific clauses with concrete counter-language.',
  },
  blue: {
    band: 'blue',
    tone: 'counter_minor',
    descriptor:
      'Warm and aligned overall. Surgical asks on 1-2 clauses; everything else acceptable.',
  },
  green: {
    band: 'green',
    tone: 'sign',
    descriptor:
      'Warm and excited. Aligned on terms. Ready to move to definitive documents.',
  },
});

/** Inputs for the deterministic template renderer. */
export interface EmailDraftContext {
  readonly report: Pick<
    DealRiskReport,
    | 'smartScore'
    | 'band'
    | 'criticalIssues'
    | 'walkAwayReasons'
    | 'clauseAnalyses'
  >;
  readonly founderName?: string;
  readonly companyName?: string;
  readonly recipientName?: string;
}

/** Output of the email-draft render — same shape as the cascade returns. */
export interface EmailDraftPayload {
  readonly subject: string;
  readonly body: string;
  readonly tone: EmailTone;
}

/**
 * Render the deterministic per-band template. Always returns a usable
 * draft — never throws. Used in two paths: (a) cascade mock-mode
 * fallback, (b) reference for the cascade-prompt scaffold.
 */
export function renderTemplateDraft(ctx: EmailDraftContext): EmailDraftPayload {
  const tone = EMAIL_TONES[ctx.report.band.band].tone;
  const opener = ctx.recipientName ? `Hi ${ctx.recipientName},` : 'Thank you,';
  const sender = ctx.founderName
    ? ctx.founderName
    : ctx.companyName
      ? `the ${ctx.companyName} team`
      : 'the founding team';
  const company = ctx.companyName ? ctx.companyName : 'our company';

  const topIssues = pickTopIssues(ctx.report.criticalIssues, ctx.report.clauseAnalyses);

  switch (tone) {
    case 'walk_away':
      return {
        subject: `Re: term sheet — declining`,
        body: [
          opener,
          '',
          `Thank you for the offer to invest in ${company}. After review with counsel we are unable to move forward on these terms.`,
          '',
          'The specific items that drove this decision:',
          ...renderIssuesAsBullets(topIssues),
          '',
          'We appreciate the time your team put in. If there is a future round or revised structure we would be glad to revisit.',
          '',
          `Best,`,
          sender,
        ].join('\n'),
        tone,
      };
    case 'caution':
      return {
        subject: `Re: term sheet — material concerns`,
        body: [
          opener,
          '',
          `Thank you for the offer. We have reviewed the term sheet for ${company} and have material concerns we would like to discuss before we can move forward.`,
          '',
          'The items that need re-examination:',
          ...renderIssuesAsBullets(topIssues),
          '',
          'Could we set up a call this week to walk through these? If we can land on workable language we would be excited to continue.',
          '',
          `Best,`,
          sender,
        ].join('\n'),
        tone,
      };
    case 'negotiate_hard':
      return {
        subject: `Re: term sheet — proposed redlines`,
        body: [
          opener,
          '',
          `Thank you for the offer. We are aligned on the strategic shape of the deal for ${company}; counsel has flagged several specific clauses where we'd like to negotiate the language. Concrete asks below.`,
          '',
          'Items we would like to revisit:',
          ...renderIssuesAsBullets(topIssues),
          '',
          'Happy to redline a draft this week and walk through on a call. We are genuinely keen to make this work.',
          '',
          `Best,`,
          sender,
        ].join('\n'),
        tone,
      };
    case 'counter_minor':
      return {
        subject: `Re: term sheet — counter on highlighted items`,
        body: [
          opener,
          '',
          `Thank you for the offer. We are largely aligned on terms for ${company}. Counsel has flagged a small number of items they would like to counter; the rest is acceptable as-drafted.`,
          '',
          'The items we would like to discuss:',
          ...renderIssuesAsBullets(topIssues),
          '',
          'If we can land on these, we are ready to move to definitive documents next week.',
          '',
          `Best,`,
          sender,
        ].join('\n'),
        tone,
      };
    case 'sign':
    default:
      return {
        subject: `Re: term sheet — accepted`,
        body: [
          opener,
          '',
          `Thank you for the offer. We are aligned on terms for ${company} and ready to move to definitive documentation.`,
          '',
          'Counsel has reviewed; the term sheet is founder-friendly and within market norms throughout. We are excited to partner.',
          '',
          'Could you point us at your preferred outside counsel? We can have our team coordinate this week.',
          '',
          `Best,`,
          sender,
        ].join('\n'),
        tone,
      };
  }
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

const TOP_ISSUE_LIMIT = 5 as const;

function pickTopIssues(
  criticalIssues: ReadonlyArray<CriticalIssue>,
  fallback: ReadonlyArray<ClauseAnalysis>,
): ReadonlyArray<{ clauseTypeLabel: string; summary: string }> {
  if (criticalIssues.length > 0) {
    return criticalIssues.slice(0, TOP_ISSUE_LIMIT).map((c) => ({
      clauseTypeLabel: formatClauseType(c.clauseType),
      summary: c.summary,
    }));
  }
  /* No critical clauses — fall back to the highest-toxicity clauses
     in the analysis (yellow/blue/green deals still benefit from
     bullets so the email isn't just generic prose). */
  return [...fallback]
    .sort((a, b) => b.toxicity - a.toxicity)
    .slice(0, TOP_ISSUE_LIMIT)
    .map((c) => ({
      clauseTypeLabel: formatClauseType(c.clauseType),
      summary: c.summary,
    }));
}

function renderIssuesAsBullets(
  issues: ReadonlyArray<{ clauseTypeLabel: string; summary: string }>,
): string[] {
  if (issues.length === 0) {
    return [
      '  • (No specific issues flagged. Counsel will follow up with detailed redlines.)',
    ];
  }
  return issues.map((c) => `  • ${c.clauseTypeLabel}: ${c.summary}`);
}

function formatClauseType(t: string): string {
  return t
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}
