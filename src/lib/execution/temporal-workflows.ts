/**
 * Temporal Workflow Definitions
 * Sprint 4.4 — Durable Execution (Item 5: Crash-Proof Workflows)
 *
 * Five long-lived workflow state machines for Olivia's multi-app orchestration.
 * These workflows run on Temporal workers with full checkpointing — every step
 * is durable, crash-proof, and replayable.
 *
 * Workflows:
 * 1. cityEvaluationPipeline   — Multi-day city evaluation → verdict → report
 * 2. clientOnboardingJourney  — Multi-week CLUES intake (paragraphs → modules → match)
 * 3. multiMarketComparison    — Fan-out N city evaluations → aggregate → judge
 * 4. heartbeatMonitoring      — Long-running cardiac health tracking (months)
 * 5. portfolioDataSync        — Cross-app data propagation when one app publishes changes
 *
 * Architecture notes:
 * - Workflow code runs in Temporal's deterministic V8 sandbox
 * - Activities (side effects: LLM calls, DB writes, API calls) are proxied
 * - Signals allow external systems to push data into running workflows
 * - Queries allow reading workflow state without modification
 * - proxyActivities creates stubs that execute on Temporal activity workers
 * - sleep() creates durable timers that survive crashes
 * - condition() blocks until a predicate is true (signal-driven state changes)
 *
 * IMPORTANT: Workflow functions must be deterministic. All I/O goes through
 * activities. Do not import Node.js modules or use non-deterministic APIs
 * directly inside workflow functions.
 */

import {
  proxyActivities,
  defineSignal,
  defineQuery,
  setHandler,
  sleep,
  condition,
  startChild,
  type ActivityOptions,
} from "@temporalio/workflow";

import type {
  CityEvaluationPayload,
  OnboardingJourneyPayload,
  MarketComparisonPayload,
  HeartbeatMonitoringPayload,
  PortfolioSyncPayload,
} from "./temporal-client";

// ─── Activity Interface ─────────────────────────────────────────────────────

/**
 * Activities are the side-effect boundary. Every LLM call, DB write, API call,
 * or external service interaction happens through an activity.
 * Activities run on Temporal activity workers and are individually retryable.
 *
 * This interface defines ALL activities the workflows can call.
 * Implementation lives on the Temporal worker side.
 */
interface OliviaActivities {
  // ── Data Collection ───────────────────────────────────────────────────────
  /** Gather city data from relocation APIs, environmental APIs, Tavily research */
  collectCityData(params: {
    city: string;
    dataSources: string[];
  }): Promise<{ city: string; dataPoints: number; completedAt: string }>;

  // ── LLM Evaluation ───────────────────────────────────────────────────────
  /** Run a single LLM evaluation on city data (one model at a time) */
  runLLMEvaluation(params: {
    model: string;
    city: string;
    cityData: unknown;
    evaluationPrompt: string;
  }): Promise<{ model: string; city: string; scores: Record<string, number>; analysis: string }>;

  /** Run Opus/Cristiano judge verdict on aggregated evaluations */
  runJudgeVerdict(params: {
    evaluations: unknown[];
    cities: string[];
    includeFinancials: boolean;
  }): Promise<{ verdict: string; rankings: string[]; confidence: number }>;

  // ── Score Aggregation ─────────────────────────────────────────────────────
  /** Merge multi-LLM evaluations into consensus scores (pure math, no LLM) */
  aggregateScores(params: {
    evaluations: unknown[];
    cities: string[];
  }): Promise<{ consensusScores: Record<string, number>; divergences: string[] }>;

  // ── Report Generation ─────────────────────────────────────────────────────
  /** Generate the full relocation report (delegates to Trigger.dev for heavy lifting) */
  generateReport(params: {
    clientId: string;
    conversationId: string;
    verdict: unknown;
    reportType: string;
  }): Promise<{ reportId: string; pageCount: number; generatedAt: string }>;

  // ── Client Profile ────────────────────────────────────────────────────────
  /** Initialize a client profile with action budgets and journey snapshot */
  initializeClientProfile(params: {
    clientId: string;
    conversationId: string;
  }): Promise<{ profileId: string; budgetsCreated: number }>;

  // ── Gemini Extraction ─────────────────────────────────────────────────────
  /** Extract metrics from a single paragraph using Gemini */
  extractParagraphMetrics(params: {
    clientId: string;
    paragraphIndex: number;
    paragraphText: string;
  }): Promise<{ metricCount: number; categories: string[] }>;

