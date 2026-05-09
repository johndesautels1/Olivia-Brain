/**
 * `/api/packages/documents` — surface-contract tests.
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Pre-warm the route module so per-test cold-start (Prisma + Zod +
// auth + rate-limit) doesn't hit the per-test 15s timeout on first
// import. Same pattern as `src/app/api/admin/avatar-eval/runs/__tests__/route.test.ts`.
beforeAll(async () => {
  await import("@/app/api/packages/documents/route");
}, 60_000);

const BASE = "http://localhost/api/packages/documents";

function makePost(body: unknown, ip = "5.5.5.30"): Request {
  return new Request(BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("/api/packages/documents — module surface", () => {
  it("exposes POST", async () => {
    const mod = await import("@/app/api/packages/documents/route");
    expect(typeof mod.POST).toBe("function");
  });
});

describe("/api/packages/documents — POST validation", () => {
  beforeEach(() => {
    vi.stubEnv("STUB_USER_ID", "00000000-0000-0000-0000-000000000001");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects unparseable body with 400", async () => {
    const { POST } = await import("@/app/api/packages/documents/route");
    const res = await POST(makePost("not-json", "5.5.5.31") as never);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Invalid JSON/i);
  });

  it("rejects missing packageId with 400", async () => {
    const { POST } = await import("@/app/api/packages/documents/route");
    const res = await POST(
      makePost({ documentId: "doc-123" }, "5.5.5.32") as never,
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Validation failed/i);
  });

  it("rejects non-uuid packageId with 400", async () => {
    const { POST } = await import("@/app/api/packages/documents/route");
    const res = await POST(
      makePost(
        { packageId: "not-a-uuid", documentId: "doc-123" },
        "5.5.5.33",
      ) as never,
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Validation failed/i);
  });

  it("rejects missing documentId with 400", async () => {
    const { POST } = await import("@/app/api/packages/documents/route");
    const res = await POST(
      makePost(
        { packageId: "00000000-0000-0000-0000-000000000099" },
        "5.5.5.34",
      ) as never,
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Validation failed/i);
  });
});
