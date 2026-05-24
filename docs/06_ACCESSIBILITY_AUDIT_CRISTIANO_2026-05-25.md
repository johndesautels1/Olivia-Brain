# Accessibility Audit — Cristiano Dashboard Surfaces

**Date:** 2026-05-25
**Auditor:** Claude Opus 4.7 (1M context)
**Scope:** 6 files added in the Cristiano dashboard batch (commits `f41548e` → `25d0c95`):

| # | File | Lines |
|---|---|---|
| 1 | `src/components/cristiano/CristianoDashboard.tsx` | 158 |
| 2 | `src/components/cristiano/AskCristiano.tsx` | 456 |
| 3 | `src/components/cristiano/VerdictLibrary.tsx` | 317 |
| 4 | `src/components/cristiano/CristianoVerdictPlayer.tsx` | 241 |
| 5 | `src/components/cristiano/GatewayInbox.tsx` | 154 |
| 6 | `src/app/cristiano/page.tsx` | 68 |

**Standard:** WCAG 2.2 AA floor + APCA contrast tuning + WCAG 2.5.5 AAA touch targets per `docs/01_UI_DESIGN_SYSTEM.md` and `~/CLAUDE.md` 2026 standards table.

**Method:** Line-by-line read of every file. Findings cite the exact source location with `file:line` (per founder direction 2026-05-25 "line by line no lies"). No automated scanner was used beyond the source-scan regression guard at `src/lib/evaluation/a11y-source-guard.test.ts` — manual audit complements that.

**Audit honesty note:** the prior commit `25d0c95` was framed as "WCAG sweep" but only fixed 7 touch targets + 1 missing heading. This audit produces the deliverable that the "sweep" label promised — codifies every finding cite-able, then phases remediation per the 2026-05-23 audit precedent.

---

## § 1 · Findings Summary

| Severity | Count | Description |
|---|---|---|
| **HIGH** | 3 | WCAG 1.2.2 Level A captions; WCAG 2.5.5 AAA touch target on critical action; APCA contrast on primary CTA |
| **MEDIUM** | 6 | WCAG 2.5.3 (Label in Name); WCAG 4.1.3 (Status Messages); WCAG 1.3.1 (Info & Relationships) on tab control |
| **LOW** | 8 | Implicit label-wrap pattern; missing HTML maxLength; cosmetic + best-practice items |
| **TOTAL** | **17** | |

---

## § 2 · HIGH-severity findings

### H1 — "Try again" button missing `min-h-[44px]` (touch target AAA fail)

**File:** `src/components/cristiano/AskCristiano.tsx:409-415`
**Standard:** WCAG 2.5.5 AAA Target Size + `~/CLAUDE.md` 2026 bar ("Touch hit-target ≥ 44 × 44 on coarse pointers").

**Current code:**
```tsx
<button
  type="button"
  onClick={handleReset}
  className="mt-2 text-xs text-red-300 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-aurum/50"
>
  Try again
</button>
```

**Issue:** `text-xs` (12px) + no padding + `underline` styling gives ~16-18px height. Below the 44×44 AAA bar. This button appears inside the error alert AFTER the user has hit a validation problem — the most stressful moment to mis-tap.

**Why I missed it in `25d0c95`:** I bumped 7 buttons in that commit but missed this one because it's text-link styled (no visible button chrome).

**Fix:** add `inline-flex min-h-[44px] items-center` to the className.

---

### H2 — Pre-rendered verdict video missing `<track kind="captions">` (WCAG 1.2.2 Level A)

**File:** `src/components/cristiano/CristianoVerdictPlayer.tsx:168-187`
**Standard:** WCAG 1.2.2 (Captions, Prerecorded) Level A. Pre-recorded video content MUST have captions.

**Current code:**
```tsx
<video
  ref={videoRef}
  src={verdict.preRenderedVideoUrl ?? undefined}
  poster={verdict.thumbnailUrl ?? undefined}
  controls
  preload="metadata"
  className="w-full rounded-lg bg-black"
  aria-label={`Pre-rendered verdict video: ${verdict.verdictTitle}`}
  ...
/>
```

**Issue:** Pre-rendered verdicts (e.g. lifescore HeyGen Video Agent V2 MP4 output, or future LTM Phase-6 narration MP4) are spoken video content. Deaf users have no access to the spoken content during playback. The `<details>` transcript at L228-238 satisfies WCAG 1.2.3 (Media Alternative for Prerecorded) Level A — text equivalent EXISTS — but **captions during playback are a SEPARATE requirement (1.2.2)**, also Level A.

**Mitigation in place:** transcript is rendered below the video. So a deaf user has access to the verdict content via the `<details>` block. This means the surface is NOT inaccessible — it's incomplete to the AA bar.

