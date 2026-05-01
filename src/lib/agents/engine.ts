/**
 * OLIVIA BRAIN — Agent Execution Engine
 *
 * Core runtime that executes agents autonomously.
 * Each execution: create run → invoke handler → record results → update stats → generate briefing.
 *
 * Designed for serverless (Vercel): no long-lived processes.
 * Triggered by: manual API call, cron endpoint, or event-driven webhook.
 */

import prisma from "@/lib/db/client";
import type { AgentRunContext, AgentRunResult } from "./handlers";
import { getHandler } from "./handlers";
import type { TriggerType } from "./types";

const AGENT_EXECUTION_TIMEOUT_MS = 55_000;
const STALE_RUNNING_AFTER_MS = 5 * 60_000;
const WATCHDOG_ERROR = "Agent watchdog: run exceeded serverless deadline and was marked timeout";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface ExecuteAgentOptions {
  /** The agent's agentId (e.g. "O1-001") or database id */
  agentId: string;
  /** What triggered this run */
  triggeredBy: TriggerType;
  /** Optional input data for the agent */
  input?: Record<string, unknown>;
  /** Client ID if client-specific */
  clientId?: string;
  /** Conversation ID if tied to conversation */
  conversationId?: string;
  /** Override: skip rate limit check */
  skipRateLimit?: boolean;
}

export interface ExecuteAgentResult {
  success: boolean;
  runId: string;
  status: "completed" | "failed" | "timeout" | "cancelled";
  durationMs: number;
  costUsd: number;
  outputSummary: string | null;
  errorMessage: string | null;
}

type TerminalRunStatus = "completed" | "failed" | "timeout";

interface ActiveRun {
  id: string;
  started_at: Date;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "P2002";
}

function staleRunningCutoff(): Date {
  return new Date(Date.now() - STALE_RUNNING_AFTER_MS);
}

function cancelledDuplicateResult(activeRun: ActiveRun): ExecuteAgentResult {
  const ageMs = Math.max(0, Date.now() - activeRun.started_at.getTime());
  return {
    success: false,
    runId: activeRun.id,
    status: "cancelled",
    durationMs: 0,
    costUsd: 0,
    outputSummary: null,
    errorMessage: `Execution cancelled: agent already has an active run (${activeRun.id}, age ${Math.round(ageMs / 1000)}s).`,
  };
}

function isTransientAgentFailure(runStatus: TerminalRunStatus, errorMessage: string | null): boolean {
  if (runStatus === "timeout") return true;

  const message = (errorMessage ?? "").toLowerCase();
  return [
    "timeout", "timed out", "rate limit", "quota", "429", "500", "502", "503", "504",
    "econnreset", "etimedout", "eai_again", "fetch failed", "network", "connection",
  ].some((pattern) => message.includes(pattern));
}

// ─────────────────────────────────────────────
// Rate Limit Check
// ─────────────────────────────────────────────

async function checkRateLimit(
  agentDbId: string,
  perMin: number,
  perDay: number
): Promise<{ allowed: boolean; reason?: string }> {
  const now = new Date();
  const oneMinAgo = new Date(now.getTime() - 60_000);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [minuteCount, dayCount] = await Promise.all([
    prisma.agent_runs.count({
      where: { agent_id: agentDbId, started_at: { gte: oneMinAgo } },
    }),
    prisma.agent_runs.count({
      where: { agent_id: agentDbId, started_at: { gte: todayStart } },
    }),
  ]);

  if (minuteCount >= perMin) {
    return { allowed: false, reason: `Rate limit exceeded: ${minuteCount}/${perMin} runs per minute` };
  }
  if (dayCount >= perDay) {
    return { allowed: false, reason: `Daily limit exceeded: ${dayCount}/${perDay} runs per day` };
  }

  return { allowed: true };
}

// ─────────────────────────────────────────────
// Update Agent Stats
// ─────────────────────────────────────────────

