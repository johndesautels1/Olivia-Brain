// ═══════════════════════════════════════════════════════════════════════
// COMPOUND CRR — OPTION ON AN OPTION
// For multi-stage funding / buyout decisions where exercising the first
// option (e.g. Series A) grants the right to exercise the second option
// (e.g. Series B or full acquisition).
// Adapted from Grok's compound option implementation.
// ═══════════════════════════════════════════════════════════════════════

import type { CompoundOptionInputs } from './types';
import { calculateCRRRealOption } from './real-options';

export interface CompoundCRRResult {
  compoundOptionValue: number;
  innerOptionValueAtExpiry: number;
  outerIntrinsicAtExpiry: number;
  exerciseNodes: number;
  totalOuterNodes: number;
}

/**
 * Compound CRR: option-on-option for multi-stage decisions.
 *
 * The outer option gives the right to exercise the inner option.
 * At each outer terminal node, the inner option value is computed via CRR.
 * Then we do backward induction on the outer tree with American early exercise.
 *
 * Use case: Stage 1 investment (outerStrike) buys the right to make
 * Stage 2 investment (innerStrike) to capture the full underlying value.
 *
 * @param inputs.underlying       Current asset value
 * @param inputs.outerStrike      Cost of Stage 1 (to acquire the inner option)
 * @param inputs.innerStrike      Cost of Stage 2 (to acquire the asset)
 * @param inputs.volatility       Annual volatility
 * @param inputs.timeYearsOuter   Time to Stage 1 decision
 * @param inputs.timeYearsInner   Time from Stage 1 to Stage 2 decision
 * @param inputs.riskFreeRate     Risk-free rate (default 0.045)
 * @param inputs.steps            Binomial steps for each layer (default 40)
 */
export function calculateCompoundCRR(inputs: CompoundOptionInputs): CompoundCRRResult {
  const {
    underlying,
    outerStrike,
    innerStrike,
    volatility,
    timeYearsOuter,
    timeYearsInner,
    riskFreeRate = 0.045,
    steps = 40,
  } = inputs;

  if (underlying <= 0 || volatility <= 0 || timeYearsOuter <= 0 || timeYearsInner <= 0) {
    return {
      compoundOptionValue: 0,
      innerOptionValueAtExpiry: 0,
      outerIntrinsicAtExpiry: 0,
      exerciseNodes: 0,
      totalOuterNodes: 0,
    };
  }

  const dt = timeYearsOuter / steps;
  const u = Math.exp(volatility * Math.sqrt(dt));
  const d = 1 / u;
  const R = Math.exp(riskFreeRate * dt);
  const p = (R - d) / (u - d);

  if (p <= 0 || p >= 1) {
    return {
      compoundOptionValue: 0,
      innerOptionValueAtExpiry: 0,
      outerIntrinsicAtExpiry: 0,
      exerciseNodes: 0,
      totalOuterNodes: 0,
    };
  }

  // Step 1: Build outer asset tree terminal values
  // At outer expiry (step N), compute the asset price at each node
  // Then value the inner option (a call) using CRR from that asset price

  const outerTerminal = new Float64Array(steps + 1);
  let exerciseNodes = 0;
  let sampleInnerValue = 0;
  let sampleOuterIntrinsic = 0;

  for (let j = 0; j <= steps; j++) {
    const assetAtOuterExpiry = underlying * Math.pow(u, j) * Math.pow(d, steps - j);

    // Value the inner option: a call option on the asset
    // with strike = innerStrike, time = timeYearsInner, starting from assetAtOuterExpiry
    const innerResult = calculateCRRRealOption(
      assetAtOuterExpiry,
      innerStrike,
      volatility,
      timeYearsInner,
      riskFreeRate,
      'call',
      true,
      Math.min(steps, 30) // Use fewer steps for inner to keep computation tractable
    );

    // The outer option payoff = max(0, innerOptionValue - outerStrike)
    const outerPayoff = Math.max(0, innerResult.optionValue - outerStrike);
    outerTerminal[j] = outerPayoff;

    if (outerPayoff > 0) exerciseNodes++;

    // Capture mid-tree sample for reporting
    if (j === Math.floor(steps / 2)) {
      sampleInnerValue = innerResult.optionValue;
      sampleOuterIntrinsic = outerPayoff;
    }
  }

  // Step 2: Backward induction on the outer tree with American early exercise
  let current = outerTerminal;

  for (let step = steps - 1; step >= 0; step--) {
    const prev = new Float64Array(step + 1);
    for (let j = 0; j <= step; j++) {
      const continuation = (p * current[j + 1] + (1 - p) * current[j]) / R;

      // For American exercise: at this node, compute the inner option value
      // and see if exercising now is better than waiting
      const assetAtNode = underlying * Math.pow(u, j) * Math.pow(d, step - j);
      const innerAtNode = calculateCRRRealOption(
        assetAtNode,
        innerStrike,
        volatility,
        timeYearsInner + (timeYearsOuter - step * dt), // Remaining inner time
        riskFreeRate,
        'call',
        true,
        Math.min(20, steps) // Faster inner calc for early exercise check
      );
      const earlyExercise = Math.max(0, innerAtNode.optionValue - outerStrike);

      if (earlyExercise > continuation) {
        prev[j] = earlyExercise;
        exerciseNodes++;
      } else {
        prev[j] = continuation;
      }
    }
    current = prev;
  }

  const totalOuterNodes = ((steps + 1) * (steps + 2)) / 2;

  return {
    compoundOptionValue: Math.max(0, current[0]),
    innerOptionValueAtExpiry: sampleInnerValue,
    outerIntrinsicAtExpiry: sampleOuterIntrinsic,
    exerciseNodes,
    totalOuterNodes,
  };
}
