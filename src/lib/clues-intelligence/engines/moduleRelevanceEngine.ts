/**
 * CLUES Intelligence — Module Relevance Engine
 *
 * Determines which of the 23 mini modules are most relevant for a specific user,
 * based on upstream data from the Paragraphical and/or Main Module.
 *
 * This is PURE MATH — no LLM calls. The structured questionnaire data maps
 * deterministically to module relevance scores. No interpretation needed.
 *
 * LLM involvement:
 * - Gemini handles Paragraphical (free-form text → module_relevance scores)
 * - GPT-5.4 fires ONE refinement call per completed section to catch emergent patterns
 * - This engine handles everything else (structured data → module weights)
 *
 * CLUES predicts: best country → top 3 cities → top 3 towns → top 3 neighborhoods
 */

import { MODULES, type ModuleDefinition } from '../data/modules';
import { getModuleQuestions } from '../data/questions';
import type {
  GeminiExtraction,
  DemographicAnswers,
  DNWAnswers,
  MHAnswers,
  TradeoffAnswers,
  GeneralAnswers,
} from '../types';

// ─── Types ────────────────────────────────────────────────────────

/** Relevance score for a single module */
export interface ModuleRelevance {
  moduleId: string;
  moduleName: string;
  /** Raw relevance score (0-1). Higher = more important for this user */
  relevance: number;
  /** Confidence in the relevance score (0-1). Higher = more data supports this score */
  confidence: number;
  /** Whether this module should be recommended to the user */
  recommended: boolean;
  /** Why this module matters (for Olivia to explain) */
  reasons: string[];
  /** Priority rank (1 = highest priority module to complete) */
  rank: number;
}

export interface RelevanceResult {
  modules: ModuleRelevance[];
  /** Modules sorted by priority (highest relevance + lowest confidence first) */
  recommendedModules: ModuleRelevance[];
  /** Total estimated questions across recommended modules */
  estimatedTotalQuestions: number;
}

// ─── Demographic Inference Rules ──────────────────────────────────

interface DemographicRule {
  condition: (d: DemographicAnswers) => boolean;
  moduleId: string;
  boost: number;     // Positive = more relevant, negative = less relevant
  reason: string;
}

const DEMOGRAPHIC_RULES: DemographicRule[] = [
  // Children
  {
    condition: d => !!(d.has_children || (typeof d.children_count === 'number' && d.children_count > 0)),
    moduleId: 'family_children',
    boost: 0.5,
    reason: 'You have children — family services, schools, and child safety are critical',
  },
  {
    condition: d => !!(d.has_children || (typeof d.children_count === 'number' && d.children_count > 0)),
    moduleId: 'education_learning',
    boost: 0.35,
    reason: 'Children in the household increase education relevance',
  },
  // No children → reduce family/education weight
  {
    condition: d => !d.has_children && (!d.children_count || d.children_count === 0),
    moduleId: 'family_children',
    boost: -0.3,
    reason: 'No children — family module is less critical',
  },

  // Pets
  {
    condition: d => !!(d.has_pets || d.pet_type),
    moduleId: 'pets_animals',
    boost: 0.5,
    reason: 'You have pets — pet-friendly policies and vet care matter',
  },
  {
    condition: d => !d.has_pets && !d.pet_type,
    moduleId: 'pets_animals',
    boost: -0.3,
    reason: 'No pets — pets module is less critical',
  },

  // Employment: remote
  {
    condition: d => d.employment_type === 'remote' || d.employment === 'remote' || d.work_style === 'remote',
    moduleId: 'technology_connectivity',
    boost: 0.4,
    reason: 'Remote work requires reliable internet and tech infrastructure',
  },
  {
    condition: d => d.employment_type === 'remote' || d.employment === 'remote' || d.work_style === 'remote',
    moduleId: 'professional_career',
    boost: 0.3,
    reason: 'Remote workers need coworking spaces and business-friendly environments',
  },

  // Employment: retired
  {
    condition: d => d.employment_type === 'retired' || d.employment === 'retired',
    moduleId: 'health_wellness',
    boost: 0.35,
    reason: 'Retirees prioritize healthcare access and wellness',
  },
  {
    condition: d => d.employment_type === 'retired' || d.employment === 'retired',
    moduleId: 'professional_career',
    boost: -0.3,
    reason: 'Retired — career opportunities are less relevant',
  },
  {
    condition: d => d.employment_type === 'retired' || d.employment === 'retired',
    moduleId: 'outdoor_recreation',
    boost: 0.2,
    reason: 'Retirees often value outdoor recreation access',
  },

  // Employment: entrepreneur
  {
    condition: d => d.employment_type === 'entrepreneur' || d.employment === 'business_owner',
    moduleId: 'professional_career',
    boost: 0.4,
    reason: 'Entrepreneurs need business-friendly regulations and startup ecosystem',
  },
  {
    condition: d => d.employment_type === 'entrepreneur' || d.employment === 'business_owner',
    moduleId: 'legal_immigration',
    boost: 0.25,
    reason: 'Business owners need clear legal frameworks for foreign enterprise',
  },

  // Age: older → health matters more
  {
    condition: d => typeof d.age === 'number' && d.age >= 55,
    moduleId: 'health_wellness',
    boost: 0.3,
    reason: 'Age increases healthcare importance',
  },
  {
    condition: d => typeof d.age === 'number' && d.age >= 55,
    moduleId: 'transportation_mobility',
    boost: 0.2,
    reason: 'Accessible transportation matters more with age',
  },

  // Age: younger → nightlife, career
  {
    condition: d => typeof d.age === 'number' && d.age < 35,
    moduleId: 'entertainment_nightlife',
    boost: 0.2,
    reason: 'Younger residents often value nightlife and social scenes',
  },
  {
    condition: d => typeof d.age === 'number' && d.age < 35,
    moduleId: 'professional_career',
    boost: 0.2,
    reason: 'Career development is typically a priority for younger professionals',
  },

  // Partner/married → housing
  {
    condition: d => d.relationship_status === 'married' || d.relationship_status === 'partnered',
    moduleId: 'housing_property',
    boost: 0.15,
    reason: 'Couples typically have higher housing requirements',
  },
];

