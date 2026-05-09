/**
 * `/api/admin/avatar-vendors/status` — surface-contract tests.
 *
 * Track O5c follow-up. Pre-warm the route in `beforeAll` so per-test
 * cold-start (rate-limit + auth + status helper graph) doesn't hit
 * the per-test 15s timeout under parallel-suite load on Windows.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

beforeAll(async () => {
  await import("@/app/api/admin/avatar-vendors/status/route");
}, 60_000);

describe("/api/admin/avatar-vendors/status — module surface", () => {
  it("exposes GET", async () => {
    const mod = await import("@/app/api/admin/avatar-vendors/status/route");
    expect(typeof mod.GET).toBe("function");
  });
});

describe("/api/admin/avatar-vendors/status — happy path", () => {
  beforeEach(() => {
    vi.stubEnv("STUB_USER_ID", "00000000-0000-0000-0000-000000000001");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function makeReq(ip: string): Request {
    return new Request("http://localhost/api/admin/avatar-vendors/status", {
      method: "GET",
      headers: { "x-forwarded-for": ip },
    });
  }

  it("returns ok + a vendors array of expected shape", async () => {
    const { GET } = await import("@/app/api/admin/avatar-vendors/status/route");
    const res = await GET(makeReq("8.8.8.1") as never);
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      ok: boolean;
      vendors: { vendor: string; configured: boolean; notes?: string }[];
    };
    expect(data.ok).toBe(true);
    expect(Array.isArray(data.vendors)).toBe(true);
    expect(data.vendors.length).toBeGreaterThan(0);
    for (const v of data.vendors) {
      expect(typeof v.vendor).toBe("string");
      expect(typeof v.configured).toBe("boolean");
    }
  });

  it("includes liveavatar in the report", async () => {
    const { GET } = await import("@/app/api/admin/avatar-vendors/status/route");
    const res = await GET(makeReq("8.8.8.2") as never);
    const data = (await res.json()) as {
      vendors: { vendor: string }[];
    };
    expect(data.vendors.find((v) => v.vendor === "liveavatar")).toBeDefined();
  });
});

describe("/api/admin/avatar-vendors/status — auth guard", () => {
  it("returns 503 when the auth stub env var is missing", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "development");
    const { GET } = await import("@/app/api/admin/avatar-vendors/status/route");
    const req = new Request("http://localhost/api/admin/avatar-vendors/status", {
      method: "GET",
      headers: { "x-forwarded-for": "8.8.8.3" },
    });
    const res = await GET(req as never);
    expect(res.status).toBe(503);
    vi.unstubAllEnvs();
  });
});
