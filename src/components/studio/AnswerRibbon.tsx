"use client";

/**
 * AnswerRibbon — Left-edge 40px answer tile strip for the Preparation Studio.
 *
 * Shows a vertical ribbon of small square tiles (one per question) along the
 * left edge of the viewport. Each tile reflects the question's status color.
 * Completed tiles show a truncated preview on hover. Clicking any tile jumps
 * to that question.
 *
 * Layout:
 * - Fixed left edge, vertically centered
 * - 40px wide, glassmorphic background
 * - One 28px tile per question, colored by status
 * - Active tile has a gold left border accent
 * - Hover reveals a 220px tooltip with question text + answer preview
 *
 * Design spec:
 * - Background: rgba(15, 18, 25, 0.6) with backdrop-blur(12px)
 * - Tile colors: green (#22c55e) complete, orange (#f97316) partial, dim empty
 * - Active indicator: 2px gold (#C4A96A) left border
 * - Hover tooltip: glassmorphic, max 220px, answer preview truncated to 80 chars
 * - Hidden on mobile (< 768px) — bottom bar handles nav there
 */

import React, { useState, useRef, useCallback } from "react";
import type { QuestionState } from "@/lib/studio/types";

interface AnswerRibbonProps {
  questions: QuestionState[];
  activeIndex: number;
  onJumpTo: (index: number) => void;
}

// ── Status to tile color ─────────────────────────────────────────────

function tileColor(status: "empty" | "partial" | "complete"): string {
  switch (status) {
    case "complete":
      return "#22c55e";
    case "partial":
      return "#f97316";
    case "empty":
    default:
      return "rgba(255, 255, 255, 0.08)";
  }
}

function tileBorderColor(status: "empty" | "partial" | "complete"): string {
  switch (status) {
    case "complete":
      return "rgba(34, 197, 94, 0.3)";
    case "partial":
      return "rgba(249, 115, 22, 0.3)";
    case "empty":
    default:
      return "rgba(255, 255, 255, 0.04)";
  }
}

// ── Truncate answer for preview ──────────────────────────────────────

function truncateAnswer(value: unknown, maxLen = 80): string {
  if (!value) return "No answer yet";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "No answer yet";
    return trimmed.length > maxLen ? trimmed.slice(0, maxLen) + "..." : trimmed;
  }
  if (Array.isArray(value)) {
    const items = value.filter((v) => typeof v === "string" && v.trim());
    if (items.length === 0) return "No answer yet";
    return items.slice(0, 3).join(", ") + (items.length > 3 ? "..." : "");
  }
  return "No answer yet";
}

// ── Main Component ───────────────────────────────────────────────────

export function AnswerRibbon({ questions, activeIndex, onJumpTo }: AnswerRibbonProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number } | null>(null);
  const ribbonRef = useRef<HTMLDivElement>(null);

  const handleTileHover = useCallback(
    (index: number, e: React.MouseEvent<HTMLButtonElement>) => {
      setHoveredIndex(index);
      const rect = e.currentTarget.getBoundingClientRect();
      const ribbonRect = ribbonRef.current?.getBoundingClientRect();
      if (ribbonRect) {
        setTooltipPos({
          top: rect.top - ribbonRect.top + rect.height / 2,
        });
      }
    },
    []
  );

  const handleTileLeave = useCallback(() => {
    setHoveredIndex(null);
    setTooltipPos(null);
  }, []);

  if (questions.length === 0) return null;

  const hoveredQuestion = hoveredIndex !== null ? questions[hoveredIndex] : null;

  return (
    <div
      ref={ribbonRef}
      className="fixed left-0 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col items-center py-3 px-1.5 gap-1"
      style={{
        width: "40px",
        background: "rgba(15, 18, 25, 0.6)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRight: "1px solid rgba(255, 255, 255, 0.04)",
        borderTopRightRadius: "12px",
        borderBottomRightRadius: "12px",
        maxHeight: "calc(100vh - 160px)",
        overflowY: "auto",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
      aria-label="Answer ribbon navigation"
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .answer-ribbon-scroll::-webkit-scrollbar { display: none; }
          `,
        }}
      />

      {/* Hover tooltip — positioned to the right of the ribbon */}
      {hoveredIndex !== null && tooltipPos && hoveredQuestion && (
        <div
          className="absolute z-50 pointer-events-none rounded-xl px-3 py-2.5"
          style={{
            left: "46px",
            top: `${tooltipPos.top}px`,
            transform: "translateY(-50%)",
            width: "220px",
            background: "rgba(15, 18, 25, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
          }}
        >
          {/* Question number + status */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <span
              className="rounded-full"
              style={{
                width: "6px",
                height: "6px",
                background: tileColor(hoveredQuestion.status),
                flexShrink: 0,
              }}
            />
            <span
              className="uppercase tracking-wide font-semibold"
              style={{
                fontSize: "10px",
                color: tileColor(hoveredQuestion.status),
                letterSpacing: "0.06em",
              }}
            >
              Q{hoveredIndex + 1}
            </span>
            <span
              style={{
                fontSize: "10px",
                color: "rgba(255, 255, 255, 0.2)",
              }}
            >
              {hoveredQuestion.status}
            </span>
          </div>

          {/* Question text */}
          <p
            style={{
              fontSize: "11px",
              color: "#e2e8f0",
              lineHeight: 1.4,
              marginBottom: "4px",
            }}
          >
            {hoveredQuestion.questionText.length > 60
              ? hoveredQuestion.questionText.slice(0, 60) + "..."
              : hoveredQuestion.questionText}
          </p>

          {/* Answer preview */}
          <p
            style={{
              fontSize: "10px",
              color: "#9AA7B2",
              lineHeight: 1.4,
              fontStyle:
                hoveredQuestion.status === "empty" ? "italic" : "normal",
            }}
          >
            {truncateAnswer(hoveredQuestion.currentValue)}
          </p>
        </div>
      )}

      {/* Question tiles */}
      {questions.map((q, index) => {
        const isActive = index === activeIndex;
        const isHovered = index === hoveredIndex;
        const color = tileColor(q.status);

        return (
          <button
            key={index}
            onClick={() => onJumpTo(index)}
            onMouseEnter={(e) => handleTileHover(index, e)}
            onMouseLeave={handleTileLeave}
            className="shrink-0 rounded transition-all cursor-pointer relative"
            style={{
              width: "28px",
              height: "28px",
              minHeight: "28px",
              background: isActive
                ? `${color}18`
                : isHovered
                  ? `${color}10`
                  : "rgba(255, 255, 255, 0.02)",
              border: `1px solid ${
                isActive
                  ? tileBorderColor(q.status)
                  : isHovered
                    ? "rgba(255, 255, 255, 0.08)"
                    : "rgba(255, 255, 255, 0.03)"
              }`,
              transition: "background 150ms ease, border 150ms ease",
            }}
            aria-label={`Jump to question ${index + 1}: ${q.questionText} (${q.status})`}
            title={`Q${index + 1}`}
          >
            {/* Active gold left accent */}
            {isActive && (
              <span
                className="absolute left-0 top-1 bottom-1 rounded-full"
                style={{
                  width: "2px",
                  background: "#C4A96A",
                }}
              />
            )}

            {/* Inner status dot */}
            <span
              className="rounded-full"
              style={{
                width: isActive ? "8px" : "6px",
                height: isActive ? "8px" : "6px",
                background: color,
                display: "block",
                margin: "auto",
                boxShadow: isActive ? `0 0 6px ${color}` : "none",
                transition: "width 150ms ease, height 150ms ease",
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
