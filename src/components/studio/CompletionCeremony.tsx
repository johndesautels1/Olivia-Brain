"use client";

/**
 * CompletionCeremony — Full-document completion celebration overlay.
 *
 * Triggers when a document reaches 100% completion. Shows a dramatic
 * cinematic sequence:
 * 1. Screen dims, gold confetti particles rain down
 * 2. Gold wax-seal icon pulses into view
 * 3. Document title + "Complete" label fade in
 * 4. Final score reveal with tier-colored ring
 * 5. Session stats (time spent, questions answered)
 * 6. Action buttons: Review Answers / Continue to Next Document
 *
 * Design spec:
 * - Full-screen overlay with dark backdrop
 * - Gold confetti: 20-30 particles, various sizes, slow fall
 * - Wax seal: 80px, brand gold #C4A96A, radial glow
 * - Score ring: animated fill, 5-color tier
 * - Staggered entrance animations (200ms intervals)
 */

import React, { useEffect, useState, useMemo } from "react";

interface CompletionCeremonyProps {
  isOpen: boolean;
  documentTitle: string;
  completionPct: number;
  tierColor: string;
  totalQuestions: number;
  /** Elapsed session time in seconds */
  sessionSeconds: number;
  onReviewAnswers: () => void;
  onNextDocument: () => void;
  onClose: () => void;
}

// ── Confetti particle type ────────────────────────────────────────────

interface ConfettiParticle {
  id: number;
  x: number;
  size: number;
  delay: number;
  duration: number;
  rotation: number;
  opacity: number;
}

function generateConfetti(count: number): ConfettiParticle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    size: 3 + Math.random() * 5,
    delay: Math.random() * 1500,
    duration: 2000 + Math.random() * 2000,
    rotation: Math.random() * 360,
    opacity: 0.4 + Math.random() * 0.5,
  }));
}

// ── Format time helper ────────────────────────────────────────────────

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

// ── Main Component ────────────────────────────────────────────────────

