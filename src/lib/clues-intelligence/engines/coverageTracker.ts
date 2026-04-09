/**
 * CLUES Intelligence — Coverage Tracker
 *
 * Tracks data coverage across 23 life dimensions (modules).
 * Each dimension has a signal strength, consistency score, and data point count.
 * Used by the Adaptive Engine to determine which modules need more data.
 *
 * This is PURE MATH — no LLM calls. Runs client-side, instant, free.
 *
 * CLUES predicts: best country → top 3 cities → top 3 towns → top 3 neighborhoods
 * Coverage determines how confident those predictions are.
 */

import { MODULES, type ModuleDefinition } from '../data/modules';
import { getModuleQuestions } from '../data/questions';
import type { QuestionItem } from '../data/questions/types';
import type {
  GeminiExtraction,
  DemographicAnswers,
  DNWAnswers,
  MHAnswers,
  TradeoffAnswers,
  GeneralAnswers,
} from '../types';

// ─── Types ────────────────────────────────────────────────────────

/** Coverage state for a single module/dimension */
export interface DimensionCoverage {
  moduleId: string;
  moduleName: string;

  /** Number of data points collected for this dimension */
  dataPoints: number;

  /** How strong the signal is (0-1). More data points + higher severity/importance = stronger */
  signalStrength: number;

  /** Do the signals agree with each other? (0-1). 1 = all signals consistent, 0 = contradictory */
  signalConsistency: number;

  /** How much this dimension matters for THIS user's recommendation (0-1) */
  weight: number;

  /** This dimension's contribution to overall MOE (0-1) */
  moeContribution: number;

  /** Sources: which upstream data contributed */
  sources: CoverageSource[];
}

export type CoverageSourceType =
  | 'paragraphical'
  | 'demographics'
  | 'dnw'
  | 'mh'
  | 'tradeoffs'
  | 'general'
  | 'mini_module';

export interface CoverageSource {
  type: CoverageSourceType;
  dataPoints: number;
  avgStrength: number;
}

/** Overall coverage state across all 23 dimensions */
export interface CoverageState {
  dimensions: DimensionCoverage[];
  overallMOE: number;          // 0-1 (0.02 = 2% target)
  overallCoverage: number;     // 0-1 (percentage of dimensions with adequate data)
  totalDataPoints: number;
  isReportReady: boolean;      // true when overallMOE <= 0.02
  gapAnalysis: CoverageGap[];
}

export interface CoverageGap {
  moduleId: string;
  moduleName: string;
  severity: 'critical' | 'moderate' | 'minor';
  reason: string;
  estimatedQuestionsToResolve: number;
}

// ─── Question-data-driven module lookup ───────────────────────────

/**
 * Look up a main_module question by number and return its modules field.
 * Replaces hardcoded DNW_MODULE_MAP / MH_MODULE_MAP — the mapping now
 * lives on each QuestionItem.modules, co-located with the question text.
 */
let _mainModuleQuestions: QuestionItem[] | null = null;
function getMainModuleQuestion(questionNumber: number): QuestionItem | undefined {
  if (!_mainModuleQuestions) {
    _mainModuleQuestions = getModuleQuestions('main_module');
  }
  return _mainModuleQuestions.find(q => q.number === questionNumber);
}

/**
 * Build a keyword → modules index from all question text.
 * Used for matching Paragraphical signal strings (e.g., "crime", "healthcare")
 * to their relevant modules. Built lazily, cached after first call.
 */
let _signalIndex: Record<string, string[]> | null = null;
function getSignalModuleIndex(): Record<string, string[]> {
  if (_signalIndex) return _signalIndex;

  const index: Record<string, Set<string>> = {};
  const stopWords = new Set([
    'the', 'and', 'for', 'you', 'your', 'that', 'this', 'with', 'are', 'have',
    'would', 'will', 'can', 'how', 'what', 'where', 'when', 'which', 'does',
    'about', 'from', 'into', 'more', 'most', 'much', 'than', 'they', 'them',
    'been', 'being', 'very', 'some', 'other', 'also', 'just', 'like', 'over',
    'such', 'only', 'well', 'even', 'not', 'but', 'its', 'any', 'all', 'our',
  ]);

  // Index main_module DNW (Q35-Q67) and MH (Q68-Q100) questions
  const mainQuestions = getModuleQuestions('main_module');
  for (const q of mainQuestions) {
    if (q.number < 35) continue; // Skip demographics
    const words = q.question.toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w));

    for (const word of words) {
      if (!index[word]) index[word] = new Set();
      for (const mod of q.modules) {
        index[word].add(mod);
      }
    }
  }

  _signalIndex = {};
  for (const [key, mods] of Object.entries(index)) {
    _signalIndex[key] = Array.from(mods);
  }
  return _signalIndex;
}

