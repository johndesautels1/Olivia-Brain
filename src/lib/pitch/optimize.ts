/**
 * OLIVIA BRAIN — Pitch Intelligence Optimizer
 *
 * LLM-powered optimization for pitch decks and business plans.
 * Originally backported from Studio-Olivia's auto-optimize engine.
 *
 * Track D Session 15 — re-pointed at the OB 9-model cascade. Before
 * S15 every helper hit `https://api.anthropic.com/v1/messages` directly
 * with hardcoded Sonnet 4.6. Now they delegate to `runPitchCascade`,
 * which uses `runModelCascade` (intent-keyed provider order, fallback
 * chain, Langfuse traces) and replaces Anthropic's `web_search_20250305`
 * with Tavily as a pre-search step (cascade position ⑦).
 *
 * Public API surface unchanged — callers (`/api/pitch/{draft,analyze,
 * optimize,chat}`) keep working without changes.
 */

import type { SlideType, InvestorPersonaKey, Slide } from "./types";
import { PERSONAS } from "./personas";
import { runPitchCascade } from "./cascade-adapter";

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
// Helpers (still public — used by other consumers)
// ─────────────────────────────────────────────

/**
 * Extract text content from Anthropic API response.
 * Retained for the small number of legacy callers that still hit the
 * Anthropic API directly (Cristiano, calendar judge, voice-conv); new
 * pitch helpers use `runPitchCascade` which already returns plain text.
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
    (item) => item && item.type === "text",
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
 * Safely parse JSON from LLM response, handling markdown code blocks.
 */
