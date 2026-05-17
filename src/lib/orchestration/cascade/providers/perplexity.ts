/* ═══════════════════════════════════════════════════════════════════════════
   Perplexity Provider — Sonar Pro (search is built-in, no tool needed)
   API: https://docs.perplexity.ai/docs/sonar/quickstart
   ═══════════════════════════════════════════════════════════════════════════ */

import type {
  CascadeProvider,
  CascadeResult,
  CascadeTaskId,
  TaskResultMap,
} from "../types";
import { PROVIDER_CONFIGS } from "../types";

export function createPerplexityProvider(): CascadeProvider {
  const config = PROVIDER_CONFIGS.perplexity;

  return {
    id: "perplexity",

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
        const res = await fetch(`${config.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: config.modelId,
            messages: [
              {
                role: "system",
                content:
                  "You are a research evaluator for a London tech ecosystem intelligence platform. " +
                  "Return all data as valid JSON. All data must be London-headquartered or London-based only. " +
                  "Cite your sources for every data point.",
              },
              { role: "user", content: prompt },
            ],
          }),
          signal: AbortSignal.timeout(180_000),
        });

        if (!res.ok) {
          const errText = await res.text();
          return emptyResult(taskId, config.modelId, [
            `Perplexity API error ${res.status}: ${errText}`,
          ]);
        }

        const json = await res.json();
        const rawText = json.choices?.[0]?.message?.content ?? "";

        let citations: string[] = json.citations ?? [];
        if (citations.length === 0) {
          citations = extractUrlsFromText(rawText);
        }

        const parsed = extractJsonFromText<TaskResultMap[K]>(rawText);
        const executionTimeMs = Date.now() - startTime;

        if (parsed.length === 0) {
          console.warn(`[perplexity] Zero results parsed for ${taskId}. Raw content (first 500 chars): ${rawText.slice(0, 500)}`);
        } else {
          console.log(`[perplexity] Parsed ${parsed.length} results for ${taskId} in ${executionTimeMs}ms`);
        }

        return {
          taskId,
          provider: "perplexity",
          modelId: config.modelId,
          timestamp: new Date().toISOString(),
          executionTimeMs,
          data: parsed,
          metadata: {
            totalResults: parsed.length,
            sourcesCited: citations.length || countCitations(rawText),
            avgConfidence: 0.75,
            geographicScope: "london",
            dateRange: "2025-03 to 2026-03",
          },
          errors: [],
        };
      } catch (err) {
        return emptyResult(taskId, config.modelId, [
          `Perplexity request failed: ${err instanceof Error ? err.message : String(err)}`,
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
    provider: "perplexity",
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
      console.error(`[perplexity] JSON array parse failed: ${e instanceof Error ? e.message : String(e)}. First 200 chars: ${arrayMatch[0].slice(0, 200)}`);
    }
  }

  const objMatch = noFences.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      const obj = JSON.parse(objMatch[0]) as Record<string, unknown>;
      for (const key of ["data", "results", "items", "companies", "reports", "founders", "scores"]) {
        if (Array.isArray(obj[key])) {
          return obj[key] as T[];
        }
      }
      return [obj as unknown as T];
    } catch (e) {
      console.error(`[perplexity] JSON object parse failed: ${e instanceof Error ? e.message : String(e)}. First 200 chars: ${objMatch[0].slice(0, 200)}`);
    }
  }

  return [];
}

function extractUrlsFromText(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s\])"',>]+)/g;
  const found: string[] = [];
  let m;
  while ((m = urlRegex.exec(text)) !== null) {
    found.push(m[1]);
  }
  return [...new Set(found)];
}

function countCitations(text: string): number {
  return extractUrlsFromText(text).length;
}
