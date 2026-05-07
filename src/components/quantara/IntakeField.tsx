"use client";

/**
 * `IntakeField` — single-field card for the Quantara founder intake.
 *
 * Renders a glass-morphic card with:
 *   - field label + critical-weight indicator (`*`)
 *   - control dispatched on `QuantaraFieldUiMeta.control` (currency,
 *     percent, integer, number, score-1-10 slider, text, select)
 *   - hint row underneath (matches the LTM mockup's `field-hint`
 *     pattern, recoloured to `--fg-tertiary` per the design system)
 *
 * # Tokens
 *
 * Every paint references a CSS custom property from `src/styles/tokens.css`.
 * No raw hex per `docs/01_UI_DESIGN_SYSTEM.md` § 1.6. The LTM mockup's
 * `cyan-400` focus ring is replaced by `--aurum-primary`.
 *
 * # Accessibility
 *
 * - Every input is wired to its `<label>` via `htmlFor`/`id`.
 * - Required-style critical fields surface a `*` in `--coral-down`
 *   AND an `aria-describedby` hint announcing "critical for valuation".
 * - Score-1-10 sliders render a visible numeric badge so screen-reader
 *   users have a non-decorative announcement of the current value.
 * - All controls inherit the global `:focus-visible` aurum ring from
 *   `base.css`.
 * - Touch targets ≥ 44×44 CSS px (Vercel guideline) on the slider thumb.
 */

import { useId, type ChangeEvent } from "react";

import {
  QUANTARA_FIELDS_BY_ID,
  type QuantaraFieldDefinition,
  type QuantaraFieldId,
} from "@/lib/quantara";
import type { QuantaraSuggestion } from "@/lib/quantara/auto-fill";

import { isFilled } from "./completeness";
import {
  QUANTARA_FIELD_UI_META,
  type QuantaraFieldUiMeta,
} from "./field-ui-meta";

export interface IntakeFieldProps {
  /** The field id to render. */
  fieldId: QuantaraFieldId;
  /** Current value (any type — discriminated by control kind). */
  value: unknown;
  /** Called with the new value when the user edits the input. */
  onChange: (value: unknown) => void;
  /**
   * Optional Q3 auto-fill suggestion for this field. When set,
   * `IntakeField` renders a source chip + accept (✓) / reject (✗)
   * affordance below the control. Manual edits via `onChange`
   * implicitly dismiss the suggestion (the consumer wires that
   * behaviour by clearing the suggestion in its state).
   */
  suggestion?: QuantaraSuggestion;
  /** Called when the founder accepts the suggestion. */
  onAcceptSuggestion?: () => void;
  /** Called when the founder rejects (dismisses) the suggestion. */
  onRejectSuggestion?: () => void;
}

const LAST_ROUND_OPTIONS: ReadonlyArray<string> = [
  "Pre-Seed",
  "Seed",
  "Series A",
  "Series B",
  "Series C+",
  "Bridge",
];

const TARGET_ROUND_OPTIONS: ReadonlyArray<string> = [
  "Seed",
  "Series A",
  "Series B",
  "Series C",
  "Growth",
  "Strategic",
];

/**
 * Coerce a raw `<input>` value (always `string`) into the JS-side type
 * the consumer expects. Empty string clears the value (returns
 * `undefined`) so the round-trip helpers don't persist `""` for cleared
 * fields.
 */
