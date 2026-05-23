"use client";

/**
 * CristianoReEvaluation — Cinematic re-evaluation theater for the Preparation Studio.
 *
 * Full-screen experience after document submission. Combines Ideas #55 + #56:
 *
 * Phase 1 (Analyzing): Screen dims, Cristiano avatar pulses, 4 progress lanes
 *   animate as Cristiano "reads" the document (simulated 6-8s delay).
 *
 * Phase 2 (Results): Top-3 entity cards appear with match score deltas,
 *   Cristiano's narrative synthesis, and next-step actions.
 *
 * Design spec:
 * - Full-screen overlay, deep navy backdrop
 * - Progress lanes: 4 vertical bars representing analysis phases
 *   (Parsing → Scoring → Ranking → Synthesis)
 * - Entity cards: glassmorphic, shows entity name, type, match score, delta
 * - Cristiano avatar: 64px circle, brand gold ring, pulse animation
 * - Narrative box: italic serif-feel text, gold accent border
 */

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";

import {
  OliviaVideoAvatar,
  type OliviaVideoAvatarRef,
} from "@/components/olivia/OliviaVideoAvatar";

// ── Types ─────────────────────────────────────────────────────────────

interface EntityResult {
  name: string;
  entityType: string;
  matchScore: number;
  previousScore: number | null;
  logoUrl?: string;
}

interface CristianoReEvaluationProps {
  isOpen: boolean;
  documentTitle: string;
  documentType: string;
  /** Called when the user dismisses the re-evaluation screen */
  onClose: () => void;
  /** Called when user wants to go back to the studio */
  onBackToStudio: () => void;
  /** Called when user wants to open a package */
  onCreatePackage?: () => void;
}

// ── Analysis phases ───────────────────────────────────────────────────

const ANALYSIS_PHASES = [
  { label: "Parsing", description: "Reading your answers..." },
  { label: "Scoring", description: "Evaluating quality signals..." },
  { label: "Ranking", description: "Comparing against targets..." },
  { label: "Synthesis", description: "Generating recommendations..." },
];

// ── Simulated entity results (will be replaced by real API) ──────────

function generateMockResults(): EntityResult[] {
  const entities: EntityResult[] = [
    {
      name: "Sequoia Capital",
      entityType: "vc",
      matchScore: 87,
      previousScore: 72,
    },
    {
      name: "Techstars London",
      entityType: "accelerator",
      matchScore: 81,
      previousScore: 78,
    },
    {
      name: "Index Ventures",
      entityType: "vc",
      matchScore: 76,
      previousScore: 68,
    },
  ];
  return entities;
}

// ── Entity type label ─────────────────────────────────────────────────

function entityTypeLabel(type: string): string {
  const map: Record<string, string> = {
    vc: "Venture Capital",
    accelerator: "Accelerator",
    acquirer: "Acquirer",
    angel: "Angel Investor",
    corporate: "Corporate VC",
  };
  return map[type] || type;
}

// ── Tier color from score ─────────────────────────────────────────────

function tierColor(score: number): string {
  if (score >= 81) return "#22c55e";
  if (score >= 61) return "#3b82f6";
  if (score >= 41) return "#eab308";
  if (score >= 21) return "#f97316";
  return "#ef4444";
}

// ── Main Component ────────────────────────────────────────────────────

