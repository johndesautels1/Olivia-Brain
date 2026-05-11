"use client";

/**
 * StudioFormattingToolbar — Expandable formatting toolbar for the Preparation Studio.
 *
 * Collapsed (default): B | I | U | List | Token dropdown | Pitch Polish
 * Expanded: Additional format options + AI actions row + keyboard shortcuts
 *
 * Features:
 * - Toggle expand/collapse with 200ms ease transition
 * - Dynamic DNA token extraction: scans dnaParagraphs for ARR, MRR,
 *   FoundingYear, TeamSize, Funding, etc. and shows insertable chips
 * - Pitch Polish button (enabled when text is selected)
 * - Investor Tone rewrite trigger
 *
 * Design spec:
 * - Background: rgba(255, 255, 255, 0.02) with subtle border
 * - Button colors: default (gray), gold (insert/tokens), purple (AI)
 * - Token chips: gold with {{key}} prefix and extracted value
 * - Expand animation: 200ms ease
 */

import React, { useState, useMemo, useCallback } from "react";

// ── Dynamic Token Extraction from DNA ───────────────────────────────

export interface DnaToken {
  key: string;
  label: string;
  value: string;
  source: string;
}

interface TokenPattern {
  key: string;
  label: string;
  pattern: RegExp;
}

const TOKEN_PATTERNS: TokenPattern[] = [
  { key: "ARR", label: "ARR", pattern: /(?:ARR|annual recurring revenue)[:\s]*([£$]?[\d,.]+[MKBmkb]?)/i },
  { key: "MRR", label: "MRR", pattern: /(?:MRR|monthly recurring revenue)[:\s]*([£$]?[\d,.]+[MKBmkb]?)/i },
  { key: "Revenue", label: "Revenue", pattern: /(?:revenue|turnover)[:\s]*([£$]?[\d,.]+[MKBmkb]?)/i },
  { key: "FoundingYear", label: "Founded", pattern: /(?:founded|established|incorporated)[:\s]*(20\d{2}|19\d{2})/i },
  { key: "TeamSize", label: "Team", pattern: /(?:team size|employees|headcount|staff)[:\s]*(\d+[+]?)/i },
  { key: "Funding", label: "Funding", pattern: /(?:raised|funding|total funding|series [A-Z])[:\s]*([£$]?[\d,.]+[MKBmkb]?)/i },
  { key: "Customers", label: "Customers", pattern: /(?:customers|clients|active users)[:\s]*([\d,]+[+]?)/i },
  { key: "Growth", label: "Growth", pattern: /(?:growth|growing)[:\s]*([\d,.]+%)/i },
];

/**
 * Scan DNA paragraphs for common business metrics and return insertable tokens.
 * Each token type is extracted at most once (first match wins).
 */
export function extractTokensFromDna(
  dnaParagraphs: Record<string, string>,
): DnaToken[] {
  const tokens: DnaToken[] = [];
  const found = new Set<string>();

  for (const [paraKey, paraText] of Object.entries(dnaParagraphs)) {
    if (!paraText) continue;

    for (const tp of TOKEN_PATTERNS) {
      if (found.has(tp.key)) continue;

      const match = paraText.match(tp.pattern);
      if (match?.[1]) {
        tokens.push({
          key: tp.key,
          label: tp.label,
          value: match[1].trim(),
          source: paraKey,
        });
        found.add(tp.key);
      }
    }
  }

  return tokens;
}

// ── Props ────────────────────────────────────────────────────────────

interface StudioFormattingToolbarProps {
  /** Apply inline formatting (bold/italic/underline/list) */
  onFormat: (format: "bold" | "italic" | "underline" | "list") => void;
  /** Insert a token value at the current cursor position */
  onInsertToken: (tokenValue: string) => void;
  /** Open Pitch Polish modal with selected text */
  onPitchPolish: () => void;
  /** Whether the user currently has text selected in the editor */
  hasSelection: boolean;
  /** DNA paragraphs for token extraction */
  dnaParagraphs: Record<string, string>;
}

// ── Toolbar Button Sub-component ────────────────────────────────────

