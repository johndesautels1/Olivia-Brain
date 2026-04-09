/**
 * OLIVIA BRAIN - UNIFIED REALTIME TRANSPORT
 * ==========================================
 *
 * Single entry point for all realtime transport services.
 *
 * Transport Providers:
 * - LiveKit: Browser WebRTC sessions (primary for web)
 * - Twilio: Phone calls via ConversationRelay
 * - Vapi: Inbound phone AI agents
 * - Retell: Outbound voice agents
 *
 * Pipeline Target: sub-800ms TTFB
 * STT (~150ms) → LLM (~300ms) → TTS (~100ms) → Avatar (~50ms)
 */

export * from "./types";
export * from "./livekit";
export * from "./twilio-relay";
export * from "./vapi";
export * from "./retell";
export * from "./pipeline";

import type {
  TransportProvider,
  TransportServiceStatus,
  RealtimeSession,
  RealtimeSessionConfig,
  SessionMode,
} from "./types";
import { isLiveKitConfigured, createLiveKitSession, getLiveKitConnectionInfo } from "./livekit";
import { isTwilioConfigured, initiateOutboundCall } from "./twilio-relay";
import { isVapiConfigured, handleVapiInboundCall } from "./vapi";
import { isRetellConfigured, initiateRetellCall } from "./retell";
import { processPipelineTurn, processVoiceOnlyTurn, processTextTurn } from "./pipeline";

export function getTransportServiceStatus(): TransportServiceStatus {
  return {
    livekit: {
      configured: isLiveKitConfigured(),
      available: isLiveKitConfigured(),
    },
    twilio: {
      configured: isTwilioConfigured(),
      available: isTwilioConfigured(),
    },
    vapi: {
      configured: isVapiConfigured(),
      available: isVapiConfigured(),
    },
    retell: {
      configured: isRetellConfigured(),
      available: isRetellConfigured(),
    },
  };
}

function getAvailableProviders(): TransportProvider[] {
  const available: TransportProvider[] = [];

  if (isLiveKitConfigured()) available.push("livekit");
  if (isTwilioConfigured()) available.push("twilio");
  if (isVapiConfigured()) available.push("vapi");
  if (isRetellConfigured()) available.push("retell");

  return available;
}

/**
 * Select the best transport provider based on mode and configuration
 */
export function selectTransportProvider(
  mode: SessionMode,
  preferredProvider?: TransportProvider
): TransportProvider | null {
  const available = getAvailableProviders();

  // If preferred provider is available, use it
  if (preferredProvider && available.includes(preferredProvider)) {
    return preferredProvider;
  }

  // Select based on mode
  switch (mode) {
    case "voice-video":
      // For video, prefer LiveKit
      if (available.includes("livekit")) return "livekit";
      break;

    case "voice-only":
      // For voice-only, prefer phone providers
      if (available.includes("twilio")) return "twilio";
      if (available.includes("vapi")) return "vapi";
      if (available.includes("retell")) return "retell";
      if (available.includes("livekit")) return "livekit";
      break;

    case "text-only":
      // For text, any provider works (audio is optional)
      if (available.includes("livekit")) return "livekit";
      break;
  }

  // Return first available
  return available[0] ?? null;
}

/**
 * Create a realtime session with automatic provider selection
 */
export async function createRealtimeSession(
  config: RealtimeSessionConfig
): Promise<RealtimeSession> {
  const mode = config.mode ?? "voice-video";
  const provider = config.provider ?? selectTransportProvider(mode);

  if (!provider) {
    throw new Error("No realtime transport provider configured");
  }

  switch (provider) {
    case "livekit":
      return createLiveKitSession({
        ...config,
        mode,
      });

    case "twilio":
      if (!config.phoneNumber) {
        throw new Error("Phone number required for Twilio sessions");
      }
      return initiateOutboundCall({
        ...config,
        toNumber: config.phoneNumber,
        mode,
      });

    case "vapi":
      return handleVapiInboundCall({
        ...config,
        mode,
      });

    case "retell":
      if (!config.phoneNumber) {
        throw new Error("Phone number required for Retell sessions");
      }
      return initiateRetellCall({
        ...config,
        toNumber: config.phoneNumber,
        mode,
      });

    default:
      throw new Error(`Unknown transport provider: ${provider}`);
  }
}

/**
 * Get WebRTC connection info for browser clients
 */
export async function getWebRTCConnectionInfo(
  config: RealtimeSessionConfig & { roomName?: string; participantName?: string }
): Promise<{
  wsUrl: string;
  token: string;
  roomName: string;
}> {
  if (!isLiveKitConfigured()) {
    throw new Error("LiveKit not configured for WebRTC connections");
  }

  return getLiveKitConnectionInfo({
    ...config,
    roomName: config.roomName,
    participantName: config.participantName,
  });
}

// Re-export pipeline functions for convenience
export { processPipelineTurn, processVoiceOnlyTurn, processTextTurn };
