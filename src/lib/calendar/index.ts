// Barrel export — src/lib/calendar/
//
// Three LTM modules are intentionally NOT re-exported here because their
// dependencies haven't landed in Olivia Brain yet:
//   - document-aware     → needs Document model (post-Clerk Documents track)
//   - founder-journey    → needs AnalysisResult model (Track L)
//   - workflow-generator → needs AnalysisResult model + linkedOrgId on
//                          CalendarEntry (Track L)
// Re-port each in its own track when the dependency lands.

// Olivia Intelligence Engine
export {
  parseNaturalLanguage,
  generatePrepPlan,
  generateProactiveSuggestions,
  generateDailyBrief,
  getDefaultDurationForCategory,
} from "./olivia-engine";
export type {
  NlpParseResult,
  PrepPlanResult,
  ProactiveSuggestion,
  DailyBriefResult,
} from "./olivia-engine";

// Olivia Prompts
export {
  OLIVIA_CALENDAR_SYSTEM_PROMPT,
  buildNlpParsePrompt,
  buildPrepPlanPrompt,
  buildProactiveSuggestionPrompt,
  buildDailyBriefPrompt,
  buildBehaviorAnalysisPrompt,
} from "./olivia-prompts";

// Olivia Zod Schemas
export {
  nlpParseResultSchema,
  prepPlanResultSchema,
  proactiveSuggestionSchema,
  proactiveSuggestionsArraySchema,
  dailyBriefResultSchema,
  oliviaActionSchema,
  oliviaGetActionSchema,
} from "./olivia-schemas";
export type {
  ValidatedNlpParseResult,
  ValidatedPrepPlanResult,
  ValidatedProactiveSuggestion,
  ValidatedDailyBriefResult,
  OliviaAction,
  OliviaGetAction,
} from "./olivia-schemas";

// Event Categories
export {
  CATEGORY_CONFIG,
  getCategoryConfig,
  getDefaultDuration,
  isOliviaPrepEnabled,
} from "./event-categories";
export type { CategoryConfig } from "./event-categories";

// Behavior Engine (Self-Learning)
export {
  getInteractionStats,
  detectBehaviorPatterns,
  updateOliviaConfidence,
  computeFounderWeek,
  generateWeekSummary,
} from "./behavior-engine";
export type {
  BehaviorPattern,
  WeeklyDigest,
} from "./behavior-engine";

// Encryption & OAuth State Signing
export {
  encrypt,
  decrypt,
  encryptTokens,
  decryptTokens,
  signOAuthState,
  verifyOAuthState,
} from "./crypto";

// Google Calendar Sync
export {
  getGoogleAuthUrl,
  exchangeGoogleCode,
  saveGoogleSyncAccount,
  syncGoogleCalendar,
  pushEventToGoogle,
} from "./google-sync";

// Outlook Calendar Sync
export {
  getOutlookAuthUrl,
  exchangeOutlookCode,
  saveOutlookSyncAccount,
  syncOutlookCalendar,
  pushEventToOutlook,
} from "./outlook-sync";

// Daily Brief Generator
export { generateDailyBriefForUser } from "./daily-brief";
export type { DailyBriefResponse } from "./daily-brief";

// Calendar Judge (Opus AI Validation)
export { judgeCalendarEntries } from "./calendar-judge";
export type {
  CalendarJudgeEntry,
  CalendarJudgeVerdict,
  CalendarJudgeResult,
} from "./calendar-judge";

// London Travel Buffers
export {
  estimateTravelTime,
  insertTravelBuffers,
  clearTravelBuffers,
} from "./travel-buffer";
export type { TravelEstimate, TravelBufferResult } from "./travel-buffer";

// Calendar Memory (pgvector embeddings)
export {
  embedCalendarEntry,
  embedPendingEntries,
  searchCalendarMemory,
} from "./calendar-memory";
export type { CalendarMemoryResult, EmbedResult } from "./calendar-memory";

// Proximity (haversine helper only — see proximity-cluster.ts header for context)
export { haversineKm } from "./proximity-cluster";
