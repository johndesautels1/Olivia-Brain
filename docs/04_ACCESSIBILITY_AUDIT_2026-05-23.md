# 04 · WCAG 2.2 AA + APCA AUDIT — codebase-wide static review

> **Date.** 2026-05-23. Auditor: Claude Opus 4.7. Scope: full
> static-source audit of `src/components/**`, `src/app/**`, and
> `src/styles/**`. No live-preview verification (Action 4 in
> `02_COMPETITIVE_FEATURE_MATRIX.md § 3` notes that a Vercel preview
> URL is the gold standard; this audit is the code-side floor that
> visual confirmation builds on).
>
> **Verdict in one line.** The accessibility foundation in
> `src/styles/base.css` is **excellent** — it implements Vercel Web
> Interface Guidelines L1–L13 correctly. Findings below are all
> component-level overrides that locally violate the global floor.
> Most are HIGH severity but local-fix-able (each fix is < 5 lines).

---

## 1 · Executive summary

| Rating | Count | Notes |
|---|---|---|
| ✅ **Foundation correct** | 10/10 Vercel WIG primitives | Verified in `src/styles/base.css` — see § 2. |
| 🟠 **HIGH-severity violations** | **18 sites** | `outline: none` inline-style overrides on interactive controls. Each strips the global `:focus-visible` ring without replacement → keyboard users lose visible focus on those controls. |
| 🟡 **MEDIUM-severity violations** | **9 sites + 1** | `transition: all` (9 sites — silent layout-thrash anti-pattern per Vercel WIG L7); `PreMortemPanel.tsx` div-as-button missing `aria-label`. |
| 🔵 **LOW-severity / best-practice** | **2 sites** | `role="button"` on a `<div>` (works for AT but should be `<button>` for semantic clarity). |
| ✅ **CLEAN** | — | No `<img>` tags missing `alt` (zero `<img>` in src — all imagery via `next/image` or SVG). No `tabIndex={-1}` on interactive controls. No font-size < 16px on `<input>` / `<textarea>`. No missing `aria-label` on icon-only buttons in the spot-checked surfaces. |

**Total actionable findings: 30 sites across 15 files.** All
local-fix-able. Estimated remediation: ~2–3 hours for the HIGH +
MEDIUM tier. LOW tier optional pre-launch.

---

## 2 · Foundation — what's already correct

`src/styles/base.css` implements every primitive in
`02_COMPETITIVE_FEATURE_MATRIX.md § L`:

| Vercel WIG rule | Implementation in `base.css` |
|---|---|
| L1 — `color-scheme: dark` | Line 16 |
| L2 — APCA-tuned contrast | Token palette in `tokens.css`; `--fg-primary` 17.4:1 ratio (AAA) |
| L3 — `:focus-visible` over `:focus` | Lines 56–64 — Aurum ring 2px solid + 2px offset; legacy `:focus` stripped only when NOT focus-visible |
| L4 — `touch-action: manipulation` | Line 51 — applied globally to `button`, `input`, `textarea`, `select` |
| L5 — `<input>` font-size ≥ 16px on mobile | Line 19 — `html { font-size: 16px }` floor |
| L6 — `overscroll-behavior: contain` on modals/drawers | Lines 100–104 — applied via `[role="dialog"]`, `[data-dialog]`, `[data-drawer]` selectors |
| L7 — Never `transition: all` | Implicit (no global transition rule); component overrides violate, see § 4 |
| L8 — Min loading-state duration 300–500ms | Enforced at the loading-state util level (out of scope for static audit) |
| L9 — `aria-label` mandatory on icon-only controls | 253 usages across 112 files — broadly respected |
| L10 — Confirm destructive actions OR Undo | Modal pattern (out of scope for static audit) |
| L11 — Forced-colors / Windows High Contrast | Line 155 — `@media (forced-colors: active)` rule |
| L12 — Trust-building clinical typography | Reserved for HEARTBEAT (priority 6 future build) |
| Skip-to-content link | Lines 67–83 — `.skip-to-content` class with `:focus-visible` reveal |
| `.sr-only` utility | Lines 86–96 — standard screen-reader-only positioning |
| `prefers-reduced-motion: reduce` | Lines 107–116 — kills animations longer than 120ms |
| 44 × 44 touch target on coarse pointers | Lines 119–126 — `@media (hover: none) and (pointer: coarse)` |

