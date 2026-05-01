/**
 * OLIVIA BRAIN — Pitch Intelligence Documents
 *
 * 10 document categories with 100+ document templates.
 * Backported from Studio-Olivia.
 */

import type { DocumentCategory, PlanSection } from "./types";

// ─────────────────────────────────────────────
// 10 Document Categories (100+ Documents)
// ─────────────────────────────────────────────

export const DOC_CATEGORIES: DocumentCategory[] = [
  {
    key: "investor",
    title: "Investor & Fundraising",
    icon: "📊",
    docs: [
      "Investor Pitch Deck",
      "Executive Summary",
      "Investor Teaser",
      "Term Sheet Summary",
      "Cap Table",
      "Financial Model (3yr)",
      "Investor FAQ",
      "Fundraising Timeline",
      "Investor Update Template",
    ],
  },
  {
    key: "legal",
    title: "Legal & Governance",
    icon: "⚖️",
    docs: [
      "Articles of Association",
      "Shareholder Agreement",
      "Board Resolution Template",
      "NDA Template",
      "IP Assignment Agreement",
      "GDPR / Data Privacy Policy",
      "Terms of Service",
      "Employee Option Scheme",
      "Convertible Note / SAFE",
      "Director Service Contract",
    ],
  },
  {
    key: "tech",
    title: "Technology & IP",
    icon: "🔬",
    docs: [
      "Technical Architecture Doc",
      "API Documentation",
      "Security & Compliance Overview",
      "Tech Stack Summary",
      "IP Register",
      "System Design Diagram",
      "Scalability Analysis",
      "Open Source Policy",
    ],
  },
  {
    key: "market",
    title: "Market Research",
    icon: "🌍",
    docs: [
      "TAM / SAM / SOM Analysis",
      "Market Research Report",
      "Competitive Landscape Map",
      "ICP Definition",
      "Competitive Battle Cards",
      "Market Sizing Methodology",
      "Customer Segmentation",
    ],
  },
  {
    key: "team",
    title: "Team & Organization",
    icon: "👥",
    docs: [
      "Organizational Chart",
      "Founder Bios",
      "Full Team Directory",
      "Advisory Board Profiles",
      "Equity & Option Summary",
      "Hiring Plan",
    ],
  },
  {
    key: "product",
    title: "Product Documentation",
    icon: "⚙️",
    docs: [
      "Product Roadmap (12mo)",
      "Feature Specification",
      "Product Overview Deck",
      "Integration Guide",
      "User Research Summary",
      "Pricing & Packaging",
      "Product FAQ",
      "Release Notes Template",
    ],
  },
  {
    key: "revenue",
    title: "Customer & Revenue",
    icon: "📈",
    docs: [
      "Customer Case Study",
      "Reference Customer List",
      "NPS & Retention Report",
      "Pipeline Overview",
      "Revenue Recognition Policy",
    ],
  },
  {
    key: "partnership",
    title: "Partnership Materials",
    icon: "🤝",
    docs: [
      "Partnership Deck",
      "MOU Template",
      "Reseller Agreement Framework",
      "Strategic Alliance Summary",
      "Referral Program Terms",
      "Integration Partner Guide",
    ],
  },
  {
    key: "diligence",
    title: "Due Diligence Package",
    icon: "🔍",
    docs: [
      "Data Room Index",
      "DD Checklist",
      "Reference & Background Check List",
      "Litigation & Risk Disclosure",
      "Regulatory Status Summary",
    ],
  },
  {
    key: "strategic",
    title: "Strategic & Exit",
    icon: "🎯",
    docs: [
      "Exit Strategy Analysis",
      "Strategic Options Memo",
      "M&A Readiness Checklist",
      "Long-Term Vision Deck",
    ],
  },
];

// ─────────────────────────────────────────────
// 16 Business Plan Sections
// ─────────────────────────────────────────────

export const PLAN_SECTIONS: PlanSection[] = [
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

// ─────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────

export function getDocCategory(key: string): DocumentCategory | undefined {
  return DOC_CATEGORIES.find((c) => c.key === key);
}

export function getAllDocuments(): string[] {
  return DOC_CATEGORIES.flatMap((c) => c.docs);
}

export function getDocumentCount(): number {
  return getAllDocuments().length;
}

export function getPlanSection(key: string): PlanSection | undefined {
  return PLAN_SECTIONS.find((s) => s.key === key);
}

export function createEmptyPlanSections(): PlanSection[] {
  return PLAN_SECTIONS.map((s) => ({ ...s, value: "" }));
}
