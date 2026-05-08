/**
 * Track P Session P3 — term-sheet parser type contracts.
 *
 * The parser converts free-form term-sheet text into a structured
 * shape the clause classifier can consume. One `TermSheetClause` per
 * clause boundary; each clause's `text` is capped at
 * `CLAUSE_TEXT_CHAR_LIMIT` to match `ClauseAnalysis.text`.
 */
import type { ClauseClassificationAttempt } from './clause-types';

/** Maximum characters of source text the parser will look at. */
export const PARSER_TEXT_CHAR_LIMIT = 50_000 as const;

/** Maximum characters per extracted clause (matches the classifier cap). */
export const CLAUSE_TEXT_CHAR_LIMIT = 2_000 as const;

/** Heuristic must produce at least this many clauses to skip the cascade. */
export const MIN_HEURISTIC_CLAUSE_COUNT = 3 as const;

/** Single extracted clause. */
export interface TermSheetClause {
  /** Clause text — verbatim, capped at `CLAUSE_TEXT_CHAR_LIMIT`. */
  readonly text: string;
  /** Section heading if extracted ("Liquidation Preference"). */
  readonly heading?: string;
}

/** Loose round-context block — populated only when extractable. */
export interface TermSheetRoundContext {
  /** Round type ('seed' / 'series_a' / etc) when stated explicitly. */
  readonly roundType?: string;
  /** Round amount in GBP when stated. */
  readonly amountGbp?: number;
  /** Pre-money valuation in GBP when stated. */
  readonly preMoneyGbp?: number;
}

/**
 * Which strategy produced the parse.
 *
 * - `heuristic`     — section-marker split succeeded with ≥ `MIN_HEURISTIC_CLAUSE_COUNT` clauses.
 * - `cascade`       — cascade extraction succeeded.
 * - `fallback_single` — neither succeeded; report carries one clause containing the verbatim text.
 */
export type ParserExtractionStrategy =
  | 'heuristic'
  | 'cascade'
  | 'fallback_single';

/**
 * Full parser output. Bundles clauses + investors + round context +
 * cascade attempts trail. `runtimeMode === 'mock'` when the cascade
 * fell through to the single-clause fallback OR the input couldn't be
 * structured.
 */
export interface TermSheetTerms {
  /** Original full text — capped at `PARSER_TEXT_CHAR_LIMIT`. */
  readonly fullText: string;
  /** Extracted clauses in source order. */
  readonly clauses: ReadonlyArray<TermSheetClause>;
  /** Investor names mentioned (for P4 reputation lookup). */
  readonly investorNames: ReadonlyArray<string>;
  /** Optional round context — undefined when nothing extractable. */
  readonly roundContext?: TermSheetRoundContext;
  /** Cascade attempts trail (empty when heuristic-only). */
  readonly attempts: ReadonlyArray<ClauseClassificationAttempt>;
  /** `'live'` iff the parse is structurally trustworthy (heuristic ≥ min OR cascade succeeded). */
  readonly runtimeMode: 'live' | 'mock';
  /** Strategy actually used. */
  readonly extractionStrategy: ParserExtractionStrategy;
}
