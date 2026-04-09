/**
 * OLIVIA BRAIN - LIVEKIT WEBRTC INTEGRATION
 * ==========================================
 *
 * Browser-based realtime sessions using LiveKit.
 *
 * LiveKit Features:
 * - WebRTC-based low-latency audio/video
 * - Room-based architecture for multi-party
 * - Server-side audio processing support
 * - Recording and streaming capabilities
 *
 * Use Cases:
 * - Browser-based Olivia conversations
 * - Video avatar sessions
 * - Multi-participant meetings with AI
 */

import { getServerEnv } from "@/lib/config/env";
import { withTraceSpan } from "@/lib/observability/tracer";
import type {
  RealtimeSession,
  LiveKitSessionConfig,
  SessionStatus,
} from "./types";

export function isLiveKitConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.LIVEKIT_API_KEY && env.LIVEKIT_API_SECRET);
}

interface LiveKitTokenClaims {
  sub: string;
  iss: string;
  exp: number;
  nbf: number;
  video?: {
    room: string;
    roomJoin: boolean;
    canPublish: boolean;
    canSubscribe: boolean;
    canPublishData: boolean;
  };
}

/**
 * Generate a LiveKit access token for a participant
 */
export async function generateLiveKitToken(
  config: LiveKitSessionConfig
): Promise<string> {
  const env = getServerEnv();

  if (!env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) {
    throw new Error("LiveKit API key and secret not configured");
  }

  const roomName = config.roomName ?? `olivia-${Date.now()}`;
  const participantName = config.participantName ?? `user-${Date.now()}`;
  const ttl = config.ttl ?? 3600;

  const now = Math.floor(Date.now() / 1000);
  const exp = now + ttl;

  const claims: LiveKitTokenClaims = {
    sub: participantName,
    iss: env.LIVEKIT_API_KEY,
    exp,
    nbf: now,
    video: {
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    },
  };

  // Simple JWT encoding (in production, use a proper JWT library)
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(claims)).toString("base64url");

  const crypto = await import("crypto");
  const signature = crypto
    .createHmac("sha256", env.LIVEKIT_API_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Create a LiveKit room for a realtime session
 */
export async function createLiveKitSession(
  config: LiveKitSessionConfig
): Promise<RealtimeSession> {
  const env = getServerEnv();

  if (!env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) {
    throw new Error("LiveKit credentials not configured");
  }

  const sessionId = `lk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const roomName = config.roomName ?? `olivia-${sessionId}`;

  const session = await withTraceSpan(
    "olivia.livekit_create_session",
    {
      "olivia.persona": config.personaId,
      "olivia.room": roomName,
      "olivia.mode": config.mode ?? "voice-video",
    },
    async () => {
      // Generate token for the user
      const userToken = await generateLiveKitToken({
        ...config,
        roomName,
        participantName: `user-${sessionId}`,
      });

      // Generate token for the Olivia agent
      const agentToken = await generateLiveKitToken({
        ...config,
        roomName,
        participantName: `olivia-${config.personaId}`,
      });

      return {
        sessionId,
        roomName,
        userToken,
        agentToken,
      };
    }
  );

  return {
    sessionId: session.sessionId,
    personaId: config.personaId,
    provider: "livekit",
    mode: config.mode ?? "voice-video",
    status: "initializing",
    createdAt: new Date(),
    roomName: session.roomName,
  };
}

/**
 * Get LiveKit room connection details
 */
export async function getLiveKitConnectionInfo(
  config: LiveKitSessionConfig
): Promise<{
  wsUrl: string;
  token: string;
  roomName: string;
}> {
  const env = getServerEnv();

  if (!env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) {
    throw new Error("LiveKit credentials not configured");
  }

  const roomName = config.roomName ?? `olivia-${Date.now()}`;
  const token = await generateLiveKitToken({
    ...config,
    roomName,
  });

  // LiveKit Cloud URL format
  const wsUrl = `wss://${env.LIVEKIT_API_KEY}.livekit.cloud`;

  return {
    wsUrl,
    token,
    roomName,
  };
}

/**
 * Close a LiveKit room/session
 */
export async function closeLiveKitSession(roomName: string): Promise<void> {
  const env = getServerEnv();

  if (!env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) {
    throw new Error("LiveKit credentials not configured");
  }

  // In a full implementation, this would call the LiveKit API to close the room
  // For now, rooms auto-close when empty
  console.log(`[LiveKit] Session ${roomName} marked for closure`);
}

/**
 * LiveKit webhook event types
 */
export type LiveKitWebhookEvent =
  | "room_started"
  | "room_finished"
  | "participant_joined"
  | "participant_left"
  | "track_published"
  | "track_unpublished"
  | "egress_started"
  | "egress_ended";

export interface LiveKitWebhookPayload {
  event: LiveKitWebhookEvent;
  room?: {
    name: string;
    sid: string;
    creationTime: number;
  };
  participant?: {
    identity: string;
    sid: string;
    joinedAt: number;
  };
  track?: {
    sid: string;
    type: "audio" | "video" | "data";
    source: "camera" | "microphone" | "screen_share";
  };
}

/**
 * Verify LiveKit webhook signature
 */
export function verifyLiveKitWebhook(
  payload: string,
  signature: string
): boolean {
  const env = getServerEnv();

  if (!env.LIVEKIT_API_SECRET) {
    return false;
  }

  const crypto = require("crypto");
  const expectedSignature = crypto
    .createHmac("sha256", env.LIVEKIT_API_SECRET)
    .update(payload)
    .digest("base64");

  return signature === expectedSignature;
}
