/**
 * POST /api/cristiano/judge
 *
 * Renders a Cristiano verdict for the authenticated user. Accepts a
 * `CristianoVerdictRequest` discriminated union, validates with Zod,
 * checks the `(userId, requestHash)` idempotency lookup, and either
 * returns the existing verdict or calls the Opus brain to render a
 * fresh one and persists it.
 *
 * Request shape (validated by `parseVerdictRequest`):
 *   {
 *     kind: "startup_match" | "city_compare" | "freeform",
 *     payload: <kind-specific payload — see lib/cristiano/types.ts>
 *   }
 *
 * Response shape:
 *   200: { ok: true, verdict: CristianoVerdictRecord, alreadyExisted: boolean }
 *   400: { ok: false, error: "Invalid JSON body" | "Invalid request shape", ... }
 *   401: { ok: false, error: "Authentication required" }
 *   429: { ok: false, error: "Too many requests" }
 *   500: { ok: false, error: "Verdict render failed", reason }
 *   503: { ok: false, error: "Judge service unavailable", reason }
 *
 * Held to Apple / Microsoft / Google 2026 leading coding practices per
 * `~/CLAUDE.md` and `docs/api-specs/_MASTER_REGISTER.md §10.4`.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 120; // Opus can take 60-90s on long judgments.

import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth/session";
import { renderVerdict } from "@/lib/cristiano/brain";
import { hashVerdictPayload } from "@/lib/cristiano/hash";
import {
  findExistingVerdict,
  saveVerdict,
  toRecord,
} from "@/lib/cristiano/persist";
import { parseVerdictRequest } from "@/lib/cristiano/types";
import { rateLimit } from "@/lib/rate-limit";

// ─── Auth helper ─────────────────────────────────────────────────────────────

async function requireUserOrResponse(): Promise<
  { userId: string } | NextResponse
> {
  try {
    const { userId } = await getAuthSession();
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 },
      );
    }
    return { userId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Auth unavailable";
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 10,
    windowMs: 60_000,
    prefix: "cristiano-judge",
  });
  if (limited) return limited;

  const auth = await requireUserOrResponse();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  // Parse JSON body outside the dispatch try/catch — malformed JSON
  // is its own 400 path (matches the consent route fix shipped
  // 2026-05-23 in commit 70ec03d).
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  // Validate envelope via the discriminated-union schema.
  const parsed = parseVerdictRequest(rawBody);
  if (!parsed.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid request shape",
        details: parsed.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  const request_ = parsed.value;

  // Idempotency lookup — same (user, request) returns the cached row
  // without spending an LLM call. The hash is over the request payload
  // alone (not the kind discriminator) because two different kinds
  // can never collide — Zod ensures kind-specific shapes are disjoint.
  // We include `kind` in the hash to be doubly safe against any future
  // schema overlap.
  const requestHash = hashVerdictPayload({
    kind: request_.kind,
    payload: request_.payload,
  });

  try {
    const existing = await findExistingVerdict(userId, requestHash);
    if (existing) {
      return NextResponse.json(
        {
          ok: true,
          verdict: toRecord(existing),
          alreadyExisted: true,
        },
        { status: 200 },
      );
    }
  } catch (err) {
    console.error(
      `[cristiano/judge] Idempotency lookup failed for user ${userId}:`,
      err instanceof Error ? err.message : err,
    );
    // Continue — non-fatal. Worst case is a duplicate row that the
    // unique constraint will reject below, surfacing as a 500.
  }

  // Render fresh via the Opus brain.
  const outcome = await renderVerdict(request_);
  if (!outcome.ok) {
    const status = (() => {
      switch (outcome.error.reason) {
        case "llm_unavailable":
          return 503;
        case "llm_timeout":
          return 504;
        case "parse_failure":
        case "validation_failure":
          return 502; // bad upstream response — not the user's fault
        default: {
          const exhaustive: never = outcome.error.reason;
          void exhaustive;
          return 500;
        }
      }
    })();

    console.error(
      `[cristiano/judge] Render failed for user ${userId}, kind ${request_.kind}: ${outcome.error.reason} — ${outcome.error.message}`,
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Verdict render failed",
        reason: outcome.error.reason,
        message: outcome.error.message,
      },
      { status },
    );
  }

  // Persist the rendered verdict.
  try {
    const saved = await saveVerdict({
      userId,
      kind: outcome.kind,
      sourceApp: "ob",
      requestPayload: request_.payload,
      requestHash,
      verdictBody: outcome.verdict,
      spokenScript: outcome.verdict.spokenScript,
      verdictTitle: outcome.verdict.verdictTitle,
      modelUsed: outcome.telemetry.modelUsed,
      tokenInputCount: outcome.telemetry.inputTokens,
      tokenOutputCount: outcome.telemetry.outputTokens,
      latencyMs: outcome.telemetry.latencyMs,
      status: "ready",
    });

    return NextResponse.json(
      {
        ok: true,
        verdict: toRecord(saved),
        alreadyExisted: false,
      },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(
      `[cristiano/judge] Persistence failed for user ${userId}:`,
      message,
    );
    return NextResponse.json(
      {
        ok: false,
        error: "Verdict persisted-write failed",
        message,
      },
      { status: 500 },
    );
  }
}
