import type {
  CompanyValuationInput,
  ReconciledValuationResult,
  BuyerType,
  JustificationResult,
} from '@/lib/valuation/types';
import type { LLMCallFn } from './financial-extractor';
import { formatGBP } from '@/lib/valuation/helpers';

// ═══════════════════════════════════════════════════════════════════════
// JUSTIFICATION AGENT — OLIVIA
// ═══════════════════════════════════════════════════════════════════════
//
// Purpose: Write the valuation narrative. Uses Sonnet's personalized
// letter approach + Gemini's London VC tone.
//
// Structure: where the company started → what traction proves the thesis
// → what the number is and why → what the money accomplishes
//
// Includes SEIS/EIS tax implications, actionable steps to increase
// valuation in 6 months.
// ═══════════════════════════════════════════════════════════════════════

const MODEL = 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `You are Olivia, the valuation justification agent for CLUES™, a London-focused private company valuation platform.

Your tone is London VC: use phrases like "capital efficiency", "defensible moat", "exit velocity", "unit economics", "category leadership". You are sophisticated but not jargon-heavy — think partner at a top-tier London VC fund writing to their LP update.

STRUCTURE your narrative with clear section headings (use ## markdown headings):

## Company Positioning
Where the company sits in the London tech ecosystem and why it matters. 2-3 short paragraphs max.

## Traction Evidence
What metrics prove the investment thesis. Use **bold** for key figures (e.g. **£2.1M ARR**, **127% NRR**). Present 3-5 key metrics as bullet points using - prefix, then a brief analytical paragraph.

## Valuation Rationale
What the number is, which methods drove it, and why the weighting is appropriate. Use bullet points for the method breakdown, then a short synthesizing paragraph.

## Capital Deployment
What the money accomplishes and how it accelerates the thesis. 2-3 bullets for deployment priorities, then a brief paragraph on expected impact.

## SEIS/EIS Considerations
Reference UK tax-advantaged investment schemes when relevant (seed/early stage). Skip this section if not applicable.

## Investment Conclusion
Close with conviction — why this is an opportunity worth backing NOW. One strong paragraph, no hedging.

FORMATTING RULES:
- Use ## headings for each section — these render as styled subheadings
- Use **bold** to highlight key metrics, company name, and critical terms
- Use - bullet points for lists of metrics, risks, or deployment priorities
- Keep paragraphs SHORT — 3-4 sentences maximum, never run-on walls of text
- Use transitions between sections (e.g. "This traction underpins...", "Building on this foundation...")
- NEVER output raw JSON keys, escaped quotes, or code artifacts in the narrative text
- The narrative field must contain ONLY the readable text, no JSON structure

IMPORTANT: Do NOT include "Actionable Steps" or improvement advice in the narrative. You are the ADVOCATE — your job is to present the investment case TO investors, not advise the company on what to fix. Company improvement guidance belongs to the Challenge Agent (Cristiano). Your narrative should close with a compelling investment conclusion, not a to-do list.

You MUST still return actionableSteps in the JSON output — those are routed to Cristiano's advisory memo, not displayed in your letter.

CONTENT RULES:
- Reference the company BY NAME throughout
- Cite specific metrics (revenue, growth, margins, runway) — never be vague
- Never hedge with "it depends" — commit to a position backed by data
- Return valid JSON matching the output schema`;

function buildNarrativePrompt(
  result: ReconciledValuationResult,
  input: CompanyValuationInput,
  buyerType: BuyerType,
): string {
  const enabledMethods = result.methods
    .filter(m => m.enabled && m.enterpriseValue)
    .map(m => `${m.method}: ${formatGBP(m.enterpriseValue!.base)} (weight: ${(m.weight * 100).toFixed(0)}%)`)
    .join('\n  ');

  return `Write a valuation justification narrative for the following company.

COMPANY: ${input.companyName}
SECTOR: ${input.sector} (${input.subsector ?? 'general'})
STAGE: ${input.stage}
GEOGRAPHY: ${input.geography}
BUSINESS MODEL: ${input.businessModel}

KEY METRICS:
- Annual Revenue: ${input.annualRevenue.value !== null ? formatGBP(input.annualRevenue.value) : 'N/A'}
- ARR: ${input.arr.value !== null ? formatGBP(input.arr.value) : 'N/A'}
- YoY Growth: ${input.growthYoYPct.value !== null ? input.growthYoYPct.value + '%' : 'N/A'}
- Gross Margin: ${input.grossMarginPct.value !== null ? input.grossMarginPct.value + '%' : 'N/A'}
- EBITDA: ${input.ebitda.value !== null ? formatGBP(input.ebitda.value) : 'N/A'}
- Monthly Burn: ${input.burnMonthly.value !== null ? formatGBP(input.burnMonthly.value) : 'N/A'}
- Runway: ${input.runwayMonths.value !== null ? input.runwayMonths.value + ' months' : 'N/A'}
- NRR: ${input.netRevenueRetentionPct.value !== null ? input.netRevenueRetentionPct.value + '%' : 'N/A'}
- Cash: ${input.cashOnHand.value !== null ? formatGBP(input.cashOnHand.value) : 'N/A'}
- Capital Raised: ${input.capitalRaisedToDate.value !== null ? formatGBP(input.capitalRaisedToDate.value) : 'N/A'}

VALUATION RESULT:
- Enterprise Value: ${formatGBP(result.enterpriseValue.base)} (${formatGBP(result.enterpriseValue.low)} – ${formatGBP(result.enterpriseValue.high)})
- Equity Value: ${formatGBP(result.equityValue.base)} (${formatGBP(result.equityValue.low)} – ${formatGBP(result.equityValue.high)})
- Confidence: ${(result.confidence * 100).toFixed(0)}%

METHODS USED:
  ${enabledMethods}

BUYER TYPE: ${buyerType}
RISKS: ${result.risks.join('; ') || 'None flagged'}
OPPORTUNITIES: ${result.opportunities.join('; ') || 'None flagged'}

Return JSON:
{
  "narrative": "<full narrative text>",
  "letterForBuyer": "<personalized investment letter for ${buyerType} buyer>",
  "risks": ["<risk 1>", ...],
  "opportunities": ["<opportunity 1>", ...],
  "actionableSteps": ["<step 1>", ...]
}`;
}

