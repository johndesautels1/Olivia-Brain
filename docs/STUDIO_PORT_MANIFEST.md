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

---

## J. Map subsystem (added 2026-05-03 — Session 7 actual deliverable)

LTM map subsystem is **state of the art** (user confirmation 2026-05-03) and ports byte-for-byte. Self-described as "flawless." Picked up Session 7 after the documents-subsystem port hit deeper-than-manifest entanglement (see § K).

### J.1 LTM map files (24 total)

| File | LOC est. | Role | Port plan |
|------|----------|------|-----------|
| `components/map/GoogleMap3DView.tsx` | ~1,200 | **Primary view** — Photorealistic 3D Google Maps. Loaded first; falls back to GoogleMapView if 3D Tiles aren't enabled on the API key. | **PORT** ✅ (Session 7) |
| `components/map/GoogleMapView.tsx` | ~900 | Standard Google Maps with markers + clustering. Fallback when 3D unavailable. | **PORT** ✅ |
| `components/map/MapView.tsx` | ~280 | Mapbox-based fallback when no Google Maps key is present. | **PORT** ✅ |
| `components/map/MapAppointmentsContext.tsx` | ~200 | Context for map ↔ calendar event coordination. | **PORT** ✅ |
| `components/map/constants.ts` | ~110 | `MAP_DEFAULTS`, `SCORE_BLOB_COLORS`, `VIEW_PRESETS`, `sectorColor`, `ALL_SECTORS`, `ORG_TYPE_LABELS`. | **PORT** ✅ |
| `components/map/types.ts` | ~25 | `MapOrg`, `MapVideo`, `ClusterClickState`. | **PORT** ✅ |
| `components/map/controls/CategoryFilterPanel.tsx` | ~250 | Category filter UI with `CategoryKey` enum + `ALL_CATEGORIES`. | **PORT** ✅ |
| `components/map/controls/DraggableMapControls.tsx` | ~200 | Floating draggable control cluster. | **PORT** ✅ |
| `components/map/controls/LayerPanel.tsx` | ~140 | Layer-toggle panel (Mapbox path). | **PORT** ✅ |
| `components/map/controls/MapSearchBar.tsx` | ~400 | Address autocomplete via Google Places. | **PORT** ✅ |
| `components/map/controls/SectorFilterBar.tsx` | ~40 | Sector chip strip. | **PORT** ✅ |
| `components/map/controls/StatsPanel.tsx` | ~25 | Top-right stats card. | **PORT** ✅ |
| `components/map/controls/ViewPresetButtons.tsx` | ~25 | Preset camera-view buttons. | **PORT** ✅ |
| `components/map/data/district-boundaries.ts` | ~230 | London district boundary polygons. | **PORT** ✅ |
| `components/map/hooks/useClusterInteraction.ts` | ~50 | Cluster click + zoom hook (Mapbox). | **PORT** ✅ |
| `components/map/hooks/useMapData.ts` | ~95 | Fetches `DistrictWithStats[]` via SWR. | **PORT** ✅ |
| `components/map/hooks/useMapLayers.ts` | ~500 | Adds + manages Mapbox layers + sources. | **PORT** ✅ |
| `components/map/overlays/ClusterCardGrid.tsx` | ~85 | Cluster contents grid card. | **PORT** ✅ |
| `components/map/overlays/MapLegend.tsx` | ~80 | Score-blob legend. | **PORT** ✅ |
| `components/map/overlays/StreetViewModal.tsx` | ~310 | Street-view + org detail modal. Uses `ExternalLinkFrame`. | **PORT** ✅ |
| `app/map/page.tsx` | ~55 | Server entry; reads `NEXT_PUBLIC_GOOGLE_MAPS_KEY` + `NEXT_PUBLIC_MAPBOX_TOKEN`; 3-tier vendor fallback. | **PORT** ✅ |
| `app/map/loading.tsx` | ~13 | Route loading UI. | **PORT** ✅ |
| `app/map/MapPageClient.tsx` | ~55 | Client wrapper with `next/dynamic` imports for the 3 view variants. | **PORT** ✅ |

