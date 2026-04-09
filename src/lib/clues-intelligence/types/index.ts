/**
 * CLUES Main - Core type definitions
 * All shared types for the evaluation pipeline, user data, and UI state.
 * Single source of truth — import from here.
 *
 * Updated for Gemini 3.1 Pro Preview reasoning engine:
 * - GeminiMetricObject with fieldId, score, user_justification, data_justification, source
 * - ThinkingStep for reasoning trace transparency
 * - LocationMetrics for side-by-side comparison
 * - Updated GeminiExtraction (V2) with metrics array and recommendations
 */

// ─── Module Status ───────────────────────────────────────────────
export type ModuleStatus = 'locked' | 'not_started' | 'in_progress' | 'completed' | 'recommended';

// ─── Progressive Confidence Tiers ────────────────────────────────
export type CompletionTier =
  | 'discovery'      // Paragraphical only (~35%)
  | 'exploratory'    // + Demographics (~45%)
  | 'filtered'       // + DNWs (~60%)
  | 'evaluated'      // + MHs (~75%)
  | 'validated'      // + General Questions (~90%)
  | 'precision';     // + Mini Modules (90-100%)

// ─── Globe / Region ──────────────────────────────────────────────
export interface GlobeSelection {
  region: string;          // "Southern Europe / Mediterranean"
  lat: number;
  lng: number;
  zoomLevel: number;       // 1=region, 2=country, 3=city
}

// ─── Paragraphical ───────────────────────────────────────────────
export interface ParagraphEntry {
  id: number;              // 1-30
  heading: string;         // "Who You Are"
  content: string;         // User's free-form text
  updatedAt?: string;      // ISO timestamp
}

export interface ParagraphicalInput {
  paragraphs: ParagraphEntry[];
  globeRegion: string;
  metadata: {
    timestamp: string;
    appVersion: string;
  };
}

// ─── Gemini 3.1 Pro Preview: Metric Object ──────────────────────
// The core data contract for per-field metrics with justifications.
// Each metric is extracted from the user's paragraphs and scored
// per-location with sourced data.
export interface GeminiMetricObject {
  id: string;                      // "M1", "M2", etc.
  fieldId: string;                 // Machine-readable: "climate_01_humidity"
  description: string;             // "Average annual humidity below 60%"
  category: string;                // One of the 23 category modules (funnel order)
  source_paragraph: number;        // Which paragraph (1-30) triggered this metric
  score: number;                   // 0-100 (relative to other locations)
  user_justification: string;      // "Matches P4: User prioritized 'low petty crime'"
  data_justification: string;      // "Cascais 2026 safety reports show 12% decrease"
  source: string;                  // "Tavily: Portugal Interior Ministry Report 2026"
  data_type: 'numeric' | 'boolean' | 'ranking' | 'index';
  research_query: string;          // What Tavily should search for this metric
  threshold?: {
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'between';
    value: number | [number, number];
    unit: string;                  // "celsius", "percent", "USD", "index"
  };
}

// ─── Gemini 3.1 Pro Preview: Location Metrics ───────────────────
// A location (city, town, or neighborhood) with its scored metrics.
// Used for side-by-side comparison views.
export interface LocationMetrics {
  location: string;
  country: string;
  location_type: 'city' | 'town' | 'neighborhood';
  parent?: string;                 // Parent city (for towns) or parent town (for neighborhoods)
  overall_score: number;           // 0-100
  metrics: GeminiMetricObject[];   // All metrics scored for THIS location
}

// ─── Gemini 3.1 Pro Preview: Thinking Details ───────────────────
// Gemini 3.1 Pro Preview's thinking_level: "high" returns a reasoning chain.
// Each step shows how the model moved from the user's story
// to a specific recommendation.
export interface ThinkingStep {
  step: number;
  thought: string;
  conclusion?: string;
}

// ─── Gemini Extraction (V2 — Gemini 3.1 Pro Preview) ────────────
// Includes metrics array, location recommendations, and thinking details.
export interface GeminiExtraction {
  // Profile
  demographic_signals: {
    age?: number;
    gender?: string;
    household_size?: number;
    has_children?: boolean;
    has_pets?: boolean;
    employment_type?: string;
    income_bracket?: string;
  };
  personality_profile: string;

  // Currency
  detected_currency: string;
  budget_range: {
    min: number;
    max: number;
    currency: string;
  };

  // Metrics (THE KEY OUTPUT — 100 to 250 numbered metrics)
  metrics: GeminiMetricObject[];

  // Location Recommendations
  recommended_countries: {
    name: string;
    iso_code: string;
    reasoning: string;
    local_currency: string;
  }[];
  recommended_cities: LocationMetrics[];
  recommended_towns: LocationMetrics[];
  recommended_neighborhoods: LocationMetrics[];

  // Paragraph Summaries
  paragraph_summaries: {
    id: number;
    key_themes: string[];
    extracted_preferences: string[];
    metrics_derived: string[];     // ["M1", "M2", "M5"]
  }[];

  // Signals for Downstream
  dnw_signals: string[];
  mh_signals: string[];
  tradeoff_signals: string[];

  // Thinking Details (reasoning chain transparency)
  thinking_details?: ThinkingStep[];

  module_relevance: Record<string, number>;
  globe_region_preference: string;
}

