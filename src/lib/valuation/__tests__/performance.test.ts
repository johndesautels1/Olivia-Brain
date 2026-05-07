// ═══════════════════════════════════════════════════════════════════════
// SESSION 10 — PERFORMANCE BENCHMARKS
// Verifies engine meets latency targets:
//   MC 5000 sims     < 3s
//   CRR 80 steps     < 500ms
//   Hybrid 2500 sims < 5s
//   Full engine       < 5s
//   Sensitivity       < 2s
// ═══════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { runValuation } from '../engine';
import { monteCarloDCF } from '../monte-carlo';
import { hybridMonteCarloCRR } from '../hybrid';
import { calculateCRRRealOption, calculateExpansionOption, calculateAbandonmentOption } from '../real-options';
import { calculateCompoundCRR } from '../real-options-compound';
import { SensitivityAnalyzer } from '../sensitivity';
import type { CompanyValuationInput, Scenario } from '../types';

// ── Helpers ─────────────────────────────────────────────────────────

function me(value: number | null, confidence = 0.7) {
  return { value, confidence, refs: [] };
}

function timeMs(fn: () => void): number {
  const start = performance.now();
  fn();
  return performance.now() - start;
}

// ── Test fixture ────────────────────────────────────────────────────

const TEST_INPUT: CompanyValuationInput = {
  companyName: 'PerfTest Corp',
  companyId: 'perf-001',
  sector: 'SaaS',
  geography: 'London',
  stage: 'growth',
  businessModel: 'saas',

  annualRevenue: me(2_000_000),
  arr: me(2_400_000),
  grossMarginPct: me(72),
  ebitda: me(300_000),
  ebitdaMarginPct: me(15),
  burnMonthly: me(80_000),
  runwayMonths: me(18),
  growthYoYPct: me(45),
  netRevenueRetentionPct: me(115),
  churnPct: me(5),
  customerConcentrationTop3Pct: me(25),
  cacPaybackMonths: me(12),
  ltvToCac: me(4.5),
  burnMultiple: me(1.5),

  cashOnHand: me(1_500_000),
  debt: me(200_000),
  fullyDilutedShares: me(10_000_000),
  optionPoolPct: me(15),

  tam: me(5_000_000_000),
  sam: me(500_000_000),
  som: me(50_000_000),
  marketGrowthPct: me(12),

  capitalRaisedToDate: me(3_000_000),
  lastRoundPreMoney: me(8_000_000),
  lastRoundPostMoney: me(10_000_000),

  founderDependencyRisk: 0.4,
  legalRisk: 0.2,
  ipStrength: 0.65,
  productMaturity: 0.6,
  goToMarketMaturity: 0.55,
  londonStrategicFit: 0.7,
  managementStrength: 0.65,
  founderReputationScore: 0.6,
  competitionIntensityScore: 0.5,

  capitalizedBuildCost: me(1_200_000),
  replacementCost: me(1_500_000),
  patentsCount: 2,
  proprietaryDataScore: 0.4,
  trademarksCount: 3,
  regulatoryApprovals: false,

  volatility: 0.45,
  timeToExit: 3,
  expansionCapex: me(2_000_000),
  salvageValue: me(1_000_000),

  marketBenchmarks: {
    revenueMultipleLow: 5,
    revenueMultipleBase: 8,
    revenueMultipleHigh: 12,
    ebitdaMultipleLow: 8,
    ebitdaMultipleBase: 12,
    ebitdaMultipleHigh: 18,
    discountRatePct: 25,
    terminalGrowthPct: 2.5,
    targetInvestorReturnPct: 35,
  },
};

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

const MC_PARAMS = {
  revenue: 2_400_000,
  revenueGrowthPct: 45,
  fcfMarginPct: 15,
  waccPct: 25,
  terminalGrowthPct: 2.5,
  projectionYears: 5,
  taxRate: 0.19,
  workingCapitalPct: 0.05,
  capexPct: 0.03,
  growthDecayPctPerYear: 4,
};

// ═══════════════════════════════════════════════════════════════════════
// BENCHMARK TESTS
// ═══════════════════════════════════════════════════════════════════════

describe('Performance: Monte Carlo DCF', () => {
  it('should run 5000 simulations in under 3 seconds', () => {
    const elapsed = timeMs(() => {
      monteCarloDCF(MC_PARAMS, 5000, 42);
    });

    console.log(`  MC 5000 sims: ${elapsed.toFixed(1)}ms`);
    expect(elapsed).toBeLessThan(3000);
  });

  it('should run 10000 simulations in under 6 seconds', () => {
    const elapsed = timeMs(() => {
      monteCarloDCF(MC_PARAMS, 10000, 42);
    });

    console.log(`  MC 10000 sims: ${elapsed.toFixed(1)}ms`);
    expect(elapsed).toBeLessThan(6000);
  });
});

describe('Performance: CRR Binomial Tree', () => {
  it('should price 80-step call option in under 500ms', () => {
    const elapsed = timeMs(() => {
      calculateCRRRealOption(10_000_000, 3_000_000, 0.45, 3, 0.045, 'call', true, 80);
    });

    console.log(`  CRR 80-step call: ${elapsed.toFixed(1)}ms`);
    expect(elapsed).toBeLessThan(500);
  });

  it('should price 80-step put option in under 500ms', () => {
    const elapsed = timeMs(() => {
      calculateCRRRealOption(10_000_000, 5_000_000, 0.45, 3, 0.045, 'put', true, 80);
    });

    console.log(`  CRR 80-step put: ${elapsed.toFixed(1)}ms`);
    expect(elapsed).toBeLessThan(500);
  });

  it('should run expansion + abandonment options in under 500ms combined', () => {
    const elapsed = timeMs(() => {
      calculateExpansionOption(10_000_000, 3_000_000, 0.45, 3);
      calculateAbandonmentOption(10_000_000, 2_500_000, 0.45, 3);
    });

    console.log(`  CRR expansion+abandonment: ${elapsed.toFixed(1)}ms`);
    expect(elapsed).toBeLessThan(500);
  });

  it('should price compound option in under 1 second', () => {
    const elapsed = timeMs(() => {
      calculateCompoundCRR({
        underlying: 10_000_000,
        outerStrike: 1_500_000,
        innerStrike: 8_000_000,
        volatility: 0.45,
        timeYearsOuter: 1,
        timeYearsInner: 2,
      });
    });

    console.log(`  CRR compound: ${elapsed.toFixed(1)}ms`);
    expect(elapsed).toBeLessThan(1000);
  });
});

