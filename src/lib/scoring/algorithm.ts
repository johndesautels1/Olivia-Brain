/**
 * SMART Score™ Algorithm
 * Sprint 3.2 — City Matching & Scoring System
 *
 * Implements the 5-category weighted scoring algorithm.
 */

import type {
  SMARTCategory,
  CategoryWeights,
  CategoryScore,
  SMARTScore,
  ScoreFactor,
  ScoreTier,
  MatchQuality,
  ClientProfile,
  CityData,
  SafetyMetrics,
  AffordabilityMetrics,
  AccessMetrics,
  RecreationMetrics,
  TalentMetrics,
} from "./types";
import { DEFAULT_WEIGHTS } from "./types";

// ─── Score Calculation ────────────────────────────────────────────────────────

/**
 * Calculate the complete SMART Score for a city given a client profile.
 */
export function calculateSMARTScore(city: CityData, profile: ClientProfile): SMARTScore {
  const weights = profile.categoryPreferences?.weights ?? DEFAULT_WEIGHTS;

  // Calculate each category score
  const safetyScore = calculateSafetyScore(city.safety, profile);
  const moneyScore = calculateMoneyScore(city.affordability, profile);
  const accessScore = calculateAccessScore(city.access, profile);
  const recreationScore = calculateRecreationScore(city.recreation, profile);
  const talentScore = calculateTalentScore(city.talent, profile);

  // Apply weights
  const categoryScores: Record<SMARTCategory, CategoryScore> = {
    safety: applyWeight(safetyScore, weights.safety),
    money: applyWeight(moneyScore, weights.money),
    access: applyWeight(accessScore, weights.access),
    recreation: applyWeight(recreationScore, weights.recreation),
    talent: applyWeight(talentScore, weights.talent),
  };

  // Calculate overall score
  const overall = Object.values(categoryScores).reduce(
    (sum, cat) => sum + cat.weightedScore,
    0
  );

  // Determine tier and match quality
  const tier = determineTier(overall);
  const matchQuality = determineMatchQuality(overall, categoryScores, profile);

  // Extract top strengths and concerns
  const allFactors = Object.values(categoryScores).flatMap((cat) => cat.factors);
  const strengths = allFactors
    .filter((f) => f.impact > 0)
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 3);
  const concerns = allFactors
    .filter((f) => f.impact < 0)
    .sort((a, b) => a.impact - b.impact)
    .slice(0, 3);

  // Calculate overall confidence
  const confidence =
    Object.values(categoryScores).reduce((sum, cat) => sum + cat.confidence, 0) / 5;

  return {
    overall,
    categories: categoryScores,
    tier,
    matchQuality,
    strengths,
    concerns,
    confidence,
    calculatedAt: new Date(),
  };
}

function applyWeight(score: CategoryScore, weight: number): CategoryScore {
  return {
    ...score,
    weight,
    weightedScore: score.score * weight,
  };
}

// ─── Category Scoring ─────────────────────────────────────────────────────────

/**
 * Safety & Security scoring.
 */
