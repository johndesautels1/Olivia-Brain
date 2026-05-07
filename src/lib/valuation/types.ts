/**
 * Valuation engine types — Zod schemas + TS types for inputs, outputs,
 * cascade phases, and intelligence-agent results.
 *
 * Ported byte-for-byte from
 * `D:\London-Tech-Map\src\lib\valuation\types.ts` (Track V Session V2,
 * 2026-05-07). Pure types — no runtime dependencies on LTM-specific code.
 */

import { z } from "zod";

// ── Enums ──────────────────────────────────────────────────────────────

export const CompanyStageSchema = z.enum([
  "idea",
  "pre_revenue",
  "mvp",
  "early_revenue",
  "growth",
  "scaleup",
  "mature",
]);
export type CompanyStage = z.infer<typeof CompanyStageSchema>;

export const BusinessModelSchema = z.enum([
  "saas",
  "marketplace",
  "services",
  "deeptech",
  "fintech",
  "ecommerce",
  "media",
  "hardware",
  "other",
]);
export type BusinessModel = z.infer<typeof BusinessModelSchema>;

export const BuyerTypeSchema = z.enum([
  "angel",
  "vc",
  "private_equity",
  "strategic_partner",
  "acquirer",
]);
export type BuyerType = z.infer<typeof BuyerTypeSchema>;

export const EvidenceTypeSchema = z.enum([
  "deck",
  "financial_model",
  "cap_table",
  "kpi_export",
  "contract",
  "data_room",
  "manual_override",
  "other",
]);
export type EvidenceType = z.infer<typeof EvidenceTypeSchema>;

export const ValuationMethodNameSchema = z.enum([
  "revenue_multiple",
  "ebitda_multiple",
  "dcf",
  "vc_method",
  "cost_to_duplicate",
  "scorecard",
  "strategic_synergy",
  "precedent_transactions",
  "liquidation",
  "real_options",
  "strategic_adjustment",
]);
export type ValuationMethodName = z.infer<typeof ValuationMethodNameSchema>;

// ── Evidence & Provenance ──────────────────────────────────────────────

export const EvidenceRefSchema = z.object({
  documentId: z.string(),
  documentName: z.string(),
  evidenceType: EvidenceTypeSchema,
  pageOrSlide: z.number().nullable().optional(),
  quote: z.string().optional(),
  confidence: z.number().min(0).max(1).default(0.5),
});
export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;

export const MetricEvidenceSchema = z.object({
  value: z.number().nullable(),
  asOfDate: z.string().optional(),
  refs: z.array(EvidenceRefSchema).default([]),
  confidence: z.number().min(0).max(1).default(0.5),
});
export type MetricEvidence = z.infer<typeof MetricEvidenceSchema>;

// ── Market Benchmarks ──────────────────────────────────────────────────

export const MarketBenchmarksSchema = z.object({
  revenueMultipleLow: z.number().nullable(),
  revenueMultipleBase: z.number().nullable(),
  revenueMultipleHigh: z.number().nullable(),
  ebitdaMultipleLow: z.number().nullable(),
  ebitdaMultipleBase: z.number().nullable(),
  ebitdaMultipleHigh: z.number().nullable(),
  discountRatePct: z.number().nullable(),
  terminalGrowthPct: z.number().nullable(),
  targetInvestorReturnPct: z.number().nullable(),
});
export type MarketBenchmarks = z.infer<typeof MarketBenchmarksSchema>;

// ── Scorecard Factors ──────────────────────────────────────────────────

export const ScorecardFactorsSchema = z.object({
  team: z.number().min(0).max(2).default(1),
  opportunity: z.number().min(0).max(2).default(1),
  product: z.number().min(0).max(2).default(1),
  competition: z.number().min(0).max(2).default(1),
  marketing: z.number().min(0).max(2).default(1),
  needForCapital: z.number().min(0).max(2).default(1),
  other: z.number().min(0).max(2).default(1),
});
export type ScorecardFactors = z.infer<typeof ScorecardFactorsSchema>;

// ── Strategic Synergy Inputs ───────────────────────────────────────────

export const StrategicSynergyInputsSchema = z.object({
  annualSynergyValue: z.number().default(0),
  synergyRealizationProbability: z.number().min(0).max(1).default(0.5),
  buyerPremiumPct: z.number().default(0),
});
export type StrategicSynergyInputs = z.infer<typeof StrategicSynergyInputsSchema>;

