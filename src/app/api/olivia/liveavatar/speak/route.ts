export const dynamic = "force-dynamic";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { rateLimit, requireAdminKey } from "@/lib/rate-limit";

/**
 * POST /api/olivia/liveavatar/speak
 *
 * Generates TTS audio via ElevenLabs streaming endpoint and returns
 * the complete PCM 16-bit 24kHz audio as a single base64 blob.
 *
 * Uses the /stream endpoint (faster time-to-first-byte than batch)
 * but collects all chunks server-side so the client receives one
 * complete audio payload for LiveAvatar's agent.speak command.
 *
 * Request:  { text: string }
 * Response: { audio: string } (base64 PCM), or { fallback: true }
 *
 * TODO(week-1): swap requireAdminKey() for Clerk `auth()` once Clerk is wired.
 */
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 30,
    windowMs: 60_000,
    prefix: "olivia-liveavatar-speak",
  });
  if (limited) return limited;

  const authReject = requireAdminKey(request);
  if (authReject) return authReject;

  try {
    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }
    if (text.length > 5000) {
      return NextResponse.json({ error: "Text too long (max 5000 chars)" }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_OLIVIA_VOICE_ID;

    if (!apiKey || !voiceId) {
      return NextResponse.json({ fallback: true, text, reason: "ElevenLabs not configured" });
    }

    // ElevenLabs STREAMING endpoint — output_format MUST be a query parameter
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=pcm_24000`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("[liveavatar/speak] ElevenLabs error:", response.status, errorText);
      return NextResponse.json({ fallback: true, text, reason: `ElevenLabs ${response.status}` });
    }

    if (!response.body) {
      return NextResponse.json({ fallback: true, text, reason: "No stream body" });
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalLength = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        totalLength += value.length;
      }
    }

    const merged = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    const base64Audio = Buffer.from(merged).toString("base64");
    return NextResponse.json({ audio: base64Audio }, { status: 200 });
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    console.error("[liveavatar/speak] Error:", raw);
    return NextResponse.json({ fallback: true, text: "", reason: "Internal error" });
  }
}
