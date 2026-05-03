// src/app/api/olivia/call/audio/route.ts
// Audio generation endpoint for Olivia voice calls
// Generates and streams ElevenLabs audio for the call

import { NextRequest, NextResponse } from "next/server";
import { generateOliviaAudio, isElevenLabsConfigured } from "@/lib/elevenlabs/client";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Olivia's signature sign-off for calls
const OLIVIA_SIGNOFF = "This message was delivered by Olivia, your Chief of Staff at London Tech Map.";

// Max message length (ElevenLabs has ~5000 char limit, we use 2000 for safety + signoff)
const MAX_MESSAGE_LENGTH = 2000;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const encodedMessage = searchParams.get("m");

    if (!encodedMessage) {
      return NextResponse.json(
        { error: "Missing message parameter" },
        { status: 400 }
      );
    }

    // Decode the message
    let message: string;
    try {
      message = Buffer.from(encodedMessage, "base64url").toString("utf-8");
    } catch {
      return NextResponse.json(
        { error: "Invalid message encoding" },
        { status: 400 }
      );
    }

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Empty message" },
        { status: 400 }
      );
    }

    // Validate decoded message length
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` },
        { status: 400 }
      );
    }

    // Check ElevenLabs configuration
    if (!isElevenLabsConfigured()) {
      console.error("[Olivia Audio] ElevenLabs not configured");
      return NextResponse.json(
        { error: "Voice service not configured" },
        { status: 503 }
      );
    }

    // Add Olivia's signature sign-off to the message
    const fullMessage = `${message.trim()}. ${OLIVIA_SIGNOFF}`;

    // Generate audio using shared ElevenLabs client
    const result = await generateOliviaAudio(fullMessage);

    if (!result.success || !result.audioBuffer) {
      console.error("[Olivia Audio] Generation failed:", result.error);
      return NextResponse.json(
        { error: "Failed to generate audio" },
        { status: 502 }
      );
    }

    console.log(`[Olivia Audio] Generated ${result.audioBuffer.byteLength} bytes of audio`);

    return new NextResponse(result.audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": result.contentType || "audio/mpeg",
        "Content-Length": result.audioBuffer.byteLength.toString(),
        "Cache-Control": "private, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("[Olivia Audio] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
