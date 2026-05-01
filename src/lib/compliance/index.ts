/**
 * Compliance Module
 * Sprint 5.3 — Compliance & Security
 *
 * Complete compliance infrastructure for Olivia Brain:
 * - PII Detection and Redaction
 * - Fair Housing Compliance
 * - Guardrails for Hallucination Prevention
 * - RAG Accuracy Scoring
 * - Data Residency Routing (Sprint 5.3)
 * - Consent Management (Sprint 5.3)
 * - Compliance Subflows (Sprint 5.3)
 * - Knowledge Versioning (Sprint 5.3)
 */

// ─── PII Detection and Redaction ──────────────────────────────────────────────
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

// ─── Fair Housing Compliance ──────────────────────────────────────────────────
export {
  checkFairHousingCompliance,
  getFairHousingService,
  type ProtectedClass,
  type FairHousingViolation,
  type FairHousingCheckResult,
  type FairHousingService,
} from "./fair-housing";

// ─── Guardrails for Hallucination Prevention ──────────────────────────────────
export {
  runGuardrails,
  getGuardrailsService,
  type GuardrailType,
  type GuardrailViolation,
  type GuardrailCheckResult,
  type GuardrailConfig,
  type GuardrailsService,
} from "./guardrails";

// ─── RAG Accuracy Scoring ─────────────────────────────────────────────────────
export {
  evaluateRAG,
  getRAGScoringService,
  type RAGContext,
  type RAGEvaluationInput,
  type RAGMetric,
  type RAGEvaluationResult,
  type RAGScoringService,
} from "./rag-scoring";

// ─── Data Residency Routing (Sprint 5.3 Item 1) ───────────────────────────────
export {
  resolveDataRegion,
  getRegionForCountry,
  isRegionAllowed,
  getDataRoutingDecision,
  checkCrossBorderTransfer,
  getDataResidencyService,
  REGION_CONFIGS,
  type DataRegion,
  type RegionConfig,
  type ResidencyCheckResult,
  type DataRoutingDecision,
  type TransferCheckResult,
  type DataType,
  type DataResidencyService,
} from "./data-residency";

// ─── Consent Management (Sprint 5.3 Items 2-3) ────────────────────────────────
export {
  // Recording consent
  checkRecordingConsent,
  getRecordingDisclosureScript,
  // Memory consent (GDPR)
  checkMemoryConsent,
  executeRightToBeForgotten,
  // Consent CRUD
  recordConsent,
  withdrawConsent,
  getConsentStatus,
  getAllConsents,
  getConsentService,
  type ConsentType,
  type ConsentStatus,
  type ConsentRecord,
  type ConsentMethod,
  type ConsentRequest,
  type ConsentCheckResult,
  type RecordingConsentState,
  type RecordingPartyConsent,
  type RecordingJurisdiction,
  type MemoryConsentState,
  type DeletionResult,
  type ConsentService,
} from "./consent";

// ─── Deterministic Compliance Subflows (Sprint 5.3 Item 4) ────────────────────
export {
  checkImmigrationCompliance,
  checkTaxCompliance,
  runComplianceChecks,
  getComplianceSubflowService,
  type ComplianceDomain,
  type ComplianceCheckInput,
  type ComplianceCheckResult,
  type ComplianceRequirement,
  type RelocationPurpose,
  type RuleType,
  type ComplianceSubflowService,
} from "./subflows";

// ─── Multi-Market Knowledge Versioning (Sprint 5.3 Item 5) ────────────────────
export {
  parseMarketCode,
  buildMarketCode,
  getMarketCodeHierarchy,
  resolveKnowledgeVersion,
  getActiveVersionsForDomain,
  getApplicableRules,
  registerKnowledgeVersion,
  addKnowledgeRules,
  expireKnowledgeVersion,
  hasContentChanged,
  getExpiringVersions,
  initializeBuiltInKnowledge,
  getKnowledgeVersioningService,
  type KnowledgeDomain,
  type MarketScope,
  type KnowledgeVersion,
  type KnowledgeRule,
  type MarketCodeComponents,
  type KnowledgeVersioningService,
} from "./knowledge-versioning";
