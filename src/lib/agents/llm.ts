/**
 * Agent LLM Bridge
 *
 * Provides a simple callLLM() function for agent handlers to generate
 * narrative intelligence. Supports OPT-IN provider-native web search via
 * `enableWebSearch: true` — mirrors the cascade providers' search wiring:
 *
 *   - claude-sonnet-4-6           → Anthropic Messages + web_search_20250305 tool
 *   - claude-opus-4-7             → no search (judge model — by design)
 *   - gpt-4o                      → Responses API + web_search tool
 *   - gpt-4o-mini                 → no search (chat-completions only)
 *   - gemini-3.1-pro-preview      → generateContent + google_search tool
 *   - grok-4.20-beta-0309-reasoning → Responses API + web_search + x_search
 *   - sonar-pro                   → search baked-in (flag is a no-op)
 *
 * Without `enableWebSearch`, every provider runs as a plain narrative
 * call without tools — backwards compatible with existing handlers.
 *
 * Design principles:
 * - Graceful degradation: returns null if API key missing or call fails
 * - Cost tracking: calculates exact cost based on model pricing
 * - Timeout-aware: respects the 55-second serverless limit
 * - No cascade dependency: standalone module, no CascadeTaskId coupling
 *
 * Ported byte-for-byte from London-Tech-Map src/lib/agents/llm.ts as the
 * canonical pattern for Olivia Brain's agent handlers. Future LTM agent
 * ports rely on this same surface (input → text + cost/token metadata).
 */

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface LLMCallOptions {
  /** Model identifier from context.llmModel (e.g. "gpt-4o", "claude-sonnet-4-6") */
  model: string;
  /** System prompt — sets agent persona/instructions */
  systemPrompt: string;
  /** User prompt — the actual request with data */
  userPrompt: string;
  /** Sampling temperature (0-1) */
  temperature: number;
  /** Maximum output tokens */
  maxTokens: number;
  /** Timeout in ms. Defaults to 45_000 (leaves 10s buffer within 55s engine limit) */
  timeoutMs?: number;
  /**
   * Opt-in: enable provider-native web search. No-op for providers that
   * don't support it (Opus, gpt-4o-mini) or that always search (Sonar).
   * When supported, swaps the call shape to the right tooled endpoint.
   */
  enableWebSearch?: boolean;
}

export interface LLMCallResult {
  /** The generated text */
  text: string;
  /** Total tokens consumed (input + output) */
  tokensUsed: number;
  /** Estimated cost in USD (token cost only — search-tool overhead not included) */
  costUsd: number;
  /** Which provider was actually used */
  provider: string;
  /** Actual model ID sent to the API */
  modelId: string;
  /** Input tokens consumed */
  inputTokens: number;
  /** Output tokens consumed */
  outputTokens: number;
  /** Execution time in ms */
  durationMs: number;
  /** True when web search was enabled for this call */
  webSearchUsed: boolean;
}

// ─────────────────────────────────────────────
// Tool calling — opt-in agentic surface
// ─────────────────────────────────────────────

/**
 * Vendor-neutral tool definition. Mirrors Anthropic's `input_schema`
 * shape under the hood — for OpenAI/Gemini support in a future
 * extension, this same definition is translated to the provider's
 * native format inside `callLLMWithTools`.
 */
export interface LLMTool {
  /** Stable identifier the model uses to invoke the tool. */
  name: string;
  /** One-paragraph description visible to the model when it decides
   *  whether to call this tool. */
  description: string;
  /** JSON Schema describing the expected `input` payload — matches
   *  Anthropic's `input_schema` contract. */
  inputSchema: Record<string, unknown>;
}

/** A single `tool_use` block produced by the model. The caller's
 *  `executeTool` callback receives this and returns the result string
 *  the model will see as `tool_result` content. */
export interface LLMToolUse {
  /** Provider-assigned identifier — used to correlate tool_result. */
  id: string;
  /** The tool's `name` from the `LLMTool` registration. */
  name: string;
  /** The decoded JSON input the model passed; conforms to the
   *  registered `inputSchema`. */
  input: Record<string, unknown>;
}

