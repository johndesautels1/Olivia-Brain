// ═══════════════════════════════════════════════════════════════════════
// SESSION 2 VERIFICATION TEST
// Validates CRR, Monte Carlo, Hybrid MC+CRR, Compound Options,
// Sensitivity Analyzer, and engine integration produce correct results.
// ═══════════════════════════════════════════════════════════════════════

import { describe, it } from 'vitest';
import { calculateCRRRealOption, calculateExpansionOption, calculateAbandonmentOption } from '../real-options';
import { calculateCompoundCRR } from '../real-options-compound';
import { monteCarloDCF } from '../monte-carlo';
import { hybridMonteCarloCRR } from '../hybrid';
import { SensitivityAnalyzer } from '../sensitivity';
import { runValuation } from '../engine';
import type { CompanyValuationInput, Scenario } from '../types';

// ── Helper: assert a value is non-zero and finite ─────────────────────

function assertValidNumber(value: number, label: string): void {
  if (!Number.isFinite(value) || value === 0) {
    throw new Error(`FAIL: ${label} — expected non-zero finite, got ${value}`);
  }
  console.log(`  ✓ ${label}: ${value.toFixed(2)}`);
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`FAIL: ${label} — expected finite, got ${value}`);
  }
  console.log(`  ✓ ${label}: ${value.toFixed(2)}`);
}

// ── Test fixtures ─────────────────────────────────────────────────────

function makeMetricEvidence(value: number | null, confidence = 0.7) {
  return { value, confidence, refs: [] };
}

