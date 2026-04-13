/**
 * Temporal Client — Crash-Proof Workflow Orchestration
 * Sprint 4.4 — Durable Execution (Item 5: Temporal Workflows)
 *
 * Manages long-lived, crash-proof workflows that can span days, weeks, or months.
 * Olivia orchestrates multi-app journeys (CLUES relocation, HEARTBEAT monitoring,
 * LifeScore assessments, London Tech Map intelligence) — each requiring persistent
 * state machines that survive crashes, accept external signals, and wait for
 * human input indefinitely.
 *
 * What Temporal adds over Inngest step functions:
 * - True checkpointing: workflow survives server crashes, replays from last checkpoint
 * - Long-lived workflows: days/weeks/months (client onboarding, health monitoring)
 * - Signals: external apps push data to running workflows (human input, app events)
 * - Queries: read workflow state without modifying it (progress bars, dashboards)
 * - Child workflows: fan-out across cities/markets, aggregate, judge
 * - Timers: durable sleep that survives restarts (check again in 24 hours)
 *
 * Architecture:
 * - This Next.js app is the CLIENT (starts, signals, queries, cancels workflows)
 * - Workflows EXECUTE on Temporal workers (Temporal Cloud or self-hosted)
 * - Workflow definitions in temporal-workflows.ts define the state machines
 * - NoOp fallback when TEMPORAL_ADDRESS is not configured
 *
 * Environment: TEMPORAL_ADDRESS, TEMPORAL_NAMESPACE (set in Vercel env vars)
 */

import { getServerEnv } from "@/lib/config/env";

// ─── Workflow Names ─────────────────────────────────────────────────────────

/**
 * All registered long-lived workflow types.
 * Each maps to a workflow definition in temporal-workflows.ts.
 */
export type WorkflowName =
  | "city-evaluation-pipeline"
  | "client-onboarding-journey"
  | "multi-market-comparison"
  | "heartbeat-monitoring"
  | "portfolio-data-sync";

// ─── Signal Types ───────────────────────────────────────────────────────────

/**
 * Signals that external systems can send to running workflows.
 * Signals are fire-and-forget — the sender does not wait for a response.
 * The workflow reacts to the signal at its next checkpoint.
 */
export type WorkflowSignal =
  | { type: "human-input-received"; data: { stepId: string; input: unknown } }
  | { type: "external-data-ready"; data: { source: string; payload: unknown } }
  | { type: "pause-requested"; data: { reason: string } }
  | { type: "resume-requested"; data: { resumedBy: string } }
  | {
      type: "priority-changed";
      data: { newPriority: "low" | "normal" | "high" | "urgent" };
    };

// ─── Query Types ────────────────────────────────────────────────────────────

/**
 * Read-only queries for inspecting workflow state without modifying it.
 * Used by UI dashboards, admin tools, and status endpoints.
 */
export type WorkflowQuery = "current-step" | "progress" | "full-state";

// ─── Status Types ───────────────────────────────────────────────────────────

/**
 * Simplified workflow execution status.
 * Maps from Temporal's internal statuses to these 6 states.
 */
export type WorkflowStatus =
  | "running"
  | "waiting"
  | "completed"
  | "failed"
  | "cancelled"
  | "timed_out";

export interface WorkflowHandle {
  /** Unique workflow execution ID */
  workflowId: string;
  /** Temporal run ID (unique per execution attempt) */
  runId: string;
  /** Which workflow type this is */
  workflowName: WorkflowName;
  /** Whether the workflow was actually started (false if NoOp) */
  started: boolean;
}