function coerceNumber(raw: string): number | undefined {
  if (raw === "") return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function coerceText(raw: string): string | undefined {
  return raw === "" ? undefined : raw;
}

export function IntakeField({
  fieldId,
  value,
  onChange,
  suggestion,
  onAcceptSuggestion,
  onRejectSuggestion,
}: IntakeFieldProps) {
  const inputId = useId();
  const hintId = useId();
  const field: QuantaraFieldDefinition = QUANTARA_FIELDS_BY_ID[fieldId];
  const ui: QuantaraFieldUiMeta = QUANTARA_FIELD_UI_META[fieldId];
  const isCritical = field.weight === 3;
  const filled = isFilled(value);
  const showSuggestion = suggestion !== undefined && !filled;

  return (
    <div
      data-field-id={fieldId}
      data-filled={filled || undefined}
      data-has-suggestion={showSuggestion || undefined}
      style={{
        gridColumn: ui.fullWidth ? "1 / -1" : undefined,
        background: "var(--surface-translucent)",
        border: showSuggestion
          ? "1px solid var(--border-aether)"
          : "1px solid var(--border-default)",
        borderRadius: "var(--radius-xl)",
        padding: 20,
        backdropFilter: "blur(16px) saturate(1.4)",
        transition:
          "border-color var(--duration-default) var(--ease-out-quart)",
      }}
    >
      <label
        htmlFor={inputId}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-sm)",
          fontWeight: 500,
          color: "var(--fg-secondary)",
          marginBottom: 8,
        }}
      >
        <span>{field.label}</span>
        {isCritical && (
          <span
            aria-hidden="true"
            title="Critical for valuation"
            style={{ color: "var(--coral-down)", fontSize: "var(--text-xs)" }}
          >
            •
          </span>
        )}
      </label>

      {renderControl({ field, ui, inputId, hintId, value, onChange })}

      {(field.hint || isCritical) && (
        <div
          id={hintId}
          style={{
            marginTop: 6,
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-xs)",
            color: "var(--fg-tertiary)",
          }}
        >
          {isCritical ? (
            <span style={{ color: "var(--coral-down)" }}>
              Critical for valuation.{" "}
            </span>
          ) : null}
          {field.hint ?? ""}
        </div>
      )}

      {showSuggestion && suggestion && (
        <SuggestionRow
          suggestion={suggestion}
          onAccept={onAcceptSuggestion}
          onReject={onRejectSuggestion}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Suggestion row — Q3 auto-fill chip + accept/reject controls.
// ─────────────────────────────────────────────────────────────────────

interface SuggestionRowProps {
  suggestion: QuantaraSuggestion;
  onAccept?: () => void;
  onReject?: () => void;
}

function SuggestionRow({ suggestion, onAccept, onReject }: SuggestionRowProps) {
  return (
    <div
      role="group"
      aria-label="Olivia auto-fill suggestion"
      style={{
        marginTop: 12,
        padding: "10px 12px",
        background: "var(--aether-mute)",
        border: "1px solid var(--border-aether)",
        borderRadius: "var(--radius-md)",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span
            data-suggestion-source={suggestion.source.integration}
            style={{
              padding: "2px 8px",
              background: "var(--canvas-recess)",
              border: "1px solid var(--border-aether)",
              borderRadius: "var(--radius-full)",
              color: "var(--aether-primary)",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-2xs)",
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            {suggestion.source.label}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-xs)",
              color: "var(--fg-secondary)",
              fontWeight: 600,
              fontFeatureSettings: '"tnum" 1, "lnum" 1',
            }}
          >
            {formatSuggestionValue(suggestion.value)}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-2xs)",
              color: "var(--fg-tertiary)",
              fontFeatureSettings: '"tnum" 1, "lnum" 1',
            }}
          >
            {Math.round(suggestion.confidence * 100)}% conf
          </span>
        </div>
        {suggestion.source.note && (
          <div
            style={{
              marginTop: 4,
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-2xs)",
              color: "var(--fg-tertiary)",
              lineHeight: 1.4,
            }}
          >
            {suggestion.source.note}
            {suggestion.source.mockMode && " · mock-mode"}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button
          type="button"
          onClick={onAccept}
          aria-label="Accept Olivia's suggestion"
          style={{
            padding: "4px 10px",
            background: "var(--mint-up-mute)",
            border: "1px solid var(--mint-up)",
            borderRadius: "var(--radius-md)",
            color: "var(--mint-up)",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-xs)",
            fontWeight: 600,
            cursor: "pointer",
            touchAction: "manipulation",
          }}
        >
          ✓ Accept
        </button>
        <button
          type="button"
          onClick={onReject}
          aria-label="Reject Olivia's suggestion"
          style={{
            padding: "4px 10px",
            background: "transparent",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            color: "var(--fg-tertiary)",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-xs)",
            fontWeight: 600,
            cursor: "pointer",
            touchAction: "manipulation",
          }}
        >
          ✗ Reject
        </button>
      </div>
    </div>
  );
}

function formatSuggestionValue(value: unknown): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return String(value);
    if (Math.abs(value) >= 1_000) {
      return new Intl.NumberFormat("en-GB", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(value);
    }
    return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(
      value,
    );
  }
  if (typeof value === "string") {
    return value.length > 48 ? `${value.slice(0, 45)}…` : value;
  }
  return JSON.stringify(value);
}

