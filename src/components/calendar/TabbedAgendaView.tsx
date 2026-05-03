"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import type { RefObject } from "react";
import type FullCalendar from "@fullcalendar/react";
import type { CalendarEntryWithDetails } from "@/lib/queries/calendar";
import { EventStatusWidget } from "./EventStatusWidget";

// ── Ecosystem Event Type (matches CalendarView) ──
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

interface TabbedAgendaViewProps {
  calendarRef: RefObject<FullCalendar | null>;
  calendarDate: Date;
  personalEntries: CalendarEntryWithDetails[];
  ecosystemEvents: EcosystemEvent[];
  hiddenEcoEventIds: Set<string>;
  onPersonalClick: (entry: CalendarEntryWithDetails) => void;
  onEcosystemClick: (event: EcosystemEvent, mouseEvent: React.MouseEvent) => void;
  onStatusChange: (entryId: string, status: string, note?: string) => Promise<void>;
  onReschedule: (entryId: string) => void;
}

// ── Category colors (must match CalendarView) ──
const CATEGORY_COLORS: Record<string, string> = {
  vc_meeting: "#c4a96a",
  angel_meeting: "#a78bfa",
  board_meeting: "#f472b6",
  advisory_call: "#38bdf8",
  founder_meeting: "#34d399",
  team_standup: "#fb923c",
  one_on_one: "#60a5fa",
  conference_attend: "#f97316",
  meetup_attend: "#a3e635",
  pitch_event: "#e879f9",
  focus_time: "#94a3b8",
  deep_work: "#64748b",
  deal_prep: "#8B5CF6",
  admin_block: "#78716c",
  coffee_chat: "#fbbf24",
  lunch_meeting: "#fb7185",
  synced_external: "#22d3ee",
  personal_event: "#a1a1aa",
};

const ECOSYSTEM_COLORS: Record<string, string> = {
  conference: "#f97316",
  meetup: "#a3e635",
  hackathon: "#e879f9",
  workshop: "#38bdf8",
  networking: "#fbbf24",
  pitch: "#f472b6",
  demo_day: "#c4a96a",
  office_hours: "#60a5fa",
  webinar: "#22d3ee",
};

// ── Category labels ──
const CATEGORY_LABELS: Record<string, string> = {
  vc_meeting: "VC Meeting",
  angel_meeting: "Angel",
  board_meeting: "Board",
  advisory_call: "Advisory",
  founder_meeting: "Founder",
  team_standup: "Standup",
  one_on_one: "1:1",
  conference_attend: "Conference",
  meetup_attend: "Meetup",
  pitch_event: "Pitch",
  focus_time: "Focus",
  deep_work: "Deep Work",
  deal_prep: "Deal Prep",
  admin_block: "Admin",
  coffee_chat: "Coffee",
  lunch_meeting: "Lunch",
  synced_external: "External",
  personal_event: "Personal",
};

// ── Category icons (SVG strings) ──
const CATEGORY_ICONS: Record<string, string> = {
  vc_meeting: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
  angel_meeting: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm0 14a8 8 0 0 1-6-2.7 4 4 0 0 1 6-3.3 4 4 0 0 1 6 3.3A8 8 0 0 1 12 19z"/></svg>',
  board_meeting: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>',
  advisory_call: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  founder_meeting: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  team_standup: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  one_on_one: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  conference_attend: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
  meetup_attend: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  pitch_event: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  focus_time: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  deep_work: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
  deal_prep: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586"/></svg>',
  admin_block: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  coffee_chat: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>',
  lunch_meeting: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>',
  synced_external: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>',
  personal_event: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
};

// ── Helper functions ──
function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatTimeRange(start: string, end: string | null): string {
  if (!end) return formatTime(start);
  return `${formatTime(start)} – ${formatTime(end)}`;
}

function getWeekDays(referenceDate: Date): Date[] {
  const days: Date[] = [];
  const d = new Date(referenceDate);
  // Find Monday of this week
  const dayOfWeek = d.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);

  for (let i = 0; i < 7; i++) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ── Component ──
