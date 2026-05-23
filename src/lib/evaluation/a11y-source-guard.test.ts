/**
 * `a11y-source-guard` — source-level regression guards for WCAG 2.2 AA
 * violations already remediated in commits 397835a + f803521 +
 * 11f6a26 + 8995c41 + 566753e (see `docs/04_ACCESSIBILITY_AUDIT_2026-05-23.md`).
 *
 * # What this guards against
 *
 *   1. **`outline: "none"`** inline style overrides on interactive
 *      controls — strips the global `:focus-visible` Aurum ring per
 *      `src/styles/base.css:56-59` without replacement. Keyboard users
 *      lose visible focus → WCAG 2.4.7 violation.
 *   2. **`transition: all`** inline style — Vercel WIG L7 silent
 *      layout-thrash anti-pattern. Always enumerate the specific
 *      properties.
 *   3. **`<div role="button">`** in production component code —
 *      should be native `<button>` (better keyboard handling + native
 *      focus + native disabled semantics).
 *
 * # Why a vitest scan rather than ESLint custom rule
 *
 * ESLint custom rules need their own package + plugin registration +
 * AST selectors. A deterministic vitest scan over source files
 * delivers the same prevention at zero plumbing cost, runs in CI on
 * every push (already wired), and produces clearer diff output when
 * a violation lands.
 *
 * # Allowlist
 *
 * `src/styles/base.css` is allowlisted for `outline: none` — it
 * carries the canonical Vercel WIG `:focus:not(:focus-visible)`
 * legacy-stripping pattern at line ~63. NOT a violation.
 *
 * Test fixture files that exercise EXISTING markup (rather than
 * introducing new violations) can be added to
 * `DIV_ROLE_BUTTON_ALLOWLIST` with a comment when the situation
 * arises.
 *
 * # Maintenance
 *
 * When you intentionally need to override `outline` (e.g., a special
 * focus-state visual) — pair the override with a visible
 * replacement (`boxShadow` ring) AND add the file to the
 * `OUTLINE_NONE_ALLOWLIST` array below with a comment explaining why.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC_ROOT = join(__dirname, "..", "..");
const REPO_ROOT = join(SRC_ROOT, "..");

/* Files where the pattern is intentional + correct. Add a comment
 * for every entry explaining why. */
const OUTLINE_NONE_ALLOWLIST: ReadonlySet<string> = new Set([
  // Canonical Vercel WIG :focus-visible legacy-stripping pattern.
  "src/styles/base.css",
]);

const TRANSITION_ALL_ALLOWLIST: ReadonlySet<string> = new Set<string>([
  // None currently — enumeration is always achievable.
]);

const DIV_ROLE_BUTTON_ALLOWLIST: ReadonlySet<string> = new Set<string>([
  // None currently — every production site converted to native <button>
  // in commit 566753e (Phase 3 of the WCAG audit). Test fixture files
  // that test existing markup but don't introduce new violations can
  // be added here with a comment when needed.
]);

const SCAN_EXTENSIONS = new Set([".ts", ".tsx", ".css"]);

/* This very file would self-match the patterns it's looking for
 * (literal regex + docstring examples). Exclude it from the scan. */
const SELF_FILE_BASENAME = "a11y-source-guard.test.ts";

/** Walk the src tree, yielding every file path matching the extensions. */
function walkSrc(root: string): string[] {
  const out: string[] = [];
  const visit = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const s = statSync(full);
      if (s.isDirectory()) {
        if (entry === "node_modules" || entry === ".next") continue;
        visit(full);
      } else {
        if (full.endsWith(SELF_FILE_BASENAME)) continue;
        const ext = full.slice(full.lastIndexOf("."));
        if (SCAN_EXTENSIONS.has(ext)) out.push(full);
      }
    }
  };
  visit(root);
  return out;
}

/** Relative path with forward slashes for cross-platform comparison. */
function relForward(abs: string): string {
  return relative(REPO_ROOT, abs).replace(/\\/g, "/");
}

interface Finding {
  file: string;
  line: number;
  excerpt: string;
}

function scan(pattern: RegExp): Finding[] {
  const files = walkSrc(SRC_ROOT);
  const findings: Finding[] = [];
  for (const abs of files) {
    const rel = relForward(abs);
    const content = readFileSync(abs, "utf-8");
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (pattern.test(line)) {
        findings.push({
          file: rel,
          line: i + 1,
          excerpt: line.trim(),
        });
      }
    }
  }
  return findings;
}

