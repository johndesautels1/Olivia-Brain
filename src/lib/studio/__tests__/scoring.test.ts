/**
 * Pure-function determinism tests for `scoreDecks` / `scoreTemplates` /
 * `applyLibraryFilter`.
 *
 * Reference: `docs/BUILD_SEQUENCE.md` Track C row 11 — "scoring helpers
 * (pure-function determinism + per-input edge cases)".
 *
 * Math is byte-for-byte from the prototype, so these tests double as
 * regression coverage for any future port-back to LTM.
 */

import { describe, expect, it } from "vitest";
import {
  scoreDecks,
  scoreTemplates,
  applyLibraryFilter,
  industryToCategory,
} from "../scoring";
import type { DeckArchetype, PlanTemplate } from "../types";

const sampleDecks: DeckArchetype[] = [
  {
    id: 1,
    name: "Stage Match Only",
    tag: "tag-1",
    cat: "classic",
    stage: ["Seed"],
    consensus: 0,
    insight: "i1",
    fit: "f1",
    olivia_action: undefined,
  },
  {
    id: 2,
    name: "Category + Consensus",
    tag: "tag-2",
    cat: "ai_modern",
    stage: ["Pre-seed"],
    consensus: 4,
    insight: "i2",
    fit: "f2",
    olivia_action: "act-2",
  },
  {
    id: 3,
    name: "London Boost",
    tag: "tag-3",
    cat: "london_uk",
    stage: ["Seed"],
    consensus: 3,
    insight: "Strong traction here.",
    fit: "f3",
    olivia_action: "act-3",
  },
  {
    id: 4,
    name: "Any-stage",
    tag: "tag-4",
    cat: "vc_framework",
    stage: ["Any"],
    consensus: 5,
    insight: "i4",
    fit: "f4",
  },
];

const sampleTemplates: PlanTemplate[] = [
  {
    id: 101,
    name: "Sequoia",
    tag: "vc",
    cat: "vc_framework",
    stage: ["Any"],
    consensus: 5,
    insight: "i101",
    fit: "f101",
    olivia_action: "auto",
    sections: 10,
  },
  {
    id: 102,
    name: "London Fintech",
    tag: "lf",
    cat: "london_uk",
    stage: ["Seed"],
    consensus: 4,
    insight: "i102",
    fit: "f102",
    olivia_action: "fca",
    sections: 14,
  },
];