export function TabbedAgendaView({
  calendarRef,
  calendarDate,
  personalEntries,
  ecosystemEvents,
  hiddenEcoEventIds,
  onPersonalClick,
  onEcosystemClick,
  onStatusChange,
  onReschedule,
}: TabbedAgendaViewProps) {
  const [activeTabIndex, setActiveTabIndex] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    // Convert to Mon=0 index
    return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  });

  // Week days for tabs — derived from calendarDate prop
  const weekDays = useMemo(() => getWeekDays(calendarDate), [calendarDate]);

  // Track the previous week Monday so we only sync tab on actual week changes (arrows)
  const prevWeekMondayRef = useRef<string>(
    weekDays[0] ? weekDays[0].toISOString().slice(0, 10) : ""
  );

  // Sync active tab ONLY when the week changes (prev/next arrow or Today button).
  // Day tab clicks never touch FullCalendar, so they never trigger this effect.
  useEffect(() => {
    const monday = weekDays[0]?.toISOString().slice(0, 10) || "";
    if (monday !== prevWeekMondayRef.current) {
      // Week changed via arrows — pick the day FullCalendar landed on
      const dayOfWeek = calendarDate.getDay();
      setActiveTabIndex(dayOfWeek === 0 ? 6 : dayOfWeek - 1);
      prevWeekMondayRef.current = monday;
    }
  }, [calendarDate, weekDays]);

  // Filter and sort events for the active day
  const activeDay = weekDays[activeTabIndex];

  const dayEvents = useMemo(() => {
    const dayStart = new Date(activeDay);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(activeDay);
    dayEnd.setHours(23, 59, 59, 999);

    // Personal entries for this day
    const personalForDay = personalEntries
      .filter((e) => {
        if (e.isArchived) return false;
        const start = new Date(e.startDatetime);
        return start >= dayStart && start <= dayEnd;
      })
      .map((e) => ({ type: "personal" as const, entry: e, sortTime: new Date(e.startDatetime).getTime() }));

    // Ecosystem events for this day (not hidden)
    const ecoForDay = ecosystemEvents
      .filter((e) => {
        if (hiddenEcoEventIds.has(e.id)) return false;
        if (!e.startDatetime) return false;
        const start = new Date(e.startDatetime);
        return start >= dayStart && start <= dayEnd;
      })
      .map((e) => ({ type: "ecosystem" as const, event: e, sortTime: new Date(e.startDatetime!).getTime() }));

    // Combine and sort by start time ASCENDING (earliest first)
    const combined = [...personalForDay, ...ecoForDay];
    combined.sort((a, b) => a.sortTime - b.sortTime);

    return combined;
  }, [activeDay, personalEntries, ecosystemEvents, hiddenEcoEventIds]);

  // Handle tab click — only update local state, do NOT call api.gotoDate().
  // Calling gotoDate triggers FullCalendar's datesSet which resets calendarDate
  // to Monday (week start), creating a feedback loop that snaps tabs back.
  // The TabbedAgendaView filters events locally by activeDay, so FullCalendar
  // doesn't need to know which day tab is selected.
  const handleTabClick = useCallback((index: number) => {
    setActiveTabIndex(index);
  }, []);

  // Today check for highlighting
  const today = new Date();

  return (
    <div className="tabbed-agenda-view">
      {/* Day tabs */}
      <div className="flex gap-1 mb-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {weekDays.map((day, idx) => {
          const isActive = idx === activeTabIndex;
          const isToday = isSameDay(day, today);

          return (
            <button
              key={idx}
              onClick={() => handleTabClick(idx)}
              className={`flex-1 min-w-0 flex flex-col items-center px-1 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all ${
                isActive
                  ? "bg-brand-600 text-white"
                  : isToday
                    ? "border border-brand-500/40 bg-brand-950/30 text-brand-400"
                    : "border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--muted)]"
              }`}
            >
              <span className="text-[10px] sm:text-xs font-semibold">{DAY_NAMES[idx]}</span>
              <span className={`text-[11px] sm:text-sm font-bold ${isActive ? "" : "text-[var(--foreground)]"}`}>
                {day.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Events list */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
        {dayEvents.length === 0 ? (
          <div
            className="rounded-lg border p-6 text-center"
            style={{
              background: "rgba(255,255,255,0.02)",
              borderColor: "rgba(255,255,255,0.06)",
            }}
          >
            <p className="text-sm text-[var(--muted)]">No events scheduled</p>
            <p className="text-xs text-[var(--muted)]/60 mt-1">
              {activeDay.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
        ) : (
          dayEvents.map((item) => {
            if (item.type === "personal") {
              const entry = item.entry;
              const borderColor = CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.personal_event;
              const iconSvg = CATEGORY_ICONS[entry.category] || CATEGORY_ICONS.personal_event;
              const statusClass = entry.attendanceStatus ? `fc-event-status-${entry.attendanceStatus}` : "";

              return (
                <div
                  key={`personal-${entry.id}`}
                  className={`event-card rounded-lg border p-3 cursor-pointer transition-all hover:border-[var(--muted)] ${statusClass}`}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    borderColor: "rgba(255,255,255,0.08)",
                    borderLeftWidth: 3,
                    borderLeftColor: borderColor,
                  }}
                  onClick={() => onPersonalClick(entry)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Time + Category */}
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="flex-shrink-0 opacity-70"
                          style={{ color: borderColor }}
                          dangerouslySetInnerHTML={{ __html: iconSvg }}
                        />
                        <span className="text-[10px] sm:text-xs font-mono text-[var(--muted)]">
                          {entry.allDay ? "All day" : formatTimeRange(entry.startDatetime, entry.endDatetime)}
                        </span>
                        <span className="text-[9px] text-[var(--muted)]/60 hidden sm:inline">
                          {CATEGORY_LABELS[entry.category] || entry.category}
                        </span>
                      </div>

                      {/* Title */}
                      <p className={`text-xs sm:text-sm font-semibold text-[var(--foreground)] leading-tight truncate ${statusClass ? "line-through opacity-75" : ""}`}>
                        {entry.title}
                      </p>

                      {/* Location */}
                      {entry.location && (
                        <p className="text-[10px] text-[var(--muted)]/60 mt-0.5 truncate">
                          {entry.location}
                        </p>
                      )}

                      {/* Linked org (dropped — Organization model not in OB) or attendee */}
                      {(entry.ecosystemOrgName || entry.attendees?.[0]?.name) && (
                        <p className="text-[10px] text-[var(--muted)]/50 mt-0.5 truncate">
                          {entry.ecosystemOrgName || entry.attendees?.[0]?.name}
                        </p>
                      )}
                    </div>

                    {/* Status Widget */}
                    <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <EventStatusWidget
                        entryId={entry.id}
                        currentStatus={entry.attendanceStatus || "pending"}
                        onStatusChange={onStatusChange}
                        onReschedule={onReschedule}
                        size="sm"
                      />
                    </div>
                  </div>
                </div>
              );
            } else {
              // Ecosystem event
              const event = item.event;
              const borderColor = ECOSYSTEM_COLORS[event.eventType || "conference"] || ECOSYSTEM_COLORS.conference;

              return (
                <div
                  key={`eco-${event.id}`}
                  className="event-card event-card-ecosystem rounded-lg border p-3 cursor-pointer transition-all hover:border-[var(--muted)]"
                  style={{
                    background: "rgba(255,255,255,0.015)",
                    borderColor: "rgba(196,169,106,0.15)",
                    borderLeftWidth: 3,
                    borderLeftColor: borderColor,
                    opacity: 0.75,
                  }}
                  onClick={(e) => onEcosystemClick(event, e)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Time */}
                      <div className="flex items-center gap-2 mb-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 opacity-60 text-[var(--muted)]">
                          <circle cx="12" cy="12" r="10"/>
                          <path d="M12 6v6l4 2"/>
                        </svg>
                        <span className="text-[10px] sm:text-xs font-mono text-[var(--muted)]">
                          {event.startDatetime ? formatTime(event.startDatetime) : "TBD"}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-950/50 text-brand-400/80 border border-brand-500/20">
                          Ecosystem
                        </span>
                      </div>

                      {/* Title */}
                      <p className="text-xs sm:text-sm font-semibold text-[var(--foreground)] leading-tight truncate">
                        {event.title}
                      </p>

                      {/* Organizer / Venue */}
                      {(event.organizer || event.venue) && (
                        <p className="text-[10px] text-[var(--muted)]/60 mt-0.5 truncate">
                          {[event.organizer, event.venue].filter(Boolean).join(" • ")}
                        </p>
                      )}
                    </div>

                    {/* Website indicator */}
                    {event.website && (
                      <div className="flex-shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-400/60">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                          <polyline points="15 3 21 3 21 9"/>
                          <line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              );
            }
          })
        )}
      </div>

      {/* Summary footer */}
      {dayEvents.length > 0 && (
        <div className="mt-3 pt-2 border-t border-[var(--card-border)]">
          <p className="text-[10px] text-[var(--muted)]">
            {dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""} on{" "}
            {activeDay.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
          </p>
        </div>
      )}

      {/* Responsive styles */}
      <style>{`
        .tabbed-agenda-view {
          width: 100%;
        }

        /* Hide scrollbar for tabs */
        .tabbed-agenda-view > div:first-child::-webkit-scrollbar {
          display: none;
        }

        /* Attendance status strikethrough (matches CalendarView) */
        .fc-event-status-attended .text-\\[var\\(--foreground\\)\\],
        .event-card.fc-event-status-attended p {
          text-decoration: line-through;
          text-decoration-color: rgba(16, 185, 129, 0.5);
          text-decoration-thickness: 1.5px;
        }
        .fc-event-status-attended { opacity: 0.75; }

        .fc-event-status-rescheduled .text-\\[var\\(--foreground\\)\\],
        .event-card.fc-event-status-rescheduled p {
          text-decoration: line-through;
          text-decoration-color: rgba(234, 179, 8, 0.5);
          text-decoration-thickness: 1.5px;
        }
        .fc-event-status-rescheduled { opacity: 0.65; }

        .fc-event-status-missed .text-\\[var\\(--foreground\\)\\],
        .event-card.fc-event-status-missed p {
          text-decoration: line-through;
          text-decoration-color: rgba(239, 68, 68, 0.5);
          text-decoration-thickness: 1.5px;
        }
        .fc-event-status-missed { opacity: 0.60; }

        .fc-event-status-cancelled .text-\\[var\\(--foreground\\)\\],
        .event-card.fc-event-status-cancelled p {
          text-decoration: line-through;
          text-decoration-color: rgba(239, 68, 68, 0.5);
          text-decoration-thickness: 1.5px;
        }
        .fc-event-status-cancelled { opacity: 0.50; }

        /* Mobile: 480px */
        @media (max-width: 480px) {
          .event-card {
            padding: 8px 10px;
          }
          .event-card p {
            font-size: 0.7rem;
          }
        }
      `}</style>
    </div>
  );
}
