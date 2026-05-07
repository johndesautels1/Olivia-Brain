/**
 * Studio Olivia — types for the Library tab + scoring + Apply flow.
 *
 * Reference: `docs/STUDIO_OLIVIA_DESIGN.md` § 2.5 (Library tab spec) + § 8 #4
 * (Library scoring with reasons) + § 3 (state shapes incl. `deckConfig`).
 *
 * The raw archetype/template shape lifted from the prototype carries the
 * snake-case fields the prototype's scoring math reads (`olivia_action`,
 * `cat`, etc.). The UI renders against the canonical `Deck` shape exposed
 * by `DeckDetailModal` (camelCase, scored). `toDeck()` adapts raw → UI.
 */

import type { Deck } from "@/components/primitives/DeckDetailModal";

/* ── Investor persona (drives Olivia voice + analysis prompts) ──────── */

export type PersonaKey = "Angel" | "SeedVC" | "SeriesA" | "Strategic" | "Buyout";

/* ── Section nav (drives left-rail content + center-pane view) ─────── */

export type NavSection = "pitch" | "plan" | "documents" | "general";

/** What the user is currently editing in the Documents view. */
export interface ActiveDoc {
  /** `DOC_CATEGORIES` key. */
  category: string;
  /** Doc name within that category. */
  doc: string;
}

/* ── Deck config — drives Library scoring (§ 2.3 left-aside controls) ── */

export interface DeckConfig {
  /** Funding stage label, e.g. "Pre-seed", "Seed", "Series A". */
  stage: string;
  /** Industry label, e.g. "AI", "SaaS", "Fintech", "Healthtech". */
  industry: string;
  /** Goal label, e.g. "Pre-seed Round", "Bridge Round", "Series A". */
  goal: string;
  /** Tone label, e.g. "Confident & Optimistic", "Data-driven". */
  tone: string;
}

/* ── Category — CAT_LIB equivalent (§ 3 static reference tables) ─────── */

export type CategoryKey =
  | "classic"
  | "saas"
  | "ai_modern"
  | "london_uk"
  | "fintech"
  | "industry_template"
  | "vc_framework"
  | "ai_template"
  | "consumer";

/** `CAT_LIB[key]` → display config. Tokens land in `category-colors.ts`. */
export interface CategoryVisual {
  /** Aurum/Aether/etc canonical token reference, e.g. `"var(--sky-info)"`. */
  token: string;
  /** Translucent mute version for chip backgrounds, e.g. `"var(--sky-info-mute)"`. */
  mute: string;
  /** Display label, e.g. `"Classic"`, `"SaaS / B2B"`. */
  label: string;
}

/* ── Raw archetype — exact shape of the prototype's `DECKS[]` ────────── */

export interface DeckArchetype {
  /** Stable numeric id from the prototype. */
  id: number;
  /** Display name, e.g. `"Airbnb (2008)"`. */
  name: string;
  /** Tag, e.g. `"10-Slide Classic"`. */
  tag: string;
  /** Category key — joins `CAT_LIB`. */
  cat: CategoryKey;
  /** Stage labels — `["Pre-seed", "Seed"]` or `["Any"]`. */
  stage: string[];
  /** Consensus dots filled (0-5). */
  consensus: number;
  /** One-line analyst note. */
  insight: string;
  /** Why this archetype fits the user. */
  fit: string;
  /** Olivia's recommended next action. Snake-case key intentional — matches scoring math. */
  olivia_action?: string;
  /** Original capital raised (when archetype is from a real deal), e.g. `"£1.5M"`. */
  raised?: string;
  /** Year the archetype is from. */
  year?: number;
  /** Total slide count for the archetype. */
  slideCount?: number;
}

/* ── Raw template — exact shape of the prototype's `BIZ_TEMPLATES[]` ─── */

export interface PlanTemplate extends Omit<DeckArchetype, "slideCount"> {
  /** Number of business-plan sections, e.g. `10` for the Sequoia BP. */
  sections: number;
}

/* ── Scored output — what `scoreDecks` / `scoreTemplates` return ─────── */

export interface Scored<T> {
  /** Numeric match score (0-100+ in the additive model). */
  score: number;
  /** Human-readable reasons that contributed to the score. */
  reasons: string[];
}

export type ScoredArchetype = DeckArchetype & Scored<DeckArchetype>;
export type ScoredTemplate = PlanTemplate & Scored<PlanTemplate>;

/* ── Library filter (§ 3 — `libFilter`) ──────────────────────────────── */

export interface LibraryFilter {
  /** Optional category filter. Empty string = no filter. */
  cat?: CategoryKey | "";
  /** Optional stage filter. Empty string = no filter. */
  stage?: string;
  /** Free-text search across name + tag + insight + fit. */
  search?: string;
}

/* ── Scoring preferences — `prefs` arg on `scoreDecks` / `scoreTemplates` */

export interface ScoringPrefs {
  /** Boost London / UK archetypes (`+20` for decks, `+25` for templates). */
  london?: boolean;
  /** Boost AI archetypes (`+15` for decks, `+18` for templates). */
  ai?: boolean;
}

/* ── Slide — minimal shape for the Apply flow's slide regeneration ───── */

export type SlideType =
  | "COVER"
  | "HOOK"
  | "PROBLEM"
  | "SOLUTION"
  | "MARKET"
  | "PRODUCT"
  | "TRACTION"
  | "MOAT"
  | "TEAM"
  | "ASK"
  | "ROADMAP"
  | "REGULATORY"
  | "ECOSYSTEM"
  | "WHY_NOW"
  | "COMPETITION"
  | "DEMO"
  | "DETAIL";

export interface Slide {
  /** Stable id, generated at slide-creation time. */
  id: number;
  /** Slide type — drives the icon + field set in the editor. */
  type: SlideType;
  /** Applied frameworks/archetypes, e.g. `["Airbnb"]`. */
  fw: string[];
  /** Optional freeform text body. Lands in S17 editor. */
  text?: string;
  /** Optional structured fields (guided-mode editor). Lands in S17 editor. */
  fields?: Record<string, string>;
  /** Confidence 0-100. Lands when Olivia analyzes. */
  confidence?: number;
}

/* ── Adapter: raw archetype → DeckDetailModal `Deck` shape ───────────── */

/**
 * Convert a scored archetype/template into the `Deck` shape consumed by
 * `DeckDetailModal`. Joins `cat` to the category visual label and
 * collapses the `stage[]` array to a comma-joined string.
 */
export function toDeck(
  raw: ScoredArchetype | ScoredTemplate,
  categoryLabel: string,
): Deck {
  const isTemplate = "sections" in raw;
  return {
    id: String(raw.id),
    name: raw.name,
    category: categoryLabel,
    stage: raw.stage.join(", "),
    tag: raw.tag,
    consensus: raw.consensus,
    score: raw.score,
    insight: raw.insight,
    fit: raw.fit,
    matchReasons: raw.reasons,
    oliviaAction: raw.olivia_action,
    raised: raw.raised,
    year: raw.year != null ? String(raw.year) : undefined,
    slideCount: isTemplate ? raw.sections : raw.slideCount,
  };
}