function calculateSafetyScore(metrics: SafetyMetrics, profile: ClientProfile): CategoryScore {
  const factors: ScoreFactor[] = [];
  let totalScore = 0;
  let totalWeight = 0;

  // Crime Index (inverted - lower is better)
  const crimeScore = 100 - Math.min(metrics.crimeIndex, 100);
  factors.push({
    name: "Crime Rate",
    value: metrics.crimeIndex,
    impact: crimeScore - 50,
    source: "crime_data",
    weight: 0.25,
  });
  totalScore += crimeScore * 0.25;
  totalWeight += 0.25;

  // Safety Index
  factors.push({
    name: "Safety Index",
    value: metrics.safetyIndex,
    impact: metrics.safetyIndex - 50,
    source: "safety_index",
    weight: 0.2,
  });
  totalScore += metrics.safetyIndex * 0.2;
  totalWeight += 0.2;

  // Healthcare Quality
  factors.push({
    name: "Healthcare Quality",
    value: metrics.healthcareQuality,
    impact: metrics.healthcareQuality - 50,
    source: "healthcare_data",
    weight: 0.2,
  });
  totalScore += metrics.healthcareQuality * 0.2;
  totalWeight += 0.2;

  // Political Stability
  factors.push({
    name: "Political Stability",
    value: metrics.politicalStability,
    impact: metrics.politicalStability - 50,
    source: "stability_index",
    weight: 0.15,
  });
  totalScore += metrics.politicalStability * 0.15;
  totalWeight += 0.15;

  // Natural Disaster Risk (inverted)
  const disasterScore = 100 - Math.min(metrics.naturalDisasterRisk, 100);
  factors.push({
    name: "Natural Disaster Risk",
    value: metrics.naturalDisasterRisk,
    impact: disasterScore - 50,
    source: "disaster_data",
    weight: 0.1,
  });
  totalScore += disasterScore * 0.1;
  totalWeight += 0.1;

  // Air Quality
  factors.push({
    name: "Air Quality",
    value: metrics.airQuality,
    impact: metrics.airQuality - 50,
    source: "air_quality",
    weight: 0.1,
  });
  totalScore += metrics.airQuality * 0.1;
  totalWeight += 0.1;

  // Apply family safety bonus if applicable
  if (profile.demographics.children > 0) {
    const familyBonus = metrics.safetyIndex > 70 ? 5 : metrics.safetyIndex < 40 ? -10 : 0;
    totalScore += familyBonus;
    if (familyBonus !== 0) {
      factors.push({
        name: "Family Safety Consideration",
        value: familyBonus > 0 ? "Safe for families" : "Concerns for families",
        impact: familyBonus,
        source: "profile_match",
        weight: 0,
      });
    }
  }

  return {
    category: "safety",
    score: Math.min(100, Math.max(0, totalScore / totalWeight)),
    weight: 0,
    weightedScore: 0,
    factors,
    confidence: calculateDataConfidence(metrics as unknown as Record<string, number>),
    dataAge: "fresh",
  };
}

/**
 * Money & Affordability scoring.
 */
function calculateMoneyScore(metrics: AffordabilityMetrics, profile: ClientProfile): CategoryScore {
  const factors: ScoreFactor[] = [];
  let totalScore = 0;
  let totalWeight = 0;

  // Cost of Living Index (inverted - lower is better for budget-conscious)
  const colScore = 100 - Math.min(metrics.costOfLivingIndex / 2, 100);
  factors.push({
    name: "Cost of Living",
    value: metrics.costOfLivingIndex,
    impact: colScore - 50,
    source: "col_data",
    weight: 0.25,
  });
  totalScore += colScore * 0.25;
  totalWeight += 0.25;

  // Rent Index (inverted)
  const rentScore = 100 - Math.min(metrics.rentIndex / 2, 100);
  factors.push({
    name: "Rent Costs",
    value: metrics.rentIndex,
    impact: rentScore - 50,
    source: "rent_data",
    weight: 0.2,
  });
  totalScore += rentScore * 0.2;
  totalWeight += 0.2;

  // Purchasing Power
  factors.push({
    name: "Purchasing Power",
    value: metrics.purchasingPower,
    impact: metrics.purchasingPower - 50,
    source: "purchasing_power",
    weight: 0.2,
  });
  totalScore += metrics.purchasingPower * 0.2;
  totalWeight += 0.2;

  // Housing Price Index (inverted for buyers)
  if (profile.financial?.housingType.includes("buy")) {
    const housingScore = 100 - Math.min(metrics.housingPriceIndex / 2, 100);
    factors.push({
      name: "Housing Prices",
      value: metrics.housingPriceIndex,
      impact: housingScore - 50,
      source: "housing_data",
      weight: 0.2,
    });
    totalScore += housingScore * 0.2;
    totalWeight += 0.2;
  } else {
    totalWeight += 0.2;
    totalScore += 50 * 0.2; // Neutral for renters
  }

  // Tax Burden (inverted if tax sensitive)
  const taxSensitivity = profile.financial?.taxSensitivity ?? "medium";
  const taxMultiplier = taxSensitivity === "high" ? 1.5 : taxSensitivity === "low" ? 0.5 : 1;
  const taxScore = 100 - Math.min(metrics.taxBurden, 100);
  factors.push({
    name: "Tax Burden",
    value: metrics.taxBurden,
    impact: (taxScore - 50) * taxMultiplier,
    source: "tax_data",
    weight: 0.15,
  });
  totalScore += taxScore * 0.15;
  totalWeight += 0.15;

  return {
    category: "money",
    score: Math.min(100, Math.max(0, totalScore / totalWeight)),
    weight: 0,
    weightedScore: 0,
    factors,
    confidence: calculateDataConfidence(metrics as unknown as Record<string, number>),
    dataAge: "fresh",
  };
}

