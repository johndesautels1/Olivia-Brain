# Studio Olivia / Grand Master Olivia — Design North Star

**Source prototype:** `D:\Studio-Olivia\StudioOliviaGrandMaster (2).jsx` (95 KB single-file React, ~104 logical lines but JSX trees collapsed onto single lines).
**Self-described version:** "STUDIO OLIVIA v3.2 — GRAND MASTER BUILD — CLUES London · clueslondon.com".
**Purpose:** Visual & interaction north star for unifying Olivia (AI assistant) with Studio (pitch deck / business plan / document workspace) into a single dark-themed founder workbench. This doc captures everything needed to rebuild the UI from scratch with stub data.

---

## 1. Top-Level Layout

A full-viewport (`100vh`) flexbox application with **three vertical regions**:

```
┌─────────────────────────────────── HEADER (56px) ───────────────────────────────────┐
│ AvatarOrb · STUDIO OLIVIA · [crumb: section › current]   Score chips · Match · Export│
├──────────────┬──────────────────────────────────────────────┬──────────────────────┤
│              │                                              │                      │
│ LEFT ASIDE   │              CENTER MAIN                     │   RIGHT ASIDE        │
│ (264px)      │              (flex:1)                        │   (320px)            │
│              │                                              │                      │
│ Project name │  Mode toggle bar (Guided / Freeform)         │  Tab strip:          │
│ Persona pick │  ─────────────────────────────────────────   │  Olivia · Library ·  │
│ Deck config  │                                              │  Preview · Themes ·  │
│ Avatar pad   │  Section content — one of:                   │  Audit               │
│ Section nav  │  · Preparation Studio (slides editor)        │                      │
│ Doc tree     │  · Business Plan engine (section editor)     │  Tab body fills      │
│ Frameworks   │  · Documents (per-doc editor)                │  remaining height    │
│  /Plan secs  │  · General (free draft)                      │                      │
│              │                                              │                      │
└──────────────┴──────────────────────────────────────────────┴──────────────────────┘
```

- Header is sticky at top, dark (`C.surface = #0A0F1C`), 56px tall, holds branding + crumbs + score chips + Match/Export buttons.
- Left aside is 264px fixed width; right aside is 320px fixed width; both have their own borders and internal scrolling.
- Center main is `flex: 1`, has its own toolbar (mode switcher) at the top and a scrolling content region below.
- A modal layer (`DeckDetailModal`) overlays everything at `z-index: 200` with `backdrop-filter: blur(10px)` when an archetype is opened from the Library.

---

## 2. Components & Sections (visual inventory)

### 2.1 Reusable primitives

| Component | Props | Role |
|---|---|---|
| `ConsensusDots` | `n` (0–5) | Five 6px dots, filled in accent orange up to `n`. ARIA `role="img"`. |
| `Badge` | `value` (0–100), `size` ("sm"\|"lg") | Color-tiered percent pill: green ≥80, yellow ≥50, red >0, dim 0. |
| `CompletionRing` | `pct`, `size` (default 20) | SVG circular progress ring; same color tiers as Badge. |
| `AvatarOrb` | `connected`, `size` (default 36), `onClick` | Round button with linear-gradient `accent → purple → #FB7185`, capital "O" centered, glow when connected, status dot bottom-right. |
| `DeckDetailModal` | `deck`, `onClose`, `onApply` | Modal shown on archetype click; renders category chip, stage, ConsensusDots, score, name, tag, optional `Raised`/`year`/`slideCount` chips, Insight, Fit, Match Reasons, Olivia Action, big "Apply This Archetype" gradient CTA. |

### 2.2 Header

- Left: `AvatarOrb` (34px, toggles `avatarConnected`) + `STUDIO OLIVIA` wordmark in Syne 800.
- Center: breadcrumb `<section name in accent>` › `<current slide type or plan section title>`.
- Right (only when `navSection==="pitch"`): four score chips `CLR / IMP / MOT / ALL` with mono-numeric values. Then `Match` (calls `askOliviaToMatch`) and `Export` (stub).

