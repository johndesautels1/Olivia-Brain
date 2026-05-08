"use client";

/**
 * `IntakeSupplementaryField` — render one Q5 supplementary field.
 *
 * Self-contained renderer covering every `SupplementaryControlKind`:
 *   - `text` / `long-text` — single / multi-line strings
 *   - `currency-gbp` / `percent` / `integer` / `number` — numeric
 *   - `select-enum` — single-choice radio-style or native select
 *   - `multi-select-enum` — checkbox group
 *
 * Why a separate component (vs reusing `IntakeField`):
 *
 * The canonical `IntakeField` is tightly coupled to the `f1..f56`
 * lookup (`QUANTARA_FIELDS_BY_ID`), the per-canonical-field UI metadata
 * map (`QUANTARA_FIELD_UI_META`), and the suggestion / discrepancy
 * cascades wired in Q3 / Q4. Reusing it would pull in id namespaces and
 * lookup paths that don't exist for supplementary fields. A focused
 * supplementary renderer keeps the seams clean — Q3 / Q4 extensions for
 * supplementary fields ship later as additive props, not retrofits.
 */

import { useId, type ChangeEvent } from "react";

import type { MetamorphicFieldShape } from "@/lib/quantara";

export interface IntakeSupplementaryFieldProps {
  /**
   * Field descriptor — accepts both `SupplementaryFieldDefinition` (Q5
   * round-axis) and `VerticalFieldDefinition` (Q6 vertical-axis) via the
   * shared `MetamorphicFieldShape` structural type. Renderer reads only
   * the structural properties and is axis-agnostic.
   */
  field: MetamorphicFieldShape;
  value: unknown;
  onChange: (next: unknown) => void;
}

const cardStyle: React.CSSProperties = {
  padding: 20,
  background: "var(--surface-2)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-lg)",
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-sm)",
  fontWeight: 600,
  color: "var(--fg-primary)",
  lineHeight: 1.3,
};

const descStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-xs)",
  color: "var(--fg-tertiary)",
  lineHeight: 1.4,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "var(--canvas-recess)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)",
  color: "var(--fg-primary)",
  fontFamily: "var(--font-sans)",
  fontSize: "var(--text-sm)",
  outline: "none",
  touchAction: "manipulation",
};

const numericInputStyle: React.CSSProperties = {
  ...inputStyle,
  fontFamily: "var(--font-mono)",
  fontFeatureSettings: '"tnum" 1, "lnum" 1',
};

export function IntakeSupplementaryField({
  field,
  value,
  onChange,
}: IntakeSupplementaryFieldProps) {
  const inputId = useId();
  const descId = useId();
  const labelText = field.label;
  /* Stable radio-group name. Field ids are unique across both Q5
     supplementary (`s1..s18`) and Q6 vertical (`v1..v20`) namespaces
     so a single prefix is fine. */
  const fieldNameForRadio = `metamorphic-${field.id}`;

  return (
    <div style={cardStyle}>
      <div>
        <label htmlFor={inputId} style={labelStyle}>
          {labelText}
          {field.unitLabel && (
            <span
              aria-hidden="true"
              style={{
                marginLeft: 6,
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-2xs)",
                fontWeight: 500,
                color: "var(--fg-tertiary)",
                letterSpacing: "0.04em",
              }}
            >
              {field.unitLabel}
            </span>
          )}
        </label>
        <p id={descId} style={descStyle}>
          {field.description}
        </p>
        {field.hint && (
          <p
            style={{
              ...descStyle,
              marginTop: 2,
              color: "var(--aether-primary)",
            }}
          >
            {field.hint}
          </p>
        )}
      </div>

      {renderControl({
        field,
        value,
        onChange,
        inputId,
        descId,
        fieldName: fieldNameForRadio,
      })}
    </div>
  );
}

interface ControlRenderArgs {
  field: MetamorphicFieldShape;
  value: unknown;
  onChange: (next: unknown) => void;
  inputId: string;
  descId: string;
  fieldName: string;
}

function renderControl({
  field,
  value,
  onChange,
  inputId,
  descId,
  fieldName,
}: ControlRenderArgs) {
  switch (field.control) {
    case "text":
      return (
        <input
          id={inputId}
          type="text"
          value={typeof value === "string" ? value : ""}
          aria-describedby={descId}
          placeholder={field.hint ?? ""}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange(e.target.value || undefined)
          }
          style={inputStyle}
        />
      );

    case "long-text":
      return (
        <textarea
          id={inputId}
          rows={3}
          value={typeof value === "string" ? value : ""}
          aria-describedby={descId}
          placeholder={field.hint ?? ""}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
            onChange(e.target.value || undefined)
          }
          style={{
            ...inputStyle,
            resize: "vertical",
            minHeight: 72,
            fontFamily: "var(--font-sans)",
          }}
        />
      );

    case "currency-gbp":
    case "percent":
    case "number":
      return (
        <input
          id={inputId}
          type="number"
          inputMode="decimal"
          step={field.step ?? (field.control === "currency-gbp" ? 0.01 : 0.1)}
          value={
            typeof value === "number" && Number.isFinite(value) ? value : ""
          }
          aria-describedby={descId}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange(
              e.target.value === ""
                ? undefined
                : Number.parseFloat(e.target.value),
            )
          }
          style={numericInputStyle}
        />
      );

    case "integer":
      return (
        <input
          id={inputId}
          type="number"
          inputMode="numeric"
          step={1}
          value={
            typeof value === "number" && Number.isFinite(value) ? value : ""
          }
          aria-describedby={descId}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange(
              e.target.value === ""
                ? undefined
                : Number.parseInt(e.target.value, 10),
            )
          }
          style={numericInputStyle}
        />
      );

    case "select-enum": {
      const opts = field.options ?? [];
      return (
        <fieldset
          aria-describedby={descId}
          style={{
            border: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <legend className="sr-only">{field.label}</legend>
          {opts.map((opt) => (
            <label
              key={opt.value}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                background:
                  value === opt.value ? "var(--aether-mute)" : "transparent",
                border: `1px solid ${
                  value === opt.value
                    ? "var(--border-aether)"
                    : "var(--border-default)"
                }`,
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                color: "var(--fg-secondary)",
                touchAction: "manipulation",
              }}
            >
              <input
                type="radio"
                name={fieldName}
                value={opt.value}
                checked={value === opt.value}
                onChange={() => onChange(opt.value)}
                style={{ accentColor: "var(--aether-primary)" }}
              />
              {opt.label}
            </label>
          ))}
        </fieldset>
      );
    }

    case "multi-select-enum": {
      const opts = field.options ?? [];
      const selected = Array.isArray(value)
        ? (value.filter((v) => typeof v === "string") as string[])
        : [];
      return (
        <fieldset
          aria-describedby={descId}
          style={{
            border: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <legend className="sr-only">{field.label}</legend>
          {opts.map((opt) => {
            const isOn = selected.includes(opt.value);
            return (
              <label
                key={opt.value}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  background: isOn ? "var(--aether-mute)" : "transparent",
                  border: `1px solid ${
                    isOn ? "var(--border-aether)" : "var(--border-default)"
                  }`,
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-sm)",
                  color: "var(--fg-secondary)",
                  touchAction: "manipulation",
                }}
              >
                <input
                  type="checkbox"
                  checked={isOn}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...selected, opt.value]
                      : selected.filter((v) => v !== opt.value);
                    onChange(next.length > 0 ? next : undefined);
                  }}
                  style={{ accentColor: "var(--aether-primary)" }}
                />
                {opt.label}
              </label>
            );
          })}
        </fieldset>
      );
    }
  }
}
