# Olivia Brain — Build Sequence (Sessions 4 → Launch)

> Canonical session-by-session plan. Updated 2026-05-02 after sessions 1–3 wrapped.
>
> **Companion docs**
> - `BOOTSTRAP.md` — fast context for new agents, doc reading order
> - `STUDIO_PORT_MANIFEST.md` — file-level port inventory across the three Studio sources
> - `MERGE_PLAN.md` — bridge contract, persona model, deployment topology
> - `SESSION_LOG_2026-05-02_GRAND_MASTER_PLAN.md` — architectural decisions baseline + sessions 1–3 progress
>
> **Deadline:** 2026-06-02. **Bar:** 2026 world-class production code on every line. **No band-aids.** When work cannot meet the bar in the time available, raise the conflict — never silently lower the bar.

---

## Strategic priority (locked 2026-05-03)

Founder direction: **focus on `clueslondon.com` (priority 1) and `cluesintelligence.com` (priority 2, FLAGSHIP).** Both ship targets. cluesxscore (priority 3) and white-label Olivia (priority 4) follow. Priorities 5–7 (clues-property-search, Heart-Recovery-Calendar, London transit) are explicit future builds. Path 1 from the Sessions-to-Finish accounting (hold deadline → ship slice) was rejected; path 2 (ship both flagships even if past 2026-06-02) was chosen. Sessions 6–18 land Olivia core + clueslondon. Sessions M (Brain Enrichment Engine) + L (cluesintelligence Track) follow. Total ~60 sessions to finish priorities 1–4.

---

## Done — Sessions 1–6 (status post-Session 6 commit)

