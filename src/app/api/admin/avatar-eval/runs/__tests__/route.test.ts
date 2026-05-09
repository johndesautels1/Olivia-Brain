/**
 * `/api/admin/avatar-eval/runs` — surface-contract tests.
 *
 * Track O5c session 2. Covers module exports + the validation
 * branches that return BEFORE Prisma is hit. Persistence-level
 * coverage waits until the full integration tests post-Clerk.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Pre-warm the route module so per-test cold-start (Prisma + Zod +
// auth + rate-limit + eval-scripts) doesn't hit the per-test timeout
// on first import. Same pattern would help the admin/investors route
// tests too.
beforeAll(async () => {
  await import("@/app/api/admin/avatar-eval/runs/route");
}, 60_000);

describe("/api/admin/avatar-eval/runs — module surface", () => {
  it("exposes GET + POST", async () => {
    const mod = await import("@/app/api/admin/avatar-eval/runs/route");
    expect(typeof mod.GET).toBe("function");
    expect(typeof mod.POST).toBe("function");
  });
});

describe("/api/admin/avatar-eval/runs — POST validation", () => {
  beforeEach(() => {
    vi.stubEnv("STUB_USER_ID", "00000000-0000-0000-0000-000000000001");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function makeReq(body: unknown, ip: string): Request {
    return new Request("http://localhost/api/admin/avatar-eval/runs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": ip,
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  }

  it("rejects an unparseable body with 400", async () => {
    const { POST } = await import("@/app/api/admin/avatar-eval/runs/route");
    const res = await POST(makeReq("not-json", "7.7.7.1") as never);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Invalid JSON/i);
  });

  it("rejects an unknown vendor with 400", async () => {
    const { POST } = await import("@/app/api/admin/avatar-eval/runs/route");
    const res = await POST(
      makeReq(
        { vendor: "notavendor", scriptId: "short-01", latencyMs: 250 },
        "7.7.7.2",
      ) as never,
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Validation failed/i);
  });

  it("rejects a missing scriptId with 400", async () => {
    const { POST } = await import("@/app/api/admin/avatar-eval/runs/route");
    const res = await POST(
      makeReq({ vendor: "tavus", latencyMs: 250 }, "7.7.7.3") as never,
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Validation failed/i);
  });

  it("rejects an out-of-range MOS with 400", async () => {
    const { POST } = await import("@/app/api/admin/avatar-eval/runs/route");
    const res = await POST(
      makeReq(
        { vendor: "tavus", scriptId: "short-01", latencyMs: 250, mosScore: 9.0 },
        "7.7.7.4",
      ) as never,
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Validation failed/i);
  });

  it("rejects an unknown scriptId with 400", async () => {
    const { POST } = await import("@/app/api/admin/avatar-eval/runs/route");
    const res = await POST(
      makeReq(
        { vendor: "tavus", scriptId: "nonexistent-script", latencyMs: 250 },
        "7.7.7.5",
      ) as never,
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Unknown scriptId/i);
  });
});

describe("/api/admin/avatar-eval/runs — auth guard", () => {
  it("returns 503 when the auth stub env var is missing", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "development");

    const { POST } = await import("@/app/api/admin/avatar-eval/runs/route");
    const req = new Request("http://localhost/api/admin/avatar-eval/runs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "7.7.7.6",
      },
      body: JSON.stringify({
        vendor: "tavus",
        scriptId: "short-01",
        latencyMs: 250,
      }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(503);
    vi.unstubAllEnvs();
  });
});
