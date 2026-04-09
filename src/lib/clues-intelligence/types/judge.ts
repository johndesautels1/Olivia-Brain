/**
 * CLUES Intelligence — Judge Types
 *
 * Types for judge overrides and reports used in Smart Score calculation.
 * These allow human or LLM judges to override consensus scores.
 */

/**
 * A single metric override from the judge.
 * Key format for lookup: "metric_id:location"
 */
export interface MetricOverride {
  /** The metric ID being overridden */
  metric_id: string;

  /** The location this override applies to */
  location: string;

  /** The judge's override score (0-100) */
  judgeScore: number;

  /** For dual-score metrics: the legal/on-paper score (0-100) */
  legalScore?: number;

  /** For dual-score metrics: the enforcement/lived-reality score (0-100) */
  enforcementScore?: number;

  /** Optional justification for the override */
  justification?: string;

  /** Explanation from the judge for this override */
  judgeExplanation?: string;

  /** Source of the override (e.g., "opus-judge", "human-review") */
  source?: string;
}

/**
 * Safeguard information from judge orchestration.
 */
export interface JudgeSafeguard {
  /** Whether a safeguard was triggered */
  triggered: boolean;

  /** Type of safeguard (e.g., "bias_detected", "data_quality") */
  type?: string;

  /** Description of the safeguard issue */
  message?: string;

  /** Severity level */
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Full judge orchestration result including safeguard info.
 */
export interface JudgeOrchestrationResult {
  /** The judge report with metric overrides */
  report: JudgeReport;

  /** Any safeguards that were triggered */
  safeguards: JudgeSafeguard[];

  /** Processing time in milliseconds */
  processingTimeMs?: number;

  /** Which judge model was used */
  model?: string;

  /** Raw response for debugging */
  rawResponse?: unknown;
}

/**
 * Complete judge report containing all overrides for an evaluation.
 */
export interface JudgeReport {
  /** Unique identifier for this judge report */
  id: string;

  /** ID of the evaluation this report applies to */
  evaluationId: string;

  /** All metric overrides from the judge */
  metricOverrides: MetricOverride[];

  /** When this report was generated */
  generatedAt: string;

  /** Which judge model/person generated this */
  judgeId?: string;

  /** Overall notes or summary from the judge */
  notes?: string;
}