/**
 * Caller-provided callback that executes one `tool_use` and returns the
 * string the model will see as the tool's `tool_result` content. May
 * throw — `callLLMWithTools` catches and surfaces the error to the
 * model as `is_error: true` content so the loop continues honestly.
 */
export type LLMToolExecutor = (toolUse: LLMToolUse) => Promise<string>;

export interface LLMCallWithToolsOptions {
  /** Model identifier — see MODEL_MAP. Anthropic-family models only
   *  for the Phase-1 implementation; other providers return null. */
  model: string;
  /** System prompt — sets agent persona. */
  systemPrompt: string;
  /** Initial user prompt that kicks off the tool loop. */
  userPrompt: string;
  /** Sampling temperature (0-1). */
  temperature: number;
  /** Max output tokens per model turn. The full loop may produce
   *  more total tokens across iterations. */
  maxTokens: number;
  /** Per-call timeout in ms. Defaults to 60_000 — agentic loops
   *  legitimately take longer than non-tool single-shot calls. */
  timeoutMs?: number;
  /** Tools the model may call. At least one is required (callers
   *  without tools should use `callLLM` instead). */
  tools: readonly LLMTool[];
  /** Executes a single `tool_use` and returns the result string. */
  executeTool: LLMToolExecutor;
  /** Hard limit on tool-loop iterations to prevent runaway costs.
   *  Defaults to 5 — matches the prior `callSonnetWithTools` cap. */
  maxToolIterations?: number;
}

export interface LLMCallWithToolsResult extends LLMCallResult {
  /** Number of tool-use iterations executed before the model
   *  returned final text. 0 means the model answered without
   *  calling any tool. */
  toolIterations: number;
}

// ─────────────────────────────────────────────
// Model resolution map
// ─────────────────────────────────────────────

interface ModelConfig {
  provider: "anthropic" | "openai" | "google" | "xai" | "perplexity";
  modelId: string;
  apiKeyEnvVar: string;
  endpoint: string;
  /** Endpoint to use when web search is enabled (if different from default) */
  searchEndpoint?: string;
  inputPricePer1M: number;
  outputPricePer1M: number;
}

const MODEL_MAP: Record<string, ModelConfig> = {
  // ── Anthropic ──
  "claude-sonnet-4-6": {
    provider: "anthropic",
    modelId: "claude-sonnet-4-6",
    apiKeyEnvVar: "ANTHROPIC_API_KEY",
    endpoint: "https://api.anthropic.com/v1/messages",
    inputPricePer1M: 3.0,
    outputPricePer1M: 15.0,
  },
  "claude-opus-4-7": {
    provider: "anthropic",
    modelId: "claude-opus-4-7",
    apiKeyEnvVar: "ANTHROPIC_API_KEY",
    endpoint: "https://api.anthropic.com/v1/messages",
    inputPricePer1M: 15.0,
    outputPricePer1M: 75.0,
  },
  // ── OpenAI ──
  "gpt-4o": {
    provider: "openai",
    modelId: "gpt-4o",
    apiKeyEnvVar: "OPENAI_API_KEY",
    endpoint: "https://api.openai.com/v1/chat/completions",
    searchEndpoint: "https://api.openai.com/v1/responses",
    inputPricePer1M: 2.5,
    outputPricePer1M: 10.0,
  },
  "gpt-4o-mini": {
    provider: "openai",
    modelId: "gpt-4o-mini",
    apiKeyEnvVar: "OPENAI_API_KEY",
    endpoint: "https://api.openai.com/v1/chat/completions",
    inputPricePer1M: 0.15,
    outputPricePer1M: 0.6,
  },
  // ── Google ──
  "gemini-3.1-pro-preview": {
    provider: "google",
    modelId: "gemini-3.1-pro-preview",
    apiKeyEnvVar: "GOOGLE_AI_API_KEY",
    endpoint:
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent",
    inputPricePer1M: 1.25,
    outputPricePer1M: 5.0,
  },
  // ── xAI (OpenAI-compatible chat completions; Responses API for tools) ──
  "grok-4.20-beta-0309-reasoning": {
    provider: "xai",
    modelId: "grok-4.20-beta-0309-reasoning",
    apiKeyEnvVar: "XAI_API_KEY",
    endpoint: "https://api.x.ai/v1/chat/completions",
    searchEndpoint: "https://api.x.ai/v1/responses",
    inputPricePer1M: 3.0,
    outputPricePer1M: 15.0,
  },
  // ── Perplexity (OpenAI-compatible) ──
  "sonar-pro": {
    provider: "perplexity",
    modelId: "sonar-pro",
    apiKeyEnvVar: "PERPLEXITY_API_KEY",
    endpoint: "https://api.perplexity.ai/chat/completions",
    inputPricePer1M: 3.0,
    outputPricePer1M: 15.0,
  },
};

