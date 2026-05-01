/**
 * Persona System Types
 * Sprint 4.1 — Persona Orchestration Layer
 *
 * Core types for persona management, routing, and multi-modal interaction.
 */

export type PersonaId = "olivia" | "cristiano" | "emelia";
export type PersonaRole = "assistant" | "judge" | "support";
export type InteractionMode = "bilateral" | "unilateral" | "text_only" | "voice_only";

/**
 * Complete persona definition combining identity, behavior, and capabilities.
 */
export interface PersonaDefinition {
  id: PersonaId;
  name: string;
  title: string;
  role: PersonaRole;
  /** Interaction mode defines how the persona communicates */
  interactionMode: InteractionMode;
  /** Visual identity configuration */
  avatar: PersonaAvatarConfig;
  /** Voice synthesis configuration */
  voice: PersonaVoiceConfig;
  /** LLM configuration */
  llm: PersonaLLMConfig;
  /** Behavioral rules */
  behavior: PersonaBehaviorConfig;
  /** System prompt components */
  systemPrompt: PersonaSystemPrompt;
}

export interface PersonaAvatarConfig {
  /** Whether this persona has a video avatar */
  hasVideo: boolean;
  /** Primary avatar provider */
  provider: "simli" | "heygen" | "did" | "sadtalker" | "none";
  /** Provider-specific avatar ID */
  avatarId: string | null;
  /** Fallback providers in order */
  fallbackProviders: string[];
  /** Static image URL for non-video contexts */
  staticImageUrl: string | null;
  /** Default emotion state */
  defaultEmotion: string;
  /** Default gesture state */
  defaultGesture: string;
}

export interface PersonaVoiceConfig {
  /** Primary TTS provider */
  provider: "elevenlabs" | "openai" | "none";
  /** ElevenLabs voice ID */
  elevenlabsVoiceId: string | null;
  /** OpenAI voice name */
  openaiVoice: string;
  /** Voice characteristics */
  pitch: number;
  speed: number;
  stability: number;
  /** Language/accent */
  language: string;
}

export interface PersonaLLMConfig {
  /** Primary model for this persona */
  primaryModel: string;
  /** Provider for primary model */
  primaryProvider: "anthropic" | "openai" | "google" | "xai" | "mistral" | "perplexity" | "groq";
  /** Temperature for responses */
  temperature: number;
  /** Max tokens per response */
  maxTokens: number;
  /** Fallback model */
  fallbackModel: string | null;
  /** Fallback provider */
  fallbackProvider: string | null;
}

export interface PersonaBehaviorConfig {
  /** Always start with greeting */
  alwaysGreet: boolean;
  /** Include sign-off */
  includeSignOff: boolean;
  /** Confidence threshold below which to ask clarifying questions */
  clarificationThreshold: number;
  /** Confidence threshold below which to handoff to human */
  handoffThreshold: number;
  /** Topics this persona cannot discuss */
  restrictedTopics: string[];
  /** Required disclosures to include */
  requiredDisclosures: string[];
  /** Max response length preference */
  responseStyle: "concise" | "balanced" | "detailed";
}

export interface PersonaSystemPrompt {
  /** Core identity statement */
  identity: string;
  /** Role description */
  roleDescription: string;
  /** Personality traits */
  personalityTraits: string[];
  /** Communication style */
  communicationStyle: string;
  /** Constraints and rules */
  constraints: string[];
  /** Custom prefix (tenant-specific) */
  customPrefix: string | null;
  /** Custom suffix (tenant-specific) */
  customSuffix: string | null;
}

/**
 * Request to invoke a persona.
 */
export interface PersonaInvocation {
  personaId: PersonaId;
  /** User message or input */
  input: string;
  /** Conversation context */
  context: PersonaContext;
  /** Requested output modalities */
  outputModalities: OutputModality[];
  /** Session metadata */
  sessionId: string;
  /** Client/user ID */
  clientId: string;
  /** Tenant ID */
  tenantId: string | null;
}

export interface PersonaContext {
  /** Recent conversation turns */
  recentTurns: ConversationTurn[];
  /** Relevant memories */
  memories: string[];
  /** Active knowledge context */
  knowledgeContext: string | null;
  /** Current emotional state */
  emotionalContext: string | null;
  /** Additional metadata */
  metadata: Record<string, unknown>;
}

export interface ConversationTurn {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  personaId?: PersonaId;
}

export type OutputModality = "text" | "audio" | "video" | "avatar_session";

/**
 * Result from persona invocation.
 */
export interface PersonaResponse {
  personaId: PersonaId;
  /** Text response */
  text: string;
  /** Audio response (if requested) */
  audio: ArrayBuffer | null;
  /** Video URL (if requested and available) */
  videoUrl: string | null;
  /** Avatar session info (if requested) */
  avatarSession: AvatarSessionInfo | null;
  /** Response metadata */
  metadata: PersonaResponseMetadata;
}

export interface AvatarSessionInfo {
  sessionId: string;
  provider: string;
  websocketUrl: string | null;
  iceServers: RTCIceServer[] | null;
  expiresAt: Date;
}

export interface RTCIceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface PersonaResponseMetadata {
  model: string;
  provider: string;
  tokensUsed: number;
  latencyMs: number;
  emotionDetected: string | null;
  gestureSelected: string | null;
  confidence: number;
}

/**
 * Persona routing decision.
 */
export interface PersonaRoutingDecision {
  personaId: PersonaId;
  reason: string;
  confidence: number;
  alternativePersonas: Array<{ id: PersonaId; score: number }>;
}

/**
 * Persona health status.
 */
export interface PersonaHealthStatus {
  personaId: PersonaId;
  overall: "healthy" | "degraded" | "unhealthy";
  components: {
    llm: { status: "up" | "down"; latencyMs: number };
    voice: { status: "up" | "down" | "not_configured"; latencyMs: number };
    avatar: { status: "up" | "down" | "not_configured"; latencyMs: number };
  };
  lastChecked: Date;
}
