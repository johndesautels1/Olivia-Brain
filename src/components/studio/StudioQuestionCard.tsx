"use client";

/**
 * StudioQuestionCard — Single-question hero card for the Preparation Studio.
 *
 * Renders one QuestionState at a time with:
 * - Question counter (Q7 of 24) + block type badge
 * - Hero typography question text (24px semibold)
 * - Help/explanation text (14px muted)
 * - Dynamic answer input based on field type:
 *   text      → single-line input
 *   textarea  → auto-expanding textarea
 *   items     → editable list with add/remove
 *   metrics   → key-value pair editor
 *   table     → placeholder (full editor in Conversation 4)
 *   timeline  → placeholder (full editor in Conversation 4)
 * - Status indicator dot (5-color)
 * - Action buttons: Research (disabled), Voice (disabled), Skip, Next
 *
 * Design spec:
 * - Card surface: rgba(15, 18, 25, 0.8) with backdrop-blur(16px)
 * - Question text: 24px, font-semibold, #e2e8f0
 * - Help text: 14px, #9AA7B2
 * - Micro labels: 10-11px, uppercase, tracking-wide
 * - Input: transparent bg, subtle border, 14px
 * - Gold border pulse on auto-save (added in PreparationStudio)
 */

import React, { useCallback, useRef, useEffect, useState } from "react";
import type { QuestionState, FieldValue, ConsistencyFlag } from "@/lib/studio/types";
import {
  StudioAnswerEditor,
  type EditorSelection,
  type SlashCommandContext,
} from "./StudioAnswerEditor";
import { StudioVoiceInput, type VoiceTranscriptResult } from "./StudioVoiceInput";
import { StudioTTSPlayer } from "./StudioTTSPlayer";

interface StudioQuestionCardProps {
  question: QuestionState;
  totalQuestions: number;
  onAnswer: (questionIndex: number, value: FieldValue) => void;
  onSkip: () => void;
  onNext: () => void;
  isLast: boolean;
  isSaving: boolean;
  /** Ghost text suggestion for the editor (Tab to accept) */
  ghostText?: string;
  /** Fires when user text selection changes in the editor */
  onSelectionChange?: (selection: EditorSelection | null) => void;
  /** Fires for insert/AI slash commands (format handled inline) */
  onSlashCommand?: (command: string, context: SlashCommandContext) => void;
  /** Fires when voice dictation produces a transcript */
  onVoiceTranscript?: (result: VoiceTranscriptResult) => void;
  /** Fires when dictation state changes (recording on/off) */
  onDictationStateChange?: (isRecording: boolean) => void;
  /** Whether TTS readback player is visible */
  showTTSPlayer?: boolean;
  /** Fires when user clicks the Research button */
  onResearch?: () => void;
}

// ── Status dot color ────────────────────────────────────────────────

function statusDotColor(status: "empty" | "partial" | "complete"): string {
  switch (status) {
    case "complete": return "#22c55e";
    case "partial": return "#f97316";
    case "empty": return "rgba(255, 255, 255, 0.2)";
  }
}

function statusLabel(status: "empty" | "partial" | "complete"): string {
  switch (status) {
    case "complete": return "Complete";
    case "partial": return "Partial";
    case "empty": return "Unanswered";
  }
}

// ── Impact score tier color ──────────────────────────────────────────

function impactTierColor(score: number): string {
  if (score >= 81) return "#22c55e";
  if (score >= 61) return "#3b82f6";
  if (score >= 41) return "#eab308";
  if (score >= 21) return "#f97316";
  return "#ef4444";
}

// ── Format block type for display ───────────────────────────────────

