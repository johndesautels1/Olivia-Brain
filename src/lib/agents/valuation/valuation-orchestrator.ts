import type {
  BuyerType,
  Scenario,
  OrchestratorResult,
  ExtractionPhaseResult,
  IntelligencePhaseResult,
  IntakeResult,
  ExtractedValuationInput,
  ValidatedInput,
  MethodSelectionResult,
  EvidenceMap,
  ReconciledValuationResult,
  CompanyValuationInput,
  JustificationResult,
  ChallengeResult,
  CounterNarrativeResult,
  TruthScoreResult,
  PreMortemResult,
  AcquisitionMirrorResult,
} from '@/lib/valuation/types';
import { runDocumentIntake, type ParsedDocument } from './document-intake';
import { runFinancialExtraction, type LLMCallFn } from './financial-extractor';
import { runValidation } from './validation-agent';
import { runMethodSelection } from './method-selection';
import { buildEvidenceMap } from './evidence-mapper';
import { runValuation } from '@/lib/valuation/engine';
import { runJustification } from './justification-agent';
import { runChallenge } from './challenge-agent';
import { runCounterNarrative } from './counter-narrative-agent';
import { runTruthScore } from './truth-score-agent';
import { runPreMortem } from './pre-mortem-agent';
import { runAcquisitionMirror } from './acquisition-mirror';

// ═══════════════════════════════════════════════════════════════════════
// VALUATION ORCHESTRATOR — FULL 6-STEP CASCADE
// ═══════════════════════════════════════════════════════════════════════
//
// Steps 1-3 (Session 3): Intake → Extract → Validate → Select Methods
// Step 4: runValuation() (deterministic engine, Sessions 1-2)
// Step 5: JustificationAgent (Olivia narrative)
// Step 6: ChallengeAgent (Cristiano) + CounterNarrative + PreMortem
// Optional: TruthScoreAgent (if manual overrides exist)
// Optional: AcquisitionMirror (if buyout mode)
// ═══════════════════════════════════════════════════════════════════════

export type OrchestratorConfig = {
  /** LLM call function (injected for testability and provider flexibility) */
  llmCall: LLMCallFn;
  /** Buyer perspective for valuation */
  buyerType: BuyerType;
  /** Scenario assumptions (shocks, premiums) */
  scenario: Scenario;
  /** Company ID */
  companyId: string;
  /** Authoritative company name from DB (overrides LLM extraction) */
  companyName?: string;
  /** Skip LLM validation step (use for testing or when confident in extraction) */
  skipValidation?: boolean;
  /** Skip intelligence agents (Olivia, Cristiano, etc.) — for fast deterministic-only runs */
  skipIntelligenceAgents?: boolean;
  /** Manual overrides from founder (triggers TruthScore if provided) */
  manualOverrides?: CompanyValuationInput;
  /** Force acquisition mirror even for non-buyout buyer types */
  forceAcquisitionMirror?: boolean;
};

// ═══════════════════════════════════════════════════════════════════════
// PHASE 1: EXTRACTION — Intake → Extract → Validate (LLM only, no engine)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Run extraction phase only: document intake, LLM extraction, validation,
 * and company name override. Returns data ready for merge with bridge input
 * BEFORE the engine runs.
 */
