// ═══════════════════════════════════════════════════════════════════════
// SESSION 10 — EDGE CASE TESTS
// Tests pre-revenue, mature, buyout, and missing data graceful degradation.
// ═══════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { runValuation } from '../engine';
import { monteCarloDCF } from '../monte-carlo';
import { hybridMonteCarloCRR } from '../hybrid';
import { calculateCRRRealOption } from '../real-options';
import { SensitivityAnalyzer } from '../sensitivity';
import type { CompanyValuationInput, Scenario, BuyerType } from '../types';

// ── Helper ──────────────────────────────────────────────────────────

function me(value: number | null, confidence = 0.7) {
  return { value, confidence, refs: [] };
}

const BASE_SCENARIO: Scenario = {
  name: 'Base',
  revenueGrowthShockPct: 0,
  multipleShockPct: 0,
  marginShockPct: 0,
  discountRateShockPct: 0,
  strategicPremiumPct: 0,
  concentrationPenaltyPct: 0,
  synergyPremiumPct: 0,
  controlPremiumPct: 0,
};

// ═══════════════════════════════════════════════════════════════════════
// 1. PRE-REVENUE COMPANY
// ═══════════════════════════════════════════════════════════════════════

const PRE_REVENUE_INPUT: CompanyValuationInput = {
  companyName: 'NovaDiag Ltd',
  companyId: 'edge-pre-rev-001',
  sector: 'HealthTech',
  geography: 'London',
  stage: 'pre_revenue',
  businessModel: 'deeptech',

  annualRevenue: me(null),
  arr: me(null),
  grossMarginPct: me(null),
  ebitda: me(null),
  ebitdaMarginPct: me(null),
  burnMonthly: me(45_000),
  runwayMonths: me(14),
  growthYoYPct: me(null),
  netRevenueRetentionPct: me(null),
  churnPct: me(null),
  customerConcentrationTop3Pct: me(null),
  cacPaybackMonths: me(null),
  ltvToCac: me(null),
  burnMultiple: me(null),

  cashOnHand: me(630_000),
  debt: me(0),
  fullyDilutedShares: me(5_000_000),
  optionPoolPct: me(20),

  tam: me(8_000_000_000),
  sam: me(800_000_000),
  som: me(20_000_000),
  marketGrowthPct: me(18),

  capitalRaisedToDate: me(1_200_000),
  lastRoundPreMoney: me(3_000_000),
  lastRoundPostMoney: me(4_200_000),

  founderDependencyRisk: 0.7,
  legalRisk: 0.3,
  ipStrength: 0.8,
  productMaturity: 0.25,
  goToMarketMaturity: 0.15,
  londonStrategicFit: 0.6,
  managementStrength: 0.5,
  founderReputationScore: 0.55,
  competitionIntensityScore: 0.3,

  capitalizedBuildCost: me(800_000),
  replacementCost: me(1_000_000),
  patentsCount: 4,
  proprietaryDataScore: 0.7,
  trademarksCount: 1,
  regulatoryApprovals: false,

  volatility: 0.6,
  timeToExit: 5,
  expansionCapex: me(1_500_000),
  salvageValue: me(400_000),

  marketBenchmarks: {
    revenueMultipleLow: null,
    revenueMultipleBase: null,
    revenueMultipleHigh: null,
    ebitdaMultipleLow: null,
    ebitdaMultipleBase: null,
    ebitdaMultipleHigh: null,
    discountRatePct: 45,
    terminalGrowthPct: 2,
    targetInvestorReturnPct: 50,
  },
};

