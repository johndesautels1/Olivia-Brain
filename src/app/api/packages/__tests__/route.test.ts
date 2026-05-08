/**
 * `/api/packages` — surface-contract tests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const BASE = "http://localhost/api/packages";

function makePost(body: unknown, ip = "5.5.5.20"): Request {
  return new Request(BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("/api/packages — module surface", () => {
  it("exposes GET + POST", async () => {
    const mod = await import("@/app/api/packages/route");
    expect(typeof mod.GET).toBe("function");
    expect(typeof mod.POST).toBe("function");
  });
});

describe("/api/packages — POST validation", () => {
  beforeEach(() => {
    vi.stubEnv("STUB_USER_ID", "00000000-0000-0000-0000-000000000001");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects unparseable body with 400", async () => {
    const { POST } = await import("@/app/api/packages/route");
    const res = await POST(makePost("not-json", "5.5.5.21") as never);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Invalid JSON/i);
  });

  it("rejects missing name with 400", async () => {
    const { POST } = await import("@/app/api/packages/route");
    const res = await POST(
      makePost({ outreachGoal: "fundraising" }, "5.5.5.22") as never,
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Validation failed/i);
  });

  it("rejects missing outreachGoal with 400", async () => {
    const { POST } = await import("@/app/api/packages/route");
    const res = await POST(makePost({ name: "Seed Round" }, "5.5.5.23") as never);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Validation failed/i);
  });
});
