/**
 * CLUES Intelligence — Smart Score Types
 *
 * Types for the Smart Score engine that normalizes raw LLM/judge scores
 * into 0-100 Smart Scores, rolls up metrics → categories → overall city scores,
 * and scores cities RELATIVE to each other (not in isolation).
 *
 * Consumed by: smartScoreEngine, categoryRollup, relativeScoring
 * Upstream data: evaluation.ts (MetricConsensus, LocationConsensus, OrchestrationResult)
 *                judge.ts (JudgeReport, MetricOverride)
 */

import type { EvaluatorModel } from './evaluation';

// ─── Confidence Levels ───────────────────────────────────────

/** Confidence level derived from StdDev across LLM responses */
export type ConfidenceLevel = 'unanimous' | 'strong' | 'moderate' | 'split';

/** StdDev thresholds for confidence levels (from PARAGRAPHICAL_ARCHITECTURE.md §15.5) */
export const CONFIDENCE_THRESHOLDS = {
  unanimous: 5,   // σ < 5
  strong: 12,     // σ < 12
  moderate: 20,   // σ < 20
  // σ >= 20 → 'split'
} as const;

// ─── Dual Scoring (Legal vs Lived) ───────────────────────────

/** Dual legal/enforcement scores for applicable metrics (§15.3) */
export interface DualScore {
  /** What the law technically says (0-100) */
  legalScore: number;
  /** How it's actually applied in practice (0-100) */
  enforcementScore: number;
  /** Weighting ratio: legalWeight + enforcementWeight = 1.0 */
  legalWeight: number;
  enforcementWeight: number;
  /** Combined score: (legal * legalWeight) + (enforcement * enforcementWeight) */
  combinedScore: number;
  /** Conservative mode: MIN(legal, enforcement) for pessimistic view */
  conservativeScore: number;
}

/** Default law-to-lived ratio (50/50 per §15.3) */
export const DEFAULT_LAW_LIVED_RATIO = { legal: 0.5, lived: 0.5 } as const;

// ─── Metric-Level Smart Score ────────────────────────────────

/** Smart Score for a single metric at a single location */
export interface MetricSmartScore {
  metric_id: string;
  fieldId: string;
  description: string;
  category: string;
  source_paragraph: number;
  data_type: 'numeric' | 'boolean' | 'ranking' | 'index';

  /** The final Smart Score (0-100), potentially adjusted by judge */
  score: number;
  /** The raw consensus score before any judge adjustment */
  rawConsensusScore: number;
  /** Whether the judge overrode this metric's score */
  judgeOverridden: boolean;
  /** The judge's adjusted score (if overridden) */
  judgeScore?: number;
  /** Judge explanation (if overridden) */
  judgeExplanation?: string;

  /** Dual scoring (only for metrics where legal vs lived distinction applies) */
  dualScore?: DualScore;

  /** Confidence from LLM agreement */
  confidence: ConfidenceLevel;
  /** Raw standard deviation across LLMs */
  stdDev: number;
  /** Which LLMs contributed scores */
  contributingModels: EvaluatorModel[];

  /** The raw real-world value (e.g., "23.4C average", "150 Mbps") */
  rawValue?: string;
  /** Source citations */
  sources: MetricSource[];
}

/** A source citation for a metric score */
export interface MetricSource {
  name: string;
  url: string;
  excerpt: string;
}

// ─── Category-Level Smart Score ──────────────────────────────

/** Smart Score for one category at one location */
export interface CategorySmartScore {
  categoryId: string;
  categoryName: string;

  /** Weighted average of metric Smart Scores in this category (0-100) */
  score: number;
  /** Category weight as fraction of overall (0-1), derived from persona + paragraph emphasis */
  weight: number;
  /** Contribution to overall score: score * weight */
  weightedContribution: number;

  /** Number of metrics in this category */
  metricCount: number;
  /** Number of metrics with valid scores (excludes missing data) */
  scoredMetricCount: number;

  /** Per-metric scores in this category */
  metricScores: MetricSmartScore[];

  /** Aggregate confidence for this category */
  confidence: ConfidenceLevel;
  /** Average stdDev across metrics in this category */
  avgStdDev: number;

  /** Judge's category-level analysis (if provided) */
  judgeAnalysis?: string;
  /** Judge's trend notes for this category */
  trendNotes?: string;
}

// ─── City-Level Smart Score ──────────────────────────────────

/** Complete Smart Score for one city (the main output) */
export interface CitySmartScore {
  /** Location identifiers */
  location: string;
  country: string;
  location_type: 'city' | 'town' | 'neighborhood';
  parent?: string;

  /** Overall Smart Score (0-100) — weighted rollup of all category scores */
  overallScore: number;

  /** Per-category breakdown */
  categoryScores: CategorySmartScore[];

  /** Flat lookup: categoryId → score */
  categoryScoreMap: Record<string, number>;

  /** Total metrics scored for this location */
  totalMetrics: number;
  /** Total metrics with valid data */
  scoredMetrics: number;

  /** Overall confidence */
  overallConfidence: ConfidenceLevel;

  /** Judge's overall assessment for this location */
  judgeTrend?: 'improving' | 'stable' | 'declining';

  /** Rank among compared cities (1 = best) */
  rank: number;
}

