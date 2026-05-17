/* ═══════════════════════════════════════════════════════════════════════════
   Google Provider — Gemini 3.1 Pro with Google Search grounding
   API: https://ai.google.dev/gemini-api/docs/google-search
   ═══════════════════════════════════════════════════════════════════════════ */

import type {
  CascadeProvider,
  CascadeResult,
  CascadeTaskId,
  TaskResultMap,
} from "../types";
import { PROVIDER_CONFIGS } from "../types";

export function createGoogleProvider(): CascadeProvider {
  const config = PROVIDER_CONFIGS.gemini;

  return {
    id: "gemini",

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
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.modelId}:generateContent?key=${apiKey}`;

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            tools: [{ google_search: {} }],
            generationConfig: {
              maxOutputTokens: 16384,
              temperature: 0.2,
            },
          }),
          signal: AbortSignal.timeout(180_000),
        });

        if (!res.ok) {
          const errText = await res.text();
          return emptyResult(taskId, config.modelId, [
            `Gemini API error ${res.status}: ${errText}`,
          ]);
        }

        const json = await res.json();

        const candidate = json.candidates?.[0];
        const rawText =
          candidate?.content?.parts
            ?.map((p: { text?: string }) => p.text ?? "")
            .join("\n") ?? "";

        const groundingMeta = candidate?.groundingMetadata;
        const citationCount =
          groundingMeta?.groundingChunks?.length ?? countCitations(rawText);

        const supports = groundingMeta?.groundingSupports ?? [];
        const avgConf =
          supports.length > 0
            ? supports.reduce(
                (sum: number, s: { confidenceScores?: number[] }) =>
                  sum + (s.confidenceScores?.[0] ?? 0),
                0,
              ) / supports.length
            : 0.6;

        const parsed = extractJsonFromText<TaskResultMap[K]>(rawText);
        const executionTimeMs = Date.now() - startTime;

        return {
          taskId,
          provider: "gemini",
          modelId: config.modelId,
          timestamp: new Date().toISOString(),
          executionTimeMs,
          data: parsed,
          metadata: {
            totalResults: parsed.length,
            sourcesCited: citationCount,
            avgConfidence: Math.round(avgConf * 100) / 100,
            geographicScope: "london",
            dateRange: "2025-03 to 2026-03",
          },
          errors: [],
        };
      } catch (err) {
        return emptyResult(taskId, config.modelId, [
          `Gemini request failed: ${err instanceof Error ? err.message : String(err)}`,
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
    provider: "gemini",
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
