/**
 * `/api/documents/bookmark` — surface-contract tests.
 *
 * Covers branches that return BEFORE Prisma is hit (auth + validation).
 * The Prisma happy-path is gated by the operator-applied SQL migration
 * (`prisma/sql/08-add-documents-engine-write-surface.sql`) and is
 * exercised end-to-end once the documents app routes ship.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const BASE = "http://localhost/api/documents/bookmark";

function makePost(body: unknown, ip = "5.5.5.10"): Request {
  return new Request(BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("/api/documents/bookmark — module surface", () => {
  it("exposes GET + POST", async () => {
    const mod = await import("@/app/api/documents/bookmark/route");
    expect(typeof mod.GET).toBe("function");
    expect(typeof mod.POST).toBe("function");
  });
});

describe("/api/documents/bookmark — POST validation", () => {
  beforeEach(() => {
    vi.stubEnv("STUB_USER_ID", "00000000-0000-0000-0000-000000000001");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects unparseable body with 400", async () => {
    const { POST } = await import("@/app/api/documents/bookmark/route");
    const res = await POST(makePost("not-json", "5.5.5.11") as never);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { ok: boolean; error: string };
    expect(data.error).toMatch(/Invalid JSON/i);
  });

  it("rejects missing documentId with 400", async () => {
    const { POST } = await import("@/app/api/documents/bookmark/route");
    const res = await POST(makePost({}, "5.5.5.12") as never);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Validation failed/i);
  });

  it("returns 503 when STUB_USER_ID is unset (auth unavailable)", async () => {
    vi.unstubAllEnvs();
    const { POST } = await import("@/app/api/documents/bookmark/route");
    const res = await POST(
      makePost({ documentId: "doc-123" }, "5.5.5.13") as never,
    );
    expect(res.status).toBe(503);
  });
});
