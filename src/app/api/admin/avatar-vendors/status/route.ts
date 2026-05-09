/**
 * `/api/admin/avatar-vendors/status` — Track O5c follow-up.
 *
 * GET-only. Returns per-vendor configured status so the harness at
 * `/admin/avatar-eval` can show the operator at a glance which
 * vendors they can run live triggers against today.
 *
 * Auth: pre-Clerk `getAuthSession()` stub (W-015) — same gate as
 * every other `/api/admin/*` route.
 */
import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { getAllVendorHealth } from "@/lib/avatar/status";

export const dynamic = "force-dynamic";

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

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 60,
    windowMs: 60_000,
    prefix: "admin-avatar-vendors-status",
  });
  if (limited) return limited;

  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json({ ok: true, vendors: getAllVendorHealth() });
}
