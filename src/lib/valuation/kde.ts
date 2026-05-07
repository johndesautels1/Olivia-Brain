/**
 * Kernel Density Estimation (KDE) utility for Monte Carlo distributions.
 *
 * Uses a Gaussian kernel with Silverman's rule-of-thumb bandwidth.
 * Designed to handle 5,000+ MC paths efficiently — computation is
 * O(n * outputPoints) with no Web Worker needed for typical sizes.
 *
 * Session 13 · Monte Carlo KDE + Interpretation
 */

// ── Gaussian kernel ──────────────────────────────────────────────────

function gaussianKernel(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// ── Silverman bandwidth ──────────────────────────────────────────────

function silvermanBandwidth(data: number[], std: number): number {
  const n = data.length;
  if (n === 0 || std === 0) return 1;
  // Silverman's rule: h = 1.06 * sigma * n^(-1/5)
  return 1.06 * std * Math.pow(n, -0.2);
}

// ── KDE output point ─────────────────────────────────────────────────

export interface KdePoint {
  /** The x-axis value (enterprise value in GBP). */
  x: number;
  /** The estimated probability density at this x value. */
  density: number;
}

// ── Compute KDE ──────────────────────────────────────────────────────

export interface KdeOptions {
  /** Number of output points along the x-axis. Defaults to 80. */
  outputPoints?: number;
  /** Standard deviation of the distribution (avoids recomputation). */
  std?: number;
  /** Override bandwidth (Silverman's rule used by default). */
  bandwidth?: number;
  /** Padding beyond min/max as fraction of range. Defaults to 0.05. */
  padding?: number;
}

/**
 * Compute KDE over a distribution of Monte Carlo path values.
 *
 * Returns an array of (x, density) points suitable for rendering
 * as a Recharts Area or Line overlay on the histogram.
 *
 * The density values are scaled to be visually proportional to
 * the histogram bin counts by multiplying by (n * binWidth),
 * so they can share the same Y-axis.
 */
export function computeKde(
  distribution: number[],
  binCount: number,
  options: KdeOptions = {},
): KdePoint[] {
  const n = distribution.length;
  if (n === 0) return [];

  const {
    outputPoints = 80,
    padding = 0.05,
  } = options;

  // Calculate min, max, std if not provided
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const v = distribution[i];
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  const mean = sum / n;

  const std = options.std ?? (() => {
    let varianceSum = 0;
    for (let i = 0; i < n; i++) {
      const diff = distribution[i] - mean;
      varianceSum += diff * diff;
    }
    return Math.sqrt(varianceSum / n);
  })();

  const bandwidth = options.bandwidth ?? silvermanBandwidth(distribution, std);

  // Extend range slightly beyond data bounds
  const range = max - min || 1;
  const pad = range * padding;
  const xMin = min - pad;
  const xMax = max + pad;
  const step = (xMax - xMin) / (outputPoints - 1);

  // Bin width for scaling density to histogram Y-axis
  const binWidth = range / binCount;

  // Compute KDE at each output point
  const result: KdePoint[] = new Array(outputPoints);

  for (let i = 0; i < outputPoints; i++) {
    const x = xMin + i * step;
    let densitySum = 0;

    for (let j = 0; j < n; j++) {
      densitySum += gaussianKernel((x - distribution[j]) / bandwidth);
    }

    // Raw density normalized by (n * bandwidth), then scaled by (n * binWidth)
    // to match histogram Y-axis (count per bin).
    const rawDensity = densitySum / (n * bandwidth);
    const scaledDensity = rawDensity * n * binWidth;

    result[i] = { x, density: scaledDensity };
  }

  return result;
}

// ── Interpretation text generator ────────────────────────────────────

export interface McInterpretation {
  /** One-sentence summary for the interpretation banner. */
  summary: string;
  /** Skewness description. */
  skewness: 'left-skewed' | 'roughly symmetric' | 'right-skewed';
  /** Spread descriptor. */
  spread: 'tight' | 'moderate' | 'wide';
  /** Coefficient of variation. */
  cv: number;
}

/**
 * Generate plain-English interpretation of MC simulation results.
 */
export function interpretMonteCarlo(mc: {
  mean: number;
  median: number;
  std: number;
  p5: number;
  p95: number;
  simulations: number;
}): McInterpretation {
  const cv = mc.mean !== 0 ? mc.std / Math.abs(mc.mean) : 0;

  // Skewness: compare mean vs median
  const skewRatio = mc.mean !== 0 ? (mc.mean - mc.median) / mc.std : 0;
  const skewness: McInterpretation['skewness'] =
    skewRatio > 0.15 ? 'right-skewed' : skewRatio < -0.15 ? 'left-skewed' : 'roughly symmetric';

  // Spread
  const spread: McInterpretation['spread'] =
    cv < 0.15 ? 'tight' : cv < 0.35 ? 'moderate' : 'wide';

  // Confidence range width as multiplier
  const rangeMultiplier = mc.p5 > 0 ? mc.p95 / mc.p5 : Infinity;

  // Build summary
  const formatGbp = (v: number) =>
    new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(v);

  const rangePhrase = isFinite(rangeMultiplier)
    ? `a ${rangeMultiplier.toFixed(0)}× spread`
    : 'an extreme spread';

  const skewPhrase =
    skewness === 'right-skewed'
      ? 'with upside potential exceeding downside risk'
      : skewness === 'left-skewed'
        ? 'with downside risk exceeding upside potential'
        : 'with balanced upside and downside';

  const spreadPhrase =
    spread === 'tight'
      ? 'The valuation is highly concentrated'
      : spread === 'moderate'
        ? 'The valuation shows moderate uncertainty'
        : 'The valuation shows significant uncertainty';

  const summary = `Across ${mc.simulations.toLocaleString()} simulations, there is a 90% probability the enterprise value falls between ${formatGbp(mc.p5)} and ${formatGbp(mc.p95)} (${rangePhrase}), ${skewPhrase}. ${spreadPhrase} (CV: ${(cv * 100).toFixed(1)}%).`;

  return { summary, skewness, spread, cv };
}