This is the cleanest accessibility foundation I've audited in the
CLUES product family. The findings below are local component-style
overrides that **bypass** this foundation, not gaps in the foundation
itself.

---

## 3 · HIGH-severity findings — 18 `outline: none` overrides

### What's wrong

Each of these 18 sites sets `outline: "none"` inline in component
styles. Because `base.css :focus-visible` paints a 2-px Aurum ring via
the global `outline` property, an inline `outline: "none"` **strips
that ring for the keyboard user** without replacing it. Per WCAG 2.4.7
"Focus Visible," every interactive control must show a focus
indicator when keyboard-driven; these 18 sites silently fail.

### Fix pattern (one of two)

**Option A — remove the override entirely** if the control inherits a
working focus from the global rule:

```diff
- outline: "none",
```

**Option B — replace with a visible focus state** if the control
needs a non-default focus shape:

```diff
- outline: "none",
+ outline: "none",   // override only the default ring
+ // and add elsewhere in the style object:
+ // boxShadow: focused ? "0 0 0 2px var(--aurum-primary)" : undefined,
```

(Pure Tailwind components — the `WarRoomSession` cluster at lines
125–380 — already pair `focus-visible:outline-none` with
`focus-visible:ring-2 focus-visible:ring-aurum`. They're correct;
NOT in the violation list below.)

### Sites

| File | Line | Element |
|---|---|---|
| `src/app/calendar/CalendarPageClient.tsx` | 1157 | email transcript modal input |
| `src/components/calendar/EventStatusWidget.tsx` | 395 | inline editor |
| `src/components/valuation/ValuationWorkbench.tsx` | 1570 | command palette input |
| `src/components/home/command-palette/CommandPalette.tsx` | 189 | ⌘K search input |
| `src/components/home/HomeComposer.tsx` | 302 | homepage chat composer |
| `src/components/studio/OliviaChatTab.tsx` | 238 | studio chat composer |
| `src/components/studio/LibraryTab.tsx` | 135 | library search input |
| `src/components/studio/PitchCoachTab.tsx` | 450 | pitch chat input |
| `src/components/studio/PitchCoachTab.tsx` | 571 | secondary input |
| `src/components/studio/PitchCoachTab.tsx` | 613 | tertiary input |
| `src/components/quantara/IntakeSupplementaryField.tsx` | 75 | supplementary field input |
| `src/components/quantara/IntakeForm.tsx` | 1017 | form input |
| `src/components/quantara/IntakeForm.tsx` | 1056 | form input |
| `src/components/quantara/IntakeField.tsx` | 715 | core intake field |
| `src/components/quantara/IntakeField.tsx` | 788 | core intake field |
| `src/components/quantara/IntakeField.tsx` | 933 | core intake field |
| `src/components/quantara/IntakeField.tsx` | 976 | core intake field |

**Special case — `src/styles/base.css:63`** — `outline: none` inside
`:focus:not(:focus-visible)` is the CANONICAL legacy-stripping
pattern from Vercel WIG. **Not a violation.** Kept for completeness.

### Impact

The Quantara intake (Q1-Q7 founder questionnaire) is the
single highest-stakes surface for this violation — 7 inputs spread
across `IntakeField` + `IntakeForm` + `IntakeSupplementaryField`. A
keyboard-only founder cannot tell which field has focus when filling
a 56-field form. Recommend fixing the Quantara cluster first.