function formatBlockType(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Knowledge Strength Meter ─────────────────────────────────────────
// Shows how much context Olivia has for this question, computed from
// the number and quality of priors + suggestions.

function KnowledgeStrengthMeter({ question }: { question: QuestionState }) {
  const priorCount = question.priors.length;
  const suggestionCount = question.suggestions.length;
  const totalSources = priorCount + suggestionCount;

  // Compute average confidence from suggestions
  const avgConfidence =
    suggestionCount > 0
      ? Math.round(
          question.suggestions.reduce((sum, s) => sum + s.confidence, 0) /
            suggestionCount
        )
      : 0;

  // Strength tiers based on source count + confidence
  let strength: "very-strong" | "strong" | "moderate" | "limited" | "none";
  let label: string;
  let color: string;
  let barWidth: number;

  if (totalSources >= 3 && avgConfidence >= 70) {
    strength = "very-strong";
    label = "Very strong context";
    color = "#22c55e";
    barWidth = 100;
  } else if (totalSources >= 2 && avgConfidence >= 50) {
    strength = "strong";
    label = "Strong context";
    color = "#3b82f6";
    barWidth = 75;
  } else if (totalSources >= 1) {
    strength = "moderate";
    label = "Some context";
    color = "#eab308";
    barWidth = 50;
  } else if (priorCount > 0) {
    strength = "limited";
    label = "Limited — guide me";
    color = "#f97316";
    barWidth = 25;
  } else {
    strength = "none";
    label = "No context yet";
    color = "rgba(255, 255, 255, 0.15)";
    barWidth = 5;
  }

  return (
    <div className="flex items-center gap-2">
      {/* Mini bar */}
      <div
        className="rounded-full overflow-hidden"
        style={{
          width: "48px",
          height: "4px",
          background: "rgba(255, 255, 255, 0.06)",
          flexShrink: 0,
        }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${barWidth}%`,
            background: color,
            transition: "width 300ms ease",
          }}
        />
      </div>

      {/* Label */}
      <span
        style={{
          fontSize: "10px",
          color: strength === "none" ? "rgba(255, 255, 255, 0.2)" : color,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>

      {/* Source count */}
      {totalSources > 0 && (
        <span
          style={{
            fontSize: "9px",
            color: "rgba(255, 255, 255, 0.15)",
          }}
        >
          ({totalSources} source{totalSources !== 1 ? "s" : ""})
        </span>
      )}
    </div>
  );
}

// ── Consistency Flag Banner — cross-document conflict warnings ───────
// Shows yellow (warning) or red (error) banners when the same field has
// a different value in another document. Helps the user spot contradictions.

function ConsistencyFlagBanner({ flags }: { flags: ConsistencyFlag[] }) {
  if (flags.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {flags.map((flag, i) => {
        const isError = flag.severity === "error";
        const bgColor = isError
          ? "rgba(239, 68, 68, 0.08)"
          : "rgba(234, 179, 8, 0.08)";
        const borderColor = isError
          ? "rgba(239, 68, 68, 0.2)"
          : "rgba(234, 179, 8, 0.2)";
        const iconColor = isError ? "#f87171" : "#eab308";
        const textColor = isError ? "#fca5a5" : "#fde047";

        return (
          <div
            key={`${flag.conflictingDocId}-${flag.fieldKey}-${i}`}
            className="flex items-start gap-2.5 rounded-lg px-3 py-2.5"
            style={{
              background: bgColor,
              border: `1px solid ${borderColor}`,
            }}
          >
            {/* Warning/error icon */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={iconColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 mt-0.5"
            >
              {isError ? (
                <>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </>
              ) : (
                <>
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </>
              )}
            </svg>

            {/* Message */}
            <span style={{ fontSize: "12px", color: textColor, lineHeight: 1.5 }}>
              <strong>{isError ? "Conflict" : "Mismatch"}:</strong>{" "}
              In <em>{flag.conflictingDocTitle}</em> you said &ldquo;
              {flag.otherValue}&rdquo; but here you wrote &ldquo;
              {flag.thisValue}&rdquo;
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Textarea Input (auto-expanding) — kept for table/timeline fallback ─

function TextareaInput({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder?: string;
  onChange: (val: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-expand height
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = `${Math.max(120, ref.current.scrollHeight)}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || "Write your response..."}
      className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all resize-none focus:ring-1"
      style={{
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        color: "#e2e8f0",
        fontSize: "14px",
        minHeight: "120px",
        lineHeight: 1.6,
        caretColor: "#C4A96A",
      }}
      autoFocus
    />
  );
}

// ── Items Input (editable list with add/remove) ─────────────────────

function ItemsInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (val: string[]) => void;
}) {
  const addItem = useCallback(() => {
    onChange([...value, ""]);
  }, [value, onChange]);

  const updateItem = useCallback(
    (index: number, text: string) => {
      const updated = [...value];
      updated[index] = text;
      onChange(updated);
    },
    [value, onChange]
  );

  const removeItem = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index));
    },
    [value, onChange]
  );

  return (
    <div className="space-y-2">
      {value.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <span
            className="shrink-0 flex items-center justify-center rounded-full"
            style={{
              width: "22px",
              height: "22px",
              fontSize: "10px",
              color: "#9AA7B2",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            {index + 1}
          </span>
          <input
            type="text"
            value={typeof item === "string" ? item : ""}
            onChange={(e) => updateItem(index, e.target.value)}
            placeholder={`Item ${index + 1}...`}
            className="flex-1 rounded-lg px-3 py-2 text-sm outline-none transition-all focus:ring-1"
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "#e2e8f0",
              fontSize: "14px",
              caretColor: "#C4A96A",
            }}
            autoFocus={index === value.length - 1}
          />
          <button
            onClick={() => removeItem(index)}
            className="shrink-0 flex items-center justify-center rounded-full transition-all cursor-pointer"
            style={{
              width: "24px",
              height: "24px",
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.15)",
              color: "#f87171",
            }}
            aria-label={`Remove item ${index + 1}`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ))}

      <button
        onClick={addItem}
        className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all cursor-pointer"
        style={{
          background: "rgba(196, 169, 106, 0.06)",
          border: "1px solid rgba(196, 169, 106, 0.12)",
          color: "#C4A96A",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add item
      </button>
    </div>
  );
}