// ─── Core Functions ───────────────────────────────────────────────

/** Initialize empty coverage state for all 23 dimensions */
export function initializeCoverage(): CoverageState {
  const dimensions: DimensionCoverage[] = MODULES.map((mod: ModuleDefinition) => ({
    moduleId: mod.id,
    moduleName: mod.name,
    dataPoints: 0,
    signalStrength: 0,
    signalConsistency: 0,  // No data yet — consistency unknown
    weight: 1 / MODULES.length, // Equal weight until we know the user
    moeContribution: 1 / MODULES.length, // Equal contribution initially
    sources: [],
  }));

  return {
    dimensions,
    overallMOE: 1.0, // 100% MOE with no data
    overallCoverage: 0,
    totalDataPoints: 0,
    isReportReady: false,
    gapAnalysis: [],
  };
}

/**
 * Update coverage state from Paragraphical extraction.
 * Gemini's module_relevance scores directly inform dimension weights.
 * Gemini's metrics tell us which dimensions have data.
 */
export function applyCoverageFromParagraphical(
  state: CoverageState,
  extraction: GeminiExtraction
): CoverageState {
  const updated = structuredClone(state);

  // Count metrics per category from Gemini extraction
  const metricsByCategory: Record<string, number> = {};
  for (const metric of extraction.metrics) {
    const cat = metric.category;
    metricsByCategory[cat] = (metricsByCategory[cat] || 0) + 1;
  }

  // Apply module_relevance as weights
  const relevance = extraction.module_relevance || {};
  let totalRelevance = 0;
  for (const dim of updated.dimensions) {
    const rel = relevance[dim.moduleId] ?? 0.3; // Default modest relevance
    dim.weight = rel;
    totalRelevance += rel;
  }
  // Normalize weights to sum to 1
  if (totalRelevance > 0) {
    for (const dim of updated.dimensions) {
      dim.weight = dim.weight / totalRelevance;
    }
  }

  // Apply metric counts as signal strength from Paragraphical
  for (const dim of updated.dimensions) {
    const count = metricsByCategory[dim.moduleId] || 0;
    if (count > 0) {
      const paragraphicalSource: CoverageSource = {
        type: 'paragraphical',
        dataPoints: count,
        avgStrength: Math.min(1, count / 10), // 10+ metrics = full strength
      };
      dim.sources.push(paragraphicalSource);
      dim.dataPoints += count;
      dim.signalStrength = Math.min(1, dim.signalStrength + paragraphicalSource.avgStrength * 0.6);
      // H1 fix: Update signalConsistency from paragraphical source
      updateSignalConsistency(dim);
    }
  }

  // DNW signals boost relevant modules (matched via question data index)
  if (extraction.dnw_signals?.length) {
    applySignalHitsFromIndex(updated, extraction.dnw_signals, 'paragraphical', 0.15);
  }

  // MH signals boost relevant modules (matched via question data index)
  if (extraction.mh_signals?.length) {
    applySignalHitsFromIndex(updated, extraction.mh_signals, 'paragraphical', 0.15);
  }

  recalculateMOE(updated);
  return updated;
}

/**
 * Update coverage from Demographics answers.
 * Certain demographic facts deterministically boost module relevance.
 *
 * Keys match the questionnaire storage format: "q{number}" (e.g., q8, q30).
 * Values may be string, number, boolean, or string[] (Multi-select at runtime).
 */