  // ── Module Processing ─────────────────────────────────────────────────────
  /** Determine which specialty modules are relevant (Module Relevance Engine) */
  determineRelevantModules(params: {
    clientId: string;
    metricsCollected: number;
    mainModuleAnswers: number;
  }): Promise<{ recommendedModules: string[]; moduleCount: number }>;

  /** Process a batch of answers for the adaptive engine */
  processAnswerBatch(params: {
    clientId: string;
    moduleId: string;
    answers: unknown[];
  }): Promise<{ processed: number; currentMOE: number; moduleComplete: boolean }>;

  // ── Notification ──────────────────────────────────────────────────────────
  /** Send notification via Olivia (video, voice, or text) */
  sendNotification(params: {
    clientId: string;
    type: "video" | "voice" | "text" | "email";
    content: string;
  }): Promise<{ sent: boolean; channel: string }>;

  // ── Health Monitoring ─────────────────────────────────────────────────────
  /** Initialize monitoring parameters and baseline metrics */
  initializeMonitoring(params: {
    clientId: string;
    monitoringPlanId: string;
  }): Promise<{ baselineMetrics: Record<string, number>; thresholds: Record<string, number> }>;

  /** Analyze health metrics and check thresholds */
  analyzeHealthMetrics(params: {
    clientId: string;
    monitoringPlanId: string;
    newData: unknown;
    baselineMetrics: Record<string, number>;
    thresholds: Record<string, number>;
  }): Promise<{ alertNeeded: boolean; trends: Record<string, string>; analysisAt: string }>;

  /** Generate health monitoring summary report */
  generateMonitoringSummary(params: {
    clientId: string;
    monitoringPlanId: string;
    totalCycles: number;
    alertCount: number;
  }): Promise<{ summaryId: string; generatedAt: string }>;

  // ── Portfolio Sync ────────────────────────────────────────────────────────
  /** Determine which downstream apps/workflows need data from a change */
  determineDownstreamConsumers(params: {
    sourceApp: string;
    changeType: string;
  }): Promise<{ consumers: Array<{ appId: string; workflowIds: string[] }> }>;

  /** Verify that all downstream consumers acknowledged the sync */
  verifySyncPropagation(params: {
    sourceApp: string;
    consumers: Array<{ appId: string; workflowIds: string[] }>;
  }): Promise<{ allAcknowledged: boolean; failedConsumers: string[] }>;

  // ── Journey Snapshot ──────────────────────────────────────────────────────
  /** Capture a journey snapshot for resume capability */
  captureJourneySnapshot(params: {
    clientId: string;
    conversationId: string;
    workflowStep: string;
    contextSummary: string;
  }): Promise<{ snapshotId: string }>;

  // ── Memory ────────────────────────────────────────────────────────────────
  /** Store an episodic memory from workflow completion */
  storeEpisodicMemory(params: {
    clientId: string;
    conversationId: string;
    summary: string;
    topics: string[];
  }): Promise<{ episodeId: string }>;
}

// ─── Activity Proxy ─────────────────────────────────────────────────────────

/**
 * Default activity options for all workflows.
 * Each activity gets its own retry policy and timeout.
 */
const defaultActivityOptions: ActivityOptions = {
  startToCloseTimeout: "10 minutes",
  retry: {
    maximumAttempts: 3,
    initialInterval: "1 second",
    backoffCoefficient: 2,
    maximumInterval: "30 seconds",
  },
};

const longRunningActivityOptions: ActivityOptions = {
  startToCloseTimeout: "30 minutes",
  retry: {
    maximumAttempts: 2,
    initialInterval: "5 seconds",
    backoffCoefficient: 2,
    maximumInterval: "2 minutes",
  },
};

const activities = proxyActivities<OliviaActivities>(defaultActivityOptions);

const longActivities = proxyActivities<OliviaActivities>(
  longRunningActivityOptions
);

// ─── Shared Signals ─────────────────────────────────────────────────────────

/** Signal: Human input received (paragraph submission, answer batch, review approval) */
export const humanInputSignal = defineSignal<
  [{ stepId: string; input: unknown }]
>("human-input-received");

/** Signal: External data ready (app pushes data to workflow) */
export const externalDataSignal = defineSignal<
  [{ source: string; payload: unknown }]
>("external-data-ready");

/** Signal: Request workflow pause */
export const pauseSignal = defineSignal<[{ reason: string }]>(
  "pause-requested"
);

/** Signal: Resume a paused workflow */
export const resumeSignal = defineSignal<[{ resumedBy: string }]>(
  "resume-requested"
);

