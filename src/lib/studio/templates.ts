/**
 * 12 business-plan templates — Studio Olivia Library "Plans" tab.
 *
 * Source: `D:\Studio-Olivia\StudioOliviaGrandMaster (2).jsx` line 22.
 * Lifted byte-for-byte (text content preserved verbatim) and typed strictly
 * against `PlanTemplate`.
 *
 * Templates differ from archetypes in carrying `sections` (a section count
 * for the BP narrative) instead of `slideCount` — a Sequoia BP has 10
 * sections, a Lean Canvas has 1, a Buyout/PE BP has 18.
 */

import type { PlanTemplate } from "./types";

export const PLAN_TEMPLATES: readonly PlanTemplate[] = [
  { id: 101, name: "Sequoia Capital BP", tag: "10-Section Standard", cat: "vc_framework", stage: ["Any"], consensus: 5, insight: "Purpose → Problem → Solution → Why Now → Market → Competition → Model → Team → Financials → Ask", fit: "Default for any CLUES London founder raising institutional capital.", olivia_action: "Auto-generate all 10 sections from Company DNA.", sections: 10 },
  { id: 102, name: "Lean Canvas", tag: "One-Page Validation", cat: "industry_template", stage: ["Pre-seed"], consensus: 5, insight: "9 blocks: Problem, Solution, Key Metrics, UVP, Unfair Advantage, Channels, Segments, Costs, Revenue", fit: "London founders at pre-seed needing fast, one-page validation.", olivia_action: "Populate from Company DNA — flags blocks below 70% confidence.", sections: 1 },
  { id: 103, name: "Traditional UK BP", tag: "King's Trust / Start Up Loans", cat: "london_uk", stage: ["Seed"], consensus: 4, insight: "Exec Summary + full financials + cashflow. UK grant & EIS ready.", fit: "London founders applying for EIS/SEIS, Start Up Loans, or King's Trust grants.", olivia_action: "Export Word + Excel with three-year cashflow model.", sections: 15 },
  { id: 104, name: "AI Startup BP", tag: "AI Moat & Defensibility", cat: "ai_template", stage: ["Seed", "Series A"], consensus: 4, insight: "Moat, data, hallucination mitigation, cost collapse.", fit: "London AI founders needing to articulate their moat in depth.", olivia_action: "Insert AI defensibility sections.", sections: 12 },
  { id: 105, name: "Fintech London BP", tag: "Open Banking + Regulatory", cat: "london_uk", stage: ["Seed", "Series A"], consensus: 4, insight: "Regulatory credentials by page 4.", fit: "London fintech founders in regulated markets.", olivia_action: "Regulatory Readiness section before competitive landscape.", sections: 14 },
  { id: 106, name: "One-Page Pitch", tag: "Investor Teaser", cat: "vc_framework", stage: ["Pre-seed"], consensus: 4, insight: "1-page exec summary for warm intros.", fit: "London founders needing a concise intro document.", olivia_action: "Generate teaser PDF alongside full deck.", sections: 1 },
  { id: 107, name: "SaaS Scalability BP", tag: "B2B Unit Economics", cat: "saas", stage: ["Series A"], consensus: 3, insight: "ARR, NDR, CAC, LTV, payback period.", fit: "London SaaS founders needing unit economics depth.", olivia_action: "Insert live SaaS metrics section.", sections: 16 },
  { id: 108, name: "Proptech BP", tag: "AI Market Analysis", cat: "industry_template", stage: ["Seed"], consensus: 3, insight: "Direct match for property analysis.", fit: "London proptech founders — data-driven property intelligence.", olivia_action: "Property data integration.", sections: 13 },
  { id: 109, name: "Healthtech BP", tag: "Clinical Validation", cat: "industry_template", stage: ["Series A"], consensus: 3, insight: "Clinical data beats early traction.", fit: "London healthtech founders — clinical validation over user counts.", olivia_action: "Validation cascade sections.", sections: 15 },
  { id: 110, name: "London Ecosystem BP", tag: "Tech Gravity + Districts", cat: "london_uk", stage: ["Any"], consensus: 4, insight: "Hyper-local London data across 28 districts.", fit: "London founders building ecosystem-dependent products.", olivia_action: "Auto-pull London ecosystem data.", sections: 12 },
  { id: 111, name: "Buyout / PE BP", tag: "EBITDA + Financial Depth", cat: "industry_template", stage: ["Buyout"], consensus: 3, insight: "Full financial model + exit multiples.", fit: "London founders preparing for PE acquisition or buyout.", olivia_action: "Normalised EBITDA bridge + exit multiple analysis.", sections: 18 },
  { id: 112, name: "Grant / Visa BP", tag: "UKRI + Home Office Ready", cat: "london_uk", stage: ["Pre-seed"], consensus: 4, insight: "Innovation + economic impact + team credibility.", fit: "International founders applying for UK Innovator Visa or UKRI grants.", olivia_action: "Visa & grant compliance structure.", sections: 10 },
];
