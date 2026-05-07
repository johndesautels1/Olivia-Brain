/**
 * Round-trip tests for the Quantara field-mapping helpers.
 *
 * Pure in-memory: build a `QuantaraValues` payload → project to
 * `ValuationSubject` shape → unproject back → assert equality. No Prisma
 * write; no DB harness. The destination map plus the wrap/unwrap helpers
 * are what we're verifying.
 *
 * Cross-field semantic invariants (e.g. patentsGranted ≤ patentsFiled,
 * fullyDilutedShares > optionPoolPct % implied minimum) are NOT tested
 * here — those land in Q4 (validation cascade) where they surface as
 * discrepancy chips.
 */
import { describe, expect, it } from 'vitest';
import {
  quantaraToValuationSubject,
  valuationSubjectToQuantara,
  mergeQuantaraIntoSubject,
  QUANTARA_FIELD_DESTINATIONS,
} from '../field-mapping';
import { QUANTARA_FIELDS } from '../schema';
import type {
  QuantaraFieldId,
  QuantaraValues,
  QuantaraValuationSubjectShape,
} from '../types';

// ── Fixtures ───────────────────────────────────────────────────────────

/**
 * Fully-populated Quantara payload — values mirror the LTM form's
 * default `<input value="...">` attributes for the "Aether — Founder
 * Valuation Profile" demo subject (Quantara Ltd, Dr Elena Vasquez).
 */
const FULL_VALUES: Required<{ [K in QuantaraFieldId]: unknown }> = {
  // Core Financials
  f1: 2_450_000,
  f2: 204_167,
  f3: 127,
  f4: 9.8,
  f5: 82,
  f6: -14,
  f7: -285_000,
  f8: 142_000,
  f9: 18,
  f10: 1850,
  f11: 12_400,
  f12: 6.7,
  f13: 124,
  f14: 97,
  // Capital Structure
  f15: 2_560_000,
  f16: 420_000,
  f17: 12_450_000,
  f18: 12.4,
  // Funding History
  f19: 4_850_000,
  f20: 12_500_000,
  f21: 'Series A',
  // Current Round
  f22: 6_000_000,
  f23: 'Series A',
  // Traction
  f24: 184,
  f25: 3_120_000,
  f26: 12_400,
  f27: 1.8,
  f28: 27,
  f29: 132_000,
  // Market
  f30: 48_000_000_000,
  f31: 8_200_000_000,
  f32: 410_000_000,
  f33: 23.4,
  // IP & Moat
  f34: 7,
  f35: 3,
  f36: '2.8M anonymized financial transactions',
  f37: 28,
  f38: 'FCA authorised, ISO 27001, SOC 2 Type II',
  f39: 8,
  // Team
  f40: 42,
  f41: 64,
  f42: 11,
  f43: 'Yes — sold previous fintech to Stripe (2021, £38M)',
  f44: 3,
  // Risk
  f45: 18,
  f46: 'UK 58%, Germany 22%, US 14%, Rest 6%',
  f47: 4,
  // Growth Levers
  f48: 34,
  f49: 1.4,
  f50: 42,
  f51: 31,
  // Projections
  f52: 8_750_000,
  f53: 19_200_000,
  f54: 41_500_000,
  f55: 14,
  // Strategic
  f56: 5,
};

/** Sparse payload — only a few fields populated. */
const SPARSE_VALUES: QuantaraValues = {
  f1: 1_000_000,
  f17: 10_000_000,
  f23: 'Seed',
  f56: 7,
};

// ── Projection direction ───────────────────────────────────────────────

describe('quantaraToValuationSubject', () => {
  it('places metric-wrapped fields in the engine JSON columns with MetricEvidence shape', () => {
    const subject = quantaraToValuationSubject(FULL_VALUES);

    // f1 ARR → financialDataJson.arr (wrapped)
    expect(subject.financialDataJson?.arr).toEqual({
      value: 2_450_000,
      refs: [],
      confidence: 0.7,
    });
    // f15 Cash on Hand → capitalDataJson.cashOnHand (wrapped)
    expect(subject.capitalDataJson?.cashOnHand).toEqual({
      value: 2_560_000,
      refs: [],
      confidence: 0.7,
    });
    // f30 TAM → marketDataJson.tam (wrapped)
    expect(subject.marketDataJson?.tam).toEqual({
      value: 48_000_000_000,
      refs: [],
      confidence: 0.7,
    });
  });

  it('places net-new fields in quantaraJson without MetricEvidence wrapping', () => {
    const subject = quantaraToValuationSubject(FULL_VALUES);

    // Net-new numeric: stored as a plain number.
    expect(subject.quantaraJson?.mrr).toBe(204_167);
    expect(subject.quantaraJson?.targetRaiseAmount).toBe(6_000_000);
    expect(subject.quantaraJson?.networkEffectsScore).toBe(8);
    // Enum: plain string.
    expect(subject.quantaraJson?.lastRoundType).toBe('Series A');
    expect(subject.quantaraJson?.targetRoundType).toBe('Series A');
    // Free text: plain string.
    expect(subject.quantaraJson?.geographicConcentrationText).toBe(
      'UK 58%, Germany 22%, US 14%, Rest 6%',
    );
  });

  it('places f35 patentsGranted into ipDataJson.patentsCount as plain (engine consumes a single count)', () => {
    const subject = quantaraToValuationSubject(FULL_VALUES);
    expect(subject.ipDataJson?.patentsCount).toBe(3);
    // f34 patentsFiled is Quantara-only.
    expect(subject.quantaraJson?.patentsFiled).toBe(7);
  });

  it('skips undefined values without over-projecting', () => {
    const subject = quantaraToValuationSubject({ f1: 100 });

    // Only f1's column should be populated.
    expect(subject.financialDataJson).toEqual({
      arr: { value: 100, refs: [], confidence: 0.7 },
    });
    expect(subject.capitalDataJson).toBeUndefined();
    expect(subject.marketDataJson).toBeUndefined();
    expect(subject.fundingDataJson).toBeUndefined();
    expect(subject.ipDataJson).toBeUndefined();
    expect(subject.quantaraJson).toBeUndefined();
  });

  it('skips null values', () => {
    const subject = quantaraToValuationSubject({
      f1: null as unknown as number,
      f17: 100,
    });
    expect(subject.financialDataJson).toBeUndefined();
    expect(subject.capitalDataJson).toEqual({
      fullyDilutedShares: { value: 100, refs: [], confidence: 0.7 },
    });
  });
});

