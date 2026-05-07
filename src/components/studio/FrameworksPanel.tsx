"use client";

/**
 * `FrameworksPanel` — 14 toggleable deck-archetype frameworks.
 *
 * Reference: `docs/STUDIO_OLIVIA_DESIGN.md` § 2.3 #7. Mounts in the left
 * rail when `navSection === "pitch"`. Each row toggles in/out of
 * `activeFrameworks: Set<number>`; active items show a colored dot
 * (driven by `frameworkCategoryToken`) + confidence number.
 *
 * Per `01_UI_DESIGN_SYSTEM.md` § 1.6 — colors come from canonical
 * tokens, not the prototype's raw hex.
 */

import { FRAMEWORKS, frameworkCategoryToken } from "@/lib/studio/frameworks";

export interface FrameworksPanelProps {
  /** Set of active framework ids. */
  active: Set<number>;
  /** Toggle a framework on/off. */
  onToggle: (id: number) => void;
}

export function FrameworksPanel({ active, onToggle }: FrameworksPanelProps) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
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
        Frameworks
      </div>
      <ul
        role="list"
        aria-label="Deck frameworks"
        style={{
          margin: 0,
          padding: 0,
          listStyle: "none",
          display: "grid",
          gap: 2,
        }}
      >
        {FRAMEWORKS.map((fw) => {
          const isActive = active.has(fw.id);
          const token = frameworkCategoryToken(fw.cat);
          return (
            <li key={fw.id}>
              <button
                type="button"
                aria-pressed={isActive}
                onClick={() => onToggle(fw.id)}
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
                  color: "var(--fg-primary)",
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-xs)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition:
                    "background var(--duration-micro) var(--ease-out-quart), border-color var(--duration-micro) var(--ease-out-quart)",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "var(--radius-full)",
                    background: isActive ? token : "var(--border-strong)",
                    transition: "background var(--duration-micro) var(--ease-out-quart)",
                  }}
                />
                <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
                  <span
                    style={{
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? "var(--aurum-primary)" : "var(--fg-primary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {fw.name}
                  </span>
                  <span
                    style={{
                      color: "var(--fg-tertiary)",
                      fontSize: "var(--text-2xs)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {fw.tag}
                  </span>
                </span>
                {isActive && (
                  <span
                    aria-label={`${fw.conf} percent confidence`}
                    className="tabular-nums"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontFeatureSettings: '"tnum" 1, "lnum" 1',
                      fontSize: "var(--text-2xs)",
                      color: token,
                      fontWeight: 700,
                    }}
                  >
                    {fw.conf}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
