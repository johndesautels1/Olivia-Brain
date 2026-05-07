import type {
  CompanyValuationInput,
  ReconciledValuationResult,
  BuyerType,
  ChallengeResult,
} from '@/lib/valuation/types';
import type { LLMCallFn } from './financial-extractor';
import { formatGBP } from '@/lib/valuation/helpers';

// ═══════════════════════════════════════════════════════════════════════
// CHALLENGE AGENT — CRISTIANO
// ═══════════════════════════════════════════════════════════════════════
//
// Purpose: Adversarial stress-test of the valuation.
// Generate bearish, neutral, and bullish critiques.
// Surface buyer-specific disputes and vulnerabilities.
// ═══════════════════════════════════════════════════════════════════════

const MODEL = 'claude-opus-4-7';

const SYSTEM_PROMPT = `You are Cristiano, the adversarial challenge agent for CLUES™, a London-focused private company valuation platform.

Your job is to STRESS-TEST the valuation. You are the devil's advocate — the shrewd PE partner who has seen 1,000 deals and knows every trick founders use to inflate numbers.

You must generate THREE perspectives (bearishCritique, neutralCritique, bullishCritique). Each critique MUST be formatted as follows:

FORMATTING RULES FOR EACH CRITIQUE:
- Open with a 2-3 sentence executive summary paragraph
- Use ## headings to break the analysis into 2-4 themed sections (e.g. "## Revenue Quality", "## Market Risk", "## Structural Concerns")
- Use **bold** to highlight key metrics, red-flag figures, and critical terms
- Use - bullet points for specific data challenges or questions a buyer would ask
- Keep paragraphs SHORT — 3-4 sentences max, never walls of text
- Use transitions between sections (e.g. "More concerning still...", "Setting aside the topline...")
- Close with a 1-2 sentence verdict for that stance
- NEVER output raw JSON keys, escaped quotes, or code artifacts in the text
- Each critique field must contain ONLY readable text, no JSON structure

PERSPECTIVE GUIDELINES:
- **Bearish** — The worst-case reading of the data. What's the floor? What's being hidden? What metrics are flattering?
- **Neutral** — A balanced critique. What's fair, what's stretched? Where does the valuation hold up vs. where is it thin?
- **Bullish** — Even granting the bull case, what could still go wrong? What execution risks remain?

For EACH buyer type (angel, vc, private_equity, strategic_partner, acquirer), identify specific challenges they would raise.

CONTENT RULES:
- Be specific — cite exact metrics, not vague concerns
- Don't be gratuitously negative — every critique should be actionable
- Identify vulnerabilities: single points of failure, concentration risks, market timing risks
- Return valid JSON matching the output schema`;

