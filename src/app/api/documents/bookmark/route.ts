/**
 * `/api/documents/bookmark` — Track B Session 8b-routes.
 *
 * GET   `?documentId=...` → `{ bookmarked: boolean }`. Used by
 *         BookmarkButton to render initial state on mount.
 * POST  body `{ documentId }` → `{ bookmarked: boolean }`. Idempotent
 *         toggle: if no row exists for this `(userId, documentId)`,
 *         creates one and returns `bookmarked: true`. Otherwise
 *         deletes and returns `bookmarked: false`.
 *
 * Auth: pre-Clerk-aware `getAuthSession()` (Track F gate).
 *
 * # Operator action owed
 *
 * `prisma/sql/08-add-documents-engine-write-surface.sql` must be
 * applied to Supabase before this route can persist. Without the
 * migration the route 500s on first request.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const BookmarkPostSchema = z.object({
  documentId: z.string().min(1).max(200),
});

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

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 60,
    windowMs: 60_000,
    prefix: "documents-bookmark-read",
  });
  if (limited) return limited;

  const auth = await authedUserId();
  if (auth instanceof NextResponse) return auth;

  const documentId = request.nextUrl.searchParams.get("documentId");
  if (!documentId) return fail("documentId query param is required");

  const row = await prisma.documentBookmark.findUnique({
    where: { userProfileId_documentId: { userProfileId: auth.userId, documentId } },
    select: { id: true },
  });

  return NextResponse.json({ bookmarked: row !== null });
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 30,
    windowMs: 60_000,
    prefix: "documents-bookmark-write",
  });
  if (limited) return limited;

  const auth = await authedUserId();
  if (auth instanceof NextResponse) return auth;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return fail("Invalid JSON body");
  }
  const parsed = BookmarkPostSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(`Validation failed: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
  }

  const { documentId } = parsed.data;
  const existing = await prisma.documentBookmark.findUnique({
    where: { userProfileId_documentId: { userProfileId: auth.userId, documentId } },
    select: { id: true },
  });

  if (existing) {
    await prisma.documentBookmark.delete({ where: { id: existing.id } });
    return NextResponse.json({ bookmarked: false });
  }

  await prisma.documentBookmark.create({
    data: { userProfileId: auth.userId, documentId },
  });
  return NextResponse.json({ bookmarked: true });
}
