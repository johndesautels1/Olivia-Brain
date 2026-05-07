/**
 * Quantara metamorphic — section ordering by target round type.
 *
 * # The reorder rule
 *
 * For each target round type, sections are split into:
 *   - **primary** — sections whose fields predominantly appeal to the
 *     round's buyer classes (per `round-buyer-mapping.ts`). These surface
 *     first.
 *   - **secondary** — everything else. These render in canonical display
 *     order after the primaries.
 *
 * Within each tier, ties are broken by canonical `displayOrder` so the
 * baseline experience (no round selected, or after the primary tier)
 * stays predictable.
 *
 * # Why a stable algorithm vs a per-round override list
 *
 * A per-round override map would lock the order until someone manually
 * updates it whenever the canonical schema changes. The current
 * algorithm derives ordering from `investorClassRelevance` metadata
 * already on every field — adding a new field automatically participates
 * in the right tier without a code change here.
 *
 * # Determinism
 *
 * Pure function. Same inputs → same outputs. No reliance on
 * `Object.entries` iteration order beyond ECMAScript-spec guarantees
 * for string keys. Suitable for snapshot tests.
 */
import { QUANTARA_FIELDS } from '../schema';
import { QUANTARA_SECTIONS } from '../sections';
import type { QuantaraSectionId, TargetRoundType } from '../types';
import {
  buyerClassesIntersect,
  getInvestorClassesForRound,
} from './round-buyer-mapping';

/**
 * Threshold — a section is "primary" for a round when at least this
 * fraction of its fields have `investorClassRelevance` intersecting the
 * round's buyer classes. 0.5 means majority-relevance.
 */
const PRIMARY_RELEVANCE_THRESHOLD = 0.5;

/**
 * Cached canonical order — used as the fallback for an unset round type
 * and as the tiebreaker within tiers.
 */
const CANONICAL_ORDER: ReadonlyArray<QuantaraSectionId> = Object.freeze(
  QUANTARA_SECTIONS.map((s) => s.id),
);

/**
 * Compute the relevance score (0..1) for a section under a given round.
 * 1.0 means every field in the section has `investorClassRelevance`
 * intersecting the round's buyer classes; 0.0 means none.
 *
 * Sections with universally-relevant fields (e.g. ARR — `ALL_BUYERS`)
 * will always score 1.0; sections gated to a single class (e.g. patent
 * counts — `LATE_AND_CONTROL`) will score 0.0 for early-stage rounds.
 */
export function sectionRelevanceScore(
  sectionId: QuantaraSectionId,
  roundType: TargetRoundType,
): number {
  const sectionFields = QUANTARA_FIELDS.filter((f) => f.section === sectionId);
  if (sectionFields.length === 0) return 0;
  const buyers = getInvestorClassesForRound(roundType);
  const intersecting = sectionFields.filter((f) =>
    buyerClassesIntersect(f.investorClassRelevance, buyers),
  );
  return intersecting.length / sectionFields.length;
}

/**
 * Return the sections in render order for a given round type. When
 * `roundType` is `undefined`, returns the canonical order.
 *
 * Order is stable: primary sections (relevance ≥ threshold) come first,
 * sorted by descending relevance with canonical-order tiebreak; then
 * secondary sections in canonical order. Result includes every section
 * exactly once.
 */
export function getSectionOrderForRound(
  roundType: TargetRoundType | undefined,
): ReadonlyArray<QuantaraSectionId> {
  if (!roundType) return CANONICAL_ORDER;

  const scored = QUANTARA_SECTIONS.map((s) => ({
    id: s.id,
    canonicalOrder: s.displayOrder,
    score: sectionRelevanceScore(s.id, roundType),
  }));

  const primary = scored
    .filter((s) => s.score >= PRIMARY_RELEVANCE_THRESHOLD)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.canonicalOrder - b.canonicalOrder;
    });

  const secondary = scored
    .filter((s) => s.score < PRIMARY_RELEVANCE_THRESHOLD)
    .sort((a, b) => a.canonicalOrder - b.canonicalOrder);

  return Object.freeze([...primary, ...secondary].map((s) => s.id));
}

/**
 * Return whether a section is "primary" (above relevance threshold) for
 * the given round. Useful for UI badges that want to label the primary
 * sections without recomputing the full order.
 */
export function isSectionPrimaryForRound(
  sectionId: QuantaraSectionId,
  roundType: TargetRoundType | undefined,
): boolean {
  if (!roundType) return false;
  return sectionRelevanceScore(sectionId, roundType) >= PRIMARY_RELEVANCE_THRESHOLD;
}