/**
 * Access & Connectivity scoring.
 */
function calculateAccessScore(metrics: AccessMetrics, profile: ClientProfile): CategoryScore {
  const factors: ScoreFactor[] = [];
  let totalScore = 0;
  let totalWeight = 0;

  const urbanity = profile.lifestyle?.urbanity ?? "flexible";
  const commuteModes = profile.lifestyle?.commute?.mode ?? ["any"];

  // Transit Score (weighted by urbanity preference)
  const transitWeight = urbanity === "urban" ? 0.3 : urbanity === "suburban" ? 0.15 : 0.1;
  factors.push({
    name: "Public Transit",
    value: metrics.transitScore,
    impact: metrics.transitScore - 50,
    source: "transit_score",
    weight: transitWeight,
  });
  totalScore += metrics.transitScore * transitWeight;
  totalWeight += transitWeight;

  // Walk Score
  const walkWeight = urbanity === "urban" ? 0.25 : urbanity === "suburban" ? 0.15 : 0.05;
  factors.push({
    name: "Walkability",
    value: metrics.walkScore,
    impact: metrics.walkScore - 50,
    source: "walk_score",
    weight: walkWeight,
  });
  totalScore += metrics.walkScore * walkWeight;
  totalWeight += walkWeight;

  // Bike Score
  if (commuteModes.includes("bike") || commuteModes.includes("any")) {
    factors.push({
      name: "Bikeability",
      value: metrics.bikeScore,
      impact: metrics.bikeScore - 50,
      source: "bike_score",
      weight: 0.1,
    });
    totalScore += metrics.bikeScore * 0.1;
    totalWeight += 0.1;
  }

  // Airport Access
  factors.push({
    name: "Airport Access",
    value: metrics.airportAccess,
    impact: metrics.airportAccess - 50,
    source: "airport_data",
    weight: 0.15,
  });
  totalScore += metrics.airportAccess * 0.15;
  totalWeight += 0.15;

  // Internet Speed (important for remote workers)
  const isRemote = profile.demographics?.workStatus === "remote";
  const internetWeight = isRemote ? 0.25 : 0.1;
  factors.push({
    name: "Internet Speed",
    value: metrics.internetSpeed,
    impact: metrics.internetSpeed - 50,
    source: "internet_data",
    weight: internetWeight,
  });
  totalScore += metrics.internetSpeed * internetWeight;
  totalWeight += internetWeight;

  // International Connectivity
  factors.push({
    name: "International Connectivity",
    value: metrics.internationalConnectivity,
    impact: metrics.internationalConnectivity - 50,
    source: "connectivity_data",
    weight: 0.1,
  });
  totalScore += metrics.internationalConnectivity * 0.1;
  totalWeight += 0.1;

  return {
    category: "access",
    score: Math.min(100, Math.max(0, totalScore / totalWeight)),
    weight: 0,
    weightedScore: 0,
    factors,
    confidence: calculateDataConfidence(metrics as unknown as Record<string, number>),
    dataAge: "fresh",
  };
}

/**
 * Recreation & Lifestyle scoring.
 */