// ─── Questionnaire Sub-Sections ──────────────────────────────────
export type SubSection = 'demographics' | 'dnw' | 'mh' | 'general' | 'tradeoffs';
export type SubSectionStatus = Record<SubSection, ModuleStatus>;

export interface DemographicAnswers {
  [questionId: string]: string | number | boolean;
}

export interface DNWAnswer {
  questionId: string;
  value: string;
  severity: 1 | 2 | 3 | 4 | 5;  // Mild -> Absolute Dealbreaker
}

export interface MHAnswer {
  questionId: string;
  value: string;
  importance: 1 | 2 | 3 | 4 | 5; // Nice to Have -> Essential
}

export type DNWAnswers = DNWAnswer[];
export type MHAnswers = MHAnswer[];
export type GeneralAnswers = Record<string, string | number>;
export type TradeoffAnswers = Record<string, number>;  // question key → slider value 0-100

// ─── Evaluation Context (fed to LLMs) ───────────────────────────
export interface EvaluationContext {
  tier: CompletionTier;
  confidence: number;              // 0-100
  paragraphical?: GeminiExtraction;
  demographics?: DemographicAnswers;
  dnw?: DNWAnswers;
  mh?: MHAnswers;
  generalQuestions?: GeneralAnswers;
  completedModules?: string[];
  globeRegion?: string;
}

// ─── Evaluation Results ──────────────────────────────────────────
export interface LocationRecommendation {
  name: string;
  country: string;
  score: number;           // 0-100
  confidence: number;      // 0-100
  highlights: string[];
  warnings: string[];
  paragraphLinks: number[]; // Which paragraphs support this
}

export type CountryRecommendation = LocationRecommendation;
export type CityRecommendation = LocationRecommendation & { metro?: string };
export type TownRecommendation = LocationRecommendation & { parentCity: string };
export type NeighborhoodRecommendation = LocationRecommendation & { parentTown: string };

export interface EvaluationResult {
  tier: CompletionTier;
  confidence: number;
  countries: CountryRecommendation[];
  cities: CityRecommendation[];
  towns: TownRecommendation[];
  neighborhoods: NeighborhoodRecommendation[];
  nextSteps: { action: string; confidenceGain: number }[];
  llmsUsed: string[];
  judgeUsed: boolean;
  dataCompleteness: Record<string, boolean>;
}

// ─── Cost Tracking ──────────────────────────────────────────
export type CostProvider =
  | 'claude-sonnet-4-6'
  | 'gpt-5.4'
  | 'gemini-3.1-pro-preview'
  | 'grok-4-1-fast-reasoning'
  | 'sonar-reasoning-pro-high'
  | 'claude-opus-4-6'
  | 'tavily'
  | 'gamma'
  | 'olivia'
  | 'tts-elevenlabs'
  | 'tts-openai'
  | 'avatar-heygen'
  | 'avatar-d-id'
  | 'avatar-simli'
  | 'avatar-replicate'
  | 'kling-ai'
  | 'gpt-realtime-1.5';

export interface CostEntry {
  id: string;
  session_id: string;
  model: CostProvider;
  endpoint: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  duration_ms: number | null;
  created_at: string;
  tier?: CompletionTier;
}

export interface ProviderCostSummary {
  provider: CostProvider;
  label: string;
  icon: string;
  total_cost: number;
  percentage: number;
  call_count: number;
}

export interface CostSummary {
  grand_total: number;
  total_sessions: number;
  total_calls: number;
  avg_cost_per_session: number;
  by_provider: ProviderCostSummary[];
  by_tier: Record<CompletionTier, number>;
  profitability: {
    avg_cost_per_session: number;
    breakeven_20_margin: number;
    suggested_50_margin: number;
    suggested_100_margin: number;
  };
}

export interface SessionCostRow {
  session_id: string;
  tier: CompletionTier;
  total_cost: number;
  call_count: number;
  created_at: string;
  description: string;
}

// ─── Auth ────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;           // Supabase auth.users UUID
  email: string;
  displayName?: string;
  avatarUrl?: string;
  provider: 'email' | 'google' | 'github' | 'anonymous';
  createdAt: string;
}

// ─── User Session State ──────────────────────────────────────────
export interface UserSession {
  id: string;
  userId?: string;       // Supabase auth.users UUID — links session to account
  email?: string;
  globe: GlobeSelection | null;
  paragraphical: {
    status: ModuleStatus;
    paragraphs: ParagraphEntry[];
    extraction?: GeminiExtraction;
  };
  mainModule: {
    subSectionStatus: SubSectionStatus;
    demographics?: DemographicAnswers;
    dnw?: DNWAnswers;
    mh?: MHAnswers;
    tradeoffAnswers?: TradeoffAnswers;
    generalAnswers?: GeneralAnswers;
  };
  completedModules: string[];
  currentTier: CompletionTier;
  confidence: number;
  evaluation?: EvaluationResult;
  /** Smart Score output from the evaluation pipeline (cities + winner) */
  smartScoreOutput?: import('./smartScore').SmartScoreOutput;
  /** Opus judge report (for disputed metrics) */
  judgeReport?: import('./judge').JudgeReport;
  /** Full judge orchestration result (safeguard info) */
  judgeOrchestration?: import('./judge').JudgeOrchestrationResult;
  /** Pre-rendered Cristiano video URL */
  cristianoVideoUrl?: string;
  createdAt: string;
  updatedAt: string;
}
