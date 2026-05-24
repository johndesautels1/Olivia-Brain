// src/lib/olivia/voice-document.ts
// Process voice dictations into document-ready content
// Part of Phase 5: Document Cascade Integration
//
// Architecture Standards Law 3: every LLM call routes through the
// canonical `callLLM` wrapper at `src/lib/agents/llm.ts`. Prior to
// the 2026-05-25 refactor this file held its own raw fetch to
// `api.anthropic.com/v1/messages` (TD-equivalent of the registered
// TD-1 violation in LTM); the refactor preserves every observable
// behavior of the prior `callAnthropic(prompt)` -> { success, text?,
// error? } contract while delegating transport, retry, observability,
// and cost-tracking to the shared wrapper. Held to Apple / IBM /
// Microsoft / Google 2026 leading coding practices per `~/CLAUDE.md`
// and `docs/api-specs/_MASTER_REGISTER.md` section 10.4.

import { callLLM } from "@/lib/agents/llm";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface DictationContent {
  // Core content
  title: string;
  summary: string;
  fullContent: string; // Cleaned, structured version of dictation

  // Structured sections (for pitch decks, documents)
  sections: {
    name: string;
    content: string;
    order: number;
  }[];

  // Metadata
  contentType: "pitch" | "proposal" | "memo" | "notes" | "email" | "report" | "general";
  tone: "formal" | "professional" | "casual" | "technical";
  audience: string;

  // Extracted entities
  keyPoints: string[];
  actionItems: string[];
  mentions: {
    people: string[];
    companies: string[];
    dates: string[];
    amounts: string[];
  };

  // Presentation-specific
  suggestedSlides: {
    title: string;
    bulletPoints: string[];
    visualSuggestion?: string;
  }[];

  // Document generation hints
  documentTypes: string[]; // Suggested document types to generate
}

