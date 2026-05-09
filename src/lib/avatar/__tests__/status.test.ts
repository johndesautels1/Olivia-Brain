/**
 * `src/lib/avatar/status.ts` — vendor-health helper tests.
 *
 * Track O5c follow-up. Locks the shape backing the
 * `/admin/avatar-eval` wiring panel and the
 * `/api/admin/avatar-vendors/status` endpoint.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Pre-warm the module so the first per-test cold-start doesn't hit
// the 15s testTimeout under parallel-suite load on Windows.
// (Same pattern shipped in O5c S2's avatar-eval/runs route test.)
beforeAll(async () => {
  await import("@/lib/avatar/status");
}, 60_000);

const ALL_VENDORS = [
  "tavus",
  "simli",
  "heygen",
  "did",
  "sadtalker",
  "liveavatar",
] as const;

describe("getAllVendorHealth", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returns one row per vendor", async () => {
    const { getAllVendorHealth } = await import("@/lib/avatar/status");
    const rows = getAllVendorHealth();
    expect(rows.map((r) => r.vendor).sort()).toEqual([...ALL_VENDORS].sort());
  });

  it("reports configured = false for every vendor when no env is set", async () => {
    for (const v of ["TAVUS_API_KEY", "SIMLI_API_KEY", "HEYGEN_API_KEY", "DID_API_KEY", "REPLICATE_API_TOKEN", "LIVEAVATAR_API_KEY", "LIVEAVATAR_OLIVIA_AVATAR_ID"]) {
      vi.stubEnv(v, "");
    }
    const { getAllVendorHealth } = await import("@/lib/avatar/status");
    const rows = getAllVendorHealth();
    for (const row of rows) {
      expect(row.configured).toBe(false);
      expect(row.notes).toBeDefined();
      expect(row.notes).toMatch(/Set/i);
    }
  });

  it("reports configured = true for tavus when TAVUS_API_KEY is set", async () => {
    vi.stubEnv("TAVUS_API_KEY", "tavus-key");
    const { getAllVendorHealth } = await import("@/lib/avatar/status");
    const tavus = getAllVendorHealth().find((r) => r.vendor === "tavus");
    expect(tavus?.configured).toBe(true);
    expect(tavus?.notes).toBeUndefined();
  });

  it("reports liveavatar configured only when BOTH env vars are set", async () => {
    vi.stubEnv("LIVEAVATAR_API_KEY", "live-key");
    vi.stubEnv("LIVEAVATAR_OLIVIA_AVATAR_ID", "");
    const m1 = await import("@/lib/avatar/status");
    expect(m1.getAllVendorHealth().find((r) => r.vendor === "liveavatar")?.configured).toBe(false);

    vi.resetModules();
    vi.stubEnv("LIVEAVATAR_API_KEY", "live-key");
    vi.stubEnv("LIVEAVATAR_OLIVIA_AVATAR_ID", "avatar-id");
    const m2 = await import("@/lib/avatar/status");
    expect(m2.getAllVendorHealth().find((r) => r.vendor === "liveavatar")?.configured).toBe(true);
  });

  it("never includes a secret value in the notes (defence-in-depth)", async () => {
    vi.stubEnv("TAVUS_API_KEY", "");
    vi.stubEnv("LIVEAVATAR_API_KEY", "");
    const { getAllVendorHealth } = await import("@/lib/avatar/status");
    const rows = getAllVendorHealth();
    for (const row of rows) {
      // Notes should reference the env-var NAME but never a value.
      // A regex match against any common API-key fragment would
      // catch a secret leak; here we just assert the shape.
      if (row.notes) {
        expect(row.notes).not.toMatch(/=/);
      }
    }
  });
});
