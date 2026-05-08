/**
 * Track P — Deal Protection smart-score module.
 *
 * Pure functions that map a 0-100 smart score to its corresponding
 * band record. Used by:
 *   - The cascade-driven analyzer in P3 (`/api/deal-protection/analyze`),
 *     to compute the band before persisting a `DealAnalysis`.
 *   - The DealAnalysis renderer (TBD), to surface the band's language
 *     + recommended action without re-running the cascade.
 *   - The InvestorReputation aggregation (P4), to map historical
 *     reputation scores to bands consistently with deal-level scoring.
 *
 * Reuses LTM's V3 confidence math (`src/lib/valuation/helpers.ts`) for
 * the confidence component on a `DealAnalysis` record — captured here as
 * a re-export so consumers don't need to reach into the valuation
 * package. The actual 0-100 smart score is computed in P3 by the cascade
 * (clause toxicity + investor reputation + structural fit); P1 only ships
 * the band ladder + lookup helpers.
 */
import {
  SMART_BANDS,
  SMART_BANDS_BY_ACTION,
  SMART_BANDS_BY_ID,
} from './bands';
import {
  type RecommendedAction,
  type SmartBand,
  type SmartBandRecord,
} from './types';

/**
 * Clamp a numeric score to the closed interval [0, 100]. Non-finite
 * inputs (NaN, ±Infinity) collapse to 0 — the "predatory" floor — so a
 * downstream cascade glitch can never silently inflate a deal score.
 */
export function clampSmartScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  if (score < 0) return 0;
  if (score > 100) return 100;
  return score;
}

/**
 * Map a 0-100 smart score to its band id. Boundary scores (20, 40, 60,
 * 80) belong to the higher band — see `bands.ts` for the convention
 * rationale.
 */
export function getSmartBand(score: number): SmartBand {
  const clamped = clampSmartScore(score);
  /* Each band's range is treated as `[minScore, nextMinScore)` so
     fractional scores between integer endpoints (e.g. 79.999) map to
     the correct band — `maxScore` itself is the inclusive upper bound
     for documentation, but band membership is decided by the next
     band's lower edge. The final band absorbs the closed `100` upper.
     Linear scan over 5 records; performance is irrelevant. */
  for (let i = 0; i < SMART_BANDS.length; i++) {
    const b = SMART_BANDS[i];
    const nextMin =
      i + 1 < SMART_BANDS.length ? SMART_BANDS[i + 1].minScore : Infinity;
    if (clamped >= b.minScore && clamped < nextMin) return b.band;
  }
  /* Defensive — `bands.ts` runtime invariants prevent gaps; this branch
     is unreachable on a clean build but guards against future drift. */
  return 'red';
}

/**
 * Look up the full record (language + action + color token) for a
 * given score. Convenience wrapper around `getSmartBand` + the
 * `SMART_BANDS_BY_ID` map so consumers don't need both calls.
 */
export function getSmartBandRecord(score: number): SmartBandRecord {
  return SMART_BANDS_BY_ID[getSmartBand(score)];
}

/**
 * Map a band id back to its record. Useful for the InvestorReputation
 * UI that already stores the band string.
 */
export function getSmartBandRecordById(band: SmartBand): SmartBandRecord {
  return SMART_BANDS_BY_ID[band];
}

/**
 * Map a recommended-action enum to its record. Used by P5's email-
 * draft generator to pick the right tone per band.
 */
export function getSmartBandRecordByAction(
  action: RecommendedAction,
): SmartBandRecord {
  return SMART_BANDS_BY_ACTION[action];
}

/**
 * Decide whether two scores fall in the same band. Used by P5 to
 * detect whether a re-run with revised terms crossed a band boundary
 * (which would change the recommended action).
 */
export function bandsAgree(a: number, b: number): boolean {
  return getSmartBand(a) === getSmartBand(b);
}
