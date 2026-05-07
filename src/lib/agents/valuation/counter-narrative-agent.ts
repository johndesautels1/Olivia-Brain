import type {
  CompanyValuationInput,
  ReconciledValuationResult,
  CounterNarrativeResult,
} from '@/lib/valuation/types';
import type { LLMCallFn } from './financial-extractor';
import { formatGBP } from '@/lib/valuation/helpers';

// ═══════════════════════════════════════════════════════════════════════
// COUNTER-NARRATIVE AGENT
// ═══════════════════════════════════════════════════════════════════════
//
// Purpose: Write the buyer's internal memo to justify paying less.
// Then provide exact counter-arguments the seller should prepare.
// (Opus — unique idea)
// ═══════════════════════════════════════════════════════════════════════

const MODEL = 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `You are an M&A analyst at a London PE firm. Write the internal memo your team would present to the investment committee arguing for a LOWER valuation.

Be specific: cite the exact metrics that are weak, the comps that suggest overvaluation, and the risks that justify a discount.

Then, for each argument you make, write the exact counter-argument the seller should prepare. This helps the seller anticipate and address every objection before it's raised.

RULES:
- Be specific with numbers — never vague
- Reference actual valuation methods and their outputs
- Consider London market conditions
- The memo should read like a real IC document, not a template
- Counter-arguments should be genuinely strong, not strawmen
- Return valid JSON`;

function buildCounterNarrativePrompt(
  result: ReconciledValuationResult,
  input: CompanyValuationInput,
): string {
  const methodDetails = result.methods
    .filter(m => m.enabled && m.enterpriseValue)
    .map(m => `${m.method}: ${formatGBP(m.enterpriseValue!.base)} (${m.summary})`)
    .join('\n  ');

  return `Write an IC memo arguing for a lower valuation than ${formatGBP(result.enterpriseValue.base)} for this company.

COMPANY: ${input.companyName}
SECTOR: ${input.sector} | STAGE: ${input.stage} | GEOGRAPHY: ${input.geography}

PROPOSED VALUATION:
- Enterprise Value: ${formatGBP(result.enterpriseValue.base)} (${formatGBP(result.enterpriseValue.low)} – ${formatGBP(result.enterpriseValue.high)})
- Equity Value: ${formatGBP(result.equityValue.base)}

KEY METRICS:
- Revenue: ${input.annualRevenue.value !== null ? formatGBP(input.annualRevenue.value) : 'N/A'}
- Growth: ${input.growthYoYPct.value !== null ? input.growthYoYPct.value + '%' : 'N/A'}
- Gross Margin: ${input.grossMarginPct.value !== null ? input.grossMarginPct.value + '%' : 'N/A'}
- EBITDA: ${input.ebitda.value !== null ? formatGBP(input.ebitda.value) : 'N/A'}
- Burn: ${input.burnMonthly.value !== null ? formatGBP(input.burnMonthly.value) + '/mo' : 'N/A'}
- Runway: ${input.runwayMonths.value !== null ? input.runwayMonths.value + 'mo' : 'N/A'}

VALUATION METHODS:
  ${methodDetails}

RISKS FLAGGED: ${result.risks.join('; ') || 'None'}

Return JSON:
{
  "buyerMemo": "<full IC memo text arguing for lower valuation>",
  "counterArguments": [
    { "buyerPoint": "<what the buyer will argue>", "sellerResponse": "<how the seller should respond>" },
    ...
  ]
}`;
}

/**
 * CounterNarrativeAgent: Generate buyer's IC memo + seller's counter-arguments.
 */
export async function runCounterNarrative(
  result: ReconciledValuationResult,
  input: CompanyValuationInput,
  llmCall: LLMCallFn,
): Promise<CounterNarrativeResult> {
  const userPrompt = buildCounterNarrativePrompt(result, input);
  const rawResponse = await llmCall({
    model: MODEL,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    maxTokens: 4096,
  });

  /** Unescape double-encoded JSON string values */
  function cleanStr(val: string | undefined): string {
    if (!val) return '';
    let s = val;
    if (s.includes('\\n') || s.includes('\\"') || s.includes('\\\\')) {
      s = s.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    return s.trim();
  }

  try {
    const fenceMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
    const candidate = fenceMatch?.[1] ?? rawResponse;
    const objectMatch = candidate.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(objectMatch?.[0] ?? candidate) as CounterNarrativeResult;
    return {
      buyerMemo: cleanStr(parsed.buyerMemo),
      counterArguments: (parsed.counterArguments ?? []).map(a => ({
        buyerPoint: cleanStr(a.buyerPoint),
        sellerResponse: cleanStr(a.sellerResponse),
      })),
    };
  } catch {
    return {
      buyerMemo: cleanStr(rawResponse),
      counterArguments: [],
    };
  }
}
