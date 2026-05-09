/**
 * `/api/admin/avatar-eval/runs/[id]` DELETE — surface-contract tests.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

beforeAll(async () => {
  await import("@/app/api/admin/avatar-eval/runs/[id]/route");
}, 60_000);

describe("/api/admin/avatar-eval/runs/[id] — module surface", () => {
  it("exposes DELETE", async () => {
    const mod = await import("@/app/api/admin/avatar-eval/runs/[id]/route");
    expect(typeof mod.DELETE).toBe("function");
  });
});

describe("/api/admin/avatar-eval/runs/[id] — DELETE validation", () => {
  beforeEach(() => {
    vi.stubEnv("STUB_USER_ID", "00000000-0000-0000-0000-000000000001");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function makeReq(ip: string): Request {
    return new Request("http://localhost/api/admin/avatar-eval/runs/abc", {
      method: "DELETE",
      headers: { "x-forwarded-for": ip },
    });
  }

  it("rejects a non-UUID id with 400", async () => {
    const { DELETE } = await import(
      "@/app/api/admin/avatar-eval/runs/[id]/route"
    );
    const res = await DELETE(makeReq("9.9.9.1") as never, {
      params: Promise.resolve({ id: "not-a-uuid" }),
    });
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/UUID/i);
  });

  it("rejects an obviously-invalid uppercase string id with 400", async () => {
    const { DELETE } = await import(
      "@/app/api/admin/avatar-eval/runs/[id]/route"
    );
    const res = await DELETE(makeReq("9.9.9.2") as never, {
      params: Promise.resolve({ id: "ABCDEFG" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("/api/admin/avatar-eval/runs/[id] — auth guard", () => {
  it("returns 503 when the auth stub env var is missing", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "development");
    const { DELETE } = await import(
      "@/app/api/admin/avatar-eval/runs/[id]/route"
    );
    const req = new Request("http://localhost/api/admin/avatar-eval/runs/x", {
      method: "DELETE",
      headers: { "x-forwarded-for": "9.9.9.3" },
    });
    const res = await DELETE(req as never, {
      params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000001" }),
    });
    expect(res.status).toBe(503);
    vi.unstubAllEnvs();
  });
});
