/**
 * `DOC_CATEGORIES` — 10 collapsible doc-tree categories with ~65 docs total.
 *
 * Source: `D:\Studio-Olivia\StudioOliviaGrandMaster (2).jsx` line 11.
 * Lifted byte-for-byte (text content preserved verbatim) and typed strictly.
 *
 * Used by `DocumentTree` in the left rail when `navSection === "documents"`.
 * Per `STUDIO_OLIVIA_DESIGN.md` § 2.3 #6 — each category renders with
 * chevron + emoji + title + count, expanding to nested doc rows with
 * `CompletionRing` + name. Click sets `activeDoc = { category, doc }`.
 */

export interface DocCategory {
  /** Stable lookup key (`"investor"`, `"legal"`, etc.). */
  key: string;
  /** Display title (`"Investor & Fundraising"`, `"Legal & Governance"`). */
  title: string;
  /** Emoji glyph rendered next to the title. */
  icon: string;
  /** Doc names in this category. */
  docs: readonly string[];
}

export const DOC_CATEGORIES: readonly DocCategory[] = [
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

/** Total doc count across every category — `~65`. */
export const TOTAL_DOC_COUNT: number = DOC_CATEGORIES.reduce(
  (sum, c) => sum + c.docs.length,
  0,
);
