"use client";

/**
 * SkipNudgeModal — Loss aversion nudge for the Preparation Studio.
 *
 * Appears when the user tries to skip a high-impact question (impactScore >= 70).
 * Shows the impact score, warns about potential match reduction, and offers
 * three choices: go back and answer, skip anyway, or use voice/research to help.
 *
 * Design spec:
 * - Overlay: rgba(0, 0, 0, 0.6) backdrop
 * - Card: glassmorphic, max-w-md, centered
 * - Impact score shown as colored badge (5-color tier)
 * - Warning text in amber/orange tone
 * - "Skip anyway" is deliberately understated (muted, smaller)
 * - "Go back" is primary action (gold)
 */

import React from "react";

interface SkipNudgeModalProps {
  isOpen: boolean;
  questionText: string;
  impactScore: number;
  onGoBack: () => void;
  onSkipAnyway: () => void;
  onResearch: () => void;
}

// ── Impact score to tier color ────────────────────────────────────────

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

export function SkipNudgeModal({
  isOpen,
  questionText,
  impactScore,
  onGoBack,
  onSkipAnyway,
  onResearch,
}: SkipNudgeModalProps) {
  if (!isOpen) return null;

  const color = impactColor(impactScore);
  const label = impactLabel(impactScore);

  // Estimated match reduction (rough heuristic: higher impact = bigger penalty)
  const matchReduction = Math.round(impactScore * 0.15);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      style={{ background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(4px)" }}
      onClick={onGoBack}
      role="dialog"
      aria-modal="true"
      aria-label="Skip question warning"
    >
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{
          background: "rgba(15, 18, 25, 0.95)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 16px 48px rgba(0, 0, 0, 0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warning icon */}
        <div className="flex justify-center mb-4">
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: "48px",
              height: "48px",
              background: "rgba(234, 179, 8, 0.1)",
              border: "1px solid rgba(234, 179, 8, 0.2)",
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#eab308"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h3
          className="text-center font-semibold mb-2"
          style={{ fontSize: "18px", color: "#e2e8f0" }}
        >
          Skip this question?
        </h3>

        {/* Impact badge */}
        <div className="flex justify-center mb-3">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1"
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color,
              background: `${color}15`,
              border: `1px solid ${color}30`,
            }}
          >
            <span
              className="rounded-full"
              style={{ width: "6px", height: "6px", background: color }}
            />
            {label} impact — {impactScore}/100
          </span>
        </div>

        {/* Question preview */}
        <p
          className="text-center mb-3 px-2"
          style={{
            fontSize: "13px",
            color: "#9AA7B2",
            lineHeight: 1.5,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          &ldquo;{questionText}&rdquo;
        </p>

        {/* Warning message */}
        <p
          className="text-center mb-5"
          style={{
            fontSize: "13px",
            color: "#eab308",
            lineHeight: 1.5,
          }}
        >
          Skipping may reduce your match score by up to {matchReduction}%.
          Investors weigh this field heavily.
        </p>

        {/* Actions */}
        <div className="space-y-2">
          {/* Primary: Go back */}
          <button
            onClick={onGoBack}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all cursor-pointer"
            style={{
              background: "rgba(196, 169, 106, 0.12)",
              border: "1px solid rgba(196, 169, 106, 0.25)",
              color: "#C4A96A",
              minHeight: "44px",
            }}
          >
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
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Go back and answer
          </button>

          {/* Secondary: Use research */}
          <button
            onClick={onResearch}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all cursor-pointer"
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "#9AA7B2",
              minHeight: "44px",
            }}
          >
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
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Help me research this
          </button>

          {/* Tertiary: Skip anyway (deliberately understated) */}
          <button
            onClick={onSkipAnyway}
            className="w-full flex items-center justify-center rounded-xl py-2 text-xs transition-all cursor-pointer"
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(255, 255, 255, 0.25)",
              minHeight: "36px",
            }}
          >
            Skip anyway
          </button>
        </div>
      </div>
    </div>
  );
}
