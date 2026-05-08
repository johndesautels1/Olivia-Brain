/**
 * Track P Session P2 — clause classifier type contracts.
 *
 * # The 20-clause taxonomy
 *
 * Standard term-sheet clauses fall into one of these 20 types. The list
 * is closed — anything that doesn't fit into one of the 19 named
 * categories lands in `other`. Renaming any value is forbidden;
 * downstream consumers (P3 deal-analyse API, P4 reputation patterns,
 * P5 email-draft generator, P6 WarRoom counter-draft) bind to these
 * stable strings.
 */

/** Discrete clause type. Stable for the lifetime of the platform. */
export type ClauseType =
  | 'liquidation_preference'
  | 'anti_dilution'
  | 'board_control'
  | 'vesting'
  | 'leaver_provisions'
  | 'veto_rights'
  | 'exclusivity'
  | 'information_rights'
  | 'legal_fees'
  | 'indemnification'
  | 'ip_assignment'
  | 'non_compete'
  | 'drag_along'
  | 'tag_along'
  | 'earnout'
  | 'reps_warranties'
  | 'key_person'
  | 'governing_law'
  | 'assignment'
  | 'other';

/** Stable list of all 20 clause types in display order. */
export const CLAUSE_TYPES_ORDERED: ReadonlyArray<ClauseType> = Object.freeze([
  'liquidation_preference',
  'anti_dilution',
  'board_control',
  'vesting',
  'leaver_provisions',
  'veto_rights',
  'exclusivity',
  'information_rights',
  'legal_fees',
  'indemnification',
  'ip_assignment',
  'non_compete',
  'drag_along',
  'tag_along',
  'earnout',
  'reps_warranties',
  'key_person',
  'governing_law',
  'assignment',
  'other',
]);

export const CLAUSE_TYPE_COUNT = 20 as const;

/**
 * Severity ladder. Maps monotonically to a toxicity score range:
 *   low      → 0-25
 *   medium   → 26-50
 *   high     → 51-75
 *   critical → 76-100
 */
export type Severity = 'low' | 'medium' | 'high' | 'critical';

export const SEVERITIES_ORDERED: ReadonlyArray<Severity> = Object.freeze([
  'low',
  'medium',
  'high',
  'critical',
]);

/** Inclusive [min, max] toxicity range per severity. Verified at module load. */
export const SEVERITY_TOXICITY_RANGE: Readonly<
  Record<Severity, { readonly min: number; readonly max: number }>
> = Object.freeze({
  low: { min: 0, max: 25 },
  medium: { min: 26, max: 50 },
  high: { min: 51, max: 75 },
  critical: { min: 76, max: 100 },
});

/**
 * Single clause analysis row — one record per clause in a parsed term
 * sheet. Persisted as the elements of `DealAnalysis.clauseAnalysisJson`.
 */
export interface ClauseAnalysis {
  /** Original clause text (verbatim, capped at 2000 chars by the parser). */
  readonly text: string;
  /** Classified clause type. */
  readonly clauseType: ClauseType;
  /** Severity tier. */
  readonly severity: Severity;
  /** 0-100 toxicity score. Higher = more founder-hostile. */
  readonly toxicity: number;
  /** One-line plain-language summary. */
  readonly summary: string;
  /** Counter-language the founder can table back to the investor. */
  readonly founderFriendlyAlternative: string;
  /** Optional cascade reasoning surfaced for the audit trail. */
  readonly reasoning?: string;
  /** Whether this analysis ran through the Opus judge pass. */
  readonly opusJudged: boolean;
}

export interface ClauseClassificationAttempt {
  readonly providerId: string;
  readonly modelId: string;
  readonly success: boolean;
  readonly durationMs: number;
}

/**
 * Full output of a `classifyClauses` orchestrator call. Bundles every
 * analysis plus the cascade trail so consumers can persist a coherent
 * audit-tracked record.
 */
export interface ClauseAnalysisResult {
  readonly analyses: ReadonlyArray<ClauseAnalysis>;
  readonly providerId: string;
  readonly modelId: string;
  readonly runtimeMode: 'live' | 'mock';
  readonly attempts: ReadonlyArray<ClauseClassificationAttempt>;
}
