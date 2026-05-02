/**
 * `/api/olivia/chat` — route handler contract & integration tests.
 *
 * Coverage targets:
 * - Validation: malformed JSON, missing/empty/oversized message, bad uuid.
 * - Unconfigured mode: no `ANTHROPIC_API_KEY` returns the structured
 *   fallback reply, still persists the user + assistant turns, status 200.
 * - Configured mode: happy path returns the model's text, persists turns,
 *   returns a valid conversation/message id pair.
 * - Conversation id: reused when provided; generated when omitted.
 * - Resilience: thrown errors from the model fall back to a polite reply
 *   (status 200, mode: "fallback"), turns still persist.
 * - Rate limiting: the per-IP bucket returns 429 once exhausted.
 *
 * Tests mock `@/lib/config/env` (so each test controls
 * `ANTHROPIC_API_KEY`) and `ai` (so `generateText` never reaches a real
 * vendor). The conversation store is real but runs in its in-memory mode
 * because the mocked env never sets `SUPABASE_URL` — this exercises the
 * persistence code path end-to-end without standing up Postgres.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* ─── Module mocks ───────────────────────────────────────────────────────── */

const baseEnv = {
  NODE_ENV: "test" as const,
  NEXT_PUBLIC_APP_NAME: "Olivia Brain",
  APP_AI_MODE: "auto" as const,
  ANTHROPIC_MODEL_PRIMARY: "claude-sonnet-4-6",
  ANTHROPIC_MODEL_JUDGE: "claude-opus-4-6",
  OPENAI_MODEL_PRIMARY: "gpt-5.4-pro",
  OPENAI_MODEL_REASONING: "gpt-5.4-pro",
  GOOGLE_MODEL_PRIMARY: "gemini-3.1-pro",
  XAI_MODEL_PRIMARY: "grok-4",
  PERPLEXITY_MODEL_PRIMARY: "sonar-reasoning-pro",
  MISTRAL_MODEL_PRIMARY: "mistral-large-latest",
  GROQ_MODEL_PRIMARY: "llama-3.3-70b-versatile",
  ELEVENLABS_OLIVIA_VOICE_ID: "rVk0ZvRulp6xrYJkGztP",
  ELEVENLABS_VOICE_OLIVIA: "21m00Tcm4TlvDq8ikWAM",
  ELEVENLABS_VOICE_CRISTIANO: "yoZ06aMxZJJ28mfd3POQ",
  ELEVENLABS_VOICE_EMELIA: "EXAVITQu4vr4xnSDxMaL",
  OPENAI_TTS_MODEL: "tts-1-hd",
  OPENAI_TTS_VOICE: "nova",
  OPENAI_WHISPER_MODEL: "whisper-1",
  LANGFUSE_BASE_URL: "https://cloud.langfuse.com",
} as Record<string, unknown>;

const envState: { current: Record<string, unknown> } = { current: { ...baseEnv } };

vi.mock("@/lib/config/env", () => ({
  getServerEnv: () => envState.current,
}));

const generateTextMock = vi.fn();

vi.mock("ai", () => ({
  generateText: (...args: unknown[]) => generateTextMock(...args),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: (modelId: string) => ({ id: modelId, kind: "anthropic-model" }),
}));

/* ─── Imports under test ─────────────────────────────────────────────────── */

import { POST } from "../route";
import { getConversationStore } from "@/lib/memory/store";

/* ─── Helpers ────────────────────────────────────────────────────────────── */

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
  envState.current = { ...baseEnv };
  generateTextMock.mockReset();
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

/* ─── Unconfigured mode ─────────────────────────────────────────────────── */

