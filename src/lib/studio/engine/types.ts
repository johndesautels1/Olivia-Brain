/**
 * Studio Type Definitions
 *
 * Core types for the Preparation Studio question engine.
 * QuestionState wraps each WorkspaceBlock with presentation metadata,
 * Bayesian prior stubs, and per-question intelligence data.
 */

import type { EditableField } from "@/components/documents/DocumentWorkspace";

// ── Field answer value (what the user types/selects) ─────────────────

export type FieldValue = string | string[] | Record<string, unknown> | null;

// ── Suggestion source — where a pre-fill or chip came from ──────────

export interface SuggestionSource {
  /** Origin system: DNA paragraph, valuation DCF, entity thesis, etc. */
  origin: "dna" | "valuation" | "entity" | "cascade" | "user_prior";
  /** Human-readable label, e.g. "from DNA P5" or "from DCF model" */
  label: string;
  /** Reference key into the source data (e.g. paragraph ID) */
  refKey?: string;
}

// ── Suggestion — a single auto-fill recommendation ──────────────────

export interface Suggestion {
  /** The suggested text or value */
  value: string;
  /** Confidence 0-100 (maps to 5-color tier) */
  confidence: number;
  /** Where this suggestion came from */
  source: SuggestionSource;
}

// ── Bayesian Prior stub — placeholder for Conversation 5 ────────────
// This interface is intentionally minimal now. Conversation 5 will
// expand it with real prior/posterior weight logic, cross-document
// consistency checks, and confidence blending.

export interface BayesianPrior {
  /** Field key this prior applies to */
  fieldKey: string;
  /** Prior weight 0-100 (how strongly we trust this source) */
  weight: number;
  /** The source providing the prior */
  source: SuggestionSource;
  /** The prior value (best guess before user input) */
  priorValue: string;
}

// ── ConsistencyFlag — cross-document conflict marker ────────────────

export interface ConsistencyFlag {
  /** Title of the conflicting document */
  conflictingDocTitle: string;
  /** ID of the conflicting document */
  conflictingDocId: string;
  /** Field key where the conflict exists */
  fieldKey: string;
  /** Value in the current document */
  thisValue: string;
  /** Value in the conflicting document */
  otherValue: string;
  /** Severity: warning = soft mismatch, error = hard contradiction */
  severity: "warning" | "error";
}

// ── QuestionState — one question in the studio sequencer ────────────

export interface QuestionState {
  /** Index in the flattened question array */
  questionIndex: number;
  /** Original block index in WorkspaceBlock[] */
  blockIndex: number;
  /** The editable field this question targets */
  field: EditableField;
  /** Human-readable question text (derived from block heading or field label) */
  questionText: string;
  /** Help/explanation text shown below the question */
  helpText: string | null;
  /** Block type (paragraph, metrics, table, etc.) */
  blockType: string;
  /** Current user answer value */
  currentValue: FieldValue;
  /** Completion status for this specific field */
  status: "empty" | "partial" | "complete";
  /** Impact score 0-100 — how much this field affects match/eval */
  impactScore: number;
  /** Auto-fill suggestions with confidence + source */
  suggestions: Suggestion[];
  /** Bayesian priors — stub for Conversation 5 */
  priors: BayesianPrior[];
  /** Whether this question was skipped by the user */
  skipped: boolean;
  /** Whether the user has reviewed this (for "Review answered?" toggle) */
  reviewed: boolean;
  /** Cross-document consistency flags — conflicts with other docs */
  consistencyFlags: ConsistencyFlag[];
  /** Entity emphasis: "priority" = highlighted, "supplementary" = collapsed, "normal" = default */
  entityEmphasis: "priority" | "supplementary" | "normal";
}

// ── EngagementMetrics — per-question engagement tracking ─────────────
// Tracks how the user interacts with each question: time spent, edits,
// skips, etc. Used by the streak counter, session timer, and adaptive
// pacing logic in PreparationStudio.

export interface EngagementMetrics {
  /** Seconds spent on this question (accumulated across visits) */
  timeSpentSeconds: number;
  /** Number of times the answer was revised */
  revisionCount: number;
  /** Whether the user skipped this question at least once */
  wasSkipped: boolean;
  /** Timestamp (ms) when the user first viewed this question */
  firstViewedAt: number | null;
  /** Timestamp (ms) of the last edit */
  lastEditedAt: number | null;
}

/** Default engagement metrics for a fresh question */
export const DEFAULT_ENGAGEMENT_METRICS: EngagementMetrics = {
  timeSpentSeconds: 0,
  revisionCount: 0,
  wasSkipped: false,
  firstViewedAt: null,
  lastEditedAt: null,
};

// ── SessionMetrics — session-level engagement summary ────────────────
// Aggregated stats for the current studio session. Displayed in the
// bottom bar (timer, streak) and completion ceremony (total time).

export interface SessionMetrics {
  /** Timestamp (ms) when the session started */
  sessionStartedAt: number;
  /** Total elapsed seconds in this session */
  totalElapsedSeconds: number;
  /** Current consecutive-completion streak (resets on skip) */
  currentStreak: number;
  /** Highest streak achieved this session */
  bestStreak: number;
  /** Total number of questions completed this session */
  completedThisSession: number;
  /** Total number of questions skipped this session */
  skippedThisSession: number;
}

/** Default session metrics */
export const DEFAULT_SESSION_METRICS: SessionMetrics = {
  sessionStartedAt: Date.now(),
  totalElapsedSeconds: 0,
  currentStreak: 0,
  bestStreak: 0,
  completedThisSession: 0,
  skippedThisSession: 0,
};

// ── StudioConfig — runtime configuration for the session ────────────

export interface StudioConfig {
  /** Show already-completed questions or skip them */
  showCompleted: boolean;
  /** Auto-advance to next question after answer */
  autoAdvance: boolean;
  /** Auto-save debounce delay in ms */
  autoSaveDelayMs: number;
}

/** Default studio configuration */
export const DEFAULT_STUDIO_CONFIG: StudioConfig = {
  showCompleted: true,
  autoAdvance: false,
  autoSaveDelayMs: 1500,
};
