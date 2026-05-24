/**
 * `/api/cristiano/verdicts/[id]` (detail) — surface-contract tests.
 *
 * Held to Apple / Microsoft / Google 2026 leading coding practices per
 * `~/CLAUDE.md` and `docs/api-specs/_MASTER_REGISTER.md §10.4`.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const BASE = "http://localhost/api/cristiano/verdicts";

beforeAll(async () => {
  await import("@/app/api/cristiano/verdicts/[id]/route");
}, 60_000);

function makeGet(id: string, ip = "9.9.10.1"): Request {
  return new Request(`${BASE}/${id}`, {
    method: "GET",
    headers: { "x-forwarded-for": ip },
  });
}

function withParams(
  id: string,
): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

describe("/api/cristiano/verdicts/[id] — module surface", () => {
  it("exposes GET + force-dynamic", async () => {
    const mod = await import("@/app/api/cristiano/verdicts/[id]/route");
    expect(typeof mod.GET).toBe("function");
    expect(mod.dynamic).toBe("force-dynamic");
  });
});

describe("/api/cristiano/verdicts/[id] — auth", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 503 when STUB_USER_ID is unset", async () => {
    const { GET } = await import("@/app/api/cristiano/verdicts/[id]/route");
    const goodUuid = "00000000-0000-0000-0000-0000000000aa";
    const res = await GET(
      makeGet(goodUuid, "9.9.10.2") as never,
      withParams(goodUuid),
    );
    expect(res.status).toBe(503);
  });
});

describe("/api/cristiano/verdicts/[id] — id validation", () => {
  beforeEach(() => {
    vi.stubEnv("STUB_USER_ID", "00000000-0000-0000-0000-000000000001");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects a non-UUID id with 400", async () => {
    const { GET } = await import("@/app/api/cristiano/verdicts/[id]/route");
    const res = await GET(
      makeGet("not-a-uuid", "9.9.10.10") as never,
      withParams("not-a-uuid"),
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/UUID/i);
  });
});

describe("/api/cristiano/verdicts/[id] — rate limiting", () => {
  beforeEach(() => {
    vi.stubEnv("STUB_USER_ID", "00000000-0000-0000-0000-000000000001");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 429 once the per-IP bucket (60/min) is exhausted", async () => {
    const { GET } = await import("@/app/api/cristiano/verdicts/[id]/route");
    const ip = `9.9.10.${200 + Math.floor(Math.random() * 30)}`;
    let lastStatus = 0;

    for (let i = 0; i < 65; i += 1) {
      const res = await GET(
        makeGet("bad-id", ip) as never,
        withParams("bad-id"),
      );
      lastStatus = res.status;
      if (res.status === 429) break;
    }

    expect(lastStatus).toBe(429);
  });
});
