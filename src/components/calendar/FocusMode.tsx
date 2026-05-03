"use client";

import { useMemo, useEffect, useState, useCallback } from "react";

interface FocusEntry {
  id: string;
  title: string;
  startDatetime: string;
  endDatetime: string | null;
  category: string;
  priority: string;
  location: string | null;
  allDay: boolean;
  description: string | null;
}

interface FocusModeProps {
  entries: FocusEntry[];
  onClose: () => void;
}

const categoryLabels: Record<string, string> = {
  vc_meeting: "VC Meeting",
  angel_meeting: "Angel Meeting",
  board_meeting: "Board Meeting",
  advisory_call: "Advisory Call",
  founder_meeting: "Founder Meeting",
  team_standup: "Standup",
  one_on_one: "1:1",
  conference_attend: "Conference",
  meetup_attend: "Meetup",
  pitch_event: "Pitch Event",
  focus_time: "Focus Time",
  deep_work: "Deep Work",
  deal_prep: "Deal Prep",
  admin_block: "Admin",
  coffee_chat: "Coffee Chat",
  lunch_meeting: "Lunch Meeting",
  personal_event: "Personal",
  networking_event: "Networking",
  demo_day_attend: "Demo Day",
  hackathon_attend: "Hackathon",
  workshop_attend: "Workshop",
  weekly_review: "Weekly Review",
  quarterly_planning: "Quarterly Planning",
  travel: "Travel",
  ecosystem_event: "Ecosystem Event",
};

const priorityColors: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#c4a96a",
  low: "#64748b",
};

function formatTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "now";
  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  if (hrs > 0) return `${hrs}h ${remainMins}m`;
  return `${remainMins}m`;
}

function getTimeProgress(start: string, end: string | null): number {
  const now = Date.now();
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : s + 3600000;
  if (now <= s) return 0;
  if (now >= e) return 100;
  return Math.round(((now - s) / (e - s)) * 100);
}

/**
 * FocusMode — Full-screen glassmorphic overlay that shows only
 * the current and next event. Dims everything else.
 */
