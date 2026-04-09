/**
 * OLIVIA BRAIN - OPENAI TTS FALLBACK
 * ===================================
 *
 * Fallback TTS provider when ElevenLabs is unavailable or rate-limited.
 * Uses OpenAI's TTS API with voice mapping for each persona.
 *
 * Voice Mapping:
 * - Olivia™ → nova (warm, conversational)
 * - Cristiano™ → onyx (deep, authoritative)
 * - Emelia™ → shimmer (clear, helpful)
 */

import { getServerEnv } from "@/lib/config/env";
import { withTraceSpan } from "@/lib/observability/tracer";
import type { PersonaId, TTSRequest, TTSResult } from "./types";
import { getVoiceProfile } from "./elevenlabs";

const OPENAI_API_BASE = "https://api.openai.com/v1";

export function isOpenAITTSConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.OPENAI_API_KEY);
}

function getOpenAIVoice(personaId: PersonaId): string {
  const profile = getVoiceProfile(personaId);
  return profile?.openaiVoice ?? "nova";
}

export async function synthesizeWithOpenAI(request: TTSRequest): Promise<TTSResult> {
  const env = getServerEnv();

  if (!env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const voice = getOpenAIVoice(request.personaId);
  const model = env.OPENAI_TTS_MODEL;
  const responseFormat = request.outputFormat ?? "mp3";

  const startTime = Date.now();

  const audio = await withTraceSpan(
    "olivia.openai_tts",
    {
      "olivia.persona": request.personaId,
      "olivia.voice": voice,
      "olivia.model": model,
      "olivia.char_count": request.text.length,
    },
    async () => {
      const response = await fetch(`${OPENAI_API_BASE}/audio/speech`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          voice,
          input: request.text,
          response_format: responseFormat,
          speed: 1.0,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI TTS API error: ${response.status} - ${error}`);
      }

      return response.arrayBuffer();
    }
  );

  return {
    audio,
    durationMs: Date.now() - startTime,
    provider: "openai",
    personaId: request.personaId,
    characterCount: request.text.length,
  };
}
