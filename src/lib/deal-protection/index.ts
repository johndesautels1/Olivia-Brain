/**
 * Track P — Deal Protection barrel export.
 *
 * Public surface for the Deal Protection engine. P1 ships smart-band
 * primitives + types only; P2 adds the clause classifier, P3 the
 * term-sheet parser + analyze API, P4 the investor reputation surface,
 * P5–P7 the multi-round dilution / WarRoom / negotiation rehearsal
 * extensions.
 */
export {
  type SmartBand,
  type SmartBandRecord,
  type RecommendedAction,
  SMART_BANDS_ORDERED,
} from './types';

export {
  SMART_BANDS,
  SMART_BANDS_BY_ID,
  SMART_BANDS_BY_ACTION,
} from './bands';

export {
  clampSmartScore,
  getSmartBand,
  getSmartBandRecord,
  getSmartBandRecordById,
  getSmartBandRecordByAction,
  bandsAgree,
} from './smart-score';

export {
  type ClauseType,
  type Severity,
  type ClauseAnalysis,
  type ClauseAnalysisResult,
  type ClauseClassificationAttempt,
  CLAUSE_TYPES_ORDERED,
  CLAUSE_TYPE_COUNT,
  SEVERITIES_ORDERED,
  SEVERITY_TOXICITY_RANGE,
} from './clause-types';

export {
  type ClauseFixture,
  CLAUSE_FIXTURES,
  CLAUSE_FIXTURES_BY_TYPE,
} from './clause-fixtures';

export {
  buildClassificationPrompt,
  buildJudgePrompt,
} from './clause-prompts';

export {
  type ClassifyClauseOptions,
  type ClassifyClausesOptions,
  classifyClause,
  classifyClauses,
} from './clause-intel';

export {
  type ParserExtractionStrategy,
  type TermSheetClause,
  type TermSheetRoundContext,
  type TermSheetTerms,
  CLAUSE_TEXT_CHAR_LIMIT,
  MIN_HEURISTIC_CLAUSE_COUNT,
  PARSER_TEXT_CHAR_LIMIT,
} from './parser-types';

export { type ParseTermSheetOptions, parseTermSheet } from './parser';
export { buildParserPrompt } from './parser-prompts';

export {
  type AggregationResult,
  AGGREGATION_CONSTANTS,
  CRITICAL_CEILING,
  CRITICAL_ISSUE_LIMIT,
  HIGH_CEILING,
  NEUTRAL_EMPTY_SCORE,
  aggregateClauseAnalyses,
  deriveWalkAwayReasons,
} from './aggregate';

export {
  type AnalyzeTermSheetOptions,
  type DealRiskReportPayload,
  analyzeTermSheet,
} from './analyze';

export {
  type CriticalIssue,
  type DealRiskReport,
  CONFIDENCE_LIVE,
  CONFIDENCE_MOCK,
} from './report-types';

export {
  type InvestorReputationLookup,
  type InvestorReputationPatch,
  type InvestorReputationRecord,
  type InvestorReputationSource,
  type InvestorReputationWrite,
  type InvestorType,
  INVESTOR_REPUTATION_SOURCES_ORDERED,
  INVESTOR_TYPES_ORDERED,
  InvestorReputationPatchSchema,
  InvestorReputationWriteSchema,
  toInvestorSlug,
} from './investor-types';

export { INVESTOR_SEED_DATA } from './investor-seed';

export {
  type SeedSummary,
  applyInvestorSeed,
} from './investor-loader';

export {
  lookupInvestorReputations,
  toRecord as toInvestorReputationRecord,
  type PrismaInvestorReputationRow,
} from './investor-lookup';

export {
  REPUTATION_TILT_MAX,
  applyReputationTilt,
  computeReputationTilt,
} from './investor-score-impact';

export {
  type AntiDilutionType,
  type CapTableEntry,
  type CapTableSnapshot,
  type FutureRound,
  type HolderTrajectory,
  type HolderType,
  type OwnershipPoint,
  type ProjectionInputs,
  type ProjectionResult,
  ANTI_DILUTION_TYPES_ORDERED,
  CapTableEntrySchema,
  CapTableSnapshotSchema,
  FutureRoundSchema,
  HOLDER_TYPES_ORDERED,
  MAX_PROJECTION_ROUNDS,
  ProjectionInputsSchema,
} from './multi-round-types';

export {
  MAX_RATCHET_FACTOR,
  applyRound,
  computeAdjustmentFactor,
  projectDilution,
} from './multi-round';

export {
  type EmailDraftContext,
  type EmailDraftPayload,
  type EmailTone,
  type EmailToneRecord,
  EMAIL_TONES,
  renderTemplateDraft,
} from './email-templates';

export {
  EMAIL_DRAFT_LIMITS,
  buildEmailDraftPrompt,
} from './email-prompts';

export {
  type EmailDraftResult,
  type GenerateEmailDraftOptions,
  generateEmailDraft,
} from './email-drafts';

export {
  type CounterChange,
  type CounterDraftPayload,
  type CounterDraftResult,
  COUNTER_DRAFT_LIMITS,
  CounterChangeSchema,
  CounterDraftPayloadSchema,
  CounterDraftPostBodySchema,
} from './counter-term-sheet-types';

export {
  type GenerateCounterDraftOptions,
  generateCounterDraft,
  renderCounterMarkdown,
} from './counter-term-sheet';

export {
  type CounterTemplateContext,
  renderTemplateCounterDraft,
} from './counter-term-sheet-templates';

export { buildCounterDraftPrompt } from './counter-term-sheet-prompts';

export {
  type RehearsalRequest,
  type RehearsalResponse,
  type RehearsalTurn,
  REHEARSAL_LIMITS,
  REHEARSAL_STANCE_BY_BAND,
  RehearsalPostBodySchema,
  RehearsalTurnSchema,
} from './rehearsal-types';

export {
  type GenerateRehearsalTurnOptions,
  generateRehearsalTurn,
} from './rehearsal';

export { buildRehearsalPrompt } from './rehearsal-prompts';

export {
  type AnalysisDiff,
  type ClauseDiff,
  type CriticalIssueDelta,
  type VersionedAnalysis,
  compareAnalyses,
} from './versioning';

export {
  type ConsensusResult,
  type ConsensusVerdict,
  type EvaluatorVerdict,
  CONSENSUS_DEFAULT_EVALUATORS,
  ConsensusPostBodySchema,
  ConsensusVerdictSchema,
  EvaluatorVerdictResponseSchema,
} from './consensus-types';

export {
  type GenerateConsensusOptions,
  generateConsensus,
} from './consensus';

export {
  buildEvaluatorPrompt,
  buildOpusJudgePrompt,
} from './consensus-prompts';
