/**
 * `/api/cristiano/judge` — surface-contract tests.
 *
 * Covers branches that return BEFORE the LLM/Prisma is hit (auth +
 * validation + rate limit). The Opus happy-path is exercised at
 * integration time once Clerk + Postgres test instance land.
 *
 * Held to Apple / Microsoft / Google 2026 leading coding practices per
 * `~/CLAUDE.md` and `docs/api-specs/_MASTER_REGISTER.md §10.4`.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const BASE = "http://localhost/api/cristiano/judge";

beforeAll(async () => {
  await import("@/app/api/cristiano/judge/route");
}, 60_000);

function makePost(body: unknown, ip = "8.8.8.1"): Request {
  return new Request(BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("/api/cristiano/judge — module surface", () => {
  it("exposes POST", async () => {
    const mod = await import("@/app/api/cristiano/judge/route");
    expect(typeof mod.POST).toBe("function");
  });

  it("declares force-dynamic + maxDuration 120", async () => {
    const mod = await import("@/app/api/cristiano/judge/route");
    expect(mod.dynamic).toBe("force-dynamic");
    expect(mod.maxDuration).toBe(120);
  });
});

describe("/api/cristiano/judge — auth", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 503 when STUB_USER_ID is unset (auth misconfig)", async () => {
    const { POST } = await import("@/app/api/cristiano/judge/route");
    const res = await POST(
      makePost(
        {
          kind: "freeform",
          payload: { question: "Should we hire a CTO?" },
        },
        "8.8.8.2",
      ) as never,
    );
    expect(res.status).toBe(503);
  });
});

describe("/api/cristiano/judge — validation", () => {
  beforeEach(() => {
    vi.stubEnv("STUB_USER_ID", "00000000-0000-0000-0000-000000000001");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects unparseable JSON with 400", async () => {
    const { POST } = await import("@/app/api/cristiano/judge/route");
    const res = await POST(makePost("not-json", "8.8.8.10") as never);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Invalid JSON/i);
  });

  it("rejects an unknown kind with 400", async () => {
    const { POST } = await import("@/app/api/cristiano/judge/route");
    const res = await POST(
      makePost(
        { kind: "not_a_kind", payload: {} },
        "8.8.8.11",
      ) as never,
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Invalid request shape/i);
  });

  it("rejects a kind/payload mismatch with 400", async () => {
    const { POST } = await import("@/app/api/cristiano/judge/route");
    const res = await POST(
      makePost(
        {
          kind: "city_compare",
          payload: { question: "Wrong shape — this is freeform." },
        },
        "8.8.8.12",
      ) as never,
    );
    expect(res.status).toBe(400);
  });

  it("rejects a freeform question that is too short", async () => {
    const { POST } = await import("@/app/api/cristiano/judge/route");
    const res = await POST(
      makePost(
        { kind: "freeform", payload: { question: "Hi?" } },
        "8.8.8.13",
      ) as never,
    );
    expect(res.status).toBe(400);
  });

  it("rejects a city_compare missing city2", async () => {
    const { POST } = await import("@/app/api/cristiano/judge/route");
    const res = await POST(
      makePost(
        { kind: "city_compare", payload: { city1: "London" } },
        "8.8.8.14",
      ) as never,
    );
    expect(res.status).toBe(400);
  });
});

describe("/api/cristiano/judge — rate limiting", () => {
  beforeEach(() => {
    vi.stubEnv("STUB_USER_ID", "00000000-0000-0000-0000-000000000001");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 429 once the per-IP bucket (10/min) is exhausted", async () => {
    const { POST } = await import("@/app/api/cristiano/judge/route");
    const ip = `8.8.8.${100 + Math.floor(Math.random() * 50)}`;
    let lastStatus = 0;

    for (let i = 0; i < 11; i += 1) {
      const res = await POST(
        makePost(
          { kind: "freeform", payload: { question: "Should we ship now?" } },
          ip,
        ) as never,
      );
      lastStatus = res.status;
      if (res.status === 429) break;
    }

    expect(lastStatus).toBe(429);
  });
});
