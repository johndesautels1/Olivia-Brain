export const LONDON_CALENDAR_CATEGORY_VALUES = [
  "vc_meeting",
  "angel_meeting",
  "board_meeting",
  "advisory_call",
  "investor_update",
  "founder_meeting",
  "team_standup",
  "one_on_one",
  "conference_attend",
  "meetup_attend",
  "pitch_event",
  "demo_day_attend",
  "hackathon_attend",
  "workshop_attend",
  "networking_event",
  "gala_awards",
  "focus_time",
  "deep_work",
  "admin_block",
  "email_block",
  "funding_deadline",
  "product_launch",
  "hiring_milestone",
  "legal_deadline",
  "weekly_review",
  "monthly_retrospective",
  "quarterly_planning",
  "annual_planning",
  "personal_event",
  "travel",
  "lunch_meeting",
  "coffee_chat",
  "ecosystem_event",
  "community_event",
  "olivia_suggestion",
  "synced_external",
] as const;

export const LONDON_CALENDAR_ENTRY_TYPE_VALUES = [
  "meeting",
  "event",
  "time_block",
  "deadline",
  "recurring",
  "personal",
  "signal",
  "constraint",
  "block",
  "milestone",
  "ritual",
] as const;

export const LONDON_CALENDAR_PRIORITY_VALUES = [
  "critical",
  "high",
  "medium",
  "low",
] as const;

export const LONDON_CALENDAR_ATTENDANCE_STATUS_VALUES = [
  "pending",
  "attended",
  "rescheduled",
  "missed",
  "cancelled",
] as const;

export const LONDON_CALENDAR_ATTENDEE_ROLE_VALUES = [
  "required",
  "optional",
  "organizer",
  "speaker",
] as const;

export const LONDON_CALENDAR_ATTENDEE_RSVP_VALUES = [
  "pending",
  "accepted",
  "declined",
  "tentative",
] as const;

export type LondonCalendarCategory =
  (typeof LONDON_CALENDAR_CATEGORY_VALUES)[number];
export type LondonCalendarEntryType =
  (typeof LONDON_CALENDAR_ENTRY_TYPE_VALUES)[number];
export type LondonCalendarPriority =
  (typeof LONDON_CALENDAR_PRIORITY_VALUES)[number];
export type LondonCalendarAttendanceStatus =
  (typeof LONDON_CALENDAR_ATTENDANCE_STATUS_VALUES)[number];
export type LondonCalendarAttendeeRole =
  (typeof LONDON_CALENDAR_ATTENDEE_ROLE_VALUES)[number];
export type LondonCalendarAttendeeRsvpStatus =
  (typeof LONDON_CALENDAR_ATTENDEE_RSVP_VALUES)[number];

export interface OliviaAdapterContext {
  tenantId: string;
  sourceApp: string;
  actorType?: "assistant" | "system" | "user" | string;
  actorId?: string;
  reason?: string;
  requiresApproval?: boolean;
}

export interface LondonCalendarAttendeeInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  socialUrl?: string | null;
  role?: LondonCalendarAttendeeRole;
  rsvpStatus?: LondonCalendarAttendeeRsvpStatus;
  linkedPersonId?: string | null;
  isOrganizer?: boolean;
}

export interface LondonCalendarEntryInput {
  title: string;
  description?: string | null;
  location?: string | null;
  virtualUrl?: string | null;
  startDatetime: string;
  endDatetime: string;
  allDay: boolean;
  entryType: LondonCalendarEntryType;
  category: LondonCalendarCategory | string;
  priority: LondonCalendarPriority;
  isVip?: boolean;
  tags?: string[];
  ecosystemOrgName?: string | null;
  investmentStage?: string | null;
  linkedEventId?: string | null;
  linkedOrgId?: string | null;
  rrule?: string | null;
  rescheduledFromId?: string | null;
  rescheduledFromDate?: string | null;
}

export interface LondonCalendarEntryUpdateInput {
  title?: string;
  description?: string | null;
  location?: string | null;
  virtualUrl?: string | null;
  startDatetime?: string;
  endDatetime?: string;
  allDay?: boolean;
  entryType?: LondonCalendarEntryType;
  category?: LondonCalendarCategory | string;
  priority?: LondonCalendarPriority;
  attendanceStatus?: LondonCalendarAttendanceStatus;
  attendanceNote?: string | null;
  tags?: string[];
  rrule?: string | null;
  linkedEventId?: string | null;
  linkedOrgId?: string | null;
  ecosystemOrgName?: string | null;
  investmentStage?: string | null;
  rescheduledFromId?: string | null;
  rescheduledFromDate?: string | null;
  isVip?: boolean;
}

