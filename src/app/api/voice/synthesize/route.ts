/**
 * VOICE SYNTHESIS API
 * ====================
 *
 * Text-to-Speech endpoint with automatic fallback.
 * Primary: ElevenLabs (Olivia™, Cristiano™, Emelia™ voices)
 * Fallback: OpenAI TTS
 *
 * POST /api/voice/synthesize
 * Body: { text: string, personaId: "olivia" | "cristiano" | "emelia", outputFormat?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  synthesizeSpeech,
  getVoiceServiceStatus,
  getVoiceProfiles,
  type PersonaId,
} from "@/lib/voice";

interface SynthesizeRequest {
  text: string;
  personaId: PersonaId;
  outputFormat?: "mp3" | "pcm" | "opus" | "aac";
}

export async function POST(request: NextRequest) {
  try {
    const status = getVoiceServiceStatus();

    if (!status.elevenlabs.configured && !status.openaiTts.configured) {
      return NextResponse.json(
        {
          error: "No TTS provider configured",
          message: "Set ELEVENLABS_API_KEY or OPENAI_API_KEY",
          configured: false,
        },
        { status: 503 }
      );
    }

    const body: SynthesizeRequest = await request.json();
    const { text, personaId, outputFormat } = body;

    if (!text) {
      return NextResponse.json(
        { error: "text is required" },
        { status: 400 }
      );
    }

    if (!personaId || !["olivia", "cristiano", "emelia"].includes(personaId)) {
      return NextResponse.json(
        { error: "personaId must be 'olivia', 'cristiano', or 'emelia'" },
        { status: 400 }
      );
    }

    const result = await synthesizeSpeech({
      text,
      personaId,
      outputFormat,
    });

    const audioBase64 = Buffer.from(result.audio).toString("base64");
    const mimeType = outputFormat === "opus" ? "audio/opus" :
                     outputFormat === "aac" ? "audio/aac" :
                     outputFormat === "pcm" ? "audio/pcm" : "audio/mpeg";

    return NextResponse.json({
      success: true,
      audio: audioBase64,
      mimeType,
      provider: result.provider,
      personaId: result.personaId,
      characterCount: result.characterCount,
      durationMs: result.durationMs,
    });
  } catch (error) {
    console.error("Voice synthesis error:", error);
    return NextResponse.json(
      {
        error: "Synthesis failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const status = getVoiceServiceStatus();
  const profiles = getVoiceProfiles();

  return NextResponse.json({
    service: "Voice Synthesis (TTS)",
    providers: {
      primary: "ElevenLabs",
      fallback: "OpenAI TTS",
    },
    configured: status.elevenlabs.configured || status.openaiTts.configured,
    status: {
      elevenlabs: status.elevenlabs,
      openaiTts: status.openaiTts,
    },
    personas: profiles.map((p) => ({
      id: p.personaId,
      label: p.label,
      description: p.description,
    })),
    usage: "POST with { text, personaId, outputFormat? }",
  });
}
