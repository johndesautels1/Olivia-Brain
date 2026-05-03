"use client";

/**
 * `RailLeft` — left aside, primary navigation.
 *
 * Reference: `docs/01_UI_DESIGN_SYSTEM.md` § 5.4 + `STUDIO_OLIVIA_DESIGN.md` § 2.3.
 *
 * Two states (collapsed 56px / expanded 264px). Hosts the rail item
 * list (icons + labels) plus arbitrary content slots above and below
 * (project name, persona picker, etc., per Studio prototype).
 *
 * Session 14 ships the chrome only — content slots are passed through
 * as children. Item rendering, drag-reorder, and "promote to widget"
 * ship in Session 15.
 */

import type { ReactNode } from "react";

export interface RailLeftProps {
  /** Whether the rail is expanded (264px) or collapsed (56px). */
  expanded?: boolean;
  /** Rail content (typically a vertical stack of sections). */
  children?: ReactNode;
  /** Accessible label for the navigation region. */
  label?: string;
}

export function RailLeft({
  expanded = true,
  children,
  label = "Primary navigation",
}: RailLeftProps) {
  return (
    <aside
      aria-label={label}
      style={{
        width: expanded ? "var(--rail-default)" : "var(--rail-collapsed)",
        flexShrink: 0,
        height: "100%",
        background: "var(--canvas-recess)",
        borderRight: "1px solid var(--border-default)",
        overflowY: "auto",
        overflowX: "hidden",
        transition:
          "width var(--duration-default) var(--ease-out-quart)",
      }}
    >
      <div style={{ padding: "16px 12px", display: "grid", gap: 12 }}>
        {children}
      </div>
    </aside>
  );
}
