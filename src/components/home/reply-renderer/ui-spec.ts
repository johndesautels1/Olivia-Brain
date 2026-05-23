/**
 * `UISpec` — minimal JSON shape Olivia returns inside ```ui``` fences
 * (Track N N4-foundations — generative UI).
 *
 * # Safety mandate
 *
 * The LLM does NOT emit React code, JSX, or HTML. It emits a JSON
 * description of which components to render and what props to pass.
 * Rendering goes through a fixed component registry with strict
 * prop validation. No arbitrary classes, no inline styles from the
 * LLM, no event handlers, no image URLs, no script execution.
 *
 * This file defines the four supported component primitives:
 *
 *   1. `card`     — titled body block (most common)
 *   2. `stat`     — labelled value with optional delta + tone
 *   3. `progress` — labelled 0-100 bar with optional colour token
 *   4. `button`   — labelled link (HTTP(S)-only, no JS-scheme)
 *
 * Per `feedback_world_class_standard`: every public symbol carries
 * JSDoc; parser is pure; every code path is unit-tested.
 *
 * # Example fence Olivia returns
 *
 *   ```ui
 *   {
 *     "title": "Series A readiness",
 *     "components": [
 *       { "kind": "stat", "label": "ARR", "value": "£2.4M",
 *         "delta": "+18% QoQ", "tone": "positive" },
 *       { "kind": "stat", "label": "Burn", "value": "£180k/mo",
 *         "delta": "-12%", "tone": "positive" },
 *       { "kind": "progress", "label": "Pitch readiness",
 *         "value": 74, "color": "aurum" },
 *       { "kind": "card",
 *         "title": "Next step",
 *         "body": "Polish slides 4 + 7 before Atomico meeting.",
 *         "tone": "aether" },
 *       { "kind": "button", "label": "Open pitch deck",
 *         "href": "https://gamma.app/docs/abc123", "tone": "primary" }
 *     ]
 *   }
 *   ```
 */

/** Canonical token names; mirrors `01_UI_DESIGN_SYSTEM.md` § 1.3 + 1.4. */
export type UIColorToken =
  | "aurum"
  | "aether"
  | "mint"
  | "coral"
  | "sky"
  | "amber"
  | "fg";

/** Semantic tone for stat deltas + card emphasis. */
export type UITone = "positive" | "warning" | "danger" | "neutral";

export interface UICard {
  kind: "card";
  title?: string;
  body: string;
  /** Token-keyed emphasis colour. Defaults to neutral surface. */
  tone?: UIColorToken;
}

export interface UIStat {
  kind: "stat";
  label: string;
  value: string;
  /** Optional delta line (e.g. "+18% QoQ"). */
  delta?: string;
  tone?: UITone;
}

export interface UIProgress {
  kind: "progress";
  label: string;
  /** 0-100. Out-of-range values clamp at the renderer. */
  value: number;
  color?: UIColorToken;
}

export interface UIButton {
  kind: "button";
  label: string;
  /**
   * Optional link target. HTTP(S) only; other schemes are rejected at
   * parse time so the LLM cannot smuggle `javascript:` or `data:` URLs
   * through the fence.
   */
  href?: string;
  /** Defaults to "primary". */
  tone?: "primary" | "ghost";
}

export type UIComponent = UICard | UIStat | UIProgress | UIButton;

export interface UISpec {
  /** Optional headline rendered above the component stack. */
  title?: string;
  components: UIComponent[];
}

export type UIParseResult =
  | { ok: true; spec: UISpec }
  | { ok: false; error: string };

const VALID_COLORS: ReadonlySet<UIColorToken> = new Set<UIColorToken>([
  "aurum",
  "aether",
  "mint",
  "coral",
  "sky",
  "amber",
  "fg",
]);

const VALID_TONES: ReadonlySet<UITone> = new Set<UITone>([
  "positive",
  "warning",
  "danger",
  "neutral",
]);

const VALID_BUTTON_TONES: ReadonlySet<"primary" | "ghost"> = new Set<
  "primary" | "ghost"
>(["primary", "ghost"]);

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function parseCard(obj: Record<string, unknown>): UICard | null {
  if (!isNonEmptyString(obj.body)) return null;
  const card: UICard = { kind: "card", body: obj.body };
  if (isNonEmptyString(obj.title)) card.title = obj.title;
  if (typeof obj.tone === "string" && VALID_COLORS.has(obj.tone as UIColorToken)) {
    card.tone = obj.tone as UIColorToken;
  }
  return card;
}

