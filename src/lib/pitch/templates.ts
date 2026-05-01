/**
 * OLIVIA BRAIN — Pitch Intelligence Templates
 *
 * 12 business plan templates from Studio-Olivia.
 * Each template represents a proven VC framework.
 */

import type { BusinessPlanTemplate, DeckCategory } from "./types";

// ─────────────────────────────────────────────
// 12 Business Plan Templates
// ─────────────────────────────────────────────

export const BIZ_TEMPLATES: BusinessPlanTemplate[] = [
  {
    id: 101,
    name: "Sequoia Capital BP",
    tag: "10-Section Standard",
    cat: "vc_framework",
    stage: ["Any"],
    consensus: 5,
    insight: "Purpose → Problem → Solution → Why Now → Market → Competition → Model → Team → Financials → Ask",
    fit: "Default for any CLUES London founder raising institutional capital.",
    olivia_action: "Auto-generate all 10 sections from Company DNA.",
    sections: 10,
  },
  {
    id: 102,
    name: "Y Combinator BP",
    tag: "Startup School Format",
    cat: "vc_framework",
    stage: ["Pre-seed", "Seed"],
    consensus: 5,
    insight: "Problem → Solution → Traction → Market → Team → Ask. Simple and direct.",
    fit: "Early-stage founders applying to accelerators.",
    olivia_action: "Generate concise 6-section plan focused on essentials.",
    sections: 6,
  },
  {
    id: 103,
    name: "a16z Playbook BP",
    tag: "Software Eating World",
    cat: "vc_framework",
    stage: ["Series A", "Series B"],
    consensus: 5,
    insight: "Market size → Product → Business model → Go-to-market → Team → Financials → Competition → Risks",
    fit: "Growth-stage software companies with clear market dynamics.",
    olivia_action: "Generate comprehensive 8-section plan with market analysis.",
    sections: 8,
  },
  {
    id: 104,
    name: "Index Ventures BP",
    tag: "European Scale",
    cat: "vc_framework",
    stage: ["Series A"],
    consensus: 4,
    insight: "European market dynamics → UK base → Expansion roadmap → Regulatory environment",
    fit: "UK/EU founders building pan-European businesses.",
    olivia_action: "Generate plan with European expansion focus.",
    sections: 12,
  },
  {
    id: 105,
    name: "Accel BP",
    tag: "Prepared Mind",
    cat: "vc_framework",
    stage: ["Seed", "Series A"],
    consensus: 4,
    insight: "Vision → Problem → Solution → Differentiation → Business model → Traction → Team → Financials → Risks → Ask",
    fit: "Mature founders who can articulate risks honestly.",
    olivia_action: "Generate plan with explicit risk analysis section.",
    sections: 10,
  },
  {
    id: 106,
    name: "Balderton Capital BP",
    tag: "European Champion",
    cat: "vc_framework",
    stage: ["Series A", "Series B"],
    consensus: 4,
    insight: "Category leadership → European market → Team → Unit economics → Capital efficiency",
    fit: "UK startups positioning as European category leaders.",
    olivia_action: "Generate plan with European category leadership positioning.",
    sections: 10,
  },
  {
    id: 107,
    name: "LocalGlobe BP",
    tag: "Seed Specialist",
    cat: "vc_framework",
    stage: ["Seed"],
    consensus: 4,
    insight: "Founder story → Vision → Early traction signals → Why now → Team depth",
    fit: "Very early-stage London founders with strong founder-market fit.",
    olivia_action: "Generate founder-story-first plan for seed stage.",
    sections: 8,
  },
  {
    id: 108,
    name: "Notion Capital BP",
    tag: "B2B SaaS Focus",
    cat: "vc_framework",
    stage: ["Seed", "Series A"],
    consensus: 4,
    insight: "SaaS metrics deep dive: NDR, CAC payback, LTV:CAC, magic number, churn cohorts",
    fit: "B2B SaaS founders with established metrics.",
    olivia_action: "Generate SaaS-metrics-heavy plan with benchmarks.",
    sections: 12,
  },
  {
    id: 109,
    name: "First Round Capital BP",
    tag: "Community First",
    cat: "vc_framework",
    stage: ["Pre-seed", "Seed"],
    consensus: 4,
    insight: "Community contribution → Founder network → Learning mindset → Team dynamics",
    fit: "Founders with strong community involvement.",
    olivia_action: "Generate plan highlighting community and network effects.",
    sections: 8,
  },
  {
    id: 110,
    name: "AI Startup BP",
    tag: "AI-Native Format",
    cat: "ai_template",
    stage: ["Seed", "Series A"],
    consensus: 4,
    insight: "AI moat → Data flywheel → Model differentiation → Responsible AI → Compute strategy",
    fit: "AI-native startups with technical differentiation.",
    olivia_action: "Generate AI-specific plan with technical moat analysis.",
    sections: 14,
  },
  {
    id: 111,
    name: "Fintech Startup BP",
    tag: "Regulated Industry",
    cat: "fintech",
    stage: ["Seed", "Series A"],
    consensus: 4,
    insight: "Regulatory pathway → Compliance strategy → Trust building → Unit economics → Capital requirements",
    fit: "Fintech founders navigating FCA and regulatory requirements.",
    olivia_action: "Generate plan with regulatory and compliance roadmap.",
    sections: 14,
  },
  {
    id: 112,
    name: "London Tech Map BP",
    tag: "London Ecosystem",
    cat: "london_uk",
    stage: ["Any"],
    consensus: 5,
    insight: "London ecosystem fit → District positioning → Tech Gravity alignment → Investor ecosystem → Talent access",
    fit: "Any London founder leveraging the local ecosystem.",
    olivia_action: "Generate plan with London Tech Map ecosystem integration.",
    sections: 16,
  },
];

// ─────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────

export function getTemplate(id: number): BusinessPlanTemplate | undefined {
  return BIZ_TEMPLATES.find((t) => t.id === id);
}

export function getTemplateByName(name: string): BusinessPlanTemplate | undefined {
  return BIZ_TEMPLATES.find((t) => t.name.toLowerCase().includes(name.toLowerCase()));
}

export function getTemplatesByCategory(cat: DeckCategory): BusinessPlanTemplate[] {
  return BIZ_TEMPLATES.filter((t) => t.cat === cat);
}

export function getTemplatesByStage(stage: string): BusinessPlanTemplate[] {
  return BIZ_TEMPLATES.filter((t) =>
    t.stage.some((s) => s.toLowerCase() === stage.toLowerCase()) ||
    t.stage.includes("Any")
  );
}

export function getTemplateCount(): number {
  return BIZ_TEMPLATES.length;
}
