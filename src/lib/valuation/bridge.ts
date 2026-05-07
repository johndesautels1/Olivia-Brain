/**
 * Valuation Bridge — `buildValuationInput()`.
 *
 * Adapter between Olivia Brain's `ValuationSubject` model (the user's
 * company data, JSON columns) and the valuation engine's
 * `CompanyValuationInput` type. **Pure data assembler — no LLM calls.**
 *
 * # Origin
 *
 * Ported from `D:\London-Tech-Map\src\lib\valuation\bridge.ts` (Track V
 * Session V2, 2026-05-07). The OB version is **simplified vs LTM** in
 * the deferred-fallback paths:
 *
 *   - LTM falls back to `AnalysisResult.companyProfile` (Cristiano DNA
 *     extraction) when `ValuationSubject` JSON columns are sparse.
 *     **OB does not own `AnalysisResult` until Track L** — fallback
 *     skipped here; bridge will pick up the path via the Universal
 *     Knowledge Provider (UKP) bridge when cross-spoke wiring lands.
 *   - LTM falls back to `Organization.techStackJson.autoValuation`
 *     (Companies House extraction). **OB does not own `Organization`** —
 *     same UKP-bridge plan.
 *
 * Net effect for V2: the bridge reads ONLY the 6 JSON columns on
 * `ValuationSubject` + the static `benchmarks.ts` table. If the JSON
 * columns are sparse, the resulting `CompanyValuationInput` is also
 * sparse and `completenessScore` reflects that. The engine handles
 * sparse inputs gracefully — methods with insufficient data are simply
 * disabled.
 */

import prisma from "@/lib/db/client";
import type { ValuationSubject } from "@prisma/client";
import {
  getBenchmarksForSector,
  getRegionalBenchmark,
  getDiscountRate,
} from "./benchmarks";
import type {
  CompanyValuationInput,
  CompanyStage,
  BusinessModel,
  MetricEvidence,
  ScorecardFactors,
  StrategicSynergyInputs,
} from "./types";

// ── JSON Column Shapes ──────────────────────────────────────────────

/** Shape of `ValuationSubject.financialDataJson`. */
export type FinancialDataJson = {
  annualRevenue?: MetricEvidence;
  arr?: MetricEvidence;
  grossMarginPct?: MetricEvidence;
  ebitda?: MetricEvidence;
  ebitdaMarginPct?: MetricEvidence;
  burnMonthly?: MetricEvidence;
  runwayMonths?: MetricEvidence;
  growthYoYPct?: MetricEvidence;
  netRevenueRetentionPct?: MetricEvidence;
  churnPct?: MetricEvidence;
  customerConcentrationTop3Pct?: MetricEvidence;
  cacPaybackMonths?: MetricEvidence;
  ltvToCac?: MetricEvidence;
  burnMultiple?: MetricEvidence;
};

/** Shape of `ValuationSubject.qualitativeJson`. */
export type QualitativeDataJson = {
  founderDependencyRisk?: number;
  legalRisk?: number;
  ipStrength?: number;
  productMaturity?: number;
  goToMarketMaturity?: number;
  londonStrategicFit?: number;
  managementStrength?: number;
  founderReputationScore?: number;
  competitionIntensityScore?: number;
  scorecardFactors?: ScorecardFactors;
};

/** Shape of `ValuationSubject.ipDataJson`. */
export type IPDataJson = {
  capitalizedBuildCost?: MetricEvidence;
  replacementCost?: MetricEvidence;
  patentsCount?: number;
  proprietaryDataScore?: number;
  trademarksCount?: number;
  regulatoryApprovals?: boolean;
};

/** Shape of `ValuationSubject.marketDataJson`. */
export type MarketDataJson = {
  tam?: MetricEvidence;
  sam?: MetricEvidence;
  som?: MetricEvidence;
  marketGrowthPct?: MetricEvidence;
};