/** Signal: Change workflow priority */
export const prioritySignal = defineSignal<
  [{ newPriority: "low" | "normal" | "high" | "urgent" }]
>("priority-changed");

// ─── Shared Queries ─────────────────────────────────────────────────────────

/** Query: Get current step name */
export const currentStepQuery = defineQuery<string>("current-step");

/** Query: Get progress (completed/total/percentage) */
export const progressQuery = defineQuery<{
  completed: number;
  total: number;
  percentage: number;
}>("progress");

/** Query: Get full workflow state */
export const fullStateQuery = defineQuery<Record<string, unknown>>(
  "full-state"
);

// ─── Workflow 1: City Evaluation Pipeline ───────────────────────────────────

/**
 * Multi-day city evaluation from data collection through Cristiano verdict.
 *
 * 6 checkpointed stages:
 * 1. collect-data      → Gather from Tavily, relocation/environmental APIs
 * 2. score-cities      → 5-LLM parallel evaluation per city
 * 3. aggregate-scores  → Merge into consensus (pure math)
 * 4. wait-for-review   → PAUSE until human approves (can wait days)
 * 5. judge-verdict     → Opus/Cristiano final judgment
 * 6. generate-report   → Full relocation report
 */
export async function cityEvaluationPipeline(
  payload: CityEvaluationPayload
): Promise<{
  status: string;
  verdict: unknown;
  reportId: string;
  completedAt: string;
}> {
  const { clientId, conversationId, targetCities, includeFinancials } = payload;

  // ── Workflow State ──────────────────────────────────────────────────────
  let currentStep = "initializing";
  let stepsCompleted = 0;
  const totalSteps = 6;
  let isPaused = false;
  let reviewApproved = false;
  let reviewInput: unknown = null;
  const workflowState: Record<string, unknown> = {};

  // ── Signal Handlers ─────────────────────────────────────────────────────
  setHandler(humanInputSignal, ({ stepId, input }) => {
    if (stepId === "review-approval") {
      reviewApproved = true;
      reviewInput = input;
    }
  });

  setHandler(pauseSignal, () => {
    isPaused = true;
  });

  setHandler(resumeSignal, () => {
    isPaused = false;
  });

  // ── Query Handlers ──────────────────────────────────────────────────────
  setHandler(currentStepQuery, () => currentStep);
  setHandler(progressQuery, () => ({
    completed: stepsCompleted,
    total: totalSteps,
    percentage: Math.round((stepsCompleted / totalSteps) * 100),
  }));
  setHandler(fullStateQuery, () => ({
    ...workflowState,
    currentStep,
    stepsCompleted,
    isPaused,
    reviewApproved,
  }));

  // ── Step 1: Collect Data ────────────────────────────────────────────────
  currentStep = "collect-data";

  const cityDataResults = await Promise.all(
    targetCities.map((city) =>
      activities.collectCityData({
        city,
        dataSources: ["tavily", "relocation", "environmental"],
      })
    )
  );

  workflowState.cityData = cityDataResults;
  stepsCompleted = 1;

  // Check pause
  if (isPaused) {
    await condition(() => !isPaused);
  }

  // ── Step 2: Score Cities (5-LLM Parallel) ──────────────────────────────
  currentStep = "score-cities";

  const models = ["sonnet-4.6", "gpt-5.4", "gemini-3.1", "grok-4", "perplexity-sonar"];

  const evaluations = await Promise.all(
    targetCities.flatMap((city) =>
      models.map((model) =>
        longActivities.runLLMEvaluation({
          model,
          city,
          cityData: cityDataResults.find((d) => d.city === city),
          evaluationPrompt: `Evaluate ${city} for client relocation suitability.`,
        })
      )
    )
  );

  workflowState.evaluations = evaluations;
  stepsCompleted = 2;

  // ── Step 3: Aggregate Scores ────────────────────────────────────────────
  currentStep = "aggregate-scores";

  const consensus = await activities.aggregateScores({
    evaluations,
    cities: targetCities,
  });

  workflowState.consensus = consensus;
  stepsCompleted = 3;

  // ── Step 4: Wait for Human Review ──────────────────────────────────────
  currentStep = "wait-for-review";

  // Send notification that review is ready
  await activities.sendNotification({
    clientId,
    type: "email",
    content: `City evaluation scores ready for review. Cities: ${targetCities.join(", ")}`,
  });

  // DURABLE WAIT — workflow sleeps until signal arrives. Can wait days/weeks.
  await condition(() => reviewApproved);

  workflowState.reviewInput = reviewInput;
  stepsCompleted = 4;

  // ── Step 5: Judge Verdict ──────────────────────────────────────────────
  currentStep = "judge-verdict";

  const verdict = await longActivities.runJudgeVerdict({
    evaluations,
    cities: targetCities,
    includeFinancials,
  });

  workflowState.verdict = verdict;
  stepsCompleted = 5;

  // ── Step 6: Generate Report ─────────────────────────────────────────────
  currentStep = "generate-report";

  const report = await longActivities.generateReport({
    clientId,
    conversationId,
    verdict,
    reportType: "relocation",
  });

  // Capture journey snapshot for resume capability
  await activities.captureJourneySnapshot({
    clientId,
    conversationId,
    workflowStep: "city-evaluation-complete",
    contextSummary: `Evaluated ${targetCities.length} cities. Winner: ${verdict.rankings[0]}. Confidence: ${verdict.confidence}`,
  });

  stepsCompleted = 6;
  currentStep = "completed";

  return {
    status: "completed",
    verdict,
    reportId: report.reportId,
    completedAt: new Date().toISOString(),
  };
}