// ─── Core Functions ───────────────────────────────────────────────

/** Initialize relevance scores with equal weights */
export function initializeRelevance(): RelevanceResult {
  const modules: ModuleRelevance[] = MODULES.map((mod: ModuleDefinition, i: number) => ({
    moduleId: mod.id,
    moduleName: mod.name,
    relevance: 0.5,  // Neutral baseline
    confidence: 0,    // No data yet
    recommended: false,
    reasons: [],
    rank: i + 1,
  }));

  return {
    modules,
    recommendedModules: [],
    estimatedTotalQuestions: 0,
  };
}

/**
 * Apply Gemini Paragraphical extraction results.
 * Gemini's module_relevance is the strongest signal for module importance.
 */
export function applyParagraphicalRelevance(
  result: RelevanceResult,
  extraction: GeminiExtraction
): RelevanceResult {
  const updated = structuredClone(result);
  const relevance = extraction.module_relevance || {};

  for (const mod of updated.modules) {
    const geminiScore = relevance[mod.moduleId];
    if (geminiScore !== undefined) {
      // Gemini's score is 0-1, blend with existing
      mod.relevance = mod.confidence > 0
        ? mod.relevance * 0.3 + geminiScore * 0.7  // Gemini dominates
        : geminiScore;
      mod.confidence = Math.min(1, mod.confidence + 0.4);

      if (geminiScore >= 0.7) {
        mod.reasons.push('Strongly indicated by your written paragraphs');
      } else if (geminiScore >= 0.4) {
        mod.reasons.push('Moderately relevant based on your narrative');
      }
    }

    // Count Gemini metrics per category as additional signal
    const metricCount = extraction.metrics.filter((m: { category: string }) => m.category === mod.moduleId).length;
    if (metricCount > 0) {
      mod.confidence = Math.min(1, mod.confidence + Math.min(0.3, metricCount * 0.03));
      if (metricCount >= 8) {
        mod.reasons.push(`${metricCount} specific metrics extracted from your paragraphs`);
      }
    }
  }

  return recalculateRankings(updated);
}

/**
 * Apply Demographics answers.
 * Deterministic rules map demographic facts to module relevance.
 */
export function applyDemographicRelevance(
  result: RelevanceResult,
  demographics: DemographicAnswers
): RelevanceResult {
  const updated = structuredClone(result);

  for (const rule of DEMOGRAPHIC_RULES) {
    try {
      if (rule.condition(demographics)) {
        const mod = updated.modules.find(m => m.moduleId === rule.moduleId);
        if (mod) {
          mod.relevance = clamp(mod.relevance + rule.boost, 0, 1);
          mod.confidence = Math.min(1, mod.confidence + 0.15);
          if (rule.boost > 0) {
            mod.reasons.push(rule.reason);
          }
        }
      }
    } catch {
      // Guard against malformed demographics data
    }
  }

  return recalculateRankings(updated);
}

/**
 * Apply DNW (Dealbreaker) answers.
 * Severity 4-5 = strong signal. Severity 1-2 = mild signal.
 */
export function applyDNWRelevance(
  result: RelevanceResult,
  dnwAnswers: DNWAnswers
): RelevanceResult {
  const updated = structuredClone(result);

  // Look up each DNW question's modules field directly
  const mainQuestions = getModuleQuestions('main_module');
  for (const dnw of dnwAnswers) {
    const strengthMultiplier = dnw.severity / 5; // 0.2 to 1.0

    // Look up question by number → use its modules field
    const questionNumber = parseInt(dnw.questionId.replace(/\D/g, ''), 10);
    const question = !isNaN(questionNumber)
      ? mainQuestions.find(q => q.number === questionNumber)
      : undefined;
    const moduleHits = question?.modules ?? [];

    for (const moduleId of moduleHits) {
      const mod = updated.modules.find(m => m.moduleId === moduleId);
      if (mod) {
        mod.relevance = clamp(mod.relevance + strengthMultiplier * 0.15, 0, 1);
        mod.confidence = Math.min(1, mod.confidence + 0.08);
        if (dnw.severity >= 4) {
          mod.reasons.push(`Dealbreaker (severity ${dnw.severity}/5) signals this category`);
        }
      }
    }
  }

  return recalculateRankings(updated);
}