export interface WorkflowStatusResult {
  workflowId: string;
  status: WorkflowStatus;
  currentStep?: string;
  progress?: { completed: number; total: number; percentage: number };
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface WorkflowQueryResult {
  workflowId: string;
  queryType: WorkflowQuery;
  result: unknown;
}

export interface WorkflowListItem {
  workflowId: string;
  workflowName: WorkflowName;
  status: WorkflowStatus;
  startedAt?: string;
}

// ─── Workflow Payload Types ─────────────────────────────────────────────────

export interface CityEvaluationPayload {
  clientId: string;
  conversationId: string;
  targetCities: string[];
  includeFinancials: boolean;
  includeSMARTScore: boolean;
}

export interface OnboardingJourneyPayload {
  clientId: string;
  conversationId: string;
}

export interface MarketComparisonPayload {
  clientId: string;
  conversationId: string;
  cities: string[];
  comparisonCriteria: string[];
}

export interface HeartbeatMonitoringPayload {
  clientId: string;
  monitoringPlanId: string;
  checkIntervalHours: number;
  durationDays: number;
}

export interface PortfolioSyncPayload {
  sourceApp: string;
  changeType: string;
  changePayload: unknown;
}

/** Union of all workflow payloads keyed by workflow name */
export type WorkflowPayloadMap = {
  "city-evaluation-pipeline": CityEvaluationPayload;
  "client-onboarding-journey": OnboardingJourneyPayload;
  "multi-market-comparison": MarketComparisonPayload;
  "heartbeat-monitoring": HeartbeatMonitoringPayload;
  "portfolio-data-sync": PortfolioSyncPayload;
};

// ─── Temporal Status Mapping ────────────────────────────────────────────────

/**
 * Maps Temporal's WorkflowExecutionStatus enum values to our simplified statuses.
 * Temporal uses numeric enum values internally.
 */
const TEMPORAL_STATUS_MAP: Record<number, WorkflowStatus> = {
  0: "running", // UNSPECIFIED — treat as running
  1: "running", // RUNNING
  2: "completed", // COMPLETED
  3: "failed", // FAILED
  4: "cancelled", // CANCELED
  5: "cancelled", // TERMINATED
  6: "running", // CONTINUED_AS_NEW
  7: "timed_out", // TIMED_OUT
};

// ─── Service Interface ──────────────────────────────────────────────────────

/**
 * Complete Temporal workflow management interface.
 * All 7 operations Olivia needs for crash-proof workflow orchestration.
 */
export interface TemporalService {
  /**
   * Start a new long-lived workflow.
   * Generates a deterministic workflowId from name + payload identifiers.
   * Connects to Temporal server and starts the workflow execution.
   * The workflow runs on Temporal workers — this app only dispatches.
   */
  startWorkflow<T extends WorkflowName>(
    name: T,
    workflowId: string,
    payload: WorkflowPayloadMap[T]
  ): Promise<WorkflowHandle>;

  /**
   * Send a signal to a running workflow.
   * Signals are fire-and-forget — the workflow reacts asynchronously.
   * Used for: human input, external app data, pause/resume, priority changes.
   */
  signalWorkflow(
    workflowId: string,
    signal: WorkflowSignal
  ): Promise<boolean>;

  /**
   * Read-only query of workflow state. Does NOT modify the workflow.
   * Used for: UI progress bars, admin dashboards, status endpoints.
   * Returns current step, progress percentage, or full state depending on queryType.
   */
  queryWorkflow(
    workflowId: string,
    queryType: WorkflowQuery
  ): Promise<WorkflowQueryResult>;

  /**
   * Get simplified execution status of a workflow.
   * Maps Temporal's internal statuses to our 6 simplified states.
   */
  getWorkflowStatus(workflowId: string): Promise<WorkflowStatusResult>;

  /**
   * Request graceful cancellation of a running workflow.
   * The workflow receives a cancellation signal and can clean up.
   */
  cancelWorkflow(workflowId: string): Promise<boolean>;

  /**
   * Force-terminate a workflow immediately. Emergency use only.
   * No cleanup — the workflow is killed and recorded as terminated.
   */
  terminateWorkflow(workflowId: string, reason: string): Promise<boolean>;

  /**
   * List workflows with optional filters.
   * Uses Temporal's visibility API to query by clientId and/or status.
   */
  listWorkflows(
    clientId?: string,
    status?: WorkflowStatus
  ): Promise<WorkflowListItem[]>;
}

// ─── Temporal Implementation ────────────────────────────────────────────────

class TemporalServiceImpl implements TemporalService {
  private address: string;
  private namespace: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private clientPromise: Promise<any> | null = null;

  constructor(address: string, namespace: string) {
    this.address = address;
    this.namespace = namespace;
  }

