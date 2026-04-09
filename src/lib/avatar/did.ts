/**
 * OLIVIA BRAIN - D-ID AVATAR INTEGRATION
 * =======================================
 *
 * Fallback interactive avatar provider.
 *
 * D-ID Use Cases:
 * - Fallback when Simli and HeyGen are unavailable
 * - Interactive streaming avatar sessions
 * - Real-time conversations (lower quality than Simli)
 * - Async video generation
 *
 * D-ID supports both streaming (Talks) and async (Clips) modes.
 */

import { getServerEnv } from "@/lib/config/env";
import { withTraceSpan } from "@/lib/observability/tracer";
import type {
  AvatarSession,
  AvatarVideoRequest,
  AvatarVideoResult,
  RealtimeAvatarConfig,
} from "./types";
import { getAvatarIdentity } from "./identity";

const DID_API_BASE = "https://api.d-id.com";

export function isDIDConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.DID_API_KEY);
}

// D-ID presenter images for each persona
const DID_PRESENTER_IMAGES: Record<string, string> = {
  olivia: "https://olivia-brain-assets.s3.amazonaws.com/avatars/olivia-presenter.png",
  cristiano: "https://olivia-brain-assets.s3.amazonaws.com/avatars/cristiano-presenter.png",
  emelia: "https://olivia-brain-assets.s3.amazonaws.com/avatars/emelia-presenter.png",
};

// D-ID voice configurations
const DID_VOICES: Record<string, { provider: string; voice_id: string }> = {
  olivia: { provider: "microsoft", voice_id: "en-US-JennyNeural" },
  cristiano: { provider: "microsoft", voice_id: "en-GB-RyanNeural" },
  emelia: { provider: "microsoft", voice_id: "en-US-AriaNeural" },
};

function getDIDPresenterImage(personaId: string): string {
  return DID_PRESENTER_IMAGES[personaId] ?? DID_PRESENTER_IMAGES.olivia;
}

function getDIDVoice(personaId: string): { provider: string; voice_id: string } {
  return DID_VOICES[personaId] ?? DID_VOICES.olivia;
}

interface DIDTalkResult {
  id: string;
  status: "created" | "started" | "done" | "error";
  result_url?: string;
  error?: { kind: string; description: string };
}

/**
 * Generate a D-ID video clip (async, non-interactive)
 */
export async function generateDIDVideo(
  request: AvatarVideoRequest
): Promise<AvatarVideoResult> {
  const env = getServerEnv();

  if (!env.DID_API_KEY) {
    throw new Error("D-ID API key not configured");
  }

  const presenterImage = getDIDPresenterImage(request.personaId);
  const voice = getDIDVoice(request.personaId);
  const startTime = Date.now();

  const result = await withTraceSpan(
    "olivia.did_generate_video",
    {
      "olivia.persona": request.personaId,
      "olivia.text_length": request.text.length,
    },
    async () => {
      // Create talk
      const createResponse = await fetch(`${DID_API_BASE}/talks`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${env.DID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_url: presenterImage,
          script: {
            type: "text",
            input: request.text,
            provider: {
              type: voice.provider,
              voice_id: voice.voice_id,
            },
          },
          config: {
            stitch: true,
            result_format: request.outputFormat ?? "mp4",
          },
        }),
      });

      if (!createResponse.ok) {
        const error = await createResponse.text();
        throw new Error(`D-ID API error: ${createResponse.status} - ${error}`);
      }

      const createData = await createResponse.json();
      const talkId = createData.id;

      if (!talkId) {
        throw new Error("D-ID returned no talk ID");
      }

      // Poll for completion
      let status: DIDTalkResult;
      do {
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const statusResponse = await fetch(`${DID_API_BASE}/talks/${talkId}`, {
          headers: {
            Authorization: `Basic ${env.DID_API_KEY}`,
          },
        });

        if (!statusResponse.ok) {
          throw new Error(`D-ID status error: ${statusResponse.status}`);
        }

        status = await statusResponse.json();
      } while (status.status === "created" || status.status === "started");

      if (status.status === "error") {
        throw new Error(
          `D-ID generation failed: ${status.error?.description ?? "Unknown error"}`
        );
      }

      return status;
    }
  );

  if (!result.result_url) {
    throw new Error("D-ID returned no video URL");
  }

  return {
    videoUrl: result.result_url,
    durationMs: Date.now() - startTime,
    provider: "did",
    personaId: request.personaId,
  };
}

