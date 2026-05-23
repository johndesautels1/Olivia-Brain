export const dynamic = "force-dynamic";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";

import {
  LiveAvatarPersonaIdSchema,
  resolveLiveAvatarPersona,
  type LiveAvatarPersonaId,
} from "@/lib/avatar/personas";
import { rateLimit, requireAuth } from "@/lib/rate-limit";

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
 * Request:  { text: string; personaId?: "olivia" | "cristiano" }
 *           // personaId defaults to "olivia" for backwards compat.
 * Response: { audio: string } (base64 PCM), or { fallback: true, reason }
 *
 * Closes W-015: uses Clerk-integrated auth via requireAuth().
 */
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 30,
    windowMs: 60_000,
    prefix: "olivia-liveavatar-speak",
  });
  if (limited) return limited;

  const authReject = await requireAuth();
  if (authReject) return authReject;

  // Parse JSON outside the upstream try/catch so a malformed body
  // returns a clean 400 — same pattern as the consent route fix.
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text =
    rawBody && typeof rawBody === "object" && "text" in rawBody && typeof (rawBody as { text?: unknown }).text === "string"
      ? ((rawBody as { text: string }).text).trim()
      : "";

  if (!text) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }
  if (text.length > 5000) {
    return NextResponse.json({ error: "Text too long (max 5000 chars)" }, { status: 400 });
  }

  // Persona resolution — defaults to Olivia when the field is absent
  // (backwards compat with legacy OliviaVideoAvatar fetches that don't
  // include personaId yet).
  let personaId: LiveAvatarPersonaId = "olivia";
  if (rawBody && typeof rawBody === "object" && "personaId" in rawBody) {
    const candidate = (rawBody as Record<string, unknown>).personaId;
    if (candidate !== undefined && candidate !== null) {
      const parsed = LiveAvatarPersonaIdSchema.safeParse(candidate);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid persona", details: parsed.error.issues },
          { status: 400 },
        );
      }
      personaId = parsed.data;
    }
  }

  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        fallback: true,
        text,
        reason: "ELEVENLABS_API_KEY not configured",
      });
    }

    const personaResolution = resolveLiveAvatarPersona(personaId);
    if (!personaResolution.ok) {
      return NextResponse.json({
        fallback: true,
        text,
        reason: `${personaResolution.missingVar} not configured`,
      });
    }
    const { voiceId } = personaResolution;

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
          // Track O5b — turbo halves TTFB vs multilingual_v2 (~250ms
          // vs ~500ms) at comparable English quality. Track J spoke
          // routing today emits English-only Olivia replies; revisit
          // this model selection if/when Mistral spoke output adds
          // non-English text into this path.
          model_id: "eleven_turbo_v2_5",
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
      console.error(
        `[liveavatar/speak] ElevenLabs error — persona: ${personaId}, status: ${response.status}, body: ${errorText.slice(0, 300)}`,
      );
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
    console.error(`[liveavatar/speak] Error — persona: ${personaId}:`, raw);
    return NextResponse.json({ fallback: true, text: "", reason: "Internal error" });
  }
}
