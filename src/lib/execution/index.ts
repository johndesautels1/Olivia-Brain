// Execution module exports
// Sprint 4.4 - Durable Execution

export { getActionBudgetService, DEFAULT_BUDGETS } from "./action-budgets";
export type {
  BudgetType,
  BudgetPeriod,
  BudgetEntry,
  ConsumeResult,
  BudgetDefault,
  InitializeBudgetsOptions,
  ActionBudgetService,
} from "./action-budgets";

export { inngest } from "./inngest-client";
export type {
  OliviaEvents,
  ConversationEndedEvent,
  EpisodeCreatedEvent,
  MemoryMaintenanceEvent,
  ProcedureCompletedEvent,
  DataCrawlRequestedEvent,
  BudgetExhaustedEvent,
} from "./inngest-client";

export {
  allFunctions,
  processConversationEnd,
  runMemoryMaintenance,
  handleProcedureCompleted,
  handleBudgetExhausted,
} from "./inngest-functions";

export { getQueueService } from "./queue";
export type {
  QueueMessage,
  ScheduledMessage,
  QueueResult,
  ScheduleResult,
  QueueService,
} from "./queue";

export { ensureTriggerConfigured, isTriggerAvailable } from "./trigger-client";

export { dispatchTask, getTaskStatus, pollTaskUntilDone, cancelTask, listAvailableTasks } from "./trigger-tasks";
export {
  generateRelocationReport,
  bulkDataCrawl,
  deepResearch,
  rebuildKnowledgeGraph,
  clientOnboarding,
} from "./trigger-tasks";
export type {
  TaskName,
  TaskPayloadMap,
  TaskHandle,
  TaskStatus,
  TaskStatusResult,
  ReportGenerationPayload,
  BulkCrawlPayload,
  DeepResearchPayload,
  GraphRebuildPayload,
  ClientOnboardingPayload,
} from "./trigger-tasks";

export { getTemporalService, isTemporalAvailable } from "./temporal-client";
export type {
  WorkflowName,
  WorkflowHandle,
  WorkflowSignal,
  WorkflowQuery,
  WorkflowStatus,
  WorkflowStatusResult,
  WorkflowQueryResult,
  WorkflowListItem,
  WorkflowPayloadMap,
  CityEvaluationPayload,
  OnboardingJourneyPayload,
  MarketComparisonPayload,
  HeartbeatMonitoringPayload,
  PortfolioSyncPayload,
  TemporalService,
} from "./temporal-client";

export {
  cityEvaluationPipeline,
  clientOnboardingJourney,
  multiMarketComparison,
  heartbeatMonitoring,
  portfolioDataSync,
  humanInputSignal,
  externalDataSignal,
  pauseSignal,
  resumeSignal,
  prioritySignal,
  currentStepQuery,
  progressQuery,
  fullStateQuery,
} from "./temporal-workflows";
