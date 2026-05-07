'use client';

import { useState, useEffect, useCallback, useTransition, useRef, useMemo, lazy, Suspense } from 'react';
import type {
  BuyerType,
  ValuationMethodResult,
  MethodDisagreement,
  TornadoBar,
  ScenarioResult,
  MonteCarloResult,
  HybridMCCRRResult,
  AcquisitionMirrorResult,
  PreMortemResult,
} from '@/lib/valuation/types';
import { formatCurrency, formatPct } from '@/lib/valuation/dashboard-types';
import type { ValuationRunResponse } from '@/lib/valuation/dashboard-types';
import type { BinomialTreeNode } from '@/components/valuation/BinomialTreeViz';
import type { FingerprintAxis } from '@/components/valuation/ComparableFingerprint';
import type { TimelinePoint } from '@/components/valuation/ValuationTimeline';
import type { SensitivityVariable } from '@/lib/valuation/sensitivity';
import type { ChallengeResponse } from '@/components/valuation/NegotiationAnchorCard';
import { type PlanTier, tierAtLeast, TIER_DISPLAY_NAMES } from '@/types/plan-tier';

// ── Motion primitives (Session 8) ───────────────────────────────────
import { ValuationSkeleton, EngineProgress, EmptyState, StaggerContainer, StaggerItem } from '@/components/valuation/motion';

// ── Visualization components ────────────────────────────────────────
import HeaderSection from '@/components/valuation/HeaderSection';
import CascadeStatusBar from '@/components/valuation/CascadeStatusBar';
import KpiCards from '@/components/valuation/KpiCards';
import OliviaNarrative from '@/components/valuation/OliviaNarrative';
import CommandPalette from '@/components/valuation/CommandPalette';
import WhatChangedDiff from '@/components/valuation/WhatChangedDiff';
import { GlossaryToggleProvider } from '@/components/valuation/GlossaryTooltip';
import type { DiffSnapshot } from '@/components/valuation/WhatChangedDiff';
import ChartCard from '@/components/valuation/ChartCard';
import DraggableGrid from '@/components/valuation/DraggableGrid';
import type { GridItem } from '@/components/valuation/DraggableGrid';

// ── Lazy-loaded components (reduces initial bundle + re-render cost) ─
const MethodStackPanel = lazy(() => import('@/components/valuation/MethodStackPanel'));
const ValuationBridge = lazy(() => import('@/components/valuation/ValuationBridge'));
const RiskOpportunityPanel = lazy(() => import('@/components/valuation/RiskOpportunityPanel'));
const DocumentHeatmap = lazy(() => import('@/components/valuation/DocumentHeatmap'));
const EvidenceRoom = lazy(() => import('@/components/valuation/EvidenceRoom'));
const TornadoChart = lazy(() => import('@/components/valuation/TornadoChart'));
const ComparableFingerprint = lazy(() => import('@/components/valuation/ComparableFingerprint'));
const ScenarioDial = lazy(() => import('@/components/valuation/ScenarioDial'));
const CohortBenchmark = lazy(() => import('@/components/valuation/CohortBenchmark'));
const PreMortemPanel = lazy(() => import('@/components/valuation/PreMortemPanel'));
const RiskMatrix = lazy(() => import('@/components/valuation/RiskMatrix'));
const MonteCarloHistogram = lazy(() => import('@/components/valuation/MonteCarloHistogram'));
const BinomialTreeViz = lazy(() => import('@/components/valuation/BinomialTreeViz'));
const ScenarioComparison = lazy(() => import('@/components/valuation/ScenarioComparison'));
const DataLineageSankey = lazy(() => import('@/components/valuation/DataLineageSankey'));
const ValuationTimeline = lazy(() => import('@/components/valuation/ValuationTimeline'));
const SensitivitySliders = lazy(() => import('@/components/valuation/SensitivitySliders'));
const DealRoomSimulator = lazy(() => import('@/components/valuation/DealRoomSimulator'));
const AcquisitionMirror = lazy(() => import('@/components/valuation/AcquisitionMirror'));
const NegotiationAnchorCard = lazy(() => import('@/components/valuation/NegotiationAnchorCard'));
const ValuationLetter = lazy(() => import('@/components/valuation/ValuationLetter'));
const ExportPanel = lazy(() => import('@/components/valuation/ExportPanel'));
const WarRoom = lazy(() => import('@/components/valuation/WarRoom'));
const EquityWaterfall = lazy(() => import('@/components/valuation/EquityWaterfall'));
const CompanyIntelligenceNexus = lazy(() => import('@/components/valuation/CompanyIntelligenceNexus'));

/** Minimal loading fallback for lazy components */
function LazyFallback() {
  return (
    <div className="glass-card p-6 flex items-center justify-center min-h-[120px]">
      <div className="flex items-center gap-2 text-text-secondary text-[11px]">
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
        </svg>
        Loading...
      </div>
    </div>
  );
}

// ── Page state ───────────────────────────────────────────────────────

type PageState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; data: ValuationRunResponse }
  | { status: 'error'; message: string };

type TabId = 'thesis' | 'risk' | 'comps' | 'stochastic' | 'dealroom' | 'deliverables';

type ZoneId = 'thesis' | 'risk' | 'comps' | 'stochastic' | 'dealroom' | 'deliverables';

// ── Session 2: Pipeline stage definitions for left sidebar ──────────
interface PipelineStage {
  id: string;
  label: string;
  zone: ZoneId;
}

const PIPELINE_STAGES: PipelineStage[] = [
  { id: 'methods', label: 'Investment Thesis', zone: 'thesis' },
  { id: 'sensitivity', label: 'Sensitivity Analysis', zone: 'thesis' },
  { id: 'riskmatrix', label: 'Risk Lab', zone: 'risk' },
  { id: 'comps', label: 'Comps & Evidence', zone: 'comps' },
  { id: 'montecarlo', label: 'Monte Carlo', zone: 'stochastic' },
  { id: 'scenarios', label: 'Scenario Analysis', zone: 'stochastic' },
  { id: 'realoptions', label: 'Real Options', zone: 'stochastic' },
  { id: 'negotiation', label: 'Deal Room', zone: 'dealroom' },
  { id: 'letter', label: 'Board Letter', zone: 'deliverables' },
  { id: 'exports', label: 'Export Studio', zone: 'deliverables' },
  { id: 'history', label: 'Valuation History', zone: 'deliverables' },
];

type StageStatus = 'green' | 'amber' | 'red';

/** Determine pipeline stage status from loaded data */
function computeStageStatus(
  stageId: string,
  data: ValuationRunResponse | null,
): StageStatus {
  if (!data) return 'red';
  const run = data.valuationRun;
  switch (stageId) {
    case 'methods': {
      const methods = run.reconciledResult?.methods ?? run.methodResults ?? [];
      const enabled = methods.filter((m) => m.enabled && (m.weight > 0 || m.isOverlay));
      return enabled.length >= 3 ? 'green' : enabled.length > 0 ? 'amber' : 'red';
    }
    case 'sensitivity':
      return (data.sensitivities ?? []).length > 0 ? 'green' : 'red';
    case 'montecarlo': {
      const snap = run.inputSnapshot as Record<string, unknown> | null;
      return snap?.['monteCarloResult'] ? 'green' : 'red';
    }
    case 'scenarios':
      return (data.scenarios ?? []).length > 0 ? 'green' : 'red';
    case 'realoptions': {
      const snap2 = run.inputSnapshot as Record<string, unknown> | null;
      const nodes = snap2?.['binomialTreeNodes'] as unknown[] | undefined;
      return nodes && nodes.length > 0 ? 'green' : 'red';
    }
    case 'negotiation':
      return run.enterpriseValue ? 'green' : 'red';
    case 'letter':
      return run.justification ? 'green' : 'red';
    case 'exports':
      return run.completedAt ? 'green' : 'red';
    case 'riskmatrix':
      return (run.risks ?? []).length > 0 ? 'green' : 'red';
    case 'comps':
      return run.reconciledResult ? 'green' : 'red';
    default:
      return 'red';
  }
}

// ── Session 2: Right rail context content per zone ──────────────────

const ZONE_CONTEXT: Record<ZoneId, { title: string; description: string }> = {
  thesis: {
    title: 'Investment Thesis',
    description: 'Olivia provides narrative analysis of the valuation methods, their weights, and the reconciled enterprise value. Review the evidence chain and method stack for full transparency.',
  },
  risk: {
    title: 'Risk Lab',
    description: 'Every investment committee asks what could go wrong. The Risk Lab surfaces probability-weighted threats, pre-mortem scenarios, and the full risk matrix.',
  },
  comps: {
    title: 'Comps & Evidence',
    description: 'Comparable fingerprints, peer cohort benchmarks, and the complete evidence audit trail. Every figure traces back to its source document.',
  },
  stochastic: {
    title: 'Stochastic Lab',
    description: 'Monte Carlo simulation, scenario modelling, and real options analysis provide probabilistic bounds around the point estimate.',
  },
  dealroom: {
    title: 'Deal Room',
    description: 'The Deal Room and War Room prepare you for buyer conversations. Anchor points, challenge responses, and the acquisition mirror.',
  },
  deliverables: {
    title: 'Deliverables',
    description: 'The Board Letter, export studio, and valuation history provide institutional-grade documentation for distribution.',
  },
};

interface TabDef { id: TabId; label: string; zone: ZoneId }

const TABS: TabDef[] = [
  { id: 'thesis', label: 'Thesis', zone: 'thesis' },
  { id: 'risk', label: 'Risk Lab', zone: 'risk' },
  { id: 'comps', label: 'Comps & Evidence', zone: 'comps' },
  { id: 'stochastic', label: 'Stochastic Lab', zone: 'stochastic' },
  { id: 'dealroom', label: 'Deal Room', zone: 'dealroom' },
  { id: 'deliverables', label: 'Deliverables', zone: 'deliverables' },
];

const ZONES: { id: ZoneId; label: string }[] = [
  { id: 'thesis', label: 'THESIS' },
  { id: 'risk', label: 'RISK LAB' },
  { id: 'comps', label: 'COMPS & EVIDENCE' },
  { id: 'stochastic', label: 'STOCHASTIC LAB' },
  { id: 'dealroom', label: 'DEAL ROOM' },
  { id: 'deliverables', label: 'DELIVERABLES' },
];

// ── Grid layouts per tab ─────────────────────────────────────────────
// Tab 1: Thesis — narrative, methods, bridge, sensitivity
const DEFAULT_THESIS_GRID: GridItem[] = [
  { id: 'intelligence-nexus', colSpan: 2 },   // 0. Intelligence Nexus orbital
  { id: 'olivia-inline', colSpan: 2 },       // 1. Narrative / Investment Thesis
  { id: 'method-stack', colSpan: 2 },         // 2. Method Stack & Weights
  { id: 'waterfall-bridge', colSpan: 2 },     // 3. Valuation Bridge
  { id: 'tornado', colSpan: 2 },              // 4. Tornado Sensitivity
  { id: 'sliders', colSpan: 2 },              // 5. Sensitivity Sliders
];

// Tab 2: Risk Lab — risk matrix, risks & opportunities, pre-mortem
const DEFAULT_RISK_GRID: GridItem[] = [
  { id: 'risk-matrix', colSpan: 2 },          // 1. Risk Matrix (prob x impact)
  { id: 'risk-opportunity', colSpan: 2 },     // 2. Risks & Opportunities
  { id: 'pre-mortem', colSpan: 2 },           // 3. Pre-Mortem ("what kills the deal")
];

// Tab 3: Comps & Evidence — fingerprint, cohort, evidence room, heatmap, lineage
const DEFAULT_COMPS_GRID: GridItem[] = [
  { id: 'fingerprint', colSpan: 2 },          // 1. Comparable Fingerprint
  { id: 'cohort-benchmark', colSpan: 2 },     // 2. Cohort Benchmark (peers)
  { id: 'evidence-room', colSpan: 2 },        // 3. Evidence / Audit trail
  { id: 'document-heatmap', colSpan: 2 },     // 4. Document Heatmap
  { id: 'data-lineage', colSpan: 2 },         // 5. Data Lineage
];

// Tab 4: Stochastic Lab — Monte Carlo, scenarios, real options
const DEFAULT_STOCHASTIC_GRID: GridItem[] = [
  { id: 'histogram', colSpan: 2 },            // 1. Monte Carlo Histogram
  { id: 'scenario-comparison', colSpan: 2 },  // 2. Scenario Comparison
  { id: 'binomial-tree', colSpan: 2 },        // 3. Binomial Tree
  { id: 'uplift-summary', colSpan: 2 },       // 4. Real Option Uplift
];

const DEFAULT_NEGOTIATE_GRID: GridItem[] = [
  { id: 'deal-room', colSpan: 2 },              // 1. Deal Room simulator — see the deal first
  { id: 'equity-waterfall', colSpan: 2 },       // 2. Capital structure → EV to equity
  { id: 'negotiation-anchor', colSpan: 2 },     // 3. Your opening position (floor/target/anchor)
  { id: 'acquisition-mirror', colSpan: 2 },     // 4. Comparable deal precedents
  { id: 'war-room-header', colSpan: 2 },        // 5. War Room launcher — stress-test after prep
];

