/**
 * Cristiano Verdict Integration
 * Sprint 3.2 — SMART Score™ System
 *
 * Integrates the Cristiano™ unilateral judge persona with SMART Score
 * to generate authoritative city recommendations.
 */

import type {
  CityData,
  ClientProfile,
  SMARTScore,
  CityComparison,
  SMARTCategory,
} from "./types";
import { calculateSMARTScore } from "./algorithm";
import { compareCities } from "./comparison";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CristianoVerdict {
  /** The recommended city */
  recommendation: CityData;
  /** Overall confidence in this recommendation (0-1) */
  confidence: number;
  /** The verdict statement in Cristiano's voice */
  verdict: string;
  /** Key reasons for this recommendation */
  reasons: VerdictReason[];
  /** Caveats or considerations */
  caveats: string[];
  /** Alternative cities if applicable */
  alternatives: AlternativeCity[];
  /** Raw SMART Score data */
  scoreData: SMARTScore;
  /** Full comparison if multiple cities */
  comparison: CityComparison | null;
}

export interface VerdictReason {
  category: SMARTCategory;
  statement: string;
  impact: "major" | "moderate" | "minor";
  dataPoint: string;
}

export interface AlternativeCity {
  city: CityData;
  score: number;
  whyNot: string;
  whenBetter: string;
}

export interface VerdictConfig {
  /** Minimum score difference to declare clear winner */
  clearWinnerThreshold: number;
  /** Maximum alternatives to include */
  maxAlternatives: number;
  /** Whether to include detailed reasoning */
  detailedReasoning: boolean;
  /** Client's risk tolerance affects verdict tone */
  riskTolerance: "conservative" | "moderate" | "aggressive";
}

const DEFAULT_VERDICT_CONFIG: VerdictConfig = {
  clearWinnerThreshold: 10,
  maxAlternatives: 2,
  detailedReasoning: true,
  riskTolerance: "moderate",
};

// ─────────────────────────────────────────────────────────────────────────────
// Verdict Generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a Cristiano verdict for a single city.
 */
export function generateSingleCityVerdict(
  city: CityData,
  profile: ClientProfile,
  config: Partial<VerdictConfig> = {}
): CristianoVerdict {
  const cfg = { ...DEFAULT_VERDICT_CONFIG, ...config };
  const score = calculateSMARTScore(city, profile);

  const reasons = extractReasons(city, score, profile);
  const caveats = extractCaveats(city, score, profile);
  const verdict = composeSingleCityVerdict(city, score, reasons, cfg);

  return {
    recommendation: city,
    confidence: score.confidence,
    verdict,
    reasons,
    caveats,
    alternatives: [],
    scoreData: score,
    comparison: null,
  };
}

/**
 * Generate a Cristiano verdict comparing multiple cities.
 */
