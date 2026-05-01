/**
 * OLIVIA BRAIN — Pitch Intelligence Scoring
 *
 * Scoring algorithms from Studio-Olivia.
 * Score decks and templates based on stage, category, traction, and preferences.
 */

import type {
  PitchDeckArchetype,
  BusinessPlanTemplate,
  ScoredDeck,
  ScoredTemplate,
  DeckCategory,
  ScoringPreferences,
  LibraryFilter,
} from "./types";
import { DECKS } from "./archetypes";
import { BIZ_TEMPLATES } from "./templates";

// ─────────────────────────────────────────────
// Deck Scoring Algorithm
// ─────────────────────────────────────────────

/**
 * Score pitch deck archetypes based on stage, category, traction, and preferences.
 *
 * Scoring breakdown:
 * - Stage match: +30 points
 * - Category match: +22 points
 * - Consensus score: +7 points per consensus level
 * - Pre-traction fit: +15 points
 * - Traction-focused deck: +12 points
 * - London priority: +20 points
 * - AI-native: +15 points
 * - Has Olivia action: +4 points
 *
 * @param stage - Funding stage (e.g., "Seed", "Series A")
 * @param cat - Deck category
 * @param traction - Traction level (0 = pre-traction, 1+ = has traction)
 * @param prefs - Scoring preferences (london, ai priorities)
 * @returns Sorted array of scored decks
 */
export function scoreDecks(
  stage: string,
  cat: DeckCategory,
  traction: number = 0,
  prefs?: ScoringPreferences
): ScoredDeck[] {
  return DECKS.map((d) => {
    let score = 0;
    const reasons: string[] = [];

    // Stage match
    const stageArray = Array.isArray(d.stage) ? d.stage : [d.stage || ""];
    if (
      stageArray.some((s) => s.toLowerCase().trim() === stage.toLowerCase().trim()) ||
      stageArray.includes("Any")
    ) {
      score += 30;
      reasons.push("Stage match");
    }

    // Category match
    if (d.cat === cat) {
      score += 22;
      reasons.push("Category match");
    }

    // Consensus score
    score += d.consensus * 7;
    if (d.consensus >= 3) {
      reasons.push(`${d.consensus}-source consensus`);
    }

    // Pre-traction fit
    if (traction === 0 && stageArray.some((s) => s.includes("Pre-seed"))) {
      score += 15;
      reasons.push("Pre-traction fit");
    }

    // Traction-focused deck
    if (traction >= 2 && d.insight?.toLowerCase().includes("traction")) {
      score += 12;
      reasons.push("Traction deck");
    }

    // London priority
    if (prefs?.london && d.cat === "london_uk") {
      score += 20;
      reasons.push("London priority");
    }

    // AI-native
    if (prefs?.ai && (d.cat === "ai_modern" || d.cat === "ai_template")) {
      score += 15;
      reasons.push("AI-native");
    }

    // Has Olivia action
    if (d.olivia_action) {
      score += 4;
    }

    return { ...d, score, reasons };
  }).sort((a, b) => b.score - a.score);
}

// ─────────────────────────────────────────────
// Template Scoring Algorithm
// ─────────────────────────────────────────────

/**
 * Score business plan templates based on stage, category, and preferences.
 *
 * Scoring breakdown:
 * - Stage match: +30 points
 * - Category match: +22 points
 * - Consensus score: +7 points per consensus level
 * - London priority: +25 points
 * - AI-native: +18 points
 * - Has Olivia action: +8 points
 *
 * @param stage - Funding stage
 * @param cat - Template category
 * @param prefs - Scoring preferences
 * @returns Sorted array of scored templates
 */
export function scoreTemplates(
  stage: string,
  cat: DeckCategory,
  prefs?: ScoringPreferences
): ScoredTemplate[] {
  return BIZ_TEMPLATES.map((t) => {
    let score = 0;
    const reasons: string[] = [];

    // Stage match
    const stageArray = Array.isArray(t.stage) ? t.stage : [t.stage || ""];
    if (
      stageArray.some((s) => s.toLowerCase().trim() === stage.toLowerCase().trim()) ||
      stageArray.includes("Any")
    ) {
      score += 30;
      reasons.push("Stage match");
    }

    // Category match
    if (t.cat === cat) {
      score += 22;
      reasons.push("Category match");
    }

    // Consensus score
    score += t.consensus * 7;

    // London priority
    if (prefs?.london && t.cat === "london_uk") {
      score += 25;
      reasons.push("London priority");
    }

    // AI-native
    if (prefs?.ai && (t.cat === "ai_template" || t.cat === "ai_modern")) {
      score += 18;
      reasons.push("AI-native");
    }

    // Has Olivia action
    if (t.olivia_action) {
      score += 8;
    }

    return { ...t, score, reasons };
  }).sort((a, b) => b.score - a.score);
}