// ─── Workflow 2: Client Onboarding Journey ──────────────────────────────────

/**
 * The complete CLUES client journey from first paragraph to final recommendation.
 * Can span weeks as the client works through paragraphs and questionnaires.
 *
 * 7 checkpointed stages:
 * 1. initialize-profile        → Create client, budgets, snapshot
 * 2. collect-paragraphicals    → WAIT for signals (30 paragraphs, submitted over time)
 * 3. run-main-module           → WAIT for signals (200Q adaptive)
 * 4. determine-modules         → Module Relevance Engine (pure math)
 * 5. run-specialty-modules     → WAIT for signals (multi-module adaptive)
 * 6. evaluate-and-judge        → 5-LLM + Opus verdict
 * 7. deliver-results           → Report + video presentation
 */
export async function clientOnboardingJourney(
  payload: OnboardingJourneyPayload
): Promise<{
  status: string;
  paragraphsReceived: number;
  modulesCompleted: number;
  verdictDelivered: boolean;
  completedAt: string;
}> {
  const { clientId, conversationId } = payload;

  // ── Workflow State ──────────────────────────────────────────────────────
  let currentStep = "initializing";
  let stepsCompleted = 0;
  const totalSteps = 7;
  let isPaused = false;

  // Paragraph collection state
  const paragraphs: Array<{ index: number; text: string }> = [];
  let paragraphsMarkedComplete = false;

  // Main module answer state
  const mainModuleAnswers: unknown[] = [];
  let mainModuleComplete = false;

  // Specialty module answer state
  const specialtyAnswers: Map<string, unknown[]> = new Map();
  let specialtyComplete = false;

  const workflowState: Record<string, unknown> = {};

  // ── Signal Handlers ─────────────────────────────────────────────────────
  setHandler(humanInputSignal, ({ stepId, input }) => {
    const typedInput = input as Record<string, unknown>;

    if (stepId === "paragraph-submission") {
      paragraphs.push({
        index: typedInput.index as number,
        text: typedInput.text as string,
      });
    } else if (stepId === "paragraphs-complete") {
      paragraphsMarkedComplete = true;
    } else if (stepId === "main-module-answers") {
      mainModuleAnswers.push(typedInput.answers);
      if (typedInput.isComplete) {
        mainModuleComplete = true;
      }
    } else if (stepId === "specialty-module-answers") {
      const moduleId = typedInput.moduleId as string;
      const existing = specialtyAnswers.get(moduleId) ?? [];
      existing.push(typedInput.answers);
      specialtyAnswers.set(moduleId, existing);
      if (typedInput.allModulesComplete) {
        specialtyComplete = true;
      }
    }
  });

  setHandler(pauseSignal, () => {
    isPaused = true;
  });

  setHandler(resumeSignal, () => {
    isPaused = false;
  });

  // ── Query Handlers ──────────────────────────────────────────────────────
  setHandler(currentStepQuery, () => currentStep);
  setHandler(progressQuery, () => ({
    completed: stepsCompleted,
    total: totalSteps,
    percentage: Math.round((stepsCompleted / totalSteps) * 100),
  }));
  setHandler(fullStateQuery, () => ({
    ...workflowState,
    currentStep,
    stepsCompleted,
    isPaused,
    paragraphCount: paragraphs.length,
    mainModuleAnswerBatches: mainModuleAnswers.length,
    specialtyModulesStarted: specialtyAnswers.size,
  }));

  // ── Step 1: Initialize Profile ──────────────────────────────────────────
  currentStep = "initialize-profile";

  const profile = await activities.initializeClientProfile({
    clientId,
    conversationId,
  });

  workflowState.profileId = profile.profileId;
  stepsCompleted = 1;

  // ── Step 2: Collect Paragraphicals ──────────────────────────────────────
  currentStep = "collect-paragraphicals";

  // DURABLE WAIT — loop: receive paragraph signals, extract metrics, checkpoint.
  // Exits when all 30 received OR client marks complete.
  while (!paragraphsMarkedComplete && paragraphs.length < 30) {
    // Check for pause
    if (isPaused) {
      await condition(() => !isPaused);
    }

    const currentCount = paragraphs.length;

    // Wait for a new paragraph signal (or completion signal)
    await condition(
      () =>
        paragraphs.length > currentCount || paragraphsMarkedComplete,
    );

    // Process any new paragraphs
    if (paragraphs.length > currentCount) {
      const newParagraph = paragraphs[paragraphs.length - 1];
      await activities.extractParagraphMetrics({
        clientId,
        paragraphIndex: newParagraph.index,
        paragraphText: newParagraph.text,
      });

      // Snapshot after each paragraph for resume capability
      await activities.captureJourneySnapshot({
        clientId,
        conversationId,
        workflowStep: `paragraph-${newParagraph.index}`,
        contextSummary: `Collected ${paragraphs.length}/30 paragraphs`,
      });
    }
  }

  workflowState.totalParagraphs = paragraphs.length;
  stepsCompleted = 2;

  // ── Step 3: Run Main Module ─────────────────────────────────────────────
  currentStep = "run-main-module";

  // DURABLE WAIT — receive answer batches until adaptive engine says complete
  while (!mainModuleComplete) {
    if (isPaused) {
      await condition(() => !isPaused);
    }

    const currentBatchCount = mainModuleAnswers.length;

    await condition(
      () => mainModuleAnswers.length > currentBatchCount || mainModuleComplete,
    );

    // Process the batch through adaptive engine
    if (mainModuleAnswers.length > currentBatchCount) {
      const result = await activities.processAnswerBatch({
        clientId,
        moduleId: "main-module",
        answers: mainModuleAnswers,
      });

      if (result.moduleComplete) {
        mainModuleComplete = true;
      }
    }
  }

  workflowState.mainModuleAnswerBatches = mainModuleAnswers.length;
  stepsCompleted = 3;

  // ── Step 4: Determine Relevant Modules ──────────────────────────────────
  currentStep = "determine-modules";

  const moduleSelection = await activities.determineRelevantModules({
    clientId,
    metricsCollected: paragraphs.length * 8, // ~8 metrics per paragraph average
    mainModuleAnswers: mainModuleAnswers.length,
  });

  workflowState.recommendedModules = moduleSelection.recommendedModules;
  stepsCompleted = 4;

  // ── Step 5: Run Specialty Modules ───────────────────────────────────────
  currentStep = "run-specialty-modules";

  // DURABLE WAIT — receive answer batches across multiple modules
  while (!specialtyComplete) {
    if (isPaused) {
      await condition(() => !isPaused);
    }

    const currentSize = specialtyAnswers.size;

    await condition(
      () => specialtyAnswers.size > currentSize || specialtyComplete,
    );

    // Process any new module answers
    for (const [moduleId, answers] of specialtyAnswers.entries()) {
      if (answers.length > 0) {
        const latestBatch = answers[answers.length - 1];
        await activities.processAnswerBatch({
          clientId,
          moduleId,
          answers: [latestBatch],
        });
      }
    }
  }

  workflowState.specialtyModulesCompleted = specialtyAnswers.size;
  stepsCompleted = 5;

  // ── Step 6: Evaluate and Judge ──────────────────────────────────────────
  currentStep = "evaluate-and-judge";

  // 5-LLM evaluation (reuse same pattern as city evaluation)
  const models = ["sonnet-4.6", "gpt-5.4", "gemini-3.1", "grok-4", "perplexity-sonar"];

  const evaluations = await Promise.all(
    models.map((model) =>
      longActivities.runLLMEvaluation({
        model,
        city: "client-match", // This evaluates match quality, not a specific city
        cityData: workflowState,
        evaluationPrompt: "Evaluate client profile for optimal city match.",
      })
    )
  );

  const verdict = await longActivities.runJudgeVerdict({
    evaluations,
    cities: [], // Opus determines cities from the full profile
    includeFinancials: true,
  });

  workflowState.verdict = verdict;
  stepsCompleted = 6;

  // ── Step 7: Deliver Results ─────────────────────────────────────────────
  currentStep = "deliver-results";

  // Generate report
  const report = await longActivities.generateReport({
    clientId,
    conversationId,
    verdict,
    reportType: "full-relocation",
  });

  // Notify client that results are ready
  await activities.sendNotification({
    clientId,
    type: "video",
    content: "Your relocation analysis is complete. Olivia has your results ready.",
  });

  // Store episodic memory of the complete journey
  await activities.storeEpisodicMemory({
    clientId,
    conversationId,
    summary: `Client completed full CLUES onboarding. ${paragraphs.length} paragraphs, ${mainModuleAnswers.length} main module batches, ${specialtyAnswers.size} specialty modules. Verdict delivered.`,
    topics: ["onboarding", "clues", "verdict", "relocation"],
  });

  // Final journey snapshot
  await activities.captureJourneySnapshot({
    clientId,
    conversationId,
    workflowStep: "onboarding-complete",
    contextSummary: `Full CLUES journey complete. Report: ${report.reportId}`,
  });

  stepsCompleted = 7;
  currentStep = "completed";

  return {
    status: "completed",
    paragraphsReceived: paragraphs.length,
    modulesCompleted: specialtyAnswers.size,
    verdictDelivered: true,
    completedAt: new Date().toISOString(),
  };
}

