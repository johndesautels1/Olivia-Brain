/* ═══════════════════════════════════════════════════════════════════════════
   Anthropic Provider — Claude Sonnet (websearch) + Claude Opus (judge)
   API: https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool
   ═══════════════════════════════════════════════════════════════════════════ */

import type {
  CascadeProvider,
  CascadeResult,
  CascadeTaskId,
  ProviderId,
  TaskResultMap,
} from "../types";
import { PROVIDER_CONFIGS } from "../types";

/** Fire a single Anthropic Messages API call and return parsed data + raw text */
async function callAnthropic<K extends CascadeTaskId>(
  apiKey: string,
  modelId: string,
  prompt: string,
  options: { tools?: Record<string, unknown>[]; maxTokens: number; timeoutMs: number },
): Promise<{ data: TaskResultMap[K][]; rawText: string; error?: string }> {
  const body: Record<string, unknown> = {
    model: modelId,
    max_tokens: options.maxTokens,
    messages: [{ role: "user", content: prompt }],
  };
  if (options.tools) body.tools = options.tools;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(options.timeoutMs),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { data: [], rawText: "", error: `Anthropic API error ${res.status}: ${errText}` };
    }

    const json = await res.json();
    const textBlocks = (json.content ?? []).filter(
      (b: { type: string }) => b.type === "text",
    );
    const rawText = textBlocks.map((b: { text: string }) => b.text).join("\n");
    const data = extractJsonFromText<TaskResultMap[K]>(rawText);
    return { data, rawText };
  } catch (err) {
    return { data: [], rawText: "", error: `Anthropic request failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export function createAnthropicProvider(
  variant: "sonnet" | "opus",
): CascadeProvider {
  const config = PROVIDER_CONFIGS[variant];

  return {
    id: variant as ProviderId,

    isConfigured(): boolean {
      return !!process.env[config.apiKeyEnvVar];
    },

    async execute<K extends CascadeTaskId>(
      taskId: K,
      prompt: string,
    ): Promise<CascadeResult<TaskResultMap[K]>> {
      const apiKey = process.env[config.apiKeyEnvVar];
      if (!apiKey) {
        return emptyResult(variant, taskId, config.modelId, [
          `${config.apiKeyEnvVar} not configured`,
        ]);
      }

      const startTime = Date.now();

      // Opus: single request, no websearch, larger output.
      // Data is pre-merged before reaching Opus, so the input is compact.
      if (variant === "opus") {
        const result = await callAnthropic<K>(apiKey, config.modelId, prompt, {
          maxTokens: 32768,
          timeoutMs: 240_000,
        });
        if (result.error) {
          return emptyResult(variant, taskId, config.modelId, [result.error]);
        }
        return {
          taskId,
          provider: variant,
          modelId: config.modelId,
          timestamp: new Date().toISOString(),
          executionTimeMs: Date.now() - startTime,
          data: result.data,
          metadata: {
            totalResults: result.data.length,
            sourcesCited: countCitations(result.rawText),
            avgConfidence: 0.7,
            geographicScope: "london",
            dateRange: "2025-03 to 2026-03",
          },
          errors: [],
        };
      }

      // Sonnet: split into 2 parallel requests to avoid timeouts.
      const tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }];
      const timeoutMs = 240_000;

      const promptA = `${prompt}\n\nIMPORTANT: This is batch 1 of 2. Focus on the FIRST HALF of results — start from the beginning of the alphabet or earliest dates. Return what you find, the other batch handles the rest.`;
      const promptB = `${prompt}\n\nIMPORTANT: This is batch 2 of 2. Focus on the SECOND HALF of results — start from the middle of the alphabet or most recent dates. Return what you find, the other batch handles the rest.`;

      const [resultA, resultB] = await Promise.all([
        callAnthropic<K>(apiKey, config.modelId, promptA, {
          tools,
          maxTokens: 16384,
          timeoutMs,
        }),
        callAnthropic<K>(apiKey, config.modelId, promptB, {
          tools,
          maxTokens: 16384,
          timeoutMs,
        }),
      ]);

      const errors: string[] = [];
      if (resultA.error) errors.push(`Batch 1: ${resultA.error}`);
      if (resultB.error) errors.push(`Batch 2: ${resultB.error}`);

      const mergedData = [...resultA.data, ...resultB.data];
      const mergedText = [resultA.rawText, resultB.rawText].join("\n");
      const executionTimeMs = Date.now() - startTime;

      if (resultA.error && resultB.error) {
        return emptyResult(variant, taskId, config.modelId, errors);
      }

      return {
        taskId,
        provider: variant,
        modelId: config.modelId,
        timestamp: new Date().toISOString(),
        executionTimeMs,
        data: mergedData,
        metadata: {
          totalResults: mergedData.length,
          sourcesCited: countCitations(mergedText),
          avgConfidence: 0.7,
          geographicScope: "london",
          dateRange: "2025-03 to 2026-03",
        },
        errors,
      };
    },
  };
}

function emptyResult<K extends CascadeTaskId>(
  provider: ProviderId,
  taskId: K,
  modelId: string,
  errors: string[],
): CascadeResult<TaskResultMap[K]> {
  return {
    taskId,
    provider,
    modelId,
    timestamp: new Date().toISOString(),
    executionTimeMs: 0,
    data: [],
    metadata: {
      totalResults: 0,
      sourcesCited: 0,
      avgConfidence: 0,
      geographicScope: "london",
      dateRange: "",
    },
    errors,
  };
}

function extractJsonFromText<T>(text: string): T[] {
  const cleaned = text.split(/\nCitations:\n/i)[0].trim();
  const noFences = cleaned.replace(/```(?:json)?\s*/gi, "").replace(/```\s*/g, "").trim();

  const arrayMatch = noFences.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]) as T[];
    } catch (e) {
      console.error(`[anthropic] JSON array parse failed: ${e instanceof Error ? e.message : String(e)}. First 200 chars: ${arrayMatch[0].slice(0, 200)}`);
    }
  }

  const objMatch = noFences.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      const obj = JSON.parse(objMatch[0]) as Record<string, unknown>;
      for (const key of ["data", "results", "items", "companies", "reports", "founders", "scores"]) {
        if (Array.isArray(obj[key])) return obj[key] as T[];
      }
      return [obj as unknown as T];
    } catch (e) {
      console.error(`[anthropic] JSON object parse failed: ${e instanceof Error ? e.message : String(e)}. First 200 chars: ${objMatch[0].slice(0, 200)}`);
    }
  }

  return [];
}

function countCitations(text: string): number {
  const urlPattern = /https?:\/\/[^\s"',)}\]]+/g;
  const matches = text.match(urlPattern);
  return matches ? new Set(matches).size : 0;
}
