/**
 * Track P Session P3 — parser unit tests.
 *
 * Heuristic split coverage + cascade fallback + investor / round
 * extraction + soft-failure paths.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { parseTermSheet } from '../parser';
import { MIN_HEURISTIC_CLAUSE_COUNT } from '../parser-types';
import type { ProviderAttempt, ProviderId } from '@/lib/foundation/types';

vi.mock('@/lib/services/model-cascade', () => ({
  runModelCascade: vi.fn(),
}));

import { runModelCascade } from '@/lib/services/model-cascade';

const MOCK_CASCADE_BASE: {
  text: string;
  providerId: ProviderId | 'mock';
  modelId: string;
  attempts: ProviderAttempt[];
  runtimeMode: 'live' | 'mock';
} = {
  text: 'unused',
  providerId: 'anthropic',
  modelId: 'claude-sonnet-4-6',
  attempts: [
    { providerId: 'anthropic', modelId: 'claude-sonnet-4-6', success: true, durationMs: 320 },
  ],
  runtimeMode: 'live',
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('parseTermSheet — heuristic split (numbered list)', () => {
  it('splits on numbered headings + populates clauses', async () => {
    const text = [
      'TERM SHEET',
      'Lead Investor: Atomico',
      '',
      '1. Liquidation Preference: 1x non-participating preference for the Series A preferred shares.',
      '2. Anti-Dilution: Broad-based weighted-average applies to any down round.',
      '3. Board Composition: Investor appoints two of three board seats; founder retains one.',
      '4. Vesting: 4-year vesting with 1-year cliff for all founder shares.',
    ].join('\n');

    const result = await parseTermSheet({ termSheetText: text, conversationId: 'p3-test' });

    expect(result.extractionStrategy).toBe('heuristic');
    expect(result.runtimeMode).toBe('live');
    expect(result.clauses.length).toBeGreaterThanOrEqual(MIN_HEURISTIC_CLAUSE_COUNT);
    /* Cascade should NOT have been called when heuristic succeeded. */
    expect(runModelCascade).not.toHaveBeenCalled();
    /* Investor extracted from "Lead Investor:" line. */
    expect(result.investorNames).toContain('Atomico');
  });

  it('captures the section heading on each clause when one is present', async () => {
    const text = [
      'Liquidation Preference: 1x non-participating preference.',
      'Anti-Dilution: Broad-based weighted-average.',
      'Board Composition: Two investor seats, one founder.',
    ].join('\n');

    const result = await parseTermSheet({ termSheetText: text, conversationId: 'p3-test' });
    expect(result.clauses.length).toBeGreaterThanOrEqual(3);
    const headings = result.clauses.map((c) => c.heading);
    expect(headings).toContain('Liquidation Preference');
    expect(headings).toContain('Anti-Dilution');
  });
});

describe('parseTermSheet — round-context extraction', () => {
  it('extracts roundType + amounts when stated', async () => {
    const text = [
      'TERM SHEET — Series A Round',
      'Investors: Atomico, Octopus Ventures',
      'Pre-money valuation: £20m',
      'Round size: £5m',
      '',
      '1. Liquidation Preference: 1x non-participating preference.',
      '2. Anti-Dilution: Broad-based weighted-average.',
      '3. Board Composition: Two investor seats, one founder.',
    ].join('\n');

    const result = await parseTermSheet({ termSheetText: text, conversationId: 'p3-test' });
    expect(result.roundContext?.roundType).toBe('series_a');
    expect(result.roundContext?.preMoneyGbp).toBe(20_000_000);
    expect(result.roundContext?.amountGbp).toBe(5_000_000);
    expect(result.investorNames).toEqual(
      expect.arrayContaining(['Atomico', 'Octopus Ventures']),
    );
  });
});

describe('parseTermSheet — cascade fallback', () => {
  it('falls back to cascade when heuristic produces fewer than MIN clauses', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      text: JSON.stringify({
        clauses: [
          { text: 'Founder vesting is 4 years with a 1-year cliff.', heading: 'Vesting' },
          { text: 'Anti-dilution: broad-based weighted-average applies.', heading: 'Anti-Dilution' },
          { text: 'Liquidation preference: 1x non-participating.', heading: 'Liquidation Preference' },
          { text: 'Board: 2 investor seats, 1 founder seat.', heading: 'Board' },
        ],
        investorNames: ['Atomico'],
        roundContext: { roundType: 'series_a', amountGbp: 5_000_000, preMoneyGbp: 20_000_000 },
      }),
    });

    /* Two-line free-form text — no headings, no numbering — heuristic
       can't structurally split this, so cascade fallback triggers. */
    const text =
      'Series A round summary follows. Atomico leads the £5m round at £20m pre-money. Standard founder-friendly terms throughout including 1x non-participating liquidation preference, broad-based weighted-average anti-dilution, two investor board seats one founder seat, and four-year founder vesting with one-year cliff.';

    const result = await parseTermSheet({ termSheetText: text, conversationId: 'p3-test' });
    expect(result.extractionStrategy).toBe('cascade');
    expect(result.runtimeMode).toBe('live');
    expect(result.clauses.length).toBe(4);
    expect(result.investorNames).toContain('Atomico');
    expect(runModelCascade).toHaveBeenCalledTimes(1);
  });

  it('falls back to single-clause when cascade returns mock-mode', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      runtimeMode: 'mock',
      providerId: 'mock',
      modelId: 'phase1-local-fallback',
      text: '',
    });

    const text =
      'Free-form blob with no numbered headings or section markers; a single paragraph that the heuristic cannot split into multiple clauses.';
    const result = await parseTermSheet({ termSheetText: text, conversationId: 'p3-test' });
    expect(result.extractionStrategy).toBe('fallback_single');
    expect(result.runtimeMode).toBe('mock');
    expect(result.clauses).toHaveLength(1);
    expect(result.clauses[0].text).toContain('Free-form blob');
  });

  it('falls back to single-clause when cascade returns invalid JSON', async () => {
    vi.mocked(runModelCascade).mockResolvedValue({
      ...MOCK_CASCADE_BASE,
      text: 'not JSON at all, just prose from a confused model.',
    });

    const text =
      'Free-form blob with no numbered headings or section markers; a single paragraph that the heuristic cannot split into multiple clauses.';
    const result = await parseTermSheet({ termSheetText: text, conversationId: 'p3-test' });
    expect(result.extractionStrategy).toBe('fallback_single');
    expect(result.runtimeMode).toBe('mock');
  });
});

describe('parseTermSheet — empty input', () => {
  it('returns empty clauses + mock-mode for whitespace-only input', async () => {
    const result = await parseTermSheet({ termSheetText: '   \n\n   ', conversationId: 'p3-test' });
    expect(result.clauses).toHaveLength(0);
    expect(result.runtimeMode).toBe('mock');
    expect(result.extractionStrategy).toBe('fallback_single');
    expect(runModelCascade).not.toHaveBeenCalled();
  });
});
