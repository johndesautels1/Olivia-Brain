/**
 * Document Registry — Single Source of Truth
 *
 * Every page, component, and script that references the count of core
 * business document templates or the list of collection slugs MUST import
 * from this file. Hardcoding "56" or "12" anywhere else is forbidden.
 *
 * When a template is added or removed, update CORE_COLLECTIONS below.
 * The validation script (`scripts/validate-document-counts.ts`) will
 * flag any file that still contains a stale hardcoded count.
 */

// ─── Collection Definitions ─────────────────────────────────────────────────

export interface CollectionDef {
  slug: string;
  name: string;
  /** Number of individual document templates in this collection */
  templateCount: number;
}

/**
 * The canonical list of core business document collections.
 * Order matches the seed files (01–12).
 */
export const CORE_COLLECTIONS: CollectionDef[] = [
  { slug: "company-core",           name: "Company Core",           templateCount: 5 },
  { slug: "pitch-decks",            name: "Pitch Decks",            templateCount: 6 },
  { slug: "strategic-partnerships", name: "Strategic Partnerships",  templateCount: 5 },
  { slug: "product-technology",     name: "Product & Technology",    templateCount: 6 },
  { slug: "financials-models",      name: "Financials & Models",     templateCount: 6 },
  { slug: "licensing-commercial",   name: "Licensing & Commercial",  templateCount: 5 },
  { slug: "legal-compliance",       name: "Legal & Compliance",      templateCount: 4 },
  { slug: "due-diligence",          name: "Due Diligence",           templateCount: 4 },
  { slug: "sales-marketing",        name: "Sales & Marketing",       templateCount: 5 },
  { slug: "methodology",            name: "Methodology",             templateCount: 3 },
  { slug: "sample-reports",         name: "Sample Reports",          templateCount: 4 },
  { slug: "acquisition-exit",       name: "Acquisition & Exit",      templateCount: 3 },
];

// ─── Derived Constants ──────────────────────────────────────────────────────

/** Set of all core template collection slugs (for fast lookup) */
export const CORE_COLLECTION_SLUGS = new Set(
  CORE_COLLECTIONS.map((c) => c.slug),
);

/** Ordered array of collection slug strings */
export const CORE_COLLECTION_SLUG_LIST = CORE_COLLECTIONS.map((c) => c.slug);

/** Total number of core document collections (currently 12) */
export const COLLECTION_COUNT = CORE_COLLECTIONS.length;

/** Total number of individual core document templates (currently 56) */
export const TEMPLATE_COUNT = CORE_COLLECTIONS.reduce(
  (sum, c) => sum + c.templateCount,
  0,
);
