/**
 * `/api/founder-intake/auto-fill` — Q3 auto-fill dispatch route.
 *
 * Track Q Session Q3. POST runs the `runAutoFill` orchestrator
 * (`src/lib/quantara/auto-fill/`) in parallel against the 7 read-only
 * Composio integrations from O1 plus the Olivia industry-benchmark
 * defaults extractor, and returns one suggestion per covered field.
 *
 * # Stateless
 *
 * No Prisma writes. The founder accepts a suggestion in the UI
 * (`IntakeField`), which folds the value into local form state. The
 * usual Q2 `POST /api/founder-intake` then persists the accepted
 * values onto `ValuationSubject` via `mergeQuantaraIntoSubject`.
 *
 * # Auth (pre-Clerk)
 *
 * `getAuthSession()` stub — same gate as Q2's save route. Track F
 * Session 18 wires Clerk and replaces the helper body in one line.
 *
 * # Rate limiting
 *
 * 6 dispatches / minute / client. The fan-out hits 7 external APIs
 * each call; 6/min keeps the rate-limit headroom comfortable on
 * Stripe / GitHub / Companies House.
 */
import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import {
  runAutoFill,
  type AutoFillContext,
  type AutoFillSummary,
} from "@/lib/quantara/auto-fill";

const AUTO_FILL_TIMEOUT_MS = 15_000;

interface PostBody {
  context?: AutoFillContext;
}

function badRequest(message: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 6,
    windowMs: 60_000,
    prefix: "founder-intake-autofill",
  });
  if (limited) return limited;

  let userId: string;
  try {
    const session = await getAuthSession();
    if (!session.userId) return badRequest("Unauthorized", 401);
    userId = session.userId;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Auth unavailable";
    return badRequest(msg, 503);
  }

  let body: PostBody;
  try {
    body = (await request.json().catch(() => ({}))) as PostBody;
  } catch {
    return badRequest("Invalid JSON body");
  }

  const context: AutoFillContext = body.context ?? {};

  /* Bound the entire fan-out at 15s. Each individual integration in
     O1 caps at 8s via `INTEGRATION_TIMEOUT_MS`, so the worst case here
     is 15s only if every integration hits its ceiling and they're not
     fully parallelised — Promise.all in the orchestrator parallelises
     them, so realistic upper bound is ~9s. */
  const summary = await Promise.race<AutoFillSummary>([
    runAutoFill(context),
    new Promise<AutoFillSummary>((_, reject) =>
      setTimeout(
        () => reject(new Error("auto_fill_timeout")),
        AUTO_FILL_TIMEOUT_MS,
      ),
    ),
  ]).catch((err) => {
    console.error(
      `[api/founder-intake/auto-fill] orchestrator failed (user=${userId.slice(0, 8)}…):`,
      err instanceof Error ? err.name : "unknown",
    );
    return null;
  });

  if (!summary) {
    return NextResponse.json(
      {
        ok: false,
        error: "Auto-fill orchestrator timed out",
      },
      { status: 504 },
    );
  }

  return NextResponse.json({ ok: true, ...summary });
}
