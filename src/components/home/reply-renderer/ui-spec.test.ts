/**
 * `parseUISpec` tests — Track N N4-foundations.
 *
 * Covers the JSON shape (title + components array), per-component
 * validation for card / stat / progress / button, the strict scheme
 * allowlist on button hrefs (no javascript: / data: smuggle path),
 * and the drop-invalid-rather-than-reject resilience (mirrors
 * `parseMapSpec` + `parseTimelineSpec`).
 */

import { describe, it, expect } from "vitest";
import {
  parseUISpec,
  clampProgress,
  resolveTokenColor,
  resolveTokenMute,
  resolveTone,
  type UIColorToken,
} from "./ui-spec";

describe("parseUISpec — happy path", () => {
  it("accepts a minimal spec with one card", () => {
    const r = parseUISpec(
      JSON.stringify({
        components: [{ kind: "card", body: "Hello world." }],
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.spec.components).toHaveLength(1);
      expect(r.spec.components[0]).toMatchObject({ kind: "card", body: "Hello world." });
    }
  });

  it("preserves title + every primitive type", () => {
    const r = parseUISpec(
      JSON.stringify({
        title: "Series A readiness",
        components: [
          { kind: "stat", label: "ARR", value: "£2.4M", delta: "+18%", tone: "positive" },
          { kind: "progress", label: "Pitch readiness", value: 74, color: "aurum" },
          { kind: "card", title: "Next", body: "Polish slides 4 + 7.", tone: "aether" },
          { kind: "button", label: "Open deck", href: "https://gamma.app/x", tone: "primary" },
        ],
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.spec.title).toBe("Series A readiness");
      expect(r.spec.components).toHaveLength(4);
      expect(r.spec.components[0].kind).toBe("stat");
      expect(r.spec.components[1].kind).toBe("progress");
      expect(r.spec.components[2].kind).toBe("card");
      expect(r.spec.components[3].kind).toBe("button");
    }
  });

  it("preserves optional card title + tone", () => {
    const r = parseUISpec(
      JSON.stringify({
        components: [{ kind: "card", title: "Heads up", body: "x", tone: "amber" }],
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok && r.spec.components[0].kind === "card") {
      expect(r.spec.components[0].title).toBe("Heads up");
      expect(r.spec.components[0].tone).toBe("amber");
    }
  });

  it("preserves optional stat delta + tone", () => {
    const r = parseUISpec(
      JSON.stringify({
        components: [
          { kind: "stat", label: "Burn", value: "£180k/mo", delta: "-12%", tone: "positive" },
        ],
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok && r.spec.components[0].kind === "stat") {
      expect(r.spec.components[0].delta).toBe("-12%");
      expect(r.spec.components[0].tone).toBe("positive");
    }
  });
});

describe("parseUISpec — rejections", () => {
  it("rejects malformed JSON", () => {
    expect(parseUISpec("{ this is not json").ok).toBe(false);
  });

  it("rejects array root", () => {
    expect(parseUISpec(JSON.stringify([{ kind: "card", body: "x" }])).ok).toBe(false);
  });

  it("rejects missing components array", () => {
    const r = parseUISpec(JSON.stringify({ title: "x" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/components/);
  });

  it("rejects empty components array", () => {
    expect(parseUISpec(JSON.stringify({ components: [] })).ok).toBe(false);
  });

  it("rejects when every component is invalid", () => {
    const r = parseUISpec(
      JSON.stringify({
        components: [
          { kind: "card" }, // missing body
          { kind: "stat", label: "X" }, // missing value
          { kind: "progress", label: "X" }, // missing value
          { kind: "button" }, // missing label
          { kind: "alien", x: 1 }, // unknown kind
        ],
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/no valid components/);
  });
});

describe("parseUISpec — per-component resilience", () => {
  it("drops invalid components but keeps valid ones", () => {
    const r = parseUISpec(
      JSON.stringify({
        components: [
          { kind: "card", body: "ok" },
          { kind: "card" }, // dropped — no body
          { kind: "stat", label: "X", value: "1" },
          { kind: "unknown" }, // dropped
          { kind: "progress", label: "Y", value: 50 },
        ],
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.spec.components).toHaveLength(3);
      expect(r.spec.components.map((c) => c.kind)).toEqual(["card", "stat", "progress"]);
    }
  });

  it("drops unknown card tone but keeps the card", () => {
    const r = parseUISpec(
      JSON.stringify({
        components: [{ kind: "card", body: "ok", tone: "neon" }],
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok && r.spec.components[0].kind === "card") {
      expect(r.spec.components[0].tone).toBeUndefined();
    }
  });

  it("drops non-finite progress value", () => {
    const r = parseUISpec(
      JSON.stringify({
        components: [
          { kind: "progress", label: "X", value: "nope" }, // wrong type — dropped
          { kind: "progress", label: "Y", value: 60 },
        ],
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.spec.components).toHaveLength(1);
      if (r.spec.components[0].kind === "progress") {
        expect(r.spec.components[0].label).toBe("Y");
      }
    }
  });
});

describe("parseUISpec — button href safety", () => {
  it("accepts https:// hrefs", () => {
    const r = parseUISpec(
      JSON.stringify({
        components: [{ kind: "button", label: "Open", href: "https://example.test/x" }],
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok && r.spec.components[0].kind === "button") {
      expect(r.spec.components[0].href).toBe("https://example.test/x");
    }
  });

  it("accepts http:// hrefs", () => {
    const r = parseUISpec(
      JSON.stringify({
        components: [{ kind: "button", label: "Open", href: "http://example.test/x" }],
      }),
    );
    expect(r.ok).toBe(true);
  });

  it("REJECTS the whole button when href uses javascript: scheme", () => {
    const r = parseUISpec(
      JSON.stringify({
        components: [
          { kind: "button", label: "Click me", href: "javascript:alert(1)" },
        ],
      }),
    );
    /* Button rejected → no surviving components → spec rejected. */
    expect(r.ok).toBe(false);
  });

  it("REJECTS the whole button when href uses data: scheme", () => {
    const r = parseUISpec(
      JSON.stringify({
        components: [
          { kind: "button", label: "Click", href: "data:text/html,<script>1</script>" },
        ],
      }),
    );
    expect(r.ok).toBe(false);
  });

  it("REJECTS scheme-relative URLs", () => {
    const r = parseUISpec(
      JSON.stringify({
        components: [{ kind: "button", label: "Click", href: "//evil.test/x" }],
      }),
    );
    expect(r.ok).toBe(false);
  });

  it("accepts an href-less button (inert)", () => {
    const r = parseUISpec(
      JSON.stringify({
        components: [{ kind: "button", label: "Inert" }],
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok && r.spec.components[0].kind === "button") {
      expect(r.spec.components[0].href).toBeUndefined();
    }
  });

  it("drops unknown button tone but keeps the button", () => {
    const r = parseUISpec(
      JSON.stringify({
        components: [
          { kind: "button", label: "X", href: "https://x.test", tone: "supreme" },
        ],
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok && r.spec.components[0].kind === "button") {
      expect(r.spec.components[0].tone).toBeUndefined();
    }
  });
});

describe("clampProgress", () => {
  it("returns the value when in range", () => {
    expect(clampProgress(50)).toBe(50);
    expect(clampProgress(0)).toBe(0);
    expect(clampProgress(100)).toBe(100);
  });

  it("clamps below 0", () => {
    expect(clampProgress(-50)).toBe(0);
  });

  it("clamps above 100", () => {
    expect(clampProgress(250)).toBe(100);
  });

  it("returns 0 for non-finite", () => {
    expect(clampProgress(NaN)).toBe(0);
    expect(clampProgress(Infinity)).toBe(0);
    expect(clampProgress(-Infinity)).toBe(0);
  });
});

describe("resolveTokenColor / resolveTokenMute / resolveTone", () => {
  it("returns a CSS var() string for every token", () => {
    const tokens: UIColorToken[] = ["aurum", "aether", "mint", "coral", "sky", "amber", "fg"];
    for (const t of tokens) {
      expect(resolveTokenColor(t)).toMatch(/^var\(--/);
      // mute may be a CSS var OR an rgba() fallback
      expect(resolveTokenMute(t)).toMatch(/^(var\(|rgba\()/);
    }
  });

  it("defaults to aurum when token undefined", () => {
    expect(resolveTokenColor(undefined)).toBe("var(--aurum-primary)");
  });

  it("returns a CSS var() string for every semantic tone", () => {
    expect(resolveTone("positive")).toMatch(/^var\(--/);
    expect(resolveTone("warning")).toMatch(/^var\(--/);
    expect(resolveTone("danger")).toMatch(/^var\(--/);
    expect(resolveTone("neutral")).toMatch(/^var\(--/);
    expect(resolveTone(undefined)).toMatch(/^var\(--/);
  });
});
