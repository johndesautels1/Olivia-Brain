/**
 * LiveAvatar API Types — LITE Mode
 *
 * Complete TypeScript types for the LiveAvatar API (api.liveavatar.com).
 * Ported byte-for-byte from London-Tech-Map to preserve exact contracts.
 * Reference: docs/HEYGEN_LTM_CONFIG.md
 */

// ─── API Response Wrapper ───────────────────────────────────────────────────────

export interface LiveAvatarResponse<T = unknown> {
  code: number;
  data: T | null;
  message?: string;
}

// ─── Session Types ──────────────────────────────────────────────────────────────

export type SessionMode = "FULL" | "LITE";

export interface VideoSettings {
  quality: "high" | "medium" | "low";
  encoding: "H264" | "VP8";
}

/** POST /v1/sessions/token — request body for LITE mode */
export interface CreateSessionTokenRequest {
  avatar_id: string;
  mode: SessionMode;
  is_sandbox?: boolean;
  namespace?: string;
  video_settings?: VideoSettings;
  max_session_duration?: number;
}

/** POST /v1/sessions/token — response data */
export interface CreateSessionTokenResponse {
  session_id: string;
  session_token: string;
}

/** POST /v1/sessions/start — response data */
export interface StartSessionResponse {
  session_id: string;
  livekit_url: string;
  livekit_client_token: string;
  livekit_agent_token: string;
  max_session_duration: number;
  ws_url: string;
}

/** POST /v1/sessions/stop — request body */
export interface StopSessionRequest {
  session_id: string;
  reason: SessionEndReason;
}

export type SessionEndReason =
  | "UNKNOWN"
  | "USER_DISCONNECTED"
  | "SERVER_ERROR"
  | "IDLE_TIMEOUT"
  | "NO_CREDITS"
  | "USER_CLOSED"
  | "AVATAR_DELETED"
  | "MAX_DURATION_REACHED"
  | "ZOMBIE_SESSION_REAP";

/** POST /v1/sessions/keep-alive — request body */
export interface KeepAliveRequest {
  session_id: string;
}

// ─── Session List / Detail Types ────────────────────────────────────────────────

export type SessionSource = "DEMO" | "APP" | "API" | "EMBED";

export interface SessionEntry {
  id: string;
  created_at: string;
  updated_at: string;
  duration: number;
  source: SessionSource;
  mode: SessionMode;
  is_sandbox: boolean;
  credits_consumed: number;
}

export interface HistoricSessionEntry extends SessionEntry {
  end_at?: string;
  end_reason?: SessionEndReason | null;
}

// ─── Transcript Types ───────────────────────────────────────────────────────────

export type TranscriptRole = "user" | "avatar";

export interface TranscriptEntry {
  role: TranscriptRole;
  transcript: string;
  absolute_timestamp: number;
  relative_timestamp: number;
}

export interface SessionTranscript {
  session_active: boolean;
  next_timestamp?: number;
  transcript_data: TranscriptEntry[];
}

// ─── Avatar Types ───────────────────────────────────────────────────────────────

export type AvatarType = "IMAGE" | "VIDEO";
export type AvatarStatus = "ACTIVE" | "INIT" | "DEPLOYING" | "FAILED";

export interface DefaultAvatarVoice {
  id: string;
  name: string;
}

export interface Avatar {
  id: string;
  space_id?: string;
  type: AvatarType;
  status: AvatarStatus;
  name: string;
  preview_url?: string;
  is_expired: boolean;
  default_voice?: DefaultAvatarVoice | null;
  created_at: string;
  updated_at: string;
  error_message?: string;
}

// ─── Voice Types ────────────────────────────────────────────────────────────────

export interface Voice {
  id: string;
  name: string;
  description?: string;
  language: string;
  gender: string;
  created_at: string;
  updated_at: string;
  tags: string[];
}

export interface BindThirdPartyVoiceRequest {
  provider_voice_id: string;
  secret_id: string;
  name?: string;
}

export interface BindThirdPartyVoiceResponse {
  voice_id: string;
}

// ─── Context Types ──────────────────────────────────────────────────────────────

export interface ContextLink {
  url: string;
  faq: string;
  id?: string;
}

export interface Context {
  id: string;
  name: string;
  prompt: string;
  opening_text: string;
  links?: ContextLink[];
  created_at: string;
  updated_at: string;
}

export interface CreateContextRequest {
  name: string;
  prompt: string;
  opening_text: string;
  links?: Omit<ContextLink, "id">[];
}

// ─── Secret Types ───────────────────────────────────────────────────────────────

export type SecretType = "OPENAI_API_KEY" | "ELEVENLABS_API_KEY";

export interface Secret {
  id: string;
  secret_name: string;
  secret_type: SecretType;
  created_at?: string;
}

export interface CreateSecretRequest {
  secret_name: string;
  secret_value: string;
  secret_type: SecretType;
}

export interface CreateSecretResponse {
  id: string;
  secret_name: string;
}

// ─── Paginated Response ─────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

// ─── WebSocket Events (LITE Mode) ───────────────────────────────────────────────

/** Commands we SEND via WebSocket */

export interface AgentSpeakCommand {
  type: "agent.speak";
  audio: string; // Base64-encoded PCM 16-bit 24KHz audio, ~1sec chunks, max 1MB
}

export interface AgentSpeakEndCommand {
  type: "agent.speak_end";
  event_id: string;
}

export interface AgentInterruptCommand {
  type: "agent.interrupt";
}

export interface AgentStartListeningCommand {
  type: "agent.start_listening";
  event_id: string;
}

export interface AgentStopListeningCommand {
  type: "agent.stop_listening";
  event_id: string;
}

export interface SessionKeepAliveCommand {
  type: "session.keep_alive";
  event_id: string;
}

export type WebSocketCommand =
  | AgentSpeakCommand
  | AgentSpeakEndCommand
  | AgentInterruptCommand
  | AgentStartListeningCommand
  | AgentStopListeningCommand
  | SessionKeepAliveCommand;

/** Events we RECEIVE via WebSocket */

export type SessionState = "connected" | "connecting" | "closed" | "closing";

export interface SessionStateUpdatedEvent {
  type: "session.state_updated";
  state: SessionState;
}

export interface AgentSpeakStartedEvent {
  type: "agent.speak_started";
  event_id: string;
  task: { id: string };
}

export interface AgentSpeakEndedEvent {
  type: "agent.speak_ended";
  event_id: string;
  task: { id: string };
}

export type WebSocketEvent =
  | SessionStateUpdatedEvent
  | AgentSpeakStartedEvent
  | AgentSpeakEndedEvent;

// ─── Frontend Session Config ────────────────────────────────────────────────────

/** Config passed to the frontend for initializing LiveAvatarSession SDK */
export interface LiveAvatarClientConfig {
  sessionToken: string;
  sessionId: string;
  wsUrl: string;
  livekitUrl: string;
  livekitClientToken: string;
  maxSessionDuration: number;
}
