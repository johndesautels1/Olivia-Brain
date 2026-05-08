/**
 * `/api/packages/documents` — Track B Session 8b-routes.
 *
 * POST  Body `{ packageId, documentId }` → adds a document to a
 *         package. Idempotent on the `(packageId, documentId)`
 *         compound unique. Returns the row so the caller can render
 *         the in-package status.
 *
 * Auth: `getAuthSession()`. The package is verified to belong to the
 * caller (404 otherwise) so users cannot add documents to other
 * users' packages.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const PackageItemPostSchema = z.object({
  packageId: z.string().uuid(),
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

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 30,
    windowMs: 60_000,
    prefix: "packages-add-document",
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
  const parsed = PackageItemPostSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(`Validation failed: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
  }
  const { packageId, documentId } = parsed.data;

  const pkg = await prisma.documentPackage.findFirst({
    where: { id: packageId, userId: auth.userId },
    select: { id: true },
  });
  if (!pkg) return fail("Package not found", 404);

  const existing = await prisma.packageItem.findUnique({
    where: { packageId_documentId: { packageId, documentId } },
    select: { id: true, position: true },
  });
  if (existing) {
    return NextResponse.json({ ok: true, alreadyInPackage: true, item: existing });
  }

  // Position = current count, so new items append.
  const itemCount = await prisma.packageItem.count({ where: { packageId } });
  const created = await prisma.packageItem.create({
    data: { packageId, documentId, position: itemCount },
    select: { id: true, packageId: true, documentId: true, position: true, addedAt: true },
  });

  return NextResponse.json({ ok: true, alreadyInPackage: false, item: created }, { status: 201 });
}
