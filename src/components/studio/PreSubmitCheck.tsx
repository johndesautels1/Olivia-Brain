"use client";

/**
 * PreSubmitCheck — Pre-submission validation modal for the Preparation Studio.
 *
 * Appears when the user clicks "Submit" before Cristiano re-evaluation.
 * Shows a prioritized list of unanswered/partial questions sorted by impact,
 * with quick-jump buttons to fill them. If all clear, shows a green "All Good"
 * confirmation with a "Proceed to Re-evaluation" button.
 *
 * Design spec:
 * - Full-screen overlay, glassmorphic card, max-w-lg
 * - Two states: "issues found" (list) vs "all clear" (proceed)
 * - Issue list: impact-colored badges, question preview, "Jump" button
 * - Bottom: "Proceed Anyway" (muted) + "Fix Issues" (gold) or "Proceed" (gold)
 */

import React, { useMemo } from "react";

interface UnansweredQuestion {
  questionIndex: number;
  questionText: string;
  impactScore: number;
  status: "empty" | "partial" | "complete";
  blockType: string;
}

interface PreSubmitCheckProps {
  isOpen: boolean;
  questions: UnansweredQuestion[];
  onJumpTo: (index: number) => void;
  onProceed: () => void;
  onClose: () => void;
}

// ── Impact tier color ─────────────────────────────────────────────────

function impactColor(score: number): string {
  if (score >= 81) return "#22c55e";
  if (score >= 61) return "#3b82f6";
  if (score >= 41) return "#eab308";
  if (score >= 21) return "#f97316";
  return "#ef4444";
}

function impactLabel(score: number): string {
  if (score >= 81) return "Critical";
  if (score >= 61) return "High";
  if (score >= 41) return "Medium";
  return "Low";
}

// ── Main Component ────────────────────────────────────────────────────

export function PreSubmitCheck({
  isOpen,
  questions,
  onJumpTo,
  onProceed,
  onClose,
}: PreSubmitCheckProps) {
  // Filter to incomplete questions, sorted by impact (highest first)
  const issues = useMemo(
    () =>
      questions
        .filter((q) => q.status !== "complete")
        .sort((a, b) => b.impactScore - a.impactScore),
    [questions]
  );

  const highImpactCount = useMemo(
    () => issues.filter((q) => q.impactScore >= 70).length,
    [issues]
  );

  const allClear = issues.length === 0;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center px-4"
      style={{
        background: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Pre-submission check"
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6"
        style={{
          background: "rgba(15, 18, 25, 0.95)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 16px 48px rgba(0, 0, 0, 0.5)",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3
            className="font-semibold"
            style={{ fontSize: "18px", color: "#e2e8f0" }}
          >
            {allClear ? "Ready to Submit" : "Pre-Submit Check"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition-all cursor-pointer"
            style={{ color: "rgba(255, 255, 255, 0.3)" }}
            aria-label="Close"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {allClear ? (
          /* ── All Clear state ────────────────────────────────────────── */
          <div className="text-center py-6">
            <div
              className="flex items-center justify-center mx-auto mb-4 rounded-full"
              style={{
                width: "56px",
                height: "56px",
                background: "rgba(34, 197, 94, 0.1)",
                border: "1px solid rgba(34, 197, 94, 0.2)",
              }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#22c55e"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p
              className="font-semibold mb-2"
              style={{ fontSize: "16px", color: "#22c55e" }}
            >
              All questions answered
            </p>
            <p
              className="mb-6"
              style={{ fontSize: "13px", color: "#9AA7B2", lineHeight: 1.5 }}
            >
              Your document is complete. Cristiano will now re-evaluate your
              rankings based on your updated answers.
            </p>
            <button
              onClick={onProceed}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all cursor-pointer"
              style={{
                background: "rgba(196, 169, 106, 0.15)",
                border: "1px solid rgba(196, 169, 106, 0.3)",
                color: "#C4A96A",
                minHeight: "44px",
              }}
            >
              Proceed to Re-evaluation
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        ) : (
          /* ── Issues Found state ─────────────────────────────────────── */
          <>
            {/* Summary */}
            <div
              className="rounded-xl px-4 py-3 mb-4"
              style={{
                background: highImpactCount > 0
                  ? "rgba(234, 179, 8, 0.06)"
                  : "rgba(255, 255, 255, 0.03)",
                border: `1px solid ${
                  highImpactCount > 0
                    ? "rgba(234, 179, 8, 0.12)"
                    : "rgba(255, 255, 255, 0.06)"
                }`,
              }}
            >
              <p style={{ fontSize: "13px", color: "#e2e8f0", lineHeight: 1.5 }}>
                <strong>{issues.length}</strong> question{issues.length !== 1 ? "s" : ""}{" "}
                still incomplete
                {highImpactCount > 0 && (
                  <span style={{ color: "#eab308" }}>
                    {" "}({highImpactCount} high-impact)
                  </span>
                )}
              </p>
            </div>

            {/* Issue list */}
            <div
              className="flex-1 overflow-y-auto space-y-2 mb-4 pr-1"
              style={{ maxHeight: "300px" }}
            >
              {issues.map((q) => {
                const color = impactColor(q.impactScore);
                const label = impactLabel(q.impactScore);
                return (
                  <div
                    key={q.questionIndex}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5"
                    style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Impact badge */}
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 shrink-0"
                        style={{
                          fontSize: "10px",
                          fontWeight: 600,
                          color,
                          background: `${color}10`,
                          border: `1px solid ${color}20`,
                        }}
                      >
                        <span
                          className="rounded-full"
                          style={{ width: "5px", height: "5px", background: color }}
                        />
                        {label}
                      </span>

                      {/* Question text */}
                      <div className="min-w-0">
                        <p
                          className="truncate"
                          style={{ fontSize: "13px", color: "#e2e8f0" }}
                        >
                          Q{q.questionIndex + 1}: {q.questionText}
                        </p>
                        <p
                          style={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.25)" }}
                        >
                          {q.status === "empty" ? "Unanswered" : "Partial"}
                        </p>
                      </div>
                    </div>

                    {/* Jump button */}
                    <button
                      onClick={() => {
                        onJumpTo(q.questionIndex);
                        onClose();
                      }}
                      className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ml-2"
                      style={{
                        background: "rgba(196, 169, 106, 0.08)",
                        border: "1px solid rgba(196, 169, 106, 0.15)",
                        color: "#C4A96A",
                      }}
                    >
                      Jump
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={onProceed}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all cursor-pointer"
                style={{
                  background: "rgba(196, 169, 106, 0.12)",
                  border: "1px solid rgba(196, 169, 106, 0.25)",
                  color: "#C4A96A",
                  minHeight: "44px",
                }}
              >
                Proceed Anyway
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>

              <button
                onClick={onClose}
                className="w-full flex items-center justify-center rounded-xl py-2 text-xs transition-all cursor-pointer"
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  color: "rgba(255, 255, 255, 0.35)",
                  minHeight: "36px",
                }}
              >
                Go back and fix
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
