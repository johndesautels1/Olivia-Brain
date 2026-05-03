"use client";

/**
 * `Header` — sticky 56px workspace header.
 *
 * Reference: `docs/01_UI_DESIGN_SYSTEM.md` § 5.1 + `STUDIO_OLIVIA_DESIGN.md` § 2.2.
 *
 * Slots:
 * - Left: AvatarOrb (clickable, opens Olivia panel) + product wordmark + breadcrumb.
 * - Right: Score chips (per-product, opt-in via `scoreChips` prop) + action slot
 *   (`actions` — typically `Match` + `Export` for clueslondon Studio).
 *
 * Pure presentational. Layout-only via inline styles + canonical
 * tokens; no Tailwind. (Tailwind is available for sub-components but
 * the shell stays inline-style per `BUILD_SEQUENCE.md` Track C row 9.)
 */

import type { ReactNode } from "react";
import { AvatarOrb } from "@/components/primitives";
import type { AvatarOrbState } from "@/components/primitives";

export interface HeaderScoreChip {
  /** Three-letter mono label, e.g. `"CLR"`, `"IMP"`. */
  label: string;
  /** Numeric value (0–100 typical, but free-form per chip). */
  value: number | string;
}

export interface HeaderProps {
  /** Product wordmark (e.g. "STUDIO OLIVIA", "OLIVIA BRAIN"). */
  wordmark?: string;
  /** Breadcrumb segments (e.g. `["Pitch", "Title slide"]`). */
  crumb?: string[];
  /** Optional score chips rendered on the right side. */
  scoreChips?: HeaderScoreChip[];
  /** Right-side action slot (e.g. Match + Export buttons). */
  actions?: ReactNode;
  /** AvatarOrb state — drives the orb's animation. */
  avatarState?: AvatarOrbState;
  /** Click handler on the AvatarOrb. */
  onAvatarClick?: () => void;
}

export function Header({
  wordmark = "OLIVIA BRAIN",
  crumb = [],
  scoreChips = [],
  actions,
  avatarState = "idle",
  onAvatarClick,
}: HeaderProps) {
  return (
    <header
      role="banner"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        height: "var(--header-height)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        background: "var(--canvas-recess)",
        borderBottom: "1px solid var(--border-default)",
        backdropFilter: "blur(16px) saturate(1.4)",
      }}
    >
      {/* ── Left cluster: orb + wordmark + breadcrumb ───────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          minWidth: 0,
        }}
      >
        <AvatarOrb
          size={40}
          state={avatarState}
          onClick={onAvatarClick}
          label="Open Olivia"
        />
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-md)",
            fontWeight: 600,
            color: "var(--fg-primary)",
            letterSpacing: "0.02em",
            whiteSpace: "nowrap",
          }}
        >
          {wordmark}
        </span>
        {crumb.length > 0 && (
          <nav
            aria-label="Breadcrumb"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              minWidth: 0,
              fontSize: "var(--text-xs)",
              color: "var(--fg-tertiary)",
              fontFamily: "var(--font-mono)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            <span aria-hidden="true">·</span>
            {crumb.map((segment, i) => (
              <span
                key={i}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  color: i === crumb.length - 1 ? "var(--aurum-primary)" : "var(--fg-tertiary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {segment}
                {i < crumb.length - 1 && <span aria-hidden="true">›</span>}
              </span>
            ))}
          </nav>
        )}
      </div>

      {/* ── Right cluster: score chips + actions ────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        {scoreChips.length > 0 && (
          <div
            role="list"
            aria-label="Score chips"
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            {scoreChips.map((chip) => (
              <div
                key={chip.label}
                role="listitem"
                className="tabular-nums"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  borderRadius: "var(--radius-full)",
                  background: "var(--aurum-mute)",
                  border: "1px solid var(--border-aurum)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-xs)",
                }}
              >
                <span
                  style={{
                    color: "var(--fg-tertiary)",
                    letterSpacing: "0.08em",
                  }}
                >
                  {chip.label}
                </span>
                <span
                  style={{
                    color: "var(--aurum-primary)",
                    fontWeight: 600,
                  }}
                >
                  {chip.value}
                </span>
              </div>
            ))}
          </div>
        )}
        {actions && <div style={{ display: "flex", gap: 8 }}>{actions}</div>}
      </div>
    </header>
  );
}
