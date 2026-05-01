/**
 * SMART Score™ Engine Types
 * Sprint 3.2 — City Matching & Scoring System
 *
 * Core types for the 5-category weighted scoring algorithm.
 */

// ─── Score Categories ─────────────────────────────────────────────────────────

/**
 * The 5 SMART Score categories.
 * S - Safety & Security
 * M - Money & Affordability
 * A - Access & Connectivity
 * R - Recreation & Lifestyle
 * T - Talent & Opportunity
 */
export type SMARTCategory = "safety" | "money" | "access" | "recreation" | "talent";

/**
 * Category weights (must sum to 1.0).
 */
export interface CategoryWeights {
  safety: number;      // Safety & Security
  money: number;       // Money & Affordability
  access: number;      // Access & Connectivity
  recreation: number;  // Recreation & Lifestyle
  talent: number;      // Talent & Opportunity
}

/**
 * Default weights for balanced scoring.
 */
export const DEFAULT_WEIGHTS: CategoryWeights = {
  safety: 0.20,
  money: 0.25,
  access: 0.15,
  recreation: 0.20,
  talent: 0.20,
};

// ─── Score Results ────────────────────────────────────────────────────────────

/**
 * Individual category score (0-100).
 */
export interface CategoryScore {
  category: SMARTCategory;
  score: number;
  weight: number;
  weightedScore: number;
  /** Factors that contributed to this score */
  factors: ScoreFactor[];
  /** Confidence in this score (0-1) */
  confidence: number;
  /** Data freshness indicator */
  dataAge: "fresh" | "recent" | "stale" | "unknown";
}

export interface ScoreFactor {
  name: string;
  value: number | string;
  impact: number; // -100 to +100 contribution
  source: string;
  weight: number;
}

/**
 * Complete SMART Score for a city.
 */
export interface SMARTScore {
  /** Overall weighted score (0-100) */
  overall: number;
  /** Individual category scores */
  categories: Record<SMARTCategory, CategoryScore>;
  /** Score tier classification */
  tier: ScoreTier;
  /** Match quality descriptor */
  matchQuality: MatchQuality;
  /** Key strengths (top 3 positive factors) */
  strengths: ScoreFactor[];
  /** Key concerns (top 3 negative factors) */
  concerns: ScoreFactor[];
  /** Overall confidence (0-1) */
  confidence: number;
  /** When this score was calculated */
  calculatedAt: Date;
}

export type ScoreTier = "exceptional" | "strong" | "good" | "fair" | "poor";
export type MatchQuality = "excellent_match" | "good_match" | "moderate_match" | "weak_match" | "poor_match";

// ─── Client Profile ───────────────────────────────────────────────────────────

/**
 * Client preferences extracted from assessment.
 */
export interface ClientProfile {
  id: string;
  /** Demographic information */
  demographics: Demographics;
  /** Category preferences and weights */
  categoryPreferences: CategoryPreferences;
  /** Must-have requirements */
  mustHaves: Requirement[];
  /** Deal-breakers */
  dealbreakers: Requirement[];
  /** Trade-off decisions */
  tradeoffs: TradeoffDecision[];
  /** Lifestyle preferences */
  lifestyle: LifestylePreferences;
  /** Financial parameters */
  financial: FinancialParameters;
  /** Calculated LifeScore */
  lifeScore: LifeScore | null;
}

export interface Demographics {
  age: number | null;
  familyStatus: "single" | "couple" | "family" | "retired" | null;
  children: number;
  workStatus: "employed" | "self_employed" | "remote" | "seeking" | "retired" | null;
  citizenship: string[];
  languages: string[];
}

export interface CategoryPreferences {
  /** Importance weights per category (0-1) */
  weights: CategoryWeights;
  /** Specific priorities within each category */
  priorities: Record<SMARTCategory, string[]>;
}

export interface Requirement {
  category: SMARTCategory;
  type: string;
  value: string | number | boolean;
  priority: "required" | "important" | "preferred";
}

export interface TradeoffDecision {
  dimension1: string;
  dimension2: string;
  preference: "dimension1" | "dimension2" | "balanced";
  strength: number; // 0-1, how strongly they prefer
}

export interface LifestylePreferences {
  climate: string[];
  urbanity: "urban" | "suburban" | "rural" | "flexible";
  commute: { maxMinutes: number; mode: string[] };
  amenities: string[];
  culture: string[];
  outdoors: string[];
}

