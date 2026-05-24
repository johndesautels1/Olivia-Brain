/**
 * `token-coverage-guard` -- source-level regression guard ensuring the
 * Tailwind v4 `@theme` block in `src/styles/tokens.css` continues to
 * declare every CSS-custom-property color name that production
 * components reference as a Tailwind utility class.
 *
 * # What this guards against
 *
 * In Tailwind v4, a utility like `text-fog` resolves to
 * `color: var(--color-fog)`. If `--color-fog` is not declared inside
 * the `@theme` block, the utility silently prunes -- producing NO CSS
 * output -- and components that reference it render with inherited
 * styling rather than the design-system-intended value.
 *
 * The Cristiano dashboard surfaces (commits f41548e -> 9dce51a)
 * reference `text-fog`, `bg-onyx`, `text-fog/70`, `bg-fog/5`,
 * `border-fog/10`, plus the WarRoom* surfaces reference
 * `bg-[var(--color-onyx)]` + `bg-[var(--color-aurum-highlight)]`
 * directly. All three tokens MUST be declared so those classes
 * resolve to the intended palette values (fg-primary cream,
 * canvas-base near-black warm navy, aurum-soft lighter gold).
 *
 * # Why a vitest scan rather than CSS validator
 *
 * Tailwind v4's pruning is silent -- no build error, no console
 * warning, no test failure -- so a deterministic source-scan is the
 * lowest-friction way to lock the invariant. Runs in CI on every
 * push via the existing vitest pipeline; produces a clear diff
 * pointer when a future agent deletes or renames a token.
 *
 * # Maintenance
 *
 * When you need to add a new theme alias, append the assertion below
 * and add the corresponding `--color-<name>: var(...);` line to
 * `src/styles/tokens.css` inside the `@theme { ... }` block.
 *
 * Held to Apple / Microsoft / Google / IBM 2026 leading coding
 * practices per `~/CLAUDE.md` and
 * `docs/api-specs/_MASTER_REGISTER.md` section 10.4.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const TOKENS_CSS_PATH = resolve(process.cwd(), "src/styles/tokens.css");

function readTokensCss(): string {
  return readFileSync(TOKENS_CSS_PATH, "utf8");
}

/**
 * Extracts the body of the Tailwind v4 `@theme { ... }` block. Returns
 * the raw text between the opening `{` and matching closing `}` so
 * assertions can scope to that block alone (rather than matching a
 * `--color-fog` declaration that might accidentally land elsewhere
 * in `:root` and therefore NOT be picked up by Tailwind's theme
 * generator).
 */
function extractThemeBlock(css: string): string {
  // Strip CSS comments first so a `@theme` mention inside a /* ... */
  // block doesn't get matched as the directive. This is the bug that
  // bit the first iteration of this test: the documentation comment at
  // the top of tokens.css contains the literal string "@theme block",
  // and a naive indexOf("@theme") matched THAT instead of the actual
  // Tailwind v4 directive 200 lines lower.
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  // Match the directive specifically: `@theme` followed by optional
  // whitespace and an opening brace. Captures the brace's position so
  // we know exactly where the body starts.
  const directiveMatch = withoutComments.match(/@theme\s*\{/);
  if (!directiveMatch || directiveMatch.index === undefined) {
    throw new Error("tokens.css is missing a Tailwind v4 @theme directive");
  }
  const openBrace = directiveMatch.index + directiveMatch[0].length - 1;
  let depth = 1;
  let cursor = openBrace + 1;
  while (cursor < withoutComments.length && depth > 0) {
    const ch = withoutComments[cursor];
    if (ch === "{") depth += 1;
    else if (ch === "}") depth -= 1;
    if (depth === 0) break;
    cursor += 1;
  }
  if (depth !== 0) {
    throw new Error("@theme block is not balanced (no matching close)");
  }
  return withoutComments.slice(openBrace + 1, cursor);
}

/**
 * Required @theme color tokens used by production component code.
 * Each entry asserts BOTH the property name and the canonical
 * palette token it aliases -- so a maintainer who repoints `fog`
 * to (say) `--fg-tertiary` would have to update the test in the
 * same commit, surfacing the semantic shift to review.
 */
const REQUIRED_THEME_COLOR_TOKENS: ReadonlyArray<{
  name: string;
  expectedAliasOf: string;
  usedBy: string;
}> = [
  {
    name: "--color-fog",
    expectedAliasOf: "--fg-primary",
    usedBy: "Cristiano dashboard text classes (text-fog, text-fog/70, text-fog/80, bg-fog/5, border-fog/10, divide-fog/10)",
  },
  {
    name: "--color-onyx",
    expectedAliasOf: "--canvas-base",
    usedBy: "Cristiano dashboard surface backgrounds (bg-onyx, bg-onyx/40, bg-onyx/60, bg-onyx/90) + WarRoom* arbitrary-value references (bg-[var(--color-onyx)])",
  },
  {
    name: "--color-aurum-highlight",
    expectedAliasOf: "--aurum-soft",
    usedBy: "WarRoomBriefing hover state on aurum buttons (bg-[var(--color-aurum-highlight)])",
  },
];

/**
 * Canonical palette tokens that must exist in `:root` for the
 * aliases above to resolve to a real value. Belt-and-braces: if
 * a future agent removes one of these canonical tokens, this test
 * catches it before the alias quietly resolves to nothing.
 */
const REQUIRED_CANONICAL_TOKENS: ReadonlyArray<string> = [
  "--fg-primary",
  "--canvas-base",
  "--aurum-soft",
];

describe("tokens.css -- @theme color-token coverage", () => {
  it("declares a Tailwind v4 @theme block", () => {
    const css = readTokensCss();
    expect(css).toContain("@theme");
    const body = extractThemeBlock(css);
    expect(body.length).toBeGreaterThan(0);
  });

  for (const { name, expectedAliasOf, usedBy } of REQUIRED_THEME_COLOR_TOKENS) {
    it(`declares ${name} inside @theme (aliased to var(${expectedAliasOf})) -- used by: ${usedBy}`, () => {
      const themeBody = extractThemeBlock(readTokensCss());
      // Match `--color-fog: var(--fg-primary);` allowing flexible whitespace.
      const declarationRegex = new RegExp(
        `${escapeForRegExp(name)}\\s*:\\s*var\\(\\s*${escapeForRegExp(expectedAliasOf)}\\s*\\)\\s*;`,
        "m",
      );
      const present = declarationRegex.test(themeBody);
      if (!present) {
        // Helpful failure pointer rather than a generic boolean.
        throw new Error(
          `Missing or wrong-shape declaration: expected '${name}: var(${expectedAliasOf});' inside the @theme block. ` +
            `Add it to src/styles/tokens.css. Removing it without an explicit replacement breaks ${usedBy}.`,
        );
      }
      expect(present).toBe(true);
    });
  }

  for (const canonicalName of REQUIRED_CANONICAL_TOKENS) {
    it(`declares the canonical palette token ${canonicalName} in :root`, () => {
      const css = readTokensCss();
      // Match `--fg-primary: oklch(...)` or `--fg-primary: #...` or
      // `--fg-primary: rgba(...)` -- the value can be any of the
      // canonical color-function forms.
      const rootDeclarationRegex = new RegExp(
        `${escapeForRegExp(canonicalName)}\\s*:\\s*[^;]+;`,
        "m",
      );
      expect(rootDeclarationRegex.test(css)).toBe(true);
    });
  }
});

function escapeForRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
