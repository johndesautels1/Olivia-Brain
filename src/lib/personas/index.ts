/**
 * Persona System
 * Sprint 4.1 — Persona Orchestration Layer
 *
 * Complete persona infrastructure for Olivia Brain:
 * - Olivia™: Client-facing avatar executive
 * - Cristiano™: Universal Judge (unilateral verdicts)
 * - Emelia™: Back-end support beast (no video)
 */

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  PersonaId,
  PersonaRole,
  InteractionMode,
  PersonaDefinition,
  PersonaAvatarConfig,
  PersonaVoiceConfig,
  PersonaLLMConfig,
  PersonaBehaviorConfig,
  PersonaSystemPrompt,
  PersonaInvocation,
  PersonaContext,
  ConversationTurn,
  OutputModality,
  PersonaResponse,
  AvatarSessionInfo,
  RTCIceServer,
  PersonaResponseMetadata,
  PersonaRoutingDecision,
  PersonaHealthStatus,
} from "./types";

// ─── Definitions ──────────────────────────────────────────────────────────────
export {
  OLIVIA_PERSONA,
  CRISTIANO_PERSONA,
  EMELIA_PERSONA,
  PERSONA_DEFINITIONS,
  getPersonaDefinition,
  getAllPersonaDefinitions,
  getPersonaByRole,
} from "./definitions";

// ─── Orchestrator ─────────────────────────────────────────────────────────────
export {
  getActivePersona,
  routeToPersona,
  generateSystemPrompt,
  invokePersona,
  checkPersonaHealth,
  checkAllPersonaHealth,
} from "./orchestrator";

// ─── Olivia Handler ───────────────────────────────────────────────────────────
export {
  classifyOliviaIntent,
  getOliviaGreeting,
  selectOliviaEmotion,
  invokeOlivia,
  handleOliviaAssessment,
  type OliviaIntent,
} from "./handlers/olivia";

// ─── Cristiano Handler ────────────────────────────────────────────────────────
export {
  requestVerdict,
  judgeCityMatch,
  judgeLifeScore,
  judgeComparison,
  generateVerdictPresentation,
  type VerdictType,
  type VerdictRequest,
  type VerdictCriteria,
  type Verdict,
} from "./handlers/cristiano";

// ─── Emelia Handler ───────────────────────────────────────────────────────────
export {
  classifySupportCategory,
  determinePriority,
  shouldEscalate,
  getInitialResponse,
  invokeEmelia,
  createSupportTicket,
  searchKnowledgeBase,
  generateTroubleshootingSteps,
  checkSystemStatus,
  type SupportCategory,
  type TicketPriority,
  type SupportTicket,
} from "./handlers/emelia";

// ─── Unified Persona Service ──────────────────────────────────────────────────

import type { PersonaId, PersonaInvocation, PersonaResponse, PersonaHealthStatus, PersonaRoutingDecision, ConversationTurn } from "./types";
import { getActivePersona, routeToPersona, invokePersona, checkPersonaHealth, checkAllPersonaHealth, generateSystemPrompt } from "./orchestrator";
import { invokeOlivia, handleOliviaAssessment } from "./handlers/olivia";
import { requestVerdict, judgeCityMatch, judgeLifeScore, judgeComparison, type Verdict, type VerdictRequest } from "./handlers/cristiano";
import { invokeEmelia, createSupportTicket, type SupportTicket, type SupportCategory } from "./handlers/emelia";

export interface PersonaService {
  // Core
  getPersona(id: PersonaId): ReturnType<typeof getActivePersona>;
  routeMessage(input: string, context: ConversationTurn[], preferred?: PersonaId): PersonaRoutingDecision;
  invoke(invocation: PersonaInvocation): Promise<PersonaResponse>;
  generatePrompt(id: PersonaId): string;
  checkHealth(id: PersonaId): Promise<PersonaHealthStatus>;
  checkAllHealth(): Promise<PersonaHealthStatus[]>;

  // Olivia-specific
  olivia: {
    invoke(input: string, context: ConversationTurn[], options: Parameters<typeof invokeOlivia>[2]): Promise<PersonaResponse>;
    handleAssessment(stage: Parameters<typeof handleOliviaAssessment>[0], data: Parameters<typeof handleOliviaAssessment>[1]): Promise<string>;
  };

  // Cristiano-specific
  cristiano: {
    requestVerdict(request: VerdictRequest): Promise<Verdict>;
    judgeCityMatch: typeof judgeCityMatch;
    judgeLifeScore: typeof judgeLifeScore;
    judgeComparison: typeof judgeComparison;
  };

  // Emelia-specific
  emelia: {
    invoke(input: string, context: ConversationTurn[], options: Parameters<typeof invokeEmelia>[2]): Promise<PersonaResponse>;
    createTicket(subject: string, description: string, category: SupportCategory, context: ConversationTurn[], session: { clientId: string; tenantId: string | null }): SupportTicket;
  };
}

/**
 * Get the unified persona service.
 */
export function getPersonaService(): PersonaService {
  return {
    getPersona: getActivePersona,
    routeMessage: routeToPersona,
    invoke: invokePersona,
    generatePrompt: (id) => generateSystemPrompt(getActivePersona(id)),
    checkHealth: checkPersonaHealth,
    checkAllHealth: checkAllPersonaHealth,

    olivia: {
      invoke: invokeOlivia,
      handleAssessment: handleOliviaAssessment,
    },

    cristiano: {
      requestVerdict,
      judgeCityMatch,
      judgeLifeScore,
      judgeComparison,
    },

    emelia: {
      invoke: invokeEmelia,
      createTicket: createSupportTicket,
    },
  };
}
