/**
 * `src/lib/avatar/decision-rubric.ts` — pure-function tests.
 *
 * Track O5c session 3. The decision rubric is the load-bearing math
 * for the vendor-ranking page; bugs here would mis-rank vendors and
 * mislead the founder's procurement decision. Cover aggregation
 * (median, mean), composite math (latency × 0.4 + MOS × 0.4 +
 * cost × 0.2 with latency + cost inverted), and edge cases (empty
 * input, all-equal values, missing MOS).
 */
import { describe, expect, it } from "vitest";

import {
  aggregateRunsByVendor,
  rankVendors,
  DEFAULT_RUBRIC_WEIGHTS,
  type AvatarRunInput,
} from "@/lib/avatar/decision-rubric";

describe("aggregateRunsByVendor", () => {
  it("returns empty array for no runs", () => {
    expect(aggregateRunsByVendor([])).toEqual([]);
  });

  it("groups runs by vendor and computes median latency", () => {
    const runs: AvatarRunInput[] = [
      { vendor: "tavus", latencyMs: 100, mosScore: 4.0, costCents: 5 },
      { vendor: "tavus", latencyMs: 300, mosScore: 4.5, costCents: 6 },
      { vendor: "tavus", latencyMs: 200, mosScore: null, costCents: null },
      { vendor: "simli", latencyMs: 80, mosScore: 3.5, costCents: 2 },
    ];
    const aggs = aggregateRunsByVendor(runs);
    expect(aggs).toHaveLength(2);

    const tavus = aggs.find((a) => a.vendor === "tavus");
    expect(tavus).toBeDefined();
    expect(tavus!.runCount).toBe(3);
    // Median of [100, 200, 300] = 200
    expect(tavus!.medianLatencyMs).toBe(200);
    // Mean of [4.0, 4.5] = 4.25 (only the rated runs count)
    expect(tavus!.meanMosScore).toBeCloseTo(4.25, 2);
    expect(tavus!.meanCostCents).toBeCloseTo(5.5, 2);

    const simli = aggs.find((a) => a.vendor === "simli");
    expect(simli!.runCount).toBe(1);
    expect(simli!.medianLatencyMs).toBe(80);
  });

  it("returns null for meanMosScore / meanCostCents when no run in the group has a value", () => {
    const aggs = aggregateRunsByVendor([
      { vendor: "tavus", latencyMs: 100, mosScore: null, costCents: null },
    ]);
    expect(aggs[0].meanMosScore).toBeNull();
    expect(aggs[0].meanCostCents).toBeNull();
  });

  it("computes median for an even-length latency set", () => {
    const aggs = aggregateRunsByVendor([
      { vendor: "x", latencyMs: 100, mosScore: 4, costCents: 1 },
      { vendor: "x", latencyMs: 200, mosScore: 4, costCents: 1 },
      { vendor: "x", latencyMs: 300, mosScore: 4, costCents: 1 },
      { vendor: "x", latencyMs: 400, mosScore: 4, costCents: 1 },
    ]);
    // Median of [100, 200, 300, 400] = (200 + 300) / 2 = 250
    expect(aggs[0].medianLatencyMs).toBe(250);
  });
});

