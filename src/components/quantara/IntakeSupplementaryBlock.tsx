"use client";

/**
 * `IntakeSupplementaryBlock` — Q5 round-specific supplementary fields.
 *
 * Mounts only when `f23 — Target Round Type` is set in the canonical
 * intake. Renders the 3 round-specific supplementary fields owned by the
 * active round type (per
 * `src/lib/quantara/metamorphic/supplementary.ts`).
 *
 * Storage is separate from the canonical 56:
 *   `ValuationSubject.quantaraJson.supplementary[roundType][subkey]`
 *
 * Switching round types in the form does NOT clear previously-entered
 * supplementary values for other rounds — `IntakeForm` keeps the full
 * `SupplementaryValues` map in state and only swaps which slot is
 * visible. Round-trip-safe.
 *
 * Visual chrome mirrors `IntakeSectionBlock` (icon · title · count chip ·
 * completion ring · field grid), with an Aether-tinted accent so the
 * supplementary block reads as "AI signal" / "round-specific" rather
 * than canonical Aurum data. Per `docs/01_UI_DESIGN_SYSTEM.md` § 1.3:
 * Aether = intelligence/exploration, Aurum = decisions/value.
 */

import { useId } from "react";
import { Sparkles } from "lucide-react";

import {
  getSupplementaryFieldsForRound,
  type SupplementaryFieldDefinition,
  type SupplementaryFieldId,
  type SupplementaryValuesForRound,
} from "@/lib/quantara";
import type { TargetRoundType } from "@/lib/quantara";
import { Badge, CompletionRing } from "@/components/primitives";

import { IntakeSupplementaryField } from "./IntakeSupplementaryField";

export interface IntakeSupplementaryBlockProps {
  /** Active target round type (`values.f23`). Block hides when undefined. */
  roundType: TargetRoundType | undefined;
  /** Per-round supplementary values for the active round. */
  values: SupplementaryValuesForRound;
  /** Update one supplementary field. */
  onChange: (fieldId: SupplementaryFieldId, value: unknown) => void;
}

export function IntakeSupplementaryBlock({
  roundType,
  values,
  onChange,
}: IntakeSupplementaryBlockProps) {
  const titleId = useId();

  if (!roundType) return null;
  const fields = getSupplementaryFieldsForRound(roundType);
  if (fields.length === 0) return null;

  const filled = fields.filter((f) => isFilled(f, values[f.id])).length;
  const total = fields.length;
  const percent = total === 0 ? 0 : Math.round((filled / total) * 100);

  return (
    <section
      id="section-supplementary"
      data-section-id="supplementary"
      data-round-type={roundType}
      aria-labelledby={titleId}
      style={{
        marginTop: 16,
        marginBottom: 64,
        padding: 24,
        background: "var(--surface-1)",
        border: "1px solid var(--border-aether)",
        borderRadius: "var(--radius-2xl)",
        backgroundImage:
          "linear-gradient(135deg, var(--aether-mute) 0%, transparent 60%)",
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
              background: "var(--aether-mute)",
              border: "1px solid var(--border-aether)",
              color: "var(--aether-primary)",
            }}
          >
            <Sparkles size={20} strokeWidth={1.75} />
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
                {roundType} signal
              </h2>
              <span
                style={{
                  padding: "1px 9px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-2xs)",
                  fontWeight: 600,
                  color: "var(--aether-primary)",
                  background: "var(--aether-mute)",
                  border: "1px solid var(--border-aether)",
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
              Round-specific signals investors at this stage expect to see.
              Optional, but they sharpen the verdict.
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

/**
 * "Filled" matches the canonical-field rule in `./completeness.ts`:
 * non-empty value (numbers including 0 count; empty string and empty
 * array do not).
 */
function isFilled(
  _def: SupplementaryFieldDefinition,
  value: unknown,
): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}
