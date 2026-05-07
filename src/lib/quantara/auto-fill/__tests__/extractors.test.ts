/**
 * Quantara Q3 — extractor surface tests.
 *
 * Each extractor maps a single integration response into one or more
 * suggestions with stable `fieldId`s. Pre-Composio-key (mock-mode)
 * runs cover the canonical fan-out shape; live-mode integration tests
 * land in Track O Session O2 against the dispatch sandbox.
 */
import { describe, expect, it } from "vitest";

import { extractStripeSuggestions } from "../extractors/stripe";
import { extractGitHubSuggestions } from "../extractors/github";
import { extractCompaniesHouseSuggestions } from "../extractors/companies-house";
import { extractLinkedInSuggestions } from "../extractors/linkedin";
import { extractQuickBooksSuggestions } from "../extractors/quickbooks";
import { extractXeroSuggestions } from "../extractors/xero";
import { extractSupabaseSuggestions } from "../extractors/supabase";
import { extractFounderDefaultsSuggestions } from "../extractors/founder-defaults";

describe("Stripe extractor", () => {
  it("produces ARR / MRR / customers / churn / GRR", async () => {
    const out = await extractStripeSuggestions();
    const ids = out.map((s) => s.fieldId);
    expect(ids).toContain("f1");
    expect(ids).toContain("f2");
    expect(ids).toContain("f24");
    expect(ids).toContain("f27");
    expect(ids).toContain("f14");
  });

  it("ARR equals MRR × 12 in pence-to-pound conversion", async () => {
    const out = await extractStripeSuggestions();
    const mrr = out.find((s) => s.fieldId === "f2")?.value as number;
    const arr = out.find((s) => s.fieldId === "f1")?.value as number;
    expect(arr).toBe(mrr * 12);
  });
});

describe("GitHub extractor", () => {
  it("emits team-size and technical-staff suggestions", async () => {
    const out = await extractGitHubSuggestions();
    const ids = out.map((s) => s.fieldId);
    expect(ids).toContain("f40");
    expect(ids).toContain("f41");
  });
});

describe("Companies House extractor", () => {
  it("emits founder-experience-floor (f42) and team-size (f40)", async () => {
    const out = await extractCompaniesHouseSuggestions();
    const ids = out.map((s) => s.fieldId);
    expect(ids).toContain("f42");
    expect(ids).toContain("f40");
  });
});

describe("LinkedIn extractor", () => {
  it("emits a team-size suggestion", async () => {
    const out = await extractLinkedInSuggestions();
    expect(out.some((s) => s.fieldId === "f40")).toBe(true);
  });
});

describe("QuickBooks extractor", () => {
  it("covers ARR + GM + NM + EBITDA + burn + cash + runway", async () => {
    const out = await extractQuickBooksSuggestions();
    const ids = out.map((s) => s.fieldId);
    expect(ids).toEqual(
      expect.arrayContaining(["f1", "f5", "f6", "f7", "f8", "f15", "f9"]),
    );
  });
});

describe("Xero extractor", () => {
  it("covers ARR + NM + EBITDA + burn (no cash on hand)", async () => {
    const out = await extractXeroSuggestions();
    const ids = out.map((s) => s.fieldId);
    expect(ids).toEqual(expect.arrayContaining(["f1", "f6", "f7", "f8"]));
    expect(ids).not.toContain("f15");
  });
});

describe("Supabase extractor", () => {
  it("emits an MAU suggestion (f26)", async () => {
    const out = await extractSupabaseSuggestions();
    expect(out.some((s) => s.fieldId === "f26")).toBe(true);
  });
});

describe("Founder defaults extractor", () => {
  it("never targets f1 (Stripe owns ARR)", () => {
    const out = extractFounderDefaultsSuggestions();
    expect(out.some((s) => s.fieldId === "f1")).toBe(false);
  });

  it("emits at least 30 conservative defaults across the 56-field set", () => {
    const out = extractFounderDefaultsSuggestions();
    expect(out.length).toBeGreaterThanOrEqual(30);
  });

  it("every default carries the olivia_defaults source and confidence 0.40", () => {
    const out = extractFounderDefaultsSuggestions();
    for (const s of out) {
      expect(s.source.integration).toBe("olivia_defaults");
      expect(s.confidence).toBe(0.40);
    }
  });
});