export async function runExtractionPhase(
  documents: ParsedDocument[],
  config: OrchestratorConfig,
): Promise<ExtractionPhaseResult> {
  const {
    llmCall, companyId,
    companyName: authoritativeCompanyName,
    skipValidation,
  } = config;

  // Step 1: Document Intake
  const intakeResults: IntakeResult[] = documents.map(doc =>
    runDocumentIntake(doc, companyId)
  );

  const allChunks = intakeResults.flatMap(ir => ir.chunks);

  if (allChunks.length === 0) {
    throw new Error('No document chunks produced — cannot proceed with extraction. Check that documents contain extractable text.');
  }

  const primaryDocId = intakeResults[0].documentId;
  const primaryDocName = intakeResults[0].documentName;

  // Step 2: Financial Extraction
  const extraction: ExtractedValuationInput = await runFinancialExtraction(
    allChunks,
    companyId,
    primaryDocId,
    primaryDocName,
    llmCall,
  );

  // Step 3: Validation
  let validation: ValidatedInput;
  if (skipValidation) {
    validation = {
      input: extraction.input,
      fieldValidations: [],
      warnings: [],
      overallConfidence: extraction.input.annualRevenue.confidence,
      validatedAt: new Date().toISOString(),
    };
  } else {
    validation = await runValidation(extraction, allChunks, llmCall);
  }

  // Override company name with authoritative DB value
  if (authoritativeCompanyName && (validation.input.companyName === 'Unknown Company' || !validation.input.companyName)) {
    validation.input.companyName = authoritativeCompanyName;
  }

  return {
    intake: intakeResults,
    extraction,
    validation,
    orchestratedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════
// PHASE 2: INTELLIGENCE — Method Selection → Engine → Agents (on MERGED input)
// ═══════════════════════════════════════════════════════════════════════

export type IntelligencePhaseConfig = {
  /** The MERGED input (bridge + cascade best-of) — this is what the engine runs on */
  mergedInput: CompanyValuationInput;
  /** Raw extraction result (needed for evidence map + truth score) */
  extraction: ExtractedValuationInput;
  /** Validation result (needed for evidence map) */
  validation: ValidatedInput;
  /** LLM call function */
  llmCall: LLMCallFn;
  /** Buyer perspective */
  buyerType: BuyerType;
  /** Scenario assumptions */
  scenario: Scenario;
  /** Manual overrides (triggers truth score) */
  manualOverrides?: CompanyValuationInput;
  /** Force acquisition mirror */
  forceAcquisitionMirror?: boolean;
  /** Skip intelligence agents (fast deterministic-only) */
  skipIntelligenceAgents?: boolean;
};

/**
 * Run intelligence phase on MERGED input: method selection, engine,
 * Olivia, Cristiano, counter-narrative, pre-mortem, truth score, acquisition mirror.
 */
export async function runIntelligencePhase(
  phaseConfig: IntelligencePhaseConfig,
): Promise<IntelligencePhaseResult> {
  const {
    mergedInput, extraction, validation,
    llmCall, buyerType, scenario,
    manualOverrides, forceAcquisitionMirror, skipIntelligenceAgents,
  } = phaseConfig;

  // Method Selection on MERGED input
  const methodSelection: MethodSelectionResult = runMethodSelection(
    mergedInput,
    buyerType,
  );

  // Evidence Map (uses extraction + validation)
  const evidenceMap: EvidenceMap = buildEvidenceMap(extraction, validation);

  // ENGINE on MERGED input — THIS IS THE FIX
  const valuationResult: ReconciledValuationResult = runValuation(
    mergedInput,
    scenario,
    buyerType,
  );

  // Intelligence agents
  let justification: JustificationResult | null = null;
  let challenge: ChallengeResult | null = null;
  let counterNarrative: CounterNarrativeResult | null = null;
  let truthScore: TruthScoreResult | null = null;
  let preMortem: PreMortemResult | null = null;
  let acquisitionMirror: AcquisitionMirrorResult | null = null;

  if (!skipIntelligenceAgents) {
    // Olivia (justification) — on MERGED input + result
    try {
      justification = await runJustification(
        valuationResult,
        mergedInput,
        buyerType,
        llmCall,
      );
    } catch (err) {
      console.error('[Orchestrator] Justification agent failed, continuing:', err);
    }

    // Cristiano + Counter-Narrative + Pre-Mortem — on MERGED input + result
    const settled = await Promise.allSettled([
      runChallenge(valuationResult, mergedInput, buyerType, llmCall),
      runCounterNarrative(valuationResult, mergedInput, llmCall),
      runPreMortem(valuationResult, mergedInput, buyerType, llmCall),
    ]);

    if (settled[0].status === 'fulfilled') challenge = settled[0].value;
    else console.error('[Orchestrator] Challenge agent failed:', settled[0].reason);

    if (settled[1].status === 'fulfilled') counterNarrative = settled[1].value;
    else console.error('[Orchestrator] Counter-narrative agent failed:', settled[1].reason);

    if (settled[2].status === 'fulfilled') preMortem = settled[2].value;
    else console.error('[Orchestrator] Pre-mortem agent failed:', settled[2].reason);

    // Truth Score (only if manual overrides provided)
    if (manualOverrides) {
      truthScore = runTruthScore(extraction, manualOverrides);
    }

    // Acquisition Mirror
    const isBuyoutMode = buyerType === 'acquirer' || buyerType === 'private_equity';
    if (isBuyoutMode || forceAcquisitionMirror) {
      try {
        acquisitionMirror = await runAcquisitionMirror(
          mergedInput,
          scenario,
          buyerType,
          llmCall,
        );
      } catch (err) {
        console.error('[Orchestrator] Acquisition mirror failed, continuing:', err);
      }
    }
  }

  return {
    methodSelection,
    evidenceMap,
    valuation: valuationResult,
    justification,
    challenge,
    counterNarrative,
    truthScore,
    preMortem,
    acquisitionMirror,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// LEGACY WRAPPER — runValuationPipeline (backward compat for runValuationFromText)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Run the full valuation pipeline from parsed documents to reconciled result
 * with intelligence agents (Olivia, Cristiano, counter-narrative, pre-mortem).
 *
 * @param documents - Pre-parsed documents (call your parser before this).
 * @param config - Pipeline configuration
 * @returns OrchestratorResult with full audit trail + intelligence layer
 */
export async function runValuationPipeline(
  documents: ParsedDocument[],
  config: OrchestratorConfig,
): Promise<OrchestratorResult> {
  // Phase 1: Extraction (no merge step — legacy wrapper passes cascade-only to engine)
  const extractionResult = await runExtractionPhase(documents, config);

  // Phase 2: Intelligence (no merge — uses cascade-only input, same behavior as before)
  const intellResult = await runIntelligencePhase({
    mergedInput: extractionResult.validation.input,
    extraction: extractionResult.extraction,
    validation: extractionResult.validation,
    llmCall: config.llmCall,
    buyerType: config.buyerType,
    scenario: config.scenario,
    manualOverrides: config.manualOverrides,
    forceAcquisitionMirror: config.forceAcquisitionMirror,
    skipIntelligenceAgents: config.skipIntelligenceAgents,
  });

  return {
    companyId: config.companyId,
    companyName: extractionResult.validation.input.companyName,
    intake: extractionResult.intake,
    extraction: extractionResult.extraction,
    validation: extractionResult.validation,
    methodSelection: intellResult.methodSelection,
    evidenceMap: intellResult.evidenceMap,
    valuation: intellResult.valuation,
    justification: intellResult.justification,
    challenge: intellResult.challenge,
    counterNarrative: intellResult.counterNarrative,
    truthScore: intellResult.truthScore,
    preMortem: intellResult.preMortem,
    acquisitionMirror: intellResult.acquisitionMirror,
    orchestratedAt: extractionResult.orchestratedAt,
  };
}

// ── Convenience: run from raw text (for testing) ─────────────────────

/**
 * Quick-run helper for testing: takes raw text content instead of parsed documents.
 * Wraps the text in a single-page ParsedDocument and runs the full pipeline.
 */
export async function runValuationFromText(
  text: string,
  filename: string,
  config: OrchestratorConfig,
): Promise<OrchestratorResult> {
  const parsed: ParsedDocument = {
    filename,
    pages: [{ pageNumber: 1, content: text }],
  };
  return runValuationPipeline([parsed], config);
}
