/**
 * POST /api/gateway/cristiano/verdicts
 *
 * Service-to-service endpoint for linked apps (LTM, lifescore, etc.)
 * to push fully-rendered Cristiano verdicts INTO Olivia Brain on
 * behalf of a user. The consuming app must:
 *
 *   1. Hold a per-app gateway bearer token (resolved server-side from
 *      `GATEWAY_TOKEN_<APP>` env var — see `src/lib/gateway/auth.ts`).
 *   2. Identify the OB user via the `X-Cristiano-User-Id` header
 *      (must be a UUID matching an existing OB user).
 *   3. Tag the verdict with its own `sourceApp` — verified against
 *      the bearer-resolved app to prevent cross-app forgery.
 *   4. Provide an `externalId` for dedup (e.g. LTM analysisId,
 *      lifescore reportId).
 *
 * Idempotency: a SHA256 hash of `(kind + payload)` is stored on the
 * row. Re-pushing the same verdict returns the existing row with
 * `alreadyExisted: true` and the unique constraint
 * (userId, requestHash) ensures the DB never carries duplicates.
 *
 * Response shape:
 *   200: { ok: true, verdict: CristianoVerdictRecord, alreadyExisted: boolean }
 *   400: { ok: false, error: "Invalid JSON body" | "Invalid request shape" | ... }
 *   401: { ok: false, error: "Gateway authentication required", reason }
 *   403: { ok: false, error: "Source app mismatch" }
 *   429: { ok: false, error: "Too many requests" }
 *   500: { ok: false, error: "Failed to persist verdict" }
 *   503: { ok: false, error: "Gateway tokens not configured" }
 *
 * Held to Apple / Microsoft / Google 2026 leading coding practices per
 * `~/CLAUDE.md` and `docs/api-specs/_MASTER_REGISTER.md §10.4`.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { hashVerdictPayload } from "@/lib/cristiano/hash";
import {
  findExistingVerdict,
  saveVerdict,
  toRecord,
} from "@/lib/cristiano/persist";
import {
  CristianoVerdictKindSchema,
  CristianoSourceAppSchema,
  parseVerdictBody,
} from "@/lib/cristiano/types";
import { verifyGatewayBearer } from "@/lib/gateway/auth";
import { rateLimit } from "@/lib/rate-limit";

// ─── Body schema ─────────────────────────────────────────────────────────────

/**
 * Gateway push body. Source app delivers a fully-rendered verdict;
 * OB stores it without spending an LLM call. `body.kind` discriminates
 * the inner verdict shape and is re-validated via
 * `parseVerdictBody` for defence-in-depth (this schema is the wire
 * contract, parseVerdictBody is the strict per-kind validator).
 */
const GatewayPushBodySchema = z.object({
  kind: CristianoVerdictKindSchema,
  sourceApp: CristianoSourceAppSchema,
  externalId: z.string().min(1).max(240).optional(),
  /** The original request payload the source app received (for replay). */
  requestPayload: z.unknown(),
  /** The structured verdict body the source app rendered. */
  verdictBody: z.unknown(),
  /** Pre-rendered narration MP4 if the source app produced one. */
  preRenderedVideoUrl: z.string().url().max(2048).optional(),
  thumbnailUrl: z.string().url().max(2048).optional(),
  durationSeconds: z.number().int().min(0).max(86_400).optional(),
  /**
   * Captions track URL (typically WebVTT). When set AND
   * preRenderedVideoUrl is set, the verdict player renders
   * <track kind="captions"> for WCAG 1.2.2 Level A compliance.
   * Source apps that ship captions populate this field.
   */
  captionsUrl: z.string().url().max(2048).optional(),
});

const UserIdSchema = z.string().uuid();

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 60,
    windowMs: 60_000,
    prefix: "gateway-cristiano-push",
  });
  if (limited) return limited;

  // ── Gateway bearer auth ────────────────────────────────────────────
  const authResult = verifyGatewayBearer(
    request.headers.get("authorization"),
  );
  if (!authResult.ok) {
    if (authResult.reason === "no_tokens_configured") {
      return NextResponse.json(
        {
          ok: false,
          error: "Gateway tokens not configured. Contact administrator.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      {
        ok: false,
        error: "Gateway authentication required",
        reason: authResult.reason,
      },
      { status: 401 },
    );
  }
  const { sourceApp: bearerSourceApp } = authResult;

  // ── User-id header ─────────────────────────────────────────────────
  const userIdHeader = request.headers.get("x-cristiano-user-id");
  const parsedUserId = UserIdSchema.safeParse(userIdHeader);
  if (!parsedUserId.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing or invalid X-Cristiano-User-Id header (must be UUID)",
      },
      { status: 400 },
    );
  }
  const userId = parsedUserId.data;

  // ── Body parse ─────────────────────────────────────────────────────
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsedBody = GatewayPushBodySchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid request shape",
        details: parsedBody.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }
  const body = parsedBody.data;

  // ── Cross-app forgery guard ────────────────────────────────────────
  // The bearer-resolved source app MUST match the body's sourceApp.
  // Otherwise a token issued to LTM could push a verdict tagged as
  // lifescore — that would let one app pollute another app's library.
  if (body.sourceApp !== bearerSourceApp) {
    console.warn(
      `[gateway/cristiano] Source app mismatch — bearer=${bearerSourceApp} body=${body.sourceApp} user=${userId}`,
    );
    return NextResponse.json(
      {
        ok: false,
        error: `Source app mismatch — bearer authorises '${bearerSourceApp}' but body tagged '${body.sourceApp}'`,
      },
      { status: 403 },
    );
  }

  // ── Validate the kind-specific verdict body ────────────────────────
  // GatewayPushBodySchema accepted `verdictBody` as `unknown`. Now
  // run the strict kind-aware validator from the C1 types module.
  const verdictBodyEnvelope = parseVerdictBody({
    kind: body.kind,
    body: body.verdictBody,
  });
  if (!verdictBodyEnvelope.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Verdict body failed kind-specific validation",
        details: verdictBodyEnvelope.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }
  const { body: validatedVerdictBody } = verdictBodyEnvelope.value;

  // ── Compute idempotency hash ───────────────────────────────────────
  const requestHash = hashVerdictPayload({
    kind: body.kind,
    payload: body.requestPayload,
  });

  // ── Idempotent insert ──────────────────────────────────────────────
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
      `[gateway/cristiano] Idempotency lookup failed for user ${userId}:`,
      err instanceof Error ? err.message : err,
    );
    // Non-fatal — fall through to insert. Unique constraint backstops
    // a duplicate insert (surfaced as 500 below).
  }

  try {
    const saved = await saveVerdict({
      userId,
      kind: body.kind,
      sourceApp: body.sourceApp,
      externalId: body.externalId ?? null,
      requestPayload: body.requestPayload as Parameters<
        typeof saveVerdict
      >[0]["requestPayload"],
      requestHash,
      verdictBody: validatedVerdictBody,
      spokenScript: validatedVerdictBody.spokenScript,
      verdictTitle: validatedVerdictBody.verdictTitle,
      preRenderedVideoUrl: body.preRenderedVideoUrl ?? null,
      thumbnailUrl: body.thumbnailUrl ?? null,
      durationSeconds: body.durationSeconds ?? null,
      captionsUrl: body.captionsUrl ?? null,
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
      `[gateway/cristiano] Persistence failed for user ${userId}, source ${bearerSourceApp}:`,
      message,
    );
    return NextResponse.json(
      { ok: false, error: "Failed to persist verdict", message },
      { status: 500 },
    );
  }
}
