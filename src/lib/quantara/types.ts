/**
 * Quantara — type contracts for the 56-field founder-valuation intake.
 *
 * # Origin
 *
 * Mirrors the field set captured in
 * `D:\London-Tech-Map\public\assets\founder-valuation-form.html` (1762 LOC
 * static HTML mockup, never built into LTM React) and documented in
 * `D:\London-Tech-Map\docs\TIER_SYSTEM.md` § "56-FIELD VALUATION INTAKE
 * FORM". Per the June-8-demo strategy (see
 * `docs/BUILD_SEQUENCE.md` § "Strategic priority"), Olivia Brain becomes
 * the canonical implementation; LTM port-back happens in a separate
 * session post-OB build.
 *
 * # Why type-only here
 *
 * The 56 fields are defined as Zod schemas in `./schema.ts`, persisted via
 * the destination map in `./field-mapping.ts`. This file holds only the
 * surrounding type contract (section ids, field ids, weights, and the
 * `QuantaraFieldDefinition` shape) so consumers (Q2 form UI, Q3 Composio
 * auto-fill, Q4 validation cascade, Q5 metamorphic reorder, Q7 voice
 * capture) bind to a single stable surface.
 */
import type { z } from 'zod';
import type { BuyerType } from '../valuation/types';

// ── Section ids ────────────────────────────────────────────────────────

/**
 * The 12 Quantara sections, one per `<section>` block in the LTM form.
 * Order is the form's display order (top to bottom on the rendered page).
 * Field counts must sum to 56.
 */
export type QuantaraSectionId =
  | 'core_financials'
  | 'capital_structure'
  | 'funding_history'
  | 'current_round'
  | 'traction'
  | 'market'
  | 'ip_moat'
  | 'team'
  | 'risk'
  | 'growth_levers'
  | 'projections'
  | 'strategic';

/**
 * Three-letter section code embedded in every `field_map_key`. Each code
 * is unique to one `QuantaraSectionId` and never re-used.
 */
export type QuantaraSectionCode =
  | 'FIN' // core_financials
  | 'CAP' // capital_structure
  | 'FND' // funding_history
  | 'CRR' // current_round
  | 'TRC' // traction
  | 'MKT' // market
  | 'IPM' // ip_moat
  | 'TEM' // team
  | 'RSK' // risk
  | 'GRW' // growth_levers
  | 'PRJ' // projections
  | 'STR'; // strategic

// ── Field ids ──────────────────────────────────────────────────────────

/**
 * Field id matching the `<input id="fN">` from the LTM form. Stable for
 * the lifetime of the platform — the UI binds to these and downstream
 * consumers (engine bridge, Composio auto-fill, voice capture) reference
 * them. Renaming is forbidden; create a new field instead.
 */
export type QuantaraFieldId =
  | 'f1' | 'f2' | 'f3' | 'f4' | 'f5' | 'f6' | 'f7' | 'f8' | 'f9' | 'f10'
  | 'f11' | 'f12' | 'f13' | 'f14' | 'f15' | 'f16' | 'f17' | 'f18' | 'f19' | 'f20'
  | 'f21' | 'f22' | 'f23' | 'f24' | 'f25' | 'f26' | 'f27' | 'f28' | 'f29' | 'f30'
  | 'f31' | 'f32' | 'f33' | 'f34' | 'f35' | 'f36' | 'f37' | 'f38' | 'f39' | 'f40'
  | 'f41' | 'f42' | 'f43' | 'f44' | 'f45' | 'f46' | 'f47' | 'f48' | 'f49' | 'f50'
  | 'f51' | 'f52' | 'f53' | 'f54' | 'f55' | 'f56';

/**
 * Total Quantara field count — fixed by the LTM form contract. Used for
 * runtime assertions in `schema.ts` and tests.
 */
export const QUANTARA_FIELD_COUNT = 56 as const;

// ── Field map key ──────────────────────────────────────────────────────

/**
 * Immutable field-map key. Pattern: `QUANT_<SECTION>_<NNN>`. Once
 * assigned, never changes — even if the field's label or schema is
 * revised. Lets Composio auto-fill, voice capture, and downstream
 * analytics reference the same data point across schema revisions.
 *
 * Pattern follows the `field_map_key` convention adopted from
 * `D:\clues-questionnaire-engine\README.md` § "Key Design Decisions".
 */
export type QuantaraFieldMapKey = `QUANT_${QuantaraSectionCode}_${string}`;

/**
 * Regex for runtime validation of a `QuantaraFieldMapKey`. Three-digit
 * sequence number per section (`001` … `999`).
 */
export const QUANTARA_FIELD_MAP_KEY_REGEX =
  /^QUANT_(FIN|CAP|FND|CRR|TRC|MKT|IPM|TEM|RSK|GRW|PRJ|STR)_\d{3}$/;

// ── Weights ────────────────────────────────────────────────────────────

/**
 * Importance weight feeding the data-completeness score:
 * - `3` critical — gate cards in the engine; blocks high-confidence valuation
 * - `2` important — meaningful contribution to method weights / risk
 * - `1` helpful — nice-to-have; refines but doesn't gate
 */
export type QuantaraFieldWeight = 1 | 2 | 3;

