/**
 * OLIVIA BRAIN — Pitch Intelligence Constants
 *
 * Color palette and theme definitions from Studio-Olivia.
 */

import type { Theme, ThemeKey, CategoryStyle, DeckCategory } from "./types";

// ─────────────────────────────────────────────
// Color Palette (War Room / Studio Olivia)
// ─────────────────────────────────────────────

export const COLORS = {
  bg: "#050810",
  surface: "#0A0F1C",
  raised: "#0F172A",
  border: "#1E293B",
  borderLight: "#1E293B40",
  accent: "#FF8C00",
  accentDim: "#FF8C0030",
  sapphire: "#0B3D91",
  sapLight: "#1A5FBB",
  green: "#4ADE80",
  greenDim: "#4ADE8020",
  red: "#EF4444",
  redDim: "#EF444420",
  purple: "#A78BFA",
  purpleDim: "#A78BFA20",
  cyan: "#00F0FF",
  text: "#E2E8F0",
  muted: "#8B95A5",
  dim: "#64748B",
  faint: "#475569",
} as const;

export type ColorKey = keyof typeof COLORS;

// ─────────────────────────────────────────────
// 5 London-Branded Themes
// ─────────────────────────────────────────────

export const THEMES: Record<ThemeKey, Theme> = {
  "Canary-Sapphire": {
    accent: "#FF8C00",
    primary: "#05091A",
    surface: "#080F28",
    icon: "✦",
    desc: "Sapphire & orange — CLUES signature",
  },
  "Gherkin-Polished": {
    accent: "#00F0FF",
    primary: "#0A1628",
    surface: "#0F172A",
    icon: "◆",
    desc: "Institutional finance — Bloomberg-serious",
  },
  "Barbican-Raw": {
    accent: "#F97316",
    primary: "#1E2937",
    surface: "#1A2332",
    icon: "▲",
    desc: "Deep-tech experimental — creative edge",
  },
  "Battersea-Resilient": {
    accent: "#4ADE80",
    primary: "#052E16",
    surface: "#0A3A1F",
    icon: "●",
    desc: "Scalable & resilient — growth-oriented",
  },
  "Shard-Ambitious": {
    accent: "#FB7185",
    primary: "#431407",
    surface: "#4A1A0D",
    icon: "★",
    desc: "High-ambition — bold, visionary, premium",
  },
};

// ─────────────────────────────────────────────
// Category Library Styling
// ─────────────────────────────────────────────

export const CATEGORY_STYLES: Record<DeckCategory, CategoryStyle> = {
  classic: {
    bg: "rgba(37,99,235,0.15)",
    text: "#60A5FA",
    label: "Classic",
  },
  saas: {
    bg: "rgba(14,165,233,0.15)",
    text: "#38BDF8",
    label: "SaaS / B2B",
  },
  ai_modern: {
    bg: "rgba(139,92,246,0.15)",
    text: "#A78BFA",
    label: "AI / Modern",
  },
  london_uk: {
    bg: "rgba(239,68,68,0.15)",
    text: "#F87171",
    label: "London / UK",
  },
  fintech: {
    bg: "rgba(16,185,129,0.15)",
    text: "#34D399",
    label: "Fintech",
  },
  industry_template: {
    bg: "rgba(245,158,11,0.15)",
    text: "#FCD34D",
    label: "Industry",
  },
  vc_framework: {
    bg: "rgba(100,116,139,0.15)",
    text: "#94A3B8",
    label: "VC Framework",
  },
  ai_template: {
    bg: "rgba(168,85,247,0.15)",
    text: "#C084FC",
    label: "AI Template",
  },
  consumer: {
    bg: "rgba(219,39,119,0.15)",
    text: "#F472B6",
    label: "Consumer",
  },
};

// ─────────────────────────────────────────────
// Theme Keys for Iteration
// ─────────────────────────────────────────────

export const THEME_KEYS: ThemeKey[] = [
  "Canary-Sapphire",
  "Gherkin-Polished",
  "Barbican-Raw",
  "Battersea-Resilient",
  "Shard-Ambitious",
];