export function CompletionCeremony({
  isOpen,
  documentTitle,
  completionPct,
  tierColor,
  totalQuestions,
  sessionSeconds,
  onReviewAnswers,
  onNextDocument,
  onClose,
}: CompletionCeremonyProps) {
  const [stage, setStage] = useState(0); // 0=hidden, 1=confetti, 2=seal, 3=title, 4=score, 5=actions

  const confetti = useMemo(() => generateConfetti(24), []);

  // Staggered entrance sequence
  useEffect(() => {
    if (!isOpen) {
      setStage(0);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setStage(1), 100));   // confetti starts
    timers.push(setTimeout(() => setStage(2), 400));   // seal appears
    timers.push(setTimeout(() => setStage(3), 800));   // title fades in
    timers.push(setTimeout(() => setStage(4), 1200));  // score reveals
    timers.push(setTimeout(() => setStage(5), 1600));  // actions appear

    return () => timers.forEach(clearTimeout);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center px-4"
      style={{
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(8px)",
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Document completion celebration"
    >
      {/* Inline keyframes */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes studio-confetti-fall {
              0% {
                opacity: var(--confetti-opacity);
                transform: translateY(-20px) rotate(0deg);
              }
              100% {
                opacity: 0;
                transform: translateY(100vh) rotate(720deg);
              }
            }
            @keyframes studio-seal-pulse {
              0% { transform: scale(0.3); opacity: 0; }
              60% { transform: scale(1.08); opacity: 1; }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes studio-ceremony-fade-up {
              0% { opacity: 0; transform: translateY(12px); }
              100% { opacity: 1; transform: translateY(0); }
            }
            @keyframes studio-score-ring {
              0% { stroke-dashoffset: 283; }
              100% { stroke-dashoffset: var(--ring-offset); }
            }
          `,
        }}
      />

      {/* Confetti particles */}
      {stage >= 1 &&
        confetti.map((p) => (
          <div
            key={p.id}
            style={{
              position: "fixed",
              left: `${p.x}%`,
              top: "-10px",
              width: `${p.size}px`,
              height: `${p.size}px`,
              borderRadius: p.id % 3 === 0 ? "50%" : "1px",
              background: p.id % 2 === 0 ? "#C4A96A" : "#d4b97a",
              ["--confetti-opacity" as string]: p.opacity,
              animation: `studio-confetti-fall ${p.duration}ms linear ${p.delay}ms forwards`,
              pointerEvents: "none",
            }}
          />
        ))}

      {/* Center card */}
      <div
        className="w-full max-w-sm rounded-2xl p-8 text-center"
        style={{
          background: "rgba(15, 18, 25, 0.95)",
          border: "1px solid rgba(196, 169, 106, 0.15)",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.5), 0 0 40px rgba(196, 169, 106, 0.08)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gold wax seal icon */}
        {stage >= 2 && (
          <div
            className="flex justify-center mb-5"
            style={{ animation: "studio-seal-pulse 600ms ease-out forwards" }}
          >
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: "80px",
                height: "80px",
                background: "radial-gradient(circle at 40% 40%, #d4b97a, #C4A96A, #a08a50)",
                boxShadow: "0 0 24px rgba(196, 169, 106, 0.4), 0 0 48px rgba(196, 169, 106, 0.15)",
              }}
            >
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0a0e1a"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
        )}

        {/* Document title + "Complete" */}
        {stage >= 3 && (
          <div style={{ animation: "studio-ceremony-fade-up 400ms ease-out forwards" }}>
            <p
              className="uppercase tracking-wide mb-1"
              style={{ fontSize: "10px", color: "#C4A96A", letterSpacing: "0.12em" }}
            >
              Document Complete
            </p>
            <h2
              className="font-semibold mb-4"
              style={{ fontSize: "20px", color: "#e2e8f0", lineHeight: 1.3 }}
            >
              {documentTitle}
            </h2>
          </div>
        )}

        {/* Score ring */}
        {stage >= 4 && (
          <div
            className="flex justify-center mb-4"
            style={{ animation: "studio-ceremony-fade-up 400ms ease-out forwards" }}
          >
            <div className="relative" style={{ width: "100px", height: "100px" }}>
              <svg width="100" height="100" viewBox="0 0 100 100">
                {/* Background ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.06)"
                  strokeWidth="6"
                />
                {/* Progress ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke={tierColor}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray="283"
                  style={{
                    ["--ring-offset" as string]: `${283 - (283 * completionPct) / 100}`,
                    animation: "studio-score-ring 1200ms ease-out forwards",
                    transformOrigin: "center",
                    transform: "rotate(-90deg)",
                  }}
                />
              </svg>
              {/* Percentage text */}
              <div
                className="absolute inset-0 flex items-center justify-center"
              >
                <span
                  className="font-bold tabular-nums"
                  style={{ fontSize: "24px", color: tierColor }}
                >
                  {completionPct}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Session stats */}
        {stage >= 4 && (
          <div
            className="flex items-center justify-center gap-4 mb-6"
            style={{ animation: "studio-ceremony-fade-up 400ms ease-out 200ms forwards", opacity: 0 }}
          >
            <div className="text-center">
              <p style={{ fontSize: "18px", fontWeight: 600, color: "#e2e8f0" }}>
                {totalQuestions}
              </p>
              <p style={{ fontSize: "10px", color: "#9AA7B2", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Questions
              </p>
            </div>
            <div
              style={{ width: "1px", height: "28px", background: "rgba(255, 255, 255, 0.08)" }}
            />
            <div className="text-center">
              <p style={{ fontSize: "18px", fontWeight: 600, color: "#e2e8f0" }}>
                {formatTime(sessionSeconds)}
              </p>
              <p style={{ fontSize: "10px", color: "#9AA7B2", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Time Spent
              </p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {stage >= 5 && (
          <div
            className="space-y-2"
            style={{ animation: "studio-ceremony-fade-up 400ms ease-out forwards" }}
          >
            <button
              onClick={onReviewAnswers}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all cursor-pointer"
              style={{
                background: "rgba(196, 169, 106, 0.12)",
                border: "1px solid rgba(196, 169, 106, 0.25)",
                color: "#C4A96A",
                minHeight: "44px",
              }}
            >
              Review Answers
            </button>

            <button
              onClick={onNextDocument}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all cursor-pointer"
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                color: "#9AA7B2",
                minHeight: "44px",
              }}
            >
              Continue to Next Document
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
        )}
      </div>
    </div>
  );
}