function resolveModel(modelName: string): ModelConfig {
  return MODEL_MAP[modelName] ?? MODEL_MAP["gpt-4o"];
}

/** Models that don't support web search even when the flag is set. */
const NO_SEARCH_MODELS = new Set<string>([
  "claude-opus-4-7", // judge-only by design
  "gpt-4o-mini", // chat-completions only — keep cheap
]);

function effectiveSearchEnabled(
  options: LLMCallOptions,
  config: ModelConfig,
): boolean {
  if (!options.enableWebSearch) return false;
  if (NO_SEARCH_MODELS.has(config.modelId)) return false;
  return true;
}

// ─────────────────────────────────────────────
// Core callLLM function
// ─────────────────────────────────────────────

/**
 * Call an LLM to generate narrative text from structured data.
 *
 * Returns null (not throws) if the call cannot be made or fails.
 * Agents always fall back to their Prisma-only output when this returns null.
 */
export async function callLLM(
  options: LLMCallOptions,
): Promise<LLMCallResult | null> {
  const config = resolveModel(options.model);
  const apiKey = process.env[config.apiKeyEnvVar];

  if (!apiKey) {
    console.warn(
      `[agent-llm] ${config.apiKeyEnvVar} not set — skipping LLM call for model ${options.model}`,
    );
    return null;
  }

  const timeoutMs = options.timeoutMs ?? 45_000;
  const startTime = Date.now();
  const searchEnabled = effectiveSearchEnabled(options, config);

  try {
    let result: { text: string; inputTokens: number; outputTokens: number };

    switch (config.provider) {
      case "anthropic":
        if (searchEnabled) {
          result = await callAnthropicMessagesWithSearch(
            apiKey,
            config,
            options,
            timeoutMs,
          );
        } else {
          result = await callAnthropicMessages(apiKey, config, options, timeoutMs);
        }
        break;
      case "openai":
        if (searchEnabled) {
          result = await callOpenAIResponses(apiKey, config, options, timeoutMs);
        } else {
          result = await callOpenAICompatible(apiKey, config, options, timeoutMs);
        }
        break;
      case "xai":
        if (searchEnabled) {
          result = await callXAIResponses(apiKey, config, options, timeoutMs);
        } else {
          result = await callOpenAICompatible(apiKey, config, options, timeoutMs);
        }
        break;
      case "google":
        result = await callGemini(apiKey, config, options, timeoutMs, searchEnabled);
        break;
      case "perplexity":
        // Sonar always searches — flag is a no-op here.
        result = await callOpenAICompatible(apiKey, config, options, timeoutMs);
        break;
      default:
        console.warn(`[agent-llm] Unknown provider: ${config.provider}`);
        return null;
    }

    if (!result.text.trim()) {
      console.warn(
        `[agent-llm] Empty response from ${config.provider}/${config.modelId}` +
          (searchEnabled ? " (web search enabled)" : ""),
      );
      return null;
    }

    const totalTokens = result.inputTokens + result.outputTokens;
    const costUsd =
      (result.inputTokens / 1_000_000) * config.inputPricePer1M +
      (result.outputTokens / 1_000_000) * config.outputPricePer1M;

    return {
      text: result.text.trim(),
      tokensUsed: totalTokens,
      costUsd: Math.round(costUsd * 1_000_000) / 1_000_000,
      provider: config.provider,
      modelId: config.modelId,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      durationMs: Date.now() - startTime,
      webSearchUsed:
        searchEnabled || config.provider === "perplexity",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      `[agent-llm] LLM call failed (${config.provider}/${config.modelId}${searchEnabled ? " +web_search" : ""}): ${msg}`,
    );
    return null;
  }
}

