/**
 * @vitest-environment jsdom
 */

/**
 * `MarkdownReply` integration tests.
 *
 * The top-level wrapper that takes an Olivia reply (markdown string
 * with optional fenced code blocks) and renders the full DOM tree —
 * dispatching each fence language to the right renderer.
 *
 * Parser tests (`*-spec.test.ts` × 7) verify JSON → spec object.
 * Mount tests (`mount.test.tsx` + `ChartFromSpec.mount.test.tsx`)
 * verify spec object → DOM for each fence renderer in isolation.
 *
 * This file closes the third leg of the testing triangle: it verifies
 * the markdown-string → dispatched-renderer pipeline, which is the
 * full contract Olivia's reply path actually exercises in production.
 *
 * What gets tested:
 *
 *   1. Markdown elements — paragraphs, heading remap, lists, blockquote,
 *      table, links (external + internal), inline code
 *   2. Fence dispatch — every one of the 7 languages routes to its
 *      renderer; rendered DOM carries the renderer's distinctive
 *      output
 *   3. Error paths — unknown language falls through to CodeBlock;
 *      invalid fence content surfaces the parser's error message
 *      via CodeBlock's `note` slot
 *
 * Stays inside jsdom; no network is touched. The MapManifest dispatch
 * test clears `NEXT_PUBLIC_MAPBOX_TOKEN` to force the fallback path
 * (the only path that's observable in jsdom).
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";

import { MarkdownReply } from "./MarkdownReply";

afterEach(() => {
  cleanup();
});

// ─────────────────────────────────────────────
// Markdown element rendering
// ─────────────────────────────────────────────

describe("MarkdownReply — markdown primitives", () => {
  it("renders plain text inside a <p>", () => {
    const { container } = render(<MarkdownReply text="Hello world." />);
    expect(container.querySelector("p")?.textContent).toBe("Hello world.");
  });

  it("remaps heading levels — h1 → h3, h2 → h4, h3 → h5", () => {
    const md = `# Top\n\n## Mid\n\n### Sub`;
    const { container } = render(<MarkdownReply text={md} />);
    /* The wrapper bumps semantic headings down two levels to avoid
     * stomping on the host page's h1/h2/h3 hierarchy when a reply
     * embeds inside an existing document. */
    expect(container.querySelector("h3")?.textContent).toBe("Top");
    expect(container.querySelector("h4")?.textContent).toBe("Mid");
    expect(container.querySelector("h5")?.textContent).toBe("Sub");
    expect(container.querySelector("h1")).toBeNull();
    expect(container.querySelector("h2")).toBeNull();
  });

  it("renders unordered + ordered lists with their items", () => {
    const md = `- alpha\n- beta\n\n1. one\n2. two`;
    const { container } = render(<MarkdownReply text={md} />);
    expect(container.querySelector("ul")?.textContent).toContain("alpha");
    expect(container.querySelector("ul")?.textContent).toContain("beta");
    expect(container.querySelector("ol")?.textContent).toContain("one");
    expect(container.querySelector("ol")?.textContent).toContain("two");
  });

  it("renders a blockquote with the Aurum left-border styling cue (semantic check)", () => {
    const md = `> quoted line`;
    const { container } = render(<MarkdownReply text={md} />);
    const bq = container.querySelector("blockquote");
    expect(bq).not.toBeNull();
    expect(bq?.textContent).toContain("quoted line");
  });

  it("renders a GFM table with header + rows", () => {
    const md = "| Col | Val |\n|---|---|\n| a | 1 |\n| b | 2 |";
    const { container } = render(<MarkdownReply text={md} />);
    expect(container.querySelector("table")).not.toBeNull();
    expect(container.querySelector("th")?.textContent).toBe("Col");
    expect(container.textContent).toContain("a");
    expect(container.textContent).toContain("1");
  });
});

// ─────────────────────────────────────────────
// Link safety
// ─────────────────────────────────────────────