### 2.3 Left aside (top → bottom)

1. **Project name** — inline-editable text (click to enable input, Enter or blur to save) with subtitle "London Tech Ecosystem".
2. **Investor Persona** — wrap of 5 buttons: Angel, Seed VC, Series A, Strategic, Buyout/PE; each has its own `color`. Selected pill colored, others muted. Subtext shows persona description.
3. **Deck Config** — 2×2 grid of `<select>`: Stage, Industry, Goal, Tone. Drives `scoreDecks`/`scoreTemplates` and the Library scoring overlay.
4. **Avatar pad** — dashed bordered card with mini AvatarOrb + "OLIVIA LIVE" / "CLICK TO CONNECT" status.
5. **Section nav** — four buttons: Pitch Decks (count = slides), Business Plans (count = `PLAN_SECTIONS.length`), Documents (count = `totalDocs`), General. Active button gets accent tint and accent border.
6. **Documents tree** — only when `navSection==="documents"`: 10 collapsible categories (`DOC_CATEGORIES`), each with chevron + emoji + title + count, expanding to nested doc rows with `CompletionRing` + name. Click sets `activeDoc = {section, category, doc}`.
7. **Frameworks panel** — only when `navSection==="pitch"`: scrollable list of 14 `FRAMEWORKS`, each toggleable via `activeFrameworks` Set; on shows a colored dot + confidence number.
8. **Plan section nav** — only when `navSection==="plan"`: list of 16 `PLAN_SECTIONS` with icon + title + Badge (confidence).

### 2.4 Center main

- **Toolbar:** segmented control "Guided / Freeform" (sets `editorMode`); right-side hint `⌨ J/K navigate · Esc close`.
- **Pitch view (`navSection==="pitch"`):**
  - Title "Preparation Studio" in Syne 800 28px.
  - Header right: `+ Slide`, `✦ Analyze`, `⚡ Optimize All` buttons.
  - List of slide cards. Each card: number badge, slide-type icon (from `SLIDE_META`), type label in mono, framework chips, confidence Badge, ✕ remove (when selected).
  - Selected card expands inline to show either a list of fields (multi-field types) or a single big textarea (single-field types). Plus a purple feedback seed callout (`FEEDBACK_SEEDS`).
  - Below: horizontal scrollable strip of all slide-type pills (mini-thumbnail navigation).
- **Plan view (`navSection==="plan"`):**
  - Big section icon + "Business Plan Engine" eyebrow + section title + persona/theme subtext + large Badge (right).
  - `<select>` to jump between sections.
  - 300-min-height textarea bound to `currentPlan.content`.
  - Two CTAs: "Ask Olivia to Draft" (gradient, calls `askOliviaToDraft(activePlanIdx)`) and "Analyze".
  - Prev / Next buttons (Guided mode only).
- **Documents view:** if `activeDoc.doc` set, shows CompletionRing + doc title + category, a 200-min-height textarea, an "Evidence Chain" placeholder card, and "Ask Olivia to Draft" + "Next →" CTAs. Otherwise an empty state ("Select a document from the left panel").
- **General view:** big freeform textarea + "Quick Actions" — the 8 `CHAT_ACTIONS` rendered as chip buttons that pre-fill `chatInput` and switch the right tab to Olivia.

### 2.5 Right aside (tabbed)

Five tabs (`olivia | library | preview | themes | audit`). Tab strip uses ARIA `role="tablist"` with arrow-key nav (`handleTabKeyDown`).

