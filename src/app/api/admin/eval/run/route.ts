/**
 * `POST /api/admin/eval/run` — trigger a golden eval run.
 *
 * Track O Session O2 — eval runtime gate. Runs all GOLDEN_CASES (or
 * a subset via `?ids=foo,bar`) through the cascade and returns a
 * structured report.
 *
 * **Auth:** rate-limited 3/min/IP. Not auth-gated yet — RUNBOOK §7
 * notes Clerk integration is pending; once auth lands, this route
 * should require admin role. For now the rate limit + the fact
 * that each run costs real LLM tokens is sufficient gating for the
 * pre-launch phase.
 *
 * **Response shape:** `GoldenReport` (see `lib/evaluation/golden-runner.ts`).
 *
 * **Cost:** each run hits the cascade once per case (currently 7
 * cases). At ~500 tokens per case ≈ 3,500 tokens per run. Run sparingly
 * — this is a quality gate, not a continuous monitor.
 *
 * **Patronus integration:** the existing `lib/evaluation/patronus.ts`
 * is not wired here yet — it's a follow-up in the same Track O O2
 * continuation. The current report scores against the heuristic
 * acceptance criteria in GOLDEN_CASES.
 */

import { NextRequest, NextResponse } from "next/server";
import { runGoldenSuite, runSingleCase } from "@/lib/evaluation/golden-runner";
import {
  GOLDEN_CASE_BY_ID,
  GOLDEN_CASES,
} from "@/lib/evaluation/golden-cases";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const RATE_LIMIT = { limit: 3, windowMs: 60_000, prefix: "admin.eval" } as const;

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, RATE_LIMIT);
  if (limited) return limited;

  const idsParam = request.nextUrl.searchParams.get("ids");
  const ids = idsParam
    ? idsParam.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;

  /* If a single id is provided, run just that case (faster for
   * iterative debugging). Otherwise run the full suite. */
  if (ids && ids.length === 1) {
    const caseDef = GOLDEN_CASE_BY_ID[ids[0]];
    if (!caseDef) {
      return NextResponse.json(
        { error: `unknown case id: ${ids[0]}` },
        { status: 404 },
      );
    }
    const result = await runSingleCase(caseDef);
    return NextResponse.json({
      kind: "single",
      result,
    });
  }

  const report = await runGoldenSuite({ ids });
  return NextResponse.json({
    kind: "suite",
    report,
  });
}

export async function GET() {
  return NextResponse.json({
    cases: GOLDEN_CASES.map((c) => ({
      id: c.id,
      label: c.label,
      prompt: c.prompt,
      expect: c.expect,
    })),
    rateLimit: RATE_LIMIT,
  });
}
