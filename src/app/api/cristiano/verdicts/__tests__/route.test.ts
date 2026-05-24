/**
 * `/api/cristiano/verdicts` (list) — surface-contract tests.
 *
 * Held to Apple / Microsoft / Google 2026 leading coding practices per
 * `~/CLAUDE.md` and `docs/api-specs/_MASTER_REGISTER.md §10.4`.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const BASE = "http://localhost/api/cristiano/verdicts";

beforeAll(async () => {
  await import("@/app/api/cristiano/verdicts/route");
}, 60_000);

function makeGet(url: string, ip = "9.9.9.1"): Request {
  return new Request(url, {
    method: "GET",
    headers: { "x-forwarded-for": ip },
  });
}

describe("/api/cristiano/verdicts — module surface", () => {
  it("exposes GET + force-dynamic", async () => {
    const mod = await import("@/app/api/cristiano/verdicts/route");
    expect(typeof mod.GET).toBe("function");
    expect(mod.dynamic).toBe("force-dynamic");
  });
});

describe("/api/cristiano/verdicts — auth", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 503 when STUB_USER_ID is unset (auth misconfig)", async () => {
    const { GET } = await import("@/app/api/cristiano/verdicts/route");
    const res = await GET(makeGet(BASE, "9.9.9.2") as never);
    expect(res.status).toBe(503);
  });
});

describe("/api/cristiano/verdicts — query validation", () => {
  beforeEach(() => {
    vi.stubEnv("STUB_USER_ID", "00000000-0000-0000-0000-000000000001");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects invalid 'kind' with 400", async () => {
    const { GET } = await import("@/app/api/cristiano/verdicts/route");
    const res = await GET(
      makeGet(`${BASE}?kind=not_a_kind`, "9.9.9.10") as never,
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/kind/i);
  });

  it("rejects invalid 'sourceApp' with 400", async () => {
    const { GET } = await import("@/app/api/cristiano/verdicts/route");
    const res = await GET(
      makeGet(`${BASE}?sourceApp=fake-app`, "9.9.9.11") as never,
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/sourceApp/i);
  });

  it("rejects invalid 'before' (not ISO 8601) with 400", async () => {
    const { GET } = await import("@/app/api/cristiano/verdicts/route");
    const res = await GET(
      makeGet(`${BASE}?before=not-a-date`, "9.9.9.12") as never,
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/before/i);
  });

  it("rejects 'limit' out of range with 400", async () => {
    const { GET } = await import("@/app/api/cristiano/verdicts/route");
    const tooHigh = await GET(
      makeGet(`${BASE}?limit=500`, "9.9.9.13") as never,
    );
    expect(tooHigh.status).toBe(400);

    const tooLow = await GET(
      makeGet(`${BASE}?limit=0`, "9.9.9.14") as never,
    );
    expect(tooLow.status).toBe(400);

    const notANumber = await GET(
      makeGet(`${BASE}?limit=abc`, "9.9.9.15") as never,
    );
    expect(notANumber.status).toBe(400);
  });
});

describe("/api/cristiano/verdicts — rate limiting", () => {
  beforeEach(() => {
    vi.stubEnv("STUB_USER_ID", "00000000-0000-0000-0000-000000000001");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 429 once the per-IP bucket (60/min) is exhausted", async () => {
    const { GET } = await import("@/app/api/cristiano/verdicts/route");
    const ip = `9.9.9.${200 + Math.floor(Math.random() * 30)}`;
    let lastStatus = 0;

    for (let i = 0; i < 65; i += 1) {
      const res = await GET(
        makeGet(`${BASE}?kind=not_a_kind`, ip) as never,
      );
      lastStatus = res.status;
      if (res.status === 429) break;
    }

    expect(lastStatus).toBe(429);
  });
});