export function applyCoverageFromDemographics(
  state: CoverageState,
  demographics: DemographicAnswers
): CoverageState {
  const updated = structuredClone(state);

  // Helper: check if a value (which may be string[] at runtime for Multi-select)
  // contains a substring. Handles string, string[], boolean, and number.
  const valIncludes = (val: unknown, target: string): boolean => {
    if (val === undefined || val === null) return false;
    if (Array.isArray(val)) return val.some(v => String(v).toLowerCase().includes(target));
    return String(val).toLowerCase().includes(target);
  };

  const isTruthy = (val: unknown): boolean =>
    val === true || val === 'true' || val === 'Yes' || val === 'yes';

  const boosts: Array<{ moduleId: string; strength: number }> = [];

  // Q8: "Do you have children?" (Yes/No) → family_children, education_learning
  if (isTruthy(demographics.q8)) {
    boosts.push({ moduleId: 'family_children', strength: 0.4 });
    boosts.push({ moduleId: 'education_learning', strength: 0.3 });
  }

  // Q30: "Do you have pets that would relocate with you?" (Yes/No) → pets_animals
  if (isTruthy(demographics.q30)) {
    boosts.push({ moduleId: 'pets_animals', strength: 0.4 });
  }

  // Q19: "Preferred work arrangement?" (Single-select: "fully remote", "hybrid", etc.)
  // Q17: "Employment plan in new location?" (Multi-select: "remote work", etc.)
  // → technology_connectivity, professional_career
  if (valIncludes(demographics.q19, 'remote') || valIncludes(demographics.q17, 'remote')) {
    boosts.push({ moduleId: 'technology_connectivity', strength: 0.3 });
    boosts.push({ moduleId: 'professional_career', strength: 0.3 });
  }

  // Q16: "Current employment status?" (Multi-select: includes "retired")
  // Q17: "Employment plan?" (Multi-select: includes "retired")
  // → health_wellness up, professional_career down
  if (valIncludes(demographics.q16, 'retired') || valIncludes(demographics.q17, 'retired')) {
    boosts.push({ moduleId: 'health_wellness', strength: 0.3 });
    boosts.push({ moduleId: 'professional_career', strength: -0.2 });
  }

  // Q5: "Relationship status?" (Single-select: "married", "domestic partnership", etc.)
  // → housing needs increase
  const q5 = String(demographics.q5 ?? '').toLowerCase();
  if (q5 === 'married' || q5 === 'domestic partnership' || q5 === 'in a relationship') {
    boosts.push({ moduleId: 'housing_property', strength: 0.15 });
  }

  // Apply boosts
  for (const boost of boosts) {
    const dim = updated.dimensions.find(d => d.moduleId === boost.moduleId);
    if (dim) {
      dim.signalStrength = Math.max(0, Math.min(1, dim.signalStrength + boost.strength * 0.4));
      dim.dataPoints += 1;
      addOrUpdateSource(dim, 'demographics', 1, Math.abs(boost.strength));
    }
  }

  // Demographics provides data points to ALL modules (baseline persona)
  for (const dim of updated.dimensions) {
    dim.dataPoints += 1; // Everyone gets 1 point from demographics
    addOrUpdateSource(dim, 'demographics', 1, 0.1);
    // H1 fix: Update signalConsistency for demographics (deterministic rules = high consistency)
    updateSignalConsistency(dim);
  }

  // M7 fix: Normalize weights after demographic boosts (consistent with DNW/MH/tradeoffs)
  normalizeWeights(updated);
  recalculateMOE(updated);
  return updated;
}

/**
 * Update coverage from DNW (Deal 'N' Wanna) answers.
 * High severity scores on specific dealbreakers strongly signal module relevance.
 */