// ── Full Company Valuation Input ───────────────────────────────────────

export const CompanyValuationInputSchema = z.object({
  companyName: z.string(),
  companyId: z.string(),
  sector: z.string(),
  subsector: z.string().optional(),
  geography: z.string().default("London"),
  stage: CompanyStageSchema,
  businessModel: BusinessModelSchema,

  annualRevenue: MetricEvidenceSchema,
  arr: MetricEvidenceSchema,
  grossMarginPct: MetricEvidenceSchema,
  ebitda: MetricEvidenceSchema,
  ebitdaMarginPct: MetricEvidenceSchema,
  burnMonthly: MetricEvidenceSchema,
  runwayMonths: MetricEvidenceSchema,
  growthYoYPct: MetricEvidenceSchema,
  netRevenueRetentionPct: MetricEvidenceSchema,
  churnPct: MetricEvidenceSchema,
  customerConcentrationTop3Pct: MetricEvidenceSchema,
  cacPaybackMonths: MetricEvidenceSchema,
  ltvToCac: MetricEvidenceSchema,
  burnMultiple: MetricEvidenceSchema,

  cashOnHand: MetricEvidenceSchema,
  debt: MetricEvidenceSchema,
  fullyDilutedShares: MetricEvidenceSchema,
  optionPoolPct: MetricEvidenceSchema,

  tam: MetricEvidenceSchema,
  sam: MetricEvidenceSchema,
  som: MetricEvidenceSchema,
  marketGrowthPct: MetricEvidenceSchema,

  capitalRaisedToDate: MetricEvidenceSchema,
  lastRoundPreMoney: MetricEvidenceSchema,
  lastRoundPostMoney: MetricEvidenceSchema,

  founderDependencyRisk: z.number().min(0).max(1).default(0.5),
  legalRisk: z.number().min(0).max(1).default(0.2),
  ipStrength: z.number().min(0).max(1).default(0.5),
  productMaturity: z.number().min(0).max(1).default(0.5),
  goToMarketMaturity: z.number().min(0).max(1).default(0.5),
  londonStrategicFit: z.number().min(0).max(1).default(0.5),
  managementStrength: z.number().min(0).max(1).default(0.5),
  founderReputationScore: z.number().min(0).max(1).default(0.5),
  competitionIntensityScore: z.number().min(0).max(1).default(0.5),

  capitalizedBuildCost: MetricEvidenceSchema,
  replacementCost: MetricEvidenceSchema,
  patentsCount: z.number().default(0),
  proprietaryDataScore: z.number().min(0).max(1).default(0.3),
  trademarksCount: z.number().default(0),
  regulatoryApprovals: z.boolean().default(false),

  scorecardFactors: ScorecardFactorsSchema.optional(),
  regionalSeedBenchmark: z.number().optional(),

  strategicSynergy: StrategicSynergyInputsSchema.optional(),

  volatility: z.number().min(0).max(2).default(0.45),
  timeToExit: z.number().min(0).max(20).default(3),
  expansionCapex: MetricEvidenceSchema.optional(),
  salvageValue: MetricEvidenceSchema.optional(),
  wacc: z.number().min(0).max(1).optional(),
  fcfMargin: z.number().min(-1).max(1).optional(),

  marketBenchmarks: MarketBenchmarksSchema,
});
export type CompanyValuationInput = z.infer<typeof CompanyValuationInputSchema>;

// ── Scenario ───────────────────────────────────────────────────────────

export const ScenarioSchema = z.object({
  name: z.string(),
  revenueGrowthShockPct: z.number().default(0),
  multipleShockPct: z.number().default(0),
  marginShockPct: z.number().default(0),
  discountRateShockPct: z.number().default(0),
  strategicPremiumPct: z.number().default(0),
  concentrationPenaltyPct: z.number().default(0),
  synergyPremiumPct: z.number().default(0),
  controlPremiumPct: z.number().default(0),
});
export type Scenario = z.infer<typeof ScenarioSchema>;

// ── Output Types ───────────────────────────────────────────────────────

export type ValuationBand = {
  low: number;
  base: number;
  high: number;
};

export type ValuationMethodResult = {
  method: ValuationMethodName;
  enabled: boolean;
  stageFit: number;
  dataQuality: number;
  weight: number;
  enterpriseValue: ValuationBand | null;
  equityValue: ValuationBand | null;
  summary: string;
  assumptions: string[];
  isOverlay?: boolean;
};

