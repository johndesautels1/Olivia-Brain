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
