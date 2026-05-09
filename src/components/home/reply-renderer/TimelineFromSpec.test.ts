import { describe, it, expect } from "vitest";
import { parseTimelineSpec } from "./TimelineFromSpec";

describe("parseTimelineSpec", () => {
  it("accepts a minimal valid array", () => {
    const r = parseTimelineSpec(
      JSON.stringify([{ date: "2024-Q1", title: "Series A" }]),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.entries).toHaveLength(1);
  });

  it("preserves optional detail + tone", () => {
    const r = parseTimelineSpec(
      JSON.stringify([
        {
          date: "2024-Q3",
          title: "EU expansion",
          detail: "Berlin + Paris",
          tone: "positive",
        },
      ]),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.entries[0].detail).toBe("Berlin + Paris");
      expect(r.entries[0].tone).toBe("positive");
    }
  });

  it("drops invalid tone silently", () => {
    const r = parseTimelineSpec(
      JSON.stringify([{ date: "2024-Q1", title: "X", tone: "fancy" }]),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.entries[0].tone).toBeUndefined();
  });

  it("rejects malformed JSON", () => {
    expect(parseTimelineSpec("{ broken").ok).toBe(false);
  });

  it("rejects non-array root", () => {
    const r = parseTimelineSpec(JSON.stringify({ date: "2024", title: "x" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/array/);
  });

  it("rejects empty array", () => {
    const r = parseTimelineSpec(JSON.stringify([]));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/empty/);
  });

  it("filters entries missing date or title", () => {
    const r = parseTimelineSpec(
      JSON.stringify([
        { date: "2024-Q1", title: "Good" },
        { date: "2024-Q2" }, // no title
        { title: "no date" }, // no date
        { date: "2024-Q3", title: "Also good", tone: "warning" },
        "string",
        null,
      ]),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.entries).toHaveLength(2);
      expect(r.entries.map((e) => e.title)).toEqual(["Good", "Also good"]);
    }
  });

  it("rejects when ALL entries are invalid", () => {
    const r = parseTimelineSpec(
      JSON.stringify([{ date: "x" }, { title: "y" }, "string"]),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/no valid entries/);
  });

  it("supports all 4 tone variants", () => {
    const r = parseTimelineSpec(
      JSON.stringify([
        { date: "1", title: "n", tone: "neutral" },
        { date: "2", title: "p", tone: "positive" },
        { date: "3", title: "w", tone: "warning" },
        { date: "4", title: "d", tone: "danger" },
      ]),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.entries.map((e) => e.tone)).toEqual([
        "neutral",
        "positive",
        "warning",
        "danger",
      ]);
    }
  });
});
