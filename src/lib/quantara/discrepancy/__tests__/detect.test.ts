/**
 * Quantara Q4 — discrepancy detection unit tests.
 *
 * Covers:
 *   - Within-tolerance values produce no gap.
 *   - >5% disagreement produces a gap with correct direction.
 *   - Higher founder revenue is `optimistic`; higher founder churn is
 *     `pessimistic` (the agent's per-field directionality survives the
 *     Quantara wrapper).
 *   - Non-comparable fields (text, scores, enums) are silently dropped.
 *   - Empty inputs return zero gaps + truthScore 100.
 *   - Source attribution survives the round-trip back to the chip.
 */
import { describe, expect, it } from "vitest";

import type {
  QuantaraFieldId,
  QuantaraValues,
} from "@/lib/quantara";
import type { QuantaraSuggestion } from "@/lib/quantara/auto-fill";

import { detectDiscrepancies } from "../detect";

function suggestion(
  fieldId: QuantaraFieldId,
  value: number,
  integration: QuantaraSuggestion["source"]["integration"] = "stripe",
): QuantaraSuggestion {
  return {
    fieldId,
    value,
    confidence: 0.9,
    source: {
      integration,
      label: `${integration}-derived`,
      fetchedAt: new Date().toISOString(),
      mockMode: false,
    },
  };
}

function refMap(
  ...entries: Array<readonly [QuantaraFieldId, QuantaraSuggestion]>
): ReadonlyMap<QuantaraFieldId, QuantaraSuggestion> {
  return new Map(entries);
}

describe("detectDiscrepancies", () => {
  it("returns zero gaps when both maps are empty", () => {
    const result = detectDiscrepancies({}, new Map());
    expect(result.gaps.size).toBe(0);
    expect(result.truthScore).toBe(100);
  });

  it("returns zero gaps when values agree within the 5% threshold", () => {
    const values: QuantaraValues = { f1: 1_000_000 };
    const refs = refMap(["f1", suggestion("f1", 1_020_000)]);
    const result = detectDiscrepancies(values, refs);
    expect(result.gaps.has("f1")).toBe(false);
  });

  it("detects an optimistic gap when founder revenue > API revenue", () => {
    const values: QuantaraValues = { f1: 2_500_000 };
    const refs = refMap(["f1", suggestion("f1", 2_000_000)]);
    const result = detectDiscrepancies(values, refs);
    const gap = result.gaps.get("f1");
    expect(gap).toBeDefined();
    expect(gap?.direction).toBe("optimistic");
    expect(gap?.gapPct).toBeGreaterThan(5);
    expect(gap?.source).toBe("stripe");
    expect(gap?.sourceLabel).toBe("Stripe-derived");
  });

  it("detects a pessimistic gap when founder revenue < API revenue", () => {
    const values: QuantaraValues = { f1: 1_500_000 };
    const refs = refMap(["f1", suggestion("f1", 2_000_000)]);
    const result = detectDiscrepancies(values, refs);
    expect(result.gaps.get("f1")?.direction).toBe("pessimistic");
  });

  it("treats higher founder churn as pessimistic (lower-is-optimistic field)", () => {
    /* f27 churn — agent's `lowerIsOptimistic` group. Founder reporting
       higher churn than Stripe says is harsher (pessimistic). */
    const values: QuantaraValues = { f27: 5 };
    const refs = refMap(["f27", suggestion("f27", 2)]);
    const result = detectDiscrepancies(values, refs);
    expect(result.gaps.get("f27")?.direction).toBe("pessimistic");
  });

  it("treats lower founder churn as optimistic", () => {
    const values: QuantaraValues = { f27: 1 };
    const refs = refMap(["f27", suggestion("f27", 4)]);
    const result = detectDiscrepancies(values, refs);
    expect(result.gaps.get("f27")?.direction).toBe("optimistic");
  });

  it("silently drops non-comparable fields (text, scores, enums)", () => {
    /* f43 is a long-text field; not in the agent's COMPARABLE_FIELDS. */
    const values: QuantaraValues = { f43: "Sold A to B (2018)" };
    const refs = refMap([
      "f43",
      {
        ...suggestion("f1", 1),
        fieldId: "f43",
        value: "Different exit text",
      },
    ]);
    const result = detectDiscrepancies(values, refs);
    expect(result.gaps.size).toBe(0);
  });

  it("drops fields where one side is missing from the other map", () => {
    const values: QuantaraValues = { f1: 1_000_000 };
    /* No reference for f1, only for f15. */
    const refs = refMap(["f15", suggestion("f15", 500_000)]);
    const result = detectDiscrepancies(values, refs);
    expect(result.gaps.size).toBe(0);
  });

  it("supports five representative fields end-to-end (Q4 exit criterion)", () => {
    const values: QuantaraValues = {
      f1: 2_500_000, // ARR — optimistic vs Stripe
      f7: -100_000, // EBITDA — pessimistic vs QuickBooks
      f8: 100_000, // Burn — optimistic (lower) vs QB
      f15: 1_500_000, // Cash on Hand — pessimistic (lower) vs QB
      f24: 200, // Customers — not in COMPARABLE_FIELDS
    };
    const refs = refMap(
      ["f1", suggestion("f1", 2_000_000, "stripe")],
      ["f7", suggestion("f7", -50_000, "quickbooks")],
      ["f8", suggestion("f8", 150_000, "quickbooks")],
      ["f15", suggestion("f15", 2_000_000, "quickbooks")],
      ["f24", suggestion("f24", 250, "stripe")],
    );
    const result = detectDiscrepancies(values, refs);
    /* f1, f7, f8, f15 are comparable; f24 isn't (paying customers
       isn't in the agent's COMPARABLE_FIELDS). */
    expect(result.gaps.size).toBe(4);
    expect(result.gaps.get("f1")?.direction).toBe("optimistic");
    expect(result.gaps.get("f7")?.direction).toBe("pessimistic");
    expect(result.gaps.get("f8")?.direction).toBe("optimistic");
    expect(result.gaps.get("f15")?.direction).toBe("pessimistic");
  });

  it("caps gapPct at 100 when one side is near-zero", () => {
    const values: QuantaraValues = { f1: 0.0001 };
    const refs = refMap(["f1", suggestion("f1", 1_000_000)]);
    const result = detectDiscrepancies(values, refs);
    const gap = result.gaps.get("f1");
    expect(gap).toBeDefined();
    expect(gap?.gapPct).toBeLessThanOrEqual(100);
  });
});
