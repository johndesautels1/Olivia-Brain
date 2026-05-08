/**
 * Track P Session P6 — Deterministic counter-draft template.
 *
 * Used as the soft-failure fallback when the cascade is offline or its
 * output fails parse / schema validation. Builds the counter from the
 * persisted `clauseAnalysisJson` — every clause flagged as
 * `severity ≥ medium` becomes a redline; the `founderFriendlyAlternative`
 * already attached to the P2 ClauseAnalysis IS the counter language.
 *
 * The deterministic path is deliberately strong because it does not
 * fabricate — every redline is anchored in real classifier output.
 * That's the right behaviour for a contract document the founder may
 * forward to counsel verbatim.
 */
import type { ClauseAnalysis, ClauseType } from './clause-types';
import type { CounterChange, CounterDraftPayload } from './counter-term-sheet-types';
import type { SmartBand } from './types';

export interface CounterTemplateContext {
  readonly band: SmartBand;
  readonly clauseAnalyses: ReadonlyArray<ClauseAnalysis>;
  readonly companyName?: string;
  readonly founderName?: string;
  readonly recipientName?: string;
}

/**
 * Render a deterministic counter draft. Always returns a usable payload —
 * never throws. Skips clauses with `severity = 'low'` (those are
 * acceptable as-drafted) and surfaces only the items that need
 * pushback.
 */
export function renderTemplateCounterDraft(
  ctx: CounterTemplateContext,
): CounterDraftPayload {
  const company = ctx.companyName ?? 'our company';
  const recipient = ctx.recipientName ?? 'the team';
  const sender = ctx.founderName ?? 'the founding team';

  const redlines: CounterChange[] = ctx.clauseAnalyses
    .filter((c) => c.severity !== 'low' && c.founderFriendlyAlternative.trim().length > 0)
    .sort((a, b) => b.toxicity - a.toxicity)
    .map((c) => ({
      clauseType: c.clauseType,
      originalText: c.text,
      counterText: c.founderFriendlyAlternative,
      rationale: c.summary,
    }));

  /* If everything is low-severity OR no counter language is present
     we still produce a usable payload — counsel will redline manually. */
  const changes: ReadonlyArray<CounterChange> =
    redlines.length > 0
      ? redlines
      : [
          {
            clauseType: 'other' as ClauseType,
            originalText: '(see attached term sheet)',
            counterText:
              '(no specific redlines — counsel will follow up if any clause needs negotiation)',
            rationale:
              'Term sheet is largely within market norms; counter is procedural only.',
          },
        ];

  const preamble = buildPreamble({ band: ctx.band, recipient, company, count: redlines.length });
  const closing = buildClosing({ band: ctx.band, sender });

  return { preamble, changes, closing };
}

/* `renderCounterMarkdown` is exported directly from `./counter-term-sheet`;
   import it from there. We don't re-export here to avoid a circular
   import (the orchestrator needs `renderTemplateCounterDraft` from
   this module). */

function buildPreamble(args: {
  readonly band: SmartBand;
  readonly recipient: string;
  readonly company: string;
  readonly count: number;
}): string {
  const lead = `Hi ${args.recipient},`;
  switch (args.band) {
    case 'red':
      return [
        lead,
        '',
        `After review with counsel, the term sheet for ${args.company} contains terms our team cannot accept as drafted. We are sharing the items that drove this conclusion below; if any of them are revisable we are open to a conversation.`,
      ].join('\n');
    case 'orange':
      return [
        lead,
        '',
        `Counsel has reviewed the term sheet for ${args.company} and flagged ${args.count} items that need substantive revision before we can move forward. Counter language for each is below.`,
      ].join('\n');
    case 'yellow':
      return [
        lead,
        '',
        `Thank you for the offer. Counsel has reviewed the term sheet for ${args.company} and proposes ${args.count} redlines below. We are aligned on the strategic shape of the deal; the items below would bring the document into market norms.`,
      ].join('\n');
    case 'blue':
      return [
        lead,
        '',
        `Thank you for the offer. We are largely aligned on terms for ${args.company}. Counsel has flagged ${args.count} items where we'd like to counter; the rest is acceptable as-drafted.`,
      ].join('\n');
    case 'green':
    default:
      return [
        lead,
        '',
        `Thank you for the offer. Terms for ${args.company} are founder-friendly throughout; we are ready to move to definitive documentation. The items below are minor procedural notes from counsel — none affect the deal economics.`,
      ].join('\n');
  }
}

function buildClosing(args: { readonly band: SmartBand; readonly sender: string }): string {
  switch (args.band) {
    case 'red':
      return [
        '',
        'Best,',
        args.sender,
      ].join('\n');
    case 'orange':
      return [
        '',
        'If we can land on these revisions, we are happy to move forward quickly. Could we set up a call this week?',
        '',
        'Best,',
        args.sender,
      ].join('\n');
    case 'yellow':
      return [
        '',
        'Happy to discuss any of these on a call. We are committed to making this work and would like to redline the document this week.',
        '',
        'Best,',
        args.sender,
      ].join('\n');
    case 'blue':
      return [
        '',
        'If we can land on these few items, we are ready to move to definitive documents next week.',
        '',
        'Best,',
        args.sender,
      ].join('\n');
    case 'green':
    default:
      return [
        '',
        'Could you point us at your preferred outside counsel? Our team will coordinate this week.',
        '',
        'Best,',
        args.sender,
      ].join('\n');
  }
}

