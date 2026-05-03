/**
 * `/api/olivia/chat` — route handler contract & integration tests.
 *
 * Coverage targets (Session 5 cascade refactor):
 *
 * - **Validation** — malformed JSON, missing/empty/oversized message,
 *   bad uuid → 400.
 * - **Cascade integration** — first-provider success: cascade is called
 *   with the right intent / message / recalled context shape, the
 *   assistant turn carries provider+model+attempts metadata, the response
 *   reflects the cascade's text.
 * - **Mock-mode short-circuit** — when the cascade returns
 *   `runtimeMode: "mock"`, the route persists the assistant turn with
 *   `mode: "mock"` and still returns 200.
 * - **Forced-fault failover** — cascade reports `attempts: [anthropic
 *   fail, openai success]` and `providerId: "openai"`; the route
 *   surfaces openai's text and persists both attempts in metadata.
 * - **Intent classification** — math-keyword message routes to
 *   `intent: "math"` in the cascade input.
 * - **Resilience** — cascade throws → route returns 500 (never silently
 *   swallows; persistence layer is supposed to be infallible via the
 *   safe-store wrapper). Cascade returning a `runtimeMode: "mock"` for
 *   an unconfigured environment is the documented graceful path.
 * - **Rate limiting** — per-IP bucket returns 429 once exhausted.
 *
 * Tests mock `@/lib/services/model-cascade` (so cascade behaviour can be
 * pinned per test), `@/lib/foundation/status` (so `buildIntegrationSnapshot`
 * is deterministic), and use the real conversation store in its in-memory
 * mode (no `SUPABASE_URL` set in the test env, so `getConversationStore`
 * returns the in-memory implementation — exercises the persistence path
 * end-to-end without standing up Postgres).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ProviderAttempt, ProviderId, RuntimeMode } from "@/lib/foundation/types";

/* ─── Local types (mirror model-cascade's internal CascadeResult) ────────── */

interface CascadeResult {
  text: string;
  providerId: ProviderId | "mock";
  modelId: string;
  attempts: ProviderAttempt[];
  runtimeMode: RuntimeMode;
}

/* ─── Module mocks ───────────────────────────────────────────────────────── */

const runModelCascadeMock = vi.fn();

vi.mock("@/lib/services/model-cascade", () => ({
  runModelCascade: (...args: unknown[]) => runModelCascadeMock(...args),
}));

vi.mock("@/lib/foundation/status", () => ({
  getFoundationStatus: () => ({
    generatedAt: new Date().toISOString(),
    runtimeMode: "live" as const,
    appName: "Olivia Brain",
    providers: [],
    integrations: [
      { id: "anthropic", label: "Anthropic", group: "platform" as const, configured: true, status: "configured" as const, purpose: "" },
      { id: "openai", label: "OpenAI", group: "platform" as const, configured: false, status: "missing" as const, purpose: "" },
    ],
    memory: { backend: "in-memory" as const, vectorReady: false, personalizationReady: false },
    observability: { backend: "local-trace-store" as const, ragasReady: false },
    recommendedNextActions: [],
  }),
  getProviderStatuses: () => [],
}));

/* ─── Imports under test ─────────────────────────────────────────────────── */

import { POST } from "../route";
import { getConversationStore } from "@/lib/memory/store";

/* ─── Helpers ────────────────────────────────────────────────────────────── */

type CascadeInput = {
  conversationId: string;
  message: string;
  intent: string;
  recalledContext: string[];
  integrationSnapshot: Record<string, string>;
};

function makeCascadeResult(
  overrides: Partial<CascadeResult> = {},
): CascadeResult {
  return {
    text: "Olivia replies.",
    providerId: "anthropic",
    modelId: "claude-sonnet-4-6",
    attempts: [
      {
        providerId: "anthropic",
        modelId: "claude-sonnet-4-6",
        success: true,
        durationMs: 142,
      },
    ],
    runtimeMode: "live",
    ...overrides,
  };
}

function makeRequest(
  body: unknown,
  opts: { ip?: string; rawBody?: string } = {},
) {
  const init: RequestInit = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": opts.ip ?? `${Math.random().toString(36).slice(2)}-test`,
    },
    body: opts.rawBody ?? JSON.stringify(body),
  };
  return new Request("http://localhost/api/olivia/chat", init) as unknown as
    Parameters<typeof POST>[0];
}

async function readJson(res: Response) {
  return res.json() as Promise<Record<string, unknown>>;
}