// ── Scroll spy panel labels for Thesis ribbon ───────────────────────
const PANEL_LABELS: Record<string, string> = {
  'intelligence-nexus': 'Nexus',
  'olivia-inline': 'Narrative',
  'method-stack': 'Methods',
  'waterfall-bridge': 'Bridge',
  'tornado': 'Tornado',
  'sliders': 'Sensitivity',
  'risk-opportunity': 'Risk / Opp',
  'pre-mortem': 'Pre-Mortem',
  'fingerprint': 'Fingerprint',
  'cohort-benchmark': 'Cohort',
  'risk-matrix': 'Risk Matrix',
  'evidence-room': 'Evidence',
  'document-heatmap': 'Doc Heatmap',
  'data-lineage': 'Data Lineage',
};

// ── Zone Freshness Ribbon (Session 10) ──────────────────────────────
// Spec: 30d = amber, 90d = coral pulse. Uses completedAt from the run.

type FreshnessState = 'fresh' | 'amber' | 'coral';

interface ZoneFreshness {
  state: FreshnessState;
  label: string;
  pulsing: boolean;
}

function relativeTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function computeZoneFreshness(completedAt: string | null): ZoneFreshness {
  if (!completedAt) {
    return { state: 'coral', label: 'never run', pulsing: true };
  }
  const elapsed = Date.now() - new Date(completedAt).getTime();
  const days = elapsed / (1000 * 60 * 60 * 24);
  const label = relativeTime(elapsed);
  if (days > 90) return { state: 'coral', label, pulsing: true };
  if (days > 30) return { state: 'amber', label, pulsing: false };
  return { state: 'fresh', label, pulsing: false };
}

// ── Helpers ──────────────────────────────────────────────────────────

function extractMethods(data: ValuationRunResponse): ValuationMethodResult[] {
  const reconciled = data.valuationRun.reconciledResult;
  if (reconciled?.methods) {
    return reconciled.methods;
  }
  if (Array.isArray(data.valuationRun.methodResults)) {
    return data.valuationRun.methodResults;
  }
  return [];
}

function extractDisagreements(data: ValuationRunResponse): MethodDisagreement[] {
  return data.valuationRun.reconciledResult?.methodDisagreements ?? [];
}

function extractTornadoBars(data: ValuationRunResponse): TornadoBar[] {
  const sensitivities = data.sensitivities ?? [];
  const baseEV = data.valuationRun.enterpriseValue?.base ?? 0;

  return sensitivities
    .map((s) => ({
      variable: s.variableName,
      lowValue: s.minValue,
      highValue: s.maxValue,
      baseValue: s.baseValue,
      lowResult: s.impactLow,
      highResult: s.impactHigh,
      baseResult: baseEV,
      absoluteImpact: Math.abs(s.impactHigh - s.impactLow),
    }))
    .sort((a, b) => b.absoluteImpact - a.absoluteImpact);
}

function extractSensitivityVariables(data: ValuationRunResponse): SensitivityVariable[] {
  return (data.sensitivities ?? []).map((s) => ({
    name: s.variableName,
    key: s.variableName,
    currentValue: s.baseValue,
    min: s.minValue,
    max: s.maxValue,
    step: (s.maxValue - s.minValue) / 10,
    unit: '%',
  }));
}

function extractScenarioResults(data: ValuationRunResponse): {
  scenarios: ScenarioResult[];
  probabilityWeightedEV: number;
} {
  const scenarios: ScenarioResult[] = (data.scenarios ?? []).map((s) => ({
    name: s.name,
    probability: s.probability ?? 0,
    enterpriseValue: {
      low: s.enterpriseValue * 0.85,
      base: s.enterpriseValue,
      high: s.enterpriseValue * 1.15,
    },
    weightedEV: s.enterpriseValue * (s.probability ?? 0),
  }));

  const probabilityWeightedEV = scenarios.reduce((sum, s) => sum + s.weightedEV, 0);
  return { scenarios, probabilityWeightedEV };
}

function extractMonteCarloResult(data: ValuationRunResponse): MonteCarloResult | null {
  const snap = data.valuationRun.inputSnapshot as Record<string, unknown> | null;
  if (!snap) return null;
  const mc = snap['monteCarloResult'] as MonteCarloResult | undefined;
  return mc ?? null;
}

function extractHybridResult(data: ValuationRunResponse): HybridMCCRRResult | null {
  const snap = data.valuationRun.inputSnapshot as Record<string, unknown> | null;
  if (!snap) return null;
  const hybrid = snap['hybridResult'] as HybridMCCRRResult | undefined;
  return hybrid ?? null;
}

function extractBinomialTreeNodes(data: ValuationRunResponse): BinomialTreeNode[] {
  const snap = data.valuationRun.inputSnapshot as Record<string, unknown> | null;
  if (!snap) return [];
  const nodes = snap['binomialTreeNodes'] as BinomialTreeNode[] | undefined;
  return nodes ?? [];
}

function extractFingerprintData(data: ValuationRunResponse): FingerprintAxis[] {
  const snap = data.valuationRun.inputSnapshot as Record<string, unknown> | null;
  if (!snap) return [];
  const fp = snap['fingerprint'] as FingerprintAxis[] | undefined;
  return fp ?? [];
}

function extractTimelinePoints(data: ValuationRunResponse): TimelinePoint[] {
  const snap = data.valuationRun.inputSnapshot as Record<string, unknown> | null;
  if (!snap) return [];
  const tl = snap['timeline'] as TimelinePoint[] | undefined;
  return tl ?? [];
}

function extractAcquisitionMirror(data: ValuationRunResponse): AcquisitionMirrorResult | null {
  const snap = data.valuationRun.inputSnapshot as Record<string, unknown> | null;
  if (!snap) return null;
  return (snap['acquisitionMirror'] as AcquisitionMirrorResult | undefined) ?? null;
}

function extractPreMortem(data: ValuationRunResponse): PreMortemResult | null {
  const snap = data.valuationRun.inputSnapshot as Record<string, unknown> | null;
  if (!snap) return null;
  return (snap['preMortem'] as PreMortemResult | undefined) ?? null;
}

/** Round a value to the same precision formatCurrency will display,
 *  so that subtracted display values are arithmetically consistent. */
function roundForDisplay(value: number): number {
  const abs = Math.abs(value);
  const sign = value < 0 ? -1 : 1;
  if (abs >= 1_000_000_000) return sign * Math.round(abs / 100_000_000) * 100_000_000;
  if (abs >= 1_000_000) return sign * Math.round(abs / 100_000) * 100_000;
  if (abs >= 1_000) return sign * Math.round(abs / 1_000) * 1_000;
  return Math.round(value);
}

function extractNegotiationAnchors(
  data: ValuationRunResponse,
  activeBuyerType?: BuyerType,
): {
  walkAway: number; target: number; anchor: number;
  walkAwayRationale: string; targetRationale: string; anchorRationale: string;
  challengeResponses: ChallengeResponse[];
} {
  const ev = data.valuationRun.enterpriseValue;
  if (!ev) {
    return {
      walkAway: 0, target: 0, anchor: 0,
      walkAwayRationale: '', targetRationale: '', anchorRationale: '',
      challengeResponses: [],
    };
  }

  const buyerType = activeBuyerType ?? (data.valuationRun.buyerType as BuyerType) ?? 'vc';

  // ── Build data-driven challenge/response pairs from actual company data ──
  const snap = data.valuationRun.inputSnapshot as Record<string, unknown> | null;
  const methods = data.valuationRun.reconciledResult?.methods ?? data.valuationRun.methodResults ?? [];
  const risks = data.valuationRun.reconciledResult?.risks ?? data.valuationRun.risks ?? [];
  const sector = data.valuationRun.companySector || 'tech';
  const stage = data.valuationRun.companyStage || 'seed';

  // Helper to read snapshot numeric fields
  const snapVal = (key: string): number | null => {
    const field = snap?.[key] as { value?: number | null } | number | null | undefined;
    if (field === null || field === undefined) return null;
    if (typeof field === 'number') return field;
    return field.value ?? null;
  };

  const revenue = snapVal('annualRevenue');
  const growthPct = snapVal('growthYoYPct');
  const grossMargin = snapVal('grossMarginPct');
  const ebitda = snapVal('ebitda');
  const nrr = snapVal('netRevenueRetentionPct');
  const churn = snapVal('churnPct');
  const burn = snapVal('burnMonthly');
  const runway = snapVal('runwayMonths');
  const cashOnHand = snapVal('cashOnHand');

  // Find the revenue multiple method result if present
  const revMultMethod = methods.find((m) => m.method === 'revenue_multiple' && m.enabled);
  const dcfMethod = methods.find((m) => m.method === 'dcf' && m.enabled);
  const enabledCount = methods.filter((m) => m.enabled && (m.weight > 0 || m.isOverlay)).length;

  // Spread between methods
  const methodEVs = methods
    .filter((m) => m.enabled && m.weight > 0 && m.enterpriseValue)
    .map((m) => m.enterpriseValue!.base);
  const methodSpread = methodEVs.length >= 2
    ? Math.max(...methodEVs) - Math.min(...methodEVs)
    : 0;

  const challenges: ChallengeResponse[] = [];

  // 1. Revenue multiple justification (if applicable)
  if (revMultMethod?.enterpriseValue && revenue) {
    const impliedMultiple = revMultMethod.enterpriseValue.base / revenue;
    challenges.push({
      challenge: `Your implied revenue multiple of ${impliedMultiple.toFixed(1)}x is ${impliedMultiple > 4 ? 'above' : 'near'} the ${sector} sector median. Justify the premium.`,
      response: `${grossMargin != null ? `Gross margin of ${grossMargin.toFixed(0)}%` : 'Strong unit economics'}${nrr != null ? ` and NRR of ${nrr.toFixed(0)}%` : ''}${growthPct != null && growthPct > 0 ? ` with ${growthPct.toFixed(0)}% YoY growth` : ''} place us in the upper tier for ${stage}-stage ${sector} companies. Premium multiples are earned by durable, capital-efficient growth.`,
    });
  }

  // 2. Growth / profitability challenge
  if (ebitda != null && ebitda <= 0) {
    challenges.push({
      challenge: 'The company is pre-profit. What is the path to positive EBITDA?',
      response: `${grossMargin != null ? `Gross margin is already ${grossMargin.toFixed(0)}%` : 'Unit economics are positive'}${burn != null ? `, with monthly burn of ${formatCurrency(burn)}` : ''}${runway != null ? ` and ${runway.toFixed(0)} months of runway` : ''}. We reach breakeven by scaling revenue against a largely fixed cost base — operating leverage is the path, not cost-cutting.`,
    });
  } else if (growthPct != null && growthPct <= 10) {
    challenges.push({
      challenge: `YoY growth of ${growthPct.toFixed(0)}% is modest. How do you accelerate?`,
      response: `Current growth reflects deliberate capital efficiency${grossMargin != null ? ` at ${grossMargin.toFixed(0)}% gross margin` : ''}. Pipeline expansion and product-led growth initiatives target ${Math.max(growthPct * 2, 25).toFixed(0)}%+ in the next cycle without proportional spend increase.`,
    });
  }

  // 3. Runway / cash position
  if (runway != null && runway < 18) {
    challenges.push({
      challenge: `With ${runway.toFixed(0)} months of runway, you are negotiating from a time-constrained position.`,
      response: `${cashOnHand != null ? `We have ${formatCurrency(cashOnHand)} in cash` : 'Our cash position is managed'}${burn != null ? ` against ${formatCurrency(burn)}/mo burn` : ''}. This round is growth capital, not survival funding — we have optionality to extend runway by ${burn != null && burn > 0 ? `reducing burn to extend to ${cashOnHand != null ? Math.round(cashOnHand / (burn * 0.6)).toFixed(0) : '24'}+ months` : 'moderating spend'} if terms are unfavourable.`,
    });
  }

  // 4. Method disagreement / valuation spread
  if (methodSpread > ev.base * 0.3 && methodEVs.length >= 2) {
    challenges.push({
      challenge: `Your valuation methods show a ${formatCurrency(methodSpread)} spread. Which number should we trust?`,
      response: `The spread reflects the ${enabledCount} methods correctly capturing different value dimensions. The reconciled EV of ${formatCurrency(ev.base)} is probability-weighted by data quality and stage fit. The range gives both parties a transparent negotiation corridor.`,
    });
  }

  // 5. NRR / churn concern
  if (churn != null && churn > 5) {
    challenges.push({
      challenge: `Annual churn of ${churn.toFixed(1)}% signals retention risk. Why should we underwrite current revenue as durable?`,
      response: `${nrr != null && nrr >= 100 ? `NRR of ${nrr.toFixed(0)}% demonstrates that expansion revenue more than offsets churn` : 'Churn is concentrated in SMB; enterprise cohorts retain at 95%+'}. We are investing in onboarding and CS to drive churn below ${Math.max(churn * 0.6, 2).toFixed(0)}% within 12 months.`,
    });
  }

  // 6. DCF discount rate challenge
  if (dcfMethod?.enterpriseValue && dcfMethod.enterpriseValue.base < ev.base * 0.5) {
    challenges.push({
      challenge: 'The DCF produces a significantly lower value than other methods. Doesn\'t that suggest overvaluation?',
      response: `DCF at ${stage}-stage applies a high discount rate (30-40%) that penalises early companies by design. The method contributes ${formatPct(dcfMethod.weight)} weight to the blend precisely because it undervalues growth optionality that revenue multiple and real options methods capture.`,
    });
  }

  // 7. Risk-based challenge from the valuation's own risk list
  if (risks.length > 0) {
    const topRisk = risks[0];
    challenges.push({
      challenge: `Your own analysis flags "${topRisk}" as a risk. How do you mitigate it?`,
      response: `We have identified this proactively and it is already factored into the valuation confidence band. The ${formatCurrency(roundForDisplay(ev.base) - roundForDisplay(ev.low))} discount from target to walk-away prices this risk explicitly. Our mitigation plan is underway.`,
    });
  }

  // Ensure at least 3 challenges — fill with generic stage-appropriate ones if needed
  if (challenges.length < 3) {
    const genericChallenges: ChallengeResponse[] = [
      {
        challenge: 'What is your defensible moat against larger competitors?',
        response: `Our moat is ${sector === 'AI / ML' || sector === 'Artificial Intelligence' ? 'proprietary training data and model IP' : 'deep domain expertise and switching costs'} built over ${revenue != null ? 'a proven revenue base' : 'multiple product iterations'}. Competitors would need 18-24 months and significant capital to replicate.`,
      },
      {
        challenge: 'How dependent is the business on the founding team?',
        response: 'Key-person risk is mitigated by documented IP, a growing management layer, and vesting schedules that align incentives through exit. The business operates without founder involvement in day-to-day delivery.',
      },
      {
        challenge: `Why should we pay ${formatCurrency(ev.base)} for a ${stage}-stage company?`,
        response: `The ${formatCurrency(ev.base)} target reflects ${enabledCount} independent valuation methods reconciled by data quality. ${revenue != null ? `At ${formatCurrency(revenue)} revenue` : 'With current traction'}${grossMargin != null ? ` and ${grossMargin.toFixed(0)}% gross margin` : ''}, this prices both current performance and near-term growth optionality.`,
      },
    ];
    for (const gc of genericChallenges) {
      if (challenges.length >= 5) break;
      // Avoid duplicating similar themes
      if (!challenges.some((c) => c.challenge.toLowerCase().includes(gc.challenge.split(' ').slice(0, 3).join(' ').toLowerCase()))) {
        challenges.push(gc);
      }
    }
  }

  // ── Buyer-type-aware anchor pricing ──────────────────────────────────
  // Each buyer type has different negotiation dynamics:
  //   Angel/VC: standard band (founder side)
  //   PE: MOIC-driven floor, control premium uplift on anchor
  //   Strategic: synergy premium share on target/anchor
  //   Acquirer (Buyout): control premium + comparable transaction premium
  let walkAway: number;
  let target: number;
  let anchor: number;
  let walkAwayRationale: string;
  let targetRationale: string;
  let anchorRationale: string;

  switch (buyerType) {
    case 'private_equity': {
      // PE buyer: floor is MOIC-driven (2.5x minimum on invested capital),
      // target includes a 10-15% control premium, anchor adds transaction premium
      const controlPremium = 0.15;
      const transactionPremium = 0.10;
      walkAway = ev.base * 0.85;
      target = ev.base * (1 + controlPremium);
      anchor = ev.high * (1 + controlPremium + transactionPremium);
      walkAwayRationale = `PE floor: 85% of reconciled EV (${formatCurrency(ev.base)}). Below this, the MOIC falls below the fund's 2.5x minimum return threshold, making the deal uncommittable to LPs.`;
      targetRationale = `Reconciled EV plus ${(controlPremium * 100).toFixed(0)}% control premium for majority ownership. Reflects the governance value of board control and strategic direction rights.`;
      anchorRationale = `High-end EV plus ${((controlPremium + transactionPremium) * 100).toFixed(0)}% combined control and transaction premium. Anchors above comparable PE transactions to create concession room toward target.`;
      break;
    }
    case 'strategic_partner': {
      // Strategic buyer: willing to pay synergy premium because they capture
      // cost savings / revenue synergies that a financial buyer cannot
      const synergySplit = 0.20; // founder captures 20% of estimated synergy value
      const fullSynergyPremium = 0.30; // total synergy value ~30% of EV
      walkAway = ev.base * 0.90;
      target = ev.base * (1 + synergySplit);
      anchor = ev.high * (1 + fullSynergyPremium);
      walkAwayRationale = `Strategic floor: 90% of reconciled EV. Below this, the founder captures no synergy value and is better off continuing independently or seeking a financial buyer.`;
      targetRationale = `Reconciled EV plus ${(synergySplit * 100).toFixed(0)}% synergy share. The acquirer's cost savings and revenue cross-sell justify a premium — the target splits synergy value equitably.`;
      anchorRationale = `High-end EV plus ${(fullSynergyPremium * 100).toFixed(0)}% full synergy premium. Opens at the buyer's total value creation, giving room to negotiate down to the shared-synergy target.`;
      break;
    }
    case 'acquirer': {
      // Buyout acquirer: factors control premium, synergy capture, and
      // comparable transaction premiums from M&A market data
      const controlPremium = 0.20;
      const comparablePremium = 0.15;
      walkAway = ev.base * 0.80;
      target = ev.base * (1 + controlPremium);
      anchor = ev.high * (1 + controlPremium + comparablePremium);
      walkAwayRationale = `Buyout floor: 80% of reconciled EV. Accounts for integration risk and the acquirer's required return hurdle. Below this, the deal destroys value relative to alternatives.`;
      targetRationale = `Reconciled EV plus ${(controlPremium * 100).toFixed(0)}% control premium for 100% ownership. Comparable M&A transactions in the sector command this premium for change-of-control deals.`;
      anchorRationale = `High-end EV plus ${((controlPremium + comparablePremium) * 100).toFixed(0)}% combined control and comparable transaction premium. Anchored to recent sector acquisitions to justify the opening ask.`;
      break;
    }
    case 'angel': {
      // Angel: smaller rounds, founder-friendly, modest anchor above base
      walkAway = ev.low * 0.90;
      target = ev.base;
      anchor = ev.high * 0.95;
      walkAwayRationale = `Angel floor: 90% of low-end EV. Below this, dilution exceeds what is acceptable for the founder's retained ownership at this stage.`;
      targetRationale = `Reconciled enterprise value across all enabled methods. Realistic pre-money valuation for an angel round at this stage.`;
      anchorRationale = `95% of high-end EV. Angels expect a modest discount to the upside case — anchoring too aggressively risks losing deal momentum.`;
      break;
    }
    default: {
      // VC (seed/Series A): standard band from the valuation range
      walkAway = ev.low;
      target = ev.base;
      anchor = ev.high;
      walkAwayRationale = `Below this price, the opportunity cost of continued growth exceeds the acquisition premium. Liquidation floor plus 18 months of projected growth.`;
      targetRationale = `Reconciled enterprise value across all enabled methods, weighted by stage fit and data quality. Realistic negotiation outcome.`;
      anchorRationale = `High-end of the valuation range. Opens negotiation with room to concede toward target while still achieving premium outcome.`;
      break;
    }
  }

  return {
    walkAway,
    target,
    anchor,
    walkAwayRationale,
    targetRationale,
    anchorRationale,
    challengeResponses: challenges.slice(0, 5),
  };
}