// ─────────────────────────────────────────────
// callLLMWithTools — agentic iterative tool-loop
// ─────────────────────────────────────────────

/* Anthropic content-block shapes — typed here to avoid `any` in the
 * tool-loop body. These mirror the provider's documented contract. */
interface AnthropicToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface AnthropicTextBlock {
  type: "text";
  text: string;
}

type AnthropicContentBlock = AnthropicToolUseBlock | AnthropicTextBlock;

interface AnthropicToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[] | AnthropicToolResultBlock[];
}

interface AnthropicResponseEnvelope {
  content?: AnthropicContentBlock[];
  stop_reason?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
}

/**
 * Call an LLM with iterative tool-loop support. The model decides which
 * tools to call; the caller's `executeTool` callback runs them; the
 * loop continues until the model returns final text OR
 * `maxToolIterations` is hit.
 *
 * Phase-1 scope: Anthropic models only (claude-sonnet-4-6,
 * claude-opus-4-7). Other providers return `null` with a console warning;
 * callers should fall back to `callLLM` without tools. Extension to
 * OpenAI/Gemini tool-calling is a separate architectural change.
 *
 * Graceful-degrade contract (matches `callLLM`):
 *   - Missing API key → null
 *   - Unsupported provider → null
 *   - Upstream non-2xx → null
 *   - Exhausted `maxToolIterations` without `end_turn` → null
 *   - Empty final text → null
 *
 * Tool execution errors do NOT terminate the loop — the model sees the
 * failure as `tool_result` content with `is_error: true` and may retry
 * with different input or abandon the tool.
 */
export async function callLLMWithTools(
  options: LLMCallWithToolsOptions,
): Promise<LLMCallWithToolsResult | null> {
  const config = resolveModel(options.model);

  if (config.provider !== "anthropic") {
    console.warn(
      `[agent-llm] callLLMWithTools is Anthropic-only today; called with ${config.provider}/${config.modelId}. Use callLLM without tools or wait for the OpenAI/Gemini extension.`,
    );
    return null;
  }

  const apiKey = process.env[config.apiKeyEnvVar];
  if (!apiKey) {
    console.warn(
      `[agent-llm] ${config.apiKeyEnvVar} not set — skipping callLLMWithTools for model ${options.model}`,
    );
    return null;
  }

  if (options.tools.length === 0) {
    console.warn(
      "[agent-llm] callLLMWithTools called with zero tools — use callLLM instead. Returning null.",
    );
    return null;
  }

  const timeoutMs = options.timeoutMs ?? 60_000;
  const maxIterations = options.maxToolIterations ?? 5;
  const startTime = Date.now();
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let toolIterations = 0;

  /* Vendor-neutral → Anthropic-native translation. Only the field-name
   * shift (`inputSchema` → `input_schema`) plus the literal pass-through
   * of name + description. */
  const anthropicTools = options.tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema,
  }));

  const messages: AnthropicMessage[] = [
    { role: "user", content: options.userPrompt },
  ];

  try {
    /* Loop is bounded by `maxIterations`; each iteration is one round
     * trip to Anthropic. The model decides whether to call a tool or
     * return final text. */
    while (toolIterations <= maxIterations) {
      const res = await fetch(config.endpoint, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: config.modelId,
          max_tokens: options.maxTokens,
          temperature: options.temperature,
          system: options.systemPrompt,
          messages,
          tools: anthropicTools,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(
          `[agent-llm] callLLMWithTools — Anthropic ${res.status}: ${errText.slice(0, 300)}`,
        );
        return null;
      }

      const data = (await res.json()) as AnthropicResponseEnvelope;
      totalInputTokens += data.usage?.input_tokens ?? 0;
      totalOutputTokens += data.usage?.output_tokens ?? 0;

      const content: AnthropicContentBlock[] = data.content ?? [];
      const toolUses = content.filter(
        (b): b is AnthropicToolUseBlock => b.type === "tool_use",
      );

      /* Terminate either when the model says end_turn OR when it
       * returns no tool_use blocks — both signal final response. */
      if (data.stop_reason === "end_turn" || toolUses.length === 0) {
        const text = content
          .filter((b): b is AnthropicTextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();

        if (!text) {
          console.warn(
            `[agent-llm] callLLMWithTools — empty final text from ${config.modelId} after ${toolIterations} iteration(s)`,
          );
          return null;
        }

        const costUsd =
          (totalInputTokens / 1_000_000) * config.inputPricePer1M +
          (totalOutputTokens / 1_000_000) * config.outputPricePer1M;

        return {
          text,
          tokensUsed: totalInputTokens + totalOutputTokens,
          costUsd: Math.round(costUsd * 1_000_000) / 1_000_000,
          provider: config.provider,
          modelId: config.modelId,
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          durationMs: Date.now() - startTime,
          webSearchUsed: false,
          toolIterations,
        };
      }

      /* Tool loop iteration. Push the model's assistant turn (with
       * all tool_use blocks intact — Anthropic requires the exact
       * assistant content to be echoed back) then execute each tool
       * and push the tool_result blocks as the next user turn. */
      messages.push({ role: "assistant", content });

      const toolResults: AnthropicToolResultBlock[] = await Promise.all(
        toolUses.map(async (toolUse) => {
          try {
            const result = await options.executeTool({
              id: toolUse.id,
              name: toolUse.name,
              input: toolUse.input,
            });
            return {
              type: "tool_result" as const,
              tool_use_id: toolUse.id,
              content: result,
            };
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return {
              type: "tool_result" as const,
              tool_use_id: toolUse.id,
              content: `Tool execution failed: ${msg}`,
              is_error: true,
            };
          }
        }),
      );

      messages.push({ role: "user", content: toolResults });
      toolIterations++;
    }

    /* Exhausted the iteration cap without an end_turn — the model is
     * looping. Return null per the graceful-degrade contract. */
    console.warn(
      `[agent-llm] callLLMWithTools — exhausted ${maxIterations} iterations without end_turn for ${config.modelId}`,
    );
    return null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      `[agent-llm] callLLMWithTools (${config.provider}/${config.modelId}) failed: ${msg}`,
    );
    return null;
  }
}

