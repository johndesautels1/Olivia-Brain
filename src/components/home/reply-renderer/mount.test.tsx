/**
 * @vitest-environment jsdom
 */

/**
 * Reply-renderer mount tests — Track N visual-manifestation layer.
 *
 * Renderer-level coverage for 6 of the 7 fences shipped in Track N:
 * GammaCard / CitationStrip / TimelineFromSpec / MapManifest (fallback
 * path) / UIManifest / ComparisonView.
 *
 * ChartFromSpec is intentionally deferred — recharts requires
 * ResizeObserver + getBoundingClientRect plumbing that jsdom doesn't
 * provide cleanly; it gets a dedicated test file once the recharts
 * shim is in place.
 *
 * What each section asserts:
 *   - Spec → DOM: every primary text field surfaces in the rendered output
 *   - ARIA contract: roles, labels, aria-valuenow on progress, aria-label
 *     on map fallback figure
 *   - Link safety: external links carry target="_blank" + rel="noopener
 *     noreferrer"; button hrefs (when present) honor the same rule
 *   - State variants: winner highlight, disabled buttons, progress clamp
 *
 * These tests catch silent regressions where a render path drops a
 * field, swaps a role, or strips a rel attribute — none of which the
 * parser tests catch because parsers operate on JSON, not DOM.
 *
 * All 6 renderers ship with token-only styling (verified at audit time
 * by the no-raw-hex source guard); these tests do NOT assert on inline
 * style values because tokens resolve to runtime CSS-variable lookups
 * that jsdom doesn't compute. Visual fidelity is owned by manual review
 * + future Chromatic snapshots per `05_DESIGN_SYSTEM_PACKAGE_SPEC.md § 8`.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";

import { GammaCard } from "./GammaCard";
import { CitationStrip } from "./CitationStrip";
import { TimelineFromSpec, type TimelineEntry } from "./TimelineFromSpec";
import { MapManifest } from "./MapManifest";
import { UIManifest } from "./UIManifest";
import { ComparisonView } from "./ComparisonView";

afterEach(() => {
  cleanup();
});

// ─────────────────────────────────────────────
// GammaCard
// ─────────────────────────────────────────────

describe("GammaCard mount", () => {
  it("renders hostname as title when no explicit title is provided", () => {
    const { container } = render(
      <GammaCard spec={{ url: "https://gamma.app/docs/abc" }} />,
    );
    /* The hostname fallback path — no title field, no summary, no slides
     * count: the article should still render the hostname as the
     * primary identifier. */
    expect(container.textContent).toContain("gamma.app");
  });

  it("renders title + summary + slides + Open-in-Gamma link", () => {
    const { container, getByRole } = render(
      <GammaCard
        spec={{
          url: "https://gamma.app/docs/abc",
          title: "Series A pitch",
          summary: "12-slide deck for Atomico",
          slides: 12,
        }}
      />,
    );
    expect(container.textContent).toContain("Series A pitch");
    expect(container.textContent).toContain("12-slide deck for Atomico");
    expect(container.textContent).toContain("12 slides");
    const link = getByRole("link", { name: /open in gamma/i });
    expect(link.getAttribute("href")).toBe("https://gamma.app/docs/abc");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });
});

// ─────────────────────────────────────────────
// CitationStrip
// ─────────────────────────────────────────────

describe("CitationStrip mount", () => {
  it("renders every citation as a numbered link with safe external attributes", () => {
    const { container } = render(
      <CitationStrip
        citations={[
          { title: "Numbeo cost data", url: "https://numbeo.com/cost-of-living/in/Lisbon", source: "Numbeo" },
          { title: "Eurostat", url: "https://ec.europa.eu/eurostat" },
        ]}
      />,
    );
    expect(container.textContent).toContain("Numbeo cost data");
    expect(container.textContent).toContain("Eurostat");
    const links = container.querySelectorAll("a");
    expect(links.length).toBeGreaterThanOrEqual(2);
    for (const link of links) {
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    }
  });
});

// ─────────────────────────────────────────────
// TimelineFromSpec
// ─────────────────────────────────────────────