**Olivia tab (default):**
- Header row: AvatarOrb 24px + "OLIVIA" (Syne purple) + tagline "Real-time intelligence" with green timestamp when `lastAnalysisTime` set.
- Analyzing state: pulsing skeleton bars (90 / 70 / 85 / 60 % widths).
- Insight state: cards for Confidence (gradient progress bar + mono number), Insight (purple), Suggestion (orange), Warning (red, optional), London Ecosystem Fit (UK-red, optional), `frameworks_used` chip row.
- Empty state: large faded ✦ + "Click Analyze for Olivia's intelligence".
- **Chat zone (always under insight)** — "Olivia Chat" label, 4 quick-action chips (subset of `CHAT_ACTIONS`), message list (Olivia bubbles dark, user bubbles accent-tinted, both with `whiteSpace: pre-wrap`), spinning Orb + "Olivia is thinking..." while typing, scroll-pinned `chatEndRef`.
- Composer: text `<input>` + arrow `→` send button. Enter key sends. Disabled while `isTyping`.

**Library tab:** search input → Decks/Plans toggle (counts) → relevance line ("X archetypes · Stage/Industry relevance") → list of cards. Each card: 3px left bar in category color, name, category pill, stage, ConsensusDots, optional `raised` (green), 2-line clamped insight, big mono score number on the right. Click → `setSelectedDeck(d)` opens `DeckDetailModal`.

**Preview tab:** light-themed pane (`#FAFBFC` background, `#111827` text — the only place the design inverts). Top brand bar with theme name + project name + persona/region. Body shows current plan section content or current slide content; placeholder italic gray when empty.

**Themes tab:** five theme cards from `THEMES` (Canary-Sapphire, Gherkin-Polished, Barbican-Raw, Battersea-Resilient, Shard-Ambitious). Each: 36px gradient swatch + icon (✦/◆/▲/●/★) + name + description.

**Audit tab:** "Reset Workspace" red button (with `window.confirm`) → list of audit entries (timestamp + text) sourced from `auditLog`.

---

## 3. State & Data Shapes

All state lives in the single `StudioOlivia()` component via `useState`/`useRef`/`useMemo`.

```ts
// User identity / project
projectName: string
editingName: boolean
persona: "Angel"|"SeedVC"|"SeriesA"|"Strategic"|"Buyout"
outputTheme: keyof typeof THEMES
avatarConnected: boolean

// Navigation
navSection: "pitch"|"plan"|"documents"|"general"
expandedCats: Set<string>             // doc categories expanded in left tree
activeDoc: { section: string; category: string|null; doc: string|null }
selectedSlide: number                 // slide id
activePlanIdx: number                 // index into planSections
activeFrameworks: Set<number>         // FRAMEWORKS ids
rightTab: "olivia"|"library"|"preview"|"themes"|"audit"
libTab: "decks"|"templates"
libSearch: string
selectedDeck: Deck|null               // for modal
editorMode: "guided"|"freeform"

// Content
slides: Array<{
  id: number
  type: "HOOK"|"PROBLEM"|"SOLUTION"|"TRACTION"|"ASK"|"COVER"|"MARKET"|"MOAT"
       |"TEAM"|"PRODUCT"|"ROADMAP"|"REGULATORY"|"ECOSYSTEM"|"WHY_NOW"
       |"COMPETITION"|"DEMO"
  text: string                        // freeform body
  fields: Record<string,string>       // guided field values keyed by SLIDE_FIELDS[type][i].key
  fw: string[]                        // applied archetypes / frameworks
  confidence: number                  // 0..100
}>
planSections: Array<{
  key: string; title: string; icon: string;
  content: string; confidence: number
}>                                    // initialised from PLAN_SECTIONS (16 items)
deckConfig: { goal: string; stage: string; industry: string; tone: string }

// Olivia chat / analysis
chatMessages: Array<{ role: "user"|"olivia"; text: string }>
chatInput: string
isTyping: boolean
isAnalyzing: boolean
oliviaInsight: {
  insight: string
  suggestion: string
  warning: string|null
  confidence: number
  london_fit: string
  frameworks_used: string[]
} | null
lastAnalysisTime: string|null         // localised time string
isOptimizing: boolean

// Audit + completion
auditLog: Array<{ time: string; text: string }>   // capped at 50, newest first
docCompletions: Record<`${categoryKey}:${docName}`, number>   // % per doc

// Refs
chatEndRef: HTMLDivElement
slideIdCounter: number (starts at 1000)
analysisAbortRef: AbortController|null
chatAbortRef: AbortController|null
draftAbortRef: AbortController|null
modalOpenerRef: HTMLElement|null      // for focus restore
saveTimer: number                     // debounce for autosave
hasLoadedRef: boolean                 // one-shot load guard
```

