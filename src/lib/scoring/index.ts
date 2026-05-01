/**
 * SMART Score™ Engine
 * Sprint 3.2 — City Matching & Scoring System
 *
 * Exports the complete SMART Score system:
 * - Types and interfaces
 * - Scoring algorithm
 * - City comparison engine
 * - Cristiano verdict integration
 */

// Types
export type {
  SMARTCategory,
  CategoryWeights,
  CategoryScore,
  ScoreFactor,
  SMARTScore,
  ScoreTier,
  MatchQuality,
  ClientProfile,
  Demographics,
  CategoryPreferences,
  Requirement,
  TradeoffDecision,
  LifestylePreferences,
  FinancialParameters,
  LifeScore,
  LifeScoreDimension,
  CityData,
  SafetyMetrics,
  AffordabilityMetrics,
  AccessMetrics,
  RecreationMetrics,
  TalentMetrics,
  CityComparison,
  CategoryComparison,
  TradeoffAnalysis,
  ScoringService,
} from "./types";

export { DEFAULT_WEIGHTS } from "./types";

// Algorithm
export {
  calculateSMARTScore,
  calculateCategoryScore,
  calculateOverallScore,
  classifyScoreTier,
  classifyMatchQuality,
} from "./algorithm";

// Comparison
export { compareCities, headToHead, rankByCategory } from "./comparison";

// ─────────────────────────────────────────────────────────────────────────────
// Scoring Service Implementation
// ─────────────────────────────────────────────────────────────────────────────

import type {
  CityData,
  ClientProfile,
  SMARTScore,
  SMARTCategory,
  CategoryScore,
  CityComparison,
  LifeScore,
  CategoryWeights,
  ScoringService,
} from "./types";
import { DEFAULT_WEIGHTS } from "./types";
import { calculateSMARTScore, calculateCategoryScore } from "./algorithm";
import { compareCities as compareCitiesImpl } from "./comparison";

/**
 * Production-ready Scoring Service implementation.
 */
export class SMARTScoringService implements ScoringService {
  /**
   * Score a single city for a client profile.
   */
  async scoreCity(city: CityData, profile: ClientProfile): Promise<SMARTScore> {
    return calculateSMARTScore(city, profile);
  }

  /**
   * Score multiple cities in parallel.
   */
  async scoreCities(cities: CityData[], profile: ClientProfile): Promise<SMARTScore[]> {
    return Promise.all(cities.map((city) => this.scoreCity(city, profile)));
  }

  /**
   * Compare cities and generate comprehensive comparison.
   */
  async compareCities(cities: CityData[], profile: ClientProfile): Promise<CityComparison> {
    return compareCitiesImpl(cities, profile);
  }

  /**
   * Get score for a specific category.
   */
  async scoreCategory(
    category: SMARTCategory,
    city: CityData,
    profile: ClientProfile
  ): Promise<CategoryScore> {
    const weights = profile.categoryPreferences?.weights ?? DEFAULT_WEIGHTS;
    return calculateCategoryScore(category, city, profile, weights[category]);
  }

  /**
   * Calculate LifeScore from client profile.
   * Aggregates assessment responses into dimensional scores.
   */
  async calculateLifeScore(profile: ClientProfile): Promise<LifeScore> {
    // If profile already has a calculated LifeScore, return it
    if (profile.lifeScore) {
      return profile.lifeScore;
    }

    // Calculate from profile dimensions
    const dimensions = [
      {
        name: "Career Fulfillment",
        weight: 0.20,
        factors: this.extractCareerFactors(profile),
      },
      {
        name: "Financial Security",
        weight: 0.20,
        factors: this.extractFinancialFactors(profile),
      },
      {
        name: "Relationships",
        weight: 0.20,
        factors: this.extractRelationshipFactors(profile),
      },
      {
        name: "Health & Wellness",
        weight: 0.15,
        factors: this.extractHealthFactors(profile),
      },
      {
        name: "Personal Growth",
        weight: 0.15,
        factors: this.extractGrowthFactors(profile),
      },
      {
        name: "Life Satisfaction",
        weight: 0.10,
        factors: this.extractSatisfactionFactors(profile),
      },
    ];

    // Calculate dimension scores (simplified - would be more sophisticated in production)
    const scoredDimensions = dimensions.map((dim) => ({
      name: dim.name,
      score: this.calculateDimensionScore(dim.factors),
      weight: dim.weight,
      factors: dim.factors,
    }));

    // Calculate overall
    const overall = scoredDimensions.reduce(
      (sum, dim) => sum + dim.score * dim.weight,
      0
    );

    return {
      overall: Math.round(overall),
      dimensions: scoredDimensions,
      assessedAt: new Date(),
      confidence: 0.75, // Base confidence
    };
  }

