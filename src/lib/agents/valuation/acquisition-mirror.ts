import type {
  CompanyValuationInput,
  Scenario,
  BuyerType,
  AcquisitionMirrorResult,
  ValuationBand,
  ReconciledValuationResult,
} from '@/lib/valuation/types';
import type { LLMCallFn } from './financial-extractor';
import { runValuation } from '@/lib/valuation/engine';
import { formatGBP } from '@/lib/valuation/helpers';

// ═══════════════════════════════════════════════════════════════════════
// ACQUISITION MIRROR
// ═══════════════════════════════════════════════════════════════════════
//
// Purpose: Dual valuation — seller vs buyer perspective. (Sonnet — unique idea)
//
// Runs the full valuation twice:
//   - Seller view (Olivia): optimistic scenario, strategic value, IP premium
//   - Buyer view (Cristiano): conservative assumptions, integration costs, discount
//
// Outputs the negotiation zone where deal can happen.
// ═══════════════════════════════════════════════════════════════════════

const MODEL = 'claude-sonnet-4-6';

// ── Scenario factories ───────────────────────────────────────────────

function buildSellerScenario(baseScenario: Scenario): Scenario {
  return {
    ...baseScenario,
    name: 'seller_optimistic',
    revenueGrowthShockPct: baseScenario.revenueGrowthShockPct + 10,
    multipleShockPct: baseScenario.multipleShockPct + 15,
    marginShockPct: baseScenario.marginShockPct + 5,
    strategicPremiumPct: baseScenario.strategicPremiumPct + 10,
    synergyPremiumPct: baseScenario.synergyPremiumPct + 15,
    controlPremiumPct: baseScenario.controlPremiumPct + 20,
  };
}

function buildBuyerScenario(baseScenario: Scenario): Scenario {
  return {
    ...baseScenario,
    name: 'buyer_conservative',
    revenueGrowthShockPct: baseScenario.revenueGrowthShockPct - 15,
    multipleShockPct: baseScenario.multipleShockPct - 20,
    marginShockPct: baseScenario.marginShockPct - 5,
    discountRateShockPct: baseScenario.discountRateShockPct + 5,
    strategicPremiumPct: 0,
    synergyPremiumPct: 0,
    controlPremiumPct: 0,
  };
}

// ── Narrative prompts ────────────────────────────────────────────────

const OLIVIA_SYSTEM = `You are Olivia, the seller's advocate. Write a persuasive 2-3 paragraph narrative justifying the HIGHER valuation from the seller's perspective. Use London VC tone. Reference specific metrics. Focus on strategic value, growth trajectory, and competitive moat.`;

const CRISTIANO_SYSTEM = `You are Cristiano, the buyer's analyst. Write a sharp 2-3 paragraph narrative justifying the LOWER valuation from the buyer's perspective. Use London PE tone. Reference specific risks, integration costs, and market comparables that support a discount.`;

const GAP_SYSTEM = `You are a neutral M&A advisor. Explain why there is a gap between the seller's and buyer's valuations. Identify the 2-3 key assumptions that drive the difference. Suggest where compromise is most likely. Keep it to 2 paragraphs.`;

function buildNarrativePrompt(
  companyName: string,
  valuation: ValuationBand,
  perspective: string,
): string {
  return `${perspective} valuation for ${companyName}: ${formatGBP(valuation.base)} (${formatGBP(valuation.low)} – ${formatGBP(valuation.high)}). Write the narrative.`;
}

function buildGapPrompt(
  companyName: string,
  sellerEV: ValuationBand,
  buyerEV: ValuationBand,
): string {
  return `Explain the valuation gap for ${companyName}:
- Seller's view: ${formatGBP(sellerEV.base)} (${formatGBP(sellerEV.low)} – ${formatGBP(sellerEV.high)})
- Buyer's view: ${formatGBP(buyerEV.base)} (${formatGBP(buyerEV.low)} – ${formatGBP(buyerEV.high)})
- Gap: ${formatGBP(sellerEV.base - buyerEV.base)} (${((sellerEV.base - buyerEV.base) / buyerEV.base * 100).toFixed(0)}%)

What drives this gap and where is compromise most likely?`;
}

// ── Main mirror function ─────────────────────────────────────────────

/**
 * AcquisitionMirror: Run dual valuation from seller and buyer perspectives.
 *
 * @param input - CompanyValuationInput
 * @param baseScenario - Base scenario assumptions
 * @param buyerType - Buyer type for both perspectives
 * @param llmCall - LLM call function for narrative generation
 * @returns AcquisitionMirrorResult with negotiation zone
 */
export async function runAcquisitionMirror(
  input: CompanyValuationInput,
  baseScenario: Scenario,
  buyerType: BuyerType,
  llmCall: LLMCallFn,
): Promise<AcquisitionMirrorResult> {
  // Run seller-optimistic valuation
  const sellerScenario = buildSellerScenario(baseScenario);
  const sellerResult: ReconciledValuationResult = runValuation(
    input,
    sellerScenario,
    buyerType,
  );

  // Run buyer-conservative valuation
  const buyerScenario = buildBuyerScenario(baseScenario);
  const buyerResult: ReconciledValuationResult = runValuation(
    input,
    buyerScenario,
    buyerType,
  );

  // Calculate negotiation zone
  const negotiationZone = {
    low: buyerResult.enterpriseValue.high,  // Buyer's best case
    high: sellerResult.enterpriseValue.low, // Seller's floor
  };

  // If zones don't overlap, use midpoints
  if (negotiationZone.low > negotiationZone.high) {
    const midpoint = (buyerResult.enterpriseValue.base + sellerResult.enterpriseValue.base) / 2;
    negotiationZone.low = midpoint * 0.9;
    negotiationZone.high = midpoint * 1.1;
  }

  // Generate narratives in parallel
  const [oliviaNarrative, cristianoNarrative, gapExplanation] = await Promise.all([
    llmCall({
      model: MODEL,
      systemPrompt: OLIVIA_SYSTEM,
      userPrompt: buildNarrativePrompt(input.companyName, sellerResult.enterpriseValue, "Seller's optimistic"),
      maxTokens: 1024,
    }),
    llmCall({
      model: MODEL,
      systemPrompt: CRISTIANO_SYSTEM,
      userPrompt: buildNarrativePrompt(input.companyName, buyerResult.enterpriseValue, "Buyer's conservative"),
      maxTokens: 1024,
    }),
    llmCall({
      model: MODEL,
      systemPrompt: GAP_SYSTEM,
      userPrompt: buildGapPrompt(input.companyName, sellerResult.enterpriseValue, buyerResult.enterpriseValue),
      maxTokens: 1024,
    }),
  ]);

  return {
    sellerValuation: sellerResult.enterpriseValue,
    buyerValuation: buyerResult.enterpriseValue,
    negotiationZone,
    oliviaNarrative,
    cristianoNarrative,
    gapExplanation,
  };
}