// ── Metrics Input (key-value pairs) ─────────────────────────────────

function MetricsInput({
  value,
  onChange,
}: {
  value: Record<string, unknown>[];
  onChange: (val: Record<string, unknown>[]) => void;
}) {
  const addMetric = useCallback(() => {
    onChange([...value, { label: "", value: "" }]);
  }, [value, onChange]);

  const updateMetric = useCallback(
    (index: number, field: string, text: string) => {
      const updated = [...value];
      updated[index] = { ...updated[index], [field]: text };
      onChange(updated);
    },
    [value, onChange]
  );

  const removeMetric = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index));
    },
    [value, onChange]
  );

  return (
    <div className="space-y-2">
      {value.map((metric, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            type="text"
            value={(metric.label as string) || ""}
            onChange={(e) => updateMetric(index, "label", e.target.value)}
            placeholder="Metric name..."
            className="flex-1 rounded-lg px-3 py-2 text-sm outline-none transition-all focus:ring-1"
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "#9AA7B2",
              fontSize: "13px",
              caretColor: "#C4A96A",
            }}
          />
          <input
            type="text"
            value={(metric.value as string) || ""}
            onChange={(e) => updateMetric(index, "value", e.target.value)}
            placeholder="Value..."
            className="flex-1 rounded-lg px-3 py-2 text-sm outline-none transition-all font-semibold focus:ring-1"
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "#e2e8f0",
              fontSize: "14px",
              caretColor: "#C4A96A",
            }}
          />
          <button
            onClick={() => removeMetric(index)}
            className="shrink-0 flex items-center justify-center rounded-full transition-all cursor-pointer"
            style={{
              width: "24px",
              height: "24px",
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.15)",
              color: "#f87171",
            }}
            aria-label={`Remove metric ${index + 1}`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ))}

      <button
        onClick={addMetric}
        className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all cursor-pointer"
        style={{
          background: "rgba(196, 169, 106, 0.06)",
          border: "1px solid rgba(196, 169, 106, 0.12)",
          color: "#C4A96A",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add metric
      </button>
    </div>
  );
}

// ── Guidance popup — hover/click "?" with investor-oriented advice ────
// Shows contextual guidance about what a strong answer looks like,
// typical length, and what investors focus on for this field type.

