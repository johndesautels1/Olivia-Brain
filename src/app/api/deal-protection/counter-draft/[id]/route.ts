/**
 * `/api/deal-protection/counter-draft/[id]` — Track P Session P6.
 *
 * GET    a single counter draft by id. Verifies ownership.
 * PATCH  attach / update `founderNotes` on a counter draft. The redline
 *         body itself is immutable once persisted (regenerate to make
 *         a new version); only the founder's running notes are
 *         editable.
 *
 * Auth: pre-Clerk `getAuthSession()` stub (W-015).
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getAuthSession } from '@/lib/auth/session';
import prisma from '@/lib/db/client';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const PatchSchema = z.object({
  founderNotes: z.string().max(5000).nullable().optional(),
  isArchived: z.boolean().optional(),
});

function badRequest(message: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status });
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ─────────────────────────────────────────────────────────────────────
// GET — single counter draft by id.
// ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest, ctx: RouteContext) {
  const limited = rateLimit(request, {
    limit: 60,
    windowMs: 60_000,
    prefix: 'deal-protection-counter-draft-read',
  });
  if (limited) return limited;

  const { id } = await ctx.params;
  if (!id) return badRequest('id is required');

  let userId: string;
  try {
    const session = await getAuthSession();
    if (!session.userId) return badRequest('Unauthorized', 401);
    userId = session.userId;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Auth unavailable';
    return badRequest(msg, 503);
  }

  try {
    const row = await prisma.counterTermSheet.findFirst({
      where: { id, userId },
    });
    if (!row) return badRequest('Counter draft not found', 404);

    return NextResponse.json({
      ok: true,
      draft: {
        id: row.id,
        dealAnalysisId: row.dealAnalysisId,
        versionNumber: row.versionNumber,
        redlinedMarkdown: row.redlinedMarkdown,
        changes: Array.isArray(row.changesJson) ? row.changesJson : [],
        founderNotes: row.founderNotes,
        runtimeMode: row.runtimeMode,
        generatedAt: row.generatedAt.toISOString(),
        isArchived: row.isArchived,
      },
    });
  } catch (err) {
    console.error('[api/deal-protection/counter-draft/[id] GET] Error:', err);
    return badRequest('Fetch failed', 500);
  }
}

// ─────────────────────────────────────────────────────────────────────
// PATCH — update `founderNotes` or archive.
// ─────────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest, ctx: RouteContext) {
  const limited = rateLimit(request, {
    limit: 30,
    windowMs: 60_000,
    prefix: 'deal-protection-counter-draft-write',
  });
  if (limited) return limited;

  const { id } = await ctx.params;
  if (!id) return badRequest('id is required');

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }
  const validated = PatchSchema.safeParse(raw);
  if (!validated.success) {
    return badRequest(
      `Validation failed: ${validated.error.issues.map((i) => i.message).join('; ')}`,
    );
  }
  if (Object.keys(validated.data).length === 0) {
    return badRequest('Patch body must contain at least one field');
  }

  let userId: string;
  try {
    const session = await getAuthSession();
    if (!session.userId) return badRequest('Unauthorized', 401);
    userId = session.userId;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Auth unavailable';
    return badRequest(msg, 503);
  }

  try {
    /* Verify ownership before update — Prisma's `update` on a non-
       existent row throws P2025; we want a clean 404 with the userId
       check enforced at the same time. */
    const existing = await prisma.counterTermSheet.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!existing) return badRequest('Counter draft not found', 404);

    const data: Record<string, unknown> = {};
    if (validated.data.founderNotes !== undefined) {
      data.founderNotes = validated.data.founderNotes;
    }
    if (validated.data.isArchived !== undefined) {
      data.isArchived = validated.data.isArchived;
    }

    const row = await prisma.counterTermSheet.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      ok: true,
      draft: {
        id: row.id,
        dealAnalysisId: row.dealAnalysisId,
        versionNumber: row.versionNumber,
        founderNotes: row.founderNotes,
        isArchived: row.isArchived,
      },
    });
  } catch (err) {
    console.error('[api/deal-protection/counter-draft/[id] PATCH] Error:', err);
    return badRequest('Update failed', 500);
  }
}
