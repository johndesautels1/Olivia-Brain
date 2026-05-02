export const dynamic = "force-dynamic";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { rateLimit, requireAdminKey } from "@/lib/rate-limit";
import { createAndStartSession } from "@/lib/olivia/liveavatar";

/**
 * POST /api/olivia/liveavatar
 *
 * Creates a LiveAvatar LITE mode session for Olivia's real-time streaming avatar.
 * Returns LiveKit room credentials so the client can connect via WebRTC.
 *
 * Auth required — LiveAvatar sessions cost credits.
 *
 * TODO(week-1): swap requireAdminKey() for Clerk `auth()` once Clerk is wired.
 */
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 5,
    windowMs: 600_000,
    prefix: "olivia-liveavatar",
  });
  if (limited) return limited;

  const authReject = requireAdminKey(request);
  if (authReject) return authReject;

  try {
    if (!process.env.LIVEAVATAR_API_KEY) {
      return NextResponse.json(
        { error: "LiveAvatar not configured. Contact administrator." },
        { status: 503 },
      );
    }

    const session = await createAndStartSession();

    console.log(`[olivia/liveavatar] Session created — sessionId: ${session.sessionId}`);

    return NextResponse.json(
      {
        sessionId: session.sessionId,
        livekitUrl: session.livekitUrl,
        livekitToken: session.livekitToken,
        websocketUrl: session.websocketUrl,
      },
      { status: 200 },
    );
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    console.error("[olivia/liveavatar] Session creation error:", raw);

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
