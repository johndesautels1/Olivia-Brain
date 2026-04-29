/**
 * Per-Market FAQ Generator
 *
 * Generates market-specific FAQ documents covering common relocation
 * questions for each target city. These serve as standalone reference
 * guides and as sections within larger reports.
 *
 * FAQ categories: real estate, cost of living, lifestyle, schools,
 * safety, environment, immigration/visa, transportation, healthcare.
 */

import {
  ReportBuilder,
  CLUES_BRAND,
  type ReportDefinition,
  type ReportBrand,
  type FaqContent,
} from "./engine";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MarketFaqInput {
  city: string;
  state: string;
  country: string;
  /** Market data to drive FAQ answers */
  data: MarketFaqData;
  /** Custom brand (defaults to CLUES) */
  brand?: ReportBrand;
  /** Additional custom Q&A pairs to append */
  customQuestions?: Array<{ question: string; answer: string }>;
}

export interface MarketFaqData {
  medianHomePrice?: number;
  medianRent?: number;
  pricePerSqft?: number;
  averageDaysOnMarket?: number;
  yearOverYearChange?: number;
  costOfLivingIndex?: number;
  walkScore?: number;
  transitScore?: number;
  population?: number;
  averageSchoolRating?: number;
  crimeIndex?: number;
  airQualityIndex?: number;
  averageHighTemp?: number;
  averageLowTemp?: number;
  annualRainfall?: number;
  stateTaxRate?: number;
  propertyTaxRate?: number;
  majorEmployers?: string[];
  topNeighborhoods?: string[];
}

export type FaqCategory =
  | "real_estate"
  | "cost_of_living"
  | "lifestyle"
  | "schools"
  | "safety"
  | "environment"
  | "transportation"
  | "healthcare"
  | "immigration";

// ─── FAQ Template Functions ─────────────────────────────────────────────────

function realEstateQuestions(
  city: string,
  state: string,
  data: MarketFaqData
): FaqContent["questions"] {
  const qs: FaqContent["questions"] = [];

  qs.push({
    question: `What is the median home price in ${city}, ${state}?`,
    answer: data.medianHomePrice
      ? `The current median home price in ${city} is approximately $${data.medianHomePrice.toLocaleString()}. ` +
        (data.yearOverYearChange
          ? `Prices have changed ${data.yearOverYearChange > 0 ? "+" : ""}${data.yearOverYearChange}% year-over-year.`
          : "")
      : `Current median home price data is being compiled. Contact your CLUES advisor for the latest figures.`,
  });

  qs.push({
    question: `What is the average rent in ${city}?`,
    answer: data.medianRent
      ? `Average rent in ${city} is approximately $${data.medianRent.toLocaleString()}/month. Prices vary significantly by neighborhood and unit size.`
      : `Rental market data is being compiled. Contact your CLUES advisor for current availability and pricing.`,
  });

  qs.push({
    question: `How competitive is the ${city} housing market?`,
    answer: data.averageDaysOnMarket
      ? `Properties in ${city} average ${data.averageDaysOnMarket} days on market. ` +
        (data.averageDaysOnMarket < 30
          ? "This is a competitive seller's market — be prepared to act quickly."
          : data.averageDaysOnMarket < 60
            ? "The market is moderately active with reasonable time for decision-making."
            : "Buyers have more leverage in the current market with extended listing times.")
      : `Market competitiveness data is being updated. Your CLUES advisor can provide current conditions.`,
  });

  if (data.pricePerSqft) {
    qs.push({
      question: `What is the price per square foot in ${city}?`,
      answer: `The average price per square foot in ${city} is approximately $${data.pricePerSqft}. This varies by neighborhood, property type, and condition.`,
    });
  }

  if (data.propertyTaxRate) {
    qs.push({
      question: `What are property taxes like in ${city}?`,
      answer: `The effective property tax rate in ${city}, ${state} is approximately ${data.propertyTaxRate}%. On a $${(data.medianHomePrice ?? 400000).toLocaleString()} home, that's roughly $${Math.round(((data.medianHomePrice ?? 400000) * data.propertyTaxRate) / 100).toLocaleString()}/year.`,
    });
  }

  if (data.topNeighborhoods && data.topNeighborhoods.length > 0) {
    qs.push({
      question: `What are the best neighborhoods in ${city}?`,
      answer: `Top-rated neighborhoods include: ${data.topNeighborhoods.join(", ")}. The best fit depends on your priorities — commute, schools, walkability, and budget all factor in.`,
    });
  }

  return qs;
}

