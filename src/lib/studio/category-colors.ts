/**
 * Category visual lookup — `CAT_LIB` equivalent from the Studio prototype,
 * mapped onto Olivia Brain's canonical Aurum/Aether tokens.
 *
 * Reference: `docs/STUDIO_OLIVIA_DESIGN.md` § 3 (CAT_LIB shape).
 *
 * Per `docs/01_UI_DESIGN_SYSTEM.md` § 1.6 — no raw hex codes in components.
 * Each category resolves to a token from `src/styles/tokens.css`. Mute
 * variants are translucent versions used for chip backgrounds; the
 * `token` itself is used for the 3-px left bar on Library cards.
 *
 * # Category → token mapping rationale
 *
 * | Category            | Token             | Why                                 |
 * |---------------------|-------------------|-------------------------------------|
 * | `classic`           | sky-info          | Neutral blue — generic playbooks    |
 * | `saas`              | mint-up           | Growth/green — recurring revenue    |
 * | `ai_modern`         | aether-primary    | Indigo — the AI brand colour        |
 * | `london_uk`         | coral-down        | UK red — geographic flag            |
 * | `fintech`           | amber-warn        | Gold-yellow — money / regulation    |
 * | `industry_template` | aurum-primary     | Old-money gold — institutional      |
 * | `vc_framework`      | fg-tertiary       | Neutral gray — pure structure       |
 * | `ai_template`       | aether-primary    | Indigo — same brand family as AI    |
 * | `consumer`          | coral-down        | Pink/coral — consumer-product feel  |
 */

import type { CategoryKey, CategoryVisual } from "./types";

export const CATEGORY_VISUAL: Record<CategoryKey, CategoryVisual> = {
  classic: {
    token: "var(--sky-info)",
    mute: "var(--sky-info-mute)",
    label: "Classic",
  },
  saas: {
    token: "var(--mint-up)",
    mute: "var(--mint-up-mute)",
    label: "SaaS / B2B",
  },
  ai_modern: {
    token: "var(--aether-primary)",
    mute: "var(--aether-mute)",
    label: "AI / Modern",
  },
  london_uk: {
    token: "var(--coral-down)",
    mute: "var(--coral-down-mute)",
    label: "London / UK",
  },
  fintech: {
    token: "var(--amber-warn)",
    mute: "var(--amber-warn-mute)",
    label: "Fintech",
  },
  industry_template: {
    token: "var(--aurum-primary)",
    mute: "var(--aurum-mute)",
    label: "Industry",
  },
  vc_framework: {
    token: "var(--fg-tertiary)",
    mute: "rgba(180, 190, 210, 0.08)",
    label: "VC Framework",
  },
  ai_template: {
    token: "var(--aether-primary)",
    mute: "var(--aether-mute)",
    label: "AI Template",
  },
  consumer: {
    token: "var(--coral-down)",
    mute: "var(--coral-down-mute)",
    label: "Consumer",
  },
};

/**
 * Lookup a category visual; returns the `vc_framework` neutral fallback
 * if the key is unrecognised (defensive — schema valid keys never reach
 * the fallback in normal operation).
 */
export function getCategoryVisual(cat: CategoryKey): CategoryVisual {
  return CATEGORY_VISUAL[cat] ?? CATEGORY_VISUAL.vc_framework;
}
