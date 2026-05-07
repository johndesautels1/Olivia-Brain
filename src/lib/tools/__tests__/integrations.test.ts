/**
 * Track O Session O1 — Q3 read-only integrations smoke tests.
 *
 * Includes a contract test for the LTM-ported Companies House client.
 */

import { describe, expect, it } from "vitest";

import {
  fetchCompaniesHouseProfile,
  fetchGitHubRepoStats,
  fetchLinkedInCompany,
  fetchQuickBooksRollup,
  fetchStripeMetrics,
  fetchSupabaseStats,
  fetchXeroRollup,
  MOCK_MODE_CONFIDENCE,
  Q3_INTEGRATION_IDS,
} from "../integrations";

describe("Track O Session O1 — Q3 read-only integrations", () => {
  it("registry exposes 7 integration ids", () => {
    expect(Q3_INTEGRATION_IDS).toEqual([
      "stripe",
      "github",
      "linkedin",
      "quickbooks",
      "xero",
      "companies_house",
      "supabase",
    ]);
  });

  it("Stripe — mock-mode payload when STRIPE_API_KEY absent", async () => {
    const res = await fetchStripeMetrics();
    expect(res.ok).toBe(true);
    expect(res.mockMode).toBe(true);
    expect(res.source.integration).toBe("stripe");
    expect(res.source.confidence).toBe(MOCK_MODE_CONFIDENCE);
    expect(res.data?.arrPence).toBeGreaterThan(0);
    expect(res.data?.currency).toBe("gbp");
  });

  it("GitHub — mock-mode payload preserves the requested repo name", async () => {
    const res = await fetchGitHubRepoStats("octocat/hello-world");
    expect(res.ok).toBe(true);
    expect(res.mockMode).toBe(true);
    expect(res.source.integration).toBe("github");
    expect(res.data?.fullName).toBe("octocat/hello-world");
    expect(res.data?.stars).toBeGreaterThan(0);
  });

  it("LinkedIn — mock-mode payload preserves the requested URN", async () => {
    const res = await fetchLinkedInCompany("urn:li:organization:9999");
    expect(res.ok).toBe(true);
    expect(res.mockMode).toBe(true);
    expect(res.source.integration).toBe("linkedin");
    expect(res.data?.urn).toBe("urn:li:organization:9999");
    expect(res.data?.headcountRange).toBe("11-50");
  });

  it("QuickBooks — mock-mode payload preserves the requested realm", async () => {
    const res = await fetchQuickBooksRollup("realm-123");
    expect(res.ok).toBe(true);
    expect(res.mockMode).toBe(true);
    expect(res.source.integration).toBe("quickbooks");
    expect(res.data?.realmId).toBe("realm-123");
    expect(res.data?.revenueTtmPence).toBeGreaterThan(0);
  });

  it("Xero — mock-mode payload preserves the requested tenant", async () => {
    const res = await fetchXeroRollup("tenant-abc");
    expect(res.ok).toBe(true);
    expect(res.mockMode).toBe(true);
    expect(res.source.integration).toBe("xero");
    expect(res.data?.tenantId).toBe("tenant-abc");
    expect(res.data?.revenueTtmPence).toBeGreaterThan(0);
  });

  it("Companies House (LTM-ported client) — mock-mode payload preserves the company number", async () => {
    const res = await fetchCompaniesHouseProfile("12345678");
    expect(res.ok).toBe(true);
    expect(res.mockMode).toBe(true);
    expect(res.source.integration).toBe("companies_house");
    expect(res.data?.companyNumber).toBe("12345678");
    expect(res.data?.status).toBe("active");
    expect(res.data?.sicCodes.length).toBeGreaterThan(0);
  });

  it("Supabase — mock-mode payload when SUPABASE keys absent", async () => {
    const res = await fetchSupabaseStats();
    expect(res.ok).toBe(true);
    expect(res.source.integration).toBe("supabase");
    expect(res.data?.tableCount).toBeGreaterThanOrEqual(0);
  });

  it("every integration tags a stable id and a recent fetchedAt", async () => {
    const results = await Promise.all([
      fetchStripeMetrics(),
      fetchGitHubRepoStats("a/b"),
      fetchLinkedInCompany("urn:li:organization:1"),
      fetchQuickBooksRollup("r"),
      fetchXeroRollup("t"),
      fetchCompaniesHouseProfile("00000001"),
      fetchSupabaseStats(),
    ]);
    for (const res of results) {
      expect(res.source.integration).toBeTruthy();
      expect(new Date(res.source.fetchedAt).getTime()).not.toBeNaN();
    }
  });
});

describe("Track O Session O1 — Companies House LTM-ported client surface", () => {
  it("exposes the LTM client functions for direct use beyond Q3", async () => {
    const client = await import("@/lib/companies-house/client");
    // Verify the byte-for-byte LTM port surface is intact for Q4-Q7 consumers.
    expect(typeof client.searchCompanies).toBe("function");
    expect(typeof client.advancedSearch).toBe("function");
    expect(typeof client.getCompanyProfile).toBe("function");
    expect(typeof client.getOfficers).toBe("function");
    expect(typeof client.searchOfficers).toBe("function");
    expect(typeof client.getFilingHistory).toBe("function");
    expect(typeof client.getFilingDocument).toBe("function");
    expect(Array.isArray(client.TECH_SIC_CODES)).toBe(true);
    expect(client.TECH_SIC_CODES.length).toBeGreaterThan(5);
  });
});
