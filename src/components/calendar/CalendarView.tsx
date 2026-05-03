"use client";

import { useCallback, useRef, useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import type { EventClickArg, DateSelectArg, EventInput } from "@fullcalendar/core";
import type { CalendarEntryWithDetails } from "@/lib/queries/calendar";
import { CalendarEntryModal } from "./CalendarEntryModal";
import { EventStatusWidget } from "./EventStatusWidget";
import { SyncPanel } from "./SyncPanel";
import { TabbedAgendaView } from "./TabbedAgendaView";

// ── Category colors (matches dark theme) ──
const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  vc_meeting: { bg: "#2d2a6b", border: "#6366f1", text: "#a5b4fc" },
  angel_meeting: { bg: "#2d2a6b", border: "#8b5cf6", text: "#c4b5fd" },
  board_meeting: { bg: "#1e3a6e", border: "#3b82f6", text: "#93c5fd" },
  advisory_call: { bg: "#264d78", border: "#0ea5e9", text: "#7dd3fc" },
  investor_update: { bg: "#2d2a6b", border: "#6366f1", text: "#a5b4fc" },
  founder_meeting: { bg: "#1a6b3a", border: "#22c55e", text: "#86efac" },
  team_standup: { bg: "#1d6478", border: "#06b6d4", text: "#67e8f9" },
  one_on_one: { bg: "#1d6478", border: "#14b8a6", text: "#5eead4" },
  conference_attend: { bg: "#1e3a6e", border: "#3b82f6", text: "#93c5fd" },
  meetup_attend: { bg: "#1a6b3a", border: "#10b981", text: "#6ee7b7" },
  pitch_event: { bg: "#5c2a0a", border: "#f59e0b", text: "#fcd34d" },
  demo_day_attend: { bg: "#3d1a80", border: "#a855f7", text: "#d8b4fe" },
  hackathon_attend: { bg: "#5a2010", border: "#f97316", text: "#fdba74" },
  workshop_attend: { bg: "#1a6360", border: "#14b8a6", text: "#5eead4" },
  networking_event: { bg: "#6b0e28", border: "#f43f5e", text: "#fda4af" },
  gala_awards: { bg: "#5a3010", border: "#eab308", text: "#fde047" },
  focus_time: { bg: "#14608a", border: "#0284c7", text: "#38bdf8" },
  deep_work: { bg: "#14608a", border: "#0369a1", text: "#7dd3fc" },
  deal_prep: { bg: "#3b1d6e", border: "#8B5CF6", text: "#c4b5fd" },
  admin_block: { bg: "#2a3650", border: "#64748b", text: "#94a3b8" },
  email_block: { bg: "#2a3650", border: "#64748b", text: "#94a3b8" },
  funding_deadline: { bg: "#992828", border: "#ef4444", text: "#fca5a5" },
  product_launch: { bg: "#1a6b3a", border: "#22c55e", text: "#86efac" },
  hiring_milestone: { bg: "#1d6478", border: "#06b6d4", text: "#67e8f9" },
  legal_deadline: { bg: "#992828", border: "#dc2626", text: "#fca5a5" },
  weekly_review: { bg: "#264d78", border: "#0ea5e9", text: "#7dd3fc" },
  monthly_retrospective: { bg: "#264d78", border: "#0284c7", text: "#7dd3fc" },
  quarterly_planning: { bg: "#1e3a6e", border: "#2563eb", text: "#93c5fd" },
  annual_planning: { bg: "#1e3a6e", border: "#1d4ed8", text: "#93c5fd" },
  personal_event: { bg: "#2a3650", border: "#94a3b8", text: "#cbd5e1" },
  travel: { bg: "#2a3650", border: "#78716c", text: "#a8a29e" },
  lunch_meeting: { bg: "#5a3010", border: "#d97706", text: "#fbbf24" },
  coffee_chat: { bg: "#5a3010", border: "#b45309", text: "#fbbf24" },
  ecosystem_event: { bg: "#252542", border: "#c4a96a", text: "#d4bc84" },
  community_event: { bg: "#1a6b3a", border: "#059669", text: "#6ee7b7" },
  olivia_suggestion: { bg: "#3d1a80", border: "#7c3aed", text: "#c4b5fd" },
};

// Ecosystem event type → color (matches existing EVENT_TYPE_COLORS in events/page.tsx)
const ECOSYSTEM_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  conference: { bg: "#1e3a6e", border: "#3b82f6", text: "#93c5fd" },
  meetup: { bg: "#1a6b3a", border: "#10b981", text: "#6ee7b7" },
  pitch_night: { bg: "#5c2a0a", border: "#f59e0b", text: "#fcd34d" },
  demo_day: { bg: "#3d1a80", border: "#a855f7", text: "#d8b4fe" },
  summit: { bg: "#1d6478", border: "#06b6d4", text: "#67e8f9" },
  networking_dinner: { bg: "#6b0e28", border: "#f43f5e", text: "#fda4af" },
  founder_salon: { bg: "#6b0e28", border: "#ec4899", text: "#f9a8d4" },
  expo: { bg: "#2d2a6b", border: "#6366f1", text: "#a5b4fc" },
  workshop: { bg: "#1a6360", border: "#14b8a6", text: "#5eead4" },
  hackathon: { bg: "#5a2010", border: "#f97316", text: "#fdba74" },
  pitch_competition: { bg: "#5a3010", border: "#eab308", text: "#fde047" },
};

// ── Human-readable category labels ──
const CATEGORY_LABELS: Record<string, string> = {
  vc_meeting: "VC Meeting",
  angel_meeting: "Angel Meeting",
  board_meeting: "Board Meeting",
  advisory_call: "Advisory Call",
  investor_update: "Investor Update",
  founder_meeting: "Founder Meeting",
  team_standup: "Standup",
  one_on_one: "1:1",
  conference_attend: "Conference",
  meetup_attend: "Meetup",
  pitch_event: "Pitch Event",
  demo_day_attend: "Demo Day",
  hackathon_attend: "Hackathon",
  workshop_attend: "Workshop",
  networking_event: "Networking",
  gala_awards: "Gala / Awards",
  focus_time: "Focus Time",
  deep_work: "Deep Work",
  deal_prep: "Deal Prep",
  admin_block: "Admin",
  email_block: "Email",
  funding_deadline: "Funding Deadline",
  product_launch: "Product Launch",
  hiring_milestone: "Hiring",
  legal_deadline: "Legal Deadline",
  weekly_review: "Weekly Review",
  monthly_retrospective: "Retrospective",
  quarterly_planning: "Quarterly Plan",
  annual_planning: "Annual Plan",
  personal_event: "Personal",
  travel: "Travel",
  lunch_meeting: "Lunch",
  coffee_chat: "Coffee Chat",
  ecosystem_event: "Ecosystem",
  community_event: "Community",
  olivia_suggestion: "Olivia Suggestion",
};

// ── Category → SVG icon path (inline micro-icons for widget badges) ──
const CATEGORY_ICONS: Record<string, string> = {
  vc_meeting: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  angel_meeting: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  board_meeting: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  advisory_call: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z",
  investor_update: "M22 12h-4l-3 9L9 3l-3 9H2",
  founder_meeting: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  team_standup: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  one_on_one: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  conference_attend: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z",
  meetup_attend: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  pitch_event: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  demo_day_attend: "M4 15s1-1 4-1 5 2 8 2 4-1V3s-1 1-4 1-5-2-8-2-4 1v0",
  hackathon_attend: "M16 18l6-6-6-6M8 6l-6 6 6 6",
  workshop_attend: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
  networking_event: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  gala_awards: "M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z",
  focus_time: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2",
  deep_work: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2",
  deal_prep: "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08",
  admin_block: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
  email_block: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  funding_deadline: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  product_launch: "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z",
  hiring_milestone: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM19 8l2 2 4-4",
  legal_deadline: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  weekly_review: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z",
  monthly_retrospective: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z",
  quarterly_planning: "M21.21 15.89A10 10 0 1 1 8 2.83M22 12A10 10 0 0 0 12 2v10z",
  annual_planning: "M21.21 15.89A10 10 0 1 1 8 2.83M22 12A10 10 0 0 0 12 2v10z",
  personal_event: "M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z",
  travel: "M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3s-3-.5-4.5 1L13 7l-8.2-1.8C3.8 5 2.9 5.1 2.5 5.5l-.2.2 5.5 3.8L5 12l-2.5-.5-.8.8 3 1.7 1.7 3 .8-.8L6.7 14l2.5-2.8 3.8 5.5.2-.2c.4-.4.5-1.3.3-2.3z",
  lunch_meeting: "M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3",
  coffee_chat: "M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3",
  ecosystem_event: "M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0zM3 12h18M12 3a15.3 15.3 0 0 1 4 9 15.3 15.3 0 0 1-4 9 15.3 15.3 0 0 1-4-9 15.3 15.3 0 0 1 4-9z",
  community_event: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  olivia_suggestion: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  // Ecosystem event types
  conference: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z",
  meetup: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  pitch_night: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  demo_day: "M4 15s1-1 4-1 5 2 8 2 4-1V3s-1 1-4 1-5-2-8-2-4 1v0",
  summit: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z",
  networking_dinner: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  founder_salon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  expo: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z",
  workshop: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
  hackathon: "M16 18l6-6-6-6M8 6l-6 6 6 6",
  pitch_competition: "M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z",
};

