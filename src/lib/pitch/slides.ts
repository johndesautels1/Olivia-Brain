/**
 * OLIVIA BRAIN — Pitch Intelligence Slides
 *
 * 16 slide types with metadata, field schemas, and feedback seeds.
 * Backported from Studio-Olivia.
 */

import type { SlideType, SlideMeta, SlideField } from "./types";
import { COLORS } from "./constants";

// ─────────────────────────────────────────────
// 16 Slide Type Metadata
// ─────────────────────────────────────────────

export const SLIDE_META: Record<SlideType, SlideMeta> = {
  COVER: { icon: "◈", color: COLORS.sapLight },
  HOOK: { icon: "⌖", color: COLORS.accent },
  PROBLEM: { icon: "△", color: COLORS.red },
  SOLUTION: { icon: "◇", color: COLORS.green },
  TRACTION: { icon: "↑", color: COLORS.accent },
  MOAT: { icon: "⬡", color: COLORS.purple },
  TEAM: { icon: "○", color: COLORS.sapLight },
  ASK: { icon: "◉", color: COLORS.accent },
  MARKET: { icon: "◫", color: COLORS.green },
  PRODUCT: { icon: "▣", color: COLORS.sapLight },
  ROADMAP: { icon: "→", color: COLORS.green },
  REGULATORY: { icon: "⊞", color: "#F59E0B" },
  ECOSYSTEM: { icon: "⊛", color: COLORS.cyan },
  WHY_NOW: { icon: "⏱", color: "#F59E0B" },
  COMPETITION: { icon: "⚔", color: COLORS.red },
  DEMO: { icon: "▶", color: COLORS.purple },
};

// ─────────────────────────────────────────────
// Slide Field Schemas Per Type
// ─────────────────────────────────────────────

export const SLIDE_FIELDS: Record<SlideType, SlideField[]> = {
  COVER: [
    {
      key: "tagline",
      label: "Tagline",
      placeholder: "One sentence that defines your company",
    },
    {
      key: "subtitle",
      label: "Subtitle",
      placeholder: "Supporting context",
    },
  ],
  HOOK: [
    {
      key: "stat",
      label: "Key Statistic",
      placeholder: "The number that stops investors mid-scroll",
    },
    {
      key: "body",
      label: "Body",
      placeholder: "Context for the statistic",
    },
  ],
  PROBLEM: [
    {
      key: "cost",
      label: "Cost of Problem",
      placeholder: "Quantify the pain",
    },
    {
      key: "body",
      label: "Description",
      placeholder: "Who feels this pain",
    },
  ],
  SOLUTION: [
    {
      key: "transformation",
      label: "Transformation",
      placeholder: "Before → After",
    },
    {
      key: "metric",
      label: "Key Metric",
      placeholder: "Measurable improvement",
    },
  ],
  TRACTION: [
    {
      key: "metrics",
      label: "Traction Metrics",
      placeholder: "MRR, users, growth — real numbers only",
    },
  ],
  MOAT: [
    {
      key: "asset",
      label: "Defensible Asset",
      placeholder: "What stops replication in 6 months?",
    },
  ],
  TEAM: [
    {
      key: "credibility",
      label: "Team Credibility",
      placeholder: "Domain expertise, prior exits",
    },
  ],
  ASK: [
    {
      key: "amount",
      label: "Raise Amount",
      placeholder: "£500K seed at £3M pre-money",
    },
    {
      key: "use",
      label: "Use of Funds",
      placeholder: "3 bullet milestones",
    },
  ],
  MARKET: [
    {
      key: "tam",
      label: "TAM/SAM/SOM",
      placeholder: "Market sizing with sources",
    },
  ],
  PRODUCT: [
    {
      key: "description",
      label: "Product",
      placeholder: "What the product does",
    },
  ],
  ROADMAP: [
    {
      key: "phases",
      label: "Phases",
      placeholder: "Phase 1 → Phase 2 → Phase 3",
    },
  ],
  REGULATORY: [
    {
      key: "status",
      label: "Status",
      placeholder: "FCA pathway, PSD2, EMI licence",
    },
  ],
  ECOSYSTEM: [
    {
      key: "position",
      label: "Position",
      placeholder: "Where you sit in London tech",
    },
  ],
  WHY_NOW: [
    {
      key: "timing",
      label: "Why Now",
      placeholder: "Market shift or tech unlock",
    },
  ],
  COMPETITION: [
    {
      key: "landscape",
      label: "Landscape",
      placeholder: "Named competitors + differentiation",
    },
  ],
  DEMO: [
    {
      key: "demo_url",
      label: "Demo",
      placeholder: "Link or 30-second description",
    },
  ],
};

// ─────────────────────────────────────────────
// Feedback Seeds (Coaching Hints Per Slide)
// ─────────────────────────────────────────────

export const FEEDBACK_SEEDS: Partial<Record<SlideType, string>> = {
  HOOK: "Add a second stat — one number is a claim, two are evidence.",
  PROBLEM: "Pair cost with time — £X/year AND Y hours/week.",
  SOLUTION: "Add a before/after visual — investors need to see transformation.",
  TRACTION: "Add growth trajectory — flat metrics are a red flag.",
  MOAT: "Name models explicitly — specificity kills the 'AI wrapper' objection.",
  ASK: "Break use of funds into 3 milestone bullets.",
  TEAM: "Lead with domain credential, not university.",
  MARKET: "Bottom-up TAM only — top-down '$50B market' signals lazy thinking.",
  COVER: "The tagline should survive a billboard test.",
  PRODUCT: "Put a real screenshot — if the product isn't visual enough, rethink positioning.",
  ROADMAP: "Each phase should unlock the next — show dependency logic.",
  REGULATORY: "Move regulatory credentials UP — FCA readiness is a moat.",
};

// ─────────────────────────────────────────────
// Slide Type Keys for Iteration
// ─────────────────────────────────────────────

export const SLIDE_TYPES: SlideType[] = [
  "COVER",
  "HOOK",
  "PROBLEM",
  "SOLUTION",
  "TRACTION",
  "MOAT",
  "TEAM",
  "ASK",
  "MARKET",
  "PRODUCT",
  "ROADMAP",
  "REGULATORY",
  "ECOSYSTEM",
  "WHY_NOW",
  "COMPETITION",
  "DEMO",
];

// ─────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────

export function getSlideMeta(type: SlideType): SlideMeta {
  return SLIDE_META[type] ?? { icon: "◆", color: COLORS.dim };
}

export function getSlideFields(type: SlideType): SlideField[] {
  return SLIDE_FIELDS[type] ?? [];
}

export function getSlideFeedback(type: SlideType): string | undefined {
  return FEEDBACK_SEEDS[type];
}

export function createEmptySlide(type: SlideType, id?: string): {
  id: string;
  type: SlideType;
  fw: string[];
  confidence: number;
  content: Record<string, string>;
} {
  const fields = getSlideFields(type);
  const content: Record<string, string> = {};
  for (const field of fields) {
    content[field.key] = "";
  }

  return {
    id: id ?? crypto.randomUUID(),
    type,
    fw: [],
    confidence: 0,
    content,
  };
}