export interface LondonCalendarEntryRecord extends LondonCalendarEntryInput {
  id: string;
  attendanceStatus: LondonCalendarAttendanceStatus | string;
  attendanceNote?: string | null;
  isAiGenerated: boolean;
  aiSource: string | null;
  externalProvider: string | null;
  externalCalendarId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LondonCalendarCreateEntryRequest {
  context: OliviaAdapterContext;
  externalUserRef: string;
  entry: LondonCalendarEntryInput;
}

export interface LondonCalendarCreateEntryWithAttendeesRequest
  extends LondonCalendarCreateEntryRequest {
  entry: LondonCalendarEntryInput & {
    attendees?: LondonCalendarAttendeeInput[];
  };
}

export interface LondonCalendarUpdateEntryRequest {
  context: OliviaAdapterContext;
  externalUserRef: string;
  updates: LondonCalendarEntryUpdateInput;
}

export interface LondonCalendarArchiveEntryRequest {
  context: OliviaAdapterContext;
  externalUserRef: string;
}

export interface LondonCalendarEntriesRangeQuery {
  externalUserRef: string;
  start: string;
  end: string;
}

export interface LondonCalendarPrepTasksQuery {
  externalUserRef: string;
}

export interface LondonCalendarPrepTaskInput {
  title: string;
  description?: string | null;
  priority?: LondonCalendarPriority;
  dueAt?: string | null;
  dueOffsetHours?: number;
  linkedDocumentType?: string | null;
  autoGenerate?: boolean;
}

export interface LondonCalendarPrepTaskRecord {
  id: string;
  title: string;
  description: string | null;
  priority: LondonCalendarPriority | string;
  dueAt: string | null;
  completedAt: string | null;
  status?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LondonCalendarRecommendationRecord {
  id: string;
  type?: string | null;
  message: string;
  reasoning?: unknown;
  urgency: string;
  status: string;
  triggerType: string | null;
  triggerDescription: string | null;
  eventDraft?: unknown;
  confidenceScore: number | null;
  actedAt?: string | null;
  dismissedAt?: string | null;
  snoozedUntil?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LondonCalendarParseRequest {
  context: OliviaAdapterContext;
  externalUserRef: string;
  text: string;
  conversationId?: string;
}

export interface LondonCalendarParseResult {
  success: boolean;
  oliviaMessage: string;
  confidence: string;
  extractedEvent: LondonCalendarEntryInput | null;
  attendees: LondonCalendarAttendeeInput[];
  clarificationNeeded: boolean;
  clarificationQuestions: string[];
}

export interface LondonCalendarHealthSnapshot {
  ok: boolean;
  service: string;
  version: string;
  caller?: string;
  capabilities: string[];
}

export interface LondonCalendarEntriesResponse {
  externalUserRef: string;
  userProfileId: string;
  entries: LondonCalendarEntryRecord[];
}

export interface LondonCalendarEntryResponse {
  entry: LondonCalendarEntryRecord;
}

export interface LondonCalendarArchiveResponse {
  success: boolean;
  entryId: string;
}

export interface LondonCalendarAttendeesResponse {
  entryId: string;
  attendees: LondonCalendarAttendeeInput[];
}

export interface LondonCalendarPrepTasksResponse {
  entryId: string;
  tasks: LondonCalendarPrepTaskRecord[];
}

export interface LondonCalendarPrepTaskResponse {
  entryId: string;
  task: LondonCalendarPrepTaskRecord;
}

export interface LondonCalendarParseResponse {
  conversationId: string | null;
  result: LondonCalendarParseResult;
}

export interface LondonCalendarRecommendationsResponse {
  externalUserRef: string;
  userProfileId: string;
  recommendations: LondonCalendarRecommendationRecord[];
}

export interface LondonCalendarAdapterErrorPayload {
  error: {
    code: string;
    message: string;
    retryable?: boolean;
    details?: string[];
  };
}

export const LONDON_CALENDAR_INTERNAL_ENDPOINTS = {
  health: "/api/internal/olivia/calendar/health",
  entries: "/api/internal/olivia/calendar/entries",
  parse: "/api/internal/olivia/calendar/parse",
  recommendations: "/api/internal/olivia/calendar/recommendations",
} as const;

export function getLondonCalendarEntryEndpoint(entryId: string) {
  return `${LONDON_CALENDAR_INTERNAL_ENDPOINTS.entries}/${encodeURIComponent(entryId)}`;
}

export function getLondonCalendarAttendeesEndpoint(entryId: string) {
  return `${getLondonCalendarEntryEndpoint(entryId)}/attendees`;
}

export function getLondonCalendarPrepTasksEndpoint(entryId: string) {
  return `${getLondonCalendarEntryEndpoint(entryId)}/prep-tasks`;
}
