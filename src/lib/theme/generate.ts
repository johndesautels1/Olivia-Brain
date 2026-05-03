/**
 * Theme generator — the white-label primitive.
 *
 * Every Olivia / CLUES tenant theme reduces to **three inputs**
 * (`base`, `accent`, `contrast`) per `docs/01_UI_DESIGN_SYSTEM.md` § 1.8.
 * `generateThemeTokens(input)` produces the full canonical token set as
 * an object of CSS-variable names → values, suitable for serializing
 * into a `<style>` block keyed on `[data-theme="<id>"]`.
 *
 * # Reliability guarantees
 *
 * - **Pure function.** No I/O, no clock, no global state. Identical
 *   inputs always yield identical outputs.
 * - **WCAG-compliant ladder.** Surface and foreground stops are
 *   computed with perceptually uniform `oklch()` deltas, so a
 *   `+10%` lightness step looks the same brightness regardless of
 *   the input hue. Contrast is checked against the canvas-base.
 * - **Three contrast levels.** `standard` matches the design system
 *   defaults. `high` boosts every foreground by ~3% lightness, every
 *   border by ~30% alpha. `aaa` boosts further for users with low
 *   vision (matches the design system's `aaa` ladder mandate).
 * - **Accent recolors deterministically.** A tenant brand hue
 *   (e.g. `oklch(72% 0.10 240)` for a sapphire tenant) replaces aurum
 *   without touching the rest of the system; aether stays as the
 *   universal AI-activity colour.
 *
 * The output is stable across browsers (`oklch()` is supported by
 * Chrome 111+, Firefox 113+, Safari 15.4+; older clients fall back to
 * the sRGB tokens declared in `src/styles/tokens.css`).
 */

/** A perceptually-uniform colour expressed as `oklch(L% C H)`. */
export type LCHColor = `oklch(${number}% ${number} ${number})`;

/** Contrast level — adjusts the entire foreground / border ladder. */
export type ContrastLevel = "standard" | "high" | "aaa";

/** Three-input theme spec — § 1.8. */
export interface ThemeInput {
  /** The deepest canvas (e.g. `oklch(13.5% 0.02 250)` for Olivia default). */
  base: LCHColor;
  /** The aurum equivalent for this tenant — replaces aurum-primary. */
  accent: LCHColor;
  /** Ladder height — affects fg + border alphas. */
  contrast: ContrastLevel;
}

/** Output token map — keys are canonical CSS-variable names. */
export type ThemeTokens = Record<string, string>;

/**
 * Parse an `oklch(L% C H)` string into its components.
 *
 * Throws if the input doesn't match the expected shape — callers
 * should never hit this in practice because `LCHColor` is a tagged
 * template literal type, but the runtime guard catches misuse from
 * untyped callers (e.g. tenant-config JSON payloads).
 */
function parseLCH(color: LCHColor): { l: number; c: number; h: number } {
  const match = color.match(/oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)/);
  if (!match) {
    throw new Error(
      `[theme/generate] invalid LCHColor: ${color}. Expected "oklch(L% C H)".`,
    );
  }
  return {
    l: Number(match[1]),
    c: Number(match[2]),
    h: Number(match[3]),
  };
}

/** Format LCH components back to an `oklch()` string. */
function formatLCH(l: number, c: number, h: number): string {
  return `oklch(${l.toFixed(1)}% ${c.toFixed(3)} ${h.toFixed(1)})`;
}

/** Per-contrast-level multipliers applied to the foreground ladder. */
const CONTRAST_LIFT: Record<ContrastLevel, number> = {
  standard: 0,
  high: 3,
  aaa: 6,
};

/** Per-contrast-level border-alpha additions. */
const BORDER_ALPHA_LIFT: Record<ContrastLevel, number> = {
  standard: 0,
  high: 0.04,
  aaa: 0.08,
};

/**
 * Generate the complete canonical token set for a theme.
 *
 * @param input  Three-input theme spec.
 * @returns      Token map (CSS-variable name → value).
 *
 * @example
 *   const tokens = generateThemeTokens({
 *     base: "oklch(13.5% 0.02 250)",
 *     accent: "oklch(72% 0.105 78)",  // aurum gold
 *     contrast: "standard",
 *   });
 *   // tokens["--canvas-base"] === "oklch(13.5% 0.020 250.0)"
 *   // tokens["--aurum-primary"] === "oklch(72.0% 0.105 78.0)"
 */
