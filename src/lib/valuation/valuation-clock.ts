// ═══════════════════════════════════════════════════════════════════════
// VALUATION CLOCK — Confidence Decay Engine
// Confidence starts at 100% on valuation date and linearly decays:
//   → 70% at 90 days (amber)
//   → 40% at 180 days (red/pulsing)
// Sector-calibrated: AI/DeepTech decays 1.5x faster than baseline.
// Resets on verified events: new valuation run, funding round, document upload.
// ═══════════════════════════════════════════════════════════════════════

export interface ClockInput {
  /** Confidence score from the last valuation run (0-1 scale) */
  baseConfidence: number;
  /** ISO date string of when the valuation run completed */
  completedAt: string | null;
  /** Company sector for decay rate calibration */
  sector?: string;
  /** Most recent verified event date (funding round, doc upload, manual refresh) */
  lastVerifiedEventAt?: string | null;
}

export interface ClockOutput {
  /** Adjusted confidence percentage (0-100) */
  displayPct: number;
  /** Days since the effective anchor date */
  daysSinceAnchor: number;
  /** Decay multiplier applied (0-1) */
  decayMultiplier: number;
  /** Visual state for the UI */
  state: 'fresh' | 'amber' | 'red';
  /** Whether the clock should pulse (>180 effective days) */
  pulsing: boolean;
  /** Human-readable staleness label */
  label: string;
}

// Sectors that decay 1.5x faster due to rapid market shifts
const FAST_DECAY_SECTORS = new Set([
  'ai', 'artificial intelligence', 'deeptech', 'deep tech',
  'crypto', 'blockchain', 'web3',
  'quantum', 'quantum computing',
]);

/**
 * Returns the sector decay multiplier.
 * AI/DeepTech: 1.5 (decays faster)
 * Everything else: 1.0
 */
export function sectorDecayRate(sector?: string): number {
  if (!sector) return 1.0;
  const normalized = sector.toLowerCase().trim();
  for (const fast of FAST_DECAY_SECTORS) {
    if (normalized.includes(fast)) return 1.5;
  }
  return 1.0;
}

/**
 * Linear decay function.
 *
 * The spec defines two anchor points:
 *   - Day 0:   decay = 1.0  (100%)
 *   - Day 90:  decay = 0.7  (70%)
 *   - Day 180: decay = 0.4  (40%)
 *
 * This is a single linear function: decay = 1.0 - (days / 300)
 * Clamped to [0, 1].
 *
 * With sector multiplier, effective days = days * sectorRate.
 */
export function linearDecay(days: number, sectorRate: number = 1.0): number {
  const effectiveDays = days * sectorRate;
  const decay = 1.0 - effectiveDays / 300;
  return Math.max(0, Math.min(1, decay));
}

/**
 * Computes the full valuation clock state.
 */
export function computeValuationClock(input: ClockInput): ClockOutput {
  if (!input.completedAt) {
    return {
      displayPct: 0,
      daysSinceAnchor: Infinity,
      decayMultiplier: 0,
      state: 'red',
      pulsing: true,
      label: 'No valuation run',
    };
  }

  const completedDate = new Date(input.completedAt).getTime();

  // Anchor date is the LATEST of: completedAt, lastVerifiedEventAt
  let anchorMs = completedDate;
  if (input.lastVerifiedEventAt) {
    const eventMs = new Date(input.lastVerifiedEventAt).getTime();
    if (eventMs > anchorMs) {
      anchorMs = eventMs;
    }
  }

  const nowMs = Date.now();
  const daysSinceAnchor = Math.max(0, Math.floor((nowMs - anchorMs) / (1000 * 60 * 60 * 24)));

  const sectorRate = sectorDecayRate(input.sector);
  const effectiveDays = daysSinceAnchor * sectorRate;
  const decayMultiplier = linearDecay(daysSinceAnchor, sectorRate);

  const baseConfidence = Math.max(0, Math.min(1, input.baseConfidence));
  const displayPct = Math.round(baseConfidence * decayMultiplier * 100);

  // State thresholds use effective days (sector-adjusted)
  const state: ClockOutput['state'] =
    effectiveDays > 180 ? 'red' : effectiveDays > 90 ? 'amber' : 'fresh';
  const pulsing = effectiveDays > 180;

  const label =
    daysSinceAnchor === 0
      ? 'Just updated'
      : daysSinceAnchor === 1
        ? '1 day ago'
        : `${daysSinceAnchor} days ago`;

  return {
    displayPct,
    daysSinceAnchor,
    decayMultiplier,
    state,
    pulsing,
    label,
  };
}