function calculateRecreationScore(metrics: RecreationMetrics, profile: ClientProfile): CategoryScore {
  const factors: ScoreFactor[] = [];
  let totalScore = 0;
  let totalWeight = 0;

  const lifestyle = profile.lifestyle ?? { amenities: [], culture: [], outdoors: [], climate: [] };

  // Climate Match
  if (lifestyle.climate.length > 0) {
    factors.push({
      name: "Climate",
      value: metrics.climateScore,
      impact: metrics.climateScore - 50,
      source: "climate_data",
      weight: 0.2,
    });
    totalScore += metrics.climateScore * 0.2;
    totalWeight += 0.2;
  } else {
    totalScore += 60 * 0.2;
    totalWeight += 0.2;
  }

  // Dining Scene
  if (lifestyle.amenities.includes("restaurants") || lifestyle.amenities.length === 0) {
    factors.push({
      name: "Restaurant Scene",
      value: metrics.restaurantDensity,
      impact: metrics.restaurantDensity - 50,
      source: "restaurant_data",
      weight: 0.15,
    });
    totalScore += metrics.restaurantDensity * 0.15;
    totalWeight += 0.15;
  }

  // Nightlife
  if (lifestyle.amenities.includes("nightlife")) {
    factors.push({
      name: "Nightlife",
      value: metrics.nightlifeScore,
      impact: metrics.nightlifeScore - 50,
      source: "nightlife_data",
      weight: 0.15,
    });
    totalScore += metrics.nightlifeScore * 0.15;
    totalWeight += 0.15;
  }

  // Outdoor Activities
  if (lifestyle.outdoors.length > 0) {
    factors.push({
      name: "Outdoor Activities",
      value: metrics.outdoorScore,
      impact: metrics.outdoorScore - 50,
      source: "outdoor_data",
      weight: 0.2,
    });
    totalScore += metrics.outdoorScore * 0.2;
    totalWeight += 0.2;
  }

  // Cultural Scene
  if (lifestyle.culture.length > 0) {
    factors.push({
      name: "Cultural Scene",
      value: metrics.culturalScore,
      impact: metrics.culturalScore - 50,
      source: "cultural_data",
      weight: 0.2,
    });
    totalScore += metrics.culturalScore * 0.2;
    totalWeight += 0.2;
  }

  // Beach Access (if preferred)
  if (lifestyle.outdoors.includes("beach") || lifestyle.climate.includes("coastal")) {
    factors.push({
      name: "Beach Access",
      value: metrics.beachAccess,
      impact: metrics.beachAccess - 50,
      source: "beach_data",
      weight: 0.1,
    });
    totalScore += metrics.beachAccess * 0.1;
    totalWeight += 0.1;
  }

  // Ensure minimum weight
  if (totalWeight < 0.5) {
    totalScore += 50 * (0.5 - totalWeight);
    totalWeight = 0.5;
  }

  return {
    category: "recreation",
    score: Math.min(100, Math.max(0, totalScore / totalWeight)),
    weight: 0,
    weightedScore: 0,
    factors,
    confidence: calculateDataConfidence(metrics as unknown as Record<string, number>),
    dataAge: "fresh",
  };
}

/**
 * Talent & Opportunity scoring.
 */
function calculateTalentScore(metrics: TalentMetrics, profile: ClientProfile): CategoryScore {
  const factors: ScoreFactor[] = [];
  let totalScore = 0;
  let totalWeight = 0;

  const workStatus = profile.demographics?.workStatus ?? "employed";

  // Job Market Strength
  if (workStatus === "seeking" || workStatus === "employed") {
    factors.push({
      name: "Job Market",
      value: metrics.jobMarketStrength,
      impact: metrics.jobMarketStrength - 50,
      source: "job_data",
      weight: 0.3,
    });
    totalScore += metrics.jobMarketStrength * 0.3;
    totalWeight += 0.3;
  }

  // Tech Hub Score (for tech workers)
  factors.push({
    name: "Tech Industry",
    value: metrics.techHubScore,
    impact: metrics.techHubScore - 50,
    source: "tech_data",
    weight: 0.2,
  });
  totalScore += metrics.techHubScore * 0.2;
  totalWeight += 0.2;

  // Entrepreneurship Index
  if (workStatus === "self_employed") {
    factors.push({
      name: "Entrepreneurship Environment",
      value: metrics.entrepreneurshipIndex,
      impact: metrics.entrepreneurshipIndex - 50,
      source: "startup_data",
      weight: 0.25,
    });
    totalScore += metrics.entrepreneurshipIndex * 0.25;
    totalWeight += 0.25;

    // Startup Ecosystem
    factors.push({
      name: "Startup Ecosystem",
      value: metrics.startupEcosystem,
      impact: metrics.startupEcosystem - 50,
      source: "ecosystem_data",
      weight: 0.15,
    });
    totalScore += metrics.startupEcosystem * 0.15;
    totalWeight += 0.15;
  }

  // Education Quality (for families)
  if (profile.demographics?.children > 0) {
    factors.push({
      name: "Education Quality",
      value: metrics.educationQuality,
      impact: metrics.educationQuality - 50,
      source: "education_data",
      weight: 0.2,
    });
    totalScore += metrics.educationQuality * 0.2;
    totalWeight += 0.2;
  }

  // Remote Work Friendliness
  if (workStatus === "remote") {
    factors.push({
      name: "Remote Work Environment",
      value: metrics.remoteWorkFriendliness,
      impact: metrics.remoteWorkFriendliness - 50,
      source: "remote_data",
      weight: 0.3,
    });
    totalScore += metrics.remoteWorkFriendliness * 0.3;
    totalWeight += 0.3;
  }

  // Ensure minimum weight
  if (totalWeight < 0.5) {
    totalScore += 50 * (0.5 - totalWeight);
    totalWeight = 0.5;
  }

  return {
    category: "talent",
    score: Math.min(100, Math.max(0, totalScore / totalWeight)),
    weight: 0,
    weightedScore: 0,
    factors,
    confidence: calculateDataConfidence(metrics as unknown as Record<string, number>),
    dataAge: "fresh",
  };
}

