/**
 * Client Relocation Report Generator
 *
 * Generates the flagship 50-100+ page CLUES Relocation Report.
 * This is the primary client deliverable — a comprehensive analysis
 * of their relocation options covering cities, neighborhoods, real estate,
 * cost of living, environment, schools, and the Cristiano verdict.
 *
 * Uses the report engine (engine.ts) for structured generation
 * and optionally Gamma (gamma.ts) for the premium "Cadillac" version.
 */

import {
  ReportBuilder,
  CLUES_BRAND,
  type ReportDefinition,
  type ReportBrand,
  type ComparisonContent,
  type KeyMetricsContent,
  type ScorecardContent,
  type DataTableContent,
  type ProsConsContent,
  type FaqContent,
} from "./engine";

// ─── Input Types ────────────────────────────────────────────────────────────

export interface RelocationReportInput {
  client: {
    id: string;
    name: string;
    currentCity: string;
    currentState: string;
    familySize?: number;
    budget?: { min: number; max: number };
    priorities?: string[];
  };
  /** Top candidate cities ranked by SMART Score */
  cities: CityAnalysis[];
  /** Top neighborhoods per city */
  neighborhoods?: NeighborhoodAnalysis[];
  /** SMART Score breakdown */
  smartScore?: SmartScoreData;
  /** Cristiano verdict text */
  cristianoVerdict?: string;
  /** Cost of living comparison data */
  costOfLiving?: CostOfLivingComparison;
  /** Environmental risk data */
  environmentalRisks?: EnvironmentalRiskData[];
  /** School quality data */
  schoolData?: SchoolData[];
  /** Real estate market snapshot */
  realEstateData?: RealEstateSnapshot[];
  /** Custom brand (defaults to CLUES brand) */
  brand?: ReportBrand;
}

export interface CityAnalysis {
  city: string;
  state: string;
  country: string;
  overallScore: number;
  rank: number;
  categories: {
    name: string;
    score: number;
    weight: number;
  }[];
  highlights: string[];
  concerns: string[];
  medianHomePrice?: number;
  medianRent?: number;
  population?: number;
  costOfLivingIndex?: number;
  walkScore?: number;
  transitScore?: number;
  imageUrl?: string;
}

export interface NeighborhoodAnalysis {
  name: string;
  city: string;
  state: string;
  score: number;
  medianHomePrice: number;
  medianRent?: number;
  walkScore?: number;
  schoolRating?: number;
  crimeIndex?: number;
  highlights: string[];
}

export interface SmartScoreData {
  overallScore: number;
  maxScore: number;
  categories: {
    name: string;
    score: number;
    maxScore: number;
    weight: number;
    description: string;
  }[];
}

export interface CostOfLivingComparison {
  currentCity: string;
  comparisons: Array<{
    city: string;
    overallIndex: number;
    housing: number;
    groceries: number;
    transportation: number;
    healthcare: number;
    utilities: number;
  }>;
}

export interface EnvironmentalRiskData {
  city: string;
  state: string;
  floodRisk: "low" | "moderate" | "high";
  hurricaneRisk: "low" | "moderate" | "high";
  tornadoRisk: "low" | "moderate" | "high";
  earthquakeRisk: "low" | "moderate" | "high";
  wildfireRisk: "low" | "moderate" | "high";
  airQualityIndex: number;
  noiseLevel?: number;
  averageHighTemp: number;
  averageLowTemp: number;
  annualRainfall: number;
}

export interface SchoolData {
  city: string;
  state: string;
  averageRating: number;
  topSchools: Array<{
    name: string;
    type: "elementary" | "middle" | "high";
    rating: number;
    studentTeacherRatio?: number;
  }>;
}

export interface RealEstateSnapshot {
  city: string;
  state: string;
  medianListPrice: number;
  medianSoldPrice: number;
  averageDaysOnMarket: number;
  activeListings: number;
  pricePerSqft: number;
  yearOverYearChange: number;
  forecastPercent: number;
}

// ─── Generator ──────────────────────────────────────────────────────────────

/**
 * Generate a full Client Relocation Report.
 * Returns a ReportDefinition ready for rendering via the engine.
 */
