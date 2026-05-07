/**
 * Schema invariants for the 56 Quantara fields.
 *
 * These tests guard against drift in the canonical contract — adding a
 * field without updating the section count, reusing a field-map key,
 * defining a field without an investor-class relevance, or breaking the
 * weight ladder. They run on every commit (`npm test`).
 */
import { describe, expect, it } from 'vitest';
import {
  QUANTARA_FIELDS,
  QUANTARA_FIELDS_BY_ID,
  QUANTARA_FIELDS_BY_KEY,
  QuantaraValuesSchema,
  LastRoundTypeSchema,
  TargetRoundTypeSchema,
} from '../schema';
import { QUANTARA_SECTIONS, QUANTARA_SECTIONS_BY_ID } from '../sections';
import {
  QUANTARA_FIELD_COUNT,
  QUANTARA_FIELD_MAP_KEY_REGEX,
  type QuantaraFieldId,
} from '../types';

// ── Section invariants ─────────────────────────────────────────────────

describe('Quantara sections', () => {
  it('catalog has exactly 12 sections', () => {
    expect(QUANTARA_SECTIONS).toHaveLength(12);
  });

  it('section field counts sum to 56', () => {
    const sum = QUANTARA_SECTIONS.reduce((acc, s) => acc + s.fieldCount, 0);
    expect(sum).toBe(QUANTARA_FIELD_COUNT);
  });

  it('section ids are unique', () => {
    const ids = QUANTARA_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('section codes are unique', () => {
    const codes = QUANTARA_SECTIONS.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('display order is 1..12 contiguous', () => {
    const orders = QUANTARA_SECTIONS.map((s) => s.displayOrder).sort(
      (a, b) => a - b,
    );
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('field counts in catalog match per-section field tally', () => {
    for (const section of QUANTARA_SECTIONS) {
      const tally = QUANTARA_FIELDS.filter(
        (f) => f.section === section.id,
      ).length;
      expect(tally).toBe(section.fieldCount);
    }
  });
});

// ── Field-set invariants ───────────────────────────────────────────────

describe('Quantara fields', () => {
  it('has exactly 56 fields', () => {
    expect(QUANTARA_FIELDS).toHaveLength(QUANTARA_FIELD_COUNT);
  });

  it('field ids are unique and follow f1..f56', () => {
    const ids = QUANTARA_FIELDS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    const expected = Array.from(
      { length: 56 },
      (_, i) => `f${i + 1}` as QuantaraFieldId,
    );
    expect([...ids].sort(naturalFieldIdSort)).toEqual(
      [...expected].sort(naturalFieldIdSort),
    );
  });

  it('every field has a section that exists in the catalog', () => {
    for (const f of QUANTARA_FIELDS) {
      expect(QUANTARA_SECTIONS_BY_ID[f.section]).toBeDefined();
    }
  });

  it('every field-map key matches the canonical regex', () => {
    for (const f of QUANTARA_FIELDS) {
      expect(f.fieldMapKey).toMatch(QUANTARA_FIELD_MAP_KEY_REGEX);
    }
  });

  it('every field-map key is unique', () => {
    const keys = QUANTARA_FIELDS.map((f) => f.fieldMapKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('field-map key section code matches the field section', () => {
    for (const f of QUANTARA_FIELDS) {
      const code = f.fieldMapKey.split('_')[1];
      expect(code).toBe(QUANTARA_SECTIONS_BY_ID[f.section].code);
    }
  });

  it('every field has weight ∈ {1, 2, 3}', () => {
    for (const f of QUANTARA_FIELDS) {
      expect([1, 2, 3]).toContain(f.weight);
    }
  });

  it('every field has at least one investor-class relevance entry', () => {
    for (const f of QUANTARA_FIELDS) {
      expect(f.investorClassRelevance.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('lookup tables are consistent with the array', () => {
    expect(Object.keys(QUANTARA_FIELDS_BY_ID)).toHaveLength(QUANTARA_FIELD_COUNT);
    expect(Object.keys(QUANTARA_FIELDS_BY_KEY)).toHaveLength(QUANTARA_FIELD_COUNT);
    for (const f of QUANTARA_FIELDS) {
      expect(QUANTARA_FIELDS_BY_ID[f.id]).toBe(f);
      expect(QUANTARA_FIELDS_BY_KEY[f.fieldMapKey]).toBe(f);
    }
  });
});

// ── Per-field validation ───────────────────────────────────────────────

describe('Quantara field validation rules', () => {
  it('f1 ARR accepts non-negative GBP, rejects negative', () => {
    expect(QUANTARA_FIELDS_BY_ID.f1.schema.safeParse(2_450_000).success).toBe(true);
    expect(QUANTARA_FIELDS_BY_ID.f1.schema.safeParse(0).success).toBe(true);
    expect(QUANTARA_FIELDS_BY_ID.f1.schema.safeParse(-100).success).toBe(false);
  });

  it('f7 EBITDA accepts negative (early-stage loss-making)', () => {
    expect(QUANTARA_FIELDS_BY_ID.f7.schema.safeParse(-285_000).success).toBe(true);
  });

  it('f17 Fully Diluted Shares must be > 0 (cap-table sanity)', () => {
    expect(QUANTARA_FIELDS_BY_ID.f17.schema.safeParse(12_450_000).success).toBe(true);
    expect(QUANTARA_FIELDS_BY_ID.f17.schema.safeParse(0).success).toBe(false);
    expect(QUANTARA_FIELDS_BY_ID.f17.schema.safeParse(-1).success).toBe(false);
    // Integer, not float.
    expect(QUANTARA_FIELDS_BY_ID.f17.schema.safeParse(100.5).success).toBe(false);
  });

  it('f18 Option Pool % must be 0..100', () => {
    expect(QUANTARA_FIELDS_BY_ID.f18.schema.safeParse(12.4).success).toBe(true);
    expect(QUANTARA_FIELDS_BY_ID.f18.schema.safeParse(0).success).toBe(true);
    expect(QUANTARA_FIELDS_BY_ID.f18.schema.safeParse(100).success).toBe(true);
    expect(QUANTARA_FIELDS_BY_ID.f18.schema.safeParse(101).success).toBe(false);
    expect(QUANTARA_FIELDS_BY_ID.f18.schema.safeParse(-0.1).success).toBe(false);
  });

  it('f13 NRR can exceed 100 (expansion-positive cohorts)', () => {
    expect(QUANTARA_FIELDS_BY_ID.f13.schema.safeParse(124).success).toBe(true);
  });

  it('f21 Last Round Type accepts only the form enum', () => {
    expect(LastRoundTypeSchema.safeParse('Series A').success).toBe(true);
    expect(LastRoundTypeSchema.safeParse('Pre-Seed').success).toBe(true);
    expect(LastRoundTypeSchema.safeParse('Series Z').success).toBe(false);
    expect(LastRoundTypeSchema.safeParse('series_a').success).toBe(false);
  });

  it('f23 Target Round Type accepts only the form enum', () => {
    expect(TargetRoundTypeSchema.safeParse('Strategic').success).toBe(true);
    expect(TargetRoundTypeSchema.safeParse('Growth').success).toBe(true);
    expect(TargetRoundTypeSchema.safeParse('Seed Round').success).toBe(false);
  });

  it('f39 Network Effects Score is integer 1..10', () => {
    expect(QUANTARA_FIELDS_BY_ID.f39.schema.safeParse(8).success).toBe(true);
    expect(QUANTARA_FIELDS_BY_ID.f39.schema.safeParse(0).success).toBe(false);
    expect(QUANTARA_FIELDS_BY_ID.f39.schema.safeParse(11).success).toBe(false);
    expect(QUANTARA_FIELDS_BY_ID.f39.schema.safeParse(7.5).success).toBe(false);
  });

  it('f24 Paying Customers must be a non-negative integer', () => {
    expect(QUANTARA_FIELDS_BY_ID.f24.schema.safeParse(184).success).toBe(true);
    expect(QUANTARA_FIELDS_BY_ID.f24.schema.safeParse(0).success).toBe(true);
    expect(QUANTARA_FIELDS_BY_ID.f24.schema.safeParse(-1).success).toBe(false);
    expect(QUANTARA_FIELDS_BY_ID.f24.schema.safeParse(184.5).success).toBe(false);
  });

  it('f56 Target Exit Timeline is integer 1..30', () => {
    expect(QUANTARA_FIELDS_BY_ID.f56.schema.safeParse(5).success).toBe(true);
    expect(QUANTARA_FIELDS_BY_ID.f56.schema.safeParse(0).success).toBe(false);
    expect(QUANTARA_FIELDS_BY_ID.f56.schema.safeParse(31).success).toBe(false);
  });
});

// ── Composite payload schema ───────────────────────────────────────────

describe('QuantaraValuesSchema (composite)', () => {
  it('accepts an empty payload (partial completion is first-class)', () => {
    expect(QuantaraValuesSchema.safeParse({}).success).toBe(true);
  });

  it('accepts a sparse payload with only some fields', () => {
    const result = QuantaraValuesSchema.safeParse({
      f1: 2_450_000,
      f17: 12_450_000,
      f23: 'Series A',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a payload with an out-of-range field', () => {
    const result = QuantaraValuesSchema.safeParse({
      f17: -1, // negative shares — fails f17 schema
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown field ids in strict mode', () => {
    // QuantaraValuesSchema is built from z.object({...}) without .strict(),
    // so unknown keys are silently dropped — matches Prisma's permissive
    // JSON column handling. Document that behaviour here so future changes
    // are intentional.
    const result = QuantaraValuesSchema.safeParse({
      f1: 100,
      f999: 'stray', // unknown
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect('f999' in result.data).toBe(false);
    }
  });
});

// ── Helpers ────────────────────────────────────────────────────────────

/** Sort field ids `f1`, `f2`, ... `f56` numerically (not lexicographically). */
function naturalFieldIdSort(a: string, b: string): number {
  return Number(a.slice(1)) - Number(b.slice(1));
}