beforeEach(() => {
  runModelCascadeMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/* ─── Validation ────────────────────────────────────────────────────────── */

describe("POST /api/olivia/chat · validation", () => {
  it("returns 400 on malformed JSON body", async () => {
    const res = await POST(makeRequest(undefined, { rawBody: "{not json" }));
    expect(res.status).toBe(400);
    const body = await readJson(res);
    expect(body.error).toBeTruthy();
    expect(runModelCascadeMock).not.toHaveBeenCalled();
  });

  it("returns 400 when message is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when message is whitespace-only", async () => {
    const res = await POST(makeRequest({ message: "   \n  " }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when message exceeds 8000 chars", async () => {
    const huge = "x".repeat(8_001);
    const res = await POST(makeRequest({ message: huge }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when conversationId is not a uuid", async () => {
    const res = await POST(
      makeRequest({ message: "hello", conversationId: "not-a-uuid" }),
    );
    expect(res.status).toBe(400);
  });
});

/* ─── Cascade integration (live, first-provider success) ────────────────── */

describe("POST /api/olivia/chat · cascade walk", () => {
  it("invokes runModelCascade with the parsed input shape", async () => {
    runModelCascadeMock.mockResolvedValueOnce(
      makeCascadeResult({ text: "from cascade" }),
    );

    const res = await POST(
      makeRequest({
        message: "draft me a roadmap for the system architecture",
        pageContext: "/studio/pitch",
      }),
    );
    expect(res.status).toBe(200);
    expect(runModelCascadeMock).toHaveBeenCalledTimes(1);

    const input = runModelCascadeMock.mock.calls[0][0] as CascadeInput;
    expect(input.message).toBe(
      "draft me a roadmap for the system architecture",
    );
    expect(input.intent).toBe("planning"); // matches "roadmap" / "architecture" / "system"
    expect(input.conversationId).toBeTypeOf("string");
    expect(Array.isArray(input.recalledContext)).toBe(true);
    expect(input.integrationSnapshot).toEqual(
      expect.objectContaining({ anthropic: "configured" }),
    );
  });

  it("returns the cascade's text as the reply", async () => {
    runModelCascadeMock.mockResolvedValueOnce(
      makeCascadeResult({ text: "Hello from the cascade." }),
    );

    const res = await POST(makeRequest({ message: "hi" }));
    const body = await readJson(res);
    expect(body.reply).toBe("Hello from the cascade.");
  });

  it("persists user + assistant turns with cascade metadata", async () => {
    runModelCascadeMock.mockResolvedValueOnce(
      makeCascadeResult({
        text: "Persisted reply.",
        providerId: "anthropic",
        modelId: "claude-sonnet-4-6",
      }),
    );

    const res = await POST(makeRequest({ message: "store me" }));
    const body = await readJson(res);
    const conversationId = body.conversationId as string;

    const turns = await getConversationStore().getRecentTurns(conversationId, 10);
    expect(turns).toHaveLength(2);

    expect(turns[0].role).toBe("user");
    expect(turns[0].content).toBe("store me");
    expect((turns[0].metadata as Record<string, unknown>).intent).toBeTypeOf(
      "string",
    );

    expect(turns[1].role).toBe("assistant");
    expect(turns[1].content).toBe("Persisted reply.");
    const meta = turns[1].metadata as Record<string, unknown>;
    expect(meta.provider).toBe("anthropic");
    expect(meta.model).toBe("claude-sonnet-4-6");
    expect(meta.runtimeMode).toBe("live");
    expect(meta.mode).toBe("live");
    expect(Array.isArray(meta.attempts)).toBe(true);
  });

  it("generates a new conversationId when none is supplied", async () => {
    runModelCascadeMock.mockResolvedValueOnce(makeCascadeResult());

    const res = await POST(makeRequest({ message: "hi" }));
    const body = await readJson(res);
    expect(body.conversationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("reuses the supplied conversationId", async () => {
    runModelCascadeMock.mockResolvedValueOnce(makeCascadeResult());

    const conversationId = crypto.randomUUID();
    const res = await POST(makeRequest({ message: "hi", conversationId }));
    const body = await readJson(res);
    expect(body.conversationId).toBe(conversationId);
  });
});

/* ─── Intent classification ──────────────────────────────────────────────── */

describe("POST /api/olivia/chat · intent classification", () => {
  it("routes math-keyword messages to intent: 'math'", async () => {
    runModelCascadeMock.mockResolvedValueOnce(makeCascadeResult());

    await POST(makeRequest({ message: "calculate the average revenue" }));
    const input = runModelCascadeMock.mock.calls[0][0] as CascadeInput;
    expect(input.intent).toBe("math");
  });

  it("routes judge-keyword messages to intent: 'judge'", async () => {
    runModelCascadeMock.mockResolvedValueOnce(makeCascadeResult());

    await POST(makeRequest({ message: "give me your final verdict" }));
    const input = runModelCascadeMock.mock.calls[0][0] as CascadeInput;
    expect(input.intent).toBe("judge");
  });

  it("falls through to 'general' when nothing matches", async () => {
    runModelCascadeMock.mockResolvedValueOnce(makeCascadeResult());

    await POST(makeRequest({ message: "thanks" }));
    const input = runModelCascadeMock.mock.calls[0][0] as CascadeInput;
    expect(input.intent).toBe("general");
  });
});

/* ─── Forced-fault failover ─────────────────────────────────────────────── */

describe("POST /api/olivia/chat · failover", () => {
  it("surfaces the second provider's text and persists both attempts", async () => {
    runModelCascadeMock.mockResolvedValueOnce(
      makeCascadeResult({
        text: "OpenAI took over.",
        providerId: "openai",
        modelId: "gpt-5.4-pro",
        attempts: [
          {
            providerId: "anthropic",
            modelId: "claude-sonnet-4-6",
            success: false,
            durationMs: 87,
            error: "forced fault",
          },
          {
            providerId: "openai",
            modelId: "gpt-5.4-pro",
            success: true,
            durationMs: 211,
          },
        ],
        runtimeMode: "live",
      }),
    );

    const res = await POST(makeRequest({ message: "hi" }));
    const body = await readJson(res);
    expect(body.reply).toBe("OpenAI took over.");

    const turns = await getConversationStore().getRecentTurns(
      body.conversationId as string,
      10,
    );
    const meta = turns[1].metadata as Record<string, unknown>;
    expect(meta.provider).toBe("openai");
    expect(meta.model).toBe("gpt-5.4-pro");
    const attempts = meta.attempts as Array<Record<string, unknown>>;
    expect(attempts).toHaveLength(2);
    expect(attempts[0].providerId).toBe("anthropic");
    expect(attempts[0].success).toBe(false);
    expect(attempts[1].providerId).toBe("openai");
    expect(attempts[1].success).toBe(true);
  });

  it("strips error text from persisted attempts (no PII leak)", async () => {
    runModelCascadeMock.mockResolvedValueOnce(
      makeCascadeResult({
        attempts: [
          {
            providerId: "anthropic",
            modelId: "claude-sonnet-4-6",
            success: false,
            durationMs: 50,
            error:
              "401 Unauthorized — Bearer token leaked: sk-ant-api03-XXXXX",
          },
        ],
        providerId: "openai",
        modelId: "gpt-5.4-pro",
      }),
    );

    const res = await POST(makeRequest({ message: "ok" }));
    const body = await readJson(res);
    const turns = await getConversationStore().getRecentTurns(
      body.conversationId as string,
      10,
    );
    const meta = turns[1].metadata as Record<string, unknown>;
    const attempts = meta.attempts as Array<Record<string, unknown>>;
    expect(attempts[0]).not.toHaveProperty("error");
    expect(JSON.stringify(attempts)).not.toContain("sk-ant-api03");
  });
});

/* ─── Mock-mode short-circuit ───────────────────────────────────────────── */

describe("POST /api/olivia/chat · mock-mode", () => {
  it("flags the assistant turn as mode: 'mock' when cascade returns mock", async () => {
    runModelCascadeMock.mockResolvedValueOnce(
      makeCascadeResult({
        text: "Mock-mode reply.",
        providerId: "mock",
        modelId: "phase1-local-fallback",
        attempts: [],
        runtimeMode: "mock",
      }),
    );

    const res = await POST(makeRequest({ message: "hi" }));
    expect(res.status).toBe(200);

    const body = await readJson(res);
    expect(body.reply).toBe("Mock-mode reply.");

    const turns = await getConversationStore().getRecentTurns(
      body.conversationId as string,
      10,
    );
    const meta = turns[1].metadata as Record<string, unknown>;
    expect(meta.runtimeMode).toBe("mock");
    expect(meta.mode).toBe("mock");
    expect(meta.provider).toBe("mock");
  });
});

/* ─── Resilience ────────────────────────────────────────────────────────── */

describe("POST /api/olivia/chat · resilience", () => {
  it("returns 500 when the cascade itself throws", async () => {
    runModelCascadeMock.mockRejectedValueOnce(new Error("cascade exploded"));

    const res = await POST(makeRequest({ message: "hi" }));
    expect(res.status).toBe(500);
    const body = await readJson(res);
    expect(body.error).toBeTruthy();
  });
});

/* ─── Rate limiting ─────────────────────────────────────────────────────── */

describe("POST /api/olivia/chat · rate limiting", () => {
  it("returns 429 once the per-IP bucket is exhausted", async () => {
    runModelCascadeMock.mockResolvedValue(makeCascadeResult());

    const ip = `ratelimit-${crypto.randomUUID()}`;
    let lastStatus = 0;

    for (let i = 0; i < 31; i += 1) {
      const res = await POST(makeRequest({ message: "ping" }, { ip }));
      lastStatus = res.status;
      if (res.status === 429) break;
    }

    expect(lastStatus).toBe(429);
  });
});