/**
 * Generate D-ID video with external audio
 */
export async function generateDIDVideoWithAudio(
  request: AvatarVideoRequest,
  audioUrl: string
): Promise<AvatarVideoResult> {
  const env = getServerEnv();

  if (!env.DID_API_KEY) {
    throw new Error("D-ID API key not configured");
  }

  const presenterImage = getDIDPresenterImage(request.personaId);
  const startTime = Date.now();

  const result = await withTraceSpan(
    "olivia.did_generate_with_audio",
    {
      "olivia.persona": request.personaId,
    },
    async () => {
      const createResponse = await fetch(`${DID_API_BASE}/talks`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${env.DID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_url: presenterImage,
          script: {
            type: "audio",
            audio_url: audioUrl,
          },
          config: {
            stitch: true,
            result_format: request.outputFormat ?? "mp4",
          },
        }),
      });

      if (!createResponse.ok) {
        const error = await createResponse.text();
        throw new Error(`D-ID API error: ${createResponse.status} - ${error}`);
      }

      const createData = await createResponse.json();
      const talkId = createData.id;

      // Poll for completion
      let status: DIDTalkResult;
      do {
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const statusResponse = await fetch(`${DID_API_BASE}/talks/${talkId}`, {
          headers: {
            Authorization: `Basic ${env.DID_API_KEY}`,
          },
        });

        status = await statusResponse.json();
      } while (status.status === "created" || status.status === "started");

      return status;
    }
  );

  return {
    videoUrl: result.result_url!,
    durationMs: Date.now() - startTime,
    provider: "did",
    personaId: request.personaId,
  };
}

/**
 * Create a D-ID streaming session (interactive)
 */
export async function createDIDStreamSession(
  config: RealtimeAvatarConfig
): Promise<AvatarSession> {
  const env = getServerEnv();

  if (!env.DID_API_KEY) {
    throw new Error("D-ID API key not configured");
  }

  const presenterImage = getDIDPresenterImage(config.personaId);
  const sessionId = `did-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const session = await withTraceSpan(
    "olivia.did_create_stream",
    {
      "olivia.persona": config.personaId,
      "olivia.session_id": sessionId,
    },
    async () => {
      const response = await fetch(`${DID_API_BASE}/talks/streams`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${env.DID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_url: presenterImage,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`D-ID stream error: ${response.status} - ${error}`);
      }

      return response.json();
    }
  );

  return {
    sessionId: session.id ?? sessionId,
    personaId: config.personaId,
    provider: "did",
    status: "initializing",
    createdAt: new Date(),
    videoStreamUrl: session.stream_url,
  };
}

/**
 * Send text to D-ID stream for speaking
 */
export async function sendTextToDIDStream(
  streamId: string,
  sessionId: string,
  text: string,
  personaId: string
): Promise<void> {
  const env = getServerEnv();

  if (!env.DID_API_KEY) {
    throw new Error("D-ID API key not configured");
  }

  const voice = getDIDVoice(personaId);

  await fetch(`${DID_API_BASE}/talks/streams/${streamId}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${env.DID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session_id: sessionId,
      script: {
        type: "text",
        input: text,
        provider: {
          type: voice.provider,
          voice_id: voice.voice_id,
        },
      },
    }),
  });
}

/**
 * End a D-ID streaming session
 */
export async function endDIDStream(streamId: string): Promise<void> {
  const env = getServerEnv();

  if (!env.DID_API_KEY) {
    throw new Error("D-ID API key not configured");
  }

  await fetch(`${DID_API_BASE}/talks/streams/${streamId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Basic ${env.DID_API_KEY}`,
    },
  });
}
