import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/client";
import { requireTier } from "@/lib/require-tier";
import { rateLimit } from "@/lib/rate-limit";
import type { Prisma } from "@prisma/client";
import { buildValuationInput, mergeBridgeAndCascade, calculateCompleteness } from "@/lib/valuation/bridge";
import { runValuation, runMonteCarloForRange, generateBinomialTreeNodes } from "@/lib/valuation/engine";
import { hybridMonteCarloCRR } from "@/lib/valuation/hybrid";
import { nz } from "@/lib/valuation/helpers";
import { getDiscountRate } from "@/lib/valuation/benchmarks";
import { SensitivityAnalyzer } from "@/lib/valuation/sensitivity";
import type {
  BuyerType,
  Scenario,
  ReconciledValuationResult,
  CompanyValuationInput,
} from "@/lib/valuation/types";
import { BuyerTypeSchema, ScenarioSchema } from "@/lib/valuation/types";
import { getCascadeMode, isFullCascadeEnabled } from "@/lib/valuation/cascade-toggle";
import {
  runExtractionPhase,
  runIntelligencePhase,
  createCascadeLLMCall,
  type ParsedDocument,
  type OrchestratorConfig,
} from "@/lib/agents/valuation";

// Vercel Pro: allow up to 5 minutes for full cascade (multiple sequential LLM calls)
export const maxDuration = 300;

// â”€â”€ Extract first URL from text (for evidence citation links) â”€â”€

function extractFirstUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s\])"',>}{]+/);
  return m ? m[0].replace(/[.,;:!?)]+$/, '') : null;
}

// â”€â”€ Strip JSON/code markup from document chunk content for user-facing previews â”€â”€