function ToolbarButton({
  title,
  onClick,
  disabled,
  variant = "default",
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "gold" | "purple";
  children: React.ReactNode;
}) {
  const styles = {
    default: {
      color: disabled ? "rgba(154, 167, 178, 0.4)" : "#9AA7B2",
      bg: "rgba(255, 255, 255, 0.04)",
      border: "rgba(255, 255, 255, 0.06)",
    },
    gold: {
      color: disabled ? "rgba(196, 169, 106, 0.4)" : "#C4A96A",
      bg: "rgba(196, 169, 106, 0.06)",
      border: "rgba(196, 169, 106, 0.12)",
    },
    purple: {
      color: disabled ? "rgba(167, 139, 250, 0.4)" : "#a78bfa",
      bg: "rgba(167, 139, 250, 0.06)",
      border: "rgba(167, 139, 250, 0.12)",
    },
  };

  const s = styles[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-all cursor-pointer disabled:cursor-not-allowed"
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.color,
        minHeight: "30px",
        minWidth: "30px",
      }}
    >
      {children}
    </button>
  );
}

// ── Separator ───────────────────────────────────────────────────────

function ToolbarSep() {
  return (
    <div
      style={{
        width: "1px",
        height: "20px",
        background: "rgba(255, 255, 255, 0.06)",
        margin: "0 4px",
        flexShrink: 0,
      }}
    />
  );
}

// ── Main Component ──────────────────────────────────────────────────

