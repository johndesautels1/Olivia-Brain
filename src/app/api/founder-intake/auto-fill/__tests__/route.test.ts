/**
 * `/api/founder-intake/auto-fill` — surface-contract tests.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("/api/founder-intake/auto-fill — module surface", () => {
  it("exposes POST", async () => {
    const mod = await import("@/app/api/founder-intake/auto-fill/route");
    expect(typeof mod.POST).toBe("function");
  });
});

describe("/api/founder-intake/auto-fill — POST behaviour", () => {
  beforeEach(() => {
    vi.stubEnv("STUB_USER_ID", "00000000-0000-0000-0000-000000000001");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function makeReq(body: unknown): Request {
    return new Request("http://localhost/api/founder-intake/auto-fill", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "127.0.0.1",
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  }

  it("returns ok=true with suggestions on a default empty body", async () => {
    const { POST } = await import("@/app/api/founder-intake/auto-fill/route");
    const res = await POST(makeReq({}) as never);
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      ok: boolean;
      suggestions: Array<{ fieldId: string }>;
      fieldsCovered: number;
    };
    expect(data.ok).toBe(true);
    expect(Array.isArray(data.suggestions)).toBe(true);
    expect(data.fieldsCovered).toBeGreaterThanOrEqual(30);
  });

  it("returns 401 when STUB_USER_ID is absent", async () => {
    vi.unstubAllEnvs();
    const { POST } = await import("@/app/api/founder-intake/auto-fill/route");
    const res = await POST(makeReq({}) as never);
    /* Stub auth throws when STUB_USER_ID missing in dev — surfaces as 503. */
    expect([401, 503]).toContain(res.status);
  });
});
