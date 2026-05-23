"use client";

/**
 * WhyThisPanel — "Why this?" explainer for the Preparation Studio.
 *
 * Shows the evidence chain that led to a suggestion or question priority:
 *   DNA paragraph → DCF assumption → Entity thesis → Confidence score
 *
 * Collapsible panel triggered by a "?" icon on the question card.
 * Each step in the chain is a node with an icon, label, excerpt, and
 * a connecting vertical line between nodes.
 *
 * Design spec:
 * - Panel: glassmorphic card, slides down with 200ms ease
 * - Chain nodes: vertical connector line (gradient), origin-colored icons
 * - DNA node: gold, shows paragraph excerpt
 * - Valuation node: blue, shows DCF assumption
 * - Entity node: purple, shows thesis excerpt
 * - Confidence summary: bottom bar with blended score
 * - Collapse/expand toggle at top
 */

import React, { useState, useCallback } from "react";
import type { BayesianPrior, SuggestionSource } from "@/lib/studio/types";

// ── Props ────────────────────────────────────────────────────────────

interface WhyThisPanelProps {
  /** The question text this panel explains */
  questionText: string;
  /** Bayesian priors that inform this question's suggestions */
  priors: BayesianPrior[];
  /** DNA paragraphs for showing source excerpts */
  dnaParagraphs?: Record<string, string>;
  /** Overall blended confidence (0-100) */
  blendedConfidence: number;
}

// ── Chain node origin config ─────────────────────────────────────────

function originConfig(origin: SuggestionSource["origin"]): {
  color: string;
  bg: string;
  border: string;
  label: string;
} {
  switch (origin) {
    case "dna":
      return {
        color: "#C4A96A",
        bg: "rgba(196, 169, 106, 0.08)",
        border: "rgba(196, 169, 106, 0.15)",
        label: "DNA Analysis",
      };
    case "valuation":
      return {
        color: "#3b82f6",
        bg: "rgba(59, 130, 246, 0.08)",
        border: "rgba(59, 130, 246, 0.15)",
        label: "DCF Valuation",
      };
    case "entity":
      return {
        color: "#a78bfa",
        bg: "rgba(167, 139, 250, 0.08)",
        border: "rgba(167, 139, 250, 0.15)",
        label: "Entity Thesis",
      };
    case "cascade":
      return {
        color: "#22c55e",
        bg: "rgba(34, 197, 94, 0.08)",
        border: "rgba(34, 197, 94, 0.15)",
        label: "Cascade Pipeline",
      };
    case "user_prior":
      return {
        color: "#9AA7B2",
        bg: "rgba(154, 167, 178, 0.08)",
        border: "rgba(154, 167, 178, 0.15)",
        label: "Your Prior Answers",
      };
    default:
      return {
        color: "#9AA7B2",
        bg: "rgba(255, 255, 255, 0.04)",
        border: "rgba(255, 255, 255, 0.06)",
        label: "Unknown",
      };
  }
}

// ── Confidence tier color ────────────────────────────────────────────

function confidenceTierColor(c: number): string {
  if (c <= 20) return "#ef4444";
  if (c <= 40) return "#f97316";
  if (c <= 60) return "#eab308";
  if (c <= 80) return "#3b82f6";
  return "#22c55e";
}

function confidenceTierLabel(c: number): string {
  if (c <= 20) return "Very Limited";
  if (c <= 40) return "Limited";
  if (c <= 60) return "Moderate";
  if (c <= 80) return "Strong";
  return "Very Strong";
}

// ── Chain Node Component ─────────────────────────────────────────────

