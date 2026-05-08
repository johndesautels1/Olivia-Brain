/**
 * Track P Session P5 — multi-round dilution unit tests.
 *
 * Per BUILD_SEQUENCE Track P row P5 exit criterion:
 * "Dilution projection produces correct numbers for 4 sample term
 * sheets (full-ratchet harsh, weighted-average normal, founder-friendly,
 * no-anti-dilution)."
 *
 * Each test scenario uses the same baseline cap table so the four
 * scenarios are directly comparable.
 */
import { describe, expect, it } from 'vitest';

import {
  applyRound,
  computeAdjustmentFactor,
  projectDilution,
} from '../multi-round';
import type {
  CapTableEntry,
  CapTableSnapshot,
  FutureRound,
  ProjectionInputs,
} from '../multi-round-types';

// ─────────────────────────────────────────────────────────────────────
// Shared baseline — Founder 60% / Series A 30% / ESOP 10% at £10/share.
// ─────────────────────────────────────────────────────────────────────

function baselineEntries(antiDilution: 'none' | 'full_ratchet' | 'weighted_average_broad' | 'weighted_average_narrow'): CapTableEntry[] {
  return [
    {
      holderId: 'founder',
      holderName: 'Founder',
      holderType: 'founder',
      shares: 6_000_000,
    },
    {
      holderId: 'investor_series_a',
      holderName: 'Series A',
      holderType: 'investor',
      shares: 3_000_000,
      preferredClass: 'series_a',
      antiDilutionType: antiDilution,
      originalPricePerShare: 10,
    },
    {
      holderId: 'esop',
      holderName: 'ESOP',
      holderType: 'esop',
      shares: 1_000_000,
    },
  ];
}

function baselineSnapshot(
  antiDilution: 'none' | 'full_ratchet' | 'weighted_average_broad' | 'weighted_average_narrow',
): CapTableSnapshot {
  /* 10M total shares, post-money £100M, PPS £10. */
  return {
    snapshotName: 'current',
    entries: baselineEntries(antiDilution),
    totalShares: 10_000_000,
    pricePerShare: 10,
    postMoneyGbp: 100_000_000,
  };
}

const DOWN_ROUND_50PCT: FutureRound = {
  /* Series B at £80M post-money (down from £100M), £20M for 25%, no
     ESOP top-up. New PPS = (80M − 20M) / 10M = £6 (down from £10). */
  roundName: 'series_b',
  postMoneyGbp: 80_000_000,
  newInvestorPct: 25,
  esopTopUpPct: 0,
  preferredClass: 'series_b',
  antiDilutionType: 'weighted_average_broad',
  isDownRound: true,
};

const FOUNDER_FRIENDLY_UP_ROUND: FutureRound = {
  /* Series B at £200M post-money (up from £100M), £40M for 20%, with
     a 5% ESOP top-up. Standard up-round dilution. */
  roundName: 'series_b',
  postMoneyGbp: 200_000_000,
  newInvestorPct: 20,
  esopTopUpPct: 5,
  preferredClass: 'series_b',
  antiDilutionType: 'weighted_average_broad',
  isDownRound: false,
};

const ownership = (snap: CapTableSnapshot, holderId: string): number => {
  const entry = snap.entries.find((e) => e.holderId === holderId);
  if (!entry || snap.totalShares <= 0) return 0;
  return (entry.shares / snap.totalShares) * 100;
};

// ─────────────────────────────────────────────────────────────────────
// Scenario 1 — full-ratchet harsh
// ─────────────────────────────────────────────────────────────────────

