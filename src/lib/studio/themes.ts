/**
 * `THEMES` — 5 visual themes for the Studio Olivia output.
 *
 * Source: `D:\Studio-Olivia\StudioOliviaGrandMaster (2).jsx` line 6.
 * Lifted with the prototype's raw hex `accent` / `primary` / `surface`
 * fields replaced by canonical Aurum/Aether/sky/mint/coral tokens per
 * `01_UI_DESIGN_SYSTEM.md` § 1.6 — every paint flows through tokens.
 *
 * The original hex values are preserved as `legacyAccent` etc. (purely
 * for reference) — they are never used as CSS values in render code.
 */

export type ThemeKey =
  | "Canary-Sapphire"
  | "Gherkin-Polished"
  | "Barbican-Raw"
  | "Battersea-Resilient"
  | "Shard-Ambitious";

export interface Theme {
  key: ThemeKey;
  /** Canonical accent token. */
  accent: string;
  /** Canonical primary surface token. */
  primary: string;
  /** Canonical surface token. */
  surface: string;
  /** Unicode glyph icon for the theme card. */
  icon: string;
  /** Description shown on the theme card. */
  desc: string;
  /** Original prototype hex (reference only — never used in render). */
  legacyAccent: string;
}

export const THEMES: Record<ThemeKey, Theme> = {
  "Canary-Sapphire": {
    key: "Canary-Sapphire",
    accent: "var(--aurum-primary)",
    primary: "var(--canvas-base)",
    surface: "var(--surface-1)",
    icon: "✦",
    desc: "Sapphire & gold — CLUES signature",
    legacyAccent: "#FF8C00",
  },
  "Gherkin-Polished": {
    key: "Gherkin-Polished",
    accent: "var(--sky-info)",
    primary: "var(--canvas-recess)",
    surface: "var(--surface-2)",
    icon: "◆",
    desc: "Institutional finance — Bloomberg-serious",
    legacyAccent: "#00F0FF",
  },
  "Barbican-Raw": {
    key: "Barbican-Raw",
    accent: "var(--amber-warn)",
    primary: "var(--surface-1)",
    surface: "var(--surface-2)",
    icon: "▲",
    desc: "Deep-tech experimental — creative edge",
    legacyAccent: "#F97316",
  },
  "Battersea-Resilient": {
    key: "Battersea-Resilient",
    accent: "var(--mint-up)",
    primary: "var(--canvas-base)",
    surface: "var(--surface-1)",
    icon: "●",
    desc: "Scalable & resilient — growth-oriented",
    legacyAccent: "#4ADE80",
  },
  "Shard-Ambitious": {
    key: "Shard-Ambitious",
    accent: "var(--coral-down)",
    primary: "var(--canvas-base)",
    surface: "var(--surface-1)",
    icon: "★",
    desc: "High-ambition — bold, visionary, premium",
    legacyAccent: "#FB7185",
  },
};

export const DEFAULT_THEME: ThemeKey = "Canary-Sapphire";

export const THEME_KEYS: readonly ThemeKey[] = [
  "Canary-Sapphire",
  "Gherkin-Polished",
  "Barbican-Raw",
  "Battersea-Resilient",
  "Shard-Ambitious",
];
