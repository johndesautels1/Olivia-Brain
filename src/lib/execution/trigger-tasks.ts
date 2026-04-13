/**
 * Trigger.dev Task Definitions & Dispatch
 * Sprint 4.4 — Durable Execution (Item 4: Long-Running Jobs)
 *
 * Defines long-running tasks that exceed Vercel's serverless timeout limits.
 * Each task runs on Trigger.dev infrastructure with no time limits.
 *
 * Tasks:
 * 1. generate-relocation-report — Multi-LLM report generation (50-100 pages)
 * 2. bulk-data-crawl — Firecrawl + ETL across many URLs
 * 3. deep-research — Chained LLM calls for city/market evaluation
 * 4. rebuild-knowledge-graph — Full graph recomputation from episodes/facts
 * 5. client-onboarding — Paragraphical extraction → scoring → SMART Score
 *
 * Architecture:
 * - task() calls define what runs on Trigger.dev workers
 * - tasks.trigger() dispatches from this Next.js app
 * - runs.retrieve() / runs.poll() checks status
 * - runs.cancel() cancels a running task
 *
 * Usage:
 *   import { dispatchTask, pollTaskStatus } from "./trigger-tasks";
 *   const handle = await dispatchTask("generate-relocation-report", payload);
 *   const result = await pollTaskStatus(handle.id);
 */

import { task, tasks, runs } from "@trigger.dev/sdk/v3";

import { ensureTriggerConfigured, isTriggerAvailable } from "./trigger-client";

// ─── Task Payload Types ──────────────────────────────────────────────────────

export interface ReportGenerationPayload {
  clientId: string;
  conversationId: string;
  reportType: "relocation" | "market-faq" | "meeting-prep" | "city-comparison";
  targetCities: string[];
  includeFinancials: boolean;
  includeSMARTScore: boolean;
}

export interface BulkCrawlPayload {
  conversationId: string;
  clientId?: string;
  urls: string[];
  extractionPrompt: string;
  maxPagesPerUrl: number;
  outputFormat: "structured-json" | "markdown" | "knowledge-chunks";
}

export interface DeepResearchPayload {
  conversationId: string;
  clientId: string;
  researchQuery: string;
  targetCities: string[];
  dataSources: Array<"web" | "rag" | "api" | "graph">;
  requireJudgeVerdict: boolean;
}

export interface GraphRebuildPayload {
  clientId: string;
  scope: "full" | "incremental";
  sinceDate?: string;
}

export interface ClientOnboardingPayload {
  clientId: string;
  conversationId: string;
  paragraphicals: string[];
  targetModules: string[];
}

/** Union of all task payloads keyed by task identifier */
export type TaskPayloadMap = {
  "generate-relocation-report": ReportGenerationPayload;
  "bulk-data-crawl": BulkCrawlPayload;
  "deep-research": DeepResearchPayload;
  "rebuild-knowledge-graph": GraphRebuildPayload;
  "client-onboarding": ClientOnboardingPayload;
};

export type TaskName = keyof TaskPayloadMap;

// ─── Task Definitions (run on Trigger.dev workers) ───────────────────────────

export const generateRelocationReport = task({
  id: "generate-relocation-report",
  retry: { maxAttempts: 3 },
  run: async (payload: ReportGenerationPayload) => {
    // Implementation will call cascade LLMs to generate multi-section reports.
    // Each section (demographics, cost-of-living, neighborhoods, etc.) is a
    // separate LLM call, then assembled into the final document.
    return {
      status: "completed" as const,
      reportType: payload.reportType,
      cities: payload.targetCities,
      generatedAt: new Date().toISOString(),
    };
  },
});

export const bulkDataCrawl = task({
  id: "bulk-data-crawl",
  retry: { maxAttempts: 4 },
  run: async (payload: BulkCrawlPayload) => {
    // Implementation will use Firecrawl + Unstructured ETL to crawl URLs,
    // extract structured data, and store as knowledge chunks.
    return {
      status: "completed" as const,
      urlsProcessed: payload.urls.length,
      outputFormat: payload.outputFormat,
      completedAt: new Date().toISOString(),
    };
  },
});

export const deepResearch = task({
  id: "deep-research",
  retry: { maxAttempts: 3 },
  run: async (payload: DeepResearchPayload) => {
    // Implementation will chain: Gemini (extraction) → GPT (evaluation) →
    // Perplexity (fact verification) → Opus (judge verdict).
    return {
      status: "completed" as const,
      query: payload.researchQuery,
      cities: payload.targetCities,
      sourcesUsed: payload.dataSources,
      completedAt: new Date().toISOString(),
    };
  },
});

export const rebuildKnowledgeGraph = task({
  id: "rebuild-knowledge-graph",
  retry: { maxAttempts: 2 },
  run: async (payload: GraphRebuildPayload) => {
    // Implementation will read all episodes and semantic facts for the client,
    // re-extract entities and relationships, and rebuild the graph.
    return {
      status: "completed" as const,
      scope: payload.scope,
      completedAt: new Date().toISOString(),
    };
  },
});

export const clientOnboarding = task({
  id: "client-onboarding",
  retry: { maxAttempts: 3 },
  run: async (payload: ClientOnboardingPayload) => {
    // Implementation will invoke Gemini extraction on paragraphicals,
    // run adaptive module selection, score target modules, and generate
    // initial SMART Score.
    return {
      status: "completed" as const,
      paragraphCount: payload.paragraphicals.length,
      modulesProcessed: payload.targetModules.length,
      completedAt: new Date().toISOString(),
    };
  },
});

