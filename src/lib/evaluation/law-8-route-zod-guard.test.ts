/**
 * `law-8-route-zod-guard` -- source-level regression guard for the
 * Architecture Standards Law 8 boundary contract.
 *
 * # What this guards against
 *
 * Per `~/CLAUDE.md` and `docs/api-specs/_MASTER_REGISTER.md §10.4`
 * Law 8 verbatim:
 *
 *   > Schema-first at every boundary. Zod + type guard + tolerant
 *   > JSON parser per the canonical G1-033 reference pattern.
 *
 * This guard enforces the Zod-at-the-boundary half for API routes:
 * any `src/app/api/**\/route.ts` that exports a mutating handler
 * (`POST` / `PUT` / `PATCH` -- the methods that accept a request body)
 * MUST validate the input at the boundary via Zod.
 *
 * # What counts as compliant
 *
 * Either of these patterns is acceptable; both ultimately invoke
 * `z.object(...).parse(...)`:
 *
 *   1. **Direct.** The route file imports `z` from `"zod"` AND the
 *      body references `z.object` / `z.string` / `safeParse` /
 *      `.parse(` -- the canonical G1-033 pattern applied inline.
 *
 *   2. **Via helper.** The route file imports a Zod-backed helper
 *      from `@/lib/...` whose name matches `parse<Pascal>` or
 *      `<Pascal>Schema`. The helper itself is the validation layer;
 *      the route delegates to it (e.g. `parseVerdictRequest` in
 *      `src/app/api/cristiano/judge/route.ts:41`, audit-cited as
 *      Law 8's canonical example at
 *      `docs/09_ARCHITECTURE_LAW_8_AUDIT.md § 3.3`).
 *
 * # The allowlist (KNOWN_GAP)
 *
 * 54 mutating routes pre-date this guard and validate inputs ad-hoc
 * (or not at all). Each is grouped below by surface so future
 * remediation drains the list in audit phase 2 (per
 * `docs/09_ARCHITECTURE_LAW_8_AUDIT.md § 6 Phase 2`).
 *
 * New routes have NO allowlist slot. They either ship with Zod
 * validation (direct or via helper) or fail this test on push.
 *
 * # Why a vitest scan rather than a TS-AST ESLint rule
 *
 * Mirrors the existing `a11y-source-guard.test.ts` +
 * `token-coverage-guard.test.ts` patterns: deterministic regex scan,
 * runs in CI via the standard vitest pipeline, zero plumbing cost,
 * clear diff output on violation. Catches every wire that matters
 * (literal `import` statements + literal handler-export signatures).
 *
 * # Maintenance
 *
 * When a route moves OUT of KNOWN_GAP (Zod validation added):
 *   delete its row.
 *
 * When a new route SHOULD be allowlisted (e.g. webhook with no body,
 * pure pass-through to a downstream Zod-backed module):
 *   add it to KNOWN_GAP with a one-line comment explaining why.
 *
 * Held to Apple / IBM / Microsoft / Google 2026 leading coding
 * practices per `~/CLAUDE.md` and
 * `docs/api-specs/_MASTER_REGISTER.md §10.4`.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC_ROOT = join(__dirname, "..", "..");
const REPO_ROOT = join(SRC_ROOT, "..");
const API_ROOT = join(SRC_ROOT, "app", "api");

const SELF_FILE_BASENAME = "law-8-route-zod-guard.test.ts";

/**
 * 64 mutating routes that pre-date this guard. Each accepts a body
 * via POST/PUT/PATCH and does NOT validate via Zod (direct or
 * helper). Drained by audit phase 2.
 *
 * Path format: forward slash from repo root (matches what
 * `relForward()` returns).
 */
