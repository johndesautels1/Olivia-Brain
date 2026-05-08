/**
 * `/api/documents/[id]/share/[shareId]` — Track B Session 8b-routes.
 *
 * DELETE  Revoke a share. Soft-revoke: sets `isRevoked = true` so the
 *           audit trail and view-count metadata persist, but the
 *           public reader treats the row as 404 (logic in the
 *           share-reader route, separate from this revoke endpoint).
 *
 * Auth: `getAuthSession()`. Verifies the share belongs to the caller.
 */

import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function fail(message: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status });
}

async function authedUserId(): Promise<{ userId: string } | NextResponse> {
  try {
    const session = await getAuthSession();
    if (!session.userId) return fail("Unauthorized", 401);
    return { userId: session.userId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Auth unavailable";
    return fail(msg, 503);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; shareId: string }> },
) {
  const limited = rateLimit(request, {
    limit: 30,
    windowMs: 60_000,
    prefix: "documents-share-revoke",
  });
  if (limited) return limited;

  const auth = await authedUserId();
  if (auth instanceof NextResponse) return auth;

  const { id: documentId, shareId } = await params;
  if (!documentId || !shareId) return fail("documentId and shareId are required");

  const existing = await prisma.documentShare.findFirst({
    where: { id: shareId, ownerUserId: auth.userId, documentId },
    select: { id: true, isRevoked: true },
  });
  if (!existing) return fail("Share not found", 404);
  if (existing.isRevoked) {
    return NextResponse.json({ ok: true, alreadyRevoked: true });
  }

  await prisma.documentShare.update({
    where: { id: existing.id },
    data: { isRevoked: true },
  });

  return NextResponse.json({ ok: true, alreadyRevoked: false });
}