/** Shape of `ValuationSubject.capitalDataJson`. */
export type CapitalDataJson = {
  cashOnHand?: MetricEvidence;
  debt?: MetricEvidence;
  fullyDilutedShares?: MetricEvidence;
  optionPoolPct?: MetricEvidence;
};

/** Shape of `ValuationSubject.fundingDataJson`. */
export type FundingDataJson = {
  capitalRaisedToDate?: MetricEvidence;
  lastRoundPreMoney?: MetricEvidence;
  lastRoundPostMoney?: MetricEvidence;
};

// ── Stage & Business Model Mapping ──────────────────────────────────

const VALID_STAGES = new Set<string>([
  "idea",
  "pre_revenue",
  "mvp",
  "early_revenue",
  "growth",
  "scaleup",
  "mature",
]);

const VALID_BUSINESS_MODELS = new Set<string>([
  "saas",
  "marketplace",
  "services",
  "deeptech",
  "fintech",
  "ecommerce",
  "media",
  "hardware",
  "other",
]);

/** Map Cristiano/Gemini stage values to engine stage values. */
const STAGE_MAP: Record<string, CompanyStage> = {
  pre_seed: "pre_revenue",
  seed: "mvp",
  series_a: "early_revenue",
  series_b: "growth",
  series_c: "scaleup",
  series_d: "scaleup",
  series_e: "scaleup",
  idea: "idea",
  pre_revenue: "pre_revenue",
  mvp: "mvp",
  early_revenue: "early_revenue",
  growth: "growth",
  scaleup: "scaleup",
  mature: "mature",
};

function resolveStage(raw?: string | null): CompanyStage {
  if (!raw) return "early_revenue";
  if (VALID_STAGES.has(raw)) return raw as CompanyStage;
  return STAGE_MAP[raw] ?? "early_revenue";
}

function resolveBusinessModel(raw?: string | null): BusinessModel {
  if (!raw) return "other";
  if (VALID_BUSINESS_MODELS.has(raw)) return raw as BusinessModel;
  return "other";
}

/** Create a safe MetricEvidence from potentially missing/partial JSON data. */
function safeMetric(m?: Partial<MetricEvidence> | null): MetricEvidence {
  if (!m) return { value: null, refs: [], confidence: 0.5 };
  return {
    value: m.value ?? null,
    asOfDate: m.asOfDate,
    refs: Array.isArray(m.refs) ? m.refs : [],
    confidence: typeof m.confidence === "number" ? m.confidence : 0.5,
  };
}

// ── Completeness Scoring ────────────────────────────────────────────

const COMPLETENESS_FIELDS: Array<{
  key: string;
  weight: number;
  extract: (input: CompanyValuationInput) => unknown;
}> = [
  // Critical financial (weight 3) — methods disabled without these.
  { key: "annualRevenue", weight: 3, extract: (i) => i.annualRevenue.value },
  { key: "growthYoYPct", weight: 3, extract: (i) => i.growthYoYPct.value },
  { key: "grossMarginPct", weight: 3, extract: (i) => i.grossMarginPct.value },
  { key: "burnMonthly", weight: 3, extract: (i) => i.burnMonthly.value },
  { key: "runwayMonths", weight: 3, extract: (i) => i.runwayMonths.value },

  // Important financial (weight 2).
  { key: "arr", weight: 2, extract: (i) => i.arr.value },
  { key: "ebitda", weight: 2, extract: (i) => i.ebitda.value },
  {
    key: "netRevenueRetentionPct",
    weight: 2,
    extract: (i) => i.netRevenueRetentionPct.value,
  },
  {
    key: "capitalRaisedToDate",
    weight: 2,
    extract: (i) => i.capitalRaisedToDate.value,
  },
  { key: "cashOnHand", weight: 2, extract: (i) => i.cashOnHand.value },

  // Helpful (weight 1).
  { key: "tam", weight: 1, extract: (i) => i.tam.value },
  {
    key: "capitalizedBuildCost",
    weight: 1,
    extract: (i) => i.capitalizedBuildCost.value,
  },
  { key: "churnPct", weight: 1, extract: (i) => i.churnPct.value },
  {
    key: "lastRoundPreMoney",
    weight: 1,
    extract: (i) => i.lastRoundPreMoney.value,
  },
  {
    key: "customerConcentrationTop3Pct",
    weight: 1,
    extract: (i) => i.customerConcentrationTop3Pct.value,
  },
];