async function updateAgentStats(
  agentDbId: string,
  runStatus: TerminalRunStatus,
  durationMs: number,
  costUsd: number,
  errorMessage: string | null
) {
  const agent = await prisma.agents.findUnique({
    where: { id: agentDbId },
    select: {
      total_runs: true,
      successful_runs: true,
      failed_runs: true,
      total_cost_usd: true,
      avg_latency_ms: true,
    },
  });

  if (!agent) return;

  const newTotalRuns = agent.total_runs + 1;
  const newSuccessful = agent.successful_runs + (runStatus === "completed" ? 1 : 0);
  const newFailed = agent.failed_runs + (runStatus !== "completed" ? 1 : 0);
  const newTotalCost = agent.total_cost_usd + costUsd;

  // Rolling average latency
  const newAvgLatency = agent.total_runs > 0
    ? (agent.avg_latency_ms * agent.total_runs + durationMs) / newTotalRuns
    : durationMs;

  // Performance score: weighted composite (0-100)
  const successRate = newTotalRuns > 0 ? newSuccessful / newTotalRuns : 0;
  const latencyScore = Math.max(0, 100 - (newAvgLatency / 100));
  const performanceScore = Math.min(100, Math.max(0,
    successRate * 70 +
    (latencyScore / 100) * 20 +
    Math.min(newTotalRuns / 10, 1) * 10
  ));

  const updateData: Record<string, unknown> = {
    total_runs: newTotalRuns,
    successful_runs: newSuccessful,
    failed_runs: newFailed,
    total_cost_usd: newTotalCost,
    avg_latency_ms: newAvgLatency,
    performance_score: performanceScore,
    last_run_at: new Date(),
  };

  if (runStatus !== "completed" && errorMessage) {
    updateData.last_error = errorMessage;
    updateData.last_error_at = new Date();

    // Only disable on repeated permanent failures
    if (!isTransientAgentFailure(runStatus, errorMessage)) {
      const recentRuns = await prisma.agent_runs.findMany({
        where: { agent_id: agentDbId },
        orderBy: { started_at: "desc" },
        take: 3,
        select: { status: true, error_message: true },
      });
      const permanentFailures = recentRuns.filter((r) =>
        r.status === "failed" && !isTransientAgentFailure("failed", r.error_message)
      ).length;
      if (permanentFailures >= 3) {
        updateData.status = "error";
      }
    }
  }

  await prisma.agents.update({
    where: { id: agentDbId },
    data: updateData,
  });
}

// ─────────────────────────────────────────────
// Create Briefing
// ─────────────────────────────────────────────

async function createBriefing(
  agentDbId: string,
  briefing: {
    type?: string;
    title: string;
    summary: string;
    details?: Record<string, unknown>;
    severity?: string;
  }
) {
  const now = new Date();
  await prisma.agent_briefings.create({
    data: {
      agent_id: agentDbId,
      briefing_type: briefing.type ?? "alert",
      title: briefing.title,
      summary: briefing.summary,
      findings_json: briefing.details ?? {},
      severity: briefing.severity ?? "info",
      period_start: now,
      period_end: now,
    },
  });
}

// ─────────────────────────────────────────────
// Create Learning
// ─────────────────────────────────────────────

async function createLearning(
  agentDbId: string,
  runId: string,
  learning: {
    type?: string;
    title: string;
    description: string;
    confidence?: number;
    sourceData?: Record<string, unknown>;
  }
) {
  await prisma.agent_learnings.create({
    data: {
      agent_id: agentDbId,
      run_id: runId,
      learning_type: learning.type ?? "insight",
      title: learning.title,
      description: learning.description,
      confidence: learning.confidence ?? 0.7,
      data_json: learning.sourceData ?? {},
    },
  });
}

// ─────────────────────────────────────────────
// Main Execution Function
// ─────────────────────────────────────────────

