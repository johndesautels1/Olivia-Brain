"use client";

/**
 * StudioBottomBar — 56px sticky glassmorphic bottom bar for the Preparation Studio.
 *
 * Layout (left to right):
 * - Prev arrow (◄)
 * - Question dot scrubber (colored circles per block, click to jump)
 * - Next arrow (►)
 * - 5-color segmented progress bar with percentage
 * - Submit button (locked gray until 100%, then green+gold pulse)
 *
 * Design spec:
 * - Height: 56px
 * - Background: rgba(15, 18, 25, 0.8) with backdrop-blur(16px)
 * - Border top: 1px solid rgba(255, 255, 255, 0.06)
 * - 5-color tiers: Red #ef4444 (0-20%) | Orange #f97316 (21-40%) |
 *   Yellow #eab308 (41-60%) | Blue #3b82f6 (61-80%) | Green #22c55e (81-100%)
 * - Touch targets: minimum 44px on mobile
 * - Nav arrows: glassmorphic pill buttons
 */

import React, { useState, useRef, useCallback } from "react";

interface StudioBottomBarProps {
  totalBlocks: number;
  activeBlockIndex: number;
  blockStatuses: Array<"empty" | "partial" | "complete">;
  completionPct: number;
  tierColor: string;
  onPrev: () => void;
  onNext: () => void;
  onJumpTo: (index: number) => void;
  /** Optional question labels for hover preview on dot scrubber */
  questionLabels?: string[];
  /** Optional answer previews for enriched hover tooltips */
  answerPreviews?: string[];
  /** Optional block types for section divider markers */
  blockTypes?: string[];
  /** Current consecutive-completion streak (shown when >= 2) */
  currentStreak?: number;
  /** Elapsed session time in seconds */
  sessionElapsedSeconds?: number;
  /** Submit handler — called when 100% complete and user clicks Submit */
  onSubmit?: () => void;
  /** Handler to open "Story So Far" narrative review */
  onStoryReview?: () => void;
}

// ── Status to dot color mapping ────────────────────────────────────────

function statusToColor(status: "empty" | "partial" | "complete"): string {
  switch (status) {
    case "complete":
      return "#22c55e";
    case "partial":
      return "#f97316";
    case "empty":
    default:
      return "rgba(255, 255, 255, 0.15)";
  }
}

// ── 5-color segmented progress bar ─────────────────────────────────────

function SegmentedProgressBar({
  pct,
  tierColor,
}: {
  pct: number;
  tierColor: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {/* Progress track */}
      <div
        className="relative overflow-hidden rounded-full"
        style={{
          width: "120px",
          height: "6px",
          background: "rgba(255, 255, 255, 0.08)",
        }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Document completion: ${pct}%`}
      >
        {/* Filled portion */}
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${pct}%`,
            background: tierColor,
            transition: "width 400ms ease, background 400ms ease",
          }}
        />
      </div>

      {/* Percentage label */}
      <span
        className="font-semibold tabular-nums"
        style={{
          fontSize: "12px",
          color: tierColor,
          minWidth: "32px",
          textAlign: "right",
          transition: "color 400ms ease",
        }}
      >
        {pct}%
      </span>
    </div>
  );
}

// ── Compact time formatter for session timer ──────────────────────────

function formatElapsed(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hrs > 0) return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

// ── Main Component ─────────────────────────────────────────────────────