export interface FinancialParameters {
  budget: { min: number; max: number; currency: string };
  housingType: ("rent" | "buy")[];
  costOfLiving: "low" | "medium" | "high" | "flexible";
  incomeSource: string;
  taxSensitivity: "low" | "medium" | "high";
}

// ─── LifeScore ────────────────────────────────────────────────────────────────

/**
 * LifeScore™ assessment result.
 */
export interface LifeScore {
  /** Overall life satisfaction score (0-100) */
  overall: number;
  /** Dimension scores */
  dimensions: LifeScoreDimension[];
  /** Calculated at */
  assessedAt: Date;
  /** Confidence in assessment */
  confidence: number;
}

export interface LifeScoreDimension {
  name: string;
  score: number;
  weight: number;
  factors: string[];
}

// ─── City Data ────────────────────────────────────────────────────────────────

/**
 * City data for scoring.
 */
export interface CityData {
  id: string;
  name: string;
  country: string;
  region: string;
  population: number;
  coordinates: { lat: number; lng: number };
  /** Safety metrics */
  safety: SafetyMetrics;
  /** Cost of living / affordability */
  affordability: AffordabilityMetrics;
  /** Transportation / connectivity */
  access: AccessMetrics;
  /** Lifestyle / recreation */
  recreation: RecreationMetrics;
  /** Job market / opportunities */
  talent: TalentMetrics;
  /** Data freshness */
  lastUpdated: Date;
  /** Data sources */
  sources: string[];
}

export interface SafetyMetrics {
  crimeIndex: number;
  safetyIndex: number;
  healthcareQuality: number;
  politicalStability: number;
  naturalDisasterRisk: number;
  airQuality: number;
}

export interface AffordabilityMetrics {
  costOfLivingIndex: number;
  rentIndex: number;
  housingPriceIndex: number;
  medianIncome: number;
  taxBurden: number;
  purchasingPower: number;
}

export interface AccessMetrics {
  transitScore: number;
  walkScore: number;
  bikeScore: number;
  airportAccess: number;
  internetSpeed: number;
  internationalConnectivity: number;
}

export interface RecreationMetrics {
  restaurantDensity: number;
  nightlifeScore: number;
  outdoorScore: number;
  culturalScore: number;
  climateScore: number;
  beachAccess: number;
}

export interface TalentMetrics {
  jobMarketStrength: number;
  techHubScore: number;
  entrepreneurshipIndex: number;
  educationQuality: number;
  startupEcosystem: number;
  remoteWorkFriendliness: number;
}

// ─── Comparison ───────────────────────────────────────────────────────────────

/**
 * City comparison result.
 */
export interface CityComparison {
  cities: Array<{
    city: CityData;
    score: SMARTScore;
    rank: number;
  }>;
  /** Winner determination */
  winner: {
    cityId: string;
    margin: number;
    confidence: number;
  };
  /** Category-by-category comparison */
  categoryComparison: Record<SMARTCategory, CategoryComparison>;
  /** Trade-off analysis */
  tradeoffs: TradeoffAnalysis[];
  /** Recommendation summary */
  summary: string;
}

export interface CategoryComparison {
  category: SMARTCategory;
  scores: Array<{ cityId: string; score: number }>;
  winner: string;
  margin: number;
}

export interface TradeoffAnalysis {
  factor: string;
  cities: Array<{ cityId: string; value: number | string; advantage: boolean }>;
  insight: string;
}

// ─── Scoring Service ──────────────────────────────────────────────────────────

export interface ScoringService {
  /** Score a single city for a client */
  scoreCity(city: CityData, profile: ClientProfile): Promise<SMARTScore>;
  /** Score multiple cities */
  scoreCities(cities: CityData[], profile: ClientProfile): Promise<SMARTScore[]>;
  /** Compare cities */
  compareCities(cities: CityData[], profile: ClientProfile): Promise<CityComparison>;
  /** Get category score */
  scoreCategory(category: SMARTCategory, city: CityData, profile: ClientProfile): Promise<CategoryScore>;
  /** Calculate LifeScore */
  calculateLifeScore(profile: ClientProfile): Promise<LifeScore>;
  /** Get recommended weights based on profile */
  recommendWeights(profile: ClientProfile): CategoryWeights;
}
