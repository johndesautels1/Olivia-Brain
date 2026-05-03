// =============================================================================
// AGENTIC CALENDAR — Zod Schemas for Olivia NLP Output Validation
// Validates LLM responses before they reach the database.
// Uses .passthrough() at top level so new fields from LLM don't cause failures.
// =============================================================================

import { z } from "zod";

// ─── Shared Enums ───

const calendarCategoryValues = [
  "vc_meeting", "angel_meeting", "board_meeting", "advisory_call",
  "investor_update", "founder_meeting", "team_standup", "one_on_one",
  "conference_attend", "meetup_attend", "pitch_event", "demo_day_attend",
  "hackathon_attend", "workshop_attend", "networking_event", "gala_awards",
  "focus_time", "deep_work", "admin_block", "email_block",
  "funding_deadline", "product_launch", "hiring_milestone", "legal_deadline",
  "weekly_review", "monthly_retrospective", "quarterly_planning", "annual_planning",
  "personal_event", "travel", "lunch_meeting", "coffee_chat",
  "ecosystem_event", "community_event", "olivia_suggestion", "synced_external",
] as const;

const calendarPriorityValues = ["critical", "high", "medium", "low"] as const;

const confidenceValues = ["high", "medium", "low"] as const;

// ─── NLP Parse Result ───

const entryTypeValues = [
  "meeting", "event", "time_block", "deadline", "recurring", "personal",
] as const;

const attendeeSchema = z.object({
  name: z.string().min(1),
  email: z.string().nullable().default(null),
  phone: z.string().nullable().default(null),
  role: z.enum(["required", "optional", "organizer", "speaker"]).catch("required"),
  isOrganizer: z.boolean().default(false),
}).passthrough();

const extractedEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().default(null),
  location: z.string().nullable().default(null),
  virtual_url: z.string().nullable().default(null),
  start_datetime: z.string().min(1),
  end_datetime: z.string().min(1),
  all_day: z.boolean().default(false),
  entry_type: z.enum(entryTypeValues).catch("event"),
  category: z.enum(calendarCategoryValues).catch("personal_event"),
  priority: z.enum(calendarPriorityValues).catch("medium"),
  is_vip: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  ecosystem_org_name: z.string().nullable().default(null),
  investment_stage: z.string().nullable().default(null),
  attendees: z.array(attendeeSchema).default([]),
}).passthrough();

export const nlpParseResultSchema = z.object({
  success: z.boolean(),
  extracted_event: extractedEventSchema.nullable().default(null),
  missing_fields: z.array(z.string()).default([]),
  clarification_needed: z.boolean().default(false),
  clarification_questions: z.array(z.string()).default([]),
  olivia_message: z.string().default(""),
  confidence: z.enum(confidenceValues).catch("low"),
}).passthrough();

// ─── Prep Plan Result ───

const prepTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  due_date_offset_hours: z.number().default(-24),
  priority: z.enum(calendarPriorityValues).catch("medium"),
  linked_document_type: z.string().nullable().default(null),
  auto_generate: z.boolean().default(false),
}).passthrough();

export const prepPlanResultSchema = z.object({
  agenda: z.string().default(""),
  prep_tasks: z.array(prepTaskSchema).default([]),
  key_talking_points: z.array(z.string()).default([]),
  questions_to_prepare: z.array(z.string()).default([]),
  olivia_briefing: z.string().default(""),
}).passthrough();

// ─── Proactive Suggestion ───

const eventDraftSchema = z.object({
  title: z.string().min(1),
  category: z.enum(calendarCategoryValues).catch("personal_event"),
  suggested_datetime: z.string().min(1),
  duration_minutes: z.number().positive().default(60),
  description: z.string().default(""),
  location: z.string().nullable().default(null),
}).passthrough();

