/**
 * Theme generator — unit tests.
 *
 * Coverage:
 * - Pure-function determinism (same input → same output).
 * - Contrast-level monotonicity (`high` raises foreground vs.
 *   `standard`; `aaa` raises further).
 * - Accent override flows through to `--aurum-primary` without
 *   touching `--aether-primary` or status colours.
 * - Surface ladder stays monotonically lighter than base.
 * - LCH parser rejects malformed inputs.
 * - Serializer produces a parseable CSS rule body.
 */

import { describe, expect, it } from "vitest";

import {
  generateThemeTokens,
  serializeThemeTokens,
  type ThemeInput,
} from "../generate";

const oliviaDefault: ThemeInput = {
  base: "oklch(13.5% 0.020 250)",
  accent: "oklch(72.0% 0.105 78)",
  contrast: "standard",
};

const sapphireTenant: ThemeInput = {
  base: "oklch(13.5% 0.020 250)",
  accent: "oklch(60.0% 0.130 240)",
  contrast: "standard",
};

function lightnessOf(oklch: string): number {
  const m = oklch.match(/oklch\(\s*([\d.]+)%/);
  if (!m) throw new Error(`bad oklch: ${oklch}`);
  return Number(m[1]);
}

describe("generateThemeTokens — determinism", () => {
  it("produces identical output for identical input", () => {
    const a = generateThemeTokens(oliviaDefault);
    const b = generateThemeTokens(oliviaDefault);
    expect(a).toEqual(b);
  });
});

describe("generateThemeTokens — surface ladder", () => {
  const tokens = generateThemeTokens(oliviaDefault);

  it("places canvas-base at the input base lightness", () => {
    expect(lightnessOf(tokens["--canvas-base"]!)).toBeCloseTo(13.5, 1);
  });

  it("steps each surface lighter than the previous (no skipped levels)", () => {
    const ladder = [
      lightnessOf(tokens["--canvas-base"]!),
      lightnessOf(tokens["--canvas-recess"]!),
      lightnessOf(tokens["--surface-1"]!),
      lightnessOf(tokens["--surface-2"]!),
      lightnessOf(tokens["--surface-3"]!),
    ];
    for (let i = 1; i < ladder.length; i++) {
      expect(ladder[i]).toBeGreaterThan(ladder[i - 1]!);
    }
  });
});

describe("generateThemeTokens — foreground contrast levels", () => {
  it("monotonically raises foreground lightness from standard → high → aaa", () => {
    const std = generateThemeTokens({ ...oliviaDefault, contrast: "standard" });
    const high = generateThemeTokens({ ...oliviaDefault, contrast: "high" });
    const aaa = generateThemeTokens({ ...oliviaDefault, contrast: "aaa" });

    const stdL = lightnessOf(std["--fg-tertiary"]!);
    const highL = lightnessOf(high["--fg-tertiary"]!);
    const aaaL = lightnessOf(aaa["--fg-tertiary"]!);

    expect(highL).toBeGreaterThan(stdL);
    expect(aaaL).toBeGreaterThan(highL);
  });

  it("raises border alpha at higher contrast levels", () => {
    const std = generateThemeTokens({ ...oliviaDefault, contrast: "standard" });
    const aaa = generateThemeTokens({ ...oliviaDefault, contrast: "aaa" });

    /* Borders use rgba(...,A) format — extract the alpha. */
    const alpha = (rgba: string) => Number(rgba.match(/,\s*([\d.]+)\)/)?.[1]);

    expect(alpha(aaa["--border-default"]!)).toBeGreaterThan(
      alpha(std["--border-default"]!),
    );
  });
});

describe("generateThemeTokens — accent override", () => {
  const oliviaTokens = generateThemeTokens(oliviaDefault);
  const sapphireTokens = generateThemeTokens(sapphireTenant);

  it("replaces aurum-primary with the tenant accent", () => {
    expect(oliviaTokens["--aurum-primary"]).not.toBe(
      sapphireTokens["--aurum-primary"],
    );
    expect(sapphireTokens["--aurum-primary"]).toContain("240");
  });

  it("derives aurum-soft from the tenant accent (lighter + slightly hue-shifted)", () => {
    const accentL = lightnessOf(sapphireTokens["--aurum-primary"]!);
    const softL = lightnessOf(sapphireTokens["--aurum-soft"]!);
    expect(softL).toBeGreaterThan(accentL);
  });

  it("keeps aether-primary universal across tenants (intelligence colour)", () => {
    expect(oliviaTokens["--aether-primary"]).toBe(
      sapphireTokens["--aether-primary"],
    );
  });

  it("keeps status colours universal across tenants (trader instinct)", () => {
    expect(oliviaTokens["--mint-up"]).toBe(sapphireTokens["--mint-up"]);
    expect(oliviaTokens["--coral-down"]).toBe(sapphireTokens["--coral-down"]);
    expect(oliviaTokens["--sky-info"]).toBe(sapphireTokens["--sky-info"]);
    expect(oliviaTokens["--amber-warn"]).toBe(sapphireTokens["--amber-warn"]);
  });
});

describe("generateThemeTokens — input validation", () => {
  it("throws when given a non-LCH string at runtime", () => {
    expect(() =>
      generateThemeTokens({
        // Cast away the type so we exercise the runtime guard.
        base: "rgb(0, 0, 0)" as never,
        accent: "oklch(72% 0.10 78)",
        contrast: "standard",
      }),
    ).toThrow(/invalid LCHColor/);
  });
});

describe("serializeThemeTokens", () => {
  it("emits a complete rule body keyed on data-theme", () => {
    const tokens = generateThemeTokens(oliviaDefault);
    const css = serializeThemeTokens(tokens, "tenant-acme");

    expect(css).toMatch(/^\[data-theme="tenant-acme"\]\s*\{/);
    expect(css).toMatch(/--canvas-base:/);
    expect(css).toMatch(/--aurum-primary:/);
    expect(css).toMatch(/--aether-primary:/);
    expect(css.trim()).toMatch(/\}$/);
  });

  it("escapes nothing — themeId is trusted (caller's responsibility)", () => {
    /* This is a deliberate non-test: the serializer doesn't HTML-escape
       because it's CSS, not HTML, and the themeId is configured by the
       tenant-config layer, not user input.  Documenting the contract. */
    const css = serializeThemeTokens({}, 'safe-id');
    expect(css).toContain('"safe-id"');
  });
});
