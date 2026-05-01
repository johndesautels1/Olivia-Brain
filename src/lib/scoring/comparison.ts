/**
 * City Comparison Engine
 * Sprint 3.2 — SMART Score™ System
 *
 * Compares multiple cities and generates ranked recommendations.
 */

import type {
  SMARTCategory,
  SMARTScore,
  CityData,
  ClientProfile,
  CityComparison,
  CategoryComparison,
  TradeoffAnalysis,
} from "./types";
import { calculateSMARTScore } from "./algorithm";

/**
 * Compare multiple cities and generate a comprehensive comparison.
 */
export function compareCities(
  cities: CityData[],
  profile: ClientProfile
): CityComparison {
  // Score all cities
  const scoredCities = cities.map((city) => ({
    city,
    score: calculateSMARTScore(city, profile),
    rank: 0,
  }));

  // Sort by overall score (descending)
  scoredCities.sort((a, b) => b.score.overall - a.score.overall);

  // Assign ranks
  scoredCities.forEach((item, index) => {
    item.rank = index + 1;
  });

  // Determine winner
  const winner = {
    cityId: scoredCities[0].city.id,
    margin: scoredCities.length > 1
      ? scoredCities[0].score.overall - scoredCities[1].score.overall
      : 100,
    confidence: scoredCities[0].score.confidence,
  };

  // Generate category comparisons
  const categoryComparison = generateCategoryComparison(scoredCities);

  // Generate tradeoff analysis
  const tradeoffs = generateTradeoffAnalysis(scoredCities, profile);

  // Generate summary
  const summary = generateComparisonSummary(scoredCities, winner, categoryComparison);

  return {
    cities: scoredCities,
    winner,
    categoryComparison,
    tradeoffs,
    summary,
  };
}

/**
 * Generate category-by-category comparison.
 */
function generateCategoryComparison(
  scoredCities: Array<{ city: CityData; score: SMARTScore; rank: number }>
): Record<SMARTCategory, CategoryComparison> {
  const categories: SMARTCategory[] = ["safety", "money", "access", "recreation", "talent"];
  const result: Record<string, CategoryComparison> = {};

  for (const category of categories) {
    const scores = scoredCities.map((sc) => ({
      cityId: sc.city.id,
      score: sc.score.categories[category].score,
    }));

    const sortedScores = [...scores].sort((a, b) => b.score - a.score);
    const winnerId = sortedScores[0].cityId;
    const margin = sortedScores.length > 1
      ? sortedScores[0].score - sortedScores[1].score
      : 100;

    result[category] = {
      category,
      scores,
      winner: winnerId,
      margin,
    };
  }

  return result as Record<SMARTCategory, CategoryComparison>;
}

/**
 * Generate tradeoff analysis between cities.
 */
function generateTradeoffAnalysis(
  scoredCities: Array<{ city: CityData; score: SMARTScore; rank: number }>,
  _profile: ClientProfile
): TradeoffAnalysis[] {
  if (scoredCities.length < 2) return [];

  const tradeoffs: TradeoffAnalysis[] = [];

  // Find factors where cities differ significantly
  const factorMap = new Map<string, Array<{ cityId: string; value: number; cityName: string }>>();

  for (const sc of scoredCities) {
    for (const category of Object.values(sc.score.categories)) {
      for (const factor of category.factors) {
        if (!factorMap.has(factor.name)) {
          factorMap.set(factor.name, []);
        }
        factorMap.get(factor.name)!.push({
          cityId: sc.city.id,
          value: factor.impact + 50, // Convert impact to score
          cityName: sc.city.name,
        });
      }
    }
  }

  // Find significant differences
  for (const [factorName, values] of factorMap.entries()) {
    if (values.length < 2) continue;

    const sorted = [...values].sort((a, b) => b.value - a.value);
    const spread = sorted[0].value - sorted[sorted.length - 1].value;

    // Only include significant tradeoffs (spread > 20 points)
    if (spread > 20) {
      tradeoffs.push({
        factor: factorName,
        cities: sorted.map((v) => ({
          cityId: v.cityId,
          value: Math.round(v.value),
          advantage: v.value === sorted[0].value,
        })),
        insight: generateTradeoffInsight(factorName, sorted[0].cityName, sorted[sorted.length - 1].cityName, spread),
      });
    }
  }

  // Return top 5 most significant tradeoffs
  return tradeoffs
    .sort((a, b) => {
      const spreadA = Math.max(...a.cities.map((c) => c.value as number)) - Math.min(...a.cities.map((c) => c.value as number));
      const spreadB = Math.max(...b.cities.map((c) => c.value as number)) - Math.min(...b.cities.map((c) => c.value as number));
      return spreadB - spreadA;
    })
    .slice(0, 5);
}

function generateTradeoffInsight(factor: string, bestCity: string, worstCity: string, spread: number): string {
  if (spread > 40) {
    return `${bestCity} significantly outperforms ${worstCity} on ${factor.toLowerCase()}`;
  } else if (spread > 25) {
    return `${bestCity} has a notable advantage in ${factor.toLowerCase()} compared to ${worstCity}`;
  } else {
    return `There's a moderate difference in ${factor.toLowerCase()} between ${bestCity} and ${worstCity}`;
  }
}

/**
 * Generate comparison summary text.
 */
