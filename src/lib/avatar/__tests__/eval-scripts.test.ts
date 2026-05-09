/**
 * `src/lib/avatar/eval-scripts.ts` — catalog completeness tests.
 *
 * Track O5c session 2. Locks the 30-script suite shape so accidental
 * deletion or renumbering is caught. The `(scriptId, vendor)` index in
 * `AvatarEvalRun` correlates historical runs by id, so renumbering would
 * silently mis-correlate prior MOS data.
 */
import { describe, expect, it } from "vitest";

import {
  EVAL_SCRIPTS,
  EVAL_VENDORS,
  getEvalScript,
  getEvalScriptsByCategory,
  isEvalVendor,
  type EvalScriptCategory,
} from "@/lib/avatar/eval-scripts";

describe("EVAL_SCRIPTS catalog", () => {
  it("contains exactly 30 scripts", () => {
    expect(EVAL_SCRIPTS.length).toBe(30);
  });

  it("has 5 scripts per category", () => {
    const categories: EvalScriptCategory[] = [
      "short",
      "medium",
      "number_heavy",
      "plosive",
      "multilingual",
      "long_form",
    ];
    for (const cat of categories) {
      expect(getEvalScriptsByCategory(cat).length).toBe(5);
    }
  });

  it("has unique ids", () => {
    const ids = new Set(EVAL_SCRIPTS.map((s) => s.id));
    expect(ids.size).toBe(EVAL_SCRIPTS.length);
  });

  it("every script has non-empty text", () => {
    for (const s of EVAL_SCRIPTS) {
      expect(s.text.trim().length).toBeGreaterThan(0);
    }
  });

  it("long-form scripts contain at least 3 sentences", () => {
    for (const s of getEvalScriptsByCategory("long_form")) {
      const sentenceCount = s.text.split(/[.!?]+/).filter((p) => p.trim().length > 0).length;
      expect(sentenceCount).toBeGreaterThanOrEqual(3);
    }
  });

  it("getEvalScript looks up by id", () => {
    expect(getEvalScript("short-01")?.text).toBe("Yes.");
    expect(getEvalScript("nonexistent")).toBeUndefined();
  });
});

describe("EVAL_VENDORS", () => {
  it("includes all the realtime + async lip-sync vendors", () => {
    expect(EVAL_VENDORS).toEqual(
      expect.arrayContaining([
        "tavus",
        "simli",
        "heygen",
        "did",
        "sadtalker",
        "liveavatar",
      ]),
    );
  });

  it("isEvalVendor narrows correctly", () => {
    expect(isEvalVendor("tavus")).toBe(true);
    expect(isEvalVendor("liveavatar")).toBe(true);
    expect(isEvalVendor("notavendor")).toBe(false);
    expect(isEvalVendor("")).toBe(false);
  });
});