// ─── Workflow 3: Multi-Market Comparison ────────────────────────────────────

/**
 * Fan-out evaluation across N cities simultaneously, then aggregate and judge.
 * Spawns child cityEvaluationPipeline workflows for each city.
 *
 * 4 checkpointed stages:
 * 1. fan-out-evaluations  → Spawn child workflow per city (parallel)
 * 2. aggregate-results    → Collect all results, merge scores
 * 3. judge-comparison     → Opus head-to-head comparison
 * 4. deliver-comparison   → Comparison report with rankings
 */
export async function multiMarketComparison(
  payload: MarketComparisonPayload
): Promise<{
  status: string;
  citiesEvaluated: number;
  rankings: string[];
  completedAt: string;
}> {
  const { clientId, conversationId, cities, comparisonCriteria } = payload;

  // ── Workflow State ──────────────────────────────────────────────────────
  let currentStep = "initializing";
  let stepsCompleted = 0;
  const totalSteps = 4;
  let isPaused = false;
  const workflowState: Record<string, unknown> = {};

  // ── Signal & Query Handlers ─────────────────────────────────────────────
  setHandler(pauseSignal, () => {
    isPaused = true;
  });
  setHandler(resumeSignal, () => {
    isPaused = false;
  });
  setHandler(currentStepQuery, () => currentStep);
  setHandler(progressQuery, () => ({
    completed: stepsCompleted,
    total: totalSteps,
    percentage: Math.round((stepsCompleted / totalSteps) * 100),
  }));
  setHandler(fullStateQuery, () => ({
    ...workflowState,
    currentStep,
    stepsCompleted,
    isPaused,
  }));

  // ── Step 1: Fan-Out Evaluations ─────────────────────────────────────────
  currentStep = "fan-out-evaluations";

  // Spawn a child cityEvaluationPipeline for each city — all run in parallel
  const childHandles = await Promise.all(
    cities.map((city) =>
      startChild(cityEvaluationPipeline, {
        workflowId: `eval-${clientId}-${city}-${Date.now()}`,
        taskQueue: "olivia-brain",
        args: [
          {
            clientId,
            conversationId,
            targetCities: [city],
            includeFinancials: true,
            includeSMARTScore: true,
          } satisfies CityEvaluationPayload,
        ],
      })
    )
  );

  // Wait for ALL child workflows to complete
  const childResults = await Promise.all(
    childHandles.map((handle) => handle.result())
  );

  workflowState.childResults = childResults;
  stepsCompleted = 1;

  // ── Step 2: Aggregate Results ───────────────────────────────────────────
  currentStep = "aggregate-results";

  if (isPaused) {
    await condition(() => !isPaused);
  }

  const aggregated = await activities.aggregateScores({
    evaluations: childResults,
    cities,
  });

  workflowState.aggregated = aggregated;
  stepsCompleted = 2;

  // ── Step 3: Judge Comparison ────────────────────────────────────────────
  currentStep = "judge-comparison";

  const verdict = await longActivities.runJudgeVerdict({
    evaluations: childResults,
    cities,
    includeFinancials: true,
  });

  workflowState.verdict = verdict;
  workflowState.comparisonCriteria = comparisonCriteria;
  stepsCompleted = 3;

  // ── Step 4: Deliver Comparison ──────────────────────────────────────────
  currentStep = "deliver-comparison";

  await longActivities.generateReport({
    clientId,
    conversationId,
    verdict,
    reportType: "city-comparison",
  });

  await activities.sendNotification({
    clientId,
    type: "email",
    content: `Multi-market comparison complete: ${cities.length} cities evaluated. Top match: ${verdict.rankings[0]}`,
  });

  stepsCompleted = 4;
  currentStep = "completed";

  return {
    status: "completed",
    citiesEvaluated: cities.length,
    rankings: verdict.rankings,
    completedAt: new Date().toISOString(),
  };
}

