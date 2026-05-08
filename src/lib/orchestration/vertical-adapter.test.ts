/**
 * `vertical-adapter` tests — Track J Session 25.
 *
 * Covers:
 *   - All 5 verticals return an addendum with their id + status
 *   - AI/SaaS is "final"; HealthTech / ClimateTech / PropTech are
 *     "draft" placeholders pending S26
 *   - Industry-string detection covers the obvious matches AND
 *     resolves precedence (HealthTech > AI when both terms appear)
 *   - resolveVerticalAddendum prefers explicit over detected over
 *     generic
 */

import { describe, it, expect } from "vitest";
import {
  detectVerticalFromIndustry,
  getVerticalAddendum,
  resolveVerticalAddendum,
} from "./vertical-adapter";

describe("getVerticalAddendum", () => {
  it("returns AI/SaaS as final", () => {
    const a = getVerticalAddendum("ai_saas");
    expect(a.vertical).toBe("ai_saas");
    expect(a.status).toBe("final");
    expect(a.systemPromptAddendum.length).toBeGreaterThan(200);
    expect(a.preferredProviders).toContain("anthropic");
  });

  it("returns all 4 industry verticals as final after S26", () => {
    expect(getVerticalAddendum("healthtech").status).toBe("final");
    expect(getVerticalAddendum("climatetech").status).toBe("final");
    expect(getVerticalAddendum("proptech").status).toBe("final");
  });

  it("each finalized vertical addendum is substantive (>500 chars)", () => {
    expect(getVerticalAddendum("healthtech").systemPromptAddendum.length).toBeGreaterThan(500);
    expect(getVerticalAddendum("climatetech").systemPromptAddendum.length).toBeGreaterThan(500);
    expect(getVerticalAddendum("proptech").systemPromptAddendum.length).toBeGreaterThan(500);
  });

  it("HealthTech draft prefers Perplexity for citations", () => {
    const a = getVerticalAddendum("healthtech");
    expect(a.preferredProviders?.[0]).toBe("perplexity");
  });

  it("Generic returns empty addendum + final status", () => {
    const a = getVerticalAddendum("generic");
    expect(a.systemPromptAddendum).toBe("");
    expect(a.status).toBe("final");
  });
});

describe("detectVerticalFromIndustry", () => {
  it("returns null for null/empty input", () => {
    expect(detectVerticalFromIndustry(null)).toBeNull();
    expect(detectVerticalFromIndustry("")).toBeNull();
    expect(detectVerticalFromIndustry(undefined)).toBeNull();
  });

  it("matches HealthTech variants", () => {
    expect(detectVerticalFromIndustry("HealthTech")).toBe("healthtech");
    expect(detectVerticalFromIndustry("medical devices")).toBe("healthtech");
    expect(detectVerticalFromIndustry("clinical-stage biotech")).toBe("healthtech");
    expect(detectVerticalFromIndustry("FDA-cleared diagnostics")).toBe("healthtech");
  });

  it("matches ClimateTech variants", () => {
    expect(detectVerticalFromIndustry("Climate")).toBe("climatetech");
    expect(detectVerticalFromIndustry("Carbon Capture")).toBe("climatetech");
    expect(detectVerticalFromIndustry("ESG analytics")).toBe("climatetech");
    expect(detectVerticalFromIndustry("renewable energy grid")).toBe("climatetech");
  });

  it("matches PropTech variants", () => {
    expect(detectVerticalFromIndustry("PropTech")).toBe("proptech");
    expect(detectVerticalFromIndustry("Real Estate")).toBe("proptech");
    expect(detectVerticalFromIndustry("MLS data platform")).toBe("proptech");
    expect(detectVerticalFromIndustry("residential property analytics")).toBe("proptech");
  });

  it("matches AI/SaaS variants", () => {
    expect(detectVerticalFromIndustry("AI / SaaS")).toBe("ai_saas");
    expect(detectVerticalFromIndustry("LLM-powered platform")).toBe("ai_saas");
    expect(detectVerticalFromIndustry("Generative AI")).toBe("ai_saas");
    expect(detectVerticalFromIndustry("B2B SaaS")).toBe("ai_saas");
    expect(detectVerticalFromIndustry("Machine Learning")).toBe("ai_saas");
  });

  it("HealthTech wins over AI when both present (precedence)", () => {
    expect(detectVerticalFromIndustry("AI for clinical diagnostics")).toBe("healthtech");
    expect(detectVerticalFromIndustry("Health AI")).toBe("healthtech");
  });

  it("returns null for unrelated industries", () => {
    expect(detectVerticalFromIndustry("retail apparel")).toBeNull();
    expect(detectVerticalFromIndustry("commodities trading")).toBeNull();
  });
});

describe("resolveVerticalAddendum", () => {
  it("prefers explicit override over detected", () => {
    /* Industry says ai_saas but caller forces healthtech. */
    const r = resolveVerticalAddendum("LLM platform", "healthtech");
    expect(r.vertical).toBe("healthtech");
  });

  it("falls back to detected when no explicit", () => {
    const r = resolveVerticalAddendum("AI / SaaS");
    expect(r.vertical).toBe("ai_saas");
  });

  it("falls back to generic when nothing matches", () => {
    const r = resolveVerticalAddendum("retail apparel");
    expect(r.vertical).toBe("generic");
    expect(r.systemPromptAddendum).toBe("");
  });

  it("returns generic when industry is null/undefined", () => {
    const r = resolveVerticalAddendum(null);
    expect(r.vertical).toBe("generic");
  });
});
