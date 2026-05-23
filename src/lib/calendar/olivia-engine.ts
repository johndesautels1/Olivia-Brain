// =============================================================================
// AGENTIC CALENDAR — Olivia Intelligence Engine
// NLP parsing, prep task generation, proactive suggestions.
//
// LLM call discipline (both functions now Law-3-compliant):
//   - `callSonnet`            routes through `callLLM` (text-only).
//   - `callSonnetWithTools`   routes through `callLLMWithTools`
//                             (iterative agentic tool-loop). Both
//                             inherit cost/token tracking, retry,
//                             graceful degrade, and provider abstraction
//                             from the canonical wrapper layer.
//
// NOW WITH FULL TOOL ACCESS — Olivia can search programs, events, orgs, etc.
// =============================================================================

import { buildNlpParsePrompt, buildPrepPlanPrompt, buildProactiveSuggestionPrompt, buildDailyBriefPrompt, buildMemoryExtractionPrompt, OLIVIA_CALENDAR_SYSTEM_PROMPT } from "./olivia-prompts";
import { getCategoryConfig, isOliviaPrepEnabled } from "./event-categories";
import { nlpParseResultSchema, prepPlanResultSchema, proactiveSuggestionsArraySchema, dailyBriefResultSchema, memoryExtractionResultSchema } from "./olivia-schemas";
import { OLIVIA_TOOLS, executeOliviaTool } from "@/lib/olivia/tools";
import { callLLM, callLLMWithTools, type LLMTool } from "@/lib/agents/llm";

// ─── Types ───

export interface NlpParseResult {
  success: boolean;
  extracted_event: {
    title: string;
    description: string | null;
    location: string | null;
    virtual_url: string | null;
    start_datetime: string;
    end_datetime: string;
    all_day: boolean;
    entry_type: string;
    category: string;
    priority: string;
    is_vip: boolean;
    tags: string[];
    ecosystem_org_name: string | null;
    investment_stage: string | null;
    attendees: {
      name: string;
      email: string | null;
      phone: string | null;
      role: string;
      isOrganizer: boolean;
    }[];
  } | null;
  missing_fields: string[];
  clarification_needed: boolean;
  clarification_questions: string[];
  olivia_message: string;
  confidence: string;
}

export interface PrepPlanResult {
  agenda: string;
  prep_tasks: {
    title: string;
    description: string;
    due_date_offset_hours: number;
    priority: string;
    linked_document_type: string | null;
    auto_generate: boolean;
  }[];
  key_talking_points: string[];
  questions_to_prepare: string[];
  olivia_briefing: string;
}

export interface ProactiveSuggestion {
  message: string;
  type: string;
  urgency: string;
  trigger: {
    type: string;
    description: string;
  };
  event_draft: {
    title: string;
    category: string;
    suggested_datetime: string;
    duration_minutes: number;
    description: string;
    location: string | null;
  } | null;
  reasoning: string;
  confidence: string;
}

// ─── LLM Call Helper ───
// Routes through `callLLM` (the canonical wrapper) for calendar
// intelligence tasks. Inherits cost/token tracking, structured logging,
// retry, and graceful-degrade-to-null semantics from the wrapper.

async function callSonnet(systemPrompt: string, userPrompt: string): Promise<string> {
  const result = await callLLM({
    model: "claude-sonnet-4-6",
    systemPrompt,
    userPrompt,
    temperature: 0.4, // Lower temperature for more consistent, less hallucinatory responses
    maxTokens: 4096,
    timeoutMs: 60_000, // 60s timeout for Sonnet calls
  });
  if (!result) {
    /* `callLLM` returns null on missing API key OR call failure. Both
     * surface here as an Error to preserve the prior raw-fetch
     * contract — callers wrap this in try/catch. */
    throw new Error("Sonnet call failed (missing key or upstream error — see callLLM logs)");
  }
  return result.text;
}

// ─── Agentic LLM Call with Tools ───
// Routes through `callLLMWithTools` per Architecture Standards Law 3.
// Inherits cost/token tracking, structured logging, retry, graceful
// degrade, and the iterative tool-loop semantics from the canonical
// wrapper. Tool execution delegates to the `OLIVIA_TOOLS` registry via
// the same `executeOliviaTool` dispatcher as before — call sites stay
// identical from the model's perspective.

/* Translate the existing OpenAI-shaped OLIVIA_TOOLS array to the
 * vendor-neutral LLMTool shape consumed by callLLMWithTools. This is
 * a pure data-shape rename — name + description pass through; the
 * OpenAI `parameters` JSON-Schema becomes our `inputSchema`. */
const OLIVIA_TOOLS_LLM: readonly LLMTool[] = OLIVIA_TOOLS.map((tool) => {
  const funcTool = tool as {
    type: "function";
    function: { name: string; description: string; parameters: object };
  };
  return {
    name: funcTool.function.name,
    description: funcTool.function.description,
    inputSchema: funcTool.function.parameters as Record<string, unknown>,
  };
});

