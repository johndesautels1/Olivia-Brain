/**
 * Custom Persona Configuration
 * Sprint 5.2 — White-Label System (Item 2)
 *
 * Allows tenants to customize AI personas:
 * - Replace Olivia with custom agent name
 * - Custom avatar/voice settings
 * - Custom personality traits
 * - Custom system prompts per persona
 */

import { getTenantContext } from "@/lib/tenant";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PersonaRole = "assistant" | "judge" | "support";

export interface TenantPersona {
  id: string;
  tenantId: string;
  personaCode: string;        // "primary", "judge", "support", or custom
  role: PersonaRole;
  isActive: boolean;
  // Identity
  name: string;
  title: string;              // "AI Relocation Advisor"
  bio: string;
  // Personality
  personality: PersonalityTraits;
  // Avatar
  avatar: AvatarConfig;
  // Voice
  voice: VoiceConfig;
  // LLM
  llmConfig: LLMConfig;
  // Behavior
  behavior: BehaviorConfig;
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface PersonalityTraits {
  /** Core personality keywords */
  traits: string[];           // ["warm", "professional", "decisive"]
  /** Communication style */
  style: "formal" | "professional" | "friendly" | "casual";
  /** Emoji usage level */
  emojiLevel: "none" | "minimal" | "moderate" | "frequent";
  /** Humor level */
  humorLevel: "none" | "subtle" | "moderate" | "playful";
  /** Verbosity */
  verbosity: "concise" | "balanced" | "detailed";
  /** Cultural background notes */
  culturalNotes: string | null;
}

export interface AvatarConfig {
  provider: "simli" | "heygen" | "d_id" | "sadtalker" | "static" | "none";
  avatarId: string | null;
  staticImageUrl: string | null;
  /** Emotion/gesture presets */
  defaultEmotion: string;
  idleAnimation: boolean;
}

export interface VoiceConfig {
  provider: "elevenlabs" | "openai" | "azure" | "none";
  voiceId: string | null;
  /** Voice characteristics */
  pitch: number;              // -20 to +20
  speed: number;              // 0.5 to 2.0
  stability: number;          // 0 to 1
  similarityBoost: number;    // 0 to 1
  /** Language */
  language: string;           // "en-US", "en-GB", etc.
  /** Accent notes */
  accentNotes: string | null;
}

export interface LLMConfig {
  /** Primary model override */
  primaryModel: string | null;
  /** Temperature override */
  temperature: number | null;
  /** Max tokens override */
  maxTokens: number | null;
  /** System prompt additions */
  systemPromptPrefix: string | null;
  systemPromptSuffix: string | null;
}

export interface BehaviorConfig {
  /** Always start with greeting */
  alwaysGreet: boolean;
  /** Include sign-off */
  includeSignOff: boolean;
  /** Ask clarifying questions threshold */
  clarificationThreshold: number;  // 0-1, lower = ask more
  /** Handoff to human threshold */
  handoffThreshold: number;        // 0-1, lower = handoff sooner
  /** Restricted topics */
  restrictedTopics: string[];
  /** Required disclosures */
  requiredDisclosures: string[];
}

// ─── Default Personas ─────────────────────────────────────────────────────────

export const DEFAULT_OLIVIA: Omit<TenantPersona, "id" | "tenantId" | "createdAt" | "updatedAt"> = {
  personaCode: "primary",
  role: "assistant",
  isActive: true,
  name: "Olivia",
  title: "AI Relocation Advisor",
  bio: "Olivia is your dedicated AI relocation advisor, helping you navigate complex decisions about where to live, work, and thrive.",
  personality: {
    traits: ["warm", "professional", "knowledgeable", "decisive", "empathetic"],
    style: "professional",
    emojiLevel: "minimal",
    humorLevel: "subtle",
    verbosity: "balanced",
    culturalNotes: "Multicultural background, lives in London, understands global perspectives",
  },
  avatar: {
    provider: "simli",
    avatarId: null,
    staticImageUrl: null,
    defaultEmotion: "friendly",
    idleAnimation: true,
  },
  voice: {
    provider: "elevenlabs",
    voiceId: null,
    pitch: 0,
    speed: 1.0,
    stability: 0.75,
    similarityBoost: 0.75,
    language: "en-US",
    accentNotes: null,
  },
  llmConfig: {
    primaryModel: null,
    temperature: null,
    maxTokens: null,
    systemPromptPrefix: null,
    systemPromptSuffix: null,
  },
  behavior: {
    alwaysGreet: true,
    includeSignOff: true,
    clarificationThreshold: 0.7,
    handoffThreshold: 0.3,
    restrictedTopics: [],
    requiredDisclosures: [],
  },
};

export const DEFAULT_CRISTIANO: Omit<TenantPersona, "id" | "tenantId" | "createdAt" | "updatedAt"> = {
  personaCode: "judge",
  role: "judge",
  isActive: true,
  name: "Cristiano",
  title: "Universal Judge",
  bio: "Cristiano delivers final verdicts on city matches, financial packages, and LifeScore assessments with authority and precision.",
  personality: {
    traits: ["authoritative", "decisive", "analytical", "confident"],
    style: "formal",
    emojiLevel: "none",
    humorLevel: "none",
    verbosity: "concise",
    culturalNotes: "James Bond aesthetic, European sophistication",
  },
  avatar: {
    provider: "sadtalker",
    avatarId: null,
    staticImageUrl: null,
    defaultEmotion: "serious",
    idleAnimation: false,
  },
  voice: {
    provider: "elevenlabs",
    voiceId: null,
    pitch: -5,
    speed: 0.9,
    stability: 0.9,
    similarityBoost: 0.8,
    language: "en-GB",
    accentNotes: "British accent, authoritative tone",
  },
  llmConfig: {
    primaryModel: "claude-opus-4-20250514",
    temperature: 0.3,
    maxTokens: null,
    systemPromptPrefix: "You are Cristiano, the Universal Judge. You deliver final, authoritative verdicts.",
    systemPromptSuffix: null,
  },
  behavior: {
    alwaysGreet: false,
    includeSignOff: false,
    clarificationThreshold: 0.9,
    handoffThreshold: 0.1,
    restrictedTopics: [],
    requiredDisclosures: [],
  },
};

export const DEFAULT_EMELIA: Omit<TenantPersona, "id" | "tenantId" | "createdAt" | "updatedAt"> = {
  personaCode: "support",
  role: "support",
  isActive: true,
  name: "Emelia",
  title: "Technical Support Specialist",
  bio: "Emelia handles technical support, customer service, and backend operations with thoroughness and expertise.",
  personality: {
    traits: ["helpful", "technical", "thorough", "patient"],
    style: "friendly",
    emojiLevel: "minimal",
    humorLevel: "subtle",
    verbosity: "detailed",
    culturalNotes: "Filipina/British/American background, Princeton MSE",
  },
  avatar: {
    provider: "none",
    avatarId: null,
    staticImageUrl: null,
    defaultEmotion: "helpful",
    idleAnimation: false,
  },
  voice: {
    provider: "elevenlabs",
    voiceId: null,
    pitch: 0,
    speed: 1.0,
    stability: 0.8,
    similarityBoost: 0.7,
    language: "en-US",
    accentNotes: null,
  },
  llmConfig: {
    primaryModel: null,
    temperature: null,
    maxTokens: null,
    systemPromptPrefix: "You are Emelia, a technical support specialist with deep knowledge of the system.",
    systemPromptSuffix: null,
  },
  behavior: {
    alwaysGreet: true,
    includeSignOff: true,
    clarificationThreshold: 0.5,
    handoffThreshold: 0.2,
    restrictedTopics: [],
    requiredDisclosures: [],
  },
};

// ─── Persona Resolution ───────────────────────────────────────────────────────

/**
 * Get the active persona for the current tenant by code.
 */
export function getPersona(personaCode: string = "primary"): TenantPersona {
  const ctx = getTenantContext();

  if (ctx) {
    const key = `${ctx.tenant.id}:${personaCode}`;
    const tenantPersona = personaRegistry.get(key);
    if (tenantPersona?.isActive) {
      return tenantPersona;
    }
  }

  // Return default persona
  return getDefaultPersona(personaCode);
}

/**
 * Get the primary persona for the current tenant.
 */
export function getPrimaryPersona(): TenantPersona {
  return getPersona("primary");
}

/**
 * Get the judge persona for the current tenant.
 */
export function getJudgePersona(): TenantPersona {
  return getPersona("judge");
}

/**
 * Get the support persona for the current tenant.
 */
export function getSupportPersona(): TenantPersona {
  return getPersona("support");
}

/**
 * Get all personas for a tenant.
 */
export async function getTenantPersonas(tenantId: string): Promise<TenantPersona[]> {
  const personas: TenantPersona[] = [];

  for (const [key, persona] of personaRegistry.entries()) {
    if (key.startsWith(`${tenantId}:`)) {
      personas.push(persona);
    }
  }

  // Add defaults if not overridden
  const codes = personas.map(p => p.personaCode);
  if (!codes.includes("primary")) {
    personas.push(getDefaultPersona("primary"));
  }
  if (!codes.includes("judge")) {
    personas.push(getDefaultPersona("judge"));
  }
  if (!codes.includes("support")) {
    personas.push(getDefaultPersona("support"));
  }

  return personas;
}

// ─── Persona CRUD ─────────────────────────────────────────────────────────────

/**
 * Create or update a tenant persona.
 */
export async function savePersona(
  tenantId: string,
  personaCode: string,
  input: Partial<Omit<TenantPersona, "id" | "tenantId" | "personaCode" | "createdAt" | "updatedAt">>
): Promise<TenantPersona> {
  const key = `${tenantId}:${personaCode}`;
  const existing = personaRegistry.get(key);
  const defaults = getDefaultPersonaData(personaCode);

  const persona: TenantPersona = {
    id: existing?.id ?? crypto.randomUUID(),
    tenantId,
    personaCode,
    role: input.role ?? existing?.role ?? defaults.role,
    isActive: input.isActive ?? existing?.isActive ?? true,
    name: input.name ?? existing?.name ?? defaults.name,
    title: input.title ?? existing?.title ?? defaults.title,
    bio: input.bio ?? existing?.bio ?? defaults.bio,
    personality: { ...defaults.personality, ...existing?.personality, ...input.personality },
    avatar: { ...defaults.avatar, ...existing?.avatar, ...input.avatar },
    voice: { ...defaults.voice, ...existing?.voice, ...input.voice },
    llmConfig: { ...defaults.llmConfig, ...existing?.llmConfig, ...input.llmConfig },
    behavior: { ...defaults.behavior, ...existing?.behavior, ...input.behavior },
    createdAt: existing?.createdAt ?? new Date(),
    updatedAt: new Date(),
  };

  personaRegistry.set(key, persona);
  return persona;
}

/**
 * Delete a tenant persona (reverts to default).
 */
export async function deletePersona(tenantId: string, personaCode: string): Promise<void> {
  const key = `${tenantId}:${personaCode}`;
  personaRegistry.delete(key);
}

// ─── System Prompt Generation ─────────────────────────────────────────────────

/**
 * Generate the system prompt for a persona.
 */
export function generatePersonaSystemPrompt(persona: TenantPersona): string {
  const parts: string[] = [];

  // Prefix
  if (persona.llmConfig.systemPromptPrefix) {
    parts.push(persona.llmConfig.systemPromptPrefix);
  }

  // Core identity
  parts.push(`You are ${persona.name}, ${persona.title}.`);
  parts.push(persona.bio);

  // Personality
  parts.push(`\nYour personality traits: ${persona.personality.traits.join(", ")}.`);
  parts.push(`Communication style: ${persona.personality.style}.`);

  if (persona.personality.culturalNotes) {
    parts.push(`Background: ${persona.personality.culturalNotes}`);
  }

  // Behavior rules
  if (persona.behavior.alwaysGreet) {
    parts.push("\nAlways start with a friendly greeting.");
  }

  if (persona.behavior.restrictedTopics.length > 0) {
    parts.push(`\nDo not discuss: ${persona.behavior.restrictedTopics.join(", ")}.`);
  }

  if (persona.behavior.requiredDisclosures.length > 0) {
    parts.push(`\nAlways include these disclosures when relevant: ${persona.behavior.requiredDisclosures.join("; ")}`);
  }

  // Emoji/verbosity
  if (persona.personality.emojiLevel === "none") {
    parts.push("\nDo not use emojis.");
  }

  if (persona.personality.verbosity === "concise") {
    parts.push("\nKeep responses concise and to the point.");
  } else if (persona.personality.verbosity === "detailed") {
    parts.push("\nProvide detailed, thorough explanations.");
  }

  // Suffix
  if (persona.llmConfig.systemPromptSuffix) {
    parts.push(persona.llmConfig.systemPromptSuffix);
  }

  return parts.join("\n");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDefaultPersona(personaCode: string): TenantPersona {
  const defaults = getDefaultPersonaData(personaCode);
  return {
    id: `default_${personaCode}`,
    tenantId: "system",
    personaCode,
    ...defaults,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function getDefaultPersonaData(personaCode: string): Omit<TenantPersona, "id" | "tenantId" | "personaCode" | "createdAt" | "updatedAt"> {
  switch (personaCode) {
    case "judge":
      return DEFAULT_CRISTIANO;
    case "support":
      return DEFAULT_EMELIA;
    default:
      return DEFAULT_OLIVIA;
  }
}

// In-memory registry (production: database)
const personaRegistry = new Map<string, TenantPersona>();

// ─── Service Interface ────────────────────────────────────────────────────────

export interface PersonaService {
  get(code?: string): TenantPersona;
  getPrimary(): TenantPersona;
  getJudge(): TenantPersona;
  getSupport(): TenantPersona;
  getAll(tenantId: string): Promise<TenantPersona[]>;
  save(tenantId: string, code: string, input: Partial<TenantPersona>): Promise<TenantPersona>;
  delete(tenantId: string, code: string): Promise<void>;
  generateSystemPrompt(persona: TenantPersona): string;
}

export function getPersonaService(): PersonaService {
  return {
    get: getPersona,
    getPrimary: getPrimaryPersona,
    getJudge: getJudgePersona,
    getSupport: getSupportPersona,
    getAll: getTenantPersonas,
    save: savePersona,
    delete: deletePersona,
    generateSystemPrompt: generatePersonaSystemPrompt,
  };
}