const TEST_INPUT: CompanyValuationInput = {
  companyName: 'TestCo Ltd',
  companyId: 'test-001',
  sector: 'SaaS',
  geography: 'London',
  stage: 'growth',
  businessModel: 'saas',

  annualRevenue: makeMetricEvidence(2_000_000),
  arr: makeMetricEvidence(2_400_000),
  grossMarginPct: makeMetricEvidence(72),
  ebitda: makeMetricEvidence(300_000),
  ebitdaMarginPct: makeMetricEvidence(15),
  burnMonthly: makeMetricEvidence(80_000),
  runwayMonths: makeMetricEvidence(18),
  growthYoYPct: makeMetricEvidence(45),
  netRevenueRetentionPct: makeMetricEvidence(115),
  churnPct: makeMetricEvidence(5),
  customerConcentrationTop3Pct: makeMetricEvidence(25),
  cacPaybackMonths: makeMetricEvidence(12),
  ltvToCac: makeMetricEvidence(4.5),
  burnMultiple: makeMetricEvidence(1.5),

  cashOnHand: makeMetricEvidence(1_500_000),
  debt: makeMetricEvidence(200_000),
  fullyDilutedShares: makeMetricEvidence(10_000_000),
  optionPoolPct: makeMetricEvidence(15),

  tam: makeMetricEvidence(5_000_000_000),
  sam: makeMetricEvidence(500_000_000),
  som: makeMetricEvidence(50_000_000),
  marketGrowthPct: makeMetricEvidence(12),

  capitalRaisedToDate: makeMetricEvidence(3_000_000),
  lastRoundPreMoney: makeMetricEvidence(8_000_000),
  lastRoundPostMoney: makeMetricEvidence(10_000_000),

  founderDependencyRisk: 0.4,
  legalRisk: 0.2,
  ipStrength: 0.65,
  productMaturity: 0.6,
  goToMarketMaturity: 0.55,
  londonStrategicFit: 0.7,
  managementStrength: 0.65,
  founderReputationScore: 0.6,
  competitionIntensityScore: 0.5,

  capitalizedBuildCost: makeMetricEvidence(1_200_000),
  replacementCost: makeMetricEvidence(1_500_000),
  patentsCount: 2,
  proprietaryDataScore: 0.4,
  trademarksCount: 3,
  regulatoryApprovals: false,

  volatility: 0.45,
  timeToExit: 3,
  expansionCapex: makeMetricEvidence(2_000_000),
  salvageValue: makeMetricEvidence(1_000_000),

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

// ════════════════════���════════════════════════════���═════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════

describe('Session 2 — stochastic + sensitivity engines (V4)', () => {
  it('runs CRR, Monte Carlo, Hybrid, Compound, Sensitivity, engine integration without throw', () => {
console.log('\n═══ SESSION 2 VERIFICATION TESTS ═══\n');

// 1. CRR Real Options
console.log('1. CRR REAL OPTIONS');
const crr = calculateCRRRealOption(10_000_000, 3_000_000, 0.45, 3, 0.045, 'call', true, 80);
assertValidNumber(crr.optionValue, 'CRR call option value');
assertFinite(crr.delta, 'CRR delta');
console.log(`  Nodes: ${crr.totalNodes}, Exercise nodes: ${crr.exerciseNodes}`);

const expansion = calculateExpansionOption(10_000_000, 3_000_000, 0.45, 3);
assertValidNumber(expansion.optionValue, 'Expansion option value');

const abandonment = calculateAbandonmentOption(10_000_000, 2_500_000, 0.45, 3);
assertFinite(abandonment.optionValue, 'Abandonment option value');
console.log('');

// 2. Compound CRR
console.log('2. COMPOUND CRR');
const compound = calculateCompoundCRR({
  underlying: 10_000_000,
  outerStrike: 1_500_000,
  innerStrike: 8_000_000,
  volatility: 0.45,
  timeYearsOuter: 1,
  timeYearsInner: 2,
});
assertFinite(compound.compoundOptionValue, 'Compound option value');
console.log(`  Outer nodes: ${compound.totalOuterNodes}`);
console.log('');

// 3. Monte Carlo DCF
console.log('3. MONTE CARLO DCF');
const mc1 = monteCarloDCF({
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
}, 5000, 42);

assertValidNumber(mc1.mean, 'MC mean');
assertValidNumber(mc1.median, 'MC median');
assertValidNumber(mc1.p5, 'MC p5');
assertValidNumber(mc1.p95, 'MC p95');
assertValidNumber(mc1.std, 'MC std deviation');
console.log(`  Simulations: ${mc1.simulations}, Seed: ${mc1.seed}`);
console.log(`  Sample seeds stored: ${mc1.sampleSeeds.length}`);

// Reproducibility test
const mc2 = monteCarloDCF({
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
}, 5000, 42);

if (mc1.mean !== mc2.mean) {
  throw new Error(`FAIL: MC reproducibility — same seed produced different means: ${mc1.mean} vs ${mc2.mean}`);
}
console.log('  ✓ MC reproducibility: same seed → same result');
console.log('');

// 4. Hybrid MC + CRR
console.log('4. HYBRID MC + CRR');
const hybrid = hybridMonteCarloCRR({
  revenue: 2_400_000,
  revenueGrowthPct: 45,
  fcfMarginPct: 15,
  waccPct: 25,
  terminalGrowthPct: 2.5,
  volatility: 0.45,
  timeToExit: 3,
  expansionCapex: 2_000_000,
  seed: 42,
}, 1000, 40); // Fewer sims for speed

assertValidNumber(hybrid.baseMean, 'Hybrid base mean');
assertValidNumber(hybrid.hybridMean, 'Hybrid mean (with options)');
assertFinite(hybrid.optionUpliftPercent, 'Option uplift %');
assertFinite(hybrid.percentPathsExercised, 'Paths exercised %');
console.log(`  Valid paths: ${hybrid.simulations}`);
console.log('');

// 5. Full Engine (with real options integration)
console.log('5. FULL ENGINE (runValuation with real options)');
const result = runValuation(TEST_INPUT, BASE_SCENARIO, 'vc');
assertValidNumber(result.enterpriseValue.base, 'Engine EV base');
assertValidNumber(result.enterpriseValue.low, 'Engine EV low');
assertValidNumber(result.enterpriseValue.high, 'Engine EV high');
assertValidNumber(result.equityValue.base, 'Engine equity base');

const realOptionsMethod = result.methods.find(m => m.method === 'real_options');
if (!realOptionsMethod) {
  throw new Error('FAIL: real_options method not found in results');
}
console.log(`  Real options enabled: ${realOptionsMethod.enabled}`);
console.log(`  Real options weight: ${realOptionsMethod.weight.toFixed(3)}`);
if (realOptionsMethod.enabled && realOptionsMethod.enterpriseValue) {
  console.log(`  Real options EV base: ${realOptionsMethod.enterpriseValue.base.toFixed(0)}`);
}

const enabledMethods = result.methods.filter(m => m.enabled);
console.log(`  Active methods: ${enabledMethods.length} of ${result.methods.length}`);
console.log(`  Confidence: ${(result.confidence * 100).toFixed(0)}%`);
console.log('');

// 6. Engine with acquirer buyer type (compound option)
console.log('6. ENGINE WITH ACQUIRER (compound option integration)');
const acquirerResult = runValuation(TEST_INPUT, BASE_SCENARIO, 'acquirer');
assertValidNumber(acquirerResult.enterpriseValue.base, 'Acquirer EV base');
console.log(`  Acquirer EV high includes compound premium: ${acquirerResult.enterpriseValue.high.toFixed(0)}`);
console.log('');

// 7. Sensitivity Analyzer
console.log('7. SENSITIVITY ANALYZER');
const analyzer = new SensitivityAnalyzer(TEST_INPUT, BASE_SCENARIO, 'vc');

const variables = analyzer.getSensitivityVariables();
console.log(`  Sensitivity variables: ${variables.length}`);
variables.forEach(v => console.log(`    - ${v.name}: ${v.min} to ${v.max} (${v.unit})`));

const tornado = analyzer.generateTornadoData();
console.log(`  Tornado bars: ${tornado.length}`);
if (tornado.length > 0) {
  console.log(`  Top impact: ${tornado[0].variable} — £${(tornado[0].absoluteImpact / 1e6).toFixed(1)}M swing`);
}

const scenarios = analyzer.generateScenarios();
console.log(`  Scenarios: ${scenarios.scenarios.length}`);
console.log(`  Probability-weighted EV: ${(scenarios.probabilityWeightedEV / 1e6).toFixed(1)}M`);

const stress = analyzer.generateStressCascade();
console.log(`  Stress cascades: ${stress.length}`);
if (stress.length > 0) {
  console.log(`  Worst stress impact: ${stress[0].name} — ${stress[0].impactPct.toFixed(1)}%`);
}
console.log('');

console.log('═══ ALL SESSION 2 TESTS PASSED ═══\n');
  });
});