// ─── Workflow 4: HEARTBEAT Monitoring ───────────────────────────────────────

/**
 * Long-running cardiac health metric tracking for HEARTBEAT app.
 * Can run for months with periodic check cycles.
 *
 * 4 stages (continuous loop with checkpoints):
 * 1. initialize-monitoring  → Set up parameters, baseline metrics
 * 2. monitoring-loop        → Periodic check cycle (sleep → check → analyze → checkpoint)
 * 3. alert-if-needed        → Signal Olivia to reach out if thresholds breached
 * 4. finalize               → Summary report when monitoring period ends
 */
export async function heartbeatMonitoring(
  payload: HeartbeatMonitoringPayload
): Promise<{
  status: string;
  totalCycles: number;
  alertCount: number;
  completedAt: string;
}> {
  const { clientId, monitoringPlanId, checkIntervalHours, durationDays } =
    payload;

  // ── Workflow State ──────────────────────────────────────────────────────
  let currentStep = "initializing";
  let stepsCompleted = 0;
  const totalCycles = Math.ceil((durationDays * 24) / checkIntervalHours);
  let completedCycles = 0;
  let alertCount = 0;
  let isPaused = false;
  let newHealthData: unknown = null;
  let hasNewData = false;
  const workflowState: Record<string, unknown> = {};

  // ── Signal Handlers ─────────────────────────────────────────────────────
  setHandler(externalDataSignal, ({ source, payload: signalPayload }) => {
    if (source === "heartbeat") {
      newHealthData = signalPayload;
      hasNewData = true;
    }
  });

  setHandler(pauseSignal, () => {
    isPaused = true;
  });

  setHandler(resumeSignal, () => {
    isPaused = false;
  });

  // ── Query Handlers ──────────────────────────────────────────────────────
  setHandler(currentStepQuery, () => currentStep);
  setHandler(progressQuery, () => ({
    completed: completedCycles,
    total: totalCycles,
    percentage: Math.round((completedCycles / totalCycles) * 100),
  }));
  setHandler(fullStateQuery, () => ({
    ...workflowState,
    currentStep,
    completedCycles,
    totalCycles,
    alertCount,
    isPaused,
    hasNewData,
  }));

  // ── Step 1: Initialize Monitoring ───────────────────────────────────────
  currentStep = "initialize-monitoring";

  const { baselineMetrics, thresholds } =
    await activities.initializeMonitoring({
      clientId,
      monitoringPlanId,
    });

  workflowState.baselineMetrics = baselineMetrics;
  workflowState.thresholds = thresholds;
  stepsCompleted = 1;

  // ── Step 2: Monitoring Loop ─────────────────────────────────────────────
  currentStep = "monitoring-loop";

  for (let cycle = 0; cycle < totalCycles; cycle++) {
    // Check for pause
    if (isPaused) {
      await condition(() => !isPaused);
    }

    // DURABLE SLEEP — survives crashes. Sleep for the check interval.
    // During sleep, external data signals can arrive and will be processed.
    const sleepMs = checkIntervalHours * 60 * 60 * 1000;
    await sleep(sleepMs);

    // Check if new health data arrived via signal during sleep
    const dataToAnalyze = hasNewData ? newHealthData : null;
    hasNewData = false;
    newHealthData = null;

    // Analyze health metrics (even without new data — check trends)
    const analysis = await activities.analyzeHealthMetrics({
      clientId,
      monitoringPlanId,
      newData: dataToAnalyze,
      baselineMetrics,
      thresholds,
    });

    completedCycles++;

    // ── Step 3: Alert If Needed ─────────────────────────────────────────
    if (analysis.alertNeeded) {
      alertCount++;

      await activities.sendNotification({
        clientId,
        type: "voice",
        content: `Health alert: Monitoring detected metrics outside normal range. Olivia is reaching out to check on you.`,
      });
    }

    // Checkpoint every 10 cycles for long-running monitors
    if (completedCycles % 10 === 0) {
      await activities.captureJourneySnapshot({
        clientId,
        conversationId: monitoringPlanId,
        workflowStep: `monitoring-cycle-${completedCycles}`,
        contextSummary: `HEARTBEAT monitoring: ${completedCycles}/${totalCycles} cycles. ${alertCount} alerts.`,
      });
    }
  }

  stepsCompleted = 2;

  // ── Step 4: Finalize ────────────────────────────────────────────────────
  currentStep = "finalize";

  const summary = await activities.generateMonitoringSummary({
    clientId,
    monitoringPlanId,
    totalCycles: completedCycles,
    alertCount,
  });

  await activities.sendNotification({
    clientId,
    type: "email",
    content: `Your HEARTBEAT monitoring period is complete. ${completedCycles} check cycles, ${alertCount} alerts. Summary report generated.`,
  });

  await activities.storeEpisodicMemory({
    clientId,
    conversationId: monitoringPlanId,
    summary: `HEARTBEAT monitoring completed. Duration: ${durationDays} days, ${completedCycles} cycles, ${alertCount} alerts. Summary: ${summary.summaryId}`,
    topics: ["heartbeat", "monitoring", "health", "cardiac"],
  });

  stepsCompleted = 3;
  currentStep = "completed";

  return {
    status: "completed",
    totalCycles: completedCycles,
    alertCount,
    completedAt: new Date().toISOString(),
  };
}

