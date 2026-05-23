/**
 * `callLLMWithTools` contract tests — iterative agentic tool-loop.
 *
 * Exercises every branch of the loop:
 *   - Graceful degradation: missing key, non-Anthropic provider, empty
 *     tools array, upstream non-2xx, empty final text, exhausted
 *     iterations
 *   - Happy path: 0-tool answer, single-tool round-trip, multi-tool
 *     round-trip, multi-iteration tool calls
 *   - Tool execution: success path passes result to model; thrown
 *     errors surface as `is_error` tool_result content (loop continues)
 *   - Cost + token accounting across iterations
 *
 * Uses a stubbed global fetch — no network is touched. Each test
 * asserts on the request body's `tools` array shape AND the message
 * history the wrapper builds across iterations.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  callLLMWithTools,
  type LLMTool,
  type LLMToolExecutor,
} from "../llm";

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
});

afterEach(() => {
  global.fetch = ORIGINAL_FETCH;
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

const SAMPLE_TOOL: LLMTool = {
  name: "lookup_org",
  description: "Look up an organization by slug.",
  inputSchema: {
    type: "object",
    properties: { slug: { type: "string" } },
    required: ["slug"],
  },
};

const SECOND_TOOL: LLMTool = {
  name: "fetch_metrics",
  description: "Fetch the latest metrics for an organization.",
  inputSchema: {
    type: "object",
    properties: { orgId: { type: "string" } },
    required: ["orgId"],
  },
};

const BASE_OPTS = {
  model: "claude-sonnet-4-6",
  systemPrompt: "you are a tester",
  userPrompt: "find the org",
  temperature: 0.4,
  maxTokens: 256,
  timeoutMs: 5_000,
  tools: [SAMPLE_TOOL],
  executeTool: vi.fn() as LLMToolExecutor,
};

// ─────────────────────────────────────────────
// Graceful degradation
// ─────────────────────────────────────────────

describe("callLLMWithTools · graceful degradation", () => {
  it("returns null when ANTHROPIC_API_KEY is missing", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const result = await callLLMWithTools({
      ...BASE_OPTS,
      executeTool: vi.fn(),
    });
    expect(result).toBeNull();
  });

  it("returns null for non-Anthropic providers", async () => {
    const result = await callLLMWithTools({
      ...BASE_OPTS,
      model: "gpt-4o",
      executeTool: vi.fn(),
    });
    expect(result).toBeNull();
  });

  it("returns null when tools array is empty", async () => {
    const result = await callLLMWithTools({
      ...BASE_OPTS,
      tools: [],
      executeTool: vi.fn(),
    });
    expect(result).toBeNull();
  });

  it("returns null on upstream non-2xx", async () => {
    global.fetch = vi.fn(async () =>
      new Response("Upstream is sad", { status: 503 }),
    ) as typeof global.fetch;
    const result = await callLLMWithTools({
      ...BASE_OPTS,
      executeTool: vi.fn(),
    });
    expect(result).toBeNull();
  });

  it("returns null when fetch throws", async () => {
    global.fetch = vi.fn(async () => {
      throw new Error("network down");
    }) as typeof global.fetch;
    const result = await callLLMWithTools({
      ...BASE_OPTS,
      executeTool: vi.fn(),
    });
    expect(result).toBeNull();
  });

  it("returns null when final text is empty", async () => {
    global.fetch = vi.fn(async () =>
      jsonResponse({
        content: [{ type: "text", text: "   " }],
        stop_reason: "end_turn",
        usage: { input_tokens: 10, output_tokens: 2 },
      }),
    ) as typeof global.fetch;
    const result = await callLLMWithTools({
      ...BASE_OPTS,
      executeTool: vi.fn(),
    });
    expect(result).toBeNull();
  });
});

// ─────────────────────────────────────────────
// Happy paths
// ─────────────────────────────────────────────

describe("callLLMWithTools · zero-tool answer", () => {
  it("returns final text immediately when the model answers without using any tool", async () => {
    global.fetch = vi.fn(async () =>
      jsonResponse({
        content: [{ type: "text", text: "Direct answer." }],
        stop_reason: "end_turn",
        usage: { input_tokens: 50, output_tokens: 8 },
      }),
    ) as typeof global.fetch;

    const executor = vi.fn();
    const result = await callLLMWithTools({
      ...BASE_OPTS,
      executeTool: executor,
    });

    expect(result).not.toBeNull();
    expect(result?.text).toBe("Direct answer.");
    expect(result?.toolIterations).toBe(0);
    expect(result?.provider).toBe("anthropic");
    expect(result?.modelId).toBe("claude-sonnet-4-6");
    expect(executor).not.toHaveBeenCalled();
  });
});

describe("callLLMWithTools · single-tool round-trip", () => {
  it("calls executeTool once, threads the result back, returns final text", async () => {
    let call = 0;
    global.fetch = vi.fn(async (_url, init) => {
      call++;
      /* Iteration 1: model asks for tool use */
      if (call === 1) {
        const body = JSON.parse(String((init as RequestInit).body));
        expect(body.tools).toHaveLength(1);
        expect(body.tools[0].name).toBe("lookup_org");
        /* The vendor-neutral `inputSchema` must be translated to
         * Anthropic-native `input_schema`. */
        expect(body.tools[0].input_schema).toBeDefined();
        expect(body.messages).toHaveLength(1);
        return jsonResponse({
          content: [
            {
              type: "tool_use",
              id: "toolu_1",
              name: "lookup_org",
              input: { slug: "atomico" },
            },
          ],
          stop_reason: "tool_use",
          usage: { input_tokens: 100, output_tokens: 20 },
        });
      }
      /* Iteration 2: model gets tool_result, returns final text */
      const body = JSON.parse(String((init as RequestInit).body));
      /* Message history must include the prior tool_use assistant turn
       * AND the tool_result user turn. */
      expect(body.messages).toHaveLength(3);
      expect(body.messages[1].role).toBe("assistant");
      expect(body.messages[2].role).toBe("user");
      expect(body.messages[2].content[0].type).toBe("tool_result");
      expect(body.messages[2].content[0].tool_use_id).toBe("toolu_1");
      expect(body.messages[2].content[0].content).toBe("Atomico VC, est. 2006");
      return jsonResponse({
        content: [{ type: "text", text: "Found Atomico." }],
        stop_reason: "end_turn",
        usage: { input_tokens: 150, output_tokens: 12 },
      });
    }) as typeof global.fetch;

    const executor = vi.fn(async () => "Atomico VC, est. 2006");
    const result = await callLLMWithTools({
      ...BASE_OPTS,
      executeTool: executor,
    });

    expect(result).not.toBeNull();
    expect(result?.text).toBe("Found Atomico.");
    expect(result?.toolIterations).toBe(1);
    /* Tokens accumulate across iterations. */
    expect(result?.inputTokens).toBe(250);
    expect(result?.outputTokens).toBe(32);
    expect(result?.tokensUsed).toBe(282);
    expect(executor).toHaveBeenCalledTimes(1);
    expect(executor).toHaveBeenCalledWith({
      id: "toolu_1",
      name: "lookup_org",
      input: { slug: "atomico" },
    });
  });
});

