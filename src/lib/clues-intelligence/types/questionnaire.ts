/**
 * CLUES Questionnaire — Type definitions for the questionnaire engine
 * Covers answer state, validation, and rendering contracts.
 */

import type { QuestionItem, QuestionModule, QuestionSection } from '../data/questions/types';

// ─── Answer Values ──────────────────────────────────────────────

/** A single answer to a single question */
export interface QuestionAnswer {
  questionNumber: number;
  moduleId: string;
  sectionTitle: string;
  value: AnswerValue;
  answeredAt: string;       // ISO timestamp
}

/** All possible answer shapes by response type */
export type AnswerValue =
  | LikertAnswer
  | MultiSelectAnswer
  | SingleSelectAnswer
  | YesNoAnswer
  | RangeAnswer
  | SliderAnswer
  | RankingAnswer
  | TextAnswer;

export interface LikertAnswer {
  type: 'likert';
  scale: number;            // 1-5
  label: string;            // "Very Important", "Essential", etc.
}

export interface MultiSelectAnswer {
  type: 'multi-select';
  selected: string[];       // Array of selected option labels
}

export interface SingleSelectAnswer {
  type: 'single-select';
  selected: string;
}

export interface YesNoAnswer {
  type: 'yes-no';
  value: boolean;
}

export interface RangeAnswer {
  type: 'range';
  min: number;
  max: number;
}

export interface SliderAnswer {
  type: 'slider';
  value: number;            // 0-100
}

export interface RankingAnswer {
  type: 'ranking';
  order: string[];          // Items in ranked order (first = most important)
}

export interface TextAnswer {
  type: 'text';
  value: string;
}

// ─── Response Type Classification ────────────────────────────────

/** Maps question `type` string from data to a renderer category */
export type RendererType =
  | 'likert'
  | 'multi-select'
  | 'single-select'
  | 'yes-no'
  | 'range'
  | 'slider'
  | 'ranking'
  | 'dealbreaker'
  | 'text';

/** Classify a question's type string into a renderer category */
export function classifyResponseType(type: string): RendererType {
  if (type.startsWith('Likert-')) return 'likert';
  if (type === 'Multi-select') return 'multi-select';
  if (type === 'Single-select') return 'single-select';
  if (type === 'Yes/No') return 'yes-no';
  if (type === 'Range') return 'range';
  if (type === 'Slider') return 'slider';
  if (type === 'Ranking') return 'ranking';
  if (type === 'Dealbreaker') return 'dealbreaker';
  if (type === 'Open-text' || type === 'Text') return 'text';
  return 'text'; // fallback
}

// ─── Questionnaire State ─────────────────────────────────────────

/** Full answer state for one module */
export interface ModuleAnswerState {
  moduleId: string;
  answers: Record<number, QuestionAnswer>;  // keyed by question number
  currentSection: number;                   // 0-based section index
  currentQuestion: number;                  // question number within section
  startedAt: string;
  lastAnsweredAt?: string;
  isComplete: boolean;
}

/** Progress stats for display */
export interface ModuleProgress {
  moduleId: string;
  moduleName: string;
  totalQuestions: number;
  answeredCount: number;
  percentage: number;         // 0-100
  currentSectionIndex: number;
  totalSections: number;
}

// ─── Questionnaire Navigation ────────────────────────────────────

export interface QuestionnaireNavState {
  moduleId: string;
  sectionIndex: number;
  questionIndex: number;      // index within current section's questions array
}

/** What the questionnaire shell needs to render */
export interface QuestionnaireContext {
  module: QuestionModule;
  currentSection: QuestionSection;
  currentQuestion: QuestionItem;
  nav: QuestionnaireNavState;
  progress: ModuleProgress;
  answer: QuestionAnswer | undefined;
  canGoBack: boolean;
  canGoForward: boolean;
  isLastQuestion: boolean;
}

// ─── Re-exports for convenience ──────────────────────────────────
export type { QuestionItem, QuestionModule, QuestionSection };
