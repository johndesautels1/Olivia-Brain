/**
 * Track P Session P1 — smart-score module unit tests.
 *
 * Exit criterion from BUILD_SEQUENCE Q row P1:
 *   "`getSmartBand(score)` returns correct band for boundary scores."
 *
 * Boundary coverage (every 0/20/40/60/80/100 plus immediate
 * neighbours), out-of-range / non-finite handling, lookup-table
 * round-trips, and contiguous coverage invariants.
 */
import { describe, expect, it } from 'vitest';

import {
  bandsAgree,
  clampSmartScore,
  getSmartBand,
  getSmartBandRecord,
  getSmartBandRecordByAction,
  getSmartBandRecordById,
} from '../smart-score';
import {
  SMART_BANDS,
  SMART_BANDS_BY_ACTION,
  SMART_BANDS_BY_ID,
} from '../bands';
import {
  SMART_BANDS_ORDERED,
  type SmartBand,
} from '../types';

// ── Catalog invariants ────────────────────────────────────────────────

describe('SMART_BANDS catalog', () => {
  it('contains exactly 5 bands', () => {
    expect(SMART_BANDS).toHaveLength(5);
  });

  it('band ids match SMART_BANDS_ORDERED', () => {
    const ids = SMART_BANDS.map((b) => b.band);
    expect(ids).toEqual([...SMART_BANDS_ORDERED]);
  });

  it('covers 0..100 contiguously with no gaps or overlaps', () => {
    let cursor = 0;
    for (const b of SMART_BANDS) {
      expect(b.minScore).toBe(cursor);
      expect(b.maxScore).toBeGreaterThanOrEqual(b.minScore);
      cursor = b.maxScore + 1;
    }
    expect(cursor).toBe(101);
  });

  it('has unique action enums', () => {
    const actions = SMART_BANDS.map((b) => b.action);
    expect(new Set(actions).size).toBe(actions.length);
  });

  it('lookup tables mirror the array', () => {
    for (const b of SMART_BANDS) {
      expect(SMART_BANDS_BY_ID[b.band]).toBe(b);
      expect(SMART_BANDS_BY_ACTION[b.action]).toBe(b);
    }
  });
});

// ── clampSmartScore ──────────────────────────────────────────────────

describe('clampSmartScore', () => {
  it('passes through scores already in range', () => {
    expect(clampSmartScore(0)).toBe(0);
    expect(clampSmartScore(50)).toBe(50);
    expect(clampSmartScore(100)).toBe(100);
  });

  it('clamps below-range scores to 0', () => {
    expect(clampSmartScore(-1)).toBe(0);
    expect(clampSmartScore(-9999)).toBe(0);
  });

  it('clamps above-range scores to 100', () => {
    expect(clampSmartScore(101)).toBe(100);
    expect(clampSmartScore(99999)).toBe(100);
  });

  it('collapses non-finite scores to 0 (predatory floor)', () => {
    expect(clampSmartScore(Number.NaN)).toBe(0);
    expect(clampSmartScore(Number.POSITIVE_INFINITY)).toBe(0);
    expect(clampSmartScore(Number.NEGATIVE_INFINITY)).toBe(0);
  });
});

// ── getSmartBand: boundary coverage ──────────────────────────────────

describe('getSmartBand — boundary scores', () => {
  it('classifies the lower edge of red (0) as red', () => {
    expect(getSmartBand(0)).toBe('red');
  });

  it('classifies the upper edge of red (19) as red', () => {
    expect(getSmartBand(19)).toBe('red');
  });

  it('classifies the lower edge of orange (20) as orange', () => {
    expect(getSmartBand(20)).toBe('orange');
  });

  it('classifies the upper edge of orange (39) as orange', () => {
    expect(getSmartBand(39)).toBe('orange');
  });

  it('classifies the lower edge of yellow (40) as yellow', () => {
    expect(getSmartBand(40)).toBe('yellow');
  });

  it('classifies the upper edge of yellow (59) as yellow', () => {
    expect(getSmartBand(59)).toBe('yellow');
  });

  it('classifies the lower edge of blue (60) as blue', () => {
    expect(getSmartBand(60)).toBe('blue');
  });

  it('classifies the upper edge of blue (79) as blue', () => {
    expect(getSmartBand(79)).toBe('blue');
  });

  it('classifies the lower edge of green (80) as green', () => {
    expect(getSmartBand(80)).toBe('green');
  });

  it('classifies the upper edge of green (100) as green', () => {
    expect(getSmartBand(100)).toBe('green');
  });
});

// ── getSmartBand: clamping behavior ──────────────────────────────────

