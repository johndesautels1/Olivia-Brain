"use client";

import { useState, useCallback, useEffect } from "react";

interface WeekDigest {
  weekStart: string;
  meetingsCount: number;
  networkingCount: number;
  focusHours: number;
  prepCompletion: number;
  suggestionAcceptRate: number;
  topCategories: string[];
  oliviaSummary: string | null;
}

interface BehaviorPattern {
  type: string;
  description: string;
  confidence: number;
  dataPoints: number;
  insight: string;
}

interface InteractionStats {
  totalInteractions: number;
  acceptRate: number;
  avgDailyEvents: number;
  topCategories: string[];
  activeDays: number;
  hasEnoughData: boolean;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatSummary(raw: string): string {
  // If it's not JSON, return as-is
  const trimmed = raw.trim();
  let jsonStr = trimmed;
  // Strip markdown code fences if present
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) jsonStr = fenceMatch[1].trim();

  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(jsonStr);
  } catch {
    return raw; // Not JSON, return original text
  }

  const lines: string[] = [];

  if (obj.analysis_notes && typeof obj.analysis_notes === "string") {
    lines.push(obj.analysis_notes);
  }

  const evtTypes = obj.preferred_event_types;
  if (Array.isArray(evtTypes) && evtTypes.length > 0) {
    lines.push(`Preferred activities: ${evtTypes.map((t: string) => t.replace(/_/g, " ")).join(", ")}.`);
  }

  const times = obj.preferred_meeting_times;
  if (Array.isArray(times) && times.length > 0) {
    const daySet = new Set<string>();
    times.forEach((t: { day_of_week?: number; hour_start?: number; hour_end?: number }) => {
      if (typeof t.day_of_week === "number") daySet.add(DAY_NAMES[t.day_of_week] || `Day ${t.day_of_week}`);
    });
    if (daySet.size > 0) lines.push(`Most active on ${[...daySet].join(" and ")}.`);
    const t0 = times[0] as { hour_start?: number; hour_end?: number };
    if (typeof t0.hour_start === "number" && typeof t0.hour_end === "number") {
      lines.push(`Preferred meeting window: ${t0.hour_start}:00–${t0.hour_end}:00.`);
    }
  }

  const peak = obj.peak_productivity_hours;
  if (Array.isArray(peak) && peak.length > 0) {
    lines.push(`Peak productivity hours: ${peak.map((h: number) => `${h}:00`).join(", ")}.`);
  }

  if (typeof obj.networking_frequency === "string") {
    lines.push(`Networking frequency: ${obj.networking_frequency}.`);
  }

  if (typeof obj.confidence_score === "number") {
    lines.push(`Model confidence: ${Math.round(obj.confidence_score * 100)}%.`);
  }

  return lines.length > 0 ? lines.join(" ") : raw;
}

