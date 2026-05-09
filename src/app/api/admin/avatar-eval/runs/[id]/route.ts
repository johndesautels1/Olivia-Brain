/**
 * `/api/admin/avatar-eval/runs/[id]` — DELETE only.
 *
 * Track O5c follow-up. Lets the operator remove a single
 * AvatarEvalRun row from the harness when they recorded a run with
 * a typo'd latency or wrong vendor selection. Confirmation lives
 * client-side; this endpoint is the surface.
 *
 * Mirrors the auth + rate-limit shape of the collection route at
 * `../route.ts`.
 */
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";
import { rateLimit } from "@/lib/rate-limit";

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

// UUID v4 (and v1-v5) shape — Prisma's @db.Uuid column rejects bad
// strings with a noisy error. Validate first so we return a clean
// 400 instead of leaking a Prisma message.
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const limited = rateLimit(request, {
    limit: 60,
    windowMs: 60_000,
    prefix: "admin-avatar-eval-delete",
  });
  if (limited) return limited;

  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) {
    return badRequest("Invalid run id (expected UUID)");
  }

  try {
    await prisma.avatarEvalRun.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return badRequest("Run not found", 404);
    }
    console.error("[api/admin/avatar-eval/runs/[id] DELETE] Error:", err);
    return badRequest("Delete failed", 500);
  }
}