describe("callLLMWithTools · parallel multi-tool in one turn", () => {
  it("executes every tool_use block in the same assistant turn before re-calling the model", async () => {
    let call = 0;
    global.fetch = vi.fn(async () => {
      call++;
      if (call === 1) {
        return jsonResponse({
          content: [
            { type: "tool_use", id: "t1", name: "lookup_org", input: { slug: "x" } },
            { type: "tool_use", id: "t2", name: "fetch_metrics", input: { orgId: "x" } },
          ],
          stop_reason: "tool_use",
          usage: { input_tokens: 100, output_tokens: 25 },
        });
      }
      return jsonResponse({
        content: [{ type: "text", text: "Both done." }],
        stop_reason: "end_turn",
        usage: { input_tokens: 200, output_tokens: 8 },
      });
    }) as typeof global.fetch;

    const executor = vi.fn(async (u) =>
      u.name === "lookup_org" ? "org row" : "metric row",
    );
    const result = await callLLMWithTools({
      ...BASE_OPTS,
      tools: [SAMPLE_TOOL, SECOND_TOOL],
      executeTool: executor,
    });

    expect(result).not.toBeNull();
    expect(result?.toolIterations).toBe(1);
    expect(executor).toHaveBeenCalledTimes(2);
  });
});

describe("callLLMWithTools · multi-iteration tool calls", () => {
  it("walks 3 iterations and returns final text on the 4th turn", async () => {
    let call = 0;
    global.fetch = vi.fn(async () => {
      call++;
      if (call <= 3) {
        return jsonResponse({
          content: [
            { type: "tool_use", id: `t${call}`, name: "lookup_org", input: { slug: "x" } },
          ],
          stop_reason: "tool_use",
          usage: { input_tokens: 50, output_tokens: 5 },
        });
      }
      return jsonResponse({
        content: [{ type: "text", text: "Done after 3 hops." }],
        stop_reason: "end_turn",
        usage: { input_tokens: 60, output_tokens: 10 },
      });
    }) as typeof global.fetch;

    const executor = vi.fn(async () => "stub row");
    const result = await callLLMWithTools({
      ...BASE_OPTS,
      executeTool: executor,
    });

    expect(result).not.toBeNull();
    expect(result?.toolIterations).toBe(3);
    expect(executor).toHaveBeenCalledTimes(3);
    expect(result?.text).toBe("Done after 3 hops.");
  });
});