export function safeParseJson<T>(raw: string): T {
  let cleaned = raw
    .replace(/```(?:json|JSON)?\s*/g, "")
    .replace(/```\s*$/g, "")
    .trim();

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
 * Build XML-tagged prompt sections.
 */
export function buildPrompt(
  sections: Array<{ label?: string; value: string | null | undefined }>,
): string {
  return sections
    .filter((s) => s.value != null && s.value !== "")
    .map((s) =>
      s.label
        ? `<${s.label}>\n${String(s.value)}\n</${s.label}>`
        : String(s.value),
    )
    .join("\n\n");
}

function getPersonaConfig(persona: InvestorPersonaKey) {
  return PERSONAS.find((p) => p.key === persona) || PERSONAS[1]; // Default to SeedVC
}

// ─────────────────────────────────────────────
// Optimization Functions
// ─────────────────────────────────────────────

/**
 * Optimize a single pitch deck slide.
 *
 * S15: now flows through the OB cascade instead of direct Anthropic.
 * No web research — slide rewrites are stylistic, not fact-bound.
 */
export async function optimizeSlide(
  slide: SlideOptimizeInput,
  config: OptimizeConfig,
  options?: { signal?: AbortSignal; conversationId?: string },
): Promise<OptimizeSlideResult> {
  const personaObj = getPersonaConfig(config.persona);
  const slideContent =
    slide.text || Object.values(slide.fields).join(" ") || "(empty)";

  const systemPrompt = `You are Olivia, optimizing pitch deck slides for ${personaObj.label} investors in the London tech ecosystem. Rewrite to be sharper, more concise, and more compelling. Return ONLY valid JSON: {"text":"<optimized>","confidence":integer_0_to_100,"change_note":"<what improved>"}`;

  const userPrompt = `Optimize this ${slide.type} slide: "${slideContent}". Project: ${config.projectName}. Tone: ${config.tone}. Industry: ${config.industry}. Stage: ${config.stage}.`;

  const result = await runPitchCascade({
    systemPrompt,
    userPrompt,
    intent: "general",
    conversationId: options?.conversationId,
  });

  const parsed = safeParseJson<{
    text: string;
    confidence: number;
    change_note: string;
  }>(result.text);

  return {
    text: parsed.text,
    confidence: parsed.confidence || 0,
    changeNote: parsed.change_note || "",
  };
}

/**
 * Optimize all slides in a deck.
 */
export async function* optimizeAllSlides(
  slides: SlideOptimizeInput[],
  config: OptimizeConfig,
  options?: { signal?: AbortSignal; conversationId?: string },
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
 * Draft a business plan section.
 *
 * S15: cascade-routed with Tavily pre-search for current market data.
 * The pre-search query is the section title + project + industry — keeps
 * Tavily focused on what the section needs.
 */
export async function draftPlanSection(
  sectionTitle: string,
  existingContent: string,
  config: OptimizeConfig,
  options?: { signal?: AbortSignal; conversationId?: string },
): Promise<DraftSectionResult> {
  const personaObj = getPersonaConfig(config.persona);

  const systemPrompt = `You are Olivia, CLUES London's AI engine. Draft business plan sections for ${personaObj.label} investors. When a <web_research> block is present, ground your answer in those facts and cite the sources. Return ONLY valid JSON: {"content":"<text>","confidence":integer_0_to_100,"notes":"<approach>"}`;

  const userPrompt = buildPrompt([
    { label: "task", value: `Draft '${sectionTitle}'` },
    { label: "project", value: config.projectName },
    { label: "industry", value: config.industry },
    { label: "stage", value: config.stage },
    { label: "existing", value: existingContent || "(empty)" },
    { label: "persona", value: personaObj.label },
  ]);

  const result = await runPitchCascade({
    systemPrompt,
    userPrompt,
    intent: "research",
    conversationId: options?.conversationId,
    useWebResearch: true,
    searchQuery: `${sectionTitle} for ${config.projectName} (${config.industry}, ${config.stage})`,
  });

  const parsed = safeParseJson<{
    content: string;
    confidence: number;
    notes: string;
  }>(result.text);

  return {
    content: parsed.content,
    confidence: parsed.confidence || 0,
    notes: parsed.notes || "",
  };
}

/**
 * Analyze content for investor-readiness.
 *
 * S15: cascade-routed with Tavily pre-search for fact verification.
 */
export async function analyzeContent(
  content: string,
  context: string,
  config: OptimizeConfig,
  options?: { signal?: AbortSignal; conversationId?: string },
): Promise<AnalysisResult> {
  const personaObj = getPersonaConfig(config.persona);

  const systemPrompt = `You are Olivia, CLUES London's AI engine. Analyze content for ${personaObj.label} investors. When a <web_research> block is present, use it to fact-check claims. Return ONLY valid JSON: {"insight":"string","suggestion":"string","warning":"string|null","confidence":integer_0_to_100,"london_fit":"string","frameworks_used":["string"]}`;

  const userPrompt = buildPrompt([
    { label: "task", value: `Analyze this ${context}` },
    { label: "content", value: content },
    { label: "project", value: config.projectName },
    { label: "industry", value: config.industry },
    { label: "stage", value: config.stage },
    { label: "persona", value: personaObj.label },
  ]);

  const result = await runPitchCascade({
    systemPrompt,
    userPrompt,
    intent: "research",
    conversationId: options?.conversationId,
    useWebResearch: true,
    searchQuery: `${config.projectName} ${config.industry} market analysis ${config.stage}`,
  });

  const parsed = safeParseJson<{
    insight: string;
    suggestion: string;
    warning: string | null;
    confidence: number;
    london_fit: string;
    frameworks_used: string[];
  }>(result.text);

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
 * Ask Olivia a general question about pitch/plan.
 *
 * S15: cascade-routed. Free-form chat skips Tavily by default since
 * most pitch questions are advisory rather than fact-bound.
 */
export async function askOlivia(
  message: string,
  config: OptimizeConfig,
  options?: { signal?: AbortSignal; conversationId?: string },
): Promise<string> {
  const personaObj = getPersonaConfig(config.persona);

  const systemPrompt = `You are Olivia, the AI assistant inside War Room Olivia on CLUES London (clueslondon.com). You help London founders build pitch decks, business plans, and every document their venture needs. You have access to 75 pitch deck archetypes and 12 business plan templates. Persona: ${personaObj.label}. Project: ${config.projectName}. Industry: ${config.industry}. Stage: ${config.stage}. Be concise, actionable, honest. Do not fabricate data.`;

  const result = await runPitchCascade({
    systemPrompt,
    userPrompt: message,
    intent: "general",
    conversationId: options?.conversationId,
  });

  return result.text;
}

/**
 * Generate archetype-based deck structure.
 */
export function generateDeckFromArchetype(
  archetypeName: string,
  slideCount: number = 5,
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
