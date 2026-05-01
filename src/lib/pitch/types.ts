/**
 * OLIVIA BRAIN — Pitch Intelligence Types
 *
 * Type definitions for the pitch deck system backported from Studio-Olivia.
 * 75 archetypes, 12 templates, 5 personas, 5 themes.
 */

// ─────────────────────────────────────────────
// Investor Personas
// ─────────────────────────────────────────────

export type InvestorPersonaKey = "Angel" | "SeedVC" | "SeriesA" | "Strategic" | "Buyout";

export interface InvestorPersona {
  key: InvestorPersonaKey;
  label: string;
  color: string;
  desc: string;
}

// ─────────────────────────────────────────────
// London Themes
// ─────────────────────────────────────────────

export type ThemeKey =
  | "Canary-Sapphire"
  | "Gherkin-Polished"
  | "Barbican-Raw"
  | "Battersea-Resilient"
  | "Shard-Ambitious";

export interface Theme {
  accent: string;
  primary: string;
  surface: string;
  icon: string;
  desc: string;
}

// ─────────────────────────────────────────────
// Pitch Deck Archetypes (75)
// ─────────────────────────────────────────────

export type DeckCategory =
  | "classic"
  | "saas"
  | "ai_modern"
  | "london_uk"
  | "fintech"
  | "industry_template"
  | "vc_framework"
  | "ai_template"
  | "consumer";

export type FundingStage = "Pre-seed" | "Seed" | "Series A" | "Series B" | "Growth" | "Any";

export interface PitchDeckArchetype {
  id: number;
  name: string;
  tag: string;
  cat: DeckCategory;
  stage: FundingStage[];
  consensus: number; // 1-5
  insight: string;
  fit: string;
  olivia_action: string;
  year?: number;
  slideCount?: number;
  raised?: string;
  color?: string;
}

export interface ScoredDeck extends PitchDeckArchetype {
  score: number;
  reasons: string[];
}

// ─────────────────────────────────────────────
// Business Plan Templates (12)
// ─────────────────────────────────────────────

export interface BusinessPlanTemplate {
  id: number;
  name: string;
  tag: string;
  cat: DeckCategory;
  stage: FundingStage[];
  consensus: number;
  insight: string;
  fit: string;
  olivia_action: string;
  sections: number;
}

export interface ScoredTemplate extends BusinessPlanTemplate {
  score: number;
  reasons: string[];
}

// ─────────────────────────────────────────────
// Slide Types (16)
// ─────────────────────────────────────────────

export type SlideType =
  | "COVER"
  | "HOOK"
  | "PROBLEM"
  | "SOLUTION"
  | "TRACTION"
  | "MOAT"
  | "TEAM"
  | "ASK"
  | "MARKET"
  | "PRODUCT"
  | "ROADMAP"
  | "REGULATORY"
  | "ECOSYSTEM"
  | "WHY_NOW"
  | "COMPETITION"
  | "DEMO";

export interface SlideMeta {
  icon: string;
  color: string;
}

export interface SlideField {
  key: string;
  label: string;
  placeholder: string;
}

export interface Slide {
  id: string;
  type: SlideType;
  fw: string[]; // frameworks applied
  confidence: number;
  content: Record<string, string>;
}

// ─────────────────────────────────────────────
// Document Categories (10)
// ─────────────────────────────────────────────

export interface DocumentCategory {
  key: string;
  title: string;
  icon: string;
  docs: string[];
}

// ─────────────────────────────────────────────
// Business Plan Sections (16)
// ─────────────────────────────────────────────

export interface PlanSection {
  key: string;
  title: string;
  icon: string;
  value?: string;
}

// ─────────────────────────────────────────────
// Category Library Styling
// ─────────────────────────────────────────────

export interface CategoryStyle {
  bg: string;
  text: string;
  label: string;
}

// ─────────────────────────────────────────────
// Scoring Preferences
// ─────────────────────────────────────────────

export interface ScoringPreferences {
  london?: boolean;
  ai?: boolean;
}

// ─────────────────────────────────────────────
// Library Filter
// ─────────────────────────────────────────────

export interface LibraryFilter {
  cat?: DeckCategory;
  stage?: string;
  search?: string;
}
