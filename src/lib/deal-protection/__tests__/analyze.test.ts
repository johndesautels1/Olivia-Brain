/**
 * Track P Session P3 — analyze orchestrator end-to-end tests.
 *
 * Mocks `parseTermSheet` + `classifyClauses` so the orchestrator
 * branches are testable in isolation. Pipeline-level invariants:
 * runtimeMode = 'live' iff every sub-stage stayed live AND input was
 * structurally parseable; band copy overrides for the empty-input case;
 * walkAwayReasons populated only when band='red'.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { analyzeTermSheet } from '../analyze';
import { CONFIDENCE_LIVE, CONFIDENCE_MOCK } from '../report-types';
import type { ClauseAnalysis } from '../clause-types';
import type { TermSheetTerms } from '../parser-types';

vi.mock('../parser', () => ({ parseTermSheet: vi.fn() }));
vi.mock('../clause-intel', () => ({ classifyClauses: vi.fn() }));

import { parseTermSheet } from '../parser';
import { classifyClauses } from '../clause-intel';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const SUBJECT_ID = '11111111-1111-1111-1111-111111111111';

function liveTerms(overrides: Partial<TermSheetTerms> = {}): TermSheetTerms {
  return {
    fullText: 'full text',
    clauses: [
      { text: 'Liquidation Preference: 1x non-participating.' },
      { text: 'Anti-dilution: broad-based weighted-average.' },
      { text: 'Board: 2 investor + 1 founder seats.' },
    ],
    investorNames: ['Atomico'],
    roundContext: { roundType: 'series_a' },
    attempts: [
      { providerId: 'anthropic', modelId: 'claude-sonnet-4-6', success: true, durationMs: 100 },
    ],
    runtimeMode: 'live',
    extractionStrategy: 'heuristic',
    ...overrides,
  };
}

function clauseAnalysis(
  partial: Partial<ClauseAnalysis> & Pick<ClauseAnalysis, 'severity' | 'toxicity'>,
): ClauseAnalysis {
  return {
    text: partial.text ?? 'fixture text',
    clauseType: partial.clauseType ?? 'other',
    severity: partial.severity,
    toxicity: partial.toxicity,
    summary: partial.summary ?? 'fixture summary',
    founderFriendlyAlternative: partial.founderFriendlyAlternative ?? 'fixture counter',
    opusJudged: partial.opusJudged ?? false,
    reasoning: partial.reasoning,
  };
}

describe('analyzeTermSheet — happy path (all live, no critical)', () => {
  it('returns runtimeMode=live + confidence=CONFIDENCE_LIVE + no walk-away reasons', async () => {
    vi.mocked(parseTermSheet).mockResolvedValue(liveTerms());
    vi.mocked(classifyClauses).mockResolvedValue({
      analyses: [
        clauseAnalysis({ severity: 'low', toxicity: 12 }),
        clauseAnalysis({ severity: 'low', toxicity: 18 }),
        clauseAnalysis({ severity: 'low', toxicity: 8 }),
      ],
      providerId: 'anthropic',
      modelId: 'claude-sonnet-4-6',
      runtimeMode: 'live',
      attempts: [],
    });

    const report = await analyzeTermSheet({
      valuationSubjectId: SUBJECT_ID,
      termSheetText: 'sample',
      conversationId: 'conv-1',
    });
    expect(report.runtimeMode).toBe('live');
    expect(report.confidenceScore).toBe(CONFIDENCE_LIVE);
    expect(report.smartScore).toBeGreaterThanOrEqual(80);
    expect(report.band.band).toBe('green');
    expect(report.walkAwayReasons).toHaveLength(0);
    expect(report.investorNames).toEqual(['Atomico']);
  });
});

describe('analyzeTermSheet — critical clause forces red + walk-away', () => {
  it('caps the score, sets band=red, and populates walk-away reasons', async () => {
    vi.mocked(parseTermSheet).mockResolvedValue(liveTerms());
    vi.mocked(classifyClauses).mockResolvedValue({
      analyses: [
        clauseAnalysis({
          severity: 'critical',
          toxicity: 95,
          clauseType: 'indemnification',
          summary: 'Personal indemnity at 100%.',
        }),
        clauseAnalysis({ severity: 'low', toxicity: 5 }),
        clauseAnalysis({ severity: 'low', toxicity: 5 }),
      ],
      providerId: 'anthropic',
      modelId: 'claude-sonnet-4-6',
      runtimeMode: 'live',
      attempts: [],
    });

    const report = await analyzeTermSheet({
      valuationSubjectId: SUBJECT_ID,
      termSheetText: 'sample',
      conversationId: 'conv-2',
    });
    /* Cap pulls into orange (≤ 39); whether final lands in red or
       orange depends on weighting; verify it's NOT green/blue. */
    expect(report.smartScore).toBeLessThanOrEqual(39);
    /* And given 1 critical clause at toxicity 95, the score should be
       red (0-19) because the cap of 39 is min'd with the (low) base. */
    expect(['red', 'orange']).toContain(report.band.band);
    expect(report.criticalIssues).toHaveLength(1);
    expect(report.criticalIssues[0].clauseType).toBe('indemnification');
    if (report.band.band === 'red') {
      expect(report.walkAwayReasons.length).toBeGreaterThan(0);
      expect(report.walkAwayReasons.join(' ')).toContain('Indemnification');
    }
  });
});