export const proactiveSuggestionSchema = z.object({
  message: z.string().min(1),
  type: z.string().default("proactive"),
  urgency: z.string().default("when_relevant"),
  trigger: z.object({
    type: z.string().default("schedule_gap"),
    description: z.string().default(""),
  }).passthrough(),
  event_draft: eventDraftSchema.nullable().default(null),
  reasoning: z.string().default(""),
  confidence: z.enum(confidenceValues).catch("low"),
}).passthrough();

export const proactiveSuggestionsArraySchema = z.array(proactiveSuggestionSchema);

// ─── Daily Brief Result ───

const scheduleBlockSchema = z.object({
  time: z.string().default("09:00"),
  title: z.string().min(1),
  category: z.string().default("personal_event"),
  prep_note: z.string().nullable().default(null),
  is_high_priority: z.boolean().default(false),
}).passthrough();

const suggestedFocusBlockSchema = z.object({
  start_time: z.string().default("09:00"),
  end_time: z.string().default("10:00"),
  suggestion: z.string().default(""),
}).passthrough();

export const dailyBriefResultSchema = z.object({
  greeting: z.string().default("Good morning."),
  day_summary: z.string().default(""),
  schedule_blocks: z.array(scheduleBlockSchema).default([]),
  top_priorities: z.array(z.string()).default([]),
  suggested_focus_blocks: z.array(suggestedFocusBlockSchema).default([]),
  heads_up: z.array(z.string()).default([]),
  olivia_tip: z.string().default(""),
}).passthrough();

// ─── Olivia Action Contract ───
// Discriminated union for all valid Olivia POST actions.
// Enforces the exact shape of each action payload at the API boundary.

const oliviaParseActionSchema = z.object({
  action: z.literal("parse"),
  text: z.string().min(1),
  fromVoice: z.boolean().optional(),
  durationMs: z.number().positive().optional(),
  conversationId: z.string().optional(), // Layer 1: Conversation persistence
});

const oliviaGenerateSuggestionsActionSchema = z.object({
  action: z.literal("generate_suggestions"),
});

const oliviaDismissActionSchema = z.object({
  action: z.literal("dismiss"),
  recommendationId: z.string().min(1),
});

const oliviaAcceptActionSchema = z.object({
  action: z.literal("accept"),
  recommendationId: z.string().min(1),
});

export const oliviaActionSchema = z.discriminatedUnion("action", [
  oliviaParseActionSchema,
  oliviaGenerateSuggestionsActionSchema,
  oliviaDismissActionSchema,
  oliviaAcceptActionSchema,
]);

// GET action query param
export const oliviaGetActionValues = ["recommendations", "parse"] as const;
export const oliviaGetActionSchema = z.enum(oliviaGetActionValues);

// ─── Memory Extraction Result (Layer 3) ───

const memoryCategoryValues = [
  "personal", "professional", "behavioral", "preferences", "financial", "platform",
] as const;

const extractedFactSchema = z.object({
  category: z.enum(memoryCategoryValues),
  factKey: z.string().min(1),
  factValue: z.string().min(1),
  confidence: z.number().min(0).max(1).default(0.7),
  sourceQuote: z.string().default(""),
  isUpdate: z.boolean().default(false),
}).passthrough();

export const memoryExtractionResultSchema = z.object({
  extracted_facts: z.array(extractedFactSchema).default([]),
  updated_facts: z.array(extractedFactSchema).default([]),
}).passthrough();

// ─── Validation Helpers ───

export type ValidatedNlpParseResult = z.infer<typeof nlpParseResultSchema>;
export type ValidatedPrepPlanResult = z.infer<typeof prepPlanResultSchema>;
export type ValidatedProactiveSuggestion = z.infer<typeof proactiveSuggestionSchema>;
export type OliviaAction = z.infer<typeof oliviaActionSchema>;
export type OliviaGetAction = z.infer<typeof oliviaGetActionSchema>;
export type ValidatedDailyBriefResult = z.infer<typeof dailyBriefResultSchema>;
export type ValidatedMemoryExtractionResult = z.infer<typeof memoryExtractionResultSchema>;
export type MemoryCategory = typeof memoryCategoryValues[number];