export function CristianoReEvaluation({
  isOpen,
  documentTitle,
  documentType,
  onClose,
  onBackToStudio,
  onCreatePackage,
}: CristianoReEvaluationProps) {
  // Phase: 0=entering, 1-4=analysis lanes, 5=results
  const [phase, setPhase] = useState(0);
  const [activeLane, setActiveLane] = useState(-1);
  const [results, setResults] = useState<EntityResult[]>([]);
  const [narrative, setNarrative] = useState("");
  const [showResults, setShowResults] = useState(false);

  // Cinematic LiveAvatar mount — Cristiano renders through the same
  // LiveAvatar LITE pipeline as Olivia (one wire, two personas; see
  // src/lib/avatar/personas.ts). Pre-connect during the analysis
  // animation so by the time the narrative is set at phase 5 the
  // avatar is ready and the verdict speaks immediately rather than
  // making the user watch a 2-5s session-create after the entity cards
  // have already settled.
  const avatarRef = useRef<OliviaVideoAvatarRef | null>(null);

  // ── Analysis sequence ───────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) {
      setPhase(0);
      setActiveLane(-1);
      setResults([]);
      setNarrative("");
      setShowResults(false);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Start analysis
    timers.push(setTimeout(() => { setPhase(1); setActiveLane(0); }, 500));
    timers.push(setTimeout(() => { setActiveLane(1); }, 2000));
    timers.push(setTimeout(() => { setActiveLane(2); }, 3500));
    timers.push(setTimeout(() => { setActiveLane(3); }, 5000));

    // Generate results
    timers.push(
      setTimeout(() => {
        setPhase(5);
        setResults(generateMockResults());
        setNarrative(
          `Based on your updated ${documentType.toLowerCase()}, I've re-ranked your target list. ` +
          `Your answers significantly strengthened alignment with growth-stage VCs, ` +
          `particularly around market sizing and competitive positioning. ` +
          `Sequoia Capital moved up 15 points — your traction metrics were compelling.`
        );
      }, 6500)
    );

    // Reveal results with slight delay
    timers.push(setTimeout(() => setShowResults(true), 7000));

    return () => timers.forEach(clearTimeout);
  }, [isOpen, documentType]);

  // ── Pre-connect Cristiano LiveAvatar during analysis ───────────────
  // Fired once when the dialog opens. The avatar handle's `connect()`
  // is idempotent (returns the in-flight promise on a second call) so
  // calling here is safe even if the user toggles the dialog quickly.
  // Errors surface inside the avatar component's own overlay (visible
  // when `hideOverlays={false}`, which is the default below).
  useEffect(() => {
    if (!isOpen) return;
    void avatarRef.current?.connect();
  }, [isOpen]);

  // Disconnect the avatar when the dialog closes so credits don't keep
  // draining on a hidden session. LiveAvatar's idle timeout would catch
  // this in ~5 minutes anyway but explicit disconnect is the better
  // citizen behavior (see HEYGEN_LTM_CONFIG.md §12, item 7).
  useEffect(() => {
    if (isOpen) return;
    avatarRef.current?.disconnect();
  }, [isOpen]);

  // ── Score delta display ─────────────────────────────────────────────

  const renderDelta = useCallback((current: number, previous: number | null) => {
    if (previous === null) return null;
    const delta = current - previous;
    if (delta === 0) return null;
    const isPositive = delta > 0;
    return (
      <span
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color: isPositive ? "#22c55e" : "#ef4444",
        }}
      >
        {isPositive ? "+" : ""}{delta}
      </span>
    );
  }, []);

  if (!isOpen) return null;

  const isAnalyzing = phase < 5;

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center px-4"
      style={{
        background: "rgba(5, 8, 15, 0.92)",
        backdropFilter: "blur(12px)",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Cristiano re-evaluation"
    >
      {/* Inline keyframes */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes studio-cristiano-pulse {
              0%, 100% { box-shadow: 0 0 12px rgba(196, 169, 106, 0.2); }
              50% { box-shadow: 0 0 24px rgba(196, 169, 106, 0.5); }
            }
            @keyframes studio-lane-fill {
              0% { height: 0%; }
              100% { height: 100%; }
            }
            @keyframes studio-result-enter {
              0% { opacity: 0; transform: translateY(16px); }
              100% { opacity: 1; transform: translateY(0); }
            }
            @keyframes studio-narrative-fade {
              0% { opacity: 0; }
              100% { opacity: 1; }
            }
          `,
        }}
      />

      <div
        className="w-full max-w-2xl rounded-2xl p-8"
        style={{
          background: "rgba(15, 18, 25, 0.95)",
          border: "1px solid rgba(196, 169, 106, 0.1)",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.5), 0 0 40px rgba(196, 169, 106, 0.05)",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        {/* ── Header: Cristiano avatar + title ─────────────────────── */}
        <div className="flex items-center gap-4 mb-6">
          {/* Cristiano avatar circle */}
          <div
            className="shrink-0 flex items-center justify-center rounded-full"
            style={{
              width: "56px",
              height: "56px",
              background: "radial-gradient(circle at 40% 40%, #d4b97a, #C4A96A, #a08a50)",
              animation: isAnalyzing
                ? "studio-cristiano-pulse 1.5s ease-in-out infinite"
                : "none",
              boxShadow: "0 0 12px rgba(196, 169, 106, 0.2)",
            }}
          >
            <span
              style={{
                fontSize: "22px",
                fontWeight: 700,
                color: "#0a0e1a",
              }}
            >
              C
            </span>
          </div>

          <div>
            <h2
              className="font-semibold"
              style={{ fontSize: "18px", color: "#e2e8f0" }}
            >
              {isAnalyzing ? "Cristiano is analyzing..." : "Re-evaluation Complete"}
            </h2>
            <p style={{ fontSize: "12px", color: "#9AA7B2" }}>
              {documentTitle}
            </p>
          </div>

          {/* Close button (only when results shown) */}
          {!isAnalyzing && (
            <button
              onClick={onClose}
              className="ml-auto rounded-lg p-1.5 transition-all cursor-pointer"
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
          )}
        </div>

        {/* ── Analysis Progress Lanes ──────────────────────────────── */}
        {isAnalyzing && (
          <div className="mb-8">
            <div className="flex items-end gap-3 justify-center" style={{ height: "120px" }}>
              {ANALYSIS_PHASES.map((p, i) => {
                const isActive = i <= activeLane;
                const isCurrent = i === activeLane;
                return (
                  <div key={p.label} className="flex flex-col items-center gap-2">
                    {/* Lane bar */}
                    <div
                      className="rounded-full overflow-hidden"
                      style={{
                        width: "28px",
                        height: "80px",
                        background: "rgba(255, 255, 255, 0.04)",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          right: 0,
                          background: isActive
                            ? "linear-gradient(to top, #C4A96A, #d4b97a)"
                            : "transparent",
                          borderRadius: "inherit",
                          height: isActive ? "100%" : "0%",
                          transition: "height 1.2s ease-out",
                          ...(isCurrent
                            ? {
                                boxShadow: "0 0 8px rgba(196, 169, 106, 0.3)",
                              }
                            : {}),
                        }}
                      />
                    </div>
                    {/* Label */}
                    <span
                      style={{
                        fontSize: "10px",
                        color: isActive ? "#C4A96A" : "rgba(255, 255, 255, 0.2)",
                        fontWeight: isCurrent ? 600 : 400,
                        textAlign: "center",
                        width: "60px",
                        transition: "color 400ms ease",
                      }}
                    >
                      {p.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Current phase description */}
            <p
              className="text-center mt-4"
              style={{
                fontSize: "13px",
                color: "#9AA7B2",
                fontStyle: "italic",
              }}
            >
              {activeLane >= 0 && activeLane < ANALYSIS_PHASES.length
                ? ANALYSIS_PHASES[activeLane].description
                : "Preparing..."}
            </p>
          </div>
        )}

        {/* ── Results Section ──────────────────────────────────────── */}
        {showResults && (
          <>
            {/* Cinematic verdict — Cristiano speaks the narrative live.
                The OliviaVideoAvatar `lastReply` effect picks up the
                narrative string and dispatches it through the
                LiveAvatar LITE pipeline (server resolves Cristiano's
                avatar id + voice id via personaId="cristiano").
                Below the video, the narrative text remains rendered as
                an accessibility fallback for users with audio muted or
                voice unavailable (see HEYGEN_LTM_CONFIG.md §11 on the
                ElevenLabs fallback path — text-only is the safety net). */}
            <div
              className="rounded-xl overflow-hidden mb-4"
              style={{
                border: "1px solid rgba(196, 169, 106, 0.18)",
                animation: "studio-narrative-fade 600ms ease-out forwards",
              }}
            >
              <OliviaVideoAvatar
                ref={avatarRef}
                personaId="cristiano"
                lastReply={narrative}
                onSpeakError={(reason) => {
                  // stream_aborted is benign (newer reply pre-empted
                  // an older one); the other two indicate the user is
                  // seeing the avatar without audio — log + leave the
                  // narrative text below as the readable fallback.
                  if (reason !== "stream_aborted") {
                    console.warn(
                      `[CristianoReEvaluation] avatar speak unavailable: ${reason}`,
                    );
                  }
                }}
              />
            </div>

            {/* Cristiano's narrative — text fallback + accessibility */}
            <div
              className="rounded-xl px-5 py-4 mb-6"
              style={{
                background: "rgba(196, 169, 106, 0.04)",
                borderLeft: "3px solid rgba(196, 169, 106, 0.3)",
                animation: "studio-narrative-fade 600ms ease-out forwards",
              }}
              role="region"
              aria-label="Cristiano's verdict"
            >
              <p
                style={{
                  fontSize: "14px",
                  color: "#d4d4d8",
                  lineHeight: 1.6,
                  fontStyle: "italic",
                }}
              >
                &ldquo;{narrative}&rdquo;
              </p>
              <p
                className="mt-2"
                style={{ fontSize: "11px", color: "#C4A96A", fontWeight: 600 }}
              >
                — Cristiano, Investment Analyst
              </p>
            </div>

            {/* Top-3 Entity Cards */}
            <div className="space-y-3 mb-6">
              <p
                className="uppercase tracking-wide mb-2"
                style={{ fontSize: "10px", color: "#9AA7B2", letterSpacing: "0.1em" }}
              >
                Updated Rankings
              </p>

              {results.map((entity, i) => {
                const color = tierColor(entity.matchScore);
                return (
                  <div
                    key={entity.name}
                    className="flex items-center gap-4 rounded-xl px-4 py-3"
                    style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                      animation: `studio-result-enter 400ms ease-out ${i * 150}ms forwards`,
                      opacity: 0,
                    }}
                  >
                    {/* Rank number */}
                    <span
                      className="shrink-0 flex items-center justify-center rounded-full"
                      style={{
                        width: "28px",
                        height: "28px",
                        background: i === 0
                          ? "rgba(196, 169, 106, 0.12)"
                          : "rgba(255, 255, 255, 0.04)",
                        border: `1px solid ${
                          i === 0 ? "rgba(196, 169, 106, 0.2)" : "rgba(255, 255, 255, 0.06)"
                        }`,
                        fontSize: "12px",
                        fontWeight: 700,
                        color: i === 0 ? "#C4A96A" : "#9AA7B2",
                      }}
                    >
                      {i + 1}
                    </span>

                    {/* Entity info */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-semibold truncate"
                        style={{ fontSize: "14px", color: "#e2e8f0" }}
                      >
                        {entity.name}
                      </p>
                      <p
                        style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.3)" }}
                      >
                        {entityTypeLabel(entity.entityType)}
                      </p>
                    </div>

                    {/* Score + delta */}
                    <div className="shrink-0 flex items-center gap-2">
                      <span
                        className="font-bold tabular-nums"
                        style={{ fontSize: "20px", color }}
                      >
                        {entity.matchScore}
                      </span>
                      {renderDelta(entity.matchScore, entity.previousScore)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="space-y-2">
              {onCreatePackage && (
                <button
                  onClick={onCreatePackage}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all cursor-pointer"
                  style={{
                    background: "rgba(196, 169, 106, 0.15)",
                    border: "1px solid rgba(196, 169, 106, 0.3)",
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
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                  Create Package for Top Match
                </button>
              )}

              <button
                onClick={onBackToStudio}
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
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Back to Studio
              </button>

              <button
                onClick={onClose}
                className="w-full flex items-center justify-center rounded-xl py-2 text-xs transition-all cursor-pointer"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(255, 255, 255, 0.2)",
                  minHeight: "36px",
                }}
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
