"use client";

/**
 * StudioTopBar — 64px sticky glassmorphic top bar for the Preparation Studio.
 *
 * Layout (left to right):
 * - Back pill (returns to document detail)
 * - Document name + category label
 * - Package progress ring (radial SVG, 5-color tier)
 * - Entity target chip (placeholder for Conversation 8 entity adaptation)
 *
 * Design spec:
 * - Height: 64px
 * - Background: rgba(15, 18, 25, 0.8) with backdrop-blur(16px)
 * - Border bottom: 1px solid rgba(255, 255, 255, 0.06)
 * - Brand gold: #C4A96A
 * - Text primary: #e2e8f0
 * - Text muted: #9AA7B2
 * - Micro labels: 10-11px, uppercase, tracking-wide
 */

import React from "react";
import type { EntityType } from "@/lib/studio/entityModes";
import { getEntityMode } from "@/lib/studio/entityModes";

interface EntityTarget {
  /** Entity name, e.g. "Sequoia Capital" */
  name: string;
  /** Organisation type used to derive EntityType */
  entityType: EntityType;
  /** Cristiano match score 0-100 */
  matchScore: number | null;
  /** Optional logo URL */
  logoUrl?: string | null;
}

interface StudioTopBarProps {
  title: string;
  documentType: string;
  collectionName: string;
  collectionDocCount: number;
  completionPct: number;
  tierColor: string;
  onBack: () => void;
  /** Current entity target (null = no target selected) */
  entityTarget?: EntityTarget | null;
  /** Called when the entity chip is clicked (opens mode picker) */
  onEntityClick?: () => void;
}

export type { EntityTarget };

// ── Radial Progress Ring ───────────────────────────────────────────────

function PackageRing({
  pct,
  color,
}: {
  pct: number;
  color: string;
}) {
  const radius = 18;
  const strokeWidth = 3;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 44, height: 44 }}>
      <svg
        width="44"
        height="44"
        viewBox="0 0 44 44"
        className="transform -rotate-90"
        aria-label={`${pct}% complete`}
        role="img"
      >
        {/* Track ring */}
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 400ms ease, stroke 400ms ease" }}
        />
      </svg>
      {/* Center percentage */}
      <span
        className="absolute text-center font-semibold"
        style={{
          fontSize: "11px",
          color: color,
          lineHeight: 1,
        }}
      >
        {pct}%
      </span>
    </div>
  );
}

// ── Format document type for display ───────────────────────────────────

function formatDocType(docType: string): string {
  return docType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Main Component ─────────────────────────────────────────────────────

export function StudioTopBar({
  title,
  documentType,
  collectionName,
  collectionDocCount,
  completionPct,
  tierColor,
  onBack,
  entityTarget,
  onEntityClick,
}: StudioTopBarProps) {
  const entityMode = getEntityMode(entityTarget?.entityType ?? null);
  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6"
      style={{
        height: "64px",
        minHeight: "64px",
        background: "rgba(15, 18, 25, 0.8)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
      }}
    >
      {/* Left section: Back pill + doc name + category */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Back pill */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all shrink-0 cursor-pointer"
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            color: "#9AA7B2",
            minHeight: "32px",
          }}
          aria-label="Back to document"
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
          <span className="hidden sm:inline">Back</span>
        </button>

        {/* Document title + category */}
        <div className="min-w-0 flex-1">
          <h1
            className="text-sm sm:text-base font-semibold truncate"
            style={{ color: "#e2e8f0" }}
            title={title}
          >
            {title}
          </h1>
          <div className="flex items-center gap-2">
            <span
              className="uppercase tracking-wide truncate"
              style={{
                fontSize: "10px",
                color: "#9AA7B2",
                letterSpacing: "0.06em",
              }}
            >
              {formatDocType(documentType)}
            </span>
            {collectionName && (
              <>
                <span
                  style={{
                    fontSize: "10px",
                    color: "rgba(255, 255, 255, 0.2)",
                  }}
                >
                  /
                </span>
                <span
                  className="uppercase tracking-wide truncate"
                  style={{
                    fontSize: "10px",
                    color: "#9AA7B2",
                    letterSpacing: "0.06em",
                  }}
                >
                  {collectionName}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right section: Package ring + entity chip */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Package progress ring */}
        <div className="flex items-center gap-2">
          <PackageRing pct={completionPct} color={tierColor} />
          {collectionDocCount > 0 && (
            <div className="hidden sm:flex flex-col">
              <span
                className="uppercase tracking-wide"
                style={{
                  fontSize: "10px",
                  color: "#9AA7B2",
                  letterSpacing: "0.06em",
                }}
              >
                Package
              </span>
              <span
                style={{
                  fontSize: "11px",
                  color: "#e2e8f0",
                }}
              >
                {collectionDocCount} {collectionDocCount === 1 ? "doc" : "docs"}
              </span>
            </div>
          )}
        </div>

        {/* Entity target chip */}
        <button
          onClick={onEntityClick}
          className="hidden sm:flex items-center gap-2 rounded-full px-3 py-1.5 transition-all cursor-pointer"
          style={{
            background: entityTarget
              ? `${entityMode.color}12`
              : "rgba(196, 169, 106, 0.08)",
            border: `1px solid ${entityTarget ? `${entityMode.color}30` : "rgba(196, 169, 106, 0.15)"}`,
            minHeight: "32px",
          }}
          aria-label={
            entityTarget
              ? `Preparing for ${entityTarget.name}`
              : "Select target entity"
          }
        >
          {/* Entity logo or colored dot */}
          {entityTarget?.logoUrl ? (
            <img
              src={entityTarget.logoUrl}
              alt=""
              className="rounded-full object-cover"
              style={{ width: 18, height: 18 }}
            />
          ) : (
            <div
              className="rounded-full shrink-0"
              style={{
                width: 7,
                height: 7,
                background: entityTarget ? entityMode.color : "#C4A96A",
                opacity: entityTarget ? 1 : 0.6,
              }}
            />
          )}

          {entityTarget ? (
            <div className="flex items-center gap-1.5">
              {/* Entity name */}
              <span
                className="truncate"
                style={{
                  fontSize: "11px",
                  color: "#e2e8f0",
                  maxWidth: "120px",
                }}
              >
                {entityTarget.name}
              </span>

              {/* Entity type badge */}
              <span
                className="uppercase tracking-wide shrink-0"
                style={{
                  fontSize: "9px",
                  color: entityMode.color,
                  letterSpacing: "0.06em",
                }}
              >
                {entityMode.label}
              </span>

              {/* Match score */}
              {entityTarget.matchScore !== null && (
                <span
                  className="shrink-0"
                  style={{
                    fontSize: "10px",
                    color: entityMode.color,
                    fontWeight: 600,
                  }}
                >
                  {entityTarget.matchScore}%
                </span>
              )}
            </div>
          ) : (
            <span
              className="uppercase tracking-wide"
              style={{
                fontSize: "10px",
                color: "#C4A96A",
                letterSpacing: "0.06em",
              }}
            >
              No Target
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
