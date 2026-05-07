/**
 * Quantara Q3 — orchestrator unit tests.
 *
 * The 7 read-only Composio integrations all short-circuit to mock
 * payloads when their env keys are absent (O1 contract). This test
 * runs `runAutoFill` against the all-mock-mode default state and
 * confirms:
 *   - the dispatch returns at least 30 distinct fields covered
 *     (Q3 exit criterion: "populates 30+ of the 56 fields");
 *   - tie-breaks pick the highest-confidence proposal per field;
 *   - founder-defaults inclusion can be toggled via
 *     `context.includeDefaults`;
 *   - per-source counts surface in `summary.perSource`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runAutoFill } from "../orchestrator";

beforeEach(() => {
  /* No Stripe / GH / CH / etc. keys set — every integration runs in
     mock mode. The defaults extractor runs always. */
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("runAutoFill (mock-mode fan-out)", () => {
  it("covers 30+ distinct fields across the 56-field set", async () => {
    const summary = await runAutoFill({});
    expect(summary.fieldsCovered).toBeGreaterThanOrEqual(30);
  });

  it("returns one suggestion per covered field (deduplicated)", async () => {
    const summary = await runAutoFill({});
    const ids = summary.suggestions.map((s) => s.fieldId);
    const set = new Set(ids);
    expect(set.size).toBe(ids.length);
  });

  it("attributes mock-mode integrations correctly", async () => {
    const summary = await runAutoFill({});
    /* Stripe / QB / Xero / GitHub / LinkedIn / CH / Supabase = 7 integrations.
       All mock-mode in this test. */
    expect(summary.integrationsMockMode).toBe(7);
    expect(summary.integrationsLive).toBe(0);
  });

  it("per-source counts include each integration that produced a suggestion", async () => {
    const summary = await runAutoFill({});
    /* Defaults + at least Stripe + QB always contribute. */
    expect(summary.perSource.olivia_defaults).toBeGreaterThan(20);
    expect(summary.perSource.stripe).toBeGreaterThan(0);
    expect(summary.perSource.quickbooks).toBeGreaterThan(0);
  });

  it("Stripe wins on f1 ARR over QuickBooks on tie-break", async () => {
    const summary = await runAutoFill({});
    const arr = summary.suggestions.find((s) => s.fieldId === "f1");
    expect(arr).toBeDefined();
    /* Stripe's mock confidence (0.5 - 0.05 for ARR derivation = 0.45) is
       higher than QuickBooks's mock (0.5 - 0.15 = 0.35), so Stripe wins. */
    expect(arr?.source.integration).toBe("stripe");
  });

  it("MRR (f2) is sourced from Stripe", async () => {
    const summary = await runAutoFill({});
    const mrr = summary.suggestions.find((s) => s.fieldId === "f2");
    expect(mrr?.source.integration).toBe("stripe");
  });

  it("cash on hand (f15) is sourced from QuickBooks (Xero doesn't expose it)", async () => {
    const summary = await runAutoFill({});
    const cash = summary.suggestions.find((s) => s.fieldId === "f15");
    expect(cash?.source.integration).toBe("quickbooks");
  });

  it("excludes founder-defaults when context.includeDefaults === false", async () => {
    const summary = await runAutoFill({ includeDefaults: false });
    expect(summary.perSource.olivia_defaults).toBeUndefined();
    /* Without defaults, fewer fields are covered (only what the 7 APIs
       can populate) — should still be > 0 but well under 30. */
    expect(summary.fieldsCovered).toBeGreaterThan(5);
    expect(summary.fieldsCovered).toBeLessThan(20);
  });

  it("every winning suggestion has a label and a confidence in [0, 1]", async () => {
    const summary = await runAutoFill({});
    for (const s of summary.suggestions) {
      expect(s.source.label.length).toBeGreaterThan(0);
      expect(s.confidence).toBeGreaterThanOrEqual(0);
      expect(s.confidence).toBeLessThanOrEqual(1);
    }
  });
});
