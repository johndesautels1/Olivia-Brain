/**
 * OLIVIA BRAIN — Pitch Intelligence Optimizer
 *
 * LLM-powered optimization for pitch decks and business plans.
 * Backported from Studio-Olivia's auto-optimize engine.
 *
 * Features:
 * - Per-slide optimization with confidence scoring
 * - Business plan section drafting
 * - Content analysis with London ecosystem context
 * - Investor persona-aware rewriting
 */

import type { SlideType, InvestorPersonaKey, Slide } from "./types";
import { PERSONAS } from "./personas";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface OptimizeSlideResult {
  text: string;
  confidence: number;
  changeNote: string;
}

export interface DraftSectionResult {
  content: string;
  confidence: number;
  notes: string;
}

export interface AnalysisResult {
  insight: string;
  suggestion: string;
  warning: string | null;
  confidence: number;
  londonFit: string;
  frameworksUsed: string[];
}

export interface OptimizeConfig {
  projectName: string;
  persona: InvestorPersonaKey;
  industry: string;
  tone: string;
  stage: string;
}

export interface SlideOptimizeInput {
  id: string;
  type: SlideType;
  text: string;
  fields: Record<string, string>;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Extract text content from Anthropic API response
 */
export function extractApiText(data: unknown): string {
  if (!data || typeof data !== "object") {
    throw new Error("API response missing content");
  }

  const response = data as { content?: Array<{ type: string; text?: string }> };

  if (!response.content || !Array.isArray(response.content)) {
    throw new Error("API response missing content array");
  }

  const textBlocks = response.content.filter(
    (item) => item && item.type === "text"
  );

  if (!textBlocks.length) {
    throw new Error("No text blocks in response");
  }

  return textBlocks
    .map((item) => item.text || "")
    .join("\n")
    .trim();
}

/**
 * Safely parse JSON from LLM response, handling markdown code blocks
 */
export function safeParseJson<T>(raw: string): T {
  // Strip markdown code blocks
  let cleaned = raw
    .replace(/```(?:json|JSON)?\s*/g, "")
    .replace(/```\s*$/g, "")
    .trim();

  // Extract JSON object if wrapped in other text
  if (!cleaned.startsWith("{")) {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch (e) {
    const error = e as Error;
    throw new Error(`JSON parse failed: ${error.message}`);
  }
}

/**
 * Build XML-tagged prompt sections
 */
export function buildPrompt(
  sections: Array<{ label?: string; value: string | null | undefined }>
): string {
  return sections
    .filter((s) => s.value != null && s.value !== "")
    .map((s) =>
      s.label
        ? `<${s.label}>\n${String(s.value)}\n</${s.label}>`
        : String(s.value)
    )
    .join("\n\n");
}

/**
 * Get persona configuration
 */
function getPersonaConfig(persona: InvestorPersonaKey) {
  return PERSONAS.find((p) => p.key === persona) || PERSONAS[1]; // Default to SeedVC
}

// ─────────────────────────────────────────────
// Optimization Functions
// ─────────────────────────────────────────────

/**
 * Optimize a single pitch deck slide
 *
 * Makes an LLM call to rewrite the slide content to be sharper,
 * more concise, and tailored to the target investor persona.
 */
export async function optimizeSlide(
  slide: SlideOptimizeInput,
  config: OptimizeConfig,
  options?: { signal?: AbortSignal; apiKey?: string }
): Promise<OptimizeSlideResult> {
  const personaObj = getPersonaConfig(config.persona);
  const slideContent = slide.text || Object.values(slide.fields).join(" ") || "(empty)";

  const systemPrompt = `You are Olivia, optimizing pitch deck slides for ${personaObj.label} investors in the London tech ecosystem. Rewrite to be sharper, more concise, and more compelling. Return ONLY valid JSON: {"text":"<optimized>","confidence":integer_0_to_100,"change_note":"<what improved>"}`;

  const userPrompt = `Optimize this ${slide.type} slide: "${slideContent}". Project: ${config.projectName}. Tone: ${config.tone}. Industry: ${config.industry}. Stage: ${config.stage}.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(options?.apiKey && { "x-api-key": options.apiKey }),
    },
    signal: options?.signal,
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  const parsed = safeParseJson<{
    text: string;
    confidence: number;
    change_note: string;
  }>(extractApiText(data));

  return {
    text: parsed.text,
    confidence: parsed.confidence || 0,
    changeNote: parsed.change_note || "",
  };
}

/**
 * Optimize all slides in a deck
 *
 * Sequentially optimizes each slide, yielding progress updates.
 */
export async function* optimizeAllSlides(
  slides: SlideOptimizeInput[],
  config: OptimizeConfig,
  options?: { signal?: AbortSignal; apiKey?: string }
): AsyncGenerator<{
  slideId: string;
  slideIndex: number;
  total: number;
  result?: OptimizeSlideResult;
  error?: string;
}> {
  for (let idx = 0; idx < slides.length; idx++) {
    const slide = slides[idx];

    try {
      const result = await optimizeSlide(slide, config, options);
      yield {
        slideId: slide.id,
        slideIndex: idx,
        total: slides.length,
        result,
      };
    } catch (err) {
      const error = err as Error;
      if (error.name === "AbortError") {
        return;
      }
      yield {
        slideId: slide.id,
        slideIndex: idx,
        total: slides.length,
        error: error.message,
      };
    }
  }
}

/**
 * Draft a business plan section
 *
 * Uses LLM with web search to draft comprehensive business plan content.
 */
export async function draftPlanSection(
  sectionTitle: string,
  existingContent: string,
  config: OptimizeConfig,
  options?: { signal?: AbortSignal; apiKey?: string }
): Promise<DraftSectionResult> {
  const personaObj = getPersonaConfig(config.persona);

  const systemPrompt = `You are Olivia, CLUES London's AI engine. Draft business plan sections for ${personaObj.label} investors. Use web_search to verify facts and get current data. Return ONLY valid JSON: {"content":"<text>","confidence":integer_0_to_100,"notes":"<approach>"}`;

  const userPrompt = buildPrompt([
    { label: "task", value: `Draft '${sectionTitle}'` },
    { label: "project", value: config.projectName },
    { label: "industry", value: config.industry },
    { label: "stage", value: config.stage },
    { label: "existing", value: existingContent || "(empty)" },
    { label: "persona", value: personaObj.label },
  ]);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(options?.apiKey && { "x-api-key": options.apiKey }),
    },
    signal: options?.signal,
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  const parsed = safeParseJson<{
    content: string;
    confidence: number;
    notes: string;
  }>(extractApiText(data));

  return {
    content: parsed.content,
    confidence: parsed.confidence || 0,
    notes: parsed.notes || "",
  };
}

/**
 * Analyze content for investor-readiness
 *
 * Evaluates pitch/plan content and provides structured feedback.
 */
export async function analyzeContent(
  content: string,
  context: string,
  config: OptimizeConfig,
  options?: { signal?: AbortSignal; apiKey?: string }
): Promise<AnalysisResult> {
  const personaObj = getPersonaConfig(config.persona);

  const systemPrompt = `You are Olivia, CLUES London's AI engine. Analyze content for ${personaObj.label} investors. Use web_search to verify claims and get market data. Return ONLY valid JSON: {"insight":"string","suggestion":"string","warning":"string|null","confidence":integer_0_to_100,"london_fit":"string","frameworks_used":["string"]}`;

  const userPrompt = buildPrompt([
    { label: "task", value: `Analyze this ${context}` },
    { label: "content", value: content },
    { label: "project", value: config.projectName },
    { label: "industry", value: config.industry },
    { label: "stage", value: config.stage },
    { label: "persona", value: personaObj.label },
  ]);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(options?.apiKey && { "x-api-key": options.apiKey }),
    },
    signal: options?.signal,
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  const parsed = safeParseJson<{
    insight: string;
    suggestion: string;
    warning: string | null;
    confidence: number;
    london_fit: string;
    frameworks_used: string[];
  }>(extractApiText(data));

