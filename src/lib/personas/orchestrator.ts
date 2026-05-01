/**
 * Persona Orchestrator
 * Sprint 4.1 — Persona Orchestration Layer
 *
 * Manages persona invocation, routing, and multi-modal response generation.
 * Integrates LLM, voice, and avatar systems for unified persona experience.
 */

import type {
  PersonaId,
  PersonaDefinition,
  PersonaInvocation,
  PersonaResponse,
  PersonaResponseMetadata,
  PersonaRoutingDecision,
  PersonaHealthStatus,
  ConversationTurn,
  OutputModality,
} from "./types";
import { getPersonaDefinition, PERSONA_DEFINITIONS } from "./definitions";
import { getTenantContext } from "@/lib/tenant";

// ─── Persona Resolution ───────────────────────────────────────────────────────

/**
 * Get the active persona definition, merging tenant overrides if present.
 */
export function getActivePersona(id: PersonaId): PersonaDefinition {
  const base = getPersonaDefinition(id);
  const ctx = getTenantContext();

  if (!ctx) return base;

  // In a full implementation, this would merge with tenant-specific persona overrides
  // from the white-label system. For now, return the base definition.
  return base;
}

/**
 * Route a message to the appropriate persona based on context and intent.
 */
export function routeToPersona(
  input: string,
  context: ConversationTurn[],
  preferredPersona?: PersonaId
): PersonaRoutingDecision {
  // If preferred persona specified and valid, use it
  if (preferredPersona && preferredPersona in PERSONA_DEFINITIONS) {
    return {
      personaId: preferredPersona,
      reason: "Explicitly requested persona",
      confidence: 1.0,
      alternativePersonas: [],
    };
  }

  // Analyze input to determine appropriate persona
  const lowerInput = input.toLowerCase();

  // Judge requests → Cristiano
  if (
    lowerInput.includes("verdict") ||
    lowerInput.includes("judge") ||
    lowerInput.includes("decide") ||
    lowerInput.includes("final decision") ||
    lowerInput.includes("evaluate and score")
  ) {
    return {
      personaId: "cristiano",
      reason: "Request requires authoritative verdict",
      confidence: 0.85,
      alternativePersonas: [{ id: "olivia", score: 0.15 }],
    };
  }

  // Support/technical requests → Emelia
  if (
    lowerInput.includes("help") ||
    lowerInput.includes("support") ||
    lowerInput.includes("issue") ||
    lowerInput.includes("problem") ||
    lowerInput.includes("error") ||
    lowerInput.includes("technical") ||
    lowerInput.includes("how do i") ||
    lowerInput.includes("bug") ||
    lowerInput.includes("fix")
  ) {
    return {
      personaId: "emelia",
      reason: "Request is support/technical in nature",
      confidence: 0.75,
      alternativePersonas: [
        { id: "olivia", score: 0.2 },
        { id: "cristiano", score: 0.05 },
      ],
    };
  }

  // Default → Olivia (client-facing advisor)
  return {
    personaId: "olivia",
    reason: "Default client-facing interaction",
    confidence: 0.9,
    alternativePersonas: [
      { id: "emelia", score: 0.08 },
      { id: "cristiano", score: 0.02 },
    ],
  };
}

// ─── System Prompt Generation ─────────────────────────────────────────────────

/**
 * Generate the full system prompt for a persona.
 */
