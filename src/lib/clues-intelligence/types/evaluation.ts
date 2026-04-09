/**
 * CLUES Intelligence — Evaluation Pipeline Types
 *
 * Shared types for the 5-LLM parallel evaluation system.
 * Used by: evaluate-sonnet, evaluate-gpt54, evaluate-gemini, evaluate-grok,
 *          evaluate-perplexity, evaluationOrchestrator, and judgeOrchestrator.
 */

// ─── Shared Request Types ─────────────────────────────────────

/** A metric to be evaluated by an LLM */
export interface EvaluationMetric {
  id: string;                 // "M1", "M2", etc.
  fieldId: string;            // Machine-readable field ID
  description: string;        // Human-readable metric description
  category: string;           // One of 23 categories
  source_paragraph: number;   // Which paragraph (1-30)
  data_type: 'numeric' | 'boolean' | 'ranking' | 'index';
  research_query: string;     // What Tavily searched for this metric
  source?: string;             // Data source attribution (e.g., "Tavily: Portugal Interior Ministry Report 2026")
  threshold?: {
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'between';
    value: number | [number, number];
    unit: string;
  };
}

/** A candidate location to be scored */
export interface CityCandidate {
  location: string;
  country: string;
  location_type: 'city' | 'town' | 'neighborhood';
  parent?: string;
}

/** Pre-fetched Tavily research for a single metric */
export interface TavilyResult {
  metric_id: string;
  query: string;
  results: { title: string; url: string; content: string }[];
}

/** Standard request body for all 5 evaluation endpoints */
export interface EvaluateRequest {
  sessionId: string;
  category: string;           // One of 23 categories
  metrics: EvaluationMetric[];
  cities: CityCandidate[];
  tavilyResearch: TavilyResult[];
}

// ─── Shared Response Types ────────────────────────────────────

/** Score for a single metric on a single location, from one LLM */
export interface MetricScore {
  metric_id: string;
  score: number;              // 0-100
  confidence: number;         // 0-1
  user_justification: string;
  data_justification: string;
  source: string;
  reasoning: string;          // LLM's reasoning chain
}

/** One LLM's evaluation of a single location */
export interface CityEvaluation {
  location: string;
  country: string;
  overall_score: number;      // 0-100
  metric_scores: MetricScore[];
}

/** Standard evaluation response from any of the 5 LLMs */
export interface LLMEvaluationResponse {
  category: string;
  evaluations: CityEvaluation[];
  disagreements: string[];    // Metrics where LLM disagrees with Tavily data
  reasoning_summary: string;  // Overall category assessment
}

/** Standard metadata returned with every evaluation response */
export interface EvaluationMetadata {
  model: string;
  category: string;
  metricsEvaluated: number;
  citiesEvaluated: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  costUsd: number;
  durationMs: number;
  disagreementCount: number;
  /** True if the LLM response was truncated due to max_tokens */
  truncated?: boolean;
  timestamp: string;
}

/** Full response from any evaluation endpoint */
export interface EvaluateResponse {
  evaluation: LLMEvaluationResponse;
  metadata: EvaluationMetadata;
}

/** Error response shape from any evaluation endpoint */
export interface EvaluateErrorResponse {
  error: string;
  durationMs: number;
}

// ─── Orchestrator Types ───────────────────────────────────────

/** Which LLM model to use for evaluation */
export type EvaluatorModel =
  | 'claude-sonnet-4-6'
  | 'gpt-5.4'
  | 'gemini-3.1-pro-preview'
  | 'grok-4-1-fast-reasoning'
  | 'sonar-reasoning-pro-high';

/** Result from one LLM for one category */
export interface EvaluatorResult {
  model: EvaluatorModel;
  category: string;
  response: LLMEvaluationResponse | null;
  metadata: EvaluationMetadata | null;
  error: string | null;
  durationMs: number;
}

/** All 5 LLM results for a single category */
export interface CategoryBatchResult {
  category: string;
  results: EvaluatorResult[];
  /** How many of the 5 LLMs returned usable results */
  successCount: number;
  /** True when ≥ 3 of 5 LLMs responded (minimum for consensus) */
  isUsable: boolean;
  /** Per-metric consensus across the successful LLMs */
  consensus: MetricConsensus[];
}

/** Consensus score for one metric across all responding LLMs */
export interface MetricConsensus {
  metric_id: string;
  /** Per-location consensus scores */
  locations: LocationConsensus[];
  /** Standard deviation across LLMs (σ > 15 = high disagreement) */
  stdDev: number;
  /** Confidence level derived from stdDev */
  confidenceLevel: 'unanimous' | 'strong' | 'moderate' | 'split';
  /** Which LLMs contributed to this consensus */
  contributingModels: EvaluatorModel[];
  /** Flag for Opus judge review */
  needsJudgeReview: boolean;
}

/** Consensus for one metric at one location */
export interface LocationConsensus {
  location: string;
  country: string;
  /** Mean score across LLMs */
  mean: number;
  /** Median score across LLMs */
  median: number;
  /** Individual LLM scores for transparency */
  scores: { model: EvaluatorModel; score: number; confidence: number }[];
}

/** A wave of 2 categories fired in parallel */
export interface EvaluationWave {
  waveNumber: number;
  categories: string[];
  results: CategoryBatchResult[];
  durationMs: number;
}

/** Complete orchestration result across all waves */
export interface OrchestrationResult {
  waves: EvaluationWave[];
  totalCategories: number;
  successfulCategories: number;
  /** Categories where < 3 LLMs responded */
  failedCategories: string[];
  /** All metrics needing judge review (σ > 15) */
  metricsForJudge: MetricConsensus[];
  totalCostUsd: number;
  totalDurationMs: number;
  timestamp: string;
}

// ─── Supabase Table Types ─────────────────────────────────────

/** Row shape for the llm_evaluations Supabase table */
export interface LLMEvaluationRow {
  id?: string;
  session_id: string;
  llm_model: EvaluatorModel;
  category: string;
  metrics_json: LLMEvaluationResponse;
  metadata_json: EvaluationMetadata;
  created_at?: string;
}