// ─────────────────────────────────────────────
// Library Filter
// ─────────────────────────────────────────────

/**
 * Filter items (decks or templates) based on category, stage, and search query.
 */
export function applyLibraryFilter<T extends PitchDeckArchetype | BusinessPlanTemplate>(
  items: T[],
  filter: LibraryFilter
): T[] {
  return items.filter((item) => {
    // Category filter
    if (filter.cat && item.cat !== filter.cat) {
      return false;
    }

    // Stage filter
    if (filter.stage) {
      const stageArray = Array.isArray(item.stage) ? item.stage : [item.stage];
      if (
        !stageArray.some((s) => s.toLowerCase().trim() === filter.stage!.toLowerCase().trim()) &&
        !stageArray.includes("Any")
      ) {
        return false;
      }
    }

    // Search filter
    if (filter.search) {
      const query = filter.search.toLowerCase();
      if (
        !item.name.toLowerCase().includes(query) &&
        !item.tag.toLowerCase().includes(query) &&
        !item.insight?.toLowerCase().includes(query) &&
        !item.fit?.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    return true;
  });
}

// ─────────────────────────────────────────────
// Deck Scores (Clarity / Impact / Moat)
// ─────────────────────────────────────────────

export interface DeckScores {
  clarity: number;
  impact: number;
  moat: number;
  composite: number;
}

/**
 * Calculate deck scores based on slide content.
 * Used for real-time scoring feedback in the pitch builder.
 *
 * Composite = 35% clarity + 35% impact + 30% moat
 */
export function calculateDeckScores(slides: { type: string; content: Record<string, string> }[]): DeckScores {
  let clarity = 0;
  let impact = 0;
  let moat = 0;

  const totalSlides = slides.length;
  if (totalSlides === 0) {
    return { clarity: 0, impact: 0, moat: 0, composite: 0 };
  }

  for (const slide of slides) {
    const contentLength = Object.values(slide.content).join("").length;
    const hasContent = contentLength > 0;

    // Clarity: penalize verbose slides, reward concise ones
    if (hasContent) {
      const wordCount = Object.values(slide.content).join(" ").split(/\s+/).length;
      const clarityScore = wordCount > 100 ? 50 : wordCount > 50 ? 70 : wordCount > 20 ? 90 : 100;
      clarity += clarityScore;
    }

    // Impact: reward key slides (HOOK, TRACTION, ASK)
    if (["HOOK", "TRACTION", "ASK", "PROBLEM", "SOLUTION"].includes(slide.type)) {
      impact += hasContent ? 100 : 0;
    } else {
      impact += hasContent ? 80 : 0;
    }

    // Moat: reward MOAT, TEAM, REGULATORY slides
    if (["MOAT", "TEAM", "REGULATORY", "COMPETITION"].includes(slide.type)) {
      moat += hasContent ? 100 : 0;
    } else {
      moat += hasContent ? 70 : 0;
    }
  }

  clarity = Math.round(clarity / totalSlides);
  impact = Math.round(impact / totalSlides);
  moat = Math.round(moat / totalSlides);

  const composite = Math.round(clarity * 0.35 + impact * 0.35 + moat * 0.3);

  return { clarity, impact, moat, composite };
}

// ─────────────────────────────────────────────
// Top Recommendations
// ─────────────────────────────────────────────

/**
 * Get top N recommended decks for a given profile.
 */
export function getTopDecks(
  stage: string,
  cat: DeckCategory,
  traction: number = 0,
  prefs?: ScoringPreferences,
  limit: number = 5
): ScoredDeck[] {
  return scoreDecks(stage, cat, traction, prefs).slice(0, limit);
}

/**
 * Get top N recommended templates for a given profile.
 */
export function getTopTemplates(
  stage: string,
  cat: DeckCategory,
  prefs?: ScoringPreferences,
  limit: number = 3
): ScoredTemplate[] {
  return scoreTemplates(stage, cat, prefs).slice(0, limit);
}
