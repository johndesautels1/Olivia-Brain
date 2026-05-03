"use client";

/**
 * `Center` — flex-1 main canvas region.
 *
 * Reference: `docs/01_UI_DESIGN_SYSTEM.md` § 5.2 + `STUDIO_OLIVIA_DESIGN.md` § 2.4.
 *
 * In the full Studio (Sessions 15–19), this is the user-configurable
 * widget grid (react-grid-layout + dnd-kit per § 5.2). Session 14
 * ships the structural region — children are rendered as-is; the
 * widget grid lands in Session 15 alongside `WorkspaceShell` widget
 * primitives.
 */

import type { ReactNode } from "react";

export interface CenterProps {
  /** Optional toolbar slot rendered above the canvas (mode toggles,
   *  view switchers, etc., per Studio prototype § 2.4). */
  toolbar?: ReactNode;
  /** Center content (current view — Pitch / Plan / Documents / General). */
  children?: ReactNode;
}

export function Center({ toolbar, children }: CenterProps) {
  return (
    <main
      role="main"
      style={{
        flex: 1,
        minWidth: 0,
        height: "100%",
        background: "var(--canvas-base)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {toolbar && (
        <div
          style={{
            flexShrink: 0,
            padding: "12px 24px",
            borderBottom: "1px solid var(--border-subtle)",
            background: "var(--canvas-recess)",
          }}
        >
          {toolbar}
        </div>
      )}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 24,
        }}
      >
        {children}
      </div>
    </main>
  );
}
