/**
 * Compliance Module
 * Exports all compliance services for Olivia Brain
 */

// PII Detection and Redaction
export {
  detectPII,
  redactPII,
  redactBeforeLogging,
  getPIIRedactorService,
  type PIIType,
  type PIIMatch,
  type RedactionResult,
  type PIIRedactorConfig,
  type PIIRedactorService,
} from "./pii-redactor";

// Fair Housing Compliance
export {
  checkFairHousingCompliance,
  getFairHousingService,
  type ProtectedClass,
  type FairHousingViolation,
  type FairHousingCheckResult,
  type FairHousingService,
} from "./fair-housing";

// Guardrails for Hallucination Prevention
export {
  runGuardrails,
  getGuardrailsService,
  type GuardrailType,
  type GuardrailViolation,
  type GuardrailCheckResult,
  type GuardrailConfig,
  type GuardrailsService,
} from "./guardrails";

// RAG Accuracy Scoring
export {
  evaluateRAG,
  getRAGScoringService,
  type RAGContext,
  type RAGEvaluationInput,
  type RAGMetric,
  type RAGEvaluationResult,
  type RAGScoringService,
} from "./rag-scoring";
