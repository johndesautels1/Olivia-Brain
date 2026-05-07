/**
 * Quantara metamorphic — per-field relevance under a target round type.
 *
 * Each canonical field carries `investorClassRelevance: ReadonlyArray<BuyerType>`
 * (see `../schema.ts`). For a given round type, a field is:
 *
 *   - **`primary`** — its relevance list intersects the round's buyer
 *     classes. The field is fully prominent in the UI.
 *   - **`secondary`** — its relevance list does NOT intersect the round's
 *     buyer classes. The field still renders (founders may still want to
 *     fill it for completeness), but the supplementary block / form chrome
 *     can de-emphasise it visually in a future polish session.
 *
 * When `roundType` is `undefined`, every field is `primary`.
 *
 * Pure functions; no React, no DOM. Tested in `__tests__/`.
 */
import { QUANTARA_FIELDS_BY_ID } from '../schema';
import type { QuantaraFieldId, TargetRoundType } from '../types';
import {
  buyerClassesIntersect,
  getInvestorClassesForRound,
} from './round-buyer-mapping';

/** Discrete relevance tier for a single field under a round type. */
export type FieldRelevanceTier = 'primary' | 'secondary';

/**
 * Compute the relevance tier for a single canonical field under a given
 * round type. Returns `primary` when `roundType` is undefined.
 */
export function getFieldRelevanceTier(
  fieldId: QuantaraFieldId,
  roundType: TargetRoundType | undefined,
): FieldRelevanceTier {
  if (!roundType) return 'primary';
  const def = QUANTARA_FIELDS_BY_ID[fieldId];
  /* Defensive — every legitimate id is in the lookup; unknown ids are
     treated as primary so consumers degrade gracefully if a stale id
     leaks through (e.g. an in-flight schema migration on the client). */
  if (!def) return 'primary';
  const buyers = getInvestorClassesForRound(roundType);
  return buyerClassesIntersect(def.investorClassRelevance, buyers)
    ? 'primary'
    : 'secondary';
}

/**
 * Compute relevance tiers for every canonical field at once. Useful in
 * `IntakeForm` to memo a single map per round-type change rather than
 * calling the per-field helper inside a render loop.
 */
export function getAllFieldRelevanceTiers(
  roundType: TargetRoundType | undefined,
): Readonly<Record<QuantaraFieldId, FieldRelevanceTier>> {
  const out = {} as Record<QuantaraFieldId, FieldRelevanceTier>;
  for (const id of Object.keys(QUANTARA_FIELDS_BY_ID) as QuantaraFieldId[]) {
    out[id] = getFieldRelevanceTier(id, roundType);
  }
  return Object.freeze(out);
}