// ── All buyer types for letter generation ────────────────────────────

const ALL_BUYER_TYPES: BuyerType[] = ['angel', 'vc', 'private_equity', 'strategic_partner', 'acquirer'];

const BUYER_LETTER_PROMPT = (buyerType: BuyerType, companyName: string, evBase: string): string =>
  `Write a concise investment letter (3-4 paragraphs) for ${companyName} targeting a ${buyerType.replace(/_/g, ' ')} buyer. The enterprise value is ${evBase}. Focus on what matters most to this buyer type. Return the letter text only, no JSON.`;

// ── Main justification function ──────────────────────────────────────

/**
 * JustificationAgent (Olivia): Generate the valuation narrative,
 * buyer-specific letters, and actionable improvement steps.
 *
 * @param result - ReconciledValuationResult from the deterministic engine
 * @param input - CompanyValuationInput used for the valuation
 * @param buyerType - Primary buyer perspective
 * @param llmCall - LLM call function
 * @returns JustificationResult
 */
export async function runJustification(
  result: ReconciledValuationResult,
  input: CompanyValuationInput,
  buyerType: BuyerType,
  llmCall: LLMCallFn,
): Promise<JustificationResult> {
  // Generate main narrative
  const userPrompt = buildNarrativePrompt(result, input, buyerType);
  const rawResponse = await llmCall({
    model: MODEL,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    maxTokens: 8192,
  });

  let parsed: {
    narrative: string;
    letterForBuyer: string;
    risks: string[];
    opportunities: string[];
    actionableSteps: string[];
  };

  try {
    const fenceMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
    const candidate = fenceMatch?.[1] ?? rawResponse;
    const objectMatch = candidate.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(objectMatch?.[0] ?? candidate);
    // Recursively unescape any double-encoded JSON string values
    for (const key of ['narrative', 'letterForBuyer'] as const) {
      if (parsed[key] && typeof parsed[key] === 'string') {
        let val = parsed[key];
        // If the value looks like it's still JSON-escaped, unescape it
        if (val.includes('\\n') || val.includes('\\"') || val.includes('\\\\')) {
          val = val.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }
        // Strip leading/trailing JSON artifacts
        val = val.replace(/^\s*["'{[\]]+\s*/, '').replace(/\s*["'}\]]+\s*$/, '');
        parsed[key] = val;
      }
    }
  } catch {
    // If JSON parsing fails, try to extract just the narrative from the raw text
    let fallbackNarrative = rawResponse;
    // Strip JSON wrapper artifacts from raw response
    fallbackNarrative = fallbackNarrative.replace(/^[\s\S]*?"narrative"\s*:\s*"/m, '');
    fallbackNarrative = fallbackNarrative.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    fallbackNarrative = fallbackNarrative.replace(/"\s*,?\s*"(letterForBuyer|risks|opportunities|actionableSteps)"[\s\S]*$/m, '');
    fallbackNarrative = fallbackNarrative.replace(/^\s*[{[\]"]+/, '').replace(/[}\]"]+\s*$/, '');
    parsed = {
      narrative: fallbackNarrative.trim(),
      letterForBuyer: '',
      risks: result.risks,
      opportunities: result.opportunities,
      actionableSteps: [],
    };
  }

  // Generate letters for other buyer types (parallel calls)
  const letterByBuyerType: Partial<Record<BuyerType, string>> = {};
  letterByBuyerType[buyerType] = parsed.letterForBuyer || parsed.narrative;

  const otherBuyerTypes = ALL_BUYER_TYPES.filter(bt => bt !== buyerType);
  const letterPromises = otherBuyerTypes.map(async (bt) => {
    const letterResponse = await llmCall({
      model: MODEL,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: BUYER_LETTER_PROMPT(bt, input.companyName, formatGBP(result.enterpriseValue.base)),
      maxTokens: 1024,
    });
    return { buyerType: bt, letter: letterResponse };
  });

  const letters = await Promise.all(letterPromises);
  for (const { buyerType: bt, letter } of letters) {
    letterByBuyerType[bt] = letter;
  }

  return {
    narrative: parsed.narrative,
    letterByBuyerType,
    risks: parsed.risks ?? result.risks,
    opportunities: parsed.opportunities ?? result.opportunities,
    actionableSteps: parsed.actionableSteps ?? [],
  };
}