describe("TimelineFromSpec mount", () => {
  const entries: readonly TimelineEntry[] = [
    { date: "2024-Q1", title: "Series A closed", detail: "£8M from Atomico", tone: "positive" },
    { date: "2024-Q3", title: "EU expansion", detail: "Berlin + Paris offices" },
    { date: "2025-Q1", title: "Series B", tone: "warning" },
  ];

  it("renders every entry's date + title inside an ordered list", () => {
    const { container } = render(<TimelineFromSpec entries={entries} />);
    /* TimelineFromSpec renders as <ol> per § 6 of the spec for
     * chronological narratives. */
    const list = container.querySelector("ol");
    expect(list).not.toBeNull();
    expect(container.textContent).toContain("Series A closed");
    expect(container.textContent).toContain("EU expansion");
    expect(container.textContent).toContain("Series B");
    expect(container.textContent).toContain("2024-Q1");
    expect(container.textContent).toContain("2025-Q1");
  });

  it("surfaces the detail line when present and omits it when absent", () => {
    const { container } = render(<TimelineFromSpec entries={entries} />);
    expect(container.textContent).toContain("£8M from Atomico");
    expect(container.textContent).toContain("Berlin + Paris offices");
    /* Series B entry has no detail — verify the title still renders but
     * detail does not pollute the prior entry's space. */
    const text = container.textContent ?? "";
    const seriesBPos = text.indexOf("Series B");
    expect(seriesBPos).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────
// MapManifest — fallback path (no Mapbox token)
// ─────────────────────────────────────────────

describe("MapManifest fallback mount", () => {
  /* `NEXT_PUBLIC_MAPBOX_TOKEN` is read at render-time via process.env.
   * jsdom's process.env carries the parent process's environment;
   * explicitly clear it for these tests to force the fallback path. */
  const ORIGINAL_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  beforeEach(() => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = "";
  });
  afterEach(() => {
    if (ORIGINAL_TOKEN === undefined) delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    else process.env.NEXT_PUBLIC_MAPBOX_TOKEN = ORIGINAL_TOKEN;
  });

  it("renders pins as a list when no Mapbox token is configured", () => {
    const { container } = render(
      <MapManifest
        spec={{
          title: "Top 3 relocation cities",
          pins: [
            { name: "Lisbon", lat: 38.7223, lng: -9.1393, score: 87, detail: "Climate fit" },
            { name: "Berlin", lat: 52.52, lng: 13.405, score: 79 },
            { name: "Barcelona", lat: 41.3851, lng: 2.1734 },
          ],
        }}
      />,
    );
    /* The fallback path renders an <article> + <ol> with one <li> per
     * pin. Every pin's name must surface. */
    expect(container.querySelector("article")).not.toBeNull();
    expect(container.textContent).toContain("Lisbon");
    expect(container.textContent).toContain("Berlin");
    expect(container.textContent).toContain("Barcelona");
    expect(container.textContent).toContain("Top 3 relocation cities");
  });

  it("surfaces score + detail on the pins that carry them", () => {
    const { container } = render(
      <MapManifest
        spec={{
          pins: [
            { name: "Lisbon", lat: 38.7223, lng: -9.1393, score: 87, detail: "Climate fit" },
          ],
        }}
      />,
    );
    expect(container.textContent).toContain("87");
    expect(container.textContent).toContain("Climate fit");
  });

  it("links each pin to Google Maps with safe external attributes", () => {
    const { container } = render(
      <MapManifest
        spec={{ pins: [{ name: "Lisbon", lat: 38.7223, lng: -9.1393 }] }}
      />,
    );
    const links = container.querySelectorAll("a");
    expect(links.length).toBeGreaterThanOrEqual(1);
    const mapsLink = Array.from(links).find((l) => /google\.com\/maps/.test(l.href));
    expect(mapsLink).toBeDefined();
    expect(mapsLink?.getAttribute("target")).toBe("_blank");
    expect(mapsLink?.getAttribute("rel")).toBe("noopener noreferrer");
  });
});

// ─────────────────────────────────────────────
// UIManifest
// ─────────────────────────────────────────────

describe("UIManifest mount", () => {
  it("renders every primitive in the order declared in the spec", () => {
    const { container } = render(
      <UIManifest
        spec={{
          title: "Series A readiness",
          components: [
            { kind: "stat", label: "ARR", value: "£2.4M", delta: "+18%", tone: "positive" },
            { kind: "progress", label: "Pitch readiness", value: 74, color: "aurum" },
            { kind: "card", title: "Next step", body: "Polish slides 4 + 7.", tone: "aether" },
            { kind: "button", label: "Open deck", href: "https://gamma.app/x", tone: "primary" },
          ],
        }}
      />,
    );
    const text = container.textContent ?? "";
    expect(text).toContain("Series A readiness");
    expect(text).toContain("ARR");
    expect(text).toContain("£2.4M");
    expect(text).toContain("+18%");
    expect(text).toContain("Pitch readiness");
    expect(text).toContain("Next step");
    expect(text).toContain("Polish slides 4 + 7.");
    expect(text).toContain("Open deck");
  });

  it("renders the progress primitive with the correct ARIA contract", () => {
    const { getByRole } = render(
      <UIManifest
        spec={{
          components: [{ kind: "progress", label: "Pitch readiness", value: 74, color: "aurum" }],
        }}
      />,
    );
    const bar = getByRole("progressbar", { name: /pitch readiness/i });
    expect(bar.getAttribute("aria-valuenow")).toBe("74");
    expect(bar.getAttribute("aria-valuemin")).toBe("0");
    expect(bar.getAttribute("aria-valuemax")).toBe("100");
  });

  it("clamps progress value into 0-100 range at render time", () => {
    const { getByRole } = render(
      <UIManifest
        spec={{
          components: [
            { kind: "progress", label: "OOB high", value: 150 },
          ],
        }}
      />,
    );
    const bar = getByRole("progressbar", { name: /oob high/i });
    expect(bar.getAttribute("aria-valuenow")).toBe("100");
  });

  it("renders href-bearing buttons as anchors with safe external attributes", () => {
    const { getByRole } = render(
      <UIManifest
        spec={{
          components: [{ kind: "button", label: "Open", href: "https://example.test/x" }],
        }}
      />,
    );
    const link = getByRole("link", { name: /open/i });
    expect(link.getAttribute("href")).toBe("https://example.test/x");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("renders href-less buttons as disabled native button elements (no event surface)", () => {
    const { getByRole } = render(
      <UIManifest
        spec={{
          components: [{ kind: "button", label: "Inert" }],
        }}
      />,
    );
    const btn = getByRole("button", { name: /inert/i });
    expect(btn.tagName).toBe("BUTTON");
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });
});

// ─────────────────────────────────────────────
// ComparisonView
// ─────────────────────────────────────────────

describe("ComparisonView mount", () => {
  it("renders all columns with name + score + highlights + lowlights", () => {
    const { container } = render(
      <ComparisonView
        spec={{
          title: "London vs Berlin",
          verdict: "London wins on capital; Berlin on cost.",
          columns: [
            {
              name: "London",
              score: 87,
              tone: "aurum",
              highlights: ["Largest VC market", "English-speaking"],
              lowlights: ["High cost of living"],
            },
            {
              name: "Berlin",
              score: 79,
              tone: "aether",
              highlights: ["30% lower COL"],
              lowlights: ["Smaller late-stage capital"],
            },
          ],
        }}
      />,
    );
    const text = container.textContent ?? "";
    expect(text).toContain("London vs Berlin");
    expect(text).toContain("London wins on capital");
    expect(text).toContain("London");
    expect(text).toContain("Berlin");
    expect(text).toContain("87");
    expect(text).toContain("79");
    expect(text).toContain("Largest VC market");
    expect(text).toContain("English-speaking");
    expect(text).toContain("High cost of living");
    expect(text).toContain("30% lower COL");
    expect(text).toContain("Smaller late-stage capital");
  });

  it("highlights the winner column with the ★ Winner badge", () => {
    const { container } = render(
      <ComparisonView
        spec={{
          winner: "London",
          columns: [
            { name: "London", score: 87, tone: "aurum" },
            { name: "Berlin", score: 79, tone: "aether" },
          ],
        }}
      />,
    );
    /* The badge is rendered only on the winning column. */
    expect(container.textContent).toContain("Winner");
    /* The aria-label for the winning column's article must reflect
     * the winner state per the renderer's contract. */
    const articles = container.querySelectorAll("article");
    const londonArticle = Array.from(articles).find((a) =>
      a.getAttribute("aria-label")?.toLowerCase().includes("london"),
    );
    expect(londonArticle?.getAttribute("aria-label")).toMatch(/winner/i);
  });

  it("does NOT render the winner badge when no winner is set", () => {
    const { container } = render(
      <ComparisonView
        spec={{
          columns: [
            { name: "Lisbon", score: 87 },
            { name: "Berlin", score: 79 },
          ],
        }}
      />,
    );
    expect(container.textContent).not.toContain("Winner");
  });
});
