/**
 * Olivia industry-benchmark defaults extractor.
 *
 * Conservative starting values for fields no API can populate
 * directly (qualitative narrative, projections, risk-floor scores).
 * Confidence is intentionally low (0.40) so any user-typed value or
 * higher-confidence API-derived suggestion overrides on tie-break.
 *
 * The LTM mockup's `triggerOliviaFill()` modal explicitly tells
 * founders "Using your public data, industry benchmarks, and 3 years
 * of financial history" — this extractor is the "industry benchmarks"
 * half. The founder accepts/rejects each suggestion.
 */
import { type QuantaraSuggestion } from "../types";

const DEFAULTS_CONFIDENCE = 0.40;
const DEFAULTS_FETCHED_AT = () => new Date().toISOString();

const NOTE_BENCHMARK = "Olivia industry median (review before accepting)";

interface DefaultEntry {
  fieldId: QuantaraSuggestion["fieldId"];
  value: unknown;
  note?: string;
}

/**
 * Per-field conservative defaults. Order is the schema's display
 * order; absence means we have no default for that field. The
 * orchestrator merges these with the API-derived suggestions and
 * picks the highest-confidence per field — defaults only land when no
 * other source produced a suggestion.
 */
const DEFAULT_ENTRIES: ReadonlyArray<DefaultEntry> = [
  // § 1 Core Financials
  { fieldId: "f3", value: 80 }, // Revenue Growth YoY % — typical Series A
  { fieldId: "f4", value: 5 }, // Revenue Growth MoM %
  { fieldId: "f5", value: 75 }, // Gross Margin %
  { fieldId: "f10", value: 1500 }, // CAC GBP
  { fieldId: "f11", value: 8000 }, // LTV GBP
  { fieldId: "f12", value: 5.3 }, // LTV:CAC
  { fieldId: "f13", value: 110 }, // NRR %

  // § 2 Capital Structure
  { fieldId: "f16", value: 0 }, // Total Debt
  { fieldId: "f17", value: 10_000_000 }, // Shares Outstanding (FD)
  { fieldId: "f18", value: 10 }, // Option Pool %

  // § 3 Funding History — most defaults conservative
  { fieldId: "f19", value: 1_500_000 }, // Total Funding GBP
  { fieldId: "f20", value: 6_000_000 }, // Last Round Pre-money
  { fieldId: "f21", value: "Seed" },

  // § 4 Current Round
  { fieldId: "f22", value: 5_000_000 }, // Target Raise
  { fieldId: "f23", value: "Series A" },

  // § 5 Traction
  { fieldId: "f25", value: 1_500_000 }, // Pipeline Value
  { fieldId: "f28", value: 5 }, // Enterprise Contracts
  { fieldId: "f29", value: 50_000 }, // ACV

  // § 6 Market — speculative; 4-question median
  { fieldId: "f30", value: 10_000_000_000 }, // TAM
  { fieldId: "f31", value: 2_500_000_000 }, // SAM
  { fieldId: "f32", value: 250_000_000 }, // SOM
  { fieldId: "f33", value: 18 }, // Market Growth %

  // § 7 IP & Moat
  { fieldId: "f34", value: 0 }, // Patents Filed
  { fieldId: "f35", value: 0 }, // Patents Granted
  { fieldId: "f36", value: "Proprietary dataset to be described" },
  { fieldId: "f37", value: 35 }, // Open Source Dependency %
  { fieldId: "f38", value: "GDPR compliant" },
  { fieldId: "f39", value: 5 }, // Network Effects 1-10

  // § 8 Team
  { fieldId: "f43", value: "No prior exits" }, // Previous Exits
  { fieldId: "f44", value: 5 }, // Key Person Risk

  // § 9 Risk
  { fieldId: "f45", value: 15 }, // Revenue Concentration top client %
  { fieldId: "f46", value: "UK 100%" },
  { fieldId: "f47", value: 4 }, // Regulatory Risk

  // § 10 Growth Levers
  { fieldId: "f48", value: 25 }, // Expansion Revenue %
  { fieldId: "f49", value: 0.5 }, // Viral Coefficient
  { fieldId: "f50", value: 45 }, // Sales Cycle Days
  { fieldId: "f51", value: 25 }, // R&D Spend %

  // § 11 Projections
  { fieldId: "f52", value: 3_500_000 }, // Year+1 Revenue
  { fieldId: "f53", value: 9_000_000 }, // Year+2 Revenue
  { fieldId: "f54", value: 22_000_000 }, // Year+3 Revenue
  { fieldId: "f55", value: 18 }, // Path to Profitability months

  // § 12 Strategic
  { fieldId: "f56", value: 5 }, // Target Exit Timeline years
];

export function extractFounderDefaultsSuggestions(): ReadonlyArray<QuantaraSuggestion> {
  const fetchedAt = DEFAULTS_FETCHED_AT();
  return DEFAULT_ENTRIES.map((d) => ({
    fieldId: d.fieldId,
    value: d.value,
    confidence: DEFAULTS_CONFIDENCE,
    source: {
      integration: "olivia_defaults" as const,
      label: "Olivia industry benchmark",
      fetchedAt,
      note: d.note ?? NOTE_BENCHMARK,
      mockMode: false,
    },
  }));
}