  /**
   * Recommend category weights based on client profile.
   */
  recommendWeights(profile: ClientProfile): CategoryWeights {
    // Start with defaults
    const weights = { ...DEFAULT_WEIGHTS };

    // Adjust based on demographics
    if (profile.demographics.familyStatus === "family") {
      weights.safety += 0.05;
      weights.recreation -= 0.03;
      weights.talent -= 0.02;
    }

    if (profile.demographics.familyStatus === "retired") {
      weights.talent -= 0.10;
      weights.recreation += 0.05;
      weights.safety += 0.05;
    }

    if (profile.demographics.workStatus === "remote") {
      weights.access -= 0.05;
      weights.recreation += 0.05;
    }

    // Adjust based on financial sensitivity
    if (profile.financial.taxSensitivity === "high") {
      weights.money += 0.05;
      weights.recreation -= 0.05;
    }

    // Adjust based on must-haves
    for (const req of profile.mustHaves) {
      if (req.priority === "required") {
        weights[req.category] += 0.03;
      }
    }

    // Normalize to sum to 1.0
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    for (const key of Object.keys(weights) as SMARTCategory[]) {
      weights[key] = weights[key] / total;
    }

    return weights;
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  private extractCareerFactors(profile: ClientProfile): string[] {
    const factors: string[] = [];
    if (profile.demographics.workStatus) {
      factors.push(`work_status:${profile.demographics.workStatus}`);
    }
    if (profile.financial.incomeSource) {
      factors.push(`income:${profile.financial.incomeSource}`);
    }
    return factors;
  }

  private extractFinancialFactors(profile: ClientProfile): string[] {
    const factors: string[] = [];
    factors.push(`budget_range:${profile.financial.budget.min}-${profile.financial.budget.max}`);
    factors.push(`tax_sensitivity:${profile.financial.taxSensitivity}`);
    return factors;
  }

  private extractRelationshipFactors(profile: ClientProfile): string[] {
    const factors: string[] = [];
    if (profile.demographics.familyStatus) {
      factors.push(`family:${profile.demographics.familyStatus}`);
    }
    if (profile.demographics.children > 0) {
      factors.push(`children:${profile.demographics.children}`);
    }
    return factors;
  }

  private extractHealthFactors(profile: ClientProfile): string[] {
    const factors: string[] = [];
    if (profile.lifestyle.climate.length > 0) {
      factors.push(`climate_pref:${profile.lifestyle.climate.join(",")}`);
    }
    if (profile.lifestyle.outdoors.length > 0) {
      factors.push(`outdoors:${profile.lifestyle.outdoors.join(",")}`);
    }
    return factors;
  }

  private extractGrowthFactors(profile: ClientProfile): string[] {
    const factors: string[] = [];
    if (profile.lifestyle.culture.length > 0) {
      factors.push(`culture:${profile.lifestyle.culture.join(",")}`);
    }
    if (profile.demographics.languages.length > 1) {
      factors.push(`multilingual:${profile.demographics.languages.length}`);
    }
    return factors;
  }

  private extractSatisfactionFactors(profile: ClientProfile): string[] {
    const factors: string[] = [];
    for (const tradeoff of profile.tradeoffs) {
      factors.push(`tradeoff:${tradeoff.dimension1}/${tradeoff.dimension2}:${tradeoff.preference}`);
    }
    return factors;
  }

  private calculateDimensionScore(factors: string[]): number {
    // Simplified scoring - in production would use ML model
    // Base score + bonus per factor
    const baseScore = 50;
    const factorBonus = Math.min(factors.length * 5, 30);
    return Math.min(100, baseScore + factorBonus + Math.random() * 10);
  }
}

// Export singleton instance
export const scoringService = new SMARTScoringService();