// ─── Task Metadata ───────────────────────────────────────────────────────────

interface TaskMeta {
  description: string;
}

const TASK_META: Record<TaskName, TaskMeta> = {
  "generate-relocation-report": {
    description: "Generate a multi-section relocation report using cascaded LLMs",
  },
  "bulk-data-crawl": {
    description: "Crawl and extract structured data from multiple URLs",
  },
  "deep-research": {
    description: "Run chained LLM research pipeline for city evaluation",
  },
  "rebuild-knowledge-graph": {
    description: "Rebuild knowledge graph from stored episodes and facts",
  },
  "client-onboarding": {
    description: "Process client paragraphicals and generate initial scores",
  },
};

// ─── Task Reference Map ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TASK_REF: Record<TaskName, any> = {
  "generate-relocation-report": generateRelocationReport,
  "bulk-data-crawl": bulkDataCrawl,
  "deep-research": deepResearch,
  "rebuild-knowledge-graph": rebuildKnowledgeGraph,
  "client-onboarding": clientOnboarding,
};

// ─── Dispatch Handle ─────────────────────────────────────────────────────────

export interface TaskHandle {
  /** Trigger.dev run ID for status polling */
  id: string;
  /** Task name */
  taskName: TaskName;
  /** Whether the task was actually dispatched (false if no client configured) */
  dispatched: boolean;
}

export type TaskStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "unknown";

export interface TaskStatusResult {
  id: string;
  status: TaskStatus;
  output?: unknown;
  error?: string;
  createdAt?: string;
  completedAt?: string;
}

// ─── Status Mapping ──────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, TaskStatus> = {
  PENDING_VERSION: "queued",
  QUEUED: "queued",
  DEQUEUED: "queued",
  DELAYED: "queued",
  EXECUTING: "running",
  WAITING: "running",
  COMPLETED: "completed",
  CANCELED: "cancelled",
  FAILED: "failed",
  CRASHED: "failed",
  SYSTEM_FAILURE: "failed",
  EXPIRED: "failed",
  TIMED_OUT: "failed",
};

// ─── Dispatch & Status ───────────────────────────────────────────────────────

/**
 * Dispatch a long-running task to Trigger.dev.
 * Returns a handle with the run ID for status polling.
 * If Trigger.dev is not configured, returns a no-op handle.
 */
export async function dispatchTask<T extends TaskName>(
  taskName: T,
  payload: TaskPayloadMap[T]
): Promise<TaskHandle> {
  if (!isTriggerAvailable()) {
    console.warn(
      `[Trigger] Not configured — task "${taskName}" not dispatched`
    );
    return { id: "noop", taskName, dispatched: false };
  }

  ensureTriggerConfigured();

  const taskRef = TASK_REF[taskName];
  const handle = await tasks.trigger(taskRef, payload);

  return {
    id: handle.id,
    taskName,
    dispatched: true,
  };
}

/**
 * Retrieve the current status of a dispatched task.
 */
export async function getTaskStatus(runId: string): Promise<TaskStatusResult> {
  if (runId === "noop" || !isTriggerAvailable()) {
    return { id: runId, status: "unknown" };
  }

  ensureTriggerConfigured();

  try {
    const run = await runs.retrieve(runId);

    return {
      id: runId,
      status: STATUS_MAP[run.status] ?? "unknown",
      output: run.output,
      error: run.error?.message,
      createdAt: run.createdAt?.toISOString(),
    };
  } catch (error) {
    return {
      id: runId,
      status: "unknown",
      error: error instanceof Error ? error.message : "Failed to fetch status",
    };
  }
}

/**
 * Poll a task until it reaches a terminal state (completed/failed/cancelled).
 * Blocks until done — use getTaskStatus() for non-blocking checks.
 */
export async function pollTaskUntilDone(
  runId: string,
  pollIntervalMs = 2000
): Promise<TaskStatusResult> {
  if (runId === "noop" || !isTriggerAvailable()) {
    return { id: runId, status: "unknown" };
  }

  ensureTriggerConfigured();

  try {
    const run = await runs.poll(runId, { pollIntervalMs });

    return {
      id: runId,
      status: STATUS_MAP[run.status] ?? "unknown",
      output: run.output,
      error: run.error?.message,
      createdAt: run.createdAt?.toISOString(),
    };
  } catch (error) {
    return {
      id: runId,
      status: "unknown",
      error: error instanceof Error ? error.message : "Failed to poll status",
    };
  }
}

/**
 * Cancel a running or queued task.
 */
export async function cancelTask(runId: string): Promise<boolean> {
  if (runId === "noop" || !isTriggerAvailable()) {
    return false;
  }

  ensureTriggerConfigured();

  try {
    await runs.cancel(runId);
    return true;
  } catch (error) {
    console.error(`[Trigger] Failed to cancel task ${runId}:`, error);
    return false;
  }
}

/**
 * List all available task names with their descriptions.
 */
export function listAvailableTasks(): Array<{
  name: TaskName;
  description: string;
}> {
  return Object.entries(TASK_META).map(([name, meta]) => ({
    name: name as TaskName,
    description: meta.description,
  }));
}
