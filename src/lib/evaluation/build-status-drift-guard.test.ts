/**
 * `build-status-drift-guard` — makes documentation drift structurally impossible
 * for every objective build metric.
 *
 * # The problem this closes
 *
 * The narrative planning docs drifted apart: `OLIVIA_BUILD_STATE.md` said ~65%,
 * `BATTLE_PLAN.md` said 85–88% (and contradicted itself, 159 vs 164 items),
 * the `BUILD_SEQUENCE.md` track tables were never re-ticked after the work
 * shipped, and the "510 tests / 39 suites" figure was months stale. Every one
 * of those is a hand-maintained number that rotted the moment the tree moved.
 *
 * # The fix
 *
 * `scripts/build-truth.mjs` DERIVES the objective metrics from the file system
 * and writes `docs/BUILD_TRUTH.json` (+ `.md`). This guard re-runs that exact
 * computation and asserts the committed artifacts still match the tree. So:
 *
 *   - Add/remove a route, lib, test, adapter, bridge provider, or Prisma model
 *   - …without running `npm run build:truth`
 *   - → the committed `computed` block diverges from the recomputed one
 *   - → this test fails on push.
 *
 * The only way to make it green again is to regenerate — which makes the docs
 * true by construction. Drift can no longer ship.
 *
 * The `curated` block (a track's human status label, whether a spoke is docked)
 * is deliberately NOT equality-locked — judgment isn't a file count. But every
 * curated track carries its live `evidenceFiles` count, and this guard asserts
 * the invariant that a `shipped` track cannot have zero evidence on disk, so a
 * false "done" is caught too.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { computeTruth, RENDERED_JSON, RENDERED_MARKDOWN } from "../../../scripts/build-truth.mjs";

const ROOT = join(__dirname, "..", "..", "..");
const readCommitted = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

describe("build-status drift guard", () => {
  it("committed BUILD_TRUTH.json matches a fresh recompute from the tree", () => {
    const committed = JSON.parse(readCommitted("docs/BUILD_TRUTH.json"));
    const fresh = computeTruth();
    // The whole point: computed facts must equal the tree. If this fails,
    // someone changed src/ without running `npm run build:truth`.
    expect(committed.computed).toEqual(fresh.computed);
  });

  it("committed BUILD_TRUTH.json is byte-for-byte what the generator emits", () => {
    expect(readCommitted("docs/BUILD_TRUTH.json")).toBe(RENDERED_JSON);
  });

  it("committed BUILD_TRUTH.md is byte-for-byte what the generator emits", () => {
    expect(readCommitted("docs/BUILD_TRUTH.md")).toBe(RENDERED_MARKDOWN);
  });

  it("every `shipped` track has real evidence on disk (no hollow claims)", () => {
    const { curated } = computeTruth();
    const hollow = curated.tracks.filter((t) => t.status === "shipped" && t.evidenceFiles === 0);
    expect(hollow, `shipped tracks with zero evidence files: ${hollow.map((t) => t.id).join(", ")}`).toEqual([]);
  });

  it("telemetry: the tree still looks like Olivia Brain (catches a mis-rooted run)", () => {
    const { computed } = computeTruth();
    expect(computed.apiRoutes).toBeGreaterThan(50);
    expect(computed.libModules).toBeGreaterThan(200);
    expect(computed.testFiles).toBeGreaterThan(100);
    expect(computed.spokes.total).toBe(6);
    expect(computed.bridgeProviders).toBeGreaterThanOrEqual(2); // olivia-self + at least one spoke
  });
});
