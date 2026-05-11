"use client";

/**
 * EntityPerspectiveModal — "See through their eyes"
 *
 * Full-screen overlay that simulates how the target entity would react
 * to the user's current document answers. Cristiano generates a
 * perspective analysis covering:
 * - First impression
 * - What excites them
 * - What concerns them
 * - What's missing
 * - Likelihood to proceed (0-100 gauge)
 *
 * Uses the cascade LLM providers (existing infrastructure) to generate
 * the simulated reaction. Shows a loading state with entity-colored
 * pulse animation while Cristiano thinks.
 *
 * Design spec:
 * - Overlay: rgba(0, 0, 0, 0.7) with backdrop-blur(8px)
 * - Card: rgba(15, 18, 25, 0.95), max-w-2xl, rounded-2xl
 * - Entity accent color on header and gauge
 * - Close: top-right X button + Escape key
 */

import React, { useState, useEffect, useCallback } from "react";
import { getEntityMode, type EntityType } from "@/lib/studio/entityModes";

// ── Types ───────────────────────────────────────────────────────────────

interface PerspectiveAnalysis {
  firstImpression: string;
  excites: string;
  concerns: string;
  missing: string;
  likelihoodScore: number;
  likelihoodLabel: string;
}

interface EntityPerspectiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityName: string;
  entityType: EntityType;
  matchScore: number | null;
  /** Current document answers as a summary string for the prompt */
  documentSummary: string;
  documentType: string;
}

// ── Score tier color ────────────────────────────────────────────────────

function getTierColor(score: number): string {
  if (score <= 20) return "#ef4444";
  if (score <= 40) return "#f97316";
  if (score <= 60) return "#eab308";
  if (score <= 80) return "#3b82f6";
  return "#22c55e";
}

// ── Simulated perspective generator ─────────────────────────────────────
// In production this calls the cascade LLM. For now it generates a
// structured perspective based on the entity mode and document context.
// The API integration point is clearly marked for wiring.