// ── Inline SVG icon component for category badges ──
function CategoryIcon({ category, color, size = 10 }: { category: string; color: string; size?: number }) {
  const pathData = CATEGORY_ICONS[category];
  if (!pathData) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d={pathData} />
    </svg>
  );
}

// ── Extract company/person from calendar entry ──
function getEventWho(entry: CalendarEntryWithDetails): string | null {
  // linkedOrg.name dropped — Organization model not in Olivia Brain schema
  if (entry.ecosystemOrgName) return entry.ecosystemOrgName;
  const keyAttendee = entry.attendees?.find(
    (a) => a.role === "organizer" || a.role === "required",
  );
  if (keyAttendee?.name) return keyAttendee.name;
  return null;
}

// ── Confidence tier → CSS class mapping ──
function getConfidenceClass(entry: CalendarEntryWithDetails): string[] {
  if (!entry.isAiGenerated) return [];
  const classes = ["fc-event-ai-generated"];
  const score = entry.aiConfidenceScore;
  if (score == null || score < 0.3) {
    classes.push("fc-event-ai-confidence-low");
  } else if (score < 0.6) {
    classes.push("fc-event-ai-confidence-medium");
  } else if (score < 0.85) {
    classes.push("fc-event-ai-confidence-high");
  } else {
    classes.push("fc-event-ai-confidence-very-high");
  }
  return classes;
}

interface EcosystemEvent {
  id: string;
  type: "ecosystem_event";
  title: string;
  startDatetime: string | null;
  endDatetime: string | null;
  eventType: string;
  organizer: string | null;
  venue: string | null;
  district: string | null;
  website: string | null;
  isPromoted: boolean;
  prestigeScore: number | null;
  isAddedToCalendar: boolean;
}

interface CalendarViewProps {
  personalEntries: CalendarEntryWithDetails[];
  ecosystemEvents: EcosystemEvent[];
  defaultView?: string;
  onRefresh: () => void;
  showSync?: boolean;
  onToggleSync?: () => void;
  /** Optional React node rendered at the very top inside the desk frame */
  todayHighlight?: React.ReactNode;
}