export function StudioFormattingToolbar({
  onFormat,
  onInsertToken,
  onPitchPolish,
  hasSelection,
  dnaParagraphs,
}: StudioFormattingToolbarProps) {
  const [expanded, setExpanded] = useState(false);
  const [showTokens, setShowTokens] = useState(false);

  const dnaTokens = useMemo(
    () => extractTokensFromDna(dnaParagraphs),
    [dnaParagraphs],
  );

  const toggleExpand = useCallback(() => setExpanded((prev) => !prev), []);
  const toggleTokens = useCallback(() => setShowTokens((prev) => !prev), []);

  return (
    <div
      className="w-full rounded-xl overflow-hidden"
      style={{
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(255, 255, 255, 0.04)",
      }}
    >
      {/* ── Primary row: always visible ──────────────────────────── */}
      <div className="flex items-center gap-1 px-3 py-1.5 flex-wrap">
        {/* Format: Bold */}
        <ToolbarButton title="Bold (/bold)" onClick={() => onFormat("bold")}>
          <span style={{ fontWeight: 700, fontSize: "13px" }}>B</span>
        </ToolbarButton>

        {/* Format: Italic */}
        <ToolbarButton title="Italic (/italic)" onClick={() => onFormat("italic")}>
          <span style={{ fontStyle: "italic", fontSize: "13px" }}>I</span>
        </ToolbarButton>

        {/* Format: Underline */}
        <ToolbarButton title="Underline (/underline)" onClick={() => onFormat("underline")}>
          <span style={{ textDecoration: "underline", fontSize: "13px" }}>U</span>
        </ToolbarButton>

        {/* Format: List */}
        <ToolbarButton title="Bullet List (/list)" onClick={() => onFormat("list")}>
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
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        </ToolbarButton>

        <ToolbarSep />

        {/* Token insert dropdown toggle */}
        <ToolbarButton
          title={`Insert token from DNA${dnaTokens.length > 0 ? ` (${dnaTokens.length} found)` : ""}`}
          onClick={toggleTokens}
          variant="gold"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          <span className="hidden sm:inline" style={{ fontSize: "11px" }}>
            Token
          </span>
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points={showTokens ? "18 15 12 9 6 15" : "6 9 12 15 18 9"} />
          </svg>
        </ToolbarButton>

        <ToolbarSep />

        {/* Pitch Polish */}
        <ToolbarButton
          title={hasSelection ? "Pitch Polish selected text" : "Select text first to Pitch Polish"}
          onClick={onPitchPolish}
          disabled={!hasSelection}
          variant="purple"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span className="hidden sm:inline" style={{ fontSize: "11px" }}>
            Pitch Polish
          </span>
        </ToolbarButton>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Expand/collapse toggle */}
        <button
          onClick={toggleExpand}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-all cursor-pointer"
          style={{ color: "rgba(255, 255, 255, 0.25)", fontSize: "10px" }}
          title={expanded ? "Collapse toolbar" : "Expand toolbar"}
        >
          <span
            className="hidden sm:inline uppercase tracking-wide"
            style={{ letterSpacing: "0.06em" }}
          >
            {expanded ? "Less" : "More"}
          </span>
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points={expanded ? "18 15 12 9 6 15" : "6 9 12 15 18 9"} />
          </svg>
        </button>
      </div>

      {/* ── Token chips row (visible when Token dropdown is open) ─ */}
      {showTokens && (
        <div
          className="px-3 py-2 flex flex-wrap gap-1.5"
          style={{ borderTop: "1px solid rgba(255, 255, 255, 0.04)" }}
        >
          {dnaTokens.length > 0 ? (
            <>
              <span
                className="uppercase tracking-wide self-center mr-1"
                style={{
                  fontSize: "9px",
                  color: "rgba(255, 255, 255, 0.25)",
                  letterSpacing: "0.08em",
                }}
              >
                DNA
              </span>
              {dnaTokens.map((token) => (
                <button
                  key={token.key}
                  onClick={() => onInsertToken(token.value)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-all cursor-pointer"
                  style={{
                    fontSize: "11px",
                    background: "rgba(196, 169, 106, 0.06)",
                    border: "1px solid rgba(196, 169, 106, 0.12)",
                    color: "#C4A96A",
                  }}
                  title={`Insert ${token.label}: ${token.value} (from ${token.source})`}
                >
                  <span style={{ color: "rgba(196, 169, 106, 0.5)", fontSize: "10px" }}>
                    {`{{${token.key}}}`}
                  </span>
                  <span style={{ fontWeight: 600 }}>{token.value}</span>
                </button>
              ))}
            </>
          ) : (
            <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.2)" }}>
              No tokens found in DNA paragraphs
            </span>
          )}
        </div>
      )}

      {/* ── Expanded section: AI actions + shortcuts ─────────────── */}
      {expanded && (
        <div
          className="px-3 py-2 flex flex-col gap-2"
          style={{ borderTop: "1px solid rgba(255, 255, 255, 0.04)" }}
        >
          {/* AI actions row */}
          <div className="flex items-center gap-1 flex-wrap">
            <span
              className="uppercase tracking-wide mr-1"
              style={{
                fontSize: "9px",
                color: "rgba(255, 255, 255, 0.25)",
                letterSpacing: "0.08em",
              }}
            >
              AI Actions
            </span>

            {/* Investor Tone button */}
            <ToolbarButton
              title={hasSelection ? "Rewrite in Investor Tone" : "Select text first"}
              onClick={onPitchPolish}
              disabled={!hasSelection}
              variant="gold"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <span style={{ fontSize: "11px" }}>Investor Tone</span>
            </ToolbarButton>

            <ToolbarSep />

            <span
              className="uppercase tracking-wide mr-1"
              style={{
                fontSize: "9px",
                color: "rgba(255, 255, 255, 0.25)",
                letterSpacing: "0.08em",
              }}
            >
              Format
            </span>

            {/* Heading shortcut */}
            <ToolbarButton title="Heading" onClick={() => onFormat("bold")}>
              <span style={{ fontSize: "12px", fontWeight: 700 }}>H</span>
            </ToolbarButton>

            {/* Blockquote shortcut */}
            <ToolbarButton title="Horizontal rule" onClick={() => onFormat("list")}>
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
                <line x1="3" y1="12" x2="21" y2="12" />
              </svg>
            </ToolbarButton>
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className="uppercase tracking-wide"
              style={{
                fontSize: "9px",
                color: "rgba(255, 255, 255, 0.2)",
                letterSpacing: "0.08em",
              }}
            >
              Shortcuts
            </span>
            {[
              { keys: "/", action: "Commands" },
              { keys: "Tab", action: "Accept suggestion" },
              { keys: "J / K", action: "Navigate questions" },
              { keys: "Esc", action: "Close menu" },
            ].map(({ keys, action }) => (
              <span
                key={keys}
                className="flex items-center gap-1"
                style={{ fontSize: "10px" }}
              >
                <kbd
                  className="rounded px-1 py-0.5"
                  style={{
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    color: "rgba(255, 255, 255, 0.3)",
                    fontSize: "9px",
                  }}
                >
                  {keys}
                </kbd>
                <span style={{ color: "rgba(255, 255, 255, 0.2)" }}>{action}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