async function callSonnetWithTools(
  systemPrompt: string,
  userPrompt: string,
  userId?: string | null,
): Promise<string> {
  const result = await callLLMWithTools({
    model: "claude-sonnet-4-6",
    systemPrompt,
    userPrompt,
    temperature: 0.4,
    maxTokens: 4096,
    timeoutMs: 60_000,
    tools: OLIVIA_TOOLS_LLM,
    maxToolIterations: 5,
    /* Bridge the wrapper's vendor-neutral `LLMToolUse` to the existing
     * `executeOliviaTool` dispatcher. JSON-stringify the dispatcher's
     * structured return so the model sees readable content (same shape
     * as the prior raw-fetch code). On dispatcher throw, callLLMWithTools
     * surfaces the error as is_error tool_result content; here we
     * defensively also stringify any structured error payloads the
     * dispatcher might return rather than throw. */
    executeTool: async (toolUse) => {
      const dispatcherResult = await executeOliviaTool(
        toolUse.name,
        toolUse.input,
        userId,
      );
      return JSON.stringify(dispatcherResult, null, 2);
    },
  });

  if (!result) {
    /* callLLMWithTools returns null on every failure mode (missing key,
     * non-2xx, exhausted iterations, empty final text). Preserve the
     * prior user-visible fallback so the calendar UI shows a graceful
     * message rather than crashing. */
    return "I'm having trouble completing that request. Please try rephrasing.";
  }
  return result.text;
}

/**
 * Extract JSON from LLM response text.
 * Handles markdown code blocks, preamble text, etc.
 */
function extractJson(text: string): string {
  // Try to find JSON in code blocks first
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();

  // Try to find raw JSON (starts with { or [)
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) return jsonMatch[1].trim();

  return text.trim();
}

// ─── Public API ───

/**
 * Conversation history message format for context passing.
 */
export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Parse natural language into a calendar event using Olivia NLP.
 * Includes conversation history for multi-turn context.
 * NOW AGENTIC: Has full access to database tools (search_platform, get_programs, etc.)
 */
export async function parseNaturalLanguage(
  rawText: string,
  context: {
    userTimezone: string;
    currentDatetime: string;
    recentEventCategories: string[];
    userPrefs: string;
    conversationHistory?: ConversationMessage[];
    userId?: string | null;
  }
): Promise<NlpParseResult> {
  const prompt = buildNlpParsePrompt(rawText, context);

  // Use agentic version with tools so Olivia can query the database
  const rawResponse = await callSonnetWithTools(OLIVIA_CALENDAR_SYSTEM_PROMPT, prompt, context.userId);
  const jsonStr = extractJson(rawResponse);

  try {
    const raw = JSON.parse(jsonStr);
    const validated = nlpParseResultSchema.safeParse(raw);
    if (validated.success) {
      return validated.data as NlpParseResult;
    }
    console.warn("[Olivia NLP] Zod validation failed:", validated.error.issues);

    // Salvage the olivia_message from the raw LLM response if present
    // This preserves conversational replies even when other fields fail validation
    const salvaged: NlpParseResult = {
      success: false,
      extracted_event: null,
      missing_fields: [],
      clarification_needed: false,
      clarification_questions: [],
      olivia_message: typeof raw.olivia_message === "string" && raw.olivia_message.length > 0
        ? raw.olivia_message
        : "I had trouble understanding that request. Could you try rephrasing it?",
      confidence: "low",
    };
    return salvaged;
  } catch {
    return {
      success: false,
      extracted_event: null,
      missing_fields: [],
      clarification_needed: true,
      clarification_questions: ["I couldn't parse that. Could you rephrase?"],
      olivia_message: "I had trouble understanding that request. Could you try rephrasing it?",
      confidence: "low",
    };
  }
}

/**
 * Generate prep tasks for an upcoming event/meeting.
 * Only generates for categories that have oliviaPrepEnabled = true.
 */
export async function generatePrepPlan(event: {
  title: string;
  category: string;
  description: string;
  datetime: string;
  organizerName?: string;
  investmentStage?: string;
}): Promise<PrepPlanResult | null> {
  if (!isOliviaPrepEnabled(event.category)) {
    return null;
  }

  const prompt = buildPrepPlanPrompt(event);
  const rawResponse = await callSonnet(OLIVIA_CALENDAR_SYSTEM_PROMPT, prompt);
  const jsonStr = extractJson(rawResponse);

  try {
    const raw = JSON.parse(jsonStr);
    const validated = prepPlanResultSchema.safeParse(raw);
    if (validated.success) {
      return validated.data as PrepPlanResult;
    }
    console.warn("[Olivia Prep] Zod validation failed:", validated.error.issues);
    return null;
  } catch {
    return null;
  }
}

/**
 * Generate proactive suggestions based on user's calendar and behavior.
 */
