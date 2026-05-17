/* ═══════════════════════════════════════════════════════════════════════════
   Kimi Provider — Moonshot AI K2.6 (256K context, websearch via tool)
   API: https://platform.kimi.com/docs
   ═══════════════════════════════════════════════════════════════════════════ */

import type {
  CascadeProvider,
  CascadeResult,
  CascadeTaskId,
  TaskResultMap,
} from "../types";
import { PROVIDER_CONFIGS } from "../types";

export function createKimiProvider(): CascadeProvider {
  const config = PROVIDER_CONFIGS.kimi;

  return {
    id: "kimi",

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
                  "Cite your sources for every data point. Use web search to find current information.",
              },
              { role: "user", content: prompt },
            ],
            tools: [
              {
                type: "builtin_function",
                function: { name: "web_search" },
              },
            ],
          }),
          signal: AbortSignal.timeout(180_000),
        });

        if (!res.ok) {
          const errText = await res.text();
          return emptyResult(taskId, config.modelId, [
            `Kimi API error ${res.status}: ${errText}`,
          ]);
        }

        const json = await res.json();
        const rawText = json.choices?.[0]?.message?.content ?? "";

        const citations = extractUrlsFromText(rawText);
        const parsed = extractJsonFromText<TaskResultMap[K]>(rawText);
        const executionTimeMs = Date.now() - startTime;

        if (parsed.length === 0) {
          console.warn(`[kimi] Zero results parsed for ${taskId}. Raw content (first 500 chars): ${rawText.slice(0, 500)}`);
        } else {
          console.log(`[kimi] Parsed ${parsed.length} results for ${taskId} in ${executionTimeMs}ms`);
        }

        return {
          taskId,
          provider: "kimi",
          modelId: config.modelId,
          timestamp: new Date().toISOString(),
          executionTimeMs,
          data: parsed,
          metadata: {
            totalResults: parsed.length,
            sourcesCited: citations.length,
            avgConfidence: 0.70,
            geographicScope: "london",
            dateRange: "2025-03 to 2026-03",
          },
          errors: [],
        };
      } catch (err) {
        return emptyResult(taskId, config.modelId, [
          `Kimi request failed: ${err instanceof Error ? err.message : String(err)}`,
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
    provider: "kimi",
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
      console.error(`[kimi] JSON array parse failed: ${e instanceof Error ? e.message : String(e)}. First 200 chars: ${arrayMatch[0].slice(0, 200)}`);
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
      console.error(`[kimi] JSON object parse failed: ${e instanceof Error ? e.message : String(e)}. First 200 chars: ${objMatch[0].slice(0, 200)}`);
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