describe("POST /api/olivia/chat · unconfigured mode", () => {
  it("returns a structured fallback reply when ANTHROPIC_API_KEY is missing", async () => {
    envState.current = { ...baseEnv, ANTHROPIC_API_KEY: undefined };

    const res = await POST(makeRequest({ message: "hello" }));
    expect(res.status).toBe(200);

    const body = await readJson(res);
    expect(typeof body.reply).toBe("string");
    expect(body.reply).toMatch(/not yet configured/i);
    expect(body.conversationId).toBeTypeOf("string");
    expect(body.messageId).toBeTypeOf("string");
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("still persists user + assistant turns in unconfigured mode", async () => {
    envState.current = { ...baseEnv, ANTHROPIC_API_KEY: undefined };

    const res = await POST(makeRequest({ message: "ping" }));
    const body = await readJson(res);
    const conversationId = body.conversationId as string;

    const turns = await getConversationStore().getRecentTurns(conversationId, 10);
    expect(turns).toHaveLength(2);
    expect(turns[0].role).toBe("user");
    expect(turns[0].content).toBe("ping");
    expect(turns[1].role).toBe("assistant");
    expect(turns[1].content).toMatch(/not yet configured/i);
    expect((turns[1].metadata as Record<string, unknown>).mode).toBe(
      "fallback",
    );
  });
});

/* ─── Configured (live) mode ────────────────────────────────────────────── */

describe("POST /api/olivia/chat · configured mode", () => {
  beforeEach(() => {
    envState.current = { ...baseEnv, ANTHROPIC_API_KEY: "test-key" };
  });

  it("calls generateText with the configured model and returns its text", async () => {
    generateTextMock.mockResolvedValueOnce({ text: "Hello from Olivia." });

    const res = await POST(makeRequest({ message: "What's up?" }));
    expect(res.status).toBe(200);

    const body = await readJson(res);
    expect(body.reply).toBe("Hello from Olivia.");
    expect(generateTextMock).toHaveBeenCalledTimes(1);

    const callArg = generateTextMock.mock.calls[0][0] as Record<string, unknown>;
    expect((callArg.model as { id: string }).id).toBe("claude-sonnet-4-6");
    expect(callArg.prompt).toBe("What's up?");
    expect(callArg.system).toMatch(/Olivia/);
    expect(callArg.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it("appends pageContext / pipelineContext / documentContext to the system prompt", async () => {
    generateTextMock.mockResolvedValueOnce({ text: "ack" });

    await POST(
      makeRequest({
        message: "context check",
        pageContext: "/studio/pitch",
        pipelineContext: { pipelineStep: "draft" },
        documentContext: { documentId: "doc_42", documentTitle: "Pitch" },
      }),
    );

    const callArg = generateTextMock.mock.calls[0][0] as Record<string, unknown>;
    const system = callArg.system as string;
    expect(system).toMatch(/User is on page: \/studio\/pitch/);
    expect(system).toMatch(/Pipeline context:/);
    expect(system).toMatch(/Document context:/);
  });

  it("persists user + assistant turns with provider metadata", async () => {
    generateTextMock.mockResolvedValueOnce({ text: "Persisted reply." });

    const res = await POST(makeRequest({ message: "store me" }));
    const body = await readJson(res);
    const conversationId = body.conversationId as string;

    const turns = await getConversationStore().getRecentTurns(conversationId, 10);
    expect(turns).toHaveLength(2);
    expect(turns[0].role).toBe("user");
    expect(turns[0].content).toBe("store me");
    expect(turns[1].role).toBe("assistant");
    expect(turns[1].content).toBe("Persisted reply.");
    const meta = turns[1].metadata as Record<string, unknown>;
    expect(meta.provider).toBe("anthropic");
    expect(meta.model).toBe("claude-sonnet-4-6");
    expect(meta.mode).toBe("live");
  });

  it("generates a new conversationId when none is supplied", async () => {
    generateTextMock.mockResolvedValueOnce({ text: "new convo" });

    const res = await POST(makeRequest({ message: "hi" }));
    const body = await readJson(res);
    expect(body.conversationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("reuses the supplied conversationId", async () => {
    generateTextMock.mockResolvedValueOnce({ text: "echoed" });

    const conversationId = crypto.randomUUID();
    const res = await POST(makeRequest({ message: "hi", conversationId }));
    const body = await readJson(res);
    expect(body.conversationId).toBe(conversationId);
  });
});

/* ─── Resilience ────────────────────────────────────────────────────────── */

describe("POST /api/olivia/chat · resilience", () => {
  beforeEach(() => {
    envState.current = { ...baseEnv, ANTHROPIC_API_KEY: "test-key" };
  });

  it("returns a fallback reply when generateText throws (status stays 200)", async () => {
    generateTextMock.mockRejectedValueOnce(new Error("vendor blew up"));

    const res = await POST(makeRequest({ message: "hi" }));
    expect(res.status).toBe(200);

    const body = await readJson(res);
    expect(body.reply).toMatch(/unexpected error/i);
  });

  it("returns a timeout-flavoured fallback when generateText aborts", async () => {
    const abort = new DOMException("aborted", "AbortError");
    generateTextMock.mockRejectedValueOnce(abort);

    const res = await POST(makeRequest({ message: "slow" }));
    const body = await readJson(res);
    expect(body.reply).toMatch(/longer than expected/i);
  });

  it("flags fallback turns with mode: 'fallback' in metadata", async () => {
    generateTextMock.mockRejectedValueOnce(new Error("boom"));

    const res = await POST(makeRequest({ message: "fail" }));
    const body = await readJson(res);
    const conversationId = body.conversationId as string;

    const turns = await getConversationStore().getRecentTurns(conversationId, 10);
    const meta = turns[1].metadata as Record<string, unknown>;
    expect(meta.mode).toBe("fallback");
  });
});

/* ─── Rate limiting ─────────────────────────────────────────────────────── */

describe("POST /api/olivia/chat · rate limiting", () => {
  it("returns 429 once the per-IP bucket is exhausted", async () => {
    envState.current = { ...baseEnv, ANTHROPIC_API_KEY: "test-key" };
    generateTextMock.mockResolvedValue({ text: "ok" });

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