// ─── Workflow 5: Portfolio Data Sync ────────────────────────────────────────

/**
 * Cross-app data synchronization when one app publishes changes.
 * Propagates updates to all downstream consumers.
 *
 * 4 checkpointed stages:
 * 1. detect-changes          → Receive signal about what changed
 * 2. determine-downstream    → Which apps/workflows need this data
 * 3. fan-out-notifications   → Signal affected workflows, queue for offline apps
 * 4. verify-propagation      → Confirm all consumers acknowledged
 */
export async function portfolioDataSync(
  payload: PortfolioSyncPayload
): Promise<{
  status: string;
  consumersNotified: number;
  allAcknowledged: boolean;
  completedAt: string;
}> {
  const { sourceApp, changeType, changePayload } = payload;

  // ── Workflow State ──────────────────────────────────────────────────────
  let currentStep = "initializing";
  let stepsCompleted = 0;
  const totalSteps = 4;
  const workflowState: Record<string, unknown> = {};

  // ── Query Handlers ──────────────────────────────────────────────────────
  setHandler(currentStepQuery, () => currentStep);
  setHandler(progressQuery, () => ({
    completed: stepsCompleted,
    total: totalSteps,
    percentage: Math.round((stepsCompleted / totalSteps) * 100),
  }));
  setHandler(fullStateQuery, () => ({
    ...workflowState,
    currentStep,
    stepsCompleted,
  }));

  // ── Step 1: Detect Changes ──────────────────────────────────────────────
  currentStep = "detect-changes";

  workflowState.sourceApp = sourceApp;
  workflowState.changeType = changeType;
  workflowState.changePayload = changePayload;
  stepsCompleted = 1;

  // ── Step 2: Determine Downstream Consumers ──────────────────────────────
  currentStep = "determine-downstream";

  const { consumers } = await activities.determineDownstreamConsumers({
    sourceApp,
    changeType,
  });

  workflowState.consumers = consumers;
  stepsCompleted = 2;

  // ── Step 3: Fan-Out Notifications ───────────────────────────────────────
  currentStep = "fan-out-notifications";

  // Signal all affected running workflows
  // Note: This uses activities because signaling other workflows is a side effect
  await activities.sendNotification({
    clientId: "system",
    type: "text",
    content: `Portfolio sync: ${sourceApp} published ${changeType}. Notifying ${consumers.length} downstream consumers.`,
  });

  stepsCompleted = 3;

  // ── Step 4: Verify Propagation ──────────────────────────────────────────
  currentStep = "verify-propagation";

  const verification = await activities.verifySyncPropagation({
    sourceApp,
    consumers,
  });

  workflowState.allAcknowledged = verification.allAcknowledged;
  workflowState.failedConsumers = verification.failedConsumers;
  stepsCompleted = 4;
  currentStep = "completed";

  return {
    status: "completed",
    consumersNotified: consumers.length,
    allAcknowledged: verification.allAcknowledged,
    completedAt: new Date().toISOString(),
  };
}