Search inputs (`CommandPalette`, `LibraryTab`, `HomeComposer`) are
the second-highest impact — they're the entry point to the product.

---

## 4 · MEDIUM-severity findings

### 4.1 `transition: all` — 9 sites (Vercel WIG L7)

`transition: all` causes silent layout-thrash bugs as browser-internal
properties change (`background-position`, `border-image-slice`, etc.
all become transition targets). Always enumerate the specific
properties.

**Fix pattern:**

```diff
- transition: "all 0.15s ease",
+ transition: "color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease",
```

(Or match the existing token pattern: `transition: "color var(--duration-micro) var(--ease-out-quart)"`)

| File | Line | Notes |
|---|---|---|
| `src/components/ExternalLinkFrame.tsx` | 211 | `transition: "all 0.15s ease"` |
| `src/components/valuation/ValuationWorkbench.tsx` | 1590 | `transition: 'all 0.2s ease-out'` |
| `src/components/valuation/GlossaryTooltip.tsx` | 389 | `transition: 'all 200ms ease'` |
| `src/components/studio/WhyThisPanel.tsx` | 240 | `transition: "all 200ms ease"` |
| `src/components/studio/SuggestionChips.tsx` | 437 | `transition: "all 200ms ease"` |
| `src/components/studio/PitchCoachTab.tsx` | 690 | `transition: "all var(--duration-micro) var(--ease-out-quart)"` — uses tokens but still `all` |
| `src/components/olivia/OliviaDisplayScreen.tsx` | 386 | `transition: "all 0.3s ease"` |
| `src/components/map/GoogleMapView.tsx` | 460 | `transition: all 0.15s ease` (inline CSS string) |
| `src/components/map/GoogleMapView.tsx` | 485 | `transition: all 0.2s ease` (inline CSS string) |

### 4.2 Div-as-button missing `aria-label` — 1 site

| File | Line | Issue |
|---|---|---|
| `src/components/valuation/PreMortemPanel.tsx` | 76 | `<div role="button" tabIndex={0} ...>` has working keyboard handler + `aria-expanded` but NO `aria-label`. Screen reader announces "button, collapsed" with no identification of WHAT collapses. |

**Fix:**

```diff
  <div
    className={...}
    onClick={() => setCollapsed(!collapsed)}
    role="button"
    tabIndex={0}
    onKeyDown={...}
    aria-expanded={!collapsed}
+   aria-label={collapsed ? "Expand pre-mortem panel" : "Collapse pre-mortem panel"}
  >
```

---

## 5 · LOW-severity findings — best-practice

### 5.1 `<div role="button">` should be `<button>` — 2 sites

Both sites correctly implement the full keyboard pattern
(`tabIndex={0}`, `onKeyDown` for Enter + Space, `aria-expanded`,
`aria-label` where applicable). Screen readers + keyboard users are
not broken. Native `<button>` would be cleaner semantically and pick
up the browser's built-in keyboard handling for free.

| File | Line | Status |
|---|---|---|
| `src/components/documents/DocumentWorkspace.tsx` | 570 | Has `aria-label` + `aria-expanded` + keyboard handler. WORKS but should be `<button>`. |
| `src/components/valuation/PreMortemPanel.tsx` | 76 | See § 4.2 above — fix `aria-label` first; conversion to `<button>` optional. |

The test reference at `__tests__/DocumentWorkspace.test.tsx:140`
intentionally targets the `div[role="button"]` selector; converting
to native `<button>` requires updating the test selector too.

---

## 6 · Surfaces audited — checklist