interface RenderControlArgs {
  field: QuantaraFieldDefinition;
  ui: QuantaraFieldUiMeta;
  inputId: string;
  hintId: string;
  value: unknown;
  onChange: (value: unknown) => void;
}

function renderControl({
  field,
  ui,
  inputId,
  hintId,
  value,
  onChange,
}: RenderControlArgs) {
  const ariaDescribedBy = field.hint || field.weight === 3 ? hintId : undefined;

  switch (ui.control) {
    case "currency-gbp":
      return (
        <CurrencyInput
          id={inputId}
          ariaLabel={field.label}
          ariaDescribedBy={ariaDescribedBy}
          value={typeof value === "number" ? value : undefined}
          unitLabel={ui.unitLabel}
          step={ui.step}
          onChange={(next) => onChange(next)}
        />
      );
    case "percent":
    case "number":
    case "integer":
      return (
        <NumberInput
          id={inputId}
          ariaLabel={field.label}
          ariaDescribedBy={ariaDescribedBy}
          value={typeof value === "number" ? value : undefined}
          unitLabel={ui.unitLabel}
          step={ui.step ?? (ui.control === "integer" ? 1 : undefined)}
          integerOnly={ui.control === "integer"}
          onChange={(next) => onChange(next)}
        />
      );
    case "score-1-10":
      return (
        <ScoreSlider
          id={inputId}
          ariaLabel={field.label}
          ariaDescribedBy={ariaDescribedBy}
          value={typeof value === "number" ? value : 5}
          isFilled={typeof value === "number"}
          onChange={(next) => onChange(next)}
        />
      );
    case "text":
      return (
        <TextInput
          id={inputId}
          ariaLabel={field.label}
          ariaDescribedBy={ariaDescribedBy}
          value={typeof value === "string" ? value : ""}
          placeholder={field.hint ?? ""}
          onChange={(next) => onChange(next)}
        />
      );
    case "select-last-round-type":
      return (
        <SelectInput
          id={inputId}
          ariaLabel={field.label}
          ariaDescribedBy={ariaDescribedBy}
          value={typeof value === "string" ? value : ""}
          options={LAST_ROUND_OPTIONS}
          onChange={(next) => onChange(next)}
        />
      );
    case "select-target-round-type":
      return (
        <SelectInput
          id={inputId}
          ariaLabel={field.label}
          ariaDescribedBy={ariaDescribedBy}
          value={typeof value === "string" ? value : ""}
          options={TARGET_ROUND_OPTIONS}
          onChange={(next) => onChange(next)}
        />
      );
  }
}

// ─────────────────────────────────────────────────────────────────────
// Sub-controls
// ─────────────────────────────────────────────────────────────────────

interface CurrencyInputProps {
  id: string;
  ariaLabel: string;
  ariaDescribedBy?: string;
  value?: number;
  unitLabel?: string;
  step?: number;
  onChange: (value: number | undefined) => void;
}

function CurrencyInput({
  id,
  ariaLabel,
  ariaDescribedBy,
  value,
  unitLabel,
  step,
  onChange,
}: CurrencyInputProps) {
  return (
    <div style={{ position: "relative" }}>
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 16,
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--fg-tertiary)",
          fontFamily: "var(--font-mono)",
          fontWeight: 500,
        }}
      >
        £
      </span>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        value={value ?? ""}
        step={step}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          onChange(coerceNumber(e.target.value))
        }
        style={{
          width: "100%",
          padding: "12px 16px 12px 36px",
          paddingRight: unitLabel ? 56 : 16,
          background: "var(--canvas-recess)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          color: "var(--fg-primary)",
          fontFamily: "var(--font-mono)",
          fontFeatureSettings: '"tnum" 1, "lnum" 1',
          fontSize: "var(--text-lg)",
          fontWeight: 500,
          outline: "none",
          touchAction: "manipulation",
        }}
      />
      {unitLabel && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            right: 16,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--fg-tertiary)",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-xs)",
          }}
        >
          {unitLabel}
        </span>
      )}
    </div>
  );
}

interface NumberInputProps {
  id: string;
  ariaLabel: string;
  ariaDescribedBy?: string;
  value?: number;
  unitLabel?: string;
  step?: number;
  integerOnly?: boolean;
  onChange: (value: number | undefined) => void;
}

