"use client";

/**
 * `IntakeVerticalBlock` — Q6 vertical-specific schedule.
 *
 * Mounts when the founder has selected a non-`generic` vertical via
 * the hero selector. Renders the 5 vertical-specific fields owned by
 * the active vertical (per
 * `src/lib/quantara/metamorphic/vertical-schedules.ts`).
 *
 * Storage:
 *   `ValuationSubject.quantaraJson.vertical[verticalId][subkey]`
 *
 * # Visual differentiation
 *
 * Q5 supplementary block uses **Aether** (intelligence / round-axis).
 * Q6 vertical block uses **sky-info** (informational / domain-axis).
 * Two distinct accents communicate "different metamorphism axes" to
 * the user without introducing a third raw color — both are part of
 * the existing semantic accent set in `01_UI_DESIGN_SYSTEM.md` § 1.4.
 *
 * Reuses `IntakeSupplementaryField` as the field renderer
 * (`MetamorphicFieldShape` is the shared structural type — see
 * `src/lib/quantara/metamorphic/types.ts`). One renderer; both axes.
 */

import { useId } from "react";
import { Briefcase } from "lucide-react";

import {
  getVerticalFieldsForVertical,
  QUANTARA_VERTICAL_BY_ID,
  type VerticalFieldDefinition,
  type VerticalFieldId,
  type VerticalId,
  type VerticalValuesForVertical,
} from "@/lib/quantara";
import { Badge, CompletionRing } from "@/components/primitives";

import { IntakeSupplementaryField } from "./IntakeSupplementaryField";

export interface IntakeVerticalBlockProps {
  /** Active vertical. Block hides when undefined or `generic`. */
  verticalId: VerticalId | undefined;
  /** Per-vertical values for the active vertical. */
  values: VerticalValuesForVertical;
  /** Update one vertical field. */
  onChange: (fieldId: VerticalFieldId, value: unknown) => void;
}

export function IntakeVerticalBlock({
  verticalId,
  values,
  onChange,
}: IntakeVerticalBlockProps) {
  const titleId = useId();

  if (!verticalId || verticalId === "generic") return null;
  const fields = getVerticalFieldsForVertical(verticalId);
  if (fields.length === 0) return null;
  const descriptor = QUANTARA_VERTICAL_BY_ID[verticalId];

  const filled = fields.filter((f) => isFilled(f, values[f.id])).length;
  const total = fields.length;
  const percent = total === 0 ? 0 : Math.round((filled / total) * 100);

  return (
    <section
      id="section-vertical"
      data-section-id="vertical"
      data-vertical-id={verticalId}
      aria-labelledby={titleId}
      style={{
        marginTop: 16,
        marginBottom: 64,
        padding: 24,
        background: "var(--surface-1)",
        border: "1px solid var(--sky-info)",
        borderRadius: "var(--radius-2xl)",
        backgroundImage:
          "linear-gradient(135deg, var(--sky-info-mute) 0%, transparent 60%)",
        scrollMarginTop: 80,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 16,
          paddingBottom: 16,
          borderBottom: "1px solid var(--border-default)",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            aria-hidden="true"
            style={{
              width: 40,
              height: 40,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "var(--radius-lg)",
              background: "var(--sky-info-mute)",
              border: "1px solid var(--sky-info)",
              color: "var(--sky-info)",
            }}
          >
            <Briefcase size={20} strokeWidth={1.75} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <h2
                id={titleId}
                style={{
                  margin: 0,
                  fontFamily: "var(--font-display)",
                  fontSize: "var(--text-xl)",
                  fontWeight: 600,
                  color: "var(--fg-primary)",
                  letterSpacing: "-0.02em",
                }}
              >
                {descriptor.label} schedule
              </h2>
              <span
                style={{
                  padding: "1px 9px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-2xs)",
                  fontWeight: 600,
                  color: "var(--sky-info)",
                  background: "var(--sky-info-mute)",
                  border: "1px solid var(--sky-info)",
                  borderRadius: "var(--radius-full)",
                  letterSpacing: "0.04em",
                }}
              >
                {total} {total === 1 ? "field" : "fields"}
              </span>
            </div>
            <div
              style={{
                marginTop: 2,
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-xs)",
                color: "var(--fg-tertiary)",
              }}
            >
              {descriptor.description}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <CompletionRing value={percent} size={28} showLabel={false} />
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-xs)",
                fontWeight: 600,
                color: "var(--fg-secondary)",
                fontFeatureSettings: '"tnum" 1, "lnum" 1',
              }}
            >
              {filled} / {total}
            </div>
            <Badge value={percent} size="sm" />
          </div>
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 20,
          marginTop: 24,
        }}
      >
        {fields.map((f) => (
          <IntakeSupplementaryField
            key={f.id}
            field={f}
            value={values[f.id]}
            onChange={(next) => onChange(f.id, next)}
          />
        ))}
      </div>
    </section>
  );
}

function isFilled(_def: VerticalFieldDefinition, value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}