describe('Performance: Hybrid MC + CRR', () => {
  it('should run 2500 hybrid simulations in under 5 seconds', () => {
    const elapsed = timeMs(() => {
      hybridMonteCarloCRR({
        revenue: 2_400_000,
        revenueGrowthPct: 45,
        fcfMarginPct: 15,
        waccPct: 25,
        terminalGrowthPct: 2.5,
        volatility: 0.45,
        timeToExit: 3,
        expansionCapex: 2_000_000,
        seed: 42,
      }, 2500, 60);
    });

    console.log(`  Hybrid 2500 sims (60 CRR steps): ${elapsed.toFixed(1)}ms`);
    expect(elapsed).toBeLessThan(5000);
  });

  it('should run 1000 hybrid simulations in under 2 seconds', () => {
    const elapsed = timeMs(() => {
      hybridMonteCarloCRR({
        revenue: 2_400_000,
        revenueGrowthPct: 45,
        fcfMarginPct: 15,
        waccPct: 25,
        terminalGrowthPct: 2.5,
        volatility: 0.45,
        timeToExit: 3,
        expansionCapex: 2_000_000,
        seed: 42,
      }, 1000, 40);
    });

    console.log(`  Hybrid 1000 sims (40 CRR steps): ${elapsed.toFixed(1)}ms`);
    expect(elapsed).toBeLessThan(2000);
  });
});

describe('Performance: Full Valuation Engine', () => {
  it('should run full engine (10+ methods + MC + CRR) in under 5 seconds', () => {
    const elapsed = timeMs(() => {
      runValuation(TEST_INPUT, BASE_SCENARIO, 'vc');
    });

    console.log(`  Full engine (VC): ${elapsed.toFixed(1)}ms`);
    expect(elapsed).toBeLessThan(5000);
  });

  it('should run full engine for acquirer (with compound CRR) in under 5 seconds', () => {
    const elapsed = timeMs(() => {
      runValuation(TEST_INPUT, BASE_SCENARIO, 'acquirer');
    });

    console.log(`  Full engine (Acquirer): ${elapsed.toFixed(1)}ms`);
    expect(elapsed).toBeLessThan(5000);
  });

  it('should run 5-buyer × 3-scenario matrix (15 runs) in under 15 seconds', () => {
    const scenarios: Scenario[] = [
      BASE_SCENARIO,
      { ...BASE_SCENARIO, name: 'Bull', revenueGrowthShockPct: 20, multipleShockPct: 15 },
      { ...BASE_SCENARIO, name: 'Bear', revenueGrowthShockPct: -25, multipleShockPct: -20 },
    ];
    const buyers = ['angel', 'vc', 'private_equity', 'strategic_partner', 'acquirer'] as const;

    const elapsed = timeMs(() => {
      for (const buyer of buyers) {
        for (const scenario of scenarios) {
          runValuation(TEST_INPUT, scenario, buyer);
        }
      }
    });

    console.log(`  15-run matrix: ${elapsed.toFixed(1)}ms (${(elapsed / 15).toFixed(1)}ms avg)`);
    expect(elapsed).toBeLessThan(15000);
  });
});

describe('Performance: Sensitivity Analysis', () => {
  it('should generate tornado data in under 2 seconds', () => {
    const analyzer = new SensitivityAnalyzer(TEST_INPUT, BASE_SCENARIO, 'vc');

    const elapsed = timeMs(() => {
      analyzer.generateTornadoData();
    });

    console.log(`  Tornado analysis: ${elapsed.toFixed(1)}ms`);
    expect(elapsed).toBeLessThan(2000);
  });

  it('should generate scenarios in under 2 seconds', () => {
    const analyzer = new SensitivityAnalyzer(TEST_INPUT, BASE_SCENARIO, 'vc');

    const elapsed = timeMs(() => {
      analyzer.generateScenarios();
    });

    console.log(`  Scenario analysis: ${elapsed.toFixed(1)}ms`);
    expect(elapsed).toBeLessThan(2000);
  });

  it('should generate stress cascade in under 2 seconds', () => {
    const analyzer = new SensitivityAnalyzer(TEST_INPUT, BASE_SCENARIO, 'vc');

    const elapsed = timeMs(() => {
      analyzer.generateStressCascade();
    });

    console.log(`  Stress cascade: ${elapsed.toFixed(1)}ms`);
    expect(elapsed).toBeLessThan(2000);
  });

  it('should run full sensitivity suite (tornado + scenarios + stress) in under 5 seconds', () => {
    const analyzer = new SensitivityAnalyzer(TEST_INPUT, BASE_SCENARIO, 'vc');

    const elapsed = timeMs(() => {
      analyzer.generateTornadoData();
      analyzer.generateScenarios();
      analyzer.generateStressCascade();
    });

    console.log(`  Full sensitivity suite: ${elapsed.toFixed(1)}ms`);
    expect(elapsed).toBeLessThan(5000);
  });
});
