# 02 · COMPETITIVE FEATURE MATRIX — what to steal, what to ignore

> **Read `00_PRODUCT_TRUTH.md` and `01_UI_DESIGN_SYSTEM.md` first.** This file is a synthesis of features, patterns, and code-level rules from the leading agentic-AI / dark-mode / data-dense product UIs in 2026 — captured so we know exactly what to absorb into Olivia and exactly what to leave behind.
>
> **Source corpus.** Three analyses were collated to compile this matrix:
>
> 1. **Gemini's 10** — EliseAI, Hippocratic AI, Nabla, Samsara, Motive, Lindy.ai, Cognition Devin, MultiOn, Sierra, Vercel v0.
> 2. **Grok's 10** — EliseAI, Creatio, Kore.ai, Salesforce Agentforce, UiPath, Aisera, Moveworks, Beam AI, Relevance AI, Glean.
> 3. **Claude Desktop's 10** — Linear, Vercel Web Interface Guidelines, Sully.ai, Hippocratic AI, Abridge, Suki AI, Viz.ai, Samsara, Motive, Lofty (+ honorable mentions Mobbin, Awwwards).
>
> Total unique platforms surveyed: 22. **No fresh web-fetch was performed** — three independent expert analyses already covered the surface area in detail; spending 30+ minutes scraping marketing pages would not have improved fidelity beyond what's synthesised here. If a specific feature needs verification later, the user can request a targeted fetch.
>
> **Position vs. competitors.** Olivia's core differentiators per `00_PRODUCT_TRUTH.md` — bicycle-wheel architecture with one brain serving every product, the Bayesian paragraphical questionnaire engine on cluesintelligence.com, the 23-module cluesxscore family, the white-label gateway — none of the 22 competitors do **all** of these together. The matrix below captures **isolated patterns each one does well**, not a blueprint to copy whole-cloth.

---

## 1. The matrix

Status legend: **✅ already in `01_UI_DESIGN_SYSTEM.md`** · **🔧 incoming upgrade (queue for early implementation)** · **📋 future scope (post-launch or specific product surface)** · **❌ explicitly rejected**.

### A · Visual hierarchy + density

| # | Feature / pattern | Where seen | Why it works | Olivia incorporation | Status |
|---|---|---|---|---|---|
| A1 | High-contrast deep-black canvas with cream-warm foreground (never pure black / pure white) | EliseAI, Vercel v0, Linear, Devin, Hippocratic | Reduces eye strain over multi-hour sessions; pure `#FFFFFF`/`#000000` create banding and chromatic aberration on cheap monitors; warm off-white reads as "old-money finance." | `--canvas-base #050B15` + `--fg-primary #F1ECE0` (§1.1, §1.2). | ✅ |
| A2 | Action-oriented hierarchy — important data visually elevated above standard text | Nabla (medical codes / prescriptions), Viz.ai (time-critical alerts), Samsara | A user scanning a dense screen for "what matters now" finds it in <300ms; nothing competes for attention. | `ScoreChip`, `VerdictBlock`, ScoreChip color-elevation rules per §8.2. ScoreChips for "next action," "deadline approaching." | ✅ |
| A3 | High information density without clutter | Devin, Linear, Bloomberg-style tickers in LTM, Viz.ai | Affluent / professional users dislike screens "designed for tablets." More signal per pixel — done correctly — reads as competence. | Density modes (`compact / default / comfortable`) at §5.8; tabular nums (§2.3). | ✅ |
| A4 | Strict grid-based layouts, every widget snaps to underlying grid | Motive, Samsara, Linear | Aligned widgets feel deliberate; misaligned widgets feel sloppy. Affluent users notice immediately. | `react-grid-layout` 12-col workspace canvas (§5.2, §5.3). Tile sizes snap to 1×1 / 2×1 / 2×2 / 3×2 / 4×2 / full. | ✅ |
| A5 | Pixel-perfect kerning + spacing | Sierra, Linear | Single most reliable signal that "this was built by people who get it." | 4-px scale only; tabular nums; type scale fixed at `--text-2xs` → `--text-6xl` (§2.2, §3.1). | ✅ |
| A6 | Tabular nums on every numeric character | Vercel WIG, Devin, Sierra, LTM (already) | Price columns, score grids, timestamp ticks line up across rows. Affluent users notice when they don't. | `font-feature-settings: "tnum" 1, "lnum" 1` enforced via the type-scale tokens (§2.3). | ✅ |

