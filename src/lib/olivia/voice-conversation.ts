// src/lib/olivia/voice-conversation.ts
// Olivia voice conversation engine
// Handles LLM calls for generating conversational responses and extracting data

import {
  buildConversationPrompt,
  buildExtractionPrompt,
  buildQuickActionPrompt,
  buildQuickActionDetectionPrompt,
  buildDictationDetectionPrompt,
  isLikelyQuickAction,
  OLIVIA_GREETINGS,
  OLIVIA_FALLBACKS,
  QUICK_ACTION_CONFIRMATIONS,
  DICTATION_PROMPTS,
} from "./voice-prompts";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface ConversationTurn {
  role: "caller" | "olivia";
  text: string;
  timestamp: Date;
}

export interface ExtractedEntities {
  name?: string | null;
  email?: string | null;
  company?: string | null;
  role?: string | null;
  location?: string | null;
  industry?: string | null;
  needs?: string[];
  goals?: string[];
  painPoints?: string[];
  appointmentDate?: string | null;
  appointmentTime?: string | null;
  appointmentPurpose?: string | null;
}

export interface ActionItem {
  action: string;
  assignedTo: string;
  dueDate?: string | null;
  priority: "low" | "medium" | "high" | "urgent";
}

export interface ConversationResponse {
  response: string;
  entities: ExtractedEntities;
  intent: string;
  shouldEndCall: boolean;
  actionItems: ActionItem[];
}

export interface ExtractionResult {
  contact: {
    firstName?: string | null;
    lastName?: string | null;
    fullName?: string | null;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    role?: string | null;
    location?: string | null;
    industry?: string | null;
    companySize?: string | null;
  };
  psychographics: {
    needs: string[];
    interests: string[];
    goals: string[];
    painPoints: string[];
    communicationStyle?: string | null;
  };
  appointment: {
    requested: boolean;
    dateTime?: string | null;
    dateDescription?: string | null;
    location?: string | null;
    isZoom: boolean;
    zoomLink?: string | null;
    purpose?: string | null;
  };
  actionItems: ActionItem[];
  conversationType: string;
  summary: string;
  keyTopics: string[];
  sentiment: string;
  followUpNeeded: boolean;
  followUpReason?: string | null;
  nextBestAction?: string | null;
}

export interface QuickActionDetection {
  isQuickAction: boolean;
  confidence: number;
  actionType: "reminder" | "schedule" | "message" | "note" | "todo" | "query" | "other";
  extracted: {
    targetPerson?: string | null;
    task?: string | null;
    dueDate?: string | null;
    subject?: string | null;
  };
  needsClarification: boolean;
  missingInfo: string[];
}

export interface DictationDetection {
  wantsDictation: boolean;
  confidence: number;
  contentType: "proposal" | "email" | "notes" | "memo" | "idea" | "general" | "unknown";
  hasStartedDictating: boolean;
  initialContent?: string | null;
}

export interface PreviousCallContext {
  callId: string;
  date: Date;
  duration?: number;
  summary?: string;
  keyTopics?: string[];
  conversationType: string;
  actionItems?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL_ID = "claude-sonnet-4-6"; // Fast + good for conversations
const MAX_TOKENS_CONVERSATION = 1024; // Keep responses concise
const MAX_TOKENS_EXTRACTION = 4096; // More room for full extraction
const TIMEOUT_MS = 30_000; // 30 second timeout for live calls

// ═══════════════════════════════════════════════════════════════════════════
// Core Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if Anthropic API is configured
 */
export function isAnthropicConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * Call Anthropic API with a prompt
 */
async function callAnthropic(
  prompt: string,
  maxTokens: number = MAX_TOKENS_CONVERSATION
): Promise<{ success: boolean; text?: string; error?: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { success: false, error: "ANTHROPIC_API_KEY not configured" };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL_ID,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.error("[VoiceConversation] Anthropic API error:", response.status, errText);
      return { success: false, error: `API error ${response.status}` };
    }

    const json = await response.json();
    const textBlocks = (json.content ?? []).filter(
      (b: { type: string }) => b.type === "text"
    );
    const text = textBlocks.map((b: { text: string }) => b.text).join("\n");

