/**
 * `FRAMEWORKS` — 14 deck-archetype frameworks toggleable in the left rail
 * Frameworks panel.
 *
 * Source: `D:\Studio-Olivia\StudioOliviaGrandMaster (2).jsx` line 13.
 * Lifted byte-for-byte. Used by `FrameworksPanel` when
 * `navSection === "pitch"`. Each is toggleable via `activeFrameworks: Set<number>`;
 * active items show a colored dot + confidence number.
 *
 * Per `STUDIO_OLIVIA_DESIGN.md` § 2.3 #7. The prototype's `color` hex
 * codes are dropped here per `01_UI_DESIGN_SYSTEM.md` § 1.6 — colors are
 * derived from `cat` via `frameworkCategoryToken()` so all paint flows
 * through canonical Aurum/Aether tokens.
 */

export type FrameworkCategoryKey =
  | "classic"
  | "saas"
  | "framework"
  | "ai"
  | "fintech"
  | "london";

export interface Framework {
  /** Stable numeric id from the prototype. */
  id: number;
  /** Display name (e.g., `"Y Combinator"`). */
  name: string;
  /** Short tag (e.g., `"2.5-Min Demo Day"`). */
  tag: string;
  /** Category key — drives token color via `frameworkCategoryToken`. */
  cat: FrameworkCategoryKey;
  /** Confidence 0-100. Surfaces as a Badge when active. */
  conf: number;
}

export const FRAMEWORKS: readonly Framework[] = [
  { id: 1, name: "Airbnb", tag: "Problem-First Clarity", cat: "classic", conf: 97 },
  { id: 2, name: "Uber", tag: "Vision-First Disruption", cat: "classic", conf: 94 },
  { id: 3, name: "Buffer", tag: "Traction Transparency", cat: "saas", conf: 91 },
  { id: 4, name: "LinkedIn", tag: "Network Effects", cat: "classic", conf: 88 },
  { id: 5, name: "Sequoia", tag: "Universal 11-Slide", cat: "framework", conf: 99 },
  { id: 6, name: "Y Combinator", tag: "2.5-Min Demo Day", cat: "framework", conf: 95 },
  { id: 7, name: "Guy Kawasaki", tag: "10/20/30 Rule", cat: "framework", conf: 90 },
  { id: 8, name: "Synthesia", tag: "AI Cost-Collapse", cat: "ai", conf: 89 },
  { id: 9, name: "Writer", tag: "Enterprise AI Moat", cat: "ai", conf: 87 },
  { id: 10, name: "Gong", tag: "Revenue Intelligence", cat: "ai", conf: 85 },
  { id: 11, name: "Seek AI", tag: "Niche-Down AI", cat: "ai", conf: 84 },
  { id: 12, name: "Coinbase", tag: "Education-First", cat: "fintech", conf: 88 },
  { id: 13, name: "Gradient Labs", tag: "London Specificity", cat: "london", conf: 92 },
  { id: 14, name: "London AI Doc Engine", tag: "Document Automation", cat: "london", conf: 86 },
];

/** Map a framework category to its canonical Aurum/Aether token. */
export function frameworkCategoryToken(cat: FrameworkCategoryKey): string {
  switch (cat) {
    case "classic":
      return "var(--sky-info)";
    case "saas":
      return "var(--mint-up)";
    case "framework":
      return "var(--fg-tertiary)";
    case "ai":
      return "var(--aether-primary)";
    case "fintech":
      return "var(--amber-warn)";
    case "london":
      return "var(--coral-down)";
  }
}