### B · Dark mode + glass treatment

| # | Feature / pattern | Where seen | Why it works | Olivia incorporation | Status |
|---|---|---|---|---|---|
| B1 | Subtle glassmorphism preserving readability — frosted panels, NOT full-screen blur | Lindy, Hippocratic | Adds depth + "floating" quality without killing contrast. The mistake is painting the entire dashboard in glass. | Glass reserved for **floating overlays only** (popovers, command palette, mapbox popups) — §4.3. The dashboard surface uses Sterling 4D borders + shadows, not glass. | ✅ |
| B2 | Sterling 4D depth — double-border + layered shadows | LTM (already), Sierra-adjacent | Cards genuinely look "lifted off the surface," not painted. Contact shadow + lift + ambient + far-ambient + environment. | The card recipe at §4.2 — adopted from LTM's existing `glass-card` treatment. | ✅ |
| B3 | Animated background orbs / gradients (very-low-opacity ambient depth) | Grok suggestion, several "AI-tech" landing pages | Adds "living interface" feel without distraction. | Reserved for **landing pages / verdict moments only**, not the workspace canvas (the user is reading data; ambient gradients compete with content). | 🔧 (cluesintelligence verdict reveal) |
| B4 | Universal dark theme adaptable to any host site | MultiOn (browser-overlay) | Same theme works overlaid on light Notion, dark VS Code, etc. | Olivia Web Component for embedded mode honors host `prefers-color-scheme`; in our own products we ship dark-by-default. | 📋 (Web Component is the LTM embedding path) |
| B5 | "Reduce visual noise without losing structure" — softer borders, warmer grays | Linear (recent migration) | Modern dark UIs over-saturate borders. Softer borders = less visual noise but the same hierarchy. | `--border-subtle / --border-default / --border-strong` use rgba @ 0.08 / 0.14 / 0.22 (§1.5). Soft by default, deliberate at hover. | ✅ |

### C · Multi-panel + workspace architecture

| # | Feature / pattern | Where seen | Why it works | Olivia incorporation | Status |
|---|---|---|---|---|---|
| C1 | Multi-panel architecture — chat + code + browser + terminal in one screen, no clutter | Cognition Devin | Power users want every relevant artifact visible without context-switching. Devin's spacing discipline is what makes it not feel cluttered. | Workspace canvas (§5) + Inspector pane (§5.5). Multiple Olivia conversations / cascade traces / memory layers can all be visible at once. | ✅ |
| C2 | Sidebar navigation with collapsible sub-trees | EliseAI, Samsara, Linear, Kore.ai | Multi-faceted toolset stays organized; user controls how much chrome they see. | Left rail with `56px collapsed / 264px expanded` states (§5.4). Section trees nest inside expanded mode. | ✅ |
| C3 | Sticky header with essential controls always reachable | EliseAI, Sierra, every modern SaaS | User never has to scroll up to switch products / open palette / see scores. | 56px sticky header with AvatarOrb, product wordmark, breadcrumb, score chips, Cmd+K, profile (§5.1). | ✅ |
| C4 | Widget reconfigurability — components can be moved, resized, hidden | Motive, Lindy | Power users build their own dashboard; novices use defaults. One product serves both. | The full §5 modular workspace architecture (drag-drop tiles, resize, save layouts, persist server-side). | ✅ |
| C5 | Focus-driven dimming — the panel the AI is working in is highlighted; others dim | Cognition Devin | Multi-panel screens become legible when user attention is steered. | Inspector "active conversation" panel pulses Aether-glow; non-active workspace tiles dim to `opacity 0.92` during cascade-active state. | 🔧 (Sessions 9–14, after the workspace shell lands) |
| C6 | Modular adoption — start with one widget, scale to the full set | Sully.ai (single agent → workforce), MultiOn | Users adopt incrementally. The product earns its space rather than demanding it. | Default workspace tiles per product (§10) are intentionally small; Widget Catalog (§5.2) lets the user grow into more. | ✅ |
| C7 | Deep collapsible sub-navigation, tabbed menus | Samsara | A 250+ control surface stays comprehensible. | Right inspector tabs (Olivia / Library / Audit / Verdict / Themes / etc. — §5.5, §10) are user-configurable per product. | ✅ |

