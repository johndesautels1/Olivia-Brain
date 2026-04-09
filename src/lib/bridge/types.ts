/**
 * UNIVERSAL KNOWLEDGE PROTOCOL (UKP) — Type Definitions
 *
 * This is the USB port of AI assistants — one connector, infinite apps.
 * Every app that wants Olivia integration MUST implement the UniversalKnowledgeProvider interface.
 *
 * Olivia speaks ONE language. Apps adapt to her, not vice versa.
 */

// ═══════════════════════════════════════════════════════════════════════════
// CORE PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════

/** Capability that an app can provide */
export interface Capability {
  id: string;
  name: string;
  description: string;
  category: 'data' | 'action' | 'flow' | 'output';
}

/** Term definition for domain vocabulary */
export interface TermDefinition {
  term: string;
  definition: string;
  synonyms?: string[];
  relatedTerms?: string[];
  examples?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVERSATION FLOWS
// ═══════════════════════════════════════════════════════════════════════════

/** A conversation flow that users can take */
export interface Flow {
  id: string;
  name: string;
  description: string;
  /** Ordered steps in the flow */
  steps: FlowStep[];
  /** Entry conditions (when should this flow be available?) */
  entryConditions?: FlowCondition[];
}

export interface FlowStep {
  id: string;
  name: string;
  /** What happens in this step */
  action: 'ask_questions' | 'process_data' | 'generate_output' | 'custom';
  /** How to transition to next step */
  transitions: FlowTransition[];
}

export interface FlowTransition {
  /** Target step ID (or 'complete' to end flow) */
  target: string;
  /** Condition for this transition */
  condition?: FlowCondition;
}

export interface FlowCondition {
  type: 'answer_value' | 'progress_threshold' | 'data_available' | 'custom';
  /** Condition parameters (varies by type) */
  params: Record<string, unknown>;
}

/** Current state in a flow */
export interface FlowState {
  flowId: string;
  currentStepId: string;
  stepIndex: number;
  totalSteps: number;
  progress: number; // 0-100
  data: Record<string, unknown>;
  startedAt: string;
  lastUpdatedAt: string;
  isComplete: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// QUESTIONS
// ═══════════════════════════════════════════════════════════════════════════

/** A question the app needs to ask users */
export interface UKPQuestion {
  id: string;
  moduleId: string;
  sectionId?: string;
  text: string;
  description?: string;
  type: QuestionType;
  options?: QuestionOption[];
  validation?: QuestionValidation;
  /** Why this question was selected (for Olivia to explain) */
  selectionReason?: string;
  /** Related questions (for skip logic) */
  dependsOn?: string[];
  /** Can this be pre-filled from upstream data? */
  preFillable?: boolean;
  preFillValue?: unknown;
}

export type QuestionType =
  | 'single-select'
  | 'multi-select'
  | 'slider'
  | 'range'
  | 'yes-no'
  | 'text'
  | 'ranking'
  | 'likert'
  | 'dealbreaker';

export interface QuestionOption {
  value: string;
  label: string;
  description?: string;
}

export interface QuestionValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  pattern?: string;
}

/** Result of submitting an answer */
export interface AnswerResult {
  success: boolean;
  questionId: string;
  /** Did this answer trigger any downstream effects? */
  effects?: AnswerEffect[];
  /** Error message if failed */
  error?: string;
}

export interface AnswerEffect {
  type: 'skip_question' | 'unlock_module' | 'update_score' | 'trigger_flow';
  target: string;
  details?: Record<string, unknown>;
}

/** Progress through questions */
export interface QuestionProgress {
  totalQuestions: number;
  answeredCount: number;
  skippedCount: number;
  percentage: number;
  /** Module-level progress (if applicable) */
  moduleProgress?: ModuleProgress[];
  /** Overall confidence/MOE */
  confidence?: number;
  marginOfError?: number;
  isComplete: boolean;
}

export interface ModuleProgress {
  moduleId: string;
  moduleName: string;
  totalQuestions: number;
  answeredCount: number;
  percentage: number;
  isComplete: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// DATA & QUERIES
// ═══════════════════════════════════════════════════════════════════════════

/** A natural language query to the app */
export interface NaturalLanguageQuery {
  query: string;
  context?: QueryContext;
  /** Limit results */
  limit?: number;
}

export interface QueryContext {
  userId?: string;
  sessionId?: string;
  currentFlow?: string;
  recentTopics?: string[];
}

/** Result of a query */
export interface QueryResult {
  success: boolean;
  /** Structured response data */
  data: unknown;
  /** Human-readable summary (for Olivia to speak) */
  summary: string;
  /** Confidence in the response (0-1) */
  confidence?: number;
  /** Sources for the data */
  sources?: DataSource[];
}

export interface DataSource {
  name: string;
  url?: string;
  timestamp?: string;
}

/** User's data within the app */
export interface UserData {
  userId: string;
  profile?: Record<string, unknown>;
  answers?: Record<string, unknown>;
  progress?: QuestionProgress;
  results?: AppResults;
  metadata?: Record<string, unknown>;
}

/** App-specific results */
export interface AppResults {
  /** Primary recommendations */
  recommendations?: Recommendation[];
  /** Scores or ratings */
  scores?: Record<string, number>;
  /** Any other structured output */
  custom?: Record<string, unknown>;
}

export interface Recommendation {
  id: string;
  title: string;
  description?: string;
  score?: number;
  confidence?: number;
  reasons?: string[];
  warnings?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

/** An action the app can perform */
export interface UKPAction {
  id: string;
  name: string;
  description: string;
  /** Required parameters */
  parameters: ActionParameter[];
  /** Does this action require user confirmation? */
  requiresConfirmation?: boolean;
  /** Is this action destructive? */
  isDestructive?: boolean;
}

export interface ActionParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description?: string;
  default?: unknown;
}

/** Result of executing an action */
export interface ActionResult {
  success: boolean;
  actionId: string;
  /** Result data */
  data?: unknown;
  /** Human-readable message */
  message?: string;
  /** Error if failed */
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// OUTPUTS
// ═══════════════════════════════════════════════════════════════════════════

/** Type of output the app can generate */
export interface OutputType {
  id: string;
  name: string;
  description: string;
  format: 'pdf' | 'pptx' | 'video' | 'json' | 'html' | 'custom';
  /** Parameters for generating this output */
  parameters?: ActionParameter[];
}

/** Generated output */
export interface GeneratedOutput {
  success: boolean;
  outputType: string;
  /** URL to download/view the output */
  url?: string;
  /** Raw data (for JSON outputs) */
  data?: unknown;
  /** Human-readable description */
  description?: string;
  /** Error if failed */
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════════════════════════

/** Event from the app that Olivia should know about */
export interface AppEvent {
  type: string;
  timestamp: string;
  userId?: string;
  data: Record<string, unknown>;
}

export type EventCallback = (event: AppEvent) => void;

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER METADATA
// ═══════════════════════════════════════════════════════════════════════════

/** Metadata about the app/provider */
export interface ProviderMetadata {
  /** Unique app ID */
  appId: string;
  /** Human-readable app name */
  appName: string;
  /** App version */
  version: string;
  /** Domain this app covers */
  domain: string;
  /** Capabilities this app provides */
  capabilities: Capability[];
  /** Is this provider healthy/available? */
  isHealthy?: boolean;
  /** Last health check timestamp */
  lastHealthCheck?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// UNIVERSAL KNOWLEDGE PROVIDER INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * UNIVERSAL KNOWLEDGE PROTOCOL (UKP)
 *
 * Every app that wants Olivia integration MUST implement this interface.
 * This is the USB port of AI assistants — one connector, infinite devices.
 */
export interface UniversalKnowledgeProvider {
  // ─── IDENTITY ───────────────────────────────────────────────────────────
  /** Provider metadata */
  readonly metadata: ProviderMetadata;

