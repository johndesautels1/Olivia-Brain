/**
 * Track P — Deal Protection band metadata.
 *
 * The 5-band ladder + per-band copy. Score ranges are inclusive on both
 * ends; total coverage is 0-100 with no gaps and no overlaps. Boundary
 * scores (20, 40, 60, 80) belong to the higher band — the convention
 * that "20" is the start of orange (not the end of red), etc.
 *
 * # Why these specific copy choices
 *
 * - **`language`** is a one-sentence summary the UI can drop into a
 *   coral/amber/mint card without further synthesis. It does NOT
 *   reference any specific clause ("the liquidation preference is bad")
 *   — that lives in the per-clause analysis (P2). Band-level copy is
 *   deliberately overall-deal-shaped.
 *
 * - **`investorSignal`** is a 1-3-word tag the founder shares in
 *   conversation with their lawyer / co-founder ("Olivia flagged this
 *   as Predatory"). Stable vocabulary — investors recognise the
 *   shorthand.
 *
 * - **`actionLabel`** is the imperative on the primary UI button.
 *   Decisive verbs only.
 */
import {
  type RecommendedAction,
  type SmartBand,
  type SmartBandRecord,
  SMART_BANDS_ORDERED,
} from './types';

/**
 * Canonical band ladder — score ranges + per-band copy. Frozen at
 * module load. Consumers must not mutate.
 */
export const SMART_BANDS: ReadonlyArray<SmartBandRecord> = Object.freeze([
  {
    band: 'red',
    minScore: 0,
    maxScore: 19,
    action: 'walk_away',
    actionLabel: 'Walk away',
    language:
      'This term sheet contains predatory or toxic terms that materially harm founder economics. Walk away unless an investor relationship outweighs the cost.',
    investorSignal: 'Predatory',
    colorToken: '--coral-down',
  },
  {
    band: 'orange',
    minScore: 20,
    maxScore: 39,
    action: 'major_concerns',
    actionLabel: 'Major concerns',
    language:
      'This term sheet has aggressive structure that significantly tilts economics or control toward the investor. Major concerns; counter aggressively or pass.',
    investorSignal: 'Aggressive',
    colorToken: '--amber-warn',
  },
  {
    band: 'yellow',
    minScore: 40,
    maxScore: 59,
    action: 'negotiate_hard',
    actionLabel: 'Negotiate hard',
    language:
      'This term sheet has several friction points that founder counsel should rework. Mixed terms; negotiate hard on the items flagged below.',
    investorSignal: 'Mixed',
    colorToken: '--sky-info',
  },
  {
    band: 'blue',
    minScore: 60,
    maxScore: 79,
    action: 'counter_minor',
    actionLabel: 'Counter on the highlighted items',
    language:
      'This term sheet is mostly within market norms. One or two items deserve a polite counter; the rest are acceptable.',
    investorSignal: 'Standard',
    colorToken: '--aether-primary',
  },
  {
    band: 'green',
    minScore: 80,
    maxScore: 100,
    action: 'sign',
    actionLabel: 'Sign with confidence',
    language:
      'This term sheet is founder-friendly throughout. Sign with confidence after standard counsel review.',
    investorSignal: 'Founder-friendly',
    colorToken: '--mint-up',
  },
]);

// ── Defensive runtime invariants ───────────────────────────────────────

if (SMART_BANDS.length !== SMART_BANDS_ORDERED.length) {
  throw new Error(
    `SMART_BANDS length (${SMART_BANDS.length}) must equal SMART_BANDS_ORDERED length (${SMART_BANDS_ORDERED.length}).`,
  );
}

/* Verify every band id is unique + matches SMART_BANDS_ORDERED. */
const bandIds = SMART_BANDS.map((b) => b.band);
if (new Set(bandIds).size !== bandIds.length) {
  throw new Error('SMART_BANDS band ids must be unique.');
}
for (let i = 0; i < SMART_BANDS_ORDERED.length; i++) {
  if (SMART_BANDS[i].band !== SMART_BANDS_ORDERED[i]) {
    throw new Error(
      `SMART_BANDS[${i}].band (${SMART_BANDS[i].band}) does not match SMART_BANDS_ORDERED[${i}] (${SMART_BANDS_ORDERED[i]}).`,
    );
  }
}

/* Verify ranges cover 0..100 contiguously. */
let cursor = 0;
for (const b of SMART_BANDS) {
  if (b.minScore !== cursor) {
    throw new Error(
      `SMART_BANDS coverage drift at band '${b.band}': expected minScore=${cursor}, got ${b.minScore}.`,
    );
  }
  if (b.maxScore < b.minScore) {
    throw new Error(
      `SMART_BANDS band '${b.band}' has maxScore (${b.maxScore}) < minScore (${b.minScore}).`,
    );
  }
  cursor = b.maxScore + 1;
}
if (cursor !== 101) {
  throw new Error(
    `SMART_BANDS coverage drift: expected to end at 101 (covering 0..100), reached ${cursor}.`,
  );
}

// ── Lookup tables ──────────────────────────────────────────────────────

/** Band-id → record map. */
export const SMART_BANDS_BY_ID: Readonly<Record<SmartBand, SmartBandRecord>> =
  Object.freeze(
    Object.fromEntries(SMART_BANDS.map((b) => [b.band, b] as const)) as Record<
      SmartBand,
      SmartBandRecord
    >,
  );

/** Action enum → record map. */
export const SMART_BANDS_BY_ACTION: Readonly<
  Record<RecommendedAction, SmartBandRecord>
> = Object.freeze(
  Object.fromEntries(
    SMART_BANDS.map((b) => [b.action, b] as const),
  ) as Record<RecommendedAction, SmartBandRecord>,
);