function parseStat(obj: Record<string, unknown>): UIStat | null {
  if (!isNonEmptyString(obj.label) || !isNonEmptyString(obj.value)) return null;
  const stat: UIStat = { kind: "stat", label: obj.label, value: obj.value };
  if (isNonEmptyString(obj.delta)) stat.delta = obj.delta;
  if (typeof obj.tone === "string" && VALID_TONES.has(obj.tone as UITone)) {
    stat.tone = obj.tone as UITone;
  }
  return stat;
}

function parseProgress(obj: Record<string, unknown>): UIProgress | null {
  if (!isNonEmptyString(obj.label)) return null;
  if (typeof obj.value !== "number" || !Number.isFinite(obj.value)) return null;
  const prog: UIProgress = {
    kind: "progress",
    label: obj.label,
    value: obj.value,
  };
  if (typeof obj.color === "string" && VALID_COLORS.has(obj.color as UIColorToken)) {
    prog.color = obj.color as UIColorToken;
  }
  return prog;
}

function parseButton(obj: Record<string, unknown>): UIButton | null {
  if (!isNonEmptyString(obj.label)) return null;
  const btn: UIButton = { kind: "button", label: obj.label };
  if (typeof obj.href === "string") {
    /* Strict scheme allowlist — never let the LLM smuggle javascript:
     * or data: URLs into a clickable surface. */
    if (!/^https?:\/\//i.test(obj.href)) return null;
    btn.href = obj.href;
  }
  if (
    typeof obj.tone === "string" &&
    VALID_BUTTON_TONES.has(obj.tone as "primary" | "ghost")
  ) {
    btn.tone = obj.tone as "primary" | "ghost";
  }
  return btn;
}

function parseComponent(raw: unknown): UIComponent | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  switch (obj.kind) {
    case "card":
      return parseCard(obj);
    case "stat":
      return parseStat(obj);
    case "progress":
      return parseProgress(obj);
    case "button":
      return parseButton(obj);
    default:
      return null;
  }
}

export function parseUISpec(raw: string): UIParseResult {
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
  if (!Array.isArray(obj.components)) {
    return { ok: false, error: '"components" must be an array' };
  }
  const components: UIComponent[] = [];
  for (const item of obj.components) {
    const c = parseComponent(item);
    if (c) components.push(c);
  }
  if (components.length === 0) {
    return {
      ok: false,
      error: 'no valid components (each needs a recognised "kind" + required props)',
    };
  }
  const spec: UISpec = { components };
  if (isNonEmptyString(obj.title)) spec.title = obj.title;
  return { ok: true, spec };
}

const COLOR_TOKEN_VAR: Record<UIColorToken, string> = {
  aurum: "var(--aurum-primary)",
  aether: "var(--aether-primary)",
  mint: "var(--mint-up)",
  coral: "var(--coral-down)",
  sky: "var(--sky-info)",
  amber: "var(--amber-warn)",
  fg: "var(--fg-primary)",
};

const COLOR_TOKEN_MUTE: Record<UIColorToken, string> = {
  aurum: "var(--aurum-mute)",
  aether: "var(--aether-mute)",
  mint: "rgba(94, 224, 190, 0.10)",
  coral: "rgba(242, 141, 127, 0.10)",
  sky: "rgba(125, 211, 252, 0.10)",
  amber: "rgba(251, 191, 36, 0.10)",
  fg: "rgba(203, 201, 189, 0.10)",
};

const TONE_VAR: Record<UITone, string> = {
  positive: "var(--mint-up)",
  warning: "var(--amber-warn)",
  danger: "var(--coral-down)",
  neutral: "var(--fg-secondary)",
};

/** Resolve a colour token to its primary CSS var. */
export function resolveTokenColor(token: UIColorToken | undefined): string {
  return COLOR_TOKEN_VAR[token ?? "aurum"];
}

/** Resolve a colour token to its tinted background CSS value. */
export function resolveTokenMute(token: UIColorToken | undefined): string {
  return COLOR_TOKEN_MUTE[token ?? "aurum"];
}

/** Resolve a semantic tone to its CSS var. */
export function resolveTone(tone: UITone | undefined): string {
  return TONE_VAR[tone ?? "neutral"];
}

/** Clamp a progress value to [0, 100]. */
export function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}
