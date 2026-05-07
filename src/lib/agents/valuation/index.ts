// ═══════════════════════════════════════════════════════════════════════
// VALUATION AGENTS — Barrel Export
// ═══════════════════════════════════════════════════════════════════════
//
// 12 agents from the Valuation Engine, rewired to use LTM's cascade
// provider infrastructure via the LLM adapter.
//
// Usage:
//   import { runValuationPipeline, createCascadeLLMCall } from '@/lib/agents/valuation';
//   const llmCall = createCascadeLLMCall();
//   const result = await runValuationPipeline(docs, { llmCall, ... });
// ═══════════════════════════════════════════════════════════════════════

// ── LLM Adapter (bridges to cascade providers) ──────────────────────
export { createCascadeLLMCall } from './llm-adapter';

// ── Orchestrator ─────────────────────────────────────────────────────
export { runValuationPipeline, runValuationFromText, runExtractionPhase, runIntelligencePhase } from './valuation-orchestrator';
export type { OrchestratorConfig, IntelligencePhaseConfig } from './valuation-orchestrator';

// ── Document Intake (deterministic) ─────────────────────────────────
export {
  runDocumentIntake,
  detectDocumentType,
  attachEmbeddings,
  csvToParsedDocument,
} from './document-intake';
export type { ParsedDocument, ParsedPage } from './document-intake';

// ── Financial Extraction (LLM) ──────────────────────────────────────
export { runFinancialExtraction } from './financial-extractor';
export type { LLMCallFn, ExtractedField, LLMExtractionResponse } from './financial-extractor';

// ── Validation (LLM) ────────────────────────────────────────────────
export { runValidation } from './validation-agent';

// ── Method Selection (deterministic) ────────────────────────────────
export { runMethodSelection } from './method-selection';

// ── Evidence Mapping (deterministic) ────────────────────────────────
export {
  buildEvidenceMap,
  summarizeEvidenceMap,
  calculateEvidenceQuality,
} from './evidence-mapper';

// ── Intelligence Agents (LLM) ───────────────────────────────────────
export { runJustification } from './justification-agent';
export { runChallenge } from './challenge-agent';
export { runCounterNarrative } from './counter-narrative-agent';
export { runPreMortem } from './pre-mortem-agent';
export { runAcquisitionMirror } from './acquisition-mirror';

// ── Truth Score (deterministic) ─────────────────────────────────────
export { runTruthScore } from './truth-score-agent';