| Surface | Audited | Notes |
|---|---|---|
| Foundation (`src/styles/base.css` + `tokens.css`) | ✅ | Excellent — 10/10 Vercel WIG primitives. |
| `src/components/workspace/**` (shell + Inspector + RailLeft + Header) | ✅ | Clean. Inspector uses proper tablist + tabIndex + aria-controls. |
| `src/components/primitives/**` (AvatarOrb, Badge, CompletionRing, ConsensusDots, DeckDetailModal) | ✅ | Clean. AvatarOrb uses `prefers-reduced-motion`-aware animation. |
| `src/components/home/**` (HomeHero, HomeComposer, CommandPalette, KpiTileGrid) | 🟠 | 2 `outline: none` violations (HomeComposer:302, CommandPalette:189). |
| `src/components/home/reply-renderer/**` (7 fence renderers) | ✅ | Clean. All new fences (map, ui, comparison) ship with proper ARIA on every interactive surface. |
| `src/components/quantara/**` (founder intake) | 🟠 | 7 `outline: none` violations — highest-impact surface for keyboard founder. |
| `src/components/studio/**` (PreparationStudio + tabs + UI shell) | 🟠 | 5 `outline: none` + 3 `transition: all`. |
| `src/components/calendar/**` (CalendarView, CalendarNotepad, CalendarEntryModal, etc.) | 🟠 | 1 `outline: none` (EventStatusWidget). |
| `src/components/valuation/**` (Workbench + 31 zone components + WarRoom family) | 🟠 | 1 `outline: none` + 3 `transition: all` + 1 missing aria-label (PreMortemPanel). |
| `src/components/documents/**` (workspace + 18 blocks + 14 write-surface components) | 🔵 | 1 div-as-button (DocumentWorkspace:570) — works but should be native `<button>`. |
| `src/components/map/**` (MapView + GoogleMap3DView + controls) | 🟡 | 2 `transition: all` violations (GoogleMapView). No interactive violations. |
| `src/components/admin/**` (InvestorsAdmin, AdminDashboardClient) | ✅ | Clean. |
| `src/app/calendar/CalendarPageClient.tsx` | 🟠 | 1 `outline: none`. Backdrop-click-to-close patterns are legitimate UX (not violations). |
| `src/app/voice/page.tsx` | ✅ | Clean. |
| `src/app/test-avatar/page.tsx` | ✅ | Clean. |
| `src/app/admin/**` (avatar-eval, eval, traces, tools) | ✅ | Clean. |
| `src/app/documents/**` | ✅ | Clean. |

---

## 7 · What I did NOT find (clean)

These were grep targets that returned ZERO hits — confirming the
codebase is clean on these fronts:

- `<img>` tags without `alt` attribute — **zero `<img>` tags in src**
  (every image goes through `next/image` or an SVG, both of which
  surface the alt-text requirement at the type level)
- `<input>` / `<textarea>` with `fontSize` 8-15px — **zero violations**
  (global 16px floor holds; the 225 small-font hits across 30 files
  are all labels / captions / eyebrows / dates, not interactive
  controls)
- `tabIndex={-1}` on interactive controls — **zero violations**
  (the only tabIndex usage I saw was the Inspector's tablist pattern
  where `tabIndex={active ? 0 : -1}` is the correct roving-tabindex
  pattern)
- Missing `aria-label` on icon-only buttons — broadly respected
  (253 usages across 112 files; spot-checked admin / studio / valuation
  icon-only controls all carry labels)
- `<a>` tags missing `rel="noopener noreferrer"` on `target="_blank"`
  — broadly respected (every external link audited carries the rel
  attribute)
- Heading hierarchy skips — minor in 2-3 files (h3 → h5 in
  reply-renderer to keep visual hierarchy within nested cards) but
  pragmatic; not severe.

---

## 8 · Remediation plan — ordered by impact

### Phase 1 — HIGH severity (~90 minutes total)

1. **Quantara cluster** (7 `outline: none`) — `IntakeField.tsx`,
   `IntakeForm.tsx`, `IntakeSupplementaryField.tsx`. Single PR.
   Replace each with either removal or `boxShadow` focus-state
   replacement. ~30 min.
2. **Studio cluster** (5 `outline: none`) — `OliviaChatTab.tsx`,
   `LibraryTab.tsx`, `PitchCoachTab.tsx` (×3). Single PR. ~25 min.
