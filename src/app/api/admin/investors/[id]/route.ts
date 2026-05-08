/**
 * `/api/admin/investors/[id]` — Track P Session P4.
 *
 * PATCH   update a single record (partial). Pass `isActive` /
 *           `isArchived` to disable / archive without changing data.
 * DELETE  soft-delete (sets `isArchived=true` + `isActive=false`).
 *
 * Auth: pre-Clerk `getAuthSession()` stub (W-015).
 */
import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { getAuthSession } from '@/lib/auth/session';
import prisma from '@/lib/db/client';
import { rateLimit } from '@/lib/rate-limit';

import { toRecord } from '@/lib/deal-protection/investor-lookup';
import { InvestorReputationPatchSchema } from '@/lib/deal-protection/investor-types';

export const dynamic = 'force-dynamic';

function badRequest(message: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function asJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return (value ?? Prisma.JsonNull) as Prisma.InputJsonValue | typeof Prisma.JsonNull;
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

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ─────────────────────────────────────────────────────────────────────
// PATCH — partial update.
// ─────────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest, ctx: RouteContext) {
  const limited = rateLimit(request, {
    limit: 30,
    windowMs: 60_000,
    prefix: 'admin-investors-write',
  });
  if (limited) return limited;

  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  if (!id) return badRequest('id is required');

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const validated = InvestorReputationPatchSchema.safeParse(raw);
  if (!validated.success) {
    return badRequest(
      `Validation failed: ${validated.error.issues.map((i) => i.message).join('; ')}`,
    );
  }
  const patch = validated.data;
  if (Object.keys(patch).length === 0) {
    return badRequest('Patch body must contain at least one field');
  }

  const data: Prisma.InvestorReputationUpdateInput = {};
  if (patch.investorType !== undefined) data.investorType = patch.investorType;
  if (patch.geographicFocus !== undefined) data.geographicFocus = patch.geographicFocus;
  if (patch.stageFocus !== undefined) data.stageFocusJson = asJson(patch.stageFocus);
  if (patch.sectorFocus !== undefined) data.sectorFocusJson = asJson(patch.sectorFocus);
  if (patch.reputationScore !== undefined) data.reputationScore = patch.reputationScore;
  if (patch.reputationBand !== undefined) data.reputationBand = patch.reputationBand;
  if (patch.patterns !== undefined) data.patternsJson = asJson(patch.patterns);
  if (patch.notes !== undefined) data.notes = patch.notes;
  if (patch.isActive !== undefined) data.isActive = patch.isActive;
  if (patch.isArchived !== undefined) data.isArchived = patch.isArchived;

  try {
    const row = await prisma.investorReputation.update({
      where: { id },
      data,
    });
    return NextResponse.json({ ok: true, record: toRecord(row) });
  } catch (err) {
    /* Prisma throws P2025 ("Record not found") for missing rows. */
    const code = (err as { code?: string }).code;
    if (code === 'P2025') return badRequest('Investor not found', 404);
    console.error('[api/admin/investors/[id] PATCH] Error:', err);
    return badRequest('Update failed', 500);
  }
}

// ─────────────────────────────────────────────────────────────────────
// DELETE — soft-delete (isArchived=true + isActive=false).
// ─────────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest, ctx: RouteContext) {
  const limited = rateLimit(request, {
    limit: 30,
    windowMs: 60_000,
    prefix: 'admin-investors-write',
  });
  if (limited) return limited;

  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  if (!id) return badRequest('id is required');

  try {
    const row = await prisma.investorReputation.update({
      where: { id },
      data: { isArchived: true, isActive: false },
    });
    return NextResponse.json({ ok: true, record: toRecord(row) });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'P2025') return badRequest('Investor not found', 404);
    console.error('[api/admin/investors/[id] DELETE] Error:', err);
    return badRequest('Delete failed', 500);
  }
}
