/**
 * `/api/deal-protection/dilution` — Track P Session P5.
 *
 * POST  pure-math forward dilution projection. Body validates against
 *         `ProjectionInputsSchema`. Returns the full sequence of
 *         per-round snapshots + per-holder trajectories.
 *
 * No persistence — projections are ephemeral analysis artifacts.
 *
 * Auth: pre-Clerk `getAuthSession()` stub (W-015), consistent with
 * the rest of `/api/deal-protection/*`.
 */
import { NextRequest, NextResponse } from 'next/server';

import { getAuthSession } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rate-limit';

import { projectDilution } from '@/lib/deal-protection/multi-round';
import { ProjectionInputsSchema } from '@/lib/deal-protection/multi-round-types';

export const dynamic = 'force-dynamic';

function badRequest(message: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 10,
    windowMs: 60_000,
    prefix: 'deal-protection-dilution',
  });
  if (limited) return limited;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const validated = ProjectionInputsSchema.safeParse(raw);
  if (!validated.success) {
    return badRequest(
      `Validation failed: ${validated.error.issues.map((i) => i.message).join('; ')}`,
    );
  }

  try {
    const session = await getAuthSession();
    if (!session.userId) return badRequest('Unauthorized', 401);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Auth unavailable';
    return badRequest(msg, 503);
  }

  try {
    const result = projectDilution(validated.data);
    return NextResponse.json({ ok: true, projection: result });
  } catch (err) {
    console.error('[api/deal-protection/dilution POST] Error:', err);
    return badRequest('Projection failed', 500);
  }
}
