/**
 * OLIVIA BRAIN — Agent Handler System
 *
 * Every agent implements the AgentHandler interface.
 * The execution engine calls handler.execute(context) and records the result.
 *
 * New agents are registered by adding to the HANDLER_REGISTRY map.
 * Agents without a registered handler use the DefaultHandler (placeholder).
 */

import type { PersonaType, TriggerType } from "./types";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface AgentRunContext {
  /** Agent ID (e.g. "O1-001") */
  agentId: string;
  /** Database UUID */
  agentDbId: string;
  /** This run's UUID */
  runId: string;
  /** Human-readable name */
  agentName: string;
  /** Group code (e.g. "1A") */
  groupCode: string;
  /** Group name */
  groupName: string;
  /** Which persona owns this agent */
  persona: PersonaType | null;
  /** LLM model to use */
  llmModel: string;
  /** Temperature setting */
  temperature: number;
  /** Max tokens */
  maxTokens: number;
  /** System prompt */
  systemPrompt: string | null;
  /** Agent-specific config key-values */
  configs: Record<string, string>;
  /** Runtime input data */
  input: Record<string, unknown>;
  /** What triggered this run */
  triggeredBy: TriggerType;
  /** Client ID if this is a client-specific run */
  clientId?: string;
  /** Conversation ID if tied to a conversation */
  conversationId?: string;
  /** Abort signal fired before serverless deadline */
  abortSignal?: AbortSignal;
  /** Epoch ms deadline for this run */
  deadlineAt?: number;
}

export interface AgentRunResult {
  /** Short human-readable summary */
  outputSummary: string;
  /** Structured output data (stored as JSON) */
  outputData?: Record<string, unknown>;
  /** Cost in USD for this run */
  costUsd?: number;
  /** Tokens consumed */
  tokensUsed?: number;
  /** Learnings captured during this run */
  learnings?: AgentLearningOutput[];
  /** Briefing to generate from this run */
  briefing?: AgentBriefingOutput;
}

export interface AgentLearningOutput {
  type?: "pattern" | "preference" | "correction" | "insight" | "feedback" | "optimization";
  title: string;
  description: string;
  confidence?: number;  // 0-1
  sourceData?: Record<string, unknown>;
}

export interface AgentBriefingOutput {
  type?: "daily" | "weekly" | "alert" | "milestone";
  title: string;
  summary: string;
  details?: Record<string, unknown>;
  severity?: "info" | "warning" | "critical";
}

// ─────────────────────────────────────────────
// Handler Interface
// ─────────────────────────────────────────────

export interface AgentHandler {
  /** Unique agent ID this handler serves */
  agentId: string;
  /** Execute the agent's core logic */
  execute(context: AgentRunContext): Promise<AgentRunResult>;
}

// ─────────────────────────────────────────────
// Default Handler (placeholder for unbuilt agents)
// ─────────────────────────────────────────────

class DefaultHandler implements AgentHandler {
  agentId = "__default__";

  async execute(context: AgentRunContext): Promise<AgentRunResult> {
    return {
      outputSummary: `Agent ${context.agentId} (${context.agentName}) executed successfully. Handler not yet implemented — running in placeholder mode. Triggered by: ${context.triggeredBy}.`,
      outputData: {
        agentId: context.agentId,
        groupCode: context.groupCode,
        persona: context.persona,
        triggeredBy: context.triggeredBy,
        timestamp: new Date().toISOString(),
        mode: "placeholder",
      },
      costUsd: 0,
      tokensUsed: 0,
    };
  }
}

// ─────────────────────────────────────────────
// System Health Check Handler
// ─────────────────────────────────────────────

class SystemHealthCheckHandler implements AgentHandler {
  agentId = "SYS-HEALTH";

  async execute(_context: AgentRunContext): Promise<AgentRunResult> {
    const startTime = Date.now();

    // Test database connectivity
    let dbOk = false;
    let agentCount = 0;
    let activeCount = 0;
    let errorCount = 0;

    try {
      const prisma = (await import("@/lib/db/client")).default;
      const [total, active, errors] = await Promise.all([
        prisma.agents.count({ where: { is_archived: false } }),
        prisma.agents.count({ where: { is_archived: false, status: "active" } }),
        prisma.agents.count({ where: { is_archived: false, status: "error" } }),
      ]);
      dbOk = true;
      agentCount = total;
      activeCount = active;
      errorCount = errors;
    } catch {
      dbOk = false;
    }

    const latency = Date.now() - startTime;
    const severity = !dbOk ? "critical" : errorCount > 5 ? "warning" : "info";

    return {
      outputSummary: `System health check: DB ${dbOk ? "OK" : "FAIL"}, ${agentCount} agents (${activeCount} active, ${errorCount} errors), latency ${latency}ms`,
      outputData: {
        dbConnectivity: dbOk,
        agentCount,
        activeCount,
        errorCount,
        dbLatencyMs: latency,
        timestamp: new Date().toISOString(),
      },
      costUsd: 0,
      tokensUsed: 0,
      briefing: {
        type: "daily",
        title: `System Health: ${!dbOk ? "DATABASE UNREACHABLE" : errorCount > 0 ? `${errorCount} Agents in Error State` : "All Systems Operational"}`,
        summary: `Database: ${dbOk ? "Connected" : "Unreachable"} (${latency}ms). ${agentCount} total agents, ${activeCount} active, ${errorCount} in error state.`,
        details: { dbOk, agentCount, activeCount, errorCount, latency },
        severity: severity as "info" | "warning" | "critical",
      },
    };
  }
}

// ─────────────────────────────────────────────
// Handler Registry
// ─────────────────────────────────────────────

const HANDLER_REGISTRY = new Map<string, AgentHandler>();

// Register built-in handlers
HANDLER_REGISTRY.set("__default__", new DefaultHandler());
HANDLER_REGISTRY.set("SYS-HEALTH", new SystemHealthCheckHandler());

// ─────────────────────────────────────────────
// Registry Management Functions
// ─────────────────────────────────────────────

/**
 * Register a handler for an agent
 */
export function registerHandler(handler: AgentHandler): void {
  HANDLER_REGISTRY.set(handler.agentId, handler);
}

/**
 * Get the handler for an agent (falls back to DefaultHandler)
 */
export function getHandler(agentId: string): AgentHandler {
  return HANDLER_REGISTRY.get(agentId) ?? HANDLER_REGISTRY.get("__default__")!;
}

/**
 * Check if an agent has a registered handler (non-default)
 */
export function hasHandler(agentId: string): boolean {
  return HANDLER_REGISTRY.has(agentId) && agentId !== "__default__";
}

/**
 * Get all registered handler agent IDs
 */
export function getRegisteredAgentIds(): string[] {
  return Array.from(HANDLER_REGISTRY.keys()).filter((id) => id !== "__default__");
}

/**
 * Get count of registered handlers
 */
export function getHandlerCount(): number {
  return HANDLER_REGISTRY.size - 1; // Exclude default
}

// ─────────────────────────────────────────────
// Handler Implementation Registration
// Future agent implementations will be imported and registered here
// ─────────────────────────────────────────────

// Example: When implementing O1-001 Client Intake Orchestrator
// import { clientIntakeOrchestratorHandler } from "./impl/o1-001-client-intake-orchestrator";
// registerHandler(clientIntakeOrchestratorHandler);
