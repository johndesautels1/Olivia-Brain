/**
 * OLIVIA BRAIN - REALTIME TRANSPORT TYPES
 * ========================================
 *
 * Shared types for realtime voice and video transport.
 *
 * Transport Providers:
 * - LiveKit: Browser WebRTC sessions
 * - Twilio ConversationRelay: AI phone calls
 * - Vapi: Inbound phone AI agents
 * - Retell: Outbound voice agents
 */

import type { PersonaId } from "@/lib/voice/types";

export type TransportProvider = "livekit" | "twilio" | "vapi" | "retell";

export type SessionMode = "voice-only" | "voice-video" | "text-only";

export type SessionStatus =
  | "initializing"
  | "connecting"
  | "connected"
  | "speaking"
  | "listening"
  | "processing"
  | "disconnected"
  | "error";

export interface RealtimeSession {
  sessionId: string;
  personaId: PersonaId;
  provider: TransportProvider;
  mode: SessionMode;
  status: SessionStatus;
  createdAt: Date;
  connectedAt?: Date;
  participantId?: string;
  roomName?: string;
  phoneNumber?: string;
  callSid?: string;
}

export interface RealtimeSessionConfig {
  personaId: PersonaId;
  mode?: SessionMode;
  provider?: TransportProvider;
  phoneNumber?: string;
  webhookUrl?: string;
  metadata?: Record<string, string>;
}

export interface LiveKitSessionConfig extends RealtimeSessionConfig {
  roomName?: string;
  participantName?: string;
  ttl?: number;
}

export interface TwilioSessionConfig extends RealtimeSessionConfig {
  toNumber: string;
  fromNumber?: string;
  statusCallback?: string;
  recordingEnabled?: boolean;
}

export interface VapiSessionConfig extends RealtimeSessionConfig {
  assistantId?: string;
  firstMessage?: string;
  voiceId?: string;
}

export interface RetellSessionConfig extends RealtimeSessionConfig {
  toNumber: string;
  fromNumber?: string;
  agentId?: string;
  metadata?: Record<string, string>;
}

export interface RealtimePipelineMetrics {
  sttLatencyMs: number;
  llmLatencyMs: number;
  ttsLatencyMs: number;
  avatarLatencyMs?: number;
  totalLatencyMs: number;
  ttfbMs: number;
}

export interface TransportServiceStatus {
  livekit: { configured: boolean; available: boolean };
  twilio: { configured: boolean; available: boolean };
  vapi: { configured: boolean; available: boolean };
  retell: { configured: boolean; available: boolean };
}

export interface AudioChunk {
  data: ArrayBuffer;
  sampleRate: number;
  channels: number;
  format: "pcm" | "opus" | "mp3";
  timestamp: number;
}

export interface TranscriptEvent {
  text: string;
  isFinal: boolean;
  confidence: number;
  timestamp: number;
  speaker?: "user" | "agent";
}

export interface RealtimeCallbacks {
  onConnected?: (session: RealtimeSession) => void;
  onDisconnected?: (reason?: string) => void;
  onTranscript?: (event: TranscriptEvent) => void;
  onAgentSpeaking?: (text: string) => void;
  onAgentDone?: () => void;
  onError?: (error: Error) => void;
  onMetrics?: (metrics: RealtimePipelineMetrics) => void;
}
