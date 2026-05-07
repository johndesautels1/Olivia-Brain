/**
 * Quantara — Q2 weight-aware completeness math.
 *
 * Per `docs/BUILD_SEQUENCE.md` Q2: "Live data-completeness % bar driven
 * off `QUANTARA_FIELDS` weights." Each field carries a `weight` of
 *   3 — critical (gates engine cards),
 *   2 — important (meaningful method weight),
 *   1 — helpful (refinement only).
 *
 * Two scores ship:
 *   - `overallCompleteness(values)` — the full 0–100 bar
 *   - `sectionCompleteness(sectionId, values)` — per-section progress
 *     for the rail nav chips
 *
 * Both functions ignore `null`, `undefined`, and empty strings; any
 * other value (including `0` and explicit `false`) counts as filled.
 * Founders may legitimately enter `0` for "no patents yet" or
 * "negative net margin", and treating `0` as empty would silently
 * undercount their progress.
 *
 * Pure functions; no React, no Prisma. Test surface lives in
 * `__tests__/completeness.test.ts`.
 */
import {
  QUANTARA_FIELDS,
  QUANTARA_SECTIONS_BY_ID,
  type QuantaraFieldId,
  type QuantaraSectionId,
  type QuantaraValues,
} from "@/lib/quantara";

/**
 * Whether a Quantara value should be treated as "filled" for the
 * purpose of the completeness score. Mirrors the rule in the LTM
 * mockup's `updateProgress()` JS but **DOES** count `0` (the LTM
 * mockup excluded 0, which silently undercounted "no patents granted"
 * type fields).
 */
export function isFilled(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

export interface CompletenessSummary {
  /** 0–100 weighted percentage. */
  readonly percent: number;
  /** Number of fields the user has filled in this scope. */
  readonly fieldsFilled: number;
  /** Total number of fields in this scope. */
  readonly fieldsTotal: number;
  /** Sum of weights of filled fields. */
  readonly weightFilled: number;
  /** Sum of weights of all fields in this scope. */
  readonly weightTotal: number;
}

function summarise(
  fieldIds: ReadonlyArray<QuantaraFieldId>,
  values: QuantaraValues,
): CompletenessSummary {
  let weightFilled = 0;
  let weightTotal = 0;
  let fieldsFilled = 0;

  for (const id of fieldIds) {
    const field = QUANTARA_FIELDS.find((f) => f.id === id);
    if (!field) continue;
    weightTotal += field.weight;
    if (isFilled(values[id])) {
      weightFilled += field.weight;
      fieldsFilled += 1;
    }
  }

  const percent =
    weightTotal === 0 ? 0 : Math.round((weightFilled / weightTotal) * 100);

  return {
    percent,
    fieldsFilled,
    fieldsTotal: fieldIds.length,
    weightFilled,
    weightTotal,
  };
}

/** Overall completeness across all 56 fields. */
export function overallCompleteness(
  values: QuantaraValues,
): CompletenessSummary {
  const ids = QUANTARA_FIELDS.map((f) => f.id);
  return summarise(ids, values);
}

/** Per-section completeness for the rail nav and section header chip. */
export function sectionCompleteness(
  sectionId: QuantaraSectionId,
  values: QuantaraValues,
): CompletenessSummary {
  const ids = QUANTARA_FIELDS.filter((f) => f.section === sectionId).map(
    (f) => f.id,
  );
  return summarise(ids, values);
}

/**
 * Compute every section's completeness in one pass — useful for the
 * sidebar nav so the form doesn't iterate `QUANTARA_FIELDS` 12× per
 * render.
 */
export function allSectionCompleteness(
  values: QuantaraValues,
): ReadonlyArray<{
  readonly section: QuantaraSectionId;
  readonly summary: CompletenessSummary;
}> {
  return Object.keys(QUANTARA_SECTIONS_BY_ID).map((sectionId) => {
    const id = sectionId as QuantaraSectionId;
    return { section: id, summary: sectionCompleteness(id, values) };
  });
}