function costOfLivingQuestions(
  city: string,
  state: string,
  data: MarketFaqData
): FaqContent["questions"] {
  const qs: FaqContent["questions"] = [];

  qs.push({
    question: `What is the cost of living in ${city} compared to the national average?`,
    answer: data.costOfLivingIndex
      ? `${city}'s cost of living index is ${data.costOfLivingIndex} (national average = 100). ` +
        (data.costOfLivingIndex > 110
          ? "This is above the national average — budget accordingly."
          : data.costOfLivingIndex < 90
            ? "This is below the national average — your dollar goes further here."
            : "This is roughly in line with the national average.")
      : `Cost of living data is being compiled. Your CLUES advisor can provide a detailed breakdown.`,
  });

  if (data.stateTaxRate !== undefined) {
    qs.push({
      question: `What is the state income tax in ${state}?`,
      answer:
        data.stateTaxRate === 0
          ? `${state} has no state income tax, which can significantly reduce your overall tax burden.`
          : `${state}'s state income tax rate is approximately ${data.stateTaxRate}%. Consult a tax professional for your specific situation.`,
    });
  }

  return qs;
}

function lifestyleQuestions(
  city: string,
  data: MarketFaqData
): FaqContent["questions"] {
  const qs: FaqContent["questions"] = [];

  if (data.walkScore) {
    qs.push({
      question: `How walkable is ${city}?`,
      answer: `${city} has a Walk Score of ${data.walkScore}/100. ` +
        (data.walkScore >= 70
          ? "Most errands can be accomplished on foot."
          : data.walkScore >= 50
            ? "Some errands can be accomplished on foot, but a car is helpful."
            : "A car is recommended for most daily errands.") +
        (data.transitScore
          ? ` The Transit Score is ${data.transitScore}/100.`
          : ""),
    });
  }

  if (data.majorEmployers && data.majorEmployers.length > 0) {
    qs.push({
      question: `What are the major employers in ${city}?`,
      answer: `Major employers include: ${data.majorEmployers.join(", ")}. The job market varies by industry — your CLUES advisor can help assess opportunities in your field.`,
    });
  }

  if (data.population) {
    qs.push({
      question: `What is the population of ${city}?`,
      answer: `${city} has a population of approximately ${data.population.toLocaleString()}. ` +
        (data.population > 1_000_000
          ? "It's a major metropolitan area with extensive amenities and services."
          : data.population > 200_000
            ? "It's a mid-size city with a good balance of amenities and manageable scale."
            : "It's a smaller city with a close-knit community feel."),
    });
  }

  return qs;
}

function safetyQuestions(
  city: string,
  data: MarketFaqData
): FaqContent["questions"] {
  const qs: FaqContent["questions"] = [];

  if (data.crimeIndex !== undefined) {
    qs.push({
      question: `How safe is ${city}?`,
      answer: `${city}'s crime index is ${data.crimeIndex} (national average = 100). ` +
        (data.crimeIndex < 80
          ? "The city is safer than the national average."
          : data.crimeIndex < 120
            ? "Crime levels are roughly on par with the national average."
            : "Some areas have above-average crime rates — neighborhood selection is important.") +
        " Crime varies significantly by neighborhood. Your CLUES advisor can provide area-specific safety data.",
    });
  }

  return qs;
}