export async function generateProactiveSuggestions(context: {
  userProfile: string;
  upcomingEvents: string;
  behaviorPatterns: string;
  currentDate: string;
}): Promise<ProactiveSuggestion[]> {
  const prompt = buildProactiveSuggestionPrompt(context);
  const rawResponse = await callSonnet(OLIVIA_CALENDAR_SYSTEM_PROMPT, prompt);
  const jsonStr = extractJson(rawResponse);

  try {
    const parsed = JSON.parse(jsonStr);
    const items = Array.isArray(parsed) ? parsed : [];
    const validated = proactiveSuggestionsArraySchema.safeParse(items);
    if (validated.success) {
      return validated.data as ProactiveSuggestion[];
    }
    console.warn("[Olivia Suggestions] Zod validation failed:", validated.error.issues);
    return [];
  } catch {
    return [];
  }
}

// ─── Daily Brief Types ───

export interface DailyBriefResult {
  greeting: string;
  day_summary: string;
  schedule_blocks: {
    time: string;
    title: string;
    category: string;
    prep_note: string | null;
    is_high_priority: boolean;
  }[];
  top_priorities: string[];
  suggested_focus_blocks: {
    start_time: string;
    end_time: string;
    suggestion: string;
  }[];
  heads_up: string[];
  olivia_tip: string;
}

/**
 * Generate a daily planning brief based on today's schedule, upcoming events, and patterns.
 */
export async function generateDailyBrief(context: {
  currentDate: string;
  todayEvents: string;
  upcomingHighPriority: string;
  recentPatterns: string;
  userPrefs: string;
}): Promise<DailyBriefResult> {
  const prompt = buildDailyBriefPrompt(context);
  const rawResponse = await callSonnet(OLIVIA_CALENDAR_SYSTEM_PROMPT, prompt);
  const jsonStr = extractJson(rawResponse);

  const fallback: DailyBriefResult = {
    greeting: "Good morning.",
    day_summary: "I couldn't generate your brief right now. Please check your schedule directly.",
    schedule_blocks: [],
    top_priorities: [],
    suggested_focus_blocks: [],
    heads_up: [],
    olivia_tip: "",
  };

  try {
    const raw = JSON.parse(jsonStr);
    const validated = dailyBriefResultSchema.safeParse(raw);
    if (validated.success) {
      return validated.data as DailyBriefResult;
    }
    console.warn("[Olivia DailyBrief] Zod validation failed:", validated.error.issues);
    return fallback;
  } catch {
    return fallback;
  }
}

/**
 * Get the default duration for a category (used by voice/NLP when no duration specified).
 */
export function getDefaultDurationForCategory(category: string): number {
  return getCategoryConfig(category).defaultDurationMins;
}

// ─── Memory Extraction Types (Layer 3) ───

export interface ExtractedFact {
  category: "personal" | "professional" | "behavioral" | "preferences" | "financial" | "platform";
  factKey: string;
  factValue: string;
  confidence: number;
  sourceQuote: string;
  isUpdate: boolean;
}

export interface MemoryExtractionResult {
  extracted_facts: ExtractedFact[];
  updated_facts: ExtractedFact[];
}

/**
 * G1-153 Memory Agent — Extract user facts from a conversation.
 * Analyzes conversation messages and extracts persistent facts about the user.
 * Called after conversations to build the user's memory profile.
 */
export async function extractUserMemory(context: {
  messages: { role: string; content: string }[];
  existingMemories: { category: string; factKey: string; factValue: string }[];
}): Promise<MemoryExtractionResult> {
  const emptyResult: MemoryExtractionResult = {
    extracted_facts: [],
    updated_facts: [],
  };

  // Skip if no messages to analyze
  if (context.messages.length === 0) {
    return emptyResult;
  }

  // Skip if only Olivia messages (no user input to extract from)
  const hasUserMessages = context.messages.some((m) => m.role === "user");
  if (!hasUserMessages) {
    return emptyResult;
  }

  const prompt = buildMemoryExtractionPrompt(context);

  // Use a dedicated system prompt for memory extraction
  const memorySystemPrompt = `
You are the Memory Agent (G1-153) for Olivia, the AI Chief of Staff on London Tech Map.
Your sole purpose is to extract facts about users from their conversations.

## ABSOLUTE RULES
1. Only extract facts explicitly stated by the user — never infer or assume
2. Return valid JSON only — no markdown, no explanations
3. Be conservative — only extract facts you are confident about
4. Respect privacy — don't extract sensitive personal information unless clearly relevant to calendar/business context
5. Focus on facts that will help Olivia provide better service over time
`;

  try {
    const rawResponse = await callSonnet(memorySystemPrompt, prompt);
    const jsonStr = extractJson(rawResponse);

    const raw = JSON.parse(jsonStr);
    const validated = memoryExtractionResultSchema.safeParse(raw);

    if (validated.success) {
      return validated.data as MemoryExtractionResult;
    }

    console.warn("[Olivia Memory] Zod validation failed:", validated.error.issues);
    return emptyResult;
  } catch (err) {
    console.error("[Olivia Memory] Extraction error:", err);
    return emptyResult;
  }
}
