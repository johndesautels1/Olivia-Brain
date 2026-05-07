import { describe, expect, it } from 'vitest';

import { QUANTARA_FIELDS } from '../../schema';
import {
  getAllFieldRelevanceTiers,
  getFieldRelevanceTier,
} from '../field-relevance';
import type { QuantaraFieldId, TargetRoundType } from '../../types';

const ALL_FIELD_IDS: ReadonlyArray<QuantaraFieldId> = QUANTARA_FIELDS.map(
  (f) => f.id,
);
const ALL_ROUNDS: ReadonlyArray<TargetRoundType> = [
  'Seed',
  'Series A',
  'Series B',
  'Series C',
  'Growth',
  'Strategic',
];

describe('getFieldRelevanceTier', () => {
  it('returns primary when roundType is undefined', () => {
    for (const id of ALL_FIELD_IDS) {
      expect(getFieldRelevanceTier(id, undefined)).toBe('primary');
    }
  });

  it('returns primary for ALL_BUYERS fields under every round', () => {
    /* f1 (ARR) is ALL_BUYERS; f5 (gross margin) is ALL_BUYERS. */
    for (const r of ALL_ROUNDS) {
      expect(getFieldRelevanceTier('f1', r)).toBe('primary');
      expect(getFieldRelevanceTier('f5', r)).toBe('primary');
    }
  });

  it('classifies LATE_AND_CONTROL fields correctly', () => {
    /* f6 net margin is LATE_AND_CONTROL. Should be SECONDARY for Seed
       (angel + vc) and PRIMARY for Growth (private_equity + strategic). */
    expect(getFieldRelevanceTier('f6', 'Seed')).toBe('secondary');
    expect(getFieldRelevanceTier('f6', 'Growth')).toBe('primary');
    expect(getFieldRelevanceTier('f6', 'Strategic')).toBe('primary');
  });

  it('classifies EARLY_STAGE fields correctly', () => {
    /* f4 MoM growth is EARLY_STAGE (angel + vc). PRIMARY for Seed and
       Series A; SECONDARY for Strategic. */
    expect(getFieldRelevanceTier('f4', 'Seed')).toBe('primary');
    expect(getFieldRelevanceTier('f4', 'Series A')).toBe('primary');
    expect(getFieldRelevanceTier('f4', 'Strategic')).toBe('secondary');
  });

  it('handles unknown ids gracefully (degrades to primary)', () => {
    /* Stale id not in the lookup — defensive default. */
    const stale = 'f999' as QuantaraFieldId;
    expect(getFieldRelevanceTier(stale, 'Seed')).toBe('primary');
  });
});

describe('getAllFieldRelevanceTiers', () => {
  it('returns a tier for every canonical field id', () => {
    const map = getAllFieldRelevanceTiers('Series A');
    for (const id of ALL_FIELD_IDS) {
      expect(map[id]).toMatch(/^(primary|secondary)$/);
    }
  });

  it('agrees with the per-field helper for every id × round combo', () => {
    for (const r of ALL_ROUNDS) {
      const map = getAllFieldRelevanceTiers(r);
      for (const id of ALL_FIELD_IDS) {
        expect(map[id]).toBe(getFieldRelevanceTier(id, r));
      }
    }
  });

  it('is frozen — caller cannot mutate', () => {
    const map = getAllFieldRelevanceTiers('Seed');
    expect(() => {
      // @ts-expect-error — intentional mutation attempt for the test
      map.f1 = 'secondary';
    }).toThrow();
  });

  it('marks all fields primary when roundType is undefined', () => {
    const map = getAllFieldRelevanceTiers(undefined);
    for (const id of ALL_FIELD_IDS) {
      expect(map[id]).toBe('primary');
    }
  });
});
