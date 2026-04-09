/**
 * OLIVIA BRAIN - REALTIME PIPELINE
 * =================================
 *
 * Orchestrates the realtime conversation flow:
 * STT → LLM → TTS → Avatar
 *
 * Target: sub-800ms TTFB (Time To First Byte)
 *
 * Pipeline Stages:
 * 1. STT: Deepgram Nova-2 (~150ms)
 * 2. LLM: Streaming response (~200-400ms to first token)
 * 3. TTS: ElevenLabs streaming (~100ms)
 * 4. Avatar: Simli lip-sync (~50ms)
 *
 * Voice-Only Fallback:
 * When avatar is unavailable, skip stage 4 for faster response.
 */

import { withTraceSpan } from "@/lib/observability/tracer";
import { transcribeSpeech, synthesizeSpeech } from "@/lib/voice";
import { runModelCascade } from "@/lib/services/model-cascade";
import type { PersonaId } from "@/lib/voice/types";
import type { RealtimePipelineMetrics, SessionMode } from "./types";

export interface PipelineConfig {
  personaId: PersonaId;
  mode: SessionMode;
  conversationId: string;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onResponse?: (text: string, isComplete: boolean) => void;
  onAudio?: (audio: ArrayBuffer) => void;
  onMetrics?: (metrics: RealtimePipelineMetrics) => void;
}

export interface PipelineState {
  isProcessing: boolean;
  lastTranscript: string;
  lastResponse: string;
  metrics: RealtimePipelineMetrics;
}

/**
 * Process a single turn in the realtime pipeline
 */
export async function processPipelineTurn(
  audioInput: ArrayBuffer,
  config: PipelineConfig
): Promise<{
  transcript: string;
  response: string;
  audio: ArrayBuffer;
  metrics: RealtimePipelineMetrics;
}> {
  const startTime = Date.now();
  const metrics: RealtimePipelineMetrics = {
    sttLatencyMs: 0,
    llmLatencyMs: 0,
    ttsLatencyMs: 0,
    avatarLatencyMs: 0,
    totalLatencyMs: 0,
    ttfbMs: 0,
  };

  return withTraceSpan(
    "olivia.realtime_pipeline",
    {
      "olivia.persona": config.personaId,
      "olivia.mode": config.mode,
      "olivia.conversation_id": config.conversationId,
    },
    async () => {
      // Stage 1: STT
      const sttStart = Date.now();
      const sttResult = await transcribeSpeech({
        audio: audioInput,
        mimeType: "audio/wav",
      });
      metrics.sttLatencyMs = Date.now() - sttStart;

      config.onTranscript?.(sttResult.transcript, true);

      // Stage 2: LLM
      const llmStart = Date.now();
      const llmResult = await runModelCascade({
        conversationId: config.conversationId,
        message: sttResult.transcript,
        intent: "general",
        recalledContext: [],
        integrationSnapshot: {},
      });
      metrics.llmLatencyMs = Date.now() - llmStart;
      metrics.ttfbMs = Date.now() - startTime;

      config.onResponse?.(llmResult.text, true);

      // Stage 3: TTS
      const ttsStart = Date.now();
      const ttsResult = await synthesizeSpeech({
        text: llmResult.text,
        personaId: config.personaId,
        outputFormat: "mp3",
      });
      metrics.ttsLatencyMs = Date.now() - ttsStart;

      config.onAudio?.(ttsResult.audio);

      // Stage 4: Avatar (if not voice-only)
      if (config.mode !== "voice-only") {
        // Avatar latency would be measured here
        // For now, we assume avatar is handled client-side
        metrics.avatarLatencyMs = 0;
      }

      metrics.totalLatencyMs = Date.now() - startTime;

      config.onMetrics?.(metrics);

      return {
        transcript: sttResult.transcript,
        response: llmResult.text,
        audio: ttsResult.audio,
        metrics,
      };
    }
  );
}

/**
 * Voice-only fallback mode
 * Skips avatar rendering for faster response
 */