const KNOWN_GAP_ALLOWLIST: ReadonlySet<string> = new Set<string>([
  // -- admin surface (8 routes) --
  "src/app/api/admin/agents/[agentId]/route.ts",
  "src/app/api/admin/agents/run/route.ts",
  "src/app/api/admin/approvals/route.ts",
  "src/app/api/admin/eval/run/route.ts",
  "src/app/api/admin/investors/seed/route.ts",
  "src/app/api/admin/memory/route.ts",
  "src/app/api/admin/migrations/route.ts",
  "src/app/api/admin/toggles/route.ts",

  // -- avatar surface (2 routes) --
  "src/app/api/avatar/generate/route.ts",
  "src/app/api/avatar/session/route.ts",

  // -- calendar surface (11 routes) --
  "src/app/api/calendar/analytics/route.ts",
  "src/app/api/calendar/attendees/route.ts",
  "src/app/api/calendar/entries/route.ts",
  "src/app/api/calendar/memory/route.ts",
  "src/app/api/calendar/notes/route.ts",
  "src/app/api/calendar/prep-tasks/route.ts",
  "src/app/api/calendar/sync/calendly/route.ts",
  "src/app/api/calendar/sync/conflicts/route.ts",
  "src/app/api/calendar/sync/route.ts",
  "src/app/api/calendar/sync/webhooks/route.ts",
  "src/app/api/calendar/travel/route.ts",

  // -- deal-protection surface (1 route) --
  "src/app/api/deal-protection/analyze/route.ts",

  // -- founder-intake surface (2 routes) --
  "src/app/api/founder-intake/auto-fill/route.ts",
  "src/app/api/founder-intake/personas/route.ts",

  // -- judge surface (1 route) --
  "src/app/api/judge/route.ts",

  // -- olivia/call + olivia/calls surfaces (11 routes) --
  "src/app/api/olivia/call/extract/route.ts",
  "src/app/api/olivia/call/gather/route.ts",
  "src/app/api/olivia/call/inbound/route.ts",
  "src/app/api/olivia/call/outbound/route.ts",
  "src/app/api/olivia/call/recording/route.ts",
  "src/app/api/olivia/call/reminder/route.ts",
  "src/app/api/olivia/call/route.ts",
  "src/app/api/olivia/call/status/route.ts",
  "src/app/api/olivia/call/twiml/route.ts",
  "src/app/api/olivia/calls/[id]/route.ts",
  "src/app/api/olivia/calls/route.ts",

  // -- olivia messaging surfaces (2 routes) --
  "src/app/api/olivia/conversations/[id]/email/route.ts",
  "src/app/api/olivia/email/route.ts",

  // -- olivia/sms + whatsapp (2 routes) --
  "src/app/api/olivia/sms/route.ts",
  "src/app/api/olivia/whatsapp/route.ts",

  // -- olivia/voice surface (3 routes) --
  "src/app/api/olivia/voice/presentation/route.ts",
  "src/app/api/olivia/voice/process/route.ts",
  "src/app/api/olivia/voice/route.ts",

  // -- realtime surface (2 routes) --
  "src/app/api/realtime/session/route.ts",
  "src/app/api/realtime/webrtc/route.ts",

  // -- search (1 route) --
  "src/app/api/search/route.ts",

  // -- valuation surface (6 routes) --
  "src/app/api/valuation/[runId]/route.ts",
  "src/app/api/valuation/compare/route.ts",
  "src/app/api/valuation/deal-room/score-rubric/route.ts",
  "src/app/api/valuation/deal-room/session/route.ts",
  "src/app/api/valuation/export/route.ts",
  "src/app/api/valuation/subject/route.ts",

  // -- voice top-level surface (2 routes) --
  "src/app/api/voice/synthesize/route.ts",
  "src/app/api/voice/transcribe/route.ts",
]);

interface RouteScan {
  file: string;
  hasMutatingHandler: boolean;
  hasDirectZod: boolean;
  hasHelperZod: boolean;
}

const MUTATING_HANDLER_RE =
  /^export\s+(?:async\s+)?function\s+(?:POST|PUT|PATCH)\b/m;

/** Direct: `import { z } from "zod"` OR similar. */
const DIRECT_ZOD_IMPORT_RE = /from\s+["']zod["']/;

/** Direct: file body references one of the canonical Zod surface
 *  symbols (covers `z.object` / `z.string` / `safeParse` / `.parse(`). */
const DIRECT_ZOD_USAGE_RE = /\b(?:z\.object|z\.string|safeParse|\.parse\()/;

/** Via helper: imports a `parse<Pascal>` or `<Pascal>Schema` symbol
 *  from `@/lib/...`. The helper itself is the Zod-backed layer. */
const HELPER_ZOD_IMPORT_RE =
  /import\s*\{[^}]*(?:parse[A-Z][A-Za-z0-9_]*|[A-Z][A-Za-z0-9_]*Schema)[^}]*\}\s*from\s*["']@\/lib\//;

function walkApiRoutes(root: string): string[] {
  const out: string[] = [];
  const visit = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const s = statSync(full);
      if (s.isDirectory()) {
        visit(full);
      } else if (entry === "route.ts") {
        out.push(full);
      }
    }
  };
  visit(root);
  return out;
}

function relForward(abs: string): string {
  return relative(REPO_ROOT, abs).replace(/\\/g, "/");
}

function scanRoute(abs: string): RouteScan {
  const content = readFileSync(abs, "utf-8");
  return {
    file: relForward(abs),
    hasMutatingHandler: MUTATING_HANDLER_RE.test(content),
    hasDirectZod:
      DIRECT_ZOD_IMPORT_RE.test(content) && DIRECT_ZOD_USAGE_RE.test(content),
    hasHelperZod: HELPER_ZOD_IMPORT_RE.test(content),
  };
}

function isCompliant(scan: RouteScan): boolean {
  return scan.hasDirectZod || scan.hasHelperZod;
}