**Fix:** Either (a) emit a `<track kind="captions" srclang="en" label="English captions" src={captionsUrl}>` when the source app provides a captions URL, OR (b) document this as a known gap and require source apps to ship captions in their gateway-push payload. **Recommendation: extend the verdict schema with `captionsUrl?: string` (mirrors `preRenderedVideoUrl`), and render the `<track>` when present. Until source apps populate it, the transcript carries the content.**

---

### H3 — `text-aurum` on `bg-aurum/20` contrast risk (APCA likely fail)

**Files:**
- `src/components/cristiano/CristianoDashboard.tsx:124` (selected tab state)
- `src/components/cristiano/AskCristiano.tsx:212` (selected kind tab)

**Standard:** APCA Lc ≥ 60 for body text (recommended ≥ 75 for small text per the 2026 design system).

**Current code (dashboard tab selected):**
```tsx
className={`min-h-[44px] flex-1 sm:flex-none rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-aurum/60 ${
  isActive
    ? "bg-aurum/20 text-aurum border border-aurum/40"
    : "text-fog/70 hover:text-fog hover:bg-fog/5 border border-transparent"
}`}
```

**Issue:** Aurum is the brass-gold brand token (~`#C4A96A` per `01_UI_DESIGN_SYSTEM.md`). Aurum-on-aurum/20 puts the SAME hue at full opacity on top of itself at 20% opacity. The luminance differential is small — APCA Lc is likely 30–50, well below the 60-floor for body text.

**Why my prior "sweep" didn't catch it:** I trusted the design system tokens without measuring. The 2026 bar says "APCA-tuned" — that's a measurement, not a vibe.

**Fix:** Either (a) selected tab uses `text-onyx` on `bg-aurum` (high contrast), OR (b) keep `text-aurum` but use a much darker background (`bg-onyx`, with a thicker aurum border for state). **Recommendation: `bg-aurum text-onyx` for the selected state to maximise APCA contrast.**

Needs actual measurement against the rendered LCH values from the design system to confirm. **Until measured, mark this HIGH and either remediate or downgrade after testing.**

---

## § 3 · MEDIUM-severity findings

### M1 — Kind-picker tabs missing `aria-controls` linkage

**File:** `src/components/cristiano/AskCristiano.tsx:197-221`
**Standard:** WAI-ARIA Authoring Practices for tablist pattern + WCAG 1.3.1 (Info and Relationships).

**Issue:** The kind picker uses `role="tablist"` + `role="tab"` + `aria-selected`, but each tab has no `aria-controls` pointing to its corresponding form panel below. Screen reader users hear "tab, X of 3" but can't navigate to "the panel this tab controls."

**Compare:** `CristianoDashboard.tsx:120` correctly has `aria-controls={`cristiano-panel-${tab}`}` and the panel at L147 has the matching `id`.

**Fix:** Add `id={`ask-cristiano-kind-${k}`}` to each tab and `aria-controls={`ask-cristiano-form-${kind}`}`; add `id` + `role="tabpanel"` + `aria-labelledby` to the form below.

---

### M2 — Form missing `role="tabpanel"` when kind tablist is rendered

**File:** `src/components/cristiano/AskCristiano.tsx:225-229`
**Standard:** WAI-ARIA tablist pattern.

**Current code:**
```tsx
<form
  onSubmit={handleSubmit}
  className="space-y-4 rounded-lg border border-fog/10 bg-onyx/40 p-4"
  data-testid="ask-cristiano-form"
>
```

**Issue:** The form serves as the tabpanel for the active kind tab, but lacks the role. Paired with M1.

**Fix:** Add `role="tabpanel"` + `id` + `aria-labelledby="ask-cristiano-kind-${kind}"` to the `<form>`.

---

### M3 — Small `text-fog/60` below APCA Lc threshold for small text

**Files:**
- `src/components/cristiano/CristianoDashboard.tsx:138` (tab description, 12px)
- `src/components/cristiano/CristianoVerdictPlayer.tsx:153` (kind tag, 10px)
- `src/components/cristiano/VerdictLibrary.tsx:265` (verdict row metadata, 10px)

**Standard:** APCA Lc ≥ 75 for body text at small sizes (per `01_UI_DESIGN_SYSTEM.md` § color contrast).

**Issue:** `text-fog/60` is fog at 60% opacity on dark backgrounds. APCA needs HIGHER Lc as font size shrinks; at 10-12px the bar is Lc 75. Pure fog at 100% probably hits Lc 90+ — but at /60 opacity the effective Lc drops to ~50-60, below threshold.

**Fix:** Increase opacity to /80 for small text, OR use the design system's dedicated `--muted-emphasis` token (if one exists; if not, add it).

