"use client";

import { useState, useCallback } from "react";

interface PrepTask {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueAt: string | null;
  dueOffsetHours: number | null;
  completedAt: string | null;
}

interface PrepTaskListProps {
  tasks: PrepTask[];
  calendarEntryId: string;
  entryTitle: string;
  onUpdate: () => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: "text-red-400 border-red-500/30 bg-red-950/30",
  high: "text-amber-400 border-amber-500/30 bg-amber-950/30",
  medium: "text-blue-400 border-blue-500/30 bg-blue-950/30",
  low: "text-slate-400 border-slate-500/30 bg-slate-800/30",
};

export function PrepTaskList({
  tasks,
  calendarEntryId,
  entryTitle,
  onUpdate,
}: PrepTaskListProps) {
  const [generating, setGenerating] = useState(false);
  const [localTasks, setLocalTasks] = useState(tasks);

  const handleStatusToggle = useCallback(
    async (taskId: string, currentStatus: string) => {
      const newStatus =
        currentStatus === "completed" ? "pending" : "completed";

      try {
        const res = await fetch("/api/calendar/prep-tasks", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId, status: newStatus }),
        });

        if (res.ok) {
          setLocalTasks((prev) =>
            prev.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    status: newStatus,
                    completedAt:
                      newStatus === "completed"
                        ? new Date().toISOString()
                        : null,
                  }
                : t
            )
          );
          onUpdate();
        }
      } catch {
        // Silent fail
      }
    },
    [onUpdate]
  );

  const handleGeneratePrep = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/calendar/prep-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          calendarEntryId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setLocalTasks(data.tasks || []);
        onUpdate();
      }
    } catch {
      // Silent fail
    } finally {
      setGenerating(false);
    }
  }, [calendarEntryId, onUpdate]);

  const completedCount = localTasks.filter(
    (t) => t.status === "completed"
  ).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-[var(--foreground)]">
            Prep Tasks
          </h3>
          <span className="text-[10px] text-[var(--muted)]">
            {completedCount}/{localTasks.length}
          </span>
        </div>
        {localTasks.length === 0 && (
          <button
            onClick={handleGeneratePrep}
            disabled={generating}
            className="rounded-md bg-violet-600 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-violet-700 transition-colors disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate with Olivia"}
          </button>
        )}
      </div>

      {/* Progress bar */}
      {localTasks.length > 0 && (
        <div className="h-1.5 w-full rounded-full bg-[var(--card-bg)] overflow-hidden">
          <div
            className="h-full rounded-full bg-brand-600 transition-all duration-300"
            style={{
              width: `${localTasks.length > 0 ? (completedCount / localTasks.length) * 100 : 0}%`,
            }}
          />
        </div>
      )}

      {/* Task list */}
      <div className="space-y-1.5">
        {localTasks.map((task) => (
          <div
            key={task.id}
            className={`flex items-start gap-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-2.5 transition-opacity ${
              task.status === "completed" ? "opacity-60" : ""
            }`}
          >
            <button
              onClick={() => handleStatusToggle(task.id, task.status)}
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                task.status === "completed"
                  ? "border-brand-500 bg-brand-600"
                  : "border-[var(--card-border)] hover:border-[var(--muted)]"
              }`}
            >
              {task.status === "completed" && (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-xs font-medium ${
                    task.status === "completed"
                      ? "line-through text-[var(--muted)]"
                      : "text-[var(--foreground)]"
                  }`}
                >
                  {task.title}
                </span>
                <span
                  className={`rounded px-1 py-0.5 text-[9px] font-medium border ${
                    PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium
                  }`}
                >
                  {task.priority}
                </span>
              </div>
              {task.description && (
                <p className="text-[10px] text-[var(--muted)] mt-0.5 leading-relaxed">
                  {task.description}
                </p>
              )}
              {task.dueAt && task.status !== "completed" && (
                <p className="text-[10px] text-[var(--muted)] mt-0.5">
                  Due: {new Date(task.dueAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
