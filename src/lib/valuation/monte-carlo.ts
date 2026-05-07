// ═══════════════════════════════════════════════════════════════════════
// MONTE CARLO DCF SIMULATION
// Deterministic RNG with reproducible seeds for audit trail.
// Shocks: revenue growth (normal), FCF margin (normal), WACC (normal).
// Advanced mode: log-normal revenue, beta margin, triangular multiple.
// Adapted from Grok + CoPilot implementations.
// ═══════════════════════════════════════════════════════════════════════

import type { MonteCarloResult } from './types';
import { UK_CORP_TAX_RATE, WORKING_CAPITAL_PCT, CAPEX_PCT } from './benchmarks';

// ── Deterministic PRNG (Mulberry32) ──────────────────────────────────
// Fast, seedable 32-bit PRNG for reproducible simulations.

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return (): number => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Normal distribution via Box-Muller ────────────────────────────────

function normalRandom(rng: () => number, mean: number, stdDev: number): number {
  const u1 = rng();
  const u2 = rng();
  // Avoid log(0)
  const z = Math.sqrt(-2 * Math.log(Math.max(1e-15, u1))) * Math.cos(2 * Math.PI * u2);
  return mean + stdDev * z;
}

// ── Log-normal random ─────────────────────────────────────────────────

function logNormalRandom(rng: () => number, mu: number, sigma: number): number {
  // Returns a sample from LogNormal(mu, sigma)
  // where mu and sigma are the mean and std of the underlying normal
  const normal = normalRandom(rng, mu, sigma);
  return Math.exp(normal);
}

// ── Beta distribution (Jöhnk's algorithm) ─────────────────────────────

function betaRandom(rng: () => number, alpha: number, beta: number): number {
  // Simple rejection method for beta distribution
  if (alpha <= 0) alpha = 1;
  if (beta <= 0) beta = 1;

  // Use gamma distribution ratio: Beta(a,b) = Gamma(a) / (Gamma(a) + Gamma(b))
  const ga = gammaRandom(rng, alpha);
  const gb = gammaRandom(rng, beta);
  if (ga + gb === 0) return 0.5;
  return ga / (ga + gb);
}

