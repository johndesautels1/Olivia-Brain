/**
 * @vitest-environment jsdom
 */

/**
 * `ChartFromSpec` mount tests — closes the 1/7 fence renderer gap
 * deferred in `mount.test.tsx` (commit e90f517).
 *
 * Recharts depends on `ResizeObserver` which jsdom does not provide
 * natively; the global no-op shim now lives in `vitest.setup.ts` (see
 * the ResizeObserver section there). With that in place, recharts
 * mounts cleanly in jsdom; the only quirk is that `ResponsiveContainer`
 * computes a 0×0 layout because there's no real layout engine, so the
 * inner SVG body is empty. We test what we can observe without layout:
 *   - The `<figure>` wrapper mounts
 *   - The optional `figcaption` (title) renders the spec's title
 *   - The optional caption line renders the spec's caption
 *   - Each chart type (bar / line / area / pie) mounts without throwing
 *
 * What we deliberately do NOT test here:
 *   - Pixel-level chart geometry (axes, ticks, bar positions, slice
 *     angles) — jsdom does not compute SVG layout. That's the domain
 *     of Chromatic visual regression per
 *     `05_DESIGN_SYSTEM_PACKAGE_SPEC.md § 8`.
 *   - Color resolution from token to hex — already covered by
 *     `chart-spec.test.ts` (resolveSeriesColor tests).
 *
 * The contract this file locks down: a valid `ChartSpec` never throws
 * during render, and the surrounding container chrome (title +
 * caption) is wired through correctly.
 */

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";

import { ChartFromSpec } from "./ChartFromSpec";
import type { ChartSpec } from "./chart-spec";

afterEach(() => {
  cleanup();
});

const BAR_SPEC: ChartSpec = {
  type: "bar",
  title: "Funding by stage",
  caption: "£M raised across rounds",
  data: [
    { stage: "Seed", amount: 12 },
    { stage: "Series A", amount: 38 },
    { stage: "Series B", amount: 84 },
  ],
  x: "stage",
  series: [{ key: "amount", label: "£M", color: "aurum" }],
};

const LINE_SPEC: ChartSpec = {
  type: "line",
  title: "Monthly burn",
  data: [
    { month: "Jan", burn: 180 },
    { month: "Feb", burn: 165 },
    { month: "Mar", burn: 158 },
  ],
  x: "month",
  series: [{ key: "burn", label: "£k/mo", color: "coral" }],
};

const AREA_SPEC: ChartSpec = {
  type: "area",
  data: [
    { q: "Q1", arr: 1.8 },
    { q: "Q2", arr: 2.1 },
    { q: "Q3", arr: 2.4 },
  ],
  x: "q",
  series: [{ key: "arr", color: "mint" }],
};

const PIE_SPEC: ChartSpec = {
  type: "pie",
  title: "Revenue by channel",
  data: [
    { name: "Direct", value: 60 },
    { name: "Partner", value: 30 },
    { name: "Other", value: 10 },
  ],
  value: "value",
  name: "name",
  donut: true,
};

// ─────────────────────────────────────────────
// Container chrome — title + caption
// ─────────────────────────────────────────────

describe("ChartFromSpec — figure chrome", () => {
  it("renders title as a figcaption when provided", () => {
    const { container } = render(<ChartFromSpec spec={BAR_SPEC} />);
    const caption = container.querySelector("figcaption");
    expect(caption).not.toBeNull();
    expect(caption?.textContent).toBe("Funding by stage");
  });

  it("omits the figcaption when no title is provided", () => {
    const { container } = render(
      <ChartFromSpec spec={{ ...AREA_SPEC, title: undefined }} />,
    );
    expect(container.querySelector("figcaption")).toBeNull();
  });

  it("renders caption text when provided", () => {
    const { container } = render(<ChartFromSpec spec={BAR_SPEC} />);
    expect(container.textContent).toContain("£M raised across rounds");
  });

  it("omits caption text when no caption is provided", () => {
    const { container } = render(<ChartFromSpec spec={LINE_SPEC} />);
    expect(container.textContent ?? "").not.toContain("£M raised across rounds");
  });

  it("wraps the chart in a <figure> element (semantic correctness)", () => {
    const { container } = render(<ChartFromSpec spec={BAR_SPEC} />);
    expect(container.querySelector("figure")).not.toBeNull();
  });
});

// ─────────────────────────────────────────────
// Chart type dispatch — every variant mounts without throwing
// ─────────────────────────────────────────────

describe("ChartFromSpec — chart-type dispatch", () => {
  it("mounts a bar chart for type=bar", () => {
    /* If recharts internals throw on mount, render() rejects and the
     * test fails. The assertion is the mount itself. */
    expect(() => render(<ChartFromSpec spec={BAR_SPEC} />)).not.toThrow();
  });

  it("mounts a line chart for type=line", () => {
    expect(() => render(<ChartFromSpec spec={LINE_SPEC} />)).not.toThrow();
  });

  it("mounts an area chart for type=area", () => {
    expect(() => render(<ChartFromSpec spec={AREA_SPEC} />)).not.toThrow();
  });

  it("mounts a pie chart for type=pie (with donut variant)", () => {
    expect(() => render(<ChartFromSpec spec={PIE_SPEC} />)).not.toThrow();
  });

  it("mounts a pie chart with donut=false", () => {
    expect(() =>
      render(<ChartFromSpec spec={{ ...PIE_SPEC, donut: false }} />),
    ).not.toThrow();
  });
});

// ─────────────────────────────────────────────
// Multi-series + minimal spec edge cases
// ─────────────────────────────────────────────

describe("ChartFromSpec — series variants", () => {
  it("mounts a multi-series bar chart (grouped/stacked render path)", () => {
    const multiSeries: ChartSpec = {
      type: "bar",
      data: [
        { stage: "Seed", anthropic: 12, openai: 8 },
        { stage: "Series A", anthropic: 38, openai: 22 },
      ],
      x: "stage",
      series: [
        { key: "anthropic", color: "aurum" },
        { key: "openai", color: "aether" },
      ],
    };
    expect(() => render(<ChartFromSpec spec={multiSeries} />)).not.toThrow();
  });

  it("mounts a single-data-point spec (edge case — recharts handles 1-row data)", () => {
    const onePoint: ChartSpec = {
      type: "bar",
      data: [{ stage: "Seed", amount: 12 }],
      x: "stage",
      series: [{ key: "amount" }],
    };
    expect(() => render(<ChartFromSpec spec={onePoint} />)).not.toThrow();
  });

  it("mounts a chart with no explicit series array (parser allows; falls back to empty)", () => {
    /* parseChartSpec leaves `series` optional. The renderer must not
     * throw when series is undefined — covers a real Olivia-emit case
     * where the model returns data + x but forgets to declare series. */
    const noSeries = {
      type: "bar",
      data: [{ stage: "Seed", amount: 12 }],
      x: "stage",
    } as unknown as ChartSpec;
    expect(() => render(<ChartFromSpec spec={noSeries} />)).not.toThrow();
  });
});
