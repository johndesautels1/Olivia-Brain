# Studio Port Manifest — Olivia Brain

> File-level inventory of every Studio source we're pulling into this repo, what it does, and the per-file port plan.
>
> **Three sources:**
> - **Studio v1 (engine)** — `D:\London-Tech-Map\src\components\studio\` + `src\lib\studio\` + `src\components\documents\`. The original full-featured Studio with question engine, document workspace, entity modes, deep research, Bayesian priors, consistency flags. The "fucking hideous UI" is this layer's chrome.
> - **Studio v2 (wrapper)** — `D:\London-Tech-Map\src\components\studio\StudioOlivia*.tsx` + the StudioTopBar/BottomBar/QuestionCard/Voice/Formatting components. Newer glassmorphic skin that wraps v1. PreparationStudio composes both. Some features are useful, the layout is not.
> - **Studio v3 (prototypes)** — `D:\Studio-Olivia\` (3 single-file React prototypes). `StudioOliviaGrandMaster (2).jsx` is the design north star (`STUDIO_OLIVIA_DESIGN.md` describes it in detail). The other two are alternative explorations; not authoritative.
>
> **Hard rule:** every source LTM file is **read-only**. We copy content, never modify the LTM source. See `BUILD_SEQUENCE.md` § Standing rules.
>
> **Port plan codes:**
> - **PORT** — copy as-is into Olivia Brain at the equivalent path; minor import path adjustments only.
> - **PORT+ADAPT** — copy then re-wire data deps to bridge providers / Olivia Brain APIs.
> - **REPLACE** — drop the v1 implementation and rebuild from the GrandMaster prototype.
> - **REFERENCE** — read for context but don't import; design ideas only.
> - **SKIP** — out of scope for the merge (LTM-specific or superseded).

---

## A. Studio v1 — The Engine

These are the engine and integration components from `D:\London-Tech-Map\src\components\studio\`. PreparationStudio is the orchestrator that mounts the rest. Everything in this section ports because the engine is what we want; only the layout chrome around it gets replaced in Track C.

| File | LOC est. | Role | Port plan |
|------|----------|------|-----------|
| `PreparationStudio.tsx` | ~900 | Main orchestrator. Composes top bar + center stage (Olivia avatar + chat + question card) + bottom bar. Owns the question sequencer, navigation (J/K, prev/next, jump), answer capture → block update → autosave with debounce, gold-border save pulse, stage-and-spotlight dimming. | **PORT+ADAPT** — replace the v1 layout chrome with the GrandMaster three-region shell. Engine inside stays. |
| `StudioAnswerEditor.tsx` | ~400 | Rich-text editor with slash commands, inline formatting, voice insertion. | **PORT** |
| `StudioFormattingToolbar.tsx` | ~200 | Bold / italic / list / link / quote toolbar above the editor. | **PORT+ADAPT** — restyle to GrandMaster glass tokens. |
| `StudioQuestionCard.tsx` | ~300 | Renders one `QuestionState` with prompt, help text, suggestions, priors, consistency flags, current answer. | **PORT+ADAPT** — restyle. |
| `SuggestionChips.tsx` | ~150 | Horizontal chip list of `Suggestion[]` with confidence-tier coloring (5 tiers). | **PORT** |
| `WhyThisPanel.tsx` | ~200 | Collapsible explainer for "why is this question being asked?" — surfaces priors, entity emphasis, impact score. | **PORT** |
| `PitchPolishModal.tsx` | ~400 | Modal that takes the current answer and runs an Anthropic rewrite for a chosen tone (investor / press / customer). | **PORT+ADAPT** — re-point the Anthropic call to Olivia Brain's cascade. |
| `DeepResearchPanel.tsx` | ~500 | Tavily/web-search panel with citations and summary insertion. | **PORT+ADAPT** — re-point to `lib/services/tavily.ts`. |
| `ResearchHistory.tsx` | ~150 | Side panel listing past research queries for the current document. | **PORT** |
| `EntityBriefCard.tsx` | ~180 | Card summarising the target entity's `keyQuestions` and Cristiano briefing for the current document. | **PORT** |
| `EntityPerspectiveModal.tsx` | ~350 | Modal for switching `EntityType` (VC / Accelerator / Acquirer / Angel / Corporate / general); rewires `EntityMode` selection. | **PORT+ADAPT** — surface alongside the prototype's investor-persona picker per `MERGE_PLAN.md` § Q5. |
| `MicroReward.tsx` | ~120 | Confetti/sparkle micro-animation on completion. | **PORT** |
| `SkipNudgeModal.tsx` | ~180 | Friction modal when the user tries to skip an essential question. | **PORT** |
| `CompletionCeremony.tsx` | ~250 | End-of-session summary with streak, time spent, completion %. | **PORT** |
| `DocumentTransition.tsx` | ~150 | Animated transition between consecutive documents in a package flow. | **PORT** |
| `PreSubmitCheck.tsx` | ~300 | Pre-submission validation: lists empty essential fields + consistency conflicts, blocks submission until acknowledged. | **PORT** |
| `CristianoReEvaluation.tsx` | ~250 | UI for triggering a Cristiano (Opus judge) re-evaluation of the document after edits. | **PORT+ADAPT** — re-point judge call to Olivia Brain `/api/judge`. |
| `AnswerRibbon.tsx` | ~200 | Horizontal strip showing answered/empty/skipped status across all questions in the doc. | **PORT** |
| `StoryReview.tsx` | ~300 | Final narrative review screen showing the document as a coherent story. | **PORT** |

**Total v1 engine: ~5,180 LOC. All ports during Sessions 7–8.**

---

## B. Studio v2 — The Wrapper

Newer components built to skin v1 with glassmorphic chrome. Several are reusable; the wrapping layout is replaced by the GrandMaster shell.

| File | LOC est. | Role | Port plan |
|------|----------|------|-----------|
| `StudioTopBar.tsx` | ~250 | 64px sticky glassmorphic top bar with crumbs, document title, save indicator. | **REPLACE** — superseded by GrandMaster header (AvatarOrb + score chips + Match/Export). |
| `StudioBottomBar.tsx` | ~250 | 56px sticky bottom bar with prev/next + jump + streak + session timer. | **REPLACE** — bottom bar functionality folded into the GrandMaster three-region layout. Streak + timer move into the right-pane Olivia tab. |
| `StudioOliviaAvatar.tsx` | ~180 | Wraps `OliviaVideoAvatar` in a 240px / 120px circular frame with breathing/pulse animations and `hideOverlays={true}`. | **PORT+ADAPT** — keep the circular wrapping pattern; restyle frame to GrandMaster's AvatarOrb tokens. |
| `StudioOliviaChat.tsx` | ~200 | Compact two-way chat below the avatar showing the last 3 messages. Auto-scroll, document-context injection. | **PORT+ADAPT** — keep the structural pattern (last-3 messages, glass bubbles); re-point sendMessage to Olivia Brain's `/api/olivia/chat`. |
| `StudioVoiceInput.tsx` | ~250 | Browser mic capture + waveform + VAD. | **PORT** — Track E (Session 17) wires this to `/api/voice/transcribe`. |
| `StudioVoiceCommands.tsx` | ~200 | Voice-command interpreter ("next", "skip", "polish", etc.). | **PORT** |
| `StudioTTSPlayer.tsx` | ~150 | TTS playback for Olivia's chat replies (parallel to LiveAvatar lip-sync). | **PORT+ADAPT** — re-point to `/api/voice/synthesize`. |
| `StudioKeyboardShortcuts.tsx` | ~180 | Hook + cheatsheet modal for J/K/?/Esc/etc. | **PORT** — extend with the prototype's J/K nav semantics. |

**Total v2 wrapper: ~1,660 LOC. Mix of ports and replacements during Sessions 8–14.**

---

## C. Document Workspace + 17 Block Types

`D:\London-Tech-Map\src\components\documents\`. The document workspace is the lower layer that PreparationStudio renders. Block types are the renderable atoms.

### C.1 Workspace shell (10 files, ~3,500 LOC)

| File | Role | Port plan |
|------|------|-----------|
| `DocumentWorkspace.tsx` | Top-level container; defines `WorkspaceBlock` type + `EditableField` type used across the studio. | **PORT** — this is the data spine. |
| `DocumentRenderer.tsx` | Routes a `WorkspaceBlock` to its block-type component. | **PORT** |
| `DocumentEditor.tsx` | Edit mode for a document; mounts inline DocumentFieldEditor for each block. | **PORT** |
| `DocumentBody.tsx` | Static-render body for a document (the rendered output, not the editor). | **PORT** |
| `DocumentFieldEditor.tsx` | Per-field editor (text / number / select / date / multi-text / table). | **PORT** |
| `DocumentActionBar.tsx` | Header action bar (Save / Bookmark / Add to Package / Print). | **PORT+ADAPT** — restyle. |
| `DocumentFilters.tsx` | Filter bar for the documents index (by type / collection / readiness). | **PORT** |
| `DocumentCard.tsx` | List/grid card preview of a document. | **PORT** |
| `DocumentSourcePanel.tsx` | Side panel surfacing the document's source data (DNA paragraphs, valuations, entity briefs). | **PORT+ADAPT** — re-point to bridge providers. |
| `DocumentTemplatePreview.tsx` | Preview of a document template (used in `/documents/new`). | **PORT** |

### C.2 Quick view + supporting (7 files, ~1,200 LOC)

| File | Role | Port plan |
|------|------|-----------|
| `DocumentQuickView.tsx` | Modal / drawer quick preview. | **PORT** |
| `DocumentQuickViewProvider.tsx` | Context provider for quick view open/close. | **PORT** |
| `BookmarkButton.tsx` | Toggle bookmark, persists via API. | **PORT+ADAPT** — re-point to Olivia Brain bookmark route. |
| `PrintButton.tsx` | Triggers print dialog with document-specific styles. | **PORT** |
| `OrgMapProvider.tsx` | Context for embedding the LTM org map inside documents. | **REFERENCE** — LTM-specific; only relevant in embedded mode. |
| `WorkspaceOliviaPanel.tsx` | Side panel mounting Olivia chat inside the workspace. | **PORT+ADAPT** — replaced by the GrandMaster right-pane Olivia tab. |
| `AddToPackageButton.tsx` | Button surface for `SaveToPackageModal`. | **PORT** |

### C.3 Package flow (3 files, ~600 LOC)

| File | Role | Port plan |
|------|------|-----------|
| `SaveToPackageModal.tsx` | Modal for adding the current doc to a Package (outreach bundle). | **PORT+ADAPT** — re-point to Olivia Brain package routes once they exist. |
| `PackageProgressBar.tsx` | Progress strip showing % complete across the documents in a package. | **PORT** |

### C.4 The 17 block types (`components/documents/blocks/*`, ~3,800 LOC)

These render document content. All ports.

| Block | Purpose | Port plan |
|-------|---------|-----------|
| `HeroBlock.tsx` | Doc cover (title, tagline, hero image / gradient). | **PORT** |
| `SectionBlock.tsx` | Section header + collapsible group. | **PORT** |
| `ParagraphBlock.tsx` | Body paragraph (markdown). | **PORT** |
| `ListBlock.tsx` | Bulleted / numbered list. | **PORT** |
| `CalloutBlock.tsx` | Highlighted callout (info / warning / success / danger). | **PORT** |
| `QuoteBlock.tsx` | Pull-quote with attribution. | **PORT** |
| `DividerBlock.tsx` | Horizontal rule with optional label. | **PORT** |
| `TableBlock.tsx` | Simple data table. | **PORT** |
| `ComparisonTable.tsx` | Two-column comparison table. | **PORT** |
| `BarChartBlock.tsx` | Inline bar chart (no chart lib — pure SVG). | **PORT** |
| `PieChartBlock.tsx` | Inline pie chart (pure SVG). | **PORT** |
| `MetricCardsBlock.tsx` | 2x2 / 3x1 metric tiles. | **PORT** |
| `StatCard.tsx` | Single metric card primitive. | **PORT** |
| `TeamCard.tsx` | Founder / team profile card. | **PORT** |
| `TimelineBlock.tsx` | Vertical timeline. | **PORT** |
| `ProductCard.tsx` | Product summary card. | **PORT** |
| `LogoBanner.tsx` | "As seen in / customers / investors" logo strip. | **PORT** |
| `FooterBlock.tsx` | Doc footer (copyright, contact, page nav). | **PORT** |

**Note: that's 18 block types, not 17 as the SESSION_LOG estimated.** Inventory confirmed by file glob. `SaveToPackageModal` was being conflated as a block elsewhere; it's not, it's package-flow.

### C.5 App routes (7 files, ~1,000 LOC)

`D:\London-Tech-Map\src\app\documents\`.

| Route | Purpose | Port plan |
|-------|---------|-----------|
| `documents/page.tsx` | Documents index. | **PORT+ADAPT** — re-point Prisma queries to bridge. |
| `documents/saved/page.tsx` | User's bookmarked docs. | **PORT+ADAPT** |
| `documents/new/page.tsx` | New-document wizard. | **PORT+ADAPT** |
| `documents/[id]/page.tsx` | Document detail (read mode). | **PORT+ADAPT** |
| `documents/[id]/edit/page.tsx` | Document edit mode (alternative to studio). | **PORT+ADAPT** |
| `documents/[id]/workspace/{page,layout,DocumentWorkspaceClient}.tsx` | Workspace shell. | **PORT+ADAPT** |
| `documents/[id]/studio/{page,layout,PreparationStudioClient}.tsx` | Studio shell. | **PORT+ADAPT** — this is the route that replaces the GrandMaster `/studio` route. |
| `documents/loading.tsx` + `documents/error.tsx` | Loading / error UI. | **PORT** |

**Total Documents subsystem: ~10,100 LOC including app routes. All ports during Session 7.**

---

## D. lib/studio (3 files, 616 LOC)

`D:\London-Tech-Map\src\lib\studio\`.

| File | Role | Port plan |
|------|------|-----------|
| `types.ts` | Core data types: `QuestionState`, `Suggestion`, `BayesianPrior`, `ConsistencyFlag`, `EngagementMetrics`, `SessionMetrics`, `StudioConfig`. | **PORT** — these are the spine of the engine. |
| `entityModes.ts` | 6 entity modes (VC / Accelerator / Acquirer / Angel / Corporate / general) with priority blocks, supplementary blocks, persona hints, key questions, tone label. | **PORT** — coexists with the prototype's 5 investor personas per `MERGE_PLAN.md` § Q5(a). |
| `questionMapper.ts` | Pure functions: `mapBlocksToQuestions()`, `applyAnswerToBlocks()`, `computeCompletionFromQuestions()`. | **PORT** |

---

## E. Studio v3 — Standalone JSX Prototypes (`D:\Studio-Olivia\`)

Three single-file React prototypes the user has accumulated. **Design north star, not code source.**

| File | Size | Role | Port plan |
|------|------|------|-----------|
| `StudioOliviaGrandMaster (2).jsx` | ~95 KB / ~3K logical LOC | The authoritative design. Self-described "STUDIO OLIVIA v3.2 — GRAND MASTER BUILD". Fully self-contained React with inline-style, 5 themes, 75 deck archetypes, 12 templates, 14 frameworks, 16 plan sections, persona axes, score chips HUD, J/K nav, audit log, library scoring. | **REFERENCE** — `STUDIO_OLIVIA_DESIGN.md` already encodes this in 339 lines. Track C rebuilds the UI matching this prototype. |
| `ClaudeDesktopVersionStudioOlivia.jsx` | ~80 KB | Earlier desktop-style exploration. Some unique ideas, but superseded by GrandMaster. | **REFERENCE** — read once for design lineage; do not port code. |
| `GrokVersionStudioOlivia.tsx` | ~85 KB | Grok-AI-generated alternative. Different shell, similar feature set. | **REFERENCE** — same; do not port code. |

**Imaginary backend warning.** Every Anthropic call in these prototypes uses the browser-side `fetch("https://api.anthropic.com/...")` pattern with no auth header — they would CORS-fail in a real browser. The Track C rebuild replaces every such call with an Olivia Brain API route that proxies through the cascade.

**Persistence shim warning.** The prototypes call `window.storage.{get,set,delete}` which is an Anthropic artifact-runtime affordance and not a real browser API. Track C replaces with `localStorage` for client state and Supabase for server state.

---

## F. Cross-cutting: features the merge keeps

Features worth preserving across all three sources, with which source is canonical:

| Feature | Canonical source | Port plan |
|---------|------------------|-----------|
| Question engine (Bayesian priors, consistency flags, suggestion chips, impact scoring) | Studio v1 | PORT |
| 6 entity modes (VC / Accelerator / Acquirer / Angel / Corporate / general) | Studio v1 (`entityModes.ts`) | PORT — coexists with prototype's 5 investor personas |
| 5 investor personas (Angel / Seed VC / Series A / Strategic / Buyout) | Studio v3 prototype | PORT — coexists with v1 entity modes |
| Deep research panel + research history | Studio v1 | PORT, re-point to Tavily |
| Pitch polish modal (rewrite for tone) | Studio v1 | PORT, re-point to cascade |
| Cristiano re-evaluation | Studio v1 | PORT, re-point to `/api/judge` |
| Pre-submit validation | Studio v1 | PORT |
| Story review screen | Studio v1 | PORT |
| Voice input + voice commands + TTS playback | Studio v2 | PORT, wired in Session 17 |
| Streak counter + session timer | Studio v2 (in Bottom Bar) | PORT, surface in right-pane Olivia tab |
| Three-region layout (header / left / center / right) | Studio v3 prototype | REPLACE v1+v2 chrome |
| AvatarOrb visual identity (orange→purple→pink gradient) | Studio v3 prototype | REPLACE — used in header + sidebar pad + Olivia tab |
| Score chips HUD (CLR / IMP / MOT / ALL, mono-numeric) | Studio v3 prototype | REPLACE — header right side |
| 75-archetype Library + DeckDetailModal + apply-archetype | Studio v3 prototype | NEW BUILD — use prototype data, real backend wiring |
| 12 business plan templates | Studio v3 prototype | NEW BUILD |
| 14 frameworks panel | Studio v3 prototype | NEW BUILD |
| 5 London themes | Studio v3 prototype | NEW BUILD |
| Audit tab | Studio v3 prototype | NEW BUILD — pull `admin_audit_logs` |
| Light-themed Preview tab | Studio v3 prototype | NEW BUILD |
| 17 (actually 18) document block types | Studio v1 (Documents) | PORT |
| Document workspace + per-block field editor | Studio v1 (Documents) | PORT |
| Package flow (SaveToPackage, PackageProgressBar) | Studio v1 (Documents) | PORT, re-point to Olivia Brain package routes |

---

## G. Cross-cutting: features we deliberately drop

| Feature | Why dropped |
|---------|-------------|
| Studio v1's hideous layout chrome | Replaced by GrandMaster shell. |
| Studio v2's TopBar + BottomBar | Functionality folded into GrandMaster header + right-pane. |
| Studio v3 prototype's `window.storage` shim | Not a real API; replaced with localStorage + Supabase. |
| Studio v3 prototype's no-auth Anthropic calls | Replaced with Olivia Brain API routes. |
| Studio v1's LTM-specific data dependencies (org map, district detail mounts) | Out of scope for standalone Olivia Brain; will be re-added via bridge providers when Olivia is embedded back into LTM. |
| `OrgMapProvider.tsx` | LTM-specific; only relevant in embedded mode. |

---

## H. Track-by-track porting checklist

| Track | Sessions | Files touched | Reference for diffing |
|-------|----------|--------------|----------------------|
| B (engine port) | 7–8 | All of section A + section C + section D | This manifest + `STUDIO_OLIVIA_DESIGN.md` for inline-style targets |
| C (UI rebuild) | 9–14 | All of section E (REFERENCE only); restyle / replace from sections A + B | `STUDIO_OLIVIA_DESIGN.md` |
| D (Studio ↔ brain wiring) | 15–16 | Re-point Anthropic calls in PitchPolishModal, DeepResearchPanel, CristianoReEvaluation; new pitch routes | `MERGE_PLAN.md` § 4 Phase 3 |

---

## I. Version pin

This manifest reflects LTM HEAD as of 2026-05-02. If LTM gains new Studio components after that date, this doc is out-of-date. Re-glob `D:\London-Tech-Map\src\components\studio\` and `D:\London-Tech-Map\src\components\documents\` before any Track B session and update this file in-place.

**Sacred:** `BUILD_SEQUENCE.md`, `BOOTSTRAP.md`, this file. Never delete; update in place.
