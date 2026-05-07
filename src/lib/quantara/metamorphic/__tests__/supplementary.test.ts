import { describe, expect, it } from 'vitest';

import {
  QUANTARA_SUPPLEMENTARY_FIELDS,
  QUANTARA_SUPPLEMENTARY_BY_ID,
  SupplementaryValuesSchema,
  buildSupplementaryValuesSchema,
  getSupplementaryFieldsForRound,
} from '../supplementary';
import {
  mergeSupplementaryIntoQuantaraJson,
  QUANTARA_SUPPLEMENTARY_NAMESPACE,
  readSupplementaryFromQuantaraJson,
  supplementaryFromJson,
  supplementaryToJson,
} from '../supplementary-mapping';
import {
  QUANTARA_SUPPLEMENTARY_FIELD_COUNT,
  type SupplementaryFieldId,
  type SupplementaryValues,
} from '../types';
import type { TargetRoundType } from '../../types';

const ALL_ROUNDS: ReadonlyArray<TargetRoundType> = [
  'Seed',
  'Series A',
  'Series B',
  'Series C',
  'Growth',
  'Strategic',
];

// ── Catalog invariants ────────────────────────────────────────────────

describe('Quantara supplementary catalog', () => {
  it('contains exactly 18 fields', () => {
    expect(QUANTARA_SUPPLEMENTARY_FIELDS).toHaveLength(
      QUANTARA_SUPPLEMENTARY_FIELD_COUNT,
    );
  });

  it('every field id is unique', () => {
    const ids = QUANTARA_SUPPLEMENTARY_FIELDS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every round type owns exactly 3 fields', () => {
    for (const r of ALL_ROUNDS) {
      const owned = QUANTARA_SUPPLEMENTARY_FIELDS.filter(
        (f) => f.roundType === r,
      );
      expect(owned).toHaveLength(3);
    }
  });

  it('every subkey is unique within its round type', () => {
    for (const r of ALL_ROUNDS) {
      const subkeys = QUANTARA_SUPPLEMENTARY_FIELDS.filter(
        (f) => f.roundType === r,
      ).map((f) => f.subkey);
      expect(new Set(subkeys).size).toBe(subkeys.length);
    }
  });

  it('select-enum fields carry options', () => {
    for (const f of QUANTARA_SUPPLEMENTARY_FIELDS) {
      if (f.control === 'select-enum' || f.control === 'multi-select-enum') {
        expect(f.options).toBeDefined();
        expect((f.options ?? []).length).toBeGreaterThan(0);
      }
    }
  });

  it('lookup table mirrors the array', () => {
    for (const f of QUANTARA_SUPPLEMENTARY_FIELDS) {
      expect(QUANTARA_SUPPLEMENTARY_BY_ID[f.id]).toBe(f);
    }
  });
});

describe('getSupplementaryFieldsForRound', () => {
  it('returns the 3 fields for each round in declared order', () => {
    for (const r of ALL_ROUNDS) {
      const out = getSupplementaryFieldsForRound(r);
      expect(out).toHaveLength(3);
      for (const f of out) {
        expect(f.roundType).toBe(r);
      }
    }
  });
});

// ── Schema validation ────────────────────────────────────────────────