function stripMarkupForPreview(raw: string): string {
  let text = raw;
  // Remove JSON block structure: {"blocks":[...], "type":"...", "content":"..."}
  // Extract "content" values from JSON-like strings
  const contentMatches = text.match(/"content"\s*:\s*"([^"]{10,})"/g);
  if (contentMatches && contentMatches.length > 0) {
    text = contentMatches
      .map(m => m.replace(/^"content"\s*:\s*"/, '').replace(/"$/, ''))
      .join(' ');
  }
  // Remove residual JSON syntax: braces, brackets, quotes, backslashes
  text = text.replace(/[{}\[\]\\]/g, '');
  // Remove JSON keys like "type":"paragraph", "heading":"...", etc.
  text = text.replace(/"(type|heading|level|icon|style|items|title|subtitle|classification|date|documentId|version|headers|rows)"\s*:\s*"?[^",]*"?,?\s*/gi, '');
  // Remove leftover quotes and commas
  text = text.replace(/"+/g, '').replace(/,\s*,/g, ' ').replace(/\s{2,}/g, ' ');
  // Remove markdown-style headers
  text = text.replace(/#{1,4}\s*/g, '');
  return text.trim().slice(0, 200);
}

// â”€â”€ Build minimal evidence chain from bridge metrics (non-cascade path) â”€â”€

function buildMinimalEvidenceChain(input: CompanyValuationInput): Array<{
  chunkId: string;
  documentId: string;
  documentTitle: string;
  documentType: string;
  originalFilename: string | null;
  pageOrSlide: number | null;
  chunkIndex: number;
  contentPreview: string;
  sourceUrl: string | null;
}> {
  const chain: Array<{
    chunkId: string; documentId: string; documentTitle: string;
    documentType: string; originalFilename: string | null;
    pageOrSlide: number | null; chunkIndex: number; contentPreview: string;
    sourceUrl: string | null;
  }> = [];

  const metrics: Array<{ label: string; value: number | null | undefined; unit: string }> = [
    { label: 'Annual Revenue', value: input.annualRevenue?.value, unit: 'Â£' },
    { label: 'Annual Recurring Revenue', value: input.arr?.value, unit: 'Â£' },
    { label: 'EBITDA', value: input.ebitda?.value, unit: 'Â£' },
    { label: 'Revenue Growth YoY', value: input.growthYoYPct?.value, unit: '%' },
    { label: 'Net Revenue Retention', value: input.netRevenueRetentionPct?.value, unit: '%' },
    { label: 'Gross Margin', value: input.grossMarginPct?.value, unit: '%' },
    { label: 'Burn Rate (monthly)', value: input.burnMonthly?.value, unit: 'Â£' },
    { label: 'Runway (months)', value: input.runwayMonths?.value, unit: 'mo' },
  ];

  let idx = 0;
  for (const m of metrics) {
    if (m.value != null && m.value !== 0) {
      const formatted = m.unit === 'Â£'
        ? `Â£${(m.value >= 1_000_000 ? (m.value / 1_000_000).toFixed(1) + 'M' : m.value >= 1_000 ? (m.value / 1_000).toFixed(0) + 'K' : m.value.toFixed(0))}`
        : m.unit === '%' ? `${m.value.toFixed(1)}%`
        : m.unit === 'mo' ? `${m.value} months`
        : `${m.value}`;
      chain.push({
        chunkId: `bridge-${idx}`,
        documentId: 'bridge-data',
        documentTitle: 'Company DNA Profile',
        documentType: 'financial',
        originalFilename: null,
        pageOrSlide: null,
        chunkIndex: idx,
        contentPreview: `${m.label}: ${formatted}`,
        sourceUrl: null,
      });
      idx++;
    }
  }

  return chain;
}

// â”€â”€ Generate comparable fingerprint from company data vs sector benchmarks â”€â”€

function generateFingerprint(input: CompanyValuationInput): Array<{
  axis: string; company: number; compMedian: number; fullMark: number;
}> {
  // Normalize values to 0-100 scale for radar chart
  const clamp = (v: number, max: number) => Math.min(100, Math.max(0, (v / max) * 100));

  const revenue = nz(input.annualRevenue?.value) || nz(input.arr?.value);
  const growth = nz(input.growthYoYPct?.value);
  const margin = nz(input.grossMarginPct?.value) || nz(input.ebitdaMarginPct?.value);
  const teamScore = (input.managementStrength ?? 0.5) * 100; // 0-1 â†’ 0-100
  const nrr = nz(input.netRevenueRetentionPct?.value);
  const runway = nz(input.runwayMonths?.value);

  // Sector median benchmarks (normalized to same 0-100 scale)
  // These represent "typical" London tech company at similar stage
  const stageMultipliers: Record<string, number> = {
    idea: 0.2, pre_revenue: 0.3, mvp: 0.5, early_revenue: 0.7,
    growth: 1.0, scaleup: 1.5, mature: 2.0,
  };
  const stageMult = stageMultipliers[input.stage] ?? 1.0;

  return [
    { axis: 'Revenue', company: clamp(revenue, 5_000_000 * stageMult), compMedian: 50, fullMark: 100 },
    { axis: 'Growth', company: clamp(growth, 100), compMedian: 45, fullMark: 100 },
    { axis: 'Margins', company: clamp(margin, 80), compMedian: 40, fullMark: 100 },
    { axis: 'Team', company: clamp(teamScore, 50), compMedian: 50, fullMark: 100 },
    { axis: 'Retention', company: clamp(nrr, 150), compMedian: 55, fullMark: 100 },
    { axis: 'Runway', company: clamp(runway, 24), compMedian: 50, fullMark: 100 },
  ];
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// POST /api/valuation/run
// Triggers a new valuation run. Two modes:
//
//   math  (default): Bridge â†’ pure math engine â†’ sensitivity â†’ persist
//   full  (cascade): Gather docs + DNA â†’ 14-agent cascade â†’ persist
//
// Mode is controlled by VALUATION_CASCADE_MODE env var in Vercel.
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const DEFAULT_SCENARIO: Scenario = {
  name: "base",
  revenueGrowthShockPct: 0,
  multipleShockPct: 0,
  marginShockPct: 0,
  discountRateShockPct: 0,
  strategicPremiumPct: 0,
  concentrationPenaltyPct: 0,
  synergyPremiumPct: 0,
  controlPremiumPct: 0,
};

// DNA paragraph IDs to labels â€” for building a readable document from DNA text
const DNA_PARAGRAPH_LABELS: Record<string, string> = {
  p1: "Company Overview",
  p2: "Product & Service",
  p3: "Market & Industry",
  p4: "Team & Leadership",
  p5: "Traction & Metrics",
  p6: "Funding Ask",
  p7: "Competitive Landscape",
  p8: "Financial Snapshot",
  p9: "Vision & Roadmap",
  p10: "Risk & Mitigation",
};

/**
 * Gather ParsedDocuments from DNA paragraphs and user-owned documents.
 *
 * **OB scope note.** LTM additionally drains
 * (a) `AnalysisResult.companyProfile._dnaInput` for DNA paragraphs and
 * (b) `Document` rows tagged `feedsValuation: true` (or any non-archived
 * rich-text/template doc) for the user's Studio output.
 *
 * Olivia Brain owns neither model. Both data sources reach this function
 * via the `UniversalKnowledgeProvider` bridge in tracks downstream of V7
 * (DNA paragraphs route through `LtmKnowledgeProvider`; Studio documents
 * land when the Documents track ports post-Clerk). Until those wires are
 * in place, this function returns an empty document list and the cascade
 * extraction agents (V5/V6) degrade to bridge-only inputs — explicit by
 * design, not a band-aid stub.
 */
async function gatherDocuments(
  _valuationSubjectId: string,
  _ownerUserId: string,
): Promise<ParsedDocument[]> {
  const docs: ParsedDocument[] = [];

  // Reserved for AnalysisResult DNA + Document evidence — wired in future
  // tracks via the UKP bridge. Currently no-op so the route compiles
  // standalone in OB.
  void DNA_PARAGRAPH_LABELS;

  return docs;
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 5,
    windowMs: 60_000,
    prefix: "valuation-run",
  });
  if (limited) return limited;

  try {
    // Valuation Engine requires Executive tier or higher
    const tierCheck = await requireTier('executive', 'Valuation Engine');
    if (!tierCheck.authorized) return tierCheck.response;
    const { profileId } = tierCheck;

    const body = await request.json();
    const {
      valuationSubjectId,
      scenarios: rawScenarios,
      buyerTypes: rawBuyerTypes,
      targetMatchOrgId,
    } = body as {
      valuationSubjectId?: string;
      scenarios?: Array<Partial<Scenario>>;
      buyerTypes?: string[];
      targetMatchOrgId?: string;
    };

    if (!valuationSubjectId) {
      return NextResponse.json(
        { error: "Missing valuationSubjectId" },
        { status: 400 },
      );
    }

    // Verify ownership
    const subject = await prisma.valuationSubject.findUnique({
      where: { id: valuationSubjectId },
      select: { id: true, userId: true, isArchived: true },
    });
    if (!subject) {
      return NextResponse.json(
        { error: "ValuationSubject not found" },
        { status: 404 },
      );
    }
    if (subject.userId !== profileId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    // If subject was soft-deleted (e.g. all runs archived), un-archive it
    // since the user is explicitly requesting a new run.
    if (subject.isArchived) {
      await prisma.valuationSubject.update({
        where: { id: valuationSubjectId },
        data: { isArchived: false },
      });
    }

    // Parse scenarios (default to single base scenario)
    const scenarios: Scenario[] = (rawScenarios ?? [{ name: "base" }]).map(
      (s) => ScenarioSchema.parse({ ...DEFAULT_SCENARIO, ...s }),
    );

    // Parse buyer types (default to ['vc'])
    const buyerTypes: BuyerType[] = (rawBuyerTypes ?? ["vc"]).map((bt) =>
      BuyerTypeSchema.parse(bt),
    );

    const startMs = Date.now();
    const cascadeMode = await getCascadeMode();

    // â”€â”€ FULL CASCADE MODE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (await isFullCascadeEnabled()) {
      // 1. Load bridge data (DB + benchmarks + qualitative scores) â€” same
      //    source the math-only path uses. This gives us real sector multiples,
      //    qualitative scores, scorecard factors, synergy data, and regional
      //    benchmarks that the LLM cannot produce.
      const bridgeResult = await buildValuationInput(valuationSubjectId, { targetMatchOrgId });
      const bridgeInput = bridgeResult.input;

      // 2. Gather DNA paragraphs + user documents as ParsedDocument[]
      const documents = await gatherDocuments(valuationSubjectId, profileId);

      if (documents.length === 0) {
        return NextResponse.json(
          { error: "No documents or DNA paragraphs available. Please complete at least some DNA paragraphs or upload documents before running the full cascade." },
          { status: 400 },
        );
      }

      const llmCall = createCascadeLLMCall();

      const runs: Array<{
        runId: string;
        scenario: string;
        buyerType: BuyerType;
        valuation: ReconciledValuationResult;
        orchestratedAt: string;
      }> = [];

      for (const scenario of scenarios) {
        for (const buyerType of buyerTypes) {
          const config: OrchestratorConfig = {
            llmCall,
            buyerType,
            scenario,
            companyId: valuationSubjectId,
            companyName: bridgeInput.companyName,
          };

          // 3. PHASE 1: LLM extraction + validation (no engine yet)
          const extractionResult = await runExtractionPhase(documents, config);

          // 4. MERGE: combine bridge data with cascade data BEFORE the engine runs.
          //    Math (bridge) is source of truth. LLM only fills gaps or provides
          //    higher-confidence extraction from documents.
          const cascadeRawInput = extractionResult.validation.input;
          const mergedInput = mergeBridgeAndCascade(bridgeInput, cascadeRawInput);
          const mergedCompleteness = calculateCompleteness(mergedInput);

          // 5. PHASE 2: Engine + intelligence agents on MERGED input â€” THIS IS THE FIX
          const intellResult = await runIntelligencePhase({
            mergedInput,
            extraction: extractionResult.extraction,
            validation: extractionResult.validation,
            llmCall,
            buyerType,
            scenario,
          });
          const durationMs = Date.now() - startMs;
          const result = intellResult.valuation;

          // Run sensitivity analysis on the MERGED input (has real benchmarks)
          const analyzer = new SensitivityAnalyzer(
            mergedInput,
            scenario,
            buyerType,
          );
          const tornadoBars = analyzer.generateTornadoData();

          // Build evidence chain from intake results for the GET route
          // Strip JSON/code markup from content preview so users see plain language
          // sourceUrl: prefer metadata-provided URL, fall back to extracting from content
          const evidenceChain = extractionResult.intake.flatMap((ir) =>
            ir.chunks.map((chunk) => ({
              chunkId: chunk.chunkId,
              documentId: chunk.documentId,
              documentTitle: chunk.documentName,
              documentType: ir.documentType,
              originalFilename: ir.documentName,
              pageOrSlide: chunk.pageOrSlide,
              chunkIndex: chunk.chunkIndex,
              contentPreview: stripMarkupForPreview(chunk.content),
              sourceUrl: chunk.sourceUrl ?? extractFirstUrl(chunk.content),
            })),
          );

          // â”€â”€ Stochastic computations on MERGED input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          const mcResult = runMonteCarloForRange(mergedInput, scenario);
          const mcResultForStorage = mcResult ? {
            ...mcResult,
            distribution: mcResult.distribution.slice(0, 500),
          } : null;

          const mergedRevenue = nz(mergedInput.arr.value) || nz(mergedInput.annualRevenue.value);
          let cascadeHybridResult = null;
          if (mergedRevenue > 0) {
            const growthBase = nz(mergedInput.growthYoYPct.value, 20);
            const margin = mergedInput.fcfMargin !== undefined
              ? mergedInput.fcfMargin * 100
              : nz(mergedInput.ebitdaMarginPct.value, 15);
            const wacc = mergedInput.wacc !== undefined
              ? mergedInput.wacc * 100
              : nz(mergedInput.marketBenchmarks.discountRatePct, getDiscountRate(mergedInput.stage) * 100);
            const termGrowth = nz(mergedInput.marketBenchmarks.terminalGrowthPct, 2.5);
            const standaloneEV = result.enterpriseValue.base;
            const expansionCapex = nz(mergedInput.expansionCapex?.value, standaloneEV * 0.3);

            const fullHybrid = hybridMonteCarloCRR({
              revenue: mergedRevenue,
              revenueGrowthPct: growthBase + scenario.revenueGrowthShockPct,
              fcfMarginPct: margin + scenario.marginShockPct,
              waccPct: wacc + scenario.discountRateShockPct,
              terminalGrowthPct: termGrowth,
              volatility: mergedInput.volatility,
              timeToExit: mergedInput.timeToExit,
              expansionCapex,
              seed: 42,
            }, 2500, 60);

            cascadeHybridResult = {
              ...fullHybrid,
              baseDistribution: fullHybrid.baseDistribution.slice(0, 500),
              hybridDistribution: fullHybrid.hybridDistribution.slice(0, 500),
            };
          }

          const mergedStandaloneEV = result.enterpriseValue.base;
          const mergedTreeExpCapex = nz(mergedInput.expansionCapex?.value, mergedStandaloneEV * 0.3);
          const mergedTreeSalvage = nz(mergedInput.salvageValue?.value, mergedStandaloneEV * 0.25);
          const mergedBinomialCall = generateBinomialTreeNodes(
            mergedStandaloneEV, mergedTreeExpCapex,
            mergedInput.volatility, mergedInput.timeToExit, 'call', 6,
          );
          const mergedBinomialPut = generateBinomialTreeNodes(
            mergedStandaloneEV, mergedTreeSalvage,
            mergedInput.volatility, mergedInput.timeToExit, 'put', 6,
          );

          // Build input snapshot with MERGED data (bridge + cascade best-of)
          const inputSnapshotJson = {
            ...mergedInput,
            scenarioName: scenario.name,
            warnings: [...bridgeResult.warnings, ...extractionResult.validation.warnings],
            completenessScore: mergedCompleteness,
            cascadeMode,
            scenarios: scenarios.map((s) => ({
              name: s.name,
              assumptions: s,
              enterpriseValue: result.enterpriseValue.base,
              probability: 1 / scenarios.length,
            })),
            // Stochastic data for UI tabs
            monteCarloResult: mcResultForStorage,
            hybridResult: cascadeHybridResult,
            binomialTreeNodes: mergedBinomialCall,
            binomialTreeNodesPut: mergedBinomialPut,
            fingerprint: generateFingerprint(mergedInput),
            // Cascade-populated fields
            evidenceChain,
            justification: intellResult.justification ?? null,
            truthScore: intellResult.truthScore?.truthScore ?? null,
            modelStackVersion: "cascade-v1",
            // Full intelligence agent results for the UI
            challenge: intellResult.challenge ?? null,
            counterNarrative: intellResult.counterNarrative ?? null,
            preMortem: intellResult.preMortem ?? null,
            acquisitionMirror: intellResult.acquisitionMirror ?? null,
          } as unknown as Prisma.InputJsonValue;

          // Persist ValuationRun
          const valuationRun = await prisma.valuationRun.create({
            data: {
              valuationSubjectId,
              buyerType,
              targetMatchOrgId: targetMatchOrgId ?? null,
              inputSnapshotJson,
              resultJson: result as unknown as Prisma.InputJsonValue,
              methodWeightsJson: (result.methods
                ? Object.fromEntries(
                    result.methods
                      .filter((m) => m.enabled)
                      .map((m) => [m.method, m.weight]),
                  )
                : null) as unknown as Prisma.InputJsonValue,
              confidenceScore: result.confidence ?? null,
              status: "completed",
              runDurationMs: durationMs,
            },
          });

          // Persist sensitivity rows
          if (tornadoBars.length > 0) {
            await prisma.valuationSensitivity.createMany({
              data: tornadoBars.map((bar) => ({
                valuationRunId: valuationRun.id,
                variableName: bar.variable,
                baseValue: bar.baseValue,
                lowValue: bar.lowValue,
                highValue: bar.highValue,
                lowValuation: bar.lowResult,
                highValuation: bar.highResult,
              })),
            });
          }

          // 5. Selective persist: write MERGED data back to ValuationSubject
          //    across ALL 6 JSON columns (not just financialDataJson).
          //    This ensures math-only runs that follow get the best data from both sources.
          await prisma.valuationSubject.update({
            where: { id: valuationSubjectId },
            data: {
              financialDataJson: {
                annualRevenue: mergedInput.annualRevenue,
                arr: mergedInput.arr,
                grossMarginPct: mergedInput.grossMarginPct,
                ebitda: mergedInput.ebitda,
                ebitdaMarginPct: mergedInput.ebitdaMarginPct,
                burnMonthly: mergedInput.burnMonthly,
                runwayMonths: mergedInput.runwayMonths,
                growthYoYPct: mergedInput.growthYoYPct,
                netRevenueRetentionPct: mergedInput.netRevenueRetentionPct,
                churnPct: mergedInput.churnPct,
                customerConcentrationTop3Pct: mergedInput.customerConcentrationTop3Pct,
                cacPaybackMonths: mergedInput.cacPaybackMonths,
                ltvToCac: mergedInput.ltvToCac,
                burnMultiple: mergedInput.burnMultiple,
              } as unknown as Prisma.InputJsonValue,
              qualitativeJson: {
                founderDependencyRisk: mergedInput.founderDependencyRisk,
                legalRisk: mergedInput.legalRisk,
                ipStrength: mergedInput.ipStrength,
                productMaturity: mergedInput.productMaturity,
                goToMarketMaturity: mergedInput.goToMarketMaturity,
                londonStrategicFit: mergedInput.londonStrategicFit,
                managementStrength: mergedInput.managementStrength,
                founderReputationScore: mergedInput.founderReputationScore,
                competitionIntensityScore: mergedInput.competitionIntensityScore,
                scorecardFactors: mergedInput.scorecardFactors ?? null,
              } as unknown as Prisma.InputJsonValue,
              ipDataJson: {
                capitalizedBuildCost: mergedInput.capitalizedBuildCost,
                replacementCost: mergedInput.replacementCost,
                patentsCount: mergedInput.patentsCount,
                proprietaryDataScore: mergedInput.proprietaryDataScore,
                trademarksCount: mergedInput.trademarksCount,
                regulatoryApprovals: mergedInput.regulatoryApprovals,
              } as unknown as Prisma.InputJsonValue,
              marketDataJson: {
                tam: mergedInput.tam,
                sam: mergedInput.sam,
                som: mergedInput.som,
                marketGrowthPct: mergedInput.marketGrowthPct,
              } as unknown as Prisma.InputJsonValue,
              capitalDataJson: {
                cashOnHand: mergedInput.cashOnHand,
                debt: mergedInput.debt,
                fullyDilutedShares: mergedInput.fullyDilutedShares,
                optionPoolPct: mergedInput.optionPoolPct,
              } as unknown as Prisma.InputJsonValue,
              fundingDataJson: {
                capitalRaisedToDate: mergedInput.capitalRaisedToDate,
                lastRoundPreMoney: mergedInput.lastRoundPreMoney,
                lastRoundPostMoney: mergedInput.lastRoundPostMoney,
              } as unknown as Prisma.InputJsonValue,
              completenessScore: mergedCompleteness,
            },
          });

          runs.push({
            runId: valuationRun.id,
            scenario: scenario.name,
            buyerType,
            valuation: result,
            orchestratedAt: extractionResult.orchestratedAt,
          });
        }
      }

      return NextResponse.json({
        ok: true,
        companyId: valuationSubjectId,
        cascadeMode,
        runs,
      });
    }

    // â”€â”€ MATH-ONLY MODE (default) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Build engine input via bridge
    const { input, warnings, completenessScore } = await buildValuationInput(
      valuationSubjectId,
      { targetMatchOrgId },
    );

    // Update completeness score on the subject
    await prisma.valuationSubject.update({
      where: { id: valuationSubjectId },
      data: { completenessScore },
    });

    // Run valuation for each scenario Ã— buyerType combination
    const runs: Array<{
      runId: string;
      scenario: string;
      buyerType: BuyerType;
      valuation: ReconciledValuationResult;
      orchestratedAt: string;
    }> = [];

    for (const scenario of scenarios) {
      for (const buyerType of buyerTypes) {
        // Run the pure math engine
        const result = runValuation(input, scenario, buyerType);
        const durationMs = Date.now() - startMs;

        // Run sensitivity analysis
        const analyzer = new SensitivityAnalyzer(input, scenario, buyerType);
        const tornadoBars = analyzer.generateTornadoData();

        // â”€â”€ Compute Monte Carlo, Hybrid MC+CRR, and Binomial Tree â”€â”€
        const mcResult = runMonteCarloForRange(input, scenario);

        // Strip the full 5000-element distribution to save DB space â€” keep first 500 for histogram
        const mcResultForStorage = mcResult ? {
          ...mcResult,
          distribution: mcResult.distribution.slice(0, 500),
        } : null;

        // Hybrid MC+CRR (only when relevant â€” needs revenue data)
        const revenue = nz(input.arr.value) || nz(input.annualRevenue.value);
        let hybridResult = null;
        if (revenue > 0) {
          const growthBase = nz(input.growthYoYPct.value, 20);
          const margin = input.fcfMargin !== undefined
            ? input.fcfMargin * 100
            : nz(input.ebitdaMarginPct.value, 15);
          const wacc = input.wacc !== undefined
            ? input.wacc * 100
            : nz(input.marketBenchmarks.discountRatePct, getDiscountRate(input.stage) * 100);
          const termGrowth = nz(input.marketBenchmarks.terminalGrowthPct, 2.5);
          const standaloneEV = result.enterpriseValue.base;
          const expansionCapex = nz(input.expansionCapex?.value, standaloneEV * 0.3);

          const fullHybrid = hybridMonteCarloCRR({
            revenue,
            revenueGrowthPct: growthBase + scenario.revenueGrowthShockPct,
            fcfMarginPct: margin + scenario.marginShockPct,
            waccPct: wacc + scenario.discountRateShockPct,
            terminalGrowthPct: termGrowth,
            volatility: input.volatility,
            timeToExit: input.timeToExit,
            expansionCapex,
            seed: 42,
          }, 2500, 60);

          // Strip distributions for storage â€” keep 500 samples each
          hybridResult = {
            ...fullHybrid,
            baseDistribution: fullHybrid.baseDistribution.slice(0, 500),
            hybridDistribution: fullHybrid.hybridDistribution.slice(0, 500),
          };
        }

        // Binomial tree nodes for visualization (6-step mini lattice)
        const standaloneEVForTree = result.enterpriseValue.base;
        const treeExpansionCapex = nz(input.expansionCapex?.value, standaloneEVForTree * 0.3);
        const treeSalvageValue = nz(input.salvageValue?.value, standaloneEVForTree * 0.25);
        const binomialTreeNodes = generateBinomialTreeNodes(
          standaloneEVForTree,
          treeExpansionCapex,
          input.volatility,
          input.timeToExit,
          'call',
          6,
        );
        const binomialTreeNodesPut = generateBinomialTreeNodes(
          standaloneEVForTree,
          treeSalvageValue,
          input.volatility,
          input.timeToExit,
          'put',
          6,
        );

        // Build the input snapshot
        const inputSnapshotJson = {
          ...input,
          scenarioName: scenario.name,
          warnings,
          completenessScore,
          cascadeMode,
          scenarios: scenarios.map((s) => ({
            name: s.name,
            assumptions: s,
            enterpriseValue: result.enterpriseValue.base,
            probability: 1 / scenarios.length,
          })),
          evidenceChain: buildMinimalEvidenceChain(input),
          fingerprint: generateFingerprint(input),
          justification: null,
          truthScore: null,
          modelStackVersion: `math-only-v1`,
          // Monte Carlo + Hybrid + Binomial Tree data for UI tabs
          monteCarloResult: mcResultForStorage,
          hybridResult,
          binomialTreeNodes,
          binomialTreeNodesPut,
        } as unknown as Prisma.InputJsonValue;

        // Persist ValuationRun
        const valuationRun = await prisma.valuationRun.create({
          data: {
            valuationSubjectId,
            buyerType,
            targetMatchOrgId: targetMatchOrgId ?? null,
            inputSnapshotJson,
            resultJson: result as unknown as Prisma.InputJsonValue,
            methodWeightsJson: (result.methods
              ? Object.fromEntries(
                  result.methods
                    .filter((m) => m.enabled)
                    .map((m) => [m.method, m.weight]),
                )
              : null) as unknown as Prisma.InputJsonValue,
            confidenceScore: result.confidence ?? null,
            status: "completed",
            runDurationMs: durationMs,
          },
        });

        // Persist sensitivity rows
        if (tornadoBars.length > 0) {
          await prisma.valuationSensitivity.createMany({
            data: tornadoBars.map((bar) => ({
              valuationRunId: valuationRun.id,
              variableName: bar.variable,
              baseValue: bar.baseValue,
              lowValue: bar.lowValue,
              highValue: bar.highValue,
              lowValuation: bar.lowResult,
              highValuation: bar.highResult,
            })),
          });
        }

        runs.push({
          runId: valuationRun.id,
          scenario: scenario.name,
          buyerType,
          valuation: result,
          orchestratedAt: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({
      ok: true,
      companyId: valuationSubjectId,
      cascadeMode,
      runs,
    });
  } catch (err) {
    console.error("[api/valuation/run] Error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
