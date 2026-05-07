/**
 * London tech sector benchmarks — base multiples + regional seed sizes +
 * stage discount rates + macro assumptions.
 *
 * Ported byte-for-byte from
 * `D:\London-Tech-Map\src\lib\valuation\benchmarks.ts` (Track V Session V2,
 * 2026-05-07). Pure data + helpers — no LLM, no IO.
 *
 * Sources: Dealroom London reports, Beauhurst, PitchBook European VC
 * median multiples (2024-2025 vintage). Public mega-cap multiples
 * (e.g. NVIDIA 28x, Stripe 22x peak) are excluded — those are outliers,
 * not median private company benchmarks.
 *
 * The engine applies growth, NRR, margin, and quality lifts on top of
 * these BASE multiples. A 12x AI base can reach ~19x with full lifts,
 * which aligns with top-tier private AI valuations.
 */

export const LONDON_TECH_BENCHMARKS: Record<string, { revenue: number; ebitda: number | null }> = {
  AI: { revenue: 12, ebitda: 25 },
  Fintech: { revenue: 10, ebitda: 14 },
  DeepTech: { revenue: 8, ebitda: 18 },
  SaaS: { revenue: 8, ebitda: 12 },
  Marketplace: { revenue: 5, ebitda: 8 },
  HealthTech: { revenue: 7, ebitda: 10 },
  CleanTech: { revenue: 4, ebitda: 6 },
  Services: { revenue: 3, ebitda: 6 },
  Hardware: { revenue: 3, ebitda: 5 },
  Media: { revenue: 4, ebitda: 7 },
  Other: { revenue: 4, ebitda: 6 },
};

export const REGIONAL_SEED_BENCHMARKS: Record<string, number> = {
  London: 4_000_000,
  UK: 3_000_000,
  EU: 2_500_000,
  US: 5_000_000,
};

export const STAGE_DISCOUNT_RATES: Record<string, number> = {
  idea: 0.5,
  pre_revenue: 0.45,
  mvp: 0.4,
  early_revenue: 0.35,
  growth: 0.25,
  scaleup: 0.2,
  mature: 0.15,
};

export function getBenchmarksForSector(sector: string): { revenue: number; ebitda: number | null } {
  return LONDON_TECH_BENCHMARKS[sector] || LONDON_TECH_BENCHMARKS["Other"]!;
}

export function getRegionalBenchmark(geography: string): number {
  return REGIONAL_SEED_BENCHMARKS[geography] || REGIONAL_SEED_BENCHMARKS["London"]!;
}

export function getDiscountRate(stage: string): number {
  return STAGE_DISCOUNT_RATES[stage] ?? 0.3;
}

// ── Macro assumptions (single source of truth) ─────────────────────
// Update these when tax law or macro conditions change.
// All production valuation code imports from here — never hardcode.

/** UK corporation tax rate for small-profit companies (≤£250k). */
export const UK_CORP_TAX_RATE = 0.19;

/** Working capital as a percentage of revenue. */
export const WORKING_CAPITAL_PCT = 0.05;

/** Capital expenditure as a percentage of revenue. */
export const CAPEX_PCT = 0.03;
