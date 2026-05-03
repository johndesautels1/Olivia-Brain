"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ConfirmationChip } from "./ConfirmationChip";

interface Recommendation {
  id: string;
  type: string;
  urgency: string;
  status: string;
  message: string;
  reasoningJson: Record<string, unknown> | null;
  triggerType: string | null;
  triggerDescription: string | null;
  eventDraftJson: Record<string, unknown> | null;
  confidenceScore: number | null;
  createdAt: string;
}

interface OliviaPanelProps {
  onAcceptSuggestion?: (recommendation: Recommendation) => void;
  onRefresh?: () => void;
  compact?: boolean;
}

export function OliviaPanel({ onAcceptSuggestion, onRefresh, compact }: OliviaPanelProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Timeout refs for cleanup
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const acceptTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeouts on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      if (acceptTimeoutRef.current) clearTimeout(acceptTimeoutRef.current);
    };
  }, []);

  const fetchRecommendations = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar/olivia?action=recommendations");
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data.recommendations || []);
      }
    } catch {
      // Fetch recommendations is non-critical — fail silently on load
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleGenerateSuggestions = useCallback(async () => {
    setGenerating(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/calendar/olivia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_suggestions" }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        const detail = errBody?.error || `Server error (${res.status})`;
        setStatusMessage({ text: detail, type: "error" });
        return;
      }
      const data = await res.json();
      await fetchRecommendations();
      const count = data.generated || 0;
      setStatusMessage({
        text: count > 0 ? `Generated ${count} suggestion${count > 1 ? "s" : ""}` : "No new suggestions at this time",
        type: count > 0 ? "success" : "error",
      });
    } catch {
      setStatusMessage({ text: "Could not reach Olivia. Check your connection.", type: "error" });
    } finally {
      setGenerating(false);
      // Auto-clear status after 6 seconds
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = setTimeout(() => setStatusMessage(null), 6000);
    }
  }, [fetchRecommendations]);

  const handleDismiss = useCallback(
    async (id: string) => {
      try {
        await fetch("/api/calendar/olivia", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "dismiss", recommendationId: id }),
        });
        setRecommendations((prev) => prev.filter((r) => r.id !== id));
        onRefresh?.();
      } catch {
        setStatusMessage({ text: "Failed to dismiss", type: "error" });
        if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
        statusTimeoutRef.current = setTimeout(() => setStatusMessage(null), 4000);
      }
    },
    [onRefresh]
  );

  const handleConfirmAccept = useCallback(
    (rec: Recommendation) => {
      setAcceptingId(rec.id);
      onAcceptSuggestion?.(rec);
      // Remove from list after a brief delay so user sees the processing state
      if (acceptTimeoutRef.current) clearTimeout(acceptTimeoutRef.current);
      acceptTimeoutRef.current = setTimeout(() => {
        setRecommendations((prev) => prev.filter((r) => r.id !== rec.id));
        setAcceptingId(null);
      }, 800);
    },
    [onAcceptSuggestion]
  );

  const urgencyColors: Record<string, string> = {
    immediate: "text-red-400 border-red-500/30 bg-red-950/30",
    today: "text-amber-400 border-amber-500/30 bg-amber-950/30",
    this_week: "text-blue-400 border-blue-500/30 bg-blue-950/30",
    when_relevant: "text-slate-400 border-slate-500/30 bg-slate-800/30",
  };

  return (
    <div
      className={compact ? "space-y-2 w-full max-w-full overflow-x-hidden" : "rounded-xl border p-4 w-full max-w-full overflow-x-hidden"}
      style={compact ? undefined : {
        background: "rgba(10, 14, 26, 0.85)",
        borderColor: "rgba(196, 169, 106, 0.12)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--foreground)]">
            Olivia
          </span>
          <span className="rounded-full bg-violet-950 px-2 py-0.5 text-[10px] text-violet-400 border border-violet-800/40">
            AI
          </span>
        </div>
        <button
          onClick={handleGenerateSuggestions}
          disabled={generating}
          className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-2.5 py-1 text-[10px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--muted)] transition-colors disabled:opacity-50"
        >
          {generating ? "Thinking..." : "Generate"}
        </button>
      </div>

      {statusMessage && (
        <div
          className={`mb-3 rounded-md px-3 py-2 text-xs ${
            statusMessage.type === "error"
              ? "bg-red-950/40 border border-red-800/30 text-red-400"
              : "bg-emerald-950/40 border border-emerald-800/30 text-emerald-400"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg bg-[var(--card-bg)]"
            />
          ))}
        </div>
      ) : recommendations.length === 0 ? (
        <p className="text-xs text-[var(--muted)] py-4 text-center">
          No suggestions yet. Click Generate to get personalised recommendations.
        </p>
      ) : (
        <div className="space-y-2">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                    urgencyColors[rec.urgency] || urgencyColors.when_relevant
                  }`}
                >
                  {rec.urgency.replace("_", " ")}
                </span>
                {rec.confidenceScore && (
                  <span className="text-[10px] text-[var(--muted)]">
                    {Math.round(rec.confidenceScore * 100)}%
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--foreground)] leading-relaxed mb-2 break-words overflow-wrap-anywhere">
                {rec.message}
              </p>
              {rec.triggerDescription && (
                <p className="text-[10px] text-[var(--muted)] mb-2 italic break-words">
                  {rec.triggerDescription}
                </p>
              )}
              <div className="flex gap-1.5">
                {rec.eventDraftJson && (
                  <ConfirmationChip
                    triggerLabel="Add to Calendar"
                    confirmLabel="Yes, add"
                    cancelLabel="Cancel"
                    onConfirm={() => handleConfirmAccept(rec)}
                    processing={acceptingId === rec.id}
                    processingLabel="Adding..."
                    timeoutMs={5000}
                  />
                )}
                <button
                  onClick={() => handleDismiss(rec.id)}
                  className="rounded px-2 py-1 text-[10px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
