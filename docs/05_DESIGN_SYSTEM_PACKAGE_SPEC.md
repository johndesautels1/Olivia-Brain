# 05 · DESIGN SYSTEM PACKAGE SPEC — `@olivia/design-system`

> **Read `00_PRODUCT_TRUTH.md` + `01_UI_DESIGN_SYSTEM.md` + `02_COMPETITIVE_FEATURE_MATRIX.md` first.** This doc is Action 3 from the competitive-matrix § 3 queue: the extraction-path spec that lets every spoke app (clueslondon, cluesintelligence, cluesxscore × 23 modules, white-label tenants, clues-property-search, Heart-Recovery-Calendar, London transit) consume Olivia's UI design system from a single source of truth without duplicating tokens, primitives, or accessibility plumbing.
>
> **Status.** Specification only — no code in this commit. Ready for a future session to build against. Once any line of `@olivia/design-system` ships, this doc becomes the contract.

---

## 1 · Why extract — the bicycle-wheel argument

Per `00_PRODUCT_TRUTH.md`, Olivia is the brain at the hub of a bicycle wheel. The spokes are user-facing products. Today, each spoke duplicates four kinds of UI infrastructure:

| What's duplicated | Today | Cost |
|---|---|---|
| **Tokens** (`--canvas-base`, `--aurum-primary`, etc.) | Copy-pasted CSS files per repo | Drift — a token tuned in OB does not propagate to clueslondon |
| **Primitives** (`AvatarOrb`, `Badge`, `CompletionRing`, `ConsensusDots`, `DeckDetailModal`) | Re-implemented per repo | Bugs fixed in OB don't reach LTM |
| **Accessibility plumbing** (focus-visible ring, touch targets, prefers-reduced-motion, forced-colors) | Re-implemented per repo | The WCAG audit (`04_ACCESSIBILITY_AUDIT_2026-05-23.md`) found 30 violations IN OB ALONE because there was no upstream foundation to inherit |
| **Theme generator** (`{ base, accent, contrast }` → 98 derived vars) | One implementation in OB; not yet consumed by spokes | White-label feature deferred to "when we get to it" |

After extraction, the bicycle wheel works as designed: a token tuned in `@olivia/design-system` propagates to every spoke on the next install. A primitive bug fixed once is fixed everywhere. The white-label theme generator IS the package's headline API.

**This is non-optional for the priority-4 white-label SaaS to exist.** A third-party real-estate firm cannot adopt Olivia's brand-customisable shell if every spoke ships its own divergent design system.

---

## 2 · Package structure

