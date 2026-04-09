/**
 * AVATAR VIDEO GENERATION API
 * ============================
 *
 * Generate avatar videos with automatic provider selection and fallback.
 *
 * POST /api/avatar/generate
 * Body: { personaId, text, emotion?, gesture?, audioUrl?, outputFormat? }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  generateAvatarVideo,
  getAvatarServiceStatus,
  getAvatarIdentity,
  recommendState,
  type EmotionState,
  type GestureState,
} from "@/lib/avatar";
import type { PersonaId } from "@/lib/voice/types";

interface GenerateRequest {
  personaId: PersonaId;
  text: string;
  emotion?: EmotionState;
  gesture?: GestureState;
  audioUrl?: string;
  outputFormat?: "mp4" | "webm";
  intent?: string;
}

export async function POST(request: NextRequest) {
  try {
    const status = getAvatarServiceStatus();

    const anyConfigured =
      status.simli.configured ||
      status.sadtalker.configured ||
      status.heygen.configured ||
      status.did.configured;

    if (!anyConfigured) {
      return NextResponse.json(
        {
          error: "No avatar provider configured",
          message:
            "Set SIMLI_API_KEY, REPLICATE_API_TOKEN, HEYGEN_API_KEY, or DID_API_KEY",
          configured: false,
        },
        { status: 503 }
      );
    }

    const body: GenerateRequest = await request.json();
    const { personaId, text, emotion, gesture, audioUrl, outputFormat, intent } =
      body;

    if (!personaId) {
      return NextResponse.json(
        { error: "personaId is required" },
        { status: 400 }
      );
    }

    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const identity = getAvatarIdentity(personaId);
    if (!identity) {
      return NextResponse.json(
        { error: `Unknown persona: ${personaId}` },
        { status: 400 }
      );
    }

    // Emelia is voice-only
    if (personaId === "emelia") {
      return NextResponse.json(
        {
          error: "Emelia™ is voice-only",
          message: "Emelia does not have a video avatar. Use /api/voice/synthesize instead.",
        },
        { status: 400 }
      );
    }

    // Get recommended state if emotion/gesture not specified
    let finalEmotion = emotion;
    let finalGesture = gesture;

    if (!finalEmotion || !finalGesture) {
      const recommended = recommendState(personaId, {
        intent: intent ?? "general",
      });
      finalEmotion = finalEmotion ?? recommended.emotion;
      finalGesture = finalGesture ?? recommended.gesture;
    }

    const result = await generateAvatarVideo(
      {
        personaId,
        text,
        emotion: finalEmotion,
        gesture: finalGesture,
        outputFormat,
      },
      audioUrl
    );

    return NextResponse.json({
      success: true,
      videoUrl: result.videoUrl,
      provider: result.provider,
      personaId: result.personaId,
      emotion: finalEmotion,
      gesture: finalGesture,
      durationMs: result.durationMs,
    });
  } catch (error) {
    console.error("Avatar generation error:", error);
    return NextResponse.json(
      {
        error: "Avatar generation failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const status = getAvatarServiceStatus();

  return NextResponse.json({
    service: "Avatar Video Generation",
    description: "Generate avatar videos with automatic provider selection",
    configured:
      status.simli.configured ||
      status.sadtalker.configured ||
      status.heygen.configured ||
      status.did.configured,
    providers: {
      simli: status.simli,
      sadtalker: status.sadtalker,
      heygen: status.heygen,
      did: status.did,
    },
    usage: {
      required: ["personaId", "text"],
      optional: ["emotion", "gesture", "audioUrl", "outputFormat", "intent"],
    },
    personas: ["olivia", "cristiano"],
    note: "Emelia™ is voice-only and does not support video generation",
  });
}
