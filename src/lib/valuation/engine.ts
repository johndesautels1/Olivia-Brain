import type {
  CompanyValuationInput,
  Scenario,
  BuyerType,
  ValuationBand,
  ValuationMethodResult,
  ValuationMethodName,
  MethodDisagreement,
  ReconciledValuationResult,
  MonteCarloResult,
  MetricEvidence,
} from './types';
import { nz, band, mergeBandsWeighted, equityFromEnterprise, qualityPenaltyPct, clamp } from './helpers';
import { getBenchmarksForSector, getRegionalBenchmark, getDiscountRate, UK_CORP_TAX_RATE, WORKING_CAPITAL_PCT, CAPEX_PCT } from './benchmarks';
import { calculateExpansionOption, calculateAbandonmentOption } from './real-options';
import { calculateCompoundCRR } from './real-options-compound';
import { monteCarloDCF } from './monte-carlo';

// ═══════════════════════════════════════════════════════════════════════
// STAGE-AWARE WEIGHT PRESETS
// ═══════════════════════════════════════════════════════════════════════

const STAGE_WEIGHT_PRESETS: Record<string, Partial<Record<ValuationMethodName, number>>> = {
  idea: { scorecard: 0.30, vc_method: 0.25, cost_to_duplicate: 0.15, liquidation: 0.10, real_options: 0.20 },
  pre_revenue: { scorecard: 0.30, vc_method: 0.25, cost_to_duplicate: 0.15, liquidation: 0.10, real_options: 0.20 },
  mvp: { revenue_multiple: 0.30, vc_method: 0.20, scorecard: 0.15, precedent_transactions: 0.20, real_options: 0.15 },
  early_revenue: { revenue_multiple: 0.30, vc_method: 0.20, scorecard: 0.15, precedent_transactions: 0.20, real_options: 0.15 },
  growth: { revenue_multiple: 0.30, dcf: 0.25, precedent_transactions: 0.20, strategic_synergy: 0.15, real_options: 0.10 },
  scaleup: { dcf: 0.25, ebitda_multiple: 0.25, precedent_transactions: 0.25, strategic_synergy: 0.15, real_options: 0.10 },
  mature: { dcf: 0.25, ebitda_multiple: 0.25, precedent_transactions: 0.25, strategic_synergy: 0.15, real_options: 0.10 },
};

function getStageWeights(stage: string): Partial<Record<ValuationMethodName, number>> {
  return STAGE_WEIGHT_PRESETS[stage] || STAGE_WEIGHT_PRESETS['growth'];
}

// ═══════════════════════════════════════════════════════════════════════
// BUYER-TYPE ADJUSTMENTS
// ═══════════════════════════════════════════════════════════════════════

function applyBuyerTypeAdjustments(
  weights: Record<string, number>,
  buyerType: BuyerType
): Record<string, number> {
  const adjusted = { ...weights };

  // Helper: bump a method weight by a relative amount, clamping to [0, ∞).
  // Post-normalization (step 3b in runValuation) converts these to proportions,
  // so only *relative* differences between methods matter — not absolute sums.
  const bump = (method: string, delta: number) => {
    adjusted[method] = Math.max(0, (adjusted[method] || 0) + delta);
  };

  switch (buyerType) {
    case 'angel':
      // Angels evaluate founder quality (scorecard) and team-rebuild cost.
      // DCF / EBITDA are irrelevant at angel stage — most companies are pre-profit.
      bump('scorecard', 0.15);
      bump('cost_to_duplicate', 0.05);
      bump('dcf', -0.10);
      bump('ebitda_multiple', -0.10);
      bump('precedent_transactions', -0.05);
      break;

    case 'vc':
      // Seed VCs anchor on the VC back-solve (target IRR → present value) and
      // revenue multiples (top-line traction is the primary metric at seed).
      // DCF is heavily penalised at seed — projections are too speculative.
      // EBITDA is largely irrelevant (most seed companies are pre-profit).
      bump('vc_method', 0.15);
      bump('revenue_multiple', 0.10);
      bump('scorecard', 0.05);
      bump('dcf', -0.15);
      bump('ebitda_multiple', -0.10);
      break;

    case 'private_equity':
      // PE buyers focus on cash-flow-based methods: DCF and EBITDA multiples.
      // VC method and scorecard carry little weight in institutional diligence.
      bump('dcf', 0.15);
      bump('ebitda_multiple', 0.15);
      bump('precedent_transactions', 0.05);
      bump('vc_method', -0.15);
      bump('scorecard', -0.10);
      break;

    case 'strategic_partner':
      // Strategic buyers pay synergy premiums and value market access.
      // Revenue multiples matter (revenue drives synergy sizing).
      // Liquidation / cost-to-duplicate are irrelevant — they are not buying assets.
      bump('strategic_synergy', 0.20);
      bump('revenue_multiple', 0.05);
      bump('liquidation', -0.10);
      bump('cost_to_duplicate', -0.05);
      break;

    case 'acquirer':
      // Buyout acquirers use precedent transactions, EBITDA multiples (LBO entry),
      // and strategic synergy. VC method is irrelevant to control buyers.
      bump('precedent_transactions', 0.15);
      bump('ebitda_multiple', 0.10);
      bump('strategic_synergy', 0.10);
      bump('vc_method', -0.10);
      bump('scorecard', -0.10);
      break;
  }

  return adjusted;
}

// ═══════════════════════════════════════════════════════════════════════
// METHOD 1: REVENUE MULTIPLE
// ═══════════════════════════════════════════════════════════════════════

// Piecewise linear interpolation between breakpoints.
// Points: [[x0,y0], [x1,y1], ...] sorted by x ascending.
// Below first x → first y; above last x → last y.
function piecewiseLerp(x: number, points: [number, number][]): number {
  if (points.length === 0) return 1;
  if (x <= points[0][0]) return points[0][1];
  if (x >= points[points.length - 1][0]) return points[points.length - 1][1];
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    if (x >= x0 && x <= x1) {
      const t = (x - x0) / (x1 - x0);
      return y0 + t * (y1 - y0);
    }
  }
  return points[points.length - 1][1];
}

