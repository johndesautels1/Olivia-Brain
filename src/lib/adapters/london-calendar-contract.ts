export type LondonCalendarEntryType =
  | "meeting"
  | "event"
  | "time_block"
  | "deadline"
  | "recurring"
  | "personal";

export type LondonCalendarPriority = "critical" | "high" | "medium" | "low";

export interface OliviaAdapterContext {
  tenantId: string;
  sourceApp: "olivia-brain";
  actorType: "assistant" | "system" | "user";
  actorId: string;
  reason: string;
  requiresApproval: boolean;
}

export interface LondonCalendarAttendeeInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: "required" | "optional" | "organizer" | "speaker";
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
  category: string;
  priority: LondonCalendarPriority;
  isVip?: boolean;
  tags?: string[];
  ecosystemOrgName?: string | null;
  investmentStage?: string | null;
}

export interface LondonCalendarEntryRecord extends LondonCalendarEntryInput {
  id: string;
  attendanceStatus: string;
  isAiGenerated: boolean;
  aiSource: string | null;
  linkedEventId: string | null;
  linkedOrgId: string | null;
  externalProvider: string | null;
  externalCalendarId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LondonCalendarAdapterRequest<TPayload> {
  context: OliviaAdapterContext;
  externalUserRef: string;
  payload: TPayload;
}

export interface LondonCalendarCreateEntryPayload {
  entry: LondonCalendarEntryInput;
  attendees?: LondonCalendarAttendeeInput[];
}

export interface LondonCalendarUpdateEntryPayload {
  entryId: string;
  updates: Partial<LondonCalendarEntryInput> & {
    attendanceStatus?: string;
    attendanceNote?: string | null;
  };
}

export interface LondonCalendarEntriesRangeQuery {
  externalUserRef: string;
  start: string;
  end: string;
}

export interface LondonCalendarPrepTaskRecord {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  dueAt: string | null;
  status: string;
}

export interface LondonCalendarRecommendationRecord {
  id: string;
  message: string;
  urgency: string;
  status: string;
  triggerType: string | null;
  triggerDescription: string | null;
  confidenceScore: number | null;
  createdAt: string;
}

export interface LondonCalendarParsePayload {
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

export const LONDON_CALENDAR_INTERNAL_ENDPOINTS = {
  health: "/api/internal/olivia/calendar/health",
  entries: "/api/internal/olivia/calendar/entries",
  parse: "/api/internal/olivia/calendar/parse",
  recommendations: "/api/internal/olivia/calendar/recommendations",
} as const;