---

### M4 — Filter selects: aria-label overrides visible "Kind:" / "Source:" label (WCAG 2.5.3)

**Files:**
- `src/components/cristiano/VerdictLibrary.tsx:163-184` (kind filter)
- `src/components/cristiano/VerdictLibrary.tsx:187-209` (source filter)

**Standard:** WCAG 2.5.3 (Label in Name) Level A. The accessible name should match (start with or contain) the visible label.

**Current code:**
```tsx
<label className="flex items-center gap-2 text-xs text-fog/70">
  <span>Kind:</span>
  <select
    ...
    aria-label="Filter verdicts by kind"
  >
```

**Issue:** Visible label says "Kind:" but `aria-label="Filter verdicts by kind"` REPLACES it for the accessible name. Speech-input users saying "click Kind" may fail to activate the control because the accessible name is the longer aria-label string. Also screen reader announces "Filter verdicts by kind" — useful, but inconsistent with visible label.

**Fix:** Remove `aria-label`. The implicit `<label>` wrap already provides "Kind:" as the accessible name. If a longer description is wanted, use `aria-describedby`.

---

### M5 — Submitting state has no `aria-busy` or live-region announcement

**File:** `src/components/cristiano/AskCristiano.tsx:386-397`
**Standard:** WCAG 4.1.3 (Status Messages) Level AA.

**Issue:** When user clicks "Render verdict", the button text changes to "Cristiano is rendering..." and goes disabled. Screen reader users hear nothing — they don't know the form is processing. Could take 60+ seconds (Opus call).

**Fix:** Add `aria-busy={submitState.phase === "submitting"}` on the `<form>` (or the parent section), AND add a visually-hidden `aria-live="polite"` region that announces "Cristiano is rendering your verdict" on state transition.

---

### M6 — No live region for new gateway verdicts arriving

**File:** `src/components/cristiano/GatewayInbox.tsx:107-153`
**Standard:** WCAG 4.1.3 (Status Messages) Level AA.

**Issue:** Polling detects new verdicts every 30s and the `newCount` state increments. A "{N} new — refresh" button appears. Screen-reader users see/hear nothing about the new arrival — they only encounter the count if they navigate to that part of the page.

**Fix:** Wrap the refresh-button region in `<div aria-live="polite" aria-atomic="true">`, OR add a separate visually-hidden `<span aria-live="polite">` that announces "{N} new verdicts pushed in" when count changes.

---

## § 4 · LOW-severity findings

### L1 — Implicit label-wrap pattern (multiple textarea/input fields)

**Files:** All form fields in `src/components/cristiano/AskCristiano.tsx` (textarea L236, L250, L262; input L278, L292, L317, L347; select L330, L359; textarea L374).

**Issue:** Pattern is `<label><span>X</span><textarea ... /></label>` — implicit association. Works in modern screen readers, but explicit `htmlFor`+`id` is more reliable across older AT and speech input.

**Fix:** Add `id` to each input + `htmlFor` to the label. Minimal churn.

---

### L2 — Missing `maxLength` HTML attribute on question textarea

**File:** `src/components/cristiano/AskCristiano.tsx:236-244`

**Issue:** JS validates 8-2000 char range but no `maxLength={2000}` on the textarea. User can type past the limit then fail validation on submit.

**Fix:** Add `maxLength={2000}` and `minLength={8}` to the textarea. Similar for context (8000 max), criteria items (280 each).

---

### L3 — `title` attribute on Video/Live pills won't surface on mobile

**Files:** `src/components/cristiano/VerdictLibrary.tsx:273, 280`

**Issue:** Hover tooltip via `title="..."` doesn't show on touch devices and isn't consistently announced by screen readers.

**Fix:** Replace with `<span className="sr-only">` describing the badge, OR remove the title and rely on the visible text "Video"/"Live" only (the visible text is already descriptive).

---

### L4 — Missing `role="region"` + `aria-labelledby` on verdict player root

**File:** `src/components/cristiano/CristianoVerdictPlayer.tsx:137-143`

**Issue:** The player is a meaningful landmark but has no role. Landmark navigation (rotor on iOS / D key on Windows) won't surface it.

**Fix:** Add `role="region"` + `aria-labelledby={`verdict-title-${verdict.id}`}` and add the matching `id` to the h3.

---

### L5 — `<summary>` lacks explicit `focus-visible` styling

**File:** `src/components/cristiano/CristianoVerdictPlayer.tsx:232`

**Issue:** Browser default focus ring on `<summary>` varies by browser. The rest of the surface uses explicit `focus-visible:ring-2 focus-visible:ring-aurum/...` for consistency.

**Fix:** Add `focus:outline-none focus-visible:ring-2 focus-visible:ring-aurum/50 rounded` to the summary className.