export function CalendarView({
  personalEntries,
  ecosystemEvents,
  defaultView = "timeGridWeek",
  onRefresh,
  showSync = false,
  onToggleSync,
  todayHighlight,
}: CalendarViewProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<CalendarEntryWithDetails | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [currentView, setCurrentView] = useState(defaultView);
  const [calendarDate, setCalendarDate] = useState(() => new Date());

  // Detect browser timezone (IANA string, e.g. "Europe/London", "America/New_York")
  // and derive week start: Americas → Sunday (0), everywhere else → Monday (1)
  const { detectedTimezone, firstDayOfWeek } = useMemo(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London";
    const isSundayStart = tz.startsWith("America/") || tz.startsWith("US/")
      || tz.startsWith("Canada/") || tz.startsWith("Pacific/");
    return { detectedTimezone: tz, firstDayOfWeek: isSundayStart ? 0 : 1 };
  }, []);

  const [reschedulingFrom, setReschedulingFrom] = useState<CalendarEntryWithDetails | null>(null);
  const [cloneFrom, setCloneFrom] = useState<CalendarEntryWithDetails | null>(null);
  const [ecoPopup, setEcoPopup] = useState<{ event: EcosystemEvent; x: number; y: number } | null>(null);
  const [ecoModalEventId, setEcoModalEventId] = useState<string | null>(null);
  const [hiddenEcoIds, setHiddenEcoIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem("calendar-hidden-eco");
      return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
    } catch { return new Set(); }
  });
  const hideEcoEvent = useCallback((id: string) => {
    setHiddenEcoIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try { localStorage.setItem("calendar-hidden-eco", JSON.stringify([...next])); } catch {}
      return next;
    });
    setModalOpen(false);
    setEcoModalEventId(null);
    showToast("Event removed from calendar");
  }, [showToast]);
  const statusRootsRef = useRef<Map<string, Root>>(new Map());

  // Scroll position tracking for modal open/close
  const scrollPositionRef = useRef<number>(0);
  const wasModalOpenRef = useRef<boolean>(false);

  // Save/restore scroll position when modal opens/closes
  useEffect(() => {
    if (modalOpen && !wasModalOpenRef.current) {
      // Modal just opened — save current scroll position
      scrollPositionRef.current = window.scrollY;
    } else if (!modalOpen && wasModalOpenRef.current) {
      // Modal just closed — restore scroll position
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollPositionRef.current, behavior: "instant" });
      });
    }
    wasModalOpenRef.current = modalOpen;
  }, [modalOpen]);

  // Clean up injected React roots on unmount
  useEffect(() => {
    const roots = statusRootsRef.current;
    return () => {
      roots.forEach((root) => root.unmount());
      roots.clear();
    };
  }, []);

  // Close "+N more" popover when clicking the dark overlay behind it
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const popover = document.querySelector(".fc-popover") as HTMLElement | null;
      if (!popover) return;
      // If click is outside the popover, close it
      if (!popover.contains(e.target as Node)) {
        const closeBtn = popover.querySelector(".fc-popover-close") as HTMLElement | null;
        if (closeBtn) closeBtn.click();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Attendance status change handler
  const handleStatusChange = useCallback(async (entryId: string, status: string, note?: string) => {
    try {
      const res = await fetch(`/api/calendar/entries?id=${entryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendanceStatus: status, attendanceNote: note || null }),
      });
      if (res.ok) onRefresh();
    } catch (err) {
      console.error("Failed to update attendance status:", err);
    }
  }, [onRefresh]);

  // Open CalendarEntryModal in create mode for rescheduling
  const handleRescheduleFromStatus = useCallback((entryId: string) => {
    const entry = personalEntries.find(e => e.id === entryId);
    if (entry) {
      setReschedulingFrom(entry);
      setSelectedEntry(null);
      setSelectedDateRange({ start: new Date(), end: new Date(Date.now() + 3600000) });
      setModalOpen(true);
    }
  }, [personalEntries]);

  // Clone: close edit modal, reopen as create with pre-filled data
  const handleClone = useCallback(() => {
    if (!selectedEntry) return;
    const data = selectedEntry;
    setModalOpen(false);
    setSelectedEntry(null);
    // Use setTimeout so React unmounts the edit modal before mounting the clone modal
    setTimeout(() => {
      setCloneFrom(data);
      setSelectedDateRange({ start: new Date(), end: new Date(Date.now() + 3600000) });
      setModalOpen(true);
    }, 50);
  }, [selectedEntry]);

  // Glassmorphic event renderer for week/day views
  const renderBulletContent = useCallback((arg: { event: { title: string; extendedProps: Record<string, unknown> } }) => {
    const props = arg.event.extendedProps;
    let who: string | null = null;
    let categoryKey: string = "";
    let label: string = "";
    let borderColor: string = "#c4a96a";
    let textColor: string = "#d4bc84";

    if (props.type === "personal") {
      const entry = props.entry as CalendarEntryWithDetails;
      who = getEventWho(entry);
      categoryKey = entry.category;
      label = CATEGORY_LABELS[entry.category] || (entry.category as string).replace(/_/g, " ");
      const colors = CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.personal_event;
      borderColor = colors.border;
      textColor = colors.text;
    } else if (props.type === "ecosystem") {
      const evt = props.event as EcosystemEvent;
      who = evt.organizer || null;
      categoryKey = evt.eventType || "ecosystem_event";
      label = CATEGORY_LABELS[evt.eventType] || evt.eventType?.replace(/_/g, " ") || "Event";
      const colors = ECOSYSTEM_COLORS[evt.eventType] || { border: "#c4a96a", text: "#d4bc84" };
      borderColor = colors.border;
      textColor = colors.text;
    }

    // Critical / VIP indicators for personal events
    const isCritical = props.type === "personal" && (props.entry as CalendarEntryWithDetails).priority === "critical";
    const isVipEvent = props.type === "personal" && (props.entry as CalendarEntryWithDetails).isVip;

    return (
      <div className="fc-glass-card" style={{ position: "relative" }}>
        <div className="fc-glass-title" style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {isCritical && (
            <span
              title="Critical"
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
                background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 800, lineHeight: 1,
                boxShadow: "0 0 6px rgba(239, 68, 68, 0.5)",
              }}
            >!</span>
          )}
          {isVipEvent && (
            <span
              title="VIP"
              style={{
                fontSize: 12, lineHeight: 1, flexShrink: 0,
                color: "#c4a96a", filter: "drop-shadow(0 0 3px rgba(196, 169, 106, 0.5))",
              }}
            >★</span>
          )}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{arg.event.title}</span>
        </div>
        {who && (
          <div className="fc-glass-who">{who}</div>
        )}
        <div className="fc-glass-badge" style={{ borderColor }}>
          <CategoryIcon category={categoryKey} color={borderColor} size={9} />
          <span>{label}</span>
        </div>
        {props.type === "personal" && (
          <div style={{ position: "absolute", top: 2, right: 2, zIndex: 5 }}>
            <EventStatusWidget
              entryId={(props.entry as CalendarEntryWithDetails).id}
              currentStatus={(props.entry as CalendarEntryWithDetails).attendanceStatus || "pending"}
              onStatusChange={handleStatusChange}
              onReschedule={handleRescheduleFromStatus}
              size="md"
            />
          </div>
        )}
        {props.type === "ecosystem" && (props.event as EcosystemEvent).website && (
          <div style={{ position: "absolute", top: 3, right: 4, zIndex: 5, opacity: 0.6 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </div>
        )}
      </div>
    );
  }, [handleStatusChange, handleRescheduleFromStatus]);

  // Compact renderer for month / list views — just indicators + title
  const renderCompactContent = useCallback((arg: { event: { title: string; extendedProps: Record<string, unknown> }; timeText: string }) => {
    const props = arg.event.extendedProps;
    const isCritical = props.type === "personal" && (props.entry as CalendarEntryWithDetails).priority === "critical";
    const isVipEvent = props.type === "personal" && (props.entry as CalendarEntryWithDetails).isVip;

    return (
      <div style={{ display: "flex", alignItems: "center", gap: 3, overflow: "hidden", padding: "1px 2px" }}>
        {arg.timeText && <span style={{ fontSize: 10, opacity: 0.7, flexShrink: 0 }}>{arg.timeText}</span>}
        {isCritical && (
          <span
            title="Critical"
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 12, height: 12, borderRadius: "50%", flexShrink: 0,
              background: "#ef4444", color: "#fff", fontSize: 8, fontWeight: 800, lineHeight: 1,
              boxShadow: "0 0 4px rgba(239, 68, 68, 0.5)",
            }}
          >!</span>
        )}
        {isVipEvent && (
          <span
            title="VIP"
            style={{
              fontSize: 10, lineHeight: 1, flexShrink: 0,
              color: "#c4a96a", filter: "drop-shadow(0 0 2px rgba(196, 169, 106, 0.5))",
            }}
          >★</span>
        )}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 11 }}>{arg.event.title}</span>
      </div>
    );
  }, []);

  // Construct FullCalendar events from personal entries + ecosystem events
  const calendarEvents: EventInput[] = [
    ...personalEntries.map((entry) => {
      const colors = CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.personal_event;
      const confidenceClasses = getConfidenceClass(entry);
      return {
        id: `personal-${entry.id}`,
        title: entry.title,
        start: entry.startDatetime,
        end: entry.endDatetime,
        allDay: entry.allDay,
        editable: true,
        backgroundColor: colors.bg,
        borderColor: colors.border,
        textColor: colors.text,
        classNames: [
          ...confidenceClasses,
          ...(entry.attendanceStatus && entry.attendanceStatus !== "pending"
            ? [`fc-event-status-${entry.attendanceStatus}`]
            : []),
        ],
        extendedProps: {
          type: "personal" as const,
          entry,
        },
      };
    }),
    ...ecosystemEvents
      .filter((e) => e.startDatetime && !hiddenEcoIds.has(e.id))
      .map((event) => {
        const colors = ECOSYSTEM_COLORS[event.eventType] || {
          bg: "#1a1a2e",
          border: "#c4a96a",
          text: "#d4bc84",
        };
        // Ecosystem events with midnight start are date-only → always all-day
        const startDate = new Date(event.startDatetime!);
        const isMidnight = startDate.getHours() === 0 && startDate.getMinutes() === 0 && startDate.getSeconds() === 0;
        const treatAsAllDay = isMidnight;

        return {
          id: `ecosystem-${event.id}`,
          title: `${event.title}`,
          start: event.startDatetime!,
          end: event.endDatetime || undefined,
          allDay: treatAsAllDay,
          editable: false,
          backgroundColor: event.isAddedToCalendar ? colors.bg : "transparent",
          borderColor: colors.border,
          textColor: colors.text,
          extendedProps: {
            type: "ecosystem" as const,
            event,
          },
          classNames: event.isAddedToCalendar
            ? []
            : ["fc-event-ecosystem-ghost"],
        };
      }),
  ];

  const handleEventClick = useCallback(
    (info: EventClickArg) => {
      requestAnimationFrame(() => {
        const { type } = info.event.extendedProps;
        if (type === "personal") {
          setEcoPopup(null);
          setSelectedEntry(info.event.extendedProps.entry);
          setSelectedDateRange(null);
          setModalOpen(true);
        } else if (type === "ecosystem") {
          const evt = info.event.extendedProps.event as EcosystemEvent;
          const rect = info.el.getBoundingClientRect();
          setEcoPopup({
            event: evt,
            x: rect.left + rect.width / 2,
            y: rect.bottom + 4,
          });
        }
      });
    },
    []
  );

  const handleDateSelect = useCallback((info: DateSelectArg) => {
    requestAnimationFrame(() => {
      setSelectedEntry(null);
      setSelectedDateRange({ start: info.start, end: info.end });
      setModalOpen(true);
    });
  }, []);

  // Drag-and-drop: move event to new time
  const handleEventDrop = useCallback(async (info: { event: { id: string; start: Date | null; end: Date | null; extendedProps: Record<string, unknown> }; revert: () => void }) => {
    const { event, revert } = info;
    if (event.extendedProps.type !== "personal" || !event.start) { revert(); return; }
    const entryId = event.id.replace("personal-", "");
    try {
      const res = await fetch(`/api/calendar/entries?id=${entryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDatetime: event.start.toISOString(),
          endDatetime: (event.end || event.start).toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      showToast("Event moved");
      onRefresh();
    } catch {
      revert();
      showToast("Failed to move event", "error");
    }
  }, [onRefresh, showToast]);

  // Drag resize: change event duration
  const handleEventResize = useCallback(async (info: { event: { id: string; start: Date | null; end: Date | null; extendedProps: Record<string, unknown> }; revert: () => void }) => {
    const { event, revert } = info;
    if (event.extendedProps.type !== "personal" || !event.start || !event.end) { revert(); return; }
    const entryId = event.id.replace("personal-", "");
    try {
      const res = await fetch(`/api/calendar/entries?id=${entryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDatetime: event.start.toISOString(),
          endDatetime: event.end.toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      showToast("Event resized");
      onRefresh();
    } catch {
      revert();
      showToast("Failed to resize event", "error");
    }
  }, [onRefresh, showToast]);

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setSelectedEntry(null);
    setSelectedDateRange(null);
    setCloneFrom(null);
  }, []);

  const handleModalSave = useCallback(() => {
    setModalOpen(false);
    setSelectedEntry(null);
    setSelectedDateRange(null);
    setCloneFrom(null);
    onRefresh();
  }, [onRefresh]);

  // View toggle buttons - short labels for mobile
  const viewButtons = [
    { key: "timeGridDay", label: "Day", shortLabel: "D" },
    { key: "timeGridWeek", label: "Week", shortLabel: "W" },
    { key: "dayGridMonth", label: "Month", shortLabel: "M" },
    { key: "listWeek", label: "Agenda", shortLabel: "A" },
  ];

  return (
    <>
      <style>{`
        /* ═══════════════════════════════════════════════════════
           FullCalendar — Fortune-100 Glassmorphic Dark Theme
           4D/5D depth: layered shadows, glass blur, luminance
           ═══════════════════════════════════════════════════════ */
        .fc {
          --fc-border-color: rgba(255,255,255,0.06);
          --fc-page-bg-color: transparent;
          --fc-neutral-bg-color: rgba(255,255,255,0.015);
          --fc-list-event-hover-bg-color: rgba(196,169,106,0.06);
          --fc-today-bg-color: rgba(196,169,106,0.03);
          --fc-now-indicator-color: #c4a96a;
          --fc-highlight-color: rgba(196,169,106,0.06);
          --fc-non-business-color: rgba(0,0,0,0.12);
          --fc-event-border-color: transparent;
          font-family: inherit;
        }
        .fc .fc-toolbar-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--foreground);
        }
        .fc .fc-col-header-cell-cushion,
        .fc .fc-daygrid-day-number,
        .fc .fc-list-day-cushion {
          color: rgba(255,255,255,0.78);
          font-size: 0.7rem;
          font-weight: 500;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }
        /* WCAG AAA 7:1 override for week + day view column headers */
        .fc-timeGridWeek-view .fc-col-header-cell-cushion,
        .fc-timeGridDay-view .fc-col-header-cell-cushion {
          color: #e2e8f0 !important;
        }
        .fc .fc-timegrid-slot-label-cushion {
          color: rgba(255,255,255,0.75);
          font-size: 0.65rem;
          font-weight: 500;
        }
        /* WCAG AAA 7:1 override for week + day view time labels */
        .fc-timeGridWeek-view .fc-timegrid-slot-label-cushion,
        .fc-timeGridDay-view .fc-timegrid-slot-label-cushion {
          color: #e2e8f0 !important;
        }

        /* ── Grid lines: ultra-subtle, no dotted lines ── */
        .fc td, .fc th {
          border-color: rgba(255,255,255,0.04) !important;
          border-style: solid !important;
        }
        .fc .fc-scrollgrid {
          border: none !important;
        }
        .fc .fc-timegrid-slot {
          border-color: rgba(255,255,255,0.03) !important;
          border-style: solid !important;
        }
        .fc .fc-timegrid-slot-minor {
          border-color: rgba(255,255,255,0.015) !important;
          border-style: solid !important;
        }
        /* WCAG AAA: week + day view grid lines — 3:1 non-text contrast */
        .fc-timeGridWeek-view td,
        .fc-timeGridWeek-view th,
        .fc-timeGridDay-view td,
        .fc-timeGridDay-view th {
          border-color: rgba(255,255,255,0.12) !important;
        }
        .fc-timeGridWeek-view .fc-timegrid-slot,
        .fc-timeGridDay-view .fc-timegrid-slot {
          border-color: rgba(255,255,255,0.10) !important;
        }
        .fc-timeGridWeek-view .fc-timegrid-slot-minor,
        .fc-timeGridDay-view .fc-timegrid-slot-minor {
          border-color: rgba(255,255,255,0.06) !important;
        }
        /* Week view day columns: subtle raised surface for 4D depth */
        .fc-timeGridWeek-view .fc-timegrid-col {
          background: rgba(255,255,255,0.018) !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.03),
                      inset 0 -1px 0 rgba(0,0,0,0.08);
        }
        .fc-timeGridWeek-view .fc-timegrid-col.fc-day-today {
          background: rgba(196,169,106,0.035) !important;
        }
        .fc-timeGridWeek-view .fc-col-header-cell {
          background: rgba(255,255,255,0.025) !important;
          box-shadow: inset 0 -1px 0 rgba(255,255,255,0.04);
        }

        /* ── Month view: slightly more visible cell borders ── */
        .fc-dayGridMonth-view td,
        .fc-dayGridMonth-view th {
          border-color: rgba(255,255,255,0.09) !important;
        }
        .fc-dayGridMonth-view .fc-daygrid-day {
          border-color: rgba(255,255,255,0.09) !important;
        }
        .fc-dayGridMonth-view .fc-col-header-cell {
          border-color: rgba(255,255,255,0.09) !important;
        }

        /* ── Month view: "+X more" link styling ── */
        .fc .fc-daygrid-more-link {
          color: rgba(196,169,106,0.85) !important;
          font-weight: 700;
          font-size: 0.68rem;
          letter-spacing: 0.02em;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        }
        .fc .fc-daygrid-more-link:hover {
          color: rgba(196,169,106,1) !important;
          text-decoration: none;
        }

        /* ── Month view: "+X more" popover — fixed center, full overlay ── */
        .fc .fc-popover {
          position: fixed !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) !important;
          z-index: 9999 !important;
          background: linear-gradient(180deg, rgba(18,22,38,0.99) 0%, rgba(10,14,26,1) 100%) !important;
          border: 1px solid rgba(196,169,106,0.25) !important;
          border-radius: 12px !important;
          box-shadow:
            0 2px 4px rgba(196,169,106,0.08),
            0 8px 24px rgba(0,0,0,0.5),
            0 24px 60px rgba(0,0,0,0.4),
            inset 0 1px 0 rgba(196,169,106,0.12),
            inset 0 -1px 0 rgba(0,0,0,0.2) !important;
          backdrop-filter: blur(16px) saturate(1.3);
          -webkit-backdrop-filter: blur(16px) saturate(1.3);
          overflow: visible !important;
          min-width: 300px;
          max-width: 90vw;
          max-height: 80vh;
        }
        /* Dark overlay behind popover — hides month calendar.
           Uses outline spread to cover the entire viewport without
           being clipped by the popover's own bounds. */
        .fc .fc-popover::before {
          content: "";
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0,0,0,0.80);
          z-index: -1;
          pointer-events: auto;
        }
        .fc .fc-popover-header {
          background: rgba(196,169,106,0.06) !important;
          border-bottom: 1px solid rgba(196,169,106,0.12) !important;
          padding: 10px 14px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
        }
        .fc .fc-popover-title {
          color: #ffffff !important;
          font-weight: 700 !important;
          font-size: 0.82rem !important;
          letter-spacing: 0.01em;
          font-family: var(--font-playfair), Georgia, 'Times New Roman', serif;
          text-shadow: 0 1px 2px rgba(0,0,0,0.4);
        }
        .fc .fc-popover-close {
          color: #ffffff !important;
          background: #dc2626 !important;
          border-radius: 5px;
          width: 26px;
          height: 26px;
          display: flex !important;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          line-height: 1;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          opacity: 1 !important;
          transition: background 0.15s ease;
          flex-shrink: 0;
        }
        .fc .fc-popover-close:hover {
          background: #ef4444 !important;
        }
        .fc .fc-popover-body {
          background: transparent !important;
          padding: 8px 10px 10px !important;
          max-height: 60vh;
          overflow-y: auto;
        }
        /* Events inside the popover */
        .fc .fc-popover-body .fc-daygrid-event {
          margin: 4px 0 !important;
          border-radius: 6px !important;
          padding: 4px 8px !important;
          background: rgba(255,255,255,0.10) !important;
          border: 1px solid rgba(255,255,255,0.14) !important;
          border-left: 3px solid var(--fc-event-border-color, rgba(196,169,106,0.3)) !important;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          box-shadow:
            0 1px 3px rgba(0,0,0,0.2),
            inset 0 1px 0 rgba(255,255,255,0.04);
          transition: background 0.15s ease;
        }
        .fc .fc-popover-body .fc-daygrid-event:hover {
          background: rgba(255,255,255,0.08) !important;
        }
        .fc .fc-popover-body .fc-event-title {
          color: #ffffff !important;
          font-weight: 600;
          font-size: 0.72rem;
          text-shadow: 0 1px 2px rgba(0,0,0,0.4);
        }
        .fc .fc-popover-body .fc-event-time {
          color: rgba(255,255,255,0.6) !important;
          font-size: 0.65rem;
          font-family: var(--font-geist-mono), monospace;
        }

        /* ── Base event: glassmorphic card ── */
        .fc .fc-event {
          background: rgba(255,255,255,0.10) !important;
          backdrop-filter: blur(16px) saturate(1.4);
          -webkit-backdrop-filter: blur(16px) saturate(1.4);
          border: 1px solid rgba(255,255,255,0.14) !important;
          border-left: 3px solid var(--fc-event-border-color, rgba(255,255,255,0.15)) !important;
          border-radius: 6px !important;
          font-size: 0.75rem;
          padding: 0 !important;
          cursor: pointer;
          overflow: hidden;
          contain: layout style paint;
          will-change: transform, box-shadow;
          box-shadow:
            0 1px 2px rgba(0,0,0,0.25),
            0 4px 12px rgba(0,0,0,0.15),
            inset 0 1px 0 rgba(255,255,255,0.07),
            inset 0 -1px 0 rgba(0,0,0,0.1);
          transition: box-shadow 0.2s ease, transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
        }
        .fc .fc-event:hover {
          background: rgba(255,255,255,0.15) !important;
          border-color: rgba(255,255,255,0.20) !important;
          box-shadow:
            0 2px 4px rgba(0,0,0,0.3),
            0 8px 24px rgba(0,0,0,0.2),
            0 0 0 1px rgba(255,255,255,0.06),
            inset 0 1px 0 rgba(255,255,255,0.1),
            inset 0 -1px 0 rgba(0,0,0,0.12);
          transform: translateY(-1px);
        }

        /* ── Ecosystem ghost events: frosted outline ── */
        .fc-event-ecosystem-ghost {
          background: rgba(255,255,255,0.015) !important;
          border: 1px solid rgba(196,169,106,0.2) !important;
          border-left: 3px solid rgba(196,169,106,0.3) !important;
          opacity: 0.65;
        }
        .fc-event-ecosystem-ghost:hover {
          opacity: 0.9;
          background: rgba(255,255,255,0.04) !important;
          border-color: rgba(196,169,106,0.35) !important;
        }
        /* Hide ecosystem ghost events in week view — their semi-transparent
           opacity causes text to bleed through stacked events */
        .fc-timeGridWeek-view .fc-event-ecosystem-ghost {
          display: none !important;
        }

        /* ── AI confidence: progressive luminance ── */
        .fc-event-ai-generated { position: relative; }
        .fc-event-ai-confidence-low {
          opacity: 0.5;
          border-left-style: dotted !important;
        }
        .fc-event-ai-confidence-low:hover { opacity: 0.8; }
        .fc-event-ai-confidence-medium { opacity: 0.75; }
        .fc-event-ai-confidence-medium:hover { opacity: 0.95; }
        .fc-event-ai-confidence-high {
          opacity: 0.92;
          box-shadow:
            0 1px 2px rgba(0,0,0,0.25),
            0 4px 12px rgba(0,0,0,0.15),
            0 0 8px rgba(196,169,106,0.08),
            inset 0 1px 0 rgba(255,255,255,0.07);
        }
        .fc-event-ai-confidence-very-high {
          box-shadow:
            0 1px 2px rgba(0,0,0,0.25),
            0 4px 12px rgba(0,0,0,0.15),
            0 0 12px rgba(196,169,106,0.12),
            inset 0 1px 0 rgba(255,255,255,0.09);
        }

        /* ── Hide FC default toolbar/buttons ── */
        .fc .fc-button { display: none !important; }
        .fc .fc-toolbar { display: none !important; }

        /* ── List/Agenda view ── */
        .fc .fc-list-event-title a {
          color: #ffffff;
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }
        .fc .fc-list-event-time {
          color: #e2e8f0;
        }
        .fc .fc-list-day-cushion {
          background: rgba(255,255,255,0.02);
          color: #e2e8f0;
        }

        /* ── Now indicator: gold accent ── */
        .fc .fc-timegrid-now-indicator-line {
          border-color: #c4a96a;
          border-width: 2px;
        }
        .fc .fc-timegrid-now-indicator-arrow {
          border-color: #c4a96a;
        }

        /* ═══ #44 All-day events: polished glassmorphic bar ═══ */
        .fc .fc-daygrid-event,
        .fc .fc-h-event {
          background-image: none !important;
          background: rgba(255,255,255,0.12) !important;
          backdrop-filter: blur(12px) saturate(1.3);
          -webkit-backdrop-filter: blur(12px) saturate(1.3);
          border-radius: 5px !important;
          border: none !important;
          border-left: 3px solid !important;
          padding: 3px 10px !important;
          font-size: 0.7rem;
          font-weight: 600;
          line-height: 1.5;
          letter-spacing: 0.01em;
          contain: layout style paint;
          will-change: transform, box-shadow;
          box-shadow:
            0 1px 3px rgba(0,0,0,0.3),
            0 4px 8px rgba(0,0,0,0.12),
            inset 0 1px 0 rgba(255,255,255,0.08);
          transition: box-shadow 0.2s ease, transform 0.2s ease, background 0.2s ease;
        }
        .fc .fc-daygrid-event:hover,
        .fc .fc-h-event:hover {
          background: rgba(255,255,255,0.18) !important;
          box-shadow:
            0 2px 6px rgba(0,0,0,0.4),
            0 8px 16px rgba(0,0,0,0.18),
            inset 0 1px 0 rgba(255,255,255,0.12);
          transform: translateY(-1px);
        }
        .fc .fc-daygrid-event .fc-event-title,
        .fc .fc-h-event .fc-event-title {
          color: #ffffff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-shadow: 0 1px 2px rgba(0,0,0,0.4);
        }
        .fc .fc-daygrid-event .fc-event-time { display: none; }
        .fc .fc-daygrid-event-dot { display: none; }
        .fc .fc-daygrid-body {
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }

        /* ═══ Week view: stacked full-width, EVERY layer opaque ═══ */
        .fc-timeGridWeek-view .fc-timegrid-event-harness {
          left: 0 !important;
          right: 0 !important;
          width: 100% !important;
          margin: 0 !important;
        }
        .fc-timeGridWeek-view .fc-timegrid-event-harness-inset .fc-timegrid-event {
          inset-inline-start: 0 !important;
          inset-inline-end: 0 !important;
          margin: 0 !important;
        }
        /* Kill ALL FullCalendar default text rendering in week view.
           FC may render .fc-event-title / .fc-event-time outside our
           custom eventContent. Make them invisible. */
        .fc-timeGridWeek-view .fc-event {
          background: #1a2038 !important;
          background-color: #1a2038 !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          contain: none !important;
          overflow: visible !important;
          transform: translateZ(0);
          isolation: isolate;
          color: transparent !important;
        }
        .fc-timeGridWeek-view .fc-event:hover {
          background: #222948 !important;
          background-color: #222948 !important;
          color: transparent !important;
        }
        .fc-timeGridWeek-view .fc-event-title,
        .fc-timeGridWeek-view .fc-event-time,
        .fc-timeGridWeek-view .fc-event-title-container,
        .fc-timeGridWeek-view .fc-event-main-frame {
          display: none !important;
        }
        .fc-timeGridWeek-view .fc-timegrid-event .fc-event-main {
          background: #1a2038 !important;
          background-color: #1a2038 !important;
          overflow: visible !important;
          color: transparent !important;
        }
        .fc-timeGridWeek-view .fc-glass-card {
          background: #1a2038 !important;
          overflow: visible !important;
        }
        /* Restore visible text ONLY inside our custom glass-card */
        .fc-timeGridWeek-view .fc-glass-card .fc-glass-title {
          color: #ffffff !important;
          white-space: normal;
          word-wrap: break-word;
          overflow-wrap: break-word;
          line-height: 1.3;
        }
        .fc-timeGridWeek-view .fc-glass-card .fc-glass-who {
          color: #e2e8f0 !important;
          white-space: normal;
          word-wrap: break-word;
          overflow-wrap: break-word;
          line-height: 1.2;
        }
        .fc-timeGridWeek-view .fc-glass-card .fc-glass-badge {
          display: none;
        }

        /* ═══ Day view: same card color as week view (#1a2038) ═══ */
        .fc-timeGridDay-view .fc-timegrid-event-harness {
          overflow: hidden !important;
        }
        .fc-timeGridDay-view .fc-event {
          background: #1a2038 !important;
          background-color: #1a2038 !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          contain: none !important;
          overflow: hidden !important;
          min-height: 0 !important;
          max-height: 100% !important;
          height: 100% !important;
          transform: translateZ(0);
          isolation: isolate;
          color: transparent !important;
        }
        .fc-timeGridDay-view .fc-event:hover {
          background: #222948 !important;
          background-color: #222948 !important;
          color: transparent !important;
        }
        .fc-timeGridDay-view .fc-event-title,
        .fc-timeGridDay-view .fc-event-time,
        .fc-timeGridDay-view .fc-event-title-container,
        .fc-timeGridDay-view .fc-event-main-frame {
          display: none !important;
        }
        .fc-timeGridDay-view .fc-timegrid-event .fc-event-main {
          background: #1a2038 !important;
          background-color: #1a2038 !important;
          overflow: hidden !important;
          max-height: 100% !important;
          color: transparent !important;
        }
        .fc-timeGridDay-view .fc-glass-card {
          background: #1a2038 !important;
          overflow: hidden !important;
          max-height: 100% !important;
        }
        .fc-timeGridDay-view .fc-glass-card .fc-glass-title {
          color: #ffffff !important;
          white-space: normal;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          line-height: 1.35;
        }
        .fc-timeGridDay-view .fc-glass-card .fc-glass-who {
          color: #e2e8f0 !important;
          white-space: normal;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          line-height: 1.2;
        }

        /* ── Day view: "+N more" overflow — dark text, vertical arrow ── */
        .fc-timeGridDay-view .fc-timegrid-more-link {
          background: rgba(255,255,255,0.08) !important;
          color: #1a1a2e !important;
          font-weight: 800;
          font-size: 0.7rem;
          text-align: center;
          border-left: 3px solid #c4a96a !important;
          position: relative;
        }
        .fc-timeGridDay-view .fc-timegrid-more-link .fc-timegrid-more-link-inner {
          color: #1a1a2e !important;
        }
        /* Vertical arrow through the +N time span */
        .fc-timeGridDay-view .fc-timegrid-more-link::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 4px;
          bottom: 4px;
          width: 2px;
          background: #64748b;
          transform: translateX(-50%);
        }
        .fc-timeGridDay-view .fc-timegrid-more-link::before {
          content: "";
          position: absolute;
          left: 50%;
          bottom: 2px;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-top: 6px solid #64748b;
        }
        /* Day view all-day "+N more" — also dark text */
        .fc-timeGridDay-view .fc-daygrid-more-link {
          color: #1a1a2e !important;
          font-weight: 800;
          font-size: 0.72rem;
          text-shadow: none !important;
        }

        /* ═══ Day/Week view: cap all-day section so it can't crush the timeline ═══ */
        .fc-timeGridDay-view .fc-daygrid-body,
        .fc-timeGridWeek-view .fc-daygrid-body {
          max-height: 120px !important;
          overflow-y: auto !important;
        }

        /* ═══ Week/Day glassmorphic event card content ═══ */
        .fc-glass-card {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 4px 6px 3px;
          overflow: hidden;
          min-height: 0;
        }
        .fc-glass-card .fc-glass-title {
          font-weight: 700;
          font-size: 0.68rem;
          line-height: 1.25;
          color: #ffffff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          letter-spacing: 0.01em;
          text-shadow: 0 1px 3px rgba(0,0,0,0.6);
        }
        .fc-glass-card .fc-glass-who {
          font-size: 0.6rem;
          line-height: 1.15;
          color: #e2e8f0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-weight: 500;
          text-shadow: 0 1px 2px rgba(0,0,0,0.4);
        }
        .fc-glass-card .fc-glass-badge {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          margin-top: 1px;
          padding: 1px 5px 1px 4px;
          border-radius: 3px;
          border: 1px solid;
          color: #f1f5f9;
          background: rgba(255,255,255,0.06);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          font-size: 0.55rem;
          font-weight: 700;
          line-height: 1.3;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: fit-content;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
          box-shadow:
            0 1px 2px rgba(0,0,0,0.2),
            inset 0 0.5px 0 rgba(255,255,255,0.08);
        }

        /* ═══ Attendance Status Strikethrough Effects ═══ */
        .fc-event-status-attended .fc-glass-title,
        .fc-event-status-attended .fc-event-title {
          text-decoration: line-through;
          text-decoration-color: rgba(16, 185, 129, 0.5);
          text-decoration-thickness: 1.5px;
        }
        .fc-event-status-attended {
          opacity: 0.75;
        }
        .fc-event-status-rescheduled .fc-glass-title,
        .fc-event-status-rescheduled .fc-event-title {
          text-decoration: line-through;
          text-decoration-color: rgba(234, 179, 8, 0.5);
          text-decoration-thickness: 1.5px;
        }
        .fc-event-status-rescheduled {
          opacity: 0.65;
        }
        .fc-event-status-missed .fc-glass-title,
        .fc-event-status-missed .fc-event-title {
          text-decoration: line-through;
          text-decoration-color: rgba(239, 68, 68, 0.5);
          text-decoration-thickness: 1.5px;
        }
        .fc-event-status-missed {
          opacity: 0.60;
        }
        .fc-event-status-cancelled .fc-glass-title,
        .fc-event-status-cancelled .fc-event-title {
          text-decoration: line-through;
          text-decoration-color: rgba(239, 68, 68, 0.5);
          text-decoration-thickness: 1.5px;
        }
        .fc-event-status-cancelled {
          opacity: 0.50;
        }

        /* WCAG AAA: week + day + agenda attendance statuses — keep
           opacity high enough for 7:1 contrast */
        .fc-timeGridWeek-view .fc-event-status-attended,
        .fc-timeGridDay-view .fc-event-status-attended,
        .fc-listWeek-view .fc-event-status-attended {
          opacity: 0.88;
        }
        .fc-timeGridWeek-view .fc-event-status-rescheduled,
        .fc-timeGridDay-view .fc-event-status-rescheduled,
        .fc-listWeek-view .fc-event-status-rescheduled {
          opacity: 0.85;
        }
        .fc-timeGridWeek-view .fc-event-status-missed,
        .fc-timeGridDay-view .fc-event-status-missed,
        .fc-listWeek-view .fc-event-status-missed {
          opacity: 0.82;
        }
        .fc-timeGridWeek-view .fc-event-status-cancelled,
        .fc-timeGridDay-view .fc-event-status-cancelled,
        .fc-listWeek-view .fc-event-status-cancelled {
          opacity: 0.78;
        }

        /* ═══ Drag-and-drop: grab cursor for editable events ═══ */
        .fc-event-draggable { cursor: grab; }
        .fc-event-draggable:active { cursor: grabbing; }

        /* ═══ MOBILE RESPONSIVE FIXES ═══ */
        @media (max-width: 768px) {
          /* Force calendar to fit container width */
          .fc {
            width: 100% !important;
            max-width: 100% !important;
            overflow-x: hidden !important;
          }
          .fc-view-harness {
            width: 100% !important;
            max-width: 100% !important;
            overflow-x: hidden !important;
          }
          .fc-scrollgrid {
            width: 100% !important;
            max-width: 100% !important;
          }
          .fc-scrollgrid-section,
          .fc-scrollgrid-section > td {
            width: 100% !important;
            max-width: 100% !important;
          }

          /* Day view mobile fixes */
          .fc-timeGridDay-view .fc-timegrid-cols,
          .fc-timeGridDay-view .fc-timegrid-col {
            width: 100% !important;
            max-width: 100% !important;
          }
          .fc-timeGridDay-view .fc-col-header {
            width: 100% !important;
          }
          .fc-timeGridDay-view .fc-timegrid-slot-label {
            font-size: 0.55rem !important;
            padding: 0 2px !important;
          }
          .fc-timeGridDay-view .fc-timegrid-axis {
            width: 35px !important;
            min-width: 35px !important;
          }

          /* Week view mobile fixes */
          .fc-timeGridWeek-view .fc-col-header-cell-cushion {
            font-size: 0.55rem !important;
            padding: 2px !important;
          }
          .fc-timeGridWeek-view .fc-timegrid-slot-label {
            font-size: 0.5rem !important;
            padding: 0 1px !important;
          }
          .fc-timeGridWeek-view .fc-timegrid-axis {
            width: 30px !important;
            min-width: 30px !important;
          }

          /* Event cards on mobile */
          .fc-glass-card {
            padding: 2px 4px !important;
          }
          .fc-glass-card .fc-glass-title {
            font-size: 0.6rem !important;
          }
          .fc-glass-card .fc-glass-who {
            font-size: 0.5rem !important;
          }
          .fc-glass-card .fc-glass-badge {
            display: none !important;
          }

          /* Toolbar title on mobile */
          .fc .fc-toolbar-title {
            font-size: 0.9rem !important;
          }

          /* All-day events on mobile */
          .fc .fc-daygrid-event {
            padding: 1px 4px !important;
            font-size: 0.6rem !important;
          }

          /* ═══ Agenda (listWeek) view mobile fixes ═══ */
          .fc-listWeek-view {
            width: 100% !important;
            max-width: 100% !important;
            overflow-x: hidden !important;
          }
          .fc-listWeek-view .fc-list-table {
            width: 100% !important;
            table-layout: fixed !important;
          }
          .fc-listWeek-view .fc-list-day-cushion {
            font-size: 0.65rem !important;
            padding: 6px 8px !important;
          }
          .fc-listWeek-view .fc-list-event {
            width: 100% !important;
          }
          .fc-listWeek-view .fc-list-event td {
            padding: 6px 4px !important;
          }
          .fc-listWeek-view .fc-list-event-time {
            font-size: 0.6rem !important;
            min-width: 50px !important;
            max-width: 60px !important;
            white-space: nowrap !important;
          }
          .fc-listWeek-view .fc-list-event-graphic {
            width: 8px !important;
            min-width: 8px !important;
            padding: 0 2px !important;
          }
          .fc-listWeek-view .fc-list-event-dot {
            width: 6px !important;
            height: 6px !important;
          }
          .fc-listWeek-view .fc-list-event-title {
            font-size: 0.7rem !important;
            padding-left: 4px !important;
            max-width: calc(100% - 70px) !important;
          }
          .fc-listWeek-view .fc-list-event-title a {
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            display: block !important;
            max-width: 100% !important;
          }
          /* Status widget positioning in Agenda view */
          .fc-listWeek-view .fc-status-widget-mount {
            top: 50% !important;
            transform: translateY(-50%) !important;
            right: 4px !important;
          }
        }

        /* Very small screens */
        @media (max-width: 480px) {
          .fc-timeGridDay-view .fc-timegrid-axis,
          .fc-timeGridWeek-view .fc-timegrid-axis {
            width: 25px !important;
            min-width: 25px !important;
          }
          .fc-timegrid-slot-label-cushion {
            font-size: 0.45rem !important;
          }

          /* ═══ Agenda (listWeek) very small screen fixes ═══ */
          .fc-listWeek-view .fc-list-day-cushion {
            font-size: 0.55rem !important;
            padding: 5px 6px !important;
          }
          .fc-listWeek-view .fc-list-event td {
            padding: 5px 2px !important;
          }
          .fc-listWeek-view .fc-list-event-time {
            font-size: 0.5rem !important;
            min-width: 40px !important;
            max-width: 45px !important;
          }
          .fc-listWeek-view .fc-list-event-title {
            font-size: 0.6rem !important;
            padding-left: 2px !important;
            max-width: calc(100% - 55px) !important;
          }
          .fc-listWeek-view .fc-list-event-graphic {
            display: none !important;
          }
        }
      `}</style>

      {/* ═══ Executive desk frame — double gold border ═══ */}
      {/* Outer gold ring */}
      <div
        style={{
          position: "relative",
          borderRadius: 18,
          padding: 2,
          background: "linear-gradient(145deg, rgba(196,169,106,0.30), rgba(196,169,106,0.12) 30%, rgba(196,169,106,0.06) 50%, rgba(196,169,106,0.12) 70%, rgba(196,169,106,0.25))",
          boxShadow: [
            "0 1px 2px rgba(196,169,106,0.10)",
            "0 4px 12px rgba(0,0,0,0.35)",
            "0 12px 36px rgba(0,0,0,0.30)",
            "0 24px 60px rgba(0,0,0,0.20)",
            "inset 0 1px 0 rgba(196,169,106,0.15)",
            "inset 0 -1px 0 rgba(0,0,0,0.12)",
          ].join(", "),
        }}
      >
        {/* Dark channel between rings */}
        <div
          style={{
            borderRadius: 16,
            padding: 2,
            background: "rgba(6,8,16,0.95)",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.5), inset 0 -1px 1px rgba(196,169,106,0.04)",
          }}
        >
          {/* Inner gold ring */}
          <div
            style={{
              borderRadius: 14,
              padding: 2,
              background: "linear-gradient(145deg, rgba(196,169,106,0.40), rgba(196,169,106,0.12) 30%, rgba(196,169,106,0.06) 50%, rgba(196,169,106,0.12) 70%, rgba(196,169,106,0.35))",
              boxShadow: [
                "inset 0 1px 0 rgba(196,169,106,0.20)",
                "inset 0 -1px 0 rgba(0,0,0,0.15)",
                "0 1px 3px rgba(0,0,0,0.25)",
              ].join(", "),
            }}
          >
        {/* Inner surface — hidden when modal is open */}
        <div
          className="px-3 py-3 sm:px-[18px] sm:py-4"
          style={{
            borderRadius: 12,
            background: "linear-gradient(180deg, rgba(15,18,30,0.97) 0%, rgba(10,14,26,0.99) 100%)",
            boxShadow: "inset 0 1px 0 rgba(196,169,106,0.06), inset 0 -1px 0 rgba(0,0,0,0.2)",
            visibility: modalOpen ? "hidden" : "visible",
          }}
        >

      {/* Today's Schedule highlight — rendered above toolbar */}
      {todayHighlight}

      {/* Custom toolbar */}
      <div className="mb-4 flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => { setTimeout(() => calendarRef.current?.getApi().prev(), 0); }}
            className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2.5 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--muted)] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <button
            onClick={() => { setTimeout(() => calendarRef.current?.getApi().today(), 0); }}
            className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--muted)] transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => { setTimeout(() => calendarRef.current?.getApi().next(), 0); }}
            className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2.5 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--muted)] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
          <h2 className="ml-2 text-sm font-semibold text-[var(--foreground)]" id="calendar-title">
            {/* Updated by FullCalendar datesSet callback */}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
          {/* Sync toggle — inside toolbar row */}
          {onToggleSync && (
            <button
              type="button"
              onClick={onToggleSync}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                showSync
                  ? "bg-sky-600 text-white"
                  : "border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--muted)]"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
                Sync
              </span>
            </button>
          )}
          {viewButtons.map((v) => (
            <button
              key={v.key}
              onClick={() => {
                setCurrentView(v.key);
                setTimeout(() => calendarRef.current?.getApi().changeView(v.key), 0);
              }}
              className={`rounded-full px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium transition-colors ${
                currentView === v.key
                  ? "bg-brand-600 text-white"
                  : "border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--muted)]"
              }`}
            >
              <span className="sm:hidden">{v.shortLabel}</span>
              <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
          <button
            onClick={() => {
              setSelectedEntry(null);
              setSelectedDateRange({ start: new Date(), end: new Date(Date.now() + 3600000) });
              setModalOpen(true);
            }}
            className="ml-1 sm:ml-2 rounded-md bg-brand-600 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium text-white hover:bg-brand-700 transition-colors"
          >
            <span className="sm:hidden">+</span>
            <span className="hidden sm:inline">+ New</span>
          </button>
        </div>
      </div>

      {/* Sync panel — collapsible, shown above the grid when open */}
      {showSync && (
        <div className="mb-3 flex justify-center">
          <div
            className="w-full max-w-md rounded-xl border p-4"
            style={{
              background: "rgba(10, 14, 26, 0.92)",
              borderColor: "rgba(196, 169, 106, 0.15)",
              backdropFilter: "blur(12px)",
            }}
          >
            <SyncPanel onRefresh={onRefresh} />
          </div>
        </div>
      )}

      {/* Tabbed Agenda View - shown when listWeek is active */}
      {currentView === "listWeek" && (
        <TabbedAgendaView
          calendarRef={calendarRef}
          calendarDate={calendarDate}
          personalEntries={personalEntries}
          ecosystemEvents={ecosystemEvents}
          hiddenEcoEventIds={hiddenEcoIds}
          onPersonalClick={(entry) => {
            setSelectedEntry(entry);
            setSelectedDateRange(null);
            setModalOpen(true);
          }}
          onEcosystemClick={(event, mouseEvent) => {
            setEcoPopup({ event, x: mouseEvent.clientX, y: mouseEvent.clientY });
          }}
          onStatusChange={handleStatusChange}
          onReschedule={handleRescheduleFromStatus}
        />
      )}

      {/* Calendar grid - hidden when listWeek is active but still mounted for navigation */}
      <div className="w-full max-w-full overflow-x-hidden" style={{ display: currentView === "listWeek" ? "none" : "block" }}>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          timeZone={detectedTimezone}
          firstDay={firstDayOfWeek}
          initialView={defaultView}
          headerToolbar={false}
          events={calendarEvents}
          selectable={true}
          selectMirror={true}
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          nowIndicator={true}
          slotMinTime="06:00:00"
          slotMaxTime="23:00:00"
          allDaySlot={true}
          height="auto"
          contentHeight={650}
          expandRows={true}
          stickyHeaderDates={true}
          dayMaxEvents={3}
          eventDisplay="block"
          slotDuration="00:30:00"
          views={{
            timeGridWeek: {
              eventContent: renderBulletContent,
              slotDuration: "00:15:00",
              slotLabelInterval: "01:00:00",
              contentHeight: "auto",
              eventMinHeight: 58,
              slotEventOverlap: false,
              dayMaxEventRows: 3,
            },
            timeGridDay: {
              eventContent: renderBulletContent,
              slotDuration: "00:15:00",
              slotLabelInterval: "01:00:00",
              contentHeight: "auto",
              eventMinHeight: 40,
              slotEventOverlap: true,
              dayMaxEventRows: 3,
              eventMaxStack: 3,
            },
            dayGridMonth: {
              eventContent: renderCompactContent,
            },
            listWeek: {
              eventContent: renderCompactContent,
            },
          }}
          datesSet={(info) => {
            const titleEl = document.getElementById("calendar-title");
            if (titleEl) {
              titleEl.textContent = info.view.title;
            }
            setCurrentView(info.view.type);
            setCalendarDate(info.view.currentStart);

            // Scroll agenda (list) view to today's date row
            if (info.view.type === "listWeek") {
              requestAnimationFrame(() => {
                const todayStr = new Date().toISOString().slice(0, 10);
                // FullCalendar list view renders day headings with data-date attr
                const todayHeading = document.querySelector(
                  `.fc-list-day[data-date="${todayStr}"]`
                ) as HTMLElement | null;
                if (todayHeading) {
                  todayHeading.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              });
            }
          }}
          eventDidMount={(info) => {
            // ── Popover click fix: events inside "+X more" popover need
            //    a direct click listener because FullCalendar's eventClick
            //    delegation doesn't always fire for popover-rendered events. ──
            if (info.el.closest(".fc-popover")) {
              info.el.style.cursor = "pointer";
              info.el.addEventListener("click", (e: MouseEvent) => {
                // Don't hijack clicks on the status widget
                if ((e.target as HTMLElement).closest(".fc-status-widget-mount")) return;
                e.stopPropagation();
                const p = info.event.extendedProps;
                if (p.type === "personal") {
                  setEcoPopup(null);
                  setSelectedEntry(p.entry as CalendarEntryWithDetails);
                  setSelectedDateRange(null);
                  setModalOpen(true);
                } else if (p.type === "ecosystem") {
                  const evt = p.event as EcosystemEvent;
                  const rect = info.el.getBoundingClientRect();
                  setEcoPopup({
                    event: evt,
                    x: rect.left + rect.width / 2,
                    y: rect.bottom + 4,
                  });
                }
              });
            }

            // Add tooltip with entry details + AI confidence
            const props = info.event.extendedProps;
            if (props.type === "personal") {
              const entry = props.entry as CalendarEntryWithDetails;
              const parts: string[] = [];
              if (entry.location) parts.push(entry.location);
              if (entry.isAiGenerated) {
                const pct = entry.aiConfidenceScore != null
                  ? `${Math.round(entry.aiConfidenceScore * 100)}%`
                  : "unscored";
                parts.push(`AI confidence: ${pct}`);
              }
              if (parts.length) info.el.title = parts.join(" | ");

              // Inject status widget for Month/Agenda views (Day/Week use renderBulletContent)
              const viewType = info.view.type;
              if (viewType === "dayGridMonth" || viewType === "listWeek") {
                const container = document.createElement("div");
                container.className = "fc-status-widget-mount";
                container.style.cssText = "position:absolute;top:1px;right:2px;z-index:5;line-height:1;";
                info.el.style.position = "relative";
                info.el.style.overflow = "visible";
                info.el.appendChild(container);

                const root = createRoot(container);
                statusRootsRef.current.set(info.event.id, root);
                root.render(
                  <EventStatusWidget
                    entryId={entry.id}
                    currentStatus={entry.attendanceStatus || "pending"}
                    onStatusChange={handleStatusChange}
                    onReschedule={handleRescheduleFromStatus}
                    size="sm"
                  />
                );
              }
            } else if (props.type === "ecosystem" && props.event) {
              const evt = props.event as EcosystemEvent;
              const parts = [evt.organizer, evt.venue, evt.district].filter(Boolean);
              if (evt.website) {
                parts.push(`Click to open: ${evt.website}`);
              } else {
                parts.push("No link available");
              }
              info.el.title = parts.join(" | ");
            }
          }}
          eventWillUnmount={(info) => {
            const root = statusRootsRef.current.get(info.event.id);
            if (root) {
              root.unmount();
              statusRootsRef.current.delete(info.event.id);
            }
          }}
        />
      </div>

      </div>{/* end inner surface */}
      </div>{/* end inner gold ring */}
      </div>{/* end dark channel */}
      </div>{/* end outer gold ring */}

      {/* Create/Edit modal */}
      {modalOpen && (
        <CalendarEntryModal
          key={selectedEntry?.id || cloneFrom?.id || reschedulingFrom?.id || 'new'}
          entry={selectedEntry}
          defaultStart={selectedDateRange?.start}
          defaultEnd={selectedDateRange?.end}
          onClose={() => { handleModalClose(); setReschedulingFrom(null); setEcoModalEventId(null); }}
          onSave={() => { handleModalSave(); setReschedulingFrom(null); setEcoModalEventId(null); }}
          rescheduledFromId={reschedulingFrom?.id}
          rescheduledFromDate={reschedulingFrom?.startDatetime}
          onClone={handleClone}
          cloneFrom={cloneFrom}
          reschedulingFrom={reschedulingFrom}
          onRemove={ecoModalEventId ? () => hideEcoEvent(ecoModalEventId) : undefined}
        />
      )}

      {/* Ecosystem event popup — portalled to document.body so backdrop covers entire page */}
      {ecoPopup && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
          onClick={() => setEcoPopup(null)}
        >
          <div
            className="relative w-full max-w-[300px] rounded-xl border p-4"
            style={{
              background: "rgba(10, 14, 26, 0.97)",
              borderColor: "rgba(196, 169, 106, 0.2)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close X */}
            <button
              onClick={() => setEcoPopup(null)}
              className="absolute top-2.5 right-2.5 rounded-md p-1 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
              </svg>
            </button>

            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1 leading-tight pr-6">
              {ecoPopup.event.title}
            </h3>
            {ecoPopup.event.organizer && (
              <p className="text-[10px] text-[var(--muted)] mb-0.5">{ecoPopup.event.organizer}</p>
            )}
            {ecoPopup.event.venue && (
              <p className="text-[10px] text-[var(--muted)] mb-0.5">{ecoPopup.event.venue}</p>
            )}
            {ecoPopup.event.startDatetime && (
              <p className="text-[10px] text-[var(--muted)] mb-2">
                {new Date(ecoPopup.event.startDatetime).toLocaleDateString("en-GB", {
                  weekday: "short", day: "numeric", month: "short",
                })}
              </p>
            )}
            <div className="flex gap-2">
              {ecoPopup.event.website && (
                <a
                  href={ecoPopup.event.website!.startsWith("http")
                    ? ecoPopup.event.website!
                    : `https://${ecoPopup.event.website!}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setEcoPopup(null)}
                  className="flex-1 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--muted)] transition-colors text-center"
                >
                  Visit Website
                </a>
              )}
              <button
                type="button"
                onClick={() => {
                  const evt = ecoPopup.event;
                  // Ecosystem-event linkage dropped — Event model not in Olivia Brain.
                  // Always treat the click as a fresh selection.
                  setSelectedEntry(null);
                  const start = evt.startDatetime ? new Date(evt.startDatetime) : new Date();
                  const end = evt.endDatetime ? new Date(evt.endDatetime) : new Date(start.getTime() + 3600000);
                  setSelectedDateRange({ start, end });
                  setEcoModalEventId(evt.id);
                  setModalOpen(true);
                  setEcoPopup(null);
                }}
                className="flex-1 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 transition-colors"
              >
                Calendar Editor
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Toast notification */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-[10000] rounded-lg border px-4 py-2.5 text-xs font-medium shadow-lg transition-all animate-in fade-in slide-in-from-bottom-2"
          style={{
            background: toast.type === "error" ? "rgba(127, 29, 29, 0.95)" : "rgba(10, 14, 26, 0.95)",
            borderColor: toast.type === "error" ? "rgba(239, 68, 68, 0.3)" : "rgba(196, 169, 106, 0.2)",
            color: toast.type === "error" ? "#fca5a5" : "#e2e8f0",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}
