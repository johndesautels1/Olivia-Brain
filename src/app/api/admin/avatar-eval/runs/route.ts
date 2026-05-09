/**
 * `/api/admin/avatar-eval/runs` — Track O5c session 2.
 *
 * Persistence + listing for the avatar A/B harness at
 * `/admin/avatar-eval`. Drives the per-vendor MOS comparison and the
 * decision rubric (latency × 0.4 + lip-sync MOS × 0.4 + cost × 0.2)
 * that lands in O5c S3.
 *
 * GET   list runs (filterable by ?vendor= and ?scriptId=, default 200)
 * POST  create a single AvatarEvalRun row
 *
 * Auth: pre-Clerk `getAuthSession()` stub (W-015). Mirrors
 * `/api/admin/investors`. Rate-limited generously since the harness is
 * operator-only.
 */
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";
import { rateLimit } from "@/lib/rate-limit";
import {
  EVAL_VENDORS,
  getEvalScript,
  type EvalVendor,
} from "@/lib/avatar/eval-scripts";

export const dynamic = "force-dynamic";

const LIST_PAGE_LIMIT = 200 as const;

function badRequest(message: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status });
}

async function requireAdmin(): Promise<{ userId: string } | NextResponse> {
  try {
    const session = await getAuthSession();
    if (!session.userId) return badRequest("Unauthorized", 401);
    return { userId: session.userId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Auth unavailable";
    return badRequest(msg, 503);
  }
}

const RunCreateSchema = z.object({
  vendor: z.enum(EVAL_VENDORS),
  scriptId: z.string().min(1, "scriptId is required"),
  /** Time-to-first-mouth-movement in milliseconds. */
  latencyMs: z.number().int().nonnegative().max(120_000),
  /** Mean Opinion Score 1.0–5.0. Optional — operator may capture
   * latency first and rate later. */
  mosScore: z.number().min(1).max(5).optional(),
  costCents: z.number().int().nonnegative().max(1_000_000).optional(),
  notes: z.string().max(2_000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

function asJsonInput(value: unknown): Prisma.InputJsonValue {
  return (value ?? {}) as Prisma.InputJsonValue;
}

/**
 * Detect the "avatar_eval_runs table doesn't exist yet" failure mode
 * (operator hasn't applied prisma/sql/10 — the migration is owed and
 * the harness 500s). Surfaced as a clean 503 + machine-readable
 * `migrationRequired: true` so the harness UI can render a banner
 * pointing at the SQL file instead of "Failed to load runs".
 */
function isMigrationMissing(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  if (!msg.includes("avatar_eval_runs")) return false;
  return (
    (msg.includes("relation") && msg.includes("does not exist")) ||
    (msg.includes("table") && msg.includes("not found")) ||
    msg.includes("undefined_table")
  );
}

function migrationMissingResponse(): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: "avatar_eval_runs table is missing",
      migrationRequired: true,
      sqlFile: "prisma/sql/10-add-avatar-eval-run.sql",
      hint: "Apply prisma/sql/10-add-avatar-eval-run.sql via Supabase SQL editor or `npx prisma db execute --schema prisma/schema.prisma --file prisma/sql/10-add-avatar-eval-run.sql`.",
    },
    { status: 503 },
  );
}

// ─────────────────────────────────────────────────────────────────────
// GET — list runs.
// ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 60,
    windowMs: 60_000,
    prefix: "admin-avatar-eval-list",
  });
  if (limited) return limited;

  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const params = request.nextUrl.searchParams;
  const vendorParam = params.get("vendor");
  const scriptId = params.get("scriptId");

  const where: Prisma.AvatarEvalRunWhereInput = {};
  if (vendorParam) {
    if (!(EVAL_VENDORS as readonly string[]).includes(vendorParam)) {
      return badRequest(`Unknown vendor: ${vendorParam}`);
    }
    where.vendor = vendorParam as EvalVendor;
  }
  if (scriptId) where.scriptId = scriptId;

  try {
    const rows = await prisma.avatarEvalRun.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: LIST_PAGE_LIMIT,
    });
    return NextResponse.json({ ok: true, runs: rows });
  } catch (err) {
    if (isMigrationMissing(err)) return migrationMissingResponse();
    console.error("[api/admin/avatar-eval/runs GET] Error:", err);
    return badRequest("Failed to load runs", 500);
  }
}

// ─────────────────────────────────────────────────────────────────────
// POST — create a single AvatarEvalRun.
// ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 60,
    windowMs: 60_000,
    prefix: "admin-avatar-eval-write",
  });
  if (limited) return limited;

  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const validated = RunCreateSchema.safeParse(raw);
  if (!validated.success) {
    return badRequest(
      `Validation failed: ${validated.error.issues.map((i) => i.message).join("; ")}`,
    );
  }
  const data = validated.data;

  const script = getEvalScript(data.scriptId);
  if (!script) {
    return badRequest(`Unknown scriptId: ${data.scriptId}`);
  }

  try {
    const row = await prisma.avatarEvalRun.create({
      data: {
        vendor: data.vendor,
        scriptId: data.scriptId,
        scriptCategory: script.category,
        // Snapshot at write-time so future suite edits don't break old
        // comparisons (per the AvatarEvalRun schema doc).
        scriptText: script.text,
        latencyMs: data.latencyMs,
        mosScore: data.mosScore ?? null,
        costCents: data.costCents ?? null,
        raterId: auth.userId,
        notes: data.notes ?? null,
        metadata: asJsonInput(data.metadata),
      },
    });
    return NextResponse.json({ ok: true, run: row });
  } catch (err) {
    if (isMigrationMissing(err)) return migrationMissingResponse();
    console.error("[api/admin/avatar-eval/runs POST] Error:", err);
    return badRequest("Create failed", 500);
  }
}

// Exported for tests only.
export const __testing = { isMigrationMissing };
