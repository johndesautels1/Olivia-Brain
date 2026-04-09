/**
 * OLIVIA BRAIN - AVATAR TYPES
 * ============================
 *
 * Shared types for avatar generation and rendering.
 *
 * Avatar Providers:
 * - Simli: Primary realtime avatar for Olivia™
 * - SadTalker (Replicate): Judge presentations for Cristiano™
 * - HeyGen: Fallback + async branded video
 * - D-ID: Fallback interactive avatar
 */

import type { PersonaId } from "@/lib/voice/types";

export type AvatarProvider = "simli" | "sadtalker" | "heygen" | "did";

export type EmotionState =
  | "neutral"
  | "happy"
  | "confident"
  | "thoughtful"
  | "concerned"
  | "emphatic"
  | "welcoming";

export type GestureState =
  | "idle"
  | "speaking"
  | "listening"
  | "nodding"
  | "thinking"
  | "presenting"
  | "emphasizing";

export interface AvatarIdentity {
  personaId: PersonaId;
  name: string;
  role: string;
  visualDescription: string;
  voiceCharacteristics: string;
  defaultEmotion: EmotionState;
  defaultGesture: GestureState;
  primaryProvider: AvatarProvider;
  fallbackProviders: AvatarProvider[];
  allowedEmotions: EmotionState[];
  allowedGestures: GestureState[];
}

export interface AvatarSessionConfig {
  personaId: PersonaId;
  provider?: AvatarProvider;
  emotion?: EmotionState;
  gesture?: GestureState;
  audioSource?: "elevenlabs" | "openai";
}

export interface AvatarSession {
  sessionId: string;
  personaId: PersonaId;
  provider: AvatarProvider;
  status: "initializing" | "ready" | "speaking" | "listening" | "ended" | "error";
  createdAt: Date;
  videoStreamUrl?: string;
  audioStreamUrl?: string;
}

export interface AvatarVideoRequest {
  personaId: PersonaId;
  text: string;
  emotion?: EmotionState;
  gesture?: GestureState;
  outputFormat?: "mp4" | "webm";
}

export interface AvatarVideoResult {
  videoUrl: string;
  durationMs: number;
  provider: AvatarProvider;
  personaId: PersonaId;
}

export interface RealtimeAvatarConfig {
  personaId: PersonaId;
  onVideoFrame?: (frame: ArrayBuffer) => void;
  onAudioChunk?: (chunk: ArrayBuffer) => void;
  onStateChange?: (state: AvatarSession["status"]) => void;
  onError?: (error: Error) => void;
}

export interface AvatarServiceStatus {
  simli: { configured: boolean; available: boolean };
  sadtalker: { configured: boolean; available: boolean };
  heygen: { configured: boolean; available: boolean };
  did: { configured: boolean; available: boolean };
}
