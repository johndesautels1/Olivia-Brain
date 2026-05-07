import type {
  CompanyValuationInput,
  CompanyStage,
  BuyerType,
  ValuationMethodName,
  MethodSelectionResult,
  RejectedMethod,
} from '@/lib/valuation/types';

// ═══════════════════════════════════════════════════════════════════════
// METHOD SELECTION AGENT (Deterministic Rules Engine — NO LLM)
// ═══════════════════════════════════════════════════════════════════════
//
// Purpose: Choose which valuation methods are valid for a given company
// based on its stage, data availability, and data quality.
//
// This is a pure rules engine. No LLM calls. Fully deterministic.
//
// Rules from Perplexity synthesis:
//   - pre_revenue/idea: REJECT dcf, ebitda_multiple, precedent
//   - early_revenue: REJECT ebitda_multiple if EBITDA null
//   - growth: USE all except scorecard (reduce weight)
//   - scaleup/mature: USE dcf, ebitda_multiple, comps, precedent, synergy
//   - buyout: FORCE precedent, dcf, strategic_synergy, comps
//   - REJECT any method where critical input has confidence < 0.3
// ═══════════════════════════════════════════════════════════════════════

const CONFIDENCE_FLOOR = 0.3;

// ── Stage-based method rules ─────────────────────────────────────────

type MethodRule = {
  enabled: boolean;
  weight: number;
  requiredFields?: string[];
};

type StageRuleSet = Record<ValuationMethodName, MethodRule>;

const STAGE_RULES: Record<CompanyStage, StageRuleSet> = {
  idea: {
    revenue_multiple: { enabled: false, weight: 0 },
    ebitda_multiple: { enabled: false, weight: 0 },
    dcf: { enabled: false, weight: 0 },
    vc_method: { enabled: true, weight: 0.25 },
    cost_to_duplicate: { enabled: true, weight: 0.15 },
    scorecard: { enabled: true, weight: 0.30 },
    strategic_synergy: { enabled: false, weight: 0 },
    precedent_transactions: { enabled: false, weight: 0 },
    liquidation: { enabled: true, weight: 0.10 },
    real_options: { enabled: true, weight: 0.20 },
    strategic_adjustment: { enabled: true, weight: 0 },
  },
  pre_revenue: {
    revenue_multiple: { enabled: false, weight: 0 },
    ebitda_multiple: { enabled: false, weight: 0 },
    dcf: { enabled: false, weight: 0 },
    vc_method: { enabled: true, weight: 0.25 },
    cost_to_duplicate: { enabled: true, weight: 0.15 },
    scorecard: { enabled: true, weight: 0.30 },
    strategic_synergy: { enabled: false, weight: 0 },
    precedent_transactions: { enabled: false, weight: 0 },
    liquidation: { enabled: true, weight: 0.10 },
    real_options: { enabled: true, weight: 0.20 },
    strategic_adjustment: { enabled: true, weight: 0 },
  },
  mvp: {
    revenue_multiple: { enabled: true, weight: 0.25, requiredFields: ['annualRevenue'] },
    ebitda_multiple: { enabled: false, weight: 0 },
    dcf: { enabled: false, weight: 0 },
    vc_method: { enabled: true, weight: 0.20 },
    cost_to_duplicate: { enabled: true, weight: 0.10 },
    scorecard: { enabled: true, weight: 0.15 },
    strategic_synergy: { enabled: false, weight: 0 },
    precedent_transactions: { enabled: true, weight: 0.15, requiredFields: ['annualRevenue'] },
    liquidation: { enabled: true, weight: 0.05 },
    real_options: { enabled: true, weight: 0.10 },
    strategic_adjustment: { enabled: true, weight: 0 },
  },
  early_revenue: {
    revenue_multiple: { enabled: true, weight: 0.30, requiredFields: ['annualRevenue'] },
    ebitda_multiple: { enabled: true, weight: 0.05, requiredFields: ['ebitda'] },
    dcf: { enabled: true, weight: 0.10, requiredFields: ['annualRevenue'] },
    vc_method: { enabled: true, weight: 0.20 },
    cost_to_duplicate: { enabled: true, weight: 0.05 },
    scorecard: { enabled: true, weight: 0.10 },
    strategic_synergy: { enabled: false, weight: 0 },
    precedent_transactions: { enabled: true, weight: 0.10, requiredFields: ['annualRevenue'] },
    liquidation: { enabled: true, weight: 0.05 },
    real_options: { enabled: true, weight: 0.05 },
    strategic_adjustment: { enabled: true, weight: 0 },
  },
  growth: {
    revenue_multiple: { enabled: true, weight: 0.30, requiredFields: ['annualRevenue'] },
    ebitda_multiple: { enabled: true, weight: 0.10, requiredFields: ['ebitda'] },
    dcf: { enabled: true, weight: 0.25, requiredFields: ['annualRevenue'] },
    vc_method: { enabled: true, weight: 0.05 },
    cost_to_duplicate: { enabled: false, weight: 0 },
    scorecard: { enabled: false, weight: 0 },
    strategic_synergy: { enabled: true, weight: 0.10 },
    precedent_transactions: { enabled: true, weight: 0.10, requiredFields: ['annualRevenue'] },
    liquidation: { enabled: true, weight: 0.02 },
    real_options: { enabled: true, weight: 0.08 },
    strategic_adjustment: { enabled: true, weight: 0 },
  },
  scaleup: {
    revenue_multiple: { enabled: true, weight: 0.15, requiredFields: ['annualRevenue'] },
    ebitda_multiple: { enabled: true, weight: 0.25, requiredFields: ['ebitda'] },
    dcf: { enabled: true, weight: 0.25, requiredFields: ['annualRevenue'] },
    vc_method: { enabled: true, weight: 0.03 },
    cost_to_duplicate: { enabled: false, weight: 0 },
    scorecard: { enabled: false, weight: 0 },
    strategic_synergy: { enabled: true, weight: 0.10 },
    precedent_transactions: { enabled: true, weight: 0.15, requiredFields: ['annualRevenue'] },
    liquidation: { enabled: true, weight: 0.02 },
    real_options: { enabled: true, weight: 0.05 },
    strategic_adjustment: { enabled: true, weight: 0 },
  },
  mature: {
    revenue_multiple: { enabled: true, weight: 0.10, requiredFields: ['annualRevenue'] },
    ebitda_multiple: { enabled: true, weight: 0.25, requiredFields: ['ebitda'] },
    dcf: { enabled: true, weight: 0.25, requiredFields: ['annualRevenue'] },
    vc_method: { enabled: false, weight: 0 },
    cost_to_duplicate: { enabled: false, weight: 0 },
    scorecard: { enabled: false, weight: 0 },
    strategic_synergy: { enabled: true, weight: 0.10 },
    precedent_transactions: { enabled: true, weight: 0.20, requiredFields: ['annualRevenue'] },
    liquidation: { enabled: true, weight: 0.05 },
    real_options: { enabled: true, weight: 0.05 },
    strategic_adjustment: { enabled: true, weight: 0 },
  },
};