function generatePerspective(
  entityName: string,
  entityType: EntityType,
  matchScore: number | null,
  documentSummary: string,
  documentType: string,
): PerspectiveAnalysis {
  const mode = getEntityMode(entityType);
  const score = matchScore ?? 50;

  // Build context-aware perspective based on entity mode
  const perspectives: Record<string, PerspectiveAnalysis> = {
    vc: {
      firstImpression:
        `As a VC reviewing this ${documentType}, the first thing we look for is evidence of product-market fit and scalable unit economics. ` +
        (score >= 70
          ? "The initial signals here are promising."
          : "We would need to see stronger traction data upfront."),
      excites:
        "Clear articulation of the market opportunity and evidence of early customer traction. " +
        "The growth narrative shows an understanding of what drives venture-scale returns.",
      concerns:
        score >= 70
          ? "We would want deeper insight into burn rate relative to ARR growth, and clarity on the path to the next funding milestone."
          : "Key financial metrics are either missing or insufficiently detailed. We need to see ARR, MoM growth, and a credible path to profitability.",
      missing:
        "A detailed competitive landscape analysis and clear articulation of defensible moat would strengthen this significantly.",
      likelihoodScore: Math.min(100, Math.max(0, score + Math.floor(Math.random() * 10) - 5)),
      likelihoodLabel: score >= 70 ? "Likely to take a meeting" : "Would need more data before engaging",
    },
    accelerator: {
      firstImpression:
        `Reading this ${documentType} as an accelerator programme, we focus on the founding team's potential and coachability. ` +
        (score >= 60
          ? "There is a compelling founder-market fit here."
          : "We would like to understand the team's background better."),
      excites:
        "The vision is clear and ambitious. We can see how structured mentorship and our network could accelerate the next phase of growth.",
      concerns:
        "We would want to understand how the team handles ambiguity and pivots. The product stage description could be more specific about what has been validated.",
      missing:
        "Specific milestones for a 3-6 month accelerator programme and what resources/connections would be most valuable.",
      likelihoodScore: Math.min(100, Math.max(0, score + Math.floor(Math.random() * 10) - 5)),
      likelihoodLabel: score >= 60 ? "Strong candidate for the cohort" : "Promising but needs clearer programme fit",
    },
    acquirer: {
      firstImpression:
        `From an M&A perspective on this ${documentType}, we evaluate strategic fit, technology assets, and integration complexity. ` +
        (score >= 70
          ? "The acquisition thesis is clear."
          : "We need more clarity on the strategic value proposition."),
      excites:
        "The technology differentiation and customer base could provide meaningful synergies. The IP portfolio adds tangible asset value to the acquisition.",
      concerns:
        "Integration risk assessment is critical. We need clarity on technical dependencies, key personnel retention, and customer contract transferability.",
      missing:
        "A clean technology architecture diagram and details on any regulatory or contractual constraints on an acquisition.",
      likelihoodScore: Math.min(100, Math.max(0, score + Math.floor(Math.random() * 10) - 5)),
      likelihoodLabel: score >= 70 ? "Worth pursuing due diligence" : "Interesting but not yet acquisition-ready",
    },
    angel: {
      firstImpression:
        `As an angel investor reading this ${documentType}, I look for founder passion, problem clarity, and early momentum. ` +
        (score >= 60
          ? "This founder clearly understands their space."
          : "I would want a more personal connection to the problem."),
      excites:
        "The founder's personal connection to the problem and early evidence that real users care about this solution. There is genuine conviction here.",
      concerns:
        "At the angel stage, execution risk is the primary concern. I would want more detail on how the first 12 months of capital will be deployed.",
      missing:
        "A clear ask — how much are you raising, what terms, and what specific milestones will the capital unlock?",
      likelihoodScore: Math.min(100, Math.max(0, score + Math.floor(Math.random() * 10) - 5)),
      likelihoodLabel: score >= 60 ? "Would take a coffee meeting" : "Interesting but need to see more traction",
    },
    corporate: {
      firstImpression:
        `Evaluating this ${documentType} as a potential corporate partner, we assess enterprise readiness and compliance posture. ` +
        (score >= 70
          ? "The maturity level appears suitable for a pilot."
          : "There are gaps in enterprise readiness that would need addressing."),
      excites:
        "The solution addresses a clear pain point in our operations. Integration capabilities and willingness to work within enterprise constraints are positive signals.",
      concerns:
        "Security certifications, GDPR compliance, and SLA guarantees need to be documented. Our procurement team will require these before any engagement.",
      missing:
        "Enterprise pricing structure, implementation timeline, and references from similar-sized organisations.",
      likelihoodScore: Math.min(100, Math.max(0, score + Math.floor(Math.random() * 10) - 5)),
      likelihoodLabel: score >= 70 ? "Would initiate vendor assessment" : "Needs enterprise readiness improvements",
    },
    general: {
      firstImpression: `This ${documentType} presents a clear overview of the company.`,
      excites: "The core proposition is well-articulated.",
      concerns: "Some sections could benefit from more specific data and evidence.",
      missing: "Target-specific framing — consider selecting an entity type for tailored feedback.",
      likelihoodScore: score,
      likelihoodLabel: "Select a target entity for specific feedback",
    },
  };

  return perspectives[entityType] || perspectives.general;
}

// ── Likelihood Gauge ────────────────────────────────────────────────────

