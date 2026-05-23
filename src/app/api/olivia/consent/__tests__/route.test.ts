/**
 * `/api/olivia/consent` — surface-contract tests.
 *
 * GDPR consent ledger for Olivia. Three verbs:
 *
 * - GET    — read current consent status (3 types × granted/version/grantedAt/revokedAt)
 * - POST   — grant consent (Zod-validated consentTypes[] + optional consentVersion)
 * - DELETE — revoke consent (with side-effect: revoking `data_storage` cascades
 *            deletes of OliviaConversation + OliviaPresentation per GDPR right-to-erasure)
 *
 * Coverage scope is the validation + rate-limit branches that return BEFORE
 * Prisma is hit, matching the dominant Olivia Brain route-test pattern
 * (see `admin/investors`, `documents/bookmark`, `liveavatar/speak-stream`).
 * Persistence-level coverage (upsert idempotency, revoke side-effects on
 * OliviaConversation/OliviaPresentation) lives in the integration suite once
 * Clerk + a real Postgres test instance land.
 *
 * Held to Apple / Microsoft / Google 2026 leading coding practices per
 * `~/CLAUDE.md` and `docs/api-specs/_MASTER_REGISTER.md §10.4`.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Pre-warm the route module so the first per-test cold-start (Prisma client
// + Zod + auth/session + rate-limit) doesn't hit the 15s testTimeout under
// parallel-suite load on Windows. Same pattern as `admin/investors`.
beforeAll(async () => {
  await import("@/app/api/olivia/consent/route");
}, 60_000);

const BASE = "http://localhost/api/olivia/consent";

function makeReq(
  method: "GET" | "POST" | "DELETE",
  body: unknown,
  ip: string,
): Request {
  const init: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
  };
  if (method !== "GET" && body !== undefined) {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  return new Request(BASE, init);
}

describe("/api/olivia/consent — module surface", () => {
  it("exposes GET + POST + DELETE", async () => {
    const mod = await import("@/app/api/olivia/consent/route");
    expect(typeof mod.GET).toBe("function");
    expect(typeof mod.POST).toBe("function");
    expect(typeof mod.DELETE).toBe("function");
  });
});

describe("/api/olivia/consent — POST validation", () => {
  beforeEach(() => {
    vi.stubEnv("STUB_USER_ID", "00000000-0000-0000-0000-000000000001");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects an unparseable body with 400 (Invalid JSON body)", async () => {
    const { POST } = await import("@/app/api/olivia/consent/route");
    const res = await POST(makeReq("POST", "not-json", "7.7.7.1") as never);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Invalid JSON/i);
  });

  it("DELETE rejects an unparseable body with 400 (Invalid JSON body)", async () => {
    const { DELETE } = await import("@/app/api/olivia/consent/route");
    const res = await DELETE(makeReq("DELETE", "not-json", "7.7.7.9") as never);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Invalid JSON/i);
  });

  it("rejects an empty consentTypes array with 400", async () => {
    const { POST } = await import("@/app/api/olivia/consent/route");
    const res = await POST(
      makeReq("POST", { consentTypes: [] }, "7.7.7.2") as never,
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Invalid request/i);
  });

  it("rejects an invalid consent type with 400", async () => {
    const { POST } = await import("@/app/api/olivia/consent/route");
    const res = await POST(
      makeReq(
        "POST",
        { consentTypes: ["not_a_real_type"] },
        "7.7.7.3",
      ) as never,
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Invalid request/i);
  });

  it("rejects a body missing consentTypes entirely with 400", async () => {
    const { POST } = await import("@/app/api/olivia/consent/route");
    const res = await POST(makeReq("POST", {}, "7.7.7.4") as never);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Invalid request/i);
  });

  it("rejects a body where consentTypes is not an array with 400", async () => {
    const { POST } = await import("@/app/api/olivia/consent/route");
    const res = await POST(
      makeReq(
        "POST",
        { consentTypes: "data_storage" },
        "7.7.7.5",
      ) as never,
    );
    expect(res.status).toBe(400);
  });
});

describe("/api/olivia/consent — DELETE validation", () => {
  beforeEach(() => {
    vi.stubEnv("STUB_USER_ID", "00000000-0000-0000-0000-000000000001");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects an empty consentTypes array with 400", async () => {
    const { DELETE } = await import("@/app/api/olivia/consent/route");
    const res = await DELETE(
      makeReq("DELETE", { consentTypes: [] }, "7.7.7.6") as never,
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Invalid request/i);
  });

  it("rejects an invalid consent type with 400", async () => {
    const { DELETE } = await import("@/app/api/olivia/consent/route");
    const res = await DELETE(
      makeReq(
        "DELETE",
        { consentTypes: ["bogus_type"] },
        "7.7.7.7",
      ) as never,
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Invalid request/i);
  });

  it("rejects a body missing consentTypes entirely with 400", async () => {
    const { DELETE } = await import("@/app/api/olivia/consent/route");
    const res = await DELETE(makeReq("DELETE", {}, "7.7.7.8") as never);
    expect(res.status).toBe(400);
  });
});

describe("/api/olivia/consent — auth unavailable (STUB_USER_ID unset)", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("GET returns 503 when STUB_USER_ID is unset (auth misconfigured)", async () => {
    const { GET } = await import("@/app/api/olivia/consent/route");
    const res = await GET(makeReq("GET", undefined, "7.7.7.20") as never);
    expect(res.status).toBe(503);
  });

  it("POST returns 503 when STUB_USER_ID is unset", async () => {
    const { POST } = await import("@/app/api/olivia/consent/route");
    const res = await POST(
      makeReq("POST", { consentTypes: ["data_storage"] }, "7.7.7.21") as never,
    );
    expect(res.status).toBe(503);
  });

  it("DELETE returns 503 when STUB_USER_ID is unset", async () => {
    const { DELETE } = await import("@/app/api/olivia/consent/route");
    const res = await DELETE(
      makeReq(
        "DELETE",
        { consentTypes: ["data_storage"] },
        "7.7.7.22",
      ) as never,
    );
    expect(res.status).toBe(503);
  });
});

describe("/api/olivia/consent — rate limiting", () => {
  beforeEach(() => {
    vi.stubEnv("STUB_USER_ID", "00000000-0000-0000-0000-000000000001");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("POST returns 429 once the per-IP bucket (10/min) is exhausted", async () => {
    const { POST } = await import("@/app/api/olivia/consent/route");
    const ip = `7.7.7.${100 + Math.floor(Math.random() * 50)}`;
    let lastStatus = 0;

    // Bucket is 10 / 60_000ms. Use bad-shape body so we exit the route
    // before Prisma without consuming time/IO; rate-limit is checked
    // before parse anyway.
    for (let i = 0; i < 11; i += 1) {
      const res = await POST(
        makeReq("POST", { consentTypes: [] }, ip) as never,
      );
      lastStatus = res.status;
      if (res.status === 429) break;
    }

    expect(lastStatus).toBe(429);
  });

  it("DELETE returns 429 once the per-IP bucket (10/min) is exhausted", async () => {
    const { DELETE } = await import("@/app/api/olivia/consent/route");
    const ip = `7.7.7.${160 + Math.floor(Math.random() * 50)}`;
    let lastStatus = 0;

    for (let i = 0; i < 11; i += 1) {
      const res = await DELETE(
        makeReq("DELETE", { consentTypes: [] }, ip) as never,
      );
      lastStatus = res.status;
      if (res.status === 429) break;
    }

    expect(lastStatus).toBe(429);
  });
});