function environmentQuestions(
  city: string,
  data: MarketFaqData
): FaqContent["questions"] {
  const qs: FaqContent["questions"] = [];

  if (data.averageHighTemp && data.averageLowTemp) {
    qs.push({
      question: `What is the climate like in ${city}?`,
      answer: `Average high temperatures range around ${data.averageHighTemp}°F, with lows near ${data.averageLowTemp}°F. Annual rainfall is approximately ${data.annualRainfall ?? "N/A"} inches.`,
    });
  }

  if (data.airQualityIndex !== undefined) {
    qs.push({
      question: `What is the air quality in ${city}?`,
      answer: `The average Air Quality Index (AQI) in ${city} is ${data.airQualityIndex}. ` +
        (data.airQualityIndex <= 50
          ? "Air quality is generally good."
          : data.airQualityIndex <= 100
            ? "Air quality is moderate — sensitive groups should monitor conditions."
            : "Air quality can be unhealthy at times — check daily conditions."),
    });
  }

  return qs;
}

function schoolQuestions(
  city: string,
  data: MarketFaqData
): FaqContent["questions"] {
  const qs: FaqContent["questions"] = [];

  if (data.averageSchoolRating) {
    qs.push({
      question: `How are the schools in ${city}?`,
      answer: `The average school rating in ${city} is ${data.averageSchoolRating}/10. ` +
        (data.averageSchoolRating >= 7
          ? "The school system is generally well-regarded."
          : data.averageSchoolRating >= 5
            ? "School quality varies — neighborhood selection matters for families."
            : "Research specific schools carefully — ratings vary widely by area.") +
        " Your CLUES report includes detailed school-by-school data.",
    });
  }

  return qs;
}

// ─── Generator ──────────────────────────────────────────────────────────────

/**
 * Generate a per-market FAQ document for a specific city.
 */
export function generateMarketFaq(
  input: MarketFaqInput
): ReportDefinition {
  const brand = input.brand ?? CLUES_BRAND;
  const { city, state, data } = input;

  const builder = new ReportBuilder(
    `${city} Market FAQ`,
    "faq_guide",
    "pdf",
    brand
  );

  builder.addCover({
    title: `${city}, ${state} — Market FAQ`,
    subtitle: "Everything You Need to Know",
    preparedBy: "Olivia — CLUES Intelligence",
  });

  builder.addTableOfContents();

  // Build FAQ sections by category
  const categories: Array<{
    id: FaqCategory;
    title: string;
    generator: () => FaqContent["questions"];
  }> = [
    {
      id: "real_estate",
      title: "Real Estate",
      generator: () => realEstateQuestions(city, state, data),
    },
    {
      id: "cost_of_living",
      title: "Cost of Living",
      generator: () => costOfLivingQuestions(city, state, data),
    },
    {
      id: "lifestyle",
      title: "Lifestyle & Employment",
      generator: () => lifestyleQuestions(city, data),
    },
    {
      id: "safety",
      title: "Safety & Crime",
      generator: () => safetyQuestions(city, data),
    },
    {
      id: "environment",
      title: "Climate & Environment",
      generator: () => environmentQuestions(city, data),
    },
    {
      id: "schools",
      title: "Schools & Education",
      generator: () => schoolQuestions(city, data),
    },
  ];

  for (const cat of categories) {
    const questions = cat.generator();
    if (questions.length > 0) {
      builder.addFaq(`faq_${cat.id}`, cat.title, questions);
    }
  }

  // Append custom questions if provided
  if (input.customQuestions && input.customQuestions.length > 0) {
    builder.addFaq(
      "faq_custom",
      "Additional Questions",
      input.customQuestions
    );
  }

  builder.addDisclaimer();

  return builder.build();
}

/**
 * Generate FAQ documents for multiple markets at once.
 */
export function generateMultiMarketFaqs(
  markets: MarketFaqInput[]
): ReportDefinition[] {
  return markets.map(generateMarketFaq);
}