    return { success: true, text };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { success: false, error: "Request timed out" };
    }
    console.error("[VoiceConversation] Request failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Extract JSON from LLM response text
 */
function extractJson<T>(text: string): T | null {
  // Remove markdown code fences if present
  const cleaned = text
    .replace(/```(?:json)?\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // Try to find JSON object
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]) as T;
    } catch (e) {
      console.error("[VoiceConversation] JSON parse error:", e);
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Format conversation turns into a transcript string
 */
export function formatTranscript(turns: ConversationTurn[]): string {
  return turns
    .map((turn) => {
      const speaker = turn.role === "olivia" ? "Olivia" : "Caller";
      return `${speaker}: ${turn.text}`;
    })
    .join("\n");
}

/**
 * Generate Olivia's opening greeting based on call type
 */
export function getGreeting(
  direction: "inbound" | "outbound",
  conversationType?: string
): string {
  if (direction === "outbound") {
    if (conversationType === "quick_action") {
      return OLIVIA_GREETINGS.quickAction;
    }
    if (conversationType === "follow_up") {
      return OLIVIA_GREETINGS.followUp;
    }
    return OLIVIA_GREETINGS.outbound;
  }
  return OLIVIA_GREETINGS.inbound;
}

/**
 * Generate a conversational response during a live call
 */
export async function generateResponse(params: {
  transcript: string;
  extractedSoFar: Record<string, unknown>;
  callerInfo?: { phone: string; name?: string; company?: string };
  conversationType?: string;
  previousCallsContext?: string;
}): Promise<ConversationResponse> {
  // Check if API is configured
  if (!isAnthropicConfigured()) {
    console.warn("[VoiceConversation] Anthropic not configured, using fallback");
    return {
      response: OLIVIA_FALLBACKS.technicalIssue,
      entities: {},
      intent: "general",
      shouldEndCall: false,
      actionItems: [],
    };
  }

  // Build and send prompt
  const prompt = buildConversationPrompt(params);
  const result = await callAnthropic(prompt, MAX_TOKENS_CONVERSATION);

  if (!result.success || !result.text) {
    console.error("[VoiceConversation] Failed to generate response:", result.error);
    return {
      response: OLIVIA_FALLBACKS.technicalIssue,
      entities: {},
      intent: "general",
      shouldEndCall: false,
      actionItems: [],
    };
  }

  // Parse response
  const parsed = extractJson<ConversationResponse>(result.text);
  if (!parsed) {
    console.error("[VoiceConversation] Failed to parse response JSON");
    return {
      response: OLIVIA_FALLBACKS.holdOn,
      entities: {},
      intent: "general",
      shouldEndCall: false,
      actionItems: [],
    };
  }

  return {
    response: parsed.response || OLIVIA_FALLBACKS.holdOn,
    entities: parsed.entities || {},
    intent: parsed.intent || "general",
    shouldEndCall: parsed.shouldEndCall || false,
    actionItems: parsed.actionItems || [],
  };
}

/**
 * Extract structured data from a complete transcript (post-call)
 */
export async function extractFromTranscript(
  transcript: string
): Promise<ExtractionResult | null> {
  if (!isAnthropicConfigured()) {
    console.error("[VoiceConversation] Anthropic not configured for extraction");
    return null;
  }

  const prompt = buildExtractionPrompt(transcript);
  const result = await callAnthropic(prompt, MAX_TOKENS_EXTRACTION);

  if (!result.success || !result.text) {
    console.error("[VoiceConversation] Extraction failed:", result.error);
    return null;
  }

  const parsed = extractJson<ExtractionResult>(result.text);
  if (!parsed) {
    console.error("[VoiceConversation] Failed to parse extraction JSON");
    return null;
  }

  return parsed;
}

/**
 * Process a quick action call
 */
export async function processQuickAction(transcript: string): Promise<{
  actions: ActionItem[];
  confirmationMessage: string;
  needsClarification: boolean;
  clarificationQuestion?: string;
} | null> {
  if (!isAnthropicConfigured()) {
    console.error("[VoiceConversation] Anthropic not configured for quick action");
    return null;
  }

  const prompt = buildQuickActionPrompt(transcript);
  const result = await callAnthropic(prompt, MAX_TOKENS_CONVERSATION);

  if (!result.success || !result.text) {
    console.error("[VoiceConversation] Quick action processing failed:", result.error);
    return null;
  }

  const parsed = extractJson<{
    actions: ActionItem[];
    confirmationMessage: string;
    needsClarification: boolean;
    clarificationQuestion?: string;
  }>(result.text);

  return parsed;
}

/**
 * Get a fallback response when LLM is unavailable
 */
export function getFallbackResponse(situation: keyof typeof OLIVIA_FALLBACKS): string {
  return OLIVIA_FALLBACKS[situation] || OLIVIA_FALLBACKS.technicalIssue;
}

// ═══════════════════════════════════════════════════════════════════════════
// Quick Action & Dictation Detection
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect if utterance is a quick action (30-second bullet)
 * Uses fast regex check first, then LLM verification if needed
 */
export async function detectQuickAction(
  utterance: string
): Promise<QuickActionDetection | null> {
  // Fast path: regex check first
  const likelyQuickAction = isLikelyQuickAction(utterance);

  // If regex doesn't match and utterance is long, probably not quick action
  if (!likelyQuickAction && utterance.length > 150) {
    return {
      isQuickAction: false,
      confidence: 0.8,
      actionType: "other",
      extracted: {},
      needsClarification: false,
      missingInfo: [],
    };
  }

  // Use LLM for detailed extraction
  if (!isAnthropicConfigured()) {
    // Without LLM, rely on regex result
    return {
      isQuickAction: likelyQuickAction,
      confidence: likelyQuickAction ? 0.6 : 0.3,
      actionType: "other",
      extracted: {},
      needsClarification: true,
      missingInfo: ["Unable to parse details without LLM"],
    };
  }

  const prompt = buildQuickActionDetectionPrompt(utterance);
  const result = await callAnthropic(prompt, 512);

  if (!result.success || !result.text) {
    // Fallback to regex result
    return {
      isQuickAction: likelyQuickAction,
      confidence: likelyQuickAction ? 0.5 : 0.3,
      actionType: "other",
      extracted: {},
      needsClarification: true,
      missingInfo: ["LLM unavailable"],
    };
  }

  const parsed = extractJson<QuickActionDetection>(result.text);
  return parsed;
}

/**
 * Detect if caller wants to enter dictation mode
 */
export async function detectDictation(
  utterance: string
): Promise<DictationDetection | null> {
  if (!isAnthropicConfigured()) {
    // Simple heuristic without LLM
    const dictationKeywords = [
      /dictate/i,
      /take\s+this\s+down/i,
      /long\s+message/i,
      /record\s+this/i,
      /notes?\s+for/i,
    ];
    const wantsDictation = dictationKeywords.some((p) => p.test(utterance));
    return {
      wantsDictation,
      confidence: wantsDictation ? 0.5 : 0.3,
      contentType: "unknown",
      hasStartedDictating: false,
      initialContent: null,
    };
  }

  const prompt = buildDictationDetectionPrompt(utterance);
  const result = await callAnthropic(prompt, 512);

  if (!result.success || !result.text) {
    return null;
  }

  return extractJson<DictationDetection>(result.text);
}

/**
 * Build a quick action confirmation message
 */
export function buildQuickActionConfirmation(
  actionType: string,
  extracted: QuickActionDetection["extracted"]
): string {
  if (actionType === "reminder" && extracted.targetPerson && extracted.task) {
    const duePhrase = extracted.dueDate ? ` by ${extracted.dueDate}` : "";
    return QUICK_ACTION_CONFIRMATIONS.reminder
      .replace("{target}", extracted.targetPerson)
      .replace("{task}", extracted.task)
      .replace("{duePhrase}", duePhrase);
  }

  if (actionType === "schedule" && extracted.dueDate) {
    return QUICK_ACTION_CONFIRMATIONS.schedule.replace("{date}", extracted.dueDate);
  }

  if (actionType === "note" || actionType === "todo") {
    return QUICK_ACTION_CONFIRMATIONS[actionType];
  }

  if (actionType === "query") {
    return QUICK_ACTION_CONFIRMATIONS.query;
  }

  return OLIVIA_FALLBACKS.confirm;
}

/**
 * Get dictation mode response
 */
export function getDictationResponse(
  stage: keyof typeof DICTATION_PROMPTS,
  params?: { summary?: string }
): string {
  let response = DICTATION_PROMPTS[stage];
  if (params?.summary && response.includes("{summary}")) {
    response = response.replace("{summary}", params.summary);
  }
  return response;
}

// ═══════════════════════════════════════════════════════════════════════════
// Previous Call Context
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Format previous call context for inclusion in LLM prompt
 */
export function formatPreviousCallContext(calls: PreviousCallContext[]): string {
  if (!calls || calls.length === 0) {
    return "";
  }

  const formatted = calls.map((call, i) => {
    const date = new Date(call.date);
    const dateStr = date.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const durationStr = call.duration ? ` (${Math.round(call.duration / 60)} min)` : "";

    let entry = `${i + 1}. ${dateStr}${durationStr} - ${call.conversationType}`;

    if (call.summary) {
      entry += `\n   Summary: ${call.summary}`;
    }

    if (call.keyTopics && call.keyTopics.length > 0) {
      entry += `\n   Topics: ${call.keyTopics.join(", ")}`;
    }

    if (call.actionItems && call.actionItems.length > 0) {
      entry += `\n   Action items: ${call.actionItems.join("; ")}`;
    }

    return entry;
  });

  return `
PREVIOUS CONVERSATIONS WITH THIS CALLER:
${formatted.join("\n\n")}

Use this context naturally - you can reference previous conversations when relevant.
For example: "I see we spoke last week about X..." or "Following up on our previous discussion..."
`;
}

/**
 * Build prompt context for previous calls
 * To be used by the gather route when generating responses
 */
export function buildPreviousCallsPromptSection(
  previousCalls: PreviousCallContext[]
): string {
  if (!previousCalls || previousCalls.length === 0) {
    return "";
  }

  return formatPreviousCallContext(previousCalls);
}