export function calculateCompleteness(input: CompanyValuationInput): number {
  let totalWeight = 0;
  let filledWeight = 0;

  for (const field of COMPLETENESS_FIELDS) {
    totalWeight += field.weight;
    const val = field.extract(input);
    if (val !== null && val !== undefined) {
      filledWeight += field.weight;
    }
  }

  return totalWeight > 0
    ? Math.round((filledWeight / totalWeight) * 100)
    : 0;
}

// ── Bridge result ────────────────────────────────────────────────────

export interface BridgeResult {
  input: CompanyValuationInput;
  warnings: string[];
  completenessScore: number;
}

export interface BridgeOptions {
  /** Optional override sector (defaults to subject.sector). */
  sectorOverride?: string;
  /** Optional override geography (defaults to "London"). */
  geographyOverride?: string;
  /** Optional strategic synergy override (post-Track-L from cluesintelligence). */
  strategicSynergy?: StrategicSynergyInputs;
}

/**
 * Build a typed `CompanyValuationInput` from a `ValuationSubject` row.
 *
 * Reads the 6 JSON columns and the static benchmarks table; assembles
 * the full input plus warnings + a 0-100 completeness score.
 *
 * **Deferred fallbacks** (LTM has them; OB picks up via UKP bridge later):
 *
 *   - `AnalysisResult.companyProfile` Cristiano DNA fallback.
 *   - `Organization.techStackJson.autoValuation` Companies House fallback.
 *
 * Both surface as warnings when a critical field is missing.
 */