function gammaRandom(rng: () => number, shape: number): number {
  // Marsaglia and Tsang's method for shape >= 1
  if (shape < 1) {
    const u = rng();
    return gammaRandom(rng, shape + 1) * Math.pow(Math.max(1e-15, u), 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  for (let i = 0; i < 1000; i++) {
    let x: number;
    let v: number;
    do {
      x = normalRandom(rng, 0, 1);
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = rng();

    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
    if (Math.log(Math.max(1e-15, u)) < 0.5 * x * x + d * (1 - v + Math.log(Math.max(1e-15, v)))) return d * v;
  }
  return d; // Fallback (shouldn't reach here)
}

// ── Triangular distribution ───────────────────────────────────────────

function triangularRandom(rng: () => number, low: number, mode: number, high: number): number {
  const u = rng();
  const range = high - low;
  if (range === 0) return low;
  const fc = (mode - low) / range;

  if (u < fc) {
    return low + Math.sqrt(u * range * (mode - low));
  } else {
    return high - Math.sqrt((1 - u) * range * (high - mode));
  }
}

// ── Percentile helper ─────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  const frac = idx - lower;
  return sorted[lower] * (1 - frac) + sorted[upper] * frac;
}

// ── Monte Carlo DCF Input ─────────────────────────────────────────────

export interface MonteCarloDCFInputs {
  revenue: number;
  revenueGrowthPct: number;      // e.g. 30 for 30%
  fcfMarginPct: number;           // e.g. 15 for 15%
  waccPct: number;                // e.g. 25 for 25%
  terminalGrowthPct: number;      // e.g. 2.5 for 2.5%
  projectionYears: number;        // default 5
  taxRate: number;                // default 0.19
  workingCapitalPct: number;      // default 0.05
  capexPct: number;               // default 0.03
  growthDecayPctPerYear: number;  // default 4 (percentage points)

  // Shock standard deviations
  revenueGrowthSigma?: number;    // default 0.15
  fcfMarginSigma?: number;        // default 0.08
  waccSigma?: number;             // default 0.02

  // Advanced mode (DeepSeek distributions)
  advancedMode?: boolean;
  // For log-normal revenue: mu and sigma of underlying normal
  logNormalRevenueMu?: number;
  logNormalRevenueSigma?: number;
  // For beta margin: alpha and beta params
  betaMarginAlpha?: number;
  betaMarginBeta?: number;
  // For triangular exit multiple: low, mode, high
  triangularMultipleLow?: number;
  triangularMultipleMode?: number;
  triangularMultipleHigh?: number;
}

// ── Main Monte Carlo DCF ──────────────────────────────────────────────

/**
 * Monte Carlo DCF simulation.
 *
 * Runs `simulations` independent DCF calculations, each with randomly
 * shocked inputs (revenue growth, FCF margin, WACC), then returns
 * percentile statistics.
 *
 * @param inputs      DCF parameters and shock specifications
 * @param simulations Number of simulation runs (default 5000)
 * @param seed        Deterministic RNG seed for reproducibility
 */
export function monteCarloDCF(
  inputs: MonteCarloDCFInputs,
  simulations = 5000,
  seed?: number
): MonteCarloResult {
  const actualSeed = seed ?? Math.floor(Math.random() * 2147483647);
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
    advancedMode = false,
  } = inputs;

  const baseGrowth = revenueGrowthPct / 100;
  const baseMargin = fcfMarginPct / 100;
  const baseWACC = waccPct / 100;
  const termGrowth = terminalGrowthPct / 100;

  const distribution: number[] = [];
  const sampleSeeds: number[] = [];

  for (let sim = 0; sim < simulations; sim++) {
    // Store first 200 seeds for audit reproducibility
    const simSeed = Math.floor(rng() * 2147483647);
    if (sim < 200) sampleSeeds.push(simSeed);

    // Shock parameters for this simulation
    let growthShock: number;
    let marginShock: number;
    let waccShock: number;

    if (advancedMode && inputs.logNormalRevenueMu !== undefined) {
      // Advanced: log-normal revenue growth
      growthShock = logNormalRandom(
        rng,
        inputs.logNormalRevenueMu ?? Math.log(Math.max(0.01, baseGrowth)),
        inputs.logNormalRevenueSigma ?? 0.3
      );
      // Advanced: beta margin
      marginShock = betaRandom(
        rng,
        inputs.betaMarginAlpha ?? 3,
        inputs.betaMarginBeta ?? 5
      );
      // WACC still normal
      waccShock = normalRandom(rng, baseWACC, waccSigma);
    } else {
      // Standard: normal shocks
      growthShock = normalRandom(rng, baseGrowth, revenueGrowthSigma);
      marginShock = normalRandom(rng, baseMargin, fcfMarginSigma);
      waccShock = normalRandom(rng, baseWACC, waccSigma);
    }

    // Clamp to reasonable ranges
    let simGrowth = Math.max(-0.5, Math.min(2.0, growthShock));
    const simMargin = Math.max(0.05, Math.min(0.80, marginShock)); // FCF margin ≥ 5%
    const simWACC = Math.max(0.05, Math.min(0.80, waccShock));
    const decay = growthDecayPctPerYear / 100;

    // Run DCF with shocked parameters
    let projRevenue = revenue;
    let totalPV = 0;

    for (let year = 1; year <= projectionYears; year++) {
      projRevenue = projRevenue * (1 + simGrowth);
      const ebitda = projRevenue * simMargin;
      const nopat = ebitda * (1 - taxRate);
      const wcChange = projRevenue * workingCapitalPct * simGrowth;
      const capexCost = projRevenue * capexPct;
      const fcff = nopat - wcChange - capexCost;
      const discountFactor = Math.pow(1 + simWACC, year);
      totalPV += fcff / discountFactor;

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
      const terminalPV = terminalValue / Math.pow(1 + simWACC, projectionYears);
      totalPV += terminalPV;
    }

    // Only include finite, positive values
    if (Number.isFinite(totalPV) && totalPV > 0) {
      distribution.push(totalPV);
    }
  }

  // Sort for percentile calculation
  const sorted = distribution.slice().sort((a, b) => a - b);

  const n = sorted.length;
  if (n === 0) {
    return {
      mean: 0, std: 0, median: 0,
      p5: 0, p10: 0, p50: 0, p90: 0, p95: 0,
      distribution: [], sampleSeeds, simulations, seed: actualSeed,
    };
  }

  const mean = sorted.reduce((s, v) => s + v, 0) / n;
  const variance = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);

  return {
    mean,
    std,
    median: percentile(sorted, 50),
    p5: percentile(sorted, 5),
    p10: percentile(sorted, 10),
    p50: percentile(sorted, 50),
    p90: percentile(sorted, 90),
    p95: percentile(sorted, 95),
    distribution: sorted,
    sampleSeeds,
    simulations,
    seed: actualSeed,
  };
}
