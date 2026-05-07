"use client";

/**
 * `PlanSectionNav` — 16 business-plan sections with confidence badges.
 *
 * Reference: `docs/STUDIO_OLIVIA_DESIGN.md` § 2.3 #8. Mounts in the left
 * rail when `navSection === "plan"`. Each row: icon + title + Badge
 * (confidence). Click sets `activePlanIdx`.
 *
 * The per-section content + confidence values live on the user's
 * runtime `planSections[]` state (see `page.tsx`). This component just
 * renders the nav.
 */

import { Badge } from "@/components/primitives/Badge";
import { PLAN_SECTIONS } from "@/lib/studio/plan-sections";

export interface PlanSectionNavProps {
  /** Index of the active plan section. */
  active: number;
  /** Click handler — sets `activePlanIdx`. */
  onSelect: (idx: number) => void;
  /** Optional confidence values 0-100, indexed alongside `PLAN_SECTIONS`. */
  confidences?: number[];
}

export function PlanSectionNav({
  active,
  onSelect,
  confidences = [],
}: PlanSectionNavProps) {
  return (
    <nav
      aria-label="Business plan sections"
      style={{ display: "grid", gap: 4 }}
    >
      <div
        style={{
          padding: "0 4px 6px",
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-2xs)",
          color: "var(--fg-tertiary)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Plan sections
      </div>
      <ul
        role="list"
        style={{
          margin: 0,
          padding: 0,
          listStyle: "none",
          display: "grid",
          gap: 2,
        }}
      >
        {PLAN_SECTIONS.map((section, idx) => {
          const isActive = idx === active;
          const conf = confidences[idx] ?? 0;
          return (
            <li key={section.key}>
              <button
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() => onSelect(idx)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "8px 10px",
                  background: isActive ? "var(--aurum-mute)" : "var(--surface-1)",
                  border: `1px solid ${isActive ? "var(--border-aurum)" : "var(--border-subtle)"}`,
                  borderRadius: "var(--radius-sm)",
                  color: isActive ? "var(--aurum-primary)" : "var(--fg-primary)",
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-xs)",
                  fontWeight: isActive ? 600 : 500,
                  cursor: "pointer",
                  textAlign: "left",
                  transition:
                    "background var(--duration-micro) var(--ease-out-quart), border-color var(--duration-micro) var(--ease-out-quart), color var(--duration-micro) var(--ease-out-quart)",
                }}
              >
                <span aria-hidden="true" style={{ width: 18, textAlign: "center" }}>
                  {section.icon}
                </span>
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {section.title}
                </span>
                <Badge value={conf} size="sm" />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
