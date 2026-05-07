import type {
  CompanyValuationInput,
  ExtractedValuationInput,
  MetricEvidence,
  TruthScoreResult,
  TruthScoreGap,
} from '@/lib/valuation/types';

// ═══════════════════════════════════════════════════════════════════════
// TRUTH SCORE AGENT
// ═══════════════════════════════════════════════════════════════════════
//
// Purpose: Private integrity check — compare what the founder manually
// entered vs what the documents actually say. (Sonnet — unique idea)
//
// This score is PRIVATE — never exported, never shared with investors.
// It helps founders understand where their self-reported numbers diverge
// from documentary evidence.
//
// This is a DETERMINISTIC agent — no LLM calls needed.
// ═══════════════════════════════════════════════════════════════════════

// ── Fields to compare ────────────────────────────────────────────────

const COMPARABLE_FIELDS: string[] = [
  'annualRevenue',
  'arr',
  'grossMarginPct',
  'ebitda',
  'ebitdaMarginPct',
  'burnMonthly',
  'runwayMonths',
  'growthYoYPct',
  'netRevenueRetentionPct',
  'churnPct',
  'customerConcentrationTop3Pct',
  'cacPaybackMonths',
  'ltvToCac',
  'burnMultiple',
  'cashOnHand',
  'debt',
  'fullyDilutedShares',
  'optionPoolPct',
  'tam',
  'sam',
  'som',
  'marketGrowthPct',
  'capitalRaisedToDate',
  'lastRoundPreMoney',
  'lastRoundPostMoney',
  'capitalizedBuildCost',
  'replacementCost',
];

const MATCH_THRESHOLD_PCT = 5; // Within 5% = match

// ── Main truth score function ────────────────────────────────────────

/**
 * TruthScoreAgent: Compare manually entered values against document-extracted values.
 *
 * @param extraction - ExtractedValuationInput from documents
 * @param manualInput - CompanyValuationInput with manual overrides from the founder
 * @returns TruthScoreResult (PRIVATE — never share with investors)
 */
export function runTruthScore(
  extraction: ExtractedValuationInput,
  manualInput: CompanyValuationInput,
): TruthScoreResult {
  const gaps: TruthScoreGap[] = [];
  let totalFields = 0;
  let verifiedFields = 0;

  for (const fieldName of COMPARABLE_FIELDS) {
    const extractedMetric = (extraction.input as Record<string, unknown>)[fieldName] as MetricEvidence | undefined;
    const manualMetric = (manualInput as Record<string, unknown>)[fieldName] as MetricEvidence | undefined;

    // Skip if either side doesn't have the field
    if (!extractedMetric || !manualMetric) continue;

    const docValue = extractedMetric.value;
    const manualValue = manualMetric.value;

    // Skip if both are null
    if (docValue === null && manualValue === null) continue;

    // If manual has a value but doc doesn't, can't compare
    if (docValue === null || manualValue === null) continue;

    totalFields++;

    // Calculate gap
    const absDiff = Math.abs(manualValue - docValue);
    const base = Math.max(Math.abs(manualValue), Math.abs(docValue));
    const gapPct = base > 0 ? (absDiff / base) * 100 : 0;

    let direction: 'optimistic' | 'pessimistic' | 'match';
    if (gapPct <= MATCH_THRESHOLD_PCT) {
      direction = 'match';
      verifiedFields++;
    } else if (isOptimistic(fieldName, manualValue, docValue)) {
      direction = 'optimistic';
    } else {
      direction = 'pessimistic';
    }

    if (direction !== 'match') {
      gaps.push({
        field: fieldName,
        manualValue,
        documentValue: docValue,
        gapPct,
        direction,
      });
    }
  }

  // Calculate truth score: 0-100
  // Base score from verified percentage, penalized by optimistic gaps
  const verifiedPct = totalFields > 0 ? (verifiedFields / totalFields) * 100 : 100;
  const optimisticGaps = gaps.filter(g => g.direction === 'optimistic');
  const optimisticPenalty = optimisticGaps.reduce((sum, g) => sum + Math.min(g.gapPct, 50), 0);
  const penaltyPerGap = optimisticGaps.length > 0 ? optimisticPenalty / optimisticGaps.length : 0;

  const truthScore = Math.max(0, Math.min(100, Math.round(
    verifiedPct - (penaltyPerGap * optimisticGaps.length * 0.5)
  )));

  return {
    truthScore,
    totalFields,
    verifiedFields,
    gaps: gaps.sort((a, b) => b.gapPct - a.gapPct),
  };
}

// ── Direction logic ──────────────────────────────────────────────────

/**
 * Determine if the manual value is "optimistic" relative to documentary evidence.
 * For revenue/growth metrics, higher manual = optimistic.
 * For cost/burn metrics, lower manual = optimistic.
 * For risk metrics, lower manual = optimistic.
 */
function isOptimistic(field: string, manualValue: number, docValue: number): boolean {
  // Fields where HIGHER manual value is optimistic (founder painting a rosier picture)
  const higherIsOptimistic = [
    'annualRevenue', 'arr', 'grossMarginPct', 'ebitdaMarginPct',
    'growthYoYPct', 'netRevenueRetentionPct', 'ltvToCac',
    'runwayMonths', 'tam', 'sam', 'som', 'marketGrowthPct',
    'capitalRaisedToDate', 'lastRoundPreMoney', 'lastRoundPostMoney',
    'ebitda', 'capitalizedBuildCost', 'replacementCost',
  ];

  // Fields where LOWER manual value is optimistic (downplaying costs/risks)
  const lowerIsOptimistic = [
    'burnMonthly', 'churnPct', 'customerConcentrationTop3Pct',
    'cacPaybackMonths', 'burnMultiple', 'debt', 'optionPoolPct',
  ];

  if (higherIsOptimistic.includes(field)) {
    return manualValue > docValue;
  }
  if (lowerIsOptimistic.includes(field)) {
    return manualValue < docValue;
  }

  // Default: higher = optimistic
  return manualValue > docValue;
}
