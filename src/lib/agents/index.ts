/**
 * OLIVIA BRAIN — Agent System Exports
 *
 * Central export point for the 250-agent autonomous system.
 */

// Types
export * from "./types";

// Registry
export {
  AGENT_GROUPS,
  AGENT_DEFINITIONS,
  getAgentDefinition,
  getAgentsByGroup,
  getAgentsByPersona,
  getAgentsByCascadePosition,
  getGroupDefinition,
} from "./registry";

// Handlers
export {
  type AgentHandler,
  type AgentRunContext,
  type AgentRunResult,
  type AgentLearningOutput,
  type AgentBriefingOutput,
  registerHandler,
  getHandler,
  hasHandler,
  getRegisteredAgentIds,
  getHandlerCount,
} from "./handlers";

// Engine
export {
  type ExecuteAgentOptions,
  type ExecuteAgentResult,
  type BatchExecuteResult,
  executeAgent,
  executeAllActiveAgents,
} from "./engine";