### D · Multi-agent visualization + orchestration

| # | Feature / pattern | Where seen | Why it works | Olivia incorporation | Status |
|---|---|---|---|---|---|
| D1 | Multi-agent visible-orchestration — user always sees who's working on what | Sully.ai (AI workforce), fully.ai-style | The user trusts the system more when the council is visible than when one black-box agent claims to do everything. Hides accountability when collapsed. | AvatarOrb + agent-activity strip showing each cascade provider's status in real time (§6.2). | ✅ |
| D2 | "Constellation" vocabulary — primary model + supervisors | Hippocratic AI (Polaris Constellation: 22 supervisors validating one patient-facing model) | Makes a multi-model architecture legible to non-technical stakeholders. "Cascade" is also fine but "constellation" is more visual. | Adopt **"constellation"** as user-facing vocabulary for the cluesintelligence verdict pipeline ("Olivia consults her constellation: Anthropic, OpenAI, Google, Grok, Perplexity, Mistral, Tavily, with Cristiano (Opus) as judge"). Internal code keeps `cascade`. | 🔧 |
| D3 | Single-line role definition per agent (NOT a feature list) | Sully.ai (e.g., "AI Receptionist: handles calls, scheduling, FAQs, EHR logging") | Forces clarity. If you can't write the role in one line, the role isn't real yet. | Apply to Olivia / Cristiano / Emelia / future per-metric agents. To be added to `00_PRODUCT_TRUTH.md` § 3 in a follow-up. | 🔧 |
| D4 | Live state indicators per agent — listening / thinking / speaking / error | Hippocratic, Nabla (asynchronous UX), MultiOn | The user always knows the agent's state without asking. Critical for trust in agentic systems. | AvatarOrb's six states (§6.1) + agent-strip's per-provider states (§6.2). | ✅ |
| D5 | Live rendering feedback — UI updates as the AI works, not after | Cognition Devin, Vercel v0 | Reduces perceived latency. Even a slow operation feels alive. | Streaming response into the chat composer; agent-strip updates per cascade-attempt completion; not waiting for full response before UI redraws. | 🔧 (Session 5 cascade landed; streaming response wiring pending — Track A polish) |
| D6 | "AI never sleeps" — 24/7 lead qualification / monitoring | Lofty, Aisera | Olivia's daily/weekly briefs (`00_PRODUCT_TRUTH.md` priority 1) and continuous agentic learning realize this. | Trigger / Inngest / Temporal — already in `package.json`; brief generation lands in Track H (Sessions 21–23). | 📋 |
| D7 | Single-task clarity — agent that does one thing extremely well | Abridge (clinical documentation only) | Avoids the "AI that does everything badly" trap. Olivia's individual sub-agents (Cristiano = judge only; Emelia = back-end only) follow this. | Already enforced via persona model in `MERGE_PLAN.md`. | ✅ |

### E · Theme system + token discipline