describe("Law 8 — mutating route Zod-at-boundary guard", () => {
  it("every route.ts with POST/PUT/PATCH validates via Zod (direct or helper) OR is in KNOWN_GAP_ALLOWLIST", () => {
    const routes = walkApiRoutes(API_ROOT);
    const violations: RouteScan[] = [];

    for (const abs of routes) {
      if (abs.endsWith(SELF_FILE_BASENAME)) continue;
      const scan = scanRoute(abs);
      if (!scan.hasMutatingHandler) continue; // GET-only routes -- not scope of this guard
      if (isCompliant(scan)) continue;        // Validates via Zod (direct or helper)
      if (KNOWN_GAP_ALLOWLIST.has(scan.file)) continue; // Pre-existing, tracked
      violations.push(scan);
    }

    if (violations.length > 0) {
      const msg = violations
        .map((v) => `  ${v.file}`)
        .join("\n");
      throw new Error(
        `${violations.length} new mutating route(s) without Zod validation:\n` +
          `${msg}\n\n` +
          `Fix one of:\n` +
          `  (a) Inline Zod: add  import { z } from "zod";  +  ` +
          `const Body = z.object({...});  +  ` +
          `const parsed = Body.safeParse(await req.json()); ` +
          `return-400-on-failure.\n` +
          `  (b) Helper: import a parseX or XSchema validator from ` +
          `@/lib/... and delegate (canonical example: ` +
          `src/app/api/cristiano/judge/route.ts).\n` +
          `\nReference pattern: ` +
          `docs/09_ARCHITECTURE_LAW_8_AUDIT.md § 2 (G1-033 canonical ` +
          `pattern). If validation truly is not warranted (e.g. webhook ` +
          `with empty body, pure pass-through), add the route to ` +
          `KNOWN_GAP_ALLOWLIST in src/lib/evaluation/law-8-route-zod-guard.test.ts ` +
          `with a one-line comment.`,
      );
    }
    expect(violations).toHaveLength(0);
  });
});

describe("Law 8 guard — allowlist sanity", () => {
  it("every KNOWN_GAP entry still exists, still has a mutating handler, still lacks Zod", () => {
    /* Drift catcher: if a remediation lands but the maintainer forgets
     * to remove the file from the allowlist, this test fires so the
     * stale entry gets cleaned up. Equivalently catches renamed +
     * deleted routes. */
    const stale: string[] = [];
    for (const rel of KNOWN_GAP_ALLOWLIST) {
      const abs = join(REPO_ROOT, rel);
      let content: string;
      try {
        content = readFileSync(abs, "utf-8");
      } catch {
        stale.push(`${rel} -- file does not exist on disk (remove from allowlist)`);
        continue;
      }
      if (!MUTATING_HANDLER_RE.test(content)) {
        stale.push(
          `${rel} -- file no longer exports POST/PUT/PATCH (remove from allowlist)`,
        );
        continue;
      }
      const hasDirect =
        DIRECT_ZOD_IMPORT_RE.test(content) &&
        DIRECT_ZOD_USAGE_RE.test(content);
      const hasHelper = HELPER_ZOD_IMPORT_RE.test(content);
      if (hasDirect || hasHelper) {
        stale.push(
          `${rel} -- now validates via Zod (remove from allowlist; celebrate)`,
        );
      }
    }

    if (stale.length > 0) {
      const msg = stale.map((s) => `  ${s}`).join("\n");
      throw new Error(
        `${stale.length} stale KNOWN_GAP entry/entries detected:\n${msg}\n\n` +
          `Edit src/lib/evaluation/law-8-route-zod-guard.test.ts and ` +
          `remove the listed entries from KNOWN_GAP_ALLOWLIST.`,
      );
    }
    expect(stale).toHaveLength(0);
  });
});

describe("Law 8 guard — surface coverage telemetry", () => {
  it("scans the expected order-of-magnitude number of API route files", () => {
    /* Belt-and-braces: if the api directory disappears or moves, the
     * main guard would silently pass (no routes to scan = no
     * violations). This test makes that failure visible. The lower
     * bound (50) is below the current 119 route count with headroom
     * for legitimate removals. */
    const routes = walkApiRoutes(API_ROOT);
    expect(routes.length).toBeGreaterThanOrEqual(50);
  });

  it("KNOWN_GAP_ALLOWLIST size is within the expected band as the gap drains", () => {
    /* The audit at docs/09_ARCHITECTURE_LAW_8_AUDIT.md identified 82
     * routes lacking direct Zod; broader helper-aware detection in
     * THIS guard narrows the actionable gap to 54 at lock time. As
     * Phase 2 remediation drains the list, this number falls. Upper
     * bound here = seed + a few legit additions; lower bound = 0
     * (the eventual target). */
    expect(KNOWN_GAP_ALLOWLIST.size).toBeLessThanOrEqual(65);
    expect(KNOWN_GAP_ALLOWLIST.size).toBeGreaterThanOrEqual(0);
  });
});