  return {
    insight: parsed.insight,
    suggestion: parsed.suggestion,
    warning: parsed.warning,
    confidence: parsed.confidence || 0,
    londonFit: parsed.london_fit || "",
    frameworksUsed: parsed.frameworks_used || [],
  };
}

/**
 * Ask Olivia a general question about pitch/plan
 *
 * Free-form chat with Olivia for pitch deck and business plan advice.
 */
export async function askOlivia(
  message: string,
  config: OptimizeConfig,
  options?: { signal?: AbortSignal; apiKey?: string }
): Promise<string> {
  const personaObj = getPersonaConfig(config.persona);

  const systemPrompt = `You are Olivia, the AI assistant inside War Room Olivia on CLUES London (clueslondon.com). You help London founders build pitch decks, business plans, and every document their venture needs. You have access to 75 pitch deck archetypes and 12 business plan templates. Persona: ${personaObj.label}. Project: ${config.projectName}. Industry: ${config.industry}. Stage: ${config.stage}. Be concise, actionable, honest. Do not fabricate data.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(options?.apiKey && { "x-api-key": options.apiKey }),
    },
    signal: options?.signal,
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      system: systemPrompt,
      messages: [{ role: "user", content: message }],
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  return extractApiText(data);
}

/**
 * Generate archetype-based deck structure
 *
 * Creates a slide structure based on selected archetype.
 */
export function generateDeckFromArchetype(
  archetypeName: string,
  slideCount: number = 5
): Slide[] {
  const slideTypes: SlideType[] = [
    "HOOK",
    "PROBLEM",
    "SOLUTION",
    "TRACTION",
    "ASK",
    "MARKET",
    "TEAM",
    "MOAT",
    "ROADMAP",
    "COMPETITION",
    "DEMO",
    "WHY_NOW",
  ];

  const slides: Slide[] = [];

  for (let i = 0; i < slideCount && i < slideTypes.length; i++) {
    slides.push({
      id: `slide-${Date.now()}-${i}`,
      type: slideTypes[i],
      fw: [archetypeName],
      confidence: 0,
      content: {},
    });
  }

  return slides;
}
