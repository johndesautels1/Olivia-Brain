/**
 * OLIVIA BRAIN - UNIFIED VOICE INTERFACE
 * =======================================
 *
 * Single entry point for all voice services with automatic fallback.
 *
 * TTS Flow:
 * 1. Try ElevenLabs (primary, highest quality)
 * 2. Fall back to OpenAI TTS if ElevenLabs fails
 *
 * STT Flow:
 * 1. Try Deepgram (primary, lowest latency <200ms)
 * 2. Fall back to Whisper for multilingual or when Deepgram unavailable
 */

export * from "./types";
export * from "./elevenlabs";
export * from "./openai-tts";
export * from "./deepgram";
export * from "./whisper";

import { withTraceSpan } from "@/lib/observability/tracer";
import {
  isElevenLabsConfigured,
  synthesizeWithElevenLabs,
  getVoiceProfiles,
} from "./elevenlabs";
import { isOpenAITTSConfigured, synthesizeWithOpenAI } from "./openai-tts";
import { isDeepgramConfigured, transcribeWithDeepgram } from "./deepgram";
import { isWhisperConfigured, transcribeWithWhisper } from "./whisper";
import type {
  PersonaId,
  TTSRequest,
  TTSResult,
  STTRequest,
  STTResult,
  VoiceServiceStatus,
} from "./types";

export function getVoiceServiceStatus(): VoiceServiceStatus {
  return {
    elevenlabs: {
      configured: isElevenLabsConfigured(),
      available: isElevenLabsConfigured(),
    },
    openaiTts: {
      configured: isOpenAITTSConfigured(),
      available: isOpenAITTSConfigured(),
    },
    deepgram: {
      configured: isDeepgramConfigured(),
      available: isDeepgramConfigured(),
    },
    whisper: {
      configured: isWhisperConfigured(),
      available: isWhisperConfigured(),
    },
  };
}

export async function synthesizeSpeech(request: TTSRequest): Promise<TTSResult> {
  return withTraceSpan(
    "olivia.voice_tts",
    {
      "olivia.persona": request.personaId,
      "olivia.char_count": request.text.length,
    },
    async () => {
      if (isElevenLabsConfigured()) {
        try {
          return await synthesizeWithElevenLabs(request);
        } catch (error) {
          console.warn(
            "[Voice] ElevenLabs failed, falling back to OpenAI:",
            error instanceof Error ? error.message : error
          );
        }
      }

      if (isOpenAITTSConfigured()) {
        return await synthesizeWithOpenAI(request);
      }

      throw new Error("No TTS provider configured (need ELEVENLABS_API_KEY or OPENAI_API_KEY)");
    }
  );
}

export async function transcribeSpeech(request: STTRequest): Promise<STTResult> {
  return withTraceSpan(
    "olivia.voice_stt",
    {
      "olivia.mime_type": request.mimeType,
      "olivia.language": request.language ?? "auto",
    },
    async () => {
      if (isDeepgramConfigured()) {
        try {
          return await transcribeWithDeepgram(request);
        } catch (error) {
          console.warn(
            "[Voice] Deepgram failed, falling back to Whisper:",
            error instanceof Error ? error.message : error
          );
        }
      }

      if (isWhisperConfigured()) {
        return await transcribeWithWhisper(request);
      }

      throw new Error("No STT provider configured (need DEEPGRAM_API_KEY or OPENAI_API_KEY)");
    }
  );
}

export { getVoiceProfiles };
export type { PersonaId };