export interface ProcessingResult {
  success: boolean;
  content?: DictationContent;
  error?: string;
  tokensUsed?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════

// Note: the prior `ANTHROPIC_API_URL` constant was removed in the
// callLLM refactor. The endpoint is now owned by `MODEL_MAP` in
// `src/lib/agents/llm.ts`; this file declares only the model + the
// caller-tunable knobs (max tokens, timeout, sampling).
const MODEL_ID = "claude-sonnet-4-6";
const MAX_TOKENS = 8192; // More room for document extraction
const TIMEOUT_MS = 60_000; // 60 seconds for longer processing
// Behavior-preserving: the prior raw fetch omitted `temperature`, which
// causes Anthropic's Messages API to default to 1.0. We pass 1.0
// explicitly so callLLM forwards it; the wire payload is equivalent to
// the prior implicit default.
const TEMPERATURE = 1.0;
// Behavior-preserving: the prior raw fetch omitted `system`. callLLM's
// callAnthropicMessages includes `system: options.systemPrompt`
// unconditionally; the empty string is treated by the Anthropic API
// the same as omission (no system instructions are applied).
const SYSTEM_PROMPT = "";

// ═══════════════════════════════════════════════════════════════════════════
// Prompts
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build prompt for extracting document-ready content from a dictation
 */
export function buildDictationProcessingPrompt(transcript: string, conversationType: string): string {
  return `You are processing a voice dictation from a London tech ecosystem professional. Extract and structure the content for document and presentation generation.

VOICE TRANSCRIPT:
${transcript}

CONVERSATION TYPE: ${conversationType}

Your task:
1. Clean up the speech (remove filler words, false starts, corrections)
2. Structure the content logically
3. Identify the type of document/content
4. Extract key sections suitable for a pitch deck or document
5. Suggest slide content if this could be a presentation

Return this exact JSON structure:

{
  "title": "Descriptive title for this content",
  "summary": "2-3 sentence executive summary",
  "fullContent": "Cleaned, structured version of the full dictation in markdown format",

  "sections": [
    {
      "name": "Section name (e.g., Problem, Solution, Market, Team)",
      "content": "Section content as clean prose",
      "order": 1
    }
  ],

  "contentType": "pitch|proposal|memo|notes|email|report|general",
  "tone": "formal|professional|casual|technical",
  "audience": "Who this content is intended for",

  "keyPoints": ["Key point 1", "Key point 2"],
  "actionItems": ["Action item 1", "Action item 2"],

  "mentions": {
    "people": ["Names mentioned"],
    "companies": ["Companies mentioned"],
    "dates": ["Dates/deadlines mentioned"],
    "amounts": ["Money amounts, metrics, numbers mentioned"]
  },

  "suggestedSlides": [
    {
      "title": "Slide title",
      "bulletPoints": ["Bullet 1", "Bullet 2", "Bullet 3"],
      "visualSuggestion": "Chart type or visual element suggestion"
    }
  ],

  "documentTypes": ["pitch-deck", "executive-summary", "investor-memo", "etc"]
}

Guidelines:
- If this is a pitch/proposal, structure into standard pitch deck sections (Problem, Solution, Market, Business Model, Traction, Team, Ask)
- If this is notes/memo, keep the original structure but clean it up
- Extract ALL mentioned facts, numbers, names, companies, dates
- Make the content presentation-ready (remove ums, uhs, repetitions)
- Preserve the speaker's voice and key phrases
- Suggest appropriate visualisations for data-heavy sections`;
}

/**
 * Build prompt for generating presentation content from structured dictation
 */
export function buildPresentationPrompt(content: DictationContent): string {
  return `Convert this structured content into a professional presentation outline.

TITLE: ${content.title}
SUMMARY: ${content.summary}

CONTENT:
${content.fullContent}

KEY POINTS:
${content.keyPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}

Generate a presentation with 10-15 slides. For each slide, provide:
1. Title
2. 3-5 bullet points
3. Speaker notes (what to say)
4. Visual suggestion (chart, image, diagram)

Return markdown format suitable for Gamma presentation generation.`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Core Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Submit `prompt` to the canonical `callLLM` wrapper and adapt the
 * result into this module's existing `{ success, text?, error? }`
 * surface. The pre-flight `ANTHROPIC_API_KEY` check is preserved so
 * the caller still receives a specific "not configured" error string
 * for the most common deployment-misconfiguration case; other
 * failures degrade to a generic message because `callLLM` returns
 * `null` for any non-success and surfaces the underlying reason via
 * its own structured logging (Architecture Standards Law 3 +
 * observability section of the 2026 standards table).
 *
 * Behavior-preserved end-to-end:
 *   - Anthropic Messages endpoint + `2023-06-01` API version + model
 *     `claude-sonnet-4-6` (encoded in callLLM's MODEL_MAP, exact
 *     same wire shape).
 *   - 60-second timeout (callLLM uses `AbortSignal.timeout(60_000)`
 *     internally; equivalent cancellation effect to the prior
 *     `AbortController + setTimeout` pair).
 *   - Text-block concatenation with newline separator (callLLM's
 *     `callAnthropicMessages` performs the identical
 *     `.filter(type === "text").map(.text).join("\n")` reduction).
 *   - max_tokens 8192 + implicit temperature 1.0 (now passed
 *     explicitly; the on-wire request matches the prior payload).
 */
async function callAnthropic(prompt: string): Promise<{ success: boolean; text?: string; error?: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { success: false, error: "ANTHROPIC_API_KEY not configured" };
  }

  const result = await callLLM({
    model: MODEL_ID,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: prompt,
    temperature: TEMPERATURE,
    maxTokens: MAX_TOKENS,
    timeoutMs: TIMEOUT_MS,
  });

  if (!result) {
    // callLLM has already logged the underlying reason (timeout,
    // non-2xx, empty response, etc.) via its structured warn channel.
    // The generic surface preserves the prior pattern of returning a
    // user-readable error string without re-deriving the cause here.
    return {
      success: false,
      error: "LLM call failed (see server logs for the underlying reason)",
    };
  }

  return { success: true, text: result.text };
}

/**
 * Extract JSON from LLM response
 */
function extractJson<T>(text: string): T | null {
  const cleaned = text
    .replace(/```(?:json)?\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]) as T;
    } catch (e) {
      console.error("[VoiceDocument] JSON parse error:", e);
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Process a voice dictation transcript into document-ready content
 */
export async function processDictation(
  transcript: string,
  conversationType: string = "dictation"
): Promise<ProcessingResult> {
  if (!transcript || transcript.trim().length < 50) {
    return {
      success: false,
      error: "Transcript is too short (minimum 50 characters)",
    };
  }

  const prompt = buildDictationProcessingPrompt(transcript, conversationType);
  const result = await callAnthropic(prompt);

  if (!result.success || !result.text) {
    return {
      success: false,
      error: result.error || "Failed to process dictation",
    };
  }

  const content = extractJson<DictationContent>(result.text);
  if (!content) {
    return {
      success: false,
      error: "Failed to parse processed content",
    };
  }

  // Validate required fields
  if (!content.title || !content.summary || !content.fullContent) {
    return {
      success: false,
      error: "Processed content is missing required fields",
    };
  }

  return {
    success: true,
    content,
  };
}

/**
 * Generate presentation-ready markdown from dictation content
 */
export async function generatePresentationContent(content: DictationContent): Promise<string> {
  // If we already have suggested slides, format them
  if (content.suggestedSlides && content.suggestedSlides.length > 0) {
    const slides = content.suggestedSlides
      .map((slide, i) => {
        let markdown = `## Slide ${i + 1}: ${slide.title}\n\n`;
        slide.bulletPoints.forEach((point) => {
          markdown += `- ${point}\n`;
        });
        if (slide.visualSuggestion) {
          markdown += `\n*Visual: ${slide.visualSuggestion}*\n`;
        }
        return markdown;
      })
      .join("\n---\n\n");

