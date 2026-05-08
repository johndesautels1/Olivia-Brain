/**
 * `/api/admin/investors/moderation` — Track P Session P4.
 *
 * GET    list pending founder-submitted records (source='founder_submitted'
 *          AND isActive=false AND isArchived=false).
 * PATCH  approve / reject a pending record by id.
 *           - approve → set isActive=true (becomes a live lookup row).
 *           - reject  → set isArchived=true (preserves the audit history).
 *
 * Auth: pre-Clerk `getAuthSession()` stub (W-015).
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getAuthSession } from '@/lib/auth/session';
import prisma from '@/lib/db/client';
import { rateLimit } from '@/lib/rate-limit';

import { toRecord } from '@/lib/deal-protection/investor-lookup';

export const dynamic = 'force-dynamic';

const QUEUE_LIMIT = 100 as const;

const ModerationActionSchema = z.object({
  id: z.string().min(1),
  action: z.enum(['approve', 'reject']),
});

function badRequest(message: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status });
}

async function requireAdmin(): Promise<{ userId: string } | NextResponse> {
  try {
    const session = await getAuthSession();
    if (!session.userId) return badRequest('Unauthorized', 401);
    return { userId: session.userId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Auth unavailable';
    return badRequest(msg, 503);
  }
}

// ─────────────────────────────────────────────────────────────────────
// GET — pending moderation queue.
// ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 60,
    windowMs: 60_000,
    prefix: 'admin-investors-moderation-list',
  });
  if (limited) return limited;

  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const rows = await prisma.investorReputation.findMany({
      where: {
        source: 'founder_submitted',
        isActive: false,
        isArchived: false,
      },
      orderBy: { createdAt: 'asc' },
      take: QUEUE_LIMIT,
    });
    return NextResponse.json({
      ok: true,
      records: rows.map(toRecord),
    });
  } catch (err) {
    console.error('[api/admin/investors/moderation GET] Error:', err);
    return badRequest('Failed to load moderation queue', 500);
  }
}

// ─────────────────────────────────────────────────────────────────────
// PATCH — approve / reject.
// ─────────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 30,
    windowMs: 60_000,
    prefix: 'admin-investors-moderation-write',
  });
  if (limited) return limited;

  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const validated = ModerationActionSchema.safeParse(raw);
  if (!validated.success) {
    return badRequest(
      `Validation failed: ${validated.error.issues.map((i) => i.message).join('; ')}`,
    );
  }
  const { id, action } = validated.data;

  try {
    /* Verify the row is actually in the moderation queue before
       acting on it. Prevents an admin from accidentally approving
       an admin-created or seeded entry via this endpoint. */
    const existing = await prisma.investorReputation.findFirst({
      where: { id, source: 'founder_submitted' },
    });
    if (!existing) {
      return badRequest('Moderation entry not found', 404);
    }

    const data =
      action === 'approve'
        ? { isActive: true }
        : { isArchived: true };
    const row = await prisma.investorReputation.update({
      where: { id },
      data,
    });
    return NextResponse.json({ ok: true, record: toRecord(row) });
  } catch (err) {
    console.error('[api/admin/investors/moderation PATCH] Error:', err);
    return badRequest('Moderation action failed', 500);
  }
}