export async function processVoiceOnlyTurn(
  audioInput: ArrayBuffer,
  config: Omit<PipelineConfig, "mode">
): Promise<{
  transcript: string;
  response: string;
  audio: ArrayBuffer;
  metrics: RealtimePipelineMetrics;
}> {
  return processPipelineTurn(audioInput, {
    ...config,
    mode: "voice-only",
  });
}

/**
 * Text-only mode (for chat interfaces)
 */
export async function processTextTurn(
  text: string,
  config: Omit<PipelineConfig, "mode">
): Promise<{
  response: string;
  audio?: ArrayBuffer;
  metrics: Partial<RealtimePipelineMetrics>;
}> {
  const startTime = Date.now();
  const metrics: Partial<RealtimePipelineMetrics> = {
    llmLatencyMs: 0,
    ttsLatencyMs: 0,
    totalLatencyMs: 0,
    ttfbMs: 0,
  };

  return withTraceSpan(
    "olivia.text_pipeline",
    {
      "olivia.persona": config.personaId,
      "olivia.conversation_id": config.conversationId,
    },
    async () => {
      // LLM only
      const llmStart = Date.now();
      const llmResult = await runModelCascade({
        conversationId: config.conversationId,
        message: text,
        intent: "general",
        recalledContext: [],
        integrationSnapshot: {},
      });
      metrics.llmLatencyMs = Date.now() - llmStart;
      metrics.ttfbMs = metrics.llmLatencyMs;

      config.onResponse?.(llmResult.text, true);

      // Optional TTS for audio response
      let audio: ArrayBuffer | undefined;
      const ttsStart = Date.now();
      try {
        const ttsResult = await synthesizeSpeech({
          text: llmResult.text,
          personaId: config.personaId,
          outputFormat: "mp3",
        });
        audio = ttsResult.audio;
        metrics.ttsLatencyMs = Date.now() - ttsStart;
        config.onAudio?.(audio);
      } catch {
        // TTS is optional for text mode
      }

      metrics.totalLatencyMs = Date.now() - startTime;

      return {
        response: llmResult.text,
        audio,
        metrics,
      };
    }
  );
}

/**
 * Get pipeline health metrics
 */
export function getPipelineHealthTargets(): {
  target: RealtimePipelineMetrics;
  acceptable: RealtimePipelineMetrics;
} {
  return {
    target: {
      sttLatencyMs: 150,
      llmLatencyMs: 300,
      ttsLatencyMs: 100,
      avatarLatencyMs: 50,
      totalLatencyMs: 600,
      ttfbMs: 450,
    },
    acceptable: {
      sttLatencyMs: 200,
      llmLatencyMs: 500,
      ttsLatencyMs: 150,
      avatarLatencyMs: 100,
      totalLatencyMs: 800,
      ttfbMs: 700,
    },
  };
}

/**
 * Evaluate pipeline metrics against targets
 */
export function evaluatePipelineMetrics(
  metrics: RealtimePipelineMetrics
): {
  grade: "excellent" | "good" | "acceptable" | "degraded";
  bottleneck?: string;
} {
  const targets = getPipelineHealthTargets();

  if (metrics.ttfbMs <= targets.target.ttfbMs) {
    return { grade: "excellent" };
  }

  if (metrics.ttfbMs <= targets.acceptable.ttfbMs) {
    // Find bottleneck
    let bottleneck: string | undefined;
    if (metrics.sttLatencyMs > targets.acceptable.sttLatencyMs) {
      bottleneck = "stt";
    } else if (metrics.llmLatencyMs > targets.acceptable.llmLatencyMs) {
      bottleneck = "llm";
    } else if (metrics.ttsLatencyMs > targets.acceptable.ttsLatencyMs) {
      bottleneck = "tts";
    }

    return { grade: "good", bottleneck };
  }

  if (metrics.totalLatencyMs <= targets.acceptable.totalLatencyMs * 1.5) {
    return { grade: "acceptable", bottleneck: "overall" };
  }

  return { grade: "degraded", bottleneck: "overall" };
}