function extractCohortData(
  data: ValuationRunResponse,
): { cohortP25: number; cohortMedian: number; cohortP75: number } {
  const snap = data.valuationRun.inputSnapshot as Record<string, unknown> | null;
  const ev = data.valuationRun.enterpriseValue?.base ?? 0;
  if (snap?.['cohortP25'] != null) {
    return {
      cohortP25: snap['cohortP25'] as number,
      cohortMedian: snap['cohortMedian'] as number,
      cohortP75: snap['cohortP75'] as number,
    };
  }
  return {
    cohortP25: Math.round(ev * 0.55),
    cohortMedian: Math.round(ev * 0.8),
    cohortP75: Math.round(ev * 1.3),
  };
}

function extractInvestorMetrics(
  data: ValuationRunResponse,
): { moic: number | null; impliedOwnershipPct: number | null } {
  const snap = data.valuationRun.inputSnapshot as Record<string, unknown> | null;
  const ev = data.valuationRun.enterpriseValue?.base ?? 0;

  // Read MetricEvidence objects from snapshot
  const capRaised = (snap?.['capitalRaisedToDate'] as { value?: number } | undefined)?.value ?? 0;
  const lastPostMoney = (snap?.['lastRoundPostMoney'] as { value?: number } | undefined)?.value ?? 0;
  const lastPreMoney = (snap?.['lastRoundPreMoney'] as { value?: number } | undefined)?.value ?? 0;

  // MOIC = current EV / total capital invested
  // Tells investors how many times they've multiplied their money at current valuation
  const moic = capRaised > 0 && ev > 0 ? ev / capRaised : null;

  // Implied ownership %: what share of the company does all invested capital represent?
  // If last round data available: use round-implied ownership = (post - pre) / post
  // Otherwise: use capitalRaised / EV as a rough proxy
  let impliedOwnershipPct: number | null = null;
  if (lastPostMoney > 0 && lastPreMoney > 0 && lastPostMoney > lastPreMoney) {
    impliedOwnershipPct = ((lastPostMoney - lastPreMoney) / lastPostMoney) * 100;
  } else if (capRaised > 0 && ev > 0) {
    impliedOwnershipPct = Math.min(100, (capRaised / ev) * 100);
  }

  return { moic, impliedOwnershipPct };
}

function extractLetterContent(data: ValuationRunResponse): string | null {
  return data.valuationRun.justification ?? null;
}

// ── Main component ───────────────────────────────────────────────────

/** Summary emitted to CristianoShell when a valuation run completes */
export interface ValuationCompleteSummary {
  runId: string;
  enterpriseValue: number;
  confidenceScore: number;
  primaryMethod: string;
  range: { low: number; high: number };
}

interface ValuationWorkbenchProps {
  /** SubjectId passed from the pipeline (CristianoShell). Takes priority over URL params. */
  subjectId?: string | null;
  /** Latest run ID if already known. */
  latestRunId?: string | null;
  /** Callback fired when a valuation run finishes loading (Session 4 — feeds Olivia context) */
  onValuationComplete?: (summary: ValuationCompleteSummary) => void;
  /** User's subscription tier — defaults to 'enterprise' for backward compatibility */
  userTier?: PlanTier;
}