function NumberInput({
  id,
  ariaLabel,
  ariaDescribedBy,
  value,
  unitLabel,
  step,
  integerOnly,
  onChange,
}: NumberInputProps) {
  return (
    <div style={{ position: "relative" }}>
      <input
        id={id}
        type="number"
        inputMode={integerOnly ? "numeric" : "decimal"}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        value={value ?? ""}
        step={step}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          const next = coerceNumber(e.target.value);
          onChange(
            integerOnly && typeof next === "number" ? Math.trunc(next) : next,
          );
        }}
        style={{
          width: "100%",
          padding: "12px 16px",
          paddingRight: unitLabel ? 64 : 16,
          background: "var(--canvas-recess)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          color: "var(--fg-primary)",
          fontFamily: "var(--font-mono)",
          fontFeatureSettings: '"tnum" 1, "lnum" 1',
          fontSize: "var(--text-lg)",
          fontWeight: 500,
          outline: "none",
          touchAction: "manipulation",
        }}
      />
      {unitLabel && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            right: 16,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--fg-tertiary)",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-xs)",
          }}
        >
          {unitLabel}
        </span>
      )}
    </div>
  );
}

interface ScoreSliderProps {
  id: string;
  ariaLabel: string;
  ariaDescribedBy?: string;
  value: number;
  isFilled: boolean;
  onChange: (value: number) => void;
}

function ScoreSlider({
  id,
  ariaLabel,
  ariaDescribedBy,
  value,
  isFilled: _isFilled,
  onChange,
}: ScoreSliderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}
    >
      <input
        id={id}
        type="range"
        min={1}
        max={10}
        step={1}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-valuemin={1}
        aria-valuemax={10}
        aria-valuenow={value}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          onChange(Number(e.target.value))
        }
        style={{
          flex: 1,
          accentColor: "var(--aurum-primary)",
          touchAction: "manipulation",
          minHeight: 44,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          minWidth: 64,
          padding: "6px 12px",
          background: "var(--aurum-mute)",
          border: "1px solid var(--border-aurum)",
          borderRadius: "var(--radius-md)",
          textAlign: "center",
          fontFamily: "var(--font-mono)",
          fontFeatureSettings: '"tnum" 1, "lnum" 1',
        }}
      >
        <span
          style={{
            color: "var(--aurum-primary)",
            fontSize: "var(--text-xl)",
            fontWeight: 600,
          }}
        >
          {value}
        </span>
        <span
          style={{
            color: "var(--fg-tertiary)",
            fontSize: "var(--text-xs)",
            marginLeft: 2,
          }}
        >
          /10
        </span>
      </div>
    </div>
  );
}

interface TextInputProps {
  id: string;
  ariaLabel: string;
  ariaDescribedBy?: string;
  value: string;
  placeholder?: string;
  onChange: (value: string | undefined) => void;
}

function TextInput({
  id,
  ariaLabel,
  ariaDescribedBy,
  value,
  placeholder,
  onChange,
}: TextInputProps) {
  return (
    <input
      id={id}
      type="text"
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      value={value}
      placeholder={placeholder}
      onChange={(e: ChangeEvent<HTMLInputElement>) =>
        onChange(coerceText(e.target.value))
      }
      style={{
        width: "100%",
        padding: "12px 16px",
        background: "var(--canvas-recess)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-lg)",
        color: "var(--fg-primary)",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-base)",
        fontWeight: 400,
        outline: "none",
        touchAction: "manipulation",
      }}
    />
  );
}

interface SelectInputProps {
  id: string;
  ariaLabel: string;
  ariaDescribedBy?: string;
  value: string;
  options: ReadonlyArray<string>;
  onChange: (value: string) => void;
}

function SelectInput({
  id,
  ariaLabel,
  ariaDescribedBy,
  value,
  options,
  onChange,
}: SelectInputProps) {
  return (
    <select
      id={id}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      value={value}
      onChange={(e: ChangeEvent<HTMLSelectElement>) =>
        onChange(e.target.value)
      }
      style={{
        width: "100%",
        padding: "12px 16px",
        background: "var(--canvas-recess)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-lg)",
        color: "var(--fg-primary)",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-base)",
        fontWeight: 500,
        outline: "none",
        touchAction: "manipulation",
        cursor: "pointer",
      }}
    >
      <option value="">Select…</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}
