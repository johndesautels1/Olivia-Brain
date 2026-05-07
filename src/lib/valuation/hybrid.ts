// ═══════════════════════════════════════════════════════════════════════
// HYBRID MONTE CARLO + CRR ENGINE
// Runs Monte Carlo DCF paths, then applies CRR real option valuation
// at each terminal node to capture embedded option value.
// Adapted from Grok's hybrid implementation.
// ═══════════════════════════════════════════════════════════════════════

import type { HybridMCCRRResult } from './types';
import { calculateCRRRealOption } from './real-options';
import { UK_CORP_TAX_RATE, WORKING_CAPITAL_PCT, CAPEX_PCT } from './benchmarks';

// ── Deterministic PRNG (same Mulberry32 as monte-carlo.ts) ────────────

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return (): number => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalRandom(rng: () => number, mean: number, stdDev: number): number {
  const u1 = rng();
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(Math.max(1e-15, u1))) * Math.cos(2 * Math.PI * u2);
  return mean + stdDev * z;
}

// ── Hybrid Input ──────────────────────────────────────────────────────

export interface HybridMCCRRInputs {
  // DCF base parameters
  revenue: number;
  revenueGrowthPct: number;
  fcfMarginPct: number;
  waccPct: number;
  terminalGrowthPct: number;
  projectionYears?: number;
  taxRate?: number;
  workingCapitalPct?: number;
  capexPct?: number;
  growthDecayPctPerYear?: number;

  // MC shock parameters
  revenueGrowthSigma?: number;
  fcfMarginSigma?: number;
  waccSigma?: number;

  // Real option parameters
  volatility: number;
  timeToExit: number;
  expansionCapex: number;   // Strike for expansion (call) option

  // Seed
  seed?: number;
}

// ── Main Hybrid Engine ────────────────────────────────────────────────

/**
 * Hybrid Monte Carlo + CRR: runs MC DCF paths, applies CRR option
 * valuation at each terminal node.
 *
 * For each simulation:
 * 1. Run a shocked DCF to get a base enterprise value
 * 2. Apply CRR expansion option (call) to that base value
 * 3. Hybrid value = base value + option premium
 *
 * @param inputs      Combined DCF + option parameters
 * @param simulations Number of MC paths (default 2500)
 * @param stepsCRR    CRR tree steps per path (default 60)
 */
export function hybridMonteCarloCRR(
  inputs: HybridMCCRRInputs,
  simulations = 2500,
  stepsCRR = 60
): HybridMCCRRResult {
  const actualSeed = inputs.seed ?? Math.floor(Math.random() * 2147483647);
  const rng = mulberry32(actualSeed);

  const {
    revenue,
    revenueGrowthPct,
    fcfMarginPct,
    waccPct,
    terminalGrowthPct,
    projectionYears = 5,
    taxRate = UK_CORP_TAX_RATE,
    workingCapitalPct = WORKING_CAPITAL_PCT,
    capexPct = CAPEX_PCT,
    growthDecayPctPerYear = 4,
    revenueGrowthSigma = 0.15,
    fcfMarginSigma = 0.08,
    waccSigma = 0.02,
    volatility,
    timeToExit,
    expansionCapex,
  } = inputs;

  const baseGrowth = revenueGrowthPct / 100;
  const baseMargin = fcfMarginPct / 100;
  const baseWACC = waccPct / 100;
  const termGrowth = terminalGrowthPct / 100;

  const baseDistribution: number[] = [];
  const hybridDistribution: number[] = [];
  let pathsExercised = 0;
  let totalOptionPremium = 0;
  let validPaths = 0;

  for (let sim = 0; sim < simulations; sim++) {
    // Shock parameters
    let simGrowth = normalRandom(rng, baseGrowth, revenueGrowthSigma);
    const simMargin = Math.max(0.05, normalRandom(rng, baseMargin, fcfMarginSigma));
    const simWACC = Math.max(0.05, Math.min(0.80, normalRandom(rng, baseWACC, waccSigma)));
    const decay = growthDecayPctPerYear / 100;

    simGrowth = Math.max(-0.5, Math.min(2.0, simGrowth));

    // Run DCF
    let projRevenue = revenue;
    let totalPV = 0;

    for (let year = 1; year <= projectionYears; year++) {
      projRevenue = projRevenue * (1 + simGrowth);
      const ebitda = projRevenue * simMargin;
      const nopat = ebitda * (1 - taxRate);
      const wcChange = projRevenue * workingCapitalPct * simGrowth;
      const capexCost = projRevenue * capexPct;
      const fcff = nopat - wcChange - capexCost;
      totalPV += fcff / Math.pow(1 + simWACC, year);

      simGrowth = Math.max(termGrowth, simGrowth - decay);
    }

    // Terminal value
    if (simWACC > termGrowth) {
      const terminalRevenue = projRevenue * (1 + termGrowth);
      const terminalEBITDA = terminalRevenue * simMargin;
      const terminalNOPAT = terminalEBITDA * (1 - taxRate);
      const terminalFCFF = terminalNOPAT
        - (terminalRevenue * workingCapitalPct * termGrowth)
        - (terminalRevenue * capexPct);
      const terminalValue = terminalFCFF / (simWACC - termGrowth);
      totalPV += terminalValue / Math.pow(1 + simWACC, projectionYears);
    }

    if (!Number.isFinite(totalPV) || totalPV <= 0) continue;

    validPaths++;
    baseDistribution.push(totalPV);

    // Apply CRR expansion option at this terminal DCF value
    const crrResult = calculateCRRRealOption(
      totalPV,
      expansionCapex,
      volatility,
      timeToExit,
      0.045,
      'call',
      true,
      stepsCRR
    );

    const hybridValue = totalPV + crrResult.optionValue;
    hybridDistribution.push(hybridValue);

    if (crrResult.optionValue > 0) {
      pathsExercised++;
      totalOptionPremium += crrResult.optionValue;
    }
  }

  // Compute statistics
  const baseMean = baseDistribution.length > 0
    ? baseDistribution.reduce((s, v) => s + v, 0) / baseDistribution.length
    : 0;
  const hybridMean = hybridDistribution.length > 0
    ? hybridDistribution.reduce((s, v) => s + v, 0) / hybridDistribution.length
    : 0;

  const optionUpliftPercent = baseMean > 0
    ? ((hybridMean - baseMean) / baseMean) * 100
    : 0;

  const percentPathsExercised = validPaths > 0
    ? (pathsExercised / validPaths) * 100
    : 0;

  const realOptionPremiumMean = validPaths > 0
    ? totalOptionPremium / validPaths
    : 0;

  return {
    baseDistribution: baseDistribution.sort((a, b) => a - b),
    hybridDistribution: hybridDistribution.sort((a, b) => a - b),
    baseMean,
    hybridMean,
    optionUpliftPercent,
    percentPathsExercised,
    realOptionPremiumMean,
    simulations: validPaths,
  };
}