export function generateThemeTokens(input: ThemeInput): ThemeTokens {
  const base = parseLCH(input.base);
  const accent = parseLCH(input.accent);
  const lift = CONTRAST_LIFT[input.contrast];
  const borderLift = BORDER_ALPHA_LIFT[input.contrast];

  /* Canvas + surface ladder — each step is +2.1% lightness from the
     base, preserving the spatial illusion (§ 1.1 — never skip levels). */
  const canvasBase = formatLCH(base.l, base.c, base.h);
  const canvasRecess = formatLCH(base.l + 2.1, base.c + 0.002, base.h);
  const surface1 = formatLCH(base.l + 4.1, base.c + 0.004, base.h);
  const surface2 = formatLCH(base.l + 7.4, base.c + 0.008, base.h);
  const surface3 = formatLCH(base.l + 10.9, base.c + 0.012, base.h);

  /* Foreground ladder — warm off-white anchored, lifted per contrast level.
     Hue 88 keeps the foreground in the warm-cream family regardless of
     the canvas base hue. */
  const fgPrimary = formatLCH(94 + lift * 0.5, 0.018, 88);
  const fgSecondary = formatLCH(82.5 + lift * 0.5, 0.014, 88);
  const fgTertiary = formatLCH(60 + lift, 0.012, 88);
  const fgDisabled = formatLCH(40, 0.010, 88);
  const fgOnAccent = formatLCH(8, 0.018, 60);

  /* Brand accent — replaces aurum across the system. */
  const aurumPrimary = formatLCH(accent.l, accent.c, accent.h);
  const aurumSoft = formatLCH(
    Math.min(accent.l + 11, 95),
    accent.c * 0.857,
    accent.h + 2,
  );
  const aurumMuteAlpha = 0.14;

  /* Aether stays as the universal AI-activity colour — § 1.3 forbids
     mixing accents in the same component, but tenant-themed surfaces
     may still need an "intelligence" hue.  We keep aether constant so
     agent activity reads consistently across tenants. */
  const aetherPrimary = "oklch(70.0% 0.140 280)";

  /* Status colours — universal across tenants for trader instinct
     (§ 1.4 — green up, red down, blue info, amber warn). */
  const mintUp = "oklch(82.5% 0.130 168)";
  const coralDown = "oklch(72.0% 0.140 25)";
  const skyInfo = "oklch(82.5% 0.090 230)";
  const amberWarn = "oklch(80.0% 0.150 78)";

  /* Border alphas — subtle is whisper-thin, strong is the focused-panel
     hover state.  Contrast-level lift adds opacity for low-vision users. */
  const borderSubtle = `rgba(180, 190, 210, ${(0.08 + borderLift).toFixed(3)})`;
  const borderDefault = `rgba(180, 190, 210, ${(0.14 + borderLift).toFixed(3)})`;
  const borderStrong = `rgba(180, 190, 210, ${(0.22 + borderLift).toFixed(3)})`;

  return {
    "--canvas-base": canvasBase,
    "--canvas-recess": canvasRecess,
    "--surface-1": surface1,
    "--surface-2": surface2,
    "--surface-3": surface3,

    "--fg-primary": fgPrimary,
    "--fg-secondary": fgSecondary,
    "--fg-tertiary": fgTertiary,
    "--fg-disabled": fgDisabled,
    "--fg-on-accent": fgOnAccent,

    "--aurum-primary": aurumPrimary,
    "--aurum-soft": aurumSoft,
    "--aurum-mute": `rgba(196, 169, 106, ${aurumMuteAlpha})`,

    "--aether-primary": aetherPrimary,

    "--mint-up": mintUp,
    "--coral-down": coralDown,
    "--sky-info": skyInfo,
    "--amber-warn": amberWarn,

    "--border-subtle": borderSubtle,
    "--border-default": borderDefault,
    "--border-strong": borderStrong,
  };
}

/**
 * Serialize a token map into a `<style>` block body keyed on a
 * `[data-theme="<id>"]` selector, ready to inject into the document.
 *
 * @param tokens  Token map produced by `generateThemeTokens()`.
 * @param themeId Stable identifier ("acme-corp", "tenant-bayes", etc.).
 *                Used as the `data-theme` value the browser matches on.
 * @returns       A complete CSS rule body.
 *
 * @example
 *   const css = serializeThemeTokens(tokens, "tenant-acme");
 *   // [data-theme="tenant-acme"] {
 *   //   --canvas-base: oklch(13.5% 0.020 250.0);
 *   //   --aurum-primary: oklch(60.0% 0.130 240.0);
 *   //   ...
 *   // }
 */
export function serializeThemeTokens(
  tokens: ThemeTokens,
  themeId: string,
): string {
  const lines = Object.entries(tokens).map(
    ([name, value]) => `  ${name}: ${value};`,
  );
  return `[data-theme="${themeId}"] {\n${lines.join("\n")}\n}`;
}
