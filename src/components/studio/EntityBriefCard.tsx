"use client";

/**
 * EntityBriefCard — 3-line Cristiano briefing card for the target entity.
 *
 * Displays a compact, glassmorphic card below the question area showing:
 * 1. Entity name + type + match score
 * 2. Cristiano's rationale summary (why this entity is a match)
 * 3. Key strength and primary concern
 *
 * Collapsible — defaults to collapsed with a one-line summary,
 * click to expand the full 3-line briefing.
 *
 * Design spec:
 * - Background: rgba(15, 18, 25, 0.6) with backdrop-blur(12px)
 * - Border: 1px solid entity mode color at 15% opacity
 * - Left accent: 3px bar in entity mode color
 * - Text primary: #e2e8f0
 * - Text muted: #9AA7B2
 * - Micro label: 10px uppercase
 */

import React, { useState } from "react";
import { getEntityMode, type EntityType } from "@/lib/studio/entityModes";

interface EntityBriefCardProps {
  /** Entity name, e.g. "Sequoia Capital" */
  entityName: string;
  /** Entity type */
  entityType: EntityType;
  /** Cristiano match score 0-100 */
  matchScore: number | null;
  /** One-sentence rationale from Cristiano */
  rationale: string;
  /** Key strength identified by Cristiano */
  strength: string;
  /** Primary concern identified by Cristiano */
  concern: string;
  /** Optional: entity logo URL */
  logoUrl?: string | null;
  /** Callback when "See through their eyes" is clicked */
  onPerspectiveClick?: () => void;
}

// ── Tier color from score ───────────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score <= 20) return "#ef4444";
  if (score <= 40) return "#f97316";
  if (score <= 60) return "#eab308";
  if (score <= 80) return "#3b82f6";
  return "#22c55e";
}

// ── Main Component ──────────────────────────────────────────────────────

export function EntityBriefCard({
  entityName,
  entityType,
  matchScore,
  rationale,
  strength,
  concern,
  logoUrl,
  onPerspectiveClick,
}: EntityBriefCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const mode = getEntityMode(entityType);
  const scoreColor = matchScore != null ? getScoreColor(matchScore) : mode.color;

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{
        background: "rgba(15, 18, 25, 0.6)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: `1px solid ${mode.color}26`,
      }}
    >
      {/* Left accent bar + content */}
      <div className="flex">
        {/* Left accent */}
        <div
          className="shrink-0"
          style={{ width: 3, background: mode.color }}
        />

        <div className="flex-1 px-4 py-3">
          {/* Header row — always visible */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between gap-3 cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Logo or dot */}
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt=""
                  className="rounded-full object-cover shrink-0"
                  style={{ width: 20, height: 20 }}
                />
              ) : (
                <div
                  className="rounded-full shrink-0"
                  style={{
                    width: 8,
                    height: 8,
                    background: mode.color,
                  }}
                />
              )}

              {/* Micro label */}
              <span
                className="uppercase tracking-wide shrink-0"
                style={{
                  fontSize: "10px",
                  color: mode.color,
                  letterSpacing: "0.06em",
                }}
              >
                Cristiano Brief
              </span>

              {/* Entity name */}
              <span
                className="truncate"
                style={{ fontSize: "13px", color: "#e2e8f0" }}
              >
                {entityName}
              </span>

              {/* Match score pill */}
              {matchScore != null && (
                <span
                  className="shrink-0 rounded-full px-1.5 py-0.5"
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    color: scoreColor,
                    background: `${scoreColor}18`,
                  }}
                >
                  {matchScore}%
                </span>
              )}
            </div>

            {/* Expand/collapse chevron */}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9AA7B2"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 transition-transform"
              style={{
                transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 200ms ease",
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Expanded content — 3-line briefing */}
          {isExpanded && (
            <div
              className="mt-3 space-y-2.5"
              style={{
                animation: "fadeIn 200ms ease-out",
              }}
            >
              {/* Line 1: Rationale */}
              <div>
                <span
                  className="uppercase tracking-wide block mb-0.5"
                  style={{
                    fontSize: "9px",
                    color: "#9AA7B2",
                    letterSpacing: "0.08em",
                  }}
                >
                  Why this match
                </span>
                <p style={{ fontSize: "13px", color: "#e2e8f0", lineHeight: 1.5, margin: 0 }}>
                  {rationale}
                </p>
              </div>

              {/* Line 2: Strength */}
              <div className="flex items-start gap-2">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0 mt-0.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <p style={{ fontSize: "12px", color: "#9AA7B2", lineHeight: 1.5, margin: 0 }}>
                  <span style={{ color: "#22c55e", fontWeight: 500 }}>Strength: </span>
                  {strength}
                </p>
              </div>

              {/* Line 3: Concern */}
              <div className="flex items-start gap-2">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0 mt-0.5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p style={{ fontSize: "12px", color: "#9AA7B2", lineHeight: 1.5, margin: 0 }}>
                  <span style={{ color: "#f97316", fontWeight: 500 }}>Concern: </span>
                  {concern}
                </p>
              </div>

              {/* "See through their eyes" link */}
              {onPerspectiveClick && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPerspectiveClick();
                  }}
                  className="flex items-center gap-1.5 mt-1 cursor-pointer"
                  style={{
                    fontSize: "11px",
                    color: mode.color,
                    background: "none",
                    border: "none",
                    padding: 0,
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  See through their eyes
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Inline keyframe for fade-in */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