export function applyCoverageFromDNW(
  state: CoverageState,
  dnwAnswers: DNWAnswers
): CoverageState {
  const updated = structuredClone(state);

  for (const dnw of dnwAnswers) {
    // Severity 1-5 maps to signal strength 0.1-0.5
    const strength = dnw.severity * 0.1;

    // Look up question by number → use its modules field directly
    const questionNumber = parseInt(dnw.questionId.replace(/\D/g, ''), 10);
    const question = !isNaN(questionNumber) ? getMainModuleQuestion(questionNumber) : undefined;
    const matchedModules = new Set<string>(question?.modules ?? []);

    // Fallback: check if questionId contains a module ID
    if (matchedModules.size === 0) {
      for (const dim of updated.dimensions) {
        if (dnw.questionId?.includes(dim.moduleId)) {
          matchedModules.add(dim.moduleId);
        }
      }
    }

    for (const modId of matchedModules) {
      const dim = updated.dimensions.find(d => d.moduleId === modId);
      if (dim) {
        dim.dataPoints += 1;
        dim.signalStrength = Math.min(1, dim.signalStrength + strength * 0.3);
        // High severity DNW = this module REALLY matters
        if (dnw.severity >= 4) {
          dim.weight = Math.min(1, dim.weight * 1.5);
        }
        addOrUpdateSource(dim, 'dnw', 1, strength);
        // H1 fix: Update signalConsistency from DNW source
        updateSignalConsistency(dim);
      }
    }
  }

  // Normalize weights after DNW boosts
  normalizeWeights(updated);
  recalculateMOE(updated);
  return updated;
}

/**
 * Update coverage from MH (Must Have) answers.
 * High importance scores signal which modules matter most.
 */
export function applyCoverageFromMH(
  state: CoverageState,
  mhAnswers: MHAnswers
): CoverageState {
  const updated = structuredClone(state);

  for (const mh of mhAnswers) {
    const strength = mh.importance * 0.1;

    // Look up question by number → use its modules field directly
    const questionNumber = parseInt(mh.questionId.replace(/\D/g, ''), 10);
    const question = !isNaN(questionNumber) ? getMainModuleQuestion(questionNumber) : undefined;
    const matchedModules = new Set<string>(question?.modules ?? []);

    // Fallback: check if questionId contains a module ID
    if (matchedModules.size === 0) {
      for (const dim of updated.dimensions) {
        if (mh.questionId?.includes(dim.moduleId)) {
          matchedModules.add(dim.moduleId);
        }
      }
    }

    for (const modId of matchedModules) {
      const dim = updated.dimensions.find(d => d.moduleId === modId);
      if (dim) {
        dim.dataPoints += 1;
        dim.signalStrength = Math.min(1, dim.signalStrength + strength * 0.3);
        if (mh.importance >= 4) {
          dim.weight = Math.min(1, dim.weight * 1.3);
        }
        addOrUpdateSource(dim, 'mh', 1, strength);
        // H1 fix: Update signalConsistency from MH source
        updateSignalConsistency(dim);
      }
    }
  }

  normalizeWeights(updated);
  recalculateMOE(updated);
  return updated;
}

/**
 * Update coverage from Trade-off answers.
 * Slider values directly weight categories against each other.
 */
export function applyCoverageFromTradeoffs(
  state: CoverageState,
  tradeoffs: TradeoffAnswers
): CoverageState {
  const updated = structuredClone(state);

  // Look up tradeoff questions to get their modules field
  const tradeoffQuestions = getModuleQuestions('tradeoff_questions');

  for (const [key, value] of Object.entries(tradeoffs)) {
    // Extract question number from key (e.g., "tq1" → 1, "tq42" → 42)
    const match = key.match(/^tq(\d+)$/);
    if (!match) continue;

    const questionNumber = parseInt(match[1], 10);
    const question = tradeoffQuestions.find(q => q.number === questionNumber);
    if (!question?.modules?.length) continue;

    // L5 fix: TradeoffAnswers values are typed as number; defensive fallback retained
    // for runtime safety since data may come from localStorage/Supabase
    const sliderValue = (value as number) || 50;
    // Strength = how strongly the user feels (deviation from neutral)
    const strength = Math.abs(sliderValue - 50) / 50; // 0 = neutral, 1 = extreme

    // M6 fix: Skip neutral answers (strength=0) to avoid polluting source list
    if (strength < 0.01) continue;

    // A non-neutral answer signals these modules matter to the user
    for (const modId of question.modules) {
      const dim = updated.dimensions.find(d => d.moduleId === modId);
      if (dim) {
        dim.weight = Math.max(0.05, dim.weight * (0.5 + 0.5 * (1 + strength)));
        dim.dataPoints += 1;
        addOrUpdateSource(dim, 'tradeoffs', 1, strength);
        // H1 fix: Update signalConsistency from tradeoff source
        updateSignalConsistency(dim);
      }
    }
  }

  normalizeWeights(updated);
  recalculateMOE(updated);
  return updated;
}

