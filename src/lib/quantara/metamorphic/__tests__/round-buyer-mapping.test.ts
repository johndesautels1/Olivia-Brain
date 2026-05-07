import { describe, expect, it } from 'vitest';

import {
  buyerClassesIntersect,
  getInvestorClassesForRound,
} from '../round-buyer-mapping';
import type { BuyerType, TargetRoundType } from '../../types';

const ALL_ROUNDS: ReadonlyArray<TargetRoundType> = [
  'Seed',
  'Series A',
  'Series B',
  'Series C',
  'Growth',
  'Strategic',
];

describe('getInvestorClassesForRound', () => {
  it('returns angel + vc for Seed', () => {
    expect(getInvestorClassesForRound('Seed')).toEqual(['angel', 'vc']);
  });

  it('returns vc only for Series A', () => {
    expect(getInvestorClassesForRound('Series A')).toEqual(['vc']);
  });

  it('returns vc + private_equity for Series B', () => {
    expect(getInvestorClassesForRound('Series B')).toEqual([
      'vc',
      'private_equity',
    ]);
  });

  it('returns vc + private_equity for Series C', () => {
    expect(getInvestorClassesForRound('Series C')).toEqual([
      'vc',
      'private_equity',
    ]);
  });

  it('returns private_equity + strategic_partner for Growth', () => {
    expect(getInvestorClassesForRound('Growth')).toEqual([
      'private_equity',
      'strategic_partner',
    ]);
  });

  it('returns strategic_partner + acquirer for Strategic', () => {
    expect(getInvestorClassesForRound('Strategic')).toEqual([
      'strategic_partner',
      'acquirer',
    ]);
  });

  it('every round returns a non-empty class list', () => {
    for (const r of ALL_ROUNDS) {
      expect(getInvestorClassesForRound(r).length).toBeGreaterThan(0);
    }
  });

  it('returned arrays are read-only references', () => {
    const a = getInvestorClassesForRound('Seed');
    const b = getInvestorClassesForRound('Seed');
    expect(a).toBe(b); // same reference — frozen at module load
  });
});

describe('buyerClassesIntersect', () => {
  const seedBuyers = getInvestorClassesForRound('Seed');
  const strategicBuyers = getInvestorClassesForRound('Strategic');

  it('returns true when there is overlap', () => {
    const fieldRel: BuyerType[] = ['angel', 'private_equity'];
    expect(buyerClassesIntersect(fieldRel, seedBuyers)).toBe(true);
  });

  it('returns false when there is no overlap', () => {
    const fieldRel: BuyerType[] = ['angel'];
    expect(buyerClassesIntersect(fieldRel, strategicBuyers)).toBe(false);
  });

  it('returns false on empty field relevance list', () => {
    const fieldRel: BuyerType[] = [];
    expect(buyerClassesIntersect(fieldRel, seedBuyers)).toBe(false);
  });

  it('detects single-element overlap correctly', () => {
    const fieldRel: BuyerType[] = ['vc'];
    expect(buyerClassesIntersect(fieldRel, seedBuyers)).toBe(true);
    expect(buyerClassesIntersect(fieldRel, strategicBuyers)).toBe(false);
  });

  it('all-buyers field is relevant for every round', () => {
    const fieldRel: BuyerType[] = [
      'angel',
      'vc',
      'private_equity',
      'strategic_partner',
      'acquirer',
    ];
    for (const r of ALL_ROUNDS) {
      expect(buyerClassesIntersect(fieldRel, getInvestorClassesForRound(r))).toBe(
        true,
      );
    }
  });
});
