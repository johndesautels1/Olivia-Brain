/**
 * OLIVIA BRAIN — CRISTIANO VERDICT IDEMPOTENCY HASH
 * ===================================================
 *
 * SHA256 of a canonical request payload. Stored on
 * `CristianoVerdict.requestHash` with a `@@unique([userId, requestHash])`
 * constraint so re-firing the same verdict request for the same user
 * returns the existing row instead of double-rendering and double-billing.
 *
 * The same pattern is used by:
 *   - LTM `OliviaPresentation` (Gamma deck idempotency)
 *   - LTM `cinematic_videos` (per-match cinematic idempotency)
 *
 * Canonicalisation rules (must match across all callers):
 *   1. Object keys sorted ascii-ascending recursively.
 *   2. `undefined` properties stripped (JSON.stringify already does this).
 *   3. `null` preserved.
 *   4. Arrays preserved in given order (semantically meaningful).
 *   5. Numbers normalised via `Number.prototype.toString()` — `1` and
 *      `1.0` both serialise as `"1"`, eliminating equivalent payloads
 *      hashing to different values.
 *
 * Held to Apple / Microsoft / Google 2026 leading coding practices per
 * `~/CLAUDE.md` and `docs/api-specs/_MASTER_REGISTER.md §10.4`.
 */

import { createHash } from "node:crypto";

/**
 * Canonicalise a value by recursively sorting object keys and
 * normalising numbers. Returns a string that is byte-stable across
 * equivalent payloads.
 */
function canonicalise(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map(canonicalise);
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    const out: Record<string, unknown> = {};
    for (const [k, v] of entries) out[k] = canonicalise(v);
    return out;
  }
  return value;
}

/**
 * SHA256 of the canonicalised payload, hex-encoded. 64 chars.
 *
 * Pure function — same input always produces same output. Used by
 * idempotent verdict producers (`POST /api/cristiano/judge` and the
 * gateway push endpoint) to look up an existing verdict before
 * spending an LLM call.
 */
export function hashVerdictPayload(payload: unknown): string {
  const canonical = JSON.stringify(canonicalise(payload));
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
