import { describe, expect, it } from 'vitest';

import {
  QUANTARA_VERTICAL_BY_ID,
  QUANTARA_VERTICAL_FIELDS,
  QUANTARA_VERTICAL_FIELDS_BY_ID,
  QUANTARA_VERTICALS,
  VerticalValuesSchema,
  buildVerticalValuesSchema,
  getVerticalFieldsForVertical,
} from '../vertical-schedules';
import {
  mergeVerticalIntoQuantaraJson,
  QUANTARA_VERTICAL_NAMESPACE,
  readVerticalFromQuantaraJson,
  verticalFromJson,
  verticalToJson,
} from '../vertical-mapping';
import {
  QUANTARA_VERTICAL_COUNT,
  QUANTARA_VERTICAL_FIELD_COUNT,
  type VerticalId,
  type VerticalValues,
} from '../vertical-types';

const NON_GENERIC_VERTICALS: ReadonlyArray<VerticalId> = [
  'ai_saas',
  'healthtech',
  'climatetech',
  'proptech',
];

// ── Catalog invariants ────────────────────────────────────────────────

describe('Quantara verticals catalog', () => {
  it(`lists exactly ${QUANTARA_VERTICAL_COUNT} verticals`, () => {
    expect(QUANTARA_VERTICALS).toHaveLength(QUANTARA_VERTICAL_COUNT);
  });

  it('vertical ids are unique', () => {
    const ids = QUANTARA_VERTICALS.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('lookup table mirrors the array', () => {
    for (const v of QUANTARA_VERTICALS) {
      expect(QUANTARA_VERTICAL_BY_ID[v.id]).toBe(v);
    }
  });

  it('every non-generic vertical has a non-empty label and description', () => {
    for (const id of NON_GENERIC_VERTICALS) {
      const v = QUANTARA_VERTICAL_BY_ID[id];
      expect(v.label.length).toBeGreaterThan(0);
      expect(v.description.length).toBeGreaterThan(0);
    }
  });
});

describe('Quantara vertical-fields catalog', () => {
  it(`contains exactly ${QUANTARA_VERTICAL_FIELD_COUNT} fields`, () => {
    expect(QUANTARA_VERTICAL_FIELDS).toHaveLength(
      QUANTARA_VERTICAL_FIELD_COUNT,
    );
  });

  it('field ids are unique', () => {
    const ids = QUANTARA_VERTICAL_FIELDS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every non-generic vertical owns exactly 5 fields', () => {
    for (const id of NON_GENERIC_VERTICALS) {
      const owned = QUANTARA_VERTICAL_FIELDS.filter((f) => f.verticalId === id);
      expect(owned).toHaveLength(5);
    }
  });

  it('generic vertical owns zero fields by design', () => {
    const owned = QUANTARA_VERTICAL_FIELDS.filter((f) => f.verticalId === 'generic');
    expect(owned).toHaveLength(0);
  });

  it('subkeys are unique within each vertical', () => {
    for (const id of NON_GENERIC_VERTICALS) {
      const subkeys = QUANTARA_VERTICAL_FIELDS.filter(
        (f) => f.verticalId === id,
      ).map((f) => f.subkey);
      expect(new Set(subkeys).size).toBe(subkeys.length);
    }
  });

  it('select-enum + multi-select-enum fields carry options', () => {
    for (const f of QUANTARA_VERTICAL_FIELDS) {
      if (f.control === 'select-enum' || f.control === 'multi-select-enum') {
        expect(f.options).toBeDefined();
        expect((f.options ?? []).length).toBeGreaterThan(0);
      }
    }
  });

  it('lookup table mirrors the array', () => {
    for (const f of QUANTARA_VERTICAL_FIELDS) {
      expect(QUANTARA_VERTICAL_FIELDS_BY_ID[f.id]).toBe(f);
    }
  });
});

describe('getVerticalFieldsForVertical', () => {
  it('returns exactly 5 fields per non-generic vertical, in declared order', () => {
    for (const id of NON_GENERIC_VERTICALS) {
      const fields = getVerticalFieldsForVertical(id);
      expect(fields).toHaveLength(5);
      for (const f of fields) {
        expect(f.verticalId).toBe(id);
      }
    }
  });

  it('returns empty array for generic', () => {
    expect(getVerticalFieldsForVertical('generic')).toEqual([]);
  });
});

// ── Zod schema validation ────────────────────────────────────────────

describe('Vertical Zod validation', () => {
  it('per-vertical schema accepts a known-good AI/SaaS payload', () => {
    const schema = buildVerticalValuesSchema('ai_saas');
    const result = schema.safeParse({
      v1: 'fine_tuned',
      v4: 2.5,
    });
    expect(result.success).toBe(true);
  });

  it('per-vertical schema rejects an out-of-enum value', () => {
    const schema = buildVerticalValuesSchema('healthtech');
    const result = schema.safeParse({ v6: 'no_such_pathway' });
    expect(result.success).toBe(false);
  });

  it('top-level schema accepts a partially-filled multi-vertical payload', () => {
    const result = VerticalValuesSchema.safeParse({
      ai_saas: { v1: 'proprietary_trained' },
      healthtech: { v6: 'mhra', v9: 'covered' },
    });
    expect(result.success).toBe(true);
  });

  it('top-level schema rejects a malformed inner enum', () => {
    const result = VerticalValuesSchema.safeParse({
      proptech: { v17: 'not_a_valid_compliance' },
    });
    expect(result.success).toBe(false);
  });

  it('top-level schema accepts an empty object', () => {
    expect(VerticalValuesSchema.safeParse({}).success).toBe(true);
  });

  it('generic schema validates an empty payload (no fields by design)', () => {
    const result = buildVerticalValuesSchema('generic').safeParse({});
    expect(result.success).toBe(true);
  });
});

// ── Projection round-trip ────────────────────────────────────────────

describe('verticalToJson / verticalFromJson', () => {
  it('round-trips a single vertical losslessly', () => {
    const input: VerticalValues = {
      ai_saas: {
        v1: 'fine_tuned',
        v3: 'third_party',
        v4: 1.8,
        v5: 0.012,
      },
    };
    expect(verticalFromJson(verticalToJson(input))).toEqual(input);
  });

  it('round-trips multi-vertical entries losslessly', () => {
    const input: VerticalValues = {
      ai_saas: { v1: 'hybrid' },
      healthtech: { v6: 'fda_510k', v8: 12 },
      climatetech: { v11: ['tcfd', 'sbti'] },
      proptech: { v16: 94.5, v20: 'real_time' },
    };
    expect(verticalFromJson(verticalToJson(input))).toEqual(input);
  });

  it('skips undefined and null values', () => {
    const input = {
      ai_saas: {
        v1: 'fine_tuned' as const,
        v2: undefined,
      },
    };
    const json = verticalToJson(input as VerticalValues);
    expect(json.ai_saas).toBeDefined();
    expect((json.ai_saas as Record<string, unknown>).trainingDataProvenance).toBeUndefined();
  });

  it('omits empty verticals entirely', () => {
    const json = verticalToJson({ healthtech: {} });
    expect(json.healthtech).toBeUndefined();
  });

  it('tolerates non-object input on read', () => {
    expect(verticalFromJson(null)).toEqual({});
    expect(verticalFromJson(undefined)).toEqual({});
    expect(verticalFromJson('not an object')).toEqual({});
    expect(verticalFromJson(42)).toEqual({});
  });

  it('skips unknown subkeys on read (forward-compat)', () => {
    const json = {
      ai_saas: {
        modelProvenance: 'fine_tuned',
        unknownFutureKey: 'whatever',
      },
    };
    const back = verticalFromJson(json);
    expect(back.ai_saas?.v1).toBe('fine_tuned');
    expect(back.ai_saas && Object.keys(back.ai_saas)).toHaveLength(1);
  });
});

// ── readVerticalFromQuantaraJson ─────────────────────────────────────

describe('readVerticalFromQuantaraJson', () => {
  it('reads from the namespace key', () => {
    const out = readVerticalFromQuantaraJson({
      mrr: 5000,
      [QUANTARA_VERTICAL_NAMESPACE]: {
        ai_saas: { modelProvenance: 'proprietary_trained' },
      },
    });
    expect(out.ai_saas?.v1).toBe('proprietary_trained');
  });

  it('returns empty when namespace missing', () => {
    expect(readVerticalFromQuantaraJson({ mrr: 5000 })).toEqual({});
    expect(readVerticalFromQuantaraJson(null)).toEqual({});
    expect(readVerticalFromQuantaraJson(undefined)).toEqual({});
  });
});

// ── mergeVerticalIntoQuantaraJson ────────────────────────────────────

describe('mergeVerticalIntoQuantaraJson', () => {
  it('preserves canonical field subkeys + supplementary namespace', () => {
    const current = {
      mrr: 5000,
      arr: { value: 60000 },
      supplementary: { Seed: { leadInvestorStatus: 'lead_committed' } },
    };
    const out = mergeVerticalIntoQuantaraJson(current, {
      ai_saas: { v1: 'fine_tuned' },
    });
    expect(out.mrr).toBe(5000);
    expect(out.arr).toEqual({ value: 60000 });
    /* Supplementary namespace untouched. */
    expect(out.supplementary).toEqual({
      Seed: { leadInvestorStatus: 'lead_committed' },
    });
    expect(out[QUANTARA_VERTICAL_NAMESPACE]).toBeDefined();
  });

  it('preserves prior-vertical entries when writing a new vertical', () => {
    const current = {
      [QUANTARA_VERTICAL_NAMESPACE]: {
        ai_saas: { modelProvenance: 'fine_tuned' },
      },
    };
    const out = mergeVerticalIntoQuantaraJson(current, {
      healthtech: { v6: 'mhra' },
    });
    const ns = out[QUANTARA_VERTICAL_NAMESPACE] as Record<
      string,
      Record<string, unknown>
    >;
    expect(ns.ai_saas?.modelProvenance).toBe('fine_tuned');
    expect(ns.healthtech?.regulatoryPathway).toBe('mhra');
  });

  it('merges within the same vertical without clobbering other subkeys', () => {
    const current = {
      [QUANTARA_VERTICAL_NAMESPACE]: {
        ai_saas: { modelProvenance: 'fine_tuned', hallucinationRatePct: 2.5 },
      },
    };
    const out = mergeVerticalIntoQuantaraJson(current, {
      ai_saas: { v3: 'third_party' },
    });
    const aiBag = (
      out[QUANTARA_VERTICAL_NAMESPACE] as Record<string, Record<string, unknown>>
    ).ai_saas;
    expect(aiBag.modelProvenance).toBe('fine_tuned');
    expect(aiBag.hallucinationRatePct).toBe(2.5);
    expect(aiBag.evalFramework).toBe('third_party');
  });

  it('handles a null/undefined current bag', () => {
    const out = mergeVerticalIntoQuantaraJson(null, {
      proptech: { v16: 96 },
    });
    expect(
      (out[QUANTARA_VERTICAL_NAMESPACE] as Record<string, Record<string, unknown>>)
        .proptech?.propertyDataAccuracyPct,
    ).toBe(96);
  });
});