describe("a11y source guard — outline:\"none\" inline overrides", () => {
  it("zero non-allowlisted occurrences across src/", () => {
    /* Matches `outline: "none"` or `outline: 'none'` in both inline
     * styles AND CSS files. Whitespace tolerant. */
    const pattern = /outline:\s*['"]?none/i;
    const findings = scan(pattern).filter(
      (f) => !OUTLINE_NONE_ALLOWLIST.has(f.file),
    );
    if (findings.length > 0) {
      const msg = findings
        .map((f) => `  ${f.file}:${f.line} — ${f.excerpt}`)
        .join("\n");
      throw new Error(
        `${findings.length} new outline:"none" violation(s) introduced — ` +
          `each strips the global :focus-visible ring without replacement.\n` +
          `Sites:\n${msg}\n\n` +
          `Fix: either remove the override (cleanest — global rule paints ` +
          `the canonical Aurum ring) OR pair with an explicit focus ` +
          `replacement (boxShadow ring on focused state). See ` +
          `docs/04_ACCESSIBILITY_AUDIT_2026-05-23.md § 3.`,
      );
    }
    expect(findings).toHaveLength(0);
  });
});

describe("a11y source guard — transition:all inline overrides", () => {
  it("zero non-allowlisted occurrences across src/", () => {
    /* Matches `transition: all <duration>` in inline styles + CSS.
     * Tolerant of quote style + whitespace. */
    const pattern = /transition:\s*['"]?all\b/i;
    const findings = scan(pattern).filter(
      (f) => !TRANSITION_ALL_ALLOWLIST.has(f.file),
    );
    if (findings.length > 0) {
      const msg = findings
        .map((f) => `  ${f.file}:${f.line} — ${f.excerpt}`)
        .join("\n");
      throw new Error(
        `${findings.length} new transition:all violation(s) introduced — ` +
          `silent layout-thrash anti-pattern per Vercel WIG L7.\n` +
          `Sites:\n${msg}\n\n` +
          `Fix: enumerate the actual transition properties (color, ` +
          `background-color, border-color, box-shadow, opacity, transform). ` +
          `See docs/04_ACCESSIBILITY_AUDIT_2026-05-23.md § 4.1.`,
      );
    }
    expect(findings).toHaveLength(0);
  });
});

describe("a11y source guard — <div role=\"button\"> in production", () => {
  it("zero non-allowlisted occurrences across src/", () => {
    /* Matches `role="button"` on a div / span / li / a — any
     * non-button element. Test fixtures + Tailwind classNames that
     * coincidentally contain the substring stay allowlisted.
     *
     * CSS files are excluded — CSS attribute selectors like
     * `[role="button"]` legitimately style elements WITH the role
     * (e.g., the 44×44 touch-target rule in base.css). The CSS
     * selector form uses square brackets `[role="button"]`; the
     * JSX form does not. */
    const pattern = /role="button"/;
    const findings = scan(pattern).filter(
      (f) =>
        !DIV_ROLE_BUTTON_ALLOWLIST.has(f.file) &&
        !f.file.endsWith(".css"),
    );
    if (findings.length > 0) {
      const msg = findings
        .map((f) => `  ${f.file}:${f.line} — ${f.excerpt}`)
        .join("\n");
      throw new Error(
        `${findings.length} new role="button" on non-button element(s) ` +
          `introduced — native <button> is the canonical semantic.\n` +
          `Sites:\n${msg}\n\n` +
          `Fix: replace the element with <button type="button">, drop ` +
          `the role + tabIndex + onKeyDown attributes (native button ` +
          `handles them), reset native defaults via className ` +
          `(text-left appearance-none bg-transparent border-0 p-0 ` +
          `cursor-pointer) + inline style (font: "inherit", ` +
          `color: "inherit"). See docs/04_ACCESSIBILITY_AUDIT_2026-05-23.md ` +
          `§ 5.1.`,
      );
    }
    expect(findings).toHaveLength(0);
  });
});

describe("a11y source guard — allowlist sanity", () => {
  it("every allowlisted file actually exists + contains the pattern", () => {
    /* If a file is removed from the codebase but stays in the allowlist,
     * the allowlist drifts. Verify each entry still resolves. */
    const checks: { allowlist: ReadonlySet<string>; pattern: RegExp; label: string }[] = [
      { allowlist: OUTLINE_NONE_ALLOWLIST, pattern: /outline:\s*['"]?none/i, label: "outline:none" },
      { allowlist: TRANSITION_ALL_ALLOWLIST, pattern: /transition:\s*['"]?all\b/i, label: "transition:all" },
      { allowlist: DIV_ROLE_BUTTON_ALLOWLIST, pattern: /role="button"/, label: 'role="button"' },
    ];
    for (const { allowlist, pattern, label } of checks) {
      for (const rel of allowlist) {
        const abs = join(REPO_ROOT, rel);
        let content: string;
        try {
          content = readFileSync(abs, "utf-8");
        } catch {
          throw new Error(
            `Allowlist for ${label} references "${rel}" which does not ` +
              `exist on disk. Remove the stale entry or restore the file.`,
          );
        }
        if (!pattern.test(content)) {
          throw new Error(
            `Allowlist for ${label} keeps "${rel}" but the file no ` +
              `longer contains the pattern. Remove the stale entry.`,
          );
        }
      }
    }
  });
});
