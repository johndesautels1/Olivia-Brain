"use client";

/**
 * SuggestionChips — Bayesian suggestion chips for the Preparation Studio.
 *
 * Renders auto-fill suggestions above the answer input with:
 * - 5-color confidence dot (red <20%, orange <40%, yellow <60%, blue <80%, green >=80%)
 * - Suggestion text (truncated to ~60 chars with full text on hover)
 * - "Olivia Knows" source chip: "from DNA P3" / "from DCF" / "from Entity thesis"
 *   Click source chip → shows source detail card
 * - Accept button (checkmark) → inserts suggestion as answer
 * - Reject button (x) → dims chip, updates prior weights
 *
 * Accepts an array of Suggestion objects from the QuestionState.
 *
 * Design spec:
 * - Chip background: rgba(255, 255, 255, 0.03) with subtle border
 * - Confidence dot: 8px circle, 5-color tier
 * - Source chip: smaller pill inside the chip, origin-colored
 * - Accept: gold checkmark on hover
 * - Reject: dim red x on hover
 * - Accepted chip: gold border glow, then fades out
 * - Rejected chip: 200ms fade to 0.3 opacity
 * - Source detail card: glassmorphic popover on source chip click
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import type { Suggestion, SuggestionSource } from "@/lib/studio/types";

// ── Props ────────────────────────────────────────────────────────────

interface SuggestionChipsProps {
  suggestions: Suggestion[];
  /** Called when user accepts a suggestion — value should fill the answer */
  onAccept: (suggestion: Suggestion, index: number) => void;
  /** Called when user rejects a suggestion — prior weight should decrease */
  onReject: (suggestion: Suggestion, index: number) => void;
  /** DNA paragraphs for source detail cards */
  dnaParagraphs?: Record<string, string>;
}

// ── Confidence dot color (5-color tier) ──────────────────────────────

function confidenceColor(confidence: number): string {
  if (confidence <= 20) return "#ef4444";
  if (confidence <= 40) return "#f97316";
  if (confidence <= 60) return "#eab308";
  if (confidence <= 80) return "#3b82f6";
  return "#22c55e";
}

function confidenceLabel(confidence: number): string {
  if (confidence <= 20) return "Very low confidence";
  if (confidence <= 40) return "Low confidence";
  if (confidence <= 60) return "Moderate confidence";
  if (confidence <= 80) return "High confidence";
  return "Very high confidence";
}

// ── Source origin color ──────────────────────────────────────────────

function sourceColor(origin: SuggestionSource["origin"]): {
  text: string;
  bg: string;
  border: string;
} {
  switch (origin) {
    case "dna":
      return {
        text: "#C4A96A",
        bg: "rgba(196, 169, 106, 0.08)",
        border: "rgba(196, 169, 106, 0.15)",
      };
    case "valuation":
      return {
        text: "#3b82f6",
        bg: "rgba(59, 130, 246, 0.08)",
        border: "rgba(59, 130, 246, 0.15)",
      };
    case "entity":
      return {
        text: "#a78bfa",
        bg: "rgba(167, 139, 250, 0.08)",
        border: "rgba(167, 139, 250, 0.15)",
      };
    case "cascade":
      return {
        text: "#22c55e",
        bg: "rgba(34, 197, 94, 0.08)",
        border: "rgba(34, 197, 94, 0.15)",
      };
    case "user_prior":
      return {
        text: "#9AA7B2",
        bg: "rgba(154, 167, 178, 0.08)",
        border: "rgba(154, 167, 178, 0.15)",
      };
    default:
      return {
        text: "#9AA7B2",
        bg: "rgba(255, 255, 255, 0.04)",
        border: "rgba(255, 255, 255, 0.06)",
      };
  }
}

// ── Source origin icon ───────────────────────────────────────────────

function SourceIcon({ origin }: { origin: SuggestionSource["origin"] }) {
  const size = 10;
  switch (origin) {
    case "dna":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 15c6.667-6 13.333 0 20-6" />
          <path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993" />
          <path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993" />
        </svg>
      );
    case "valuation":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case "entity":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case "cascade":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    default:
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      );
  }
}

