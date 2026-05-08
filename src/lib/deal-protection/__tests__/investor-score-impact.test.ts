/**
 * Track P Session P4 — reputation tilt + cap-aware composition tests.
 *
 * The tilt formula is purely mathematical, so boundary cases are
 * verified directly. The cap-aware composition (`applyReputationTilt`)
 * is the integration with the P3 aggregator.
 */
import { describe, expect, it } from 'vitest';

import {
  CRITICAL_CEILING,
  HIGH_CEILING,
  REPUTATION_TILT_MAX,
  applyReputationTilt,
  computeReputationTilt,
} from '../investor-score-impact';

describe('computeReputationTilt — neutral cases', () => {
  it('returns 0 for an empty list', () => {
    expect(computeReputationTilt([])).toBe(0);
  });
  it('returns 0 for a single neutral score (50)', () => {
    expect(computeReputationTilt([50])).toBe(0);
  });
});

describe('computeReputationTilt — directional', () => {
  it('positive tilt for above-50 averages', () => {
    expect(computeReputationTilt([75])).toBeGreaterThan(0);
    expect(computeReputationTilt([90, 80, 85])).toBeGreaterThan(0);
  });
  it('negative tilt for below-50 averages', () => {
    expect(computeReputationTilt([25])).toBeLessThan(0);
    expect(computeReputationTilt([10, 20, 15])).toBeLessThan(0);
  });
});

describe('computeReputationTilt — bounds', () => {
  it('tilt for score 100 equals +REPUTATION_TILT_MAX', () => {
    expect(computeReputationTilt([100])).toBe(REPUTATION_TILT_MAX);
  });
  it('tilt for score 0 equals -REPUTATION_TILT_MAX', () => {
    expect(computeReputationTilt([0])).toBe(-REPUTATION_TILT_MAX);
  });
  it('tilt is always integer in [-REPUTATION_TILT_MAX, +REPUTATION_TILT_MAX]', () => {
    for (let s = 0; s <= 100; s += 5) {
      const t = computeReputationTilt([s]);
      expect(Number.isInteger(t)).toBe(true);
      expect(t).toBeGreaterThanOrEqual(-REPUTATION_TILT_MAX);
      expect(t).toBeLessThanOrEqual(REPUTATION_TILT_MAX);
    }
  });
  it('clamps out-of-range inputs (defensive)', () => {
    expect(computeReputationTilt([200])).toBe(REPUTATION_TILT_MAX);
    expect(computeReputationTilt([-50])).toBe(-REPUTATION_TILT_MAX);
  });
  it('skips non-finite values', () => {
    expect(computeReputationTilt([Number.NaN, 100])).toBe(REPUTATION_TILT_MAX);
    expect(computeReputationTilt([Number.NaN, Number.NaN])).toBe(0);
  });
});

describe('applyReputationTilt — no caps applied', () => {
  it('adds the tilt to the aggregated score', () => {
    expect(
      applyReputationTilt({
        aggregatedScore: 70,
        tilt: 5,
        hadCriticalCap: false,
        hadHighCap: false,
      }),
    ).toBe(75);
    expect(
      applyReputationTilt({
        aggregatedScore: 60,
        tilt: -8,
        hadCriticalCap: false,
        hadHighCap: false,
      }),
    ).toBe(52);
  });
  it('clamps the result to [0, 100]', () => {
    expect(
      applyReputationTilt({
        aggregatedScore: 95,
        tilt: 8,
        hadCriticalCap: false,
        hadHighCap: false,
      }),
    ).toBe(100);
    expect(
      applyReputationTilt({
        aggregatedScore: 5,
        tilt: -8,
        hadCriticalCap: false,
        hadHighCap: false,
      }),
    ).toBe(0);
  });
});

describe('applyReputationTilt — critical cap wins over positive tilt', () => {
  it('positive tilt cannot lift above CRITICAL_CEILING', () => {
    /* Aggregator already capped at 39; +8 tilt would push to 47, but
       cap re-applied → 39. This is the core "single dealbreaker stays
       a dealbreaker even with a famous investor" semantic. */
    expect(
      applyReputationTilt({
        aggregatedScore: 39,
        tilt: 8,
        hadCriticalCap: true,
        hadHighCap: false,
      }),
    ).toBe(CRITICAL_CEILING);
  });
  it('negative tilt below the cap is allowed', () => {
    expect(
      applyReputationTilt({
        aggregatedScore: 39,
        tilt: -8,
        hadCriticalCap: true,
        hadHighCap: false,
      }),
    ).toBe(31);
  });
});

describe('applyReputationTilt — high cap wins over positive tilt', () => {
  it('positive tilt cannot lift above HIGH_CEILING', () => {
    expect(
      applyReputationTilt({
        aggregatedScore: 79,
        tilt: 8,
        hadCriticalCap: false,
        hadHighCap: true,
      }),
    ).toBe(HIGH_CEILING);
  });
  it('negative tilt below the cap is allowed', () => {
    expect(
      applyReputationTilt({
        aggregatedScore: 79,
        tilt: -8,
        hadCriticalCap: false,
        hadHighCap: true,
      }),
    ).toBe(71);
  });
});

describe('applyReputationTilt — defensive clamping', () => {
  it('non-finite intermediate values collapse to 0', () => {
    expect(
      applyReputationTilt({
        aggregatedScore: Number.NaN,
        tilt: 5,
        hadCriticalCap: false,
        hadHighCap: false,
      }),
    ).toBe(0);
  });
});