// ── Buyout mode overrides ────────────────────────────────────────────

const BUYOUT_OVERRIDES: Partial<Record<ValuationMethodName, { force: boolean; weight: number }>> = {
  precedent_transactions: { force: true, weight: 0.25 },
  dcf: { force: true, weight: 0.25 },
  strategic_synergy: { force: true, weight: 0.20 },
  ebitda_multiple: { force: true, weight: 0.15 },
  revenue_multiple: { force: true, weight: 0.10 },
  scorecard: { force: false, weight: 0 },
  vc_method: { force: false, weight: 0 },
  cost_to_duplicate: { force: false, weight: 0 },
};

// ── Data availability check ──────────────────────────────────────────

type MetricField = { value: number | null; confidence: number };

function getMetricField(
  input: CompanyValuationInput,
  fieldName: string,
): MetricField | null {
  const field = (input as Record<string, unknown>)[fieldName];
  if (field && typeof field === 'object' && 'value' in (field as Record<string, unknown>)) {
    const f = field as { value: number | null; confidence: number };
    return { value: f.value, confidence: f.confidence };
  }
  return null;
}

function isFieldAvailable(input: CompanyValuationInput, fieldName: string): boolean {
  const field = getMetricField(input, fieldName);
  return field !== null && field.value !== null;
}

function isFieldConfident(input: CompanyValuationInput, fieldName: string): boolean {
  const field = getMetricField(input, fieldName);
  if (!field || field.value === null) return false;
  return field.confidence >= CONFIDENCE_FLOOR;
}

// ── Stage rejection reasons ──────────────────────────────────────────

const STAGE_REJECTION_REASONS: Record<string, string> = {
  'idea:dcf': 'DCF requires revenue projections — not available at idea stage',
  'idea:ebitda_multiple': 'EBITDA multiples require positive EBITDA — not applicable at idea stage',
  'idea:revenue_multiple': 'Revenue multiples require revenue — not available at idea stage',
  'idea:precedent_transactions': 'Precedent transactions require comparable revenue — not available at idea stage',
  'pre_revenue:dcf': 'DCF requires revenue projections — not available at pre-revenue stage',
  'pre_revenue:ebitda_multiple': 'EBITDA multiples require positive EBITDA — not applicable at pre-revenue stage',
  'pre_revenue:revenue_multiple': 'Revenue multiples require revenue — not available at pre-revenue stage',
  'pre_revenue:precedent_transactions': 'Precedent transactions require comparable revenue — not available at pre-revenue stage',
  'growth:scorecard': 'Scorecard is designed for early-stage companies — less relevant for growth stage',
  'growth:cost_to_duplicate': 'Cost-to-duplicate is less meaningful for revenue-generating growth companies',
  'mature:vc_method': 'VC back-solve uses venture return targets — not applicable for mature companies',
  'mature:scorecard': 'Scorecard is designed for early-stage companies — not applicable for mature stage',
  'mature:cost_to_duplicate': 'Cost-to-duplicate is not meaningful for mature revenue-generating companies',
};