  // ─── VOCABULARY ─────────────────────────────────────────────────────────
  /** Domain-specific terms Olivia needs to understand */
  readonly vocabulary: {
    /** Get all terms */
    getTerms(): TermDefinition[];
    /** Get explanation for a term */
    getExplanation(term: string): string | undefined;
    /** Get synonyms/aliases for a term */
    getAliases(term: string): string[];
  };

  // ─── CONVERSATION FLOWS ─────────────────────────────────────────────────
  /** Conversation journeys users can take */
  readonly flows: {
    /** Get all available flows */
    getFlows(): Flow[];
    /** Get current state in a flow */
    getFlowState(userId: string, flowId: string): Promise<FlowState | null>;
    /** Advance the flow */
    advanceFlow(userId: string, flowId: string, input: unknown): Promise<FlowState>;
  };

  // ─── QUESTIONS ──────────────────────────────────────────────────────────
  /** Questions the app needs to ask users */
  readonly questions: {
    /** Get next question(s) based on context */
    getNextQuestions(userId: string, context?: QueryContext): Promise<UKPQuestion[]>;
    /** Submit an answer */
    submitAnswer(userId: string, questionId: string, answer: unknown): Promise<AnswerResult>;
    /** Get progress */
    getProgress(userId: string): Promise<QuestionProgress>;
  };

  // ─── DATA ───────────────────────────────────────────────────────────────
  /** Information the app has */
  readonly data: {
    /** Query data (Olivia asks questions about the domain) */
    query(query: NaturalLanguageQuery): Promise<QueryResult>;
    /** Get user's data */
    getUserData(userId: string): Promise<UserData | null>;
    /** Get recommendations/results */
    getResults(userId: string): Promise<AppResults | null>;
  };

  // ─── ACTIONS ────────────────────────────────────────────────────────────
  /** What this app can DO */
  readonly actions: {
    /** Get available actions */
    getActions(): UKPAction[];
    /** Execute an action */
    executeAction(actionId: string, params: Record<string, unknown>): Promise<ActionResult>;
  };

  // ─── OUTPUTS ────────────────────────────────────────────────────────────
  /** What this app can produce */
  readonly outputs: {
    /** Get available output types */
    getOutputTypes(): OutputType[];
    /** Generate output */
    generateOutput(userId: string, typeId: string, params?: Record<string, unknown>): Promise<GeneratedOutput>;
  };

  // ─── EVENTS ─────────────────────────────────────────────────────────────
  /** Events Olivia should know about */
  readonly events: {
    /** Subscribe to app events */
    subscribe(eventType: string, callback: EventCallback): void;
    /** Unsubscribe */
    unsubscribe(eventType: string): void;
  };

  // ─── LIFECYCLE ──────────────────────────────────────────────────────────
  /** Initialize the provider */
  initialize?(): Promise<void>;
  /** Health check */
  healthCheck?(): Promise<boolean>;
  /** Shutdown/cleanup */
  shutdown?(): Promise<void>;
}