function generateComparisonSummary(
  scoredCities: Array<{ city: CityData; score: SMARTScore; rank: number }>,
  winner: { cityId: string; margin: number; confidence: number },
  categoryComparison: Record<SMARTCategory, CategoryComparison>
): string {
  if (scoredCities.length === 0) {
    return "No cities to compare.";
  }

  if (scoredCities.length === 1) {
    const city = scoredCities[0];
    return `${city.city.name} scores ${Math.round(city.score.overall)} overall, classified as a ${city.score.matchQuality.replace(/_/g, " ")}.`;
  }

  const winnerCity = scoredCities.find((sc) => sc.city.id === winner.cityId)!;
  const runnerUp = scoredCities[1];

  // Count category wins
  const categoryWins: Record<string, number> = {};
  for (const cat of Object.values(categoryComparison)) {
    categoryWins[cat.winner] = (categoryWins[cat.winner] || 0) + 1;
  }

  const winnerCategoryCount = categoryWins[winner.cityId] || 0;

  let summaryParts: string[] = [];

  // Winner declaration
  if (winner.margin >= 15) {
    summaryParts.push(
      `${winnerCity.city.name} is the clear recommendation with a score of ${Math.round(winnerCity.score.overall)}, ` +
      `${Math.round(winner.margin)} points ahead of ${runnerUp.city.name}.`
    );
  } else if (winner.margin >= 5) {
    summaryParts.push(
      `${winnerCity.city.name} edges out ${runnerUp.city.name} with a score of ${Math.round(winnerCity.score.overall)} ` +
      `vs ${Math.round(runnerUp.score.overall)}.`
    );
  } else {
    summaryParts.push(
      `${winnerCity.city.name} and ${runnerUp.city.name} are closely matched. ` +
      `${winnerCity.city.name} has a slight edge at ${Math.round(winnerCity.score.overall)} ` +
      `vs ${Math.round(runnerUp.score.overall)}.`
    );
  }

  // Category dominance
  if (winnerCategoryCount >= 4) {
    summaryParts.push(`${winnerCity.city.name} leads in ${winnerCategoryCount} of 5 categories.`);
  } else if (winnerCategoryCount >= 3) {
    summaryParts.push(`${winnerCity.city.name} wins ${winnerCategoryCount} categories but faces competition in others.`);
  }

  // Key strengths
  if (winnerCity.score.strengths.length > 0) {
    const topStrength = winnerCity.score.strengths[0];
    summaryParts.push(`Key strength: ${topStrength.name}.`);
  }

  // Key concern if any
  if (winnerCity.score.concerns.length > 0 && winnerCity.score.concerns[0].impact < -20) {
    const topConcern = winnerCity.score.concerns[0];
    summaryParts.push(`Note: ${topConcern.name} may require attention.`);
  }

  return summaryParts.join(" ");
}

/**
 * Generate head-to-head comparison between two specific cities.
 */
export function headToHead(
  city1: CityData,
  city2: CityData,
  profile: ClientProfile
): {
  winner: CityData;
  loser: CityData;
  margin: number;
  winnerScore: SMARTScore;
  loserScore: SMARTScore;
  categoryWinners: Record<SMARTCategory, string>;
  summary: string;
} {
  const score1 = calculateSMARTScore(city1, profile);
  const score2 = calculateSMARTScore(city2, profile);

  const winner = score1.overall >= score2.overall ? city1 : city2;
  const loser = winner === city1 ? city2 : city1;
  const winnerScore = winner === city1 ? score1 : score2;
  const loserScore = winner === city1 ? score2 : score1;
  const margin = Math.abs(score1.overall - score2.overall);

  const categoryWinners: Record<string, string> = {};
  const categories: SMARTCategory[] = ["safety", "money", "access", "recreation", "talent"];

  for (const cat of categories) {
    const cat1 = score1.categories[cat].score;
    const cat2 = score2.categories[cat].score;
    categoryWinners[cat] = cat1 >= cat2 ? city1.id : city2.id;
  }

  const city1Wins = Object.values(categoryWinners).filter((id) => id === city1.id).length;
  const city2Wins = 5 - city1Wins;

  let summary: string;
  if (margin >= 15) {
    summary = `${winner.name} decisively beats ${loser.name} (${Math.round(winnerScore.overall)} vs ${Math.round(loserScore.overall)}), winning ${winner === city1 ? city1Wins : city2Wins} of 5 categories.`;
  } else if (margin >= 5) {
    summary = `${winner.name} outperforms ${loser.name} (${Math.round(winnerScore.overall)} vs ${Math.round(loserScore.overall)}), though the competition is closer in some categories.`;
  } else {
    summary = `${winner.name} and ${loser.name} are very closely matched (${Math.round(winnerScore.overall)} vs ${Math.round(loserScore.overall)}). The choice may come down to personal preference.`;
  }

  return {
    winner,
    loser,
    margin,
    winnerScore,
    loserScore,
    categoryWinners: categoryWinners as Record<SMARTCategory, string>,
    summary,
  };
}

/**
 * Rank cities by a specific category.
 */
export function rankByCategory(
  cities: CityData[],
  category: SMARTCategory,
  profile: ClientProfile
): Array<{ city: CityData; categoryScore: number; rank: number }> {
  const scored = cities.map((city) => {
    const fullScore = calculateSMARTScore(city, profile);
    return {
      city,
      categoryScore: fullScore.categories[category].score,
      rank: 0,
    };
  });

  scored.sort((a, b) => b.categoryScore - a.categoryScore);
  scored.forEach((item, index) => {
    item.rank = index + 1;
  });

  return scored;
}

export { compareCities, headToHead, rankByCategory };
