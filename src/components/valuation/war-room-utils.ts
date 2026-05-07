import type { AcquisitionMirrorResult } from '@/lib/valuation/types';
import type { ChallengeResponse } from '@/components/valuation/NegotiationAnchorCard';

// ── Evidence Document Type ──────────────────────────────────────────

export interface EvidenceDoc {
  chunkId: string;
  documentId: string;
  documentType: string;
  documentTitle: string;
  originalFilename: string | null;
  pageOrSlide: number | null;
  chunkIndex: number;
  contentPreview: string;
}

// ── Rubric Types ────────────────────────────────────────────────────

export type RubricDimension =
  | 'evidence'
  | 'valuation'
  | 'risk'
  | 'objection'
  | 'concision'
  | 'resilience';

export interface RubricScore {
  dimension: RubricDimension;
  label: string;
  shortLabel: string;
  score: number; // 0–100
  description: string;
}

export const RUBRIC_INITIAL: RubricScore[] = [
  { dimension: 'evidence', label: 'Evidence Quality', shortLabel: 'Evidence', score: 0, description: 'Strength and relevance of cited evidence' },
  { dimension: 'valuation', label: 'Valuation Defence', shortLabel: 'Valuation', score: 0, description: 'Ability to justify the EV figure' },
  { dimension: 'risk', label: 'Risk Handling', shortLabel: 'Risk', score: 0, description: 'Awareness and mitigation of key risks' },
  { dimension: 'objection', label: 'Rebuttal Quality', shortLabel: 'Rebuttal', score: 0, description: 'Response quality to counterparty pushback' },
  { dimension: 'concision', label: 'Concision', shortLabel: 'Concision', score: 0, description: 'Clear, concise communication under pressure' },
  { dimension: 'resilience', label: 'Composure', shortLabel: 'Composure', score: 0, description: 'Consistency and composure across rounds' },
];

// ══════════════════════════════════════════════════════════════════════════════
// RUBRIC SCORING ENGINE — Production-Grade Heuristic Analysis
// ══════════════════════════════════════════════════════════════════════════════
//
// PURPOSE: Score negotiation quality across 6 dimensions using weighted keyword
// analysis, phrase detection, specificity signals, and negative indicators.
//
// ARCHITECTURE:
// - Tiered keyword weights (T1=3pts, T2=2pts, T3=1pt) with diminishing returns
// - Phrase pattern matching for contextual strength signals
// - Negative indicator detection for weak/uncertain language
// - Specificity bonus for quantitative precision (numbers, £, %)
// - Citation detection for evidence attribution
// - Confidence language analysis
//
// CONSTRAINTS:
// - Synchronous execution (no async/LLM calls)
// - Max score capped at 95 (100 reserved for LLM-verified excellence)
// - Backward compatible: same signature, same return type
//
// LAST UPDATED: 2026-04-29 (WR-19 expanded heuristics)
// ══════════════════════════════════════════════════════════════════════════════

/** Weighted keyword tiers: T1 (strongest signal), T2 (moderate), T3 (weak) */
interface KeywordTiers {
  readonly tier1: readonly string[]; // 3 points each
  readonly tier2: readonly string[]; // 2 points each
  readonly tier3: readonly string[]; // 1 point each
}

/** Phrase patterns that indicate strong negotiation behavior */
interface PhrasePatterns {
  readonly strong: readonly RegExp[];   // +4 points each
  readonly moderate: readonly RegExp[]; // +2 points each
}

/** Negative indicators that reduce score */
interface NegativeIndicators {
  readonly severe: readonly string[];   // -3 points each
  readonly moderate: readonly string[]; // -1 point each
}

// ── EVIDENCE QUALITY KEYWORDS ─────────────────────────────────────────────────

const EVIDENCE_KEYWORDS: KeywordTiers = {
  tier1: [
    'audited financial', 'verified data', 'third-party audit', 'due diligence',
    'signed agreement', 'binding contract', 'certified', 'attested', 'notarized',
    'companies house filing', 'statutory accounts', 'annual report',
  ],
  tier2: [
    'ebitda', 'revenue', 'arr', 'mrr', 'gross margin', 'net margin', 'cac', 'ltv',
    'churn rate', 'retention', 'burn rate', 'runway', 'cash flow', 'balance sheet',
    'income statement', 'profit and loss', 'p&l', 'cap table', 'data room',
    'pitch deck', 'financial model', 'projection', 'forecast', 'kpi', 'metric',
  ],
  tier3: [
    'data', 'document', 'evidence', 'report', 'study', 'analysis', 'source',
    'audit', 'proof', 'record', 'file', 'exhibit', 'attachment', 'appendix',
    'table', 'chart', 'graph', 'figure', 'spreadsheet', 'calculation',
  ],
} as const;