function calcRevenueMultiple(
  input: CompanyValuationInput,
  scenario: Scenario
): ValuationMethodResult {
  const revenue = nz(input.arr.value) || nz(input.annualRevenue.value);
  if (!revenue) {
    return disabledResult('revenue_multiple', 'No revenue data available');
  }

  const benchmarks = getBenchmarksForSector(input.sector);
  const baseMultiple = nz(input.marketBenchmarks.revenueMultipleBase, benchmarks.revenue);

  // Growth lift — smooth piecewise linear (no cliff effects)
  const growth = nz(input.growthYoYPct.value, 0);
  const growthLift = piecewiseLerp(growth, [[0, 0.90], [10, 1.0], [25, 1.05], [50, 1.15], [80, 1.25]]);

  // NRR lift — smooth piecewise linear
  const nrr = nz(input.netRevenueRetentionPct.value, 100);
  const nrrLift = piecewiseLerp(nrr, [[85, 0.88], [95, 0.92], [100, 1.0], [110, 1.08], [120, 1.15]]);

  // Margin lift — smooth piecewise linear
  const margin = nz(input.grossMarginPct.value, 60);
  const marginLift = piecewiseLerp(margin, [[30, 0.90], [45, 0.90], [60, 1.0], [75, 1.08]]);

  // Unit economics lift (LTV/CAC) — smooth piecewise linear
  // LTV/CAC ≥ 3x = capital-efficient growth → premium multiple
  // LTV/CAC < 1x = burning money to acquire customers → discount
  // ltvCac = 0 means no data → no adjustment (1.0)
  const ltvCac = nz(input.ltvToCac.value);
  const unitEconLift = ltvCac > 0
    ? piecewiseLerp(ltvCac, [[0, 0.85], [1, 0.93], [2, 1.0], [3, 1.06], [5, 1.12]])
    : 1.0;

  // Quality penalty
  const penaltyPct = qualityPenaltyPct(
    input.founderDependencyRisk,
    input.legalRisk,
    input.customerConcentrationTop3Pct.value
  );
  const qualityMultiplier = Math.max(0.5, 1 - penaltyPct / 100);

  // Apply scenario shocks
  const multipleShock = 1 + (scenario.multipleShockPct / 100);

  const adjustedMultiple = baseMultiple * growthLift * nrrLift * marginLift * unitEconLift * qualityMultiplier * multipleShock;
  const ev = revenue * adjustedMultiple;

  // Stage fit
  const stage = input.stage;
  let stageFit = 0.6;
  if (stage === 'early_revenue' || stage === 'growth' || stage === 'scaleup') stageFit = 0.95;
  else if (stage === 'pre_revenue') stageFit = 0.35;
  else if (stage === 'mature') stageFit = 0.85;

  // Data quality from evidence confidence
  const dataQuality = clamp(
    (input.arr.confidence + input.annualRevenue.confidence + input.growthYoYPct.confidence) / 3
  );

  const assumptions = [
    `Base revenue multiple: ${baseMultiple}x (${input.sector} sector)`,
    `Growth lift: ${growthLift}x (${growth}% YoY)`,
    `NRR lift: ${nrrLift}x (${nrr}%)`,
    `Margin lift: ${marginLift}x (${margin}% gross margin)`,
  ];
  if (ltvCac > 0) {
    assumptions.push(`Unit economics lift: ${unitEconLift}x (LTV/CAC ${ltvCac.toFixed(1)}x)`);
  }
  assumptions.push(`Quality discount: ${(penaltyPct).toFixed(1)}%`);

  return {
    method: 'revenue_multiple',
    enabled: true,
    stageFit,
    dataQuality,
    weight: 0,
    enterpriseValue: band(ev, 0.20),
    equityValue: null,
    summary: `Revenue of ${formatCompact(revenue)} × adjusted multiple of ${adjustedMultiple.toFixed(1)}x (base ${baseMultiple}x with growth ${growthLift.toFixed(2)}x, NRR ${nrrLift.toFixed(2)}x, margin ${marginLift.toFixed(2)}x${ltvCac > 0 ? `, LTV/CAC ${unitEconLift.toFixed(2)}x` : ''}, quality ${qualityMultiplier.toFixed(2)}x)`,
    assumptions,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// METHOD 2: EBITDA MULTIPLE
// ═══════════════════════════════════════════════════════════════════════

function calcEbitdaMultiple(
  input: CompanyValuationInput,
  scenario: Scenario
): ValuationMethodResult {
  const ebitda = nz(input.ebitda.value);
  if (!ebitda || ebitda <= 0) {
    return disabledResult('ebitda_multiple', 'No positive EBITDA available');
  }

  const benchmarks = getBenchmarksForSector(input.sector);
  const baseMultiple = nz(input.marketBenchmarks.ebitdaMultipleBase, benchmarks.ebitda ?? 8);

  // Margin quality adjustment
  const ebitdaMargin = nz(input.ebitdaMarginPct.value, 15);
  let marginAdj = 1.0;
  if (ebitdaMargin >= 30) marginAdj = 1.15;
  else if (ebitdaMargin >= 20) marginAdj = 1.05;
  else if (ebitdaMargin < 10) marginAdj = 0.85;

  const multipleShock = 1 + (scenario.multipleShockPct / 100);
  const adjustedMultiple = baseMultiple * marginAdj * multipleShock;
  const ev = ebitda * adjustedMultiple;

  // Stage fit
  const stage = input.stage;
  let stageFit = 0.5;
  if (stage === 'scaleup' || stage === 'mature') stageFit = 0.95;
  else if (stage === 'growth') stageFit = 0.7;
  else stageFit = 0.2;

  const dataQuality = clamp(
    (input.ebitda.confidence + input.ebitdaMarginPct.confidence) / 2
  );

  return {
    method: 'ebitda_multiple',
    enabled: true,
    stageFit,
    dataQuality,
    weight: 0,
    enterpriseValue: band(ev, 0.18),
    equityValue: null,
    summary: `EBITDA of ${formatCompact(ebitda)} × adjusted multiple of ${adjustedMultiple.toFixed(1)}x`,
    assumptions: [
      `Base EBITDA multiple: ${baseMultiple}x (${input.sector} sector)`,
      `Margin adjustment: ${marginAdj}x (${ebitdaMargin}% EBITDA margin)`,
    ],
  };
}

// ═══════════════════════════════════════════════════════════════════════
// METHOD 3: DCF (Discounted Cash Flow)
// ═══════════════════════════════════════════════════════════════════════

function calcDCF(
  input: CompanyValuationInput,
  scenario: Scenario
): ValuationMethodResult {
  const revenue = nz(input.arr.value) || nz(input.annualRevenue.value);
  if (!revenue) {
    return disabledResult('dcf', 'No revenue data for DCF projection');
  }

  const growthBase = nz(input.growthYoYPct.value, 20) / 100;
  const growthShock = scenario.revenueGrowthShockPct / 100;
  let currentGrowth = growthBase + growthShock;

  const ebitdaMargin = nz(input.ebitdaMarginPct.value, 15) / 100;
  const marginShock = scenario.marginShockPct / 100;
  const adjustedMargin = ebitdaMargin + marginShock;

  const taxRate = UK_CORP_TAX_RATE;
  const workingCapitalPct = WORKING_CAPITAL_PCT;
  const capexPct = CAPEX_PCT;

  const discountRateBase = nz(input.marketBenchmarks.discountRatePct, getDiscountRate(input.stage) * 100) / 100;
  const discountRateShock = scenario.discountRateShockPct / 100;
  const discountRate = discountRateBase + discountRateShock;

  const terminalGrowth = nz(input.marketBenchmarks.terminalGrowthPct, 2.5) / 100;

  // Guard: WACC must exceed terminal growth for Gordon Growth to produce a finite value.
  // If the spread is < 3pp after shocks, the terminal value becomes unreasonably large.
  if (discountRate <= terminalGrowth) {
    return disabledResult('dcf', `Discount rate (${(discountRate * 100).toFixed(1)}%) ≤ terminal growth (${(terminalGrowth * 100).toFixed(1)}%) — DCF undefined`);
  }
  const gordonSpread = discountRate - terminalGrowth;
  const MIN_GORDON_SPREAD = 0.03; // 3pp floor
  const effectiveGordonSpread = Math.max(gordonSpread, MIN_GORDON_SPREAD);

  // 5-year FCFF projection with growth decay (reduce growth by 4% per year)
  let projRevenue = revenue;
  let totalPV = 0;

  for (let year = 1; year <= 5; year++) {
    projRevenue = projRevenue * (1 + currentGrowth);
    const ebitdaProj = projRevenue * adjustedMargin;
    const nopat = ebitdaProj * (1 - taxRate);
    const wcChange = projRevenue * workingCapitalPct * currentGrowth;
    const capex = projRevenue * capexPct;
    const fcff = nopat - wcChange - capex;
    const discountFactor = Math.pow(1 + discountRate, year);
    totalPV += fcff / discountFactor;

    // Decay growth by 4% per year
    currentGrowth = Math.max(terminalGrowth, currentGrowth - 0.04);
  }

  // Terminal value via Gordon Growth Model
  const terminalRevenue = projRevenue * (1 + terminalGrowth);
  const terminalEBITDA = terminalRevenue * adjustedMargin;
  const terminalNOPAT = terminalEBITDA * (1 - taxRate);
  const terminalFCFF = terminalNOPAT - (terminalRevenue * workingCapitalPct * terminalGrowth) - (terminalRevenue * capexPct);
  const terminalValue = terminalFCFF / effectiveGordonSpread;
  const terminalPV = terminalValue / Math.pow(1 + discountRate, 5);

  const ev = totalPV + terminalPV;

  if (!Number.isFinite(ev) || ev <= 0) {
    return disabledResult('dcf', 'DCF produced non-positive or non-finite result');
  }

  // Stage fit
  const stage = input.stage;
  let stageFit = 0.6;
  if (stage === 'growth' || stage === 'scaleup' || stage === 'mature') stageFit = 0.85;
  else stageFit = 0.4;

  // Penalize data quality when Gordon spread is narrow (< 4pp).
  // The 3pp floor prevents infinite terminal values, but a floored DCF
  // should carry less weight in the blend — the valuation is unstable.
  const NARROW_SPREAD_THRESHOLD = 0.04;
  const spreadPenalty = gordonSpread < NARROW_SPREAD_THRESHOLD
    ? gordonSpread / NARROW_SPREAD_THRESHOLD  // linear scale: 3pp→0.75, 2pp→0.50, etc.
    : 1;

  const dataQuality = clamp(
    ((input.annualRevenue.confidence + input.ebitdaMarginPct.confidence + input.growthYoYPct.confidence) / 3)
    * spreadPenalty
  );

  return {
    method: 'dcf',
    enabled: true,
    stageFit,
    dataQuality,
    weight: 0,
    enterpriseValue: band(ev, 0.25),
    equityValue: null,
    summary: `5-year DCF with ${(growthBase * 100).toFixed(0)}% initial growth decaying 4%/yr, ${(adjustedMargin * 100).toFixed(0)}% EBITDA margin, ${(discountRate * 100).toFixed(0)}% discount rate`,
    assumptions: [
      `Initial revenue: ${formatCompact(revenue)}`,
      `Growth rate: ${(growthBase * 100).toFixed(1)}% decaying 4%/yr`,
      `EBITDA margin: ${(adjustedMargin * 100).toFixed(1)}%`,
      `Discount rate (WACC): ${(discountRate * 100).toFixed(1)}%`,
      `Terminal growth: ${(terminalGrowth * 100).toFixed(1)}%`,
      `Gordon Growth spread: ${(effectiveGordonSpread * 100).toFixed(1)}%${gordonSpread < MIN_GORDON_SPREAD ? ` (floored from ${(gordonSpread * 100).toFixed(1)}% — narrow spread would inflate terminal value)` : ''}${spreadPenalty < 1 ? ` ⚠ Narrow spread — DCF weight reduced by ${((1 - spreadPenalty) * 100).toFixed(0)}%` : ''}`,
      `Tax rate: 19% (UK)`,
    ],
  };
}

// ═══════════════════════════════════════════════════════════════════════
// METHOD 4: VC BACK-SOLVE
// ═══════════════════════════════════════════════════════════════════════

function calcVCBackSolve(
  input: CompanyValuationInput,
  scenario: Scenario
): ValuationMethodResult {
  const revenue = nz(input.arr.value) || nz(input.annualRevenue.value);
  if (!revenue) {
    return disabledResult('vc_method', 'No revenue data for VC back-solve');
  }

  const growth = nz(input.growthYoYPct.value, 30) / 100;
  const growthShock = scenario.revenueGrowthShockPct / 100;
  const adjustedGrowth = growth + growthShock;

  const benchmarks = getBenchmarksForSector(input.sector);
  const exitMultiple = nz(input.marketBenchmarks.revenueMultipleBase, benchmarks.revenue);
  const multipleShock = 1 + (scenario.multipleShockPct / 100);
  const adjustedExitMultiple = exitMultiple * multipleShock;

  // Target investor return
  const targetReturn = nz(input.marketBenchmarks.targetInvestorReturnPct, 35) / 100;

  // Years to exit based on stage
  let yearsToExit = 4;
  if (input.stage === 'pre_revenue' || input.stage === 'idea') yearsToExit = 5;
  else if (input.stage === 'early_revenue') yearsToExit = 4;
  else if (input.stage === 'growth') yearsToExit = 3;
  else yearsToExit = 2;

  // Project forward revenue at growth rate
  const exitRevenue = revenue * Math.pow(1 + adjustedGrowth, yearsToExit);

  // Apply exit multiple
  const exitValue = exitRevenue * adjustedExitMultiple;

  // Discount back at target investor return rate
  const ev = exitValue / Math.pow(1 + targetReturn, yearsToExit);

  if (!Number.isFinite(ev) || ev <= 0) {
    return disabledResult('vc_method', 'VC back-solve produced non-positive result');
  }

  // Burn multiple: net burn / net new ARR. Lower = more efficient growth.
  // High burn multiple (>3x) signals unsustainable growth → widen the band.
  const burnMult = nz(input.burnMultiple.value);
  let burnSpreadAdj = 0;
  if (burnMult > 4) burnSpreadAdj = 0.10;       // very inefficient → wider band
  else if (burnMult > 2) burnSpreadAdj = 0.05;   // moderate → slightly wider

  // LTV/CAC: validates the growth story. Poor unit economics means the
  // projected growth rate is expensive and may not hold.
  // Apply as a modest EV adjustment (±8% max) — the VC method already
  // has wide bands, so this nudges the base rather than swinging it.
  const ltvCac = nz(input.ltvToCac.value);
  const cacPayback = nz(input.cacPaybackMonths.value);
  let unitEconAdj = 1.0;
  if (ltvCac > 0) {
    if (ltvCac >= 5) unitEconAdj += 0.06;
    else if (ltvCac >= 3) unitEconAdj += 0.03;
    else if (ltvCac < 1) unitEconAdj -= 0.08;
    else if (ltvCac < 2) unitEconAdj -= 0.04;
  }
  if (cacPayback > 0) {
    if (cacPayback <= 12) unitEconAdj += 0.02;
    else if (cacPayback > 24) unitEconAdj -= 0.04;
  }
  const adjustedEV = ev * unitEconAdj;

  // Stage fit
  const stage = input.stage;
  let stageFit = 0.6;
  if (stage === 'idea' || stage === 'pre_revenue' || stage === 'mvp' || stage === 'early_revenue' || stage === 'growth') {
    stageFit = 0.9;
  } else {
    stageFit = 0.45;
  }

  const dataQuality = clamp(
    (input.annualRevenue.confidence + input.growthYoYPct.confidence) / 2
  );

  const vcAssumptions = [
    `Current revenue: ${formatCompact(revenue)}`,
    `Growth rate: ${(adjustedGrowth * 100).toFixed(1)}%`,
    `Years to exit: ${yearsToExit}`,
    `Exit multiple: ${adjustedExitMultiple.toFixed(1)}x`,
    `Target IRR: ${(targetReturn * 100).toFixed(0)}%`,
  ];
  if (ltvCac > 0) {
    vcAssumptions.push(`LTV/CAC: ${ltvCac.toFixed(1)}x${ltvCac >= 3 ? ' (efficient)' : ltvCac < 1 ? ' (unsustainable)' : ''}`);
  }
  if (cacPayback > 0) {
    vcAssumptions.push(`CAC payback: ${cacPayback.toFixed(0)} months${cacPayback > 18 ? ' (long)' : cacPayback <= 12 ? ' (healthy)' : ''}`);
  }
  if (burnMult > 0) {
    vcAssumptions.push(`Burn multiple: ${burnMult.toFixed(1)}x${burnMult > 3 ? ' (high — growth may be inefficient)' : burnMult <= 1.5 ? ' (efficient)' : ''}`);
  }
  if (unitEconAdj !== 1.0) {
    vcAssumptions.push(`Unit economics adjustment: ${unitEconAdj > 1 ? '+' : ''}${((unitEconAdj - 1) * 100).toFixed(0)}% applied to base EV`);
  }

  return {
    method: 'vc_method',
    enabled: true,
    stageFit,
    dataQuality,
    weight: 0,
    enterpriseValue: band(adjustedEV, 0.30 + burnSpreadAdj),
    equityValue: null,
    summary: `VC back-solve: ${formatCompact(revenue)} growing ${(adjustedGrowth * 100).toFixed(0)}%/yr for ${yearsToExit}yr → exit at ${adjustedExitMultiple.toFixed(1)}x → discount at ${(targetReturn * 100).toFixed(0)}% IRR`,
    assumptions: vcAssumptions,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// METHOD 5: COST-TO-DUPLICATE
// ═══════════════════════════════════════════════════════════════════════

function calcCostToDuplicate(
  input: CompanyValuationInput,
  _scenario: Scenario
): ValuationMethodResult {
  const buildCost = nz(input.capitalizedBuildCost.value);
  const replacementCost = nz(input.replacementCost.value);
  const baseCost = Math.max(buildCost, replacementCost);

  if (!baseCost) {
    return disabledResult('cost_to_duplicate', 'No build cost or replacement cost data');
  }

  const patentValue = input.patentsCount * 25_000;
  const dataValue = input.proprietaryDataScore * 500_000;
  const ipValue = input.ipStrength * 750_000;

  const ev = baseCost + patentValue + dataValue + ipValue;

  // Stage fit
  const stage = input.stage;
  const bm = input.businessModel;
  let stageFit = 0.45;
  if (stage === 'idea' || stage === 'pre_revenue' || bm === 'deeptech') stageFit = 0.75;

  const dataQuality = clamp(
    (input.capitalizedBuildCost.confidence + input.replacementCost.confidence) / 2
  );

  return {
    method: 'cost_to_duplicate',
    enabled: true,
    stageFit,
    dataQuality,
    weight: 0,
    enterpriseValue: band(ev, 0.15),
    equityValue: null,
    summary: `Cost-to-duplicate: base ${formatCompact(baseCost)} + patents ${formatCompact(patentValue)} + data ${formatCompact(dataValue)} + IP ${formatCompact(ipValue)}`,
    assumptions: [
      `Build/replacement cost: ${formatCompact(baseCost)}`,
      `${input.patentsCount} patents × £25,000 = ${formatCompact(patentValue)}`,
      `Proprietary data score: ${input.proprietaryDataScore} × £500K = ${formatCompact(dataValue)}`,
      `IP strength: ${input.ipStrength} × £750K = ${formatCompact(ipValue)}`,
    ],
  };
}

// ═══════════════════════════════════════════════════════════════════════
// METHOD 6: SCORECARD / BERKUS
// ═══════════════════════════════════════════════════════════════════════

function calcScorecard(
  input: CompanyValuationInput,
  _scenario: Scenario
): ValuationMethodResult {
  const factors = input.scorecardFactors ?? {
    team: 1, opportunity: 1, product: 1, competition: 1,
    marketing: 1, needForCapital: 1, other: 1,
  };

  const regionalBenchmark = input.regionalSeedBenchmark ?? getRegionalBenchmark(input.geography);

  // Weights: team 30%, opportunity 25%, product 15%, competition 10%, marketing 10%, needForCapital 5%, other 5%
  const weightedMultiplier =
    factors.team * 0.30 +
    factors.opportunity * 0.25 +
    factors.product * 0.15 +
    factors.competition * 0.10 +
    factors.marketing * 0.10 +
    factors.needForCapital * 0.05 +
    factors.other * 0.05;

  const ev = regionalBenchmark * weightedMultiplier;

  // Stage fit
  const stage = input.stage;
  let stageFit = 0.5;
  if (stage === 'idea' || stage === 'pre_revenue') stageFit = 0.9;
  else if (stage === 'early_revenue') stageFit = 0.6;
  else stageFit = 0.3;

  // Data quality: scorecard relies on qualitative factor inputs — derive from
  // how many factors differ from the neutral 1.0 default (i.e. were actually provided)
  const factorValues = [factors.team, factors.opportunity, factors.product, factors.competition, factors.marketing, factors.needForCapital, factors.other];
  const nonDefaultCount = factorValues.filter(f => f !== 1.0).length;
  const scorecardDataQuality = clamp(0.3 + (nonDefaultCount / factorValues.length) * 0.6);

  return {
    method: 'scorecard',
    enabled: true,
    stageFit,
    dataQuality: scorecardDataQuality,
    weight: 0,
    enterpriseValue: band(ev, 0.25),
    equityValue: null,
    summary: `Scorecard: ${formatCompact(regionalBenchmark)} regional benchmark × ${weightedMultiplier.toFixed(2)} factor multiplier`,
    assumptions: [
      `Regional seed benchmark: ${formatCompact(regionalBenchmark)} (${input.geography})`,
      `Team: ${factors.team.toFixed(1)} (30%), Opportunity: ${factors.opportunity.toFixed(1)} (25%)`,
      `Product: ${factors.product.toFixed(1)} (15%), Competition: ${factors.competition.toFixed(1)} (10%)`,
      `Marketing: ${factors.marketing.toFixed(1)} (10%), Capital: ${factors.needForCapital.toFixed(1)} (5%)`,
      `Weighted multiplier: ${weightedMultiplier.toFixed(2)}`,
    ],
  };
}

// ═══════════════════════════════════════════════════════════════════════
// METHOD 7: LIQUIDATION / BOOK VALUE
// ═══════════════════════════════════════════════════════════════════════

function calcLiquidation(
  input: CompanyValuationInput,
  _scenario: Scenario
): ValuationMethodResult {
  const cash = nz(input.cashOnHand.value);
  const debt = nz(input.debt.value);
  const ipEstimate = input.ipStrength * 500_000 + input.patentsCount * 20_000;

  const netAssets = cash - debt;
  const ev = Math.max(0, netAssets + ipEstimate);

  return {
    method: 'liquidation',
    enabled: true,
    stageFit: 0.3,
    dataQuality: clamp((input.cashOnHand.confidence + input.debt.confidence) / 2),
    weight: 0,
    enterpriseValue: band(ev, 0.10),
    equityValue: null,
    summary: `Liquidation/book value: net assets ${formatCompact(netAssets)} + IP estimate ${formatCompact(ipEstimate)}`,
    assumptions: [
      `Cash: ${formatCompact(cash)}`,
      `Debt: ${formatCompact(debt)}`,
      `IP estimate: ${formatCompact(ipEstimate)}`,
      `This is a floor valuation only`,
    ],
  };
}

// ═══════════════════════════════════════════════════════════════════════
// METHOD 8: STRATEGIC SYNERGY
// ═══════════════════════════════════════════════════════════════════════

function calcStrategicSynergy(
  input: CompanyValuationInput,
  scenario: Scenario,
  standaloneEV: number
): ValuationMethodResult {
  if (!input.strategicSynergy) {
    return disabledResult('strategic_synergy', 'No strategic synergy inputs provided');
  }

  const synergy = input.strategicSynergy;
  const synergyValue = synergy.annualSynergyValue * 3 * synergy.synergyRealizationProbability;
  const premiumMultiplier = 1 + (synergy.buyerPremiumPct / 100);
  const synergyShock = 1 + (scenario.synergyPremiumPct / 100);

  const ev = (standaloneEV + synergyValue) * premiumMultiplier * synergyShock;

  // Stage fit
  const stage = input.stage;
  let stageFit = 0.5;
  if (stage === 'growth' || stage === 'scaleup' || stage === 'mature') stageFit = 0.85;

  // Data quality: based on how concrete the synergy inputs are.
  // High probability + meaningful annual value = high quality data.
  const synergyConfidence = clamp(
    synergy.synergyRealizationProbability * 0.5 +
    (synergy.annualSynergyValue > 0 ? 0.3 : 0) +
    (synergy.buyerPremiumPct > 0 ? 0.2 : 0)
  );

  return {
    method: 'strategic_synergy',
    enabled: true,
    stageFit,
    dataQuality: synergyConfidence,
    weight: 0,
    enterpriseValue: band(ev, 0.20),
    equityValue: null,
    summary: `Strategic synergy: standalone ${formatCompact(standaloneEV)} + synergy value ${formatCompact(synergyValue)} × ${premiumMultiplier.toFixed(2)}x buyer premium`,
    assumptions: [
      `Annual synergy value: ${formatCompact(synergy.annualSynergyValue)}`,
      `Synergy realization probability: ${(synergy.synergyRealizationProbability * 100).toFixed(0)}%`,
      `Buyer premium: ${synergy.buyerPremiumPct}%`,
      `Synergy capitalized at 3x annual`,
    ],
  };
}

// ═══════════════════════════════════════════════════════════════════════
// METHOD 9: PRECEDENT TRANSACTIONS
// ═══════════════════════════════════════════════════════════════════════

function calcPrecedentTransactions(
  input: CompanyValuationInput,
  scenario: Scenario
): ValuationMethodResult {
  const revenue = nz(input.arr.value) || nz(input.annualRevenue.value);
  const lastPreMoney = nz(input.lastRoundPreMoney.value);
  const lastPostMoney = nz(input.lastRoundPostMoney.value);
  const capitalRaised = nz(input.capitalRaisedToDate.value);

  // ── Primary path: actual funding round data ──────────────────────
  // The company's last funding round is a real precedent transaction —
  // someone actually priced this company. Growth-adjust to present.
  const lastRoundEV = lastPreMoney || lastPostMoney;

  if (lastRoundEV) {
    const growth = nz(input.growthYoYPct.value, 15) / 100;
    const multipleShock = 1 + (scenario.multipleShockPct / 100);

    // Growth-adjust: if the company has grown since last round, the
    // precedent EV should reflect that traction. Cap at 3x to avoid
    // runaway extrapolation from a stale round.
    const growthAdj = Math.min(3.0, 1 + growth) * multipleShock;
    const ev = lastRoundEV * growthAdj;

    // Stage fit — funding-round comps are relevant across all stages
    const stage = input.stage;
    let stageFit = 0.6;
    if (stage === 'growth' || stage === 'scaleup') stageFit = 0.85;
    else if (stage === 'early_revenue' || stage === 'mvp') stageFit = 0.7;

    // High data quality — this is a real transaction, not a proxy
    const dataQuality = clamp(
      (input.lastRoundPreMoney.confidence + input.lastRoundPostMoney.confidence) / 2 + 0.15
    );

    const assumptions: string[] = [
      `Source: last funding round (actual transaction)`,
      `Round valuation: ${formatCompact(lastRoundEV)} ${lastPreMoney ? 'pre-money' : 'post-money'}`,
      `Growth adjustment: ${(growth * 100).toFixed(0)}% YoY → ${growthAdj.toFixed(2)}x`,
      `Growth-adjusted EV: ${formatCompact(ev)}`,
    ];
    if (capitalRaised) {
      assumptions.push(`Total capital raised to date: ${formatCompact(capitalRaised)}`);
    }
    if (revenue) {
      const impliedMultiple = ev / revenue;
      assumptions.push(`Implied revenue multiple: ${impliedMultiple.toFixed(1)}x on ${formatCompact(revenue)} revenue`);
    }

    return {
      method: 'precedent_transactions',
      enabled: true,
      stageFit,
      dataQuality,
      weight: 0,
      enterpriseValue: band(ev, 0.18),
      equityValue: null,
      summary: `Based on last funding round of ${formatCompact(lastRoundEV)}, growth-adjusted ${(growth * 100).toFixed(0)}% to ${formatCompact(ev)}`,
      assumptions,
    };
  }

  // ── Fallback path: sector benchmark proxy ────────────────────────
  // No funding history — use sector median as a proxy with a steep
  // discount and low data quality so this carries minimal weight.
  if (!revenue) {
    return disabledResult('precedent_transactions', 'No revenue data or funding history for precedent comparison');
  }

  const benchmarks = getBenchmarksForSector(input.sector);
  const sectorMultiple = nz(input.marketBenchmarks.revenueMultipleBase, benchmarks.revenue);
  const proxyDiscount = 0.70; // 30% discount — this is a proxy, not a real comp
  const precedentMultiple = sectorMultiple * proxyDiscount;
  const multipleShock = 1 + (scenario.multipleShockPct / 100);
  const adjustedMultiple = precedentMultiple * multipleShock;

  const ev = revenue * adjustedMultiple;

  // Stage fit — sector proxy is weakest for early-stage (few comps)
  const stage = input.stage;
  let stageFit = 0.35;
  if (stage === 'growth' || stage === 'scaleup') stageFit = 0.65;
  else if (stage === 'mature') stageFit = 0.7;

  // Low data quality — this is a proxy, not actual transaction data
  const dataQuality = clamp(input.annualRevenue.confidence * 0.6);

  return {
    method: 'precedent_transactions',
    enabled: true,
    stageFit,
    dataQuality,
    weight: 0,
    enterpriseValue: band(ev, 0.28),
    equityValue: null,
    summary: `Sector proxy — no funding round data available. ${input.sector} median discounted 30%`,
    assumptions: [
      `Source: sector benchmark proxy (no comparable transaction data)`,
      `Revenue: ${formatCompact(revenue)}`,
      `${input.sector} sector median multiple: ${sectorMultiple}x`,
      `Proxy discount: 30% → adjusted multiple: ${adjustedMultiple.toFixed(1)}x`,
      `Proxy EV: ${formatCompact(ev)}`,
      `Data quality reduced — add funding history for higher accuracy`,
    ],
  };
}

// ═══════════════════════════════════════════════════════════════════════
// METHOD 10: STRATEGIC ADJUSTMENT (overlay, not standalone)
// ═══════════════════════════════════════════════════════════════════════

function calcStrategicAdjustmentMultiplier(
  input: CompanyValuationInput,
  scenario: Scenario
): { multiplier: number; summary: string; assumptions: string[] } {
  // Premium from positives
  const londonPremium = input.londonStrategicFit * 0.10;
  const ipPremium = input.ipStrength * 0.08;
  const mgmtPremium = input.managementStrength * 0.06;

  // Discount from risks — coefficients halved (5% and 4%) because
  // founderDependencyRisk and legalRisk are already penalized at full
  // strength inside Revenue Multiple's qualityPenaltyPct (8% and 10%).
  // The overlay captures the residual cross-method effect without
  // double-counting the full penalty on methods that already apply it.
  const legalDiscount = input.legalRisk * 0.05;
  const founderDiscount = input.founderDependencyRisk * 0.04;

  const strategicPremiumShock = scenario.strategicPremiumPct / 100;

  const netAdjustment = londonPremium + ipPremium + mgmtPremium - legalDiscount - founderDiscount + strategicPremiumShock;
  const multiplier = 1 + netAdjustment;

  return {
    multiplier,
    summary: `Strategic adjustment: ${(netAdjustment * 100).toFixed(1)}% net (London ${(londonPremium * 100).toFixed(1)}% + IP ${(ipPremium * 100).toFixed(1)}% + Mgmt ${(mgmtPremium * 100).toFixed(1)}% − Legal ${(legalDiscount * 100).toFixed(1)}% − Founder risk ${(founderDiscount * 100).toFixed(1)}%)`,
    assumptions: [
      `London strategic fit: ${input.londonStrategicFit} → +${(londonPremium * 100).toFixed(1)}%`,
      `IP strength: ${input.ipStrength} → +${(ipPremium * 100).toFixed(1)}%`,
      `Management strength: ${input.managementStrength} → +${(mgmtPremium * 100).toFixed(1)}%`,
      `Legal risk: ${input.legalRisk} → −${(legalDiscount * 100).toFixed(1)}%`,
      `Founder dependency risk: ${input.founderDependencyRisk} → −${(founderDiscount * 100).toFixed(1)}%`,
    ],
  };
}

// ═══════════════════════════════════════════════════════════════════════
// RISK & OPPORTUNITY FLAGS
// ═══════════════════════════════════════════════════════════════════════

function collectRisks(input: CompanyValuationInput): string[] {
  const risks: string[] = [];

  // ── Stage-specific baseline risks (always populated) ──
  const stage = input.stage;
  if (stage === 'idea' || stage === 'pre_revenue') {
    risks.push('Pre-revenue stage — no proven market demand or revenue model');
    risks.push('High execution risk — product-market fit not yet validated');
  } else if (stage === 'mvp' || stage === 'early_revenue') {
    risks.push('Early-stage company — limited operating history and financial track record');
  }

  // ── Market & competitive risks (universal) ──
  risks.push('Market risk — sector conditions, regulation changes, or macro shifts could affect valuation');

  // ── Data-absence risks — flag missing data as a risk ──
  if (!nz(input.annualRevenue.value)) {
    risks.push('No revenue data provided — valuation relies on estimates and qualitative factors');
  }
  if (!nz(input.runwayMonths.value)) {
    risks.push('Cash runway unknown — inability to assess burn rate and funding needs');
  }

  // ── Threshold-based risks (when real data exceeds thresholds) ──
  if (input.founderDependencyRisk > 0.55) {
    risks.push(`Founder dependency risk (${(input.founderDependencyRisk * 100).toFixed(0)}%) — key-person concentration`);
  }
  if (input.legalRisk > 0.35) {
    risks.push(`Legal/regulatory risk (${(input.legalRisk * 100).toFixed(0)}%)`);
  }
  if (nz(input.customerConcentrationTop3Pct.value) > 40) {
    risks.push(`Customer concentration: top 3 clients = ${input.customerConcentrationTop3Pct.value}% of revenue`);
  }
  if (nz(input.runwayMonths.value) > 0 && nz(input.runwayMonths.value) < 12) {
    risks.push(`Short runway: ${input.runwayMonths.value} months remaining`);
  }
  if (nz(input.churnPct.value) > 8) {
    risks.push(`Elevated churn: ${input.churnPct.value}% annual churn rate`);
  }

  // ── Unit economics risks ──
  const ltvCac = nz(input.ltvToCac.value);
  if (ltvCac > 0 && ltvCac < 1) {
    risks.push(`LTV/CAC below 1.0x (${ltvCac.toFixed(1)}x) — customer acquisition cost exceeds lifetime value`);
  } else if (ltvCac >= 1 && ltvCac < 2) {
    risks.push(`LTV/CAC of ${ltvCac.toFixed(1)}x — unit economics are thin, below the 3x benchmark`);
  }
  const cacPayback = nz(input.cacPaybackMonths.value);
  if (cacPayback > 18) {
    risks.push(`CAC payback of ${cacPayback.toFixed(0)} months — capital-intensive customer acquisition`);
  }
  const burnMult = nz(input.burnMultiple.value);
  if (burnMult > 3) {
    risks.push(`Burn multiple of ${burnMult.toFixed(1)}x — spending ${burnMult.toFixed(1)}x more than net new ARR generated`);
  }

  return risks;
}

function collectOpportunities(input: CompanyValuationInput): string[] {
  const opps: string[] = [];

  // ── Stage-specific baseline opportunities ──
  const stage = input.stage;
  if (stage === 'growth' || stage === 'scaleup') {
    opps.push('Growth/scale-up stage — proven model with expansion potential');
  }
  if (stage === 'mature') {
    opps.push('Mature business — stable cash flows and predictable earnings');
  }

  // ── London ecosystem opportunity (always relevant for LTM) ──
  opps.push('London tech ecosystem — access to capital, talent, and global markets');

  // ── Data-driven opportunities ──
  if (nz(input.growthYoYPct.value) > 30) {
    opps.push(`Strong growth: ${input.growthYoYPct.value}% year-over-year revenue growth`);
  }
  if (nz(input.netRevenueRetentionPct.value) >= 100) {
    opps.push(`Healthy net revenue retention: ${input.netRevenueRetentionPct.value}%`);
  }
  if (input.ipStrength > 0.5) {
    opps.push(`Defensible IP position (${(input.ipStrength * 100).toFixed(0)}%)`);
  }
  if (input.londonStrategicFit > 0.5) {
    opps.push(`London tech ecosystem fit (${(input.londonStrategicFit * 100).toFixed(0)}%)`);
  }
  if (input.managementStrength > 0.6) {
    opps.push(`Strong management team (${(input.managementStrength * 100).toFixed(0)}%)`);
  }

  // ── Unit economics opportunities ──
  const ltvCac = nz(input.ltvToCac.value);
  if (ltvCac >= 3) {
    opps.push(`Strong unit economics: LTV/CAC of ${ltvCac.toFixed(1)}x${ltvCac >= 5 ? ' (excellent)' : ''}`);
  }
  const cacPayback = nz(input.cacPaybackMonths.value);
  if (cacPayback > 0 && cacPayback <= 12) {
    opps.push(`Fast CAC payback: ${cacPayback.toFixed(0)} months — capital-efficient customer acquisition`);
  }
  const burnMult = nz(input.burnMultiple.value);
  if (burnMult > 0 && burnMult <= 1.5) {
    opps.push(`Efficient growth: burn multiple of ${burnMult.toFixed(1)}x — generating ARR efficiently`);
  }

  return opps;
}

// ═══════════════════════════════════════════════════════════════════════
// METHOD DISAGREEMENT DETECTION
// ═══════════════════════════════════════════════════════════════════════

const METHOD_HUMAN_LABELS: Record<string, string> = {
  revenue_multiple: 'Revenue Multiple',
  ebitda_multiple: 'EBITDA Multiple',
  dcf: 'DCF',
  vc_method: 'VC Method',
  cost_to_duplicate: 'Cost to Duplicate',
  scorecard: 'Scorecard',
  strategic_synergy: 'Strategic Synergy',
  precedent_transactions: 'Precedent Transactions',
  liquidation: 'Liquidation',
  real_options: 'Real Options',
  strategic_adjustment: 'Strategic Adjustment',
};

const DISAGREEMENT_EXPLANATIONS: Record<string, string> = {
  'dcf|revenue_multiple': 'DCF penalizes negative or low margins heavily through FCFF while Revenue Multiple focuses on top-line growth potential.',
  'dcf|vc_method': 'DCF applies a risk-adjusted discount rate while VC Method back-solves using target IRR, leading to different present values.',
  'dcf|scorecard': 'DCF requires financial projections while Scorecard uses qualitative factors — they measure different things.',
  'cost_to_duplicate|dcf': 'DCF values future cash flows while Cost to Duplicate values sunk investment — fundamentally different perspectives.',
  'ebitda_multiple|revenue_multiple': 'Revenue Multiple rewards growth while EBITDA Multiple rewards profitability — common divergence for high-growth, low-margin companies.',
  'cost_to_duplicate|revenue_multiple': 'Revenue Multiple values commercial traction while Cost to Duplicate values technical investment.',
  'liquidation|revenue_multiple': 'Revenue Multiple captures going-concern value while Liquidation reflects break-up value.',
  'ebitda_multiple|vc_method': 'VC Method prices future potential at high discount while EBITDA Multiple prices current profitability.',
  'revenue_multiple|scorecard': 'Scorecard is based on qualitative factors and regional benchmarks while Revenue Multiple is based on actual traction.',
  'dcf|strategic_synergy': 'Strategic Synergy includes buyer-specific value that standalone DCF does not capture.',
  'dcf|liquidation': 'DCF values future earning power while Liquidation values the asset floor — this gap is structurally expected.',
  'dcf|real_options': 'DCF discounts projected cash flows while Real Options prices embedded optionality — divergence is expected for companies with significant strategic flexibility.',
  'liquidation|vc_method': 'VC Method prices future exit potential while Liquidation prices current asset value — large gaps are normal for asset-light startups.',
  'cost_to_duplicate|vc_method': 'VC Method targets a future exit return while Cost to Duplicate tallies historical spend — these rarely align.',
  'liquidation|scorecard': 'Scorecard captures qualitative potential while Liquidation captures tangible asset value.',
  'liquidation|real_options': 'Real Options values strategic flexibility while Liquidation values hard assets — structurally different perspectives.',
};

function detectDisagreements(methods: ValuationMethodResult[]): MethodDisagreement[] {
  const enabled = methods.filter(m => m.enabled && !m.isOverlay && m.enterpriseValue !== null);
  const disagreements: MethodDisagreement[] = [];

  for (let i = 0; i < enabled.length; i++) {
    for (let j = i + 1; j < enabled.length; j++) {
      const m1 = enabled[i];
      const m2 = enabled[j];
      const ev1 = m1.enterpriseValue!.base;
      const ev2 = m2.enterpriseValue!.base;

      if (ev1 === 0 && ev2 === 0) continue;

      const avg = (ev1 + ev2) / 2;
      if (avg === 0) continue;

      const divergencePct = Math.abs(ev1 - ev2) / avg * 100;

      // Threshold at 150% — methods like DCF vs Liquidation are structurally expected to diverge.
      // Only flag genuinely surprising gaps, not every pair that measures different things.
      if (divergencePct > 150) {
        const key = [m1.method, m2.method].sort().join('|');
        const label1 = METHOD_HUMAN_LABELS[m1.method] ?? m1.method;
        const label2 = METHOD_HUMAN_LABELS[m2.method] ?? m2.method;

        // Use ratio for large differences (>2x) instead of misleading symmetric %
        const hi = Math.max(ev1, ev2);
        const lo = Math.min(ev1, ev2);
        const ratio = lo > 0 ? hi / lo : Infinity;
        const gapText = ratio >= 3
          ? `a ${ratio.toFixed(0)}x difference (${formatCompact(lo)} vs ${formatCompact(hi)})`
          : `a ${formatCompact(Math.abs(ev1 - ev2))} spread (${divergencePct.toFixed(0)}% gap)`;

        const explanation = DISAGREEMENT_EXPLANATIONS[key] ||
          `${label1} values the company at ${formatCompact(ev1)} while ${label2} values it at ${formatCompact(ev2)} — ${gapText}.`;

        disagreements.push({
          method1: m1.method,
          method2: m2.method,
          divergencePct,
          explanation,
        });
      }
    }
  }

  // Sort by severity descending and cap at 3 — showing 10+ pairwise alerts is noise, not signal
  return disagreements.sort((a, b) => b.divergencePct - a.divergencePct).slice(0, 3);
}

// ═══════════════════════════════════════════════════════════════════════
// CONFIDENCE SCORE
// ═══════════════════════════════════════════════════════════════════════

function computeConfidence(methods: ValuationMethodResult[], input: CompanyValuationInput): number {
  const active = methods.filter(m => m.enabled && m.weight > 0);
  if (active.length === 0) return 0;

  // Factor 1: Method agreement — how tight is the EV spread?
  const baseValues = active
    .map(m => m.enterpriseValue?.base ?? 0)
    .filter(v => v > 0);
  let agreement = 0.5;
  if (baseValues.length >= 2) {
    const sorted = [...baseValues].sort((a, b) => a - b);
    const maxSpread = sorted[sorted.length - 1] / Math.max(1, sorted[0]);
    // 1x spread → 1.0, 5x → ~0.55, 10x → ~0.43, 50x → ~0.27
    agreement = clamp(1.0 / Math.pow(maxSpread, 0.35));
  }

  // Factor 2: Method coverage — more enabled methods = higher confidence
  const coverageScore = clamp(active.length / 7); // 7+ methods → 1.0

  // Factor 3: Average data quality across active methods
  const avgDataQuality = active.reduce((sum, m) => sum + m.dataQuality, 0) / active.length;

  // Factor 4: Average stage fit across active methods
  const avgStageFit = active.reduce((sum, m) => sum + m.stageFit, 0) / active.length;

  // Factor 5: Real data coverage — how many MetricEvidence fields have actual
  // non-null, non-zero values vs being left at defaults? All-default inputs
  // should not produce 60% confidence — that's misleading.
  const metricFields: MetricEvidence[] = [
    input.annualRevenue, input.arr, input.grossMarginPct, input.ebitda,
    input.ebitdaMarginPct, input.burnMonthly, input.runwayMonths,
    input.growthYoYPct, input.netRevenueRetentionPct, input.churnPct,
    input.customerConcentrationTop3Pct, input.cacPaybackMonths,
    input.ltvToCac, input.burnMultiple, input.cashOnHand, input.debt,
    input.fullyDilutedShares, input.optionPoolPct, input.capitalRaisedToDate,
    input.lastRoundPreMoney, input.lastRoundPostMoney,
    input.capitalizedBuildCost, input.replacementCost,
  ];
  const fieldsWithData = metricFields.filter(f => f.value !== null && f.value !== 0).length;
  // 0 fields → 0.05, 5 fields → 0.27, 10 → 0.48, 15 → 0.70, 20+ → 0.92+
  const realDataScore = clamp(0.05 + (fieldsWithData / metricFields.length) * 0.90);

  // Weighted combination — real data coverage is critical: without real data,
  // every other factor is operating on defaults and the confidence is hollow.
  return clamp(
    agreement * 0.25 +
    coverageScore * 0.15 +
    avgDataQuality * 0.20 +
    avgStageFit * 0.15 +
    realDataScore * 0.25
  );
}

// ═══════════════════════════════════════════════════════════════════════
// NARRATIVE GENERATOR (template-based, not LLM)
// ═══════════════════════════════════════════════════════════════════════

function generateNarrative(
  input: CompanyValuationInput,
  result: {
    enterpriseValue: ValuationBand;
    equityValue: ValuationBand;
    methods: ValuationMethodResult[];
    confidence: number;
    buyerType: BuyerType;
    risks: string[];
    opportunities: string[];
  }
): string {
  const enabledMethods = result.methods.filter(m => m.enabled);
  const methodNames = enabledMethods.map(m => m.method.replace(/_/g, ' ')).join(', ');

  const parts: string[] = [
    `${input.companyName} is a ${input.stage.replace(/_/g, '-')} stage ${input.sector} company based in ${input.geography}.`,
    `Using ${enabledMethods.length} valuation methods (${methodNames}), the reconciled enterprise value is ${formatCompact(result.enterpriseValue.base)} (range: ${formatCompact(result.enterpriseValue.low)} – ${formatCompact(result.enterpriseValue.high)}).`,
    `The implied equity value is ${formatCompact(result.equityValue.base)} (range: ${formatCompact(result.equityValue.low)} – ${formatCompact(result.equityValue.high)}).`,
    `Confidence in this estimate is ${(result.confidence * 100).toFixed(0)}%, based on data quality, method fit, and method agreement.`,
  ];

  if (result.risks.length > 0) {
    parts.push(`Key risks: ${result.risks.slice(0, 3).join('; ')}.`);
  }
  if (result.opportunities.length > 0) {
    parts.push(`Key opportunities: ${result.opportunities.slice(0, 3).join('; ')}.`);
  }

  parts.push(`This valuation is for a ${result.buyerType.replace(/_/g, ' ')} buyer perspective.`);

  return parts.join(' ');
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function disabledResult(method: ValuationMethodName, reason: string): ValuationMethodResult {
  return {
    method,
    enabled: false,
    stageFit: 0,
    dataQuality: 0,
    weight: 0,
    enterpriseValue: null,
    equityValue: null,
    summary: `Disabled: ${reason}`,
    assumptions: [],
  };
}

function formatCompact(n: number): string {
  if (n >= 1_000_000_000) return `£${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `£${(n / 1_000).toFixed(0)}K`;
  return `£${n.toFixed(0)}`;
}

// ═══════════════════════════════════════════════════════════════════════
// METHOD 11: REAL OPTIONS (CRR)
// ═══════════════════════════════════════════════════════════════════════

function calcRealOptions(
  input: CompanyValuationInput,
  standaloneEV: number
): ValuationMethodResult {
  if (standaloneEV <= 0) {
    return disabledResult('real_options', 'No standalone EV available for real options');
  }

  const volatility = input.volatility;
  const timeToExit = input.timeToExit;

  // Expansion option (call): right to invest capex for growth
  const expansionCapex = nz(input.expansionCapex?.value, standaloneEV * 0.3);
  const expansion = calculateExpansionOption(standaloneEV, expansionCapex, volatility, timeToExit);

  // Abandonment option (put): right to exit at salvage value
  const salvageValue = nz(input.salvageValue?.value, standaloneEV * 0.25);
  const abandonment = calculateAbandonmentOption(standaloneEV, salvageValue, volatility, timeToExit);

  // Take the maximum of expansion and abandonment option value
  const optionValue = Math.max(expansion.optionValue, abandonment.optionValue);
  const optionAdjustedEV = standaloneEV + optionValue;

  if (optionValue <= 0) {
    return disabledResult('real_options', 'Real options have zero value (options are out of the money)');
  }

  // Stage fit: higher for early-stage (more optionality value)
  const stage = input.stage;
  let stageFit = 0.5;
  if (stage === 'idea' || stage === 'pre_revenue') stageFit = 0.85;
  else if (stage === 'mvp' || stage === 'early_revenue') stageFit = 0.75;
  else if (stage === 'growth') stageFit = 0.65;
  else stageFit = 0.4;

  const expansionPct = ((expansion.optionValue / standaloneEV) * 100).toFixed(1);
  const abandonmentPct = ((abandonment.optionValue / standaloneEV) * 100).toFixed(1);

  // Data quality: based on whether key option inputs are user-supplied vs defaults
  const hasExpansionCapex = nz(input.expansionCapex?.value) > 0;
  const hasSalvageValue = nz(input.salvageValue?.value) > 0;
  const realOptionsDataQuality = clamp(
    0.3 +
    (hasExpansionCapex ? 0.25 : 0) +
    (hasSalvageValue ? 0.25 : 0) +
    (input.volatility > 0 ? 0.1 : 0) +
    (input.timeToExit > 0 ? 0.1 : 0)
  );

  return {
    method: 'real_options',
    enabled: true,
    stageFit,
    dataQuality: realOptionsDataQuality,
    weight: 0,
    enterpriseValue: band(optionAdjustedEV, 0.25),
    equityValue: null,
    summary: `Real options: standalone ${formatCompact(standaloneEV)} + option value ${formatCompact(optionValue)} (expansion ${expansionPct}%, abandonment ${abandonmentPct}%)`,
    assumptions: [
      `Underlying: ${formatCompact(standaloneEV)}`,
      `Volatility: ${(volatility * 100).toFixed(0)}%`,
      `Time to exit: ${timeToExit} years`,
      `Expansion option: ${formatCompact(expansion.optionValue)} (capex ${formatCompact(expansionCapex)})`,
      `Abandonment option: ${formatCompact(abandonment.optionValue)} (salvage ${formatCompact(salvageValue)})`,
      `CRR steps: 80, American exercise`,
    ],
  };
}

// ═══════════════════════════════════════════════════════════════════════
// MONTE CARLO INTEGRATION
// ═══════════════════════════════════════════════════════════════════════

// Stage-scaled MC shock sigmas (standard deviations).
// Early stages have wider uncertainty; mature companies have tighter bands.
// Consistent with Kroll/Duff & Phelps and Big 4 valuation practice.
const MC_SIGMA_BY_STAGE: Record<string, { growth: number; margin: number; wacc: number }> = {
  idea:          { growth: 0.30, margin: 0.15, wacc: 0.04 },
  pre_revenue:   { growth: 0.25, margin: 0.12, wacc: 0.035 },
  mvp:           { growth: 0.20, margin: 0.10, wacc: 0.03 },
  early_revenue: { growth: 0.18, margin: 0.09, wacc: 0.025 },
  growth:        { growth: 0.15, margin: 0.08, wacc: 0.02 },
  scaleup:       { growth: 0.10, margin: 0.06, wacc: 0.015 },
  mature:        { growth: 0.08, margin: 0.05, wacc: 0.01 },
};

export function runMonteCarloForRange(
  input: CompanyValuationInput,
  scenario: Scenario
): MonteCarloResult | null {
  const revenue = nz(input.arr.value) || nz(input.annualRevenue.value);
  if (!revenue) return null;

  const growthBase = nz(input.growthYoYPct.value, 20);
  const margin = input.fcfMargin !== undefined
    ? input.fcfMargin * 100
    : nz(input.ebitdaMarginPct.value, 15);
  const wacc = input.wacc !== undefined
    ? input.wacc * 100
    : nz(input.marketBenchmarks.discountRatePct, getDiscountRate(input.stage) * 100);
  const termGrowth = nz(input.marketBenchmarks.terminalGrowthPct, 2.5);

  const sigmas = MC_SIGMA_BY_STAGE[input.stage] ?? MC_SIGMA_BY_STAGE['growth'];

  return monteCarloDCF({
    revenue,
    revenueGrowthPct: growthBase + scenario.revenueGrowthShockPct,
    fcfMarginPct: margin + scenario.marginShockPct,
    waccPct: wacc + scenario.discountRateShockPct,
    terminalGrowthPct: termGrowth,
    projectionYears: 5,
    taxRate: UK_CORP_TAX_RATE,
    workingCapitalPct: WORKING_CAPITAL_PCT,
    capexPct: CAPEX_PCT,
    growthDecayPctPerYear: 4,
    revenueGrowthSigma: sigmas.growth,
    fcfMarginSigma: sigmas.margin,
    waccSigma: sigmas.wacc,
  }, 5000, 42); // deterministic seed for reproducibility
}

// ═══════════════════════════════════════════════════════════════════════
// BINOMIAL TREE NODE GENERATOR (for BinomialTreeViz)
// ═══════════════════════════════════════════════════════════════════════

export type VisualTreeNode = {
  step: number;
  state: number;
  assetPrice: number;
  optionValue: number;
  isExercised: boolean;
};

/**
 * Generate the first `visibleSteps` of a CRR binomial tree for visualization.
 * Runs a mini CRR lattice and returns node data for BinomialTreeViz.
 */
export function generateBinomialTreeNodes(
  underlying: number,
  strike: number,
  volatility: number,
  timeYears: number,
  optionType: 'call' | 'put' = 'call',
  visibleSteps = 6,
  riskFreeRate = 0.045,
): VisualTreeNode[] {
  if (underlying <= 0 || timeYears <= 0 || volatility <= 0) return [];

  const steps = visibleSteps;
  const dt = timeYears / steps;
  const u = Math.exp(volatility * Math.sqrt(dt));
  const d = 1 / u;
  const R = Math.exp(riskFreeRate * dt);
  const p = (R - d) / (u - d);

  if (p <= 0 || p >= 1) return [];

  // Forward pass: compute asset prices at each node
  const assetPrices: number[][] = [];
  for (let step = 0; step <= steps; step++) {
    assetPrices[step] = [];
    for (let state = 0; state <= step; state++) {
      assetPrices[step][state] = underlying * Math.pow(u, step - state) * Math.pow(d, state);
    }
  }

  // Backward pass: compute option values
  const optionValues: number[][] = [];

  // Terminal payoffs
  optionValues[steps] = [];
  for (let state = 0; state <= steps; state++) {
    const ap = assetPrices[steps][state];
    optionValues[steps][state] = optionType === 'call'
      ? Math.max(0, ap - strike)
      : Math.max(0, strike - ap);
  }

  // Backward induction
  for (let step = steps - 1; step >= 0; step--) {
    optionValues[step] = [];
    for (let state = 0; state <= step; state++) {
      const continuation = (p * optionValues[step + 1][state] + (1 - p) * optionValues[step + 1][state + 1]) / R;
      const ap = assetPrices[step][state];
      const intrinsic = optionType === 'call'
        ? Math.max(0, ap - strike)
        : Math.max(0, strike - ap);
      optionValues[step][state] = Math.max(continuation, intrinsic); // American exercise
    }
  }

  // Build node array
  const nodes: VisualTreeNode[] = [];
  for (let step = 0; step <= steps; step++) {
    for (let state = 0; state <= step; state++) {
      const ap = assetPrices[step][state];
      const ov = optionValues[step][state];
      const intrinsic = optionType === 'call'
        ? Math.max(0, ap - strike)
        : Math.max(0, strike - ap);
      nodes.push({
        step,
        state,
        assetPrice: ap,
        optionValue: ov,
        isExercised: intrinsic > 0 && intrinsic >= ov * 0.99,
      });
    }
  }

  return nodes;
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════

export interface RunValuationOptions {
  /** Skip Monte Carlo range refinement — used by sensitivity analyzer
   *  so tornado bars reflect weighted-blend changes, not MC noise. */
  skipMonteCarlo?: boolean;
}

export function runValuation(
  input: CompanyValuationInput,
  scenario: Scenario,
  buyerType: BuyerType,
  options?: RunValuationOptions
): ReconciledValuationResult {
  // 1. Run all 10 methods
  const revenueMultiple = calcRevenueMultiple(input, scenario);
  const ebitdaMultiple = calcEbitdaMultiple(input, scenario);
  const dcf = calcDCF(input, scenario);
  const vcMethod = calcVCBackSolve(input, scenario);
  const costToDuplicate = calcCostToDuplicate(input, scenario);
  const scorecard = calcScorecard(input, scenario);
  const liquidation = calcLiquidation(input, scenario);
  const precedent = calcPrecedentTransactions(input, scenario);

  // For strategic synergy + real options, we need a standalone EV first.
  // Use stage-aware weights (not simple arithmetic mean) so the standalone
  // proxy reflects the same method priorities as the final reconciliation.
  const stageWeightsForStandalone = getStageWeights(input.stage);
  const standaloneResults = [revenueMultiple, ebitdaMultiple, dcf, vcMethod, costToDuplicate, scorecard, precedent]
    .filter(m => m.enabled && m.enterpriseValue !== null);
  let standaloneEV = 0;
  if (standaloneResults.length > 0) {
    let weightedSum = 0;
    let weightSum = 0;
    for (const m of standaloneResults) {
      const w = stageWeightsForStandalone[m.method] ?? 0.05;
      weightedSum += m.enterpriseValue!.base * w;
      weightSum += w;
    }
    standaloneEV = weightSum > 0 ? weightedSum / weightSum : 0;
  }

  const strategicSynergy = calcStrategicSynergy(input, scenario, standaloneEV);

  // ── Real Options (CRR) ───────────────────────────────────────────────
  const realOptions = calcRealOptions(input, standaloneEV);

  const allMethods: ValuationMethodResult[] = [
    revenueMultiple,
    ebitdaMultiple,
    dcf,
    vcMethod,
    costToDuplicate,
    scorecard,
    liquidation,
    strategicSynergy,
    precedent,
    realOptions,
  ];

  // 2. Apply stage-aware weights
  const stageWeights = getStageWeights(input.stage);
  for (const method of allMethods) {
    if (method.enabled) {
      method.weight = stageWeights[method.method] ?? 0;
    }
  }

  // 3. Apply buyer-type adjustments
  const adjustedWeightsMap = applyBuyerTypeAdjustments(
    Object.fromEntries(allMethods.map(m => [m.method, m.weight])),
    buyerType
  );
  for (const method of allMethods) {
    method.weight = adjustedWeightsMap[method.method] ?? method.weight;
  }

  // 3b. Normalize weights so enabled methods sum to exactly 1.0
  const enabledMethods = allMethods.filter(m => m.enabled && m.weight > 0);
  const totalWeight = enabledMethods.reduce((sum, m) => sum + m.weight, 0);
  if (totalWeight > 0 && Math.abs(totalWeight - 1.0) > 0.001) {
    for (const method of enabledMethods) {
      method.weight = method.weight / totalWeight;
    }
  }

  // Apply control premium for acquirer buyerType
  if (buyerType === 'acquirer') {
    const controlPremium = 1 + (scenario.controlPremiumPct || 15) / 100;
    for (const method of allMethods) {
      if (method.enabled && method.enterpriseValue) {
        method.enterpriseValue = {
          low: method.enterpriseValue.low * controlPremium,
          base: method.enterpriseValue.base * controlPremium,
          high: method.enterpriseValue.high * controlPremium,
        };
      }
    }
  }

  // 4. Merge bands weighted
  const enabledWithEV = allMethods.filter(m => m.enabled && m.enterpriseValue !== null);
  let blendedEV: ValuationBand;

  if (enabledWithEV.length > 0) {
    blendedEV = mergeBandsWeighted(
      enabledWithEV.map(m => ({ band: m.enterpriseValue!, weight: m.weight }))
    );
  } else {
    blendedEV = { low: 0, base: 0, high: 0 };
  }

  // 4b. Monte Carlo range refinement: use MC spread anchored to the weighted blend base.
  // The weighted blend from multiple methods is the most robust base estimate.
  // MC (a single DCF simulation) should only inform the *spread* (how wide the
  // uncertainty band is), not replace the base outright.
  const mcResult = options?.skipMonteCarlo ? null : runMonteCarloForRange(input, scenario);
  if (mcResult && mcResult.mean > 0 && blendedEV.base > 0) {
    const ratio = mcResult.mean / blendedEV.base;
    // Sanity check: MC mean must be within 0.33x–3x of the weighted blend.
    // If outside that range, MC inputs are unreliable — keep symmetric spread.
    if (ratio >= 0.33 && ratio <= 3.0) {
      // Use MC's coefficient of variation to set the spread around the blend base.
      // p5-to-p95 span as a fraction of MC mean gives us the relative spread width.
      const mcSpreadPct = (mcResult.p95 - mcResult.p5) / mcResult.mean;
      // Apply that spread symmetrically around the blend base, clamped to ±80%
      const halfSpread = Math.min(0.80, mcSpreadPct / 2);
      blendedEV = {
        low: Math.max(0, blendedEV.base * (1 - halfSpread)),
        base: blendedEV.base,
        high: blendedEV.base * (1 + halfSpread),
      };
    }
    // else: MC too divergent from blend — keep the symmetric spread from mergeBandsWeighted
  }

  // 4c. Compound option: add compound CRR value when buyout scenario is active
  if (buyerType === 'acquirer' || buyerType === 'private_equity') {
    const compoundResult = calculateCompoundCRR({
      underlying: blendedEV.base,
      outerStrike: blendedEV.base * 0.15, // Stage 1 cost: 15% of value (due diligence / deposit)
      innerStrike: blendedEV.base * 0.85, // Stage 2 cost: 85% of value (completion)
      volatility: input.volatility,
      timeYearsOuter: Math.min(input.timeToExit, 1),  // Stage 1 decision within 1 year
      timeYearsInner: Math.max(input.timeToExit - 1, 0.5), // Stage 2 follows
    });

    if (compoundResult.compoundOptionValue > 0) {
      // Add compound option premium to the high-end estimate
      blendedEV = {
        low: blendedEV.low,
        base: blendedEV.base,
        high: blendedEV.high + compoundResult.compoundOptionValue,
      };
    }
  }

  // 5. Apply strategic adjustment overlay
  const stratAdj = calcStrategicAdjustmentMultiplier(input, scenario);
  const preAdjBase = blendedEV.base;
  blendedEV = {
    low: Math.max(0, blendedEV.low * stratAdj.multiplier),
    base: Math.max(0, blendedEV.base * stratAdj.multiplier),
    high: Math.max(0, blendedEV.high * stratAdj.multiplier),
  };

  // Add strategic adjustment as a method result for display.
  // enterpriseValue shows the post-adjustment reconciled EV so the method
  // card displays the final value. The overlay flag tells the UI this is
  // a multiplicative adjustment, not a standalone weighted method.
  const strategicAdjResult: ValuationMethodResult = {
    method: 'strategic_adjustment',
    enabled: true,
    isOverlay: true,
    stageFit: 0.5,
    dataQuality: 0.5,
    weight: 0,
    enterpriseValue: {
      low: blendedEV.low,
      base: blendedEV.base,
      high: blendedEV.high,
    },
    equityValue: null,
    summary: stratAdj.summary,
    assumptions: [
      ...stratAdj.assumptions,
      `Net adjustment: ${((stratAdj.multiplier - 1) * 100).toFixed(1)}% applied to weighted blend`,
      `Pre-adjustment EV: ${formatCompact(preAdjBase)} → Post-adjustment: ${formatCompact(blendedEV.base)}`,
    ],
  };
  allMethods.push(strategicAdjResult);

  // 5b. Final sanity clamp: base must always sit between low and high
  if (blendedEV.low > blendedEV.base) blendedEV.low = blendedEV.base * 0.7;
  if (blendedEV.high < blendedEV.base) blendedEV.high = blendedEV.base * 1.3;

  // 6. Compute equity from enterprise
  const cash = nz(input.cashOnHand.value);
  const debt = nz(input.debt.value);
  const equityValue = equityFromEnterprise(blendedEV, cash, debt);

  // 6b. Diluted equity — subtract option pool (ESOP) reserve.
  // Angels and VCs need to see the equity available to shareholders
  // after the option pool is carved out, not the gross equity.
  const optionPoolPct = clamp(nz(input.optionPoolPct.value, 0) / 100);
  const dilutedEquityValue: ValuationBand | null = optionPoolPct > 0
    ? {
        low: Math.max(0, equityValue.low * (1 - optionPoolPct)),
        base: Math.max(0, equityValue.base * (1 - optionPoolPct)),
        high: Math.max(0, equityValue.high * (1 - optionPoolPct)),
      }
    : null;

  // 7. Compute per-share value from diluted equity (if available) or gross equity
  const shares = nz(input.fullyDilutedShares.value);
  const equityForShares = dilutedEquityValue ?? equityValue;
  const perShareValue: ValuationBand | null = shares > 0
    ? {
        low: equityForShares.low / shares,
        base: equityForShares.base / shares,
        high: equityForShares.high / shares,
      }
    : null;

  // 8. Rule of 40: growth % + EBITDA margin %
  const r40Growth = nz(input.growthYoYPct.value);
  const r40Margin = nz(input.ebitdaMarginPct.value);
  const hasR40Data = nz(input.growthYoYPct.value) !== 0 || nz(input.ebitdaMarginPct.value) !== 0;
  const ruleOf40 = hasR40Data ? r40Growth + r40Margin : null;

  // 9. Collect risks and opportunities (include Rule of 40)
  const risks = collectRisks(input);
  const opportunities = collectOpportunities(input);

  if (ruleOf40 !== null) {
    if (ruleOf40 >= 40) {
      opportunities.push(`Rule of 40: ${ruleOf40.toFixed(0)}% (${r40Growth.toFixed(0)}% growth + ${r40Margin.toFixed(0)}% margin) — exceeds the 40% threshold`);
    } else if (ruleOf40 < 25) {
      risks.push(`Rule of 40: ${ruleOf40.toFixed(0)}% (${r40Growth.toFixed(0)}% growth + ${r40Margin.toFixed(0)}% margin) — below the 40% benchmark`);
    }
  }

  // 10. Compute confidence score
  const confidence = computeConfidence(allMethods, input);

  // 11. Detect method disagreements
  const methodDisagreements = detectDisagreements(allMethods);

  // 12. Generate basic narrative
  const narrative = generateNarrative(input, {
    enterpriseValue: blendedEV,
    equityValue,
    methods: allMethods,
    confidence,
    buyerType,
    risks,
    opportunities,
  });

  // 13. Return ReconciledValuationResult
  return {
    companyId: input.companyId,
    companyName: input.companyName,
    scenario: scenario.name,
    buyerType,
    confidence,
    enterpriseValue: blendedEV,
    equityValue,
    dilutedEquityValue,
    optionPoolPct,
    perShareValue,
    ruleOf40,
    methods: allMethods,
    risks,
    opportunities,
    narrative,
    methodDisagreements,
  };
}