describe("MarkdownReply — link safety", () => {
  it("adds target=_blank + rel=noopener noreferrer to http(s) links", () => {
    const { container } = render(
      <MarkdownReply text="See [docs](https://example.test/x) for more." />,
    );
    const link = container.querySelector("a");
    expect(link?.getAttribute("href")).toBe("https://example.test/x");
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("does NOT add target/rel for in-app relative links", () => {
    const { container } = render(
      <MarkdownReply text="Back to [home](/home)" />,
    );
    const link = container.querySelector("a");
    expect(link?.getAttribute("href")).toBe("/home");
    expect(link?.getAttribute("target")).toBeNull();
    expect(link?.getAttribute("rel")).toBeNull();
  });
});

// ─────────────────────────────────────────────
// Inline code
// ─────────────────────────────────────────────

describe("MarkdownReply — inline code", () => {
  it("renders inline backtick code as an inline <code> with aurum tint", () => {
    const { container } = render(
      <MarkdownReply text="Use `process.env.X` to read it." />,
    );
    const inlineCode = container.querySelector("code");
    expect(inlineCode?.textContent).toBe("process.env.X");
    /* Inline path renders without a <pre> wrapper. */
    expect(inlineCode?.closest("pre")).toBeNull();
  });
});

// ─────────────────────────────────────────────
// Fence dispatch — 7 fences
// ─────────────────────────────────────────────

describe("MarkdownReply — fence dispatch", () => {
  it("dispatches ```chart``` to ChartFromSpec (figcaption surfaces title)", async () => {
    const md = [
      "Here's the breakdown:",
      "",
      "```chart",
      JSON.stringify({
        type: "bar",
        title: "Funding by stage",
        data: [{ stage: "Seed", amount: 12 }],
        x: "stage",
        series: [{ key: "amount" }],
      }),
      "```",
    ].join("\n");
    /* `ChartFromSpec` is lazy-loaded via `next/dynamic({ ssr: false })` to
     * keep recharts (~120 KB) out of the home-page initial bundle (Bundle
     * E-1 Phase 3a, FIX-3 2026-05-26). The figcaption appears once the
     * chunk resolves on the next microtask — `findByText` retries until
     * it does. */
    const { findByText } = render(<MarkdownReply text={md} />);
    const caption = await findByText("Funding by stage");
    expect(caption.tagName.toLowerCase()).toBe("figcaption");
  });

  it("dispatches ```gamma``` to GammaCard (Open-in-Gamma anchor)", () => {
    const md = [
      "Here is the deck:",
      "",
      "```gamma",
      "https://gamma.app/docs/abc",
      "```",
    ].join("\n");
    const { container } = render(<MarkdownReply text={md} />);
    const link = Array.from(container.querySelectorAll("a")).find((a) =>
      a.textContent?.toLowerCase().includes("open in gamma"),
    );
    expect(link?.getAttribute("href")).toBe("https://gamma.app/docs/abc");
    expect(link?.getAttribute("target")).toBe("_blank");
  });

  it("dispatches ```sources``` to CitationStrip (numbered links surface)", () => {
    const md = [
      "Sources below.",
      "",
      "```sources",
      JSON.stringify([
        { title: "Numbeo", url: "https://numbeo.com/x", source: "Numbeo" },
        { title: "Eurostat", url: "https://ec.europa.eu/eurostat" },
      ]),
      "```",
    ].join("\n");
    const { container } = render(<MarkdownReply text={md} />);
    expect(container.textContent).toContain("Numbeo");
    expect(container.textContent).toContain("Eurostat");
  });

  it("dispatches ```timeline``` to TimelineFromSpec (<ol> with entries)", () => {
    const md = [
      "Funding history:",
      "",
      "```timeline",
      JSON.stringify([
        { date: "2024-Q1", title: "Series A closed" },
        { date: "2025-Q1", title: "Series B" },
      ]),
      "```",
    ].join("\n");
    const { container } = render(<MarkdownReply text={md} />);
    expect(container.textContent).toContain("Series A closed");
    expect(container.textContent).toContain("Series B");
    /* The renderer uses <ol> per the timeline spec; the markdown text
     * above contains no markdown list, so the only <ol> in the DOM
     * must come from the timeline fence. */
    expect(container.querySelector("ol")).not.toBeNull();
  });

  describe("```map``` dispatch (fallback path)", () => {
    const ORIGINAL_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    beforeEach(() => {
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN = "";
    });
    afterEach(() => {
      if (ORIGINAL_TOKEN === undefined)
        delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      else process.env.NEXT_PUBLIC_MAPBOX_TOKEN = ORIGINAL_TOKEN;
    });

    it("dispatches to MapManifest fallback (pin names + Maps links)", () => {
      const md = [
        "Top picks:",
        "",
        "```map",
        JSON.stringify({
          title: "Relocation candidates",
          pins: [
            { name: "Lisbon", lat: 38.7223, lng: -9.1393 },
            { name: "Berlin", lat: 52.52, lng: 13.405 },
          ],
        }),
        "```",
      ].join("\n");
      const { container } = render(<MarkdownReply text={md} />);
      expect(container.textContent).toContain("Lisbon");
      expect(container.textContent).toContain("Berlin");
      expect(container.textContent).toContain("Relocation candidates");
    });
  });

  it("dispatches ```ui``` to UIManifest (component text + progressbar role)", () => {
    const md = [
      "Dashboard:",
      "",
      "```ui",
      JSON.stringify({
        title: "Readiness",
        components: [
          { kind: "stat", label: "ARR", value: "£2.4M" },
          { kind: "progress", label: "Pitch readiness", value: 74 },
        ],
      }),
      "```",
    ].join("\n");
    const { container, getByRole } = render(<MarkdownReply text={md} />);
    expect(container.textContent).toContain("ARR");
    expect(container.textContent).toContain("£2.4M");
    const bar = getByRole("progressbar", { name: /pitch readiness/i });
    expect(bar.getAttribute("aria-valuenow")).toBe("74");
  });

  it("dispatches ```comparison``` to ComparisonView (column names + verdict)", () => {
    const md = [
      "Head-to-head:",
      "",
      "```comparison",
      JSON.stringify({
        title: "London vs Berlin",
        verdict: "London on capital, Berlin on cost.",
        columns: [
          { name: "London", score: 87 },
          { name: "Berlin", score: 79 },
        ],
      }),
      "```",
    ].join("\n");
    const { container } = render(<MarkdownReply text={md} />);
    expect(container.textContent).toContain("London vs Berlin");
    expect(container.textContent).toContain("London on capital, Berlin on cost.");
    expect(container.textContent).toContain("87");
    expect(container.textContent).toContain("79");
  });
});

// ─────────────────────────────────────────────
// Error + fallback paths
// ─────────────────────────────────────────────

describe("MarkdownReply — error and fallback paths", () => {
  it("renders unknown language as a generic CodeBlock (no dispatch)", () => {
    const md = "```python\nprint('hi')\n```";
    const { container } = render(<MarkdownReply text={md} />);
    /* Generic code block renders inside a <pre>. The language label
     * surfaces as part of the rendered text. */
    expect(container.querySelector("pre")).not.toBeNull();
    expect(container.textContent).toContain("python");
    expect(container.textContent).toContain("print('hi')");
  });

  it("surfaces parser error in CodeBlock note when chart JSON is invalid", () => {
    const md = "```chart\n{ this is not json\n```";
    const { container } = render(<MarkdownReply text={md} />);
    /* Invalid spec falls back to CodeBlock with an explanatory note —
     * the founder sees what failed instead of a silently-missing chart. */
    expect(container.textContent).toContain("Invalid chart spec");
    /* The raw fence content is shown so the founder can see exactly
     * what Olivia emitted. */
    expect(container.textContent).toContain("this is not json");
  });

  it("surfaces parser error for invalid map spec", () => {
    const md = "```map\n{ \"pins\": [] }\n```";
    const { container } = render(<MarkdownReply text={md} />);
    expect(container.textContent).toContain("Invalid map spec");
  });

  it("surfaces parser error for invalid comparison spec (only 1 column)", () => {
    const md = `\`\`\`comparison\n${JSON.stringify({ columns: [{ name: "Solo" }] })}\n\`\`\``;
    const { container } = render(<MarkdownReply text={md} />);
    expect(container.textContent).toContain("Invalid comparison spec");
  });
});

// ─────────────────────────────────────────────
// Compositional sanity — markdown + fence in one reply
// ─────────────────────────────────────────────

describe("MarkdownReply — composition", () => {
  it("renders prose + fence + prose in the same reply (real Olivia output shape)", () => {
    const md = [
      "## Series A readiness",
      "",
      "Here's where things stand:",
      "",
      "```ui",
      JSON.stringify({
        components: [{ kind: "stat", label: "ARR", value: "£2.4M" }],
      }),
      "```",
      "",
      "Next: polish slides 4 + 7.",
    ].join("\n");
    const { container } = render(<MarkdownReply text={md} />);
    /* Heading remap (h2 markdown → h4 element). */
    expect(container.querySelector("h4")?.textContent).toBe("Series A readiness");
    /* Prose paragraph BEFORE the fence. */
    expect(container.textContent).toContain("Here's where things stand:");
    /* Fence content. */
    expect(container.textContent).toContain("ARR");
    expect(container.textContent).toContain("£2.4M");
    /* Prose paragraph AFTER the fence. */
    expect(container.textContent).toContain("Next: polish slides 4 + 7.");
  });
});
