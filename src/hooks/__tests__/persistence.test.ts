/**
 * @vitest-environment jsdom
 *
 * Unit tests for `lib/studio/persistence.ts` round-trip + version
 * mismatch handling.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  STORAGE_KEY,
  emptySnapshot,
  loadSnapshot,
  saveSnapshot,
  clearSnapshot,
} from "@/lib/studio/persistence";

describe("persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it("returns null when nothing is stored", () => {
    expect(loadSnapshot()).toBeNull();
  });

  it("round-trips a saved snapshot", () => {
    const snap = {
      ...emptySnapshot(),
      navSection: "documents" as const,
      activePlanIdx: 4,
      activeFrameworks: [1, 5, 13],
      expandedCats: ["investor", "legal"],
    };
    saveSnapshot(snap);
    const restored = loadSnapshot();
    expect(restored).not.toBeNull();
    expect(restored?.navSection).toBe("documents");
    expect(restored?.activePlanIdx).toBe(4);
    expect(restored?.activeFrameworks).toEqual([1, 5, 13]);
    expect(restored?.expandedCats).toEqual(["investor", "legal"]);
  });

  it("returns null on version mismatch (silent)", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 999, navSection: "pitch" }),
    );
    expect(loadSnapshot()).toBeNull();
  });

  it("returns null on malformed JSON (silent)", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not valid json");
    expect(loadSnapshot()).toBeNull();
  });

  it("clearSnapshot removes the stored value", () => {
    saveSnapshot(emptySnapshot());
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    clearSnapshot();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
