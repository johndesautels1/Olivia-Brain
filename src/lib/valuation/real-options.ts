// ═══════════════════════════════════════════════════════════════════════
// CRR BINOMIAL TREE — REAL OPTIONS ENGINE
// Cox-Ross-Rubinstein lattice with American-style early exercise
// Adapted from Grok's quantitative finance implementation
// ═══════════════════════════════════════════════════════════════════════

export type OptionType = 'call' | 'put';

export interface CRRResult {
  optionValue: number;
  delta: number;
  exerciseNodes: number;
  totalNodes: number;
  u: number;
  d: number;
  p: number;
}

/**
 * Full Cox-Ross-Rubinstein binomial lattice with American-style early exercise.
 *
 * @param underlying  Current asset value (e.g. DCF enterprise value)
 * @param strike      Exercise price (e.g. expansion capex or salvage value)
 * @param volatility  Annual volatility (0.3–0.6 typical for London tech)
 * @param timeYears   Time to expiration in years
 * @param riskFreeRate Annual risk-free rate (default 0.045 — UK gilt proxy)
 * @param optionType  'call' for expansion, 'put' for abandonment
 * @param isAmerican  Allow early exercise (default true)
 * @param steps       Number of binomial steps (default 80)
 */
export function calculateCRRRealOption(
  underlying: number,
  strike: number,
  volatility: number,
  timeYears: number,
  riskFreeRate = 0.045,
  optionType: OptionType = 'call',
  isAmerican = true,
  steps = 80
): CRRResult {
  if (underlying <= 0 || timeYears <= 0 || volatility <= 0 || steps < 1) {
    return { optionValue: 0, delta: 0, exerciseNodes: 0, totalNodes: 0, u: 1, d: 1, p: 0.5 };
  }

  const dt = timeYears / steps;
  const u = Math.exp(volatility * Math.sqrt(dt));   // Up factor
  const d = 1 / u;                                   // Down factor (recombining tree)
  const R = Math.exp(riskFreeRate * dt);              // Risk-free growth per step
  const p = (R - d) / (u - d);                       // Risk-neutral probability

  // Clamp p to valid probability range
  if (p <= 0 || p >= 1) {
    return { optionValue: 0, delta: 0, exerciseNodes: 0, totalNodes: 0, u, d, p };
  }

  // Build terminal asset prices at expiry (step N)
  // S(N, j) = underlying * u^j * d^(N-j) for j = 0..N
  const terminalPayoffs = new Float64Array(steps + 1);
  let exerciseNodes = 0;

  for (let j = 0; j <= steps; j++) {
    const assetPrice = underlying * Math.pow(u, j) * Math.pow(d, steps - j);
    const intrinsic = optionType === 'call'
      ? Math.max(0, assetPrice - strike)
      : Math.max(0, strike - assetPrice);
    terminalPayoffs[j] = intrinsic;
    if (intrinsic > 0) exerciseNodes++;
  }

  // Backward induction through the tree, capturing step-1 values for delta
  let current = terminalPayoffs;
  let step1Values: Float64Array | null = null;

  for (let step = steps - 1; step >= 0; step--) {
    const prev = new Float64Array(step + 1);
    for (let j = 0; j <= step; j++) {
      // Risk-neutral expected value discounted one step
      const continuation = (p * current[j + 1] + (1 - p) * current[j]) / R;

      if (isAmerican) {
        // American: can exercise early
        const assetPrice = underlying * Math.pow(u, j) * Math.pow(d, step - j);
        const intrinsic = optionType === 'call'
          ? Math.max(0, assetPrice - strike)
          : Math.max(0, strike - assetPrice);

        if (intrinsic > continuation) {
          exerciseNodes++;
          prev[j] = intrinsic;
        } else {
          prev[j] = continuation;
        }
      } else {
        // European: only continuation value
        prev[j] = continuation;
      }
    }

    // Capture step-1 values for delta calculation
    if (step === 1) {
      step1Values = prev;
    }

    current = prev;
  }

  const optionValue = current[0];

  // Delta: (V_up - V_down) / (S_up - S_down) from step 1 of the tree
  let delta = 0;
  if (step1Values && step1Values.length >= 2) {
    const sUp = underlying * u;
    const sDown = underlying * d;
    if (sUp !== sDown) {
      delta = (step1Values[1] - step1Values[0]) / (sUp - sDown);
    }
  }

  const totalNodes = ((steps + 1) * (steps + 2)) / 2;

  return {
    optionValue: Math.max(0, optionValue),
    delta,
    exerciseNodes,
    totalNodes,
    u,
    d,
    p,
  };
}

/**
 * Expansion option: right to invest additional capex to grow.
 * Modeled as a call option — the company can "buy" expansion at a known cost.
 *
 * @param dcfValue       Current DCF enterprise value (underlying)
 * @param expansionCapex Capital required for expansion (strike)
 * @param volatility     Annual volatility of the business value
 * @param timeYears      Time window to exercise expansion
 */
export function calculateExpansionOption(
  dcfValue: number,
  expansionCapex: number,
  volatility: number,
  timeYears: number
): CRRResult {
  return calculateCRRRealOption(
    dcfValue,
    expansionCapex,
    volatility,
    timeYears,
    0.045,
    'call',
    true,
    80
  );
}

/**
 * Abandonment option: right to abandon the venture and recover salvage value.
 * Modeled as a put option — the company can "sell" at salvage value.
 *
 * @param dcfValue     Current DCF enterprise value (underlying)
 * @param salvageValue Liquidation / salvage value recoverable (strike)
 * @param volatility   Annual volatility of the business value
 * @param timeYears    Time window for abandonment decision
 */
export function calculateAbandonmentOption(
  dcfValue: number,
  salvageValue: number,
  volatility: number,
  timeYears: number
): CRRResult {
  return calculateCRRRealOption(
    dcfValue,
    salvageValue,
    volatility,
    timeYears,
    0.045,
    'put',
    true,
    80
  );
}