// ─── Classification ───────────────────────────────────────────────────────────

export function calculateCategoryScore(
  category: SMARTCategory,
  city: CityData,
  profile: ClientProfile,
  weight: number
): CategoryScore {
  switch (category) {
    case "safety":
      return applyWeight(calculateSafetyScore(city.safety, profile), weight);
    case "money":
      return applyWeight(calculateMoneyScore(city.affordability, profile), weight);
    case "access":
      return applyWeight(calculateAccessScore(city.access, profile), weight);
    case "recreation":
      return applyWeight(calculateRecreationScore(city.recreation, profile), weight);
    case "talent":
      return applyWeight(calculateTalentScore(city.talent, profile), weight);
  }
}

export function calculateOverallScore(categories: Record<SMARTCategory, CategoryScore>): number {
  return Object.values(categories).reduce((sum, cat) => sum + cat.weightedScore, 0);
}

export function classifyScoreTier(score: number): ScoreTier {
  return determineTier(score);
}

export function classifyMatchQuality(
  overall: number,
  categories: Record<SMARTCategory, CategoryScore>,
  profile: ClientProfile
): MatchQuality {
  return determineMatchQuality(overall, categories, profile);
}

function determineTier(score: number): ScoreTier {
  if (score >= 85) return "exceptional";
  if (score >= 70) return "strong";
  if (score >= 55) return "good";
  if (score >= 40) return "fair";
  return "poor";
}

function determineMatchQuality(
  overall: number,
  categories: Record<SMARTCategory, CategoryScore>,
  profile: ClientProfile
): MatchQuality {
  // Check for dealbreaker violations
  const dealbreakers = profile.dealbreakers ?? [];
  for (const db of dealbreakers) {
    const catScore = categories[db.category];
    if (catScore.score < 30) {
      return "poor_match"; // Dealbreaker category is too low
    }
  }

  // Check must-haves
  const mustHaves = profile.mustHaves ?? [];
  let mustHavesMet = 0;
  for (const mh of mustHaves) {
    const catScore = categories[mh.category];
    if (catScore.score >= 60) {
      mustHavesMet++;
    }
  }
  const mustHaveRatio = mustHaves.length > 0 ? mustHavesMet / mustHaves.length : 1;

  // Combine overall score with must-have satisfaction
  const adjustedScore = overall * 0.7 + mustHaveRatio * 100 * 0.3;

  if (adjustedScore >= 80) return "excellent_match";
  if (adjustedScore >= 65) return "good_match";
  if (adjustedScore >= 50) return "moderate_match";
  if (adjustedScore >= 35) return "weak_match";
  return "poor_match";
}

function calculateDataConfidence(metrics: Record<string, number>): number {
  // Check how many metrics have valid data
  const values = Object.values(metrics);
  const validCount = values.filter((v) => v > 0 && v <= 100).length;
  return validCount / values.length;
}