| # | Feature / pattern | Where seen | Why it works | Olivia incorporation | Status |
|---|---|---|---|---|---|
| E1 | LCH color space (not HSL) for theme tokens | Linear (migrated specifically for this) | LCH is perceptually uniform — `+10%` lightness reads the same regardless of hue. HSL produces uneven palettes across the 23 cluesxscore modules. | `oklch()` CSS function with sRGB fallback via PostCSS (§1.7). | ✅ |
| E2 | Three-input theme generator (base + accent + contrast) | Linear (theme system reduced from 98 vars to 3 inputs) | Adding a new product / tenant theme = 3 lines, not 98. Critical for the 23 cluesxscore modules and the white-label gateway. | `generateThemeTokens({ base, accent, contrast })` published in `@olivia/design-system` (§1.8). | ✅ |
| E3 | Component-driven design system with rigorous consistency | Sierra, Vercel v0 | Brand identity stays uniform across surfaces. Engineers don't reinvent buttons per page. | All primitives in `src/components/primitives/` (§11.4). Lint forbids raw hex codes; tokens only. | ✅ |
| E4 | Brand customization for white-label / per-tenant | Sierra, Salesforce Agentforce | Tenants get their own brand without forking the codebase. | The 3-input theme generator + Linear's per-product-theme pattern (§10.4) — tenant gets `{ base, accent, contrast }`; everything else follows. | ✅ |
| E5 | Color-coded categorization (alerts / routing / maintenance / etc.) | Motive | Color is information bandwidth. Used disciplined-ly, color says "which class of thing am I looking at" before the user reads a word. | Semantic accents (mint-up / coral-down / sky-info / amber-warn) in §1.4. Cascade-attempt rows colored per outcome class. | ✅ |

### F · Conversational + workspace UX

| # | Feature / pattern | Where seen | Why it works | Olivia incorporation | Status |
|---|---|---|---|---|---|
| F1 | Conversational UX as a living workspace, not a chat-bot box | Lindy.ai, Sierra | The conversation IS the work surface, not a sidekick widget. Documents, calendar entries, decks are produced inline. | Inspector "Olivia" tab is a full panel (320–480px), not a 280px sidebar. Generated artifacts render in the workspace canvas as new tiles, not as chat bubbles. | ✅ |
| F2 | Voice-first interaction model | Suki AI, Nabla | High-cognitive-load users (clinicians, mid-questionnaire relocation users) save energy with voice over typing. Maps directly to LiveAvatar + ElevenLabs already in repo. | Voice toggle at §10 inspector level; voice composer (mic capture → /api/voice/transcribe → /api/olivia/chat) lands Session 17 (Track E). | 📋 (Session 17) |
| F3 | Natural language interface to the entire product | Glean, Creatio, v0 | Power users prefer typing intent over clicking through menus. Cmd+K command palette + voice cover both. | `cmdk` library for the palette (Cmd/Ctrl+K) per §9. Hooks into Olivia's intent classifier so "show me my LifeScore for Berlin vs LA" works as a search OR as a voice command. | ✅ |
| F4 | Node-based workflow builder (drag blocks to compose) | Lindy, Relevance AI, UiPath, n8n-style | Multi-step workflows readable to non-technical users. | **Not adopted for the user-facing product.** Olivia's value is agentic — she does the orchestration; the user shouldn't need to build flows. Internal: admin agent-graph editor is potentially useful (Track H polish, future). | 📋 (admin-only, post-launch) |
| F5 | Ambient design — interface gets out of the user's way | Nabla, Linear | Dense work surfaces benefit from removing chrome. Less border, less label, more content. | The ticker rail (§5.1) and side rails (§5.4) all hide-able. Density mode = compact removes ornament. | ✅ |
| F6 | Contextual menus — UI adapts to what tool / surface is active | Lindy.ai | The user gets the right action set without scrolling. | Right-pane tabs swap per active surface (§5.5, §10). Rail items can be promoted from the workspace via the tile `⋯` menu (§5.3). | ✅ |

### G · Live state + real-time feedback

