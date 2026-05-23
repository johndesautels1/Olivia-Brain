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
 * POST /api/olivia/liveavatar/speak-stream  —  Track O5a
 *
 * Streams ElevenLabs TTS PCM through to the client without buffering.
 * The client splits the stream into ~250ms chunks and forwards each as
 * its own `agent.speak` WebSocket message to LiveAvatar (per LiveAvatar
 * LITE Mode protocol — multiple `agent.speak` then `agent.speak_end`,
 * see docs/HEYGEN_LTM_CONFIG.md §4 and LTM's REFERENCES.md audio spec).
 *
 * Why a separate route from `/speak`:
 *   - `/speak` returns base64 PCM as JSON. Non-streaming clients (and
 *     server-to-server agents that don't run a WebSocket) still need
 *     that shape. We don't break it.
 *   - This route returns `application/octet-stream` chunked. Fully
 *     incompatible response shape.
 *
 * Why we model-swapped to eleven_turbo_v2_5:
 *   - `/speak` uses eleven_multilingual_v2 (~500ms TTFB). Turbo is
 *     ~250ms TTFB with comparable English quality. Multilingual stays
 *     reachable via `/speak` for the rare non-English reply (today's
 *     spoke-router emits English-only Olivia replies; revisit when
 *     Mistral spoke output lands).
 *
 * Pre-roll math:
 *   PCM 16-bit 24kHz = 48 bytes/ms. A 200-char reply ≈ 12s of audio
 *   ≈ 576KB total. Buffering it adds the full TTS gen time (~1.5s)
 *   to time-to-first-mouth-movement. Streaming drops that to the
 *   first ElevenLabs encoder-frame which is ~80-150ms after request.
 *
 * Response:
 *   200 + body: raw PCM bytes (chunked).
 *   200 + JSON `{ fallback: true, reason }` if ElevenLabs is
 *     unconfigured or returned an error before any bytes streamed.
 *     Client must fall back to /speak (or render text-only).
 *   400 if validation fails. 401 from requireAuth. 429 from rateLimit.
 *
 * Closes part of W-005 lip-sync upgrade (Track O5a).
 */
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 30,
    windowMs: 60_000,
    prefix: "olivia-liveavatar-speak-stream",
  });
  if (limited) return limited;

  const authReject = await requireAuth();
  if (authReject) return authReject;

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

  // Persona resolution — defaults to "olivia" when the field is absent
  // (backwards compat with legacy fetches from OliviaVideoAvatar that
  // pre-date the persona-aware refactor).
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

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { fallback: true, reason: "ELEVENLABS_API_KEY not configured" },
      { status: 200 },
    );
  }

  const personaResolution = resolveLiveAvatarPersona(personaId);
  if (!personaResolution.ok) {
    return NextResponse.json(
      {
        fallback: true,
        reason: `${personaResolution.missingVar} not configured`,
      },
      { status: 200 },
    );
  }
  const { voiceId } = personaResolution;

  // Open ElevenLabs streaming endpoint. Model + voice settings tuned for
  // Olivia's persona (warm, professional). Turbo halves TTFB vs multilingual.
  const upstream = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=pcm_24000`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
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

  if (!upstream.ok) {
    const reason = `ElevenLabs ${upstream.status}`;
    const detail = await upstream.text().catch(() => "");
    console.error(
      `[liveavatar/speak-stream] persona: ${personaId}, ${reason}:`,
      detail.slice(0, 300),
    );
    return NextResponse.json({ fallback: true, reason }, { status: 200 });
  }

  if (!upstream.body) {
    return NextResponse.json(
      { fallback: true, reason: "No upstream stream body" },
      { status: 200 },
    );
  }

  // Pass the raw PCM body through. Next.js + Node runtime support
  // returning a ReadableStream<Uint8Array> as the Response body — chunks
  // forward to the client as ElevenLabs delivers them, no buffering.
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Cache-Control": "no-cache, no-store",
      // Custom header so the client can distinguish "stream succeeded"
      // from "fallback JSON" without parsing the body. The Content-Type
      // alone is unreliable because some proxies normalize it.
      "X-Olivia-Audio-Format": "pcm_24000",
    },
  });
}
