/**
 * `/api/documents/[id]/share` — surface-contract tests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const BASE = "http://localhost/api/documents/doc-1/share";

function makePost(body: unknown, ip = "5.5.5.40"): Request {
  return new Request(BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function fakeParams(id = "doc-1") {
  return { params: Promise.resolve({ id }) };
}

describe("/api/documents/[id]/share — module surface", () => {
  it("exposes GET + POST", async () => {
    const mod = await import("@/app/api/documents/[id]/share/route");
    expect(typeof mod.GET).toBe("function");
    expect(typeof mod.POST).toBe("function");
  });
});

describe("/api/documents/[id]/share — POST validation", () => {
  beforeEach(() => {
    vi.stubEnv("STUB_USER_ID", "00000000-0000-0000-0000-000000000001");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects unparseable body with 400", async () => {
    const { POST } = await import("@/app/api/documents/[id]/share/route");
    const res = await POST(makePost("not-json", "5.5.5.41") as never, fakeParams());
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Invalid JSON/i);
  });

  it("rejects bad email format with 400", async () => {
    const { POST } = await import("@/app/api/documents/[id]/share/route");
    const res = await POST(
      makePost({ recipientEmail: "not-an-email" }, "5.5.5.42") as never,
      fakeParams(),
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Validation failed/i);
  });

  it("rejects bad expiresAt format with 400", async () => {
    const { POST } = await import("@/app/api/documents/[id]/share/route");
    const res = await POST(
      makePost({ expiresAt: "not-a-date" }, "5.5.5.43") as never,
      fakeParams(),
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Validation failed/i);
  });
});
