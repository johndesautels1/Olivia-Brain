/**
 * `PLAN_SECTIONS` — 16 business-plan sections.
 *
 * Source: `D:\Studio-Olivia\StudioOliviaGrandMaster (2).jsx` line 12.
 * Lifted byte-for-byte. Used by `PlanSectionNav` in the left rail when
 * `navSection === "plan"` and by the center-pane plan editor (S18).
 *
 * Per `STUDIO_OLIVIA_DESIGN.md` § 2.3 #8 — each section renders with
 * icon + title + Badge (confidence). Click sets `activePlanIdx`.
 *
 * The per-section content (`content: string`, `confidence: number`)
 * lives on the user's `planSections[]` runtime state, not on this static
 * reference table.
 */

export interface PlanSection {
  /** Stable lookup key. */
  key: string;
  /** Display title. */
  title: string;
  /** Emoji glyph. */
  icon: string;
}

export const PLAN_SECTIONS: readonly PlanSection[] = [
  { key: "executive_summary", title: "Executive Summary", icon: "📋" },
  { key: "company_purpose", title: "Company Purpose", icon: "🎯" },
  { key: "problem", title: "Problem Statement", icon: "⚡" },
  { key: "solution", title: "Solution", icon: "💡" },
  { key: "why_now", title: "Why Now", icon: "⏰" },
  { key: "market_opportunity", title: "Market Opportunity", icon: "📊" },
  { key: "business_model", title: "Business Model", icon: "💰" },
  { key: "revenue_projections", title: "Revenue Projections", icon: "📈" },
  { key: "go_to_market", title: "Go-to-Market", icon: "🚀" },
  { key: "competitive_landscape", title: "Competitive Landscape", icon: "🏁" },
  { key: "traction", title: "Traction & Validation", icon: "✅" },
  { key: "team", title: "Team", icon: "👥" },
  { key: "financials", title: "Financials", icon: "🏦" },
  { key: "use_of_funds", title: "Use of Funds", icon: "🎯" },
  { key: "exit_strategy", title: "Exit Strategy", icon: "🚪" },
  { key: "london_ecosystem_fit", title: "London Ecosystem Fit", icon: "🇬🇧" },
];