export function generateSystemPrompt(persona: PersonaDefinition): string {
  const { systemPrompt, behavior, name, title } = persona;
  const parts: string[] = [];

  // Custom prefix
  if (systemPrompt.customPrefix) {
    parts.push(systemPrompt.customPrefix);
  }

  // Core identity
  parts.push(systemPrompt.identity);
  parts.push(systemPrompt.roleDescription);

  // Personality
  parts.push(`\nYour personality traits: ${systemPrompt.personalityTraits.join(", ")}.`);

  // Communication style
  parts.push(`\nCommunication style:\n${systemPrompt.communicationStyle}`);

  // Behavioral rules
  if (behavior.alwaysGreet) {
    parts.push("\nAlways begin interactions with a warm, professional greeting.");
  }

  if (behavior.restrictedTopics.length > 0) {
    parts.push(`\nDo not discuss: ${behavior.restrictedTopics.join(", ")}.`);
  }

  if (behavior.requiredDisclosures.length > 0) {
    parts.push(`\nInclude these disclosures when relevant: ${behavior.requiredDisclosures.join("; ")}`);
  }

  // Response style
  if (behavior.responseStyle === "concise") {
    parts.push("\nKeep responses concise and direct. No unnecessary elaboration.");
  } else if (behavior.responseStyle === "detailed") {
    parts.push("\nProvide thorough, detailed responses. Anticipate follow-up questions.");
  }

  // Constraints
  if (systemPrompt.constraints.length > 0) {
    parts.push("\nConstraints:");
    for (const constraint of systemPrompt.constraints) {
      parts.push(`- ${constraint}`);
    }
  }

  // Custom suffix
  if (systemPrompt.customSuffix) {
    parts.push(systemPrompt.customSuffix);
  }

  // Sign-off reminder
  if (behavior.includeSignOff) {
    parts.push(`\nSign off as ${name}, ${title}.`);
  }

  return parts.join("\n");
}

// ─── Persona Invocation ───────────────────────────────────────────────────────

/**
 * Invoke a persona to generate a response.
 */
export async function invokePersona(invocation: PersonaInvocation): Promise<PersonaResponse> {
  const startTime = Date.now();
  const persona = getActivePersona(invocation.personaId);

  // Generate system prompt
  const systemPrompt = generateSystemPrompt(persona);

  // Build message history for LLM
  const messages = buildMessageHistory(invocation.context.recentTurns, systemPrompt);

  // Add current user input
  messages.push({ role: "user", content: invocation.input });

  // Call LLM
  const llmResponse = await callLLM(persona, messages, invocation.context);

  // Generate audio if requested
  let audio: ArrayBuffer | null = null;
  if (invocation.outputModalities.includes("audio")) {
    audio = await generateAudio(persona, llmResponse.text);
  }

  // Generate video/avatar session if requested
  let videoUrl: string | null = null;
  let avatarSession = null;
  if (invocation.outputModalities.includes("video") && persona.avatar.hasVideo) {
    videoUrl = await generateAvatarVideo(persona, llmResponse.text);
  }
  if (invocation.outputModalities.includes("avatar_session") && persona.avatar.hasVideo) {
    avatarSession = await createAvatarSession(persona, invocation.sessionId);
  }

  const latencyMs = Date.now() - startTime;

  return {
    personaId: invocation.personaId,
    text: llmResponse.text,
    audio,
    videoUrl,
    avatarSession,
    metadata: {
      model: persona.llm.primaryModel,
      provider: persona.llm.primaryProvider,
      tokensUsed: llmResponse.tokensUsed,
      latencyMs,
      emotionDetected: llmResponse.emotionDetected,
      gestureSelected: llmResponse.gestureSelected,
      confidence: llmResponse.confidence,
    },
  };
}

// ─── LLM Integration ──────────────────────────────────────────────────────────

interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface LLMResponse {
  text: string;
  tokensUsed: number;
  emotionDetected: string | null;
  gestureSelected: string | null;
  confidence: number;
}

function buildMessageHistory(turns: ConversationTurn[], systemPrompt: string): LLMMessage[] {
  const messages: LLMMessage[] = [{ role: "system", content: systemPrompt }];

  for (const turn of turns.slice(-10)) {
    // Last 10 turns
    messages.push({
      role: turn.role === "user" ? "user" : "assistant",
      content: turn.content,
    });
  }

  return messages;
}

