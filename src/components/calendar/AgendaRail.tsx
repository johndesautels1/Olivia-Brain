"use client";

import { useMemo } from "react";

interface AgendaEntry {
  id: string;
  title: string;
  startDatetime: string;
  endDatetime: string | null;
  category: string;
  priority: string;
  location: string | null;
  allDay: boolean;
  isArchived: boolean;
}

interface AgendaRailProps {
  entries: AgendaEntry[];
  onEntryClick?: (id: string) => void;
  horizontal?: boolean;
}

const priorityDot: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-400",
  medium: "bg-brand-400",
  low: "bg-slate-500",
};

const categoryLabels: Record<string, string> = {
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

function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatTimeRange(start: string, end: string | null): string {
  if (!end) return formatTime(start);
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/**
 * AgendaRail — Shows today's events.
 * Default: compact vertical timeline sidebar.
 * horizontal=true: cards laid out left-to-right, always centered.
 */
export function AgendaRail({ entries, onEntryClick, horizontal = false }: AgendaRailProps) {
  const now = useMemo(() => new Date(), []);

  // Filter to today's non-archived entries, sorted by start time
  const todayEntries = useMemo(() => {
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    return entries
      .filter((e) => {
        if (e.isArchived) return false;
        const start = new Date(e.startDatetime);
        return start >= todayStart && start <= todayEnd;
      })
      .sort(
        (a, b) =>
          new Date(a.startDatetime).getTime() -
          new Date(b.startDatetime).getTime()
      );
  }, [entries, now]);

  // Find the current or next event
  const activeIndex = useMemo(() => {
    const nowMs = now.getTime();
    for (let i = 0; i < todayEntries.length; i++) {
      const start = new Date(todayEntries[i].startDatetime).getTime();
      const end = todayEntries[i].endDatetime
        ? new Date(todayEntries[i].endDatetime!).getTime()
        : start + 3600000;
      // Currently happening
      if (nowMs >= start && nowMs < end) return i;
      // Next upcoming
      if (start > nowMs) return i;
    }
    return -1;
  }, [todayEntries, now]);

  const todayStr = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // ── Horizontal layout ──
  if (horizontal) {
    if (todayEntries.length === 0) {
      return (
        <p className="text-xs text-[var(--muted)] py-2">
          No events today
        </p>
      );
    }

    return (
      <div className="flex flex-wrap justify-center gap-3">
        {todayEntries.map((entry, idx) => {
          const isActive = idx === activeIndex;
          const isPast = activeIndex === -1 || idx < activeIndex;

          return (
            <button
              key={entry.id}
              onClick={() => onEntryClick?.(entry.id)}
              className={`flex-shrink-0 rounded-lg px-3 py-2 text-left transition-colors ${
                isActive
                  ? "border border-brand-500/40 bg-brand-950/30"
                  : "border border-[var(--card-border)] bg-[var(--card-bg)] hover:border-[var(--muted)] hover:bg-[var(--card-bg)]"
              }`}
              style={{
                backdropFilter: "blur(8px)",
                maxWidth: 220,
                minWidth: 140,
              }}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                {/* Priority dot */}
                <span
                  className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                    priorityDot[entry.priority] || priorityDot.medium
                  } ${isPast && !isActive ? "opacity-40" : ""}`}
                />
                {/* Time */}
                <span
                  className={`text-[10px] font-mono whitespace-nowrap ${
                    isActive
                      ? "text-brand-400"
                      : isPast
                        ? "text-[var(--muted)]/50"
                        : "text-[var(--muted)]"
                  }`}
                >
                  {entry.allDay
                    ? "All day"
                    : formatTimeRange(entry.startDatetime, entry.endDatetime)}
                </span>
              </div>
              {/* Title */}
              <p
                className={`text-[11px] leading-tight truncate ${
                  isActive
                    ? "text-[var(--foreground)] font-medium"
                    : isPast
                      ? "text-[var(--muted)]/60"
                      : "text-[var(--foreground)]"
                }`}
              >
                {entry.title}
              </p>
              {/* Category */}
              <span className="text-[9px] text-[var(--muted)]/60">
                {categoryLabels[entry.category] || entry.category}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  // ── Vertical layout (original) ──
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        background: "rgba(10, 14, 26, 0.85)",
        borderColor: "rgba(196, 169, 106, 0.12)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">
          Today
        </h3>
        <span className="text-[10px] text-[var(--muted)]">{todayStr}</span>
      </div>

      {todayEntries.length === 0 ? (
        <p className="text-xs text-[var(--muted)] py-4 text-center">
          No events today. Enjoy the free time.
        </p>
      ) : (
        <div className="space-y-1">
          {todayEntries.map((entry, idx) => {
            const isActive = idx === activeIndex;
            const isPast =
              activeIndex === -1 ||
              idx < activeIndex;

            return (
              <button
                key={entry.id}
                onClick={() => onEntryClick?.(entry.id)}
                className={`w-full text-left rounded-lg px-2.5 py-2 transition-colors ${
                  isActive
                    ? "border border-brand-500/40 bg-brand-950/30"
                    : "border border-transparent hover:border-[var(--card-border)] hover:bg-[var(--card-bg)]"
                }`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  {/* Priority dot */}
                  <span
                    className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                      priorityDot[entry.priority] || priorityDot.medium
                    } ${isPast && !isActive ? "opacity-40" : ""}`}
                  />
                  {/* Time */}
                  <span
                    className={`text-[10px] font-mono ${
                      isActive
                        ? "text-brand-400"
                        : isPast
                          ? "text-[var(--muted)]/50"
                          : "text-[var(--muted)]"
                    }`}
                  >
                    {entry.allDay
                      ? "All day"
                      : formatTimeRange(
                          entry.startDatetime,
                          entry.endDatetime
                        )}
                  </span>
                  {/* Category chip */}
                  <span className="text-[9px] text-[var(--muted)]/60">
                    {categoryLabels[entry.category] || entry.category}
                  </span>
                </div>
                {/* Title */}
                <p
                  className={`text-xs leading-tight pl-3.5 ${
                    isActive
                      ? "text-[var(--foreground)] font-medium"
                      : isPast
                        ? "text-[var(--muted)]/60"
                        : "text-[var(--foreground)]"
                  }`}
                >
                  {entry.title}
                </p>
                {/* Location */}
                {entry.location && (
                  <p className="text-[10px] text-[var(--muted)]/50 pl-3.5 mt-0.5 truncate">
                    {entry.location}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Summary footer */}
      {todayEntries.length > 0 && (
        <div className="mt-3 pt-2 border-t border-[var(--card-border)]">
          <p className="text-[10px] text-[var(--muted)]">
            {todayEntries.length} event{todayEntries.length !== 1 ? "s" : ""} today
            {activeIndex >= 0 && activeIndex < todayEntries.length && (
              <span>
                {" "}
                &middot;{" "}
                {todayEntries.length - activeIndex} remaining
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
