# 01 · UI DESIGN SYSTEM — Olivia / CLUES universal design language

> **Read `00_PRODUCT_TRUTH.md` first.** This file is the design language for everything in `00_PRODUCT_TRUTH.md`'s product universe — clueslondon.com, cluesintelligence.com, cluesxscore.com, white-label Olivia, clues-property-search, Heart-Recovery-Calendar, and the future London transit app. Every product, every surface, every component obeys this system.
>
> **Audience for these UIs:** affluent, well-educated, mobile professionals with strong financial literacy. People who use Bloomberg Terminal, Stripe Dashboard, Linear, Vercel, and a private banker's app — and notice when something feels off. The aesthetic must read instantly as **Fortune-50 finance × upstart AI/software-developer-tech × global relocation intelligence**. Old-money gravitas in the typography and color palette. New-money precision and kinetic responsiveness in the interactions.
>
> **Aesthetic mandate:** what we ship looks like **nothing the world has shipped before** in design hierarchy, visibility, navigability, or ease of use. Not "Linear with a different accent color." Not "Vercel with a logo swap." We borrow primitives and rules from the best dark-mode systems in the industry — then we build something distinctly ours.
>
> **Inspiration vectors (rules we adopt, not visuals we copy):**
> - **fully.ai** — multi-agent product structure. The user always sees who's working on what.
> - **Linear** — dark UI hierarchy, accessibility primitives, command-palette navigation, J/K-first keyboarding.
> - **Vercel published guidelines** — accessible dark-mode coding rules: never pure black or pure white, color-scheme: dark, focus rings always visible, prefers-reduced-motion respected.
>
> **Accessibility floor:** WCAG 2.2 AA on every surface, every component, every state. No exceptions. If a component cannot meet AA, it ships disabled until it can.
>
> **Modular workspace mandate:** every Olivia surface is a **user-configurable workspace.** Drag-drop toolbars, drag-drop cards, drag-drop modals, resize anything (1×1 to full-width tiles), save named layout presets, sync across devices. The user owns their dashboard. The product ships with intelligent defaults; the user reshapes them.

---

## 1. Color system

### 1.1 Base canvas — dark by default

Pure black is harsh on OLED and creates banding on cheap monitors. We use a **near-black warm navy** so the palette reads as "deep ocean at night," not "void."

| Token | Hex | Use |
|-------|-----|-----|
| `--canvas-base` | `#050B15` | Page background. Deepest layer. |
| `--canvas-recess` | `#08111E` | Recessed surfaces (sidebars, footers, ticker rails). |
| `--surface-1` | `#0A1322` | Default panel. The first level of "raised content." |
| `--surface-2` | `#111B2E` | Secondary panel — modals, drawers, popover bodies. |
| `--surface-3` | `#162539` | Tertiary panel — nested cards, hover-elevated tiles. |
| `--surface-translucent` | `rgba(15, 23, 42, 0.78)` | Glass-morphism (with `backdrop-filter: blur(16px) saturate(1.4)`). For floating overlays. |

**Rule:** every surface a layer "above" the canvas is exactly one step lighter. Never skip levels — that destroys the spatial illusion.

### 1.2 Foreground — warm, never stark