export function StudioBottomBar({
  totalBlocks,
  activeBlockIndex,
  blockStatuses,
  completionPct,
  tierColor,
  onPrev,
  onNext,
  onJumpTo,
  questionLabels,
  answerPreviews,
  blockTypes,
  currentStreak,
  sessionElapsedSeconds,
  onSubmit,
  onStoryReview,
}: StudioBottomBarProps) {
  const isFirst = activeBlockIndex <= 0;
  const isLast = activeBlockIndex >= totalBlocks - 1;
  const isComplete = completionPct >= 100;

  // Hover preview state for dot scrubber
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ left: number; bottom: number } | null>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);

  const handleDotHover = useCallback(
    (index: number, e: React.MouseEvent<HTMLButtonElement>) => {
      if (!questionLabels || !questionLabels[index]) {
        setHoveredIndex(index);
        setTooltipPos(null);
        return;
      }
      setHoveredIndex(index);
      const rect = e.currentTarget.getBoundingClientRect();
      const parentRect = scrubberRef.current?.getBoundingClientRect();
      if (parentRect) {
        setTooltipPos({
          left: rect.left - parentRect.left + rect.width / 2,
          bottom: parentRect.height + 8,
        });
      }
    },
    [questionLabels]
  );

  const handleDotLeave = useCallback(() => {
    setHoveredIndex(null);
    setTooltipPos(null);
  }, []);

  return (
    <footer
      className="sticky bottom-0 z-50 flex items-center justify-between px-3 sm:px-6"
      style={{
        height: "56px",
        minHeight: "56px",
        background: "rgba(15, 18, 25, 0.8)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderTop: "1px solid rgba(255, 255, 255, 0.06)",
      }}
    >
      {/* Left section: Nav arrows + dot scrubber */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* Prev arrow */}
        <button
          onClick={onPrev}
          disabled={isFirst}
          className="flex items-center justify-center rounded-full transition-all shrink-0 cursor-pointer disabled:cursor-not-allowed"
          style={{
            width: "36px",
            height: "36px",
            minWidth: "36px",
            minHeight: "44px",
            background: isFirst
              ? "rgba(255, 255, 255, 0.03)"
              : "rgba(255, 255, 255, 0.06)",
            border: `1px solid ${
              isFirst ? "rgba(255, 255, 255, 0.04)" : "rgba(255, 255, 255, 0.08)"
            }`,
            color: isFirst ? "rgba(255, 255, 255, 0.2)" : "#9AA7B2",
          }}
          aria-label="Previous question"
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
        </button>

        {/* Question dot scrubber — scrollable on mobile, with hover previews */}
        <div
          ref={scrubberRef}
          className="relative flex items-center gap-1 overflow-x-auto flex-1 min-w-0 py-1 px-1"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
          role="tablist"
          aria-label="Question navigation"
        >
          <style
            dangerouslySetInnerHTML={{
              __html: `
                .studio-dot-scrubber::-webkit-scrollbar {
                  display: none;
                }
              `,
            }}
          />

          {/* Hover preview tooltip — enriched with answer preview */}
          {hoveredIndex !== null && tooltipPos && questionLabels?.[hoveredIndex] && (
            <div
              className="absolute z-50 pointer-events-none rounded-xl px-3 py-2"
              style={{
                left: `${tooltipPos.left}px`,
                bottom: `${tooltipPos.bottom}px`,
                transform: "translateX(-50%)",
                background: "rgba(15, 18, 25, 0.95)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
                maxWidth: "260px",
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className="rounded-full"
                  style={{
                    width: "6px",
                    height: "6px",
                    background: statusToColor(blockStatuses[hoveredIndex] || "empty"),
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: "11px",
                    color: statusToColor(blockStatuses[hoveredIndex] || "empty"),
                    fontWeight: 600,
                  }}
                >
                  Q{hoveredIndex + 1}
                </span>
                {blockTypes?.[hoveredIndex] && (
                  <span
                    style={{
                      fontSize: "9px",
                      color: "rgba(255, 255, 255, 0.2)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {blockTypes[hoveredIndex].replace(/_/g, " ")}
                  </span>
                )}
              </div>
              <p
                style={{
                  fontSize: "11px",
                  color: "#e2e8f0",
                  lineHeight: 1.3,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {questionLabels[hoveredIndex].length > 40
                  ? questionLabels[hoveredIndex].slice(0, 40) + "..."
                  : questionLabels[hoveredIndex]}
              </p>
              {answerPreviews?.[hoveredIndex] && (
                <p
                  style={{
                    fontSize: "10px",
                    color: "#9AA7B2",
                    lineHeight: 1.3,
                    marginTop: "3px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    fontStyle: blockStatuses[hoveredIndex] === "empty" ? "italic" : "normal",
                  }}
                >
                  {answerPreviews[hoveredIndex]}
                </p>
              )}
            </div>
          )}

          <div className="studio-dot-scrubber flex items-center gap-1 overflow-x-auto flex-1 min-w-0">
            {blockStatuses.map((status, index) => {
              const isActive = index === activeBlockIndex;
              const isHovered = index === hoveredIndex;
              const dotColor = statusToColor(status);

              // Section divider: insert a thin separator when block type changes
              const showDivider =
                blockTypes &&
                index > 0 &&
                blockTypes[index] !== blockTypes[index - 1];

              return (
                <React.Fragment key={index}>
                  {showDivider && (
                    <span
                      className="shrink-0"
                      style={{
                        width: "1px",
                        height: "16px",
                        background: "rgba(255, 255, 255, 0.08)",
                        margin: "0 2px",
                      }}
                      aria-hidden="true"
                    />
                  )}
                  <button
                    onClick={() => onJumpTo(index)}
                    onMouseEnter={(e) => handleDotHover(index, e)}
                    onMouseLeave={handleDotLeave}
                    className="shrink-0 rounded-full transition-all cursor-pointer"
                    style={{
                      width: isActive ? "12px" : isHovered ? "10px" : "8px",
                      height: isActive ? "12px" : isHovered ? "10px" : "8px",
                      minWidth: isActive ? "12px" : isHovered ? "10px" : "8px",
                      minHeight: "44px",
                      background: dotColor,
                      boxShadow: isActive
                        ? `0 0 8px ${dotColor}, 0 0 2px ${dotColor}`
                        : isHovered
                          ? `0 0 6px ${dotColor}`
                          : "none",
                      border: isActive
                        ? `2px solid ${dotColor}`
                        : isHovered
                          ? `1px solid ${dotColor}`
                          : "1px solid transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0,
                      transition: "width 150ms ease, height 150ms ease, box-shadow 150ms ease",
                    }}
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`Question ${index + 1} of ${totalBlocks}: ${status}${questionLabels?.[index] ? ` — ${questionLabels[index]}` : ""}`}
                    title={questionLabels?.[index]
                      ? `Q${index + 1} — ${questionLabels[index]} (${status})`
                      : `Q${index + 1} — ${status}`}
                  />
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Next arrow */}
        <button
          onClick={onNext}
          disabled={isLast}
          className="flex items-center justify-center rounded-full transition-all shrink-0 cursor-pointer disabled:cursor-not-allowed"
          style={{
            width: "36px",
            height: "36px",
            minWidth: "36px",
            minHeight: "44px",
            background: isLast
              ? "rgba(255, 255, 255, 0.03)"
              : "rgba(255, 255, 255, 0.06)",
            border: `1px solid ${
              isLast ? "rgba(255, 255, 255, 0.04)" : "rgba(255, 255, 255, 0.08)"
            }`,
            color: isLast ? "rgba(255, 255, 255, 0.2)" : "#9AA7B2",
          }}
          aria-label="Next question"
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
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Center / right section: Progress bar + Submit */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0 ml-3">
        {/* 5-color segmented progress */}
        <div className="hidden sm:flex">
          <SegmentedProgressBar pct={completionPct} tierColor={tierColor} />
        </div>

        {/* Mobile: just show percentage */}
        <span
          className="sm:hidden font-semibold tabular-nums"
          style={{
            fontSize: "12px",
            color: tierColor,
          }}
        >
          {completionPct}%
        </span>

        {/* "Story So Far" button — opens narrative review */}
        {onStoryReview && (
          <button
            onClick={onStoryReview}
            className="hidden sm:flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer"
            style={{
              background: "rgba(196, 169, 106, 0.06)",
              border: "1px solid rgba(196, 169, 106, 0.1)",
              color: "#C4A96A",
              minHeight: "30px",
            }}
            title="Review your answers as a narrative"
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
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            Story
          </button>
        )}

        {/* Streak counter — visible when streak >= 2 */}
        {currentStreak != null && currentStreak >= 2 && (
          <div
            className="hidden sm:flex items-center gap-1 rounded-full px-2 py-0.5"
            style={{
              background:
                currentStreak >= 10
                  ? "rgba(234, 179, 8, 0.12)"
                  : "rgba(196, 169, 106, 0.08)",
              border: `1px solid ${
                currentStreak >= 10
                  ? "rgba(234, 179, 8, 0.2)"
                  : "rgba(196, 169, 106, 0.12)"
              }`,
            }}
            title={`${currentStreak} questions completed in a row`}
          >
            <span
              style={{
                fontSize: "11px",
                color: currentStreak >= 10 ? "#eab308" : "#C4A96A",
              }}
            >
              {currentStreak >= 10 ? "🔥" : "⚡"}
            </span>
            <span
              className="font-semibold tabular-nums"
              style={{
                fontSize: "11px",
                color: currentStreak >= 10 ? "#eab308" : "#C4A96A",
              }}
            >
              {currentStreak}
            </span>
          </div>
        )}

        {/* Session timer */}
        {sessionElapsedSeconds != null && (
          <span
            className="hidden sm:inline tabular-nums"
            style={{
              fontSize: "11px",
              color: "rgba(255, 255, 255, 0.25)",
              fontFamily: "monospace",
              letterSpacing: "0.02em",
            }}
            title="Session elapsed time"
          >
            {formatElapsed(sessionElapsedSeconds)}
          </span>
        )}

        {/* Submit button — locked gray until 100%, then gold pulsing */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @keyframes studio-submit-pulse {
                0%, 100% { box-shadow: 0 0 8px rgba(196, 169, 106, 0.15); }
                50% { box-shadow: 0 0 18px rgba(196, 169, 106, 0.35), 0 0 6px rgba(196, 169, 106, 0.2); }
              }
            `,
          }}
        />
        <button
          disabled={!isComplete}
          onClick={isComplete ? onSubmit : undefined}
          className="flex items-center gap-1.5 rounded-lg px-3 sm:px-4 py-1.5 text-sm font-medium transition-all cursor-pointer disabled:cursor-not-allowed"
          style={{
            minHeight: "36px",
            minWidth: "44px",
            background: isComplete
              ? "rgba(196, 169, 106, 0.12)"
              : "rgba(255, 255, 255, 0.04)",
            border: `1px solid ${
              isComplete ? "rgba(196, 169, 106, 0.3)" : "rgba(255, 255, 255, 0.06)"
            }`,
            color: isComplete ? "#C4A96A" : "rgba(255, 255, 255, 0.25)",
            ...(isComplete
              ? {
                  animation: "studio-submit-pulse 2s ease-in-out infinite",
                }
              : {}),
          }}
          aria-label={isComplete ? "Submit document for re-evaluation" : "Complete all questions to submit"}
          title={isComplete ? "Submit for Cristiano re-evaluation" : `${completionPct}% complete — fill all questions to submit`}
        >
          {/* Lock / rocket icon */}
          {isComplete ? (
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
              <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
              <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
              <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
              <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
            </svg>
          ) : (
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
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          )}
          <span className="hidden sm:inline">
            {isComplete ? "Submit" : "Submit"}
          </span>
        </button>
      </div>
    </footer>
  );
}
