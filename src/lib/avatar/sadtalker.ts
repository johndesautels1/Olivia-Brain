/**
 * OLIVIA BRAIN - SADTALKER (REPLICATE) INTEGRATION
 * =================================================
 *
 * Avatar generation for Cristiano™ Judge presentations.
 * Uses Replicate's SadTalker model for high-quality lip-sync video.
 *
 * Use Cases:
 * - Final verdict videos
 * - City match announcements
 * - LifeScore presentations
 * - Financial package summaries
 *
 * Cristiano™ is UNILATERAL ONLY - these are pre-rendered presentations,
 * not interactive conversations. James Bond aesthetic.
 */

import { getServerEnv } from "@/lib/config/env";
import { withTraceSpan } from "@/lib/observability/tracer";
import type { AvatarVideoRequest, AvatarVideoResult, EmotionState } from "./types";
import { getAvatarIdentity } from "./identity";

const REPLICATE_API_BASE = "https://api.replicate.com/v1";

// SadTalker model on Replicate
const SADTALKER_MODEL = "cjwbw/sadtalker:a519cc0cfebaaeade068b23899165a11ec76aaa1a2e5f15bba59dcc4f800726c";

export function isSadTalkerConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.REPLICATE_API_TOKEN);
}

// Reference images for each persona (hosted URLs)
const PERSONA_IMAGES: Record<string, string> = {
  cristiano: "https://olivia-brain-assets.s3.amazonaws.com/avatars/cristiano-judge.png",
  olivia: "https://olivia-brain-assets.s3.amazonaws.com/avatars/olivia-executive.png",
  emelia: "https://olivia-brain-assets.s3.amazonaws.com/avatars/emelia-support.png",
};

interface ReplicatePrediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string | string[];
  error?: string;
  urls: {
    get: string;
    cancel: string;
  };
}

export async function generateSadTalkerVideo(
  request: AvatarVideoRequest,
  audioUrl: string
): Promise<AvatarVideoResult> {
  const env = getServerEnv();

  if (!env.REPLICATE_API_TOKEN) {
    throw new Error("Replicate API token not configured");
  }

  const identity = getAvatarIdentity(request.personaId);
  if (!identity) {
    throw new Error(`Unknown persona: ${request.personaId}`);
  }

  const sourceImage = PERSONA_IMAGES[request.personaId] ?? PERSONA_IMAGES.cristiano;
  const startTime = Date.now();

  const prediction = await withTraceSpan(
    "olivia.sadtalker_generate",
    {
      "olivia.persona": request.personaId,
      "olivia.text_length": request.text.length,
    },
    async () => {
      // Create prediction
      const createResponse = await fetch(`${REPLICATE_API_BASE}/predictions`, {
        method: "POST",
        headers: {
          Authorization: `Token ${env.REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: SADTALKER_MODEL.split(":")[1],
          input: {
            source_image: sourceImage,
            driven_audio: audioUrl,
            preprocess: "crop",
            still_mode: false,
            use_enhancer: true,
            result_format: request.outputFormat ?? "mp4",
          },
        }),
      });

      if (!createResponse.ok) {
        const error = await createResponse.text();
        throw new Error(`Replicate API error: ${createResponse.status} - ${error}`);
      }

      const prediction: ReplicatePrediction = await createResponse.json();

      // Poll for completion
      let result = prediction;
      while (result.status === "starting" || result.status === "processing") {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const pollResponse = await fetch(result.urls.get, {
          headers: {
            Authorization: `Token ${env.REPLICATE_API_TOKEN}`,
          },
        });

        if (!pollResponse.ok) {
          throw new Error(`Replicate poll error: ${pollResponse.status}`);
        }

        result = await pollResponse.json();
      }

      if (result.status === "failed") {
        throw new Error(`SadTalker generation failed: ${result.error}`);
      }

      return result;
    }
  );

  const videoUrl = Array.isArray(prediction.output)
    ? prediction.output[0]
    : prediction.output;

  if (!videoUrl) {
    throw new Error("SadTalker returned no video output");
  }

  return {
    videoUrl,
    durationMs: Date.now() - startTime,
    provider: "sadtalker",
    personaId: request.personaId,
  };
}

/**
 * Generate a Cristiano™ verdict video
 *
 * This is the primary use case for SadTalker - creating authoritative
 * verdict presentations for the Judge persona.
 */
export async function generateJudgeVerdict(
  verdictText: string,
  audioUrl: string,
  options?: {
    title?: string;
    outputFormat?: "mp4" | "webm";
  }
): Promise<AvatarVideoResult> {
  return generateSadTalkerVideo(
    {
      personaId: "cristiano",
      text: verdictText,
      emotion: "confident",
      gesture: "presenting",
      outputFormat: options?.outputFormat,
    },
    audioUrl
  );
}

/**
 * Check the status of a SadTalker generation job
 */
export async function checkSadTalkerStatus(
  predictionId: string
): Promise<ReplicatePrediction["status"]> {
  const env = getServerEnv();

  if (!env.REPLICATE_API_TOKEN) {
    throw new Error("Replicate API token not configured");
  }

  const response = await fetch(
    `${REPLICATE_API_BASE}/predictions/${predictionId}`,
    {
      headers: {
        Authorization: `Token ${env.REPLICATE_API_TOKEN}`,
      },
    }
  );

  if (!response.ok) {
    return "failed";
  }

  const data: ReplicatePrediction = await response.json();
  return data.status;
}

/**
 * Cancel a running SadTalker generation
 */
export async function cancelSadTalkerGeneration(
  predictionId: string
): Promise<void> {
  const env = getServerEnv();

  if (!env.REPLICATE_API_TOKEN) {
    throw new Error("Replicate API token not configured");
  }

  await fetch(`${REPLICATE_API_BASE}/predictions/${predictionId}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Token ${env.REPLICATE_API_TOKEN}`,
    },
  });
}
