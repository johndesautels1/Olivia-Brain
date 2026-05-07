import type {
  CompanyValuationInput,
  ReconciledValuationResult,
  BuyerType,
  PreMortemResult,
} from '@/lib/valuation/types';
import type { LLMCallFn } from './financial-extractor';
import { formatGBP } from '@/lib/valuation/helpers';

// ═══════════════════════════════════════════════════════════════════════
// PRE-MORTEM AGENT
// ═══════════════════════════════════════════════════════════════════════
//
// Purpose: Assume the valuation was rejected by every investor. Why?
// (Opus — unique idea)
//
// For each rejection reason: score the current package (1-10) on how
// well it addresses that concern, then suggest one specific action
// to improve the score.
// ═══════════════════════════════════════════════════════════════════════

const MODEL = 'claude-sonnet-4-6';

function buildSystemPrompt(buyerType: BuyerType): string {
  return `You are a London investment analyst who has seen thousands of deals. You are conducting a pre-mortem analysis.

SCENARIO: Assume this valuation was presented to 10 investors of type "${buyerType.replace(/_/g, ' ')}" and ALL of them passed. Every single one said no.

Your job:
1. Generate the 3 most likely reasons they rejected it, ranked by probability (0.0 to 1.0, must sum to ≤ 1.0)
2. For each reason, score the current package (1-10) on how well it currently addresses that concern
3. Suggest one SPECIFIC, actionable improvement for each concern — not generic advice

RULES:
- Be London-market-aware (SEIS/EIS, London VC norms, UK regulation)
- Reference specific metrics from the valuation
- Rejection reasons should be realistic, not contrived
- Improvement actions should be achievable within 3-6 months
- Return valid JSON`;
}

function buildPreMortemPrompt(
  result: ReconciledValuationResult,
  input: CompanyValuationInput,
  buyerType: BuyerType,
): string {
  return `Pre-mortem this valuation. All 10 ${buyerType.replace(/_/g, ' ')} investors passed. Why?

COMPANY: ${input.companyName} (${input.sector}, ${input.stage})
ENTERPRISE VALUE: ${formatGBP(result.enterpriseValue.base)}
EQUITY VALUE: ${formatGBP(result.equityValue.base)}
CONFIDENCE: ${(result.confidence * 100).toFixed(0)}%

KEY METRICS:
- Revenue: ${input.annualRevenue.value !== null ? formatGBP(input.annualRevenue.value) : 'N/A'}
- Growth: ${input.growthYoYPct.value !== null ? input.growthYoYPct.value + '%' : 'N/A'}
- Gross Margin: ${input.grossMarginPct.value !== null ? input.grossMarginPct.value + '%' : 'N/A'}
- Burn: ${input.burnMonthly.value !== null ? formatGBP(input.burnMonthly.value) + '/mo' : 'N/A'}
- Runway: ${input.runwayMonths.value !== null ? input.runwayMonths.value + 'mo' : 'N/A'}
- NRR: ${input.netRevenueRetentionPct.value !== null ? input.netRevenueRetentionPct.value + '%' : 'N/A'}
- Churn: ${input.churnPct.value !== null ? input.churnPct.value + '%' : 'N/A'}
- Customer Concentration (top 3): ${input.customerConcentrationTop3Pct.value !== null ? input.customerConcentrationTop3Pct.value + '%' : 'N/A'}
- Founder Dependency Risk: ${(input.founderDependencyRisk * 100).toFixed(0)}%
- IP Strength: ${(input.ipStrength * 100).toFixed(0)}%
- Management Strength: ${(input.managementStrength * 100).toFixed(0)}%

FLAGGED RISKS: ${result.risks.join('; ') || 'None'}
METHOD DISAGREEMENTS: ${result.methodDisagreements.length > 0 ? result.methodDisagreements.map(d => `${d.method1} vs ${d.method2}: ${d.divergencePct.toFixed(0)}%`).join('; ') : 'None'}

Return JSON:
{
  "rejectionReasons": [
    {
      "reason": "<specific rejection reason>",
      "probability": 0.45,
      "currentScore": 4,
      "improvementAction": "<specific action to address this>"
    },
    ...
  ]
}`;
}

/**
 * PreMortemAgent: Assume universal rejection and analyze why.
 */
export async function runPreMortem(
  result: ReconciledValuationResult,
  input: CompanyValuationInput,
  buyerType: BuyerType,
  llmCall: LLMCallFn,
): Promise<PreMortemResult> {
  const rawResponse = await llmCall({
    model: MODEL,
    systemPrompt: buildSystemPrompt(buyerType),
    userPrompt: buildPreMortemPrompt(result, input, buyerType),
    maxTokens: 2048,
  });

  try {
    const fenceMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
    const candidate = fenceMatch?.[1] ?? rawResponse;
    const objectMatch = candidate.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(objectMatch?.[0] ?? candidate) as PreMortemResult;
    return {
      rejectionReasons: (parsed.rejectionReasons ?? []).map(r => ({
        reason: r.reason ?? '',
        probability: typeof r.probability === 'number' ? r.probability : 0.33,
        currentScore: typeof r.currentScore === 'number' ? r.currentScore : 5,
        improvementAction: r.improvementAction ?? '',
      })),
    };
  } catch {
    return {
      rejectionReasons: [{
        reason: 'Pre-mortem analysis failed to parse',
        probability: 1,
        currentScore: 0,
        improvementAction: 'Re-run the pre-mortem agent',
      }],
    };
  }
}