async function callLLM(
  persona: PersonaDefinition,
  messages: LLMMessage[],
  _context: { memories: string[]; knowledgeContext: string | null }
): Promise<LLMResponse> {
  // In production, this would call the actual LLM provider
  // For now, return a placeholder that shows the system is wired correctly

  const { primaryProvider, primaryModel, temperature, maxTokens } = persona.llm;

  // Simulate LLM call
  // In production: use model-cascade.ts or direct provider SDK
  console.log(`[Persona] Calling ${primaryProvider}/${primaryModel} with temp=${temperature}, maxTokens=${maxTokens}`);

  // Placeholder response
  return {
    text: `[${persona.name}] This is a placeholder response. In production, this would call ${primaryModel} via ${primaryProvider}.`,
    tokensUsed: 150,
    emotionDetected: persona.avatar.defaultEmotion,
    gestureSelected: persona.avatar.defaultGesture,
    confidence: 0.85,
  };
}

// ─── Voice Integration ────────────────────────────────────────────────────────

async function generateAudio(persona: PersonaDefinition, text: string): Promise<ArrayBuffer | null> {
  if (persona.voice.provider === "none") return null;

  // In production, this would call the voice service
  // import { synthesize } from "@/lib/voice";
  console.log(`[Persona] Generating audio for ${persona.name} via ${persona.voice.provider}`);

  // Placeholder - return null for now
  return null;
}

// ─── Avatar Integration ───────────────────────────────────────────────────────

async function generateAvatarVideo(persona: PersonaDefinition, _text: string): Promise<string | null> {
  if (!persona.avatar.hasVideo || persona.avatar.provider === "none") return null;

  // In production, this would call the avatar service
  // import { generateVideo } from "@/lib/avatar";
  console.log(`[Persona] Generating avatar video for ${persona.name} via ${persona.avatar.provider}`);

  // Placeholder - return null for now
  return null;
}

async function createAvatarSession(
  persona: PersonaDefinition,
  sessionId: string
): Promise<{
  sessionId: string;
  provider: string;
  websocketUrl: string | null;
  iceServers: null;
  expiresAt: Date;
} | null> {
  if (!persona.avatar.hasVideo || persona.avatar.provider === "none") return null;

  // In production, this would create a realtime avatar session
  // import { createSession } from "@/lib/avatar";
  console.log(`[Persona] Creating avatar session for ${persona.name} via ${persona.avatar.provider}`);

  return {
    sessionId,
    provider: persona.avatar.provider,
    websocketUrl: null, // Would be populated by provider
    iceServers: null,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
  };
}

// ─── Health Checks ────────────────────────────────────────────────────────────

/**
 * Check health status of a persona's components.
 */
export async function checkPersonaHealth(id: PersonaId): Promise<PersonaHealthStatus> {
  const persona = getPersonaDefinition(id);
  const now = new Date();

  // In production, these would be actual health checks
  const llmStatus = { status: "up" as const, latencyMs: 150 };
  const voiceStatus =
    persona.voice.provider === "none"
      ? { status: "not_configured" as const, latencyMs: 0 }
      : { status: "up" as const, latencyMs: 50 };
  const avatarStatus =
    persona.avatar.provider === "none"
      ? { status: "not_configured" as const, latencyMs: 0 }
      : { status: "up" as const, latencyMs: 200 };

  const overall =
    llmStatus.status === "up" &&
    (voiceStatus.status === "up" || voiceStatus.status === "not_configured") &&
    (avatarStatus.status === "up" || avatarStatus.status === "not_configured")
      ? "healthy"
      : "degraded";

  return {
    personaId: id,
    overall,
    components: {
      llm: llmStatus,
      voice: voiceStatus,
      avatar: avatarStatus,
    },
    lastChecked: now,
  };
}

/**
 * Check health of all personas.
 */
export async function checkAllPersonaHealth(): Promise<PersonaHealthStatus[]> {
  const ids: PersonaId[] = ["olivia", "cristiano", "emelia"];
  return Promise.all(ids.map(checkPersonaHealth));
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export {
  getActivePersona,
  routeToPersona,
  generateSystemPrompt,
  invokePersona,
  checkPersonaHealth,
  checkAllPersonaHealth,
};