```
packages/design-system/
├── package.json
├── tsconfig.json
├── README.md
├── CHANGELOG.md
├── src/
│   ├── index.ts                         # Public barrel — every export
│   ├── tokens/
│   │   ├── canvas.css                   # --canvas-base, --canvas-recess, --surface-1..3
│   │   ├── foreground.css               # --fg-primary..disabled, --fg-on-accent
│   │   ├── aurum-aether.css             # --aurum-* + --aether-* brand accents
│   │   ├── semantic.css                 # --mint-up, --coral-down, --sky-info, --amber-warn
│   │   ├── borders.css                  # --border-subtle/default/strong
│   │   ├── typography.css               # --font-sans/display/mono, --text-*
│   │   ├── radius.css                   # --radius-sm/md/lg/full
│   │   ├── motion.css                   # --duration-*, --ease-*
│   │   ├── tailwind-theme.css           # @theme block re-exporting every token as utility
│   │   └── index.ts                     # Token name constants (typed enums for runtime use)
│   ├── base/
│   │   ├── reset.css                    # box-sizing + body + html font-size 16px
│   │   ├── a11y.css                     # :focus-visible, touch-action, overscroll, sr-only,
│   │   │                                # skip-to-content, reduced-motion, forced-colors,
│   │   │                                # 44×44 coarse-pointer rule (the WCAG 2.2 AA floor)
│   │   ├── typography.css               # default h1-h6 + .font-display + .font-mono + .tabular-nums
│   │   └── index.ts                     # Single import that pulls all four base layers
│   ├── primitives/
│   │   ├── AvatarOrb/                   # The single-orb identity (header, sidebar, chat tab)
│   │   │   ├── AvatarOrb.tsx
│   │   │   ├── AvatarOrb.test.tsx
│   │   │   └── index.ts
│   │   ├── Badge/                       # 0-100 score pill with tier colors
│   │   ├── CompletionRing/              # SVG progress ring
│   │   ├── ConsensusDots/               # 5-dot agreement indicator
│   │   ├── DeckDetailModal/             # Aurum-tinted Radix dialog
│   │   └── index.ts                     # Barrel for all primitives
│   ├── theme/
│   │   ├── generate.ts                  # generateThemeTokens({ base, accent, contrast }) → CSSVarMap
│   │   ├── serialize.ts                 # serializeThemeTokens(map) → CSS string for inline injection
│   │   ├── canonical.ts                 # The default Olivia theme (Aurum + Aether + Onyx)
│   │   └── index.ts
│   ├── reply-renderer/                  # The 7 fence renderers (chart/gamma/sources/timeline/map/ui/comparison)
│   │   ├── MarkdownReply.tsx
│   │   ├── ChartFromSpec.tsx
│   │   ├── chart-spec.ts
│   │   ├── GammaCard.tsx
│   │   ├── CitationStrip.tsx
│   │   ├── TimelineFromSpec.tsx
│   │   ├── MapManifest.tsx              # peer-depends on `mapbox-gl`
│   │   ├── UIManifest.tsx
│   │   ├── ComparisonView.tsx
│   │   ├── *-spec.ts                    # All 7 parser files
│   │   ├── *.test.ts                    # All 7 parser tests
│   │   └── index.ts
│   └── workspace/                       # The three-region shell (Header + RailLeft + Center + Inspector)
│       ├── WorkspaceShell.tsx
│       ├── Header.tsx
│       ├── RailLeft.tsx
│       ├── Center.tsx
│       ├── Inspector.tsx
│       └── index.ts
└── styles/                              # Distributed CSS (imported by host apps)
    ├── tokens.css                       # Built bundle of all tokens/
    └── base.css                         # Built bundle of all base/
```

### Why this structure

- **`tokens/` is layered by concern** so a host app can opt into a subset if needed (e.g., a static marketing site might want canvas + foreground but skip motion).
- **`base/` is the WCAG floor** — every consumer must import `base/index.ts` first. This is the single source of truth for the accessibility primitives. The WCAG audit (`04_ACCESSIBILITY_AUDIT_2026-05-23.md`) Phase 1 + 2 + 3 fixes all live HERE after extraction; consumers inherit them automatically.
- **`primitives/` is one-component-per-folder** with co-located tests. Mirrors the canonical pattern from Tailwind UI, IBM Carbon, Microsoft Fluent.
- **`theme/` is the white-label headline API** — `generateThemeTokens({ base, accent, contrast })` is what a tenant provides; everything else derives.
- **`reply-renderer/` ships the 7-fence contract** — every spoke that surfaces Olivia replies gets the same renderer.
- **`workspace/` ships the shell** — every product that mounts Olivia inside a modular workspace gets the same Header + Rail + Center + Inspector chrome.

---

## 3 · Token contracts

Token names + types must be stable across versions. Every token follows the convention:

```
--<scope>-<role>[-<modifier>]
```

