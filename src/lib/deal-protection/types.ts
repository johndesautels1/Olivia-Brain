/**
 * Track P — Deal Protection type contracts.
 *
 * # Smart band ladder (P1)
 *
 * The Deal Protection cascade returns a 0-100 smart score. Score buckets
 * map to one of five colour-coded bands; each band carries a stable
 * recommended-action label, a plain-language template, and a short
 * "investor signal" tag that downstream UI can use to render coral /
 * amber / mint chrome consistently.
 *
 * | Band   | Score range | Action                            |
 * |--------|-------------|-----------------------------------|
 * | red    | 0-19        | walk away / require major rewrite |
 * | orange | 20-39       | major concerns; counter or pass    |
 * | yellow | 40-59       | negotiate hard on multiple terms   |
 * | blue   | 60-79       | mostly fair; counter on 1-2 items |
 * | green  | 80-100      | sign with confidence              |
 *
 * Band IDs are stable for the lifetime of the platform — downstream
 * consumers (Pitch Deck, WarRoom, email-draft generator in P5) bind to
 * these names. Renaming is forbidden.
 */

/** Discrete smart-band id. Stable; do not rename. */
export type SmartBand = 'red' | 'orange' | 'yellow' | 'blue' | 'green';

/** Stable list of all bands in score-ascending order. */
export const SMART_BANDS_ORDERED: ReadonlyArray<SmartBand> = Object.freeze([
  'red',
  'orange',
  'yellow',
  'blue',
  'green',
]);

/**
 * Recommended-action label per band. Plain enum so the UI can render
 * decisive copy ("Walk away") rather than a paraphrased synthesis.
 */
export type RecommendedAction =
  | 'walk_away'
  | 'major_concerns'
  | 'negotiate_hard'
  | 'counter_minor'
  | 'sign';

/**
 * Per-band metadata bundle. Surfaced to the UI directly — the
 * cascade may override `language` / `investorSignal` per analysis,
 * but `band` / `action` / `colorToken` are deterministic from the score.
 */
export interface SmartBandRecord {
  /** Stable band id. */
  readonly band: SmartBand;
  /** Inclusive lower bound of the band's score range. */
  readonly minScore: number;
  /** Inclusive upper bound of the band's score range. */
  readonly maxScore: number;
  /** Recommended action enum. */
  readonly action: RecommendedAction;
  /** Display action — short uppercase label for the UI button. */
  readonly actionLabel: string;
  /** Plain-language summary template ("This term sheet shows…"). */
  readonly language: string;
  /** Short investor signal tag ("Predatory" / "Aggressive" / "Standard"). */
  readonly investorSignal: string;
  /** Design-system token for the band's accent color (per § 1.4 of UI design system). */
  readonly colorToken:
    | '--coral-down'
    | '--amber-warn'
    | '--sky-info'
    | '--aether-primary'
    | '--mint-up';
}