describe('projectDilution — scenario 1: full-ratchet harsh down round', () => {
  const inputs: ProjectionInputs = {
    initial: baselineSnapshot('full_ratchet'),
    rounds: [DOWN_ROUND_50PCT],
  };

  it('returns the initial snapshot plus one post-round snapshot', () => {
    const result = projectDilution(inputs);
    expect(result.snapshots).toHaveLength(2);
    expect(result.snapshots[0].snapshotName).toBe('current');
    expect(result.snapshots[1].snapshotName).toBe('after_series_b');
  });

  it('Series A roughly doubles shares under full ratchet (oldPPS/newPPS = £10/£6 ≈ 1.667)', () => {
    const result = projectDilution(inputs);
    const post = result.snapshots[1];
    const seriesA = post.entries.find((e) => e.holderId === 'investor_series_a');
    expect(seriesA).toBeDefined();
    /* 3M × (10/6) ≈ 5M shares. */
    expect(seriesA!.shares).toBeGreaterThan(4_900_000);
    expect(seriesA!.shares).toBeLessThan(5_100_000);
  });

  it('founder ownership drops from 60% to roughly 39%', () => {
    const result = projectDilution(inputs);
    const post = result.snapshots[1];
    const founderPct = ownership(post, 'founder');
    expect(founderPct).toBeGreaterThan(38);
    expect(founderPct).toBeLessThan(40);
  });

  it('founder trajectory has 2 points', () => {
    const result = projectDilution(inputs);
    expect(result.founderTrajectory).not.toBeNull();
    expect(result.founderTrajectory!.points).toHaveLength(2);
    expect(result.founderTrajectory!.points[0].ownershipPct).toBe(60);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Scenario 2 — weighted-average normal (broad)
// ─────────────────────────────────────────────────────────────────────

describe('projectDilution — scenario 2: weighted-average normal down round', () => {
  const inputs: ProjectionInputs = {
    initial: baselineSnapshot('weighted_average_broad'),
    rounds: [DOWN_ROUND_50PCT],
  };

  it('Series A receives a smaller bonus than under full ratchet', () => {
    /* WA broad: factor = (A + C) / (A + B) where A = 10M (broad incl ESOP),
       B = £20M / £10 = 2M, C = £20M / £6 ≈ 3.33M.
       factor = (10 + 3.33) / (10 + 2) = 13.33 / 12 ≈ 1.111
       Series A shares: 3M × 1.111 ≈ 3.333M. */
    const result = projectDilution(inputs);
    const post = result.snapshots[1];
    const seriesA = post.entries.find((e) => e.holderId === 'investor_series_a');
    expect(seriesA).toBeDefined();
    expect(seriesA!.shares).toBeGreaterThan(3_300_000);
    expect(seriesA!.shares).toBeLessThan(3_400_000);
  });

  it('founder ownership drops to ~44% — better than full ratchet', () => {
    const result = projectDilution(inputs);
    const post = result.snapshots[1];
    const founderPct = ownership(post, 'founder');
    expect(founderPct).toBeGreaterThan(43);
    expect(founderPct).toBeLessThan(45);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Scenario 3 — founder-friendly (up round, no protection trigger)
// ─────────────────────────────────────────────────────────────────────

describe('projectDilution — scenario 3: founder-friendly up round', () => {
  const inputs: ProjectionInputs = {
    initial: baselineSnapshot('weighted_average_broad'),
    rounds: [FOUNDER_FRIENDLY_UP_ROUND],
  };

  it('Series A does NOT get bonus shares on an up round', () => {
    const result = projectDilution(inputs);
    const post = result.snapshots[1];
    const seriesA = post.entries.find((e) => e.holderId === 'investor_series_a');
    expect(seriesA).toBeDefined();
    /* Original 3M shares unchanged; only the % dilutes. */
    expect(seriesA!.shares).toBe(3_000_000);
  });

  it('founder dilutes proportionally with everyone (no ratchet)', () => {
    const result = projectDilution(inputs);
    const post = result.snapshots[1];
    const founderPct = ownership(post, 'founder');
    /* 5% ESOP top-up + 20% new investor → roughly 60% × 0.95 × 0.80 = 45.6%. */
    expect(founderPct).toBeGreaterThan(44);
    expect(founderPct).toBeLessThan(47);
  });

  it('new investor ownership ≈ 20%', () => {
    const result = projectDilution(inputs);
    const post = result.snapshots[1];
    const newInvestor = post.entries.find(
      (e) => e.holderId === 'investor_series_b',
    );
    expect(newInvestor).toBeDefined();
    const pct = ownership(post, 'investor_series_b');
    expect(pct).toBeGreaterThan(19.5);
    expect(pct).toBeLessThan(20.5);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Scenario 4 — no anti-dilution
// ─────────────────────────────────────────────────────────────────────

describe('projectDilution — scenario 4: no anti-dilution down round', () => {
  const inputs: ProjectionInputs = {
    initial: baselineSnapshot('none'),
    rounds: [DOWN_ROUND_50PCT],
  };

  it('Series A gets no bonus shares (antiDilution=none)', () => {
    const result = projectDilution(inputs);
    const post = result.snapshots[1];
    const seriesA = post.entries.find((e) => e.holderId === 'investor_series_a');
    expect(seriesA!.shares).toBe(3_000_000);
  });

  it('founder ownership ≈ 45% — better than both ratchet scenarios', () => {
    const result = projectDilution(inputs);
    const post = result.snapshots[1];
    const founderPct = ownership(post, 'founder');
    /* No ratchet → founder dilutes only by the new investor's 25%. */
    expect(founderPct).toBeGreaterThan(44);
    expect(founderPct).toBeLessThan(46);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Scenario monotonicity — ratchet ordering
// ─────────────────────────────────────────────────────────────────────

describe('projectDilution — ratchet severity ordering', () => {
  it('founder ownership: full_ratchet < weighted_average_broad < none on the same down round', () => {
    const fullRatchet = projectDilution({
      initial: baselineSnapshot('full_ratchet'),
      rounds: [DOWN_ROUND_50PCT],
    });
    const waBroad = projectDilution({
      initial: baselineSnapshot('weighted_average_broad'),
      rounds: [DOWN_ROUND_50PCT],
    });
    const noProtection = projectDilution({
      initial: baselineSnapshot('none'),
      rounds: [DOWN_ROUND_50PCT],
    });

    const fr = ownership(fullRatchet.snapshots[1], 'founder');
    const wa = ownership(waBroad.snapshots[1], 'founder');
    const none = ownership(noProtection.snapshots[1], 'founder');

    /* Strict ordering: harsh < normal < none. */
    expect(fr).toBeLessThan(wa);
    expect(wa).toBeLessThan(none);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Multi-round chaining
// ─────────────────────────────────────────────────────────────────────

describe('projectDilution — two future rounds', () => {
  it('chains snapshots correctly across two rounds', () => {
    const result = projectDilution({
      initial: baselineSnapshot('weighted_average_broad'),
      rounds: [FOUNDER_FRIENDLY_UP_ROUND, FOUNDER_FRIENDLY_UP_ROUND],
    });
    expect(result.snapshots).toHaveLength(3);
    expect(result.founderTrajectory!.points).toHaveLength(3);
    /* Founder ownership monotonically decreases across each round. */
    const f0 = result.founderTrajectory!.points[0].ownershipPct;
    const f1 = result.founderTrajectory!.points[1].ownershipPct;
    const f2 = result.founderTrajectory!.points[2].ownershipPct;
    expect(f0).toBeGreaterThan(f1);
    expect(f1).toBeGreaterThan(f2);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Adjustment factor — direct unit tests
// ─────────────────────────────────────────────────────────────────────

describe('computeAdjustmentFactor — direct', () => {
  it('returns 1.0 for non-down round (newPPS >= oldPPS)', () => {
    expect(
      computeAdjustmentFactor({
        type: 'full_ratchet',
        oldPPS: 10,
        newPPS: 12,
        sharesPreRoundBroad: 10_000_000,
        sharesPreRoundNarrow: 9_000_000,
        newInvestorCash: 20_000_000,
      }),
    ).toBe(1);
  });

  it('full_ratchet factor = oldPPS / newPPS', () => {
    expect(
      computeAdjustmentFactor({
        type: 'full_ratchet',
        oldPPS: 10,
        newPPS: 5,
        sharesPreRoundBroad: 10_000_000,
        sharesPreRoundNarrow: 9_000_000,
        newInvestorCash: 20_000_000,
      }),
    ).toBe(2);
  });

  it('full_ratchet factor caps at MAX_RATCHET_FACTOR for degenerate near-zero newPPS', () => {
    const factor = computeAdjustmentFactor({
      type: 'full_ratchet',
      oldPPS: 10,
      newPPS: 0.0001,
      sharesPreRoundBroad: 10_000_000,
      sharesPreRoundNarrow: 9_000_000,
      newInvestorCash: 20_000_000,
    });
    expect(factor).toBeLessThanOrEqual(100);
  });

  it('weighted_average_broad uses broad share base', () => {
    const broad = computeAdjustmentFactor({
      type: 'weighted_average_broad',
      oldPPS: 10,
      newPPS: 6,
      sharesPreRoundBroad: 10_000_000,
      sharesPreRoundNarrow: 9_000_000,
      newInvestorCash: 20_000_000,
    });
    /* (10M + 3.333M) / (10M + 2M) = 13.333M / 12M ≈ 1.111 */
    expect(broad).toBeGreaterThan(1.10);
    expect(broad).toBeLessThan(1.12);
  });

  it('weighted_average_narrow gives a slightly bigger bonus than broad (narrower base)', () => {
    const narrow = computeAdjustmentFactor({
      type: 'weighted_average_narrow',
      oldPPS: 10,
      newPPS: 6,
      sharesPreRoundBroad: 10_000_000,
      sharesPreRoundNarrow: 9_000_000,
      newInvestorCash: 20_000_000,
    });
    const broad = computeAdjustmentFactor({
      type: 'weighted_average_broad',
      oldPPS: 10,
      newPPS: 6,
      sharesPreRoundBroad: 10_000_000,
      sharesPreRoundNarrow: 9_000_000,
      newInvestorCash: 20_000_000,
    });
    expect(narrow).toBeGreaterThan(broad);
  });

  it('returns 1.0 when type is none', () => {
    expect(
      computeAdjustmentFactor({
        type: 'none',
        oldPPS: 10,
        newPPS: 5,
        sharesPreRoundBroad: 10_000_000,
        sharesPreRoundNarrow: 9_000_000,
        newInvestorCash: 20_000_000,
      }),
    ).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────
// applyRound — pure-function expectations
// ─────────────────────────────────────────────────────────────────────

describe('applyRound — does not mutate input', () => {
  it('input snapshot entries unchanged after applyRound returns', () => {
    const initial = baselineSnapshot('full_ratchet');
    const before = initial.entries.map((e) => ({ ...e }));
    applyRound(initial, DOWN_ROUND_50PCT);
    expect(initial.entries.map((e) => ({ ...e }))).toEqual(before);
  });
});
