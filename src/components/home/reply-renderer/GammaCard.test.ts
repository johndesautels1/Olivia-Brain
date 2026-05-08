/**
 * `GammaCard` parser tests — Track N N5.
 *
 * The Gamma fence accepts EITHER a bare URL OR a JSON object with
 * `url`+optional metadata. The parser must keep both paths cleanly
 * distinguished so the renderer never throws.
 */

import { describe, it, expect } from "vitest";
import { parseGammaSpec } from "./GammaCard";

describe("parseGammaSpec", () => {
  it("accepts a bare https URL", () => {
    const r = parseGammaSpec("https://gamma.app/docs/abc123");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.spec.url).toBe("https://gamma.app/docs/abc123");
      expect(r.spec.title).toBeUndefined();
    }
  });

  it("accepts a bare http URL", () => {
    const r = parseGammaSpec("http://example.test/deck");
    expect(r.ok).toBe(true);
  });

  it("accepts a JSON object with url + metadata", () => {
    const r = parseGammaSpec(
      JSON.stringify({
        url: "https://gamma.app/docs/abc123",
        title: "Series A pitch",
        summary: "12-slide deck for Atomico",
        slides: 12,
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.spec.title).toBe("Series A pitch");
      expect(r.spec.slides).toBe(12);
    }
  });

  it("accepts JSON with only url", () => {
    const r = parseGammaSpec(JSON.stringify({ url: "https://gamma.app/x" }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.spec.url).toBe("https://gamma.app/x");
  });

  it("rejects URL without scheme", () => {
    const r = parseGammaSpec("gamma.app/docs/abc");
    expect(r.ok).toBe(false);
  });

  it("rejects malformed JSON", () => {
    const r = parseGammaSpec("{ broken json");
    expect(r.ok).toBe(false);
  });

  it("rejects array root", () => {
    const r = parseGammaSpec(JSON.stringify(["https://gamma.app/x"]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/object or bare URL/);
  });

  it("rejects JSON without url", () => {
    const r = parseGammaSpec(JSON.stringify({ title: "no url" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/url.*http/);
  });

  it("rejects non-http url scheme", () => {
    const r = parseGammaSpec(JSON.stringify({ url: "ftp://example.com/deck" }));
    expect(r.ok).toBe(false);
  });

  it("ignores extra unknown fields", () => {
    const r = parseGammaSpec(
      JSON.stringify({
        url: "https://gamma.app/x",
        title: "Foo",
        nonsense: 42,
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.spec.title).toBe("Foo");
      /* nonsense field dropped; only known fields populated */
      expect(Object.keys(r.spec)).toEqual(expect.arrayContaining(["url", "title"]));
    }
  });

  it("ignores non-finite slide counts", () => {
    const r = parseGammaSpec(
      JSON.stringify({ url: "https://gamma.app/x", slides: "twelve" }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.spec.slides).toBeUndefined();
  });
});
