/* ═══════════════════════════════════════════════════════════════════════════
   xAI Provider — Grok 4.20 Beta with web_search + x_search
   API: https://docs.x.ai/docs/guides/live-search
   Model: grok-4.20-beta-0309-reasoning (2M context, agentic tool calling)
   Endpoint: POST /v1/responses (Responses API — required for server-side tools)
   ═══════════════════════════════════════════════════════════════════════════ */

import type {
  CascadeProvider,
  CascadeResult,
  CascadeTaskId,
  TaskResultMap,
} from "../types";
import { PROVIDER_CONFIGS } from "../types";

export function createXAIProvider(): CascadeProvider {
  const config = PROVIDER_CONFIGS.grok;

  return {
    id: "grok",

    isConfigured(): boolean {
      return !!process.env[config.apiKeyEnvVar];
    },

    async execute<K extends CascadeTaskId>(
      taskId: K,
      prompt: string,
    ): Promise<CascadeResult<TaskResultMap[K]>> {
      const apiKey = process.env[config.apiKeyEnvVar];
      if (!apiKey) {
        return emptyResult(taskId, config.modelId, [
          `${config.apiKeyEnvVar} not configured`,
        ]);
      }

      const startTime = Date.now();

      try {
        const res = await fetch(`${config.baseUrl}/responses`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: config.modelId,
            input: [{ role: "user", content: prompt }],
            tools: [
              { type: "web_search" },
              { type: "x_search" },
            ],
          }),
          signal: AbortSignal.timeout(180_000),
        });

        if (!res.ok) {
          const errText = await res.text();
          return emptyResult(taskId, config.modelId, [
            `xAI API error ${res.status}: ${errText}`,
          ]);
        }

        const json = await res.json();

        const rawText =
          json.output_text ??
          (json.output ?? [])
            .filter((item: { type: string }) => item.type === "message")
            .flatMap((item: { content: { text: string }[] }) =>
              (item.content ?? []).map(
                (c: { text: string }) => c.text ?? "",
              ),
            )
            .join("\n") ??
          "";

        const parsed = extractJsonFromText<TaskResultMap[K]>(rawText);
        const executionTimeMs = Date.now() - startTime;

        return {
          taskId,
          provider: "grok",
          modelId: config.modelId,
          timestamp: new Date().toISOString(),
          executionTimeMs,
          data: parsed,
          metadata: {
            totalResults: parsed.length,
            sourcesCited: countCitations(rawText),
            avgConfidence: 0.65,
            geographicScope: "london",
            dateRange: "2025-03 to 2026-03",
          },
          errors: [],
        };
      } catch (err) {
        return emptyResult(taskId, config.modelId, [
          `xAI request failed: ${err instanceof Error ? err.message : String(err)}`,
        ]);
      }
    },
  };
}

function emptyResult<K extends CascadeTaskId>(
  taskId: K,
  modelId: string,
  errors: string[],
): CascadeResult<TaskResultMap[K]> {
  return {
    taskId,
    provider: "grok",
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
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]) as T[];
    } catch {
      /* fall through */
    }
  }
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      return [JSON.parse(objMatch[0]) as T];
    } catch {
      /* fall through */
    }
  }
  return [];
}

function countCitations(text: string): number {
  const matches = text.match(/https?:\/\/[^\s"',)}\]]+/g);
  return matches ? new Set(matches).size : 0;
}
