/**
 * `/api/admin/investors/seed` — Track P Session P4.
 *
 * POST  apply (or re-apply) the canonical seed list. Idempotent:
 *         existing rows are updated (preserving operator edits to
 *         `isActive` / `isArchived` / `notes`); new rows are created.
 *
 * Auth: pre-Clerk `getAuthSession()` stub (W-015).
 *
 * # Why this is a POST not a script
 *
 * P1 deferred the seed because the LTM `investor_db.json` doesn't
 * exist in OB. P4 ships the seed inline (`investor-seed.ts`) and
 * this endpoint is how an operator triggers it from the admin UI
 * without needing shell access. Re-running is safe.
 */
import { NextRequest, NextResponse } from 'next/server';

import { getAuthSession } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rate-limit';

import { applyInvestorSeed } from '@/lib/deal-protection/investor-loader';

export const dynamic = 'force-dynamic';

function badRequest(message: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 5,
    windowMs: 60_000,
    prefix: 'admin-investors-seed',
  });
  if (limited) return limited;

  try {
    const session = await getAuthSession();
    if (!session.userId) return badRequest('Unauthorized', 401);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Auth unavailable';
    return badRequest(msg, 503);
  }

  try {
    const summary = await applyInvestorSeed();
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    console.error('[api/admin/investors/seed POST] Error:', err);
    return badRequest('Seed failed', 500);
  }
}
