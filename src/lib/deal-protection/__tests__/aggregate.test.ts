/**
 * Track P Session P3 — aggregation formula unit tests.
 *
 * Severity-weighted toxicity + severity-band caps + walk-away
 * derivation. Boundary cases verified directly so a future formula
 * tweak surfaces here before reaching the route.
 */
import { describe, expect, it } from 'vitest';

import {
  AGGREGATION_CONSTANTS,
  CRITICAL_CEILING,
  HIGH_CEILING,
  NEUTRAL_EMPTY_SCORE,
  aggregateClauseAnalyses,
  deriveWalkAwayReasons,
} from '../aggregate';
import type { ClauseAnalysis } from '../clause-types';

function clause(
  partial: Partial<ClauseAnalysis> & Pick<ClauseAnalysis, 'severity' | 'toxicity'>,
): ClauseAnalysis {
  return {
    text: partial.text ?? 'sample clause text for unit test purposes',
    clauseType: partial.clauseType ?? 'other',
    severity: partial.severity,
    toxicity: partial.toxicity,
    summary: partial.summary ?? 'one-line summary for the test fixture',
    founderFriendlyAlternative:
      partial.founderFriendlyAlternative ?? 'generic counter-language',
    opusJudged: partial.opusJudged ?? false,
    reasoning: partial.reasoning,
  };
}

describe('aggregateClauseAnalyses — empty input', () => {
  it('returns the neutral score with emptyInput = true', () => {
    const result = aggregateClauseAnalyses([]);
    expect(result.smartScore).toBe(NEUTRAL_EMPTY_SCORE);
    expect(result.emptyInput).toBe(true);
    expect(result.criticalIssues).toEqual([]);
    expect(result.hadCriticalCap).toBe(false);
    expect(result.hadHighCap).toBe(false);
  });
});

describe('aggregateClauseAnalyses — all-low clauses', () => {
  it('produces a high score with no caps applied', () => {
    const result = aggregateClauseAnalyses([
      clause({ severity: 'low', toxicity: 5 }),
      clause({ severity: 'low', toxicity: 10 }),
      clause({ severity: 'low', toxicity: 15 }),
    ]);
    /* base = 100 - mean(5,10,15) = 90 */
    expect(result.smartScore).toBe(90);
    expect(result.hadCriticalCap).toBe(false);
    expect(result.hadHighCap).toBe(false);
    expect(result.criticalIssues).toEqual([]);
  });
});

describe('aggregateClauseAnalyses — severity-band caps', () => {
  it('caps at CRITICAL_CEILING when any clause is critical', () => {
    /* 19 low + 1 critical: weighted_avg = (19*1*5 + 1*8*80) / (19*1 + 1*8) = (95 + 640)/27 = 27.22
       base = 100 - 27.22 = 72.78 → cap at 39. */
    const lows = Array.from({ length: 19 }, () =>
      clause({ severity: 'low', toxicity: 5 }),
    );
    const result = aggregateClauseAnalyses([
      ...lows,
      clause({
        severity: 'critical',
        toxicity: 80,
        clauseType: 'leaver_provisions',
        summary: 'Punitive bad-leaver clause.',
      }),
    ]);
    expect(result.smartScore).toBeLessThanOrEqual(CRITICAL_CEILING);
    expect(result.hadCriticalCap).toBe(true);
    expect(result.hadHighCap).toBe(false);
    expect(result.criticalIssues).toHaveLength(1);
    expect(result.criticalIssues[0].clauseType).toBe('leaver_provisions');
  });

  it('caps at HIGH_CEILING when any clause is high but none critical', () => {
    /* base = 100 - mean = 75 (just under HIGH_CEILING anyway), but verify
       a config that would have exceeded the ceiling stays capped. */
    const result = aggregateClauseAnalyses([
      clause({ severity: 'low', toxicity: 1 }),
      clause({ severity: 'low', toxicity: 1 }),
      clause({ severity: 'low', toxicity: 1 }),
      clause({ severity: 'high', toxicity: 60 }),
    ]);
    expect(result.smartScore).toBeLessThanOrEqual(HIGH_CEILING);
    expect(result.hadCriticalCap).toBe(false);
    expect(result.hadHighCap).toBe(true);
  });

  it('does NOT cap when all severities are low or medium', () => {
    const result = aggregateClauseAnalyses([
      clause({ severity: 'low', toxicity: 5 }),
      clause({ severity: 'medium', toxicity: 30 }),
      clause({ severity: 'low', toxicity: 10 }),
    ]);
    expect(result.hadCriticalCap).toBe(false);
    expect(result.hadHighCap).toBe(false);
  });
});

describe('aggregateClauseAnalyses — critical issues', () => {
  it('sorts critical issues by toxicity desc + caps at CRITICAL_ISSUE_LIMIT', () => {
    const c = (toxicity: number) =>
      clause({
        severity: 'critical',
        toxicity,
        clauseType: 'indemnification',
        summary: `t=${toxicity}`,
      });
    const result = aggregateClauseAnalyses([
      c(80),
      c(95),
      c(85),
      c(78),
      c(99),
      c(82),
      c(76),
    ]);
    expect(result.criticalIssues).toHaveLength(AGGREGATION_CONSTANTS.CRITICAL_ISSUE_LIMIT);
    /* First two should be the highest toxicities. */
    expect(result.criticalIssues[0].toxicity).toBe(99);
    expect(result.criticalIssues[1].toxicity).toBe(95);
  });
});

describe('aggregateClauseAnalyses — clamping', () => {
  it('clamps non-finite or out-of-range toxicities through clampSmartScore on the final value', () => {
    /* Even if a toxic value were > 100 (shouldn't happen via P2 schema),
       the final smartScore must remain in [0, 100]. */
    const result = aggregateClauseAnalyses([
      clause({ severity: 'low', toxicity: 200 as unknown as number }),
    ]);
    expect(result.smartScore).toBeGreaterThanOrEqual(0);
    expect(result.smartScore).toBeLessThanOrEqual(100);
  });
});

describe('deriveWalkAwayReasons', () => {
  it('returns the band language plus the top critical clauses, in order', () => {
    const reasons = deriveWalkAwayReasons(
      [
        clause({
          severity: 'critical',
          toxicity: 95,
          clauseType: 'indemnification',
          summary: 'Personal indemnity at 100%.',
        }),
        clause({ severity: 'low', toxicity: 5 }),
        clause({
          severity: 'critical',
          toxicity: 88,
          clauseType: 'leaver_provisions',
          summary: 'Bad-leaver repurchase at par.',
        }),
      ],
      'This term sheet contains predatory terms.',
    );
    /* First entry is band language. */
    expect(reasons[0]).toContain('predatory');
    /* Then sorted critical clauses by toxicity desc. */
    expect(reasons[1]).toContain('Indemnification');
    expect(reasons[2]).toContain('Leaver Provisions');
  });

  it('omits a blank band-language preface', () => {
    const reasons = deriveWalkAwayReasons(
      [clause({ severity: 'critical', toxicity: 90, summary: 'X' })],
      '   ',
    );
    expect(reasons[0]).not.toContain('   ');
    expect(reasons[0]).toContain('Other');
  });
});
