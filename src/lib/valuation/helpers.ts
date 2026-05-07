import type { ValuationBand } from './types';

/** Clamp a number between min and max */
export const clamp = (n: number, min = 0, max = 1): number =>
  Math.max(min, Math.min(max, n));

/** Return n if it's a finite number, else fallback */
export const nz = (n: number | null | undefined, fallback = 0): number =>
  typeof n === 'number' && Number.isFinite(n) ? n : fallback;

/** Create a valuation band from a base value and a symmetric spread percentage */
export const band = (base: number, spreadPct: number): ValuationBand => ({
  low: Math.max(0, base * (1 - spreadPct)),
  base: Math.max(0, base),
  high: Math.max(0, base * (1 + spreadPct)),
});

/** Merge multiple valuation bands using weighted average */
export const mergeBandsWeighted = (
  items: { band: ValuationBand; weight: number }[]
): ValuationBand => {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  if (!totalWeight) return { low: 0, base: 0, high: 0 };
  return {
    low: items.reduce((sum, i) => sum + i.band.low * i.weight, 0) / totalWeight,
    base: items.reduce((sum, i) => sum + i.band.base * i.weight, 0) / totalWeight,
    high: items.reduce((sum, i) => sum + i.band.high * i.weight, 0) / totalWeight,
  };
};

/** Convert enterprise value band to equity value band */
export const equityFromEnterprise = (
  ev: ValuationBand,
  cash: number,
  debt: number
): ValuationBand => ({
  low: Math.max(0, ev.low + cash - debt),
  base: Math.max(0, ev.base + cash - debt),
  high: Math.max(0, ev.high + cash - debt),
});

/** Scale a valuation band by a multiplier */
export const scaleBand = (b: ValuationBand, multiplier: number): ValuationBand => ({
  low: Math.max(0, b.low * multiplier),
  base: Math.max(0, b.base * multiplier),
  high: Math.max(0, b.high * multiplier),
});

/** Calculate quality penalty from founder dependency, legal risk, and concentration */
export const qualityPenaltyPct = (
  founderDependencyRisk: number,
  legalRisk: number,
  customerConcentrationTop3Pct: number | null
): number => {
  const concentrationPct = nz(customerConcentrationTop3Pct, 0);
  let concentrationPenalty = 0;
  if (concentrationPct > 60) concentrationPenalty = 10;
  else if (concentrationPct > 40) concentrationPenalty = 6;
  else if (concentrationPct > 25) concentrationPenalty = 3;

  return founderDependencyRisk * 8 + legalRisk * 10 + concentrationPenalty;
};

/** Format a number as GBP currency string */
export const formatGBP = (n: number): string => {
  if (n >= 1_000_000_000) return `£${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `£${(n / 1_000).toFixed(0)}K`;
  return `£${n.toFixed(0)}`;
};
