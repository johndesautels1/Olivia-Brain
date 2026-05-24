/**
 * GET /api/cristiano/verdicts/[id]
 *
 * Fetches a single Cristiano verdict by id for the authenticated user.
 * Wrong-user fetches return 404 (owner check enforced at the Prisma
 * query layer, not as a post-fetch guard — defence-in-depth against
 * IDOR vulnerabilities).
 *
 * Response shape:
 *   200: { ok: true, verdict: CristianoVerdictRecord }
 *   400: { ok: false, error: "Invalid verdict id" }
 *   401: { ok: false, error: "Authentication required" }
 *   404: { ok: false, error: "Verdict not found" }
 *   429: { ok: false, error: "Too many requests" }
 *   503: { ok: false, error: <auth misconfig> }
 *
 * Held to Apple / Microsoft / Google 2026 leading coding practices per
 * `~/CLAUDE.md` and `docs/api-specs/_MASTER_REGISTER.md §10.4`.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/auth/session";
import { findVerdictByIdForUser, toRecord } from "@/lib/cristiano/persist";
import { rateLimit } from "@/lib/rate-limit";

// ─── Auth helper ─────────────────────────────────────────────────────────────

async function requireUserOrResponse(): Promise<
  { userId: string } | NextResponse
> {
  try {
    const { userId } = await getAuthSession();
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 },
      );
    }
    return { userId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Auth unavailable";
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}

// ─── Id validator ────────────────────────────────────────────────────────────

const VerdictIdSchema = z.string().uuid();

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const limited = rateLimit(request, {
    limit: 60,
    windowMs: 60_000,
    prefix: "cristiano-verdicts-detail",
  });
  if (limited) return limited;

  const auth = await requireUserOrResponse();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const { id: rawId } = await context.params;
  const parsedId = VerdictIdSchema.safeParse(rawId);
  if (!parsedId.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid verdict id — must be a UUID" },
      { status: 400 },
    );
  }

  try {
    const row = await findVerdictByIdForUser(parsedId.data, userId);
    if (!row) {
      return NextResponse.json(
        { ok: false, error: "Verdict not found" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { ok: true, verdict: toRecord(row) },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(
      `[cristiano/verdicts/${parsedId.data}] Fetch failed for user ${userId}:`,
      message,
    );
    return NextResponse.json(
      { ok: false, error: "Failed to load verdict" },
      { status: 500 },
    );
  }
}