/**
 * Update coverage from General Questions answers.
 */
export function applyCoverageFromGeneral(
  state: CoverageState,
  general: GeneralAnswers
): CoverageState {
  const updated = structuredClone(state);

  const answerCount = Object.keys(general).length;
  // General questions provide broad coverage signal across all dimensions
  const strengthPerQuestion = Math.min(0.02, 0.5 / Math.max(1, answerCount));

  for (const dim of updated.dimensions) {
    dim.dataPoints += Math.ceil(answerCount / MODULES.length);
    dim.signalStrength = Math.min(1, dim.signalStrength + strengthPerQuestion * answerCount * 0.1);
    addOrUpdateSource(dim, 'general', Math.ceil(answerCount / MODULES.length), 0.2);
    // H1 fix: Update signalConsistency from general source
    updateSignalConsistency(dim);
  }

  recalculateMOE(updated);
  return updated;
}

/**
 * Update coverage from completed mini module answers.
 * Mini module completion provides strong, focused signal for that dimension.
 */
export function applyCoverageFromMiniModule(
  state: CoverageState,
  moduleId: string,
  answeredCount: number,
  totalQuestions: number
): CoverageState {
  const updated = structuredClone(state);

  const dim = updated.dimensions.find(d => d.moduleId === moduleId);
  if (!dim) return updated;

  if (totalQuestions === 0) return updated;
  const completionRatio = answeredCount / totalQuestions;
  dim.dataPoints += answeredCount;
  dim.signalStrength = Math.min(1, dim.signalStrength + completionRatio * 0.8);
  dim.signalConsistency = Math.max(dim.signalConsistency, completionRatio);
  addOrUpdateSource(dim, 'mini_module', answeredCount, completionRatio);

  recalculateMOE(updated);
  return updated;
}

// ─── Gap Analysis ─────────────────────────────────────────────────

/**
 * Identify which dimensions have the weakest signal relative to their weight.
 * Returns gaps sorted by severity (worst first).
 */
export function analyzeGaps(state: CoverageState): CoverageGap[] {
  const gaps: CoverageGap[] = [];

  for (const dim of state.dimensions) {
    // Skip dimensions with low weight — they don't matter much for this user
    if (dim.weight < 0.02) continue;

    const adequacy = dim.signalStrength / Math.max(0.01, dim.weight);

    if (adequacy < 0.3) {
      gaps.push({
        moduleId: dim.moduleId,
        moduleName: dim.moduleName,
        severity: 'critical',
        reason: `High weight (${(dim.weight * 100).toFixed(0)}%) but very low signal (${(dim.signalStrength * 100).toFixed(0)}%)`,
        estimatedQuestionsToResolve: Math.max(1, Math.ceil((0.8 - dim.signalStrength) / 0.05)),
      });
    } else if (adequacy < 0.6) {
      gaps.push({
        moduleId: dim.moduleId,
        moduleName: dim.moduleName,
        severity: 'moderate',
        reason: `Weight (${(dim.weight * 100).toFixed(0)}%) exceeds signal confidence (${(dim.signalStrength * 100).toFixed(0)}%)`,
        estimatedQuestionsToResolve: Math.max(1, Math.ceil((0.7 - dim.signalStrength) / 0.05)),
      });
    } else if (adequacy < 0.8 && dim.weight > 0.05) {
      gaps.push({
        moduleId: dim.moduleId,
        moduleName: dim.moduleName,
        severity: 'minor',
        reason: `Could benefit from more data (signal: ${(dim.signalStrength * 100).toFixed(0)}%)`,
        estimatedQuestionsToResolve: Math.max(1, Math.ceil((0.6 - dim.signalStrength) / 0.05)),
      });
    }
  }

  // Sort: critical first, then moderate, then minor
  const severityOrder = { critical: 0, moderate: 1, minor: 2 };
  gaps.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return gaps;
}

// ─── Internal Helpers ─────────────────────────────────────────────

/**
 * H1 fix: Update signalConsistency based on multiple sources.
 * Multiple independent sources agreeing = high consistency.
 * Single source = lower consistency (less corroboration).
 * Formula: base from source count + bonus if strengths are similar.
 */
