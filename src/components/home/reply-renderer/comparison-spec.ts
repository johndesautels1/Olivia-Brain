/**
 * `ComparisonSpec` — minimal JSON shape Olivia returns inside a
 * fenced ```comparison``` block.
 *
 * # Why this exists
 *
 * Comparison is the single most reused output shape across the
 * bicycle wheel:
 *
 *   - **cluesxscore** (all 23 modules) — every mini-app compares 2
 *     cities on metrics within one category. This fence powers the
 *     verdict surface for every one of them.
 *   - **cluesintelligence** (FLAGSHIP) — Cristiano's top-3 cities /
 *     towns / neighborhoods render as a 3-column comparison with
 *     verdict.
 *   - **clueslondon** — investor / district / company comparisons
 *     surface in the Studio.
 *   - **Deal Protection** — counter-offer vs original term-sheet, or
 *     two competing offers, render as comparison columns.
 *   - **Quantara** — Series A vs Series B trajectory, founder-
 *     friendly vs lead-investor-friendly outcomes.
 *
 * Per the action queue in `docs/02_COMPETITIVE_FEATURE_MATRIX.md`
 * Action 2 (`<DualCityCompare>` primitive) and the comparison
 * patterns in J1 + I2.
 *
 * # Safety
 *
 * The LLM emits a JSON description of which strings to render in
 * which columns. No code execution, no event handlers, no LLM-
 * derived styles. The renderer dispatches through a fixed structure
 * with strict per-field validation. Drop-invalid-rather-than-reject
 * resilience (matches map-spec + ui-spec).
 *
 * # Schema
 *
 *   ```comparison
 *   {
 *     "title": "London vs Berlin — relocation fit",
 *     "verdict": "London wins on capital access; Berlin on cost of living.",
 *     "winner": "London",
 *     "columns": [
 *       {
 *         "name": "London",
 *         "score": 87,
 *         "tone": "aurum",
 *         "highlights": [
 *           "Largest VC market in Europe",
 *           "English-speaking"
 *         ],
 *         "lowlights": [
 *           "High cost of living"
 *         ]
 *       },
 *       {
 *         "name": "Berlin",
 *         "score": 79,
 *         "tone": "aether",
 *         "highlights": ["Strong tech ecosystem", "30% lower COL"],
 *         "lowlights": ["Smaller late-stage capital pool"]
 *       }
 *     ]
 *   }
 *   ```
 *
 * Min 2 columns, max 3 (4-column comparisons get too narrow in a
 * chat bubble — narrower than ~140 chars per column reads as noise).
 */

export type ComparisonColorToken =
  | "aurum"
  | "aether"
  | "mint"
  | "coral"
  | "sky"
  | "amber"
  | "fg";

export interface ComparisonColumn {
  name: string;
  /** 0-100 score chip. Out-of-range values are dropped at parse. */
  score?: number;
  /** Token-keyed accent. Defaults rotate aurum / aether / mint. */
  tone?: ComparisonColorToken;
  highlights?: string[];
  lowlights?: string[];
}

export interface ComparisonSpec {
  title?: string;
  /** One-line verdict rendered below the columns. */
  verdict?: string;
  /** Name of the winning column for the gold-rim highlight + chip. */
  winner?: string;
  columns: ComparisonColumn[];
}

export type ComparisonParseResult =
  | { ok: true; spec: ComparisonSpec }
  | { ok: false; error: string };

const VALID_COLORS: ReadonlySet<ComparisonColorToken> = new Set<ComparisonColorToken>([
  "aurum",
  "aether",
  "mint",
  "coral",
  "sky",
  "amber",
  "fg",
]);

const MIN_COLUMNS = 2;
const MAX_COLUMNS = 3;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function parseStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const item of v) {
    if (isNonEmptyString(item)) out.push(item);
  }
  return out;
}

function parseColumn(raw: unknown): ComparisonColumn | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  if (!isNonEmptyString(obj.name)) return null;
  const col: ComparisonColumn = { name: obj.name };
  if (
    typeof obj.score === "number" &&
    Number.isFinite(obj.score) &&
    obj.score >= 0 &&
    obj.score <= 100
  ) {
    col.score = obj.score;
  }
  if (typeof obj.tone === "string" && VALID_COLORS.has(obj.tone as ComparisonColorToken)) {
    col.tone = obj.tone as ComparisonColorToken;
  }
  const highlights = parseStringArray(obj.highlights);
  if (highlights.length > 0) col.highlights = highlights;
  const lowlights = parseStringArray(obj.lowlights);
  if (lowlights.length > 0) col.lowlights = lowlights;
  return col;
}

export function parseComparisonSpec(raw: string): ComparisonParseResult {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "JSON parse failed" };
  }
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return { ok: false, error: "expected object" };
  }
  const obj = json as Record<string, unknown>;
  if (!Array.isArray(obj.columns)) {
    return { ok: false, error: '"columns" must be an array' };
  }
  const columns: ComparisonColumn[] = [];
  for (const item of obj.columns) {
    const col = parseColumn(item);
    if (col) columns.push(col);
    if (columns.length >= MAX_COLUMNS) break;
  }
  if (columns.length < MIN_COLUMNS) {
    return {
      ok: false,
      error: `requires at least ${MIN_COLUMNS} valid columns (got ${columns.length})`,
    };
  }
  const spec: ComparisonSpec = { columns };
  if (isNonEmptyString(obj.title)) spec.title = obj.title;
  if (isNonEmptyString(obj.verdict)) spec.verdict = obj.verdict;
  if (isNonEmptyString(obj.winner)) {
    /* Only preserve `winner` if it matches one of the surviving
     * columns — else it would render a missing-column highlight. */
    const exists = columns.some(
      (c) => c.name.toLowerCase() === (obj.winner as string).toLowerCase(),
    );
    if (exists) spec.winner = obj.winner;
  }
  return { ok: true, spec };
}

const COLOR_TOKEN_VAR: Record<ComparisonColorToken, string> = {
  aurum: "var(--aurum-primary)",
  aether: "var(--aether-primary)",
  mint: "var(--mint-up)",
  coral: "var(--coral-down)",
  sky: "var(--sky-info)",
  amber: "var(--amber-warn)",
  fg: "var(--fg-primary)",
};

const DEFAULT_PALETTE: ComparisonColorToken[] = ["aurum", "aether", "mint"];

/**
 * Resolve a column tone to its primary CSS var, defaulting rotation
 * through aurum / aether / mint when the column does not specify.
 */
export function resolveColumnAccent(
  tone: ComparisonColorToken | undefined,
  index: number,
): string {
  if (tone) return COLOR_TOKEN_VAR[tone];
  return COLOR_TOKEN_VAR[DEFAULT_PALETTE[index % DEFAULT_PALETTE.length]];
}

export { MIN_COLUMNS, MAX_COLUMNS };