describe('valuationSubjectToQuantara', () => {
  it('round-trips the full payload losslessly for every field', () => {
    const subject = quantaraToValuationSubject(FULL_VALUES);
    const recovered = valuationSubjectToQuantara(subject);

    for (const f of QUANTARA_FIELDS) {
      expect(recovered[f.id]).toEqual(FULL_VALUES[f.id]);
    }
  });

  it('round-trips a sparse payload without inventing values', () => {
    const subject = quantaraToValuationSubject(SPARSE_VALUES);
    const recovered = valuationSubjectToQuantara(subject);

    expect(recovered).toEqual(SPARSE_VALUES);
    // Confirm absent fields are NOT present (not even with undefined).
    expect('f2' in recovered).toBe(false);
    expect('f55' in recovered).toBe(false);
  });

  it('returns an empty object when the subject has no JSON data', () => {
    const empty: QuantaraValuationSubjectShape = {};
    expect(valuationSubjectToQuantara(empty)).toEqual({});
  });

  it('ignores subkeys that are not part of the destination map', () => {
    const subject: QuantaraValuationSubjectShape = {
      financialDataJson: {
        arr: { value: 100, refs: [], confidence: 0.5 },
        unrelatedSubkey: { value: 999, refs: [], confidence: 0.5 },
      },
      quantaraJson: {
        someOtherKey: 'ignore me',
      },
    };
    const recovered = valuationSubjectToQuantara(subject);
    expect(recovered).toEqual({ f1: 100 });
  });
});

// ── Merge ──────────────────────────────────────────────────────────────

describe('mergeQuantaraIntoSubject', () => {
  it('preserves existing JSON-column subkeys not touched by the new values', () => {
    const existing: QuantaraValuationSubjectShape = {
      financialDataJson: {
        arr: { value: 1_000_000, refs: [], confidence: 0.5 },
        // Pre-existing engine-only subkey not in Quantara's map; must survive.
        ebitdaMarginPct: { value: -8.5, refs: [], confidence: 0.5 },
      },
      quantaraJson: {
        // Pre-existing Quantara subkey not in the new write; must survive.
        previousExitsText: 'Sold A to B (2018)',
      },
    };

    const merged = mergeQuantaraIntoSubject(existing, {
      f1: 2_000_000, // overwrites arr
      f3: 50, // adds growthYoYPct
    });

    expect(merged.financialDataJson?.arr).toEqual({
      value: 2_000_000,
      refs: [],
      confidence: 0.7,
    });
    expect(merged.financialDataJson?.growthYoYPct).toEqual({
      value: 50,
      refs: [],
      confidence: 0.7,
    });
    expect(merged.financialDataJson?.ebitdaMarginPct).toEqual({
      value: -8.5,
      refs: [],
      confidence: 0.5,
    });
    expect(merged.quantaraJson?.previousExitsText).toBe('Sold A to B (2018)');
  });

  it('leaves untouched JSON columns as-is when no new values target them', () => {
    const existing: QuantaraValuationSubjectShape = {
      financialDataJson: {
        arr: { value: 1, refs: [], confidence: 0.5 },
      },
      capitalDataJson: { cashOnHand: { value: 9, refs: [], confidence: 0.9 } },
    };
    const merged = mergeQuantaraIntoSubject(existing, { f3: 25 });

    // financialDataJson got a new subkey but kept the old.
    expect(merged.financialDataJson?.arr).toEqual({
      value: 1,
      refs: [],
      confidence: 0.5,
    });
    expect(merged.financialDataJson?.growthYoYPct).toBeDefined();

    // capitalDataJson untouched — should be the original reference.
    expect(merged.capitalDataJson).toEqual(existing.capitalDataJson);
  });
});

// ── Destination-map invariants ─────────────────────────────────────────

describe('QUANTARA_FIELD_DESTINATIONS', () => {
  it('has a destination for every field id', () => {
    for (const f of QUANTARA_FIELDS) {
      expect(QUANTARA_FIELD_DESTINATIONS[f.id]).toBeDefined();
    }
  });

  it('every destination subkey within a JSON column is unique within that column', () => {
    const seen = new Map<string, Set<string>>();
    for (const dest of Object.values(QUANTARA_FIELD_DESTINATIONS)) {
      if (!('subkey' in dest)) continue;
      const bucket = seen.get(dest.column) ?? new Set<string>();
      expect(bucket.has(dest.subkey)).toBe(false);
      bucket.add(dest.subkey);
      seen.set(dest.column, bucket);
    }
  });
});