// ── Source Detail Card (popover on source chip click) ─────────────────

function SourceDetailCard({
  source,
  dnaParagraphs,
  onClose,
}: {
  source: SuggestionSource;
  dnaParagraphs?: Record<string, string>;
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Find the referenced DNA paragraph content if available
  const refContent =
    source.origin === "dna" && source.refKey && dnaParagraphs
      ? dnaParagraphs[source.refKey]
      : null;

  const sc = sourceColor(source.origin);

  return (
    <div
      ref={cardRef}
      className="absolute z-50 rounded-xl p-4 mt-2"
      style={{
        background: "rgba(15, 18, 25, 0.95)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1px solid ${sc.border}`,
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
        minWidth: "280px",
        maxWidth: "400px",
        left: 0,
        top: "100%",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: sc.text }}>
          <SourceIcon origin={source.origin} />
        </span>
        <span
          className="font-medium"
          style={{ fontSize: "13px", color: sc.text }}
        >
          {source.label}
        </span>
        <button
          onClick={onClose}
          className="ml-auto cursor-pointer"
          style={{ color: "rgba(255, 255, 255, 0.3)" }}
          aria-label="Close source detail"
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
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Origin badge */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="uppercase tracking-wide"
          style={{
            fontSize: "9px",
            letterSpacing: "0.08em",
            color: "rgba(255, 255, 255, 0.3)",
          }}
        >
          Source
        </span>
        <span
          className="rounded-full px-2 py-0.5 uppercase"
          style={{
            fontSize: "9px",
            fontWeight: 700,
            letterSpacing: "0.06em",
            color: sc.text,
            background: sc.bg,
            border: `1px solid ${sc.border}`,
          }}
        >
          {source.origin}
        </span>
        {source.refKey && (
          <span
            style={{
              fontSize: "11px",
              color: "rgba(255, 255, 255, 0.25)",
            }}
          >
            ref: {source.refKey}
          </span>
        )}
      </div>

      {/* Referenced content (if DNA paragraph) */}
      {refContent && (
        <div
          className="rounded-lg px-3 py-2"
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.04)",
            fontSize: "12px",
            color: "#9AA7B2",
            lineHeight: 1.6,
            maxHeight: "120px",
            overflowY: "auto",
          }}
        >
          {refContent.length > 300
            ? refContent.substring(0, 300) + "..."
            : refContent}
        </div>
      )}

      {/* Fallback for non-DNA sources */}
      {!refContent && (
        <p
          style={{
            fontSize: "12px",
            color: "rgba(255, 255, 255, 0.25)",
            fontStyle: "italic",
          }}
        >
          {source.origin === "valuation"
            ? "Derived from DCF model and valuation assumptions"
            : source.origin === "entity"
              ? "Based on target entity thesis and matching criteria"
              : source.origin === "cascade"
                ? "Generated by the Cascade Intelligence Pipeline"
                : "Based on your prior answers in other documents"}
        </p>
      )}
    </div>
  );
}

// ── Single Suggestion Chip ───────────────────────────────────────────