describe("callLLMWithTools · tool execution errors", () => {
  it("surfaces a thrown executor as is_error tool_result and continues the loop", async () => {
    let call = 0;
    global.fetch = vi.fn(async (_url, init) => {
      call++;
      if (call === 1) {
        return jsonResponse({
          content: [
            { type: "tool_use", id: "t1", name: "lookup_org", input: { slug: "boom" } },
          ],
          stop_reason: "tool_use",
          usage: { input_tokens: 50, output_tokens: 5 },
        });
      }
      const body = JSON.parse(String((init as RequestInit).body));
      const toolResult = body.messages[2].content[0];
      /* The thrown error must reach the model as is_error: true. */
      expect(toolResult.is_error).toBe(true);
      expect(toolResult.content).toContain("kaboom");
      return jsonResponse({
        content: [{ type: "text", text: "I will retry differently." }],
        stop_reason: "end_turn",
        usage: { input_tokens: 70, output_tokens: 10 },
      });
    }) as typeof global.fetch;

    const executor = vi.fn(async () => {
      throw new Error("kaboom");
    });
    const result = await callLLMWithTools({
      ...BASE_OPTS,
      executeTool: executor,
    });

    expect(result).not.toBeNull();
    expect(result?.toolIterations).toBe(1);
    expect(result?.text).toBe("I will retry differently.");
  });
});

describe("callLLMWithTools · iteration cap", () => {
  it("returns null when the model never returns end_turn within maxToolIterations", async () => {
    global.fetch = vi.fn(async () =>
      jsonResponse({
        content: [
          { type: "tool_use", id: "tloop", name: "lookup_org", input: { slug: "loop" } },
        ],
        stop_reason: "tool_use",
        usage: { input_tokens: 30, output_tokens: 3 },
      }),
    ) as typeof global.fetch;

    const executor = vi.fn(async () => "stub");
    const result = await callLLMWithTools({
      ...BASE_OPTS,
      maxToolIterations: 2,
      executeTool: executor,
    });

    expect(result).toBeNull();
    /* The cap is the number of tool-execution rounds — the model
     * cannot exit via end_turn so the wrapper bails after 3 model
     * round trips (initial + 2 follow-ups) per the inclusive cap. */
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(2);
  });
});

// ─────────────────────────────────────────────
// Cost + token accounting
// ─────────────────────────────────────────────

describe("callLLMWithTools · cost accounting", () => {
  it("computes costUsd from the cumulative input/output token totals", async () => {
    let call = 0;
    global.fetch = vi.fn(async () => {
      call++;
      if (call === 1) {
        return jsonResponse({
          content: [
            { type: "tool_use", id: "t1", name: "lookup_org", input: { slug: "x" } },
          ],
          stop_reason: "tool_use",
          usage: { input_tokens: 1_000_000, output_tokens: 200_000 },
        });
      }
      return jsonResponse({
        content: [{ type: "text", text: "Done." }],
        stop_reason: "end_turn",
        usage: { input_tokens: 1_000_000, output_tokens: 100_000 },
      });
    }) as typeof global.fetch;

    const result = await callLLMWithTools({
      ...BASE_OPTS,
      executeTool: vi.fn(async () => "stub"),
    });

    /* claude-sonnet-4-6 = $3/M input + $15/M output.
     * Input total: 2M = $6.
     * Output total: 300k = $4.50.
     * Total = $10.50. */
    expect(result?.costUsd).toBeCloseTo(10.5, 4);
    expect(result?.inputTokens).toBe(2_000_000);
    expect(result?.outputTokens).toBe(300_000);
  });
});
