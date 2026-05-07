/**
 * Studio Library scoring + filtering — pure functions.
 *
 * Reference: `docs/STUDIO_OLIVIA_DESIGN.md` § 8 #4 (scoring with reasons)
 * + the prototype's `scoreDecks` (line 25), `scoreTemplates` (line 26),
 * `applyLibraryFilter` (line 27) at
 * `D:\Studio-Olivia\StudioOliviaGrandMaster (2).jsx`.
 *
 * Math is **byte-for-byte additive**, preserved verbatim from the
 * prototype so existing visual fixtures stay valid. Pure functions —
 * no IO, no global state — so they unit-test deterministically.
 *
 * # Score formula (decks)
 *
 * | Component                                    | Weight |
 * |----------------------------------------------|--------|
 * | Stage match (case-insensitive, or "Any")     | +30    |
 * | Category match                               | +22    |
 * | Consensus dots × 7                           | up to +35 |
 * | Pre-traction bonus (traction=0, Pre-seed)    | +15    |
 * | Traction-deck bonus (traction≥2 + insight)   | +12    |
 * | London priority (prefs.london && london_uk)  | +20    |
 * | AI-native (prefs.ai && ai_modern/ai_template)| +15    |
 * | Has olivia_action                            | +4     |
 *
 * # Score formula (templates)
 *
 * | Component                                    | Weight |
 * |----------------------------------------------|--------|
 * | Stage match                                  | +30    |
 * | Category match                               | +22    |
 * | Consensus dots × 7                           | up to +35 |
 * | London priority                              | +25    |
 * | AI-native                                    | +18    |
 * | Has olivia_action                            | +8     |
 */

import type {
  DeckArchetype,
  PlanTemplate,
  ScoredArchetype,
  ScoredTemplate,
  ScoringPrefs,
  CategoryKey,
  LibraryFilter,
} from "./types";

/** Case-insensitive trimmed string compare. */
function eqI(a: string, b: string): boolean {
  return a.toLowerCase().trim() === b.toLowerCase().trim();
}

/**
 * Score every deck archetype against the user's stage / category /
 * traction / preferences, returning sorted-descending entries with
 * `score` + `reasons[]` attached.
 */
export function scoreDecks(
  decks: readonly DeckArchetype[],
  stage: string,
  cat: CategoryKey | "classic",
  traction: number,
  prefs?: ScoringPrefs,
): ScoredArchetype[] {
  return decks
    .map((d): ScoredArchetype => {
      let s = 0;
      const r: string[] = [];

      const sa = d.stage;
      if (sa.some((x) => eqI(x, stage)) || sa.includes("Any")) {
        s += 30;
        r.push("Stage match");
      }
      if (d.cat === cat) {
        s += 22;
        r.push("Category match");
      }
      s += d.consensus * 7;
      if (d.consensus >= 3) {
        r.push(`${d.consensus}-source consensus`);
      }
      if (traction === 0 && sa.some((x) => x.includes("Pre-seed"))) {
        s += 15;
        r.push("Pre-traction fit");
      }
      if (traction >= 2 && d.insight.toLowerCase().includes("traction")) {
        s += 12;
        r.push("Traction deck");
      }
      if (prefs?.london && d.cat === "london_uk") {
        s += 20;
        r.push("London priority");
      }
      if (prefs?.ai && (d.cat === "ai_modern" || d.cat === "ai_template")) {
        s += 15;
        r.push("AI-native");
      }
      if (d.olivia_action) {
        s += 4;
      }

      return { ...d, score: s, reasons: r };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Score every business-plan template — same pattern as `scoreDecks`,
 * but London + AI weights are heavier (templates carry more London
 * regulatory specificity).
 */
export function scoreTemplates(
  templates: readonly PlanTemplate[],
  stage: string,
  cat: CategoryKey | "classic",
  prefs?: ScoringPrefs,
): ScoredTemplate[] {
  return templates
    .map((t): ScoredTemplate => {
      let s = 0;
      const r: string[] = [];

      const sa = t.stage;
      if (sa.some((x) => eqI(x, stage)) || sa.includes("Any")) {
        s += 30;
        r.push("Stage match");
      }
      if (t.cat === cat) {
        s += 22;
        r.push("Category match");
      }
      s += t.consensus * 7;
      if (t.consensus >= 3) {
        r.push(`${t.consensus}-source consensus`);
      }
      if (prefs?.london && t.cat === "london_uk") {
        s += 25;
        r.push("London priority");
      }
      if (prefs?.ai && (t.cat === "ai_template" || t.cat === "ai_modern")) {
        s += 18;
        r.push("AI-native");
      }
      if (t.olivia_action) {
        s += 8;
      }

      return { ...t, score: s, reasons: r };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Filter archetypes/templates by category / stage / free-text search.
 * Search matches name + tag + insight + fit (case-insensitive substring).
 */
export function applyLibraryFilter<T extends DeckArchetype | PlanTemplate>(
  items: readonly T[],
  filter: LibraryFilter,
): T[] {
  const search = filter.search?.toLowerCase().trim() ?? "";
  return items.filter((item) => {
    if (filter.cat && item.cat !== filter.cat) return false;
    if (filter.stage) {
      const sa = item.stage;
      if (
        !sa.some((s) => eqI(s, filter.stage!)) &&
        !sa.includes("Any")
      ) {
        return false;
      }
    }
    if (search) {
      const hay =
        item.name.toLowerCase() +
        " " +
        item.tag.toLowerCase() +
        " " +
        item.insight.toLowerCase() +
        " " +
        item.fit.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
}

/**
 * Industry label → category-key map for the Library scoring lookup.
 * The prototype's `catMap[deckConfig.industry]` falls back to `"classic"`.
 */
export const INDUSTRY_TO_CATEGORY: Record<string, CategoryKey> = {
  AI: "ai_modern",
  SaaS: "saas",
  Fintech: "fintech",
  Healthtech: "industry_template",
  Climatetech: "industry_template",
  Edtech: "industry_template",
  Proptech: "industry_template",
  Consumer: "consumer",
  London: "london_uk",
};

/** Resolve a free-form industry string to a category key (default `classic`). */
export function industryToCategory(industry: string): CategoryKey {
  return INDUSTRY_TO_CATEGORY[industry] ?? "classic";
}
