/**
 * Track P Session P7 — versioning diff tests.
 *
 * Pure-function tests on the structured deltas. Mirrors the
 * BUILD_SEQUENCE exit criterion phrase "Olivia flags new red flags +
 * re-scores" — verified via score-delta direction + new/resolved
 * critical issue partitioning.
 */
import { describe, expect, it } from 'vitest';

import { compareAnalyses, type VersionedAnalysis } from '../versioning';
import type { ClauseAnalysis } from '../clause-types';
import type { CriticalIssue } from '../report-types';

function clause(
  partial: Partial<ClauseAnalysis> & Pick<ClauseAnalysis, 'severity' | 'toxicity' | 'clauseType'>,
): ClauseAnalysis {
  return {
    text: partial.text ?? 'sample text',
    clauseType: partial.clauseType,
    severity: partial.severity,
    toxicity: partial.toxicity,
    summary: partial.summary ?? 'summary',
    founderFriendlyAlternative: partial.founderFriendlyAlternative ?? 'counter',
    opusJudged: false,
  };
}

function critical(clauseType: string, toxicity: number): CriticalIssue {
  return { clauseType: clauseType as CriticalIssue['clauseType'], summary: `crit ${clauseType}`, toxicity };
}

const NOW = '2026-05-08T12:00:00Z';

function v(label: string, score: number, band: 'red' | 'orange' | 'yellow' | 'blue' | 'green', clauses: ClauseAnalysis[], crit: CriticalIssue[]): VersionedAnalysis {
  return {
    id: `${label}-id`,
    versionLabel: label,
    smartScore: score,
    smartBand: band,
    clauseAnalyses: clauses,
    criticalIssues: crit,
    generatedAt: NOW,
  };
}

describe('compareAnalyses — score delta + direction', () => {
  it('better when current > prior', () => {
    const prior = v('V1', 30, 'orange', [], []);
    const current = v('V2', 65, 'blue', [], []);
    const diff = compareAnalyses(prior, current);
    expect(diff.scoreDelta).toBe(35);
    expect(diff.overallDirection).toBe('better');
  });

  it('worse when current < prior', () => {
    const prior = v('V1', 70, 'blue', [], []);
    const current = v('V2', 30, 'orange', [], []);
    const diff = compareAnalyses(prior, current);
    expect(diff.scoreDelta).toBe(-40);
    expect(diff.overallDirection).toBe('worse');
  });

  it('unchanged when scores within ±0.5', () => {
    const prior = v('V1', 50, 'yellow', [], []);
    const current = v('V2', 50.3, 'yellow', [], []);
    const diff = compareAnalyses(prior, current);
    expect(diff.overallDirection).toBe('unchanged');
  });
});

describe('compareAnalyses — band transition', () => {
  it('reports the transition when bands differ', () => {
    const prior = v('V1', 30, 'orange', [], []);
    const current = v('V2', 65, 'blue', [], []);
    const diff = compareAnalyses(prior, current);
    expect(diff.bandTransition).toEqual({ from: 'orange', to: 'blue' });
  });

  it('returns null when bands match', () => {
    const prior = v('V1', 50, 'yellow', [], []);
    const current = v('V2', 55, 'yellow', [], []);
    const diff = compareAnalyses(prior, current);
    expect(diff.bandTransition).toBeNull();
  });
});

describe('compareAnalyses — critical issue partitioning', () => {
  it('partitions new + resolved critical issues by clauseType', () => {
    const prior = v('V1', 30, 'orange', [], [
      critical('leaver_provisions', 90),
      critical('indemnification', 95),
    ]);
    const current = v('V2', 25, 'orange', [], [
      critical('leaver_provisions', 88),
      critical('non_compete', 80),
    ]);
    const diff = compareAnalyses(prior, current);

    expect(diff.criticalIssueDelta.newCriticalIssues.map((c) => c.clauseType)).toEqual(['non_compete']);
    expect(diff.criticalIssueDelta.resolvedCriticalIssues.map((c) => c.clauseType)).toEqual(['indemnification']);
  });
});

describe('compareAnalyses — clause diffs', () => {
  it('produces per-clause toxicity deltas sorted by absolute magnitude', () => {
    const priorClauses: ClauseAnalysis[] = [
      clause({ clauseType: 'liquidation_preference', severity: 'high', toxicity: 70 }),
      clause({ clauseType: 'vesting', severity: 'low', toxicity: 10 }),
    ];
    const currentClauses: ClauseAnalysis[] = [
      clause({ clauseType: 'liquidation_preference', severity: 'low', toxicity: 20 }),
      clause({ clauseType: 'vesting', severity: 'low', toxicity: 8 }),
    ];
    const diff = compareAnalyses(
      v('V1', 30, 'orange', priorClauses, []),
      v('V2', 70, 'blue', currentClauses, []),
    );
    /* Two diffs, sorted by abs(delta) desc — liq pref shifted -50, vesting -2. */
    expect(diff.clauseDiffs).toHaveLength(2);
    expect(diff.clauseDiffs[0].clauseType).toBe('liquidation_preference');
    expect(diff.clauseDiffs[0].toxicityDelta).toBe(-50);
    expect(diff.clauseDiffs[0].direction).toBe('better');
    expect(diff.clauseDiffs[1].clauseType).toBe('vesting');
    expect(diff.clauseDiffs[1].direction).toBe('better');
  });

  it('handles same-clauseType multiple entries by using highest-toxicity', () => {
    const priorClauses: ClauseAnalysis[] = [
      clause({ clauseType: 'veto_rights', severity: 'medium', toxicity: 30 }),
      clause({ clauseType: 'veto_rights', severity: 'high', toxicity: 70 }),
    ];
    const currentClauses: ClauseAnalysis[] = [
      clause({ clauseType: 'veto_rights', severity: 'low', toxicity: 20 }),
    ];
    const diff = compareAnalyses(
      v('V1', 50, 'yellow', priorClauses, []),
      v('V2', 75, 'blue', currentClauses, []),
    );
    /* Highest-toxicity 70 in prior, 20 in current → -50 delta. */
    expect(diff.clauseDiffs[0].toxicityDelta).toBe(-50);
  });
});

describe('compareAnalyses — narrative summary', () => {
  it('includes both version labels + score delta', () => {
    const prior = v('V1', 30, 'orange', [], []);
    const current = v('V2', 65, 'blue', [], []);
    const diff = compareAnalyses(prior, current);
    expect(diff.summary).toContain('V1');
    expect(diff.summary).toContain('V2');
    expect(diff.summary).toContain('+35');
    expect(diff.summary.toLowerCase()).toContain('improved');
  });

  it('flags new critical concerns prominently', () => {
    const prior = v('V1', 30, 'orange', [], []);
    const current = v('V2', 25, 'orange', [], [critical('leaver_provisions', 90)]);
    const diff = compareAnalyses(prior, current);
    expect(diff.summary.toUpperCase()).toContain('NEW');
    expect(diff.summary).toContain('Leaver Provisions');
  });
});
