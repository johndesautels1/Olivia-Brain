"use client";

/**
 * PackageProgressBar — Master progress tracker for the entire document package
 *
 * Fixed bottom bar showing:
 * - Color-coded completion graph (red 0-20%, orange 21-40%, yellow 41-60%, blue 61-80%, green 81-100%)
 * - Individual document status indicators
 * - Master progress percentage
 * - "Package Complete" illuminated button at 100%
 * - "Continue to Review Package" gated button
 *
 * Part of Step 4 — Phase 2 (Progress Tracking System).
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────

export interface DocumentProgress {
  id: string;
  title: string;
  slug: string;
  documentType: string;
  /** Completion percentage 0-100 */
  completionPct: number;
  /** Number of completed blocks */
  completedBlocks: number;
  /** Total editable blocks */
  totalBlocks: number;
  /** Whether this is the currently active document */
  isActive: boolean;
}

interface PackageProgressBarProps {
  /** Collection name */
  collectionName: string;
  /** Collection slug for linking */
  collectionSlug: string;
  /** All documents in this collection with their progress */
  documents: DocumentProgress[];
  /** Currently active document ID */
  activeDocumentId: string;
  /** Navigate to a different document workspace */
  onDocumentSelect?: (docId: string) => void;
}

// ── Color tier system ──────────────────────────────────────────────────

interface ColorTier {
  min: number;
  max: number;
  bar: string;
  glow: string;
  bg: string;
  label: string;
}

const COLOR_TIERS: ColorTier[] = [
  { min: 0, max: 20, bar: "#ef4444", glow: "rgba(239, 68, 68, 0.3)", bg: "rgba(239, 68, 68, 0.12)", label: "Getting Started" },
  { min: 21, max: 40, bar: "#f97316", glow: "rgba(249, 115, 22, 0.3)", bg: "rgba(249, 115, 22, 0.12)", label: "In Progress" },
  { min: 41, max: 60, bar: "#eab308", glow: "rgba(234, 179, 8, 0.3)", bg: "rgba(234, 179, 8, 0.12)", label: "Halfway There" },
  { min: 61, max: 80, bar: "#3b82f6", glow: "rgba(59, 130, 246, 0.3)", bg: "rgba(59, 130, 246, 0.12)", label: "Nearly Done" },
  { min: 81, max: 100, bar: "#22c55e", glow: "rgba(34, 197, 94, 0.3)", bg: "rgba(34, 197, 94, 0.12)", label: "Complete" },
];

function getTier(pct: number): ColorTier {
  for (const tier of COLOR_TIERS) {
    if (pct >= tier.min && pct <= tier.max) return tier;
  }
  return COLOR_TIERS[0];
}

// ── Document type labels ───────────────────────────────────────────────

function formatDocType(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Dot indicator for each document ────────────────────────────────────

function DocDot({
  doc,
  isActive,
  onClick,
}: {
  doc: DocumentProgress;
  isActive: boolean;
  onClick: () => void;
}) {
  const tier = getTier(doc.completionPct);
  const isComplete = doc.completionPct === 100;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex flex-col items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A96A]/50 rounded"
      aria-label={`${doc.title} — ${doc.completionPct}% complete`}
      aria-current={isActive ? "true" : undefined}
    >
      {/* Dot */}
      <div
        className="rounded-full transition-all duration-300"
        style={{
          width: isActive ? 14 : 10,
          height: isActive ? 14 : 10,
          background: tier.bar,
          boxShadow: isComplete
            ? `0 0 8px ${tier.glow}, 0 0 16px ${tier.glow}`
            : isActive
            ? `0 0 6px ${tier.glow}`
            : "none",
          border: isActive ? "2px solid rgba(255, 255, 255, 0.3)" : "none",
        }}
      />

      {/* Tooltip on hover */}
      <div
        className="absolute bottom-full mb-2 hidden group-hover:block group-focus-visible:block z-30 whitespace-nowrap rounded-lg px-3 py-2 text-[11px]"
        style={{
          background: "rgba(15, 18, 25, 0.98)",
          border: "1px solid rgba(196, 169, 106, 0.2)",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
        }}
      >
        <div className="font-medium text-[var(--foreground)]">{doc.title}</div>
        <div className="text-[var(--muted)]">
          {formatDocType(doc.documentType)} — {doc.completionPct}%
        </div>
        <div style={{ color: tier.bar }}>
          {doc.completedBlocks}/{doc.totalBlocks} sections
        </div>
      </div>
    </button>
  );
}

