/**
 * resolve-company — provenance + fallback contract tests
 *
 * Locks down four behaviours:
 *   1. Default-tagged fallback when neither input nor profile supplied.
 *   2. Source-tagging matrix: input / profile / input+profile / default.
 *   3. Explicit input overrides profile fields (input+profile precedence).
 *   4. Never-throws guarantee: missing profile + thrown Prisma error both
 *      degrade to input/default without surfacing the error to callers.
 *
 * Prisma is mocked at the module surface; the real client is never reached.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/client", () => ({
  default: {
    userCompanyProfile: {
      findUnique: vi.fn(),
    },
  },
}));

import prisma from "@/lib/db/client";
import { resolveUserCompany } from "../resolve-company";

const findUniqueMock = (prisma as unknown as {
  userCompanyProfile: { findUnique: ReturnType<typeof vi.fn> };
}).userCompanyProfile.findUnique;

beforeEach(() => {
  findUniqueMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const PROFILE_ROW = {
  companyName: "Aether Labs",
  primarySector: "ai_ml",
  headquartersLocation: "Shoreditch, London",
  employeeCount: 24,
  arr: 1_200_000,
  totalRaised: 4_500_000,
  certifications: ["SOC2", "ISO27001"],
  regulatoryBody: "ico",
  customerCount: 480,
  userProfile: { clerkUserId: "user_clerk_xyz" },
};

describe("resolveUserCompany · defaults", () => {
  it("returns a default-tagged record when no input is supplied", async () => {
    const r = await resolveUserCompany({});
    expect(r.source).toBe("default");
    expect(r.profileMatched).toBe(false);
    expect(r.ownerClerkUserId).toBeNull();
    expect(r.companyName).toBe("the Company");
    expect(r.sector).toBe("technology");
    expect(r.headquartersLocation).toBe("London, UK");
    expect(r.employeeCount).toBeNull();
    expect(r.certifications).toEqual([]);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("treats garbage input shapes as empty (Zod safeParse fail-soft)", async () => {
    const r = await resolveUserCompany({ companyName: 5, sector: false });
    expect(r.source).toBe("default");
    expect(r.companyName).toBe("the Company");
  });
});

describe("resolveUserCompany · explicit input only", () => {
  it("tags input and trims string fields", async () => {
    const r = await resolveUserCompany({
      companyName: "  Quantara  ",
      sector: " saas ",
      employeeCount: 12,
      headquartersLocation: "  Berlin  ",
    });
    expect(r.source).toBe("input");
    expect(r.profileMatched).toBe(false);
    expect(r.companyName).toBe("Quantara");
    expect(r.sector).toBe("saas");
    expect(r.employeeCount).toBe(12);
    expect(r.headquartersLocation).toBe("Berlin");
    // Profile-only fields stay at their nullish defaults.
    expect(r.arr).toBeNull();
    expect(r.totalRaised).toBeNull();
    expect(r.certifications).toEqual([]);
    expect(r.regulatoryBody).toBeNull();
    expect(r.customerCount).toBeNull();
  });
});

describe("resolveUserCompany · profile path", () => {
  it("returns a profile-tagged record when userProfileId resolves", async () => {
    findUniqueMock.mockResolvedValueOnce(PROFILE_ROW);
    const r = await resolveUserCompany({ userProfileId: "user_profile_abc" });
    expect(r.source).toBe("profile");
    expect(r.profileMatched).toBe(true);
    expect(r.ownerClerkUserId).toBe("user_clerk_xyz");
    expect(r.companyName).toBe("Aether Labs");
    expect(r.sector).toBe("ai_ml");
    expect(r.headquartersLocation).toBe("Shoreditch, London");
    expect(r.employeeCount).toBe(24);
    expect(r.arr).toBe(1_200_000);
    expect(r.totalRaised).toBe(4_500_000);
    expect(r.certifications).toEqual(["SOC2", "ISO27001"]);
    expect(r.regulatoryBody).toBe("ico");
    expect(r.customerCount).toBe(480);
  });

  it("falls back to default sector / HQ when profile leaves them null", async () => {
    findUniqueMock.mockResolvedValueOnce({
      ...PROFILE_ROW,
      primarySector: null,
      headquartersLocation: null,
    });
    const r = await resolveUserCompany({ userProfileId: "u" });
    expect(r.sector).toBe("technology");
    expect(r.headquartersLocation).toBe("London, UK");
  });

  it("captures null ownerClerkUserId when userProfile relation is missing", async () => {
    findUniqueMock.mockResolvedValueOnce({
      ...PROFILE_ROW,
      userProfile: null,
    });
    const r = await resolveUserCompany({ userProfileId: "u" });
    expect(r.profileMatched).toBe(true);
    expect(r.ownerClerkUserId).toBeNull();
  });
});

describe("resolveUserCompany · input+profile precedence", () => {
  it("tags input+profile and lets explicit input override profile fields", async () => {
    findUniqueMock.mockResolvedValueOnce(PROFILE_ROW);
    const r = await resolveUserCompany({
      userProfileId: "user_profile_abc",
      companyName: "Aether Labs (NewCo)",
      sector: "fintech",
      employeeCount: 30,
    });
    expect(r.source).toBe("input+profile");
    expect(r.profileMatched).toBe(true);
    expect(r.companyName).toBe("Aether Labs (NewCo)");
    expect(r.sector).toBe("fintech");
    expect(r.employeeCount).toBe(30);
    // HQ wasn't overridden, so the profile value sticks.
    expect(r.headquartersLocation).toBe("Shoreditch, London");
    // Profile-only fields stay sourced from the profile.
    expect(r.certifications).toEqual(["SOC2", "ISO27001"]);
    expect(r.regulatoryBody).toBe("ico");
  });
});

describe("resolveUserCompany · never throws", () => {
  it("degrades to input/default when the profile lookup returns null", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    const r = await resolveUserCompany({
      userProfileId: "user_missing",
      companyName: "BackupCo",
    });
    expect(r.source).toBe("input");
    expect(r.profileMatched).toBe(false);
    expect(r.companyName).toBe("BackupCo");
  });

  it("degrades to input/default when Prisma throws", async () => {
    findUniqueMock.mockRejectedValueOnce(new Error("db down"));
    const r = await resolveUserCompany({
      userProfileId: "user_x",
      sector: "climate",
    });
    expect(r.source).toBe("input");
    expect(r.profileMatched).toBe(false);
    expect(r.sector).toBe("climate");
  });
});
