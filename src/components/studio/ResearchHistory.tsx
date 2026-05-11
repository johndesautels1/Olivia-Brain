"use client";

/**
 * ResearchHistory — Per-document saved research threads for the Preparation Studio.
 *
 * Stores completed research results in local state (session-scoped) and
 * displays them as a collapsible history panel below the DeepResearchPanel.
 *
 * Features:
 * - Stores ResearchResult entries per document
 * - Shows a collapsible "Past Research" section
 * - Each entry shows: question text, timestamp, source count, re-insert action
 * - Click to expand and see the full summary + citations
 * - "Insert" buttons to re-use citations from past research
 *
 * Design spec:
 * - Collapsible header: "Past Research (3)" with chevron
 * - Entry cards: compact, glassmorphic, stacked
 * - Timestamp: relative format ("2m ago", "1h ago")
 * - Re-insert: same gold citation button style
 */

import React, { useState, useCallback } from "react";
import type { ResearchResult, ResearchCitation } from "./DeepResearchPanel";

interface ResearchHistoryProps {
  /** Array of past research results for this document */
  results: ResearchResult[];
  /** Called when user re-inserts a citation from history */
  onInsertCitation: (citation: ResearchCitation) => void;
}

// ── Relative time formatter ──────────────────────────────────────────

function relativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

// ── Single Research Entry ────────────────────────────────────────────

function ResearchEntry({
  result,
  onInsertCitation,
}: {
  result: ResearchResult;
  onInsertCitation: (citation: ResearchCitation) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const totalSources = result.evidence.length + result.snippets.length;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      {/* Entry header — click to expand */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left transition-all cursor-pointer"
        style={{
          background: isExpanded ? "rgba(255,255,255,0.02)" : "transparent",
        }}
      >
        <div className="flex-1 min-w-0">
          <p
            className="truncate"
            style={{ fontSize: "12px", color: "#e2e8f0", fontWeight: 500 }}
          >
            {result.questionText}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)" }}>
              {relativeTime(result.timestamp)}
            </span>
            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.1)" }}>
              &middot;
            </span>
            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)" }}>
              {totalSources} source{totalSources !== 1 ? "s" : ""}
            </span>
            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.1)" }}>
              &middot;
            </span>
            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)" }}>
              {(result.totalDurationMs / 1000).toFixed(1)}s
            </span>
          </div>
        </div>

        {/* Expand chevron */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 ml-2 transition-transform"
          style={{
            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div
          className="px-3 pb-3 space-y-2"
          style={{ borderTop: "1px solid rgba(255,255,255,0.03)" }}
        >
          {/* Summary excerpt */}
          <p
            style={{
              fontSize: "12px",
              color: "#9AA7B2",
              lineHeight: 1.6,
              marginTop: "8px",
            }}
          >
            {result.summary.length > 200
              ? result.summary.substring(0, 200) + "..."
              : result.summary}
          </p>

          {/* Quick re-insert: summary */}
          <button
            onClick={() =>
              onInsertCitation({
                id: `history-summary-${result.timestamp.getTime()}`,
                source: "Past Research",
                text: result.summary,
                confidence: 85,
              })
            }
            className="flex items-center gap-1 rounded-md px-2 py-0.5 text-xs transition-all cursor-pointer"
            style={{
              color: "#C4A96A",
              background: "rgba(196, 169, 106, 0.06)",
              border: "1px solid rgba(196, 169, 106, 0.12)",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Re-insert summary
          </button>

          {/* Snippet list */}
          {result.snippets.length > 0 && (
            <div className="space-y-1.5 mt-2">
              <span
                className="uppercase tracking-wide"
                style={{
                  fontSize: "9px",
                  color: "rgba(255,255,255,0.15)",
                  letterSpacing: "0.08em",
                }}
              >
                Snippets
              </span>
              {result.snippets.map((snippet) => (
                <div
                  key={snippet.id}
                  className="flex items-start gap-2"
                >
                  <p
                    className="flex-1"
                    style={{
                      fontSize: "11px",
                      color: "#9AA7B2",
                      lineHeight: 1.5,
                    }}
                  >
                    {snippet.text.length > 100
                      ? snippet.text.substring(0, 100) + "..."
                      : snippet.text}
                  </p>
                  <button
                    onClick={() => onInsertCitation(snippet)}
                    className="shrink-0 rounded px-1.5 py-0.5 transition-all cursor-pointer"
                    style={{
                      fontSize: "9px",
                      color: "#C4A96A",
                      background: "rgba(196, 169, 106, 0.06)",
                      border: "1px solid rgba(196, 169, 106, 0.1)",
                    }}
                    title="Insert this snippet"
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────

export function ResearchHistory({
  results,
  onInsertCitation,
}: ResearchHistoryProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  if (results.length === 0) return null;

  return (
    <div className="w-full">
      {/* Collapsible header */}
      <button
        onClick={toggleCollapse}
        className="w-full flex items-center gap-2 py-2 transition-all cursor-pointer"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: isCollapsed ? "rotate(0deg)" : "rotate(90deg)",
            transition: "transform 200ms ease",
          }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>

        <span
          className="uppercase tracking-wide"
          style={{
            fontSize: "10px",
            color: "rgba(255,255,255,0.25)",
            letterSpacing: "0.08em",
          }}
        >
          Past Research ({results.length})
        </span>
      </button>

      {/* Entries */}
      {!isCollapsed && (
        <div className="space-y-2 pb-2">
          {results.map((result, index) => (
            <ResearchEntry
              key={`${result.timestamp.getTime()}-${index}`}
              result={result}
              onInsertCitation={onInsertCitation}
            />
          ))}
        </div>
      )}
    </div>
  );
}
