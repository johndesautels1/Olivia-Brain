"use client";

/**
 * `WorkspaceShell` — the four-region top-level layout.
 *
 * Reference: `docs/01_UI_DESIGN_SYSTEM.md` § 5.1.
 *
 *   ┌──────────────────────────────────────────────┐
 *   │  Header  (sticky, 56px)                      │
 *   ├────┬────────────────────────────┬────────────┤
 *   │ R  │                            │            │
 *   │ a  │       Center (flex 1)      │ Inspector  │
 *   │ i  │                            │            │
 *   │ l  │                            │            │
 *   └────┴────────────────────────────┴────────────┘
 *
 * Each region is a slot — callers compose their own contents. The
 * shell is product-agnostic: clueslondon, cluesintelligence, cluesxscore,
 * white-label tenants, and standalone Olivia all mount the same shell
 * with different region content (per `01_UI_DESIGN_SYSTEM.md` § 10
 * — per-product surface contracts).
 *
 * Embedded mode: hosts that suppress Olivia surfaces (`clueslondon-prod`
 * tenant) can pass `inspector={null}` and `rail={null}` to render
 * Olivia as a thin chat overlay only — see `project_olivia_surface_suppression`.
 */

import type { ReactNode } from "react";

export interface WorkspaceShellProps {
  /** Sticky header — typically the `<Header />` primitive. */
  header: ReactNode;
  /** Left rail — typically the `<RailLeft />` primitive. */
  rail?: ReactNode;
  /** Center main canvas — typically the `<Center />` primitive. */
  center: ReactNode;
  /** Right inspector — typically the `<Inspector />` primitive. */
  inspector?: ReactNode;
  /** Optional ticker rail above the header (§ 5.1). Default off. */
  ticker?: ReactNode;
}

export function WorkspaceShell({
  header,
  rail,
  center,
  inspector,
  ticker,
}: WorkspaceShellProps) {
  return (
    <div
      data-workspace-shell=""
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        minHeight: "100dvh",
        background: "var(--canvas-base)",
        color: "var(--fg-primary)",
        overflow: "hidden",
      }}
    >
      <a href="#workspace-main" className="skip-to-content">
        Skip to main content
      </a>

      {ticker && (
        <div
          role="complementary"
          aria-label="Ticker rail"
          style={{
            flexShrink: 0,
            height: 36,
            borderBottom: "1px solid var(--border-default)",
            background: "var(--canvas-base)",
          }}
        >
          {ticker}
        </div>
      )}

      {header}

      <div
        id="workspace-main"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "row",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {rail}
        {center}
        {inspector}
      </div>
    </div>
  );
}
