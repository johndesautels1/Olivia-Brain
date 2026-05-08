/**
 * `/api/deal-protection/investor-submission` — Track P Session P4.
 *
 * Public POST for founder-submitted investor reputation entries. The
 * submission lands as `source='founder_submitted'` + `isActive=false`
 * so it does NOT influence smart-score lookups until an admin
 * approves it via `PATCH /api/admin/investors/moderation`.
 *
 * Rate-limited tighter than admin endpoints — public-facing surface
 * needs spam protection. Founder UX expectation: 3 submissions per
 * 5 minutes per IP is enough for legitimate use, conservative for
 * abuse.
 *
 * No auth required (the founder submission flow may be reached from
 * a deal-protection result UI before the founder has signed in).
 * Rate-limiting + admin moderation are the safety layers.
 */
import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import prisma from '@/lib/db/client';
import { rateLimit } from '@/lib/rate-limit';

import { toRecord } from '@/lib/deal-protection/investor-lookup';
import {
  InvestorReputationWriteSchema,
  toInvestorSlug,
} from '@/lib/deal-protection/investor-types';

export const dynamic = 'force-dynamic';

function badRequest(message: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function asJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return (value ?? Prisma.JsonNull) as Prisma.InputJsonValue | typeof Prisma.JsonNull;
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 3,
    windowMs: 5 * 60_000,
    prefix: 'deal-protection-investor-submission',
  });
  if (limited) return limited;

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
    /* If a record already exists with this name OR slug, append the
       submission as `notes` on a new entry rather than colliding —
       slug + name are UNIQUE in the schema. We disambiguate by
       suffixing the slug with the timestamp so the moderation queue
       receives every submission. */
    const collision = await prisma.investorReputation.findFirst({
      where: { OR: [{ name: data.name }, { slug }] },
      select: { id: true },
    });

    const finalSlug = collision
      ? `${slug}-submission-${Date.now().toString(36)}`
      : slug;
    const finalName = collision
      ? `${data.name} (founder submission)`
      : data.name;

    const row = await prisma.investorReputation.create({
      data: {
        name: finalName,
        slug: finalSlug,
        investorType: data.investorType,
        geographicFocus: data.geographicFocus ?? null,
        stageFocusJson: asJson(data.stageFocus),
        sectorFocusJson: asJson(data.sectorFocus),
        reputationScore: data.reputationScore,
        reputationBand: data.reputationBand,
        patternsJson: asJson(data.patterns),
        notes: data.notes ?? null,
        source: 'founder_submitted',
        isActive: false,
        isArchived: false,
      },
    });
    return NextResponse.json({ ok: true, record: toRecord(row) });
  } catch (err) {
    console.error('[api/deal-protection/investor-submission POST] Error:', err);
    return badRequest('Submission failed', 500);
  }
}