export function generateComparisonVerdict(
  cities: CityData[],
  profile: ClientProfile,
  config: Partial<VerdictConfig> = {}
): CristianoVerdict {
  const cfg = { ...DEFAULT_VERDICT_CONFIG, ...config };

  if (cities.length === 0) {
    throw new Error("At least one city required for verdict");
  }

  if (cities.length === 1) {
    return generateSingleCityVerdict(cities[0], profile, config);
  }

  const comparison = compareCities(cities, profile);
  const winner = comparison.cities[0];
  const runnerUps = comparison.cities.slice(1, cfg.maxAlternatives + 1);

  const reasons = extractReasons(winner.city, winner.score, profile);
  const caveats = extractCaveats(winner.city, winner.score, profile);

  const alternatives: AlternativeCity[] = runnerUps.map((ru) => ({
    city: ru.city,
    score: ru.score.overall,
    whyNot: generateWhyNot(winner.city, winner.score, ru.city, ru.score),
    whenBetter: generateWhenBetter(ru.city, ru.score, profile),
  }));

  const verdict = composeComparisonVerdict(
    winner.city,
    winner.score,
    comparison,
    reasons,
    cfg
  );

  return {
    recommendation: winner.city,
    confidence: calculateVerdictConfidence(comparison, cfg),
    verdict,
    reasons,
    caveats,
    alternatives,
    scoreData: winner.score,
    comparison,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Reason Extraction
// ─────────────────────────────────────────────────────────────────────────────

function extractReasons(
  city: CityData,
  score: SMARTScore,
  profile: ClientProfile
): VerdictReason[] {
  const reasons: VerdictReason[] = [];

  // Extract from strengths
  for (const strength of score.strengths.slice(0, 3)) {
    const category = findFactorCategory(strength.name, score);
    reasons.push({
      category,
      statement: generateStrengthStatement(city.name, strength),
      impact: strength.impact > 30 ? "major" : strength.impact > 15 ? "moderate" : "minor",
      dataPoint: `${strength.name}: ${strength.value}`,
    });
  }

  // Add category-specific reasons
  const categories: SMARTCategory[] = ["safety", "money", "access", "recreation", "talent"];
  for (const cat of categories) {
    const catScore = score.categories[cat];
    if (catScore.score >= 80) {
      const weight = profile.categoryPreferences?.weights?.[cat] ?? 0.2;
      if (weight >= 0.2) {
        reasons.push({
          category: cat,
          statement: generateCategoryStrengthStatement(city.name, cat, catScore.score),
          impact: catScore.score >= 90 ? "major" : "moderate",
          dataPoint: `${cat} score: ${Math.round(catScore.score)}`,
        });
      }
    }
  }

  // Limit to top 5 reasons
  return reasons.slice(0, 5);
}

function findFactorCategory(factorName: string, score: SMARTScore): SMARTCategory {
  for (const [cat, catScore] of Object.entries(score.categories)) {
    for (const factor of catScore.factors) {
      if (factor.name === factorName) {
        return cat as SMARTCategory;
      }
    }
  }
  return "recreation"; // Default fallback
}

function generateStrengthStatement(cityName: string, factor: { name: string; value: number | string; impact: number }): string {
  const templates = [
    `${cityName} excels in ${factor.name.toLowerCase()}`,
    `Strong ${factor.name.toLowerCase()} makes ${cityName} stand out`,
    `${cityName}'s ${factor.name.toLowerCase()} is a significant advantage`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

function generateCategoryStrengthStatement(cityName: string, category: SMARTCategory, score: number): string {
  const categoryNames: Record<SMARTCategory, string> = {
    safety: "safety and security",
    money: "affordability",
    access: "connectivity and access",
    recreation: "lifestyle and recreation",
    talent: "career opportunities",
  };

  if (score >= 90) {
    return `${cityName} offers exceptional ${categoryNames[category]}`;
  }
  return `${cityName} provides strong ${categoryNames[category]}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Caveat Extraction
// ─────────────────────────────────────────────────────────────────────────────

function extractCaveats(
  city: CityData,
  score: SMARTScore,
  _profile: ClientProfile
): string[] {
  const caveats: string[] = [];

  // Extract from concerns
  for (const concern of score.concerns.slice(0, 2)) {
    if (concern.impact < -15) {
      caveats.push(`Consider that ${city.name} has challenges with ${concern.name.toLowerCase()}`);
    }
  }

  // Add confidence caveat if low
  if (score.confidence < 0.7) {
    caveats.push(`Data availability for ${city.name} is limited; recommend additional research`);
  }

  // Add data freshness caveat
  const staleCategories = Object.values(score.categories).filter(
    (c) => c.dataAge === "stale"
  );
  if (staleCategories.length > 1) {
    caveats.push(`Some metrics for ${city.name} may be outdated`);
  }

  return caveats;
}

// ─────────────────────────────────────────────────────────────────────────────
// Alternative Analysis
// ─────────────────────────────────────────────────────────────────────────────

function generateWhyNot(
  winner: CityData,
  winnerScore: SMARTScore,
  alternative: CityData,
  altScore: SMARTScore
): string {
  const margin = winnerScore.overall - altScore.overall;

  if (margin >= 15) {
    return `${alternative.name} scores ${Math.round(margin)} points lower overall`;
  }

  // Find the biggest gap
  const categories: SMARTCategory[] = ["safety", "money", "access", "recreation", "talent"];
  let biggestGap = { cat: "" as SMARTCategory, gap: 0 };

  for (const cat of categories) {
    const gap = winnerScore.categories[cat].score - altScore.categories[cat].score;
    if (gap > biggestGap.gap) {
      biggestGap = { cat, gap };
    }
  }

  if (biggestGap.gap > 10) {
    const categoryNames: Record<SMARTCategory, string> = {
      safety: "safety",
      money: "affordability",
      access: "access",
      recreation: "lifestyle",
      talent: "opportunities",
    };
    return `${winner.name} outperforms on ${categoryNames[biggestGap.cat]}`;
  }

  return `${winner.name} has a slight overall edge`;
}

function generateWhenBetter(
  city: CityData,
  score: SMARTScore,
  _profile: ClientProfile
): string {
  // Find what this city excels at
  const categories: SMARTCategory[] = ["safety", "money", "access", "recreation", "talent"];
  let bestCat = { cat: "" as SMARTCategory, score: 0 };

  for (const cat of categories) {
    if (score.categories[cat].score > bestCat.score) {
      bestCat = { cat, score: score.categories[cat].score };
    }
  }

  const scenarios: Record<SMARTCategory, string> = {
    safety: `${city.name} is ideal if safety is your absolute top priority`,
    money: `${city.name} works better if budget is the primary constraint`,
    access: `${city.name} is preferable if transit connectivity is essential`,
    recreation: `${city.name} excels if lifestyle and culture are most important`,
    talent: `${city.name} is better if career opportunities are the deciding factor`,
  };

  return scenarios[bestCat.cat];
}

// ─────────────────────────────────────────────────────────────────────────────
// Verdict Composition
// ─────────────────────────────────────────────────────────────────────────────

function composeSingleCityVerdict(
  city: CityData,
  score: SMARTScore,
  reasons: VerdictReason[],
  config: VerdictConfig
): string {
  const tierDescriptors: Record<string, string> = {
    exceptional: "an exceptional match",
    strong: "a strong match",
    good: "a good match",
    fair: "a reasonable option",
    poor: "not an ideal fit",
  };

  const tierDesc = tierDescriptors[score.tier] || "a potential match";
  const topReason = reasons[0]?.statement || "multiple favorable factors";

  let verdict = `${city.name} is ${tierDesc} for your relocation goals, scoring ${Math.round(score.overall)} out of 100. `;

  if (config.detailedReasoning && reasons.length > 0) {
    verdict += `${topReason}. `;
  }

  if (score.overall >= 80) {
    verdict += "This destination merits serious consideration.";
  } else if (score.overall >= 60) {
    verdict += "This destination has merit but also requires weighing certain tradeoffs.";
  } else {
    verdict += "You may want to explore other options that better align with your priorities.";
  }

  return verdict;
}

function composeComparisonVerdict(
  winner: CityData,
  winnerScore: SMARTScore,
  comparison: CityComparison,
  reasons: VerdictReason[],
  config: VerdictConfig
): string {
  const margin = comparison.winner.margin;
  const runnerUp = comparison.cities[1];
  const topReason = reasons[0]?.statement || "";

  let verdict = "";

  if (margin >= config.clearWinnerThreshold) {
    // Clear winner
    verdict = `${winner.name} is the clear recommendation, scoring ${Math.round(winnerScore.overall)} — `;
    verdict += `${Math.round(margin)} points ahead of ${runnerUp.city.name}. `;
    if (topReason) {
      verdict += `${topReason}. `;
    }
    verdict += "The data strongly supports this choice.";
  } else if (margin >= 5) {
    // Moderate advantage
    verdict = `${winner.name} edges out ${runnerUp.city.name} with a score of ${Math.round(winnerScore.overall)} `;
    verdict += `versus ${Math.round(runnerUp.score.overall)}. `;
    if (topReason) {
      verdict += `${topReason}. `;
    }
    verdict += "While both are viable, the evidence favors this selection.";
  } else {
    // Very close
    verdict = `${winner.name} and ${runnerUp.city.name} are closely matched — `;
    verdict += `${Math.round(winnerScore.overall)} versus ${Math.round(runnerUp.score.overall)}. `;
    if (topReason) {
      verdict += `${topReason}. `;
    }
    verdict += "The final choice may come down to personal preference and timing.";
  }

  return verdict;
}

function calculateVerdictConfidence(comparison: CityComparison, config: VerdictConfig): number {
  const margin = comparison.winner.margin;
  const baseConfidence = comparison.winner.confidence;

  // Higher margin = higher confidence
  let marginBonus = 0;
  if (margin >= config.clearWinnerThreshold * 2) {
    marginBonus = 0.15;
  } else if (margin >= config.clearWinnerThreshold) {
    marginBonus = 0.10;
  } else if (margin >= 5) {
    marginBonus = 0.05;
  }

  return Math.min(1, baseConfidence + marginBonus);
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export { generateSingleCityVerdict, generateComparisonVerdict };