export async function buildValuationInput(
  valuationSubjectId: string,
  options: BridgeOptions = {},
): Promise<BridgeResult> {
  const subject = await prisma.valuationSubject.findUnique({
    where: { id: valuationSubjectId },
  });

  if (!subject) {
    throw new Error(`ValuationSubject not found: ${valuationSubjectId}`);
  }

  const warnings: string[] = [];

  const financial = (subject.financialDataJson ?? {}) as FinancialDataJson;
  const qualitative = (subject.qualitativeJson ?? {}) as QualitativeDataJson;
  const ip = (subject.ipDataJson ?? {}) as IPDataJson;
  const market = (subject.marketDataJson ?? {}) as MarketDataJson;
  const capital = (subject.capitalDataJson ?? {}) as CapitalDataJson;
  const funding = (subject.fundingDataJson ?? {}) as FundingDataJson;

  const sector = options.sectorOverride ?? subject.sector ?? "Other";
  const geography = options.geographyOverride ?? "London";
  const stage = resolveStage(subject.stage);
  const businessModel = resolveBusinessModel(subject.businessModel);

  const sectorBench = getBenchmarksForSector(sector);
  const discountRate = getDiscountRate(stage);
  const regionalSeed = getRegionalBenchmark(geography);

  const input: CompanyValuationInput = {
    companyName: subject.companyName,
    companyId: subject.id,
    sector,
    subsector: subject.subsector ?? undefined,
    geography,
    stage,
    businessModel,

    annualRevenue: safeMetric(financial.annualRevenue),
    arr: safeMetric(financial.arr),
    grossMarginPct: safeMetric(financial.grossMarginPct),
    ebitda: safeMetric(financial.ebitda),
    ebitdaMarginPct: safeMetric(financial.ebitdaMarginPct),
    burnMonthly: safeMetric(financial.burnMonthly),
    runwayMonths: safeMetric(financial.runwayMonths),
    growthYoYPct: safeMetric(financial.growthYoYPct),
    netRevenueRetentionPct: safeMetric(financial.netRevenueRetentionPct),
    churnPct: safeMetric(financial.churnPct),
    customerConcentrationTop3Pct: safeMetric(
      financial.customerConcentrationTop3Pct,
    ),
    cacPaybackMonths: safeMetric(financial.cacPaybackMonths),
    ltvToCac: safeMetric(financial.ltvToCac),
    burnMultiple: safeMetric(financial.burnMultiple),

    cashOnHand: safeMetric(capital.cashOnHand),
    debt: safeMetric(capital.debt),
    fullyDilutedShares: safeMetric(capital.fullyDilutedShares),
    optionPoolPct: safeMetric(capital.optionPoolPct),

    tam: safeMetric(market.tam),
    sam: safeMetric(market.sam),
    som: safeMetric(market.som),
    marketGrowthPct: safeMetric(market.marketGrowthPct),

    capitalRaisedToDate: safeMetric(funding.capitalRaisedToDate),
    lastRoundPreMoney: safeMetric(funding.lastRoundPreMoney),
    lastRoundPostMoney: safeMetric(funding.lastRoundPostMoney),

    founderDependencyRisk: qualitative.founderDependencyRisk ?? 0.5,
    legalRisk: qualitative.legalRisk ?? 0.2,
    ipStrength: qualitative.ipStrength ?? 0.5,
    productMaturity: qualitative.productMaturity ?? 0.5,
    goToMarketMaturity: qualitative.goToMarketMaturity ?? 0.5,
    londonStrategicFit: qualitative.londonStrategicFit ?? 0.5,
    managementStrength: qualitative.managementStrength ?? 0.5,
    founderReputationScore: qualitative.founderReputationScore ?? 0.5,
    competitionIntensityScore: qualitative.competitionIntensityScore ?? 0.5,

    capitalizedBuildCost: safeMetric(ip.capitalizedBuildCost),
    replacementCost: safeMetric(ip.replacementCost),
    patentsCount: ip.patentsCount ?? 0,
    proprietaryDataScore: ip.proprietaryDataScore ?? 0.3,
    trademarksCount: ip.trademarksCount ?? 0,
    regulatoryApprovals: ip.regulatoryApprovals ?? false,

    scorecardFactors: qualitative.scorecardFactors,
    regionalSeedBenchmark: regionalSeed,

    strategicSynergy: options.strategicSynergy,

    volatility: 0.45,
    timeToExit: 3,

    marketBenchmarks: {
      revenueMultipleLow: sectorBench.revenue * 0.7,
      revenueMultipleBase: sectorBench.revenue,
      revenueMultipleHigh: sectorBench.revenue * 1.4,
      ebitdaMultipleLow: sectorBench.ebitda
        ? sectorBench.ebitda * 0.7
        : null,
      ebitdaMultipleBase: sectorBench.ebitda,
      ebitdaMultipleHigh: sectorBench.ebitda
        ? sectorBench.ebitda * 1.3
        : null,
      discountRatePct: discountRate * 100,
      terminalGrowthPct: 2.5,
      targetInvestorReturnPct: 25,
    },
  };

  if (input.annualRevenue.value === null) {
    warnings.push(
      "annualRevenue not set on ValuationSubject — revenue-multiple, DCF, and EBITDA-multiple methods will be disabled. Populate financialDataJson.annualRevenue or run extraction.",
    );
  }
  if (input.runwayMonths.value === null) {
    warnings.push(
      "runwayMonths not set — VC method will use a default 18-month assumption.",
    );
  }

  const completenessScore = calculateCompleteness(input);

  /* Persist the freshly-derived completeness score back to the subject so
   * the UI can read it without re-running the bridge. Best-effort — never
   * blocks the return. */
  try {
    await prisma.valuationSubject.update({
      where: { id: subject.id },
      data: { completenessScore },
    });
  } catch {
    /* Permission / race / closed-connection — degrade silently. */
  }

  return { input, warnings, completenessScore };
}

/** Re-export the subject type for callers wiring CRUD around the bridge. */
export type { ValuationSubject };