describe('getSmartBand — out-of-range', () => {
  it('clamps negative scores into red', () => {
    expect(getSmartBand(-50)).toBe('red');
  });

  it('clamps overflow scores into green', () => {
    expect(getSmartBand(150)).toBe('green');
  });

  it('returns red for non-finite inputs', () => {
    expect(getSmartBand(Number.NaN)).toBe('red');
    expect(getSmartBand(Number.POSITIVE_INFINITY)).toBe('red');
    expect(getSmartBand(Number.NEGATIVE_INFINITY)).toBe('red');
  });

  it('handles fractional scores within band ranges', () => {
    expect(getSmartBand(19.99)).toBe('red');
    expect(getSmartBand(20.01)).toBe('orange');
    expect(getSmartBand(79.999)).toBe('blue');
    expect(getSmartBand(80.0001)).toBe('green');
  });
});

// ── getSmartBandRecord helpers ───────────────────────────────────────

describe('getSmartBandRecord', () => {
  it('returns the matching record for a known score', () => {
    const rec = getSmartBandRecord(72);
    expect(rec.band).toBe('blue');
    expect(rec.action).toBe('counter_minor');
    expect(rec.colorToken).toBe('--aether-primary');
  });

  it('returns the green record at score 100', () => {
    const rec = getSmartBandRecord(100);
    expect(rec.band).toBe('green');
    expect(rec.actionLabel.toLowerCase()).toContain('sign');
  });
});

describe('getSmartBandRecordById', () => {
  it('round-trips every band id', () => {
    for (const id of SMART_BANDS_ORDERED) {
      const rec = getSmartBandRecordById(id);
      expect(rec.band).toBe(id);
    }
  });
});

describe('getSmartBandRecordByAction', () => {
  it('looks up every action enum', () => {
    expect(getSmartBandRecordByAction('walk_away').band).toBe('red');
    expect(getSmartBandRecordByAction('major_concerns').band).toBe('orange');
    expect(getSmartBandRecordByAction('negotiate_hard').band).toBe('yellow');
    expect(getSmartBandRecordByAction('counter_minor').band).toBe('blue');
    expect(getSmartBandRecordByAction('sign').band).toBe('green');
  });
});

// ── bandsAgree ───────────────────────────────────────────────────────

describe('bandsAgree', () => {
  it('returns true for two scores in the same band', () => {
    expect(bandsAgree(60, 79)).toBe(true);
    expect(bandsAgree(0, 19)).toBe(true);
  });

  it('returns false across band boundaries', () => {
    expect(bandsAgree(19, 20)).toBe(false);
    expect(bandsAgree(79, 80)).toBe(false);
  });

  it('treats both clamped values as red when both are non-finite', () => {
    expect(bandsAgree(Number.NaN, Number.POSITIVE_INFINITY)).toBe(true);
  });
});

// ── Per-band copy invariants ─────────────────────────────────────────

describe('per-band copy', () => {
  it('every band has a non-empty language + investorSignal + actionLabel', () => {
    for (const b of SMART_BANDS) {
      expect(b.language.length).toBeGreaterThan(20);
      expect(b.investorSignal.length).toBeGreaterThan(0);
      expect(b.actionLabel.length).toBeGreaterThan(0);
    }
  });

  it('uses the correct color token per band', () => {
    /* Aurum is reserved for canonical decisions; bands use the
       semantic accent set per § 1.4 of the UI design system. */
    expect(SMART_BANDS_BY_ID.red.colorToken).toBe('--coral-down');
    expect(SMART_BANDS_BY_ID.orange.colorToken).toBe('--amber-warn');
    expect(SMART_BANDS_BY_ID.yellow.colorToken).toBe('--sky-info');
    expect(SMART_BANDS_BY_ID.blue.colorToken).toBe('--aether-primary');
    expect(SMART_BANDS_BY_ID.green.colorToken).toBe('--mint-up');
  });

  it('language references investor / deal stance, not specific clauses', () => {
    /* Sanity check: per-band copy stays at the deal level so per-clause
       analysis (P2) can be appended without conflict. */
    for (const b of SMART_BANDS) {
      expect(b.language.toLowerCase()).not.toContain('liquidation preference');
      expect(b.language.toLowerCase()).not.toContain('anti-dilution');
    }
  });
});

// ── Type-shape invariants ────────────────────────────────────────────

describe('SmartBand type', () => {
  it('SMART_BANDS_ORDERED contains exactly the runtime band ids', () => {
    const runtime: SmartBand[] = ['red', 'orange', 'yellow', 'blue', 'green'];
    expect([...SMART_BANDS_ORDERED]).toEqual(runtime);
  });
});