// ─────────────────────────────────────────────
// Provider-specific call functions — non-search
// ─────────────────────────────────────────────

/** Anthropic Messages API — same pattern as cascade/providers/anthropic.ts (no tools) */
async function callAnthropicMessages(
  apiKey: string,
  config: ModelConfig,
  options: LLMCallOptions,
  timeoutMs: number,
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const res = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: config.modelId,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      system: options.systemPrompt,
      messages: [{ role: "user", content: options.userPrompt }],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic ${res.status}: ${errText.slice(0, 300)}`);
  }

  const json = await res.json();
  const text = (json.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("\n");

  return {
    text,
    inputTokens: json.usage?.input_tokens ?? 0,
    outputTokens: json.usage?.output_tokens ?? 0,
  };
}

/** OpenAI-compatible Chat Completions — covers OpenAI, xAI (no tools), Perplexity */
async function callOpenAICompatible(
  apiKey: string,
  config: ModelConfig,
  options: LLMCallOptions,
  timeoutMs: number,
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const res = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.modelId,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      messages: [
        { role: "system", content: options.systemPrompt },
        { role: "user", content: options.userPrompt },
      ],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`${config.provider} ${res.status}: ${errText.slice(0, 300)}`);
  }

  const json = await res.json();
  const text = json.choices?.[0]?.message?.content ?? "";

  return {
    text,
    inputTokens: json.usage?.prompt_tokens ?? 0,
    outputTokens: json.usage?.completion_tokens ?? 0,
  };
}

/** Google Gemini generateContent API — adds google_search tool when search is enabled */
async function callGemini(
  apiKey: string,
  config: ModelConfig,
  options: LLMCallOptions,
  timeoutMs: number,
  searchEnabled: boolean,
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const url = `${config.endpoint}?key=${apiKey}`;

  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: options.systemPrompt }] },
    contents: [{ parts: [{ text: options.userPrompt }] }],
    generationConfig: {
      maxOutputTokens: options.maxTokens,
      temperature: options.temperature,
    },
  };
  if (searchEnabled) {
    body.tools = [{ google_search: {} }];
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini ${res.status}: ${errText.slice(0, 300)}`);
  }

  const json = await res.json();
  const text =
    json.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? "")
      .join("\n") ?? "";

  return {
    text,
    inputTokens: json.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: json.usageMetadata?.candidatesTokenCount ?? 0,
  };
}