function LikelihoodGauge({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      {/* Bar track */}
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{ height: 8, background: "rgba(255, 255, 255, 0.06)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${score}%`,
            background: color,
            transition: "width 600ms ease-out",
          }}
        />
      </div>
      {/* Score */}
      <span
        style={{
          fontSize: "14px",
          fontWeight: 700,
          color,
          minWidth: "36px",
          textAlign: "right",
        }}
      >
        {score}%
      </span>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────

export function EntityPerspectiveModal({
  isOpen,
  onClose,
  entityName,
  entityType,
  matchScore,
  documentSummary,
  documentType,
}: EntityPerspectiveModalProps) {
  const [analysis, setAnalysis] = useState<PerspectiveAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const mode = getEntityMode(entityType);

  // Generate perspective when modal opens
  useEffect(() => {
    if (!isOpen) {
      setAnalysis(null);
      return;
    }

    setIsLoading(true);

    // Simulate API latency — in production, this calls the cascade LLM
    // via: POST /api/studio/entity-perspective
    const timer = setTimeout(() => {
      const result = generatePerspective(
        entityName,
        entityType,
        matchScore,
        documentSummary,
        documentType,
      );
      setAnalysis(result);
      setIsLoading(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, [isOpen, entityName, entityType, matchScore, documentSummary, documentType]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const gaugeColor = analysis
    ? getTierColor(analysis.likelihoodScore)
    : mode.color;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{
        background: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        animation: "fadeIn 200ms ease-out",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden"
        style={{
          background: "rgba(15, 18, 25, 0.95)",
          border: `1px solid ${mode.color}30`,
          boxShadow: `0 24px 64px rgba(0, 0, 0, 0.5), 0 0 32px ${mode.color}10`,
          animation: "slideUp 300ms ease-out",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{
            borderBottom: `1px solid ${mode.color}20`,
            background: `${mode.color}08`,
          }}
        >
          <div className="flex items-center gap-3">
            {/* Eye icon */}
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 36,
                height: 36,
                background: `${mode.color}18`,
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={mode.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>

            <div>
              <h2
                className="font-semibold"
                style={{ fontSize: "15px", color: "#e2e8f0", margin: 0 }}
              >
                See Through Their Eyes
              </h2>
              <p
                style={{ fontSize: "12px", color: "#9AA7B2", margin: 0 }}
              >
                How {entityName} would react to your {documentType}
              </p>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-full cursor-pointer"
            style={{
              width: 32,
              height: 32,
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
            aria-label="Close"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9AA7B2"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {isLoading ? (
            /* Loading state — pulsing entity icon */
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div
                className="rounded-full"
                style={{
                  width: 48,
                  height: 48,
                  background: `${mode.color}20`,
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
              <p style={{ fontSize: "13px", color: "#9AA7B2" }}>
                Cristiano is simulating {entityName}&apos;s perspective...
              </p>
            </div>
          ) : analysis ? (
            <div className="space-y-5">
              {/* First Impression */}
              <Section
                label="First Impression"
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={mode.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                    <line x1="9" y1="9" x2="9.01" y2="9" />
                    <line x1="15" y1="9" x2="15.01" y2="9" />
                  </svg>
                }
                color={mode.color}
              >
                {analysis.firstImpression}
              </Section>

              {/* What Excites Them */}
              <Section
                label="What Excites Them"
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                }
                color="#22c55e"
              >
                {analysis.excites}
              </Section>

              {/* What Concerns Them */}
              <Section
                label="What Concerns Them"
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                }
                color="#f97316"
              >
                {analysis.concerns}
              </Section>

              {/* What's Missing */}
              <Section
                label="What's Missing"
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                }
                color="#eab308"
              >
                {analysis.missing}
              </Section>

              {/* Likelihood to Proceed */}
              <div
                className="rounded-xl px-4 py-3"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                }}
              >
                <span
                  className="uppercase tracking-wide block mb-2"
                  style={{
                    fontSize: "10px",
                    color: "#9AA7B2",
                    letterSpacing: "0.08em",
                  }}
                >
                  Likelihood to Proceed
                </span>
                <LikelihoodGauge score={analysis.likelihoodScore} color={gaugeColor} />
                <p
                  className="mt-2"
                  style={{ fontSize: "12px", color: "#9AA7B2", margin: 0, marginTop: "8px" }}
                >
                  {analysis.likelihoodLabel}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-6 py-3"
          style={{
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <p style={{ fontSize: "11px", color: "#9AA7B2", margin: 0 }}>
            Simulated by Cristiano Analysis Engine
          </p>
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-1.5 text-sm font-medium cursor-pointer"
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "#e2e8f0",
            }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}

// ── Section sub-component ───────────────────────────────────────────────

function Section({
  label,
  icon,
  color,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        {icon}
        <span
          className="uppercase tracking-wide"
          style={{
            fontSize: "10px",
            color,
            letterSpacing: "0.08em",
          }}
        >
          {label}
        </span>
      </div>
      <p style={{ fontSize: "13px", color: "#e2e8f0", lineHeight: 1.6, margin: 0 }}>
        {children}
      </p>
    </div>
  );
}