/**
 * Apply MH (Must Have) answers.
 * Importance 4-5 = strong positive signal.
 */
export function applyMHRelevance(
  result: RelevanceResult,
  mhAnswers: MHAnswers
): RelevanceResult {
  const updated = structuredClone(result);

  const mainQuestionsForMH = getModuleQuestions('main_module');
  for (const mh of mhAnswers) {
    const strengthMultiplier = mh.importance / 5;

    // Look up question by number → use its modules field
    const questionNumber = parseInt(mh.questionId.replace(/\D/g, ''), 10);
    const question = !isNaN(questionNumber)
      ? mainQuestionsForMH.find(q => q.number === questionNumber)
      : undefined;
    const moduleHits = question?.modules ?? [];

    for (const moduleId of moduleHits) {
      const mod = updated.modules.find(m => m.moduleId === moduleId);
      if (mod) {
        mod.relevance = clamp(mod.relevance + strengthMultiplier * 0.12, 0, 1);
        mod.confidence = Math.min(1, mod.confidence + 0.08);
        if (mh.importance >= 4) {
          mod.reasons.push(`Must-have (importance ${mh.importance}/5) relates to this area`);
        }
      }
    }
  }

  return recalculateRankings(updated);
}

/**
 * Apply Trade-off slider values.
 * Sliders pit categories against each other — one goes up, the other goes down.
 */
export function applyTradeoffRelevance(
  result: RelevanceResult,
  tradeoffs: TradeoffAnswers
): RelevanceResult {
  const updated = structuredClone(result);

  // Look up tradeoff questions to get their modules field (covers all 50 questions)
  const tradeoffQuestions = getModuleQuestions('tradeoff_questions');

  for (const [key, value] of Object.entries(tradeoffs)) {
    // Extract question number from key (e.g., "tq1" → 1)
    const match = key.match(/^tq(\d+)$/);
    if (!match) continue;

    const questionNumber = parseInt(match[1], 10);
    const question = tradeoffQuestions.find(q => q.number === questionNumber);
    if (!question?.modules?.length) continue;

    const sliderValue = typeof value === 'number' ? value : 50;
    // Strength = how strongly the user feels (deviation from neutral)
    const strength = Math.abs(sliderValue - 50) / 50; // 0 = neutral, 1 = extreme
    const boost = strength * 0.15;

    // A non-neutral answer boosts all involved modules' relevance and confidence
    for (const modId of question.modules) {
      const mod = updated.modules.find(m => m.moduleId === modId);
      if (mod) {
        mod.relevance = clamp(mod.relevance + boost, 0, 1);
        mod.confidence = Math.min(1, mod.confidence + 0.05);
      }
    }
  }

  return recalculateRankings(updated);
}

/**
 * Apply General Questions answers.
 * Broad lifestyle signals that weakly influence many modules.
 */
export function applyGeneralRelevance(
  result: RelevanceResult,
  general: GeneralAnswers
): RelevanceResult {
  const updated = structuredClone(result);

  // General questions provide modest confidence boost across all modules
  const answerCount = Object.keys(general).length;
  const boostPerModule = Math.min(0.1, answerCount * 0.002);

  for (const mod of updated.modules) {
    mod.confidence = Math.min(1, mod.confidence + boostPerModule);
  }

  return recalculateRankings(updated);
}

// ─── Recommendation Logic ─────────────────────────────────────────

/**
 * Determine which modules to recommend based on:
 * 1. High relevance (the module matters for this user)
 * 2. Low confidence (we don't have enough data yet)
 * 3. Priority = relevance × (1 - confidence)
 *
 * A module with relevance 0.9 and confidence 0.2 is TOP priority.
 * A module with relevance 0.9 and confidence 0.9 is already covered — skip it.
 * A module with relevance 0.1 and confidence 0.1 doesn't matter — skip it.
 */
function recalculateRankings(result: RelevanceResult): RelevanceResult {
  const RELEVANCE_THRESHOLD = 0.35;   // Below this, don't recommend
  const CONFIDENCE_THRESHOLD = 0.75;  // Above this, already covered

  for (const mod of result.modules) {
    mod.recommended = mod.relevance >= RELEVANCE_THRESHOLD && mod.confidence < CONFIDENCE_THRESHOLD;
  }

  // Sort by priority score descending
  const sorted = [...result.modules].sort((a, b) => {
    const aPriority = a.relevance * (1 - a.confidence);
    const bPriority = b.relevance * (1 - b.confidence);
    return bPriority - aPriority;
  });

  sorted.forEach((mod, i) => { mod.rank = i + 1; });

  result.recommendedModules = sorted.filter(m => m.recommended);
  // Estimate ~12 questions per recommended module (CAT will narrow from 100 to ~8-15)
  result.estimatedTotalQuestions = result.recommendedModules.length * 12;

  return result;
}

// ─── Utility ──────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