### Computed (`useMemo`)
- `deckScores` → `{ clarity, impact, moat, score }`. Pure function of `slides` + `activeFrameworks`.
- `totalDocs` → sum of all doc names across `DOC_CATEGORIES` (≈ 65).
- `libFilter` → `{ cat: "", stage: "", search: libSearch }`.
- `filteredDecks` → `applyLibraryFilter(DECKS, libFilter)` re-scored via `scoreDecks(deckConfig.stage, catMap[industry], slides.length>5?2:0, {london:true, ai:industry==="AI"})`.
- `filteredTemplates` → same pattern with `BIZ_TEMPLATES` and `scoreTemplates`.

### Static reference tables (top of file)

| Const | Shape | Notes |
|---|---|---|
| `C` | flat color object (~25 keys) | bg, surface, raised, border, accent (#FF8C00), sapphire, green, red, purple, cyan, text, muted, dim, faint, plus translucent variants ending in `Dim`. |
| `THEMES` | 5 entries | each `{accent, primary, surface, icon, desc}`. |
| `PERSONAS` | 5 entries | each `{key, label, color, desc}`. |
| `SLIDE_META` | 16 entries | each `{icon, color}` keyed by slide type. |
| `SLIDE_FIELDS` | 16 entries | each is `Array<{key, label, placeholder}>` driving the guided editor. |
| `FEEDBACK_SEEDS` | partial map of slide-type → string | shown as purple seed below the editor. |
| `DOC_CATEGORIES` | 10 entries | each `{key, title, icon, docs: string[]}`. |
| `PLAN_SECTIONS` | 16 entries | each `{key, title, icon}`. |
| `FRAMEWORKS` | 14 entries | each `{id, name, tag, cat, conf, color}`. |
| `CAT_LIB` | 9 entries | category visual lookup `{bg, text, label}`. |
| `DECKS` | 75 entries | `{id, name, tag, cat, stage:string[], consensus, insight, fit, olivia_action, raised?, year?, slideCount?}`. |
| `BIZ_TEMPLATES` | 12 entries | same shape as DECKS but with `sections` count instead of `slideCount`. |

### Pure helpers
- `scoreDecks(stage, cat, traction, prefs) → DECKS[] with {score, reasons[]}` — additive scoring (Stage match +30, Category match +22, +consensus·7, traction bonuses, London prefs +20, AI prefs +15, has olivia_action +4).
- `scoreTemplates(stage, cat, prefs)` — analogous for templates.
- `applyLibraryFilter(items, filter)` — filters by `{cat, stage, search}`.
- `handleTabKeyDown(e, keys, cur, set)` — arrow/Home/End rover keyboard pattern.
- `extractApiText(data)` — pulls all `content[].text` blocks from Anthropic API response and joins them.
- `safeParseJson(raw)` — strips ```json fences and parses; throws with descriptive error.
- `buildPrompt(sections)` — wraps `[{label,value}]` into `<label>…</label>` blocks.

---

## 4. User Interactions

| Surface | Action | Effect |
|---|---|---|
| Project name | click → input → Enter/blur | renames project, persists. |
| Persona pills | click | sets `persona`, audit log entry. |
| Deck config selects | change | mutates `deckConfig`, re-scores library. |
| AvatarOrb (header / aside / right tab) | click | toggles `avatarConnected`. |
| Section nav | click | switches `navSection`. |
| Doc category | click | toggles in `expandedCats`. |
| Doc name | click | sets `activeDoc`. |
| Framework row | click | toggles in `activeFrameworks`. |
| Plan section row | click | sets `activePlanIdx`. |
| Slide card | click | selects; expands editor inline. |
| Slide field textareas | change | updates `slides[i].fields` or `.text`. |
| `+ Slide` | click | adds next missing essential or optional slide type, focuses it. |
| `×` on selected slide | click | removes slide. |
| `✦ Analyze` | click | calls `runAnalysis(currentSlide.text, "pitch deck slide: "+type)`. |
| `⚡ Optimize All` | click | sequentially `fetch`-rewrites every slide via Anthropic; updates `slides[i].text` and `confidence`. |
| Plan textarea | type | writes `planSections[i].content`. |
| `Ask Olivia to Draft` (plan) | click | `askOliviaToDraft(activePlanIdx)` — Anthropic call with `web_search_20250305` tool, fills section content + confidence + chat note. |
| `Analyze` (plan) | click | runs `runAnalysis` on plan content. |
| Prev / Next (plan) | click | walks `activePlanIdx`. |
| Doc editor textarea | type | local only (state never collected back). |
| `Ask Olivia to Draft` (doc) | click | currently only logs audit entry — stub. |
| `Next →` (doc) | click | only logs audit — stub. |
| General textarea & quick actions | type / click | populate `chatInput`, switch right tab to Olivia. |
| Olivia chat input | Enter or → | `sendChat()` — Anthropic streaming call; also sniffs message for "plan"/"deck"/"document" keywords and switches `navSection`. |
| Olivia quick-action chips | click | pre-fill `chatInput`. |
| Library search | type | refines `filteredDecks` / `filteredTemplates`. |
| Library tab toggle | click | switches `libTab`. |
| Library card | click | opens `DeckDetailModal`. |
| Modal "Apply This Archetype" | click | `applyArchetype(item)` — generates fresh `slides[]` of length `slideCount || sections || 5` from a fixed type sequence; appends Olivia chat message; switches to Pitch view. |
| Match button (header) | click | `askOliviaToMatch()` — pure-local scoring; posts top 3 decks + top 2 templates as Olivia chat message. |
| Export button (header) | click | logs audit only — stub. |
| Theme card | click | sets `outputTheme`. |
| Audit "Reset Workspace" | click → `window.confirm` | clears `window.storage`, resets all top-level state to defaults. |
| Modal background | click | closes modal. |
| Esc key (when modal open) | press | closes modal (effect-bound). |
| Tab key (when modal open) | press | focus-trap cycles through focusable children. |
| `J` / `K` keys (global, when not in input) | press | next/prev slide (pitch) or next/prev section (plan). |
| Library tab strip | arrow keys | rover via `handleTabKeyDown`. |

---

## 5. Backend Assumptions / API Calls

Every network call is a raw `fetch("https://api.anthropic.com/v1/messages", …)` POST with the model `claude-sonnet-4-6` and (where useful) the tool `{ type: "web_search_20250305", name: "web_search" }`.

> The prototype calls Anthropic **directly from the browser with no API key header** — the `Authorization: x-api-key` header is missing entirely. This is *imaginary wiring*; in a production rebuild you must proxy through your own server route.

| Call site | Endpoint | Body essentials | Expected response | Status |
|---|---|---|---|---|
| `autoOptimizeAll` (loops over slides) | `POST /v1/messages` | system: optimize for persona + London; user: "Optimize this `<TYPE>` slide …". `max_tokens: 1000`. | JSON `{text, confidence, change_note}` extracted via `safeParseJson(extractApiText(...))`. | **Imaginary** — no auth header, would CORS-fail in browser. |
| `askOliviaToDraft(i)` | `POST /v1/messages` | system: draft business plan section, web_search enabled. `max_tokens: 1500`. | JSON `{content, confidence, notes}`. | **Imaginary** — same. |
| `sendChat()` | `POST /v1/messages` | system: Olivia persona, project ctx, web_search enabled. `max_tokens: 1500`. | Free-form text; the entire content array is concatenated. | **Imaginary**. |
| `runAnalysis(content, context)` | `POST /v1/messages` | system: analyze for persona, web_search enabled. `max_tokens: 1000`. | JSON `{insight, suggestion, warning, confidence, london_fit, frameworks_used[]}`. | **Imaginary**. |

### Persistence
- `await window.storage.get("studio-olivia-v3")` and `await window.storage.set(...)` on a 1.5s debounce. **Stub** — `window.storage` is not a real browser API; this is a Claude artifact runtime affordance. Real rebuild should map to `localStorage` (sync) or `IndexedDB` (async) or a `/api/workspace` POST.
- `window.storage.delete("studio-olivia-v3")` from the Reset button.

### No other calls
- Export button: stub (`addAudit("Export (stub)")`).
- Document "Ask Olivia to Draft": stub.
- Document "Next →": stub.

---

## 6. Styling Approach

- **All inline-style.** Zero Tailwind, zero CSS-in-JS library, zero CSS modules. Every node uses `style={{…}}`.
- One global `<style>` block (line 70) imports four Google fonts and defines `*{box-sizing:border-box}`, slim 4px scrollbars, focus-visible rings (2px outline `C.accent` with 2px offset), `.sr-only`, and two keyframes `pulse` / `spin`.
- **Color tokens** live in the `C` object. Every element references `C.bg`, `C.surface`, `C.raised`, `C.border`, `C.accent`, `C.text`, `C.muted`, `C.dim`, `C.faint`, etc. Translucent variants are appended hex alpha (e.g. `C.accent + "30"`).
- **Typography:** `'DM Sans', sans-serif` body; `'Syne', sans-serif` for display headings (700–800 weight, letter-spacing −0.02em); `'JetBrains Mono'` for numbers, eyebrows, score chips; `'DM Serif Display'` imported but not heavily used.
- **Theme palette:** dark by default. Brand accent is `#FF8C00` (orange). Secondary brand: sapphire `#0B3D91`/`#1A5FBB`. Accents: green `#4ADE80`, red `#EF4444`, purple `#A78BFA`, cyan `#00F0FF`, plus pink `#FB7185` used in the orb gradient.
- **Border radii:** 5–6 for chips, 7–8 for inputs/buttons, 10 for cards/textareas, 16 for modal panel, 20 for "card" preset, 50% for orbs/dots.
- **Score tier colors** (used in `Badge`, `CompletionRing`): green ≥80, yellow `#FBBF24` ≥50, red >0, dim 0.

The `sty` object inside the component centralises four reusable inline-style atoms: `sty.input`, `sty.card`, `sty.label`, `sty.btn(active, color)`.

---

## 7. External Libraries / Imports

Only one import statement (line 1):

```js
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
```

No charting library, no framer-motion, no Tailwind, no shadcn, no heroicons. Animations are pure CSS keyframes (`pulse`, `spin`). Icons are Unicode glyphs (✦, ◆, ▲, ●, ★, ⌖, △, ◇, ↑, ⬡, ○, ◉, ◫, ▣, →, ⊞, ⊛, ⏱, ⚔, ▶) and emoji (📊, ⚖️, 🔬, 🌍, 👥, ⚙️, 📈, 🤝, 🔍, 🎯, etc).

Web fonts (loaded via `<style>@import`): DM Sans, DM Serif Display, Syne, JetBrains Mono.

External URL targeted: `https://api.anthropic.com/v1/messages` (CORS-blocked in real browser without a proxy).

Runtime affordances assumed: `window.storage.{get,set,delete}` (Anthropic artifact sandbox), `window.confirm`.

---

## 8. Notable Design Choices

1. **Single-orb identity.** The `AvatarOrb` (orange→purple→pink linear gradient with green status dot) appears in three places (header, sidebar pad, Olivia tab) — it is the visual anchor of the Olivia/Studio merge. Glow strengthens when `avatarConnected`.
2. **Score chips as live HUD.** Header surfaces four mono-numeric score chips (`CLR / IMP / MOT / ALL`) recomputed from slide content + active frameworks every render — gives founders an at-a-glance pitch quality metric.
3. **Persona-driven AI prompts.** Every Anthropic call interpolates `personaObj.label` ("Angel" vs "Series A" vs …) into the system prompt — same chat composer behaves differently per persona.
4. **Library scoring with reasons.** Every archetype card carries a numeric score (e.g. `52pt`) and an array of human-readable match reasons ("Stage match", "London priority", "AI-native") that surface in the modal.
5. **Apply-archetype = regenerate slides.** Clicking "Apply" on any of 75 archetypes wipes the slide list and rebuilds it with the archetype's `slideCount` (or `sections` for templates), seeding each slide's `fw` array with the archetype name.
6. **Two-mode editor.** Guided mode renders `SLIDE_FIELDS[type]` as labeled mini-textareas; Freeform mode collapses to a single block of text. Switchable mid-edit.
7. **Inline preview tab.** The right Preview tab inverts to a light theme (`#FAFBFC` / `#111827`) — the only place in the app where dark gives way — so founders see a print-ready paper-style render of the current section.
8. **Keyboard-first.** Global `J`/`K` for slide/section navigation, arrow-key tab rover, Esc closes modal, focus-trap on modal Tab cycling, focus-restore via `modalOpenerRef`. Hint shown in the toolbar: `⌨ J/K navigate · Esc close`.
9. **Audit trail as a first-class citizen.** Almost every state change pushes a `{time,text}` entry; the right Audit tab is where the user replays their entire session.
10. **Debounced autosave + one-shot restore.** 1.5s debounce on all top-level state via `window.storage`; restore happens once on mount guarded by `hasLoadedRef`.
11. **Imaginary backend.** All four LLM calls are stubs — no auth header, raw browser fetch to Anthropic. The wiring shape is right (model, tools, JSON contract) but a rebuild must replace each with a server route.
12. **No images, no charts.** Everything is text + Unicode glyphs + colored divs + SVG rings. The aesthetic is intentionally typographic / Bloomberg-terminal, not slide-show.
13. **Consensus dots.** A 5-dot strip beside every archetype name encodes how many independent sources agree on the playbook — reinforces the "evidence-driven" narrative.
14. **Document tree + completion rings.** Left aside has 65 doc names across 10 categories, each prefixed with a `CompletionRing`; the per-doc UI itself is currently a thin stub but the tree communicates the eventual end-state.

---

## 9. Rebuild Recipe (one-paragraph)

To recreate this UI as Olivia Brain's homepage with stub data: copy the `C`, `THEMES`, `PERSONAS`, `SLIDE_META`, `SLIDE_FIELDS`, `FEEDBACK_SEEDS`, `DOC_CATEGORIES`, `PLAN_SECTIONS`, `FRAMEWORKS`, `CAT_LIB`, `DECKS`, `BIZ_TEMPLATES` constants verbatim into a new `src/data/studio.ts`. Re-create the five primitives (`ConsensusDots`, `Badge`, `CompletionRing`, `AvatarOrb`, `DeckDetailModal`) as `.tsx` components. Build the three-region shell (header / left aside / center main / right aside) using the inline-style approach unchanged. Pull `scoreDecks` / `scoreTemplates` / `applyLibraryFilter` / `handleTabKeyDown` / `extractApiText` / `safeParseJson` / `buildPrompt` into a helpers module. Replace the four `fetch(api.anthropic.com)` calls with our cascade providers (`src/lib/cascade/providers/anthropic.ts`); replace `window.storage.*` with `localStorage` (sync) or a Supabase row keyed on the user. Stub `Export` to a no-op for now. The whole prototype is ~3000 logical LOC of inline-styled JSX with very little hidden complexity — it is realistic to rebuild as a one-page experience in 1-2 sessions.
