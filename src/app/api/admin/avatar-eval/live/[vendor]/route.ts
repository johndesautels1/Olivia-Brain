/**
 * `/api/admin/avatar-eval/live/[vendor]` — Track O5c-Lift S4.
 *
 * Server-proxied "Run live (TTFM)" endpoint for the avatar A/B
 * harness. Each vendor exposes a different surface so we can't just
 * have the client POST to the vendor directly:
 *
 * - tavus: creates a conversation via createTavusSession (untimed),
 *   then times sendTavusUtterance (request-start → 200 OK) per the
 *   founder's S2 choice "Server pipe + utterance accept", then ends
 *   the conversation. The conversation creation is excluded from the
 *   timing because it's session-setup overhead (~1–3s on cold start)
 *   that wouldn't be paid per-reply at runtime.
 *
 * - simli: times createSimliSession itself (request-start → 200 OK).
 *   Simli's "ready to render" signal IS the session creation response;
 *   speak()-equivalent timing would require an ElevenLabs PCM bridge
 *   (deferred to a future session). After the timing the session is
 *   ended so it doesn't bill idle.
 *
 * - liveavatar: NOT served here — the existing
 *   `/api/olivia/liveavatar/speak-stream` route is what the harness
 *   times for that vendor (request-start → first PCM byte from
 *   ElevenLabs through our server). The harness keeps that path.
 *
 * Returns `{ ok: true, vendor, ttfmMs, notes }` on success.
 * Returns `{ ok: false, error }` with 4xx/5xx on failure. Vendor not
 * configured surfaces as 503 with a clear message that names the env
 * var that's missing.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import {
  createSimliSession,
  endSimliSession,
  isSimliConfigured,
} from "@/lib/avatar/simli";
import {
  createTavusSession,
  endTavusSession,
  isTavusConfigured,
  sendTavusUtterance,
} from "@/lib/avatar/tavus";
import type { PersonaId } from "@/lib/voice/types";

const VALID_PERSONA_IDS: readonly PersonaId[] = ["olivia", "cristiano", "emelia"];
function isPersonaId(value: string): value is PersonaId {
  return (VALID_PERSONA_IDS as readonly string[]).includes(value);
}

export const dynamic = "force-dynamic";

/** Vendors served by this route. liveavatar uses its own path. */
const LIVE_VENDORS = ["tavus", "simli"] as const;
type LiveVendor = (typeof LIVE_VENDORS)[number];

function badRequest(message: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status });
}

async function requireAdmin(): Promise<{ userId: string } | NextResponse> {
  try {
    const session = await getAuthSession();
    if (!session.userId) return badRequest("Unauthorized", 401);
    return { userId: session.userId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Auth unavailable";
    return badRequest(msg, 503);
  }
}

const BodySchema = z.object({
  /** Text to speak (Tavus only — Simli ignores it because session
   *  creation is what's timed). Capped at the same 5000 chars
   *  OliviaVideoAvatar enforces on the LiveAvatar speak path. */
  text: z.string().min(1).max(5000),
  /** Persona to instantiate. Defaults to Olivia. */
  personaId: z.string().min(1).max(64).optional(),
});

interface SuccessBody {
  ok: true;
  vendor: LiveVendor;
  ttfmMs: number;
  notes: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ vendor: string }> },
): Promise<NextResponse> {
  const limited = rateLimit(request, {
    limit: 30,
    windowMs: 600_000,
    prefix: "avatar-eval-live",
  });
  if (limited) return limited;

  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { vendor: vendorParam } = await params;
  if (!(LIVE_VENDORS as readonly string[]).includes(vendorParam)) {
    return badRequest(
      `Unsupported vendor "${vendorParam}". This route handles ${LIVE_VENDORS.join(
        " / ",
      )}; liveavatar uses /api/olivia/liveavatar/speak-stream.`,
      404,
    );
  }
  const vendor = vendorParam as LiveVendor;

  let body: z.infer<typeof BodySchema>;
  try {
    const raw = (await request.json()) as unknown;
    body = BodySchema.parse(raw);
  } catch (err) {
    const msg = err instanceof z.ZodError
      ? err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
      : err instanceof SyntaxError
        ? "Invalid JSON"
        : err instanceof Error
          ? err.message
          : "Invalid body";
    return badRequest(msg);
  }

  const personaIdRaw = body.personaId ?? "olivia";
  if (!isPersonaId(personaIdRaw)) {
    return badRequest(
      `Unknown personaId "${personaIdRaw}". Valid: ${VALID_PERSONA_IDS.join(" / ")}.`,
    );
  }
  const personaId: PersonaId = personaIdRaw;

  try {
    if (vendor === "tavus") {
      if (!isTavusConfigured()) {
        return badRequest(
          "Tavus not configured — set TAVUS_API_KEY in Vercel.",
          503,
        );
      }
      // Setup: create conversation. Untimed — this is ~1–3s of
      // session bootstrap that wouldn't be paid per-reply at runtime.
      const session = await createTavusSession({ personaId });
      const conversationId = session.sessionId;
      try {
        // Timed: server pipe + utterance accept.
        const t0 = performance.now();
        await sendTavusUtterance(conversationId, body.text);
        const t1 = performance.now();
        const ttfmMs = Math.max(0, Math.round(t1 - t0));
        const result: SuccessBody = {
          ok: true,
          vendor: "tavus",
          ttfmMs,
          notes:
            "Tavus utterance accept latency (excludes ~1–3s cold-start conversation creation).",
        };
        return NextResponse.json(result);
      } finally {
        // Always end the conversation so we don't bill idle
        // sessions even if the timing path threw.
        try {
          await endTavusSession(conversationId);
        } catch {
          /* ignore — best-effort cleanup */
        }
      }
    }

    // vendor === "simli"
    if (!isSimliConfigured()) {
      return badRequest(
        "Simli not configured — set SIMLI_API_KEY in Vercel.",
        503,
      );
    }
    // Times the createSimliSession round-trip end-to-end. body.text is
    // accepted but unused — Simli's speak path needs an ElevenLabs PCM
    // bridge that hasn't shipped (deferred to a future session).
    const t0 = performance.now();
    const session = await createSimliSession({ personaId });
    const t1 = performance.now();
    const ttfmMs = Math.max(0, Math.round(t1 - t0));
    try {
      const result: SuccessBody = {
        ok: true,
        vendor: "simli",
        ttfmMs,
        notes:
          "Simli session-create latency (text input ignored — PCM bridge deferred).",
      };
      return NextResponse.json(result);
    } finally {
      try {
        await endSimliSession(session.sessionId);
      } catch {
        /* ignore — best-effort cleanup */
      }
    }
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    console.error(`[avatar-eval/live/${vendor}] error:`, raw);
    // Surface vendor messages verbatim — operators reading the
    // harness need them to debug API key / quota / replica issues.
    return NextResponse.json(
      { ok: false, error: raw, vendor },
      { status: 502 },
    );
  }
}
