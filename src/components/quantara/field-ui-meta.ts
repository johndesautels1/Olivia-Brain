/**
 * Quantara — Q2 per-field UI metadata.
 *
 * The Q1 `QuantaraFieldDefinition` (`src/lib/quantara/schema.ts`) holds
 * the domain contract: id, label, weight, Zod schema, investor-class
 * relevance. It deliberately does NOT carry render chrome (control
 * kind, unit suffix, layout span) — that's Q2 surface concern.
 *
 * This file maps each `QuantaraFieldId` (`f1`..`f56`) to:
 *   - `control` — which input primitive to render
 *   - `unitLabel` — right-side suffix (e.g. `GBP`, `%`, `months`, `:1`)
 *   - `step` — html `step` attribute for number inputs
 *   - `fullWidth` — whether the field's card spans the full grid (some
 *     longform text fields and sliders read better full-bleed)
 *
 * Origin is the LTM mockup
 * `D:\London-Tech-Map\public\assets\founder-valuation-form.html`. The
 * cyan-400 accent there is replaced by Aurum tokens per `docs/01_UI_DESIGN_SYSTEM.md`.
 */
import type { QuantaraFieldId } from "@/lib/quantara";

/**
 * Discrete control kinds. Each maps to a render branch in `IntakeField.tsx`.
 */
export type QuantaraFieldControlKind =
  | "currency-gbp"
  | "percent"
  | "integer"
  | "number"
  | "score-1-10"
  | "text"
  | "select-last-round-type"
  | "select-target-round-type";

export interface QuantaraFieldUiMeta {
  readonly control: QuantaraFieldControlKind;
  /** Right-side suffix label (e.g. `GBP`, `%`, `months`). */
  readonly unitLabel?: string;
  /** Optional numeric `step` attribute — defaults to `1` for ints, `0.01` for currency. */
  readonly step?: number;
  /** Whether the card spans the full row (longform text / sliders). */
  readonly fullWidth?: boolean;
}

/**
 * Canonical UI mapping. Order mirrors `QUANTARA_FIELDS` in the schema.
 * Each entry is mechanical from the LTM mockup — adding a new field
 * (Q5 metamorphic / Q6 vertical schedule) requires extending this map
 * in lockstep with the schema.
 */
export const QUANTARA_FIELD_UI_META: Readonly<
  Record<QuantaraFieldId, QuantaraFieldUiMeta>
> = Object.freeze({
  // ── § 1 Core Financials ─────────────────────────────────────────────
  f1: { control: "currency-gbp", unitLabel: "GBP" },
  f2: { control: "currency-gbp", unitLabel: "GBP" },
  f3: { control: "percent", unitLabel: "%", step: 0.1 },
  f4: { control: "percent", unitLabel: "%", step: 0.1 },
  f5: { control: "percent", unitLabel: "%", step: 0.1 },
  f6: { control: "percent", unitLabel: "%", step: 0.1 },
  f7: { control: "currency-gbp", unitLabel: "GBP" },
  f8: { control: "currency-gbp", unitLabel: "GBP" },
  f9: { control: "number", unitLabel: "months" },
  f10: { control: "currency-gbp", unitLabel: "GBP" },
  f11: { control: "currency-gbp", unitLabel: "GBP" },
  f12: { control: "number", unitLabel: ":1", step: 0.1 },
  f13: { control: "percent", unitLabel: "%", step: 0.1 },
  f14: { control: "percent", unitLabel: "%", step: 0.1 },

  // ── § 2 Capital Structure ───────────────────────────────────────────
  f15: { control: "currency-gbp", unitLabel: "GBP" },
  f16: { control: "currency-gbp", unitLabel: "GBP" },
  f17: { control: "integer", unitLabel: "shares" },
  f18: { control: "percent", unitLabel: "%", step: 0.1 },

  // ── § 3 Funding History ─────────────────────────────────────────────
  f19: { control: "currency-gbp", unitLabel: "GBP" },
  f20: { control: "currency-gbp", unitLabel: "GBP" },
  f21: { control: "select-last-round-type", fullWidth: true },

  // ── § 4 Current Round ───────────────────────────────────────────────
  f22: { control: "currency-gbp", unitLabel: "GBP" },
  f23: { control: "select-target-round-type" },

  // ── § 5 Traction ────────────────────────────────────────────────────
  f24: { control: "integer" },
  f25: { control: "currency-gbp", unitLabel: "GBP" },
  f26: { control: "integer" },
  f27: { control: "percent", unitLabel: "%", step: 0.1 },
  f28: { control: "integer" },
  f29: { control: "currency-gbp", unitLabel: "GBP" },

  // ── § 6 Market ──────────────────────────────────────────────────────
  f30: { control: "currency-gbp", unitLabel: "GBP" },
  f31: { control: "currency-gbp", unitLabel: "GBP" },
  f32: { control: "currency-gbp", unitLabel: "GBP" },
  f33: { control: "percent", unitLabel: "%", step: 0.1 },

  // ── § 7 IP & Moat ───────────────────────────────────────────────────
  f34: { control: "integer" },
  f35: { control: "integer" },
  f36: { control: "text", fullWidth: true },
  f37: { control: "percent", unitLabel: "%" },
  f38: { control: "text" },
  f39: { control: "score-1-10", fullWidth: true },

  // ── § 8 Team ────────────────────────────────────────────────────────
  f40: { control: "integer" },
  f41: { control: "percent", unitLabel: "%" },
  f42: { control: "number", unitLabel: "years" },
  f43: { control: "text", fullWidth: true },
  f44: { control: "score-1-10", fullWidth: true },

  // ── § 9 Risk Factors ────────────────────────────────────────────────
  f45: { control: "percent", unitLabel: "%" },
  f46: { control: "text" },
  f47: { control: "score-1-10", fullWidth: true },

  // ── § 10 Growth Levers ──────────────────────────────────────────────
  f48: { control: "percent", unitLabel: "%" },
  f49: { control: "number", step: 0.1 },
  f50: { control: "integer", unitLabel: "days" },
  f51: { control: "percent", unitLabel: "%" },

  // ── § 11 Projections ────────────────────────────────────────────────
  f52: { control: "currency-gbp", unitLabel: "GBP" },
  f53: { control: "currency-gbp", unitLabel: "GBP" },
  f54: { control: "currency-gbp", unitLabel: "GBP" },
  f55: { control: "integer", unitLabel: "months", fullWidth: true },

  // ── § 12 Strategic ──────────────────────────────────────────────────
  f56: { control: "integer", unitLabel: "years" },
});