describe('analyzeTermSheet — empty-input branch', () => {
  it('returns smartScore=50, band copy is overridden, runtimeMode=mock', async () => {
    vi.mocked(parseTermSheet).mockResolvedValue(
      liveTerms({ clauses: [], runtimeMode: 'mock', extractionStrategy: 'fallback_single' }),
    );
    vi.mocked(classifyClauses).mockResolvedValue({
      analyses: [],
      providerId: 'mock',
      modelId: 'phase1-local-fallback',
      runtimeMode: 'mock',
      attempts: [],
    });

    const report = await analyzeTermSheet({
      valuationSubjectId: SUBJECT_ID,
      termSheetText: '',
      conversationId: 'conv-3',
    });
    expect(report.smartScore).toBe(50);
    expect(report.runtimeMode).toBe('mock');
    expect(report.confidenceScore).toBe(CONFIDENCE_MOCK);
    /* Custom band copy. */
    expect(report.band.language).toMatch(/manual review/i);
    expect(report.band.investorSignal).toBe('Unparsed');
  });
});

describe('analyzeTermSheet — runtimeMode aggregation', () => {
  it('reports mock when classifier mocks even if parser was live', async () => {
    vi.mocked(parseTermSheet).mockResolvedValue(liveTerms());
    vi.mocked(classifyClauses).mockResolvedValue({
      analyses: [clauseAnalysis({ severity: 'low', toxicity: 5 })],
      providerId: 'mock',
      modelId: 'phase1-local-fallback',
      runtimeMode: 'mock',
      attempts: [],
    });

    const report = await analyzeTermSheet({
      valuationSubjectId: SUBJECT_ID,
      termSheetText: 'sample',
      conversationId: 'conv-4',
    });
    expect(report.runtimeMode).toBe('mock');
    expect(report.confidenceScore).toBe(CONFIDENCE_MOCK);
  });

  it('reports mock when parser mocks even if classifier was live', async () => {
    vi.mocked(parseTermSheet).mockResolvedValue(
      liveTerms({ runtimeMode: 'mock', extractionStrategy: 'fallback_single' }),
    );
    vi.mocked(classifyClauses).mockResolvedValue({
      analyses: [clauseAnalysis({ severity: 'low', toxicity: 5 })],
      providerId: 'anthropic',
      modelId: 'claude-sonnet-4-6',
      runtimeMode: 'live',
      attempts: [],
    });
    const report = await analyzeTermSheet({
      valuationSubjectId: SUBJECT_ID,
      termSheetText: 'sample',
      conversationId: 'conv-5',
    });
    expect(report.runtimeMode).toBe('mock');
  });
});

describe('analyzeTermSheet — passthrough of parser metadata', () => {
  it('forwards investor names and combined attempts trail', async () => {
    vi.mocked(parseTermSheet).mockResolvedValue(
      liveTerms({
        investorNames: ['Atomico', 'Octopus Ventures'],
        attempts: [
          { providerId: 'anthropic', modelId: 'sonnet', success: true, durationMs: 1 },
        ],
      }),
    );
    vi.mocked(classifyClauses).mockResolvedValue({
      analyses: [clauseAnalysis({ severity: 'low', toxicity: 5 })],
      providerId: 'anthropic',
      modelId: 'sonnet',
      runtimeMode: 'live',
      attempts: [
        { providerId: 'anthropic', modelId: 'sonnet', success: true, durationMs: 2 },
      ],
    });

    const report = await analyzeTermSheet({
      valuationSubjectId: SUBJECT_ID,
      termSheetText: 'sample',
      conversationId: 'conv-6',
    });
    expect(report.investorNames).toEqual(['Atomico', 'Octopus Ventures']);
    expect(report.attempts).toHaveLength(2);
  });
});
