/**
 * `CitationStrip` parser tests — Track O O4.
 */

import { describe, it, expect } from "vitest";
import { parseCitations } from "./CitationStrip";

describe("parseCitations", () => {
  it("accepts a minimal valid array", () => {
    const r = parseCitations(
      JSON.stringify([
        { title: "MHRA SaMD Guidance", url: "https://gov.uk/abc" },
      ]),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.citations).toHaveLength(1);
  });

  it("preserves optional source field", () => {
    const r = parseCitations(
      JSON.stringify([
        { title: "X", url: "https://example.com/x", source: "Example.com" },
      ]),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.citations[0].source).toBe("Example.com");
  });

  it("rejects malformed JSON", () => {
    expect(parseCitations("{ broken").ok).toBe(false);
  });

  it("rejects non-array root", () => {
    const r = parseCitations(JSON.stringify({ title: "X", url: "https://a.com" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/array/);
  });

  it("rejects empty array", () => {
    const r = parseCitations(JSON.stringify([]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/empty/);
  });

  it("filters out invalid entries but keeps valid ones", () => {
    const r = parseCitations(
      JSON.stringify([
        { title: "Good", url: "https://good.com" },
        { title: "no url" },
        "string entry",
        null,
        { title: "ftp not allowed", url: "ftp://no.com" },
        { url: "https://no-title.com" },
        { title: "Also good", url: "https://also.com", source: "Also" },
      ]),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.citations).toHaveLength(2);
      expect(r.citations.map((c) => c.title)).toEqual(["Good", "Also good"]);
    }
  });

  it("rejects when ALL entries fail validation", () => {
    const r = parseCitations(
      JSON.stringify([
        { title: "no url" },
        "string",
        { url: "https://x.com" /* missing title */ },
      ]),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/no valid citations/);
  });

  it("drops unknown fields silently", () => {
    const r = parseCitations(
      JSON.stringify([
        {
          title: "X",
          url: "https://example.com",
          source: "Ex",
          extra: "ignored",
          ranking: 0.95,
        },
      ]),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Object.keys(r.citations[0]).sort()).toEqual(["source", "title", "url"]);
    }
  });
});
