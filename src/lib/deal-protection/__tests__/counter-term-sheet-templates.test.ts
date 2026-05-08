/**
 * Track P Session P6 — counter-template renderer unit tests.
 */
import { describe, expect, it } from 'vitest';

import { renderTemplateCounterDraft } from '../counter-term-sheet-templates';
import { renderCounterMarkdown } from '../counter-term-sheet';
import type { ClauseAnalysis } from '../clause-types';
import type { SmartBand } from '../types';

function clause(
  partial: Partial<ClauseAnalysis> & Pick<ClauseAnalysis, 'severity' | 'toxicity' | 'clauseType' | 'summary' | 'founderFriendlyAlternative' | 'text'>,
): ClauseAnalysis {
  return {
    text: partial.text,
    clauseType: partial.clauseType,
    severity: partial.severity,
    toxicity: partial.toxicity,
    summary: partial.summary,
    founderFriendlyAlternative: partial.founderFriendlyAlternative,
    opusJudged: partial.opusJudged ?? false,
    reasoning: partial.reasoning,
  };
}

describe('renderTemplateCounterDraft — band-tuned tone', () => {
  const sampleClauses = [
    clause({
      severity: 'critical',
      toxicity: 90,
      clauseType: 'leaver_provisions',
      text: 'Bad-leaver: 100% unvested forfeit; 50% vested at par.',
      summary: 'Punitive bad-leaver — repurchase at par is predatory.',
      founderFriendlyAlternative: 'Counter: bad-leaver forfeits unvested only; vested at FMV.',
    }),
    clause({
      severity: 'high',
      toxicity: 65,
      clauseType: 'board_control',
      text: 'Investor appoints two of three board seats.',
      summary: 'Investor majority control at Series A.',
      founderFriendlyAlternative: 'Counter for 2 founder + 1 investor + 1 independent.',
    }),
  ];

  it.each([
    ['red', /cannot accept|drove this conclusion/i],
    ['orange', /need substantive revision|counter language for each/i],
    ['yellow', /aligned on the strategic shape|market norms/i],
    ['blue', /largely aligned|counter; the rest is acceptable/i],
    ['green', /founder-friendly throughout|definitive documentation/i],
  ] as Array<[SmartBand, RegExp]>)('band=%s preamble matches expected language', (band, expectedPattern) => {
    const draft = renderTemplateCounterDraft({
      band,
      clauseAnalyses: sampleClauses,
      companyName: 'Acme Co',
      recipientName: 'Lead Partner',
      founderName: 'Jane',
    });
    expect(draft.preamble).toMatch(expectedPattern);
  });

  it('red closing has no negotiation hook ("happy to discuss" softener absent)', () => {
    const draft = renderTemplateCounterDraft({
      band: 'red',
      clauseAnalyses: sampleClauses,
    });
    expect(draft.closing.toLowerCase()).not.toContain('happy to discuss');
  });

  it('green closing references definitive docs', () => {
    const draft = renderTemplateCounterDraft({
      band: 'green',
      clauseAnalyses: [
        clause({
          severity: 'low',
          toxicity: 5,
          clauseType: 'governing_law',
          text: 'English law applies.',
          summary: 'Standard.',
          founderFriendlyAlternative: 'Accept.',
        }),
      ],
    });
    expect(draft.closing.toLowerCase()).toMatch(/coordinate|outside counsel/);
  });
});

describe('renderTemplateCounterDraft — change selection', () => {
  it('skips low-severity clauses (those are acceptable as-drafted)', () => {
    const draft = renderTemplateCounterDraft({
      band: 'blue',
      clauseAnalyses: [
        clause({
          severity: 'low',
          toxicity: 5,
          clauseType: 'governing_law',
          text: 'English law',
          summary: 'Standard.',
          founderFriendlyAlternative: 'Accept.',
        }),
        clause({
          severity: 'medium',
          toxicity: 35,
          clauseType: 'veto_rights',
          text: 'Investor consent for budget',
          summary: 'Broad veto.',
          founderFriendlyAlternative: 'Counter to budget veto only above 20% deviation.',
        }),
      ],
    });
    expect(draft.changes).toHaveLength(1);
    expect(draft.changes[0].clauseType).toBe('veto_rights');
  });

  it('sorts changes by toxicity desc', () => {
    const draft = renderTemplateCounterDraft({
      band: 'orange',
      clauseAnalyses: [
        clause({
          severity: 'medium',
          toxicity: 35,
          clauseType: 'veto_rights',
          text: 'A',
          summary: 'low.',
          founderFriendlyAlternative: 'a',
        }),
        clause({
          severity: 'critical',
          toxicity: 90,
          clauseType: 'leaver_provisions',
          text: 'B',
          summary: 'high.',
          founderFriendlyAlternative: 'b',
        }),
        clause({
          severity: 'high',
          toxicity: 70,
          clauseType: 'non_compete',
          text: 'C',
          summary: 'mid.',
          founderFriendlyAlternative: 'c',
        }),
      ],
    });
    expect(draft.changes.map((c) => c.clauseType)).toEqual([
      'leaver_provisions',
      'non_compete',
      'veto_rights',
    ]);
  });

  it('falls back to a procedural placeholder when no actionable clauses', () => {
    const draft = renderTemplateCounterDraft({
      band: 'green',
      clauseAnalyses: [],
    });
    expect(draft.changes).toHaveLength(1);
    expect(draft.changes[0].rationale.toLowerCase()).toMatch(/within market norms|procedural/);
  });
});

describe('renderCounterMarkdown — markdown shape', () => {
  it('emits preamble + Redlines header + per-change blocks + closing', () => {
    const md = renderCounterMarkdown({
      preamble: 'Hi team, here is our counter.',
      changes: [
        {
          clauseType: 'liquidation_preference',
          originalText: '2x participating preferred.',
          counterText: '1x non-participating preferred.',
          rationale: 'Market norm.',
        },
      ],
      closing: 'Best, founder.',
    });
    expect(md).toContain('Hi team');
    expect(md).toContain('## Redlines');
    expect(md).toContain('### 1. Liquidation Preference');
    expect(md).toContain('**Original:** 2x participating preferred.');
    expect(md).toContain('**Counter:** 1x non-participating preferred.');
    expect(md).toContain('**Rationale:** Market norm.');
    expect(md).toContain('Best, founder.');
  });
});