export function ValuationWorkbench({ subjectId: propSubjectId, latestRunId: propLatestRunId, onValuationComplete, userTier = 'enterprise' }: ValuationWorkbenchProps = {}) {
  const [state, setState] = useState<PageState>({ status: 'idle' });
  const [buyerType, setBuyerType] = useState<BuyerType>('vc');
  const [isRunning, setIsRunning] = useState(false);
  const [runSuccess, setRunSuccess] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [activeTab, setActiveTabRaw] = useState<TabId>('thesis');
  const [, startTabTransition] = useTransition();
  const setActiveTab = useCallback((tab: TabId) => { startTabTransition(() => setActiveTabRaw(tab)); }, []);
  const [valuationRunId, setValuationRunId] = useState<string | null>(null);
  const [resolvedSubjectId, setResolvedSubjectId] = useState<string | null>(propSubjectId ?? null);
  const [warRoomActive, setWarRoomActive] = useState(false);
  const [glossaryEnabled, setGlossaryEnabled] = useState(true);
  const [allPanelsExpanded, setAllPanelsExpanded] = useState(true);
  const [dataRevision, setDataRevision] = useState(0);
  const [panelSeenRevision, setPanelSeenRevision] = useState<Record<string, number>>({});
  const [gridEditing, setGridEditing] = useState(false);
  const toggleGridEditing = useCallback(() => setGridEditing((v) => !v), []);

  // Refs for auto-save (declared early so resetWorkbench can clear them)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedBuyerType = useRef<string>(buyerType);
  const lastEmittedRunId = useRef<string | null>(null);

  // AbortController ref — cancels in-flight fetches when company changes or workbench resets.
  // Prevents stale responses from a previous company overwriting the current state.
  const fetchAbortRef = useRef<AbortController>(new AbortController());

  // ── Hard reset: flush ALL state + refs so no old report data can bleed through ──
  const resetWorkbench = useCallback(() => {
    // Abort any in-flight fetches FIRST so stale responses cannot land after reset
    fetchAbortRef.current.abort();
    fetchAbortRef.current = new AbortController();

    setState({ status: 'idle' });
    setValuationRunId(null);
    setResolvedSubjectId(null);
    setBuyerType('vc');
    setSaveStatus('idle');
    setIsRunning(false);
    setWarRoomActive(false);
    setActiveTabRaw('thesis');
    setDataRevision(0);
    setPanelSeenRevision({});
    setAllPanelsExpanded(true);
    // Clear refs to prevent stale data leaking between runs
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = null;
    lastSavedBuyerType.current = 'vc';
    lastEmittedRunId.current = null;
  }, []);

  // ── Auto-reset when parent provides a NEW subjectId (different company) ──
  const prevSubjectId = useRef<string | null>(propSubjectId ?? null);
  useEffect(() => {
    if (propSubjectId && propSubjectId !== prevSubjectId.current) {
      resetWorkbench();
      setResolvedSubjectId(propSubjectId);
      prevSubjectId.current = propSubjectId;
    }
  }, [propSubjectId, resetWorkbench]);

  // ── Scroll spy state for Investment Thesis ribbon ───────────────────
  const [visiblePanelIds, setVisiblePanelIds] = useState<string[]>(DEFAULT_THESIS_GRID.map((i) => i.id));
  const [activePanelId, setActivePanelId] = useState<string | null>(null);
  const handleVisibleItemsChange = useCallback((ids: string[]) => setVisiblePanelIds(ids), []);

  // IntersectionObserver for scroll spy — tracks which panel is in view
  useEffect(() => {
    if (activeTab !== 'thesis') return;
    const panels = document.querySelectorAll<HTMLElement>('[data-panel-id]');
    if (!panels.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        // Find the topmost visible panel
        let topEntry: IntersectionObserverEntry | null = null;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (!topEntry || entry.boundingClientRect.top < topEntry.boundingClientRect.top) {
              topEntry = entry;
            }
          }
        }
        if (topEntry) {
          const id = (topEntry.target as HTMLElement).dataset.panelId;
          if (id) setActivePanelId(id);
        }
      },
      { rootMargin: '-120px 0px -50% 0px', threshold: 0 },
    );
    panels.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [activeTab, visiblePanelIds]);

  // ── Session 27: What-Changed Diff state ────────────────────────────
  const [previousSnapshot, setPreviousSnapshot] = useState<DiffSnapshot | null>(null);
  const [diffVisible, setDiffVisible] = useState(false);

  // ── Session 2: Sidebar + Right Rail state ──────────────────���───────
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile overlay state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // desktop sidebar collapse — default off
  const [sidebarFloatPos, setSidebarFloatPos] = useState({ x: 16, y: 130 });
  const sidebarDragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);

  const [rightRailOpen, setRightRailOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1440);

  // Track window width for responsive behavior
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;

  // Auto-close right rail on screens < 1280px
  useEffect(() => {
    if (windowWidth < 1280 && rightRailOpen) {
      setRightRailOpen(false);
    }
  }, [windowWidth, rightRailOpen]);

  // Auto-close sidebar overlay when resizing above mobile
  useEffect(() => {
    if (!isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [isMobile, sidebarOpen]);

  // ── Draggable sidebar handlers ──────────────────────────────────────
  const onSidebarDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    sidebarDragRef.current = {
      startX: e.clientX, startY: e.clientY,
      startPosX: sidebarFloatPos.x, startPosY: sidebarFloatPos.y,
    };
    const onMove = (ev: MouseEvent) => {
      if (!sidebarDragRef.current) return;
      const dx = ev.clientX - sidebarDragRef.current.startX;
      const dy = ev.clientY - sidebarDragRef.current.startY;
      setSidebarFloatPos({
        x: Math.max(0, sidebarDragRef.current.startPosX + dx),
        y: Math.max(0, sidebarDragRef.current.startPosY + dy),
      });
    };
    const onUp = () => {
      sidebarDragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [sidebarFloatPos]);

  // Derive active zone from active tab
  const activeZone: ZoneId = TABS.find((t) => t.id === activeTab)?.zone ?? 'thesis';

  // ── Session 2: URL hash persistence for active zone ────────────────
  useEffect(() => {
    const hash = window.location.hash.replace('#', '') as ZoneId;
    if (['thesis', 'risk', 'comps', 'stochastic', 'dealroom', 'deliverables'].includes(hash)) {
      // Set tab to first tab in that zone
      const firstTab = TABS.find((t) => t.zone === hash);
      if (firstTab) setActiveTab(firstTab.id);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync URL hash when zone changes
  useEffect(() => {
    if (state.status === 'loaded') {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${activeZone}`);
    }
  }, [activeZone, state.status]);

  // Sync prop changes into local state — CRITICAL: reset stale data when company changes
  const prevSubjectIdRef = useRef<string | null>(propSubjectId ?? null);
  useEffect(() => {
    if (propSubjectId && propSubjectId !== prevSubjectIdRef.current) {
      // Company changed — clear old valuation data to prevent stale reports
      prevSubjectIdRef.current = propSubjectId;
      setResolvedSubjectId(propSubjectId);
      setValuationRunId(null);
      setState({ status: 'idle' });
    } else if (propSubjectId) {
      setResolvedSubjectId(propSubjectId);
    }
  }, [propSubjectId]);

  useEffect(() => {
    if (propLatestRunId) setValuationRunId(propLatestRunId);
  }, [propLatestRunId]);

  // Read run ID from URL search params on mount, or auto-detect latest
  // Track whether the parent explicitly passes subjectId (even as null) vs not passing it at all.
  // When parent passes null (company switch in progress), do NOT fall through to global latest.
  const parentManagesSubject = propSubjectId !== undefined;

  useEffect(() => {
    // If props already provided a run ID, skip URL/auto-detect
    if (propLatestRunId) return;

    // If the parent is managing the subject but hasn't resolved it yet (null),
    // don't auto-detect — wait for the parent to provide the real subject ID.
    if (parentManagesSubject && !propSubjectId) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const urlSubjectId = params.get('subjectId');
    if (id) {
      setValuationRunId(id);
    } else if (urlSubjectId || propSubjectId) {
      // Have a subject ID (from URL or prop) but no run ID — fetch latest run for this subject
      const sid = urlSubjectId || propSubjectId;
      if (sid) setResolvedSubjectId(sid);
      void (async () => {
        try {
          const res = await fetch(`/api/valuation/latest?subjectId=${encodeURIComponent(sid!)}`);
          if (!res.ok) return;
          const data = (await res.json()) as {
            ok: boolean;
            hasData: boolean;
            subjectId: string | null;
            runId: string | null;
            companyName: string | null;
          };
          if (data.runId) {
            setValuationRunId(data.runId);
          } else {
            // No runs for this subject — clear any stale run from a different company
            setValuationRunId(null);
            setState({ status: 'idle' });
          }
          if (data.subjectId) {
            setResolvedSubjectId(data.subjectId);
          }
        } catch {
          // Silently fail — idle state will show
        }
      })();
    } else if (!parentManagesSubject) {
      // No params and parent doesn't manage subject — try to auto-load user's latest valuation
      void (async () => {
        try {
          const res = await fetch('/api/valuation/latest');
          if (!res.ok) return;
          const data = (await res.json()) as {
            ok: boolean;
            hasData: boolean;
            subjectId: string | null;
            runId: string | null;
            companyName: string | null;
          };
          if (data.runId) {
            setValuationRunId(data.runId);
          }
          if (data.subjectId) {
            setResolvedSubjectId(data.subjectId);
          }
        } catch {
          // Silently fail — idle state will show
        }
      })();
    }
  }, [propSubjectId, propLatestRunId, parentManagesSubject]);

  // Fetch valuation data by run ID (uses abort signal to prevent stale data bleed)
  const fetchValuation = useCallback(async (runId: string) => {
    setState({ status: 'loading' });
    try {
      const res = await fetch(`/api/valuation/${runId}`, {
        signal: fetchAbortRef.current.signal,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: 'Unknown error' }));
        const msg = (body as { message?: string }).message ?? `HTTP ${res.status}`;
        setState({ status: 'error', message: msg });
        return;
      }
      const data = (await res.json()) as ValuationRunResponse;
      setState({ status: 'loaded', data });
      setDataRevision((r) => r + 1);
    } catch (err: unknown) {
      // Aborted fetches are expected during company switching — silently ignore
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Failed to fetch valuation';
      setState({ status: 'error', message });
    }
  }, []);

  // Auto-fetch when run ID is set
  useEffect(() => {
    if (valuationRunId) {
      void fetchValuation(valuationRunId);
    }
  }, [valuationRunId, fetchValuation]);

  // Run valuation handler
  // ── Session 27: Capture snapshot of current data before re-run ─────
  const captureDiffSnapshot = useCallback((): DiffSnapshot | null => {
    if (state.status !== 'loaded') return null;
    const d = state.data;
    const r = d.valuationRun;
    const methods = r.reconciledResult?.methods ?? r.methodResults ?? [];
    const enabled = methods.filter((m: { enabled: boolean; weight: number; isOverlay?: boolean }) => m.enabled && (m.weight > 0 || m.isOverlay));
    return {
      ev: r.enterpriseValue?.base ?? 0,
      confidence: r.confidence !== null && r.confidence !== undefined ? Math.round(r.confidence * 100) : 0,
      methodsUsed: enabled.length,
      risks: (r.risks ?? []) as string[],
      methodWeights: enabled.map((m) => ({ name: m.method, weight: Math.round(m.weight * 100) })),
    };
  }, [state]);

  const handleRunValuation = useCallback(async () => {
    // Prefer resolvedSubjectId (from props or auto-detect), fall back to URL param
    const subjectId = resolvedSubjectId || new URLSearchParams(window.location.search).get('subjectId');
    if (!subjectId) {
      setState({ status: 'error', message: 'No company data found. Please complete the Build DNA step first.' });
      return;
    }

    // Session 27: capture pre-run snapshot for diff
    const snap = captureDiffSnapshot();
    if (snap) setPreviousSnapshot(snap);

    // Clear stale refs before starting new run
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = null;
    lastSavedBuyerType.current = buyerType;
    lastEmittedRunId.current = null;

    // Fresh abort controller for this run — cancels if user resets mid-flight
    fetchAbortRef.current.abort();
    fetchAbortRef.current = new AbortController();
    const { signal } = fetchAbortRef.current;

    setIsRunning(true);
    try {
      const res = await fetch('/api/valuation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valuationSubjectId: subjectId,
          scenarios: [{ name: 'base' }],
          buyerTypes: [buyerType],
        }),
        signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: 'Unknown error' }));
        const msg = (body as { message?: string }).message ?? `HTTP ${res.status}`;
        setState({ status: 'error', message: msg });
        return;
      }

      const result = (await res.json()) as { ok: boolean; runs: { runId: string }[] };
      const newRunId = result.runs[0]?.runId;
      if (newRunId) {
        setValuationRunId(newRunId);
        await fetchValuation(newRunId);
        // Session 27: show diff panel if we had a previous snapshot
        if (previousSnapshot) setDiffVisible(true);
        // Show success state on button
        setRunSuccess(true);
        setTimeout(() => setRunSuccess(false), 8000);
      }
    } catch (err: unknown) {
      // Aborted runs are expected during rapid company switching — silently ignore
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Failed to run valuation';
      setState({ status: 'error', message });
    } finally {
      setIsRunning(false);
    }
  }, [buyerType, fetchValuation, resolvedSubjectId, captureDiffSnapshot, previousSnapshot]);

  // ── Auto-save: persist buyerType whenever it changes (debounced) ────
  useEffect(() => {
    // Only auto-save if we have a loaded run AND the buyerType actually changed
    if (!valuationRunId || state.status !== 'loaded') return;
    if (buyerType === lastSavedBuyerType.current) return;

    // Debounce: wait 800ms after the user stops toggling
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaveStatus('saving');

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/valuation/${valuationRunId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ buyerType }),
        });
        if (res.ok) {
          lastSavedBuyerType.current = buyerType;
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 3000);
        } else {
          setSaveStatus('error');
          setTimeout(() => setSaveStatus('idle'), 4000);
        }
      } catch {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 4000);
      }
    }, 800);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [buyerType, valuationRunId, state.status]);

  // ── Manual save handler — confirms persistence + syncs buyerType ────
  const handleSaveReport = useCallback(async () => {
    if (!valuationRunId) return;
    setSaveStatus('saving');
    try {
      const res = await fetch(`/api/valuation/${valuationRunId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerType }),
      });
      if (res.ok) {
        lastSavedBuyerType.current = buyerType;
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 4000);
      }
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  }, [valuationRunId, buyerType]);

  // Show 'saved' confirmation when a run finishes loading (data is already persisted)
  useEffect(() => {
    if (state.status === 'loaded' && valuationRunId) {
      lastSavedBuyerType.current = buyerType;
      setSaveStatus('saved');
      const t = setTimeout(() => setSaveStatus('idle'), 3000);
      return () => clearTimeout(t);
    }
  }, [state.status, valuationRunId, buyerType]);

  // ── Emit valuation summary to CristianoShell / Olivia (Session 4) ──
  useEffect(() => {
    if (state.status !== 'loaded' || !onValuationComplete) return;
    const run = state.data.valuationRun;
    // Guard: don't re-emit for the same run
    if (lastEmittedRunId.current === run.id) return;
    const ev = run.enterpriseValue;
    if (!ev) return;
    lastEmittedRunId.current = run.id;
    // Determine primary method (highest weight)
    const methods = run.methodResults ?? [];
    const primary = methods.reduce<{ method: string; weight: number } | null>(
      (best, m) => (!best || m.weight > best.weight ? { method: m.method, weight: m.weight } : best),
      null
    );
    onValuationComplete({
      runId: run.id,
      enterpriseValue: ev.base,
      confidenceScore: run.confidence !== null ? Math.round(run.confidence * 100) : 0,
      primaryMethod: primary?.method ?? 'blended',
      range: { low: ev.low, high: ev.high },
    });
  }, [state, onValuationComplete]);

  // ── Stale valuation indicator ──
  // After loading a valuation, check if any user documents were updated after the run
  const [staleWarning, setStaleWarning] = useState<string | null>(null);
  useEffect(() => {
    if (state.status !== 'loaded') { setStaleWarning(null); return; }
    const runDate = state.data.valuationRun.completedAt;
    if (!runDate) return;
    const runTs = new Date(runDate).getTime();
    if (isNaN(runTs)) return;

    void (async () => {
      try {
        const res = await fetch('/api/documents');
        if (!res.ok) return;
        const docs: { id: string; updatedAt?: string }[] = await res.json();
        const newerCount = docs.filter((d) => {
          if (!d.updatedAt) return false;
          return new Date(d.updatedAt).getTime() > runTs;
        }).length;
        if (newerCount > 0) {
          setStaleWarning(
            `${newerCount} document${newerCount > 1 ? 's have' : ' has'} been updated since this valuation was run. Consider re-running for the most accurate results.`
          );
        } else {
          setStaleWarning(null);
        }
      } catch {
        // Silently fail — indicator is a nice-to-have
      }
    })();
  }, [state]);

  // Sensitivity slider recalculation — linear interpolation from tornado data
  const handleSliderRecalculate = useCallback(
    (overrides: Record<string, number>): number => {
      if (state.status !== 'loaded') return 0;
      const ev = state.data.valuationRun.enterpriseValue?.base ?? 0;
      const sens = state.data.sensitivities ?? [];
      if (sens.length === 0) return ev;

      let adjustedEV = ev;
      for (const s of sens) {
        const sliderVal = overrides[s.variableName];
        if (sliderVal === undefined || sliderVal === s.baseValue) continue;

        // Linear interpolation between base→low or base→high
        if (sliderVal < s.baseValue && s.minValue !== s.baseValue) {
          const t = (sliderVal - s.baseValue) / (s.minValue - s.baseValue);
          adjustedEV += t * (s.impactLow - ev);
        } else if (sliderVal > s.baseValue && s.maxValue !== s.baseValue) {
          const t = (sliderVal - s.baseValue) / (s.maxValue - s.baseValue);
          adjustedEV += t * (s.impactHigh - ev);
        }
      }
      return Math.max(0, adjustedEV);
    },
    [state],
  );

  // ── Memoized data extraction (only recomputes when state.data changes) ──
  const loadedData = state.status === 'loaded' ? state.data : null;
  const methods = useMemo(() => loadedData ? extractMethods(loadedData) : [], [loadedData]);
  const disagreements = useMemo(() => loadedData ? extractDisagreements(loadedData) : [], [loadedData]);
  const enabledMethods = useMemo(() => methods.filter((m) => m.enabled && (m.weight > 0 || m.isOverlay)), [methods]);
  const tornadoBars = useMemo(() => loadedData ? extractTornadoBars(loadedData) : [], [loadedData]);
  const sensitivityVars = useMemo(() => loadedData ? extractSensitivityVariables(loadedData) : [], [loadedData]);
  const scenarioData = useMemo(() => loadedData ? extractScenarioResults(loadedData) : { scenarios: [], probabilityWeightedEV: 0 }, [loadedData]);
  const mcResult = useMemo(() => loadedData ? extractMonteCarloResult(loadedData) : null, [loadedData]);
  const hybridResult = useMemo(() => loadedData ? extractHybridResult(loadedData) : null, [loadedData]);
  const treeNodes = useMemo(() => loadedData ? extractBinomialTreeNodes(loadedData) : [], [loadedData]);
  const fingerprintData = useMemo(() => loadedData ? extractFingerprintData(loadedData) : [], [loadedData]);
  const timelinePoints = useMemo(() => loadedData ? extractTimelinePoints(loadedData) : [], [loadedData]);
  const acquisitionMirror = useMemo(() => loadedData ? extractAcquisitionMirror(loadedData) : null, [loadedData]);
  const preMortem = useMemo(() => loadedData ? extractPreMortem(loadedData) : null, [loadedData]);
  const negotiationAnchors = useMemo(() => loadedData ? extractNegotiationAnchors(loadedData, buyerType) : { walkAway: 0, target: 0, anchor: 0, walkAwayRationale: '', targetRationale: '', anchorRationale: '', challengeResponses: [] }, [loadedData, buyerType]);
  const cohortData = useMemo(() => {
    if (!loadedData) return { cohortP25: 0, cohortMedian: 0, cohortP75: 0, peerCount: 0, cohortLabel: '' };
    const pc = loadedData.peerCohort;
    if (pc) return pc;
    // Fallback for older responses without peerCohort — still try extractCohortData from snapshot
    return { ...extractCohortData(loadedData), peerCount: 0, cohortLabel: '' };
  }, [loadedData]);
  const investorMetrics = useMemo(() => loadedData ? extractInvestorMetrics(loadedData) : { moic: null, impliedOwnershipPct: null }, [loadedData]);
  const letterContent = useMemo(() => loadedData ? extractLetterContent(loadedData) : null, [loadedData]);

  // ── Master panel collapse props for ChartCard ───────────────────────
  const panelCollapseProps = useMemo(() => ({
    forceCollapsed: !allPanelsExpanded ? true : false,
  }), [allPanelsExpanded]);

  const hasNewData = useCallback((panelId: string) => {
    return dataRevision > (panelSeenRevision[panelId] ?? 0);
  }, [dataRevision, panelSeenRevision]);

  // ── Render: idle state ─────────────────────────────────────────────

  if (state.status === 'idle' && !valuationRunId) {
    return (
      <main className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="glass-card p-12 text-center">
          <div
            className="inline-flex h-16 w-16 items-center justify-center rounded-xl mb-4"
            style={{
              background: 'linear-gradient(135deg, rgba(196, 169, 106, 0.15) 0%, rgba(196, 169, 106, 0.05) 100%)',
              border: '1px solid rgba(196, 169, 106, 0.2)',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#C4A96A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2 text-[var(--foreground)]">Valuation Workbench</h1>
          {resolvedSubjectId ? (
            <>
              <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
                Your company data is ready. Run the valuation engine to generate a full analysis with 9 methods, Monte Carlo simulation, sensitivity analysis, and AI judicial review.
              </p>
              <button
                onClick={handleRunValuation}
                disabled={isRunning}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                style={{
                  background: runSuccess ? 'rgba(52, 212, 102, 0.15)' : 'rgba(196, 169, 106, 0.15)',
                  border: runSuccess ? '1px solid rgba(52, 212, 102, 0.4)' : '1px solid rgba(196, 169, 106, 0.25)',
                  color: runSuccess ? '#34D466' : '#C4A96A',
                  boxShadow: runSuccess ? '0 0 20px rgba(52, 212, 102, 0.2), 0 0 6px rgba(52, 212, 102, 0.1)' : 'none',
                }}
              >
                {isRunning ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
                    </svg>
                    Running Valuation...
                  </>
                ) : runSuccess ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Results Ready — Scroll Down
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                    </svg>
                    Run Valuation Engine
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
                Complete the Build DNA step first to provide your company details, then return here to run the valuation engine.
              </p>
            </>
          )}
        </div>
      </main>
    );
  }

  // ── Render: loading state (Session 8 — skeleton replaces spinner) ──

  if (state.status === 'loading') {
    return (
      <main>
        <ValuationSkeleton />
      </main>
    );
  }

  // ── Render: error state ────────────────────────────────────────────

  if (state.status === 'error') {
    return (
      <main className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="glass-card p-12 text-center border-red-500/30">
          <p className="text-sm text-coral-downside mb-2">Error</p>
          <p className="text-xs text-text-secondary">{state.message}</p>
        </div>
      </main>
    );
  }

  if (state.status !== 'loaded') {
    return null;
  }

  // ── Render: loaded — use memoized extracted data ───────────────────

  const { data } = state;
  const run = data.valuationRun;
  const { scenarios: scenarioResults, probabilityWeightedEV } = scenarioData;

  const baseEV = run.enterpriseValue?.base ?? 0;

  // ── Session 2: Sidebar tab-to-tab mapping ───────────────────────────
  const stageToTab: Record<string, TabId> = {
    methods: 'thesis',
    sensitivity: 'thesis',
    riskmatrix: 'risk',
    comps: 'comps',
    montecarlo: 'stochastic',
    scenarios: 'stochastic',
    realoptions: 'stochastic',
    negotiation: 'dealroom',
    letter: 'deliverables',
    exports: 'deliverables',
    history: 'deliverables',
  };

  // ── Session 2: Status dot color ────────────────────────────────────
  const statusDotColor = (status: StageStatus): string => {
    switch (status) {
      case 'green': return 'var(--color-jade-upside)';
      case 'amber': return '#EAB308';
      case 'red': return 'var(--color-coral-downside)';
    }
  };

  /* WCAG-4: shape + color for status dots (circle=green, diamond=amber, square=red) */
  const statusDotClass = (status: StageStatus): string => {
    switch (status) {
      case 'green': return 'rounded-full';
      case 'amber': return 'rounded-sm rotate-45';
      case 'red': return 'rounded-none';
    }
  };

  return (
    <GlossaryToggleProvider enabled={glossaryEnabled}>
    <>
      {/* Header — full width above the 3-column grid */}
      <HeaderSection
        companyName={run.companyName}
        sector={run.companySector}
        stage={run.companyStage}
        confidence={run.confidence}
        completedAt={run.completedAt}
        enterpriseValue={baseEV}
        evLow={run.enterpriseValue?.low ?? null}
        evHigh={run.enterpriseValue?.high ?? null}
        methodsUsed={enabledMethods.length}
        totalMethods={methods.length}
        selectedBuyerType={buyerType}
        onBuyerTypeChange={setBuyerType}
        onRunValuation={handleRunValuation}
        isRunning={isRunning}
        allPanelsExpanded={allPanelsExpanded}
        onAllPanelsToggle={setAllPanelsExpanded}
        glossaryEnabled={glossaryEnabled}
        onGlossaryToggle={setGlossaryEnabled}
        valuationRunId={valuationRunId}
        saveStatus={saveStatus}
        onSave={handleSaveReport}
        onReset={resetWorkbench}
        founderMeta={run.founderMeta ?? null}
      />

      {/* Cascade LLM agent success meter — only visible for cascade runs */}
      <CascadeStatusBar inputSnapshot={run.inputSnapshot as Record<string, unknown> | null} />

      {/* ── Mobile tab selector — dropdown showing all 6 tabs ── */}
      <div className="md:hidden max-w-[1920px] mx-auto px-4 mt-2 mb-3">
        <div
          style={{
            borderRadius: '6px',
            padding: '1px',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.06) 50%, rgba(0,0,0,0.15) 100%)',
          }}
        >
          <div
            className="relative flex items-center"
            style={{
              background: 'linear-gradient(180deg, rgba(30,32,38,1) 0%, rgba(22,24,28,1) 100%)',
              borderRadius: '5px',
              padding: '4px',
            }}
          >
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as TabId)}
              aria-label="Select workbench tab"
              className="w-full appearance-none bg-transparent text-[11px] font-semibold tracking-[0.14em] uppercase focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A96A] rounded"
              style={{
                color: '#D4B97A',
                padding: '10px 36px 10px 12px',
                border: '1px solid rgba(196,169,106,0.3)',
                borderRadius: '4px',
                background: 'linear-gradient(180deg, rgba(40,42,50,1) 0%, rgba(32,34,40,1) 60%, rgba(28,30,36,1) 100%)',
              }}
            >
              {TABS.map((tab) => (
                <option key={tab.id} value={tab.id} style={{ background: '#1e2026', color: '#D4B97A' }}>
                  {tab.label}
                </option>
              ))}
            </select>
            {/* Dropdown chevron */}
            <svg
              className="absolute right-3 pointer-events-none"
              width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="#D4B97A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Premium horizontal tab bar — WCAG AA compliant, 4D lifted (desktop only) ── */}
      <div className="hidden md:block relative max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 mt-2 mb-3">
        {/* Outer bezel — the "case" that the tabs sit inside */}
        <div
          style={{
            borderRadius: '6px',
            padding: '1px',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.06) 50%, rgba(0,0,0,0.15) 100%)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.2), 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          <div className="relative">
          <nav
            aria-label="Valuation workbench tabs"
            role="tablist"
            className="relative flex items-center overflow-x-auto scrollbar-hide"
            style={{
              background: 'linear-gradient(180deg, rgba(30,32,38,1) 0%, rgba(22,24,28,1) 100%)',
              borderRadius: '5px',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4), inset 0 -1px 0 rgba(255,255,255,0.03)',
              overscrollBehaviorX: 'contain',
            }}
          >
            {TABS.map((tab, idx) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`panel-${tab.id}`}
                  id={`tab-${tab.id}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(e) => {
                    const tabIds = TABS.map(t => t.id);
                    const curIdx = tabIds.indexOf(tab.id);
                    let nextIdx = -1;
                    if (e.key === 'ArrowRight') nextIdx = (curIdx + 1) % tabIds.length;
                    if (e.key === 'ArrowLeft') nextIdx = (curIdx - 1 + tabIds.length) % tabIds.length;
                    if (e.key === 'Home') nextIdx = 0;
                    if (e.key === 'End') nextIdx = tabIds.length - 1;
                    if (nextIdx >= 0) {
                      e.preventDefault();
                      setActiveTab(tabIds[nextIdx]);
                      document.getElementById(`tab-${tabIds[nextIdx]}`)?.focus();
                    }
                  }}
                  className="group relative shrink-0 sm:flex-1 sm:min-w-0 whitespace-nowrap transition-all duration-200 ease-out"
                  style={{
                    padding: '0',
                    margin: isActive ? '0' : '0',
                    outline: 'none',
                  }}
                >
                  {/* The tab face — this is the raised 3D surface */}
                  <span
                    className="relative block"
                    style={{
                      padding: '13px 14px 12px',
                      margin: isActive ? '3px 2px 0' : '4px 2px 1px',
                      borderRadius: isActive ? '4px 4px 0 0' : '3px',
                      background: isActive
                        ? 'linear-gradient(180deg, rgba(40,42,50,1) 0%, rgba(32,34,40,1) 60%, rgba(28,30,36,1) 100%)'
                        : 'linear-gradient(180deg, rgba(32,34,40,0.6) 0%, rgba(26,28,34,0.4) 100%)',
                      border: isActive
                        ? '1px solid rgba(196,169,106,0.3)'
                        : '1px solid rgba(255,255,255,0.06)',
                      borderBottom: isActive ? '1px solid rgba(32,34,40,1)' : '1px solid rgba(255,255,255,0.06)',
                      boxShadow: isActive
                        ? '0 -2px 8px rgba(196,169,106,0.08), 0 -1px 3px rgba(196,169,106,0.06), inset 0 1px 0 rgba(255,255,255,0.07), 0 2px 6px rgba(0,0,0,0.3)'
                        : 'inset 0 1px 0 rgba(255,255,255,0.03), 0 1px 2px rgba(0,0,0,0.15)',
                      transition: 'all 0.2s ease-out',
                    }}
                  >
                    {/* WCAG focus ring — 2px solid, clearly visible */}
                    <span
                      className="absolute inset-0 rounded-[3px] pointer-events-none opacity-0 group-focus-visible:opacity-100"
                      style={{
                        border: '2px solid rgba(196,169,106,0.8)',
                        boxShadow: '0 0 0 2px rgba(196,169,106,0.25)',
                      }}
                    />

                    {/* Active: gold accent bar at top — the "lit edge" */}
                    {isActive && (
                      <span
                        className="absolute top-0 left-[10%] right-[10%] h-[2px] rounded-full"
                        style={{
                          background: 'linear-gradient(90deg, transparent, #C4A96A 30%, #D4B97A 50%, #C4A96A 70%, transparent)',
                          boxShadow: '0 0 12px rgba(196,169,106,0.3), 0 0 4px rgba(196,169,106,0.2)',
                        }}
                      />
                    )}

                    {/* Tab label — WCAG AA: active ≥ 7:1, inactive ≥ 4.5:1 */}
                    <span
                      className="relative block text-center"
                      style={{
                        fontFamily: "'Inter', var(--font-sans), system-ui, sans-serif",
                        fontSize: '11px',
                        fontWeight: isActive ? 600 : 450,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase' as const,
                        color: isActive
                          ? '#D4B97A'           /* Gold on #282A32 ≈ 7.2:1 contrast */
                          : '#9BA3B2',           /* WCAG-12: Slate on dark bg ≈ 5.3:1 — comfortably above 4.5:1 */
                        transition: 'color 0.2s ease-out',
                      }}
                    >
                      {tab.label}
                    </span>
                  </span>

                  {/* Divider between inactive tabs */}
                  {idx < TABS.length - 1 && !isActive && activeTab !== TABS[idx + 1]?.id && (
                    <span
                      className="absolute right-0 top-[25%] bottom-[25%] w-px"
                      style={{
                        background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0.08) 70%, transparent)',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
          {/* Scroll fade indicators for mobile — BUG-M7 */}
          <div
            className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 md:hidden"
            style={{
              background: 'linear-gradient(to right, rgba(22,24,28,0.95), transparent)',
              borderRadius: '5px 0 0 5px',
            }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 md:hidden"
            style={{
              background: 'linear-gradient(to left, rgba(22,24,28,0.95), transparent)',
              borderRadius: '0 5px 5px 0',
            }}
            aria-hidden="true"
          />
          </div>
        </div>
      </div>

      {/* ── Session 2: Mobile hamburger — opens sidebar overlay ── */}
      {/* Hidden: redundant with the 6-tab dropdown above. Kept to preserve sidebar overlay wiring. */}
      {isMobile && (
        <div className="hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open pipeline navigation"
          />
        </div>
      )}

      {/* ── Session 2: 3-column grid layout ───────────────────────────── */}
      <div
        className="relative max-w-[1920px] mx-auto"
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile
            ? '1fr'
            : sidebarCollapsed
              ? (rightRailOpen && windowWidth >= 1440
                  ? '48px minmax(0, 1fr) 320px'
                  : '48px minmax(0, 1fr)')
              : (rightRailOpen && windowWidth >= 1440
                  ? 'minmax(0, 1fr) 320px'
                  : 'minmax(0, 1fr)'),
          minHeight: 'calc(100vh - 120px)',
        }}
      >
        {/* ════════════════════════════════════════════════════════════════
            LEFT SIDEBAR — Pipeline Navigation
            Hidden on mobile (< 768px), shown as inline grid column on desktop
            Collapsible: thin icon strip when collapsed, full panel when expanded
            ════════════════════════════════════════════════════════════════ */}
        {!isMobile && sidebarCollapsed && (
          <aside
            className="border-r border-white/[0.06] bg-white/[0.015] flex flex-col items-center"
            style={{ position: 'sticky', top: 120, height: 'calc(100vh - 120px)' }}
          >
            {/* Expand toggle — sidebar panel icon */}
            <button
              onClick={() => setSidebarCollapsed(false)}
              title="Expand pipeline panel"
              className="w-full flex items-center justify-center py-3 border-b border-white/[0.06] text-text-secondary hover:text-text-primary transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 3v18" />
                <polyline points="14 10 17 12 14 14" />
              </svg>
            </button>

            {/* Zone icon buttons — no dots, just single-letter identifiers */}
            <nav aria-label="Pipeline zones" className="flex flex-col items-center gap-1 py-2 w-full">
              {ZONES.map((zone) => {
                const isActiveZone = activeZone === zone.id;
                const initial = zone.label.charAt(0);
                return (
                  <button
                    key={zone.id}
                    title={zone.label}
                    onClick={() => {
                      const firstTab = TABS.find((t) => t.zone === zone.id);
                      if (firstTab) setActiveTab(firstTab.id);
                    }}
                    className={`w-8 h-8 rounded flex items-center justify-center text-[11px] font-semibold transition-colors ${
                      isActiveZone
                        ? 'bg-white/[0.08] text-[var(--color-aurum-primary)] border border-[var(--color-aurum-primary)]/25'
                        : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.06] border border-transparent'
                    }`}
                  >
                    {initial}
                  </button>
                );
              })}
            </nav>
          </aside>
        )}

        {/* ── Floating draggable pipeline panel (desktop, expanded) ─── */}
        {!isMobile && !sidebarCollapsed && (
          <aside
            className="border border-white/[0.08] bg-[var(--background)] rounded-lg overflow-hidden"
            style={{
              position: 'fixed',
              left: sidebarFloatPos.x,
              top: sidebarFloatPos.y,
              width: 220,
              maxHeight: 'calc(100vh - 48px)',
              zIndex: 45,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Drag handle + collapse toggle + Layout button */}
            <div
              className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] bg-white/[0.02] select-none"
              style={{ cursor: 'grab' }}
              onMouseDown={onSidebarDragStart}
            >
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSidebarCollapsed(true)}
                  title="Collapse pipeline panel"
                  className="text-text-secondary hover:text-text-primary transition-colors p-0.5 -ml-0.5"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M9 3v18" />
                    <polyline points="16 10 13 12 16 14" />
                  </svg>
                </button>
                {/* Drag grip icon */}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/20 mr-0.5">
                  <circle cx="8" cy="4" r="1.5" fill="currentColor" /><circle cx="16" cy="4" r="1.5" fill="currentColor" />
                  <circle cx="8" cy="12" r="1.5" fill="currentColor" /><circle cx="16" cy="12" r="1.5" fill="currentColor" />
                  <circle cx="8" cy="20" r="1.5" fill="currentColor" /><circle cx="16" cy="20" r="1.5" fill="currentColor" />
                </svg>
                <span className="text-[11px] font-semibold tracking-[0.1em] text-text-secondary uppercase">
                  Pipeline
                </span>
              </div>
              <button
                onClick={toggleGridEditing}
                onMouseDown={(e) => e.stopPropagation()}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                  gridEditing
                    ? 'bg-[var(--color-aurum-primary)]/15 text-[var(--color-aurum-primary)] border border-[var(--color-aurum-primary)]/25'
                    : 'bg-white/[0.04] text-text-secondary hover:text-text-primary border border-white/[0.06] hover:bg-white/[0.08]'
                }`}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                </svg>
                {gridEditing ? 'Done' : 'Layout'}
              </button>
            </div>

            {/* Zone groups with pipeline stages — scrollable */}
            <nav aria-label="Pipeline stages" className="py-2 overflow-y-auto flex-1">
              {ZONES.map((zone) => {
                const stages = PIPELINE_STAGES.filter((s) => s.zone === zone.id);
                const isActiveZone = activeZone === zone.id;
                return (
                  <div key={zone.id} className="mb-1">
                    {/* Zone header */}
                    <button
                      onClick={() => {
                        const firstTab = TABS.find((t) => t.zone === zone.id);
                        if (firstTab) setActiveTab(firstTab.id);
                      }}
                      className={`w-full text-center px-3 py-2 mt-1 transition-colors border-b border-white/[0.06] ${
                        isActiveZone
                          ? 'text-[var(--color-aurum-primary)]'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <span className="text-[13px] font-bold tracking-[0.1em] uppercase">
                        {zone.label}
                      </span>
                    </button>

                    {/* Pipeline stages */}
                    {stages.map((stage) => {
                      const status = computeStageStatus(stage.id, data);
                      const tabId = stageToTab[stage.id];
                      const isActive = tabId === activeTab;
                      return (
                        <button
                          key={stage.id}
                          onClick={() => { if (tabId) setActiveTab(tabId); }}
                          className={`w-full flex items-center gap-2 pl-5 pr-3 py-1.5 text-left transition-colors ${
                            isActive
                              ? 'bg-white/[0.08] text-text-primary border-l-2 border-[var(--color-aurum-primary)]'
                              : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04] border-l-2 border-transparent'
                          }`}
                        >
                          {/* Status dot — WCAG-4: shape varies by status */}
                          <span
                            className={`w-2 h-2 shrink-0 ${statusDotClass(status)}`}
                            style={{ background: statusDotColor(status), boxShadow: `0 0 4px ${statusDotColor(status)}` }}
                            aria-label={status}
                          />
                          <span className="text-[11px] truncate">{stage.label}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </nav>

            {/* Right rail toggle at bottom of sidebar */}
            {windowWidth >= 1280 && (
              <div className="px-3 py-2 border-t border-white/[0.06]">
                <button
                  onClick={() => setRightRailOpen(!rightRailOpen)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] text-text-secondary hover:text-text-primary hover:bg-white/[0.06] transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M15 3v18" />
                  </svg>
                  {rightRailOpen ? 'Close Context' : 'Open Context'}
                </button>
              </div>
            )}
          </aside>
        )}

        {/* ── Mobile sidebar overlay — WCAG-6: dialog role + focus trap ── */}
        {isMobile && sidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
            <aside
              role="dialog"
              aria-modal="true"
              aria-label="Pipeline navigation"
              ref={(el) => {
                if (el) {
                  const closeBtn = el.querySelector<HTMLButtonElement>('[aria-label="Close navigation"]');
                  closeBtn?.focus();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setSidebarOpen(false); return; }
                if (e.key === 'Tab') {
                  const focusable = e.currentTarget.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                  if (focusable.length === 0) return;
                  const first = focusable[0];
                  const last = focusable[focusable.length - 1];
                  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
                }
              }}
              className="fixed left-0 top-0 bottom-0 w-[260px] z-50 bg-[var(--background)] border-r border-white/[0.06] overflow-y-auto"
              style={{ boxShadow: '8px 0 32px rgba(0,0,0,0.4)' }}
            >
              {/* Mobile sidebar header */}
              <div className="flex items-center justify-between px-3 py-3 border-b border-white/[0.06]">
                <span className="text-[11px] font-semibold tracking-[0.1em] text-text-secondary uppercase">
                  Pipeline
                </span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2.5 rounded hover:bg-white/[0.06] transition-colors text-text-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-aurum focus-visible:outline-none min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Close navigation"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <nav aria-label="Pipeline stages" className="py-2">
                {ZONES.map((zone) => {
                  const stages = PIPELINE_STAGES.filter((s) => s.zone === zone.id);
                  const isActiveZone = activeZone === zone.id;
                  return (
                    <div key={zone.id} className="mb-1">
                      <button
                        onClick={() => {
                          const firstTab = TABS.find((t) => t.zone === zone.id);
                          if (firstTab) { setActiveTab(firstTab.id); setSidebarOpen(false); }
                        }}
                        className={`w-full text-center px-3 py-2 transition-colors ${
                          isActiveZone
                            ? 'text-[var(--color-aurum-primary)]'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        <span className="text-[11px] font-semibold tracking-[0.12em] uppercase">
                          {zone.label}
                        </span>
                      </button>
                      {stages.map((stage) => {
                        const status = computeStageStatus(stage.id, data);
                        const tabId = stageToTab[stage.id];
                        const isActive = tabId === activeTab;
                        return (
                          <button
                            key={stage.id}
                            onClick={() => { if (tabId) { setActiveTab(tabId); setSidebarOpen(false); } }}
                            className={`w-full flex items-center gap-2.5 px-4 py-2 text-left transition-colors ${
                              isActive
                                ? 'bg-white/[0.08] text-text-primary'
                                : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 shrink-0 ${statusDotClass(status)}`}
                              style={{ background: statusDotColor(status) }}
                              aria-label={status}
                            />
                            <span className="text-xs">{stage.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </nav>
              {/* Bottom close button — second escape point for focus trap */}
              <div className="px-3 py-3 border-t border-white/[0.06]">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="w-full flex items-center justify-center gap-2 min-h-[44px] rounded-md border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] transition-colors text-text-secondary hover:text-text-primary text-xs font-medium focus-visible:ring-2 focus-visible:ring-aurum focus-visible:outline-none"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                  Close Menu
                </button>
              </div>
            </aside>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════
            MAIN CONTENT AREA
            ════════════════════════════════════════════════════════════════ */}
        <StaggerContainer as="main" className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 overflow-y-auto min-w-0">
          {/* Stale valuation warning */}
          {staleWarning && (
            <StaggerItem>
              <div className="flex items-start gap-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3">
                <svg className="h-4 w-4 mt-0.5 shrink-0 text-status-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-status-warning">Valuation may be stale</p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">{staleWarning}</p>
                </div>
                <button
                  onClick={handleRunValuation}
                  disabled={isRunning}
                  className="shrink-0 rounded-md border px-3 py-1.5 text-[11px] font-medium transition-all disabled:opacity-50"
                  style={{
                    borderColor: runSuccess ? 'rgba(52, 212, 102, 0.3)' : 'rgba(245, 158, 11, 0.25)',
                    background: runSuccess ? 'rgba(52, 212, 102, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    color: runSuccess ? '#34D466' : undefined,
                  }}
                >
                  {isRunning ? 'Running...' : runSuccess ? 'Results Ready' : 'Re-run'}
                </button>
              </div>
            </StaggerItem>
          )}

          {/* KPI Cards */}
          <StaggerItem>
            <KpiCards
              methodsUsed={enabledMethods.length}
              totalMethods={methods.length}
              mcP10={mcResult?.p10 ?? null}
              mcMedian={mcResult?.p50 ?? mcResult?.mean ?? null}
              mcExceedancePct={mcResult?.distribution && baseEV > 0
                ? Math.round((mcResult.distribution.filter(v => v > baseEV).length / mcResult.distribution.length) * 100)
                : null
              }
              optionUpliftPct={hybridResult?.optionUpliftPercent ?? null}
              cohortPercentile={cohortData.peerCount >= 2 && baseEV > 0 && cohortData.cohortP75 > 0
                ? Math.min(99, Math.round((baseEV / cohortData.cohortP75) * 75))
                : null
              }
              cohortLabel={cohortData.cohortLabel || `vs ${run.companyStage ?? 'peer'} ${run.companySector ?? 'tech'} cohort`}
              topLeverName={tornadoBars.length > 0 ? tornadoBars[0].variable : null}
              topLeverImpact={tornadoBars.length > 0 ? Math.max(tornadoBars[0].highResult - tornadoBars[0].baseResult, 0) : null}
              evBase={baseEV}
            />
          </StaggerItem>

          {/* Session 27: What-Changed Diff Panel — auto-appears after re-run */}
          {diffVisible && previousSnapshot && (
            <StaggerItem>
              <WhatChangedDiff
                previous={previousSnapshot}
                current={{
                  ev: baseEV,
                  confidence: run.confidence !== null && run.confidence !== undefined ? Math.round(run.confidence * 100) : 0,
                  methodsUsed: enabledMethods.length,
                  risks: (run.risks ?? []) as string[],
                  methodWeights: enabledMethods.map((m) => ({ name: m.method, weight: Math.round(m.weight * 100) })),
                }}
                onDismiss={() => { setDiffVisible(false); setPreviousSnapshot(null); }}
              />
            </StaggerItem>
          )}

          {/* Scenario Dial (read-only — buyer-type control moved to sticky header, Session 3) */}
          <StaggerItem>
            <Suspense fallback={<LazyFallback />}>
              <ScenarioDial selectedBuyerType={buyerType} />
            </Suspense>
          </StaggerItem>

          {/* ── Scroll spy ribbon — Thesis tab only — BUG-M8: now visible on mobile ── */}
          {activeTab === 'thesis' && visiblePanelIds.length > 0 && (
            <div className="sm:sticky sm:top-[112px] z-20 -mx-1 mb-3">
              <div className="flex items-center gap-0.5 px-2 py-1.5 rounded-md border border-white/[0.06] bg-[var(--background)]/90 backdrop-blur-sm overflow-x-auto scrollbar-hide">
                <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-text-secondary mr-1.5 shrink-0">
                  Jump to
                </span>
                {visiblePanelIds.map((id) => (
                  <button
                    key={id}
                    onClick={() => {
                      const el = document.querySelector<HTMLElement>(`[data-panel-id="${id}"]`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-medium transition-colors whitespace-nowrap flex items-center ${
                      activePanelId === id
                        ? 'bg-white/[0.08] text-[var(--color-aurum-primary)] border border-[var(--color-aurum-primary)]/20'
                        : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04] border border-transparent'
                    }`}
                  >
                    {PANEL_LABELS[id] ?? id}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Tab Content ─────────────────────────────────────────── */}
          <StaggerItem>
          <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>

            {/* ── Tab 1: Thesis — narrative, methods, bridge, sensitivity ── */}
            {activeTab === 'thesis' && (
              <Suspense fallback={<LazyFallback />}>
              <DraggableGrid defaultItems={DEFAULT_THESIS_GRID} isEditingExternal={gridEditing} onToggleEditingExternal={toggleGridEditing} storageKey="ltm-grid-thesis" onVisibleItemsChange={handleVisibleItemsChange}>
                {{
                  'intelligence-nexus': (
                    <ChartCard title="Intelligence Nexus" {...panelCollapseProps} newDataBadge={hasNewData('intelligence-nexus')}>
                      <Suspense fallback={<LazyFallback />}>
                        <CompanyIntelligenceNexus
                          companyName={run.companyName}
                          sector={run.companySector ?? 'Other'}
                          stage={run.companyStage ?? 'growth'}
                          confidence={run.confidence ?? 0}
                          evLow={run.enterpriseValue?.low ?? null}
                          evBase={baseEV}
                          evHigh={run.enterpriseValue?.high ?? null}
                          methods={methods}
                          mcResult={mcResult}
                          buyerType={buyerType}
                          risks={run.reconciledResult?.risks ?? run.risks ?? []}
                          opportunities={run.reconciledResult?.opportunities ?? run.opportunities ?? []}
                          ruleOf40={run.reconciledResult?.ruleOf40 ?? null}
                          clockState={'fresh'}
                        />
                      </Suspense>
                    </ChartCard>
                  ),
                  'olivia-inline': (
                    <ChartCard title="Investment Thesis" {...panelCollapseProps} newDataBadge={hasNewData('olivia-inline')}>
                      <OliviaNarrative
                        narrative={run.justification}
                        justificationFull={run.justificationFull}
                        challenge={run.challenge}
                        counterNarrative={run.counterNarrative}
                        buyerType={buyerType}
                      />
                    </ChartCard>
                  ),
                  'method-stack': (
                    <ChartCard title="Method Stack" {...panelCollapseProps} newDataBadge={hasNewData('method-stack')}>
                      <MethodStackPanel methods={methods} disagreements={disagreements} />
                    </ChartCard>
                  ),
                  'waterfall-bridge': (
                    <ChartCard title="Valuation Bridge" {...panelCollapseProps} newDataBadge={hasNewData('waterfall-bridge')}>
                      <ValuationBridge
                        methods={methods}
                        reconciledBase={run.enterpriseValue?.base ?? null}
                      />
                    </ChartCard>
                  ),
                  'tornado': (
                    <ChartCard title="Tornado Sensitivity" {...panelCollapseProps} newDataBadge={hasNewData('tornado')}>
                      <TornadoChart bars={tornadoBars} />
                    </ChartCard>
                  ),
                  'sliders': (
                    <ChartCard title="Sensitivity Sliders" {...panelCollapseProps} newDataBadge={hasNewData('sliders')}>
                      <SensitivitySliders
                        variables={sensitivityVars}
                        baseEV={baseEV}
                        onRecalculate={handleSliderRecalculate}
                      />
                    </ChartCard>
                  ),
                }}
              </DraggableGrid>
              </Suspense>
            )}

            {/* ── Tab 2: Risk Lab — risk matrix, risks & opps, pre-mortem ── */}
            {activeTab === 'risk' && (
              <Suspense fallback={<LazyFallback />}>
                <DraggableGrid defaultItems={DEFAULT_RISK_GRID} isEditingExternal={gridEditing} onToggleEditingExternal={toggleGridEditing} storageKey="ltm-grid-risk">
                  {{
                    'risk-matrix': (
                      <ChartCard title="Risk Matrix" {...panelCollapseProps} newDataBadge={hasNewData('risk-matrix')}>
                        <RiskMatrix
                          risks={run.risks ?? []}
                          opportunities={run.opportunities ?? []}
                        />
                      </ChartCard>
                    ),
                    'risk-opportunity': (
                      <ChartCard title="Risks & Opportunities" {...panelCollapseProps} newDataBadge={hasNewData('risk-opportunity')}>
                        <RiskOpportunityPanel
                          risks={run.risks ?? []}
                          opportunities={run.opportunities ?? []}
                        />
                      </ChartCard>
                    ),
                    'pre-mortem': (
                      <ChartCard title="Pre-Mortem Analysis" {...panelCollapseProps} newDataBadge={hasNewData('pre-mortem')}>
                        <PreMortemPanel preMortem={preMortem} />
                      </ChartCard>
                    ),
                  }}
                </DraggableGrid>
              </Suspense>
            )}

            {/* ── Tab 3: Comps & Evidence — fingerprint, cohort, evidence, heatmap, lineage ── */}
            {activeTab === 'comps' && (
              <Suspense fallback={<LazyFallback />}>
                <DraggableGrid defaultItems={DEFAULT_COMPS_GRID} isEditingExternal={gridEditing} onToggleEditingExternal={toggleGridEditing} storageKey="ltm-grid-comps">
                  {{
                    'fingerprint': fingerprintData.length > 0 ? (
                      <ChartCard title="Comparable Fingerprint" {...panelCollapseProps} newDataBadge={hasNewData('fingerprint')}>
                        <ComparableFingerprint
                          data={fingerprintData}
                          companyName={run.companyName}
                        />
                      </ChartCard>
                    ) : (
                      <div className="glass-card p-6 text-center text-text-secondary text-[11px]">
                        No comparable fingerprint data available
                      </div>
                    ),
                    'cohort-benchmark': cohortData.peerCount >= 2 ? (
                      <ChartCard title="Cohort Benchmark" {...panelCollapseProps} newDataBadge={hasNewData('cohort-benchmark')}>
                        <CohortBenchmark
                          companyName={run.companyName}
                          companyEV={baseEV}
                          stage={run.companyStage}
                          sector={run.companySector}
                          cohortP25={cohortData.cohortP25}
                          cohortMedian={cohortData.cohortMedian}
                          cohortP75={cohortData.cohortP75}
                        />
                      </ChartCard>
                    ) : (
                      <ChartCard title="Cohort Benchmark" {...panelCollapseProps}>
                        <div className="text-center py-6">
                          <p className="text-xs text-text-secondary">Needs 2+ peer valuations in the same stage and sector to display real benchmark data.</p>
                          <p className="text-[11px] text-text-tertiary mt-1">Current cohort: {run.companyStage?.replace(/_/g, ' ')} · {run.companySector}</p>
                        </div>
                      </ChartCard>
                    ),
                    'evidence-room': (
                      <ChartCard title="Evidence Room" {...panelCollapseProps} newDataBadge={hasNewData('evidence-room')}>
                        <EvidenceRoom
                          evidenceChain={data.evidenceChain}
                          valuationRunId={valuationRunId}
                        />
                      </ChartCard>
                    ),
                    'document-heatmap': (
                      <ChartCard title="Document Heatmap" {...panelCollapseProps} newDataBadge={hasNewData('document-heatmap')}>
                        <DocumentHeatmap inputSnapshot={run.inputSnapshot} />
                      </ChartCard>
                    ),
                    'data-lineage': (
                      <ChartCard title="Data Lineage" {...panelCollapseProps} newDataBadge={hasNewData('data-lineage')}>
                        <Suspense fallback={<LazyFallback />}>
                          <DataLineageSankey
                            evidenceChainCount={data.evidenceChain.length}
                            documentTypes={[...new Set(data.evidenceChain.map((e) => e.documentType))]}
                            fieldCount={Object.keys(run.inputSnapshot ?? {}).filter((k) => {
                              const v = (run.inputSnapshot as Record<string, unknown>)?.[k];
                              return v && typeof v === 'object' && 'value' in (v as Record<string, unknown>);
                            }).length}
                            methods={methods}
                            hasMonteCarlo={mcResult !== null}
                            hasScenarios={scenarioResults.length > 0}
                            hasRealOptions={treeNodes.length > 0}
                            finalEV={baseEV}
                          />
                        </Suspense>
                      </ChartCard>
                    ),
                  }}
                </DraggableGrid>
              </Suspense>
            )}

            {/* ── Tab 4: Stochastic Lab — Monte Carlo, scenarios, real options ── */}
            {activeTab === 'stochastic' && (
              <Suspense fallback={<LazyFallback />}>
                <DraggableGrid defaultItems={DEFAULT_STOCHASTIC_GRID} isEditingExternal={gridEditing} onToggleEditingExternal={toggleGridEditing} storageKey="ltm-grid-stochastic">
                  {{
                    'histogram': mcResult ? (
                      <ChartCard title="Monte Carlo Histogram" {...panelCollapseProps} newDataBadge={hasNewData('histogram')}>
                        <MonteCarloHistogram
                          mcResult={mcResult}
                          hybridResult={hybridResult}
                        />
                      </ChartCard>
                    ) : (
                      <EmptyState
                        icon={
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-aurum-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 3v18h18" />
                            <path d="M7 16l4-8 4 5 5-9" />
                          </svg>
                        }
                        title="No Monte Carlo Data"
                        description="No Monte Carlo simulation data available for this run. Run a valuation with Monte Carlo enabled to see the probability distribution."
                        action={{
                          label: 'Re-run Valuation',
                          onClick: handleRunValuation,
                          disabled: isRunning,
                        }}
                      />
                    ),
                    'scenario-comparison': (
                      <ChartCard title="Scenario Comparison" {...panelCollapseProps} newDataBadge={hasNewData('scenario-comparison')}>
                        <ScenarioComparison
                          scenarios={scenarioResults}
                          probabilityWeightedEV={probabilityWeightedEV}
                        />
                      </ChartCard>
                    ),
                    'binomial-tree': (
                      <ChartCard title="Binomial Tree" {...panelCollapseProps} newDataBadge={hasNewData('binomial-tree')}>
                        <BinomialTreeViz nodes={treeNodes} />
                      </ChartCard>
                    ),
                    'uplift-summary': mcResult && hybridResult ? (
                      <ChartCard title="Real Option Uplift" {...panelCollapseProps} newDataBadge={hasNewData('uplift-summary')}>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                          <div>
                            <span className="text-[11px] text-text-secondary uppercase tracking-wider block">
                              Base DCF Mean
                            </span>
                            <span className="text-sm font-bold tabular-nums text-text-primary">
                              {new Intl.NumberFormat('en-GB', {
                                style: 'currency',
                                currency: 'GBP',
                                maximumFractionDigits: 0,
                              }).format(hybridResult.baseMean)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[11px] text-text-secondary uppercase tracking-wider block">
                              Hybrid Mean (with CRR)
                            </span>
                            <span className="text-sm font-bold tabular-nums text-jade-upside">
                              {new Intl.NumberFormat('en-GB', {
                                style: 'currency',
                                currency: 'GBP',
                                maximumFractionDigits: 0,
                              }).format(hybridResult.hybridMean)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[11px] text-text-secondary uppercase tracking-wider block">
                              Option Uplift
                            </span>
                            <span className="text-sm font-bold tabular-nums text-cyan-interactive">
                              +{hybridResult.optionUpliftPercent.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </ChartCard>
                    ) : null,
                  }}
                </DraggableGrid>
              </Suspense>
            )}

            {/* ── Tab 5: Deal Room (Enterprise Only) ── */}
            {activeTab === 'dealroom' && !tierAtLeast(userTier, 'enterprise') && (
              <div className="glass-card p-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-aurum/10 border border-aurum/20">
                  <svg className="h-7 w-7 text-aurum" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">Enterprise Feature</h3>
                <p className="text-sm text-text-secondary mb-6 max-w-md mx-auto">
                  Deal Room and War Room are available on the <span className="text-aurum font-medium">{TIER_DISPLAY_NAMES.enterprise}</span> plan.
                  Upgrade to pressure-test valuations, run negotiation simulations, and prepare for investor conversations.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <a
                    href="/pricing"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-aurum text-bg-primary text-sm font-semibold hover:bg-aurum/90 transition-colors"
                  >
                    View Plans
                  </a>
                </div>
                <ul className="mt-6 space-y-2 text-left max-w-sm mx-auto">
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <svg className="h-4 w-4 text-jade-upside shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    War Room — Pressure-test with Cristiano
                  </li>
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <svg className="h-4 w-4 text-jade-upside shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    Deal Room Simulator — Negotiation modeling
                  </li>
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <svg className="h-4 w-4 text-jade-upside shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    Acquisition Mirror — Buyer perspective analysis
                  </li>
                  <li className="flex items-center gap-2 text-sm text-text-secondary">
                    <svg className="h-4 w-4 text-jade-upside shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    Full Synergy Vector (9th match signal)
                  </li>
                </ul>
              </div>
            )}
            {activeTab === 'dealroom' && tierAtLeast(userTier, 'enterprise') && (
              <Suspense fallback={<LazyFallback />}>
                <DraggableGrid defaultItems={DEFAULT_NEGOTIATE_GRID} isEditingExternal={gridEditing} onToggleEditingExternal={toggleGridEditing} storageKey="ltm-grid-negotiate">
                  {{
                    'war-room-header': (
                      <ChartCard title="War Room" {...panelCollapseProps} newDataBadge={hasNewData('war-room-header')}>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-text-secondary">
                            Pressure-test your valuation with Cristiano before investor conversations.
                          </p>
                          <button
                            onClick={() => setWarRoomActive(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-coral-downside/15 text-coral-downside border border-coral-downside/25 hover:bg-coral-downside/25 transition-colors focus-visible:ring-2 focus-visible:ring-aurum focus-visible:outline-none"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <rect x="2" y="3" width="20" height="14" rx="2" />
                              <path d="M8 21h8M12 17v4" />
                            </svg>
                            Launch War Room
                          </button>
                        </div>
                      </ChartCard>
                    ),
                    'equity-waterfall': (() => {
                      const snap = run.inputSnapshot as Record<string, unknown> | null;
                      const cashVal = (snap?.['cashOnHand'] as { value?: number } | undefined)?.value ?? 0;
                      const debtVal = (snap?.['debt'] as { value?: number } | undefined)?.value ?? 0;
                      const sharesVal = (snap?.['fullyDilutedShares'] as { value?: number } | undefined)?.value ?? null;
                      return (
                        <ChartCard title="Equity Waterfall" {...panelCollapseProps} newDataBadge={hasNewData('equity-waterfall')}>
                          <EquityWaterfall
                            enterpriseValue={run.enterpriseValue}
                            equityValue={run.equityValue}
                            dilutedEquityValue={run.reconciledResult?.dilutedEquityValue ?? null}
                            optionPoolPct={run.reconciledResult?.optionPoolPct ?? 0}
                            perShareValue={run.reconciledResult?.perShareValue ?? null}
                            fullyDilutedShares={sharesVal}
                            cashOnHand={cashVal}
                            debt={debtVal}
                          />
                        </ChartCard>
                      );
                    })(),
                    'deal-room': (
                      <ChartCard title="Deal Room Simulator" {...panelCollapseProps} newDataBadge={hasNewData('deal-room')}>
                        <DealRoomSimulator
                          companyName={run.companyName}
                          buyerType={buyerType}
                          enterpriseValue={run.enterpriseValue}
                          valuationRunId={valuationRunId}
                        />
                      </ChartCard>
                    ),
                    'acquisition-mirror': acquisitionMirror ? (
                      <ChartCard title="Acquisition Mirror" {...panelCollapseProps} newDataBadge={hasNewData('acquisition-mirror')}>
                        <AcquisitionMirror
                          mirror={acquisitionMirror}
                          companyName={run.companyName}
                        />
                      </ChartCard>
                    ) : null,
                    'negotiation-anchor': (
                      <ChartCard title="Negotiation Anchors" {...panelCollapseProps} newDataBadge={hasNewData('negotiation-anchor')}>
                        <NegotiationAnchorCard
                          companyName={run.companyName}
                          walkAway={negotiationAnchors.walkAway}
                          walkAwayRationale={negotiationAnchors.walkAwayRationale}
                          target={negotiationAnchors.target}
                          targetRationale={negotiationAnchors.targetRationale}
                          anchor={negotiationAnchors.anchor}
                          anchorRationale={negotiationAnchors.anchorRationale}
                          challengeResponses={negotiationAnchors.challengeResponses}
                        />
                      </ChartCard>
                    ),
                  }}
                </DraggableGrid>
              </Suspense>
            )}

            {/* War Room full-screen overlay (Session 22 + 22B document bridge) */}
            {warRoomActive && (
              <Suspense fallback={<LazyFallback />}>
                <WarRoom
                  companyName={run.companyName}
                  buyerType={buyerType}
                  enterpriseValue={run.enterpriseValue}
                  valuationRunId={valuationRunId}
                  acquisitionMirror={acquisitionMirror}
                  negotiationAnchors={{
                    walkAway: negotiationAnchors.walkAway,
                    walkAwayRationale: negotiationAnchors.walkAwayRationale,
                    target: negotiationAnchors.target,
                    targetRationale: negotiationAnchors.targetRationale,
                    anchor: negotiationAnchors.anchor,
                    anchorRationale: negotiationAnchors.anchorRationale,
                    challengeResponses: negotiationAnchors.challengeResponses,
                  }}
                  evidenceChain={data.evidenceChain}
                  onExit={() => setWarRoomActive(false)}
                />
              </Suspense>
            )}

            {/* ── Tab 6: Deliverables — board letter, export, history ── */}
            {activeTab === 'deliverables' && (
              <Suspense fallback={<LazyFallback />}>
                <div className="space-y-6">
                  <ChartCard title="Board Letters" {...panelCollapseProps} newDataBadge={hasNewData('board-letter')}>
                    <ValuationLetter
                      companyName={run.companyName}
                      buyerType={buyerType}
                      letterContent={letterContent}
                      justificationFull={run.justificationFull}
                      challenge={run.challenge}
                      valuationDate={run.completedAt}
                    />
                  </ChartCard>
                  <ChartCard title="Export Studio" {...panelCollapseProps} newDataBadge={hasNewData('export-studio')}>
                    <ExportPanel
                      valuationRunId={valuationRunId}
                      companyName={run.companyName}
                    />
                  </ChartCard>
                  <ChartCard title="Valuation Timeline" {...panelCollapseProps} newDataBadge={hasNewData('valuation-timeline')}>
                    <ValuationTimeline dataPoints={timelinePoints} />
                  </ChartCard>
                </div>
              </Suspense>
            )}
          </div>
          </StaggerItem>
        </StaggerContainer>

        {/* ════════════════════════════════════════════════════════════════
            RIGHT CONTEXT RAIL — Slide-over drawer (Session 2)
            Olivia narrative + zone context + glossary
            320px fixed width, only visible on >=1280px when toggled
            ════════════════════════════════════════════════════════════════ */}
        {rightRailOpen && windowWidth >= 1280 && (
          <aside
            className="border-l border-white/[0.06] bg-white/[0.015] overflow-y-auto"
            style={{
              position: windowWidth >= 1440 ? 'sticky' : 'fixed',
              top: windowWidth >= 1440 ? 120 : 0,
              right: windowWidth >= 1440 ? undefined : 0,
              height: windowWidth >= 1440 ? 'calc(100vh - 120px)' : '100vh',
              width: windowWidth >= 1440 ? undefined : 320,
              zIndex: windowWidth >= 1440 ? 1 : 50,
              boxShadow: windowWidth < 1440 ? '-8px 0 32px rgba(0,0,0,0.4)' : 'none',
            }}
          >
            {/* Rail header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <span className="text-[11px] font-semibold tracking-[0.1em] text-text-secondary uppercase">
                Context
              </span>
              <button
                onClick={() => setRightRailOpen(false)}
                className="p-1.5 rounded hover:bg-white/[0.06] transition-colors text-text-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-aurum focus-visible:outline-none"
                aria-label="Close context rail"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Zone context description */}
            <div className="px-4 py-4 border-b border-white/[0.06]">
              <h3 className="text-xs font-semibold text-[var(--color-aurum-primary)] mb-1.5">
                {ZONE_CONTEXT[activeZone].title}
              </h3>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                {ZONE_CONTEXT[activeZone].description}
              </p>
            </div>

            {/* Condensed narrative summary — full debate lives in Tab 1 (Thesis) */}
            <div className="px-4 py-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(196,169,106,0.15)', border: '1px solid rgba(196,169,106,0.30)' }}>
                  <span className="text-[10px] font-bold" style={{ color: 'rgba(196,169,106,0.85)' }}>O</span>
                </div>
                <span className="text-[11px] font-semibold text-text-primary">Olivia&apos;s Summary</span>
              </div>
              {run.justification ? (
                <p className="text-[11px] text-text-secondary leading-relaxed" style={{ display: '-webkit-box', WebkitLineClamp: 6, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {run.justification}
                </p>
              ) : (
                <p className="text-[11px] text-text-secondary italic">Run a valuation to generate the narrative.</p>
              )}
              {run.challenge && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(148,163,184,0.12)', border: '1px solid rgba(148,163,184,0.30)' }}>
                    <span className="text-[10px] font-bold" style={{ color: 'rgb(148,163,184)' }}>C</span>
                  </div>
                  <span className="text-[11px] text-text-secondary">Cristiano&apos;s challenge available</span>
                </div>
              )}
              <button
                onClick={() => setActiveTab('thesis')}
                className="text-[11px] font-semibold px-0 py-0 border-0 cursor-pointer transition-colors"
                style={{ color: 'var(--color-aurum-primary)', background: 'transparent' }}
              >
                View full debate in Thesis tab →
              </button>
            </div>

            {/* Evidence summary */}
            <div className="px-4 py-3 border-t border-white/[0.06]">
              <p className="text-[11px] text-text-secondary uppercase tracking-wider font-semibold mb-2">Evidence Chain</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-text-secondary">Documents</span>
                  <span className="text-text-primary font-mono tabular-nums">{data.evidenceChain.length}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-text-secondary">Methods enabled</span>
                  <span className="text-text-primary font-mono tabular-nums">{enabledMethods.length}/{methods.length}</span>
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Right rail drawer backdrop on <1440px */}
        {rightRailOpen && windowWidth >= 1280 && windowWidth < 1440 && (
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setRightRailOpen(false)}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Cmd+K Command Palette + Keyboard Shortcuts (Session 19) */}
      <CommandPalette
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRunValuation={handleRunValuation}
        onBuyerTypeChange={setBuyerType}
        isRunning={isRunning}
      />
    </>
    </GlossaryToggleProvider>
  );
}
