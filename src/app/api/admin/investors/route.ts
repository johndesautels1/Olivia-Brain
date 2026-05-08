/**
 * `/api/admin/investors` — Track P Session P4.
 *
 * GET   list active records (filterable by source / isActive / isArchived)
 * POST  create a new record (admin-curated, source='admin' by default)
 *
 * Auth: pre-Clerk `getAuthSession()` stub (W-015). Replaced when Track F
 * Session 18 lands Clerk.
 *
 * Rate-limit is generous on this surface (admin client) and conservative
 * on the public submission route (`/api/deal-protection/investor-submission`).
 */
import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { getAuthSession } from '@/lib/auth/session';
import prisma from '@/lib/db/client';
import { rateLimit } from '@/lib/rate-limit';

import { toRecord } from '@/lib/deal-protection/investor-lookup';
import {
  InvestorReputationWriteSchema,
  toInvestorSlug,
  type InvestorReputationSource,
} from '@/lib/deal-protection/investor-types';

export const dynamic = 'force-dynamic';

const LIST_PAGE_LIMIT = 200 as const;

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

// ─────────────────────────────────────────────────────────────────────
// GET — list reputation records.
// ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 60,
    windowMs: 60_000,
    prefix: 'admin-investors-list',
  });
  if (limited) return limited;

  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const params = request.nextUrl.searchParams;
  const source = params.get('source') as InvestorReputationSource | null;
  const isActiveParam = params.get('isActive');
  const isArchivedParam = params.get('isArchived');

  const where: Prisma.InvestorReputationWhereInput = {};
  if (source) where.source = source;
  if (isActiveParam != null) where.isActive = isActiveParam === 'true';
  if (isArchivedParam == null) {
    /* Default: hide archived rows. Pass `?isArchived=true` to see them. */
    where.isArchived = false;
  } else {
    where.isArchived = isArchivedParam === 'true';
  }

  try {
    const rows = await prisma.investorReputation.findMany({
      where,
      orderBy: [{ reputationBand: 'asc' }, { name: 'asc' }],
      take: LIST_PAGE_LIMIT,
    });
    return NextResponse.json({
      ok: true,
      records: rows.map(toRecord),
    });
  } catch (err) {
    console.error('[api/admin/investors GET] Error:', err);
    return badRequest('Failed to load investors', 500);
  }
}

// ─────────────────────────────────────────────────────────────────────
// POST — create a new admin-curated record.
// ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 30,
    windowMs: 60_000,
    prefix: 'admin-investors-write',
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

  const validated = InvestorReputationWriteSchema.safeParse(raw);
  if (!validated.success) {
    return badRequest(
      `Validation failed: ${validated.error.issues.map((i) => i.message).join('; ')}`,
    );
  }
  const data = validated.data;
  const slug = toInvestorSlug(data.name);
  if (slug.length === 0) {
    return badRequest('name must contain at least one alphanumeric character');
  }

  try {
    const existing = await prisma.investorReputation.findFirst({
      where: { OR: [{ name: data.name }, { slug }] },
      select: { id: true },
    });
    if (existing) {
      return badRequest('Investor with this name (or slug) already exists', 409);
    }

    const row = await prisma.investorReputation.create({
      data: {
        name: data.name,
        slug,
        investorType: data.investorType,
        geographicFocus: data.geographicFocus ?? null,
        stageFocusJson: asJson(data.stageFocus),
        sectorFocusJson: asJson(data.sectorFocus),
        reputationScore: data.reputationScore,
        reputationBand: data.reputationBand,
        patternsJson: asJson(data.patterns),
        notes: data.notes ?? null,
        source: 'admin',
        isActive: true,
        isArchived: false,
      },
    });
    return NextResponse.json({ ok: true, record: toRecord(row) });
  } catch (err) {
    console.error('[api/admin/investors POST] Error:', err);
    return badRequest('Create failed', 500);
  }
}