function updateSignalConsistency(dim: DimensionCoverage): void {
  const sources = dim.sources;
  if (sources.length === 0) {
    dim.signalConsistency = 0;
    return;
  }
  if (sources.length === 1) {
    // Single source: consistency = source strength * 0.5 (no corroboration)
    dim.signalConsistency = Math.max(dim.signalConsistency, sources[0].avgStrength * 0.5);
    return;
  }
  // Multiple sources: base consistency from count (2 sources = 0.6, 3+ = 0.8+)
  const countBase = Math.min(0.9, 0.4 + sources.length * 0.15);
  // Bonus: if source strengths are similar, signals are consistent
  const strengths = sources.map(s => s.avgStrength);
  const mean = strengths.reduce((a, b) => a + b, 0) / strengths.length;
  const variance = strengths.reduce((sum, s) => sum + (s - mean) ** 2, 0) / strengths.length;
  const agreementBonus = Math.max(0, 0.1 * (1 - variance * 4)); // Low variance = bonus
  dim.signalConsistency = Math.max(dim.signalConsistency, Math.min(1, countBase + agreementBonus));
}

function recalculateMOE(state: CoverageState): void {
  let totalWeightedUncertainty = 0;
  let totalWeight = 0;
  let coveredDimensions = 0;

  for (const dim of state.dimensions) {
    const uncertainty = 1 - dim.signalStrength;
    const consistencyPenalty = 1 - dim.signalConsistency * 0.3;
    dim.moeContribution = dim.weight * uncertainty * consistencyPenalty;
    totalWeightedUncertainty += dim.moeContribution;
    totalWeight += dim.weight;

    if (dim.signalStrength >= 0.5) coveredDimensions++;
  }

  state.overallMOE = totalWeight > 0 ? totalWeightedUncertainty / totalWeight : 1;
  state.overallCoverage = coveredDimensions / MODULES.length;
  state.totalDataPoints = state.dimensions.reduce((sum, d) => sum + d.dataPoints, 0);
  state.isReportReady = state.overallMOE <= 0.02;
  state.gapAnalysis = analyzeGaps(state);
}

function normalizeWeights(state: CoverageState): void {
  const totalWeight = state.dimensions.reduce((sum, d) => sum + d.weight, 0);
  if (totalWeight > 0 && totalWeight !== 1) {
    for (const dim of state.dimensions) {
      dim.weight = dim.weight / totalWeight;
    }
  }
}

function addOrUpdateSource(
  dim: DimensionCoverage,
  type: CoverageSourceType,
  dataPoints: number,
  strength: number
): void {
  const existing = dim.sources.find(s => s.type === type);
  if (existing) {
    const prevTotal = existing.dataPoints;
    existing.dataPoints += dataPoints;
    // Weighted running average: preserves contribution of all prior data points
    existing.avgStrength = (existing.avgStrength * prevTotal + strength * dataPoints) / existing.dataPoints;
  } else {
    dim.sources.push({ type, dataPoints, avgStrength: strength });
  }
}

/**
 * Match Paragraphical signal strings against a keyword index built from question data.
 * Replaces the old hardcoded DNW_MODULE_MAP / MH_MODULE_MAP matching.
 */
function applySignalHitsFromIndex(
  state: CoverageState,
  signals: string[],
  sourceType: CoverageSourceType,
  strength: number
): void {
  const index = getSignalModuleIndex();
  for (const signal of signals) {
    const words = signal.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
    const hitModules = new Set<string>();

    for (const word of words) {
      // L6 fix: Require minimum 3-char words to reduce false positives
      // (e.g., "a", "is", "in" would match too many modules)
      if (word.length < 3) continue;
      const mods = index[word];
      if (mods) {
        for (const modId of mods) hitModules.add(modId);
      }
    }

    for (const modId of hitModules) {
      const dim = state.dimensions.find(d => d.moduleId === modId);
      if (dim) {
        dim.dataPoints += 1;
        dim.signalStrength = Math.min(1, dim.signalStrength + strength);
        addOrUpdateSource(dim, sourceType, 1, strength);
      }
    }
  }
}
