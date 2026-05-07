"use client";

/**
 * `IntakeOliviaPanel` — body of the inspector's "Olivia" tab on the
 * founder-intake surface.
 *
 * Q2 (this session) ships an informational-only placeholder: an
 * AvatarOrb with the current state, a status row ("Online · pre-Q3"),
 * and a contextual nudge that mentions which section Olivia would help
 * with next.
 *
 * Q3 (Composio auto-fill) replaces the body with live chat against
 * `/api/olivia/chat`. The component contract here stays stable so the
 * Q3 swap is a body-only change.
 */

import { useMemo } from "react";

import { AvatarOrb, type AvatarOrbState } from "@/components/primitives";
import {
  QUANTARA_SECTIONS,
  type QuantaraSectionId,
  type QuantaraValues,
} from "@/lib/quantara";
import { sectionCompleteness } from "./completeness";

export interface IntakeOliviaPanelProps {
  values: QuantaraValues;
  activeSection?: QuantaraSectionId;
  state?: AvatarOrbState;
}

export function IntakeOliviaPanel({
  values,
  activeSection,
  state = "idle",
}: IntakeOliviaPanelProps) {
  /**
   * Surface the next section that's most worth tackling — the section
   * with the lowest completion that is not already 100%. Pure local
   * heuristic; the live Olivia (Q3) will replace this with cascade-
   * derived guidance.
   */
  const nudge = useMemo(() => {
    let worst: { id: QuantaraSectionId; percent: number } | undefined;
    for (const s of QUANTARA_SECTIONS) {
      const summary = sectionCompleteness(s.id, values);
      if (summary.percent >= 100) continue;
      if (worst === undefined || summary.percent < worst.percent) {
        worst = { id: s.id, percent: summary.percent };
      }
    }
    if (worst === undefined) return null;
    const section = QUANTARA_SECTIONS.find((s) => s.id === worst!.id);
    return section
      ? `Next, the ${section.title} section will move your data quality the most.`
      : null;
  }, [values]);

  const activeTitle = useMemo(() => {
    if (!activeSection) return null;
    return QUANTARA_SECTIONS.find((s) => s.id === activeSection)?.title ?? null;
  }, [activeSection]);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <AvatarOrb size={56} state={state} label="Olivia" />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-md)",
              fontWeight: 600,
              color: "var(--fg-primary)",
            }}
          >
            Olivia
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 2,
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-2xs)",
              color: "var(--mint-up)",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 6,
                height: 6,
                borderRadius: "var(--radius-full)",
                background: "var(--mint-up)",
              }}
            />
            <span>Online · valuation copilot</span>
          </div>
        </div>
      </div>

      <div
        style={{
          padding: 16,
          background: "var(--surface-1)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            color: "var(--fg-secondary)",
            lineHeight: 1.55,
          }}
        >
          {activeTitle ? (
            <>
              You&apos;re editing <strong>{activeTitle}</strong>.{" "}
            </>
          ) : null}
          {nudge ?? "All 56 fields look complete — run a full valuation when you're ready."}
        </div>
      </div>

      <div
        style={{
          padding: 16,
          background: "var(--canvas-recess)",
          border: "1px dashed var(--border-default)",
          borderRadius: "var(--radius-lg)",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-xs)",
          color: "var(--fg-tertiary)",
          lineHeight: 1.55,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            color: "var(--fg-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 6,
          }}
        >
          Coming next session (Q3)
        </div>
        Olivia auto-fills fields from your connected Stripe / GitHub / Companies
        House data, with confidence-weighted source chips you can accept,
        reject, or edit.
      </div>
    </div>
  );
}