export async function executeAgent(options: ExecuteAgentOptions): Promise<ExecuteAgentResult> {
  const { agentId, triggeredBy, input = {}, clientId, conversationId, skipRateLimit } = options;

  // 1. Find the agent
  const agent = await prisma.agents.findFirst({
    where: {
      OR: [
        { agent_id: agentId },
        { id: agentId },
      ],
      is_archived: false,
    },
    include: {
      agent_group: true,
      agent_configs: { where: { is_secret: false } },
    },
  });

  if (!agent) {
    return {
      success: false,
      runId: "",
      status: "failed",
      durationMs: 0,
      costUsd: 0,
      outputSummary: null,
      errorMessage: `Agent not found: ${agentId}`,
    };
  }

  if (agent.status === "disabled" || agent.status === "error") {
    return {
      success: false,
      runId: "",
      status: "cancelled",
      durationMs: 0,
      costUsd: 0,
      outputSummary: null,
      errorMessage: `Agent is ${agent.status} and cannot be executed`,
    };
  }

  // 2. Rate limit check
  if (!skipRateLimit) {
    const rateCheck = await checkRateLimit(
      agent.id,
      agent.rate_limit_per_min,
      agent.rate_limit_per_day
    );
    if (!rateCheck.allowed) {
      return {
        success: false,
        runId: "",
        status: "cancelled",
        durationMs: 0,
        costUsd: 0,
        outputSummary: null,
        errorMessage: rateCheck.reason!,
      };
    }
  }

  // 3. Check for active run (prevent double-execution)
  const activeRun = await prisma.agent_runs.findFirst({
    where: {
      agent_id: agent.id,
      status: "running",
      started_at: { gte: staleRunningCutoff() },
    },
    select: { id: true, started_at: true },
  });

  if (activeRun) {
    return cancelledDuplicateResult(activeRun);
  }

  // 4. Clean up stale runs
  await prisma.agent_runs.updateMany({
    where: {
      agent_id: agent.id,
      status: "running",
      started_at: { lt: staleRunningCutoff() },
    },
    data: {
      status: "timeout",
      error_message: WATCHDOG_ERROR,
      completed_at: new Date(),
    },
  });

  // 5. Create run record
  const startTime = Date.now();
  const deadlineAt = startTime + AGENT_EXECUTION_TIMEOUT_MS;

  let run;
  try {
    run = await prisma.agent_runs.create({
      data: {
        agent_id: agent.id,
        status: "running",
        trigger_type: triggeredBy,
        trigger_user_id: clientId,
        input_json: input,
        llm_model: agent.llm_model,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const justCreated = await prisma.agent_runs.findFirst({
        where: { agent_id: agent.id, status: "running" },
        select: { id: true, started_at: true },
      });
      if (justCreated) {
        return cancelledDuplicateResult(justCreated);
      }
    }
    throw error;
  }

  // 6. Build execution context
  const configs: Record<string, string> = {};
  for (const cfg of agent.agent_configs ?? []) {
    configs[cfg.key] = cfg.value;
  }

  const context: AgentRunContext = {
    agentId: agent.agent_id,
    agentDbId: agent.id,
    runId: run.id,
    agentName: agent.name,
    groupCode: agent.agent_group?.code ?? "",
    groupName: agent.agent_group?.name ?? "",
    persona: (agent.persona as AgentRunContext["persona"]) ?? null,
    llmModel: agent.llm_model,
    temperature: agent.temperature,
    maxTokens: agent.max_tokens,
    systemPrompt: agent.system_prompt,
    configs,
    input,
    triggeredBy,
    clientId,
    conversationId,
    deadlineAt,
  };

  // 7. Execute handler
  let result: AgentRunResult;
  let runStatus: TerminalRunStatus = "completed";
  let errorMessage: string | null = null;

  try {
    const handler = getHandler(agent.agent_id);
    result = await handler.execute(context);
  } catch (err) {
    runStatus = "failed";
    errorMessage = err instanceof Error ? err.message : String(err);
    result = {
      outputSummary: `Agent ${agent.agent_id} failed: ${errorMessage}`,
      outputData: { error: errorMessage },
      costUsd: 0,
      tokensUsed: 0,
    };
  }

  // 8. Calculate duration
  const durationMs = Date.now() - startTime;

  // 9. Check timeout
  if (durationMs >= AGENT_EXECUTION_TIMEOUT_MS) {
    runStatus = "timeout";
    errorMessage = WATCHDOG_ERROR;
  }

  // 10. Update run record
  await prisma.agent_runs.update({
    where: { id: run.id },
    data: {
      status: runStatus,
      output_json: result.outputData ?? {},
      error_message: errorMessage,
      duration_ms: durationMs,
      tokens_used: result.tokensUsed ?? 0,
      cost_usd: result.costUsd ?? 0,
      completed_at: new Date(),
    },
  });

  // 11. Update agent stats
  await updateAgentStats(
    agent.id,
    runStatus,
    durationMs,
    result.costUsd ?? 0,
    errorMessage
  );

  // 12. Create briefing if provided
  if (result.briefing) {
    await createBriefing(agent.id, result.briefing);
  }

  // 13. Create learnings if provided
  if (result.learnings?.length) {
    for (const learning of result.learnings) {
      await createLearning(agent.id, run.id, learning);
    }
  }

  return {
    success: runStatus === "completed",
    runId: run.id,
    status: runStatus,
    durationMs,
    costUsd: result.costUsd ?? 0,
    outputSummary: result.outputSummary,
    errorMessage,
  };
}

// ─────────────────────────────────────────────
// Batch Execution (for Run All)
// ─────────────────────────────────────────────

export interface BatchExecuteResult {
  total: number;
  succeeded: number;
  failed: number;
  results: Map<string, ExecuteAgentResult>;
}

export async function executeAllActiveAgents(
  triggeredBy: TriggerType = "scheduled",
  onProgress?: (agentId: string, result: ExecuteAgentResult) => void
): Promise<BatchExecuteResult> {
  const agents = await prisma.agents.findMany({
    where: { status: "active", is_archived: false },
    orderBy: [{ agent_group: { sort_order: "asc" } }, { agent_id: "asc" }],
    select: { agent_id: true },
  });

  const results = new Map<string, ExecuteAgentResult>();
  let succeeded = 0;
  let failed = 0;

  for (const agent of agents) {
    const result = await executeAgent({
      agentId: agent.agent_id,
      triggeredBy,
    });

    results.set(agent.agent_id, result);

    if (result.success) {
      succeeded++;
    } else {
      failed++;
    }

    if (onProgress) {
      onProgress(agent.agent_id, result);
    }
  }

  return {
    total: agents.length,
    succeeded,
    failed,
    results,
  };
}
