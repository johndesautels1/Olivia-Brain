// ═══════════════════════════════════════════════════════════════════════
// Dashboard API Response Types
// ═══════════════════════════════════════════════════════════════════════
//
// Mirrors the JSON shapes returned by the valuation API routes.
// Components import these — NOT the engine types directly — to keep
// the UI layer decoupled from internal Prisma/Zod schemas.
// ═══════════════════════════════════════════════════════════════════════

import type {
  BuyerType,
  ValuationBand,
  ValuationMethodResult,
  MethodDisagreement,
  JustificationResult,
  ChallengeResult,
  CounterNarrativeResult,
  TruthScoreResult,
  PreMortemResult,
  AcquisitionMirrorResult,
  EvidenceMap,
  CompanyStage,
} from '@/lib/valuation/types';

// ── GET /api/valuation/[id] response ─────────────────────────────────

export type ValuationRunResponse = {
  ok: true;
  valuationRun: {
    id: string;
    companyId: string;
    companyName: string;
    companySector: string;
    companyStage: CompanyStage;
    scenarioName: string;
    buyerType: BuyerType;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    confidence: number | null;
    enterpriseValue: ValuationBand;
    equityValue: ValuationBand;
    methodResults: ValuationMethodResult[] | null;
    reconciledResult: {
      companyId: string;
      companyName: string;
      scenario: string;
      buyerType: BuyerType;
      confidence: number;
      enterpriseValue: ValuationBand;
      equityValue: ValuationBand;
      dilutedEquityValue: ValuationBand | null;
      optionPoolPct: number;
      perShareValue: ValuationBand | null;
      ruleOf40: number | null;
      methods: ValuationMethodResult[];
      risks: string[];
      opportunities: string[];
      narrative: string;
      methodDisagreements: MethodDisagreement[];
    } | null;
    justification: string | null;
    /** Full justification object (letterByBuyerType, actionableSteps, etc.) — null for older runs */
    justificationFull: JustificationResult | null;
    /** Challenge agent output (bearish/neutral/bullish critiques, buyer challenges, vulnerabilities) */
    challenge: ChallengeResult | null;
    /** Counter-narrative agent output (IC buyer memo, point/counter-point pairs) */
    counterNarrative: CounterNarrativeResult | null;
    risks: string[];
    opportunities: string[];
    truthScore: number | null;
    inputSnapshot: Record<string, unknown> | null;
    modelStackVersion: string | null;
    createdAt: string;
    completedAt: string | null;
    /** Founder-level metrics for the header FounderMeta strip */
    founderMeta: {
      arr: number | null;
      runwayMonths: number | null;
      growthYoYPct: number | null;
      companiesHouseNumber: string | null;
      targetRaiseAmount: number | null;
      targetRoundType: string | null;
    } | null;
  };
  scenarios: {
    id: string;
    name: string;
    assumptions: Record<string, unknown>;
    enterpriseValue: number;
    probability: number;
    keyDrivers: unknown;
  }[];
  sensitivities: {
    id: string;
    variableName: string;
    baseValue: number;
    minValue: number;
    maxValue: number;
    impactLow: number;
    impactHigh: number;
  }[];
  evidenceChain: {
    chunkId: string;
    documentId: string;
    documentTitle: string;
    documentType: string;
    originalFilename: string | null;
    pageOrSlide: number | null;
    chunkIndex: number;
    contentPreview: string;
    sourceUrl: string | null;
  }[];
  /** Real peer cohort data computed from all runs in same stage+sector */
  peerCohort: {
    cohortP25: number;
    cohortMedian: number;
    cohortP75: number;
    peerCount: number;
    cohortLabel: string;
  } | null;

  /** War Room / Deal Room negotiation performance — bidirectional link.
   *  Every consumer (Opus Judge, Gamma, Dashboard, Studio-Olivia, Emilia)
   *  reads this to understand negotiation readiness for the valuation run. */
  negotiationSummary: NegotiationSummary | null;
};

