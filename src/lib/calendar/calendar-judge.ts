// =============================================================================
// AGENTIC CALENDAR — Opus Judge Step
// Uses Claude Opus to validate calendar entries for quality, completeness,
// and scheduling conflicts. Follows the same judge pattern as the cascade
// pipeline (src/lib/cascade/orchestrator.ts Phase 3).
// =============================================================================

import { z } from "zod";

// ─── Types ───

export interface CalendarJudgeEntry {
  id: string;
  title: string;
  category: string;
  priority: string;
  startDatetime: string;
  endDatetime: string;
  description: string | null;
  location: string | null;
  allDay: boolean;
}

export interface CalendarJudgeVerdict {
  entryId: string;
  confidence: number; // 0.0 - 1.0
  issues: string[];
  suggestions: string[];
  conflictsWith: string[]; // IDs of conflicting entries
}

export interface CalendarJudgeResult {
  verdicts: CalendarJudgeVerdict[];
  summary: string;
  confidenceReport: {
    total: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    flagged: number;
  };
  schedulingConflicts: {
    entryA: string;
    entryB: string;
    overlapMinutes: number;
    suggestion: string;
  }[];
}

// ─── Zod Schema for Opus response ───

const verdictSchema = z.object({
  entryId: z.string(),
  confidence: z.number().min(0).max(1),
  issues: z.array(z.string()).default([]),
  suggestions: z.array(z.string()).default([]),
  conflictsWith: z.array(z.string()).default([]),
});

const schedulingConflictSchema = z.object({
  entryA: z.string(),
  entryB: z.string(),
  overlapMinutes: z.number(),
  suggestion: z.string().default(""),
});

const judgeResultSchema = z.object({
  verdicts: z.array(verdictSchema),
  summary: z.string().default(""),
  confidenceReport: z.object({
    total: z.number(),
    highConfidence: z.number(),
    mediumConfidence: z.number(),
    lowConfidence: z.number(),
    flagged: z.number(),
  }),
  schedulingConflicts: z.array(schedulingConflictSchema).default([]),
});

// ─── Opus API Call ───

async function callOpus(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-7",
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
    signal: AbortSignal.timeout(120_000), // 120s timeout for Opus calls
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic Opus API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const textBlocks = (data.content || []).filter(
    (block: { type: string }) => block.type === "text"
  );
  return textBlocks.map((b: { text: string }) => b.text).join("\n");
}

// ─── JSON Extraction ───

function extractJson(text: string): string {
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();

  const jsonMatch = text.match(/(\{[\s\S]*\})/);
  if (jsonMatch) return jsonMatch[1].trim();

  return text.trim();
}

// ─── Judge Prompt ───

const JUDGE_SYSTEM_PROMPT = `You are Opus, the AI Judge for the London Tech Map Agentic Calendar system.
Your role is to review calendar entries for a London-based startup founder and assess:
1. COMPLETENESS: Does each entry have sufficient detail (title, time, category)?
2. QUALITY: Are titles meaningful? Are categories correctly assigned?
3. SCHEDULING CONFLICTS: Do any entries overlap in time?
4. PRIORITY ACCURACY: Does the assigned priority match the event importance?

CONFIDENCE SCORING (0.0 to 1.0):
- HIGH (0.85-1.0): Entry is complete, well-categorized, no conflicts
- MEDIUM (0.5-0.84): Minor issues (vague title, possibly wrong category)
- LOW (0.2-0.49): Significant issues (missing key details, wrong category, overlaps)
- FLAGGED (<0.2): Critical problems requiring user attention

Be concise. Return only JSON.`;

function buildJudgePrompt(entries: CalendarJudgeEntry[], userContext: string): string {
  const entriesJson = JSON.stringify(entries, null, 2);
  return `Review the following ${entries.length} calendar entries for a London startup founder.

USER CONTEXT: ${userContext}

ENTRIES TO REVIEW:
${entriesJson}

For each entry, provide:
- confidence score (0.0-1.0)
- any issues found
- improvement suggestions
- IDs of conflicting entries (time overlaps)

Also detect scheduling conflicts (entries that overlap in time).

Return ONLY this JSON (no markdown, no backticks):
{"verdicts":[{"entryId":"...","confidence":0.9,"issues":[],"suggestions":[],"conflictsWith":[]}],"summary":"...","confidenceReport":{"total":${entries.length},"highConfidence":0,"mediumConfidence":0,"lowConfidence":0,"flagged":0},"schedulingConflicts":[{"entryA":"id1","entryB":"id2","overlapMinutes":30,"suggestion":"..."}]}`;
}

// ─── Public API ───

/**
 * Run the Opus judge on a batch of calendar entries.
 * Returns per-entry confidence scores, issues, and scheduling conflict detection.
 * This function is additive — call it when you want AI quality review of calendar data.
 */
export async function judgeCalendarEntries(
  entries: CalendarJudgeEntry[],
  userContext: string = "London-based startup founder"
): Promise<CalendarJudgeResult> {
  if (entries.length === 0) {
    return {
      verdicts: [],
      summary: "No entries to review.",
      confidenceReport: {
        total: 0,
        highConfidence: 0,
        mediumConfidence: 0,
        lowConfidence: 0,
        flagged: 0,
      },
      schedulingConflicts: [],
    };
  }

  // Batch if more than 25 entries (matching cascade pattern)
  const BATCH_SIZE = 25;
  const batches: CalendarJudgeEntry[][] = [];
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    batches.push(entries.slice(i, i + BATCH_SIZE));
  }

  const allVerdicts: CalendarJudgeVerdict[] = [];
  const allConflicts: CalendarJudgeResult["schedulingConflicts"] = [];
  const report = { total: 0, highConfidence: 0, mediumConfidence: 0, lowConfidence: 0, flagged: 0 };
  let combinedSummary = "";

  const batchResults = await Promise.allSettled(
    batches.map(async (batch) => {
      const prompt = buildJudgePrompt(batch, userContext);
      const rawResponse = await callOpus(JUDGE_SYSTEM_PROMPT, prompt);
      const jsonStr = extractJson(rawResponse);
      const parsed = JSON.parse(jsonStr);
      return judgeResultSchema.safeParse(parsed);
    })
  );

  for (const result of batchResults) {
    if (result.status === "fulfilled" && result.value.success) {
      const data = result.value.data;
      allVerdicts.push(...data.verdicts);
      allConflicts.push(...data.schedulingConflicts);
      report.total += data.confidenceReport.total;
      report.highConfidence += data.confidenceReport.highConfidence;
      report.mediumConfidence += data.confidenceReport.mediumConfidence;
      report.lowConfidence += data.confidenceReport.lowConfidence;
      report.flagged += data.confidenceReport.flagged;
      if (data.summary) {
        combinedSummary += (combinedSummary ? " " : "") + data.summary;
      }
    } else {
      const reason = result.status === "rejected"
        ? result.reason instanceof Error ? result.reason.message : "Unknown error"
        : "Validation failed";
      console.error("[Calendar Judge] Batch failed:", reason);
    }
  }

  return {
    verdicts: allVerdicts,
    summary: combinedSummary || "Judge review complete.",
    confidenceReport: report,
    schedulingConflicts: allConflicts,
  };
}
