// Evaluation module exports
// Sprint 4.5 - Evaluation & Observability

export { getRedTeamService, getBuiltInScenarios } from "./red-team";
export type {
  AttackCategory,
  RedTeamScenario,
  RedTeamResult,
  RedTeamReport,
  RedTeamHarnessOptions,
  RedTeamService,
} from "./red-team";

export { getScorecardService, ALL_DIMENSIONS } from "./qa-scorecards";
export type {
  QADimension,
  ConversationTurn,
  DimensionScore,
  QAScorecard,
  AggregateScores,
  QAScorecardOptions,
  ConversationScorecardService,
} from "./qa-scorecards";

export {
  getBakeOffService,
  getBenchmarkPrompts,
  ALL_PROVIDERS,
} from "./model-bakeoff";
export type {
  ModelProvider,
  BenchmarkCategory,
  BakeOffPrompt,
  BakeOffModelResult,
  ModelRanking,
  BakeOffReport,
  BakeOffOptions,
  ModelBakeOffService,
} from "./model-bakeoff";

export {
  getBraintrustService,
  getOliviaPromptVariants,
} from "./braintrust";
export type {
  EvalType,
  EvalLogEntry,
  EvalLogResult,
  PromptVariant,
  ExperimentTestCase,
  PromptExperimentOptions,
  VariantTestResult,
  VariantSummary,
  PromptExperimentReport,
  PromptVersionInfo,
  BraintrustService,
} from "./braintrust";

export { getPatronusService } from "./patronus";
export type {
  PatronusEvaluator,
  HallucinationCheckInput,
  EvaluatorResult,
  HallucinationResult,
  FactualConsistencyBatchInput,
  FactualConsistencyBatchResult,
  PatronusService,
} from "./patronus";

export { getCleanlabService } from "./cleanlab";
export type {
  DataType,
  IssueSeverity,
  IssueType,
  DataEntry,
  DataQualityIssue,
  DataQualityInput,
  DataQualityReport,
  FindIssuesResult,
  CleanlabService,
} from "./cleanlab";
