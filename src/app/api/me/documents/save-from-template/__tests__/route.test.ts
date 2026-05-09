/**
 * `/api/me/documents/save-from-template` — surface-contract tests.
 *
 * Track B Session 8d replaces the prior 501 stub with real fork logic
 * (Document Prisma model + ensureUserProfile + idempotent fork via
 * (ownerUserId, sourceTemplateId) compound unique). These tests
 * cover the validation branches that return BEFORE Prisma is hit.
 * Persistence-side cases (template-not-found 404, not-a-template 403,
 * already-owned idempotency, fresh-fork happy path) are exercised
 * once the DB is reachable + 08 + 09 migrations are applied.
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Pre-warm the route module so per-test cold-start (Prisma + Zod +
// auth + rate-limit) doesn't hit the per-test 15s timeout on first
// import. Same pattern as `src/app/api/admin/avatar-eval/runs/__tests__/route.test.ts`.
beforeAll(async () => {
  await import("@/app/api/me/documents/save-from-template/route");
}, 60_000);

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

describe("/api/me/documents/save-from-template — POST validation", () => {
  beforeEach(() => {
    vi.stubEnv("STUB_USER_ID", "00000000-0000-0000-0000-000000000001");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects unparseable body with 400", async () => {
    const { POST } = await import(
      "@/app/api/me/documents/save-from-template/route"
    );
    const res = await POST(makePost("not-json", "5.5.5.61") as never);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Invalid JSON/i);
  });

  it("rejects missing templateId with 400", async () => {
    const { POST } = await import(
      "@/app/api/me/documents/save-from-template/route"
    );
    const res = await POST(makePost({}, "5.5.5.62") as never);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Validation failed/i);
  });

  it("rejects empty-string templateId with 400", async () => {
    const { POST } = await import(
      "@/app/api/me/documents/save-from-template/route"
    );
    const res = await POST(makePost({ templateId: "" }, "5.5.5.63") as never);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Validation failed/i);
  });

  it("returns 503 when STUB_USER_ID is unset (auth unavailable)", async () => {
    vi.unstubAllEnvs();
    const { POST } = await import(
      "@/app/api/me/documents/save-from-template/route"
    );
    const res = await POST(
      makePost({ templateId: "tmpl-123" }, "5.5.5.64") as never,
    );
    expect(res.status).toBe(503);
  });
});
