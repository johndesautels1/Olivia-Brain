/**
 * `/api/documents/[id]/share` — Track B Session 8b-routes.
 *
 * GET   List shares for this document owned by the caller. Returns
 *         the shape ShareDocumentModal renders in its "Existing
 *         links" tab — id + shareToken + recipient + viewCount +
 *         lastViewedAt + isRevoked + expiresAt + createdAt.
 * POST  Body `{ recipientEmail?, recipientName?, message?, expiresAt? }`
 *         → create a share with a fresh opaque token. Returns
 *         `{ shareUrl, shareToken, ... }`. Plan-gate hook: if the
 *         caller's plan does not include sharing, returns 403 with
 *         `{ error, upgradeUrl }` (today: stub always allows; the
 *         plan tier check lands when entitlements are wired).
 */

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const SharePostSchema = z.object({
  recipientEmail: z.string().email().max(320).optional(),
  recipientName: z.string().min(1).max(200).optional(),
  message: z.string().max(2000).optional(),
  expiresAt: z.string().datetime().optional(),
});

function fail(message: string, status = 400, extra?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ ok: false, error: message, ...(extra ?? {}) }, { status });
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

function generateShareToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

function shareUrlFromToken(request: NextRequest, token: string): string {
  const origin = request.nextUrl.origin;
  return `${origin}/documents/share/${token}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = rateLimit(request, {
    limit: 60,
    windowMs: 60_000,
    prefix: "documents-share-list",
  });
  if (limited) return limited;

  const auth = await authedUserId();
  if (auth instanceof NextResponse) return auth;

  const { id: documentId } = await params;
  if (!documentId) return fail("documentId path param is required");

  const rows = await prisma.documentShare.findMany({
    where: { userId: auth.userId, documentId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      shareToken: true,
      recipientEmail: true,
      recipientName: true,
      message: true,
      expiresAt: true,
      isRevoked: true,
      viewCount: true,
      lastViewedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json(rows);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = rateLimit(request, {
    limit: 10,
    windowMs: 60_000,
    prefix: "documents-share-create",
  });
  if (limited) return limited;

  const auth = await authedUserId();
  if (auth instanceof NextResponse) return auth;

  const { id: documentId } = await params;
  if (!documentId) return fail("documentId path param is required");

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return fail("Invalid JSON body");
  }
  const parsed = SharePostSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(`Validation failed: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
  }

  // Plan-gate hook — when entitlements ship, replace this block with a
  // tier check that returns 403 + upgradeUrl for plans without sharing.
  // Today: always allow.

  const token = generateShareToken();
  const created = await prisma.documentShare.create({
    data: {
      userId: auth.userId,
      documentId,
      shareToken: token,
      recipientEmail: parsed.data.recipientEmail ?? null,
      recipientName: parsed.data.recipientName ?? null,
      message: parsed.data.message ?? null,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    },
    select: {
      id: true,
      shareToken: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json(
    {
      shareUrl: shareUrlFromToken(request, token),
      ...created,
    },
    { status: 201 },
  );
}
