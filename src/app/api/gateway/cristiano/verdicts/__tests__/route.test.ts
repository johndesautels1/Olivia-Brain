/**
 * `/api/gateway/cristiano/verdicts` — surface-contract tests.
 *
 * Covers the auth + validation + cross-app-forgery branches that
 * return BEFORE Prisma is hit. Persistence-level coverage at
 * integration time once Clerk + Postgres test instance land.
 *
 * Held to Apple / Microsoft / Google 2026 leading coding practices per
 * `~/CLAUDE.md` and `docs/api-specs/_MASTER_REGISTER.md §10.4`.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const BASE = "http://localhost/api/gateway/cristiano/verdicts";
// Valid RFC 4122 v4 UUID (version nibble = 4, variant nibble = 8) so
// Zod 4's strict z.string().uuid() accepts it.
const VALID_USER_ID = "00000000-0000-4000-8000-000000000001";
const VALID_FREEFORM_BODY = {
  spokenScript: "Good day. I am Cristiano. Delay the hire.",
  verdictTitle: "Timing the CTO hire",
  confidence: "medium" as const,
  recommendation: "Delay until post-Series A.",
  rationale: "Cash runway constraint dominates.",
  keyFactors: ["Runway", "Stage signal"],
};

beforeAll(async () => {
  await import("@/app/api/gateway/cristiano/verdicts/route");
}, 60_000);

function makePost(body: unknown, headers: Record<string, string>): Request {
  return new Request(BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function validBody(overrides: Partial<Record<string, unknown>> = {}): unknown {
  return {
    kind: "freeform",
    sourceApp: "ltm",
    externalId: "ltm-analysis-abc-123",
    requestPayload: { question: "Should we hire a CTO now?" },
    verdictBody: VALID_FREEFORM_BODY,
    ...overrides,
  };
}

describe("/api/gateway/cristiano/verdicts — module surface", () => {
  it("exposes POST + force-dynamic", async () => {
    const mod = await import("@/app/api/gateway/cristiano/verdicts/route");
    expect(typeof mod.POST).toBe("function");
    expect(mod.dynamic).toBe("force-dynamic");
  });
});

describe("/api/gateway/cristiano/verdicts — auth", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 503 when no gateway tokens are configured", async () => {
    const { POST } = await import(
      "@/app/api/gateway/cristiano/verdicts/route"
    );
    const res = await POST(
      makePost(validBody(), {
        Authorization: "Bearer any-token",
        "X-Cristiano-User-Id": VALID_USER_ID,
        "x-forwarded-for": "10.0.0.1",
      }) as never,
    );
    expect(res.status).toBe(503);
  });

  it("returns 401 missing_header when Authorization header is absent", async () => {
    vi.stubEnv("GATEWAY_TOKEN_LTM", "ltm-secret");
    const { POST } = await import(
      "@/app/api/gateway/cristiano/verdicts/route"
    );
    const res = await POST(
      makePost(validBody(), {
        "X-Cristiano-User-Id": VALID_USER_ID,
        "x-forwarded-for": "10.0.0.2",
      }) as never,
    );
    expect(res.status).toBe(401);
    const data = (await res.json()) as { reason: string };
    expect(data.reason).toBe("missing_header");
  });

  it("returns 401 malformed_header for non-Bearer scheme", async () => {
    vi.stubEnv("GATEWAY_TOKEN_LTM", "ltm-secret");
    const { POST } = await import(
      "@/app/api/gateway/cristiano/verdicts/route"
    );
    const res = await POST(
      makePost(validBody(), {
        Authorization: "Basic abc",
        "X-Cristiano-User-Id": VALID_USER_ID,
        "x-forwarded-for": "10.0.0.3",
      }) as never,
    );
    expect(res.status).toBe(401);
    const data = (await res.json()) as { reason: string };
    expect(data.reason).toBe("malformed_header");
  });

  it("returns 401 unknown_token when token doesn't match any env var", async () => {
    vi.stubEnv("GATEWAY_TOKEN_LTM", "ltm-secret");
    const { POST } = await import(
      "@/app/api/gateway/cristiano/verdicts/route"
    );
    const res = await POST(
      makePost(validBody(), {
        Authorization: "Bearer wrong-token",
        "X-Cristiano-User-Id": VALID_USER_ID,
        "x-forwarded-for": "10.0.0.4",
      }) as never,
    );
    expect(res.status).toBe(401);
    const data = (await res.json()) as { reason: string };
    expect(data.reason).toBe("unknown_token");
  });
});

describe("/api/gateway/cristiano/verdicts — user header validation", () => {
  beforeEach(() => {
    vi.stubEnv("GATEWAY_TOKEN_LTM", "ltm-secret");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects missing X-Cristiano-User-Id with 400", async () => {
    const { POST } = await import(
      "@/app/api/gateway/cristiano/verdicts/route"
    );
    const res = await POST(
      makePost(validBody(), {
        Authorization: "Bearer ltm-secret",
        "x-forwarded-for": "10.0.0.5",
      }) as never,
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/X-Cristiano-User-Id/);
  });

  it("rejects a non-UUID X-Cristiano-User-Id with 400", async () => {
    const { POST } = await import(
      "@/app/api/gateway/cristiano/verdicts/route"
    );
    const res = await POST(
      makePost(validBody(), {
        Authorization: "Bearer ltm-secret",
        "X-Cristiano-User-Id": "not-a-uuid",
        "x-forwarded-for": "10.0.0.6",
      }) as never,
    );
    expect(res.status).toBe(400);
  });
});

describe("/api/gateway/cristiano/verdicts — body validation", () => {
  beforeEach(() => {
    vi.stubEnv("GATEWAY_TOKEN_LTM", "ltm-secret");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects unparseable JSON with 400", async () => {
    const { POST } = await import(
      "@/app/api/gateway/cristiano/verdicts/route"
    );
    const res = await POST(
      makePost("not-json", {
        Authorization: "Bearer ltm-secret",
        "X-Cristiano-User-Id": VALID_USER_ID,
        "x-forwarded-for": "10.0.0.10",
      }) as never,
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/Invalid JSON/i);
  });

  it("rejects an unknown kind with 400", async () => {
    const { POST } = await import(
      "@/app/api/gateway/cristiano/verdicts/route"
    );
    const res = await POST(
      makePost(validBody({ kind: "not_a_kind" }), {
        Authorization: "Bearer ltm-secret",
        "X-Cristiano-User-Id": VALID_USER_ID,
        "x-forwarded-for": "10.0.0.11",
      }) as never,
    );
    expect(res.status).toBe(400);
  });

  it("rejects an unknown sourceApp with 400", async () => {
    const { POST } = await import(
      "@/app/api/gateway/cristiano/verdicts/route"
    );
    const res = await POST(
      makePost(validBody({ sourceApp: "fake-app" }), {
        Authorization: "Bearer ltm-secret",
        "X-Cristiano-User-Id": VALID_USER_ID,
        "x-forwarded-for": "10.0.0.12",
      }) as never,
    );
    expect(res.status).toBe(400);
  });

  it("rejects a verdictBody shape mismatch with 400", async () => {
    const { POST } = await import(
      "@/app/api/gateway/cristiano/verdicts/route"
    );
    // freeform body shape sent under kind=startup_match — strict
    // kind validator should catch it after envelope passes.
    const res = await POST(
      makePost(
        validBody({ kind: "startup_match", verdictBody: VALID_FREEFORM_BODY }),
        {
          Authorization: "Bearer ltm-secret",
          "X-Cristiano-User-Id": VALID_USER_ID,
          "x-forwarded-for": "10.0.0.13",
        },
      ) as never,
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/kind-specific/i);
  });

  it("rejects an invalid preRenderedVideoUrl with 400", async () => {
    const { POST } = await import(
      "@/app/api/gateway/cristiano/verdicts/route"
    );
    const res = await POST(
      makePost(validBody({ preRenderedVideoUrl: "not-a-url" }), {
        Authorization: "Bearer ltm-secret",
        "X-Cristiano-User-Id": VALID_USER_ID,
        "x-forwarded-for": "10.0.0.14",
      }) as never,
    );
    expect(res.status).toBe(400);
  });
});

describe("/api/gateway/cristiano/verdicts — cross-app forgery guard", () => {
  beforeEach(() => {
    vi.stubEnv("GATEWAY_TOKEN_LTM", "ltm-secret");
    vi.stubEnv("GATEWAY_TOKEN_LIFESCORE", "lifescore-secret");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects LTM-bearer pushing a verdict tagged sourceApp='lifescore' with 403", async () => {
    const { POST } = await import(
      "@/app/api/gateway/cristiano/verdicts/route"
    );
    const res = await POST(
      makePost(validBody({ sourceApp: "lifescore" }), {
        Authorization: "Bearer ltm-secret",
        "X-Cristiano-User-Id": VALID_USER_ID,
        "x-forwarded-for": "10.0.0.20",
      }) as never,
    );
    expect(res.status).toBe(403);
    const data = (await res.json()) as { error: string };
    expect(data.error).toMatch(/mismatch/i);
  });

  it("accepts the matching pair (ltm bearer + sourceApp=ltm) past the guard", async () => {
    // This will then fail at Prisma since there's no DB connection
    // — but past the 403 forgery guard. We assert NOT 403.
    const { POST } = await import(
      "@/app/api/gateway/cristiano/verdicts/route"
    );
    const res = await POST(
      makePost(validBody({ sourceApp: "ltm" }), {
        Authorization: "Bearer ltm-secret",
        "X-Cristiano-User-Id": VALID_USER_ID,
        "x-forwarded-for": "10.0.0.21",
      }) as never,
    );
    expect(res.status).not.toBe(403);
  });
});