describe("scoreDecks", () => {
  it("adds 30 for stage match", () => {
    const [first] = scoreDecks([sampleDecks[0]!], "Seed", "classic", 0);
    expect(first?.reasons).toContain("Stage match");
    /* +30 stage + +22 cat = 52 */
    expect(first?.score).toBe(52);
  });

  it("adds 22 for category match", () => {
    /* Stage no match → only cat hits. +22 + (consensus 0 × 7) + (no london, no ai). */
    const [first] = scoreDecks([sampleDecks[0]!], "Series Z", "classic", 0);
    expect(first?.reasons).toContain("Category match");
    expect(first?.score).toBe(22);
  });

  it("multiplies consensus by 7 and surfaces 3+ as a reason", () => {
    /* sampleDecks[1] has consensus 4, stage Pre-seed, ai_modern, olivia_action.
     * Args: stage X / cat classic / traction 0 (Pre-seed bonus fires).
     * Components: 4×7=28 consensus + 15 Pre-traction (traction=0 + Pre-seed)
     *           + 4 olivia_action = 47.
     * No stage match (Pre-seed vs X), no cat match (ai_modern vs classic). */
    const [first] = scoreDecks([sampleDecks[1]!], "X", "classic", 0);
    expect(first?.reasons).toContain("4-source consensus");
    expect(first?.score).toBe(47);
  });

  it("adds 20 for London priority and 15 for AI prefs", () => {
    const [london] = scoreDecks([sampleDecks[2]!], "Seed", "london_uk", 0, {
      london: true,
    });
    /* +30 stage + +22 cat + 3×7=21 consensus + +20 london + +4 olivia_action = 97 */
    expect(london?.reasons).toContain("London priority");
    expect(london?.score).toBe(97);

    const [ai] = scoreDecks([sampleDecks[1]!], "Pre-seed", "ai_modern", 0, {
      ai: true,
    });
    /* +30 stage + +22 cat + 4×7=28 consensus + 15 Pre-traction (traction=0
     * + Pre-seed) + +15 ai + +4 olivia_action = 114. */
    expect(ai?.reasons).toContain("AI-native");
    expect(ai?.score).toBe(114);
  });

  it("treats 'Any' stage as a wildcard match", () => {
    const [any] = scoreDecks([sampleDecks[3]!], "Pre-seed", "classic", 0);
    expect(any?.reasons).toContain("Stage match");
  });

  it("applies traction bonuses for traction-heavy decks", () => {
    const [tractionDeck] = scoreDecks([sampleDecks[2]!], "Seed", "london_uk", 2);
    /* sampleDecks[2].insight contains "traction" → +12 */
    expect(tractionDeck?.reasons).toContain("Traction deck");
  });

  it("applies pre-traction bonus for pre-seed founders", () => {
    const preTraction: DeckArchetype = {
      ...sampleDecks[0]!,
      stage: ["Pre-seed"],
    };
    const [pre] = scoreDecks([preTraction], "Pre-seed", "classic", 0);
    expect(pre?.reasons).toContain("Pre-traction fit");
  });

  it("returns sorted descending by score", () => {
    const all = scoreDecks(sampleDecks, "Seed", "london_uk", 0, {
      london: true,
      ai: true,
    });
    for (let i = 0; i < all.length - 1; i++) {
      expect(all[i]!.score).toBeGreaterThanOrEqual(all[i + 1]!.score);
    }
  });

  it("does not mutate inputs", () => {
    const before = JSON.stringify(sampleDecks);
    scoreDecks(sampleDecks, "Seed", "classic", 0, { london: true, ai: true });
    expect(JSON.stringify(sampleDecks)).toBe(before);
  });
});

describe("scoreTemplates", () => {
  it("uses heavier London (+25) and AI (+18) weights than scoreDecks", () => {
    const [london] = scoreTemplates([sampleTemplates[1]!], "Seed", "london_uk", {
      london: true,
    });
    /* +30 stage + +22 cat + 4×7=28 consensus + +25 london + +8 olivia_action = 113 */
    expect(london?.score).toBe(113);
  });

  it("adds +8 for olivia_action (vs +4 on decks)", () => {
    const noAction: PlanTemplate = {
      ...sampleTemplates[0]!,
      olivia_action: undefined,
    };
    const [withAction] = scoreTemplates([sampleTemplates[0]!], "X", "classic");
    const [withoutAction] = scoreTemplates([noAction], "X", "classic");
    expect((withAction?.score ?? 0) - (withoutAction?.score ?? 0)).toBe(8);
  });
});

describe("applyLibraryFilter", () => {
  it("filters by category", () => {
    const out = applyLibraryFilter(sampleDecks, { cat: "ai_modern" });
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe(2);
  });

  it("filters by stage with case-insensitivity", () => {
    const out = applyLibraryFilter(sampleDecks, { stage: "seed" });
    /* sample[0] (Seed), sample[2] (Seed), sample[3] (Any → matches anything). */
    expect(out.map((d) => d.id).sort()).toEqual([1, 3, 4]);
  });

  it("filters by free-text search across name/tag/insight/fit", () => {
    const out = applyLibraryFilter(sampleDecks, { search: "traction" });
    expect(out.map((d) => d.id)).toEqual([3]);
  });

  it("treats empty filter as identity", () => {
    const out = applyLibraryFilter(sampleDecks, {});
    expect(out).toHaveLength(sampleDecks.length);
  });
});

describe("industryToCategory", () => {
  it("maps known industries", () => {
    expect(industryToCategory("AI")).toBe("ai_modern");
    expect(industryToCategory("Fintech")).toBe("fintech");
    expect(industryToCategory("Healthtech")).toBe("industry_template");
  });

  it("falls back to 'classic' for unknown", () => {
    expect(industryToCategory("UnknownVertical")).toBe("classic");
  });
});
