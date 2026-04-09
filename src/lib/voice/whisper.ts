/**
 * OLIVIA BRAIN - WHISPER MULTILINGUAL TRANSCRIPTION
 * ==================================================
 *
 * OpenAI Whisper for multilingual speech recognition.
 *
 * Use Cases:
 * - International clients (Mistral cascade path)
 * - Long-form audio transcription
 * - Document/meeting recordings
 * - Translation (speech-to-English text)
 *
 * Supported Languages: 50+ languages with automatic detection
 */

import { getServerEnv } from "@/lib/config/env";
import { withTraceSpan } from "@/lib/observability/tracer";
import type { STTRequest, STTResult } from "./types";

const OPENAI_API_BASE = "https://api.openai.com/v1";

export function isWhisperConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.OPENAI_API_KEY);
}

interface WhisperTranscriptionResponse {
  text: string;
  language?: string;
  duration?: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
}

export async function transcribeWithWhisper(request: STTRequest): Promise<STTResult> {
  const env = getServerEnv();

  if (!env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const startTime = Date.now();

  const audioBlob =
    request.audio instanceof Blob
      ? request.audio
      : new Blob([request.audio], { type: request.mimeType });

  const formData = new FormData();
  formData.append("file", audioBlob, `audio.${getExtension(request.mimeType)}`);
  formData.append("model", env.OPENAI_WHISPER_MODEL);
  formData.append("response_format", "verbose_json");
  formData.append("timestamp_granularities[]", "word");

  if (request.language) {
    formData.append("language", request.language);
  }

  const response = await withTraceSpan(
    "olivia.whisper_stt",
    {
      "olivia.mime_type": request.mimeType,
      "olivia.language": request.language ?? "auto",
      "olivia.model": env.OPENAI_WHISPER_MODEL,
    },
    async () => {
      const res = await fetch(`${OPENAI_API_BASE}/audio/transcriptions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Whisper API error: ${res.status} - ${error}`);
      }

      return res.json() as Promise<WhisperTranscriptionResponse>;
    }
  );

  const durationMs = Date.now() - startTime;

  return {
    transcript: response.text,
    confidence: 1.0,
    durationMs,
    provider: "whisper",
    language: response.language,
    words: response.words?.map((w) => ({
      word: w.word,
      start: w.start,
      end: w.end,
      confidence: 1.0,
    })),
  };
}

export async function translateWithWhisper(request: STTRequest): Promise<STTResult> {
  const env = getServerEnv();

  if (!env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const startTime = Date.now();

  const audioBlob =
    request.audio instanceof Blob
      ? request.audio
      : new Blob([request.audio], { type: request.mimeType });

  const formData = new FormData();
  formData.append("file", audioBlob, `audio.${getExtension(request.mimeType)}`);
  formData.append("model", env.OPENAI_WHISPER_MODEL);
  formData.append("response_format", "verbose_json");

  const response = await withTraceSpan(
    "olivia.whisper_translate",
    {
      "olivia.mime_type": request.mimeType,
      "olivia.model": env.OPENAI_WHISPER_MODEL,
    },
    async () => {
      const res = await fetch(`${OPENAI_API_BASE}/audio/translations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Whisper Translation API error: ${res.status} - ${error}`);
      }

      return res.json() as Promise<WhisperTranscriptionResponse>;
    }
  );

  const durationMs = Date.now() - startTime;

  return {
    transcript: response.text,
    confidence: 1.0,
    durationMs,
    provider: "whisper",
    language: "en",
  };
}

function getExtension(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/flac": "flac",
    "audio/m4a": "m4a",
    "audio/mp4": "m4a",
  };

  return mimeToExt[mimeType] ?? "mp3";
}