function getGuidanceText(blockType: string, fieldType: string): { tip: string; length: string; investorFocus: string } {
  const typeKey = blockType.toLowerCase();

  if (typeKey.includes("financial") || typeKey.includes("revenue") || typeKey.includes("metric")) {
    return {
      tip: "Be specific with numbers. Use investor-friendly formatting (e.g., \u00a31.2M ARR, 23% MoM growth).",
      length: "Key metrics with supporting context. 1\u20132 sentences per metric.",
      investorFocus: "Investors look for clear unit economics, growth trajectory, and defensible numbers.",
    };
  }
  if (typeKey.includes("team") || typeKey.includes("founder")) {
    return {
      tip: "Highlight relevant domain expertise, prior exits, and unique qualifications.",
      length: "2\u20133 sentences per team member. Focus on why this team wins.",
      investorFocus: "Investors back teams first. Show deep domain knowledge and execution ability.",
    };
  }
  if (typeKey.includes("market") || typeKey.includes("tam") || typeKey.includes("opportunity")) {
    return {
      tip: "Use a top-down and bottom-up approach. Reference credible sources.",
      length: "2\u20134 sentences. Include TAM, SAM, SOM with clear methodology.",
      investorFocus: "Investors want to see a large, growing market with a credible path to capture.",
    };
  }
  if (typeKey.includes("traction") || typeKey.includes("growth")) {
    return {
      tip: "Show momentum with concrete data points: users, revenue, partnerships, milestones.",
      length: "2\u20133 sentences with specific numbers and timelines.",
      investorFocus: "Investors look for evidence of product-market fit and accelerating growth.",
    };
  }
  if (typeKey.includes("competition") || typeKey.includes("moat")) {
    return {
      tip: "Acknowledge competitors honestly. Explain your differentiation clearly.",
      length: "2\u20133 sentences. Don\u2019t say \u201cno competitors\u201d \u2014 that\u2019s a red flag.",
      investorFocus: "Investors want to understand your defensible advantage and market positioning.",
    };
  }
  if (typeKey.includes("risk") || typeKey.includes("challenge")) {
    return {
      tip: "Be transparent about risks but pair each one with a mitigation strategy.",
      length: "1\u20132 sentences per risk. Show self-awareness and preparedness.",
      investorFocus: "Investors respect founders who understand and plan for risks proactively.",
    };
  }

  // Default guidance based on field type
  if (fieldType === "items") {
    return {
      tip: "List concrete, specific items. Quality over quantity.",
      length: "3\u20135 items is typical. Each should be distinct and substantive.",
      investorFocus: "Investors scan lists quickly \u2014 lead with the strongest items.",
    };
  }
  if (fieldType === "metrics") {
    return {
      tip: "Use precise numbers with units. Avoid vague ranges where possible.",
      length: "Include the most impactful metrics. 3\u20136 key metrics.",
      investorFocus: "Investors will benchmark these against industry standards.",
    };
  }

  return {
    tip: "Write clearly and concisely. Support claims with evidence.",
    length: "2\u20133 sentences is typical. Be specific rather than general.",
    investorFocus: "Investors value clarity, honesty, and specificity over length.",
  };
}

