/**
 * `/api/admin/avatar-eval/live/[vendor]` — surface + validation tests.
 *
 * Track O5c-Lift S4. Covers the validation branches that return BEFORE
 * any vendor SDK call (auth, rate-limit, JSON parse, vendor allow-list,
 * Zod body parse). Persistence-side / vendor-call coverage waits until
 * a future session can hit live API keys in CI.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Pre-warm the route module so per-test cold-start (Prisma + Zod +
// auth + rate-limit + vendor adapters) doesn't hit the per-test 15s
// timeout on first import. Same pattern as
// src/app/api/admin/avatar-eval/runs/__tests__/route.test.ts.
beforeAll(async () => {
  await import("@/app/api/admin/avatar-eval/live/[vendor]/route");
}, 60_000);

describe("/api/admin/avatar-eval/live/[vendor] — module surface", () => {
  it("exposes POST", async () => {
    const mod = await import("@/app/api/admin/avatar-eval/live/[vendor]/route");
    expect(typeof mod.POST).toBe("function");
  });
});

describe("/api/admin/avatar-eval/live/[vendor] — POST validation", () => {
  beforeEach(() => {
    vi.stubEnv("STUB_USER_ID", "00000000-0000-0000-0000-000000000001");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function makeReq(body: unknown, ip: string): Request {
    return new Request("http://localhost/api/admin/avatar-eval/live/tavus", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  }

  function makeParams(vendor: string): { params: Promise<{ vendor: string }> } {
    return { params: Promise.resolve({ vendor }) };
  }

  it("rejects an unparseable body with 400", async () => {
    const { POST } = await import("@/app/api/admin/avatar-eval/live/[vendor]/route");
    const res = await POST(makeReq("not-json", "9.9.9.1") as never, makeParams("tavus"));
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Invalid JSON/i);
  });

  it("rejects an unsupported vendor with 404", async () => {
    const { POST } = await import("@/app/api/admin/avatar-eval/live/[vendor]/route");
    // liveavatar is a supported eval vendor but THIS route excludes it
    // (it has its own /api/olivia/liveavatar/speak-stream path).
    const res = await POST(
      makeReq({ text: "hello" }, "9.9.9.2") as never,
      makeParams("liveavatar"),
    );
    expect(res.status).toBe(404);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Unsupported vendor/i);
    expect(data.error).toMatch(/liveavatar uses/i);
  });

  it("rejects an unknown vendor with 404", async () => {
    const { POST } = await import("@/app/api/admin/avatar-eval/live/[vendor]/route");
    const res = await POST(
      makeReq({ text: "hello" }, "9.9.9.3") as never,
      makeParams("notavendor"),
    );
    expect(res.status).toBe(404);
  });

  it("rejects a missing text field with 400", async () => {
    const { POST } = await import("@/app/api/admin/avatar-eval/live/[vendor]/route");
    const res = await POST(makeReq({}, "9.9.9.4") as never, makeParams("tavus"));
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/text/i);
  });

  it("rejects an over-long text field with 400", async () => {
    const { POST } = await import("@/app/api/admin/avatar-eval/live/[vendor]/route");
    const longText = "a".repeat(5001);
    const res = await POST(
      makeReq({ text: longText }, "9.9.9.5") as never,
      makeParams("tavus"),
    );
    expect(res.status).toBe(400);
  });

  it("rejects an empty text with 400", async () => {
    const { POST } = await import("@/app/api/admin/avatar-eval/live/[vendor]/route");
    const res = await POST(
      makeReq({ text: "" }, "9.9.9.6") as never,
      makeParams("tavus"),
    );
    expect(res.status).toBe(400);
  });

  it("returns 503 for tavus when TAVUS_API_KEY is missing", async () => {
    vi.stubEnv("TAVUS_API_KEY", "");
    const { POST } = await import("@/app/api/admin/avatar-eval/live/[vendor]/route");
    const res = await POST(
      makeReq({ text: "hello" }, "9.9.9.7") as never,
      makeParams("tavus"),
    );
    expect(res.status).toBe(503);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/TAVUS_API_KEY/);
  });

  it("returns 503 for simli when SIMLI_API_KEY is missing", async () => {
    vi.stubEnv("SIMLI_API_KEY", "");
    const { POST } = await import("@/app/api/admin/avatar-eval/live/[vendor]/route");
    const res = await POST(
      makeReq({ text: "hello" }, "9.9.9.8") as never,
      makeParams("simli"),
    );
    expect(res.status).toBe(503);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/SIMLI_API_KEY/);
  });
});