const EVIDENCE_PHRASES: PhrasePatterns = {
  strong: [
    /as (shown|documented|evidenced|demonstrated) (in|by)/i,
    /according to (the|our) (audit|report|analysis|data)/i,
    /the (data|evidence|numbers|figures) (show|demonstrate|prove|confirm)/i,
    /independently (verified|audited|confirmed)/i,
    /supported by (documentation|evidence|data)/i,
    /refer(ring)? to (exhibit|document|page|slide)/i,
  ],
  moderate: [
    /based on (our|the) (data|analysis|research)/i,
    /as (you can|we can) see (from|in)/i,
    /this is (backed|supported) by/i,
    /the (records|documents) (indicate|show)/i,
  ],
} as const;

// ── VALUATION METHODOLOGY KEYWORDS ────────────────────────────────────────────

const VALUATION_KEYWORDS: KeywordTiers = {
  tier1: [
    'discounted cash flow', 'dcf analysis', 'wacc calculation', 'terminal value',
    'precedent transaction', 'comparable company', 'trading comps', 'deal comps',
    'enterprise value', 'equity value', 'implied multiple', 'weighted average',
    'monte carlo', 'sensitivity analysis', 'scenario analysis',
  ],
  tier2: [
    'dcf', 'wacc', 'multiple', 'comparable', 'comps', 'precedent', 'transaction',
    'revenue multiple', 'ebitda multiple', 'arr multiple', 'exit multiple',
    'discount rate', 'terminal growth', 'perpetuity', 'cost of capital',
    'risk premium', 'beta', 'unlevered', 'levered', 'dilution', 'option pool',
    'pre-money', 'post-money', 'liquidation preference', 'waterfall',
  ],
  tier3: [
    'method', 'methodology', 'approach', 'model', 'valuation', 'value', 'worth',
    'multiple', 'ratio', 'benchmark', 'market', 'industry', 'sector', 'peer',
    'reconcile', 'weight', 'blend', 'triangulate', 'crosscheck',
  ],
} as const;

const VALUATION_PHRASES: PhrasePatterns = {
  strong: [
    /using (a |the )?(dcf|discounted cash flow)/i,
    /based on (comparable|precedent) (companies|transactions)/i,
    /weighted (average|blend) of (multiple )?methods/i,
    /the (implied|resulting) (multiple|valuation|ev)/i,
    /applying (a |an )?(discount|premium) (of|for)/i,
    /triangulat(e|ed|ing) (across|between|using)/i,
  ],
  moderate: [
    /this (values|implies|suggests) (the company|an ev|a valuation)/i,
    /at (a |an )?(\d+(\.\d+)?x|\d+(\.\d+)? times)/i,
    /(revenue|ebitda|arr) multiple of/i,
    /in line with (market|industry|peer)/i,
  ],
} as const;

// ── RISK HANDLING KEYWORDS ────────────────────────────────────────────────────

const RISK_KEYWORDS: KeywordTiers = {
  tier1: [
    'risk mitigation', 'contingency plan', 'hedging strategy', 'insurance coverage',
    'diversification strategy', 'risk-adjusted', 'downside protection', 'stress test',
    'worst case scenario', 'sensitivity to', 'break-even analysis',
  ],
  tier2: [
    'risk', 'mitigate', 'mitigation', 'concentration', 'dependency', 'exposure',
    'churn', 'retention', 'runway', 'burn', 'cash position', 'liquidity',
    'customer concentration', 'key person', 'single point of failure',
    'regulatory risk', 'compliance', 'competitive threat', 'market risk',
    'execution risk', 'technology risk', 'scalability', 'bottleneck',
  ],
  tier3: [
    'concern', 'challenge', 'issue', 'problem', 'weakness', 'threat', 'vulnerability',
    'aware', 'acknowledge', 'address', 'plan', 'strategy', 'approach', 'handle',
    'manage', 'monitor', 'track', 'measure', 'reduce', 'minimize', 'eliminate',
  ],
} as const;

