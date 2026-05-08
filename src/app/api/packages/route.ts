/**
 * `/api/packages` — Track B Session 8b-routes.
 *
 * GET   List the caller's packages (most-recent first; capped at 50).
 *         Returns `[{ id, name, outreachGoal, packageStatus }]`
 *         shape consumed by SaveToPackageModal.
 * POST  Body `{ name, outreachGoal }` → create a new package.
 *         Returns the created package row.
 *
 * Auth: `getAuthSession()` (Track F gate).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const LIST_LIMIT = 50 as const;

const PackagePostSchema = z.object({
  name: z.string().min(1).max(200),
  outreachGoal: z.string().min(1).max(80),
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
    prefix: "packages-list",
  });
  if (limited) return limited;

  const auth = await authedUserId();
  if (auth instanceof NextResponse) return auth;

  const rows = await prisma.documentPackage.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: "desc" },
    take: LIST_LIMIT,
    select: {
      id: true,
      name: true,
      outreachGoal: true,
      packageStatus: true,
    },
  });

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 10,
    windowMs: 60_000,
    prefix: "packages-create",
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
  const parsed = PackagePostSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(`Validation failed: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
  }

  const created = await prisma.documentPackage.create({
    data: {
      userId: auth.userId,
      name: parsed.data.name,
      outreachGoal: parsed.data.outreachGoal,
    },
    select: {
      id: true,
      name: true,
      outreachGoal: true,
      packageStatus: true,
      createdAt: true,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