// ── Main Component ─────────────────────────────────────────────────────

export function PackageProgressBar({
  collectionName,
  collectionSlug,
  documents,
  activeDocumentId,
  onDocumentSelect,
}: PackageProgressBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Compute master progress
  const masterStats = useMemo(() => {
    const totalDocs = documents.length;
    const completedDocs = documents.filter((d) => d.completionPct === 100).length;
    const totalBlocks = documents.reduce((sum, d) => sum + d.totalBlocks, 0);
    const completedBlocks = documents.reduce((sum, d) => sum + d.completedBlocks, 0);
    const masterPct = totalBlocks > 0 ? Math.round((completedBlocks / totalBlocks) * 100) : 0;

    return { totalDocs, completedDocs, totalBlocks, completedBlocks, masterPct };
  }, [documents]);

  const masterTier = getTier(masterStats.masterPct);
  const isPackageComplete = masterStats.masterPct === 100;

  // Color tier distribution for the graph
  const tierDistribution = useMemo(() => {
    const distribution = COLOR_TIERS.map((tier) => ({
      ...tier,
      count: documents.filter((d) => d.completionPct >= tier.min && d.completionPct <= tier.max).length,
    }));
    return distribution;
  }, [documents]);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{
        background: "linear-gradient(180deg, rgba(10, 14, 26, 0.95) 0%, rgba(5, 8, 16, 0.98) 100%)",
        borderTop: `2px solid ${masterTier.bar}`,
        boxShadow: `0 -4px 20px rgba(0, 0, 0, 0.5), 0 -1px 0 ${masterTier.glow}`,
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Expanded panel — document list */}
      {isExpanded && (
        <div
          className="border-b px-4 py-3 max-h-[240px] overflow-y-auto"
          style={{ borderColor: "rgba(255, 255, 255, 0.06)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-[var(--foreground)]">
              {collectionName} — Documents
            </h3>
            <span className="text-[10px] text-[var(--muted)]">
              {masterStats.completedDocs}/{masterStats.totalDocs} complete
            </span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => {
              const docTier = getTier(doc.completionPct);
              const isCurrent = doc.id === activeDocumentId;

              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => onDocumentSelect?.(doc.id)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A96A]/40"
                  style={{
                    background: isCurrent
                      ? "rgba(196, 169, 106, 0.08)"
                      : "rgba(255, 255, 255, 0.02)",
                    border: `1px solid ${
                      isCurrent ? "rgba(196, 169, 106, 0.2)" : "rgba(255, 255, 255, 0.04)"
                    }`,
                  }}
                  aria-current={isCurrent ? "true" : undefined}
                >
                  {/* Mini progress ring */}
                  <div className="relative shrink-0" style={{ width: 28, height: 28 }}>
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle
                        cx="18" cy="18" r="15.5"
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.06)"
                        strokeWidth="3"
                      />
                      <circle
                        cx="18" cy="18" r="15.5"
                        fill="none"
                        stroke={docTier.bar}
                        strokeWidth="3"
                        strokeDasharray={`${doc.completionPct} ${100 - doc.completionPct}`}
                        strokeLinecap="round"
                        style={{
                          filter: doc.completionPct === 100 ? `drop-shadow(0 0 3px ${docTier.glow})` : "none",
                        }}
                      />
                    </svg>
                    <span
                      className="absolute inset-0 flex items-center justify-center text-[8px] font-bold tabular-nums"
                      style={{ color: docTier.bar }}
                    >
                      {doc.completionPct}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-medium text-[var(--foreground)] truncate">
                      {doc.title}
                    </div>
                    <div className="text-[9px] text-[var(--muted)]">
                      {formatDocType(doc.documentType)} — {doc.completedBlocks}/{doc.totalBlocks} sections
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main bar */}
      <div className="flex items-center gap-3 px-4 py-2.5">
        {/* Expand/collapse button */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="rounded-lg p-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A96A]/40"
          style={{
            background: "rgba(196, 169, 106, 0.06)",
            border: "1px solid rgba(196, 169, 106, 0.1)",
            color: "rgba(196, 169, 106, 0.6)",
          }}
          aria-label={isExpanded ? "Collapse document list" : "Expand document list"}
          aria-expanded={isExpanded}
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
            style={{
              transform: isExpanded ? "rotate(180deg)" : "none",
              transition: "transform 0.2s ease",
            }}
            aria-hidden="true"
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>

        {/* Color tier graph — mini bars showing distribution */}
        <div
          className="hidden sm:flex items-end gap-0.5 h-5"
          role="img"
          aria-label={`Package progress: ${masterStats.masterPct}% complete`}
        >
          {tierDistribution.map((tier) => (
            <div
              key={tier.min}
              className="rounded-sm transition-all duration-300"
              style={{
                width: 8,
                height: tier.count > 0 ? Math.max(4, (tier.count / documents.length) * 20) : 2,
                background: tier.count > 0 ? tier.bar : "rgba(255, 255, 255, 0.06)",
                opacity: tier.count > 0 ? 1 : 0.3,
              }}
              title={`${tier.label}: ${tier.count} docs (${tier.min}-${tier.max}%)`}
            />
          ))}
        </div>

        {/* Document dots */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {documents.map((doc) => (
            <DocDot
              key={doc.id}
              doc={doc}
              isActive={doc.id === activeDocumentId}
              onClick={() => onDocumentSelect?.(doc.id)}
            />
          ))}
        </div>

        {/* Master progress bar */}
        <div className="flex-1 min-w-0">
          <div
            className="h-2.5 rounded-full overflow-hidden"
            style={{ background: "rgba(255, 255, 255, 0.06)" }}
            role="progressbar"
            aria-valuenow={masterStats.masterPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Package completion: ${masterStats.masterPct}%`}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${masterStats.masterPct}%`,
                background: isPackageComplete
                  ? "linear-gradient(90deg, #22c55e, #4ADE80, #22c55e)"
                  : masterTier.bar,
                boxShadow: isPackageComplete
                  ? "0 0 12px rgba(34, 197, 94, 0.5), 0 0 24px rgba(34, 197, 94, 0.2)"
                  : `0 0 8px ${masterTier.glow}`,
              }}
            />
          </div>
        </div>

        {/* Percentage + stats */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div
              className="text-sm font-bold tabular-nums"
              style={{
                color: masterTier.bar,
                textShadow: isPackageComplete ? `0 0 8px ${masterTier.glow}` : "none",
              }}
            >
              {masterStats.masterPct}%
            </div>
            <div className="text-[9px] text-[var(--muted)]">
              {masterStats.completedDocs}/{masterStats.totalDocs} docs
            </div>
          </div>

          {/* Package Complete / Continue to Review button */}
          {isPackageComplete ? (
            <Link
              href="/packages/new"
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400/50"
              style={{
                background: "linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(74, 222, 128, 0.15))",
                border: "1px solid rgba(74, 222, 128, 0.4)",
                color: "#4ADE80",
                boxShadow: "0 0 12px rgba(34, 197, 94, 0.2), 0 0 24px rgba(34, 197, 94, 0.1)",
                animation: "pulse 2s ease-in-out infinite",
              }}
              aria-label="Package complete — continue to review package"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Continue to Review Package
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium cursor-not-allowed"
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                color: "rgba(255, 255, 255, 0.25)",
              }}
              aria-label={`Package ${masterStats.masterPct}% complete — finish all documents to continue`}
              title="Complete all documents to unlock"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Review Package
            </button>
          )}
        </div>
      </div>

      {/* Pulse animation for the complete button */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}
