/**
 * `ChartSpec` — minimal JSON shape Olivia returns inside ```chart``` fences.
 *
 * Covers 90% of pitch / valuation / dashboard chart needs:
 *   - bar    : grouped or stacked vertical bars
 *   - line   : single or multi-series line
 *   - area   : line with filled body
 *   - pie    : donut or pie
 *
 * Validated by a hand-rolled checker (no Zod dep here to keep the
 * client bundle minimal — `react-markdown` already pulls plenty in).
 *
 * Example fence Olivia returns:
 *
 *   ```chart
 *   {
 *     "type": "bar",
 *     "title": "Funding by stage",
 *     "data": [
 *       { "stage": "Seed", "amount": 12 },
 *       { "stage": "Series A", "amount": 38 },
 *       { "stage": "Series B", "amount": 84 }
 *     ],
 *     "x": "stage",
 *     "series": [{ "key": "amount", "label": "£M", "color": "aurum" }]
 *   }
 *   ```
 */

export type ChartType = "bar" | "line" | "area" | "pie";

/** Token-keyed colors so series stay on-brand. */
export type ChartColorToken =
  | "aurum"
  | "aether"
  | "mint"
  | "coral"
  | "sky"
  | "amber"
  | "fg";

export interface ChartSeries {
  /** Data-row key whose value drives this series. */
  key: string;
  /** Display label. Defaults to `key`. */
  label?: string;
  /** Token-keyed color (defaults rotate through aurum/aether/mint/sky). */
  color?: ChartColorToken;
}

export interface ChartSpec {
  type: ChartType;
  /** Optional title rendered above the chart. */
  title?: string;
  /** Optional caption below the chart. */
  caption?: string;
  /** Row data — every entry should at minimum have `x` plus each series key. */
  data: Record<string, string | number>[];
  /** Required for bar/line/area — the x-axis key. Ignored for pie. */
  x?: string;
  /** Required for pie — the slice-value key. */
  value?: string;
  /** Required for pie — the slice-label key. */
  name?: string;
  /** Series (multiple → grouped/stacked for bar; multi-line for line/area). */
  series?: ChartSeries[];
  /** Pie only: render as donut (with hole). */
  donut?: boolean;
}

export type ChartParseResult =
  | { ok: true; spec: ChartSpec }
  | { ok: false; error: string };

export function parseChartSpec(raw: string): ChartParseResult {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "JSON parse failed";
    return { ok: false, error: msg };
  }
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return { ok: false, error: "expected object" };
  }
  const obj = json as Record<string, unknown>;
  const type = obj.type;
  if (type !== "bar" && type !== "line" && type !== "area" && type !== "pie") {
    return { ok: false, error: `unsupported type "${String(type)}"` };
  }
  const data = obj.data;
  if (!Array.isArray(data) || data.length === 0) {
    return { ok: false, error: "data must be a non-empty array" };
  }
  /* Every row must be an object. */
  for (const row of data) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      return { ok: false, error: "each data row must be an object" };
    }
  }
  if (type === "pie") {
    if (typeof obj.value !== "string" || typeof obj.name !== "string") {
      return { ok: false, error: 'pie chart requires string "value" and "name" keys' };
    }
  } else {
    if (typeof obj.x !== "string") {
      return { ok: false, error: `${type} chart requires string "x" key` };
    }
  }
  /* Series — optional but if present must be array of valid entries. */
  if (obj.series !== undefined) {
    if (!Array.isArray(obj.series)) {
      return { ok: false, error: '"series" must be an array' };
    }
    for (const s of obj.series) {
      if (!s || typeof s !== "object" || Array.isArray(s)) {
        return { ok: false, error: "each series must be an object" };
      }
      const key = (s as Record<string, unknown>).key;
      if (typeof key !== "string") {
        return { ok: false, error: 'every series needs a string "key"' };
      }
    }
  }

  return { ok: true, spec: obj as unknown as ChartSpec };
}

const TOKEN_HEX: Record<ChartColorToken, string> = {
  aurum: "#C4A96A",
  aether: "#818CF8",
  mint: "#5EE0BE",
  coral: "#F28D7F",
  sky: "#7DD3FC",
  amber: "#FBBF24",
  fg: "#CBC9BD",
};

const DEFAULT_PALETTE: ChartColorToken[] = ["aurum", "aether", "mint", "sky", "amber", "coral"];

/** Resolve a series → hex color (recharts can't read CSS variables). */
export function resolveSeriesColor(
  token: ChartColorToken | undefined,
  index: number,
): string {
  return TOKEN_HEX[token ?? DEFAULT_PALETTE[index % DEFAULT_PALETTE.length]];
}