| # | Feature / pattern | Where seen | Why it works | Olivia incorporation | Status |
|---|---|---|---|---|---|
| G1 | Asynchronous UX — clear separation of listening vs output | Nabla | Voice + text systems break when the user can't tell which mode they're in. | AvatarOrb states (§6.1): listening = mic-driven aether pulse; thinking = aurum + aether twin pulse; speaking = video stream. Three visually-distinct states. | ✅ |
| G2 | Smooth state-transition animations | MultiOn, Lindy, Linear | Transitions communicate causality. Bad apps "snap"; good apps spring. | `framer-motion` spring curves (§7.1). 220ms default; reduced-motion respected (§7.3). | ✅ |
| G3 | Time-critical alert UI patterns | Viz.ai (FDA-cleared time-critical care) | Deadline-driven moments need visual distinctness — never lost in the noise. Airline-cockpit-disciplined. | Toast variant `urgent` (coral border, persistent, requires acknowledgment); ScoreChip with `--coral-down` for "approaching deadline." Used for visa deadlines, rate locks, property closing windows. | 🔧 |
| G4 | Real-time observability of agent decisions | Salesforce Agentforce | Trust scales with visibility. Enterprise procurement requires this. | Inspector Audit tab (§5.5, §10) renders the full cascade trace per turn (provider attempts, durations, recall content). Production-real, not demo. | ✅ |
| G5 | Real-time coaching micro-interactions | Motive (gentle correction without scolding) | Form errors that feel helpful, not punitive. | Form-error pattern in §9.8 — coral text + `⚠` icon + descriptive message + `aria-describedby`. Tone library: "Add this so we can…" not "You forgot to…". | 🔧 |

### H · Keyboard + command palette

| # | Feature / pattern | Where seen | Why it works | Olivia incorporation | Status |
|---|---|---|---|---|---|
| H1 | Cmd/Ctrl-K command palette — search, navigate, run actions | Linear, Vercel v0, Sierra, Glean | Power users live there. New users discover it within their first hour. | `cmdk` library; opens at top-center; searches widgets + actions + Olivia commands (§9). | ✅ |
| H2 | Full keyboard navigation — entire app usable mouse-free | Vercel v0, Linear | Accessibility AND power-user requirement, not a tradeoff. | Custom keybindings list in §9.2: Cmd-K palette, Cmd-L layout switch, Cmd-/ shortcuts overlay, J/K vertical nav, G+I/L/X/H global product nav, Esc closes topmost. | ✅ |
| H3 | Keyboard shortcuts overlay (Cmd-/) | Linear, Vercel v0 | Discoverable without leaving the app. | Cmd-/ shows the full keymap as a modal (§9.2). | ✅ |

### I · White-label + per-product adaptation

| # | Feature / pattern | Where seen | Why it works | Olivia incorporation | Status |
|---|---|---|---|---|---|
| I1 | Per-tenant brand override (logo, accent, sometimes typography) | Sierra, Salesforce Agentforce | White-label is a real revenue stream. Olivia's priority 4 (`00_PRODUCT_TRUTH.md`) requires this. | Tenant theme = `{ base, accent, contrast, logo, displayFont? }`. Set at the tenant-context middleware (Track I, Session 24). | 📋 (Session 24) |
| I2 | "One implementation, one security review, one connection" — modular adoption story | Sully.ai, Glean | Enterprises buy once, deploy many. Marketing copy AND architectural reality. | One Olivia Brain repo serving all products via the bridge layer (Track G, Sessions 19–20). Clerk auth handles per-tenant identity (Track F, Session 18). | 📋 (Sessions 18–20) |

### J · Data viz + tables

| # | Feature / pattern | Where seen | Why it works | Olivia incorporation | Status |
|---|---|---|---|---|---|
| J1 | Data visualization mastery — turning complex data into beautiful, easy-to-read charts | Samsara, Viz.ai | Score grids, comparison radars, trend sparklines turn ints into intuition. | `visx` or hand-rolled D3 charts in primitives library (§11.2). ScoreRadar (5-axis radar for cluesintelligence persona) + ScoreLadder (vertical metric comparison for cluesxscore) + ComparisonBar. | 🔧 (cluesxscore needs `<DualCityCompare>` first — see §3 below) |
| J2 | Responsive table handling on mobile (sticky headers + horizontal scroll) | Samsara | Massive data tables work on phones. | Tabular UI primitive: sticky-header + sticky-first-column + horizontal scroll on narrow viewports + density toggle. Used by cluesxscore comparison tables, clueslondon company directory. | 🔧 |
| J3 | Dashboard-forward marketing — the product IS the marketing | Samsara, v0 | Marketing-heavy sites underperform when the product is genuinely good. Show it. | clueslondon.com landing page surfaces the live workspace + a sandboxed demo workflow, not a hero-image-and-feature-list page. | 📋 (Session 28 landing-page work) |

