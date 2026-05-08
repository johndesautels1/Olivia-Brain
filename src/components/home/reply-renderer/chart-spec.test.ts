/**
 * `chart-spec` parser tests — Track N N1+N3.
 *
 * The parser is the contract boundary between Olivia's chart fences
 * and the recharts renderer. Bad input must never throw at the React
 * tree (cards lock the whole reply); the parser returns a tagged
 * union so the renderer can fall back to a code block on error.
 */

import { describe, it, expect } from "vitest";
import {
  parseChartSpec,
  resolveSeriesColor,
  type ChartSpec,
} from "./chart-spec";

describe("parseChartSpec", () => {
  it("accepts a minimal bar spec", () => {
    const raw = JSON.stringify({
      type: "bar",
      data: [{ stage: "Seed", amount: 12 }],
      x: "stage",
      series: [{ key: "amount" }],
    });
    const r = parseChartSpec(raw);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.spec.type).toBe("bar");
      expect(r.spec.data).toHaveLength(1);
    }
  });

  it("accepts line + area + pie", () => {
    const line = parseChartSpec(
      JSON.stringify({ type: "line", data: [{ x: "Q1", y: 1 }], x: "x", series: [{ key: "y" }] }),
    );
    const area = parseChartSpec(
      JSON.stringify({ type: "area", data: [{ x: "Q1", y: 1 }], x: "x", series: [{ key: "y" }] }),
    );
    const pie = parseChartSpec(
      JSON.stringify({ type: "pie", data: [{ name: "A", v: 1 }], name: "name", value: "v" }),
    );
    expect(line.ok && area.ok && pie.ok).toBe(true);
  });

  it("rejects unknown chart types", () => {
    const r = parseChartSpec(
      JSON.stringify({ type: "scatter", data: [{ x: 1, y: 2 }] }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/unsupported type/);
  });

  it("rejects malformed JSON", () => {
    const r = parseChartSpec("{ this is not json");
    expect(r.ok).toBe(false);
  });

  it("rejects non-object root", () => {
    const r = parseChartSpec("[1,2,3]");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/expected object/);
  });

  it("rejects empty data array", () => {
    const r = parseChartSpec(
      JSON.stringify({ type: "bar", data: [], x: "x", series: [{ key: "y" }] }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/non-empty array/);
  });

  it("rejects bar without x key", () => {
    const r = parseChartSpec(
      JSON.stringify({ type: "bar", data: [{ y: 1 }], series: [{ key: "y" }] }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/requires string "x"/);
  });

  it("rejects pie without value+name keys", () => {
    const r = parseChartSpec(
      JSON.stringify({ type: "pie", data: [{ a: "Foo", v: 1 }], value: "v" }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/requires string "value" and "name"/);
  });

  it("rejects series entry without key", () => {
    const r = parseChartSpec(
      JSON.stringify({
        type: "bar",
        data: [{ x: "A", y: 1 }],
        x: "x",
        series: [{ label: "missing key" }],
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/needs a string "key"/);
  });

  it("treats data rows that aren't objects as invalid", () => {
    const r = parseChartSpec(
      JSON.stringify({ type: "bar", data: [42], x: "x", series: [{ key: "y" }] }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/each data row must be an object/);
  });
});

describe("resolveSeriesColor", () => {
  it("resolves named tokens to hex", () => {
    expect(resolveSeriesColor("aurum", 0)).toBe("#C4A96A");
    expect(resolveSeriesColor("aether", 0)).toBe("#818CF8");
    expect(resolveSeriesColor("mint", 0)).toBe("#5EE0BE");
  });

  it("rotates default palette by index when token is undefined", () => {
    const c0 = resolveSeriesColor(undefined, 0);
    const c1 = resolveSeriesColor(undefined, 1);
    const c2 = resolveSeriesColor(undefined, 2);
    expect(c0).not.toBe(c1);
    expect(c1).not.toBe(c2);
  });

  it("wraps the palette modulo length", () => {
    const c0 = resolveSeriesColor(undefined, 0);
    const c6 = resolveSeriesColor(undefined, 6);
    expect(c0).toBe(c6);
  });
});

describe("ChartSpec consumer integrity", () => {
  it("preserves all top-level fields after a successful parse", () => {
    const spec: ChartSpec = {
      type: "bar",
      title: "Funding by stage",
      caption: "FY2025",
      data: [
        { stage: "Seed", amount: 12, hires: 4 },
        { stage: "Series A", amount: 38, hires: 15 },
      ],
      x: "stage",
      series: [
        { key: "amount", label: "£M", color: "aurum" },
        { key: "hires", label: "Headcount", color: "aether" },
      ],
    };
    const r = parseChartSpec(JSON.stringify(spec));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.spec).toEqual(spec);
    }
  });
});