### J.2 Transitive deps the manifest didn't initially capture

| Path | What | Port plan |
|------|------|-----------|
| `src/types/index.ts` | LTM types barrel — `DistrictWithStats`, `TechGravityInput`, `TechGravityResult`. Imported by `useMapData`, `useMapLayers`. | **PORT** ✅ |
| `src/components/ExternalLinkFrame.tsx` | LTM utility — `ExternalOverlayProvider` (context + iframe overlay) + `ExternalLinkFrame` (link replacement). 403 LOC. Imported by `StreetViewModal`. | **PORT** ✅ |

### J.3 npm packages installed for the map port

| Package | Why | Type |
|---------|-----|------|
| `mapbox-gl` | Used by `MapView`, `useMapLayers`, `useClusterInteraction`, `ViewPresetButtons`, `ClusterCardGrid`, `constants` | runtime |
| `@googlemaps/js-api-loader` | Used by `GoogleMap3DView`, `GoogleMapView`, `MapSearchBar` | runtime |
| `@types/google.maps` | Global `google.*` namespace for TypeScript (auto-discovery doesn't fire under `moduleResolution: bundler`; reference file `src/types/google.d.ts` triggers load) | dev |

### J.4 Outstanding deferrals from Session 7

| Item | Where | When |
|------|-------|------|
| Wrap `ExternalOverlayProvider` in `src/app/layout.tsx` so `ExternalLinkFrame` clicks open the iframe overlay (currently no-op due to default-context fallback) | `src/app/layout.tsx` | Layout integration session (precedes Track C) |
| Stub `/directory/[slug]/page.tsx` and `/videos/[id]/page.tsx` so map-link clicks don't 404 | `src/app/directory/`, `src/app/videos/` | **Re-framed (2026-05-03):** these are LTM-specific link targets. Per `project_ltm_types_no_speculative_generalization` memory, don't stub speculatively — wait for per-spoke adapters in Track J/L to define the real link targets. Standalone Olivia map clicks 404 by design until then. |
| Set `NEXT_PUBLIC_GOOGLE_MAPS_KEY` + `NEXT_PUBLIC_MAPBOX_TOKEN` env vars in Vercel | `.env` / Vercel env | Operator action — `NEXT_PUBLIC_*` vars use **All Environments** per `~/CLAUDE.md` (they're designed to be public) |
| Update Track N2 in `BUILD_SEQUENCE.md` to reflect Google Maps primary + Mapbox fallback (was Mapbox-only) | `BUILD_SEQUENCE.md` Track N | Track N planning session |
| Adaptive surface suppression rule: in `clueslondon-prod` tenant, hide Olivia's `/map` route since LTM provides the canonical surface | Tenant config + Studio shell | Track I Session 24 — see `project_olivia_surface_suppression` memory |

### J.5 Data layer is intentionally not ported (added 2026-05-03 — post-port audit)

`useMapData` hook fetches `/api/districts` + `/api/map` — neither exists in Olivia Brain, so the map renders empty until a tenant adapter feeds it. Confirmed correct by user 2026-05-03 + locked in `project_ltm_types_no_speculative_generalization` memory.

| Not ported | Why |
|------------|-----|
| `/api/districts` + `/api/map` API routes | LTM-specific data shape. Building them now bakes in district terminology that cluesintelligence (Track L) will need to discard for cities. |
| 9 LTM Prisma models (Organization, OrganizationCategoryLink, OrganizationRelationship, PersonOrganizationRole, FundingRound, FundingRoundInvestor, DistrictScore, DistrictScoreHistory, DistrictFollow) + `FundingStage` enum | Bicycle-wheel violation — LTM owns the org/district domain. Olivia Brain consumes via `LtmKnowledgeProvider` UKP bridge when needed. |
| `lib/queries/districts.ts` (12 KB) + `lib/queries/district-detail.ts` (12 KB) + `lib/queries/organizations.ts` (28 KB) | Same — LTM-domain Prisma queries |
| 8 cron routes for district-score refresh + organization-data sync | Same — LTM-domain scheduled jobs |
| `app/districts/[slug]/page.tsx` | LTM-specific surface; cluesintelligence will have its own city-detail page |
| `app/api/v1/{districts,organizations}/route.ts` | These are LTM's public bridge endpoints; Olivia Brain CALLS them via `LtmKnowledgeProvider`, doesn't host them |

The map UI is a **structural shell** ported byte-for-byte. Per-vertical data adapters fill it in Track J. Per-vertical type generalization (e.g., `DistrictWithStats` → some union or generic) gets designed in Track L when cluesintelligence has its full data model in front of it.

### J.6 Visual fidelity gap (added 2026-05-03 — post-port styling audit)

The map UI ports byte-for-byte but renders with **partial visual fidelity** because Olivia Brain's design system differs from LTM's:

- **No Tailwind in Olivia Brain.** LTM uses Tailwind extensively (`@tailwind base/components/utilities` in `globals.css` + `tailwindcss` in deps); the 13 ported map files use **223+ Tailwind classes** (`flex items-center`, `text-brand-400`, `bg-[#0a0e1a]`, `text-[var(--muted)]`, etc.) that are **inert** in Olivia Brain — they render as HTML attributes without styling. Olivia Brain's existing surfaces (`/test-avatar`, `/admin`) use inline styles + the custom CSS classes from `globals.css` — Tailwind has never been part of Olivia Brain's design.
- **CSS token names diverge.** LTM has `--background`/`--foreground`/`--card-bg`/`--card-border`/`--accent`. Olivia Brain has `--bg`/`--text`/`--panel`/`--border`/`--gold`. Only `--muted` matches across both. `var(--xxx)` references in the ported files mostly resolve to nothing.
- **Separate `app/design-tokens.css` not ported.** LTM imports it at the top of `globals.css`; Olivia Brain has no such file.

**Decision** (locked 2026-05-03): defer the styling fix entirely. Map UI is a context-dependent shell anyway (per surface suppression rule + no-speculative-generalization memory). Resolution lands in **Track C** (UI rebuild, Sessions 9–14) — adapts ported components to Olivia Brain's design system per `01_UI_DESIGN_SYSTEM.md` (Aurum + Aether tokens, LCH color space, Linear 3-input theming) — OR an explicit "add Tailwind" decision session beforehand.

**Same gap will affect future LTM ports** (calendar Sessions 8–12, possibly documents Session 8+). Track each new gap as it surfaces; track resolution centrally in Track C.

Tracked as **W-011** (Tailwind missing) and **W-012** (token name divergence) in `README.md` Weakness Backlog.

---

## K. Documents subsystem entanglement (added 2026-05-03 — port aborted)

Session 7 originally targeted the documents subsystem per the original deliverable. The port was attempted, then **reverted** after typecheck surfaced deeper LTM coupling than this manifest captured. **Session 8 picks up the documents port with the corrections below.**

### K.1 Manifest deltas — what was missing

The original Section A + Section C + Section D file list was incomplete. Real port also requires:

| Path | What | Why missed |
|------|------|------------|
| `src/types/blocks.ts` | Block prop type definitions (`HeroBlockProps`, `BarChartBlockProps`, `CalloutBlockProps`, etc.) — imported by 12+ block files | Sibling file, not under `components/` |
| `src/lib/autolinker.tsx` | Prose-to-link conversion (entity names → org-map links) — imported by `CalloutBlock`, `ListBlock`, `ParagraphBlock`, `DocumentBody` | Sibling file, not under `components/` |
| `src/lib/documents/content.ts` | Document content metadata helpers — imported by `DocumentCard`, `DocumentEditor`, `DocumentQuickView`, `DocumentSourcePanel` | Sibling file, not under `components/` |

### K.2 OrgMapProvider scope error

Manifest § C.2 marks `OrgMapProvider.tsx` as **REFERENCE** (LTM-specific, skip). Reality: OrgMap is imported by **4 block files** (not the 2 the manifest implies):

- `CalloutBlock.tsx`
- `ListBlock.tsx`
- `ParagraphBlock.tsx` ← not flagged
- `DocumentBody.tsx` ← not flagged

`ParagraphBlock` is the **most-used block type** — deferring it would gut the engine. Session 8 must port `OrgMapProvider` (as either a real port or a no-op stub) — the "REFERENCE / skip" classification is wrong.

### K.3 Other entanglements

| Issue | Affected files | Resolution path |
|-------|----------------|-----------------|
| `@clerk/nextjs` imports | `BookmarkButton.tsx`, `DocumentActionBar.tsx` | Session 8 must precede with a Clerk plan: either pull Track F Session 18 forward, or build a Clerk-stub provider |
| `react-markdown` + `remark-gfm` | `DocumentBody.tsx` | npm install during Session 8 |
| Next 16 typed routes on `/documents/${id}` and `/documents/${id}/edit` strings | `DocumentCard`, `DocumentEditor`, `DocumentFilters`, `PackageProgressBar`, `DocumentActionBar` | `next.config.ts` already has `typedRoutes: false`; stale `.next/types` cache caused false errors during Session 7. Session 8 needs to confirm clean baseline. |
| `DocumentRenderer.tsx` routes to every block — deferring any block breaks the renderer | `DocumentRenderer.tsx` + 18 blocks | Session 8 ports all 18 blocks together OR comments out routes for unported blocks (band-aid) |

### K.4 Recommended Session 8 plan

1. Pull Clerk forward (or stub) before any documents work — gates auth-using files.
2. Port `OrgMapProvider` as a soft-stub component (renders children verbatim, no entity linking) so the 4 blocks unblock.
3. Port the 3 missed LTM utility files (`types/blocks`, `lib/autolinker`, `lib/documents/content`).
4. Install `react-markdown` + `remark-gfm`.
5. Port all 18 blocks + 18 top-level documents files + `DocumentRenderer` together — partial ports break renderer.
6. App route ports (`app/documents/*`, 13 files) defer to Session 9 or Track C.
7. Vitest snapshot tests on the 18 block components (original Session 7 exit criterion).
8. `mapBlocksToQuestions()` round-trip test.

---

## L. Calendar + voice subsystem (added 2026-05-03 — Track Calendar C1–C6 closed)

LTM calendar + voice subsystems were ported across **6 sessions** (C1 → C6, run-rate Sessions 8 → 13). Same byte-for-byte pattern as § J (Map subsystem), with three categories of adaptations: (a) `userProfileId → userId`, (b) LTM-domain Prisma references stripped (Document, AnalysisResult, Event, EventRsvp, Video, Organization), (c) Clerk auth via Option B stub at `src/lib/auth/session.ts`. Per `project_ltm_types_no_speculative_generalization` memory: types like `CalendarEntryWithDetails` stay as-ported until a second non-LTM consumer (cluesintelligence Track L) requires generalization.

### L.1 Schema — calendar foundation (C1: 14 models + 15 enums)

| Model | Notes |
|-------|-------|
| `CalendarEntry` | Primary entry table. cuid → UUID; userProfileId → userId; linkedOrgId/linkedEventId/linkedPersonId FKs dropped (LTM-domain). |
| `CalendarPreferences` | Per-user prefs. |
| `CalendarPrepTask` | Per-entry prep checklist. |
| `CalendarReminder` | Lead-time reminders. |
| `CalendarEntryAttendee` | Attendees. linkedPersonId dropped. |
| `CalendarInteraction` | Olivia ↔ entry interaction history. |
| `CalendarSyncAccount` | Google / Outlook / Calendly OAuth state. |
| `CalendarSyncConflict` | Sync conflict ledger. |
| `CalendarWebhookState` | Webhook subscription tracking. |
| `CalendarMemoryChunk` | pgvector embeddings for semantic search. |
| `CalendarNote` | Notepad notes. |
| `OliviaCalendarRecommendation` | AI-suggested entries. |
| `VoiceTranscriptionLog` | Per-call transcription. |
| `FounderWeek` | Founder-mode behavior summary. |

**Dropped (intentional, LTM-domain — not ported and not stubbed):**
- `DealRoomSession` + `DealRoomMessage` (sales-domain → clues-property-search later if vertical builds)
- `Event`, `EventParticipant`, `EventRsvp`, `EventSeries`, `PackageEvent`, `CascadeEvent` (LTM tech-event modeling — separate concept from personal calendar)

15 enums ported with full value sets: `CalendarCategory` (37 values), `CalendarEntryType`, `CalendarPriority`, `CalendarSyncProvider`, `CalendarSyncDirection`, `CalendarConflictResolution`, `CalendarInteractionType`, `CalendarPrepTaskStatus`, `CalendarAttendeeRsvp`, `CalendarAttendeeRole`, `AttendanceStatus`, `WebhookSubscriptionStatus`, `OliviaRecommendationType`, `OliviaRecommendationUrgency`, `OliviaRecommendationStatus`.

### L.2 Schema — voice + olivia foundation (C3: 9 models)

Added in C3 with the same C1/C2 adaptations + `voiceConversations` reverse relation wired on `CalendarEntry`.

| Model | Notes |
|-------|-------|
| `OliviaConversation` | Multi-turn conversation root. |
| `OliviaMessage` | Per-turn message. |
| `OliviaPresentation` | Olivia-generated presentations (tied to conversations). |
| `OliviaConsent` | Layer 2 GDPR consent (`data_storage`, etc.). |
| `OliviaGuardrail` | Per-user content/PII guardrails. |
| `OliviaUserMemory` | Per-user persistent memory (consent-gated). |
| `VoiceConversation` | Voice-call session. UserProfile FK relation dropped; CalendarEntry FK kept; `generatedDocumentId`/`PackageId` polymorphic strings (no FK). |
| `VoiceContact` | Contacts referenced from voice calls. linkedPersonId dropped. |
| `VoiceActionItem` | Action items extracted from calls. `calendarEntryId` polymorphic. |

SQL migration generated via `prisma migrate diff` at `prisma/sql/02-add-voice-olivia-foundation.sql` (10.5 KB). Operator path is paste-into-Supabase-SQL-Editor (Option B), same as C1.

### L.3 lib/calendar (C2 — 16 of 19 LTM files ported)

| File | Adaptation | Status |
|------|------------|--------|
| `crypto.ts` | byte-for-byte | ✅ |
| `event-categories.ts` | byte-for-byte | ✅ |
| `rrule-expand.ts` | byte-for-byte | ✅ |
| `olivia-schemas.ts` | byte-for-byte | ✅ |
| `olivia-prompts.ts` | byte-for-byte | ✅ |
| `calendar-judge.ts` | byte-for-byte | ✅ |
| `olivia-engine.ts` | byte-for-byte | ✅ |
| `daily-brief.ts` | userProfileId → userId | ✅ |
| `behavior-engine.ts` | userProfileId → userId | ✅ |
| `travel-buffer.ts` | userProfileId → userId | ✅ |
| `calendar-memory.ts` | userId rename + SQL identifier rename + `gen_random_uuid()` (no `::text` cast — UUID column type) | ✅ |
| `google-sync.ts` | userProfileId → userId | ✅ |
| `outlook-sync.ts` | userProfileId → userId | ✅ |
| `olivia-guardrails.ts` | C2: hardcoded defaults; C3: DB integration restored when OliviaGuardrail model landed | ✅ |
| `proximity-cluster.ts` | Only `haversineKm` survives — Organization/Event queries dropped per `project_ltm_types_no_speculative_generalization` | ✅ (trimmed) |
| `index.ts` | barrel adjusted | ✅ |
| `document-aware.ts` | `Document` model — Documents track post-Clerk | ⏸ DEFERRED |
| `founder-journey.ts` | `AnalysisResult` model — Track L | ⏸ DEFERRED |
| `workflow-generator.ts` | `AnalysisResult` model — Track L | ⏸ DEFERRED |

### L.4 lib/voice (C3 — 4 files)

| File | Adaptation | Status |
|------|------------|--------|
| `voice-conversation.ts` | byte-for-byte | ✅ |
| `voice-document.ts` | byte-for-byte | ✅ |
| `voice-prompts.ts` | byte-for-byte | ✅ |
| `voice-memory.ts` | userProfileId → userId | ✅ |

### L.5 lib/olivia tools + supporting (C2 + C3)

| File | Adaptation | Status |
|------|------------|--------|
| `tools.ts` | calendar slice (C2: 2 tools — get_user_calendar, web_search) + memory tools (C3: +get_user_memory, save_user_memory + hasLearningConsent helper) — 4 tools total. The other 22 LTM tools defer to C3/C4/Track L. | ✅ partial (4 of 26) |
| `chat.ts` | C3 slim slice — createConversation / getConversationHistory / getConversationMessages. `processOliviaMessage` NOT ported (depends on code-knowledge layer + Studio context + CristianoShell + `prisma.userProfile` — `/api/olivia/chat` cascade route serves the equivalent). `knowledge-base.ts` NOT ported (no in-scope consumer). | ✅ partial |
| `lib/twilio/client.ts` | byte-for-byte; coexists with pre-existing `lib/twilio/server.ts` | ✅ |
| `lib/elevenlabs/client.ts` | byte-for-byte; coexists with pre-existing `lib/voice/elevenlabs.ts` | ✅ |
| `lib/email/resend.ts` | byte-for-byte | ✅ |
| `lib/system-alerts.ts` | console-only stub (SystemAlert model not in OB schema; **W-016**) | ✅ stubbed |
| `lib/auth/session.ts` | NEW. `getAuthSession()` reads `STUB_USER_ID` env in dev/preview, throws clearly in production. One-line swap when Clerk lands in Track F Session 18 (**W-015**). | ✅ |
| `lib/video/embeddings.ts` | byte-for-byte (C1 — pre-port for memory features) | ✅ |
| `lib/mobile-keyboard.ts` | byte-for-byte (C5) | ✅ |

### L.6 API routes (C4 + C5 — 37 of 45 ported)

**C4 (19 of 21):**
- `call/*` (10): route, audio, extract, gather, inbound, outbound, recording, reminder, status, twiml
- `calls/*` (2): list, [id]
- `voice/*` (3): route, presentation, process
- channel routes (3): email, sms, whatsapp
- `conversations/[id]/email` (1)
- **Deferred:** `voice/to-document` (Document model), `voice/to-package` (Package model)

**C5 (18 of 24, plus 1 add):**
- `entries`, `prep-tasks`, `attendees`, `analytics`, `memory`, `notes`, `olivia`, `plan`, `travel`
- `sync/*` (8): root, google/callback, outlook/callback, conflicts, webhooks, calendly
- `cron/*` (2): calendar-sync, calendar-plan
- **Add:** `app/api/olivia/consent` (required by `OliviaConsentModal`)
- **Deferred:** `journey` (AnalysisResult), `workflow` (AnalysisResult), `documents` (Document), `nearby` (`findNearbyVenues` + Org/Event), `events/ical` (Event), `events/rsvp` (EventRsvp), `videos/calendar` (Video)

**C6 (page surface):**
- `app/calendar/page.tsx` — server-component shell, title swapped to "Calendar — Olivia Brain"
- `app/calendar/CalendarPageClient.tsx` — byte-for-byte client wrapper (OCC theater + My Calendar tab + Notes tab + agenda modal + focus-mode + consent flow)

Mechanical adaptations across C4 + C5: `userProfileId → userId` (~210 occurrences via PowerShell bulk script with word-boundary safety so `clerkUserId` untouched), 14 `prisma.userProfile.findUnique` lookups dropped (userId IS the Clerk user ID directly), Calendly sync route's email-based UserProfile lookup replaced with `CalendarSyncAccount.providerEmail` match.

### L.7 UI components (C5 — 15 + 3 supporting)

| Component | Adaptations | Status |
|-----------|-------------|--------|
| `AgendaRail.tsx` | byte-for-byte | ✅ |
| `CalendarEntryModal.tsx` | byte-for-byte (uses `react-datepicker` + `react-international-phone` + Google Maps autocomplete) | ✅ |
| `CalendarNotepad.tsx` | byte-for-byte; share modals wire to C4 routes | ✅ |
| `CalendarView.tsx` | drop `entry.linkedOrg?.name` + `linkedEventId` ecosystem-event linkage | ✅ |
| `ConfirmationChip.tsx` | byte-for-byte | ✅ |
| `EventStatusWidget.tsx` | byte-for-byte | ✅ |
| `FloatingCalendarWidget.tsx` | byte-for-byte (uses `useDraggable` + `MapAppointmentsContext`) | ✅ |
| `FocusMode.tsx` | byte-for-byte | ✅ |
| `InsightsPanel.tsx` | byte-for-byte | ✅ |
| `OliviaPanel.tsx` | byte-for-byte | ✅ |
| `PrepTaskList.tsx` | byte-for-byte | ✅ |
| `SyncPanel.tsx` | byte-for-byte | ✅ |
| `TabbedAgendaView.tsx` | drop `entry.linkedOrg?.name` reference | ✅ |
| `VoiceInput.tsx` | byte-for-byte (browser MediaRecorder → `/api/calendar/olivia` parse) | ✅ |
| `index.ts` (barrel) | byte-for-byte | ✅ |
| `components/tools/useDraggable.ts` | shared hook (LTM imports from this path; preserved) | ✅ |
| `components/olivia/OliviaConsentModal.tsx` | byte-for-byte; calls `/api/olivia/consent` | ✅ |
| `components/olivia/OliviaDisplayScreen.tsx` (C6) | byte-for-byte (696 LOC); deps already in OB (OliviaVideoAvatar, InsightsPanel, OliviaPanel) | ✅ |

### L.8 Smoke tests (C6 — Vitest, jsdom)

| Test file | Cases | Mocks |
|-----------|-------|-------|
| `__tests__/CalendarView.test.tsx` | 2 (mount + todayHighlight slot) | FullCalendar + 4 plugins, CalendarEntryModal, SyncPanel, TabbedAgendaView, EventStatusWidget |
| `__tests__/CalendarNotepad.test.tsx` | 2 (empty entries + stub entry) | react-international-phone (PhoneInput + style.css) |
| `__tests__/CalendarEntryModal.test.tsx` | 2 (create-mode + edit-mode) | @googlemaps/js-api-loader, react-international-phone, react-datepicker (lazy import); jsdom matchMedia stubbed in `beforeAll` |

Render-only per HANDOFF C6 spec — tests do NOT exercise routes (would require MSW or DB mocking).

### L.9 npm packages installed

| Package | Session | Why |
|---------|---------|-----|
| `@fullcalendar/core` + `@fullcalendar/react` + `@fullcalendar/daygrid` + `@fullcalendar/timegrid` + `@fullcalendar/interaction` + `@fullcalendar/list` | C1 | CalendarView event grid |
| `react-international-phone` | C1 | Attendee phone input |
| `rrule` | C1 | Recurrence expansion (used by `rrule-expand.ts`) |
| `resend` | C4 | Email channel (Olivia → user transcripts + invites) |
| `react-datepicker` + `@types/react-datepicker` | C5 | CalendarEntryModal start/end pickers |
| `@testing-library/react` + `@testing-library/dom` + `@testing-library/jest-dom` + `jsdom` | C6 | Vitest smoke tests for component mounts |

### L.10 Operator actions captured during the track

| Action | Status | Why |
|--------|--------|-----|
| Apply C1 calendar SQL migration to Supabase | ✅ Done 2026-05-03 (Option B) | C1 foundation tables |
| Apply C3 voice/olivia SQL migration to Supabase (`prisma/sql/02-add-voice-olivia-foundation.sql`) | ⏳ Pending | Required before voice/olivia routes write to DB |
| Set `STUB_USER_ID` env var in Vercel Preview | ⏳ Pending | C4+ routes use `getAuthSession()` stub (W-015); throws if unset |
| Set Twilio env vars (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`) | ⏳ Pending | Voice call routes |
| Set ElevenLabs env vars (`ELEVENLABS_API_KEY`, `ELEVENLABS_OLIVIA_VOICE_ID`) | ⏳ Pending | Voice TTS |
| Set `RESEND_API_KEY` (optional — graceful skip if missing) | ⏳ Pending | Email channel |
| Set Google + Outlook OAuth keys + `CALENDAR_ENCRYPTION_KEY` + `NEXT_PUBLIC_APP_URL` | ⏳ Pending | Calendar sync OAuth |
| Set `TAVILY_API_KEY` | ⏳ Pending | `web_search` tool |
| Install `match_calendar_memory()` PostgreSQL function in Supabase | ⏳ Pending (W-014) | Semantic calendar memory search; degrades to empty until installed |

### L.11 Visual fidelity gap (carries forward — same as § J.6)

Same Tailwind / token-name divergence as the map (W-011 + W-012). Calendar UI files use Tailwind classes that are inert in Olivia Brain — components mount, FullCalendar event grid renders structurally, but the React-rendered control panels / overlays / share modals / OCC theater chrome lack visual fidelity. Tracked as **W-013**. Resolution lands in **Track C UI rebuild** (Sessions 9–14 in the original numbering, shifted to 14–19 post-Track-Calendar) alongside the map alignment.

### L.12 Track Calendar closure summary

| Slot | LTM source | Ported | Deferred | Adapted |
|------|------------|--------|----------|---------|
| Calendar Prisma models | 14 of ~22 | 14 | 8 (DealRoom + Event-family — LTM-domain) | userProfileId→userId; cuid→UUID; LTM FKs dropped |
| Voice/olivia Prisma models | 9 | 9 | 0 | userProfileId→userId; UserProfile FK dropped from VoiceConversation; polymorphic IDs for cross-model refs |
| `lib/calendar/*` | 19 | 16 | 3 (document-aware, founder-journey, workflow-generator) | userId rename; LTM-domain queries trimmed |
| `lib/voice/*` | 4 | 4 | 0 | userProfileId→userId on voice-memory |
| `lib/olivia/{tools,chat,…}` | 26+ | 4 tools + 3 chat helpers | rest defer to C3/C4/Track L | feature-slice port |
| API routes (C4 + C5) | 45 | 37 (+ 1 new `/api/olivia/consent`) | 8 (Document/AnalysisResult/Event/Video — dependency tracks) | userProfileId→userId; UserProfile.findUnique dropped; Calendly providerEmail match; Clerk → getAuthSession stub |
| UI components (C5 + C6) | 18 + 1 | 18 + 1 (OliviaDisplayScreen in C6) | 0 | linkedOrg/linkedEvent references dropped from CalendarView + TabbedAgendaView; rest byte-for-byte |
| App routes (C6) | 2 | 2 | 0 | title swap; rest byte-for-byte |
| Smoke tests (C6) | NEW | 3 files / 6 cases | — | jsdom + matchMedia stub + heavy-dep mocks |

**Track Calendar exit state:** all 6 sessions ✅ closed. Build green: typecheck clean + 100/100 Vitest tests passing. Tailwind/styling caveat (W-013) and missing operator actions (above) flagged for resolution in their respective tracks.