---

### L6 — Visible "required" marker missing on some required fields

**Files:**
- `src/components/cristiano/AskCristiano.tsx:283` (city1 label)
- `src/components/cristiano/AskCristiano.tsx:297` (city2 label)
- `src/components/cristiano/AskCristiano.tsx:322` (companyName label)
- `src/components/cristiano/AskCristiano.tsx:380` (productSummary label)

**Issue:** Inputs have `aria-required="true"` so screen readers announce it, but visible labels don't show a "required" indicator. Sighted users discover required-ness only on submit failure.

**Fix:** Add "(required)" to the visible `<span>` label OR use a visual asterisk + visually-hidden text "required".

---

### L7 — `text-fog/70` borderline APCA for body text (multiple)

**Files:** `CristianoDashboard.tsx:98`, `AskCristiano.tsx:190`, `VerdictLibrary.tsx:154`, `GatewayInbox.tsx:116`, plus several `text-xs text-fog/70` paragraphs.

**Issue:** /70 opacity may put Lc around 60-65, borderline for AA body text. AAA bar is Lc 75+.

**Fix:** Measure actual rendered LCH against onyx; bump to /80 if measured Lc < 60.

---

### L8 — No keyboard arrow-key navigation between tab buttons

**Files:**
- `src/components/cristiano/CristianoDashboard.tsx:107-133` (dashboard tabs)
- `src/components/cristiano/AskCristiano.tsx:197-221` (kind picker tabs)

**Issue:** Both tablists support Tab key to move INTO the list, but ARIA Authoring Practices RECOMMEND Left/Right arrow keys to move BETWEEN tabs, plus Home/End to jump to first/last. Currently arrow keys move focus OUT of the list to the next focusable element on the page.

**Not a strict WCAG violation** — just a UX inconsistency with platform tab conventions. Native tab implementations on every major OS use arrow keys.

**Fix:** Add `onKeyDown` handler intercepting ArrowLeft/ArrowRight/Home/End and moving focus + active tab accordingly.

---

## § 5 · Remediation Plan

Following the 2026-05-23 audit precedent (`docs/04_ACCESSIBILITY_AUDIT_2026-05-23.md`), remediation phases by severity:

### Phase 1 — HIGH (3 findings)
**Single commit.** Touch-target fix (H1), captions schema extension (H2), APCA contrast remediation (H3).

### Phase 2 — MEDIUM (6 findings)
**Single commit.** Tablist linkage (M1+M2), small-text contrast (M3), filter label conflict (M4), submitting status (M5), live region for inbox (M6).

### Phase 3 — LOW (8 findings)
**Single commit.** Label patterns (L1), maxLength (L2), pill labels (L3), region landmark (L4), summary focus (L5), required markers (L6), body text contrast (L7), keyboard arrow nav (L8).

### Regression guard
The existing source-scan guard at `src/lib/evaluation/a11y-source-guard.test.ts` covers `outline:"none"`, `transition:all`, and `<div role="button">` — all clean in the Cristiano surfaces. No new guard patterns are needed; these audit findings are not regex-detectable (they require semantic / contextual judgement).

---

## § 6 · What this audit did NOT check

In the spirit of "line by line no lies", the following are explicitly **out of scope** for this audit pass — either because the surface is out of scope or because the check requires runtime measurement I can't do from this session:

1. **Live APCA measurement against rendered pixels.** I noted contrast risks based on token names + opacity; the actual Lc values require browser rendering against the production CSS variables. The HIGH and MEDIUM contrast findings (H3, M3, L7) flag candidates; remediation should be informed by measurement.
2. **`OliviaVideoAvatar.tsx` internals.** That component is mounted by `CristianoVerdictPlayer` but its 684 lines weren't re-audited here — covered separately when it was last touched.
3. **`useSearchParams` / Next.js routing behaviour** on `/cristiano?tab=...` — code-level audit only; production routing behaviour wasn't tested.
4. **Browser test in actual screen readers** (VoiceOver, NVDA, JAWS). I asserted ARIA contracts; live SR testing is an operator action.
5. **End-to-end keyboard walk** through the dashboard. The audit asserts focus-visible styles exist; whether tab order is logical end-to-end requires manual browser testing.

These gaps are flagged HONESTLY rather than glossed over.

---

## § 7 · Attestation

Held to Apple / Microsoft / Google 2026 leading coding practices per `~/CLAUDE.md` and `docs/api-specs/_MASTER_REGISTER.md §10.4`. This audit is a deliverable, not a fix — Phase 1 / 2 / 3 commits follow.

100% no breaking changes (audit is documentation, no code changes) and 100% no partial coding (every finding cite-able to file:line; no hand-waving).
