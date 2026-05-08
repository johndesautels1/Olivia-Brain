/**
 * `/api/me/documents/save-from-template` — surface-contract tests.
 *
 * Validates the 501 stub behaviour shipped in Track B Session 8b-routes.
 * When Session 8d ports the `Document` Prisma model, the stub gets
 * replaced with the real fork logic and these tests get extended to
 * cover the success path.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const BASE = "http://localhost/api/me/documents/save-from-template";

function makePost(body: unknown, ip = "5.5.5.60"): Request {
  return new Request(BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("/api/me/documents/save-from-template — module surface", () => {
  it("exposes POST", async () => {
    const mod = await import(
      "@/app/api/me/documents/save-from-template/route"
    );
    expect(typeof mod.POST).toBe("function");
  });
});

describe("/api/me/documents/save-from-template — 501 stub", () => {
  beforeEach(() => {
    vi.stubEnv("STUB_USER_ID", "00000000-0000-0000-0000-000000000001");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects unparseable body with 400 BEFORE returning 501", async () => {
    const { POST } = await import(
      "@/app/api/me/documents/save-from-template/route"
    );
    const res = await POST(makePost("not-json", "5.5.5.61") as never);
    expect(res.status).toBe(400);
  });

  it("returns 501 with structured Session 8d pointer for valid input", async () => {
    const { POST } = await import(
      "@/app/api/me/documents/save-from-template/route"
    );
    const res = await POST(
      makePost({ templateId: "tmpl-123" }, "5.5.5.62") as never,
    );
    expect(res.status).toBe(501);
    const data = (await res.json()) as {
      ok: boolean;
      error: string;
      pendingSession: string;
    };
    expect(data.ok).toBe(false);
    expect(data.pendingSession).toBe("8d");
    expect(data.error).toMatch(/Document Prisma model/);
  });
});