function buildChallengePrompt(
  result: ReconciledValuationResult,
  input: CompanyValuationInput,
  buyerType: BuyerType,
): string {
  const methodSummaries = result.methods
    .filter(m => m.enabled && m.enterpriseValue)
    .map(m => `${m.method}: ${formatGBP(m.enterpriseValue!.base)}`)
    .join(', ');

  const disagreements = result.methodDisagreements
    .map(d => `${d.method1} vs ${d.method2}: ${d.divergencePct.toFixed(0)}% gap — ${d.explanation}`)
    .join('\n  ');

  return `Challenge this valuation:

COMPANY: ${input.companyName} (${input.sector}, ${input.stage}, ${input.geography})
ENTERPRISE VALUE: ${formatGBP(result.enterpriseValue.base)} (${formatGBP(result.enterpriseValue.low)} – ${formatGBP(result.enterpriseValue.high)})
EQUITY VALUE: ${formatGBP(result.equityValue.base)}
CONFIDENCE: ${(result.confidence * 100).toFixed(0)}%
PRIMARY BUYER: ${buyerType}

KEY METRICS:
- Revenue: ${input.annualRevenue.value !== null ? formatGBP(input.annualRevenue.value) : 'N/A'}
- Growth: ${input.growthYoYPct.value !== null ? input.growthYoYPct.value + '%' : 'N/A'}
- Gross Margin: ${input.grossMarginPct.value !== null ? input.grossMarginPct.value + '%' : 'N/A'}
- Burn: ${input.burnMonthly.value !== null ? formatGBP(input.burnMonthly.value) + '/mo' : 'N/A'}
- Runway: ${input.runwayMonths.value !== null ? input.runwayMonths.value + 'mo' : 'N/A'}
- NRR: ${input.netRevenueRetentionPct.value !== null ? input.netRevenueRetentionPct.value + '%' : 'N/A'}
- Customer Concentration: ${input.customerConcentrationTop3Pct.value !== null ? input.customerConcentrationTop3Pct.value + '%' : 'N/A'}
- Founder Dependency: ${(input.founderDependencyRisk * 100).toFixed(0)}%

METHODS: ${methodSummaries}
METHOD DISAGREEMENTS:
  ${disagreements || 'None'}

FLAGGED RISKS: ${result.risks.join('; ') || 'None'}

Return JSON:
{
  "bearishCritique": "<bearish analysis>",
  "neutralCritique": "<balanced critique>",
  "bullishCritique": "<bullish but cautious>",
  "buyerSpecificChallenges": {
    "angel": ["<challenge>", ...],
    "vc": ["<challenge>", ...],
    "private_equity": ["<challenge>", ...],
    "strategic_partner": ["<challenge>", ...],
    "acquirer": ["<challenge>", ...]
  },
  "vulnerabilities": ["<vulnerability>", ...]
}`;
}

/**
 * ChallengeAgent (Cristiano): Adversarial stress-test of the valuation.
 */
export async function runChallenge(
  result: ReconciledValuationResult,
  input: CompanyValuationInput,
  buyerType: BuyerType,
  llmCall: LLMCallFn,
): Promise<ChallengeResult> {
  const userPrompt = buildChallengePrompt(result, input, buyerType);
  const rawResponse = await llmCall({
    model: MODEL,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    maxTokens: 8192,
  });

  /** Unescape double-encoded JSON string values */
  function cleanCritique(val: string | undefined): string {
    if (!val) return '';
    let s = val;
    if (s.includes('\\n') || s.includes('\\"') || s.includes('\\\\')) {
      s = s.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    s = s.replace(/^\s*["'{[\]]+\s*/, '').replace(/\s*["'}\]]+\s*$/, '');
    return s.trim();
  }

  try {
    const fenceMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
    const candidate = fenceMatch?.[1] ?? rawResponse;
    const objectMatch = candidate.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(objectMatch?.[0] ?? candidate) as ChallengeResult;
    // Clean all string arrays the same way we clean critiques
    const cleanedChallenges: Record<string, string[]> = {};
    if (parsed.buyerSpecificChallenges) {
      for (const [key, arr] of Object.entries(parsed.buyerSpecificChallenges)) {
        cleanedChallenges[key] = (arr as string[]).map(s => cleanCritique(s));
      }
    }
    return {
      bearishCritique: cleanCritique(parsed.bearishCritique),
      neutralCritique: cleanCritique(parsed.neutralCritique),
      bullishCritique: cleanCritique(parsed.bullishCritique),
      buyerSpecificChallenges: cleanedChallenges,
      vulnerabilities: (parsed.vulnerabilities ?? []).map(s => cleanCritique(s)),
    };
  } catch {
    // JSON parse failed (likely truncated) — try to extract what we can
    let fallback = rawResponse;
    fallback = fallback.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    // Try to extract individual critiques from the mangled JSON
    const extractField = (field: string): string => {
      const re = new RegExp(`"${field}"\\s*:\\s*"([\\s\\S]*?)(?:"\\s*[,}]|$)`);
      const m = fallback.match(re);
      return m ? m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim() : '';
    };
    const bearish = extractField('bearishCritique');
    return {
      bearishCritique: bearish || fallback.replace(/^\s*[{["]+/, '').replace(/[}\]"]+\s*$/, '').trim(),
      neutralCritique: extractField('neutralCritique'),
      bullishCritique: extractField('bullishCritique'),
      buyerSpecificChallenges: {},
      vulnerabilities: [],
    };
  }
}