/** Structured War Room results attached to a ValuationRun.
 *  Sourced from DealRoomSession via Prisma relation — NOT duplicated data. */
export type NegotiationSummary = {
  /** DealRoomSession ID for deep-linking */
  sessionId: string;
  /** Overall readiness score 0-100 */
  overallScore: number;
  /** Per-dimension rubric scores (evidence, valuation, risk, etc.) */
  rubricScores: Record<string, number>;
  /** Session status */
  status: 'active' | 'completed' | 'archived';
  /** Buyer type the session was run against */
  buyerType: string;
  /** Duration in seconds */
  durationSeconds: number | null;
  /** Number of messages exchanged */
  messageCount: number;
  /** When the session was completed (ISO string) */
  completedAt: string | null;
  /** Exhibits tabled during negotiation */
  exhibitsTabled: Array<{
    exhibitNumber: number;
    documentId: string;
    title: string;
    documentType: string;
  }> | null;
  /** Frozen negotiation anchors from the briefing — immutable for this session.
   *  Olivia, Opus Judge, and Gamma can reference the exact numbers the user was briefed on. */
  negotiationAnchors: {
    walkAway: number;
    walkAwayRationale: string;
    target: number;
    targetRationale: string;
    anchor: number;
    anchorRationale: string;
    challengeResponses: Array<{ challenge: string; response: string }>;
  } | null;
};

// ── POST /api/valuation/run response ─────────────────────────────────

export type ValuationRunResult = {
  ok: true;
  companyId: string;
  runs: {
    runId: string;
    scenario: string;
    buyerType: BuyerType;
    valuation: {
      companyId: string;
      companyName: string;
      scenario: string;
      buyerType: BuyerType;
      confidence: number;
      enterpriseValue: ValuationBand;
      equityValue: ValuationBand;
      perShareValue: ValuationBand | null;
      methods: ValuationMethodResult[];
      risks: string[];
      opportunities: string[];
      narrative: string;
      methodDisagreements: MethodDisagreement[];
    };
    justification: JustificationResult | null;
    challenge: ChallengeResult | null;
    counterNarrative: CounterNarrativeResult | null;
    truthScore: TruthScoreResult | null;
    preMortem: PreMortemResult | null;
    acquisitionMirror: AcquisitionMirrorResult | null;
    evidenceMap: EvidenceMap;
    orchestratedAt: string;
  }[];
};

// ── Buyer type display labels ────────────────────────────────────────

export const BUYER_TYPE_LABELS: Record<BuyerType, string> = {
  angel: 'Angel',
  vc: 'Seed VC',
  private_equity: 'Series A',
  strategic_partner: 'Strategic',
  acquirer: 'Buyout',
};

export const BUYER_TYPES: BuyerType[] = [
  'angel',
  'vc',
  'private_equity',
  'strategic_partner',
  'acquirer',
];

// ── Formatting helpers ───────────────────────────────────────────────

export function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) {
    return `£${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `£${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `£${(value / 1_000).toFixed(0)}K`;
  }
  return `£${value.toFixed(0)}`;
}

export function formatPct(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function stageBadgeColor(stage: CompanyStage): string {
  const map: Record<CompanyStage, string> = {
    idea: 'bg-purple-500/20 text-purple-300',
    pre_revenue: 'bg-violet-500/20 text-violet-300',
    mvp: 'bg-blue-500/20 text-blue-300',
    early_revenue: 'bg-cyan-500/20 text-cyan-300',
    growth: 'bg-green-500/20 text-green-300',
    scaleup: 'bg-emerald-500/20 text-emerald-300',
    mature: 'bg-amber-500/20 text-amber-300',
  };
  return map[stage];
}

export function stageLabel(stage: CompanyStage): string {
  const map: Record<CompanyStage, string> = {
    idea: 'Idea',
    pre_revenue: 'Pre-Revenue',
    mvp: 'MVP',
    early_revenue: 'Early Revenue',
    growth: 'Growth',
    scaleup: 'Scale-up',
    mature: 'Mature',
  };
  return map[stage];
}
