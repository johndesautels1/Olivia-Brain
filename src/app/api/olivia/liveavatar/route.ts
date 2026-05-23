export const dynamic = "force-dynamic";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";

import {
  LiveAvatarPersonaIdSchema,
  type LiveAvatarPersonaId,
} from "@/lib/avatar/personas";
import { createAndStartSession } from "@/lib/olivia/liveavatar";
import { rateLimit, requireAuth } from "@/lib/rate-limit";

/**
 * POST /api/olivia/liveavatar
 *
 * Creates a LiveAvatar LITE mode session for a persona's real-time
 * streaming avatar. Returns LiveKit room credentials so the client
 * can connect via WebRTC.
 *
 * Request body (all fields optional):
 *   {
 *     "personaId": "olivia" | "cristiano"   // default: "olivia"
 *   }
 *
 * The URL stays at `/api/olivia/liveavatar` for backwards compatibility
 * with the existing `OliviaVideoAvatar` consumer. Cristiano's mount
 * points POST `{ "personaId": "cristiano" }` to the same URL. Renaming
 * the route would be a breaking change against deployed clients; the
 * route is now persona-aware rather than Olivia-specific.
 *
 * Response:
 *   200: { sessionId, livekitUrl, livekitToken, websocketUrl, personaId }
 *   400: { error: "Invalid JSON body" } or { error: "Invalid persona", ... }
 *   401: { error: "Authentication required" }
 *   429: { error: "Too many requests" }
 *   503: { error: "LiveAvatar not configured. Contact administrator." }
 *        or "<ENV_VAR_NAME> not configured" for missing per-persona vars
 *   500: { error: "Failed to start avatar session. Please try again." }
 *
 * Auth required — LiveAvatar sessions cost credits.
 *
 * Closes W-015: uses Clerk-integrated auth via requireAuth().
 */
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 5,
    windowMs: 600_000,
    prefix: "olivia-liveavatar",
  });
  if (limited) return limited;

  const authReject = await requireAuth();
  if (authReject) return authReject;

  // Body is optional — when absent or empty, default to Olivia so
  // existing zero-arg fetches from the legacy OliviaVideoAvatar
  // surface keep working without modification.
  let personaId: LiveAvatarPersonaId = "olivia";
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    if (rawBody && typeof rawBody === "object" && "personaId" in rawBody) {
      const candidate = (rawBody as Record<string, unknown>).personaId;
      if (candidate !== undefined && candidate !== null) {
        const parsed = LiveAvatarPersonaIdSchema.safeParse(candidate);
        if (!parsed.success) {
          return NextResponse.json(
            {
              error: "Invalid persona",
              details: parsed.error.issues,
            },
            { status: 400 },
          );
        }
        personaId = parsed.data;
      }
    }
  }

  try {
    if (!process.env.LIVEAVATAR_API_KEY) {
      return NextResponse.json(
        { error: "LiveAvatar not configured. Contact administrator." },
        { status: 503 },
      );
    }

    const session = await createAndStartSession(personaId);

    console.log(
      `[olivia/liveavatar] Session created — persona: ${personaId}, sessionId: ${session.sessionId}`,
    );

    return NextResponse.json(
      {
        sessionId: session.sessionId,
        livekitUrl: session.livekitUrl,
        livekitToken: session.livekitToken,
        websocketUrl: session.websocketUrl,
        personaId: session.personaId,
      },
      { status: 200 },
    );
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    console.error(
      `[olivia/liveavatar] Session creation error — persona: ${personaId}:`,
      raw,
    );

    // Missing-env-var path bubbles up from `requireLiveAvatarPersona` as
    // a clean "<VAR_NAME> not configured" message — surface that to the
    // client as a 503 so they see exactly which var the deployment is
    // missing (matches the 2026 actionable-error bar).
    const missingVarMatch = raw.match(/^([A-Z][A-Z0-9_]+) not configured$/);
    if (missingVarMatch) {
      return NextResponse.json(
        { error: `${missingVarMatch[1]} not configured. Contact administrator.` },
        { status: 503 },
      );
    }

    let userMessage = "Failed to start avatar session. Please try again.";
    if (/not configured/i.test(raw)) {
      userMessage = "Avatar service is not configured. Contact administrator.";
    } else if (/401|unauthorized/i.test(raw)) {
      userMessage = "Avatar service authentication failed.";
    } else if (/timeout|abort/i.test(raw)) {
      userMessage = "Avatar service timed out. Please try again.";
    }

    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}