export function InsightsPanel() {
  const [digest, setDigest] = useState<WeekDigest | null>(null);
  const [patterns, setPatterns] = useState<BehaviorPattern[]>([]);
  const [stats, setStats] = useState<InteractionStats | null>(null);
  const [confidence, setConfidence] = useState<number>(0.5);
  const [loading, setLoading] = useState(true);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [weekRes, patternsRes, statsRes, confRes] = await Promise.all([
        fetch("/api/calendar/analytics?action=week"),
        fetch("/api/calendar/analytics?action=patterns"),
        fetch("/api/calendar/analytics?action=stats"),
        fetch("/api/calendar/analytics?action=confidence"),
      ]);

      if (weekRes.ok) setDigest(await weekRes.json());
      if (patternsRes.ok) {
        const data = await patternsRes.json();
        setPatterns(data.patterns || []);
      }
      if (statsRes.ok) setStats(await statsRes.json());
      if (confRes.ok) {
        const data = await confRes.json();
        setConfidence(data.confidence || 0.5);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleGenerateSummary = useCallback(async () => {
    setGeneratingSummary(true);
    try {
      const res = await fetch("/api/calendar/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_summary" }),
      });
      if (res.ok) {
        const data = await res.json();
        setDigest((prev) =>
          prev ? { ...prev, oliviaSummary: data.summary } : prev
        );
      }
    } catch {
      // Silent fail
    } finally {
      setGeneratingSummary(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg bg-[var(--card-bg)]"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full max-w-full overflow-x-hidden">
      {/* Olivia Confidence Score */}
      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[var(--foreground)]">
            Olivia Confidence
          </span>
          <span className="text-xs font-medium text-brand-400">
            {Math.round(confidence * 100)}%
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-[var(--background)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${confidence * 100}%`,
              background:
                confidence > 0.7
                  ? "var(--brand-600, #C4A96A)"
                  : confidence > 0.4
                    ? "#3b82f6"
                    : "#f59e0b",
            }}
          />
        </div>
        <p className="text-[10px] text-[var(--muted)] mt-1.5">
          {confidence < 0.3
            ? "Still learning — needs more interactions"
            : confidence < 0.6
              ? "Getting better — starting to understand your patterns"
              : confidence < 0.8
                ? "Good alignment — suggestions are well-tuned"
                : "Excellent — highly personalised to your workflow"}
        </p>
      </div>

      {/* This Week Stats */}
      {digest && (
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
          <h3 className="text-xs font-semibold text-[var(--foreground)] mb-2">
            This Week
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <StatBox label="Meetings" value={digest.meetingsCount} />
            <StatBox label="Networking" value={digest.networkingCount} />
            <StatBox label="Focus Hours" value={digest.focusHours} suffix="h" />
            <StatBox
              label="Prep Done"
              value={digest.prepCompletion}
              suffix="%"
            />
          </div>

          {digest.topCategories.length > 0 && (
            <div className="mt-2">
              <p className="text-[10px] text-[var(--muted)] mb-1">
                Top Activities
              </p>
              <div className="flex flex-wrap gap-1">
                {digest.topCategories.map((cat) => (
                  <span
                    key={cat}
                    className="rounded px-1.5 py-0.5 text-[9px] font-medium border border-[var(--card-border)] text-[var(--muted)]"
                  >
                    {cat.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI Summary */}
          {digest.oliviaSummary ? (
            <div className="mt-2 rounded-md border border-violet-500/20 bg-violet-950/20 p-2">
              <p className="text-[10px] text-violet-300 leading-relaxed break-words">
                {formatSummary(digest.oliviaSummary)}
              </p>
            </div>
          ) : (
            <button
              onClick={handleGenerateSummary}
              disabled={generatingSummary}
              className="mt-2 w-full rounded-md border border-violet-500/30 bg-violet-950/20 px-2 py-1.5 text-[10px] font-medium text-violet-400 hover:bg-violet-950/40 transition-colors disabled:opacity-50"
            >
              {generatingSummary
                ? "Olivia is analysing..."
                : "Generate Week Summary"}
            </button>
          )}
        </div>
      )}

      {/* Behavior Patterns */}
      {patterns.length > 0 && (
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
          <h3 className="text-xs font-semibold text-[var(--foreground)] mb-2">
            Patterns Detected
          </h3>
          <div className="space-y-2">
            {patterns.map((pattern) => (
              <div
                key={pattern.type}
                className="rounded-md border border-[var(--card-border)] bg-[var(--background)] p-2"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-medium text-[var(--foreground)]">
                    {pattern.description}
                  </span>
                  <span className="text-[9px] text-[var(--muted)]">
                    {Math.round(pattern.confidence * 100)}%
                  </span>
                </div>
                <p className="text-[10px] text-[var(--muted)] leading-relaxed break-words">
                  {pattern.insight}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overall Stats */}
      {stats && (
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
          <h3 className="text-xs font-semibold text-[var(--foreground)] mb-2">
            60-Day Overview
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <StatBox label="Active Days" value={stats.activeDays} />
            <StatBox
              label="Avg/Day"
              value={stats.avgDailyEvents}
              suffix=" events"
            />
            <StatBox label="Accept Rate" value={Math.round(stats.acceptRate)} suffix="%" />
            <StatBox label="Data Points" value={stats.totalInteractions} />
          </div>
          {!stats.hasEnoughData && (
            <p className="text-[10px] text-amber-400 mt-2">
              Need {20 - stats.totalInteractions} more interactions for pattern
              analysis
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  suffix = "",
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-md bg-[var(--background)] p-2 text-center">
      <p className="text-sm font-semibold text-[var(--foreground)]">
        {value}
        <span className="text-[10px] text-[var(--muted)]">{suffix}</span>
      </p>
      <p className="text-[9px] text-[var(--muted)]">{label}</p>
    </div>
  );
}
