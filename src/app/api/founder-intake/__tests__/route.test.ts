/**
 * `/api/founder-intake` — surface-contract + schema-validation tests.
 *
 * Pre-Clerk: full Prisma-backed integration runs land alongside Track F
 * Session 18 once `getAuthSession()` is real. For Q2 we cover:
 *   - module exposes `POST` + `GET` handlers
 *   - rejects empty body / missing companyName
 *   - rejects type-mismatched values via the Q1 Zod schema
 *
 * No DB calls — the route returns 400 / 401 / 503 BEFORE Prisma is hit
 * for these branches.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Pre-warm the route module so per-test cold-start (Prisma + Zod +
// auth + rate-limit) doesn't hit the per-test 15s timeout on first
// import. Same pattern as `src/app/api/admin/avatar-eval/runs/__tests__/route.test.ts`.
beforeAll(async () => {
  await import("@/app/api/founder-intake/route");
}, 60_000);

describe("/api/founder-intake — module surface", () => {
  it("exposes POST + GET", async () => {
    const mod = await import("@/app/api/founder-intake/route");
    expect(typeof mod.POST).toBe("function");
    expect(typeof mod.GET).toBe("function");
  });
});

describe("/api/founder-intake — POST validation", () => {
  beforeEach(() => {
    vi.stubEnv("STUB_USER_ID", "00000000-0000-0000-0000-000000000001");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function makeReq(body: unknown): Request {
    return new Request("http://localhost/api/founder-intake", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "1.1.1.1" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  }

  it("rejects an empty body with 400", async () => {
    const { POST } = await import("@/app/api/founder-intake/route");
    const res = await POST(makeReq("not-json") as never);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { ok: boolean; error: string };
    expect(data.ok).toBe(false);
    expect(data.error).toMatch(/Invalid JSON/i);
  });

  it("rejects a missing companyName with 400", async () => {
    const { POST } = await import("@/app/api/founder-intake/route");
    const res = await POST(makeReq({ values: {} }) as never);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/companyName is required/i);
  });

  it("rejects a values payload that violates the Q1 schema", async () => {
    const { POST } = await import("@/app/api/founder-intake/route");
    /* f1 ARR must be non-negative finite number — string fails Zod. */
    const res = await POST(
      makeReq({ companyName: "Test", values: { f1: "not a number" } }) as never,
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Invalid values/i);
  });
});