function ChainNode({
  prior,
  isLast,
  dnaParagraphs,
}: {
  prior: BayesianPrior;
  isLast: boolean;
  dnaParagraphs?: Record<string, string>;
}) {
  const config = originConfig(prior.source.origin);

  // Try to get DNA excerpt
  const excerpt =
    prior.source.origin === "dna" &&
    prior.source.refKey &&
    dnaParagraphs?.[prior.source.refKey]
      ? dnaParagraphs[prior.source.refKey]
      : null;

  const displayExcerpt = excerpt
    ? excerpt.length > 150
      ? excerpt.substring(0, 147) + "..."
      : excerpt
    : prior.priorValue.length > 150
      ? prior.priorValue.substring(0, 147) + "..."
      : prior.priorValue;

  return (
    <div className="relative flex gap-3">
      {/* Vertical connector line */}
      <div className="flex flex-col items-center shrink-0" style={{ width: "20px" }}>
        {/* Node dot */}
        <div
          className="rounded-full shrink-0"
          style={{
            width: "12px",
            height: "12px",
            background: config.bg,
            border: `2px solid ${config.color}`,
            marginTop: "4px",
          }}
        />
        {/* Connector line (hidden on last node) */}
        {!isLast && (
          <div
            className="flex-1"
            style={{
              width: "2px",
              background: `linear-gradient(to bottom, ${config.color}40, rgba(255,255,255,0.06))`,
              minHeight: "24px",
            }}
          />
        )}
      </div>

      {/* Node content */}
      <div className="flex-1 pb-4">
        {/* Header row */}
        <div className="flex items-center gap-2 mb-1">
          <span
            className="font-medium"
            style={{ fontSize: "12px", color: config.color }}
          >
            {config.label}
          </span>
          <span
            style={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.2)" }}
          >
            {prior.source.label}
          </span>
          {/* Weight indicator */}
          <span
            className="ml-auto rounded-full px-1.5 py-0.5"
            style={{
              fontSize: "9px",
              fontWeight: 700,
              color: config.color,
              background: config.bg,
              border: `1px solid ${config.border}`,
            }}
          >
            w:{prior.weight}
          </span>
        </div>

        {/* Excerpt */}
        <div
          className="rounded-lg px-3 py-2"
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.04)",
            fontSize: "12px",
            color: "#9AA7B2",
            lineHeight: 1.6,
          }}
        >
          {displayExcerpt || (
            <span style={{ fontStyle: "italic", color: "rgba(255,255,255,0.2)" }}>
              No excerpt available
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────

export function WhyThisPanel({
  questionText,
  priors,
  dnaParagraphs,
  blendedConfidence,
}: WhyThisPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const toggle = useCallback(() => setExpanded((prev) => !prev), []);

  const tierColor = confidenceTierColor(blendedConfidence);
  const tierLabel = confidenceTierLabel(blendedConfidence);

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(255, 255, 255, 0.04)",
        transition: "background-color 200ms ease, border-color 200ms ease, max-height 200ms ease, opacity 200ms ease",
      }}
    >
      {/* Toggle header */}
      <button
        onClick={toggle}
        className="w-full flex items-center gap-2 px-3 py-2 transition-all cursor-pointer"
        style={{ color: "rgba(255, 255, 255, 0.4)" }}
      >
        {/* ? icon */}
        <span
          className="flex items-center justify-center rounded-full shrink-0"
          style={{
            width: "18px",
            height: "18px",
            background: "rgba(196, 169, 106, 0.08)",
            border: "1px solid rgba(196, 169, 106, 0.15)",
            color: "#C4A96A",
            fontSize: "11px",
            fontWeight: 700,
          }}
        >
          ?
        </span>

        <span
          className="uppercase tracking-wide"
          style={{
            fontSize: "10px",
            letterSpacing: "0.08em",
            color: "rgba(255, 255, 255, 0.3)",
          }}
        >
          Why this question?
        </span>

        {/* Blended confidence badge */}
        <span
          className="flex items-center gap-1 ml-auto"
          style={{ fontSize: "10px" }}
        >
          <span
            className="rounded-full"
            style={{
              width: "6px",
              height: "6px",
              background: tierColor,
            }}
          />
          <span style={{ color: tierColor, fontWeight: 600 }}>
            {blendedConfidence}%
          </span>
          <span style={{ color: "rgba(255, 255, 255, 0.2)" }}>
            {tierLabel}
          </span>
        </span>

        {/* Chevron */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 transition-transform"
          style={{
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 200ms ease",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expanded evidence chain */}
      {expanded && (
        <div
          className="px-3 pb-3"
          style={{ borderTop: "1px solid rgba(255, 255, 255, 0.04)" }}
        >
          {/* Question context */}
          <p
            className="py-2 mb-2"
            style={{
              fontSize: "11px",
              color: "rgba(255, 255, 255, 0.25)",
              lineHeight: 1.5,
            }}
          >
            Evidence chain for: &ldquo;
            {questionText.length > 80
              ? questionText.substring(0, 77) + "..."
              : questionText}
            &rdquo;
          </p>

          {/* Chain nodes */}
          {priors.length > 0 ? (
            priors.map((prior, index) => (
              <ChainNode
                key={`${prior.source.origin}-${prior.fieldKey}-${index}`}
                prior={prior}
                isLast={index === priors.length - 1}
                dnaParagraphs={dnaParagraphs}
              />
            ))
          ) : (
            <div
              className="text-center py-4"
              style={{
                fontSize: "12px",
                color: "rgba(255, 255, 255, 0.2)",
                fontStyle: "italic",
              }}
            >
              No evidence chain available for this question yet.
              <br />
              <span style={{ fontSize: "11px" }}>
                Olivia will build context as you answer more questions.
              </span>
            </div>
          )}

          {/* Blended confidence summary bar */}
          {priors.length > 0 && (
            <div
              className="mt-2 rounded-lg px-3 py-2 flex items-center gap-3"
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.04)",
              }}
            >
              <span
                className="uppercase tracking-wide"
                style={{
                  fontSize: "9px",
                  letterSpacing: "0.08em",
                  color: "rgba(255, 255, 255, 0.25)",
                }}
              >
                Blended
              </span>

              {/* Mini progress bar */}
              <div
                className="flex-1 rounded-full overflow-hidden"
                style={{
                  height: "4px",
                  background: "rgba(255, 255, 255, 0.06)",
                }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${blendedConfidence}%`,
                    background: tierColor,
                    transition: "width 300ms ease",
                  }}
                />
              </div>

              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: tierColor,
                }}
              >
                {blendedConfidence}%
              </span>

              <span
                style={{
                  fontSize: "10px",
                  color: "rgba(255, 255, 255, 0.2)",
                }}
              >
                from {priors.length} source{priors.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
