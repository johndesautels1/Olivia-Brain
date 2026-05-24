/**
 * GET /api/cristiano/verdicts
 *
 * Lists Cristiano verdicts for the authenticated user, newest-first.
 * Powers the Verdict Library + Gateway Inbox dashboard sub-tabs.
 *
 * Query params (all optional):
 *   - kind:       "startup_match" | "city_compare" | "freeform"
 *   - sourceApp:  see `CristianoSourceApp` — defaults to all
 *   - before:     ISO 8601 timestamp — keyset cursor for pagination,
 *                 returns verdicts created strictly BEFORE this date
 *   - limit:      1..200 — defaults to 50
 *
 * Response shape:
 *   200: { ok: true, verdicts: CristianoVerdictRecord[], hasMore: boolean,
 *          nextCursor: string | null }
 *   400: { ok: false, error: "Invalid query parameter", ... }
 *   401: { ok: false, error: "Authentication required" }
 *   429: { ok: false, error: "Too many requests" }
 *   503: { ok: false, error: <auth misconfig> }
 *
 * Held to Apple / Microsoft / Google 2026 leading coding practices per
 * `~/CLAUDE.md` and `docs/api-specs/_MASTER_REGISTER.md §10.4`.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth/session";
import { listVerdicts, toRecord } from "@/lib/cristiano/persist";
import {
  CristianoSourceAppSchema,
  CristianoVerdictKindSchema,
} from "@/lib/cristiano/types";
import { rateLimit } from "@/lib/rate-limit";

// ─── Auth helper (shared pattern from judge route) ───────────────────────────

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

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 60,
    windowMs: 60_000,
    prefix: "cristiano-verdicts-list",
  });
  if (limited) return limited;

  const auth = await requireUserOrResponse();
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  // Use `new URL(request.url)` rather than `request.nextUrl` so the
  // handler works under plain `Request` instances too (vitest tests
  // dispatch with a plain Request, not a NextRequest).
  const params = new URL(request.url).searchParams;

  // ── kind filter ──
  const kindRaw = params.get("kind");
  let kind: ReturnType<typeof CristianoVerdictKindSchema.parse> | undefined;
  if (kindRaw) {
    const parsed = CristianoVerdictKindSchema.safeParse(kindRaw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid 'kind' query parameter" },
        { status: 400 },
      );
    }
    kind = parsed.data;
  }

  // ── sourceApp filter ──
  const sourceAppRaw = params.get("sourceApp");
  let sourceApp: ReturnType<typeof CristianoSourceAppSchema.parse> | undefined;
  if (sourceAppRaw) {
    const parsed = CristianoSourceAppSchema.safeParse(sourceAppRaw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid 'sourceApp' query parameter" },
        { status: 400 },
      );
    }
    sourceApp = parsed.data;
  }

  // ── before cursor (ISO 8601) ──
  const beforeRaw = params.get("before");
  let beforeCreatedAt: Date | undefined;
  if (beforeRaw) {
    const parsed = new Date(beforeRaw);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json(
        { ok: false, error: "Invalid 'before' query parameter — must be ISO 8601" },
        { status: 400 },
      );
    }
    beforeCreatedAt = parsed;
  }

  // ── limit ──
  let limit = 50;
  const limitRaw = params.get("limit");
  if (limitRaw) {
    const parsed = Number.parseInt(limitRaw, 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 200) {
      return NextResponse.json(
        { ok: false, error: "'limit' must be an integer between 1 and 200" },
        { status: 400 },
      );
    }
    limit = parsed;
  }

  try {
    // Fetch limit+1 so we can determine `hasMore` without a second query.
    const rows = await listVerdicts({
      userId,
      kind,
      sourceApp,
      beforeCreatedAt,
      limit: limit + 1,
    });

    const hasMore = rows.length > limit;
    const trimmed = hasMore ? rows.slice(0, limit) : rows;
    const verdicts = trimmed.map(toRecord);
    const nextCursor =
      hasMore && trimmed.length > 0
        ? trimmed[trimmed.length - 1].createdAt
        : null;

    return NextResponse.json(
      { ok: true, verdicts, hasMore, nextCursor },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(
      `[cristiano/verdicts] List failed for user ${userId}:`,
      message,
    );
    return NextResponse.json(
      { ok: false, error: "Failed to load verdicts" },
      { status: 500 },
    );
  }
}