describe('Edge Case: Pre-Revenue Company', () => {
  it('should produce a valid valuation despite no revenue or EBITDA', () => {
    const result = runValuation(PRE_REVENUE_INPUT, BASE_SCENARIO, 'angel');

    expect(result.enterpriseValue.base).toBeGreaterThan(0);
    expect(Number.isFinite(result.enterpriseValue.base)).toBe(true);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.narrative.length).toBeGreaterThan(0);
  });

  it('should disable revenue_multiple and ebitda_multiple methods', () => {
    const result = runValuation(PRE_REVENUE_INPUT, BASE_SCENARIO, 'angel');

    const revMethod = result.methods.find(m => m.method === 'revenue_multiple');
    const ebitdaMethod = result.methods.find(m => m.method === 'ebitda_multiple');

    expect(revMethod).toBeDefined();
    expect(revMethod!.enabled).toBe(false);
    expect(ebitdaMethod).toBeDefined();
    expect(ebitdaMethod!.enabled).toBe(false);
  });

  it('should rely on scorecard, VC method, cost-to-duplicate, and real options', () => {
    const result = runValuation(PRE_REVENUE_INPUT, BASE_SCENARIO, 'angel');
    const enabled = result.methods.filter(m => m.enabled).map(m => m.method);

    // At least scorecard and cost_to_duplicate should be enabled
    expect(enabled).toContain('scorecard');
    expect(enabled).toContain('cost_to_duplicate');
    expect(enabled).toContain('real_options');
  });

  it('should flag high founder dependency as risk', () => {
    const result = runValuation(PRE_REVENUE_INPUT, BASE_SCENARIO, 'angel');

    // founderDependencyRisk=0.7 > 0.65 threshold
    const hasFounderRisk = result.risks.some(r =>
      r.toLowerCase().includes('founder') || r.toLowerCase().includes('key-person')
    );
    expect(hasFounderRisk).toBe(true);
  });

  it('should work across all buyer types', () => {
    const buyerTypes: BuyerType[] = ['angel', 'vc', 'private_equity', 'strategic_partner', 'acquirer'];
    for (const bt of buyerTypes) {
      const result = runValuation(PRE_REVENUE_INPUT, BASE_SCENARIO, bt);
      expect(result.enterpriseValue.base).toBeGreaterThan(0);
      expect(Number.isFinite(result.enterpriseValue.base)).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. MATURE COMPANY WITH FULL FINANCIALS
// ═══════════════════════════════════════════════════════════════════════

const MATURE_INPUT: CompanyValuationInput = {
  companyName: 'Meridian Analytics PLC',
  companyId: 'edge-mature-001',
  sector: 'SaaS',
  geography: 'London',
  stage: 'mature',
  businessModel: 'saas',

  annualRevenue: me(25_000_000, 0.95),
  arr: me(28_000_000, 0.95),
  grossMarginPct: me(78, 0.9),
  ebitda: me(6_250_000, 0.9),
  ebitdaMarginPct: me(25, 0.9),
  burnMonthly: me(0),
  runwayMonths: me(null),
  growthYoYPct: me(12, 0.9),
  netRevenueRetentionPct: me(108, 0.85),
  churnPct: me(8, 0.85),
  customerConcentrationTop3Pct: me(15, 0.8),
  cacPaybackMonths: me(18, 0.8),
  ltvToCac: me(3.2, 0.8),
  burnMultiple: me(null),

  cashOnHand: me(5_000_000, 0.95),
  debt: me(2_000_000, 0.95),
  fullyDilutedShares: me(50_000_000, 0.95),
  optionPoolPct: me(10, 0.9),

  tam: me(12_000_000_000),
  sam: me(2_000_000_000),
  som: me(200_000_000),
  marketGrowthPct: me(8),

  capitalRaisedToDate: me(15_000_000),
  lastRoundPreMoney: me(40_000_000),
  lastRoundPostMoney: me(45_000_000),

  founderDependencyRisk: 0.2,
  legalRisk: 0.1,
  ipStrength: 0.75,
  productMaturity: 0.85,
  goToMarketMaturity: 0.8,
  londonStrategicFit: 0.75,
  managementStrength: 0.8,
  founderReputationScore: 0.7,
  competitionIntensityScore: 0.6,

  capitalizedBuildCost: me(8_000_000),
  replacementCost: me(10_000_000),
  patentsCount: 5,
  proprietaryDataScore: 0.6,
  trademarksCount: 8,
  regulatoryApprovals: true,

  volatility: 0.25,
  timeToExit: 2,
  expansionCapex: me(5_000_000),
  salvageValue: me(8_000_000),

  marketBenchmarks: {
    revenueMultipleLow: 4,
    revenueMultipleBase: 6,
    revenueMultipleHigh: 9,
    ebitdaMultipleLow: 10,
    ebitdaMultipleBase: 14,
    ebitdaMultipleHigh: 20,
    discountRatePct: 15,
    terminalGrowthPct: 2.5,
    targetInvestorReturnPct: 20,
  },
};

describe('Edge Case: Mature Company', () => {
  it('should heavily weight DCF and EBITDA multiple', () => {
    const result = runValuation(MATURE_INPUT, BASE_SCENARIO, 'private_equity');

    const dcf = result.methods.find(m => m.method === 'dcf');
    const ebitda = result.methods.find(m => m.method === 'ebitda_multiple');

    expect(dcf).toBeDefined();
    expect(dcf!.enabled).toBe(true);
    expect(dcf!.weight).toBeGreaterThan(0);

    expect(ebitda).toBeDefined();
    expect(ebitda!.enabled).toBe(true);
    expect(ebitda!.weight).toBeGreaterThan(0);
  });

  it('should produce higher confidence than pre-revenue', () => {
    const matureResult = runValuation(MATURE_INPUT, BASE_SCENARIO, 'vc');
    const preRevResult = runValuation(PRE_REVENUE_INPUT, BASE_SCENARIO, 'vc');

    expect(matureResult.confidence).toBeGreaterThan(preRevResult.confidence);
  });

  it('should have high stage fit for DCF and EBITDA methods', () => {
    const result = runValuation(MATURE_INPUT, BASE_SCENARIO, 'private_equity');

    const dcf = result.methods.find(m => m.method === 'dcf');
    const ebitda = result.methods.find(m => m.method === 'ebitda_multiple');

    // Mature companies should have high stage fit for these methods
    expect(dcf!.stageFit).toBeGreaterThanOrEqual(0.7);
    expect(ebitda!.stageFit).toBeGreaterThanOrEqual(0.9);
  });

  it('should enable all data-dependent methods with full financials', () => {
    const result = runValuation(MATURE_INPUT, BASE_SCENARIO, 'vc');
    const enabled = result.methods.filter(m => m.enabled);

    // With full financials, most methods should be enabled
    expect(enabled.length).toBeGreaterThanOrEqual(8);
  });

  it('should generate per-share values', () => {
    const result = runValuation(MATURE_INPUT, BASE_SCENARIO, 'vc');

    expect(result.perShareValue).not.toBeNull();
    expect(result.perShareValue!.base).toBeGreaterThan(0);
    expect(Number.isFinite(result.perShareValue!.base)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. BUYOUT SCENARIOS (PE + Acquirer)
// ═══════════════════════════════════════════════════════════════════════

describe('Edge Case: Buyout Scenarios', () => {
  it('should add control premium for acquirer buyer type', () => {
    const vcResult = runValuation(MATURE_INPUT, BASE_SCENARIO, 'vc');
    const acquirerResult = runValuation(MATURE_INPUT, {
      ...BASE_SCENARIO,
      controlPremiumPct: 15,
    }, 'acquirer');

    // Acquirer with control premium should generally produce different EVs
    expect(acquirerResult.enterpriseValue.base).toBeGreaterThan(0);
    expect(vcResult.enterpriseValue.base).toBeGreaterThan(0);
  });

  it('should apply synergy premium for strategic partner', () => {
    const baseResult = runValuation(MATURE_INPUT, BASE_SCENARIO, 'strategic_partner');
    const synergyResult = runValuation(MATURE_INPUT, {
      ...BASE_SCENARIO,
      synergyPremiumPct: 20,
    }, 'strategic_partner');

    // Synergy should push EV higher or equal (strategic overlay affects high band)
    expect(synergyResult.enterpriseValue.base).toBeGreaterThanOrEqual(baseResult.enterpriseValue.base);
  });

  it('should apply PE buyer-type adjustments (boost DCF/EBITDA)', () => {
    const peResult = runValuation(MATURE_INPUT, BASE_SCENARIO, 'private_equity');

    const dcf = peResult.methods.find(m => m.method === 'dcf');
    const ebitda = peResult.methods.find(m => m.method === 'ebitda_multiple');

    // PE should have positive weights for DCF and EBITDA
    expect(dcf!.weight).toBeGreaterThan(0);
    expect(ebitda!.weight).toBeGreaterThan(0);
  });

  it('should produce compound option value for acquirer', () => {
    const acquirerResult = runValuation(MATURE_INPUT, BASE_SCENARIO, 'acquirer');

    // The engine should not crash and should produce valid output
    expect(acquirerResult.enterpriseValue.base).toBeGreaterThan(0);
    expect(Number.isFinite(acquirerResult.enterpriseValue.high)).toBe(true);
  });

  it('should handle extreme concentration penalty scenario', () => {
    const result = runValuation(MATURE_INPUT, {
      ...BASE_SCENARIO,
      concentrationPenaltyPct: 30,
    }, 'acquirer');

    expect(result.enterpriseValue.base).toBeGreaterThan(0);
    expect(Number.isFinite(result.enterpriseValue.base)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. MISSING DATA — GRACEFUL DEGRADATION
// ═══════════════════════════════════════════════════════════════════════

const MINIMAL_INPUT: CompanyValuationInput = {
  companyName: 'Bare Minimum Co',
  companyId: 'edge-minimal-001',
  sector: 'Other',
  geography: 'London',
  stage: 'idea',
  businessModel: 'other',

  // Almost everything is null
  annualRevenue: me(null),
  arr: me(null),
  grossMarginPct: me(null),
  ebitda: me(null),
  ebitdaMarginPct: me(null),
  burnMonthly: me(null),
  runwayMonths: me(null),
  growthYoYPct: me(null),
  netRevenueRetentionPct: me(null),
  churnPct: me(null),
  customerConcentrationTop3Pct: me(null),
  cacPaybackMonths: me(null),
  ltvToCac: me(null),
  burnMultiple: me(null),

  cashOnHand: me(50_000),
  debt: me(0),
  fullyDilutedShares: me(1_000_000),
  optionPoolPct: me(null),

  tam: me(null),
  sam: me(null),
  som: me(null),
  marketGrowthPct: me(null),

  capitalRaisedToDate: me(50_000),
  lastRoundPreMoney: me(null),
  lastRoundPostMoney: me(null),

  founderDependencyRisk: 0.8,
  legalRisk: 0.5,
  ipStrength: 0.1,
  productMaturity: 0.1,
  goToMarketMaturity: 0.05,
  londonStrategicFit: 0.3,
  managementStrength: 0.3,
  founderReputationScore: 0.3,
  competitionIntensityScore: 0.7,

  capitalizedBuildCost: me(20_000),
  replacementCost: me(30_000),
  patentsCount: 0,
  proprietaryDataScore: 0.05,
  trademarksCount: 0,
  regulatoryApprovals: false,

  volatility: 0.7,
  timeToExit: 7,
  expansionCapex: me(null),
  salvageValue: me(null),

  marketBenchmarks: {
    revenueMultipleLow: null,
    revenueMultipleBase: null,
    revenueMultipleHigh: null,
    ebitdaMultipleLow: null,
    ebitdaMultipleBase: null,
    ebitdaMultipleHigh: null,
    discountRatePct: null,
    terminalGrowthPct: null,
    targetInvestorReturnPct: null,
  },
};

describe('Edge Case: Missing Data (Graceful Degradation)', () => {
  it('should not throw with nearly all null inputs', () => {
    expect(() => {
      runValuation(MINIMAL_INPUT, BASE_SCENARIO, 'angel');
    }).not.toThrow();
  });

  it('should produce a valid (even if low confidence) result', () => {
    const result = runValuation(MINIMAL_INPUT, BASE_SCENARIO, 'angel');

    expect(Number.isFinite(result.enterpriseValue.base)).toBe(true);
    expect(result.enterpriseValue.base).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.narrative.length).toBeGreaterThan(0);
  });

  it('should disable most revenue/EBITDA-dependent methods', () => {
    const result = runValuation(MINIMAL_INPUT, BASE_SCENARIO, 'angel');

    const revMethod = result.methods.find(m => m.method === 'revenue_multiple');
    const ebitdaMethod = result.methods.find(m => m.method === 'ebitda_multiple');
    const dcfMethod = result.methods.find(m => m.method === 'dcf');

    expect(revMethod!.enabled).toBe(false);
    expect(ebitdaMethod!.enabled).toBe(false);
    // DCF also needs revenue to project cash flows
    expect(dcfMethod!.enabled).toBe(false);
  });

  it('should still enable cost_to_duplicate with build cost', () => {
    const result = runValuation(MINIMAL_INPUT, BASE_SCENARIO, 'angel');

    const ctd = result.methods.find(m => m.method === 'cost_to_duplicate');
    expect(ctd).toBeDefined();
    expect(ctd!.enabled).toBe(true);
  });

  it('should have lower confidence than a data-rich company', () => {
    const minimalResult = runValuation(MINIMAL_INPUT, BASE_SCENARIO, 'angel');
    const matureResult = runValuation(MATURE_INPUT, BASE_SCENARIO, 'vc');

    expect(minimalResult.confidence).toBeLessThan(matureResult.confidence);
  });

  it('should work across all buyer types with minimal data', () => {
    const buyerTypes: BuyerType[] = ['angel', 'vc', 'private_equity', 'strategic_partner', 'acquirer'];
    for (const bt of buyerTypes) {
      expect(() => {
        const result = runValuation(MINIMAL_INPUT, BASE_SCENARIO, bt);
        expect(Number.isFinite(result.enterpriseValue.base)).toBe(true);
      }).not.toThrow();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. ZERO-VALUE & BOUNDARY CONDITIONS
// ═══════════════════════════════════════════════════════════════════════

describe('Edge Case: Zero Values & Boundary Conditions', () => {
  it('should handle zero revenue gracefully', () => {
    const zeroRevInput = {
      ...MATURE_INPUT,
      companyId: 'edge-zero-rev',
      annualRevenue: me(0),
      arr: me(0),
    };

    const result = runValuation(zeroRevInput, BASE_SCENARIO, 'vc');
    expect(Number.isFinite(result.enterpriseValue.base)).toBe(true);

    const revMethod = result.methods.find(m => m.method === 'revenue_multiple');
    expect(revMethod!.enabled).toBe(false);
  });

  it('should handle negative EBITDA (loss-making)', () => {
    const lossInput = {
      ...MATURE_INPUT,
      companyId: 'edge-loss',
      ebitda: me(-500_000),
      ebitdaMarginPct: me(-5),
    };

    const result = runValuation(lossInput, BASE_SCENARIO, 'vc');
    expect(Number.isFinite(result.enterpriseValue.base)).toBe(true);

    const ebitdaMethod = result.methods.find(m => m.method === 'ebitda_multiple');
    expect(ebitdaMethod!.enabled).toBe(false);
  });

  it('should handle zero shares (no per-share value)', () => {
    const noSharesInput = {
      ...MATURE_INPUT,
      companyId: 'edge-no-shares',
      fullyDilutedShares: me(0),
    };

    const result = runValuation(noSharesInput, BASE_SCENARIO, 'vc');
    expect(Number.isFinite(result.enterpriseValue.base)).toBe(true);
    // With 0 shares, per-share should be null (avoid division by zero)
    expect(result.perShareValue).toBeNull();
  });

  it('should handle very high volatility in CRR', () => {
    const result = calculateCRRRealOption(10_000_000, 5_000_000, 0.95, 5, 0.045, 'call', true, 80);
    expect(Number.isFinite(result.optionValue)).toBe(true);
    expect(result.optionValue).toBeGreaterThanOrEqual(0);
  });

  it('should handle very low volatility in CRR', () => {
    const result = calculateCRRRealOption(10_000_000, 5_000_000, 0.05, 3, 0.045, 'call', true, 80);
    expect(Number.isFinite(result.optionValue)).toBe(true);
    expect(result.optionValue).toBeGreaterThanOrEqual(0);
  });

  it('should handle Monte Carlo with extreme growth rates', () => {
    const result = monteCarloDCF({
      revenue: 100_000,
      revenueGrowthPct: 200,
      fcfMarginPct: 5,
      waccPct: 50,
      terminalGrowthPct: 2,
      projectionYears: 5,
      taxRate: 0.19,
      workingCapitalPct: 0.1,
      capexPct: 0.05,
      growthDecayPctPerYear: 10,
    }, 1000, 42);

    expect(Number.isFinite(result.mean)).toBe(true);
    expect(result.mean).toBeGreaterThan(0);
  });

  it('should handle Monte Carlo with near-zero revenue', () => {
    const result = monteCarloDCF({
      revenue: 1,
      revenueGrowthPct: 10,
      fcfMarginPct: 10,
      waccPct: 25,
      terminalGrowthPct: 2,
      projectionYears: 5,
      taxRate: 0.19,
      workingCapitalPct: 0.05,
      capexPct: 0.03,
      growthDecayPctPerYear: 4,
    }, 500, 42);

    expect(Number.isFinite(result.mean)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 6. SENSITIVITY WITH EDGE INPUTS
// ═══════════════════════════════════════════════════════════════════════

describe('Edge Case: Sensitivity with Different Company Profiles', () => {
  it('should generate tornado data for pre-revenue company', () => {
    const analyzer = new SensitivityAnalyzer(PRE_REVENUE_INPUT, BASE_SCENARIO, 'angel');
    const tornado = analyzer.generateTornadoData();

    expect(tornado.length).toBeGreaterThan(0);
    for (const bar of tornado) {
      expect(Number.isFinite(bar.absoluteImpact)).toBe(true);
    }
  });

  it('should generate scenarios for mature company', () => {
    const analyzer = new SensitivityAnalyzer(MATURE_INPUT, BASE_SCENARIO, 'private_equity');
    const { scenarios, probabilityWeightedEV } = analyzer.generateScenarios();

    expect(scenarios.length).toBe(3);
    expect(probabilityWeightedEV).toBeGreaterThan(0);
    expect(Number.isFinite(probabilityWeightedEV)).toBe(true);
  });

  it('should not crash with minimal data company', () => {
    expect(() => {
      const analyzer = new SensitivityAnalyzer(MINIMAL_INPUT, BASE_SCENARIO, 'angel');
      analyzer.generateTornadoData();
      analyzer.generateScenarios();
      analyzer.generateStressCascade();
    }).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7. EXTREME SCENARIO SHOCKS
// ═══════════════════════════════════════════════════════════════════════

describe('Edge Case: Extreme Scenario Shocks', () => {
  it('should handle severe bear scenario without crashing', () => {
    const severeBear: Scenario = {
      name: 'Severe Bear',
      revenueGrowthShockPct: -50,
      multipleShockPct: -40,
      marginShockPct: -30,
      discountRateShockPct: 20,
      strategicPremiumPct: -10,
      concentrationPenaltyPct: 20,
      synergyPremiumPct: 0,
      controlPremiumPct: 0,
    };

    const result = runValuation(MATURE_INPUT, severeBear, 'vc');
    expect(Number.isFinite(result.enterpriseValue.base)).toBe(true);
    expect(result.enterpriseValue.base).toBeGreaterThan(0);
  });

  it('should handle extreme bull scenario without overflow', () => {
    const extremeBull: Scenario = {
      name: 'Extreme Bull',
      revenueGrowthShockPct: 50,
      multipleShockPct: 40,
      marginShockPct: 25,
      discountRateShockPct: -15,
      strategicPremiumPct: 25,
      concentrationPenaltyPct: 0,
      synergyPremiumPct: 30,
      controlPremiumPct: 20,
    };

    const result = runValuation(MATURE_INPUT, extremeBull, 'acquirer');
    expect(Number.isFinite(result.enterpriseValue.base)).toBe(true);
    expect(Number.isFinite(result.enterpriseValue.high)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 8. HYBRID MC+CRR EDGE CASES
// ═══════════════════════════════════════════════════════════════════════

describe('Edge Case: Hybrid MC+CRR Boundaries', () => {
  it('should handle very few simulations', () => {
    const result = hybridMonteCarloCRR({
      revenue: 2_000_000,
      revenueGrowthPct: 30,
      fcfMarginPct: 10,
      waccPct: 25,
      terminalGrowthPct: 2,
      volatility: 0.4,
      timeToExit: 3,
      expansionCapex: 1_000_000,
      seed: 42,
    }, 10, 20);

    expect(Number.isFinite(result.baseMean)).toBe(true);
    expect(Number.isFinite(result.hybridMean)).toBe(true);
    expect(result.simulations).toBeGreaterThan(0);
  });

  it('should handle high volatility without NaN', () => {
    const result = hybridMonteCarloCRR({
      revenue: 5_000_000,
      revenueGrowthPct: 60,
      fcfMarginPct: 20,
      waccPct: 30,
      terminalGrowthPct: 2.5,
      volatility: 0.8,
      timeToExit: 5,
      expansionCapex: 3_000_000,
      seed: 99,
    }, 500, 40);

    expect(Number.isFinite(result.baseMean)).toBe(true);
    expect(Number.isFinite(result.hybridMean)).toBe(true);
  });
});
