// CLUES Question Library — Shared types
// Split from questionLibrary.ts for context window efficiency

export interface QuestionItem {
  number: number;
  question: string;
  type: string;
  /** Which of the 23 category modules this question maps to.
   *  The mapping lives HERE, on the question — NOT in separate lookup tables.
   *  When the question text changes, update this field in the same edit.
   *  See BUILD_SCHEDULE.md Section 10 for the architectural decision. */
  modules: string[];
  /** Left (low) label for Slider questions — e.g. "Very private" */
  sliderLeft?: string;
  /** Right (high) label for Slider questions — e.g. "Very open" */
  sliderRight?: string;
}

export interface QuestionSection {
  title: string;
  questionRange?: string;
  questions: QuestionItem[];
}

export interface QuestionModule {
  moduleId: string;
  moduleName: string;
  fileName?: string;
  structure?: string;
  totalQuestions?: number;
  sections: QuestionSection[];
}

export interface ResponseTypeMeta {
  scale?: string;
  labels?: string[];
  description?: string;
  component: string;
}

export interface QuestionLibraryData {
  _meta: {
    project: string;
    description: string;
    totalModules: number;
    totalQuestions: number;
    responseTypes: Record<string, ResponseTypeMeta>;
    brand?: Record<string, string>;
    moduleStructure?: string;
  };
  modules: QuestionModule[];
}
