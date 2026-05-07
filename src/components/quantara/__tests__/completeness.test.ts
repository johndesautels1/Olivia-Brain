/**
 * Quantara Q2 — completeness math unit tests.
 *
 * Pure-function coverage:
 * - `isFilled` treats 0, false, and explicit nulls correctly.
 * - `overallCompleteness` weights critical fields x3 vs helper x1.
 * - `sectionCompleteness` is scoped to the section.
 * - `allSectionCompleteness` returns one row per section (12 total).
 */
import { describe, expect, it } from "vitest";

import {
  QUANTARA_FIELDS,
  type QuantaraValues,
} from "@/lib/quantara";
import {
  allSectionCompleteness,
  isFilled,
  overallCompleteness,
  sectionCompleteness,
} from "../completeness";

describe("isFilled", () => {
  it("returns false for undefined / null / empty string", () => {
    expect(isFilled(undefined)).toBe(false);
    expect(isFilled(null)).toBe(false);
    expect(isFilled("")).toBe(false);
    expect(isFilled("   ")).toBe(false);
  });

  it("counts 0 (and negatives) as filled — founders may legitimately enter 0", () => {
    expect(isFilled(0)).toBe(true);
    expect(isFilled(-285_000)).toBe(true);
  });

  it("counts non-empty strings, booleans, and other truthy values", () => {
    expect(isFilled("Series A")).toBe(true);
    expect(isFilled(false)).toBe(true);
  });
});

describe("overallCompleteness", () => {
  it("returns 0% for an empty payload", () => {
    const summary = overallCompleteness({});
    expect(summary.percent).toBe(0);
    expect(summary.fieldsFilled).toBe(0);
    expect(summary.fieldsTotal).toBe(56);
    expect(summary.weightFilled).toBe(0);
  });

  it("returns 100% with every field populated", () => {
    const values: QuantaraValues = {};
    for (const f of QUANTARA_FIELDS) {
      values[f.id] = typeof f.schema._def === "object" ? 1 : "x";
    }
    const summary = overallCompleteness(values);
    expect(summary.percent).toBe(100);
    expect(summary.fieldsFilled).toBe(56);
    expect(summary.weightFilled).toBe(summary.weightTotal);
  });

  it("weights critical (3) heavier than helpful (1)", () => {
    /* One critical-only payload (f1 ARR, weight 3) and one helper-only
       payload (f34 patentsFiled, weight 1). The same number of fields
       filled, but weighted percent is 3x. */
    const onlyCritical: QuantaraValues = { f1: 1_000_000 };
    const onlyHelper: QuantaraValues = { f34: 1 };

    const critical = overallCompleteness(onlyCritical);
    const helper = overallCompleteness(onlyHelper);
    expect(critical.weightFilled).toBe(3);
    expect(helper.weightFilled).toBe(1);
    expect(critical.percent).toBeGreaterThan(helper.percent);
  });
});

describe("sectionCompleteness", () => {
  it("scopes to the section's 14 Core Financials fields", () => {
    const summary = sectionCompleteness("core_financials", { f1: 1, f2: 1 });
    expect(summary.fieldsTotal).toBe(14);
    expect(summary.fieldsFilled).toBe(2);
  });

  it("returns 100% when every field in the section is populated", () => {
    const summary = sectionCompleteness("strategic", { f56: 5 });
    expect(summary.fieldsTotal).toBe(1);
    expect(summary.percent).toBe(100);
  });

  it("ignores fields outside the section", () => {
    const summary = sectionCompleteness("strategic", { f1: 1, f56: 5 });
    expect(summary.fieldsFilled).toBe(1);
  });
});

describe("allSectionCompleteness", () => {
  it("returns exactly 12 rows (one per section)", () => {
    const rows = allSectionCompleteness({});
    expect(rows).toHaveLength(12);
  });

  it("sums to the same fields total as overall", () => {
    const rows = allSectionCompleteness({});
    const total = rows.reduce((acc, r) => acc + r.summary.fieldsTotal, 0);
    expect(total).toBe(56);
  });
});