const RISK_PHRASES: PhrasePatterns = {
  strong: [
    /we('ve| have) (mitigated|addressed|reduced) (this|the) risk/i,
    /our (contingency|mitigation|backup) plan/i,
    /in the (worst|downside|bear) (case|scenario)/i,
    /we('re| are) (actively )?(monitoring|tracking|managing)/i,
    /diversified (across|among|between)/i,
    /no single (customer|client|contract) (exceeds|represents|accounts for)/i,
  ],
  moderate: [
    /we('re| are) aware (of|that)/i,
    /to (mitigate|address|reduce) (this|the)/i,
    /(this|the) risk is (manageable|contained|limited)/i,
    /we have (a |the )?plan (to|for)/i,
  ],
} as const;

// ── REBUTTAL QUALITY KEYWORDS ─────────────────────────────────────────────────

const REBUTTAL_KEYWORDS: KeywordTiers = {
  tier1: [
    'respectfully disagree', 'with respect', 'let me clarify', 'to be precise',
    'the facts show', 'actually', 'in fact', 'on the contrary', 'however',
    'that said', 'while i understand', 'i appreciate your concern',
  ],
  tier2: [
    'disagree', 'counter', 'rebut', 'refute', 'challenge', 'dispute', 'contest',
    'clarify', 'explain', 'elaborate', 'expand', 'detail', 'specify',
    'correct', 'accurate', 'precise', 'exact', 'fair', 'reasonable',
    'perspective', 'viewpoint', 'standpoint', 'position', 'stance',
  ],
  tier3: [
    'but', 'yet', 'still', 'though', 'although', 'despite', 'nevertheless',
    'point', 'argument', 'case', 'reason', 'rationale', 'logic', 'basis',
    'consider', 'note', 'recognize', 'acknowledge', 'understand', 'appreciate',
  ],
} as const;

const REBUTTAL_PHRASES: PhrasePatterns = {
  strong: [
    /i (respectfully )?(disagree|challenge|dispute) (with|that)/i,
    /let me (address|clarify|explain) (that|this|your)/i,
    /the (evidence|data|facts) (suggest|show|indicate) otherwise/i,
    /while (i|we) (understand|appreciate) (your|the) (concern|point)/i,
    /that('s| is) (not quite|not entirely|partially) (accurate|correct|right)/i,
  ],
  moderate: [
    /i (would|must) (point out|note|add) that/i,
    /(however|that said|nevertheless),? (i|we|the)/i,
    /from (our|my|a different) perspective/i,
    /consider(ing)? (that|the fact that)/i,
  ],
} as const;

// ── NEGATIVE INDICATORS (reduce scores) ───────────────────────────────────────

const NEGATIVE_INDICATORS: NegativeIndicators = {
  severe: [
    'i don\'t know', 'i\'m not sure', 'i have no idea', 'no clue',
    'we haven\'t figured', 'we don\'t have', 'unfortunately we lack',
    'i can\'t answer', 'i\'m unable to', 'that\'s beyond',
    'to be honest i\'m uncertain', 'honestly i\'m not confident',
  ],
  moderate: [
    'i think', 'i believe', 'i guess', 'i suppose', 'probably', 'possibly',
    'maybe', 'perhaps', 'might', 'could be', 'sort of', 'kind of',
    'hopefully', 'with luck', 'fingers crossed', 'if all goes well',
    'roughly', 'approximately', 'ballpark', 'give or take',
  ],
} as const;

// ── CONFIDENCE/STRENGTH LANGUAGE (bonus points) ──────────────────────────────

const CONFIDENCE_TERMS: readonly string[] = [
  'proven', 'demonstrated', 'verified', 'confirmed', 'validated', 'established',
  'documented', 'evidenced', 'substantiated', 'corroborated', 'attested',
  'definitive', 'conclusive', 'unequivocal', 'clear', 'certain', 'confident',
  'strong', 'robust', 'solid', 'sound', 'reliable', 'consistent', 'stable',
] as const;

// ── SPECIFICITY DETECTION PATTERNS ───────────────────────────────────────────

const SPECIFICITY_PATTERNS = {
  /** Currency amounts: £1.2M, $500K, €2.5B, 1.5 million pounds */
  currency: /[£$€]\s*\d+(?:\.\d+)?(?:\s*[KMB]|(?:\s*(?:thousand|million|billion)))?|\d+(?:\.\d+)?\s*(?:million|billion|thousand)\s*(?:pounds|dollars|euros)/gi,
  /** Percentages: 15%, 3.5 percent, 20 basis points */
  percentage: /\d+(?:\.\d+)?\s*(?:%|percent|percentage|bps|basis points?)/gi,
  /** Specific numbers with context: 150 customers, 12 months, 5 employees */
  quantified: /\d+(?:,\d{3})*(?:\.\d+)?\s+(?:customers?|clients?|users?|employees?|months?|years?|days?|weeks?|contracts?|deals?|units?|transactions?)/gi,
  /** Multiples: 8x, 12.5x revenue, 6 times */
  multiples: /\d+(?:\.\d+)?[xX]|\d+(?:\.\d+)?\s*times/gi,
  /** Date references: Q3 2025, FY24, March 2026 */
  temporal: /(?:Q[1-4]|FY)\s*['"]?\d{2,4}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}/gi,
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// SCORING ENGINE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate weighted keyword score with diminishing returns.
 * First 3 unique hits per tier get full points, next 3 get half, rest get quarter.
 */
function calculateKeywordScore(text: string, keywords: KeywordTiers): number {
  const lowerText = text.toLowerCase();

  const countHits = (terms: readonly string[]): number => {
    return terms.filter(term => lowerText.includes(term.toLowerCase())).length;
  };

  const applyDiminishing = (hits: number, basePoints: number): number => {
    const tier1 = Math.min(hits, 3) * basePoints;
    const tier2 = Math.min(Math.max(hits - 3, 0), 3) * (basePoints * 0.5);
    const tier3 = Math.max(hits - 6, 0) * (basePoints * 0.25);
    return tier1 + tier2 + tier3;
  };

  const t1Score = applyDiminishing(countHits(keywords.tier1), 3);
  const t2Score = applyDiminishing(countHits(keywords.tier2), 2);
  const t3Score = applyDiminishing(countHits(keywords.tier3), 1);

  return t1Score + t2Score + t3Score;
}

/**
 * Calculate phrase pattern bonus points.
 */
function calculatePhraseScore(text: string, phrases: PhrasePatterns): number {
  let score = 0;

  for (const pattern of phrases.strong) {
    if (pattern.test(text)) score += 4;
  }
  for (const pattern of phrases.moderate) {
    if (pattern.test(text)) score += 2;
  }

  return score;
}

/**
 * Calculate negative indicator penalty.
 */
function calculateNegativePenalty(text: string): number {
  const lowerText = text.toLowerCase();
  let penalty = 0;

  for (const term of NEGATIVE_INDICATORS.severe) {
    if (lowerText.includes(term)) penalty += 3;
  }
  for (const term of NEGATIVE_INDICATORS.moderate) {
    if (lowerText.includes(term)) penalty += 1;
  }

  return penalty;
}

/**
 * Calculate specificity bonus for quantitative precision.
 */
function calculateSpecificityBonus(text: string): number {
  let bonus = 0;

  // Each type of specificity adds points (capped per type)
  const currencyMatches = text.match(SPECIFICITY_PATTERNS.currency)?.length ?? 0;
  bonus += Math.min(currencyMatches * 2, 8);

  const percentMatches = text.match(SPECIFICITY_PATTERNS.percentage)?.length ?? 0;
  bonus += Math.min(percentMatches * 2, 6);

  const quantifiedMatches = text.match(SPECIFICITY_PATTERNS.quantified)?.length ?? 0;
  bonus += Math.min(quantifiedMatches * 1.5, 6);

  const multipleMatches = text.match(SPECIFICITY_PATTERNS.multiples)?.length ?? 0;
  bonus += Math.min(multipleMatches * 2, 4);

  const temporalMatches = text.match(SPECIFICITY_PATTERNS.temporal)?.length ?? 0;
  bonus += Math.min(temporalMatches * 1, 3);

  return Math.round(bonus);
}

/**
 * Calculate confidence language bonus.
 */
function calculateConfidenceBonus(text: string): number {
  const lowerText = text.toLowerCase();
  const hits = CONFIDENCE_TERMS.filter(term => lowerText.includes(term)).length;
  // Diminishing returns: first 4 worth 1.5 pts, next 4 worth 0.75, rest worth 0.25
  const t1 = Math.min(hits, 4) * 1.5;
  const t2 = Math.min(Math.max(hits - 4, 0), 4) * 0.75;
  const t3 = Math.max(hits - 8, 0) * 0.25;
  return Math.round(t1 + t2 + t3);
}

/**
 * Calculate response length quality multiplier.
 * Optimal range: 80-500 characters per message.
 */
function calculateLengthMultiplier(avgLength: number): number {
  if (avgLength < 20) return 0.3;  // Too terse
  if (avgLength < 50) return 0.5;  // Very short
  if (avgLength < 80) return 0.75; // Short
  if (avgLength <= 500) return 1.0; // Optimal
  if (avgLength <= 800) return 0.9; // Slightly verbose
  return 0.75; // Too verbose
}

/**
 * Calculate dimension-specific base score with all factors.
 */
function calculateDimensionScore(
  text: string,
  keywords: KeywordTiers,
  phrases: PhrasePatterns,
  rounds: number,
  lengthMultiplier: number,
  basePoints: number = 10,
): number {
  const keywordScore = calculateKeywordScore(text, keywords);
  const phraseScore = calculatePhraseScore(text, phrases);
  const specificityBonus = calculateSpecificityBonus(text);
  const confidenceBonus = calculateConfidenceBonus(text);
  const negativePenalty = calculateNegativePenalty(text);
  const roundBonus = Math.min(rounds * 2, 15); // Cap at 15 pts from rounds

  const rawScore = basePoints + keywordScore + phraseScore + specificityBonus +
                   confidenceBonus + roundBonus - negativePenalty;

  return Math.min(95, Math.max(0, Math.round(rawScore * lengthMultiplier)));
}

/**
 * Compute rubric scores from user messages using expanded heuristic analysis.
 *
 * @param userMessages - Array of user's negotiation responses
 * @param challengeCount - Number of challenges posed by counterparty
 * @returns Array of RubricScore objects for all 6 dimensions
 *
 * @remarks
 * Scoring methodology:
 * - Base: 10 points
 * - Keywords: Tiered (T1=3pts, T2=2pts, T3=1pt) with diminishing returns
 * - Phrases: Strong=4pts, Moderate=2pts
 * - Specificity: Up to 27pts for quantitative precision
 * - Confidence: Up to 9pts for strength language
 * - Rounds: 2pts per round, capped at 15pts
 * - Length: 0.3x-1.0x multiplier based on average response length
 * - Negatives: -1 to -3 per weak/uncertain term
 * - Maximum: 95 (100 reserved for LLM-verified excellence)
 */
export function computeRubricFromMessages(
  userMessages: string[],
  challengeCount: number,
): RubricScore[] {
  if (userMessages.length === 0) return RUBRIC_INITIAL;

  const allText = userMessages.join(' ');
  const avgLen = userMessages.reduce((s, m) => s + m.length, 0) / userMessages.length;
  const rounds = userMessages.length;
  const lengthMultiplier = calculateLengthMultiplier(avgLen);

  // ── Evidence Quality ────────────────────────────────────────────────
  const evidenceScore = calculateDimensionScore(
    allText, EVIDENCE_KEYWORDS, EVIDENCE_PHRASES, rounds, lengthMultiplier,
  );

  // ── Valuation Defence ───────────────────────────────────────────────
  const valuationScore = calculateDimensionScore(
    allText, VALUATION_KEYWORDS, VALUATION_PHRASES, rounds, lengthMultiplier,
  );

  // ── Risk Handling ───────────────────────────────────────────────────
  const riskScore = calculateDimensionScore(
    allText, RISK_KEYWORDS, RISK_PHRASES, rounds, lengthMultiplier,
  );

  // ── Rebuttal Quality ────────────────────────────────────────────────
  // Uses engagement ratio as additional factor
  const responseRatio = challengeCount > 0 ? Math.min(rounds / challengeCount, 1.5) : 0.5;
  const rebuttalBase = calculateDimensionScore(
    allText, REBUTTAL_KEYWORDS, REBUTTAL_PHRASES, rounds, lengthMultiplier, 5,
  );
  const objectionScore = Math.min(95, Math.round(rebuttalBase * (0.7 + responseRatio * 0.3)));

  // ── Concision ───────────────────────────────────────────────────────
  // Optimal: 80-400 chars, penalize extremes, reward consistency
  const lengthVariance = userMessages.length > 1
    ? Math.sqrt(userMessages.reduce((s, m) => s + Math.pow(m.length - avgLen, 2), 0) / userMessages.length)
    : 0;
  const consistencyBonus = lengthVariance < 100 ? 10 : lengthVariance < 200 ? 5 : 0;

  let concisionBase: number;
  if (avgLen >= 80 && avgLen <= 400) {
    concisionBase = 55; // Optimal
  } else if (avgLen >= 50 && avgLen <= 500) {
    concisionBase = 45; // Acceptable
  } else if (avgLen < 50) {
    concisionBase = 20; // Too terse
  } else {
    concisionBase = 30; // Too verbose
  }
  const concisionScore = Math.min(95, concisionBase + consistencyBonus + Math.min(rounds * 3, 15));

  // ── Composure/Resilience ────────────────────────────────────────────
  // Rewards sustained engagement, penalizes very short sessions
  const sustainedBonus = rounds >= 6 ? 20 : rounds >= 4 ? 12 : rounds >= 3 ? 6 : 0;
  const confidenceInText = calculateConfidenceBonus(allText);
  const negativesInText = calculateNegativePenalty(allText);
  const composureBase = Math.min(rounds * 10, 50);
  const resilienceScore = Math.min(95, Math.max(0,
    composureBase + sustainedBonus + confidenceInText - (negativesInText * 0.5)
  ));

  return [
    { ...RUBRIC_INITIAL[0], score: evidenceScore },
    { ...RUBRIC_INITIAL[1], score: valuationScore },
    { ...RUBRIC_INITIAL[2], score: riskScore },
    { ...RUBRIC_INITIAL[3], score: objectionScore },
    { ...RUBRIC_INITIAL[4], score: concisionScore },
    { ...RUBRIC_INITIAL[5], score: resilienceScore },
  ];
}

// ── Color Helpers ───────────────────────────────────────────────────

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-jade-upside';
  if (score >= 60) return 'text-cyan-interactive';
  if (score >= 40) return 'text-status-warning';
  return 'text-coral-downside';
}

export function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-jade-upside/15';
  if (score >= 60) return 'bg-cyan-interactive/15';
  if (score >= 40) return 'bg-status-warning/15';
  return 'bg-coral-downside/15';
}

// ── Currency Formatting ─────────────────────────────────────────────

export function formatCurrency(value: number): string {
  if (value === 0) return '\u00A3\u2014';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `\u00A3${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `\u00A3${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `\u00A3${(value / 1_000).toFixed(0)}K`;
  return `\u00A3${value.toFixed(0)}`;
}

// ── Defensibility Score ─────────────────────────────────────────────

export function getDefensibilityLabel(score: number): string {
  if (score >= 90) return 'Highly Defensible';
  if (score >= 75) return 'Strong';
  if (score >= 60) return 'Moderate';
  if (score >= 40) return 'Fragile';
  return 'Exposed';
}

export function getDefensibilityColor(score: number): string {
  if (score >= 90) return 'text-jade-upside';
  if (score >= 75) return 'text-cyan-interactive';
  if (score >= 60) return 'text-status-warning';
  if (score >= 40) return 'text-[#F59E0B]';
  return 'text-coral-downside';
}

export interface DefensibilityResult {
  overall: number;
  subMetrics: { label: string; value: number }[];
}

export interface ConcessionStep {
  stage: string;
  value: number;
  note: string;
}

export function computeDefensibility(
  evidenceChain: EvidenceDoc[],
  acquisitionMirror: AcquisitionMirrorResult | null,
  challengeResponses: ChallengeResponse[],
  anchors: { walkAway: number; target: number; anchor: number },
): DefensibilityResult {
  const evidenceStrength = evidenceChain.length > 0
    ? Math.min(100, 20 + evidenceChain.length * 8)
    : 0;
  const comparableSupport = acquisitionMirror ? 75 : 0;
  const anchorLogicValid = anchors.anchor > 0 && anchors.target > 0 && anchors.walkAway > 0;
  const assumptionQuality = anchorLogicValid ? 70 : 25;
  const negotiationReadiness = challengeResponses.length > 0
    ? Math.min(100, 30 + challengeResponses.length * 15)
    : 0;
  const overall = Math.round(
    (evidenceStrength + comparableSupport + assumptionQuality + negotiationReadiness) / 4,
  );
  return {
    overall,
    subMetrics: [
      { label: 'Evidence Strength', value: evidenceStrength },
      { label: 'Comparable Support', value: comparableSupport },
      { label: 'Assumption Quality', value: assumptionQuality },
      { label: 'Negotiation Readiness', value: negotiationReadiness },
    ],
  };
}