describe("rankVendors", () => {
  it("returns empty array when no vendor has MOS data", () => {
    const aggs = aggregateRunsByVendor([
      { vendor: "tavus", latencyMs: 100, mosScore: null, costCents: 5 },
    ]);
    expect(rankVendors(aggs)).toEqual([]);
  });

  it("excludes vendors without MOS data from the ranking", () => {
    const aggs = aggregateRunsByVendor([
      { vendor: "tavus", latencyMs: 100, mosScore: 4.5, costCents: 5 },
      { vendor: "simli", latencyMs: 80, mosScore: null, costCents: 2 },
    ]);
    const ranked = rankVendors(aggs);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].vendor).toBe("tavus");
  });

  it("ranks the lower-latency higher-MOS vendor first when costs are tied", () => {
    // Vendor A wins on latency AND MOS; vendor B is equal on cost.
    const aggs = aggregateRunsByVendor([
      { vendor: "A", latencyMs: 100, mosScore: 4.5, costCents: 5 },
      { vendor: "B", latencyMs: 500, mosScore: 3.0, costCents: 5 },
    ]);
    const ranked = rankVendors(aggs);
    expect(ranked[0].vendor).toBe("A");
    expect(ranked[1].vendor).toBe("B");
    // A wins both inverted-latency and MOS components → composite > B's
    expect(ranked[0].composite).toBeGreaterThan(ranked[1].composite);
  });

  it("inverts latency: faster vendor gets a higher latency component", () => {
    const aggs = aggregateRunsByVendor([
      { vendor: "fast", latencyMs: 100, mosScore: 3.0, costCents: 5 },
      { vendor: "slow", latencyMs: 1000, mosScore: 3.0, costCents: 5 },
    ]);
    const ranked = rankVendors(aggs);
    const fast = ranked.find((r) => r.vendor === "fast")!;
    const slow = ranked.find((r) => r.vendor === "slow")!;
    expect(fast.latencyComponent).toBeGreaterThan(slow.latencyComponent);
  });

  it("inverts cost: cheaper vendor gets a higher cost component", () => {
    const aggs = aggregateRunsByVendor([
      { vendor: "cheap", latencyMs: 200, mosScore: 4.0, costCents: 1 },
      { vendor: "expensive", latencyMs: 200, mosScore: 4.0, costCents: 50 },
    ]);
    const ranked = rankVendors(aggs);
    const cheap = ranked.find((r) => r.vendor === "cheap")!;
    const expensive = ranked.find((r) => r.vendor === "expensive")!;
    expect(cheap.costComponent).toBeGreaterThan(expensive.costComponent);
  });

  it("rewards MOS directly (higher raw → higher component)", () => {
    const aggs = aggregateRunsByVendor([
      { vendor: "great", latencyMs: 200, mosScore: 5.0, costCents: 5 },
      { vendor: "ok", latencyMs: 200, mosScore: 2.0, costCents: 5 },
    ]);
    const ranked = rankVendors(aggs);
    const great = ranked.find((r) => r.vendor === "great")!;
    const ok = ranked.find((r) => r.vendor === "ok")!;
    expect(great.mosComponent).toBeGreaterThan(ok.mosComponent);
  });

  it("treats all-equal candidate sets as ties (component = 1)", () => {
    const aggs = aggregateRunsByVendor([
      { vendor: "A", latencyMs: 200, mosScore: 4.0, costCents: 5 },
      { vendor: "B", latencyMs: 200, mosScore: 4.0, costCents: 5 },
    ]);
    const ranked = rankVendors(aggs);
    // Both vendors have identical raw values; every normalised
    // component should be 1, so composite = 1.0 for both.
    for (const r of ranked) {
      expect(r.latencyComponent).toBe(1);
      expect(r.mosComponent).toBe(1);
      expect(r.costComponent).toBe(1);
      expect(r.composite).toBeCloseTo(1.0, 5);
    }
  });

  it("applies the default weights correctly when only one component differs", () => {
    // A and B differ only on latency. A is faster.
    const aggs = aggregateRunsByVendor([
      { vendor: "A", latencyMs: 100, mosScore: 4.0, costCents: 5 },
      { vendor: "B", latencyMs: 500, mosScore: 4.0, costCents: 5 },
    ]);
    const ranked = rankVendors(aggs);
    const a = ranked.find((r) => r.vendor === "A")!;
    const b = ranked.find((r) => r.vendor === "B")!;
    // A's latency component = 1, B's = 0. MOS + cost components are
    // equal (both = 1). So composite delta = weight.latency = 0.4.
    expect(a.composite - b.composite).toBeCloseTo(
      DEFAULT_RUBRIC_WEIGHTS.latency,
      5,
    );
  });

  it("respects custom weights", () => {
    const aggs = aggregateRunsByVendor([
      { vendor: "fast", latencyMs: 100, mosScore: 3.0, costCents: 5 },
      { vendor: "great", latencyMs: 500, mosScore: 5.0, costCents: 5 },
    ]);
    // Default weights → great wins on MOS at the same weight as
    // fast wins on latency (cost is equal). Slight tie-break tilts
    // either way depending on raw values; test with MOS-favoured
    // weights to make great win clearly.
    const ranked = rankVendors(aggs, { latency: 0.1, mos: 0.8, cost: 0.1 });
    expect(ranked[0].vendor).toBe("great");
  });
});