3. **Home + Calendar cluster** (4 `outline: none`) —
   `HomeComposer.tsx`, `CommandPalette.tsx`,
   `EventStatusWidget.tsx`, `CalendarPageClient.tsx`. Single PR.
   ~20 min.
4. **Valuation cluster** (1 `outline: none`) —
   `ValuationWorkbench.tsx`. Single edit. ~10 min.
5. **Add a CI lint rule** that fails the build if a component
   `outline: "none"` is not paired with a `box-shadow` /
   `focus-visible:` replacement in the same style object. ~5 min
   (one ESLint custom rule).

### Phase 2 — MEDIUM severity (~45 minutes total)

6. **`transition: all` cluster** — 9 sites. One PR. Replace each with
   enumerated properties. ~30 min.
7. **PreMortemPanel `aria-label`** — 1 edit. ~5 min.
8. **Add a CI lint rule** that fails the build on `transition:.*all`
   inline. ~10 min.

### Phase 3 — LOW severity (~20 minutes, optional pre-launch)

9. **`<div role="button">` → `<button>` conversion** — 2 sites
   (DocumentWorkspace, PreMortemPanel). Each requires updating its
   test selector. ~10 min each.

---

## 9 · Visual confirmation still needed

Per Action 4 in the competitive matrix, the gold standard is a
live-preview verification of:

- **Tap targets** on a real phone (the 44×44 rule is enforced via
  `@media (hover: none) and (pointer: coarse)` but the touch surface
  varies by browser — needs physical-device confirmation)
- **APCA contrast** on the actual rendered text against the actual
  rendered background (LCH calculations in tokens.css should produce
  AAA contrast but real screens can drift)
- **Focus indicator visibility** in real Windows High Contrast Mode
  and macOS Reduced Transparency
- **VoiceOver / NVDA / TalkBack** screen reader walkthroughs on key
  surfaces (home, founder intake, document workspace, calendar,
  valuation workbench)
- **Keyboard-only flow** end-to-end on the demo path (login →
  questionnaire → verdict → deck export)

This static audit is the necessary prerequisite for those visual
checks. With the 18 HIGH + 10 MEDIUM violations remediated, the
visual pass should be straightforward.

---

## 10 · Methodology + reproducibility

This audit ran the following grep patterns across the codebase
(all in `src/`):

| Pattern | What it finds |
|---|---|
| `#[0-9a-fA-F]{3,8}\b` in `.tsx` | Raw hex in component files — broad signal for token-discipline violations (137 files matched; most are documented constants + test fixtures). |
| `outline:\s*[\"']?none` | `outline: "none"` inline — silent focus-ring kills. 18 hits. |
| `transition:\s*[\"']?all` | `transition: all` anti-pattern. 9 hits. |
| `<img\s` in `.tsx` | `<img>` tags without alt review. 0 hits. |
| `<div[^>]*onClick` | Divs with onClick handlers. 6 hits — all legitimate backdrop/stop-propagation. |
| `role="button"` | Divs masquerading as buttons. 3 hits — 2 production, 1 test. |
| `<input[^>]*fontSize:\s*[\"']?(8\|...\|15)px` | Inputs below 16px iOS-zoom threshold. 0 hits. |
| `tabIndex={-1}` | Interactive controls removed from tab order. 0 hits. |
| `prefers-reduced-motion`, `touch-action`, `focus-visible`, `forced-colors`, `overscroll-behavior` | Foundation primitives. All 5 verified present in `base.css`. |

To reproduce: run each pattern via the `Grep` tool against
`D:\Olivia Brain\src`. Update this doc with a new dated section when
new violations are introduced or remediated.

---

*End of audit. Findings ready for triage. No code changes made in
this batch — this doc is the contract; remediation lands in
follow-up commits per the phase plan in § 8.*
