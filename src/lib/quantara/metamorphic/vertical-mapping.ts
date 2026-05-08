/**
 * Quantara metamorphic — Q6 vertical projection helpers.
 *
 * Vertical values land inside `ValuationSubject.quantaraJson` under a
 * `vertical` namespace, parallel to Q5's `supplementary` namespace,
 * keyed by vertical id then by the field's `subkey`.
 *
 * Storage shape:
 *
 *   ```ts
 *   quantaraJson: {
 *     ...canonical-field-subkeys,
 *     supplementary: { ...Q5 round-axis... },
 *     vertical: {
 *       ai_saas: { modelProvenance: "fine_tuned", ... },
 *       healthtech: { regulatoryPathway: "mhra", ... },
 *       ...
 *     }
 *   }
 *   ```
 *
 * Switching verticals does NOT delete prior entries (parity with
 * Q5 supplementary's multi-round preservation).
 */
import {
  QUANTARA_VERTICAL_FIELDS_BY_ID,
  getVerticalFieldsForVertical,
} from './vertical-schedules';
import type {
  VerticalFieldId,
  VerticalId,
  VerticalValues,
  VerticalValuesForVertical,
} from './vertical-types';

/**
 * Subkey under `quantaraJson` where vertical values live. Stable —
 * never rename. Distinct from Q5's `supplementary` namespace.
 */
export const QUANTARA_VERTICAL_NAMESPACE = 'vertical' as const;

const ALL_VERTICAL_IDS: ReadonlyArray<VerticalId> = [
  'ai_saas',
  'healthtech',
  'climatetech',
  'proptech',
  'generic',
];

/**
 * Project a vertical values map into the `quantaraJson.vertical`
 * shape. Field-id keys (`v1` etc.) become subkey keys
 * (`modelProvenance` etc.).
 *
 * Undefined / null values are skipped. Empty verticals are pruned so
 * partial saves don't write empty buckets.
 */
export function verticalToJson(
  values: VerticalValues,
): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const [verticalId, perVertical] of Object.entries(values) as Array<
    [VerticalId, VerticalValuesForVertical | undefined]
  >) {
    if (!perVertical) continue;
    const bag: Record<string, unknown> = {};
    for (const [fieldId, value] of Object.entries(perVertical) as Array<
      [VerticalFieldId, unknown]
    >) {
      if (value === undefined || value === null) continue;
      const def = QUANTARA_VERTICAL_FIELDS_BY_ID[fieldId];
      if (!def) continue;
      bag[def.subkey] = value;
    }
    if (Object.keys(bag).length > 0) {
      out[verticalId] = bag;
    }
  }
  return out;
}

/**
 * Inverse projection — read a `quantaraJson.vertical` shape and
 * reconstruct the field-id-keyed `VerticalValues` payload. Tolerates
 * unknown subkeys (skipped silently — forward-compat).
 */
export function verticalFromJson(bag: unknown): VerticalValues {
  const out: VerticalValues = {};
  if (!bag || typeof bag !== 'object') return out;
  const root = bag as Record<string, unknown>;

  for (const verticalId of ALL_VERTICAL_IDS) {
    const verticalBag = root[verticalId];
    if (!verticalBag || typeof verticalBag !== 'object') continue;

    const fields = getVerticalFieldsForVertical(verticalId);
    const subkeyToId = new Map<string, VerticalFieldId>();
    for (const f of fields) subkeyToId.set(f.subkey, f.id);

    const perVertical: VerticalValuesForVertical = {};
    for (const [subkey, value] of Object.entries(
      verticalBag as Record<string, unknown>,
    )) {
      const fieldId = subkeyToId.get(subkey);
      if (!fieldId) continue;
      if (value === undefined || value === null) continue;
      perVertical[fieldId] = value;
    }
    if (Object.keys(perVertical).length > 0) {
      out[verticalId] = perVertical;
    }
  }
  return out;
}

/**
 * Read the vertical namespace out of a quantaraJson bag, returning
 * the typed `VerticalValues` shape.
 */
export function readVerticalFromQuantaraJson(
  quantaraJson: Record<string, unknown> | null | undefined,
): VerticalValues {
  if (!quantaraJson) return {};
  return verticalFromJson(quantaraJson[QUANTARA_VERTICAL_NAMESPACE]);
}

/**
 * Merge a vertical projection into an existing quantaraJson bag
 * without disturbing canonical-field subkeys, the supplementary
 * namespace, or unrelated verticals. Used server-side in
 * `/api/founder-intake` so partial vertical saves don't clobber
 * unrelated data.
 */
export function mergeVerticalIntoQuantaraJson(
  current: Record<string, unknown> | null | undefined,
  values: VerticalValues,
): Record<string, unknown> {
  const next = current ? { ...current } : {};
  const incoming = verticalToJson(values);
  const existing =
    (next[QUANTARA_VERTICAL_NAMESPACE] as
      | Record<string, Record<string, unknown>>
      | undefined) ?? {};

  /* Per-vertical merge so a partial AI/SaaS save doesn't clobber a
     prior HealthTech entry (parity with supplementary's per-round
     merge). */
  const merged: Record<string, Record<string, unknown>> = { ...existing };
  for (const [verticalId, bag] of Object.entries(incoming)) {
    merged[verticalId] = { ...(existing[verticalId] ?? {}), ...bag };
  }

  if (Object.keys(merged).length > 0) {
    next[QUANTARA_VERTICAL_NAMESPACE] = merged;
  }
  return next;
}
