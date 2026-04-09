/**
 * OLIVIA BRAIN - AVATAR IDENTITY BIBLE
 * =====================================
 *
 * Canonical definitions for each persona's avatar identity.
 * This is the source of truth for visual appearance, behavior, and personality.
 *
 * GOVERNING PRINCIPLE:
 * "The avatar is the face, not the brain."
 * Intelligence lives in the orchestration layer. Avatars are presentation surfaces.
 */

import type { AvatarIdentity, EmotionState, GestureState } from "./types";

/**
 * OLIVIA™ - Client-Facing Executive Avatar
 *
 * The primary interface for all bilateral client communication.
 * Warm, professional, and engaging. "Ask Olivia" everywhere.
 */
export const OLIVIA_IDENTITY: AvatarIdentity = {
  personaId: "olivia",
  name: "Olivia™",
  role: "Client-Facing Executive Avatar",
  visualDescription: `
    Professional woman in her early 30s with warm, approachable features.
    Well-groomed appearance suggesting competence and trustworthiness.
    Business professional attire - typically a blazer in brand colors.
    Soft, natural lighting that conveys warmth and accessibility.
    Background suggests a modern, upscale office environment.
  `.trim(),
  voiceCharacteristics: `
    Warm and conversational tone with professional clarity.
    Moderate pace that conveys confidence without rushing.
    Subtle expressiveness that engages without overwhelming.
    American English with clear articulation.
  `.trim(),
  defaultEmotion: "welcoming",
  defaultGesture: "idle",
  primaryProvider: "simli",
  fallbackProviders: ["heygen", "did"],
  allowedEmotions: ["neutral", "happy", "confident", "thoughtful", "concerned", "emphatic", "welcoming"],
  allowedGestures: ["idle", "speaking", "listening", "nodding", "thinking", "emphasizing"],
};

/**
 * CRISTIANO™ - THE JUDGE
 *
 * Universal Judge for final verdicts. UNILATERAL ONLY - no interaction.
 * Authoritative, confident, and decisive. James Bond aesthetic.
 */
export const CRISTIANO_IDENTITY: AvatarIdentity = {
  personaId: "cristiano",
  name: "Cristiano™",
  role: "THE JUDGE - Universal Verdict Authority",
  visualDescription: `
    Distinguished man in his 40s with commanding presence.
    Sharp, tailored suit suggesting authority and sophistication.
    James Bond aesthetic - confident, decisive, elegant.
    Dramatic lighting with subtle shadows for gravitas.
    Background suggests a sophisticated executive setting.
    Minimal movement - every gesture is deliberate and meaningful.
  `.trim(),
  voiceCharacteristics: `
    Deep, authoritative tone with measured delivery.
    Slower pace that commands attention and conveys finality.
    Minimal vocal variation - statements, not questions.
    British-influenced English suggesting refinement.
  `.trim(),
  defaultEmotion: "confident",
  defaultGesture: "presenting",
  primaryProvider: "sadtalker",
  fallbackProviders: ["heygen", "did"],
  // Cristiano has limited emotional range - always authoritative
  allowedEmotions: ["neutral", "confident", "thoughtful"],
  // Cristiano has limited gestures - always deliberate
  allowedGestures: ["idle", "speaking", "presenting"],
};

/**
 * EMELIA™ - Back-End Support Beast
 *
 * NO VIDEO - voice and text only.
 * Customer service, tech support, full architecture knowledge.
 */
export const EMELIA_IDENTITY: AvatarIdentity = {
  personaId: "emelia",
  name: "Emelia™",
  role: "Back-End Support Specialist",
  visualDescription: `
    NO VIDEO AVATAR - Emelia is voice and text only.
    If visual representation needed, use a branded graphic/icon.
    Color scheme: supportive, technical, efficient.
  `.trim(),
  voiceCharacteristics: `
    Clear, helpful tone with efficient pacing.
    Technical precision without being cold.
    Patient and thorough in explanations.
    Neutral accent with clear articulation.
  `.trim(),
  defaultEmotion: "neutral",
  defaultGesture: "idle",
  primaryProvider: "simli", // Won't be used - voice only
  fallbackProviders: [],
  allowedEmotions: ["neutral", "happy", "thoughtful"],
  allowedGestures: ["idle"], // No gestures - voice only
};

export const AVATAR_IDENTITIES: Record<string, AvatarIdentity> = {
  olivia: OLIVIA_IDENTITY,
  cristiano: CRISTIANO_IDENTITY,
  emelia: EMELIA_IDENTITY,
};

export function getAvatarIdentity(personaId: string): AvatarIdentity | undefined {
  return AVATAR_IDENTITIES[personaId];
}

export function getAllAvatarIdentities(): AvatarIdentity[] {
  return Object.values(AVATAR_IDENTITIES);
}

export function getDefaultEmotion(personaId: string): EmotionState {
  return AVATAR_IDENTITIES[personaId]?.defaultEmotion ?? "neutral";
}

export function getDefaultGesture(personaId: string): GestureState {
  return AVATAR_IDENTITIES[personaId]?.defaultGesture ?? "idle";
}

export function isEmotionAllowed(personaId: string, emotion: EmotionState): boolean {
  const identity = AVATAR_IDENTITIES[personaId];
  return identity?.allowedEmotions.includes(emotion) ?? false;
}

export function isGestureAllowed(personaId: string, gesture: GestureState): boolean {
  const identity = AVATAR_IDENTITIES[personaId];
  return identity?.allowedGestures.includes(gesture) ?? false;
}
