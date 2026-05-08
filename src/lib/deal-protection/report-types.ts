/**
 * Track P Session P3 — DealRiskReport contract.
 *
 * The shape returned by `analyzeTermSheet` and persisted to the
 * `deal_analyses` table. Stable for the lifetime of the platform —
 * downstream consumers (P5 email drafts, P6 WarRoom counter,
 * P7 negotiation rehearsal, the founder UI) bind to these names.
 */
import type {
  ClauseAnalysis,
  ClauseClassificationAttempt,
  ClauseType,
} from './clause-types';
import type { InvestorReputationLookup } from './investor-types';
import type { SmartBandRecord } from './types';

/** A single critical clause called out in the report header. */
export interface CriticalIssue {
  readonly clauseType: ClauseType;
  readonly summary: string;
  readonly toxicity: number;
}

/** Full deal risk report — one per analyze run. */
export interface DealRiskReport {
  /** Stable id of the persisted DealAnalysis row. */
  readonly dealAnalysisId: string;
  /** ValuationSubject this analysis belongs to. */
  readonly valuationSubjectId: string;
  /** 0-100 smart score (clamped). Higher = more founder-friendly. */
  readonly smartScore: number;
  /** Band record (id + language + actionLabel + colorToken etc.). */
  readonly band: SmartBandRecord;
  /** Per-clause analyses in source order. */
  readonly clauseAnalyses: ReadonlyArray<ClauseAnalysis>;
  /** Critical clauses called out in the executive summary header. Up to 5, sorted by toxicity desc. */
  readonly criticalIssues: ReadonlyArray<CriticalIssue>;
  /** Walk-away reasons — populated only when band === 'red'. */
  readonly walkAwayReasons: ReadonlyArray<string>;
  /** Investor names extracted by the parser (for P4 reputation lookup). */
  readonly investorNames: ReadonlyArray<string>;
  /**
   * P4 reputation lookup — matched investors + unmatched names + the
   * applied reputation tilt (-REPUTATION_TILT_MAX … +REPUTATION_TILT_MAX).
   * Empty matched-list when no parser-extracted name matched a record.
   */
  readonly reputationLookup: InvestorReputationLookup;
  /** 0-1 confidence score. */
  readonly confidenceScore: number;
  /** `'live'` iff parser AND classifier both stayed live. */
  readonly runtimeMode: 'live' | 'mock';
  /** Cascade attempts trail — parser + classifier combined. */
  readonly attempts: ReadonlyArray<ClauseClassificationAttempt>;
  /** ISO 8601 timestamp the report was generated. */
  readonly generatedAt: string;
}

/** Confidence assigned when every cascade sub-call ran live. */
export const CONFIDENCE_LIVE = 0.95 as const;

/** Confidence assigned when any cascade sub-call mocked OR the input couldn't be structured. */
export const CONFIDENCE_MOCK = 0.4 as const;
