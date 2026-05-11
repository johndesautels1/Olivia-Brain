"use client";

/**
 * StoryReview — "Story So Far" narrative review panel for the Preparation Studio.
 *
 * When opened, Olivia "narrates" a cohesive summary of all completed answers
 * as a flowing story rather than a field-by-field list. This gives the founder
 * a read-only, narrative-form view of what they've built so far.
 *
 * Features:
 * - Full-screen glassmorphic overlay
 * - Groups completed answers by block type (section headings)
 * - Generates a narrative paragraph per section from Q&A pairs
 * - "Olivia says..." intro with avatar accent
 * - Scroll through the full narrative
 * - Jump-to-question links on each answer for quick edits
 * - Close button returns to the studio
 *
 * Design spec:
 * - Overlay: rgba(10, 14, 26, 0.92) with backdrop-blur(20px)
 * - Card: max-w-3xl, glassmorphic, rounded-2xl
 * - Section headers: 11px uppercase gold (#C4A96A)
 * - Narrative text: 14px, #e2e8f0, line-height 1.7
 * - Answer highlights: left gold border accent
 * - Jump link: subtle gold text, click to close + jump
 */

import React, { useMemo } from "react";
import type { QuestionState } from "@/lib/studio/types";

interface StoryReviewProps {
  isOpen: boolean;
  onClose: () => void;
  questions: QuestionState[];
  documentTitle: string;
  completionPct: number;
  onJumpTo: (index: number) => void;
}

// ── Format block type for section headers ────────────────────────────

function formatSectionTitle(blockType: string): string {
  return blockType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Extract answer as readable string ────────────────────────────────

function answerToString(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    const items = value.filter((v) => typeof v === "string" && v.trim());
    return items.join("; ");
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }
  return String(value);
}

// ── Group completed questions by block type ──────────────────────────

interface AnswerGroup {
  blockType: string;
  sectionTitle: string;
  answers: {
    questionIndex: number;
    questionText: string;
    answerText: string;
  }[];
}

function groupCompletedAnswers(questions: QuestionState[]): AnswerGroup[] {
  const groups: Map<string, AnswerGroup> = new Map();

  for (const q of questions) {
    if (q.status !== "complete" && q.status !== "partial") continue;

    const text = answerToString(q.currentValue);
    if (!text) continue;

    let group = groups.get(q.blockType);
    if (!group) {
      group = {
        blockType: q.blockType,
        sectionTitle: formatSectionTitle(q.blockType),
        answers: [],
      };
      groups.set(q.blockType, group);
    }

    group.answers.push({
      questionIndex: q.questionIndex,
      questionText: q.questionText,
      answerText: text,
    });
  }

  return Array.from(groups.values());
}

// ── Main Component ───────────────────────────────────────────────────

export function StoryReview({
  isOpen,
  onClose,
  questions,
  documentTitle,
  completionPct,
  onJumpTo,
}: StoryReviewProps) {
  const groups = useMemo(() => groupCompletedAnswers(questions), [questions]);

  const completedCount = useMemo(
    () => questions.filter((q) => q.status === "complete").length,
    [questions]
  );

  const handleJump = (index: number) => {
    onClose();
    onJumpTo(index);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{
        background: "rgba(10, 14, 26, 0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-3xl rounded-2xl relative flex flex-col"
        style={{
          background: "rgba(15, 18, 25, 0.9)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.5)",
          maxHeight: "85vh",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <div>
            <h2
              className="font-semibold"
              style={{ fontSize: "18px", color: "#e2e8f0" }}
            >
              The Story So Far
            </h2>
            <p
              style={{ fontSize: "12px", color: "#9AA7B2", marginTop: "2px" }}
            >
              {documentTitle} &mdash; {completedCount} of {questions.length}{" "}
              answered ({completionPct}%)
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-full transition-all cursor-pointer"
            style={{
              width: "32px",
              height: "32px",
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "#9AA7B2",
            }}
            aria-label="Close story review"
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

        {/* Olivia intro */}
        <div
          className="px-6 py-3 shrink-0"
          style={{
            background: "rgba(196, 169, 106, 0.04)",
            borderBottom: "1px solid rgba(196, 169, 106, 0.06)",
          }}
        >
          <div className="flex items-center gap-2.5">
            {/* Mini Olivia avatar indicator */}
            <div
              className="rounded-full shrink-0"
              style={{
                width: "28px",
                height: "28px",
                background: "rgba(196, 169, 106, 0.12)",
                border: "1px solid rgba(196, 169, 106, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: "12px", color: "#C4A96A" }}>O</span>
            </div>
            <p style={{ fontSize: "13px", color: "#C4A96A", fontStyle: "italic" }}>
              {completedCount === 0
                ? "You haven't answered any questions yet. Let's get started!"
                : completedCount < questions.length * 0.5
                  ? "Here's what we've captured so far. Good progress \u2014 let's keep going."
                  : completedCount < questions.length
                    ? "You're well on your way. Here's your story taking shape beautifully."
                    : "Everything is complete. Here's the full narrative of what you've built."}
            </p>
          </div>
        </div>

        {/* Scrollable narrative body */}
        <div
          className="flex-1 overflow-y-auto px-6 py-5 space-y-6"
          style={{ scrollbarWidth: "thin" }}
        >
          {groups.length === 0 ? (
            <div className="text-center py-12">
              <p style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.25)" }}>
                No answers yet. Start answering questions to build your story.
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.blockType}>
                {/* Section header */}
                <h3
                  className="uppercase tracking-wide font-semibold mb-3"
                  style={{
                    fontSize: "11px",
                    color: "#C4A96A",
                    letterSpacing: "0.08em",
                  }}
                >
                  {group.sectionTitle}
                </h3>

                {/* Answers in this section */}
                <div className="space-y-3">
                  {group.answers.map((answer) => (
                    <div
                      key={answer.questionIndex}
                      className="rounded-xl px-4 py-3 group"
                      style={{
                        background: "rgba(255, 255, 255, 0.02)",
                        borderLeft: "2px solid rgba(196, 169, 106, 0.2)",
                      }}
                    >
                      {/* Question label */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          style={{
                            fontSize: "11px",
                            color: "#9AA7B2",
                            fontWeight: 500,
                          }}
                        >
                          {answer.questionText}
                        </span>

                        {/* Jump-to link */}
                        <button
                          onClick={() => handleJump(answer.questionIndex)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          style={{
                            fontSize: "10px",
                            color: "#C4A96A",
                            background: "none",
                            border: "none",
                            padding: "2px 6px",
                          }}
                          title={`Jump to Q${answer.questionIndex + 1}`}
                        >
                          Edit
                        </button>
                      </div>

                      {/* Answer text */}
                      <p
                        style={{
                          fontSize: "14px",
                          color: "#e2e8f0",
                          lineHeight: 1.7,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {answer.answerText}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end px-6 py-3 shrink-0"
          style={{
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer"
            style={{
              background: "rgba(196, 169, 106, 0.1)",
              border: "1px solid rgba(196, 169, 106, 0.2)",
              color: "#C4A96A",
            }}
          >
            Back to Studio
          </button>
        </div>
      </div>
    </div>
  );
}
