/**
 * Track P Session P5 — email-template renderer unit tests.
 */
import { describe, expect, it } from 'vitest';

import {
  EMAIL_TONES,
  renderTemplateDraft,
  type EmailDraftContext,
} from '../email-templates';
import { SMART_BANDS_BY_ID } from '../bands';
import type { ClauseAnalysis } from '../clause-types';
import type { CriticalIssue } from '../report-types';
import type { SmartBand } from '../types';

function context(band: SmartBand): EmailDraftContext {
  const critical: CriticalIssue[] =
    band === 'red' || band === 'orange'
      ? [
          {
            clauseType: 'leaver_provisions',
            summary: 'Punitive bad-leaver — repurchase at par.',
            toxicity: 88,
          },
          {
            clauseType: 'indemnification',
            summary: 'Personal indemnity at 100%.',
            toxicity: 92,
          },
        ]
      : [];
  const clauses: ClauseAnalysis[] =
    band === 'yellow' || band === 'blue'
      ? [
          {
            text: 'Liquidation preference: 1.5x participating preferred.',
            clauseType: 'liquidation_preference',
            severity: 'medium',
            toxicity: 45,
            summary: '1.5x participating preferred is above market.',
            founderFriendlyAlternative: 'Counter to 1x non-participating.',
            opusJudged: false,
          },
        ]
      : [];
  return {
    report: {
      smartScore: bandToScore(band),
      band: SMART_BANDS_BY_ID[band],
      criticalIssues: critical,
      walkAwayReasons: band === 'red' ? ['Critical concerns flagged.'] : [],
      clauseAnalyses: clauses,
    },
    founderName: 'Jane Founder',
    companyName: 'Acme Co',
    recipientName: 'Investor One',
  };
}

function bandToScore(band: SmartBand): number {
  switch (band) {
    case 'red':
      return 12;
    case 'orange':
      return 30;
    case 'yellow':
      return 50;
    case 'blue':
      return 70;
    case 'green':
      return 92;
  }
}

describe('renderTemplateDraft — tone matches band', () => {
  it.each([
    ['red', 'walk_away'],
    ['orange', 'caution'],
    ['yellow', 'negotiate_hard'],
    ['blue', 'counter_minor'],
    ['green', 'sign'],
  ] as const)('band=%s → tone=%s', (band, expectedTone) => {
    const draft = renderTemplateDraft(context(band));
    expect(draft.tone).toBe(expectedTone);
    expect(EMAIL_TONES[band].tone).toBe(expectedTone);
  });
});

describe('renderTemplateDraft — body content', () => {
  it('red: explicitly declines, no negotiation hook', () => {
    const draft = renderTemplateDraft(context('red'));
    expect(draft.body.toLowerCase()).toMatch(/decline|unable to move forward/);
    /* Red emails should NOT have "happy to discuss" softening. */
    expect(draft.body.toLowerCase()).not.toContain('happy to discuss');
  });

  it('green: positive close, no problem-listing prose', () => {
    const draft = renderTemplateDraft(context('green'));
    expect(draft.body.toLowerCase()).toMatch(/aligned|excited|ready/);
    expect(draft.body.toLowerCase()).not.toMatch(/concern|decline|push back/);
  });

  it('yellow: lists specific clauses with counter-language', () => {
    const draft = renderTemplateDraft(context('yellow'));
    expect(draft.body.toLowerCase()).toMatch(/redline|negotiate|counter/);
  });

  it('uses recipient name when provided, falls back to "Thank you," when not', () => {
    const ctxWith = context('blue');
    const draftWith = renderTemplateDraft(ctxWith);
    expect(draftWith.body.startsWith('Hi Investor One,')).toBe(true);

    const draftWithout = renderTemplateDraft({ ...ctxWith, recipientName: undefined });
    expect(draftWithout.body.startsWith('Thank you,')).toBe(true);
  });

  it('subject line is short and band-appropriate', () => {
    const red = renderTemplateDraft(context('red'));
    expect(red.subject.length).toBeLessThanOrEqual(120);
    expect(red.subject.toLowerCase()).toMatch(/declin/);

    const green = renderTemplateDraft(context('green'));
    expect(green.subject.toLowerCase()).toMatch(/accept/);
  });
});

describe('renderTemplateDraft — robustness', () => {
  it('produces a usable body when no founder/company/recipient names supplied', () => {
    const ctx = { ...context('blue'), founderName: undefined, companyName: undefined, recipientName: undefined };
    const draft = renderTemplateDraft(ctx);
    expect(draft.body.length).toBeGreaterThan(80);
    expect(draft.subject.length).toBeGreaterThan(4);
  });

  it('produces a usable body when no critical issues + no clauses', () => {
    const draft = renderTemplateDraft({
      report: {
        smartScore: 50,
        band: SMART_BANDS_BY_ID.yellow,
        criticalIssues: [],
        walkAwayReasons: [],
        clauseAnalyses: [],
      },
    });
    expect(draft.body.length).toBeGreaterThan(80);
    expect(draft.body.toLowerCase()).toContain('counsel');
  });
});
