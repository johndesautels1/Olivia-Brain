/**
 * `golden-cases` tests — verify the case set is well-formed.
 *
 * These don't run the cascade; they just check structural integrity
 * so a typo in a case definition doesn't slip past PR review.
 */

import { describe, it, expect } from "vitest";
import { GOLDEN_CASES, GOLDEN_CASE_BY_ID } from "./golden-cases";
import { detectSpokeFromMessage } from "@/lib/orchestration/spoke-router";

describe("GOLDEN_CASES", () => {
  it("has at least 5 cases", () => {
    expect(GOLDEN_CASES.length).toBeGreaterThanOrEqual(5);
  });

  it("every case has a unique id", () => {
    const ids = GOLDEN_CASES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every case has a non-empty prompt + label", () => {
    for (const c of GOLDEN_CASES) {
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.prompt.length).toBeGreaterThan(0);
    }
  });

  it("GOLDEN_CASE_BY_ID is consistent with the array", () => {
    for (const c of GOLDEN_CASES) {
      expect(GOLDEN_CASE_BY_ID[c.id]).toBe(c);
    }
  });

  it("every case's expected spoke is internally consistent with the spoke detector", () => {
    /* If a case asserts the prompt should map to a spoke, the
     * detector must already classify that prompt that way — otherwise
     * the case is testing the detector + the cascade simultaneously
     * and a detector regression would mask cascade regressions. */
    for (const c of GOLDEN_CASES) {
      if (!c.expect.spoke || c.expect.spoke.length === 0) continue;
      const detected = detectSpokeFromMessage(c.prompt);
      expect(c.expect.spoke).toContain(detected);
    }
  });

  it("every case has a sensible duration cap", () => {
    for (const c of GOLDEN_CASES) {
      const max = c.expect.maxDurationMs ?? 30_000;
      expect(max).toBeGreaterThanOrEqual(5_000);
      expect(max).toBeLessThanOrEqual(120_000);
    }
  });
});