| # | Track | Outcome |
|---|---|---|
| 1 | LiveAvatar server-side | Session token + start endpoints, ElevenLabs PCM bridge, rate-limit + admin-key gate. |
| 2 | LiveAvatar browser port | `OliviaVideoAvatar.tsx` + `OliviaProvider.tsx` ported byte-for-byte from LTM. `/test-avatar` smoke page. |
| 3 | Bridge contract + first two providers | Vitest infra. `OliviaSelfProvider` (Supabase). `LtmKnowledgeProvider` (LTM `/api/v1/organizations` + `/api/v1/districts`). 76 passing tests, `tsc --noEmit` clean. |
| 4 | Chat brain v1 — `/api/olivia/chat` | Single-provider Anthropic Sonnet 4.6 via `@ai-sdk/anthropic` + `generateText`. Zod validation, persistence, tracing, abort/timeout, fallback. 16 new tests, 92/92 total passing. |
| 5 | Chat brain v2 — cascade-routed | Refactored `/api/olivia/chat` to call `runModelCascade` (6-model fallback chain) instead of `generateText` directly. Intent inference via the new shared `src/lib/orchestration/intent.ts` (DRY'd out of `phase1-graph.ts`). Memory recall (4 turns) before the cascade call. Assistant turns now carry `{ intent, runtimeMode, provider, model, attempts: [{providerId, modelId, success, durationMs}] }` — error text stripped from persisted attempts to prevent PII leak. Mock-mode (cascade returns `runtimeMode: "mock"` when no provider configured) flagged on the assistant turn so the avatar UI degrades gracefully. **+2 tests (18 in route, 94 total), `tsc --noEmit` clean.** Companies House + Kimi providers explicitly scope-cut to a follow-up (see notes below). |

**Architectural decisions locked** (see `SESSION_LOG_2026-05-02_GRAND_MASTER_PLAN.md` Part 3):
- Olivia ships as a separate Next.js service.
- Olivia owns her own database.
- Web Component + iframe for embedded surfaces.
- Clerk for shared identity across Olivia + LTM + Clues.
- LiveAvatar LITE mode + ElevenLabs PCM is the avatar pipeline (contracts pinned in `HEYGEN_LTM_CONFIG.md`).
- LTM stays read-only from this repo. We copy components out; we never edit LTM in place.

---

## Sequence — Sessions 4 → Launch

### Track A — Chat brain end-to-end (Sessions 4–6)

Without this, every Studio "Ask Olivia" button is a placeholder. Highest-value unblocker.

| Session | Deliverable | Exit criterion |
|---------|-------------|----------------|
| **4** ✅ | `/api/olivia/chat` route on Olivia Brain. Single-provider first (Anthropic Sonnet 4.6 via `@ai-sdk/anthropic`). Persistence to `conversations` + `conversation_turns`. AbortSignal+timeout + Langfuse trace. | **DONE.** `POST /api/olivia/chat { message }` returns `{ conversationId, messageId, reply }`, persists turns via `getConversationStore()`, opens an OTel span. Unconfigured path (no `ANTHROPIC_API_KEY`) returns a clean structured fallback and still persists. 16 new tests, 92/92 passing, typecheck clean. |
| **5** ✅ | Cascade: extend `/api/olivia/chat` to use the existing cascade in `src/lib/services/`. Intent router → fallback chain. Companies House + Kimi providers added per `MERGE_PLAN.md` Phase 2. | **DONE for the cascade refactor.** `/api/olivia/chat` now calls `runModelCascade` with intent classification, memory recall, full attempts trail in turn metadata, mock-mode degrade. Forced-fault failover test exercises Anthropic → OpenAI handoff via the cascade contract. **DEFERRED:** Companies House (structurally a `UniversalKnowledgeProvider` not a cascade LLM) and Kimi (needs SDK + env-var work) are tracked in `API_INTEGRATION_BACKLOG.md` for follow-up sessions. LangGraph wrapping of the route lands in Sessions 19–20 (Track G). |
| **6** ✅ | Wire `OliviaProvider.sendMessage` to the new route. The `/test-avatar` smoke page now demonstrates a full conversation: type → cascade → reply → ElevenLabs → LiveAvatar lip-syncs. | **DONE.** `/test-avatar` now has two flows: (A) manual lip-sync (existing), (B) full conversation loop using `useOlivia().sendMessage` — a chat composer posts to `/api/olivia/chat`, the cascade walks, and the latest assistant reply is routed through a `useEffect` watcher into the LiveAvatar's `lastReply` prop so the cascade response gets spoken with lip-sync. Conversation history rendered inline. Outdated comment in `OliviaProvider.tsx` claiming the chat route doesn't exist was corrected. **94/94 tests still passing**, typecheck clean. |

### Track B — Studio engine port (Sessions 7–8)

LTM has a working Studio. The job is **copy the engine** out of LTM into this repo. UI shell rewrite is Track C; this track only does engine + supporting components.

See `STUDIO_PORT_MANIFEST.md` for the full file-by-file plan.

| Session | Deliverable | Exit criterion |
|---------|-------------|----------------|
| **7** ✅ | **Pivoted mid-session from documents engine to LTM map port** after re-glob revealed manifest under-specification (3 missed LTM utility files; CalloutBlock/ListBlock/ParagraphBlock/DocumentBody all import OrgMapProvider — not just the manifest's two flagged blocks; Clerk auth in BookmarkButton + DocumentActionBar; react-markdown + remark-gfm not installed; DocumentRenderer routes break when blocks defer; Next 16 typed-route strictness on 4 files). User confirmed LTM map + calendar are flawless and approved pivot. Map ported byte-for-byte: `src/components/map/` (20 files — GoogleMap3DView photorealistic + GoogleMapView standard + MapView Mapbox fallback + controls/ + overlays/ + hooks/ + data/), `src/app/map/` (3 files with 3-tier vendor fallback), `src/components/ExternalLinkFrame.tsx` (Provider + Link + hook + iframe overlay), `src/types/index.ts` (DistrictWithStats etc.), `src/types/google.d.ts` (triple-slash reference for google.maps types under `moduleResolution: bundler`). Deps added: `mapbox-gl`, `@googlemaps/js-api-loader`, `@types/google.maps`. | **DONE.** 28 files / 6,107 LOC committed in 55ff466 + chore commit 991f411 (recharts + lucide-react pre-install for Track N). `npm run typecheck` clean. `npm test`: 94/94 passing. **Documents engine re-scoped to Session 8** (Clerk dep blocking — needs Track F Session 18 forward OR a Clerk stub strategy). **Calendar subsystem** (36 files, ~638 KB, includes full `lib/calendar/` Olivia engine) deserves its own Track — to be inserted before Track L per `project_ltm_map_calendar_adaptive` memory. **Track N2 Mapbox assumption corrected** — LTM map is dual-implementation (Google Maps primary + Mapbox fallback); update Track N2 to reflect this. **Outstanding deferrals:** ExternalOverlayProvider not yet wrapped in root layout (links degrade to no-op until then); LTM map links to `/directory/{id}` + `/videos/{id}` routes that don't exist in Olivia Brain (W-008). |
| **8** | Port the Studio v1 engine pieces: `PreparationStudio.tsx` and the engine-side components (StudioAnswerEditor, StudioFormattingToolbar, PitchPolishModal, SuggestionChips, WhyThisPanel, DeepResearchPanel, ResearchHistory, EntityBriefCard, EntityPerspectiveModal, MicroReward, SkipNudgeModal, CompletionCeremony, DocumentTransition, PreSubmitCheck, CristianoReEvaluation, AnswerRibbon, StoryReview). Stripped of LTM-specific data dependencies — all data flows through bridge providers. | Mounting `<PreparationStudio>` at `/studio/[id]` renders the engine against a stub document. No runtime errors. Tests cover sequencer, save, navigation. |

### Track Calendar ✅ — Calendar + voice + email/call/share infrastructure (Sessions C1–C6)

> **Slot:** picks up immediately after Track B Session 7's map port (so Session 8 in run-rate = C1). Sequenced before Track C (Studio UI rebuild) so the calendar engine + voice infrastructure exist before Studio UI calls them. **Per the surface suppression rule (`project_olivia_surface_suppression` memory), this track does not block the clueslondon 2026-06-02 ship target — clueslondon embeds Olivia with calendar suppressed since LTM provides the canonical surface. Track Calendar makes calendar + voice functional for cluesintelligence + standalone + future spokes.**
>
> **Schema adaptations** (per `project_ltm_types_no_speculative_generalization` memory): `userProfileId UserProfile @relation` → `userId String @db.Uuid` (will reference Clerk user IDs after Track F Session 18); `linkedOrgId` / `linkedEventId` / `linkedPersonId` FKs dropped (LTM-domain); cuid IDs converted to UUID for consistency with Olivia Brain schema; **camelCase field names preserved** so `lib/queries/calendar.ts` (35 KB) ports with only the mechanical `userProfileId → userId` rename. **DealRoomSession + DealRoomMessage dropped** — sales-domain features belong in the real-estate spoke (clues-property-search) when that vertical builds. Event/EventParticipant/EventRsvp/EventSeries/PackageEvent/CascadeEvent dropped (LTM tech-event modeling, separate concept from personal calendar).
>
> **User-confirmed scope (2026-05-03):** voice + text + email + call + append-to-calendar + share. Voice infrastructure ports in C3 + C4. CalendarNotepad's email/SMS/WhatsApp share modals wire to C4 routes from C5.

| Session | Deliverable | Exit criterion |
|---------|-------------|----------------|
| **C1** ✅ | **Foundation (DONE 2026-05-03).** 14 calendar Prisma models (CalendarEntry, CalendarPreferences, CalendarPrepTask, CalendarReminder, CalendarEntryAttendee, CalendarInteraction, CalendarSyncAccount, CalendarSyncConflict, CalendarWebhookState, CalendarMemoryChunk, CalendarNote, OliviaCalendarRecommendation, VoiceTranscriptionLog, FounderWeek) + 15 enums (CalendarCategory ×37 values, CalendarEntryType, CalendarPriority, CalendarSyncProvider, CalendarSyncDirection, CalendarConflictResolution, CalendarInteractionType, CalendarPrepTaskStatus, CalendarAttendeeRsvp, CalendarAttendeeRole, AttendanceStatus, WebhookSubscriptionStatus, OliviaRecommendationType, OliviaRecommendationUrgency, OliviaRecommendationStatus). Schema adaptations per memory: cuid→UUID, userProfileId→userId, LTM-domain FKs dropped, DealRoom dropped, Event-family not ported. `lib/video/embeddings.ts` ported byte-for-byte. npm install: 8 packages (FullCalendar suite + react-international-phone + rrule, 9 installed incl. transitive). **`lib/queries/calendar.ts` port DEFERRED to C2** — discovery surfaced 93 LTM-domain references (linkedEvent/linkedOrg/linkedPersonId in selects + interfaces) requiring engine-aware adaptation, not mechanical rename. Honest defer per standing rule "no band-aids." | **DONE.** `prisma validate` clean. `prisma generate` succeeded (Prisma client v7.7.0). `npm run typecheck` clean. `npm test` 94/94 passing. Code commit 49ed993 + Track-add doc commit ecfb38b. **Operator action:** run `npx prisma migrate dev --name add_calendar_foundation` against your dev DB to apply the new tables. |
| **C2** ✅ | **Calendar engine + queries (DONE 2026-05-03).** `src/lib/queries/calendar.ts` ported (1130 lines after adaptation) with `userProfileId → userId` rename, `linkedEvent`/`linkedOrg`/`linkedPersonId` selects + interface fields stripped, `getMergedCalendarView()` dropped (referenced `prisma.event` not in C1 schema). `src/lib/calendar/*` ported as **16 of 19 LTM files** — 7 byte-for-byte (crypto, event-categories, rrule-expand, olivia-schemas, olivia-prompts, calendar-judge, olivia-engine), 6 with userId rename only (daily-brief, behavior-engine, travel-buffer, calendar-memory, google-sync, outlook-sync), 3 modified (olivia-guardrails: DB call dropped + hardcoded defaults remain, wires up in C3 when OliviaGuardrail model lands; proximity-cluster: only `haversineKm` survives — Organization/Event queries dropped per `project_ltm_types_no_speculative_generalization`; index.ts: barrel adjusted). **3 LTM files intentionally NOT ported (deferred to dependency tracks):** document-aware (Document model — Documents track), founder-journey + workflow-generator (AnalysisResult model — Track L). `src/lib/olivia/tools.ts` calendar slice ported with 2 tools: `get_user_calendar` (adapted: drop linkedOrg/linkedEvent includes + drop UserProfile lookup since Olivia Brain uses Clerk userId directly) and `web_search` (Tavily, byte-for-byte). The other 22 LTM tools defer to C3/C4/Track L. **calendar-memory.ts:** SQL identifiers `"userProfileId" → "userId"` in raw INSERT; `gen_random_uuid()::text → gen_random_uuid()` since C1 uses `@db.Uuid` not String. `match_calendar_memory()` pgvector fallback unchanged (graceful degradation; install via SQL when feature needed — tracked as **W-014**). | **DONE.** `npm run typecheck` clean. `npm test` 94/94 passing. Commit `948f6ed`. |
| **C3** ✅ | **Voice + Olivia models + engine (DONE 2026-05-03).** 9 voice/olivia Prisma models added to `prisma/schema.prisma` with C1/C2 adaptations (cuid→UUID, userProfileId→userId, LTM-domain FKs dropped, camelCase preserved): OliviaConversation, OliviaMessage, OliviaPresentation, OliviaConsent, OliviaGuardrail, OliviaUserMemory, VoiceConversation (drops UserProfile FK relation; CalendarEntry FK kept; generatedDocumentId/PackageId polymorphic strings), VoiceContact (drops linkedPersonId), VoiceActionItem (calendarEntryId polymorphic). CalendarEntry gains the deferred `voiceConversations` reverse relation. SQL migration generated via `prisma migrate diff` at `prisma/sql/02-add-voice-olivia-foundation.sql` (10.5 KB). **Lib ports:** `voice-conversation.ts` / `voice-document.ts` / `voice-prompts.ts` byte-for-byte (pure logic + Anthropic). `voice-memory.ts` userProfileId→userId rename. `tools.ts` extended with `get_user_memory` + `save_user_memory` tool defs + handlers + `hasLearningConsent` helper (now 4 tools). `olivia-guardrails.ts` DB integration restored (was dropped in C2 because OliviaGuardrail model didn't exist). `chat.ts` slim slice — `createConversation` / `getConversationHistory` / `getConversationMessages` only. **`processOliviaMessage` NOT ported** — pulls in code-knowledge layer + Studio context + CristianoShell pipeline + `prisma.userProfile`, none of which exist in Olivia Brain. The `/api/olivia/chat` cascade route already serves the equivalent purpose. **`knowledge-base.ts` NOT ported** — no consumer in C3 scope (slim chat.ts skips processOliviaMessage which was the only LTM consumer). Defer to future track when consumer asks. | **DONE.** `npm run typecheck` clean. `npm test` 94/94 passing. Commit `4291a39`. **Operator action:** apply `prisma/sql/02-add-voice-olivia-foundation.sql` to Supabase (Option B path, same as C1). |
| **C4** ✅ | **19 of 21 voice/email/call/sms/WhatsApp API routes (DONE 2026-05-03).** Ported: 10 `call/*` (route, audio, extract, gather, inbound, outbound, recording, reminder, status, twiml), 2 `calls/*` (list + [id]), 3 `voice/*` (route, presentation, process), 3 channel routes (email, sms, whatsapp), 1 `conversations/[id]/email`. **2 routes intentionally NOT ported:** `voice/to-document/route.ts` + `voice/to-package/route.ts` — both depend on `Document` / `DocumentCollection` / `Package` Prisma models that don't exist in Olivia Brain. Re-port in their dependency tracks (Documents track post-Clerk; Track L cluesintelligence for Package). No band-aid stubs. **Auth strategy: Option B — `lib/auth/session.ts` Clerk stub** (`getAuthSession()` reads `STUB_USER_ID` env var, throws clearly when env unset OR in production). Routes import `getAuthSession` instead of Clerk's `auth`. One-line swap when Clerk lands in Track F Session 18. Tracked as **W-015**. **Adaptations:** userProfileId→userId everywhere (~70 occurrences), 4 routes had `prisma.userProfile.findUnique({ clerkUserId })` lookups dropped (userId IS the Clerk user ID directly). **Supporting libs ported:** `lib/twilio/client.ts` (byte-for-byte; coexists with pre-existing `lib/twilio/server.ts`), `lib/elevenlabs/client.ts` (byte-for-byte; coexists with pre-existing `lib/voice/elevenlabs.ts`), `lib/email/resend.ts` (byte-for-byte). `resend` npm package installed. | **DONE.** `npm run typecheck` clean. `npm test` 94/94 passing. Commit `1657fe2`. **Operator action:** set `STUB_USER_ID` (dev), `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER`, `ELEVENLABS_API_KEY` / `ELEVENLABS_OLIVIA_VOICE_ID`, `RESEND_API_KEY`. |
| **C5** ✅ | **Calendar UI + 18 of 24 calendar API routes (DONE 2026-05-03).** Ported 15 calendar UI components byte-for-byte (`AgendaRail`, `CalendarEntryModal`, `CalendarNotepad`, `CalendarView`, `ConfirmationChip`, `EventStatusWidget`, `FloatingCalendarWidget`, `FocusMode`, `InsightsPanel`, `OliviaPanel`, `PrepTaskList`, `SyncPanel`, `TabbedAgendaView`, `VoiceInput`, `index` barrel) + 3 supporting (`components/tools/useDraggable`, `components/olivia/OliviaConsentModal`, `lib/mobile-keyboard`). **18 routes ported:** `entries` (with `prisma.event.findMany` ecosystem block dropped + linkedEvent/linkedOrg/linkedPersonId selects stripped), `prep-tasks` (linkedOrg select dropped), `attendees` (linkedPersonId references dropped), `analytics`, `memory`, `notes`, `olivia`, `plan`, `travel`, `sync` root, `sync/google/callback` + `sync/outlook/callback` (UserProfile lookups dropped — userId IS Clerk user ID), `sync/conflicts`, `sync/webhooks`, `sync/calendly` (email-based UserProfile lookup dropped — match via CalendarSyncAccount.providerEmail), `cron/calendar-sync`, `cron/calendar-plan`, plus `app/api/olivia/consent` (added because OliviaConsentModal calls it). **6 routes intentionally NOT ported:** `journey` (AnalysisResult — Track L), `workflow` (AnalysisResult + linkedOrgId — Track L), `documents` (Document — Documents track post-Clerk), `nearby` (`findNearbyVenues` deferred per C2 + Organization/Event models — speculative-generalization rule), `events/ical` + `events/rsvp` (Event/EventRsvp models — LTM-domain), `videos/calendar` (LTM Video model — LTM-domain). **Auth:** Same Option B `getAuthSession` stub from C4 (W-015). **Bulk script (PowerShell):** `userProfileId → userId` everywhere (~140 occurrences) with word-boundary safety so `clerkUserId` untouched; helper function body swapped (`auth()` → `getAuthSession()`); 10 `prisma.userProfile.findUnique` lookups dropped. **Hand-edits:** entries/prep-tasks/attendees adaptations + CalendarView linkedEventId removal + TabbedAgendaView linkedOrg removal + CalendarView linkedOrg removal. **`lib/system-alerts.ts`** ported as **console-only stub** — SystemAlert Prisma model not in OB schema (tracked as **W-016**). **Deps:** `react-datepicker` + `@types/react-datepicker` installed (CalendarEntryModal). **Tailwind/styling caveat carries forward** — calendar UI ships structurally with degraded visual fidelity (tracked as **W-013**); Track C UI rebuild aligns. | **DONE.** `npm run typecheck` clean. `npm test` 94/94 passing. Commit `cb678b7`. **Operator action:** `npm install` to pull react-datepicker + @types/react-datepicker (CI/Vercel auto-installs from lockfile). |
| **C6** ✅ | **App routes + smoke tests + docs (DONE 2026-05-03).** Ported `app/calendar/page.tsx` (server-component shell, title swapped to "Calendar — Olivia Brain") + `app/calendar/CalendarPageClient.tsx` byte-for-byte (1265 LOC: OCC theater + My Calendar tab + Notes tab + agenda modal + focus-mode + GDPR consent flow + conversation history dropdown + transcript download/email/read-aloud) + `OliviaDisplayScreen.tsx` byte-for-byte (696 LOC; deps already in OB — OliviaVideoAvatar, InsightsPanel, OliviaPanel). 3 Vitest smoke tests / 6 cases (`__tests__/{CalendarView,CalendarNotepad,CalendarEntryModal}.test.tsx`) using `@vitest-environment jsdom` magic comment with mocks for FullCalendar (+ 4 plugins), react-datepicker (lazy import), react-international-phone (PhoneInput + style.css), `@googlemaps/js-api-loader`, and a `window.matchMedia` stub in `beforeAll`. Test deps installed: `@testing-library/react`, `@testing-library/dom`, `@testing-library/jest-dom`, `jsdom`. STUDIO_PORT_MANIFEST §L (Calendar + voice subsystem inventory; same shape as §J Map subsystem) appended. SESSION_LOG Part 20 appended. **No new W-IDs.** | **DONE.** `npm run typecheck` clean. `npm test` **100/100 passing** (94 baseline + 6 new smoke). Commit `<feat>` + `<docs>`. |

> **Tailwind/styling caveat carries forward to Track Calendar.** Same gap as map (W-011 + W-012): `components/calendar/*` files use Tailwind classes that are inert in Olivia Brain. Visual fidelity gets resolved in **Track C** (UI rebuild + design-system alignment). Calendar UI ships structurally in C5/C6 and gets visually aligned in Track C. Weakness item **W-013** captures this (logged when C5 landed; carries through C6 unchanged).

> **Run-rate impact:** Track C's original Sessions 9–14 effectively shift to Sessions 14–19 in calendar time. All downstream tracks (D–K, Launch) shift by 6 sessions. The track-letter labels (C1, C2, etc. for Track Calendar; absolute session numbers 9–30+ for Tracks C–K) stay stable for cross-doc references.

---

### Track C — Studio UI rebuild + design-system alignment (Sessions 9–14)

Replace Studio v1's "fucking hideous UI" (and the half-finished v2 wrapper) with the GrandMaster prototype shell. Engine stays. UI dies.

Reference: `STUDIO_OLIVIA_DESIGN.md` — every primitive, layout, state shape, interaction.

**Track C is also where map + calendar styling alignment lands** (W-011 + W-012, plus W-013 once calendar lands): Olivia Brain has no Tailwind, has different CSS token names than LTM (`--bg` vs `--background`, `--text` vs `--foreground`, `--panel` vs `--card-bg`, etc.), and is missing LTM's `app/design-tokens.css`. The map (Session 7) and calendar (Track Calendar) files were ported byte-for-byte but render with degraded visual fidelity until this track adapts them to the Olivia Brain design system per `01_UI_DESIGN_SYSTEM.md` (Aurum + Aether tokens, LCH color space, Linear 3-input theming). Decisions Track C must make: (1) add Tailwind or stay custom-CSS-only, (2) port LTM's `design-tokens.css` or design fresh tokens, (3) align CSS token names across all ports.

| Session | Deliverable |
|---------|-------------|
| **9** | Three-region shell at `/`. Header (sticky, 56px, AvatarOrb + STUDIO OLIVIA wordmark + crumb + score chips + Match/Export). Left aside (264px, scrollable). Right aside (320px, tabbed). Center (flex 1). Inline-style approach using the prototype's `C` color tokens, NOT Tailwind. |
| **10** | Five reusable primitives: `AvatarOrb`, `ConsensusDots`, `Badge`, `CompletionRing`, `DeckDetailModal`. Vitest unit tests on each. (`Badge` and `CompletionRing` already exist; refactor to match prototype spec.) |
| **11** | Library + DeckDetailModal interaction. 75 archetypes + 12 templates from the prototype's static data, scored by `scoreDecks` / `scoreTemplates`. Apply-archetype regenerates slides. Real backend, not stubbed Anthropic calls. |
| **12** | Section nav (Pitch / Plan / Documents / General), document tree (10 categories, 65 docs), frameworks panel (14 frameworks). All wired to the engine ported in Track B. |
| **13** | Right-pane tabs (Olivia, Library, Preview, Themes, Audit). The Olivia tab now uses the chat brain from Track A; the Audit tab queries the audit log. |
| **14** | Polish: J/K keyboard nav, focus-trap modal, arrow-key tab rover, debounced autosave to Supabase, theme switching (5 London themes). Manual QA pass on every interaction. |

### Track D — Studio ↔ brain wiring (Sessions 15–16)

Studio's "Ask Olivia to Draft", "Analyze", "Optimize" buttons in v1 were wired to LTM's chat. Re-point them at Olivia Brain's cascade.

| Session | Deliverable |
|---------|-------------|
| **15** | Server-side: `/api/pitch/{draft,analyze,optimize,chat}` routes, each calling the cascade with the prototype's pinned prompt shape. Web search tool wired (Tavily). |
| **16** | Client-side: replace all four `fetch("https://api.anthropic.com/...")` calls in the prototype-derived UI with calls to the new routes. End-to-end Vitest integration. |

### Track E — Voice input (Session 17)

Olivia speaks; needs to hear.

| Session | Deliverable |
|---------|-------------|
| **17** | Browser mic capture → `MediaRecorder` chunks → `/api/voice/transcribe` (Whisper or Deepgram, both already abstracted in `src/lib/voice/`) → text → `/api/olivia/chat` → reply → avatar speaks. End-to-end on `/test-avatar` plus a Studio composer hook. |

### Track F — Auth (Session 18)

Replace `ADMIN_API_KEY` shim with Clerk org-shared identity per Q4 decision.

| Session | Deliverable |
|---------|-------------|
| **18** | Clerk wired into `tenant/context.ts`. `withTenantContext()` middleware on every API route. `requireAdminKey` callsites replaced with `auth()`. Smoke test page no longer needs the `?key=` query param. |

### Track G — Cascade orchestrator port (Sessions 19–20)

Brain has the LangGraph + 9-model cascade. LTM has 15 production-tuned cascade prompts and an events bus. Merge.

| Session | Deliverable |
|---------|-------------|
| **19** | Port LTM's `lib/cascade/prompts/index.ts` into `src/lib/orchestration/prompts/`. Port `cascade/events.ts` + `cascade/injector.ts` into `lib/orchestration/events.ts` with a new `cascade_events` Prisma model. |
| **20** | LangGraph 5-node graph wraps the 4-phase cascade as a special-case subgraph. Brain alone serves every existing LTM-Olivia API surface; smoke test confirms. |

### Track H — Agents consolidation (Sessions 21–23)

| Session | Deliverable |
|---------|-------------|
| **21** | Move LTM's ~120 runnable agents (`g1-001..168`, `g2-222..230`, `valuation/*`, `district-intelligence`, `seed-agents`) into `src/lib/agents/impl/` preserving filenames. |
| **22** | Reconcile with `agents/registry.ts`. Every g1-/g2- file maps to a registry entry. `agents/engine.ts` discovers impls dynamically. |
| **23** | Admin dashboard surfaces every agent with category/group/status/run-button. `g1-117-state-of-london-tech` runnable end-to-end. |

### Track I — Multi-tenant + white-label hardening (Session 24)

| Session | Deliverable |
|---------|-------------|
| **24** | Test 3 tenants: clueslondon-prod (embedded), tampa-brokerage (standalone), demo-acme (white-labeled). Per-tenant adapter overrides (one real adapter). Per-tenant model overrides. Entitlements (Free tier blocks `/api/avatar/generate`). Stripe billing wired into entitlements via webhook. **Adaptive surface suppression:** per-tenant `ui.suppressedSurfaces: string[]` config so embedded contexts hide Olivia surfaces the host already provides (clueslondon-prod suppresses `map` + `calendar` since LTM provides them; cluesintelligence + white-label + standalone show everything). Decision rule + per-context matrix is captured in the `project_olivia_surface_suppression` memory. |

### Track J — Vertical adapters (Sessions 25–26)

| Session | Deliverable |
|---------|-------------|
| **25** | Brokerage adapter (real-estate vertical): HouseCanary, MLS RESO, BatchData, RentCast, Regrid. Smoke test: query Tampa MLS for a property. |
| **26** | LifeScore adapter: SMART score / verdict / comparison engines, surfaced as a UKP provider with domain "lifescore". |

### Track K — Hardening + launch prep (Sessions 27–29)

| Session | Deliverable |
|---------|-------------|
| **27** | Patronus hallucination eval on Olivia / Cristiano / Emelia. Conversation QA scorecards. Red-team eval pass. Load test the chat path at 100 RPS. |
| **28** | GrandMaster homepage at `/` for the public-facing landing. Conversion path to sign-up. Pricing page placeholder. |
| **29** | Bug bash. Doc updates. Vercel production env audit. Stripe webhook URLs. Twilio status callback URLs. Final security review (per `/security-review` skill). |

### Launch — Session 30 (2026-06-02)

| Session | Deliverable |
|---------|-------------|
| **30** | Production cutover. DNS to `olivia.com`. Monitoring alerts validated. Rollback plan documented. |

---

### Track N — Visual Manifestation Layer (Sessions N1–N5)

> **Slot:** after Track G (Sessions 19–20, cascade orchestrator port). Recommend ~Sessions 27–31 in run-rate. Independent of Tracks H/I/J. The interaction model is **split-screen Olivia + Canvas** — user talks, cascade emits `manifest: { type, payload }` tool call, `<OliviaCanvas>` renders the right surface, Olivia narrates while it animates. **Gamma is the canonical presentation runtime — partner, integral, never an alternative.**

| Session | Deliverable | Exit criterion |
|---|---|---|
| **N1** | **Canvas shell + tool-dispatch contract.** New `<OliviaCanvas>` component beside `<OliviaVideoAvatar>`. Cascade returns optional `manifest: { type, payload }` alongside text. Wire **Composio** for the dispatch layer. Prereq: Track O Session O1 must land first. | `/test-avatar` shows split-screen. Asking "show me a flowchart of the cascade" returns a Mermaid diagram inline. Composio tool call traceable in Langfuse. |
| **N2** | **Map manifestation.** Add `mapbox-gl` + Mapbox 3D Tiles. Manifest types `map.cities`, `map.relocation-pin`, `map.transit-overlay`. | "Show me the top 3 cities" zooms a 3D Mapbox scene to each, with score chips. Works without Mapbox token (gracefully degrades to static image). |
| **N3** | **Diagram + chart manifestation.** Add `mermaid`, `recharts`, `@tremor/react`. Manifest types `diagram.flow`, `chart.bar`, `chart.radar`, `chart.gauge`, `chart.sparkline`. | Pitch valuation question returns a Tremor gauge + Recharts bar chart, Olivia narrates. Mermaid sequence diagram renders for "explain the cascade." |
| **N4** | **Generative UI + 3D scene.** Wire **Vercel v0 API** for ad-hoc React component generation. Add **Spline** embed + **CesiumJS** for cluesintelligence relocation flyover. Manifest types `ui.generate`, `scene.3d`, `globe.flyover`. | v0-generated comparison table renders inside Canvas with branded tokens. Cesium globe flies London → user's selected city. |
| **N5** | **Gamma deck manifestation (deeper integration).** Existing `src/lib/reports/gamma.ts` + Gamma MCP gets a Canvas surface: when cascade emits `manifest: { type: "gamma.deck" }`, Canvas shows live Gamma generation status, then the embedded Gamma viewer. | "Generate the Series A pitch deck" returns a Gamma URL + embedded preview within 90s. User can click to open in Gamma editor for refinement. |

### Track O — Weakness Closure (Sessions O1–O5)

> **Slot:** O1 lands between Sessions 16 and 17 (prerequisite for Track N1). O2 extends Track K Session 27 (Patronus already scoped — broaden to running eval). O3 extends Track E Session 17 (voice). O4 + O5 fold into Track K hardening (Sessions 27–29). Each session closes a numbered weakness from `README.md` § Weakness Backlog.

| Session | Deliverable | Exit criterion |
|---|---|---|
| **O1** | **Wire Composio for agentic tool dispatch (W-001).** New `src/lib/tools/composio.ts`. Cascade gets a `tools` array; intent classifier flags tool-eligible turns; tool results re-enter the cascade for narration. Approval gate (`src/lib/tools/approval-gate.ts`) wraps high-risk tools. | "Send a follow-up email to John from yesterday's call" → Composio Gmail tool runs (with approval prompt) → reply + audit log entry. Works alongside the cascade without breaking 94 existing tests. |
| **O2** | **Eval runtime, running weekly (W-002).** Promote scaffold (`src/lib/evaluation/{patronus,braintrust,cleanlab,red-team}.ts`) into an Inngest weekly cron that scores last week's conversations on hallucination + groundedness + safety. Public scorecard at `/admin/evals`. | Friday cron emits a Slack/email report: "Olivia scored X on hallucination, Y on red-team, Z on QA scorecards. Week-over-week delta: ±N%." Live numbers, not stubbed. |
| **O3** | **Voice latency under 600ms (W-003).** Add **Cartesia Sonic 2** TTS (`src/lib/voice/cartesia.ts`) as the real-time path; ElevenLabs stays for premium async. Add **Deepgram streaming** STT into the LiveAvatar loop. Measure: chat → TTS first-byte. Target: <600ms p50. | Tracing dashboard shows p50 voice round-trip <600ms over a 100-turn benchmark. |
| **O4** | **Citation-first RAG, wired (W-004).** `src/lib/rag/citation-first.ts` exits library-only mode. Cascade's "research" intent routes through it. Every assistant turn carries `citations: [{ url, title, snippet }]`. UI renders inline `[1]` superscripts. | "What's the weather in London like for relocation?" returns text + 3+ clickable Tavily-sourced citations. Closes the Hebbia gap. |
| **O5** | **Avatar lip-sync upgrade (W-005).** Add **Tavus** as a vendor in `src/lib/avatar/tavus.ts`. A/B harness compares Tavus vs Simli vs HeyGen on the same 30-script suite. Best vendor wins primary, others stay as fallback chain. | Side-by-side video evaluation shipped to user; chosen vendor flagged as primary in `src/lib/avatar/index.ts`. |

---

## Risks & gates

| Risk | Mitigation |
|------|------------|
| Studio UI rebuild slips past 6 sessions | Behind-flag launch with v1 wrapper as fallback; cut Themes tab + Audit tab to scope down. |
| Cascade integration reveals LTM/Brain prompt incompatibilities | Sessions 19–20 buffer; prompts are version-pinned in the port, not mutated. |
| LTM `/api/v1/*` surface is missing endpoints we need (people, events, funding) | Reframe: ship without them, document the gap, request LTM adds them in a separate LTM-side session that isn't this repo's responsibility. |
| Clerk migration breaks the smoke test mid-flight | Land Clerk on a feature branch; admin-key path stays alongside until Clerk is verified end-to-end. |
| Multi-tenant work surfaces a tenant-isolation bug | Cross-tenant data leak test runs in CI on every PR after Session 18. |
| Vercel build fails because of a dependency drift | `npm install` is mandatory after every package.json edit; lockfile must be committed in the same commit. (Standing rule from session 3.) |

---

## Standing rules carried into every session

1. **No LTM edits.** Read-only. We copy out, we never modify in place.
2. **No band-aids.** No `force-dynamic`, no `// hack`, no `@ts-ignore`, no Suspense wrappers used as a workaround for an underlying issue.
3. **Verify before claiming done.** `npm test` and `npm run typecheck` must both pass before any commit.
4. **Lockfile in the same commit as `package.json`.** Always.
5. **Commit + push together.** Vercel deploys from git. Local commits do nothing.
6. **AbortSignal + timeout on every network call.** No exceptions.
7. **PII never enters spans, traces, or logs.** Only metadata.
8. **JSDoc on every exported symbol.** Class headers describe reliability guarantees.
9. **One concern per commit.** Mixed-concern commits are forbidden.
10. **One task at a time.** After completing each session's deliverable, stop and check in with the user.
