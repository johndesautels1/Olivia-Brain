/**
 * Quantara Q4 — discrepancy-detection type contracts.
 *
 * When the founder's typed value disagrees with an API-derived
 * reference (from Q3 auto-fill), the cascade surfaces a coral chip on
 * the field. Q4 wraps `runTruthScore` (V5 — `src/lib/agents/valuation/
 * truth-score-agent.ts`, byte-for-byte LTM port) for the 19 Quantara
 * fields whose engine subkey overlaps with the agent's COMPARABLE_FIELDS.
 *
 * # Direction
 *
 * `optimistic` — founder's value is rosier than the API says (higher
 * revenue / lower burn / longer runway / lower churn / etc.).
 * `pessimistic` — founder's value is harsher than the API says.
 * `match` — within the 5% match threshold; not surfaced.
 *
 * # Reuses, not redefines
 *
 * The 5% threshold and per-field directionality come from the V5
 * agent. Q4 does not re-implement those — it imports and calls.
 */
import type { QuantaraFieldId } from "@/lib/quantara";
import type { TruthScoreGap } from "@/lib/valuation/types";

import type { QuantaraSuggestionSourceId } from "../auto-fill";

/** Per-field discrepancy result. */
export interface QuantaraDiscrepancyGap {
  /** Quantara field id (`f1`..`f56`). */
  readonly fieldId: QuantaraFieldId;
  /** Founder-typed value. */
  readonly manualValue: number;
  /** API-derived reference value. */
  readonly referenceValue: number;
  /** Magnitude of disagreement (0–100, capped at 100). */
  readonly gapPct: number;
  /** `optimistic` (founder rosier), `pessimistic` (founder harsher). */
  readonly direction: Exclude<TruthScoreGap["direction"], "match">;
  /** Source integration (`stripe`, `quickbooks`, etc.) for chip label. */
  readonly source: QuantaraSuggestionSourceId;
  /** Human-readable source label ("Stripe-derived"). */
  readonly sourceLabel: string;
}

export interface QuantaraDiscrepancyResult {
  /** Per-field gaps keyed by `QuantaraFieldId`. Only includes
   *  fields where direction !== "match" — match-fields are not
   *  surfaced. */
  readonly gaps: ReadonlyMap<QuantaraFieldId, QuantaraDiscrepancyGap>;
  /** 0-100 truth score from the V5 agent (private — never share with
   *  investors per the agent's docstring). */
  readonly truthScore: number;
  /** Number of fields the agent compared. */
  readonly totalFields: number;
  /** Number of fields that came in within the 5% match threshold. */
  readonly verifiedFields: number;
}
