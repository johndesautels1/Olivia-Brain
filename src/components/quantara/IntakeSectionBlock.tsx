"use client";

/**
 * `IntakeSectionBlock` — section header + responsive grid of fields.
 *
 * Mirrors the LTM mockup's `<div class="mb-16" id="section-...">`
 * pattern (`D:\London-Tech-Map\public\assets\founder-valuation-form.html`)
 * recoloured to Aurum tokens per `docs/01_UI_DESIGN_SYSTEM.md` § 1.3
 * (Aurum is the brand for finance / decision surfaces).
 *
 * Section structure:
 *   ┌─ Section header ───────────────────────────┐
 *   │  [icon]  Title  [field count badge]        │
 *   │          subtitle              N/M complete│
 *   └─────────────────────────────────────────────┘
 *   ┌──────────────┬──────────────┐
 *   │  field card  │  field card  │
 *   ├──────────────┼──────────────┤
 *   │  field card  │  field card  │
 *   └──────────────┴──────────────┘
 *
 * The grid auto-collapses to a single column under `768px`.
 */

import { useId } from "react";

import {
  QUANTARA_FIELDS,
  QUANTARA_SECTIONS_BY_ID,
  type QuantaraSectionId,
  type QuantaraValues,
  type QuantaraFieldId,
} from "@/lib/quantara";
import type { QuantaraSuggestion } from "@/lib/quantara/auto-fill";
import { Badge, CompletionRing } from "@/components/primitives";
import { sectionCompleteness } from "./completeness";
import { IntakeField } from "./IntakeField";
import { QUANTARA_SECTION_UI_META } from "./section-meta";

export interface IntakeSectionBlockProps {
  sectionId: QuantaraSectionId;
  values: QuantaraValues;
  onChange: (fieldId: QuantaraFieldId, value: unknown) => void;
  /** Per-field auto-fill suggestions (Q3). */
  suggestions?: ReadonlyMap<QuantaraFieldId, QuantaraSuggestion>;
  onAcceptSuggestion?: (fieldId: QuantaraFieldId) => void;
  onRejectSuggestion?: (fieldId: QuantaraFieldId) => void;
}

export function IntakeSectionBlock({
  sectionId,
  values,
  onChange,
  suggestions,
  onAcceptSuggestion,
  onRejectSuggestion,
}: IntakeSectionBlockProps) {
  const titleId = useId();
  const section = QUANTARA_SECTIONS_BY_ID[sectionId];
  const ui = QUANTARA_SECTION_UI_META[sectionId];
  const summary = sectionCompleteness(sectionId, values);
  const Icon = ui.icon;

  const sectionFields = QUANTARA_FIELDS.filter((f) => f.section === sectionId);

  return (
    <section
      id={`section-${sectionId}`}
      data-section-id={sectionId}
      aria-labelledby={titleId}
      style={{
        marginBottom: 64,
        scrollMarginTop: 80,
      }}
    >
      <div
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
              background: "var(--aurum-mute)",
              border: "1px solid var(--border-aurum)",
              color: "var(--aurum-primary)",
            }}
          >
            <Icon size={20} strokeWidth={1.75} />
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
                {section.title}
              </h2>
              <span
                style={{
                  padding: "1px 9px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-2xs)",
                  fontWeight: 600,
                  color: "var(--aurum-primary)",
                  background: "var(--aurum-mute)",
                  border: "1px solid var(--border-aurum)",
                  borderRadius: "var(--radius-full)",
                  letterSpacing: "0.04em",
                }}
              >
                {section.fieldCount}{" "}
                {section.fieldCount === 1 ? "field" : "fields"}
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
              {section.description}
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <CompletionRing value={summary.percent} size={28} showLabel={false} />
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
              {summary.fieldsFilled} / {summary.fieldsTotal}
            </div>
            <Badge value={summary.percent} size="sm" />
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 20,
          marginTop: 24,
        }}
      >
        {sectionFields.map((f) => (
          <IntakeField
            key={f.id}
            fieldId={f.id}
            value={values[f.id]}
            onChange={(next) => onChange(f.id, next)}
            suggestion={suggestions?.get(f.id)}
            onAcceptSuggestion={
              onAcceptSuggestion ? () => onAcceptSuggestion(f.id) : undefined
            }
            onRejectSuggestion={
              onRejectSuggestion ? () => onRejectSuggestion(f.id) : undefined
            }
          />
        ))}
      </div>
    </section>
  );
}