function GuidancePopup({ blockType, fieldType }: { blockType: string; fieldType: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const guidance = getGuidanceText(blockType, fieldType);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative inline-flex" ref={popupRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="flex items-center justify-center rounded-full transition-all cursor-pointer"
        style={{
          width: "22px",
          height: "22px",
          background: isOpen ? "rgba(196, 169, 106, 0.12)" : "rgba(255, 255, 255, 0.04)",
          border: `1px solid ${isOpen ? "rgba(196, 169, 106, 0.2)" : "rgba(255, 255, 255, 0.06)"}`,
          color: isOpen ? "#C4A96A" : "#9AA7B2",
          fontSize: "11px",
          fontWeight: 700,
          flexShrink: 0,
        }}
        aria-label="Answer guidance"
        title="What makes a strong answer?"
      >
        ?
      </button>

      {isOpen && (
        <div
          className="absolute z-50 rounded-xl px-4 py-3"
          style={{
            top: "calc(100% + 8px)",
            right: 0,
            width: "280px",
            background: "rgba(15, 18, 25, 0.95)",
            border: "1px solid rgba(196, 169, 106, 0.15)",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
          }}
        >
          {/* Tip */}
          <div className="mb-2.5">
            <span
              className="uppercase tracking-wide font-semibold"
              style={{ fontSize: "9px", color: "#C4A96A", letterSpacing: "0.08em" }}
            >
              Guidance
            </span>
            <p style={{ fontSize: "12px", color: "#e2e8f0", lineHeight: 1.5, marginTop: "4px" }}>
              {guidance.tip}
            </p>
          </div>

          {/* Typical length */}
          <div className="mb-2.5">
            <span
              className="uppercase tracking-wide font-semibold"
              style={{ fontSize: "9px", color: "rgba(255, 255, 255, 0.3)", letterSpacing: "0.08em" }}
            >
              Typical length
            </span>
            <p style={{ fontSize: "11px", color: "#9AA7B2", lineHeight: 1.4, marginTop: "3px" }}>
              {guidance.length}
            </p>
          </div>

          {/* Investor focus */}
          <div>
            <span
              className="uppercase tracking-wide font-semibold"
              style={{ fontSize: "9px", color: "rgba(255, 255, 255, 0.3)", letterSpacing: "0.08em" }}
            >
              Investor focus
            </span>
            <p style={{ fontSize: "11px", color: "#9AA7B2", lineHeight: 1.4, marginTop: "3px" }}>
              {guidance.investorFocus}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Dynamic answer renderer based on field type ─────────────────────

function AnswerInput({
  question,
  onAnswer,
  ghostText,
  onSelectionChange,
  onSlashCommand,
}: {
  question: QuestionState;
  onAnswer: (value: FieldValue) => void;
  ghostText?: string;
  onSelectionChange?: (selection: EditorSelection | null) => void;
  onSlashCommand?: (command: string, context: SlashCommandContext) => void;
}) {
  const { field, currentValue } = question;

  switch (field.type) {
    case "text":
      return (
        <StudioAnswerEditor
          value={typeof currentValue === "string" ? currentValue : ""}
          placeholder={field.placeholder}
          ghostText={ghostText}
          mode="text"
          onValueChange={onAnswer}
          onSelectionChange={onSelectionChange}
          onSlashCommand={onSlashCommand}
        />
      );

    case "textarea":
      return (
        <StudioAnswerEditor
          value={typeof currentValue === "string" ? currentValue : ""}
          placeholder={field.placeholder}
          ghostText={ghostText}
          mode="textarea"
          onValueChange={onAnswer}
          onSelectionChange={onSelectionChange}
          onSlashCommand={onSlashCommand}
        />
      );

    case "items":
      return (
        <ItemsInput
          value={Array.isArray(currentValue) ? (currentValue as string[]) : [""]}
          onChange={(items) => onAnswer(items)}
        />
      );

    case "metrics":
      return (
        <MetricsInput
          value={Array.isArray(currentValue) ? (currentValue as unknown as Record<string, unknown>[]) : [{ label: "", value: "" }]}
          onChange={(metrics) => onAnswer(metrics as unknown as Record<string, unknown>)}
        />
      );

    case "table":
    case "timeline":
      // Complex editors — basic textarea fallback for now.
      // Full structured editors will come in Conversation 4.
      return (
        <TextareaInput
          value={typeof currentValue === "string" ? currentValue : JSON.stringify(currentValue ?? "", null, 2)}
          placeholder={`Enter ${field.type} data...`}
          onChange={onAnswer}
        />
      );

    default:
      return (
        <StudioAnswerEditor
          value={typeof currentValue === "string" ? currentValue : ""}
          mode="text"
          onValueChange={onAnswer}
          onSelectionChange={onSelectionChange}
          onSlashCommand={onSlashCommand}
        />
      );
  }
}

// ── Main Component ──────────────────────────────────────────────────

export function StudioQuestionCard({
  question,
  totalQuestions,
  onAnswer,
  onSkip,
  onNext,
  isLast,
  isSaving,
  ghostText,
  onSelectionChange,
  onSlashCommand,
  onVoiceTranscript,
  onDictationStateChange,
  showTTSPlayer = true,
  onResearch,
}: StudioQuestionCardProps) {
  const handleAnswer = useCallback(
    (value: FieldValue) => {
      onAnswer(question.questionIndex, value);
    },
    [question.questionIndex, onAnswer]
  );

  return (
    <div className="w-full">
      {/* Question counter + block type badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span
            className="uppercase tracking-wide"
            style={{
              fontSize: "11px",
              color: "#9AA7B2",
              letterSpacing: "0.08em",
            }}
          >
            Q{question.questionIndex + 1} of {totalQuestions}
          </span>

          {/* Status dot */}
          <span
            className="rounded-full"
            style={{
              width: "6px",
              height: "6px",
              display: "inline-block",
              background: statusDotColor(question.status),
            }}
            title={statusLabel(question.status)}
          />

          {/* Auto-save indicator */}
          {isSaving && (
            <span
              className="uppercase tracking-wide"
              style={{
                fontSize: "10px",
                color: "#C4A96A",
                letterSpacing: "0.06em",
                opacity: 0.7,
              }}
            >
              Saving...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Impact score badge */}
          {question.impactScore > 0 && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
              style={{
                fontSize: "10px",
                fontWeight: 600,
                color: impactTierColor(question.impactScore),
                background: `${impactTierColor(question.impactScore)}10`,
                border: `1px solid ${impactTierColor(question.impactScore)}20`,
                letterSpacing: "0.04em",
              }}
              title={`Impact score: ${question.impactScore}/100`}
            >
              <span
                className="rounded-full"
                style={{
                  width: "5px",
                  height: "5px",
                  background: impactTierColor(question.impactScore),
                }}
              />
              {question.impactScore}
            </span>
          )}

          {/* Block type badge */}
          <span
            className="rounded-full px-2.5 py-0.5 uppercase tracking-wide"
            style={{
              fontSize: "10px",
              color: "#9AA7B2",
              letterSpacing: "0.06em",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            {formatBlockType(question.blockType)}
          </span>
        </div>
      </div>

      {/* Question text — hero treatment: 24px, semibold + guidance popup */}
      <div className="flex items-start gap-2 mb-3">
        <h2
          className="font-semibold leading-snug flex-1"
          style={{
            fontSize: "24px",
            color: "#e2e8f0",
            lineHeight: 1.3,
          }}
        >
          {question.questionText}
        </h2>
        <div className="mt-1 shrink-0">
          <GuidancePopup blockType={question.blockType} fieldType={question.field.type} />
        </div>
      </div>

      {/* Help text — 14px, muted */}
      {question.helpText && (
        <p
          className="leading-relaxed mb-5"
          style={{
            fontSize: "14px",
            color: "#9AA7B2",
            lineHeight: 1.6,
          }}
        >
          {question.helpText}
        </p>
      )}

      {/* Knowledge strength meter */}
      <div className="mb-4">
        <KnowledgeStrengthMeter question={question} />
      </div>

      {/* Cross-document consistency flags */}
      <ConsistencyFlagBanner flags={question.consistencyFlags} />

      {/* Suggestion chips placeholder — Conversation 5 */}
      {question.suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {question.suggestions.map((s, i) => (
            <span
              key={i}
              className="inline-flex items-center rounded-lg px-3 py-1.5"
              style={{
                fontSize: "12px",
                color: "#9AA7B2",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <span
                className="rounded-full mr-2"
                style={{
                  width: "6px",
                  height: "6px",
                  background: s.confidence >= 80 ? "#22c55e" : s.confidence >= 50 ? "#eab308" : "#ef4444",
                }}
              />
              {s.source.label}
            </span>
          ))}
        </div>
      )}

      {/* Answer input area — dynamic based on field type */}
      <div className="mb-5">
        <AnswerInput
          question={question}
          onAnswer={handleAnswer}
          ghostText={ghostText}
          onSelectionChange={onSelectionChange}
          onSlashCommand={onSlashCommand}
        />
      </div>

      {/* TTS Readback Player */}
      {showTTSPlayer && (
        <div className="mb-4">
          <StudioTTSPlayer
            text={typeof question.currentValue === "string" ? question.currentValue : ""}
            visible={question.status === "complete" || question.status === "partial"}
          />
        </div>
      )}

      {/* Action buttons row */}
      <div
        className="flex items-center justify-between pt-4"
        style={{ borderTop: "1px solid rgba(255, 255, 255, 0.04)" }}
      >
        {/* Left: context actions */}
        <div className="flex items-center gap-2">
          {/* Research button */}
          <button
            onClick={onResearch}
            disabled={!onResearch}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer disabled:cursor-not-allowed"
            style={{
              background: "rgba(196, 169, 106, 0.06)",
              border: "1px solid rgba(196, 169, 106, 0.12)",
              color: "#C4A96A",
              minHeight: "36px",
              opacity: onResearch ? 1 : 0.5,
            }}
            title="Deep Research"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span className="hidden sm:inline">Research</span>
          </button>

          {/* Voice input — compact pulsing orb */}
          {onVoiceTranscript && (
            <StudioVoiceInput
              onTranscript={onVoiceTranscript}
              onDictationStateChange={onDictationStateChange}
              disabled={isSaving}
              compact
            />
          )}
        </div>

        {/* Right: Skip + Next */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSkip}
            disabled={isLast}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer disabled:cursor-not-allowed"
            style={{
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              color: "#9AA7B2",
              minHeight: "36px",
              opacity: isLast ? 0.3 : 1,
            }}
          >
            Skip
          </button>

          <button
            onClick={onNext}
            disabled={isLast}
            className="flex items-center gap-1.5 rounded-lg px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium transition-all cursor-pointer disabled:cursor-not-allowed"
            style={{
              background: isLast
                ? "rgba(196, 169, 106, 0.05)"
                : "rgba(196, 169, 106, 0.12)",
              border: `1px solid ${isLast ? "rgba(196, 169, 106, 0.08)" : "rgba(196, 169, 106, 0.2)"}`,
              color: isLast ? "rgba(196, 169, 106, 0.3)" : "#C4A96A",
              minHeight: "36px",
            }}
          >
            Next
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
