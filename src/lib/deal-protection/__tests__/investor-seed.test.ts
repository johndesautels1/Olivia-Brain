/**
 * Track P Session P4 — investor-seed unit tests.
 *
 * Module-load runtime invariants are also verified here so a future
 * edit that breaks band coverage / score calibration / name uniqueness
 * fails CI before reaching prod.
 */
import { describe, expect, it } from 'vitest';

import { INVESTOR_SEED_DATA } from '../investor-seed';
import { SMART_BANDS_ORDERED, type SmartBand } from '../types';

describe('INVESTOR_SEED_DATA — band coverage', () => {
  it('has at least one entry per smart band', () => {
    const bandsCovered = new Set(INVESTOR_SEED_DATA.map((r) => r.reputationBand));
    for (const band of SMART_BANDS_ORDERED) {
      expect(bandsCovered.has(band)).toBe(true);
    }
  });
});

describe('INVESTOR_SEED_DATA — score calibration', () => {
  const RANGES: Record<SmartBand, { min: number; max: number }> = {
    red: { min: 0, max: 19 },
    orange: { min: 20, max: 39 },
    yellow: { min: 40, max: 59 },
    blue: { min: 60, max: 79 },
    green: { min: 80, max: 100 },
  };

  it('every reputationScore lands inside its declared band', () => {
    for (const r of INVESTOR_SEED_DATA) {
      const range = RANGES[r.reputationBand];
      expect(r.reputationScore).toBeGreaterThanOrEqual(range.min);
      expect(r.reputationScore).toBeLessThanOrEqual(range.max);
    }
  });
});

describe('INVESTOR_SEED_DATA — name uniqueness', () => {
  it('no duplicate names', () => {
    const names = INVESTOR_SEED_DATA.map((r) => r.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('INVESTOR_SEED_DATA — archetype framing', () => {
  it('every name carries the "(Archetype)" suffix so admins can distinguish seed templates from curated entries', () => {
    for (const r of INVESTOR_SEED_DATA) {
      expect(r.name).toMatch(/Archetype\)$/);
    }
  });

  it('every entry includes a `notes` field flagging seed origin', () => {
    for (const r of INVESTOR_SEED_DATA) {
      expect(r.notes).toBeDefined();
      expect((r.notes ?? '').toLowerCase()).toContain('archetype');
    }
  });
});
