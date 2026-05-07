/**
 * `SLIDE_META` — per-slide-type icon + canonical color token.
 *
 * Source: `D:\Studio-Olivia\StudioOliviaGrandMaster (2).jsx` line 8.
 * Lifted with the prototype's `C.*` hex tokens replaced by canonical
 * Aurum/Aether tokens per `01_UI_DESIGN_SYSTEM.md` § 1.6 (no raw hex).
 *
 * Used by the slide-card editor (Track C Session 18) and by
 * `SectionNav` (S17) for the Pitch-section icon row.
 */

import type { SlideType } from "./types";

export interface SlideMeta {
  /** Unicode glyph icon. */
  icon: string;
  /** Canonical token reference (e.g. `"var(--aurum-primary)"`). */
  token: string;
}

/* Token mapping rationale — preserves the prototype's visual hierarchy
 * (warm hooks/asks/traction = Aurum; positive solutions/growth = Mint;
 * critical problems/competition = Coral; structural team/product = Sky;
 * defensive moat/demo = Aether; regulatory/why-now = Amber). */

export const SLIDE_META: Record<SlideType, SlideMeta> = {
  COVER: { icon: "◈", token: "var(--sky-info)" },
  HOOK: { icon: "⌖", token: "var(--aurum-primary)" },
  PROBLEM: { icon: "△", token: "var(--coral-down)" },
  SOLUTION: { icon: "◇", token: "var(--mint-up)" },
  TRACTION: { icon: "↑", token: "var(--aurum-primary)" },
  MOAT: { icon: "⬡", token: "var(--aether-primary)" },
  TEAM: { icon: "○", token: "var(--sky-info)" },
  ASK: { icon: "◉", token: "var(--aurum-primary)" },
  MARKET: { icon: "◫", token: "var(--mint-up)" },
  PRODUCT: { icon: "▣", token: "var(--sky-info)" },
  ROADMAP: { icon: "→", token: "var(--mint-up)" },
  REGULATORY: { icon: "⊞", token: "var(--amber-warn)" },
  ECOSYSTEM: { icon: "⊛", token: "var(--sky-info)" },
  WHY_NOW: { icon: "⏱", token: "var(--amber-warn)" },
  COMPETITION: { icon: "⚔", token: "var(--coral-down)" },
  DEMO: { icon: "▶", token: "var(--aether-primary)" },
  DETAIL: { icon: "◯", token: "var(--fg-tertiary)" },
};