    return `# ${content.title}\n\n${content.summary}\n\n---\n\n${slides}`;
  }

  // Otherwise, structure from sections
  if (content.sections && content.sections.length > 0) {
    const sections = content.sections
      .sort((a, b) => a.order - b.order)
      .map((section) => `## ${section.name}\n\n${section.content}`)
      .join("\n\n---\n\n");

    return `# ${content.title}\n\n${content.summary}\n\n---\n\n${sections}`;
  }

  // Fallback to full content
  return `# ${content.title}\n\n${content.summary}\n\n---\n\n${content.fullContent}`;
}

/**
 * Generate a document outline from dictation content
 */
export function generateDocumentOutline(content: DictationContent): {
  title: string;
  sections: { heading: string; content: string }[];
  keyPoints: string[];
  actionItems: string[];
} {
  return {
    title: content.title,
    sections: content.sections.map((s) => ({
      heading: s.name,
      content: s.content,
    })),
    keyPoints: content.keyPoints,
    actionItems: content.actionItems,
  };
}

/**
 * Check if a voice conversation is suitable for document generation
 */
export function isDocumentSuitable(
  conversationType: string,
  durationSeconds: number | null,
  transcriptLength: number
): { suitable: boolean; reason: string } {
  // Dictations are always suitable
  if (conversationType === "dictation") {
    return { suitable: true, reason: "Dictation content" };
  }

  // Quick actions are not suitable
  if (conversationType === "quick_action") {
    return { suitable: false, reason: "Quick action calls don't contain document content" };
  }

  // Too short
  if (durationSeconds && durationSeconds < 60) {
    return { suitable: false, reason: "Call too short (< 1 minute)" };
  }

  // Transcript too short
  if (transcriptLength < 200) {
    return { suitable: false, reason: "Transcript too short (< 200 characters)" };
  }

  // General conversations might be suitable if long enough
  if (transcriptLength > 500) {
    return { suitable: true, reason: "Substantial content available" };
  }

  return { suitable: false, reason: "Insufficient content for document generation" };
}
