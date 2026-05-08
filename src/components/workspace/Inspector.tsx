"use client";

/**
 * `Inspector` — right aside, Olivia + contextual panels.
 *
 * Reference: `docs/01_UI_DESIGN_SYSTEM.md` § 5.5 + `STUDIO_OLIVIA_DESIGN.md` § 2.5.
 *
 * Three default tabs (`olivia`, `library`, `audit`) per the design
 * system; per-product surfaces extend with `preview`, `themes`,
 * `verdict`, `metrics`, `vitals`, etc. Session 14 ships the chrome +
 * tab strip + ARIA-correct keyboard rover; tab body content is
 * supplied via `tabs[].content`.
 *
 * Keyboard navigation uses `aria-orientation="horizontal"` + arrow-key
 * left/right on the active tab. Per § 9 a11y floor — focus rings via
 * `:focus-visible` (already global from `base.css`).
 */

import { useCallback, useId, useRef, type KeyboardEvent, type ReactNode } from "react";

export interface InspectorTab {
  /** Stable id (`"olivia"`, `"library"`, etc.). */
  id: string;
  /** Display label (`"Olivia"`, `"Library"`). */
  label: string;
  /** Tab body — rendered when this tab is active. */
  content: ReactNode;
}

export interface InspectorProps {
  /** Tabs to render in the strip. */
  tabs: InspectorTab[];
  /** Active tab id. */
  activeTabId: string;
  /** Called when the user activates a different tab. */
  onTabChange: (id: string) => void;
  /** Whether the inspector is open. Closed = 0 width. */
  open?: boolean;
  /**
   * Optional footer below the active tab body. Track U mounts the
   * LiveAgentStream here so the activity ticker is always visible
   * regardless of which tab is open.
   */
  footer?: ReactNode;
}

export function Inspector({
  tabs,
  activeTabId,
  onTabChange,
  open = true,
  footer,
}: InspectorProps) {
  const tablistId = useId();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  /* Arrow-key tab rover (§ 9 a11y floor — keyboard navigation). */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      const idx = tabs.findIndex((t) => t.id === activeTabId);
      if (idx < 0) return;

      let nextIdx: number | null = null;
      if (e.key === "ArrowRight") nextIdx = (idx + 1) % tabs.length;
      else if (e.key === "ArrowLeft") nextIdx = (idx - 1 + tabs.length) % tabs.length;
      else if (e.key === "Home") nextIdx = 0;
      else if (e.key === "End") nextIdx = tabs.length - 1;

      if (nextIdx !== null) {
        e.preventDefault();
        const nextTab = tabs[nextIdx]!;
        onTabChange(nextTab.id);
        tabRefs.current[nextTab.id]?.focus();
      }
    },
    [activeTabId, onTabChange, tabs],
  );

  if (!open) return null;

  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <aside
      aria-label="Inspector"
      style={{
        width: "var(--inspector-default)",
        flexShrink: 0,
        height: "100%",
        background: "var(--canvas-recess)",
        borderLeft: "1px solid var(--border-default)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* ── Tab strip ───────────────────────────────────────────────── */}
      <div
        role="tablist"
        id={tablistId}
        aria-orientation="horizontal"
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "1px solid var(--border-default)",
          background: "var(--canvas-base)",
          flexShrink: 0,
        }}
      >
        {tabs.map((tab) => {
          const active = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`${tablistId}-${tab.id}-panel`}
              id={`${tablistId}-${tab.id}-tab`}
              tabIndex={active ? 0 : -1}
              onClick={() => onTabChange(tab.id)}
              onKeyDown={handleKeyDown}
              style={{
                flex: 1,
                padding: "12px 8px",
                background: "transparent",
                border: "none",
                borderBottom: active
                  ? "2px solid var(--aurum-primary)"
                  : "2px solid transparent",
                color: active ? "var(--aurum-primary)" : "var(--fg-tertiary)",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-xs)",
                fontWeight: active ? 600 : 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition:
                  "color var(--duration-micro) var(--ease-out-quart), border-color var(--duration-micro) var(--ease-out-quart)",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Active tab body ─────────────────────────────────────────── */}
      <div
        role="tabpanel"
        id={activeTab ? `${tablistId}-${activeTab.id}-panel` : undefined}
        aria-labelledby={activeTab ? `${tablistId}-${activeTab.id}-tab` : undefined}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 16,
        }}
      >
        {activeTab?.content}
      </div>

      {/* ── Optional footer (LiveAgentStream lands here in Track U). ── */}
      {footer && <div style={{ flexShrink: 0 }}>{footer}</div>}
    </aside>
  );
}