| Token name | Type | Stable since | Notes |
|---|---|---|---|
| `--canvas-base` | sRGB hex | 1.0 | Page background. Deepest layer. |
| `--canvas-recess` | sRGB hex | 1.0 | Recessed surfaces. |
| `--surface-1`, `--surface-2`, `--surface-3` | sRGB hex | 1.0 | Raised content layers, strictly one-step elevation per layer. |
| `--surface-translucent` | rgba | 1.0 | Glassmorphism (with `backdrop-filter`). |
| `--fg-primary`, `--fg-secondary`, `--fg-tertiary`, `--fg-disabled`, `--fg-on-accent` | sRGB hex | 1.0 | Foreground ladder, APCA-tuned. |
| `--aurum-primary`, `--aurum-soft`, `--aurum-mute` | sRGB hex / rgba | 1.0 | Brand decisions / value / verdict. |
| `--aether-primary`, `--aether-glow`, `--aether-mute` | sRGB hex / rgba | 1.0 | Intelligence / agents / real-time. |
| `--mint-up`, `--coral-down`, `--sky-info`, `--amber-warn` | sRGB hex | 1.0 | Semantic accents — trader instinct. |
| `--border-subtle`, `--border-default`, `--border-strong` | rgba | 1.0 | Soft borders ladder. |
| `--font-sans`, `--font-display`, `--font-mono` | font-family stack | 1.0 | DM Sans / Syne / JetBrains Mono. |
| `--text-2xs` → `--text-6xl` | rem | 1.0 | Type scale, 4-px progression. |
| `--radius-sm` → `--radius-full` | rem / `9999px` | 1.0 | Border-radius scale. |
| `--duration-micro`, `--duration-base`, `--duration-slow` | ms | 1.0 | Motion timing. |
| `--ease-out-quart`, `--ease-in-out-cubic` | cubic-bezier() | 1.0 | Motion curves. |

### Versioning rule

Token names + their CSS-custom-property contract are stable across MAJOR versions. A token may be added (MINOR) or deprecated (MINOR, with at least one MAJOR-version warning period). A token cannot be removed or renamed within a MAJOR version. This protects every consumer's compiled CSS.

If a consumer wants a non-canonical name (e.g., legacy `--bg` for `--canvas-base`), they alias in their own host stylesheet — the package does not ship aliases.

---

## 4 · Primitive APIs

Every primitive ships:

1. A **typed React component** (`.tsx`) with strict prop types.
2. A **co-located test** (`.test.tsx`) — render-shape + a11y + state-machine invariants.
3. A **single-export `index.ts`** — `{ Component, type ComponentProps }`.

### Canonical primitive: `AvatarOrb`

```tsx
import { AvatarOrb, type AvatarOrbProps } from "@olivia/design-system";

<AvatarOrb
  size={240}                                  // 24 / 36 / 40 / 240 — discrete sizes only
  state="speaking"                            // "idle" | "listening" | "thinking" | "speaking" | "error" | "judge"
  intent={undefined}                          // optional — "judge" triggers Cristiano gold transition
  subAgents={[                                // optional — council mode (orbit dots)
    { id: "research", color: "aether" },
    { id: "math", color: "sky" },
  ]}
  hasVideo={true}                             // size=240 + hasVideo lazy-mounts LiveAvatar
  onClick={() => toggleConnected()}
  aria-label="Olivia"                         // mandatory on every Orb
/>;
```

Stable since 1.0. Every state has its own visual + accessibility contract per `01_UI_DESIGN_SYSTEM.md § 6`.

### Canonical primitive: `Badge`

```tsx
<Badge value={87} size="lg" />                // 0-100 with tier color (green ≥80, yellow ≥50, red >0, dim 0)
```

### Canonical primitive: `CompletionRing`

```tsx
<CompletionRing pct={74} size={20} />         // SVG circular progress, same tier colors as Badge
```

### Canonical primitive: `ConsensusDots`

```tsx
<ConsensusDots n={4} />                       // 0-5 dots, filled in Aurum up to n; ARIA role="img"
```

### Canonical primitive: `DeckDetailModal`

```tsx
<DeckDetailModal
  deck={selectedDeck}                         // null = closed; non-null = open
  onClose={() => setSelectedDeck(null)}
  onApply={() => applyArchetype(selectedDeck!)}
/>;
```

