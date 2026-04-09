/**
 * OLIVIA BRAIN - HEYGEN AVATAR INTEGRATION
 * =========================================
 *
 * Fallback avatar provider and async branded video generation.
 *
 * HeyGen Use Cases:
 * - Fallback when Simli is unavailable
 * - Async branded video generation (not realtime)
 * - Marketing/promotional content
 * - Onboarding videos
 *
 * Note: HeyGen is NOT for realtime conversations.
 * Use Simli for interactive sessions.
 */

import { getServerEnv } from "@/lib/config/env";
import { withTraceSpan } from "@/lib/observability/tracer";
import type {
  AvatarSession,
  AvatarVideoRequest,
  AvatarVideoResult,
  EmotionState,
} from "./types";
import { getAvatarIdentity } from "./identity";

const HEYGEN_API_BASE = "https://api.heygen.com/v2";

export function isHeyGenConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.HEYGEN_API_KEY);
}

// HeyGen avatar IDs for each persona
const HEYGEN_AVATAR_IDS: Record<string, string> = {
  olivia: "Olivia_Professional_v1",
  cristiano: "Cristiano_Judge_v1",
  emelia: "Emelia_Support_v1",
};

// HeyGen voice IDs (or use external ElevenLabs)
const HEYGEN_VOICE_IDS: Record<string, string> = {
  olivia: "en-US-JennyNeural",
  cristiano: "en-GB-RyanNeural",
  emelia: "en-US-AriaNeural",
};

function getHeyGenAvatarId(personaId: string): string {
  return HEYGEN_AVATAR_IDS[personaId] ?? HEYGEN_AVATAR_IDS.olivia;
}

function getHeyGenVoiceId(personaId: string): string {
  return HEYGEN_VOICE_IDS[personaId] ?? HEYGEN_VOICE_IDS.olivia;
}

interface HeyGenVideoStatus {
  video_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  video_url?: string;
  thumbnail_url?: string;
  duration?: number;
  error?: string;
}

export async function generateHeyGenVideo(
  request: AvatarVideoRequest
): Promise<AvatarVideoResult> {
  const env = getServerEnv();

  if (!env.HEYGEN_API_KEY) {
    throw new Error("HeyGen API key not configured");
  }

  const identity = getAvatarIdentity(request.personaId);
  const avatarId = getHeyGenAvatarId(request.personaId);
  const voiceId = getHeyGenVoiceId(request.personaId);

  const startTime = Date.now();

  const result = await withTraceSpan(
    "olivia.heygen_generate_video",
    {
      "olivia.persona": request.personaId,
      "olivia.avatar_id": avatarId,
      "olivia.text_length": request.text.length,
    },
    async () => {
      // Create video
      const createResponse = await fetch(`${HEYGEN_API_BASE}/video/generate`, {
        method: "POST",
        headers: {
          "X-Api-Key": env.HEYGEN_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          video_inputs: [
            {
              character: {
                type: "avatar",
                avatar_id: avatarId,
                avatar_style: "normal",
              },
              voice: {
                type: "text",
                input_text: request.text,
                voice_id: voiceId,
                speed: 1.0,
              },
              background: {
                type: "color",
                value: "#1a1a2e",
              },
            },
          ],
          dimension: {
            width: 1920,
            height: 1080,
          },
          aspect_ratio: "16:9",
        }),
      });

      if (!createResponse.ok) {
        const error = await createResponse.text();
        throw new Error(`HeyGen API error: ${createResponse.status} - ${error}`);
      }

      const createData = await createResponse.json();
      const videoId = createData.data?.video_id;

      if (!videoId) {
        throw new Error("HeyGen returned no video ID");
      }

      // Poll for completion
      let status: HeyGenVideoStatus;
      do {
        await new Promise((resolve) => setTimeout(resolve, 5000));

        const statusResponse = await fetch(
          `${HEYGEN_API_BASE}/video_status.get?video_id=${videoId}`,
          {
            headers: {
              "X-Api-Key": env.HEYGEN_API_KEY!,
            },
          }
        );

        if (!statusResponse.ok) {
          throw new Error(`HeyGen status error: ${statusResponse.status}`);
        }

        const statusData = await statusResponse.json();
        status = statusData.data;
      } while (status.status === "pending" || status.status === "processing");

      if (status.status === "failed") {
        throw new Error(`HeyGen generation failed: ${status.error}`);
      }

      return status;
    }
  );

  if (!result.video_url) {
    throw new Error("HeyGen returned no video URL");
  }

  return {
    videoUrl: result.video_url,
    durationMs: Date.now() - startTime,
    provider: "heygen",
    personaId: request.personaId,
  };
}

/**
 * Generate video with external audio (e.g., from ElevenLabs)
 */
export async function generateHeyGenVideoWithAudio(
  request: AvatarVideoRequest,
  audioUrl: string
): Promise<AvatarVideoResult> {
  const env = getServerEnv();

  if (!env.HEYGEN_API_KEY) {
    throw new Error("HeyGen API key not configured");
  }

  const avatarId = getHeyGenAvatarId(request.personaId);
  const startTime = Date.now();

  const result = await withTraceSpan(
    "olivia.heygen_generate_with_audio",
    {
      "olivia.persona": request.personaId,
      "olivia.avatar_id": avatarId,
    },
    async () => {
      const createResponse = await fetch(`${HEYGEN_API_BASE}/video/generate`, {
        method: "POST",
        headers: {
          "X-Api-Key": env.HEYGEN_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          video_inputs: [
            {
              character: {
                type: "avatar",
                avatar_id: avatarId,
                avatar_style: "normal",
              },
              voice: {
                type: "audio",
                audio_url: audioUrl,
              },
              background: {
                type: "color",
                value: "#1a1a2e",
              },
            },
          ],
          dimension: {
            width: 1920,
            height: 1080,
          },
        }),
      });

      if (!createResponse.ok) {
        const error = await createResponse.text();
        throw new Error(`HeyGen API error: ${createResponse.status} - ${error}`);
      }

      const createData = await createResponse.json();
      const videoId = createData.data?.video_id;

      // Poll for completion
      let status: HeyGenVideoStatus;
      do {
        await new Promise((resolve) => setTimeout(resolve, 5000));

        const statusResponse = await fetch(
          `${HEYGEN_API_BASE}/video_status.get?video_id=${videoId}`,
          {
            headers: {
              "X-Api-Key": env.HEYGEN_API_KEY!,
            },
          }
        );

        const statusData = await statusResponse.json();
        status = statusData.data;
      } while (status.status === "pending" || status.status === "processing");

      return status;
    }
  );

  return {
    videoUrl: result.video_url!,
    durationMs: Date.now() - startTime,
    provider: "heygen",
    personaId: request.personaId,
  };
}

/**
 * List available HeyGen avatars
 */
export async function listHeyGenAvatars(): Promise<
  Array<{ avatar_id: string; avatar_name: string; gender: string }>
> {
  const env = getServerEnv();

  if (!env.HEYGEN_API_KEY) {
    throw new Error("HeyGen API key not configured");
  }

  const response = await fetch(`${HEYGEN_API_BASE}/avatars`, {
    headers: {
      "X-Api-Key": env.HEYGEN_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`HeyGen API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data?.avatars ?? [];
}
