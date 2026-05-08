/**
 * Shared constants for the Analysis (Cristiano) section.
 *
 * Single source of truth for DNA paragraph definitions and
 * collection-to-DNA mappings used across components and API routes.
 *
 * Collection slugs referenced here MUST stay in sync with
 * `src/lib/document-registry.ts` (the canonical slug list).
 */

import { CORE_COLLECTION_SLUG_LIST } from "@/lib/document-registry";

// ─── DNA Paragraph Definitions ──────────────────────────────────────────────────

export const DNA_PARAGRAPH_IDS = [
  "p1", "p2", "p3", "p4", "p5",
  "p6", "p7", "p8", "p9", "p10",
] as const;

export type DnaParagraphId = (typeof DNA_PARAGRAPH_IDS)[number];

/** Human-readable labels for each DNA paragraph, keyed by paragraph ID. */
export const PARAGRAPH_LABELS: Record<string, string> = {
  p1: "Company Genesis",
  p2: "Product & Technology",
  p3: "Business Model",
  p4: "London Market Opportunity",
  p5: "Traction & Metrics",
  p6: "Team & Advisors",
  p7: "Competitive Landscape",
  p8: "Financial Snapshot",
  p9: "Use of Funds",
  p10: "Vision & Exit Strategy",
};

// ─── Collection ↔ DNA Mapping ───────────────────────────────────────────────────

/**
 * Which DNA paragraphs feed into each document collection.
 * Key = collection slug, value = array of paragraph IDs that populate it.
 *
 * Used by:
 *   - AnalysisDocSuite (completeness calculation)
 *   - DocumentCollectionModal (AI generation scoping)
 *   - doc-generator (prompt building)
 */
/**
 * Which document collections are recommended for each outreach goal.
 * Used by the Package Composer to auto-select documents.
 */
export const GOAL_COLLECTION_MAP: Record<string, string[]> = {
  fundraising: [
    "company-core", "pitch-decks", "financials-models",
    "product-technology", "due-diligence", "sample-reports",
  ],
  strategic_partnership: [
    "company-core", "strategic-partnerships", "product-technology",
    "methodology", "licensing-commercial", "sample-reports",
  ],
  white_label: [
    "company-core", "strategic-partnerships", "product-technology",
    "licensing-commercial", "methodology", "sample-reports",
  ],
  pilot: [
    "company-core", "product-technology", "methodology",
    "sample-reports", "licensing-commercial",
  ],
  reseller: [
    "company-core", "sales-marketing", "licensing-commercial",
    "product-technology", "sample-reports",
  ],
  acquisition: [
    "company-core", "pitch-decks", "financials-models",
    "due-diligence", "legal-compliance", "acquisition-exit",
    "product-technology",
  ],
  enterprise_sales: [
    "company-core", "product-technology", "sales-marketing",
    "methodology", "sample-reports", "licensing-commercial",
  ],
};

// ─── Collection Icons ────────────────────────────────────────────────────────

/** SVG path data for each collection's icon. Single source of truth. */
export const COLLECTION_ICONS: Record<string, string> = {
  "company-core": "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  "pitch-decks": "M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z",
  "strategic-partnerships": "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  "product-technology": "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z",
  "financials-models": "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  "licensing-commercial": "M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z",
  "legal-compliance": "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3",
  "due-diligence": "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  "sales-marketing": "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z",
  "methodology": "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  "sample-reports": "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  "acquisition-exit": "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
};

export const COLLECTION_DNA_MAP: Record<string, string[]> = {
  "company-core": ["p1", "p2", "p6"],
  "pitch-decks": ["p1", "p2", "p3", "p5", "p8", "p9"],
  "strategic-partnerships": ["p1", "p4", "p5", "p7"],
  "product-technology": ["p2"],
  "financials-models": ["p3", "p8", "p9"],
  "licensing-commercial": ["p3", "p7"],
  "legal-compliance": ["p1", "p8"],
  "due-diligence": ["p1", "p5", "p6", "p8"],
  "sales-marketing": ["p4", "p5"],
  "methodology": ["p2", "p4"],
  "sample-reports": ["p5", "p8", "p10"],
  "acquisition-exit": ["p8", "p9", "p10"],
};

// ─── Registry Sync Guard ─────────────────────────────────────────────────────
// Ensures COLLECTION_DNA_MAP and COLLECTION_ICONS stay in sync with the
// canonical collection list in document-registry.ts.
// Fires at module load; a missing slug will throw at startup.

for (const slug of CORE_COLLECTION_SLUG_LIST) {
  if (!(slug in COLLECTION_DNA_MAP)) {
    throw new Error(`[analysis/constants] COLLECTION_DNA_MAP is missing slug "${slug}" — update it to match document-registry.ts`);
  }
  if (!(slug in COLLECTION_ICONS)) {
    throw new Error(`[analysis/constants] COLLECTION_ICONS is missing slug "${slug}" — update it to match document-registry.ts`);
  }
}
