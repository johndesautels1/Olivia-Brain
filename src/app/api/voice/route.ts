/**
 * VOICE SERVICE STATUS API
 * =========================
 *
 * Status and health check for all voice services.
 *
 * GET /api/voice - Get voice service status
 */

import { NextResponse } from "next/server";
import { getVoiceServiceStatus, getVoiceProfiles } from "@/lib/voice";

export async function GET() {
  const status = getVoiceServiceStatus();
  const profiles = getVoiceProfiles();

  const ttsReady = status.elevenlabs.configured || status.openaiTts.configured;
  const sttReady = status.deepgram.configured || status.whisper.configured;

  return NextResponse.json({
    service: "Olivia Voice Layer",
    phase: "2.1 - Voice Synthesis",
    ready: ttsReady && sttReady,
    tts: {
      ready: ttsReady,
      primary: {
        provider: "ElevenLabs",
        configured: status.elevenlabs.configured,
        features: ["High quality", "Emotional expressiveness", "Custom voices"],
      },
      fallback: {
        provider: "OpenAI TTS",
        configured: status.openaiTts.configured,
        features: ["HD quality", "Multiple voices", "Fast generation"],
      },
    },
    stt: {
      ready: sttReady,
      primary: {
        provider: "Deepgram",
        configured: status.deepgram.configured,
        features: ["Sub-200ms latency", "Real-time streaming", "Word timestamps"],
      },
      fallback: {
        provider: "OpenAI Whisper",
        configured: status.whisper.configured,
        features: ["50+ languages", "Translation", "High accuracy"],
      },
    },
    personas: profiles.map((p) => ({
      id: p.personaId,
      label: p.label,
      description: p.description,
      hasElevenLabsVoice: Boolean(p.elevenlabsVoiceId),
      openaiVoice: p.openaiVoice,
    })),
    endpoints: {
      status: "GET /api/voice",
      synthesize: "POST /api/voice/synthesize",
      transcribe: "POST /api/voice/transcribe",
    },
  });
}
