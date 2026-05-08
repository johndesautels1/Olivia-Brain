/**
 * Quantara metamorphic — Q6 vertical axis types.
 *
 * # Q6 — Vertical-specific schedules
 *
 * Q5 introduced round-axis metamorphism (`f23 — Target Round Type` →
 * section reorder + supplementary fields). Q6 adds a parallel
 * vertical axis — different industries surface different schedules:
 *
 *   - **AI/SaaS** — model provenance, training data, eval framework, hallucination rate, inference cost
 *   - **HealthTech** — regulatory pathway, clinical trial stage, peer-reviewed studies, reimbursement, KOLs
 *   - **ClimateTech** — ESG framework alignment, CO₂ abatement, impact methodology, lifecycle assessment, carbon-accounting tool
 *   - **PropTech** — property data accuracy, MLS RESO compliance, geographic coverage, transaction volume, refresh cadence
 *   - **Generic** — fallback when none of the above; no vertical schedule mounts
 *
 * # Why parallel to supplementary, not extending
 *
 * Round axis and vertical axis are independent — a Series A fintech
 * raise should answer Series A supplementary questions AND the
 * generic-vertical schedule (which is empty by design). Coupling them
 * would force one founder to fill both schedules just because they
 * happened to have a vertical selected. Parallel storage namespaces
 * (`quantaraJson.supplementary[roundType]` vs
 * `quantaraJson.vertical[verticalId]`) keep the axes orthogonal.
 *
 * Both axes share the structural `MetamorphicFieldShape` from
 * `./types.ts`, so the same `IntakeSupplementaryField` renderer
 * handles both.
 */
import type { z } from 'zod';
import type {
  MetamorphicFieldShape,
  SupplementaryControlKind,
  SupplementaryFieldWeight,
} from './types';

// ── Vertical id namespace ──────────────────────────────────────────────

/**
 * Canonical verticals. Stored on `ValuationSubject.sector` (top-level
 * column already on the Prisma model). Stable ids — never rename. The
 * vertical schedule the founder sees is keyed off this id; persona
 * routing (Track L, Track P) and per-vertical prompts will key off it
 * too. New verticals append; existing ids never change.
 */
export type VerticalId =
  | 'ai_saas'
  | 'healthtech'
  | 'climatetech'
  | 'proptech'
  | 'generic';

/** Display label for a vertical. Stable for human-readable UI. */
export interface VerticalDescriptor {
  readonly id: VerticalId;
  readonly label: string;
  /** Short tagline shown under the schedule title. */
  readonly description: string;
}

/**
 * Total count of verticals — used for runtime invariants in tests.
 * Bump when a new vertical is added.
 */
export const QUANTARA_VERTICAL_COUNT = 5 as const;

// ── Vertical field id namespace ────────────────────────────────────────

/**
 * Vertical field ids. Distinct from canonical (`f1..f56`) AND from Q5
 * supplementary (`s1..s18`) namespaces so cross-axis ids cannot
 * collide. Pattern: `v${number}`.
 */
export type VerticalFieldId =
  | 'v1' | 'v2' | 'v3' | 'v4' | 'v5'    // AI/SaaS
  | 'v6' | 'v7' | 'v8' | 'v9' | 'v10'   // HealthTech
  | 'v11' | 'v12' | 'v13' | 'v14' | 'v15' // ClimateTech
  | 'v16' | 'v17' | 'v18' | 'v19' | 'v20'; // PropTech

/**
 * Total vertical field count — 4 verticals × 5 fields = 20. Generic
 * has no fields by design.
 */
export const QUANTARA_VERTICAL_FIELD_COUNT = 20 as const;

// ── Vertical field definition ──────────────────────────────────────────

/**
 * Full descriptor for one vertical-specific field. Mirrors the shape of
 * `SupplementaryFieldDefinition` — both extend `MetamorphicFieldShape`
 * so the shared renderer handles either axis.
 */
export interface VerticalFieldDefinition<TValue = unknown>
  extends MetamorphicFieldShape {
  readonly id: VerticalFieldId;
  /** Vertical this field belongs to. */
  readonly verticalId: VerticalId;
  /** Persistent storage subkey under `quantaraJson.vertical[verticalId]`. */
  readonly subkey: string;
  /** Importance weight — feeds the per-vertical completion ring. */
  readonly weight: SupplementaryFieldWeight;
  /** Render control kind. Reuses Q5's `SupplementaryControlKind`. */
  readonly control: SupplementaryControlKind;
  /** Zod schema — single source of truth for runtime validation. */
  readonly schema: z.ZodType<TValue>;
}

// ── Values payload ─────────────────────────────────────────────────────

/**
 * Flat answer payload for a single vertical's fields. Every field
 * optional; partial completion is a first-class state.
 */
export type VerticalValuesForVertical = Partial<
  Record<VerticalFieldId, unknown>
>;

/**
 * Full vertical values map — keyed by vertical, then by field id.
 * Switching verticals preserves prior entries (parity with Q5
 * supplementary's multi-round preservation).
 */
export type VerticalValues = Partial<Record<VerticalId, VerticalValuesForVertical>>;