Built on `@radix-ui/react-dialog` for focus-trap + return-focus + Esc-to-close.

### How more primitives land

When a host app needs a new primitive:

1. Build it in the host app first (real consumer requirement validates the API).
2. Once a SECOND consumer needs the same primitive, **extract** to `@olivia/design-system` per the no-speculative-generalization rule (per `project_ltm_types_no_speculative_generalization` memory).
3. Test in both consumers; cut a MINOR release.

---

## 5 · Theme generator API

The headline white-label API. One function call → 98 CSS custom properties.

```ts
import { generateThemeTokens, serializeThemeTokens, type ThemeInput } from "@olivia/design-system";

const tenantTheme: ThemeInput = {
  base: "#050B15",                            // Page background hex
  accent: "#C4A96A",                          // Brand decisions / CTA color
  contrast: "#F1ECE0",                        // Body text against canvas
};

const tokenMap = generateThemeTokens(tenantTheme);
// → { "--canvas-base": "#050B15", "--canvas-recess": "#08111E", ..., "--aurum-primary": "#C4A96A", ... }

const css = serializeThemeTokens(tokenMap);
// → ":root { --canvas-base: #050B15; --canvas-recess: #08111E; ... }"

// Inject in <head> for SSR OR as a runtime <style> block.
```

The contract:

- **3 inputs in, 98 tokens out.** Every derived token (`--canvas-recess`, `--surface-1..3`, `--aurum-soft/mute`, `--aether-*`, `--fg-secondary/tertiary`, `--border-*`) computes via LCH-perceptual-uniform offsets from the base/accent/contrast triplet.
- **APCA contrast verified** — `generateThemeTokens` throws if `contrast` against `base` falls below APCA Lc 75 (AAA body text).
- **Deterministic** — same input always produces the same output. No randomness.
- **Pure** — no IO, no DOM access. Safe for SSR.

---

## 6 · Distribution

| Aspect | Choice |
|---|---|
| **Package manager** | npm + GitHub Packages registry (private until white-label launches; npm-public when GA) |
| **Module format** | ESM + CJS dual exports (`exports` field in package.json) |
| **TypeScript** | `.d.ts` shipped alongside `.js` — every public symbol typed |
| **CSS** | Static stylesheets in `styles/tokens.css` + `styles/base.css` (consumers import via `@olivia/design-system/styles/tokens.css`) |
| **Peer deps** | `react` ≥ 19, `react-dom` ≥ 19, `mapbox-gl` ≥ 3 (only for `reply-renderer/MapManifest.tsx` — soft dep, gracefully degrades when absent) |
| **Tree-shaking** | Every primitive in its own folder + barrel re-export; consumer imports `{ AvatarOrb }` get only AvatarOrb |
| **Versioning** | Strict SemVer with the token + primitive stability rule from § 3 |
| **Lockstep** | Track major Next.js + React versions; minor bumps within MAJOR allowed |

---

## 7 · Consumer migration path

Six consumers eventually import this package. Migration order:

| # | Consumer | When | What changes |
|---|---|---|---|
| 1 | **Olivia Brain** (this repo) | First — it IS the source | Move `src/styles/*` + `src/components/primitives/*` + `src/components/home/reply-renderer/*` + `src/components/workspace/*` into `packages/design-system/`; replace internal imports with package imports |
| 2 | **clueslondon.com** (LTM) | Phase B5 post-audit closure | LTM consumes the design system from npm; LTM's local design-system code retires |
| 3 | **cluesintelligence.com** | When the questionnaire/Bayesian/persona spec locks | Built fresh against the package; no migration needed |
| 4 | **cluesxscore × 23 modules** | When the first xscore module ships | Each module imports the package; the per-app tenant theme uses `generateThemeTokens` |
| 5 | **White-label tenants** | Priority 4 — when first paying tenant onboards | Tenant provides `{ base, accent, contrast }`; everything else derives |
| 6 | **HEARTBEAT + clues-property-search + London transit** | Priority 5-7 future builds | Built fresh against the package |