// ─── Winner Determination ────────────────────────────────────

/** Tie threshold: score difference < 1 point at city level (§15.4) */
export const CITY_TIE_THRESHOLD = 1;

/** Tie threshold: score difference < 2 points at category level (§15.4) */
export const CATEGORY_TIE_THRESHOLD = 2;

/** Result of comparing cities */
export interface WinnerDetermination {
  /** The winning city (or first city in case of tie) */
  winner: CitySmartScore;
  /** All cities ranked by overall score */
  rankings: CitySmartScore[];
  /** Whether the result is a tie (score difference < threshold) */
  isTie: boolean;
  /** Score difference between #1 and #2 */
  scoreDifference: number;
  /** Categories where #1 wins */
  winnerAdvantageCategories: string[];
  /** Categories where #2 wins */
  runnerUpAdvantageCategories: string[];
  /** Categories that are tied */
  tiedCategories: string[];
}

// ─── Category Weights ────────────────────────────────────────

/** Weight configuration for the 23 categories */
export interface CategoryWeights {
  /** Category ID → weight (0-1), all must sum to 1.0 */
  weights: Record<string, number>;
  /** How the weights were derived */
  derivation: 'default' | 'persona' | 'paragraph_emphasis' | 'custom';
  /** Persona preset used (if any) */
  personaPreset?: string;
}

/** Default equal-weight distribution across 23 categories */
export const DEFAULT_CATEGORY_COUNT = 23;

// ─── Persona Presets ─────────────────────────────────────────

/** Persona preset definitions that adjust category weights */
export interface PersonaPreset {
  id: string;
  name: string;
  description: string;
  /** Category weight multipliers (1.0 = default, >1 = more important, <1 = less) */
  weightMultipliers: Record<string, number>;
}

/** Built-in persona presets (adapted from LifeScore §15.6) */
export const PERSONA_PRESETS: PersonaPreset[] = [
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Equal weight across all dimensions',
    weightMultipliers: {},
  },
  {
    id: 'digital_nomad',
    name: 'Digital Nomad',
    description: 'Prioritizes connectivity, cost, and lifestyle',
    weightMultipliers: {
      technology_connectivity: 1.8,
      financial_banking: 1.5,
      food_dining: 1.3,
      entertainment_nightlife: 1.3,
      transportation_mobility: 1.2,
      family_children: 0.4,
      pets_animals: 0.5,
    },
  },
  {
    id: 'entrepreneur',
    name: 'Entrepreneur',
    description: 'Prioritizes business environment and finance',
    weightMultipliers: {
      professional_career: 1.8,
      financial_banking: 1.7,
      legal_immigration: 1.5,
      technology_connectivity: 1.4,
      social_values_governance: 1.2,
      outdoor_recreation: 0.6,
      pets_animals: 0.5,
    },
  },
  {
    id: 'family',
    name: 'Family',
    description: 'Prioritizes safety, education, and family services',
    weightMultipliers: {
      safety_security: 1.8,
      family_children: 1.8,
      education_learning: 1.7,
      health_wellness: 1.5,
      housing_property: 1.4,
      neighborhood_urban_design: 1.3,
      entertainment_nightlife: 0.4,
      sexual_beliefs_practices_laws: 0.5,
    },
  },
  {
    id: 'retiree',
    name: 'Retiree',
    description: 'Prioritizes health, climate, safety, and cost of living',
    weightMultipliers: {
      health_wellness: 1.8,
      climate_weather: 1.7,
      safety_security: 1.5,
      financial_banking: 1.4,
      housing_property: 1.3,
      outdoor_recreation: 1.2,
      professional_career: 0.3,
      education_learning: 0.5,
    },
  },
  {
    id: 'investor',
    name: 'Investor',
    description: 'Prioritizes financial environment and property',
    weightMultipliers: {
      financial_banking: 1.9,
      housing_property: 1.7,
      legal_immigration: 1.5,
      professional_career: 1.3,
      social_values_governance: 1.2,
      outdoor_recreation: 0.5,
      entertainment_nightlife: 0.5,
      pets_animals: 0.4,
    },
  },
];

// ─── Smart Score Engine Input ────────────────────────────────

/** Input to the Smart Score engine — everything needed to compute final scores */
export interface SmartScoreInput {
  /** The orchestration result from the 5-LLM evaluation */
  orchestrationResult: import('./evaluation').OrchestrationResult;
  /** The judge report (may be null if no metrics needed judge review) */
  judgeReport: import('./judge').JudgeReport | null;
  /** The original evaluation metrics (for metadata) */
  metrics: import('./evaluation').EvaluationMetric[];
  /** The candidate cities being compared */
  cities: import('./evaluation').CityCandidate[];
  /** Category weights (derived from persona/paragraphs) */
  categoryWeights: CategoryWeights;
  /** Whether to use conservative (MIN) dual scoring */
  useConservativeScoring?: boolean;
}

/** Complete output from the Smart Score engine */
export interface SmartScoreOutput {
  /** Per-city Smart Scores */
  cityScores: CitySmartScore[];
  /** Winner determination */
  winner: WinnerDetermination;
  /** Category weights used */
  categoryWeights: CategoryWeights;
  /** Timestamp */
  computedAt: string;
}
