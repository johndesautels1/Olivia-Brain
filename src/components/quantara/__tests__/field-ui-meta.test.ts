/**
 * Quantara Q2 — `field-ui-meta` invariants.
 *
 * Catches drift between the schema (`src/lib/quantara/schema.ts`, 56
 * fields) and the UI metadata that drives Q2's render layer.
 */
import { describe, expect, it } from "vitest";

import {
  QUANTARA_FIELDS,
  type QuantaraFieldId,
} from "@/lib/quantara";
import {
  QUANTARA_FIELD_UI_META,
  type QuantaraFieldControlKind,
} from "../field-ui-meta";
import { QUANTARA_SECTION_UI_META } from "../section-meta";

const VALID_CONTROLS: ReadonlyArray<QuantaraFieldControlKind> = [
  "currency-gbp",
  "percent",
  "integer",
  "number",
  "score-1-10",
  "text",
  "select-last-round-type",
  "select-target-round-type",
];

describe("QUANTARA_FIELD_UI_META", () => {
  it("has a meta entry for every field id (no drift vs schema)", () => {
    for (const f of QUANTARA_FIELDS) {
      expect(QUANTARA_FIELD_UI_META[f.id]).toBeDefined();
    }
  });

  it("uses only documented control kinds", () => {
    for (const id of Object.keys(QUANTARA_FIELD_UI_META) as QuantaraFieldId[]) {
      const meta = QUANTARA_FIELD_UI_META[id];
      expect(VALID_CONTROLS).toContain(meta.control);
    }
  });

  it("currency fields all carry the GBP unit label", () => {
    for (const id of Object.keys(QUANTARA_FIELD_UI_META) as QuantaraFieldId[]) {
      const meta = QUANTARA_FIELD_UI_META[id];
      if (meta.control === "currency-gbp") {
        expect(meta.unitLabel).toBe("GBP");
      }
    }
  });

  it("score-1-10 sliders are full-width per the LTM mockup", () => {
    for (const id of Object.keys(QUANTARA_FIELD_UI_META) as QuantaraFieldId[]) {
      const meta = QUANTARA_FIELD_UI_META[id];
      if (meta.control === "score-1-10") {
        expect(meta.fullWidth).toBe(true);
      }
    }
  });
});

describe("QUANTARA_SECTION_UI_META", () => {
  it("has a meta entry for every section id (12 sections)", () => {
    expect(Object.keys(QUANTARA_SECTION_UI_META)).toHaveLength(12);
  });

  it("every entry has an icon and a 3-letter iconLabel", () => {
    for (const meta of Object.values(QUANTARA_SECTION_UI_META)) {
      expect(meta.icon).toBeDefined();
      expect(meta.iconLabel.length).toBe(3);
      expect(meta.iconLabel).toBe(meta.iconLabel.toUpperCase());
    }
  });
});
