/**
 * OLIVIA BRAIN - DEEPGRAM STT
 * ============================
 *
 * Primary Speech-to-Text provider targeting sub-200ms latency.
 *
 * Deepgram Features:
 * - Nova-2 model for highest accuracy
 * - Real-time streaming support
 * - Word-level timestamps and confidence scores
 * - Multi-language support
 * - Speaker diarization (future)
 *
 * Latency Target: <200ms for real-time conversational AI
 */

import { getServerEnv } from "@/lib/config/env";
import { withTraceSpan } from "@/lib/observability/tracer";
import type { STTRequest, STTResult } from "./types";

const DEEPGRAM_API_BASE = "https://api.deepgram.com/v1";

export function isDeepgramConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.DEEPGRAM_API_KEY);
}

interface DeepgramTranscriptionResponse {
  metadata: {
    transaction_key: string;
    request_id: string;
    sha256: string;
    created: string;
    duration: number;
    channels: number;
  };
  results: {
    channels: Array<{
      alternatives: Array<{
        transcript: string;
        confidence: number;
        words: Array<{
          word: string;
          start: number;
          end: number;
          confidence: number;
        }>;
      }>;
      detected_language?: string;
    }>;
  };
}

export async function transcribeWithDeepgram(request: STTRequest): Promise<STTResult> {
  const env = getServerEnv();

  if (!env.DEEPGRAM_API_KEY) {
    throw new Error("Deepgram API key not configured");
  }

  const startTime = Date.now();

  const audioBuffer =
    request.audio instanceof Blob
      ? await request.audio.arrayBuffer()
      : request.audio;

  const queryParams = new URLSearchParams({
    model: "nova-2",
    smart_format: "true",
    punctuate: "true",
    diarize: "false",
    utterances: "false",
    detect_language: "true",
  });

  if (request.language) {
    queryParams.set("language", request.language);
  }

  const response = await withTraceSpan(
    "olivia.deepgram_stt",
    {
      "olivia.mime_type": request.mimeType,
      "olivia.language": request.language ?? "auto",
      "olivia.audio_bytes": audioBuffer.byteLength,
    },
    async () => {
      const res = await fetch(
        `${DEEPGRAM_API_BASE}/listen?${queryParams.toString()}`,
        {
          method: "POST",
          headers: {
            Authorization: `Token ${env.DEEPGRAM_API_KEY}`,
            "Content-Type": request.mimeType,
          },
          body: audioBuffer,
        }
      );

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Deepgram API error: ${res.status} - ${error}`);
      }

      return res.json() as Promise<DeepgramTranscriptionResponse>;
    }
  );

  const durationMs = Date.now() - startTime;
  const channel = response.results.channels[0];
  const alternative = channel?.alternatives[0];

  if (!alternative) {
    return {
      transcript: "",
      confidence: 0,
      durationMs,
      provider: "deepgram",
      language: channel?.detected_language,
    };
  }

  return {
    transcript: alternative.transcript,
    confidence: alternative.confidence,
    durationMs,
    provider: "deepgram",
    language: channel?.detected_language,
    words: alternative.words,
  };
}

export interface DeepgramStreamConfig {
  onTranscript: (transcript: string, isFinal: boolean) => void;
  onError: (error: Error) => void;
  onClose: () => void;
  language?: string;
  interimResults?: boolean;
}

export function createDeepgramStream(config: DeepgramStreamConfig): {
  send: (audio: ArrayBuffer) => void;
  close: () => void;
} | null {
  const env = getServerEnv();

  if (!env.DEEPGRAM_API_KEY) {
    config.onError(new Error("Deepgram API key not configured"));
    return null;
  }

  const queryParams = new URLSearchParams({
    model: "nova-2",
    smart_format: "true",
    punctuate: "true",
    interim_results: String(config.interimResults ?? true),
    endpointing: "300",
    vad_events: "true",
  });

  if (config.language) {
    queryParams.set("language", config.language);
  }

  const ws = new WebSocket(
    `wss://api.deepgram.com/v1/listen?${queryParams.toString()}`,
    ["token", env.DEEPGRAM_API_KEY]
  );

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "Results") {
        const transcript = data.channel?.alternatives?.[0]?.transcript ?? "";
        const isFinal = data.is_final === true;
        if (transcript) {
          config.onTranscript(transcript, isFinal);
        }
      }
    } catch {
      // Ignore parse errors
    }
  };

  ws.onerror = () => {
    config.onError(new Error("Deepgram WebSocket error"));
  };

  ws.onclose = () => {
    config.onClose();
  };

  return {
    send: (audio: ArrayBuffer) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(audio);
      }
    },
    close: () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "CloseStream" }));
        ws.close();
      }
    },
  };
}