// ── Monte Carlo Output ────────────────────────────────────────────────

export type MonteCarloResult = {
  mean: number;
  std: number;
  median: number;
  p5: number;
  p10: number;
  p50: number;
  p90: number;
  p95: number;
  distribution: number[];
  sampleSeeds: number[];
  simulations: number;
  seed: number;
};

// ── Hybrid MC+CRR Output ─────────────────────────────────────────────

export type HybridMCCRRResult = {
  baseDistribution: number[];
  hybridDistribution: number[];
  baseMean: number;
  hybridMean: number;
  optionUpliftPercent: number;
  percentPathsExercised: number;
  realOptionPremiumMean: number;
  simulations: number;
};

// ── Compound Option Inputs ────────────────────────────────────────────

export type CompoundOptionInputs = {
  underlying: number;
  outerStrike: number;
  innerStrike: number;
  volatility: number;
  timeYearsOuter: number;
  timeYearsInner: number;
  riskFreeRate?: number;
  steps?: number;
};

// ── Sensitivity Output ────────────────────────────────────────────────

export type TornadoBar = {
  variable: string;
  lowValue: number;
  highValue: number;
  baseValue: number;
  lowResult: number;
  highResult: number;
  baseResult: number;
  absoluteImpact: number;
};

export type ScenarioResult = {
  name: string;
  probability: number;
  enterpriseValue: ValuationBand;
  weightedEV: number;
};

export type StressCascadeResult = {
  name: string;
  shocks: { variable: string; shockPct: number }[];
  enterpriseValue: ValuationBand;
  impactPct: number;
};

export type MethodDisagreement = {
  method1: string;
  method2: string;
  divergencePct: number;
  explanation: string;
};

export type ReconciledValuationResult = {
  companyId: string;
  companyName: string;
  scenario: string;
  buyerType: BuyerType;
  confidence: number;
  enterpriseValue: ValuationBand;
  equityValue: ValuationBand;
  /** Equity value after subtracting the option pool reserve (ESOP dilution). */
  dilutedEquityValue: ValuationBand | null;
  /** Option pool percentage used for dilution (0–1). */
  optionPoolPct: number;
  perShareValue: ValuationBand | null;
  /** Rule of 40: revenue growth % + EBITDA margin %. ≥40 = healthy. */
  ruleOf40: number | null;
  methods: ValuationMethodResult[];
  risks: string[];
  opportunities: string[];
  narrative: string;
  methodDisagreements: MethodDisagreement[];
};

// ═══════════════════════════════════════════════════════════════════════
// LLM CASCADE TYPES
// ═══════════════════════════════════════════════════════════════════════

// ── Document Intake ──────────────────────────────────────────────────

export const DocumentTypeSchema = z.enum([
  "pdf",
  "pptx",
  "docx",
  "csv",
  "xlsx",
  "other",
]);
export type DocumentType = z.infer<typeof DocumentTypeSchema>;

export type DocumentChunk = {
  chunkId: string;
  documentId: string;
  documentName: string;
  companyId: string;
  content: string;
  pageOrSlide: number | null;
  sectionTitle: string | null;
  chunkIndex: number;
  tokenCount: number;
  embedding: number[] | null;
  /** URL to the original source — null for uploaded files. */
  sourceUrl: string | null;
};

export type IntakeResult = {
  documentId: string;
  documentName: string;
  documentType: DocumentType;
  companyId: string;
  chunks: DocumentChunk[];
  totalPages: number;
  totalChunks: number;
  warnings: string[];
};

// ── Financial Extraction ─────────────────────────────────────────────

export type ExtractionNote = {
  field: string;
  note: string;
  severity: "info" | "warning" | "error";
};

export type MissingItem = {
  field: string;
  importance: "critical" | "high" | "medium" | "low";
  reason: string;
};

export type ExtractedValuationInput = {
  input: CompanyValuationInput;
  extractionNotes: ExtractionNote[];
  missingItems: MissingItem[];
  warnings: string[];
  evidenceMap: Record<string, EvidenceRef>;
  extractedAt: string;
  modelUsed: string;
};

// ── Validation ───────────────────────────────────────────────────────

export type FieldValidationResult = {
  field: string;
  extractedValue: number | null;
  verifiedValue: number | null;
  isMatch: boolean;
  mismatchPct: number | null;
  originalConfidence: number;
  adjustedConfidence: number;
  verificationNote: string;
};