// ── Form-specific enums ────────────────────────────────────────────────

/**
 * Allowed values for `f21 — Last Round Type`. Mirrors the `<select id="f21">`
 * `<option>` set in the LTM form. Distinct from `BuyerType` (which is the
 * counterparty class for a valuation, not the founder's previous round).
 */
export type LastRoundType =
  | 'Pre-Seed'
  | 'Seed'
  | 'Series A'
  | 'Series B'
  | 'Series C+'
  | 'Bridge';

/**
 * Allowed values for `f23 — Target Round Type`. Mirrors the
 * `<select id="f23">` `<option>` set. Drives Q5 metamorphic
 * section-reorder (different round types surface different vertical
 * schedules in Q6).
 */
export type TargetRoundType =
  | 'Seed'
  | 'Series A'
  | 'Series B'
  | 'Series C'
  | 'Growth'
  | 'Strategic';

// ── Section descriptor ─────────────────────────────────────────────────

/**
 * Descriptor for a single Quantara section. Display chrome (icon, color
 * token) lives in Q2 UI; Q1 ships only the data shape.
 */
export interface QuantaraSection {
  /** Stable section id; matches `<div id="section-...">` in the LTM form. */
  readonly id: QuantaraSectionId;
  /** Three-letter code embedded in every field-map key in this section. */
  readonly code: QuantaraSectionCode;
  /** Display order, 1-indexed, top to bottom in the rendered form. */
  readonly displayOrder: number;
  /** Section title (matches the `<span class="font-semibold text-2xl">`). */
  readonly title: string;
  /** Subtitle text (matches the `<div class="text-xs ... /70">`). */
  readonly description: string;
  /** Field count in this section. Must sum to `QUANTARA_FIELD_COUNT`. */
  readonly fieldCount: number;
}

// ── Field definition ───────────────────────────────────────────────────

/**
 * Full descriptor for one of the 56 Quantara fields. The Zod `schema` is
 * the validation contract; everything else is metadata consumed by Q2
 * (form UI), Q3 (Composio auto-fill source chips), Q4 (validation
 * cascade), Q5 (metamorphic UI), and the data-completeness scorer.
 *
 * The generic `TValue` parameter is `z.infer<typeof schema>` for the
 * field's runtime type.
 */
export interface QuantaraFieldDefinition<TValue = unknown> {
  /** Form id matching `<input id="fN">`. */
  readonly id: QuantaraFieldId;
  /** Immutable map key. Never changes once shipped. */
  readonly fieldMapKey: QuantaraFieldMapKey;
  /** Section this field belongs to (matches `id`'s prefix in `fieldMapKey`). */
  readonly section: QuantaraSectionId;
  /** Human-readable label (matches `<div class="field-label">` in the form). */
  readonly label: string;
  /** Long-form description; surfaced as helper text in Q2 UI. */
  readonly description: string;
  /** Optional secondary hint (matches `<div class="field-hint">`). */
  readonly hint?: string;
  /** Importance weight for the completeness score. */
  readonly weight: QuantaraFieldWeight;
  /**
   * Investor classes for which this field is meaningful. Q5 uses this to
   * reorder sections when the founder changes target round type. Empty
   * means the field is universally relevant.
   */
  readonly investorClassRelevance: ReadonlyArray<BuyerType>;
  /** Zod schema — single source of truth for runtime validation. */
  readonly schema: z.ZodType<TValue>;
}

// ── Values payload ─────────────────────────────────────────────────────

/**
 * Flat answer payload keyed by `QuantaraFieldId`. Every field is
 * optional — partial completion is a first-class state. Use
 * `parseQuantaraValues` (Q4) to coerce + validate at the API boundary.
 */
export type QuantaraValues = Partial<Record<QuantaraFieldId, unknown>>;

/**
 * Lossless typed view of a `QuantaraValues` payload after schema parse.
 * Each entry's value type comes from the corresponding field schema in
 * `schema.ts`. Generic; consumers narrow as needed.
 */
export type ParsedQuantaraValues = Partial<{
  [K in QuantaraFieldId]: unknown;
}>;

// ── ValuationSubject projection ────────────────────────────────────────

/**
 * Subset of `ValuationSubject` columns Quantara writes through. Matches
 * the Prisma model in `prisma/schema.prisma` lines 1586-1631 plus the
 * net-new `quantaraJson` column added by the Q1 migration.
 *
 * JSON columns are typed as `Record<string, unknown>` here; the bridge
 * layer (`field-mapping.ts`) is the only code that knows the JSON
 * subkeys. This keeps the type contract narrow at the Prisma boundary.
 */
export interface QuantaraValuationSubjectShape {
  companyName?: string;
  sector?: string | null;
  subsector?: string | null;
  stage?: string | null;
  businessModel?: string | null;
  financialDataJson?: Record<string, unknown> | null;
  qualitativeJson?: Record<string, unknown> | null;
  ipDataJson?: Record<string, unknown> | null;
  marketDataJson?: Record<string, unknown> | null;
  capitalDataJson?: Record<string, unknown> | null;
  fundingDataJson?: Record<string, unknown> | null;
  /** Q1 extension column — holds the ~36 fields that don't map to existing JSON columns. */
  quantaraJson?: Record<string, unknown> | null;
}
