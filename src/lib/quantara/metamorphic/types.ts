/**
 * Quantara metamorphic — type contracts.
 *
 * # Q5 — Investor-class metamorphic UI
 *
 * The canonical 56-field intake (`../schema.ts`) is round-type agnostic:
 * every field is shown to every founder. Q5 layers two transformations on
 * top of the canonical schema, both keyed off `f23 — Target Round Type`:
 *
 *   1. **Section reorder.** Sections relevant to the round type surface
 *      first; less-relevant ones drop to the back. The 56 fields stay
 *      identical — only the rendering order changes.
 *   2. **Supplementary fields.** Round-type-specific signals that aren't
 *      part of the canonical 56 mount in their own block when the
 *      matching round type is active. A Seed founder sees SAFE/convertible
 *      terms; a Series A founder sees board / liquidation preference; a
 *      Strategic founder sees acquirer-interest signals.
 *
 * # No new top-level columns
 *
 * Per the Q5 macro decision (founder-confirmed 2026-05-07), supplementary
 * values land inside `ValuationSubject.quantaraJson.supplementary`,
 * keyed by round type. Switching round types does NOT wipe previously-
 * entered supplementary values — they're keyed under their original round
 * type for round-trip preservation.
 *
 * # Per-investor-class question bias from `Organization` records
 *
 * Deferred to W-017. The current Q5 implementation drives metamorphism
 * off `f23` and per-field `investorClassRelevance` only — no `Organization`
 * dependency, honoring the speculative-generalization rule.
 */
import type { z } from 'zod';
import type { TargetRoundType } from '../types';

// ── Supplementary field ids ────────────────────────────────────────────

/**
 * Supplementary field id namespace. Distinct from the canonical
 * `f1..f56` so the two cannot be confused at the type level.
 *
 * Pattern: `s${number}`. Stable for the lifetime of the platform —
 * downstream consumers (Composio auto-fill in Q5+, voice capture in Q7,
 * deal-protection in Track P) reference these ids; renaming is forbidden.
 */
export type SupplementaryFieldId =
  | 's1' | 's2' | 's3'   // Seed
  | 's4' | 's5' | 's6'   // Series A
  | 's7' | 's8' | 's9'   // Series B
  | 's10' | 's11' | 's12' // Series C
  | 's13' | 's14' | 's15' // Growth
  | 's16' | 's17' | 's18'; // Strategic

/**
 * Total supplementary field count — fixed by the Q5 contract. Used for
 * runtime assertions in `./supplementary.ts` and tests.
 */
export const QUANTARA_SUPPLEMENTARY_FIELD_COUNT = 18 as const;

// ── Supplementary control kinds ────────────────────────────────────────

/**
 * Discrete control kinds for supplementary fields. A subset of the
 * canonical `QuantaraFieldControlKind` plus `select-enum` for inline
 * enum options (canonical fields use named selects like
 * `select-target-round-type`; supplementary fields supply options inline).
 */
export type SupplementaryControlKind =
  | 'currency-gbp'
  | 'percent'
  | 'integer'
  | 'number'
  | 'text'
  | 'long-text'
  | 'select-enum'
  | 'multi-select-enum';

/**
 * Importance weight feeding the supplementary-completeness summary.
 * Same ladder as the canonical fields.
 */
export type SupplementaryFieldWeight = 1 | 2 | 3;

// ── Supplementary field definition ─────────────────────────────────────

/**
 * Full descriptor for one supplementary field. Each supplementary field
 * is **owned by exactly one round type** — switching round types in the
 * UI hides this field but does not delete the stored value (round-trip
 * preservation).
 */
export interface SupplementaryFieldDefinition<TValue = unknown> {
  /** Stable id; matches `s${number}`. */
  readonly id: SupplementaryFieldId;
  /** Round type this field belongs to. */
  readonly roundType: TargetRoundType;
  /** Persistent storage subkey under `quantaraJson.supplementary[roundType]`. */
  readonly subkey: string;
  /** Human-readable label. */
  readonly label: string;
  /** Long-form description; surfaced as helper text in the supplementary block. */
  readonly description: string;
  /** Optional secondary hint. */
  readonly hint?: string;
  /** Importance weight — feeds the supplementary-completeness summary. */
  readonly weight: SupplementaryFieldWeight;
  /** Render control kind. */
  readonly control: SupplementaryControlKind;
  /** Right-side unit label (e.g. `GBP`, `%`, `months`). */
  readonly unitLabel?: string;
  /** Numeric `step` attribute. */
  readonly step?: number;
  /**
   * Inline option list for `select-enum` / `multi-select-enum` controls.
   * Each entry's `value` is what's persisted; `label` is what's rendered.
   * Ignored for non-select controls.
   */
  readonly options?: ReadonlyArray<{ readonly value: string; readonly label: string }>;
  /** Zod schema — single source of truth for runtime validation. */
  readonly schema: z.ZodType<TValue>;
}

// ── Supplementary values payload ───────────────────────────────────────

/**
 * Flat answer payload for a single round type's supplementary fields.
 * Every field optional; partial completion is a first-class state.
 */
export type SupplementaryValuesForRound = Partial<
  Record<SupplementaryFieldId, unknown>
>;

/**
 * Full supplementary values map — keyed by round type, then by field id.
 * Switching round types in the form preserves the prior round's entries
 * here so they round-trip if the founder switches back.
 */
export type SupplementaryValues = Partial<
  Record<TargetRoundType, SupplementaryValuesForRound>
>;
