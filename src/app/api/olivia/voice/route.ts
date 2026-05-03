// src/app/api/olivia/voice/route.ts
// Olivia voice endpoint — ElevenLabs text-to-speech with browser fallback

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  // Rate limit: 15 per minute
  const limited = rateLimit(request, {
    limit: 15,
    windowMs: 60_000,
    prefix: "olivia-voice",
  });
  if (limited) return limited;

  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    if (text.length > 5000) {
      return NextResponse.json(
        { error: "Text too long (max 5000 characters)" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_OLIVIA_VOICE_ID;

    // If ElevenLabs not configured, signal client to use browser fallback
    if (!apiKey || !voiceId) {
      return NextResponse.json({
        fallback: true,
        text: text.trim(),
        reason: "ElevenLabs not configured",
      });
    }

    // Call ElevenLabs TTS API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: text.trim(),
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("[ElevenLabs Error]", response.status, errorText);

      // Fallback to browser speech
      return NextResponse.json({
        fallback: true,
        text: text.trim(),
        reason: `ElevenLabs returned ${response.status}`,
      });
    }

    // Stream the audio response back to the client
    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[Olivia Voice Error]", error);

    // Fallback on any error
    return NextResponse.json({
      fallback: true,
      text: "",
      reason: "Internal error",
    });
  }
}