  /**
   * Lazy-connect to Temporal server.
   * Connection is established on first use and reused thereafter.
   * Uses dynamic import to avoid loading @temporalio/client when not configured.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async getClient(): Promise<any> {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        const { Connection, Client } = await import("@temporalio/client");

        const connection = await Connection.connect({
          address: this.address,
        });

        return new Client({
          connection,
          namespace: this.namespace,
        });
      })();
    }

    return this.clientPromise;
  }

  /**
   * Start a new long-lived workflow on Temporal.
   * The workflow runs on Temporal workers with full checkpointing.
   */
  async startWorkflow<T extends WorkflowName>(
    name: T,
    workflowId: string,
    payload: WorkflowPayloadMap[T]
  ): Promise<WorkflowHandle> {
    try {
      const client = await this.getClient();

      const handle = await client.workflow.start(name, {
        taskQueue: "olivia-brain",
        workflowId,
        args: [payload],
        searchAttributes: {
          // Enable filtering by clientId in listWorkflows
          ...((payload as unknown as Record<string, unknown>).clientId
            ? { ClientId: [(payload as unknown as Record<string, unknown>).clientId as string] }
            : {}),
        },
      });

      console.log(
        `[Temporal] Started workflow "${name}" with ID "${workflowId}" (runId: ${handle.firstExecutionRunId})`
      );

      return {
        workflowId,
        runId: handle.firstExecutionRunId,
        workflowName: name,
        started: true,
      };
    } catch (error) {
      console.error(
        `[Temporal] Failed to start workflow "${name}":`,
        error instanceof Error ? error.message : error
      );
      throw error;
    }
  }

  /**
   * Send a signal to a running workflow.
   * The workflow's signal handler will process it at the next checkpoint.
   */
  async signalWorkflow(
    workflowId: string,
    signal: WorkflowSignal
  ): Promise<boolean> {
    try {
      const client = await this.getClient();
      const handle = client.workflow.getHandle(workflowId);

      await handle.signal(signal.type, signal.data);

      console.log(
        `[Temporal] Sent signal "${signal.type}" to workflow "${workflowId}"`
      );
      return true;
    } catch (error) {
      console.error(
        `[Temporal] Failed to signal workflow "${workflowId}":`,
        error instanceof Error ? error.message : error
      );
      return false;
    }
  }

  /**
   * Query workflow state without modifying it.
   * The workflow's query handler returns the requested information.
   */
  async queryWorkflow(
    workflowId: string,
    queryType: WorkflowQuery
  ): Promise<WorkflowQueryResult> {
    try {
      const client = await this.getClient();
      const handle = client.workflow.getHandle(workflowId);

      const result = await handle.query(queryType);

      return {
        workflowId,
        queryType,
        result,
      };
    } catch (error) {
      console.error(
        `[Temporal] Failed to query workflow "${workflowId}":`,
        error instanceof Error ? error.message : error
      );
      return {
        workflowId,
        queryType,
        result: null,
      };
    }
  }

  /**
   * Get simplified execution status by describing the workflow.
   */
  async getWorkflowStatus(workflowId: string): Promise<WorkflowStatusResult> {
    try {
      const client = await this.getClient();
      const handle = client.workflow.getHandle(workflowId);

      const description = await handle.describe();

      const statusCode = description.status?.code ?? 0;
      const status = TEMPORAL_STATUS_MAP[statusCode] ?? "running";

      return {
        workflowId,
        status,
        startedAt: description.startTime?.toISOString(),
        completedAt: description.closeTime?.toISOString(),
      };
    } catch (error) {
      return {
        workflowId,
        status: "failed",
        error: error instanceof Error ? error.message : "Failed to describe workflow",
      };
    }
  }

  /**
   * Request graceful cancellation. The workflow receives a CancellationError
   * and can run cleanup logic before terminating.
   */
  async cancelWorkflow(workflowId: string): Promise<boolean> {
    try {
      const client = await this.getClient();
      const handle = client.workflow.getHandle(workflowId);

      await handle.cancel();

      console.log(`[Temporal] Cancelled workflow "${workflowId}"`);
      return true;
    } catch (error) {
      console.error(
        `[Temporal] Failed to cancel workflow "${workflowId}":`,
        error instanceof Error ? error.message : error
      );
      return false;
    }
  }

  /**
   * Force-terminate a workflow immediately. No cleanup. Emergency use only.
   */
  async terminateWorkflow(
    workflowId: string,
    reason: string
  ): Promise<boolean> {
    try {
      const client = await this.getClient();
      const handle = client.workflow.getHandle(workflowId);

      await handle.terminate(reason);

      console.log(
        `[Temporal] Terminated workflow "${workflowId}" — reason: ${reason}`
      );
      return true;
    } catch (error) {
      console.error(
        `[Temporal] Failed to terminate workflow "${workflowId}":`,
        error instanceof Error ? error.message : error
      );
      return false;
    }
  }

