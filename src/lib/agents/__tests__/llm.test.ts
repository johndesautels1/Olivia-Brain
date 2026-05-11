/**
 * Agent LLM bridge — callLLM contract tests
 *
 * Exercises the 7-provider fan-out plus opt-in web-search variants
 * via a stubbed global fetch. No network is touched; every test asserts
 * on the Request URL, headers, and body that the provider-specific code
 * paths would send.
 *
 * Two design invariants this suite locks down:
 *   1. Graceful degradation — missing API key, fetch throw, non-2xx, and
 *      empty-text responses all resolve to `null` (never throw).
 *   2. Search opt-in is honoured per provider — NO_SEARCH_MODELS short-
 *      circuit, Perplexity always reports `webSearchUsed=true`, and each
 *      tool-capable provider hits the right endpoint/tool combination.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { callLLM } from "../llm";

const ORIGINAL_FETCH = global.fetch;
const ORIGINAL_ENV = { ...process.env };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = "test-anthropic";
  process.env.OPENAI_API_KEY = "test-openai";
  process.env.GOOGLE_AI_API_KEY = "test-google";
  process.env.XAI_API_KEY = "test-xai";
  process.env.PERPLEXITY_API_KEY = "test-perplexity";
});

afterEach(() => {
  global.fetch = ORIGINAL_FETCH;
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

const BASE_OPTS = {
  systemPrompt: "you are a tester",
  userPrompt: "say hi",
  temperature: 0.4,
  maxTokens: 256,
  timeoutMs: 5_000,
};

// ─────────────────────────────────────────────
// Graceful degradation
// ─────────────────────────────────────────────

describe("callLLM · graceful degradation", () => {
  it("returns null when the model's API key is missing", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const result = await callLLM({ ...BASE_OPTS, model: "claude-sonnet-4-6" });
    expect(result).toBeNull();
  });

  it("returns null when fetch throws", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("boom"));
    const result = await callLLM({ ...BASE_OPTS, model: "gpt-4o" });
    expect(result).toBeNull();
  });

  it("returns null on non-2xx response", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response("internal error", { status: 500 }),
      );
    const result = await callLLM({ ...BASE_OPTS, model: "gpt-4o" });
    expect(result).toBeNull();
  });

  it("returns null when the upstream returns an empty text body", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        choices: [{ message: { content: "   " } }],
        usage: { prompt_tokens: 1, completion_tokens: 0 },
      }),
    );
    const result = await callLLM({ ...BASE_OPTS, model: "gpt-4o" });
    expect(result).toBeNull();
  });

  it("falls back to gpt-4o config when an unknown model is requested", async () => {
    // Unknown model → resolveModel returns gpt-4o config → uses OPENAI_API_KEY.
    delete process.env.OPENAI_API_KEY;
    const result = await callLLM({ ...BASE_OPTS, model: "no-such-model" });
    expect(result).toBeNull();
  });
});

// ─────────────────────────────────────────────
// Anthropic (no search)
// ─────────────────────────────────────────────

describe("callLLM · Anthropic Messages (no search)", () => {
  it("hits the Messages endpoint with x-api-key + system + user", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({
        content: [{ type: "text", text: "hello" }],
        usage: { input_tokens: 10, output_tokens: 5 },
      }),
    );
    global.fetch = fetchSpy;

    const result = await callLLM({ ...BASE_OPTS, model: "claude-sonnet-4-6" });

    expect(result).not.toBeNull();
    expect(result!.text).toBe("hello");
    expect(result!.provider).toBe("anthropic");
    expect(result!.inputTokens).toBe(10);
    expect(result!.outputTokens).toBe(5);
    expect(result!.tokensUsed).toBe(15);
    expect(result!.webSearchUsed).toBe(false);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toBe("https://api.anthropic.com/v1/messages");
    const headers = init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("test-anthropic");
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("claude-sonnet-4-6");
    expect(body.messages[0].content).toBe("say hi");
    expect(body.tools).toBeUndefined();
  });

  it("computes cost from per-1M pricing", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        content: [{ type: "text", text: "x" }],
        usage: { input_tokens: 1_000_000, output_tokens: 1_000_000 },
      }),
    );
    const result = await callLLM({ ...BASE_OPTS, model: "claude-sonnet-4-6" });
    // 1M input @ $3 + 1M output @ $15 = $18.0
    expect(result!.costUsd).toBeCloseTo(18, 5);
  });
});

// ─────────────────────────────────────────────
// OpenAI (no search)
// ─────────────────────────────────────────────

describe("callLLM · OpenAI Chat Completions (no search)", () => {
  it("hits the chat-completions endpoint with Bearer auth", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({
        choices: [{ message: { content: "ok" } }],
        usage: { prompt_tokens: 4, completion_tokens: 2 },
      }),
    );
    global.fetch = fetchSpy;

    const result = await callLLM({ ...BASE_OPTS, model: "gpt-4o" });
    expect(result!.provider).toBe("openai");
    expect(result!.text).toBe("ok");
    expect(result!.tokensUsed).toBe(6);
    expect(result!.webSearchUsed).toBe(false);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toBe("https://api.openai.com/v1/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer test-openai",
    );
    const body = JSON.parse(init.body as string);
    expect(body.messages).toEqual([
      { role: "system", content: "you are a tester" },
      { role: "user", content: "say hi" },
    ]);
  });
});

// ─────────────────────────────────────────────
// Gemini
// ─────────────────────────────────────────────

describe("callLLM · Gemini generateContent", () => {
  it("appends the api key as ?key= and respects search flag", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({
        candidates: [
          { content: { parts: [{ text: "g" }] } },
        ],
        usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 1 },
      }),
    );
    global.fetch = fetchSpy;

    const result = await callLLM({
      ...BASE_OPTS,
      model: "gemini-3.1-pro-preview",
      enableWebSearch: true,
    });

    expect(result!.provider).toBe("google");
    expect(result!.text).toBe("g");
    expect(result!.webSearchUsed).toBe(true);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain("?key=test-google");
    const body = JSON.parse(init.body as string);
    expect(body.tools).toEqual([{ google_search: {} }]);
  });

  it("omits tools when search is not enabled", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({
        candidates: [{ content: { parts: [{ text: "g" }] } }],
        usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 },
      }),
    );
    global.fetch = fetchSpy;
    await callLLM({ ...BASE_OPTS, model: "gemini-3.1-pro-preview" });
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    expect(body.tools).toBeUndefined();
  });
});

// ─────────────────────────────────────────────
// xAI
// ─────────────────────────────────────────────

describe("callLLM · xAI Grok", () => {
  it("uses chat-completions endpoint when search is disabled", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({
        choices: [{ message: { content: "grok" } }],
        usage: { prompt_tokens: 2, completion_tokens: 3 },
      }),
    );
    global.fetch = fetchSpy;
    const result = await callLLM({
      ...BASE_OPTS,
      model: "grok-4.20-beta-0309-reasoning",
    });
    expect(result!.provider).toBe("xai");
    expect(String(fetchSpy.mock.calls[0][0])).toBe(
      "https://api.x.ai/v1/chat/completions",
    );
  });

  it("uses Responses endpoint + web_search + x_search when search enabled", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({
        output_text: "grok-search",
        usage: { input_tokens: 1, output_tokens: 2 },
      }),
    );
    global.fetch = fetchSpy;
    const result = await callLLM({
      ...BASE_OPTS,
      model: "grok-4.20-beta-0309-reasoning",
      enableWebSearch: true,
    });
    expect(result!.text).toBe("grok-search");
    expect(result!.webSearchUsed).toBe(true);
    expect(String(fetchSpy.mock.calls[0][0])).toBe(
      "https://api.x.ai/v1/responses",
    );
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    expect(body.tools).toEqual([
      { type: "web_search" },
      { type: "x_search" },
    ]);
  });
});

// ─────────────────────────────────────────────
// Perplexity
// ─────────────────────────────────────────────

describe("callLLM · Perplexity Sonar", () => {
  it("reports webSearchUsed=true even when flag is not set (search is baked-in)", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        choices: [{ message: { content: "sonar" } }],
        usage: { prompt_tokens: 5, completion_tokens: 1 },
      }),
    );
    const result = await callLLM({ ...BASE_OPTS, model: "sonar-pro" });
    expect(result!.provider).toBe("perplexity");
    expect(result!.webSearchUsed).toBe(true);
  });
});

// ─────────────────────────────────────────────
// Search opt-in policy
// ─────────────────────────────────────────────

describe("callLLM · NO_SEARCH_MODELS short-circuit", () => {
  it("Opus runs as plain Messages even with enableWebSearch=true", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({
        content: [{ type: "text", text: "opus" }],
        usage: { input_tokens: 1, output_tokens: 1 },
      }),
    );
    global.fetch = fetchSpy;
    const result = await callLLM({
      ...BASE_OPTS,
      model: "claude-opus-4-7",
      enableWebSearch: true,
    });
    expect(result!.webSearchUsed).toBe(false);
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    expect(body.tools).toBeUndefined();
  });

  it("gpt-4o-mini runs plain chat completions even with enableWebSearch=true", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({
        choices: [{ message: { content: "mini" } }],
        usage: { prompt_tokens: 1, completion_tokens: 1 },
      }),
    );
    global.fetch = fetchSpy;
    const result = await callLLM({
      ...BASE_OPTS,
      model: "gpt-4o-mini",
      enableWebSearch: true,
    });
    expect(result!.webSearchUsed).toBe(false);
    expect(String(fetchSpy.mock.calls[0][0])).toBe(
      "https://api.openai.com/v1/chat/completions",
    );
  });
});

// ─────────────────────────────────────────────
// Anthropic + web search
// ─────────────────────────────────────────────

describe("callLLM · Anthropic +web_search", () => {
  it("adds web_search_20250305 tool with max_uses=5", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({
        content: [
          { type: "text", text: "sonnet" },
          { type: "tool_use", id: "x", name: "web_search", input: {} },
        ],
        usage: { input_tokens: 1, output_tokens: 1 },
      }),
    );
    global.fetch = fetchSpy;
    const result = await callLLM({
      ...BASE_OPTS,
      model: "claude-sonnet-4-6",
      enableWebSearch: true,
    });
    expect(result!.text).toBe("sonnet"); // tool_use blocks filtered out
    expect(result!.webSearchUsed).toBe(true);
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    expect(body.tools).toEqual([
      { type: "web_search_20250305", name: "web_search", max_uses: 5 },
    ]);
  });
});

// ─────────────────────────────────────────────
// OpenAI Responses (search) — extractResponsesApiText shape coverage
// ─────────────────────────────────────────────

describe("callLLM · OpenAI Responses +web_search", () => {
  it("uses the responses endpoint with web_search tool", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      jsonResponse({
        output: [
          {
            type: "message",
            content: [{ type: "output_text", text: "responses" }],
          },
        ],
        usage: { input_tokens: 7, output_tokens: 3 },
      }),
    );
    global.fetch = fetchSpy;
    const result = await callLLM({
      ...BASE_OPTS,
      model: "gpt-4o",
      enableWebSearch: true,
    });
    expect(result!.text).toBe("responses");
    expect(result!.webSearchUsed).toBe(true);
    expect(String(fetchSpy.mock.calls[0][0])).toBe(
      "https://api.openai.com/v1/responses",
    );
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    expect(body.tools).toEqual([{ type: "web_search" }]);
    expect(body.instructions).toBe("you are a tester");
    expect(body.max_output_tokens).toBe(256);
  });

  it("prefers top-level output_text when present", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        output_text: "shortcut",
        output: [{ type: "message", content: [{ type: "output_text", text: "ignored" }] }],
        usage: { input_tokens: 1, output_tokens: 1 },
      }),
    );
    const result = await callLLM({
      ...BASE_OPTS,
      model: "gpt-4o",
      enableWebSearch: true,
    });
    expect(result!.text).toBe("shortcut");
  });
});

// ─────────────────────────────────────────────
// Cost + timing
// ─────────────────────────────────────────────

describe("callLLM · cost & metadata", () => {
  it("rounds cost to 6 decimal places", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        choices: [{ message: { content: "x" } }],
        usage: { prompt_tokens: 123, completion_tokens: 7 },
      }),
    );
    const result = await callLLM({ ...BASE_OPTS, model: "gpt-4o" });
    // 123 / 1e6 * 2.5 + 7 / 1e6 * 10 = 0.0003075 + 0.00007 = 0.0003775
    expect(result!.costUsd).toBeCloseTo(0.000378, 6);
  });

  it("reports a non-negative durationMs", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        choices: [{ message: { content: "x" } }],
        usage: { prompt_tokens: 1, completion_tokens: 1 },
      }),
    );
    const result = await callLLM({ ...BASE_OPTS, model: "gpt-4o" });
    expect(result!.durationMs).toBeGreaterThanOrEqual(0);
  });
});
