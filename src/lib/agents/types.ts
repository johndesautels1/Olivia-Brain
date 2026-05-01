/**
 * OLIVIA BRAIN — Agent Type Definitions
 *
 * Type definitions for the 250-agent autonomous system.
 * Adapted from London Tech Map's proven architecture.
 */

// ─────────────────────────────────────────────
// Enums & Literal Types
// ─────────────────────────────────────────────

export type AgentStatusType = "active" | "paused" | "disabled" | "error" | "initializing";
export type AgentRunStatusType = "running" | "completed" | "failed" | "timeout" | "cancelled";
export type ScheduleType = "on_demand" | "realtime" | "hourly" | "daily" | "weekly" | "event_driven" | "cron";
export type BriefingType = "daily" | "weekly" | "alert" | "milestone";
export type SeverityLevel = "info" | "warning" | "critical";
export type LearningType = "pattern" | "preference" | "correction" | "insight" | "feedback" | "optimization";
export type TriggerType = "manual" | "scheduled" | "event" | "api" | "cascade" | "user_request";

// Olivia-specific persona types
export type PersonaType = "olivia" | "cristiano" | "emelia" | "system";

// ─────────────────────────────────────────────
// Static Definitions (Code-Level)
// ─────────────────────────────────────────────

/** Static definition of an agent in the registry (code-level, not DB) */
export interface AgentDefinition {
  agentId: string;              // "O1-001" for Olivia agents
  name: string;                 // "Client Intake Orchestrator"
  description: string;
  groupCode: string;            // "1A" = Persona, "2A" = Domain, etc.
  defaultModel: string;         // "claude-sonnet-4-6"
  defaultTemperature: number;
  defaultMaxTokens: number;
  defaultSchedule: ScheduleType;
  persona?: PersonaType;        // Which persona owns this agent
  capabilities: string[];       // What this agent can do
  dataSources: string[];        // What data it needs
  outputTypes: string[];        // What it produces
  cascadePosition?: number;     // Position in 9-model cascade (1-9)
}

/** Static definition of an agent group */
export interface AgentGroupDefinition {
  code: string;                 // "1A"
  name: string;                 // "Olivia Persona Agents"
  description: string;
  sortOrder: number;
  category: "persona" | "domain" | "infrastructure" | "integration";
}

// ─────────────────────────────────────────────
// Database Records (Runtime)
// ─────────────────────────────────────────────

/** Agent as returned from the API (DB shape) */
export interface AgentRecord {
  id: string;
  agentId: string;
  name: string;
  description: string | null;
  groupId: string;
  status: AgentStatusType;
  persona: PersonaType | null;
  llmModel: string;
  temperature: number;
  maxTokens: number;
  scheduleType: string;
  scheduleCron: string | null;
  rateLimitPerMin: number;
  rateLimitPerDay: number;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  totalCostUsd: number;
  avgLatencyMs: number;
  performanceScore: number;
  lastRunAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
  systemPrompt: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  group?: AgentGroupRecord;
  _count?: {
    runs: number;
    briefings: number;
    learnings: number;
  };
}

export interface AgentGroupRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  sortOrder: number;
  isArchived: boolean;
  agents?: AgentRecord[];
  _count?: {
    agents: number;
  };
}

export interface AgentRunRecord {
  id: string;
  agentId: string;
  status: AgentRunStatusType;
  triggerType: string;
  triggerUserId: string | null;
  inputJson: unknown;
  outputJson: unknown;
  errorMessage: string | null;
  durationMs: number | null;
  tokensUsed: number | null;
  costUsd: number | null;
  llmModel: string | null;
  cascadeStep: number | null;
  startedAt: string;
  completedAt: string | null;
}

export interface AgentMetricRecord {
  id: string;
  agentId: string;
  date: string;
  runsTotal: number;
  runsSuccessful: number;
  runsFailed: number;
  avgLatencyMs: number;
  totalCostUsd: number;
  tokensUsed: number;
  userInteractions: number;
  performanceScore: number;
}

export interface AgentBriefingRecord {
  id: string;
  agentId: string;
  briefingType: string;
  title: string;
  summary: string;
  findingsJson: unknown;
  recommendationsJson: unknown;
  severity: string;
  isRead: boolean;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

export interface AgentLearningRecord {
  id: string;
  agentId: string;
  runId: string | null;
  learningType: string;
  title: string;
  description: string;
  dataJson: unknown;
  confidence: number;
  appliedCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface AgentConfigRecord {
  id: string;
  agentId: string;
  key: string;
  value: string;
  isSecret: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────
// Dashboard & API Types
// ─────────────────────────────────────────────

/** Dashboard summary stats */
export interface AgentSystemHealth {
  totalAgents: number;
  activeAgents: number;
  pausedAgents: number;
  errorAgents: number;
  totalRunsToday: number;
  successRateToday: number;
  totalCostToday: number;
  unreadBriefings: number;
  cascadeHealth: CascadeHealthStatus;
  topPerformers: AgentRecord[];
  worstPerformers: AgentRecord[];
  recentErrors: AgentRecord[];
}

/** 9-Model Cascade health status */
export interface CascadeHealthStatus {
  geminiExtraction: "healthy" | "degraded" | "down";
  sonnetEvaluator: "healthy" | "degraded" | "down";
  gptSecondary: "healthy" | "degraded" | "down";
  geminiVerification: "healthy" | "degraded" | "down";
  grokMath: "healthy" | "degraded" | "down";
  perplexityCitations: "healthy" | "degraded" | "down";
  tavilySearch: "healthy" | "degraded" | "down";
  opusJudge: "healthy" | "degraded" | "down";
  mistralMultilingual: "healthy" | "degraded" | "down";
}

/** Agent update payload */
export interface AgentUpdatePayload {
  name?: string;
  description?: string;
  status?: AgentStatusType;
  persona?: PersonaType;
  llmModel?: string;
  temperature?: number;
  maxTokens?: number;
  scheduleType?: string;
  scheduleCron?: string | null;
  rateLimitPerMin?: number;
  rateLimitPerDay?: number;
  systemPrompt?: string | null;
}

// ─────────────────────────────────────────────
// Feature Toggle Types
// ─────────────────────────────────────────────

export interface FeatureToggle {
  key: string;
  enabled: boolean;
  description: string | null;
}

export interface SystemAlert {
  id: string;
  source: string;
  severity: SeverityLevel;
  title: string;
  message: string;
  metadata: unknown;
  isRead: boolean;
  createdAt: string;
}
