/**
 * Quantara metamorphic — Target Round Type → Buyer Class mapping.
 *
 * The canonical schema (`../schema.ts`) tags every field with
 * `investorClassRelevance: ReadonlyArray<BuyerType>`. Q5 uses this map to
 * decide which buyer classes a given target round type appeals to, then
 * intersects that with each field's relevance list to drive section
 * reordering and (in a future polish session) field de-emphasis.
 *
 * # Mapping rationale
 *
 * Drawn from London / US venture-stage conventions:
 *   - **Seed**: angel + early VC capital (high tolerance for narrative).
 *   - **Series A**: VC dominant (metric-driven discipline begins).
 *   - **Series B**: VC + crossover PE participation possible.
 *   - **Series C**: VC + PE common, sometimes strategic.
 *   - **Growth**: PE-led with strategic minority participation.
 *   - **Strategic**: strategic / acquirer-led; VCs typically exit.
 *
 * Stable enough that founder direction at 2026-05-07 ("don't pull in LTM
 * Organization data speculatively") permits this hard-coded map. When
 * Track L or Track J introduces a real consumer of LTM ecosystem data,
 * this map can be replaced by per-investor profiles without breaking
 * the public API of `getInvestorClassesForRound`.
 */
import type { BuyerType, TargetRoundType } from '../types';

/**
 * Static round → buyer-class map. Keys are every member of
 * `TargetRoundType`; values are the dominant buyer classes for that round.
 *
 * Frozen at module load — consumers must not mutate.
 */
const ROUND_TO_BUYERS: Readonly<Record<TargetRoundType, ReadonlyArray<BuyerType>>> =
  Object.freeze({
    Seed: ['angel', 'vc'] as const,
    'Series A': ['vc'] as const,
    'Series B': ['vc', 'private_equity'] as const,
    'Series C': ['vc', 'private_equity'] as const,
    Growth: ['private_equity', 'strategic_partner'] as const,
    Strategic: ['strategic_partner', 'acquirer'] as const,
  });

/**
 * Return the buyer classes most relevant for a given target round type.
 * Pure function; safe to call in any context (server, client, test).
 */
export function getInvestorClassesForRound(
  roundType: TargetRoundType,
): ReadonlyArray<BuyerType> {
  return ROUND_TO_BUYERS[roundType];
}

/**
 * Deterministic check — does any buyer class for this round overlap
 * with the field's declared relevance? Used by Q5 section ordering to
 * decide which sections surface first; "primary" sections are those
 * whose fields predominantly appeal to the round's buyer classes.
 */
export function buyerClassesIntersect(
  fieldRelevance: ReadonlyArray<BuyerType>,
  roundBuyers: ReadonlyArray<BuyerType>,
): boolean {
  for (const b of fieldRelevance) {
    if (roundBuyers.includes(b)) return true;
  }
  return false;
}