### K · Onboarding + permission

| # | Feature / pattern | Where seen | Why it works | Olivia incorporation | Status |
|---|---|---|---|---|---|
| K1 | Minimalist onboarding — install → first action with zero friction | MultiOn, Sierra, Linear | Users abandon apps that demand 5-step setup before showing value. | Default workspace tiles ship pre-populated with sample data; user can start interacting before they have an account. Supabase auth gate fires when they try to save. | 🔧 |
| K2 | Visual permission / consent prompts before action | MultiOn | Trust-building. AI agents acting on user data need explicit consent UI, never silent. | Confirmation modal pattern (§9.0 Vercel-rule "Confirm destructive actions or provide Undo"). Olivia explicitly asks before: pushing to calendar, placing a call, generating a report, regenerating a saved verdict. | ✅ |
| K3 | Immediate time-to-value — UI gets out of the way | Vercel v0 (prompt box first), Lindy | The first frame should already be productive. | clueslondon homepage = workspace canvas with sample tiles + Olivia chat ready; cluesintelligence homepage = "begin questionnaire" + sample-persona preview. No splash screens, no marketing modals. | 📋 |

### L · Accessibility + WCAG / APCA / Vercel rules

| # | Feature / pattern | Where seen | Why it works | Olivia incorporation | Status |
|---|---|---|---|---|---|
| L1 | WCAG 2.2 AA strict compliance | Hippocratic AI, Nabla, Vercel WIG | Healthcare and finance both require it. Procurement audits depend on it. | The full §9 accessibility floor. AAA where it costs nothing. | ✅ |
| L2 | APCA over WCAG 2 contrast | Vercel WIG | WCAG 2 contrast formula is from CRT-era research. APCA is what WCAG 3 will adopt. Used internally by Vercel and Apple. | All tokens tuned to APCA Lc ≥ 75 for body text (§9.2). WCAG 2.2 AA reported externally for institutional reasons. | ✅ |
| L3 | `:focus-visible` over `:focus` | Vercel WIG, Linear | Mouse clicks shouldn't paint focus rings on top of visible click targets. | Already adopted (§9.3). Aurum-gold ring 2px solid + 2px offset. | ✅ |
| L4 | `touch-action: manipulation` on every interactive control | Vercel WIG | Removes the iOS double-tap-zoom 320ms delay. Free latency win. | Added to button / input primitives (§9.1 Vercel-rules table). | ✅ |
| L5 | `<input>` font-size ≥ 16px on mobile | Vercel WIG | Anything smaller triggers iOS auto-zoom on focus → common WCAG-AA failure. | Enforced at the Input primitive level (§9.1). | ✅ |
| L6 | `overscroll-behavior: contain` on modals + drawers | Vercel WIG | Prevents background-scroll bleed when modal scrolls to its end. | Adopted on Modal primitive (§9.1). | ✅ |
| L7 | Never `transition: all` | Vercel WIG | Causes silent layout-thrash bugs (every browser-internal property change becomes a transition target). | Lint rule + reviewed on every PR. Always enumerate properties (§9.1). | ✅ |
| L8 | Minimum loading-state duration 300–500 ms | Vercel WIG | Prevents the "skeleton-flicker on fast networks" anti-pattern. | Loading-state util that holds the skeleton for at least 300ms or skips it entirely. Used by every async data primitive. | ✅ |
| L9 | "Don't ship the schema" — `aria-label` mandatory on icon-only controls | Vercel WIG, Linear | Visual labels can be omitted, but the DOM must always be readable. | Lint rule on Button primitive. CI fails build if an icon-only button lacks `aria-label`. | ✅ |
| L10 | Confirm destructive actions OR Undo with safe window | Vercel WIG, Linear | Irreversible operations need either a confirm-step or an Undo-toast. | Standard pattern across all primitives (§9.1, §10). | ✅ |
| L11 | Forced-colors / Windows High Contrast respect | Linear, Microsoft | Don't paint over OS overrides. | Border + outline colors use `currentColor` + semantic tokens; OS recolors them appropriately (§9.7). | ✅ |
| L12 | Trust-building clinical typography | Hippocratic | Healthcare context demands trust before features. | Geist Sans + Source Serif 4 (display) — clean, considered, never stylized for its own sake. Apply esp. to HEARTBEAT (heart-recovery). (§2.1, §10.5 future). | 🔧 |
| L13 | Drop Vercel's published `AGENTS.md` into the repo so Claude Code applies these rules during component generation | Vercel WIG (the doc was built for this) | Highest-leverage 30-minute drop-in: improves every future Claude-Code-generated component without manual review. | **Action item — do this in the next commit.** Place at `D:\Olivia Brain\AGENTS.md` (root) so any tool runner sees it. (§3 below.) | 🔧 (very-near-term) |

