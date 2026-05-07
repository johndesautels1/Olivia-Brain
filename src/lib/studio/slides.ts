/**
 * Slide-set generation for the Library Apply flow.
 *
 * Reference: `docs/STUDIO_OLIVIA_DESIGN.md` § 4 (Apply-archetype regenerates
 * slides) + § 8 #5 ("Apply-archetype = regenerate slides").
 *
 * When the user clicks "Apply This Archetype" in `DeckDetailModal`, the
 * prototype generates a fresh slide list of length
 * `slideCount || sections || 5` from a fixed type sequence, seeding
 * each slide's `fw` array with the archetype's name. This is **local
 * generation, not an LLM call** — purely deterministic.
 *
 * Per `BUILD_SEQUENCE.md` Track C row 11 anticipated gotchas: S16 lands
 * the minimal slide-state model. S17 fills in the per-section editor +
 * field types + freeform/guided modes.
 */

import type { Slide, SlideType, ScoredArchetype, ScoredTemplate } from "./types";

/** Default 10-slide sequence — covers the Sequoia / YC / Kawasaki canon. */
const DEFAULT_SLIDE_SEQUENCE: readonly SlideType[] = [
  "COVER",
  "HOOK",
  "PROBLEM",
  "SOLUTION",
  "MARKET",
  "PRODUCT",
  "TRACTION",
  "MOAT",
  "TEAM",
  "ASK",
];

/** Extension types for archetypes that exceed 10 slides. */
const EXTENSION_SEQUENCE: readonly SlideType[] = [
  "WHY_NOW",
  "ROADMAP",
  "COMPETITION",
  "ECOSYSTEM",
  "DEMO",
  "REGULATORY",
];

/**
 * Build a slide-type sequence of exactly `n` types.
 *
 * - n ≤ 10: slice the default sequence.
 * - n > 10: default 10 + extension types until full; remaining are `DETAIL`.
 */
export function buildSlideSequence(n: number): SlideType[] {
  if (n <= DEFAULT_SLIDE_SEQUENCE.length) {
    return DEFAULT_SLIDE_SEQUENCE.slice(0, Math.max(1, n));
  }
  const extras = n - DEFAULT_SLIDE_SEQUENCE.length;
  const extension =
    extras <= EXTENSION_SEQUENCE.length
      ? EXTENSION_SEQUENCE.slice(0, extras)
      : [
          ...EXTENSION_SEQUENCE,
          ...Array.from<SlideType>({
            length: extras - EXTENSION_SEQUENCE.length,
          }).fill("DETAIL"),
        ];
  return [...DEFAULT_SLIDE_SEQUENCE, ...extension];
}

/**
 * Generate a fresh `Slide[]` from an applied archetype (deck or template).
 * Slide ids are seeded above 1000 to mirror the prototype's `slideIdCounter`
 * starting point (avoids collisions with pre-existing slides if any
 * caller chooses to merge instead of replace).
 */
export function generateSlidesForArchetype(
  archetype: ScoredArchetype | ScoredTemplate,
  startId = 1000,
): Slide[] {
  const isTemplate = "sections" in archetype;
  const requestedCount = isTemplate
    ? archetype.sections
    : archetype.slideCount;
  const n = Math.max(1, requestedCount ?? 5);

  const sequence = buildSlideSequence(n);
  return sequence.map((type, i) => ({
    id: startId + i,
    type,
    fw: [archetype.name],
  }));
}