  /**
   * List workflows using Temporal's visibility API.
   * Supports filtering by clientId (custom search attribute) and status.
   */
  async listWorkflows(
    clientId?: string,
    status?: WorkflowStatus
  ): Promise<WorkflowListItem[]> {
    try {
      const client = await this.getClient();

      // Build query string for Temporal's visibility API
      const queryParts: string[] = [];

      if (clientId) {
        queryParts.push(`ClientId = "${clientId}"`);
      }

      if (status) {
        // Map our simplified status back to Temporal status name
        const temporalStatusName = this.mapToTemporalStatus(status);
        if (temporalStatusName) {
          queryParts.push(
            `ExecutionStatus = "${temporalStatusName}"`
          );
        }
      }

      const query = queryParts.length > 0 ? queryParts.join(" AND ") : undefined;

      const items: WorkflowListItem[] = [];

      const workflows = client.workflow.list({ query });

      for await (const workflow of workflows) {
        const statusCode = workflow.status?.code ?? 0;

        items.push({
          workflowId: workflow.workflowId,
          workflowName: workflow.workflowType as WorkflowName,
          status: TEMPORAL_STATUS_MAP[statusCode] ?? "running",
          startedAt: workflow.startTime?.toISOString(),
        });
      }

      return items;
    } catch (error) {
      console.error(
        `[Temporal] Failed to list workflows:`,
        error instanceof Error ? error.message : error
      );
      return [];
    }
  }

  /**
   * Map our simplified status to Temporal's ExecutionStatus name for queries.
   */
  private mapToTemporalStatus(status: WorkflowStatus): string | null {
    switch (status) {
      case "running":
        return "Running";
      case "completed":
        return "Completed";
      case "failed":
        return "Failed";
      case "cancelled":
        return "Canceled";
      case "timed_out":
        return "TimedOut";
      case "waiting":
        return "Running"; // Temporal has no "waiting" — it's a running workflow blocked on signal
      default:
        return null;
    }
  }
}

// ─── NoOp Fallback ──────────────────────────────────────────────────────────

class NoOpTemporalService implements TemporalService {
  async startWorkflow<T extends WorkflowName>(
    name: T,
    workflowId: string
  ): Promise<WorkflowHandle> {
    console.warn(
      `[Temporal] Not configured — workflow "${name}" (${workflowId}) not started`
    );
    return {
      workflowId,
      runId: "noop",
      workflowName: name,
      started: false,
    };
  }

  async signalWorkflow(workflowId: string, signal: WorkflowSignal): Promise<boolean> {
    console.warn(
      `[Temporal] Not configured — signal "${signal.type}" to "${workflowId}" not sent`
    );
    return false;
  }

  async queryWorkflow(
    workflowId: string,
    queryType: WorkflowQuery
  ): Promise<WorkflowQueryResult> {
    console.warn(
      `[Temporal] Not configured — query "${queryType}" on "${workflowId}" not executed`
    );
    return { workflowId, queryType, result: null };
  }

  async getWorkflowStatus(workflowId: string): Promise<WorkflowStatusResult> {
    return { workflowId, status: "failed", error: "Temporal not configured" };
  }

  async cancelWorkflow(workflowId: string): Promise<boolean> {
    console.warn(
      `[Temporal] Not configured — cancel "${workflowId}" skipped`
    );
    return false;
  }

  async terminateWorkflow(workflowId: string): Promise<boolean> {
    console.warn(
      `[Temporal] Not configured — terminate "${workflowId}" skipped`
    );
    return false;
  }

  async listWorkflows(): Promise<WorkflowListItem[]> {
    console.warn("[Temporal] Not configured — returning empty workflow list");
    return [];
  }
}

// ─── Singleton Factory ──────────────────────────────────────────────────────

let temporalService: TemporalService | undefined;

/**
 * Get the Temporal service singleton.
 * Returns Temporal-backed service if TEMPORAL_ADDRESS + TEMPORAL_NAMESPACE are set.
 * Otherwise returns NoOp fallback that logs warnings and returns safe defaults.
 */
export function getTemporalService(): TemporalService {
  if (!temporalService) {
    const env = getServerEnv();

    if (env.TEMPORAL_ADDRESS && env.TEMPORAL_NAMESPACE) {
      temporalService = new TemporalServiceImpl(
        env.TEMPORAL_ADDRESS,
        env.TEMPORAL_NAMESPACE
      );
    } else {
      temporalService = new NoOpTemporalService();
    }
  }

  return temporalService;
}

/**
 * Check whether Temporal is available (address + namespace configured).
 */
export function isTemporalAvailable(): boolean {
  const env = getServerEnv();
  return !!env.TEMPORAL_ADDRESS && !!env.TEMPORAL_NAMESPACE;
}