// ── Main selection function ──────────────────────────────────────────

/**
 * MethodSelectionAgent: Deterministic rules engine that selects which
 * valuation methods to enable, which to reject, and what weights to assign.
 *
 * @param input - CompanyValuationInput (validated or extracted)
 * @param buyerType - The buyer perspective
 * @returns MethodSelectionResult with enabled/rejected methods and weights
 */
export function runMethodSelection(
  input: CompanyValuationInput,
  buyerType: BuyerType,
): MethodSelectionResult {
  const stage = input.stage;
  const rules = STAGE_RULES[stage];
  const isBuyoutMode = buyerType === 'acquirer' || buyerType === 'private_equity';

  const enabledMethods: ValuationMethodName[] = [];
  const rejectedMethods: RejectedMethod[] = [];
  const weights: Partial<Record<ValuationMethodName, number>> = {};

  const allMethods: ValuationMethodName[] = [
    'revenue_multiple', 'ebitda_multiple', 'dcf', 'vc_method',
    'cost_to_duplicate', 'scorecard', 'strategic_synergy',
    'precedent_transactions', 'liquidation', 'real_options',
    'strategic_adjustment',
  ];

  for (const method of allMethods) {
    const rule = rules[method];

    // Strategic adjustment is always enabled (it's an overlay, not a standalone method)
    if (method === 'strategic_adjustment') {
      enabledMethods.push(method);
      weights[method] = 0;
      continue;
    }

    // Check buyout overrides first
    if (isBuyoutMode && BUYOUT_OVERRIDES[method]) {
      const override = BUYOUT_OVERRIDES[method]!;
      if (override.force) {
        // Check if required data exists even in buyout mode
        const requiredFields = rule.requiredFields ?? [];
        const missingField = requiredFields.find(f => !isFieldAvailable(input, f));
        if (missingField) {
          rejectedMethods.push({
            method,
            reason: `Buyout mode wants ${method} but required field "${missingField}" is missing`,
          });
          continue;
        }
        enabledMethods.push(method);
        weights[method] = override.weight;
        continue;
      } else {
        // Explicitly disabled in buyout mode
        rejectedMethods.push({
          method,
          reason: `${method} is not used in buyout/acquisition mode`,
        });
        continue;
      }
    }

    // Stage-based rejection
    if (!rule.enabled) {
      const key = `${stage}:${method}`;
      const reason = STAGE_REJECTION_REASONS[key]
        ?? `${method} is not applicable at ${stage} stage`;
      rejectedMethods.push({ method, reason });
      continue;
    }

    // Required field check
    if (rule.requiredFields) {
      const missingField = rule.requiredFields.find(f => !isFieldAvailable(input, f));
      if (missingField) {
        rejectedMethods.push({
          method,
          reason: `Required field "${missingField}" is null or missing`,
        });
        continue;
      }
    }

    // Confidence floor check: reject if critical data has confidence < 0.3
    if (rule.requiredFields) {
      const lowConfField = rule.requiredFields.find(f => !isFieldConfident(input, f));
      if (lowConfField) {
        rejectedMethods.push({
          method,
          reason: `Required field "${lowConfField}" has confidence below ${CONFIDENCE_FLOOR} threshold`,
        });
        continue;
      }
    }

    // Special case: ebitda_multiple requires positive EBITDA
    if (method === 'ebitda_multiple') {
      const ebitda = getMetricField(input, 'ebitda');
      if (!ebitda || ebitda.value === null || ebitda.value <= 0) {
        rejectedMethods.push({
          method,
          reason: 'EBITDA multiple requires positive EBITDA',
        });
        continue;
      }
    }

    // Special case: strategic_synergy requires synergy inputs
    if (method === 'strategic_synergy' && !input.strategicSynergy) {
      rejectedMethods.push({
        method,
        reason: 'Strategic synergy requires strategicSynergy inputs (annualSynergyValue, probability, premium)',
      });
      continue;
    }

    // Method is enabled
    enabledMethods.push(method);
    weights[method] = rule.weight;
  }

  // Normalize weights so enabled methods sum to 1.0
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + (w ?? 0), 0);
  if (totalWeight > 0) {
    for (const method of enabledMethods) {
      if (weights[method] !== undefined && weights[method]! > 0) {
        weights[method] = weights[method]! / totalWeight;
      }
    }
  }

  return {
    enabledMethods,
    rejectedMethods,
    weights,
  };
}
