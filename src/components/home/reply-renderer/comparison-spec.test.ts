/**
 * `parseComparisonSpec` tests — comparison fence.
 *
 * Verifies: happy path; column min/max bounds (2 ≤ N ≤ 3); per-column
 * resilience (drop invalid columns but keep valid ones); winner field
 * validation (preserved only if it names a surviving column); score
 * range clamp; string-array filtering for highlights/lowlights; color
 * token whitelist.
 */

import { describe, it, expect } from "vitest";
import {
  parseComparisonSpec,
  resolveColumnAccent,
  MIN_COLUMNS,
  MAX_COLUMNS,
  type ComparisonColorToken,
} from "./comparison-spec";

const LONDON = {
  name: "London",
  score: 87,
  tone: "aurum",
  highlights: ["Largest VC market in Europe", "English-speaking"],
  lowlights: ["High cost of living"],
};
const BERLIN = {
  name: "Berlin",
  score: 79,
  tone: "aether",
  highlights: ["30% lower COL", "Strong tech ecosystem"],
  lowlights: ["Smaller late-stage capital pool"],
};
const PARIS = {
  name: "Paris",
  score: 72,
  tone: "mint",
  highlights: ["Mid-cost", "Bicoastal Europe"],
};

describe("parseComparisonSpec — happy path", () => {
  it("accepts a minimal 2-column spec", () => {
    const r = parseComparisonSpec(
      JSON.stringify({ columns: [{ name: "A" }, { name: "B" }] }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.spec.columns).toHaveLength(2);
      expect(r.spec.columns.map((c) => c.name)).toEqual(["A", "B"]);
    }
  });

  it("preserves title + verdict + winner + 3 columns", () => {
    const r = parseComparisonSpec(
      JSON.stringify({
        title: "London vs Berlin vs Paris",
        verdict: "London wins on capital; Berlin on cost.",
        winner: "London",
        columns: [LONDON, BERLIN, PARIS],
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.spec.title).toBe("London vs Berlin vs Paris");
      expect(r.spec.verdict).toContain("London wins");
      expect(r.spec.winner).toBe("London");
      expect(r.spec.columns).toHaveLength(3);
      expect(r.spec.columns[0].score).toBe(87);
      expect(r.spec.columns[0].tone).toBe("aurum");
      expect(r.spec.columns[0].highlights).toHaveLength(2);
      expect(r.spec.columns[0].lowlights).toHaveLength(1);
    }
  });

  it("clamps to MAX_COLUMNS by truncating extras", () => {
    const r = parseComparisonSpec(
      JSON.stringify({
        columns: [LONDON, BERLIN, PARIS, { name: "Lisbon" }, { name: "Madrid" }],
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.spec.columns).toHaveLength(MAX_COLUMNS);
      expect(r.spec.columns.map((c) => c.name)).toEqual(["London", "Berlin", "Paris"]);
    }
  });
});

describe("parseComparisonSpec — rejections", () => {
  it("rejects malformed JSON", () => {
    expect(parseComparisonSpec("{ broken").ok).toBe(false);
  });

  it("rejects array root", () => {
    expect(parseComparisonSpec(JSON.stringify([LONDON, BERLIN])).ok).toBe(false);
  });

  it("rejects missing columns array", () => {
    const r = parseComparisonSpec(JSON.stringify({ title: "x" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/columns/);
  });

  it("rejects when fewer than MIN_COLUMNS valid columns survive", () => {
    const r = parseComparisonSpec(
      JSON.stringify({
        columns: [
          LONDON,
          { score: 80 }, // missing name — dropped
        ],
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/at least/);
  });

  it("rejects when zero columns survive", () => {
    const r = parseComparisonSpec(JSON.stringify({ columns: [] }));
    expect(r.ok).toBe(false);
  });
});

describe("parseComparisonSpec — per-column resilience", () => {
  it("drops invalid columns but keeps valid ones", () => {
    const r = parseComparisonSpec(
      JSON.stringify({
        columns: [
          LONDON,
          { score: 80 }, // missing name — dropped
          BERLIN,
          { name: "" }, // empty name — dropped
        ],
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.spec.columns.map((c) => c.name)).toEqual(["London", "Berlin"]);
    }
  });

  it("drops out-of-range score but keeps the column", () => {
    const r = parseComparisonSpec(
      JSON.stringify({
        columns: [
          { name: "A", score: 150 },
          { name: "B", score: -3 },
        ],
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.spec.columns[0].score).toBeUndefined();
      expect(r.spec.columns[1].score).toBeUndefined();
    }
  });

  it("drops invalid tone token but keeps the column", () => {
    const r = parseComparisonSpec(
      JSON.stringify({
        columns: [
          { name: "A", tone: "neon" },
          { name: "B" },
        ],
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.spec.columns[0].tone).toBeUndefined();
    }
  });

  it("filters non-string highlights / lowlights", () => {
    const r = parseComparisonSpec(
      JSON.stringify({
        columns: [
          { name: "A", highlights: ["good", 5, null, "also good"] },
          { name: "B", lowlights: ["bad", "", "also bad"] }, // empty filtered
        ],
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.spec.columns[0].highlights).toEqual(["good", "also good"]);
      expect(r.spec.columns[1].lowlights).toEqual(["bad", "also bad"]);
    }
  });

  it("omits highlights / lowlights when array empty after filter", () => {
    const r = parseComparisonSpec(
      JSON.stringify({
        columns: [
          { name: "A", highlights: [null, 0, ""], lowlights: [false] },
          { name: "B" },
        ],
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.spec.columns[0].highlights).toBeUndefined();
      expect(r.spec.columns[0].lowlights).toBeUndefined();
    }
  });
});

describe("parseComparisonSpec — winner field", () => {
  it("preserves winner when it matches a surviving column", () => {
    const r = parseComparisonSpec(
      JSON.stringify({ winner: "Berlin", columns: [LONDON, BERLIN] }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.spec.winner).toBe("Berlin");
  });

  it("matches winner case-insensitively", () => {
    const r = parseComparisonSpec(
      JSON.stringify({ winner: "berlin", columns: [LONDON, BERLIN] }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.spec.winner).toBe("berlin");
  });

  it("drops winner when it does not match any column", () => {
    const r = parseComparisonSpec(
      JSON.stringify({ winner: "Tokyo", columns: [LONDON, BERLIN] }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.spec.winner).toBeUndefined();
  });

  it("drops winner that survives column truncation past max", () => {
    /* Winner named on the 4th column which is truncated past MAX_COLUMNS
     * — winner must not survive. */
    const r = parseComparisonSpec(
      JSON.stringify({
        winner: "Madrid",
        columns: [LONDON, BERLIN, PARIS, { name: "Madrid" }],
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.spec.columns).toHaveLength(MAX_COLUMNS);
      expect(r.spec.winner).toBeUndefined();
    }
  });
});

describe("resolveColumnAccent", () => {
  it("returns a CSS var() string for every token", () => {
    const tokens: ComparisonColorToken[] = [
      "aurum",
      "aether",
      "mint",
      "coral",
      "sky",
      "amber",
      "fg",
    ];
    for (const t of tokens) {
      expect(resolveColumnAccent(t, 0)).toMatch(/^var\(--/);
    }
  });

  it("rotates aurum / aether / mint when no tone", () => {
    const a = resolveColumnAccent(undefined, 0);
    const b = resolveColumnAccent(undefined, 1);
    const c = resolveColumnAccent(undefined, 2);
    const d = resolveColumnAccent(undefined, 3);
    expect(a).toBe("var(--aurum-primary)");
    expect(b).toBe("var(--aether-primary)");
    expect(c).toBe("var(--mint-up)");
    expect(d).toBe(a); // wraps at 3
  });
});

describe("MIN_COLUMNS / MAX_COLUMNS", () => {
  it("MIN is 2 (single-column comparison is meaningless)", () => {
    expect(MIN_COLUMNS).toBe(2);
  });
  it("MAX is 3 (4+ columns get too narrow in a chat bubble)", () => {
    expect(MAX_COLUMNS).toBe(3);
  });
});