describe('Supplementary Zod validation', () => {
  it('per-round schema validates a known-good Seed payload', () => {
    const schema = buildSupplementaryValuesSchema('Seed');
    const result = schema.safeParse({
      s1: 'soft_commits',
      s3: 6,
    });
    expect(result.success).toBe(true);
  });

  it('per-round schema rejects an out-of-enum value', () => {
    const schema = buildSupplementaryValuesSchema('Series A');
    const result = schema.safeParse({ s4: 'no_such_status' });
    expect(result.success).toBe(false);
  });

  it('top-level schema accepts a partially-filled multi-round payload', () => {
    const result = SupplementaryValuesSchema.safeParse({
      Seed: { s1: 'lead_committed' },
      'Series A': { s4: 'exploring', s6: '1x_non_participating' },
    });
    expect(result.success).toBe(true);
  });

  it('top-level schema rejects a malformed inner enum', () => {
    const result = SupplementaryValuesSchema.safeParse({
      Strategic: { s16: 'not_a_valid_status' },
    });
    expect(result.success).toBe(false);
  });

  it('top-level schema accepts an empty object', () => {
    const result = SupplementaryValuesSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

// ── Projection round-trip ────────────────────────────────────────────

describe('supplementaryToJson / supplementaryFromJson', () => {
  it('round-trips a single round losslessly', () => {
    const input: SupplementaryValues = {
      Seed: {
        s1: 'soft_commits',
        s2: '£8M cap, 20% discount',
        s3: 6,
      },
    };
    const json = supplementaryToJson(input);
    const back = supplementaryFromJson(json);
    expect(back).toEqual(input);
  });

  it('round-trips multi-round entries losslessly', () => {
    const input: SupplementaryValues = {
      Seed: { s1: 'lead_committed' },
      'Series A': { s4: 'term_sheet_received', s6: '1x_non_participating' },
      Strategic: { s16: 'inbound_term_sheet' },
    };
    const back = supplementaryFromJson(supplementaryToJson(input));
    expect(back).toEqual(input);
  });

  it('skips undefined and null values', () => {
    const input = {
      Seed: {
        s1: 'soft_commits' as const,
        s2: undefined as unknown as SupplementaryFieldId,
      },
    };
    const json = supplementaryToJson(input as SupplementaryValues);
    expect(json.Seed).toBeDefined();
    expect((json.Seed as Record<string, unknown>).convertibleSafeTermsText).toBeUndefined();
  });

  it('omits empty rounds entirely', () => {
    const json = supplementaryToJson({ Seed: {} });
    expect(json.Seed).toBeUndefined();
  });

  it('tolerates non-object input on read', () => {
    expect(supplementaryFromJson(null)).toEqual({});
    expect(supplementaryFromJson(undefined)).toEqual({});
    expect(supplementaryFromJson('not an object')).toEqual({});
    expect(supplementaryFromJson(42)).toEqual({});
  });

  it('skips unknown subkeys on read (forward-compat)', () => {
    const json = {
      Seed: {
        leadInvestorStatus: 'soft_commits',
        unknownFutureKey: 'whatever',
      },
    };
    const back = supplementaryFromJson(json);
    expect(back.Seed?.s1).toBe('soft_commits');
    expect(back.Seed && Object.keys(back.Seed)).toHaveLength(1);
  });
});

// ── readSupplementaryFromQuantaraJson ────────────────────────────────

describe('readSupplementaryFromQuantaraJson', () => {
  it('reads from the namespace key', () => {
    const out = readSupplementaryFromQuantaraJson({
      mrr: 5000,
      [QUANTARA_SUPPLEMENTARY_NAMESPACE]: {
        Seed: { leadInvestorStatus: 'lead_committed' },
      },
    });
    expect(out.Seed?.s1).toBe('lead_committed');
  });

  it('returns empty when namespace missing', () => {
    expect(readSupplementaryFromQuantaraJson({ mrr: 5000 })).toEqual({});
    expect(readSupplementaryFromQuantaraJson(null)).toEqual({});
    expect(readSupplementaryFromQuantaraJson(undefined)).toEqual({});
  });
});

// ── mergeSupplementaryIntoQuantaraJson ───────────────────────────────

describe('mergeSupplementaryIntoQuantaraJson', () => {
  it('preserves canonical field subkeys outside the namespace', () => {
    const current = { mrr: 5000, arr: { value: 60000 } };
    const out = mergeSupplementaryIntoQuantaraJson(current, {
      Seed: { s1: 'soft_commits' },
    });
    expect(out.mrr).toBe(5000);
    expect(out.arr).toEqual({ value: 60000 });
    expect(out[QUANTARA_SUPPLEMENTARY_NAMESPACE]).toBeDefined();
  });

  it('preserves prior-round entries when writing a new round', () => {
    const current = {
      [QUANTARA_SUPPLEMENTARY_NAMESPACE]: {
        Seed: { leadInvestorStatus: 'lead_committed' },
      },
    };
    const out = mergeSupplementaryIntoQuantaraJson(current, {
      'Series A': { s4: 'exploring' },
    });
    const ns = out[QUANTARA_SUPPLEMENTARY_NAMESPACE] as Record<
      string,
      Record<string, unknown>
    >;
    expect(ns.Seed?.leadInvestorStatus).toBe('lead_committed');
    expect(ns['Series A']?.leadInvestorIdentified).toBe('exploring');
  });

  it('merges within the same round without clobbering other subkeys', () => {
    const current = {
      [QUANTARA_SUPPLEMENTARY_NAMESPACE]: {
        Seed: { leadInvestorStatus: 'soft_commits', founderPersonalRunwayMonths: 3 },
      },
    };
    const out = mergeSupplementaryIntoQuantaraJson(current, {
      Seed: { s2: 'New SAFE terms' },
    });
    const seedBag = (
      out[QUANTARA_SUPPLEMENTARY_NAMESPACE] as Record<
        string,
        Record<string, unknown>
      >
    ).Seed;
    expect(seedBag.leadInvestorStatus).toBe('soft_commits');
    expect(seedBag.founderPersonalRunwayMonths).toBe(3);
    expect(seedBag.convertibleSafeTermsText).toBe('New SAFE terms');
  });

  it('handles a null/undefined current bag', () => {
    const out1 = mergeSupplementaryIntoQuantaraJson(null, {
      Seed: { s1: 'lead_committed' },
    });
    expect(
      (out1[QUANTARA_SUPPLEMENTARY_NAMESPACE] as Record<string, Record<string, unknown>>)
        .Seed?.leadInvestorStatus,
    ).toBe('lead_committed');

    const out2 = mergeSupplementaryIntoQuantaraJson(undefined, {
      Strategic: { s16: 'inbound_term_sheet' },
    });
    expect(
      (out2[QUANTARA_SUPPLEMENTARY_NAMESPACE] as Record<string, Record<string, unknown>>)
        .Strategic?.acquirerInterestLevel,
    ).toBe('inbound_term_sheet');
  });
});