// ─────────────────────────────────────────────
// Provider-specific call functions — with web search
// ─────────────────────────────────────────────

/**
 * Anthropic Sonnet with web_search tool.
 * Mirrors cascade/providers/anthropic.ts — server-side tool, max_uses=5.
 * Text blocks are concatenated; tool_use / web_search_tool_result blocks
 * are filtered out so the agent gets pure narrative.
 */
async function callAnthropicMessagesWithSearch(
  apiKey: string,
  config: ModelConfig,
  options: LLMCallOptions,
  timeoutMs: number,
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const res = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: config.modelId,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      system: options.systemPrompt,
      tools: [
        { type: "web_search_20250305", name: "web_search", max_uses: 5 },
      ],
      messages: [{ role: "user", content: options.userPrompt }],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic +web_search ${res.status}: ${errText.slice(0, 300)}`);
  }

  const json = await res.json();
  const text = (json.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("\n");

  return {
    text,
    inputTokens: json.usage?.input_tokens ?? 0,
    outputTokens: json.usage?.output_tokens ?? 0,
  };
}

/**
 * OpenAI Responses API with web_search tool.
 * Different request/response shape than chat completions:
 *   - `instructions` + `input` instead of `messages`
 *   - `max_output_tokens` instead of `max_tokens`
 *   - response in `output[].content[].text` not `choices[].message.content`
 * Mirrors cascade/providers/openai.ts (without the json_schema since
 * agents want free-text narrative, not structured records).
 */
async function callOpenAIResponses(
  apiKey: string,
  config: ModelConfig,
  options: LLMCallOptions,
  timeoutMs: number,
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const endpoint = config.searchEndpoint ?? config.endpoint;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.modelId,
      tools: [{ type: "web_search" }],
      tool_choice: "auto",
      max_output_tokens: options.maxTokens,
      temperature: options.temperature,
      instructions: options.systemPrompt,
      input: [{ role: "user", content: options.userPrompt }],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `OpenAI Responses +web_search ${res.status}: ${errText.slice(0, 300)}`,
    );
  }

  const json = await res.json();
  const text = extractResponsesApiText(json);

  return {
    text,
    inputTokens: json.usage?.input_tokens ?? json.usage?.prompt_tokens ?? 0,
    outputTokens:
      json.usage?.output_tokens ?? json.usage?.completion_tokens ?? 0,
  };
}

/**
 * xAI Grok via Responses API with web_search + x_search tools.
 * Mirrors cascade/providers/xai.ts. x_search captures real-time X/Twitter
 * signals (founder/VC commentary, breaking news) that web search misses.
 */
async function callXAIResponses(
  apiKey: string,
  config: ModelConfig,
  options: LLMCallOptions,
  timeoutMs: number,
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const endpoint = config.searchEndpoint ?? config.endpoint;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.modelId,
      input: [
        { role: "system", content: options.systemPrompt },
        { role: "user", content: options.userPrompt },
      ],
      tools: [{ type: "web_search" }, { type: "x_search" }],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`xAI Responses +web_search ${res.status}: ${errText.slice(0, 300)}`);
  }

  const json = await res.json();
  const text = extractResponsesApiText(json);

  return {
    text,
    inputTokens: json.usage?.input_tokens ?? json.usage?.prompt_tokens ?? 0,
    outputTokens:
      json.usage?.output_tokens ?? json.usage?.completion_tokens ?? 0,
  };
}

/**
 * Extract text from a Responses-API-style payload.
 * Handles both shapes:
 *   - top-level `output_text` (SDK convenience, sometimes present in raw too)
 *   - `output[].type === "message" → content[].type === "output_text" → text`
 */
function extractResponsesApiText(json: {
  output_text?: string;
  output?: Array<{
    type: string;
    content?: Array<{ type: string; text?: string }>;
  }>;
}): string {
  if (typeof json.output_text === "string" && json.output_text.length > 0) {
    return json.output_text;
  }
  return (json.output ?? [])
    .flatMap((item) => (item.type === "message" ? (item.content ?? []) : []))
    .filter((part) => part.type === "output_text")
    .map((part) => part.text ?? "")
    .join("\n");
}
