"use client";

/**
 * `SectionNav` — 4-button section toggle in the left rail.
 *
 * Reference: `docs/STUDIO_OLIVIA_DESIGN.md` § 2.3 #5 — "Section nav: four
 * buttons: Pitch Decks (count = slides), Business Plans (count =
 * `PLAN_SECTIONS.length`), Documents (count = `totalDocs`), General.
 * Active button gets accent tint and accent border."
 *
 * Drives the `navSection` state in `page.tsx`. Active section determines
 * which left-rail content panel mounts below (FrameworksPanel for pitch,
 * PlanSectionNav for plan, DocumentTree for documents, nothing for
 * general).
 */

import type { NavSection } from "@/lib/studio/types";

export interface SectionNavProps {
  /** Currently-active section. */
  active: NavSection;
  /** Called when the user clicks a different section button. */
  onChange: (section: NavSection) => void;
  /** Per-section counts shown as small badges. `general` has no count. */
  counts: {
    pitch: number;
    plan: number;
    documents: number;
  };
}

interface SectionEntry {
  key: NavSection;
  label: string;
  icon: string;
}

const SECTIONS: readonly SectionEntry[] = [
  { key: "pitch", label: "Pitch Decks", icon: "✦" },
  { key: "plan", label: "Business Plans", icon: "📋" },
  { key: "documents", label: "Documents", icon: "📄" },
  { key: "general", label: "General", icon: "💬" },
];

export function SectionNav({ active, onChange, counts }: SectionNavProps) {
  return (
    <nav
      aria-label="Section navigation"
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
        Sections
      </div>
      {SECTIONS.map((entry) => {
        const isActive = entry.key === active;
        const count =
          entry.key === "pitch"
            ? counts.pitch
            : entry.key === "plan"
              ? counts.plan
              : entry.key === "documents"
                ? counts.documents
                : null;

        return (
          <button
            key={entry.key}
            type="button"
            aria-current={isActive ? "page" : undefined}
            onClick={() => onChange(entry.key)}
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              background: isActive ? "var(--aurum-mute)" : "var(--surface-1)",
              border: `1px solid ${isActive ? "var(--border-aurum)" : "var(--border-subtle)"}`,
              borderRadius: "var(--radius-md)",
              color: isActive ? "var(--aurum-primary)" : "var(--fg-primary)",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-sm)",
              fontWeight: isActive ? 600 : 500,
              cursor: "pointer",
              textAlign: "left",
              transition:
                "background var(--duration-micro) var(--ease-out-quart), border-color var(--duration-micro) var(--ease-out-quart), color var(--duration-micro) var(--ease-out-quart)",
            }}
          >
            <span aria-hidden="true" style={{ width: 18, textAlign: "center" }}>
              {entry.icon}
            </span>
            <span>{entry.label}</span>
            {count != null && (
              <span
                aria-label={`${count} items`}
                className="tabular-nums"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontFeatureSettings: '"tnum" 1, "lnum" 1',
                  fontSize: "var(--text-2xs)",
                  color: isActive ? "var(--aurum-primary)" : "var(--fg-tertiary)",
                  fontWeight: 600,
                  background: isActive ? "transparent" : "var(--canvas-base)",
                  padding: "2px 6px",
                  borderRadius: "var(--radius-sm)",
                  border: isActive
                    ? "1px solid var(--border-aurum)"
                    : "1px solid var(--border-subtle)",
                  minWidth: 24,
                  textAlign: "center",
                }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
