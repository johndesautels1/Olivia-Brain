/**
 * OLIVIA BRAIN - SIMLI AVATAR INTEGRATION
 * ========================================
 *
 * Primary realtime avatar provider for Olivia™.
 *
 * Simli Features:
 * - Real-time lip sync with audio input
 * - Low-latency video streaming
 * - Custom avatar configuration
 * - WebRTC-ready output
 *
 * Integration with voice layer:
 * - Receives audio from ElevenLabs/OpenAI TTS
 * - Generates synchronized video frames
 * - Outputs to LiveKit/WebRTC transport
 */

import { getServerEnv } from "@/lib/config/env";
import { withTraceSpan } from "@/lib/observability/tracer";
import type {
  AvatarSession,
  AvatarVideoRequest,
  AvatarVideoResult,
  RealtimeAvatarConfig,
  EmotionState,
} from "./types";
import { getAvatarIdentity } from "./identity";

const SIMLI_API_BASE = "https://api.simli.ai/v1";

export function isSimliConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.SIMLI_API_KEY);
}

interface SimliAvatarConfig {
  faceId: string;
  voiceId?: string;
  emotion?: string;
  background?: string;
}

// Simli face IDs for each persona (these would be configured in Simli dashboard)
const SIMLI_FACE_IDS: Record<string, string> = {
  olivia: "olivia-professional-v1",
  cristiano: "cristiano-judge-v1",
  emelia: "emelia-support-v1",
};

function getSimliFaceId(personaId: string): string {
  return SIMLI_FACE_IDS[personaId] ?? SIMLI_FACE_IDS.olivia;
}

function emotionToSimliExpression(emotion: EmotionState): string {
  const mapping: Record<EmotionState, string> = {
    neutral: "neutral",
    happy: "happy",
    confident: "confident",
    thoughtful: "thoughtful",
    concerned: "concerned",
    emphatic: "excited",
    welcoming: "friendly",
  };
  return mapping[emotion] ?? "neutral";
}

export async function createSimliSession(
  config: RealtimeAvatarConfig
): Promise<AvatarSession> {
  const env = getServerEnv();

  if (!env.SIMLI_API_KEY) {
    throw new Error("Simli API key not configured");
  }

  const identity = getAvatarIdentity(config.personaId);
  if (!identity) {
    throw new Error(`Unknown persona: ${config.personaId}`);
  }

  const sessionId = `simli-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const session = await withTraceSpan(
    "olivia.simli_create_session",
    {
      "olivia.persona": config.personaId,
      "olivia.session_id": sessionId,
    },
    async () => {
      const response = await fetch(`${SIMLI_API_BASE}/sessions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.SIMLI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          face_id: getSimliFaceId(config.personaId),
          expression: emotionToSimliExpression(identity.defaultEmotion),
          output_format: "webrtc",
          audio_format: "pcm_16000",
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Simli API error: ${response.status} - ${error}`);
      }

      return response.json();
    }
  );

  return {
    sessionId: session.session_id ?? sessionId,
    personaId: config.personaId,
    provider: "simli",
    status: "initializing",
    createdAt: new Date(),
    videoStreamUrl: session.video_url,
    audioStreamUrl: session.audio_url,
  };
}

export async function sendAudioToSimli(
  sessionId: string,
  audioChunk: ArrayBuffer
): Promise<void> {
  const env = getServerEnv();

  if (!env.SIMLI_API_KEY) {
    throw new Error("Simli API key not configured");
  }

  await fetch(`${SIMLI_API_BASE}/sessions/${sessionId}/audio`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.SIMLI_API_KEY}`,
      "Content-Type": "audio/pcm",
    },
    body: audioChunk,
  });
}

export async function updateSimliEmotion(
  sessionId: string,
  emotion: EmotionState
): Promise<void> {
  const env = getServerEnv();

  if (!env.SIMLI_API_KEY) {
    throw new Error("Simli API key not configured");
  }

  await fetch(`${SIMLI_API_BASE}/sessions/${sessionId}/expression`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${env.SIMLI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      expression: emotionToSimliExpression(emotion),
      transition_duration: 300,
    }),
  });
}

export async function endSimliSession(sessionId: string): Promise<void> {
  const env = getServerEnv();

  if (!env.SIMLI_API_KEY) {
    throw new Error("Simli API key not configured");
  }

  await fetch(`${SIMLI_API_BASE}/sessions/${sessionId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${env.SIMLI_API_KEY}`,
    },
  });
}

export async function generateSimliVideo(
  request: AvatarVideoRequest
): Promise<AvatarVideoResult> {
  const env = getServerEnv();

  if (!env.SIMLI_API_KEY) {
    throw new Error("Simli API key not configured");
  }

  const identity = getAvatarIdentity(request.personaId);
  const emotion = request.emotion ?? identity?.defaultEmotion ?? "neutral";

  const startTime = Date.now();

  const result = await withTraceSpan(
    "olivia.simli_generate_video",
    {
      "olivia.persona": request.personaId,
      "olivia.emotion": emotion,
      "olivia.text_length": request.text.length,
    },
    async () => {
      const response = await fetch(`${SIMLI_API_BASE}/videos`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.SIMLI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          face_id: getSimliFaceId(request.personaId),
          text: request.text,
          expression: emotionToSimliExpression(emotion),
          output_format: request.outputFormat ?? "mp4",
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Simli API error: ${response.status} - ${error}`);
      }

      return response.json();
    }
  );

  return {
    videoUrl: result.video_url,
    durationMs: Date.now() - startTime,
    provider: "simli",
    personaId: request.personaId,
  };
}

export async function getSimliSessionStatus(
  sessionId: string
): Promise<AvatarSession["status"]> {
  const env = getServerEnv();

  if (!env.SIMLI_API_KEY) {
    throw new Error("Simli API key not configured");
  }

  const response = await fetch(`${SIMLI_API_BASE}/sessions/${sessionId}`, {
    headers: {
      Authorization: `Bearer ${env.SIMLI_API_KEY}`,
    },
  });

  if (!response.ok) {
    return "error";
  }

  const data = await response.json();
  return data.status ?? "ready";
}
