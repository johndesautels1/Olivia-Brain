/**
 * OLIVIA BRAIN — GATEWAY BEARER AUTH
 * ====================================
 *
 * Verifies the `Authorization: Bearer <token>` header on gatewayed
 * POSTs from linked apps (LTM, lifescore, cluesintelligence, etc.).
 * Each consuming app has its own service-account token resolved from
 * `GATEWAY_TOKEN_<APP>` env vars (declared in `src/lib/config/env.ts`).
 *
 * Threat model — what this protects against:
 * - **Unauthorised verdict push**: an external party POSTing to
 *   `/api/gateway/cristiano/verdicts` cannot persist a verdict
 *   under another user's id without holding the source app's
 *   bearer token.
 * - **Cross-app forgery**: a token issued to LTM cannot be used to
 *   push a verdict tagged `sourceApp: "lifescore"` — the route
 *   handler enforces that the body's `sourceApp` matches the token's
 *   source.
 * - **Timing oracles**: bearer comparison uses constant-time
 *   `timingSafeEqual` so a determined attacker can't shave token
 *   characters from response-time variance.
 *
 * What this does NOT protect against:
 * - Per-user authorization. The route handler must still validate
 *   that the `X-Cristiano-User-Id` header is well-formed AND, ideally,
 *   that the source app is allowed to act on behalf of THAT specific
 *   user. The latter requires a user-app linkage table — out of scope
 *   for this commit; deferred to the user-app linkage commit.
 * - Replay. Bearer tokens don't carry a nonce. If the channel is
 *   compromised, an old verdict push can be replayed. Mitigation:
 *   require HTTPS at the load-balancer layer (Vercel default).
 *
 * Held to Apple / Microsoft / Google 2026 leading coding practices per
 * `~/CLAUDE.md` and `docs/api-specs/_MASTER_REGISTER.md §10.4`.
 */

import { timingSafeEqual } from "node:crypto";

import {
  CRISTIANO_SOURCE_APPS,
  type CristianoSourceApp,
} from "@/lib/cristiano/types";

// ─── Source app → env var mapping ────────────────────────────────────────────

/**
 * Map each consuming app id to the env var carrying its gateway token.
 * Order matches `CRISTIANO_SOURCE_APPS` so a new app addition cascades
 * through both files in lockstep.
 *
 * `Record<Exclude<CristianoSourceApp, "ob">, string>` because "ob" is
 * Olivia Brain itself — it does NOT push to its own gateway.
 */
const GATEWAY_TOKEN_ENV: Record<
  Exclude<CristianoSourceApp, "ob">,
  string
> = {
  ltm: "GATEWAY_TOKEN_LTM",
  lifescore: "GATEWAY_TOKEN_LIFESCORE",
  clueslondon: "GATEWAY_TOKEN_CLUESLONDON",
  cluesintelligence: "GATEWAY_TOKEN_CLUESINTELLIGENCE",
  cluesxscore: "GATEWAY_TOKEN_CLUESXSCORE",
  "heart-recovery": "GATEWAY_TOKEN_HEART_RECOVERY",
  "property-search": "GATEWAY_TOKEN_PROPERTY_SEARCH",
  transit: "GATEWAY_TOKEN_TRANSIT",
};

/**
 * The set of source apps that can authenticate against the gateway.
 * "ob" excluded — OB does not push to its own gateway.
 */
export const GATEWAYED_SOURCE_APPS = CRISTIANO_SOURCE_APPS.filter(
  (id): id is Exclude<CristianoSourceApp, "ob"> => id !== "ob",
);
export type GatewayedSourceApp = (typeof GATEWAYED_SOURCE_APPS)[number];

// ─── Result discriminated union ──────────────────────────────────────────────

/**
 * Discriminated union returned by `verifyGatewayBearer`. Reasons are
 * mapped to HTTP status codes at the route boundary.
 */
export type GatewayAuthResult =
  | { ok: true; sourceApp: GatewayedSourceApp }
  | {
      ok: false;
      reason:
        | "missing_header" // no Authorization header at all
        | "malformed_header" // header doesn't match `Bearer <token>`
        | "unknown_token" // no env var matches the presented token
        | "no_tokens_configured"; // none of the GATEWAY_TOKEN_* env vars set
    };

// ─── Constant-time comparison ────────────────────────────────────────────────

/**
 * Constant-time equality of two strings. Returns false immediately
 * for length-mismatched inputs (the length difference itself isn't
 * sensitive). Uses `crypto.timingSafeEqual` over Buffer views so the
 * comparison time is independent of where the mismatch occurs.
 */
function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  try {
    return timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

// ─── Public surface ──────────────────────────────────────────────────────────

/**
 * Extract and verify a `Bearer <token>` header. Returns the matching
 * source app on success; otherwise a typed failure reason.
 *
 * `authHeader` is the raw header value — caller is responsible for
 * pulling it from `request.headers.get("authorization")`.
 */
export function verifyGatewayBearer(
  authHeader: string | null | undefined,
): GatewayAuthResult {
  if (!authHeader) return { ok: false, reason: "missing_header" };

  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  if (!match) return { ok: false, reason: "malformed_header" };
  const presented = match[1];

  // Gather configured tokens. Empty values count as unconfigured.
  const candidates: Array<{ app: GatewayedSourceApp; token: string }> = [];
  for (const app of GATEWAYED_SOURCE_APPS) {
    const envVar = GATEWAY_TOKEN_ENV[app];
    const token = process.env[envVar];
    if (token && token.length > 0) {
      candidates.push({ app, token });
    }
  }

  if (candidates.length === 0) {
    return { ok: false, reason: "no_tokens_configured" };
  }

  for (const candidate of candidates) {
    if (constantTimeEquals(presented, candidate.token)) {
      return { ok: true, sourceApp: candidate.app };
    }
  }

  return { ok: false, reason: "unknown_token" };
}

/**
 * Resolve a source app's expected env var name. Useful for surfacing
 * "configured X but you presented Y" diagnostics in route logs (NEVER
 * surface the token value itself to the response — only the env-var
 * name and the matched app id).
 */
export function getGatewayTokenEnvVar(
  app: GatewayedSourceApp,
): string {
  return GATEWAY_TOKEN_ENV[app];
}
