/**
 * Quantara metamorphic — supplementary projection helpers.
 *
 * Supplementary values land inside `ValuationSubject.quantaraJson` under
 * a `supplementary` namespace, keyed by round type, then by the field's
 * `subkey` (NOT its id — the subkey survives id renames downstream and
 * matches the convention `quantaraJson` uses for canonical fields).
 *
 * Storage shape:
 *
 *   ```ts
 *   quantaraJson: {
 *     ...canonical-field-subkeys,
 *     supplementary: {
 *       Seed: { leadInvestorStatus: "soft_commits", ... },
 *       "Series A": { leadInvestorIdentified: "exploring", ... },
 *       ...
 *     }
 *   }
 *   ```
 *
 * Switching round types in the form does NOT delete prior round entries
 * here. A founder who exploratorily fills Seed-specific fields then
 * switches to Series A keeps their Seed entries on disk, surfaced again
 * if they switch back.
 */
import {
  QUANTARA_SUPPLEMENTARY_BY_ID,
  getSupplementaryFieldsForRound,
} from './supplementary';
import type {
  SupplementaryFieldId,
  SupplementaryValues,
  SupplementaryValuesForRound,
} from './types';
import type { TargetRoundType } from '../types';

/**
 * Subkey under `quantaraJson` where supplementary values live. Stable —
 * never rename.
 */
export const QUANTARA_SUPPLEMENTARY_NAMESPACE = 'supplementary' as const;

/**
 * Project a supplementary values map into the `quantaraJson.supplementary`
 * shape. Field-id keys (`s1` etc.) become subkey keys (`leadInvestorStatus`
 * etc.) so downstream consumers don't depend on private id stability.
 *
 * Undefined / null values are skipped (no over-projection). Empty rounds
 * are pruned so partially-filled saves don't write empty round buckets.
 */
export function supplementaryToJson(
  values: SupplementaryValues,
): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const [roundType, perRound] of Object.entries(values) as Array<
    [TargetRoundType, SupplementaryValuesForRound | undefined]
  >) {
    if (!perRound) continue;
    const bag: Record<string, unknown> = {};
    for (const [fieldId, value] of Object.entries(perRound) as Array<
      [SupplementaryFieldId, unknown]
    >) {
      if (value === undefined || value === null) continue;
      const def = QUANTARA_SUPPLEMENTARY_BY_ID[fieldId];
      if (!def) continue;
      bag[def.subkey] = value;
    }
    if (Object.keys(bag).length > 0) {
      out[roundType] = bag;
    }
  }
  return out;
}

/**
 * Inverse projection — read a `quantaraJson.supplementary` shape and
 * reconstruct the field-id-keyed `SupplementaryValues` payload for
 * re-rendering the form. Tolerates unknown subkeys (skipped silently —
 * lets older saves co-exist with schema additions).
 */
export function supplementaryFromJson(
  bag: unknown,
): SupplementaryValues {
  const out: SupplementaryValues = {};
  if (!bag || typeof bag !== 'object') return out;
  const root = bag as Record<string, unknown>;

  for (const roundType of [
    'Seed',
    'Series A',
    'Series B',
    'Series C',
    'Growth',
    'Strategic',
  ] as const) {
    const roundBag = root[roundType];
    if (!roundBag || typeof roundBag !== 'object') continue;

    /* Build a subkey → fieldId index for this round once. */
    const fields = getSupplementaryFieldsForRound(roundType);
    const subkeyToId = new Map<string, SupplementaryFieldId>();
    for (const f of fields) subkeyToId.set(f.subkey, f.id);

    const perRound: SupplementaryValuesForRound = {};
    for (const [subkey, value] of Object.entries(
      roundBag as Record<string, unknown>,
    )) {
      const fieldId = subkeyToId.get(subkey);
      if (!fieldId) continue;
      if (value === undefined || value === null) continue;
      perRound[fieldId] = value;
    }
    if (Object.keys(perRound).length > 0) {
      out[roundType] = perRound;
    }
  }
  return out;
}

/**
 * Read the supplementary namespace out of a quantaraJson bag, returning
 * the typed `SupplementaryValues` shape. Convenience wrapper around
 * `supplementaryFromJson`.
 */
export function readSupplementaryFromQuantaraJson(
  quantaraJson: Record<string, unknown> | null | undefined,
): SupplementaryValues {
  if (!quantaraJson) return {};
  return supplementaryFromJson(quantaraJson[QUANTARA_SUPPLEMENTARY_NAMESPACE]);
}

/**
 * Merge a supplementary projection into an existing quantaraJson bag
 * without disturbing canonical-field subkeys or unrelated rounds. Used
 * server-side in `mergeQuantaraIntoSubject`'s extension path so partial
 * supplementary saves don't clobber unrelated round data.
 */
export function mergeSupplementaryIntoQuantaraJson(
  current: Record<string, unknown> | null | undefined,
  values: SupplementaryValues,
): Record<string, unknown> {
  const next = current ? { ...current } : {};
  const incoming = supplementaryToJson(values);
  const existing =
    (next[QUANTARA_SUPPLEMENTARY_NAMESPACE] as
      | Record<string, Record<string, unknown>>
      | undefined) ?? {};

  /* Merge per-round so a partial Seed save doesn't clobber a prior
     Series A entry. */
  const merged: Record<string, Record<string, unknown>> = { ...existing };
  for (const [roundType, bag] of Object.entries(incoming)) {
    merged[roundType] = { ...(existing[roundType] ?? {}), ...bag };
  }

  if (Object.keys(merged).length > 0) {
    next[QUANTARA_SUPPLEMENTARY_NAMESPACE] = merged;
  }
  return next;
}
