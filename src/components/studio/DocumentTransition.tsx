"use client";

/**
 * DocumentTransition — "Breath moment" between documents in a package.
 *
 * Shown after completing one document before loading the next. Provides
 * a calming pause with:
 * - Summary of what was just completed (doc name + score)
 * - Preview of the next document (name + question count)
 * - Package progress indicator (e.g. "3 of 12 documents")
 * - Two actions: "Continue" (primary) or "Take a break" (secondary)
 * - Subtle breathing animation on the divider line
 *
 * Design spec:
 * - Full-screen overlay, softer than ceremony (rgba 0.65)
 * - Centered card, max-w-sm, minimal glassmorphic
 * - Breathing pulse: a horizontal line that gently scales in/out
 * - Staggered fade-in (completed → divider → next preview → actions)
 */

import React, { useEffect, useState } from "react";

interface DocumentTransitionProps {
  isOpen: boolean;
  /** Just-completed document */
  completedDocTitle: string;
  completedDocPct: number;
  completedTierColor: string;
  /** Next document in the package */
  nextDocTitle: string;
  nextDocQuestionCount: number;
  /** Package progress */
  currentDocIndex: number;
  totalDocsInPackage: number;
  onContinue: () => void;
  onTakeBreak: () => void;
}

// ── Main Component ────────────────────────────────────────────────────

export function DocumentTransition({
  isOpen,
  completedDocTitle,
  completedDocPct,
  completedTierColor,
  nextDocTitle,
  nextDocQuestionCount,
  currentDocIndex,
  totalDocsInPackage,
  onContinue,
  onTakeBreak,
}: DocumentTransitionProps) {
  const [stage, setStage] = useState(0); // 0=hidden, 1=completed, 2=divider, 3=next, 4=actions

  useEffect(() => {
    if (!isOpen) {
      setStage(0);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setStage(1), 200));
    timers.push(setTimeout(() => setStage(2), 600));
    timers.push(setTimeout(() => setStage(3), 1000));
    timers.push(setTimeout(() => setStage(4), 1400));

    return () => timers.forEach(clearTimeout);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center px-4"
      style={{
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(6px)",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Document transition"
    >
      {/* Inline keyframes */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes studio-transition-fade-up {
              0% { opacity: 0; transform: translateY(10px); }
              100% { opacity: 1; transform: translateY(0); }
            }
            @keyframes studio-breath-pulse {
              0%, 100% { transform: scaleX(0.6); opacity: 0.3; }
              50% { transform: scaleX(1); opacity: 0.6; }
            }
          `,
        }}
      />

      <div
        className="w-full max-w-sm rounded-2xl p-8 text-center"
        style={{
          background: "rgba(15, 18, 25, 0.95)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          boxShadow: "0 16px 48px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Package progress */}
        <p
          className="uppercase tracking-wide mb-6"
          style={{
            fontSize: "10px",
            color: "#9AA7B2",
            letterSpacing: "0.1em",
            opacity: stage >= 1 ? 1 : 0,
            transition: "opacity 400ms ease",
          }}
        >
          Document {currentDocIndex} of {totalDocsInPackage}
        </p>

        {/* Completed document summary */}
        {stage >= 1 && (
          <div style={{ animation: "studio-transition-fade-up 400ms ease-out forwards" }}>
            <p
              className="uppercase tracking-wide mb-1"
              style={{ fontSize: "10px", color: "#22c55e", letterSpacing: "0.08em" }}
            >
              Completed
            </p>
            <p
              className="font-semibold mb-1"
              style={{ fontSize: "16px", color: "#e2e8f0", lineHeight: 1.3 }}
            >
              {completedDocTitle}
            </p>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5"
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: completedTierColor,
                background: `${completedTierColor}12`,
                border: `1px solid ${completedTierColor}25`,
              }}
            >
              <span
                className="rounded-full"
                style={{ width: "5px", height: "5px", background: completedTierColor }}
              />
              {completedDocPct}%
            </span>
          </div>
        )}

        {/* Breathing divider */}
        {stage >= 2 && (
          <div className="flex justify-center my-6">
            <div
              style={{
                width: "80px",
                height: "1px",
                background: "linear-gradient(90deg, transparent, rgba(196, 169, 106, 0.4), transparent)",
                animation: "studio-breath-pulse 3s ease-in-out infinite",
              }}
            />
          </div>
        )}

        {/* Next document preview */}
        {stage >= 3 && (
          <div style={{ animation: "studio-transition-fade-up 400ms ease-out forwards" }}>
            <p
              className="uppercase tracking-wide mb-1"
              style={{ fontSize: "10px", color: "#C4A96A", letterSpacing: "0.08em" }}
            >
              Up Next
            </p>
            <p
              className="font-semibold mb-1"
              style={{ fontSize: "16px", color: "#e2e8f0", lineHeight: 1.3 }}
            >
              {nextDocTitle}
            </p>
            <p style={{ fontSize: "12px", color: "#9AA7B2" }}>
              {nextDocQuestionCount} question{nextDocQuestionCount !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        {/* Actions */}
        {stage >= 4 && (
          <div
            className="mt-8 space-y-2"
            style={{ animation: "studio-transition-fade-up 400ms ease-out forwards" }}
          >
            <button
              onClick={onContinue}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all cursor-pointer"
              style={{
                background: "rgba(196, 169, 106, 0.12)",
                border: "1px solid rgba(196, 169, 106, 0.25)",
                color: "#C4A96A",
                minHeight: "44px",
              }}
            >
              Continue
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
              onClick={onTakeBreak}
              className="w-full flex items-center justify-center rounded-xl py-2 text-xs transition-all cursor-pointer"
              style={{
                background: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                color: "rgba(255, 255, 255, 0.35)",
                minHeight: "36px",
              }}
            >
              Take a break
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
