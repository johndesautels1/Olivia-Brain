// ═══════════════════════════════════════════════════════════════════════
// MARKET COMPS SEED DATA — Integrity Tests
// Verifies the 6 London tech company records are well-formed and
// cover the required industry diversity.
// ═══════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  LONDON_MARKET_COMPS,
  averageSeedRevenueMultiple,
  seedCompsByIndustry,
} from '../market-comps-seed';

describe('Market Comps Seed Data: Structure', () => {
  it('should contain exactly 6 companies', () => {
    expect(LONDON_MARKET_COMPS).toHaveLength(6);
  });

  it('every company should have required fields', () => {
    for (const comp of LONDON_MARKET_COMPS) {
      expect(comp.companyName).toBeTruthy();
      expect(comp.industry).toBeTruthy();
      expect(comp.description.length).toBeGreaterThan(50);
      expect(comp.fundingStage).toBeTruthy();
      expect(comp.source).toBeTruthy();
    }
  });

  it('every company should have a revenue multiple', () => {
    for (const comp of LONDON_MARKET_COMPS) {
      expect(comp.revenueMultiple).toBeGreaterThan(0);
    }
  });

  it('every company should have a latestARR > 0', () => {
    for (const comp of LONDON_MARKET_COMPS) {
      expect(comp.latestARR).toBeGreaterThan(0);
    }
  });

  it('every company should have a valuation > 0', () => {
    for (const comp of LONDON_MARKET_COMPS) {
      expect(comp.valuation).toBeGreaterThan(0);
    }
  });

  it('company names should be unique', () => {
    const names = LONDON_MARKET_COMPS.map((c) => c.companyName);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('Market Comps Seed Data: Industry Coverage', () => {
  it('should cover at least 4 distinct industries', () => {
    const industries = new Set(LONDON_MARKET_COMPS.map((c) => c.industry));
    expect(industries.size).toBeGreaterThanOrEqual(4);
  });

  it('should include Fintech', () => {
    expect(seedCompsByIndustry('Fintech')).not.toHaveLength(0);
  });

  it('should include AI', () => {
    expect(seedCompsByIndustry('AI')).not.toHaveLength(0);
  });

  it('should include HealthTech', () => {
    expect(seedCompsByIndustry('HealthTech')).not.toHaveLength(0);
  });

  it('should include Marketplace', () => {
    expect(seedCompsByIndustry('Marketplace')).not.toHaveLength(0);
  });
});

describe('Market Comps Seed Data: Analytics', () => {
  it('average revenue multiple should be reasonable (3x–30x)', () => {
    const avg = averageSeedRevenueMultiple();
    expect(avg).toBeGreaterThan(3);
    expect(avg).toBeLessThan(30);
  });

  it('seedCompsByIndustry should be case-insensitive', () => {
    const fintech = seedCompsByIndustry('fintech');
    const Fintech = seedCompsByIndustry('Fintech');
    expect(fintech).toEqual(Fintech);
  });

  it('seedCompsByIndustry should return empty for unknown industry', () => {
    expect(seedCompsByIndustry('SpaceTech')).toHaveLength(0);
  });

  it('revenue multiples should span a wide range (at least 15x spread)', () => {
    const multiples = LONDON_MARKET_COMPS
      .map((c) => c.revenueMultiple)
      .filter((m): m is number => m !== null);
    const min = Math.min(...multiples);
    const max = Math.max(...multiples);
    expect(max - min).toBeGreaterThan(15);
  });

  it('funding stages should include growth and scaleup', () => {
    const stages = new Set(LONDON_MARKET_COMPS.map((c) => c.fundingStage));
    expect(stages.has('growth')).toBe(true);
    expect(stages.has('scaleup')).toBe(true);
  });
});