### M · Brand voice + communication

| # | Feature / pattern | Where seen | Why it works | Olivia incorporation | Status |
|---|---|---|---|---|---|
| M1 | Clear value proposition in hero — no buzzwords | EliseAI, Vercel v0 | Affluent users are skeptical of "AI" / "agentic" / "autonomous." Tell them what it does in 12 words. | Landing-page copy guideline: "Olivia helps [user] do [thing] in [domain]" — never "leverage AI to streamline." Apply to every product's hero. | 📋 (Session 28) |
| M2 | Safety-first messaging where it matters | Hippocratic, Suki, Viz.ai | Medical-adjacent surfaces need trust before features. | HEARTBEAT (heart-recovery) hero leads with safety, evidence, clinician-validation; never with feature density. | 🔧 (when HEARTBEAT lands, priority 6) |
| M3 | Single-line role definitions, not feature lists | Sully.ai | "Olivia: she walks you through every field of every report" beats "AI-powered conversational guidance for relocation reports." | Agent-card pattern (§8.2 / §10): one-line role + AvatarOrb + state. Never a bullet list. | 🔧 |

---

## 2. What we explicitly do NOT steal — honest critique

| # | Pattern | Where it appears | Why we reject |
|---|---|---|---|
| N1 | "Just light mode" — Abridge, Lofty, Salesforce-default, EliseAI marketing | These work for their audiences (clinicians scanning records, real-estate marketing pages, enterprise procurement). | **Olivia is dark-first.** Dark-first matches our affluent-financial / late-night-research / OLED-mobile audience. Light mode ships only as an opt-in print/accessibility variant (§11.3). |
| N2 | Heavy animated background orbs / gradients across the entire dashboard | Grok's "Glassmorphism 2.0" suggestion; many "AI-tech" landing pages | Distraction over content. Reserved for landing pages and verdict moments only — not the workspace canvas where the user is reading data (§4.3, B3 above). |
| N3 | Glassmorphism painted on every panel | Several "premium SaaS" templates | Kills GPU on lower-end machines, competes with Sterling 4D depth, fights with text contrast. Glass = floating overlays only (§4.3). |
| N4 | Node-based workflow builder for end users | Lindy, n8n, Relevance AI | **Olivia is agentic.** The user shouldn't have to compose flows — Olivia composes them. Admin-side flow editor is fine (post-launch). The user-facing experience is conversational + workspace. |
| N5 | Stylized display-font-everywhere look | Some Awwwards Sites of the Year | Display fonts at small sizes hurt legibility at the affluent-data-density bar. Display font reserved for verdict moments (§2.1). |
| N6 | Marketing-heavy landing-page-as-product-demo | Many SaaS sites | The product IS the marketing (J3 above). The landing page surfaces the workspace. |
| N7 | Pure-black canvas | Some "OLED dark" themes | Banding on cheap monitors; OLED savings are marginal at our use case. Use `--canvas-base #050B15` (§1.1). |
| N8 | "Diagnostic capability" claims for HEARTBEAT | (Mentioned by Hippocratic as something they explicitly don't claim) | We're recovery tracking, not diagnosis. Match Hippocratic's discipline. |
| N9 | Light visual style on real-estate marketing | Lofty | Conflicts with our established dark/glass identity. Real-estate users moving from one app to another notice the inconsistency. |
| N10 | Linear's near-flat aesthetic (almost zero glassmorphism) | Linear | Steal their token discipline (LCH, 3-input themes, soft borders, reduce visual noise). **Don't** copy their visual style — Sterling 4D + targeted glass overlays is our differentiator. |

---

## 3. Action items — ordered smallest-to-largest (sign-off requested)

Per the standing rule "no code changes without permission," the items below are queued behind your sign-off. Smallest / highest-leverage first.

### Action 1 · Drop `AGENTS.md` (Vercel's spec) + CLUES addendum into the repo root

- **Effort:** ~30 minutes.
- **Why:** Highest-leverage drop-in. Every future component Claude Code generates will obey Vercel's accessible-dark-mode rules without manual review.
- **Where:** `D:\Olivia Brain\AGENTS.md` (root) + a CLUES-specific addendum referencing `01_UI_DESIGN_SYSTEM.md` tokens.
- **Status:** Awaiting approval.

### Action 2 · Build a self-contained `<DualCityCompare>` mockup

- **Effort:** 1 session (~2 hours).
- **Why:** The single primitive that powers all 23 cluesxscore modules. Building it once in isolation surfaces every layout, accessibility, and motion problem before we commit to the package extraction. Two cities, 100 metrics, delta column, tabular nums, score radar, Olivia narrative slot.
- **Format:** Self-contained HTML artifact in `examples/dual-city-compare.html` so you can view it without touching the build.
- **Status:** Awaiting approval.

### Action 3 · Draft `@olivia/design-system` package spec

- **Effort:** 1 session (~3 hours).
- **Why:** Extracts the design system from Olivia Brain into a publishable package consumed by clueslondon.com, cluesintelligence.com, every cluesxscore module, white-label deployments, HEARTBEAT, etc. **The mechanism that makes "reconfigurable" actually true.**
- **Deliverable:** `docs/03_DESIGN_SYSTEM_PACKAGE_SPEC.md` — file structure, token contracts, primitive APIs, exports. Ready for a future session to build against.
- **Status:** Awaiting approval.

### Action 4 · WCAG 2.2 AA + APCA audit on existing surfaces

- **Effort:** 1–2 sessions, depending on surface count.
- **Why:** Before extracting to the package, verify the existing components (LiveAvatar, Phase1Studio at `/`, the chat UI, admin pages) meet the floor. Surface any violations and remediate before they propagate to consumers.
- **Deliverable:** `docs/04_ACCESSIBILITY_AUDIT_2026-05-03.md` — per-surface findings, severity, remediation patches.
- **Status:** Awaiting approval. Requires either a Vercel preview URL (if `npm run dev` is on) or rendered HTML/component source paste.

---

## 4. The mandate (carries over from `01_UI_DESIGN_SYSTEM.md` § 12)

This matrix exists so we **never reinvent**, **never accidentally regress**, and **never hire-by-mistake** a competitor when the right move is to absorb their pattern. When a new product joins the bicycle wheel (`00_PRODUCT_TRUTH.md`), the team:

1. Consults this matrix for relevant patterns.
2. Extends `01_UI_DESIGN_SYSTEM.md` if the new product needs a primitive not yet covered.
3. **Never** silently invents a one-off UI; always extends the system.

When a competitor ships a meaningful new pattern, the team:

1. Adds a row here with the same column structure.
2. Decides ✅ / 🔧 / 📋 / ❌ status.
3. If ✅ or 🔧, edits `01_UI_DESIGN_SYSTEM.md` accordingly.
4. **Never** absorbs a pattern without writing it down here first.

The point of this doc is the same as `00_PRODUCT_TRUTH.md`: institutional memory that survives 30+ Claude Code sessions intact.