export type ValidationWarning = {
  type:
    | "contradiction"
    | "stale_data"
    | "missing_date"
    | "cap_table_mismatch"
    | "unsupported_claim"
    | "value_mismatch";
  field: string;
  message: string;
  severity: "low" | "medium" | "high";
};

export type ValidatedInput = {
  input: CompanyValuationInput;
  fieldValidations: FieldValidationResult[];
  warnings: ValidationWarning[];
  overallConfidence: number;
  validatedAt: string;
};

// ── Method Selection ─────────────────────────────────────────────────

export type RejectedMethod = {
  method: ValuationMethodName;
  reason: string;
};

export type MethodSelectionResult = {
  enabledMethods: ValuationMethodName[];
  rejectedMethods: RejectedMethod[];
  weights: Partial<Record<ValuationMethodName, number>>;
};

// ── Evidence Mapper ──────────────────────────────────────────────────

export type FieldProvenance = {
  value: number | null;
  extractedFrom: {
    documentId: string;
    documentName: string;
    pageOrSlide: number | null;
    exactQuote: string | null;
    confidence: number;
  };
  validatedBy: {
    agent: string;
    result: "confirmed" | "adjusted" | "unverified";
    adjustedConfidence: number;
  } | null;
};

export type EvidenceMap = Record<string, FieldProvenance>;

// ── Two-phase pipeline (Extraction → Merge → Intelligence) ──────────

export type ExtractionPhaseResult = {
  intake: IntakeResult[];
  extraction: ExtractedValuationInput;
  validation: ValidatedInput;
  orchestratedAt: string;
};

export type IntelligencePhaseResult = {
  methodSelection: MethodSelectionResult;
  evidenceMap: EvidenceMap;
  valuation: ReconciledValuationResult;
  justification: JustificationResult | null;
  challenge: ChallengeResult | null;
  counterNarrative: CounterNarrativeResult | null;
  truthScore: TruthScoreResult | null;
  preMortem: PreMortemResult | null;
  acquisitionMirror: AcquisitionMirrorResult | null;
};

// ── Orchestrator (full pipeline) ─────────────────────────────────────

export type OrchestratorResult = {
  companyId: string;
  companyName: string;
  intake: IntakeResult[];
  extraction: ExtractedValuationInput;
  validation: ValidatedInput;
  methodSelection: MethodSelectionResult;
  evidenceMap: EvidenceMap;
  valuation: ReconciledValuationResult;
  justification: JustificationResult | null;
  challenge: ChallengeResult | null;
  counterNarrative: CounterNarrativeResult | null;
  truthScore: TruthScoreResult | null;
  preMortem: PreMortemResult | null;
  acquisitionMirror: AcquisitionMirrorResult | null;
  orchestratedAt: string;
};

// ═══════════════════════════════════════════════════════════════════════
// INTELLIGENCE AGENT TYPES
// ═══════════════════════════════════════════════════════════════════════

export type JustificationResult = {
  narrative: string;
  letterByBuyerType: Partial<Record<BuyerType, string>>;
  risks: string[];
  opportunities: string[];
  actionableSteps: string[];
};

export type ChallengeResult = {
  bearishCritique: string;
  neutralCritique: string;
  bullishCritique: string;
  buyerSpecificChallenges: Partial<Record<BuyerType, string[]>>;
  vulnerabilities: string[];
};

export type CounterArgument = {
  buyerPoint: string;
  sellerResponse: string;
};

export type CounterNarrativeResult = {
  buyerMemo: string;
  counterArguments: CounterArgument[];
};

export type TruthScoreGap = {
  field: string;
  manualValue: number;
  documentValue: number;
  gapPct: number;
  direction: "optimistic" | "pessimistic" | "match";
};

export type TruthScoreResult = {
  truthScore: number;
  totalFields: number;
  verifiedFields: number;
  gaps: TruthScoreGap[];
};

export type RejectionReason = {
  reason: string;
  probability: number;
  currentScore: number;
  improvementAction: string;
};

export type PreMortemResult = {
  rejectionReasons: RejectionReason[];
};

export type AcquisitionMirrorResult = {
  sellerValuation: ValuationBand;
  buyerValuation: ValuationBand;
  negotiationZone: { low: number; high: number };
  oliviaNarrative: string;
  cristianoNarrative: string;
  gapExplanation: string;
};
