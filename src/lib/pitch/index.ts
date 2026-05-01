/**
 * OLIVIA BRAIN — Pitch Intelligence Module
 *
 * Complete pitch deck system backported from Studio-Olivia.
 *
 * Features:
 * - 75 pitch deck archetypes
 * - 12 business plan templates
 * - 5 investor personas
 * - 5 London-branded themes
 * - 16 slide types with field schemas
 * - Scoring algorithms
 * - Document categories (100+ templates)
 *
 * Usage:
 * ```ts
 * import { scoreDecks, getTopDecks, DECKS, THEMES } from "@/lib/pitch";
 *
 * // Get top 5 decks for a Seed-stage AI startup
 * const topDecks = getTopDecks("Seed", "ai_modern", 0, { london: true, ai: true });
 *
 * // Score all templates for Series A fintech
 * const scoredTemplates = scoreTemplates("Series A", "fintech");
 * ```
 */

// Types
export * from "./types";

// Constants
export { COLORS, THEMES, CATEGORY_STYLES, THEME_KEYS } from "./constants";

// Personas
export { PERSONAS, getPersona, getPersonaColor, PERSONA_KEYS } from "./personas";

// Slides
export {
  SLIDE_META,
  SLIDE_FIELDS,
  FEEDBACK_SEEDS,
  SLIDE_TYPES,
  getSlideMeta,
  getSlideFields,
  getSlideFeedback,
  createEmptySlide,
} from "./slides";

// Documents
export {
  DOC_CATEGORIES,
  PLAN_SECTIONS,
  getDocCategory,
  getAllDocuments,
  getDocumentCount,
  getPlanSection,
  createEmptyPlanSections,
} from "./documents";

// Archetypes (75 decks)
export {
  DECKS,
  getDeck,
  getDeckByName,
  getDecksByCategory,
  getDecksByStage,
  getArchetypeCount,
} from "./archetypes";

// Templates (12 business plans)
export {
  BIZ_TEMPLATES,
  getTemplate,
  getTemplateByName,
  getTemplatesByCategory,
  getTemplatesByStage,
  getTemplateCount,
} from "./templates";

// Scoring
export {
  scoreDecks,
  scoreTemplates,
  applyLibraryFilter,
  calculateDeckScores,
  getTopDecks,
  getTopTemplates,
  type DeckScores,
} from "./scoring";

// Optimization (LLM-powered)
export {
  optimizeSlide,
  optimizeAllSlides,
  draftPlanSection,
  analyzeContent,
  askOlivia,
  generateDeckFromArchetype,
  extractApiText,
  safeParseJson,
  buildPrompt,
  type OptimizeSlideResult,
  type DraftSectionResult,
  type AnalysisResult,
  type OptimizeConfig,
  type SlideOptimizeInput,
} from "./optimize";

// ─────────────────────────────────────────────
// Quick Stats
// ─────────────────────────────────────────────

export function getPitchModuleStats() {
  return {
    archetypes: 75,
    templates: 12,
    personas: 5,
    themes: 5,
    slideTypes: 16,
    documentCategories: 10,
    totalDocuments: 100,
    planSections: 16,
  };
}