function SuggestionChip({
  suggestion,
  index,
  onAccept,
  onReject,
  dnaParagraphs,
}: {
  suggestion: Suggestion;
  index: number;
  onAccept: (suggestion: Suggestion, index: number) => void;
  onReject: (suggestion: Suggestion, index: number) => void;
  dnaParagraphs?: Record<string, string>;
}) {
  const [state, setState] = useState<"idle" | "accepted" | "rejected">("idle");
  const [showSource, setShowSource] = useState(false);

  const handleAccept = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setState("accepted");
      onAccept(suggestion, index);
    },
    [suggestion, index, onAccept]
  );

  const handleReject = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setState("rejected");
      onReject(suggestion, index);
    },
    [suggestion, index, onReject]
  );

  const toggleSource = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSource((prev) => !prev);
  }, []);

  const closeSource = useCallback(() => {
    setShowSource(false);
  }, []);

  const confColor = confidenceColor(suggestion.confidence);
  const confLabel = confidenceLabel(suggestion.confidence);
  const sc = sourceColor(suggestion.source.origin);

  // Truncate suggestion value for display
  const displayText =
    suggestion.value.length > 60
      ? suggestion.value.substring(0, 57) + "..."
      : suggestion.value;

  return (
    <div
      className="relative inline-flex items-center gap-2 rounded-xl px-3 py-2 transition-all"
      style={{
        background:
          state === "accepted"
            ? "rgba(196, 169, 106, 0.08)"
            : "rgba(255, 255, 255, 0.03)",
        border:
          state === "accepted"
            ? "1px solid rgba(196, 169, 106, 0.2)"
            : "1px solid rgba(255, 255, 255, 0.06)",
        boxShadow:
          state === "accepted"
            ? "0 0 12px rgba(196, 169, 106, 0.08)"
            : "none",
        opacity: state === "rejected" ? 0.3 : 1,
        transition: "all 200ms ease",
      }}
    >
      {/* Confidence dot */}
      <span
        className="shrink-0 rounded-full"
        style={{
          width: "8px",
          height: "8px",
          background: confColor,
        }}
        title={`${suggestion.confidence}% — ${confLabel}`}
      />

      {/* Suggestion text */}
      <span
        style={{
          fontSize: "12px",
          color: state === "accepted" ? "#e2e8f0" : "#9AA7B2",
          maxWidth: "240px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={suggestion.value}
      >
        {displayText}
      </span>

      {/* "Olivia Knows" source chip */}
      <button
        onClick={toggleSource}
        className="relative inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 transition-all cursor-pointer"
        style={{
          fontSize: "10px",
          color: sc.text,
          background: sc.bg,
          border: `1px solid ${sc.border}`,
        }}
        title={`Source: ${suggestion.source.label}`}
      >
        <SourceIcon origin={suggestion.source.origin} />
        <span className="hidden sm:inline">{suggestion.source.label}</span>
      </button>

      {/* Source detail card */}
      {showSource && (
        <SourceDetailCard
          source={suggestion.source}
          dnaParagraphs={dnaParagraphs}
          onClose={closeSource}
        />
      )}

      {/* Accept / Reject buttons (hidden if already actioned) */}
      {state === "idle" && (
        <div className="flex items-center gap-0.5 ml-1">
          {/* Accept */}
          <button
            onClick={handleAccept}
            className="flex items-center justify-center rounded-full transition-all cursor-pointer"
            style={{
              width: "22px",
              height: "22px",
              background: "rgba(196, 169, 106, 0.06)",
              border: "1px solid rgba(196, 169, 106, 0.12)",
              color: "#C4A96A",
            }}
            title="Accept suggestion"
            aria-label="Accept suggestion"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>

          {/* Reject */}
          <button
            onClick={handleReject}
            className="flex items-center justify-center rounded-full transition-all cursor-pointer"
            style={{
              width: "22px",
              height: "22px",
              background: "rgba(239, 68, 68, 0.06)",
              border: "1px solid rgba(239, 68, 68, 0.1)",
              color: "#f87171",
            }}
            title="Reject suggestion"
            aria-label="Reject suggestion"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Accepted checkmark indicator */}
      {state === "accepted" && (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#C4A96A"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 ml-1"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────

export function SuggestionChips({
  suggestions,
  onAccept,
  onReject,
  dnaParagraphs,
}: SuggestionChipsProps) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {/* Section label */}
      <div className="flex items-center gap-2">
        <span
          className="uppercase tracking-wide"
          style={{
            fontSize: "10px",
            color: "rgba(255, 255, 255, 0.3)",
            letterSpacing: "0.08em",
          }}
        >
          Olivia Knows
        </span>
        <span
          style={{
            fontSize: "10px",
            color: "rgba(255, 255, 255, 0.15)",
          }}
        >
          {suggestions.length} suggestion{suggestions.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Chips */}
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <SuggestionChip
            key={`${suggestion.source.origin}-${suggestion.source.refKey || index}`}
            suggestion={suggestion}
            index={index}
            onAccept={onAccept}
            onReject={onReject}
            dnaParagraphs={dnaParagraphs}
          />
        ))}
      </div>
    </div>
  );
}