export function FocusMode({ entries, onClose }: FocusModeProps) {
  const [now, setNow] = useState(Date.now());

  // Tick every 30s to keep countdown/progress fresh
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  // Escape key to close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Find current + next event from today's non-archived entries
  const { currentEvent, nextEvent } = useMemo(() => {
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const todayEntries = entries
      .filter((e) => {
        const start = new Date(e.startDatetime).getTime();
        return start >= todayStart.getTime() && start <= todayEnd.getTime();
      })
      .sort(
        (a, b) =>
          new Date(a.startDatetime).getTime() -
          new Date(b.startDatetime).getTime()
      );

    let current: FocusEntry | null = null;
    let next: FocusEntry | null = null;

    for (const entry of todayEntries) {
      const start = new Date(entry.startDatetime).getTime();
      const end = entry.endDatetime
        ? new Date(entry.endDatetime).getTime()
        : start + 3600000;

      if (now >= start && now < end) {
        current = entry;
      } else if (start > now && !next) {
        next = entry;
      }

      if (current && next) break;
    }

    // If no current, find next
    if (!current && !next && todayEntries.length > 0) {
      const upcoming = todayEntries.find(
        (e) => new Date(e.startDatetime).getTime() > now
      );
      if (upcoming) next = upcoming;
    }

    return { currentEvent: current, nextEvent: next };
  }, [entries, now]);

  const timeUntilNext = nextEvent
    ? new Date(nextEvent.startDatetime).getTime() - now
    : null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(2, 4, 12, 0.92)", backdropFilter: "blur(24px)" }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 rounded-full border border-[rgba(196,169,106,0.2)] bg-[rgba(10,14,26,0.7)] p-2 text-[var(--muted)] hover:text-[var(--foreground)] hover:border-brand-400 transition-colors"
        title="Exit Focus Mode (Esc)"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>

      {/* Header */}
      <div className="absolute top-6 left-6">
        <span className="text-[10px] uppercase tracking-widest text-brand-400 font-semibold">
          Focus Mode
        </span>
      </div>

      {/* Main content */}
      <div className="w-full max-w-xl px-6 space-y-6">
        {/* No events state */}
        {!currentEvent && !nextEvent && (
          <div
            className="rounded-2xl border p-10 text-center"
            style={{
              background: "rgba(10, 14, 26, 0.85)",
              borderColor: "rgba(196, 169, 106, 0.12)",
              backdropFilter: "blur(12px)",
            }}
          >
            <p className="text-lg text-[var(--foreground)] font-medium mb-2">
              Clear schedule
            </p>
            <p className="text-sm text-[var(--muted)]">
              No more events today. Use this time well.
            </p>
          </div>
        )}

        {/* Current event card */}
        {currentEvent && (
          <div
            className="rounded-2xl border p-6"
            style={{
              background: "rgba(10, 14, 26, 0.85)",
              borderColor: "rgba(196, 169, 106, 0.25)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 0 40px 8px rgba(196, 169, 106, 0.06)",
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[10px] uppercase tracking-wider text-brand-400 font-semibold">
                Now
              </span>
              <span
                className="h-1.5 w-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: priorityColors[currentEvent.priority] || "#c4a96a" }}
              />
            </div>

            <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">
              {currentEvent.title}
            </h2>

            <div className="flex items-center gap-3 text-xs text-[var(--muted)] mb-3">
              <span className="font-mono">
                {formatTime(currentEvent.startDatetime)}
                {currentEvent.endDatetime &&
                  ` – ${formatTime(currentEvent.endDatetime)}`}
              </span>
              <span className="text-[var(--muted)]/50">|</span>
              <span>
                {categoryLabels[currentEvent.category] || currentEvent.category}
              </span>
            </div>

            {currentEvent.location && (
              <p className="text-xs text-[var(--muted)]/70 mb-3">
                {currentEvent.location}
              </p>
            )}

            {currentEvent.description && (
              <p className="text-xs text-[var(--muted)]/60 leading-relaxed line-clamp-3">
                {currentEvent.description}
              </p>
            )}

            {/* Progress bar */}
            <div className="mt-4">
              <div className="h-1 w-full rounded-full bg-[rgba(255,255,255,0.06)]">
                <div
                  className="h-1 rounded-full transition-all duration-1000"
                  style={{
                    width: `${getTimeProgress(currentEvent.startDatetime, currentEvent.endDatetime)}%`,
                    background: "linear-gradient(90deg, #c4a96a, #d4bc84)",
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-[var(--muted)]/50">
                  {formatTime(currentEvent.startDatetime)}
                </span>
                <span className="text-[9px] text-[var(--muted)]/50">
                  {currentEvent.endDatetime
                    ? formatTime(currentEvent.endDatetime)
                    : formatTime(
                        new Date(
                          new Date(currentEvent.startDatetime).getTime() + 3600000
                        ).toISOString()
                      )}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Next event card */}
        {nextEvent && (
          <div
            className="rounded-2xl border p-5"
            style={{
              background: "rgba(10, 14, 26, 0.6)",
              borderColor: "rgba(196, 169, 106, 0.08)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-semibold">
                Up Next
              </span>
              {timeUntilNext != null && timeUntilNext > 0 && (
                <span className="text-[10px] font-mono text-brand-400">
                  in {formatCountdown(timeUntilNext)}
                </span>
              )}
            </div>

            <h3 className="text-base font-medium text-[var(--foreground)]/80 mb-1.5">
              {nextEvent.title}
            </h3>

            <div className="flex items-center gap-3 text-xs text-[var(--muted)]/60">
              <span className="font-mono">
                {formatTime(nextEvent.startDatetime)}
                {nextEvent.endDatetime &&
                  ` – ${formatTime(nextEvent.endDatetime)}`}
              </span>
              <span className="text-[var(--muted)]/30">|</span>
              <span>
                {categoryLabels[nextEvent.category] || nextEvent.category}
              </span>
            </div>

            {nextEvent.location && (
              <p className="text-[10px] text-[var(--muted)]/50 mt-1.5">
                {nextEvent.location}
              </p>
            )}
          </div>
        )}

        {/* Keyboard hint */}
        <p className="text-center text-[10px] text-[var(--muted)]/40">
          Press <kbd className="px-1.5 py-0.5 rounded border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--muted)]/60 font-mono text-[9px]">Esc</kbd> to exit
        </p>
      </div>
    </div>
  );
}