### Migration safety

- **No host-app rewrite needed during step 1.** The package extraction is purely a code-move + import-path-rename, no API changes.
- **Snapshot-test parity** — every primitive + every fence renderer keeps its existing test suite, run against the package version before tagging 1.0.
- **Visual-regression budget** — zero. Any pixel-level change between pre-extraction OB and post-extraction OB is a bug, not a feature.

---

## 8 · Build + publish workflow

```
# Local dev (inside packages/design-system)
npm run build                  # tsc + bundle tokens.css + base.css → dist/
npm test                       # vitest — primitives + parsers + theme generator
npm run typecheck

# Release (CI)
npm version <major|minor|patch>
npm publish --access restricted   # GitHub Packages registry
git tag @olivia/design-system@<version>
git push --tags
```

Release notes auto-generated from commits matching `feat(design-system):` / `fix(design-system):` / `BREAKING(design-system):` per Conventional Commits.

CI workflow runs:

1. `npm install` against the workspace lockfile
2. `npm run build` — typecheck + bundle
3. `npm test` — vitest suite
4. `npm pack --dry-run` — verify the published shape matches the `exports` field
5. Visual-regression smoke (Chromatic or Percy) on the canonical theme + 3 white-label themes
6. APCA contrast verification on the canonical theme (`generateThemeTokens` self-check)

---

## 9 · Open questions

Numbered for the founder to confirm before any line of `@olivia/design-system` lands.

1. **Monorepo vs separate repo?** A monorepo (`olivia-brain` as the root, `packages/design-system` alongside `apps/web`) is simpler for the early period when OB is the primary consumer. A separate repo (`github.com/johndesautels1/olivia-design-system`) decouples publish cadence — better long-term but adds CI complexity now. **Recommended: monorepo until 2nd consumer onboards, then split.**
2. **Private registry vs public npm?** Private until the white-label SaaS is GA — keeps the package as a differentiator. **Recommended: GitHub Packages private until priority-4 white-label launches.**
3. **CSS-in-JS or pure CSS?** Pure CSS tokens + inline-styled primitives (the existing OB pattern). No styled-components, no emotion. The matrix § E rules apply: tokens-as-substrate, no runtime CSS-in-JS. **Recommended: pure CSS — matches the existing OB approach.**
4. **Snapshot tests how strict?** Pixel-perfect visual regression on the canonical theme catches any unintended drift. Permissive snapshot tests on per-tenant themes (only assert the structural shape, not exact pixels). **Recommended: split.**
5. **Tailwind v4 — first-class or compatibility?** OB uses Tailwind v4 + `@theme` for token-to-utility mapping. The package should ship its `tailwind-theme.css` for Tailwind v4 consumers and stay pure-CSS-token-only for non-Tailwind consumers. **Recommended: dual-ship.**

---

## 10 · Status

| Item | Status |
|---|---|
| This spec doc | ✅ Shipped 2026-05-23 (Action 3 from competitive matrix) |
| Founder review + open-question confirmation | Pending |
| Monorepo workspace setup (`packages/design-system/package.json` etc.) | Pending founder sign-off |
| Code extraction (move + rename imports) | Pending |
| Test suite parity verification | Pending |
| 1.0 release | Pending |

Competitive matrix queue position: Action 3 closed (this doc). Action 4 (WCAG audit + Phase 1+2+3 remediation + regression guard) closed this batch. Actions 1 + 2 closed earlier this batch (`AGENTS.md` + `comparison` fence). **The full competitive-matrix Action queue is now resolved.**

---

*End of spec. When code extraction begins, every section here becomes a binding contract. When a question in § 9 gets resolved, edit the recommendation to a decision + add a dated annotation in § 10.*
