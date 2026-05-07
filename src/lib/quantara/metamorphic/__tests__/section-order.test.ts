import { describe, expect, it } from 'vitest';

import { QUANTARA_SECTIONS } from '../../sections';
import {
  getSectionOrderForRound,
  isSectionPrimaryForRound,
  sectionRelevanceScore,
} from '../section-order';
import type { QuantaraSectionId, TargetRoundType } from '../../types';

const ALL_SECTION_IDS: ReadonlyArray<QuantaraSectionId> = QUANTARA_SECTIONS.map(
  (s) => s.id,
);
const ALL_ROUNDS: ReadonlyArray<TargetRoundType> = [
  'Seed',
  'Series A',
  'Series B',
  'Series C',
  'Growth',
  'Strategic',
];

describe('sectionRelevanceScore', () => {
  it('returns a number in [0, 1] for every section × round combo', () => {
    for (const id of ALL_SECTION_IDS) {
      for (const r of ALL_ROUNDS) {
        const score = sectionRelevanceScore(id, r);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      }
    }
  });

  it('core_financials is universally primary (every field is ALL_BUYERS or EARLY)', () => {
    for (const r of ALL_ROUNDS) {
      const score = sectionRelevanceScore('core_financials', r);
      expect(score).toBeGreaterThanOrEqual(0.5);
    }
  });

  it('ip_moat skews toward late-stage rounds (LATE_AND_CONTROL fields dominate)', () => {
    /* IP & Moat is heavy on LATE_AND_CONTROL fields (patents). Strategic /
       Growth round buyers should score it higher than a pure Series A
       (vc-only). We assert ordering, not absolute values. */
    const seriesA = sectionRelevanceScore('ip_moat', 'Series A');
    const strategic = sectionRelevanceScore('ip_moat', 'Strategic');
    expect(strategic).toBeGreaterThanOrEqual(seriesA);
  });
});

describe('getSectionOrderForRound', () => {
  it('returns canonical order when roundType is undefined', () => {
    const order = getSectionOrderForRound(undefined);
    expect([...order]).toEqual([...ALL_SECTION_IDS]);
  });

  it('returns every section exactly once for every round type', () => {
    for (const r of ALL_ROUNDS) {
      const order = getSectionOrderForRound(r);
      expect(order.length).toBe(ALL_SECTION_IDS.length);
      expect(new Set(order).size).toBe(ALL_SECTION_IDS.length);
    }
  });

  it('contains every canonical section id in every round-type order', () => {
    for (const r of ALL_ROUNDS) {
      const order = getSectionOrderForRound(r);
      for (const id of ALL_SECTION_IDS) {
        expect(order).toContain(id);
      }
    }
  });

  it('is stable across calls (no hidden randomness)', () => {
    const a = getSectionOrderForRound('Series A');
    const b = getSectionOrderForRound('Series A');
    expect([...a]).toEqual([...b]);
  });

  it('Seed and Strategic produce distinct orderings', () => {
    const seed = [...getSectionOrderForRound('Seed')];
    const strategic = [...getSectionOrderForRound('Strategic')];
    expect(seed).not.toEqual(strategic);
  });

  it('primary sections (relevance >= 0.5) precede secondary in the order', () => {
    for (const r of ALL_ROUNDS) {
      const order = getSectionOrderForRound(r);
      let lastPrimaryIdx = -1;
      let firstSecondaryIdx = order.length;
      for (let i = 0; i < order.length; i++) {
        const score = sectionRelevanceScore(order[i], r);
        if (score >= 0.5) lastPrimaryIdx = i;
        else if (firstSecondaryIdx === order.length) firstSecondaryIdx = i;
      }
      /* lastPrimary must come strictly before firstSecondary, OR all
         sections are primary, OR all are secondary. */
      if (lastPrimaryIdx >= 0 && firstSecondaryIdx < order.length) {
        expect(lastPrimaryIdx).toBeLessThan(firstSecondaryIdx);
      }
    }
  });
});

describe('isSectionPrimaryForRound', () => {
  it('returns false for every section when roundType is undefined', () => {
    for (const id of ALL_SECTION_IDS) {
      expect(isSectionPrimaryForRound(id, undefined)).toBe(false);
    }
  });

  it('agrees with sectionRelevanceScore at the threshold', () => {
    for (const id of ALL_SECTION_IDS) {
      for (const r of ALL_ROUNDS) {
        const score = sectionRelevanceScore(id, r);
        expect(isSectionPrimaryForRound(id, r)).toBe(score >= 0.5);
      }
    }
  });
});
