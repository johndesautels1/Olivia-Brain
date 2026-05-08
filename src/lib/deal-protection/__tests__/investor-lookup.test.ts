/**
 * Track P Session P4 — `lookupInvestorReputations` unit tests.
 *
 * Mocks `prisma.investorReputation.findMany` so the lookup logic is
 * exercised without a live DB. Focuses on slug normalisation, the
 * matched / unmatched partition, and the average + tilt computation.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { lookupInvestorReputations } from '../investor-lookup';

vi.mock('@/lib/db/client', () => ({
  default: {
    investorReputation: {
      findMany: vi.fn(),
    },
  },
}));

import prisma from '@/lib/db/client';

const findMany = vi.mocked(
  (prisma as unknown as { investorReputation: { findMany: ReturnType<typeof vi.fn> } })
    .investorReputation.findMany,
);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const NOW = new Date('2026-05-08T12:00:00Z');

function makeRow(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    id: 'row-id',
    name: 'Sample Fund',
    slug: 'sample-fund',
    investorType: 'vc',
    geographicFocus: 'UK + EU',
    stageFocusJson: ['series_a'],
    sectorFocusJson: ['general'],
    reputationScore: 70,
    reputationBand: 'blue',
    patternsJson: ['standard_terms'],
    notes: null,
    source: 'admin',
    isActive: true,
    isArchived: false,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe('lookupInvestorReputations — empty input', () => {
  it('returns the empty result without calling Prisma', async () => {
    const result = await lookupInvestorReputations([]);
    expect(result.matched).toEqual([]);
    expect(result.unmatchedNames).toEqual([]);
    expect(result.averageReputationScore).toBeNull();
    expect(result.reputationTilt).toBe(0);
    expect(findMany).not.toHaveBeenCalled();
  });
});

describe('lookupInvestorReputations — slug-based matching', () => {
  it('matches case-insensitively via slug', async () => {
    findMany.mockResolvedValueOnce([
      makeRow({ name: 'Atomico', slug: 'atomico', reputationScore: 88 }),
    ]);
    const result = await lookupInvestorReputations(['ATOMICO']);
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0].name).toBe('Atomico');
    expect(result.unmatchedNames).toEqual([]);
  });

  it('handles whitespace and punctuation in slug normalisation', async () => {
    findMany.mockResolvedValueOnce([
      makeRow({ name: 'Octopus Ventures', slug: 'octopus-ventures', reputationScore: 70 }),
    ]);
    const result = await lookupInvestorReputations(['  Octopus Ventures!  ']);
    expect(result.matched).toHaveLength(1);
    /* The query was made with the normalised slug. */
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          slug: { in: expect.arrayContaining(['octopus-ventures']) },
        }),
      }),
    );
  });

  it('partitions matched + unmatched names', async () => {
    findMany.mockResolvedValueOnce([
      makeRow({ name: 'Atomico', slug: 'atomico', reputationScore: 88 }),
    ]);
    const result = await lookupInvestorReputations(['Atomico', 'Unknown Fund']);
    expect(result.matched.map((m) => m.name)).toEqual(['Atomico']);
    expect(result.unmatchedNames).toEqual(['Unknown Fund']);
  });

  it('de-duplicates input names by slug', async () => {
    findMany.mockResolvedValueOnce([
      makeRow({ name: 'Atomico', slug: 'atomico', reputationScore: 88 }),
    ]);
    const result = await lookupInvestorReputations(['Atomico', 'atomico', 'ATOMICO']);
    /* Only ONE matched record returned — slug de-duplication. */
    expect(result.matched).toHaveLength(1);
  });
});

describe('lookupInvestorReputations — averaging + tilt', () => {
  it('averages reputation across multiple matches and computes tilt', async () => {
    findMany.mockResolvedValueOnce([
      makeRow({ id: 'a', name: 'A', slug: 'a', reputationScore: 90 }),
      makeRow({ id: 'b', name: 'B', slug: 'b', reputationScore: 70 }),
    ]);
    const result = await lookupInvestorReputations(['A', 'B']);
    expect(result.averageReputationScore).toBe(80);
    /* Average 80 → centered (80-50)/50 = 0.6 → tilt = round(0.6 * 8) = 5 */
    expect(result.reputationTilt).toBe(5);
  });
});

describe('lookupInvestorReputations — DB failure soft-fallback', () => {
  it('returns no-tilt result when Prisma throws', async () => {
    findMany.mockRejectedValueOnce(new Error('DB unavailable'));
    const result = await lookupInvestorReputations(['Atomico']);
    expect(result.matched).toEqual([]);
    expect(result.reputationTilt).toBe(0);
    expect(result.averageReputationScore).toBeNull();
    /* Original name is preserved as unmatched so the UI can prompt
       the founder to submit a reputation entry. */
    expect(result.unmatchedNames).toEqual(['Atomico']);
  });
});