Pure `#FFFFFF` against deep navy = harsh, prone to chromatic aberration on poor displays. We use a **warm off-white** drawn from old-finance stationery (the same source as the Bloomberg Terminal's cream).

| Token | Hex | Use |
|-------|-----|-----|
| `--fg-primary` | `#F1ECE0` | Headlines, primary text, important metrics. Warm off-white. |
| `--fg-secondary` | `#CBC9BD` | Body copy, descriptive text. |
| `--fg-tertiary` | `#8B897F` | Labels, captions, supporting metadata. |
| `--fg-disabled` | `#5A584F` | Disabled controls. |
| `--fg-on-accent` | `#0E0805` | Text on gold accent surfaces (e.g. primary button label). Near-black with a warm undertone. |

**Contrast verification (WCAG AA, all measured against `--canvas-base` `#050B15`):**

| Token | Ratio | Status |
|-------|-------|--------|
| `--fg-primary` `#F1ECE0` | 17.4 : 1 | AAA (≥ 7) |
| `--fg-secondary` `#CBC9BD` | 12.1 : 1 | AAA |
| `--fg-tertiary` `#8B897F` | 5.9 : 1 | AA (large text + UI) |
| `--fg-disabled` `#5A584F` | 2.7 : 1 | **only allowed on disabled controls** |

> **Rule:** `--fg-tertiary` is the floor for any non-disabled text. If text fails 4.5:1, we promote it to `--fg-secondary` or recolor the surface beneath.

### 1.3 Brand accents — Aurum + Aether

Two brand colors, each with a discrete role.

| Token | Hex | Role |
|-------|-----|------|
| `--aurum-primary` | `#C4A96A` | **The brand.** Old-money gold, drawn from finance-house signage and luxury watch dials. Used for: focus rings, primary call-to-action surfaces, "verdict" moments (Cristiano final calls, top-3 reveals), score-positive accents in finance contexts. **The single most-recognized colour of the system.** |
| `--aurum-soft` | `#E2C78B` | Primary-button gradient stop, light-touch hover states on aurum surfaces. |
| `--aurum-mute` | `rgba(196, 169, 106, 0.14)` | Aurum-tinted backgrounds (selected rows, "live" indicators). |
| `--aether-primary` | `#818CF8` | **The intelligence.** Indigo-electric. Used for: AI activity, agent traces, "Olivia is thinking" pulses, links, secondary CTAs, real-time data stream chrome. The "tech" half of the palette. |
| `--aether-glow` | `rgba(99, 102, 241, 0.18)` | Inner glow on agent-active panels, pulse rings. |
| `--aether-mute` | `rgba(99, 102, 241, 0.10)` | Tinted hover states on aether surfaces. |

> **Rule:** Aurum and Aether **never appear together** in the same component. Aurum = decisions, value, finance, verdict. Aether = computation, agents, real-time, exploration. Mixing them muddies the message. The header may carry both; a single button never does.

### 1.4 Semantic accents — status

Drawn for trader instinct: **green is positive movement, red is negative, blue is informational, amber is warning.** No deviation, no "minimalist greys for everything." Money moves, and the UI shows it.

| Token | Hex | Role |
|-------|-----|------|
| `--mint-up` | `#5EE0BE` | Positive moves, success, favorable comparison, recovery progress, scoring win. |
| `--coral-down` | `#F28D7F` | Negative moves, errors, danger, score loss, declined application. |
| `--sky-info` | `#7DD3FC` | Informational, neutral notifications, "did you know" prompts. |
| `--amber-warn` | `#FBBF24` | Warnings, rate limits approaching, attention required. |

Each has a `-mute` (rgba @ 0.12) variant for filled-pill backgrounds and a `-glow` (rgba @ 0.20) for ambient panel glows.

### 1.5 Borders + dividers

| Token | Value | Use |
|-------|-------|-----|
| `--border-subtle` | `rgba(180, 190, 210, 0.08)` | Default panel border. Whisper-thin separation. |
| `--border-default` | `rgba(180, 190, 210, 0.14)` | Card borders, input borders. |
| `--border-strong` | `rgba(180, 190, 210, 0.22)` | Hover state, focused panel border. |
| `--border-aurum` | `rgba(196, 169, 106, 0.20)` | Selected/active state on aurum surfaces. |
| `--border-aether` | `rgba(129, 140, 248, 0.25)` | Selected/active state on aether surfaces. |

### 1.6 No raw hex in components

Every color in a React component, every Tailwind class, every inline style **references a CSS custom property** from this file. Raw hex codes in components are forbidden — they break theming, white-labelling (priority 4 in `00_PRODUCT_TRUTH.md`), and AAA-contrast verification. CI lints for this.

### 1.7 Color space — LCH, not HSL

Tokens are defined in **LCH** (Lightness · Chroma · Hue), not HSL. Linear migrated specifically because HSL produces uneven theme generation across hues — equal saturation values look wildly different in green vs. yellow vs. blue. LCH is perceptually uniform: a `+10%` lightness step looks the same brightness regardless of hue. This matters because:

- **cluesxscore.com has 23 modules**, each with its own accent. Generating those palettes in HSL gives 23 inconsistent visual weights; LCH gives 23 visually-equal palettes.
- **White-label tenants** swap the brand hue. LCH guarantees the resulting palette is still WCAG-compliant after the swap; HSL doesn't.

We compute the runtime value in LCH (`oklch()` CSS function — modern browsers support it) and provide an sRGB fallback for older clients via PostCSS. Every accent (Aurum, Aether, mint, coral, sky, amber) ships as both `--<name>-primary-lch` and a sRGB fallback `--<name>-primary` so old browsers degrade gracefully.

### 1.8 Three-input theme generator

Drawn from Linear: every theme reduces to **three inputs**, never 98 individual tokens.

| Input | Type | Role |
|-------|------|------|
| `base` | LCH color | The deepest canvas. e.g. `oklch(15% 0.04 250)` for our default deep-navy. |
| `accent` | LCH color | The Aurum equivalent for this product / tenant. cluesintelligence = aurum gold; cluestransitscore = signal-blue; cluesenvironmentalscore = forest; HEARTBEAT (heart-health) = clinical green. |
| `contrast` | `standard` \| `high` \| `aaa` | Auto-generates the entire foreground / surface / border ladder at the requested level. `aaa` boosts everything by 1–2 stops for users with low vision. |

A theme is a 3-line JSON object:

```json
{ "base": "oklch(7% 0.02 250)", "accent": "oklch(72% 0.10 78)", "contrast": "standard" }
```

…and a function `generateThemeTokens(input)` produces the full set of `--canvas-*`, `--surface-*`, `--fg-*`, `--border-*`, `--<accent>-*` variables. The function is published once in `@olivia/design-system` and consumed by every product. Adding a 24th cluesxscore module means writing 3 lines, not 98.

---

## 2. Typography

### 2.1 Font stack

| Family | Variable name | Where |
|--------|---------------|-------|
| **Geist Sans** (variable, 100–900) | `--font-sans` | Primary UI, body, navigation, buttons, form labels. Already wired in LTM via `--font-geist-sans`; we adopt the same. |
| **Geist Mono** | `--font-mono` | All numeric data (scores, prices, durations, IDs, timestamps), code blocks, ticker text, keyboard shortcut chips. |
| **Tiempos Headline** (or licensed equivalent — see §2.4) | `--font-display` | Reserved for **verdict moments** only — Cristiano final calls, "your top-3 cities" reveal, the first paragraph of an executive findings report. Used sparingly. Never for navigation, buttons, or tables. |

Weights used: 400 (regular), 500 (medium), 600 (semibold), 700 (bold). Anything above 700 is reserved for the display font.

### 2.2 Type scale

12-step scale, 4-px-base, optimised for tabular numerics.

| Token | Size / line-height | Weight | Use |
|-------|-------------------|--------|-----|
| `--text-2xs` | 10 / 14 | 600 | Eyebrow labels, "kicker" captions over headers. Tracking +0.08em uppercase. |
| `--text-xs` | 11 / 16 | 500 | Footer text, table cells, badge labels. |
| `--text-sm` | 12 / 18 | 400 | Secondary body, helper text under inputs. |
| `--text-base` | 14 / 22 | 400 | Body. Most UI text. |
| `--text-md` | 15 / 24 | 500 | Card titles, list-item primary text. |
| `--text-lg` | 17 / 26 | 500 | Section titles. |
| `--text-xl` | 20 / 30 | 600 | Page titles. |
| `--text-2xl` | 24 / 32 | 600 | Hero stat values (e.g. "94 / 100" LifeScore). |
| `--text-3xl` | 30 / 38 | 700 | Module-level headings on dedicated pages. |
| `--text-4xl` | 38 / 46 | 700 | Landing-page section heads. |
| `--text-5xl` (display) | 56 / 60 | 600 | Verdict moment ("Berlin"). |
| `--text-6xl` (display) | 96 / 96 | 600 | Executive-findings hero ("Your three cities"). |

### 2.3 Numeric handling — non-negotiable

Every numeric character in the system uses `font-feature-settings: "tnum" 1, "lnum" 1` (tabular figures, lining figures). This keeps **price columns, score grids, timestamp ticks, and metric tables aligned to the kerning**. Affluent users notice when "$1,234,567" doesn't line up between rows.

Body text (paragraphs, narrative content) uses **proportional figures** (`"pnum" 1`) for natural reading rhythm.

### 2.4 Display font — the licence question

Tiempos Headline (Klim) requires a commercial licence. Open-source equivalents that hit the same "old-finance gravitas" register:

- **Source Serif 4** (Adobe, OFL) — closest free analog; subtle, considered.
- **Newsreader** (Production Type, OFL) — a slightly more modern alternative.

**Recommendation:** ship with Source Serif 4 free; if budget allows post-launch, swap to Tiempos Headline (or commission a custom display family for cluesintelligence's verdict reveal — would be a defensible aesthetic differentiator).

---

## 3. Spacing, grid, radius

### 3.1 Spacing scale (4-base)

`0 · 2 · 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128`

Tailwind already maps 1 unit = 4px. Use only these values; reject "13px between this label and that input." If a designer asks for a custom intermediate, the answer is "round to the scale."

### 3.2 Radius scale

| Token | Value | Use |
|-------|-------|-----|
| `--radius-none` | 0 | Tickers, stock-rail edges. |
| `--radius-sm` | 4 | Inline badges, ticker pills. |
| `--radius-md` | 8 | Buttons, input fields, small cards. |
| `--radius-lg` | 12 | Default panel/card. The dominant radius. |
| `--radius-xl` | 18 | Modals, drawers, prominent cards. |
| `--radius-2xl` | 24 | Hero panels. |
| `--radius-full` | 999 | Pills, avatar orbs, status dots. |

### 3.3 Grid

The **canvas grid** is 12-column, 16px gutter, max width 1440px (centered with a max viewport gutter of 32px so we never butt against the screen edge). Inside the workspace (§5), each tile is itself a sub-grid.

---

## 4. Elevation + depth — Sterling 4D

LTM ships a treatment called "Sterling 4D" on its valuation cards: a **double border** (sterling-silver outer + dim inner), a beveled top edge that catches simulated light, and **five layered shadows** producing genuine spatial depth. We adopt and standardize it.

### 4.1 Elevation levels

| Level | Use | Token recipe |
|-------|-----|--------------|
| `--elev-flat` | Page canvas, embedded panels | None — canvas-base only. |
| `--elev-raised` | Default cards, panels | 1px subtle outer border + inner-top highlight + tight ambient shadow. |
| `--elev-floating` | Popovers, dropdowns, command palette | Sterling 4D treatment with deeper shadow. |
| `--elev-modal` | Modals, drawers, dialog | Floating + 30%-opacity scrim over the entire canvas behind. |
| `--elev-toast` | Toasts, transient notifications | Floating + 8px translation-y on enter, sticking to the bottom-right inspector pane edge. |

### 4.2 The card recipe (raised level)

```css
.card {
  background: var(--surface-1);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-default);
  outline: 1px solid var(--border-subtle);
  outline-offset: -3px;
  box-shadow:
    inset 0 1px 0 0 rgba(220, 225, 235, 0.06),
    inset 0 0 0 1px rgba(255, 255, 255, 0.02),
    0 1px 2px rgba(0, 0, 0, 0.25),
    0 4px 8px rgba(0, 0, 0, 0.20),
    0 12px 24px -4px rgba(0, 0, 0, 0.18),
    0 24px 48px -8px rgba(0, 0, 0, 0.10);
  background-image:
    linear-gradient(to bottom,
      rgba(200, 210, 225, 0.04) 0%,
      rgba(200, 210, 225, 0.02) 2%,
      transparent 15%),
    linear-gradient(to bottom,
      transparent 85%,
      rgba(0, 0, 0, 0.04) 100%);
}
```

The five shadows model a real card on a desk: tight contact, lift, mid-falloff, long ambient wash, environmental tint.

### 4.3 Glass surfaces — sparingly

Glass-morphism (`backdrop-filter: blur + saturate`) is reserved for **floating overlays** (popovers, mapbox popups, command palette). Don't paint the entire dashboard in glass — it kills GPU on lower-end machines and competes with the Sterling cards.

---

## 5. Modular workspace architecture

This is where Olivia diverges from every dashboard you've used. The user **fully owns** the layout.

### 5.1 The four-region shell

```
┌──────────────────────────────────────────────────────────────┐
│  Ticker rail      (36px, optional, can hide)                 │  ← live news + stock prices, animated marquee
├──────────────────────────────────────────────────────────────┤
│  Header           (56px, sticky)                             │  ← AvatarOrb + product wordmark + crumb + score chips + Cmd-K + profile
├────┬────────────────────────────────────────┬───────────────┤
│    │                                        │               │
│ R  │            Workspace canvas            │   Inspector   │
│ a  │                                        │               │
│ i  │   (the user-configurable widget grid)  │   (Olivia +   │
│ l  │                                        │    contextual │
│    │                                        │    panels)    │
│ 56 │                                        │               │
│ /  │                                        │  0 / 320 /    │
│264 │                                        │  480 px       │
│    │                                        │               │
└────┴────────────────────────────────────────┴───────────────┘
```

Four regions: **Ticker rail · Header · Rail · Workspace canvas · Inspector.** The rail and inspector each have three states: hidden, default (264 / 320), expanded (480 each). All transitions are 200ms cubic-bezier(0.32, 0.72, 0, 1).

### 5.2 The workspace canvas — fully user-configurable

The center region is a **responsive widget grid** (CSS grid + a drag-drop layer powered by `react-grid-layout` + `dnd-kit`). Each "tile" is a widget the user can:

1. **Drag** — pick up by the tile's grip handle (top-left, fades in on hover) and reposition anywhere on the grid. Other tiles reflow with a 220ms spring animation.
2. **Resize** — grab a corner and pull. Tiles snap to the underlying 12-col × N-row grid. Sizes: 1×1 (mini), 2×1 (banner), 2×2 (square), 3×2 (wide), 4×2 (panorama), full-width.
3. **Add / remove** — open the **Widget Catalog** (a sliding panel from the right inspector). Drag a widget out, drop it onto the grid. Remove via the tile's `⋯` menu.
4. **Save layouts** — multiple named presets per user per product (e.g., "Investor view," "Founder view," "Daily-brief view," "Pitch-deck view"). Switch via Cmd+L. Server-persisted.
5. **Reset to default** — every product ships with an opinionated default layout. One click restores it.

### 5.3 Tile chrome (every widget shares this)

```
┌─────────────────────────────────┐
│ ⋮⋮ Title                    ⋯   │  ← grip + title (left), action menu (right)
├─────────────────────────────────┤
│                                 │
│         widget content          │
│                                 │
└─────────────────────────────────┘
```

The grip (`⋮⋮`) is **opacity 0** until hover, becoming `opacity 0.6` (and clickable) at the user's discretion. The action menu (`⋯`) holds: pin (lock from drag), duplicate, expand to inspector, settings, remove. Keyboard accessible via tile focus + Enter.

### 5.4 The rail — primary navigation

The left rail is the **product switcher + section nav** for the current product. Two states:

- **Collapsed (56px, default on workspace pages):** icons only with tooltip on hover.
- **Expanded (264px, default on Studio/document-heavy pages):** icons + labels + nested section tree.

User-configurable: drag rail items to reorder; rail items can be **promoted to the workspace as a widget** (e.g., "Pin Districts to my dashboard").

### 5.5 The inspector — Olivia + context

The right inspector is **always Olivia**, plus contextual panels that depend on what's selected in the workspace. Three default tabs (configurable by the user):

| Tab | Content | Always present? |
|-----|---------|------------------|
| **Olivia** | The chat brain, full conversation history for this surface, voice toggle, agent activity strip (§6). | **Yes** — cannot be removed. |
| **Library** | Templates / archetypes / catalog appropriate to the current product (deck archetypes for clueslondon Studio; module-question library for cluesintelligence; metric catalog for cluesxscore). | Optional. |
| **Audit** | Real-time trace of agent decisions on this turn (which provider answered, what was recalled, which sources were cited). | Optional. |

Additional tabs per-product: **Preview** (clueslondon Studio), **Themes** (clueslondon Studio), **Verdict** (cluesintelligence), **Metrics** (cluesxscore), **Vitals** (Heart-Recovery), etc.

### 5.6 Toolbar items — also draggable

Header toolbar items (Match, Export, voice toggle, theme switcher, etc.) live in a **horizontal slot list**. Long-press / right-click → reorder, or move to the inspector, or hide entirely.

### 5.7 Modals — relocatable too

Modals open at center by default, but the user can drag them by the title bar to any position. A "pin" toggle in the top-right of every modal converts it into a persistent floating panel that survives navigation (useful for: Olivia chat detached from the inspector, a comparison drawer kept open while browsing).

### 5.8 Smaller / bigger — every density level

Each tile has a **size dial** in its menu: `S · M · L · XL`. This controls internal padding, font scale, and how much detail is shown (e.g., a stock-comp-row at S shows ticker + price; at L shows ticker + price + day-chart sparkline + 30-day chart + headline).

A **global density** preference (compact / default / comfortable) lives in user settings and overrides all tile defaults. Compact = denser Bloomberg feel; comfortable = relaxed reading.

### 5.9 Server-persisted state

Layout JSON is stored per-user-per-product in `user_workspace_layouts` (Prisma model — to be added in a later session). Schema:

```ts
{
  userId: string;
  productId: "clueslondon" | "cluesintelligence" | "cluesxscore.<x>" | "olivia-saas" | …;
  layoutPresetName: string; // "default" | user-named
  tiles: Array<{
    widgetId: string;
    gridX: number;
    gridY: number;
    gridW: number;
    gridH: number;
    sizeOverride?: "s"|"m"|"l"|"xl";
    pinned: boolean;
    settings: Record<string, unknown>; // widget-specific
  }>;
  toolbarOrder: string[];
  inspectorTabs: Array<{ id: string; visible: boolean }>;
  density: "compact"|"default"|"comfortable";
  updatedAt: Date;
}
```

---

## 6. Multi-agent presence — the fully.ai-inspired layer

Olivia is the brain at the hub (`00_PRODUCT_TRUTH.md` § 1). She doesn't pretend to be a single LLM — she **orchestrates a council** (the cascade: Anthropic, OpenAI, Google, Grok, Perplexity, Mistral + Tavily + Opus judge). Users see this. It's a feature, not a hidden detail.

### 6.1 The AvatarOrb

The single most-recognizable piece of Olivia chrome. A 40 / 56 / 96 / 240 px circle (size depends on context — header avatar, card thumbnail, inspector, full-screen presentation) containing Olivia's video stream when active or a still glyph when idle.

States:

| State | Visual |
|-------|--------|
| Idle | Still glyph, subtle 4-second-cycle aurum-soft pulse around the rim. |
| Listening | Aether-glow pulse synced to user's mic input (waveform-driven). |
| Thinking | Aurum + aether twin pulse alternating, 0.6s period. **The signature animation.** |
| Speaking | Video stream of her face (LiveAvatar). Audio synced. |
| Error | Coral border, pulse stops, micro-shake of 4px x 220ms. |

### 6.2 Agent activity strip

When the cascade is running, a horizontal strip below the AvatarOrb in the inspector shows **each provider's status** in real time:

```
[ Anthropic ✓ 0.4s ] [ OpenAI ⏳ ] [ Google · ] [ Grok · ] [ Perplexity · ] [ Mistral · ] [ Tavily · ] [ Cristiano (Opus) · ]
```

- ✓ = succeeded (with duration).
- ⏳ = currently running (animated three-dot pulse).
- · = idle (didn't run this turn).
- ⚠ = errored (tooltip shows category — never raw error text, per `00_PRODUCT_TRUTH.md` and the chat-route contract).

The strip is **expandable** to a vertical panel showing each provider's contribution, the prompt sent (redacted), and the response. Power users live in this view; casual users never open it.

### 6.3 Cristiano (Opus) — the judge moment

When Cristiano renders a final verdict (`intent: "judge"` flow, see `model-cascade.ts`), the AvatarOrb briefly transitions to **gold-saturated** (Aurum-primary fill instead of just rim), and a 1-second swell on the agent strip ends with the Opus chip pulsing. **The user always knows when a unilateral judge call has happened** — never silent.

### 6.4 Sub-agent visualizations (council mode)

For complex multi-step work (cluesintelligence's full questionnaire-to-verdict flow), the inspector displays **orbiting agent dots** around the AvatarOrb. Each sub-agent has a colour:

| Agent | Colour |
|-------|--------|
| Olivia (orchestrator) | `--aurum-primary` |
| Cristiano (judge) | `--aurum-primary` (saturated) |
| Research (Perplexity / Tavily) | `--aether-primary` |
| Persona (Anthropic) | `--mint-up` (favorable evaluation) |
| Math (Grok) | `--sky-info` |
| Multilingual (Mistral) | `--coral-down` (only the muted variant — `--coral-mute` for chrome) |

When an agent is contributing, its dot pulses + draws a faint connecting line to the orb. **No gimmick** — the visualization tracks real cascade activity from the trace span.

---

## 7. Motion language

The motion vocabulary is small, spring-based, and consistent.

### 7.1 Easing curves

| Curve | Token | Use |
|-------|-------|-----|
| `cubic-bezier(0.32, 0.72, 0, 1)` | `--ease-out-quart` | Default UI transitions (panel open/close, hover lifts). |
| `cubic-bezier(0.65, 0, 0.35, 1)` | `--ease-in-out-quart` | Bidirectional changes (toggle, theme switch). |
| Spring (stiffness 400, damping 28) | (framer-motion) | Drag-drop reflow, tile resize. |

### 7.2 Durations

`120ms` (micro: hover, focus ring), `220ms` (default: panel slide, modal open), `400ms` (rare: ticker fade, hero reveal). Anything longer needs justification — the user is paying for their time.

### 7.3 Reduced motion

`prefers-reduced-motion: reduce` disables all animation longer than 120ms, freezes tickers, removes orbital sub-agent dots (replaces with a static row), kills the AvatarOrb pulse. This is enforced at the CSS level via media queries AND at the framer-motion level via `useReducedMotion()`.

---

## 8. Component primitives — the floor

Every product uses these primitives. We do not invent ad-hoc buttons / cards / inputs per surface.

### 8.1 The five core primitives

| Primitive | Notes |
|-----------|-------|
| **Button** | Three variants (primary aurum, secondary outline, ghost). Three sizes (sm 32, md 40, lg 48). Loading state with inline spinner replacing left icon. Disabled state at `--fg-disabled`. **Always** has `aria-label` if icon-only. |
| **Input / Textarea / Select** | Single-line and multi-line. Uses `--surface-recess` background, `--border-default` border, focus ring `--aurum-primary`. Helper-text and error-text slots. Required indicator: a small `*` in `--coral-down`. |
| **Card** | Sterling 4D treatment from §4.2. Header / body / footer slots. Action menu (`⋯`) optional. Click-through hover state lifts via box-shadow swap, never via background change. |
| **Modal / Dialog** | Radix Dialog primitive. Size scale: sm (480), md (640), lg (840), xl (1080), fullscreen. Drag-relocate per §5.7. Close on Esc; focus trap; return-focus on close. |
| **Toast** | Bottom-right of inspector. Stacks (max 4). Auto-dismiss 5s default; sticky on hover. Three flavours: success (mint), error (coral), info (sky). Critical actions can request a confirmation toast (action persistent until clicked). |

### 8.2 Olivia-specific primitives

| Primitive | Notes |
|-----------|-------|
| **AvatarOrb** | §6.1. Five sizes, six states. Wraps the LiveAvatar video element when active. |
| **AgentStrip** | §6.2. Horizontal compact / vertical expanded. |
| **ScoreChip** | Pill-shaped, three internal slots (label, value, delta). Used in: cluesxscore comparisons, cluesintelligence verdict cards, clueslondon valuation chips. Size scale: sm / md / lg. |
| **VerdictBlock** | The "Top 3" reveal component for cluesintelligence. Display font, layered fade-in, Cristiano gold pulse. **The single most heavily-designed moment in the system.** |
| **TickerRail** | LTM-pattern news + stock marquee. Pause-on-hover, prefers-reduced-motion freezes. Toggle to hide. |

### 8.3 Don't reinvent

For a11y-correct primitives we don't own (menus, popovers, tooltips, dropdowns, selects, comboboxes, radio groups, switches, sliders, accordions), we use **Radix UI** (`@radix-ui/react-*`). They are unstyled, headless, AAA-compliant out of the box. We theme them via the tokens above and never lower the bar.

For richer interaction patterns (date/time pickers, command palette, drag-drop), we use:

- **`cmdk`** for command palette (Cmd+K).
- **`react-day-picker`** + our theme overrides for date input.
- **`react-grid-layout`** for the workspace grid (§5.2).
- **`@dnd-kit/core`** for finer-grained drag-drop (toolbar, modal handles).
- **`framer-motion`** for the motion language.

We do not write our own grid or drag system. Time spent there is time not spent on the cluesintelligence verdict.

---

## 9. Accessibility floor — non-negotiable

WCAG 2.2 AA on every screen. The list below is the minimum; AAA where it costs nothing.

1. **Color contrast.** Every text-on-background combo verified ≥ 4.5:1 (normal text) or ≥ 3:1 (large text 18px+ bold or 24px+ regular). UI components ≥ 3:1.
2. **Keyboard navigation.** Tab order is meaningful and matches visual order. Skip-to-content link at top (`.skip-to-content` from LTM globals.css adopted). Custom keybindings:
   - `Cmd/Ctrl-K` — command palette.
   - `Cmd/Ctrl-L` — switch saved layout.
   - `Cmd/Ctrl-/` — show keyboard shortcuts overlay.
   - `J / K` — vertical list navigation.
   - `G then I/L/X/H` — global product navigation (Intelligence / London / xScore / Health).
   - `Esc` — close topmost modal / palette / drawer.
3. **Focus rings always visible.** Aurum gold `2px solid` outline, `2px outline-offset`. Never removed without replacement.
4. **Screen-reader labels.** Every icon button has `aria-label`. Every interactive element has a role (or implicit one). Live regions (`aria-live="polite"` for streaming responses, `aria-live="assertive"` for critical errors).
5. **Touch targets ≥ 44 × 44 CSS px** on touch-detected viewports. (LTM's pattern at the bottom of `globals.css`.)
6. **Reduced motion + reduced transparency.** Respect both system prefs.
7. **Forced-colors / Windows High Contrast.** Don't paint over OS overrides — use semantic borders the OS will recolor.
8. **Form errors are NOT colour-only.** Coral text + `⚠` icon + descriptive message + `aria-describedby` linkage to the input.
9. **Heading hierarchy is real.** `<h1>` once per page, `<h2>` per section, `<h3>` per sub-section. Don't use heading sizes purely for visual scaling — use the type scale tokens (§2.2).
10. **Focus management on route changes.** New page → focus shifts to the first heading or main landmark. Don't make screen-reader users replay the rail.
11. **Auto-translation friendly.** No baked-in English strings in business-logic code. All UI strings come from a translation function (`t("verdict.top_three")`) so we can ship i18n later without a rewrite.

### 9.1 Adopted from Vercel's Web Interface Guidelines (verbatim — drop into `AGENTS.md` so Claude Code applies them on every component)

These are non-negotiable additions to the floor above. Vercel publishes them as the standard for accessible, performant dark-mode interfaces.

| Rule | Why |
|------|-----|
| `:focus-visible` over `:focus` | Focus ring only when keyboard-driven; mouse clicks don't paint a ring on top of the visible click. Aurum-gold ring already in place — switch the selector. |
| `touch-action: manipulation` on every interactive control | Prevents the iOS double-tap zoom delay (320ms) on buttons. Free latency win. |
| `<input>` `font-size: 16px` floor on mobile | Anything below 16px triggers iOS auto-zoom on focus — a common WCAG-AA failure. |
| `overscroll-behavior: contain` on modals + drawers | Prevents background scroll bleeding through when the modal scrolls to its end. Critical for the workspace's draggable modals (§5.7). |
| **Tabular nums on every numeric** | Already adopted (§2.3). Vercel confirms it. |
| **Minimum loading-state duration 300–500ms** | Prevents the "flicker on fast networks" problem where a skeleton renders for 40ms and looks like a glitch. Show the skeleton for at least 300ms or not at all. |
| **Never `transition: all`** | Causes silent layout-thrash bugs (every browser-internal property change becomes a transition target, including derived ones). Always enumerate properties. |
| **"Don't ship the schema"** | Visual labels can be omitted for icon-only controls — but `aria-label` must always exist. The DOM should read like a clean spec; the visual layer is decoration on top. |
| **Confirm destructive actions OR provide Undo** | Every irreversible action (delete a saved layout, regenerate the verdict report, archive a conversation) gets either a confirm-dialog or an Undo toast with a 10–30s window. |

### 9.2 APCA over WCAG 2

WCAG 2's contrast formula is from 1990s CRT-era research — it under-estimates contrast for white-on-dark and over-estimates for dark-on-light. **APCA (Accessible Perceptual Contrast Algorithm)** is what WCAG 3 will adopt and what Vercel/Apple already use internally. Our tokens are tuned to **APCA Lc ≥ 75 for body text** (equivalent to WCAG AAA 7:1+) on the default `--canvas-base`.

We continue to **report WCAG 2.2 AA compliance** for institutional / procurement reasons, but our internal contrast checks during design and CI use APCA. When a token passes APCA but technically fails WCAG 2 (rare, only at edges), we surface the APCA evidence — APCA is more aligned with how human vision actually works.

---

## 10. Per-product surface contracts

The shared chrome (header + rail + workspace + inspector) is identical across products. What differs is the **default workspace layout, the rail's section list, the score-chip set, and the available inspector tabs.**

### 10.1 `clueslondon.com` (priority 1)

**Default workspace tiles:** Districts overview, Companies feed, Today's Calendar, Document-Library readiness ring, Pitch-Deck Studio shortcut, Daily Brief.

**Rail sections:** Map · Districts · Companies · Calendar · Documents · Pitch · Plans · Marketing · Briefs · Settings.

**Score chips:** Document readiness (% complete), Match readiness (top-3 from executive findings).

**Inspector tabs:** Olivia · Library (deck archetypes + doc templates) · Preview · Themes · Audit.

**Key surfaces using design system:** Studio (the GrandMaster prototype, now scoped to clueslondon's pitch-deck/document center module), Map, Daily Brief.

### 10.2 `cluesintelligence.com` (priority 2 — the FLAGSHIP)

**Default workspace tiles:** Questionnaire progress (segment bars + module map), Persona snapshot, Live cascade trace, Top-3 cities reveal (when ready), What-if simulator dial, Source citations strip.

**Rail sections:** Questionnaire · Modules (23) · Persona · Math (24 pages) · Verdict · Reports · Settings.

**Score chips:** Persona confidence, Bayesian module-coverage %, Cristiano-verdict-readiness.

**Inspector tabs:** Olivia · Modules (which segments left) · Verdict · Audit (full cascade trace).

**Key surface:** the **VerdictBlock** (§8.2) — when the top-3 cities reveal happens, it owns the entire workspace canvas for 4 seconds with a controlled fade-in.

### 10.3 `cluesxscore.com` (priority 3 — 23 modular mini-apps)

**Default workspace tiles per `<x>` module:** City A picker, City B picker, 100-metric comparison grid, Verdict summary, Methodology citations, Saved comparisons.

**Rail sections (per module):** Compare · Saved · Methodology · Settings. Top-rail switches between the 23 modules: **lifescore.com**, cluestransitscore, cluesenvironmentalscore, etc.

**Score chips:** Per-metric winner, overall winner, confidence.

**Inspector tabs:** Olivia · Library (metric catalog) · Audit.

### 10.4 White-labeled Olivia (priority 4)

Same chrome. Brand tokens (Aurum, Aether, font-display) are swappable per tenant via the tenant-context pipe (Track I in `BUILD_SEQUENCE.md`). Tenants get their own `--aurum-primary` and logo; the rest of the system stays.

### 10.5 `clues-property-search`, Heart-Recovery, London transit (priorities 5–7, future)

Each will declare its own default layout, rail sections, score chips, and inspector tabs — **but uses every primitive, token, and rule above without modification.** The shell scales.

---

## 11. Implementation notes

### 11.1 Tokens land in CSS-custom-properties + Tailwind

- `src/styles/tokens.css` — every CSS variable from §1, §2, §3, §4, §7 lives here.
- `tailwind.config.ts` — references the tokens so utility classes compose them (`bg-canvas-base`, `text-fg-primary`, `border-aurum-primary/20`, etc.).
- No raw hex codes in components. Lint enforces.

### 11.2 Library choices (locked)

| Concern | Library |
|---------|---------|
| Headless a11y primitives | `@radix-ui/react-*` |
| Command palette | `cmdk` |
| Date / time | `react-day-picker` |
| Workspace grid | `react-grid-layout` |
| Fine-grained drag-drop | `@dnd-kit/core` + `@dnd-kit/sortable` |
| Motion | `framer-motion` |
| Icons | `lucide-react` (consistent stroke-1.5 style) |
| Charts (sparkline / score / metric) | `visx` or hand-rolled D3 — decide in the implementation session |

### 11.3 Theming

`<html data-theme="aurum-dark">` is the default. Future themes: `aurum-light` (rare — for print and accessibility), `aurum-amoled` (for OLED phones, true blacks), `tenant-<id>` (white-label). Theme switches recompute the whole token set; everything updates because nothing has hardcoded hex.

### 11.4 Where this lives in the repo

```
src/
  styles/
    tokens.css          ← all CSS custom properties
    base.css            ← element resets, typography defaults
    globals.css         ← imports tokens + base; minimal extras
  components/
    primitives/         ← Button, Input, Card, Modal, Toast, ScoreChip, AvatarOrb, AgentStrip, VerdictBlock, TickerRail
    workspace/          ← WorkspaceShell, WidgetGrid, Tile, RailLeft, RailRight, Header, Inspector
    olivia/             ← OliviaProvider, OliviaVideoAvatar (already exists), OliviaInspectorPanel
  lib/
    workspace/
      layouts.ts        ← default layouts per product
      persistence.ts    ← server-sync of user layout state
```

This skeleton gets created in Track C (Sessions 9–14). Until then, the doc is the spec.

---

## 12. The mandate

Every UI built into this repo or any consuming product (clueslondon.com, cluesintelligence.com, cluesxscore.com, white-label Olivia, clues-property-search, Heart-Recovery, London transit) **conforms to this system**. No exceptions, no "just for this one screen," no "we'll refactor later." If a designer or engineer hits a case the system doesn't cover, the answer is to **extend this file in a PR** — never to bypass the system in code.

The user — affluent, well-educated, financially literate, mobile professional — must, on first encounter, feel: **"This was built by people who get it. I can move money / time / a continent through this app."** That feeling is non-negotiable.

When in doubt, the priority is, in order: **Accessibility · Hierarchy · Density · Distinctiveness · Speed.** Accessibility never loses.