export function generateRelocationReport(
  input: RelocationReportInput
): ReportDefinition {
  const brand = input.brand ?? CLUES_BRAND;
  const builder = new ReportBuilder("relocation", "relocation", "pdf", brand);

  builder.setClient(input.client.id, input.client.name);

  // ── Cover Page ──
  builder.addCover({
    title: "Relocation Intelligence Report",
    subtitle: `Personalized Analysis for ${input.client.name}`,
    clientName: input.client.name,
    preparedBy: "Olivia — CLUES Intelligence",
    date: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  });

  // ── Table of Contents ──
  builder.addTableOfContents();

  // ── Executive Summary ──
  const topCity = input.cities[0];
  const summaryText = [
    `This report presents a comprehensive relocation analysis for **${input.client.name}**, `,
    `currently based in ${input.client.currentCity}, ${input.client.currentState}. `,
    `After evaluating ${input.cities.length} candidate cities across multiple dimensions, `,
    topCity
      ? `**${topCity.city}, ${topCity.state}** emerged as the top recommendation with a SMART Score of ${topCity.overallScore}/100.`
      : "the analysis results are presented below.",
    input.client.priorities?.length
      ? `\n\n**Client priorities:** ${input.client.priorities.join(", ")}`
      : "",
    input.client.budget
      ? `\n\n**Budget range:** $${input.client.budget.min.toLocaleString()} — $${input.client.budget.max.toLocaleString()}`
      : "",
  ].join("");

  builder.addText("executive_summary", "Executive Summary", summaryText);

  // ── SMART Score Breakdown ──
  if (input.smartScore) {
    builder.addScorecard(
      "smart_score",
      "SMART Score Breakdown",
      input.smartScore.overallScore,
      input.smartScore.maxScore,
      input.smartScore.categories.map((c) => ({
        name: c.name,
        score: c.score,
        maxScore: c.maxScore,
        weight: c.weight,
        description: c.description,
      }))
    );
  }

  // ── City Rankings ──
  if (input.cities.length > 0) {
    builder.addComparison(
      "city_rankings",
      "City Rankings",
      input.cities.map((c) => ({
        name: `${c.city}, ${c.state}`,
        score: c.overallScore,
        maxScore: 100,
        highlights: c.highlights,
        imageUrl: c.imageUrl,
      })),
      "city"
    );

    // Individual city deep dives
    for (const city of input.cities.slice(0, 3)) {
      builder.addProsCons(
        `city_${city.city.toLowerCase().replace(/\s/g, "_")}`,
        `${city.city}, ${city.state}`,
        city.highlights,
        city.concerns
      );
    }
  }

  // ── Cost of Living ──
  if (input.costOfLiving) {
    const colHeaders = [
      "City",
      "Overall",
      "Housing",
      "Groceries",
      "Transport",
      "Healthcare",
      "Utilities",
    ];
    const colRows = input.costOfLiving.comparisons.map((c) => [
      c.city,
      String(c.overallIndex),
      String(c.housing),
      String(c.groceries),
      String(c.transportation),
      String(c.healthcare),
      String(c.utilities),
    ]);

    builder.addDataTable(
      "cost_of_living",
      "Cost of Living Comparison",
      colHeaders,
      colRows,
      `Indexed relative to ${input.costOfLiving.currentCity} (100 = same cost)`
    );
  }

  // ── Real Estate Market ──
  if (input.realEstateData && input.realEstateData.length > 0) {
    const reHeaders = [
      "City",
      "Median List",
      "Median Sold",
      "$/sqft",
      "DOM",
      "Active",
      "YoY %",
      "Forecast",
    ];
    const reRows = input.realEstateData.map((d) => [
      `${d.city}, ${d.state}`,
      `$${d.medianListPrice.toLocaleString()}`,
      `$${d.medianSoldPrice.toLocaleString()}`,
      `$${d.pricePerSqft}`,
      String(d.averageDaysOnMarket),
      String(d.activeListings),
      `${d.yearOverYearChange > 0 ? "+" : ""}${d.yearOverYearChange}%`,
      `${d.forecastPercent > 0 ? "+" : ""}${d.forecastPercent}%`,
    ]);

    builder.addDataTable(
      "real_estate",
      "Real Estate Market Snapshot",
      reHeaders,
      reRows
    );
  }

  // ── Environmental Risks ──
  if (input.environmentalRisks && input.environmentalRisks.length > 0) {
    const envHeaders = [
      "City",
      "Flood",
      "Hurricane",
      "Tornado",
      "Earthquake",
      "Wildfire",
      "AQI",
      "Avg High",
      "Rainfall",
    ];
    const envRows = input.environmentalRisks.map((d) => [
      `${d.city}, ${d.state}`,
      d.floodRisk,
      d.hurricaneRisk,
      d.tornadoRisk,
      d.earthquakeRisk,
      d.wildfireRisk,
      String(d.airQualityIndex),
      `${d.averageHighTemp}°F`,
      `${d.annualRainfall}"`,
    ]);

    builder.addDataTable(
      "environmental",
      "Environmental Risk Assessment",
      envHeaders,
      envRows
    );
  }

  // ── Schools ──
  if (input.schoolData && input.schoolData.length > 0) {
    for (const sd of input.schoolData) {
      const schoolHeaders = ["School", "Type", "Rating", "Student:Teacher"];
      const schoolRows = sd.topSchools.map((s) => [
        s.name,
        s.type,
        `${s.rating}/10`,
        s.studentTeacherRatio ? `${s.studentTeacherRatio}:1` : "N/A",
      ]);

      builder.addDataTable(
        `schools_${sd.city.toLowerCase().replace(/\s/g, "_")}`,
        `Top Schools — ${sd.city}, ${sd.state}`,
        schoolHeaders,
        schoolRows
      );
    }
  }

  // ── Neighborhoods ──
  if (input.neighborhoods && input.neighborhoods.length > 0) {
    const grouped = new Map<string, NeighborhoodAnalysis[]>();
    for (const n of input.neighborhoods) {
      const key = `${n.city}, ${n.state}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(n);
    }

    for (const [cityKey, hoods] of grouped) {
      builder.addComparison(
        `neighborhoods_${cityKey.toLowerCase().replace(/[,\s]/g, "_")}`,
        `Top Neighborhoods — ${cityKey}`,
        hoods.map((h) => ({
          name: h.name,
          score: h.score,
          maxScore: 100,
          highlights: h.highlights,
        })),
        "neighborhood"
      );
    }
  }

  // ── Cristiano Verdict ──
  if (input.cristianoVerdict) {
    builder.addText(
      "cristiano_verdict",
      "The Verdict — Cristiano",
      input.cristianoVerdict
    );
  }

  // ── Disclaimer ──
  builder.addDisclaimer();

  return builder.build();
}
