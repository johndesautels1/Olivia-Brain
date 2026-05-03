# OLIVIA BRAIN — NEXT AGENT HANDOFF

**Updated:** 2026-05-03
**HEAD:** `cb678b7` on `main` (will advance one commit when this docs update lands)
**State:** Track Calendar C5 closed (calendar UI + 18 of 24 routes; 6 deferred to dependency tracks). **Resume at Session 13 = Track Calendar C6 (app routes + smoke tests + docs — closes Track Calendar).**
**Working tree:** clean post-docs-commit. All commits pushed to `origin/main`. **Vercel build green.**

> The previous version of this file (post-Session-11 era) is preserved in git history. This file replaces it with the current post-Session-12 state. The session series captured here (Sessions 1–12) is documented in detail in `docs/SESSION_LOG_2026-05-02_GRAND_MASTER_PLAN.md` Parts 10–19.

---

## REPO LOCATIONS

| Repo | Path | Status |
|------|------|--------|
| **Olivia Brain (this — your working repo)** | `D:\Olivia Brain` | Current. HEAD `d5fe4c3`. |
| **GitHub** | https://github.com/johndesautels1/Olivia-Brain | up to date with `main` |
| London Tech Map (LTM) | `D:\London-Tech-Map` | **READ-ONLY.** Copy components OUT; never edit, rename, delete, or move ANY LTM file. |
| Studio Olivia prototypes | `D:\Studio-Olivia` | **REFERENCE ONLY.** The 95 KB GrandMaster JSX is the design north star — don't import its code. |
| Clues Main (cluesintelligence vision docs) | `D:\Clues Main` | Docs canonical. Code is way behind — don't trust the code. |
| Questionnaire engine | private GitHub `johndesautels1/clues-questionnaire-engine` | Current truth for cluesintelligence. Local `D:\clues-questionnaire-engine` is STALE (different computer). |

---

## ABSOLUTE RULES (do not violate)

1. **LTM is read-only.** Never edit, rename, delete, or move any file in `D:\London-Tech-Map`. Copy out (Read + Grep + `Copy-Item`); never modify the source.
2. **No band-aids.** No `force-dynamic` workarounds, no `// hack` comments, no `@ts-ignore`, no Suspense wrappers used as a workaround. Find and fix the root cause. When work cannot meet the bar in the time available, **raise the conflict, never silently lower the bar**.
3. **Verify before claiming done.** `npm test` and `npm run typecheck` must both pass before any commit.
4. **Lockfile in same commit as `package.json`.** Always.
5. **Commit + push together.** Vercel deploys from git. Local commits do nothing.
6. **One concern per commit.** Mixed-concern commits are forbidden.
7. **AbortSignal + timeout on every network call.** No exceptions.
8. **PII never enters spans, traces, or logs.** Only metadata.
9. **JSDoc on every exported symbol.** Class headers describe reliability guarantees.
10. **One task at a time.** After completing each session's deliverable, stop and check in with the user.
11. **NEVER run local builds** (`npm run build`, `next build`). Vercel handles that. `npm run typecheck` and `npm test` are allowed.
12. **All architecture and README docs must continue to be updated and committed** to reflect every change. (User words 2026-05-03: "all the architecture and readme docs must continue to be updated to reflect these changes and commited.")

Full standing rules: `docs/BUILD_SEQUENCE.md` § "Standing rules carried into every session" + `~/CLAUDE.md`.

---

## READ ORDER (every new session, in this exact sequence)

1. **`~/CLAUDE.md`** — auto-loaded by Claude Code. Master project rules. Includes: never set secret env vars to "All Environments" in Vercel; never run local builds; minimize tool calls; LTM read-only; STOP means STOP.
2. **Memory files** — auto-loaded by Claude. They live at `~/.claude/projects/C--Users-broke/memory/` (10 files indexed in `MEMORY.md`). The 5 most-load-bearing for this work are listed in § Memories below.
3. **`docs/00_PRODUCT_TRUTH.md`** — eternal source of truth for the entire CLUES product universe. Bicycle-wheel architecture; product hierarchy; Olivia is the brain at the hub. Past sessions ignored this for 30+ conversations — DON'T.
4. **`docs/01_UI_DESIGN_SYSTEM.md`** — universal dark-mode design language. Aurum + Aether tokens, LCH color space, modular workspace, multi-agent visualization, WCAG 2.2 AA + APCA, Vercel AGENTS.md rules.
5. **`docs/03_BRAIN_ENRICHMENT_ENGINE.md`** — universal auto-enrichment primitive (B1–B7).
6. **`docs/04_CLUESINTELLIGENCE_UNIFICATION_PLAN.md`** — flagship architecture (L0–L10). Subject-to-change banner.
7. **`docs/BUILD_SEQUENCE.md`** — session-by-session deliverables. **Find your current track + session row.** Tracks A–F (Olivia core + clueslondon ship), G–K (cascade + agents + multi-tenant + verticals + hardening), Track Calendar (C1–C6), Track N (Visual Manifestation N1–N5), Track O (Weakness Closure O1–O5), Track L (cluesintelligence Unification, post-clueslondon).
8. **`docs/SESSION_LOG_2026-05-02_GRAND_MASTER_PLAN.md`** — Parts 1–15. **Read the most recent Part for what just shipped + decisions + Session N+1 handoff.** Currently Part 15 = Session 8 = Track Calendar C1 done.
9. **`docs/STUDIO_PORT_MANIFEST.md`** — per-subsystem port inventory + adaptations + post-mortem sections. § A–I = pre-pivot Studio plans (still valid for Track B Documents post-Clerk). § J = Map subsystem (ported Session 7). § K = Documents subsystem entanglement post-mortem (must read before any documents-port attempt — Clerk strategy required first). § L will be added in Track Calendar C6.
10. **`README.md`** — Visual Manifestation Stack (Tier 1–4 APIs, Gamma is partner not competitor) + Weakness Backlog (W-001 through W-012, append-only).

**Skip in normal sessions** (large, lookup-only): `docs/MERGE_INVENTORY.md` (233-row capability matrix), the 95 KB `StudioOliviaGrandMaster (2).jsx` (use design doc instead), `docs/architecture-historical/V_*.md`.

---

## WHERE YOU ARE NOW (post-Session 8)

### What's working end-to-end

| Path | What |
|------|------|
| `/test-avatar` | Click **Start Live Avatar** → click **Speak** → Olivia lip-syncs (Sessions 1–2). Type into "Talk to Olivia" → cascade walks → reply → ElevenLabs PCM → lip-syncs (Sessions 4–6). Gated by `ADMIN_API_KEY` (passed via `?key=` or pasted in input). |
| `/api/olivia/chat` | Production chat endpoint. Cascade-routed (Anthropic → OpenAI → Google → Grok → Perplexity → Mistral → Groq → Tavily → Opus judge). Persists turns. Full `attempts` trail in metadata. Mock-mode degrades gracefully when no provider keys set. |
| `/api/olivia/liveavatar` + `/speak` | LiveKit room + ElevenLabs PCM bridge. Admin-key gated until Track F Session 18 (Clerk). |
| **Bridge providers** | `OliviaSelfProvider` + `LtmKnowledgeProvider` registered with 76 tests + full UKP contract. |
| `/map` | Map UI shell ported byte-for-byte from LTM (Session 7). 3-tier vendor fallback: Google Maps 3D → Google Maps standard → Mapbox → "API key required" message. **Renders empty until per-spoke adapter feeds data** (Track J) — by design. **Visual fidelity gap** (W-011 + W-012) — Olivia Brain has no Tailwind; LTM map files use 223+ Tailwind classes that are inert. Resolution in Track C UI rebuild. |

### What just shipped this session series (Sessions 1–8)

- **Sessions 1–6** (commits pre-`c109d0f`): LiveAvatar pipeline, bridge providers, chat brain v1 (single-provider), chat brain v2 (cascade-routed), `/test-avatar` end-to-end smoke flow. **94/94 tests passing.**
- **Session 7** (commits `faa8ab1`, `991f411`, `55ff466`, `76c3fb0`, `c86e24f`): Pivoted from documents-engine port (entanglement post-mortem in `STUDIO_PORT_MANIFEST.md` § K) to **LTM map port byte-for-byte** (28 files, 6,107 LOC). Added Track N (Visual Manifestation, N1–N5) + Track O (Weakness Closure, O1–O5). Added W-008 through W-010 + later W-011/W-012 (Tailwind + token divergence).
- **Session 8** (commits `ecfb38b`, `49ed993`, `1986edf`): Added Track Calendar (6 sessions C1–C6) for calendar + voice + email/call/share infrastructure. **C1 foundation shipped:** 14 calendar Prisma models + 15 enums (schema validates clean; Prisma client generated), `lib/video/embeddings.ts` ported byte-for-byte, 8 npm packages installed (FullCalendar suite + react-international-phone + rrule). 94/94 tests still passing. Schema adaptations: `cuid → UUID`, `userProfileId → userId`, LTM-domain FKs dropped, DealRoom dropped (real-estate spoke), Event-family not ported. **`lib/queries/calendar.ts` port DEFERRED to C2** — discovery surfaced 93 LTM-domain references requiring engine-aware adaptation, not the originally-scoped mechanical rename.
- **Session 9** (commits `948f6ed`, `95526a1`): **Track Calendar C2 calendar engine + queries shipped.** `src/lib/queries/calendar.ts` (1130 lines, all `userProfileId → userId` + LTM-domain selects stripped + `getMergedCalendarView` dropped). `src/lib/calendar/*` (16 of 19 files: 7 byte-for-byte, 6 with userId rename, 3 modified — olivia-guardrails minus DB call, proximity-cluster trimmed to haversineKm, index.ts barrel adjusted). 3 LTM files intentionally NOT ported (document-aware, founder-journey, workflow-generator) — defer to dependency tracks (Documents post-Clerk; AnalysisResult Track L). `src/lib/olivia/tools.ts` calendar slice ported with 2 tools (`get_user_calendar` adapted, `web_search` byte-for-byte); the other 22 LTM tools defer to C3/C4/Track L. **94/94 tests still passing. Typecheck clean.** New weakness W-014 logged (`match_calendar_memory()` SQL function not installed — graceful degradation in place).
- **Session 10** (commits `4291a39`, `273b242`): **Track Calendar C3 voice + olivia models + engine shipped.** 9 voice/olivia Prisma models added to schema.prisma (OliviaConversation, OliviaMessage, OliviaPresentation, OliviaConsent, OliviaGuardrail, OliviaUserMemory, VoiceConversation, VoiceContact, VoiceActionItem) with same C1/C2 adaptations + the deferred `voiceConversations` reverse relation on CalendarEntry wired. SQL migration generated via `prisma migrate diff` at `prisma/sql/02-add-voice-olivia-foundation.sql` (10.5 KB). 4 voice lib files ported (3 byte-for-byte: voice-conversation/document/prompts; 1 with userId rename: voice-memory). `tools.ts` extended with `get_user_memory` + `save_user_memory` tools + `hasLearningConsent` helper (now 4 tools). `olivia-guardrails.ts` DB integration restored (OliviaGuardrail model now exists). `chat.ts` slim slice ported (createConversation / getConversationHistory / getConversationMessages only — `processOliviaMessage` deferred per HANDOFF gotcha analysis). **`knowledge-base.ts` NOT ported** — no in-scope C3 consumer; deferred to future track. **94/94 tests still passing. Typecheck clean.**
- **Session 11** (commits `1657fe2`, `278a4f9`): **Track Calendar C4 voice/email/call/sms/WhatsApp routes shipped.** 19 of 21 LTM routes ported (call ×10, calls ×2, voice ×3, email/sms/whatsapp ×3, conversations/[id]/email ×1). 2 routes intentionally deferred: `voice/to-document` + `voice/to-package` (depend on Document/Package models not in Olivia Brain). **Auth: Option B chosen** — `lib/auth/session.ts` Clerk stub (`getAuthSession()` reads `STUB_USER_ID` env in dev/preview, throws in production). One-line swap when Clerk lands in Track F Session 18. Tracked as W-015. Supporting libs ported: `lib/twilio/client.ts` (coexists with pre-existing server.ts), `lib/elevenlabs/client.ts` (coexists with pre-existing voice/elevenlabs.ts), `lib/email/resend.ts` + `resend` npm installed. 4 routes had `prisma.userProfile.findUnique({ clerkUserId })` lookups dropped (userId IS Clerk user ID directly). **94/94 tests still passing. Typecheck clean.**
- **Session 12** (commit `cb678b7` + this docs commit): **Track Calendar C5 calendar UI + 18 of 24 API routes shipped.** 15 calendar UI components ported byte-for-byte (`AgendaRail`, `CalendarEntryModal`, `CalendarNotepad`, `CalendarView`, `ConfirmationChip`, `EventStatusWidget`, `FloatingCalendarWidget`, `FocusMode`, `InsightsPanel`, `OliviaPanel`, `PrepTaskList`, `SyncPanel`, `TabbedAgendaView`, `VoiceInput`, `index`) + 3 supporting (`components/tools/useDraggable`, `components/olivia/OliviaConsentModal`, `lib/mobile-keyboard`). 18 routes: `entries` (with ecosystem-events `prisma.event.findMany` block dropped), `prep-tasks`, `attendees` (linkedPersonId dropped), `analytics`, `memory`, `notes`, `olivia`, `plan`, `travel`, `sync` root + 5 sub-routes (google/outlook callbacks drop UserProfile lookup; calendly drops email-based UserProfile lookup → matches via CalendarSyncAccount.providerEmail), `cron/calendar-sync`, `cron/calendar-plan`, plus added `app/api/olivia/consent` (required by OliviaConsentModal). **6 routes intentionally deferred:** journey + workflow (AnalysisResult), documents (Document), nearby (Organization+Event), events ical/rsvp (Event/EventRsvp), videos/calendar (Video). **Adaptations:** PowerShell bulk script for `userProfileId → userId` (~140 occurrences), 10 `prisma.userProfile.findUnique` lookups dropped, `linkedOrg`/`linkedEventId`/`linkedPersonId` references dropped from entries/attendees/prep-tasks/CalendarView/TabbedAgendaView. **`lib/system-alerts.ts`** console-only stub (SystemAlert model not in OB schema; **W-016**). **Tailwind/styling caveat carries forward (W-013).** Deps: `react-datepicker` + `@types/react-datepicker` installed. **94/94 tests still passing. Typecheck clean.**

---

## WHERE TO RESUME — Session 13 = Track Calendar C6

**Spec:** `docs/BUILD_SEQUENCE.md` Track Calendar C6 row.

### C6 Deliverable (app routes + smoke tests + STUDIO_PORT_MANIFEST §L — closes Track Calendar)

Three halves:

**Half 1 — App route mount:**
- `app/calendar/page.tsx` — server component shell that renders `CalendarPageClient`.
- `app/calendar/CalendarPageClient.tsx` — client wrapper that:
  - Fetches initial entries via `/api/calendar/entries?start=...&end=...`
  - Mounts `<CalendarView>` with the FullCalendar primitive
  - Wires `<CalendarNotepad>` share modals to the C4 routes (`/api/olivia/{email,sms,whatsapp}`)
  - Wires `<OliviaPanel>` to `/api/calendar/olivia`
  - Surfaces `<OliviaConsentModal>` on first load if user lacks `data_storage` consent (route `/api/olivia/consent` ported in C5)

**Half 2 — Vitest smoke tests:**
- `src/components/calendar/__tests__/CalendarView.test.tsx` — mount + assert FullCalendar wrapper renders with stubbed entries
- `src/components/calendar/__tests__/CalendarNotepad.test.tsx` — mount + assert share-modal triggers exist
- `src/components/calendar/__tests__/CalendarEntryModal.test.tsx` — mount + assert form fields render
- Tests should NOT exercise routes (would require MSW or DB mocking). Render-only smoke per the C6 spec.

**Half 3 — Documentation closure:**
- `docs/STUDIO_PORT_MANIFEST.md` — append **§L Calendar subsystem inventory** (port log of C1–C6: 14 + 9 Prisma models, ~19 lib/calendar files, 4 voice lib files, 18 + 21 routes ported / 8 routes deferred / 5 lib files deferred, with mapping back to LTM source paths). Same shape as §J (Map subsystem) for consistency.
- `docs/BUILD_SEQUENCE.md` — flip **C6 row to ✅** + flip the Track Calendar section header check.
- `docs/SESSION_LOG_2026-05-02_GRAND_MASTER_PLAN.md` — append Part 20 (Session 13 = C6).
- `README.md` — Track Calendar entry in roadmap → ✅; no new weakness rows expected.

**Exit criterion:** `/calendar` route loads in dev (`npm run dev`); 3 component smoke tests pass; STUDIO_PORT_MANIFEST §L populated; all 6 Track Calendar rows ✅ in BUILD_SEQUENCE; SESSION_LOG Part 20 captures the Session 13 work.

### Steps for C6

1. **Read in order**: this file → `docs/SESSION_LOG_…` Part 19 (Session 12 details) → `docs/BUILD_SEQUENCE.md` Track Calendar C6 row → `docs/STUDIO_PORT_MANIFEST.md` §J (Map subsystem) for the §L template shape.
2. **Inventory the LTM source pages** in read-only mode: `D:\London-Tech-Map\src\app\calendar\page.tsx` + any `CalendarPageClient` equivalent.
3. **Port the page shell** with userProfileId → userId rename + Option B `getAuthSession`. Drop any LTM-domain references (Event/Organization/Document/Video lookups won't survive — same pattern as C5 entries route).
4. **Write the 3 smoke tests** using Vitest's existing `setupFilesAfterEach` + `@testing-library/react`. Mount each component with stub data; assert basic structural render. Don't assert visual fidelity (degraded per W-013).
5. **Write `STUDIO_PORT_MANIFEST.md` §L** drawing from the SESSION_LOG Parts 14–20 (C1–C6) — port what was ported, defer what was deferred, link weakness IDs.
6. **Verify**: `npm run typecheck` clean, `npm test` shows **97/97 passing** (94 existing + 3 new smoke tests).
7. **Commit + push** code as `feat(calendar): Track Calendar C6 — app routes + smoke tests`.
8. **Commit + push** docs as `docs: close Track Calendar C6 — Calendar subsystem inventory + Track Calendar ✅`.

### Anticipated gotchas in C6

- **`/calendar` route SSR hazards.** `CalendarView` uses FullCalendar which references `window` on mount. The page shell must be a server component that loads the client component dynamically — same pattern as `/map` post-Vercel-fix (`d5fe4c3`). Don't repeat the bug from Session 7.
- **Smoke test stubs.** `CalendarEntryModal` uses `react-datepicker` (lazy-loaded) + Google Maps autocomplete (`@googlemaps/js-api-loader`). Tests need to stub or skip the lazy import + the Google Maps script load — otherwise tests hit network.
- **CalendarNotepad share modals.** The 3 channels (email/SMS/WhatsApp) all return `{ success: true }` from C4 routes. Smoke test should mount the modal but not trigger a fetch (avoid MSW dependency in C6).
- **Dev test for `/calendar`.** The exit criterion says "loads"; that's a `curl http://localhost:3000/calendar` 200 OK + non-empty HTML. Don't conflate with visual fidelity (degraded per W-013).
- **STUDIO_PORT_MANIFEST §L tone.** Same factual / file-level inventory as §J — port log, not a marketing doc. Include deferral reasons + the W-IDs that capture them.

### After C6: Session 14 (Track C UI rebuild — Session 9 in original numbering)

Track Calendar closes at C6. Session 14 starts Track C: Studio UI rebuild + design-system alignment. The Tailwind/token-alignment session (resolving W-011 + W-012 + W-013) is the first batch. See BUILD_SEQUENCE Track C for the 6-session breakdown.

---

## OPERATOR ACTIONS NEEDED (you, not the agent)

| Action | When | Why |
|--------|------|-----|
| ~~**Apply C1 migration to DB**~~ | DONE 2026-05-03 (Option B — Supabase SQL Editor paste). Calendar tables exist in dev DB. | — |
| **Apply C3 migration to DB** — paste contents of `prisma/sql/02-add-voice-olivia-foundation.sql` into Supabase SQL Editor and Run (Option B path, identical workflow to C1). | Before any of C4's routes start writing to voice/olivia tables | Schema-in-code → DB tables. 9 new tables: olivia_conversations, olivia_messages, olivia_presentations, olivia_consents, olivia_guardrails, olivia_user_memories, voice_conversations, voice_contacts, voice_action_items. |
| Set `STUB_USER_ID` env var in Vercel (Preview only) | Before testing C4 routes in Preview | The `lib/auth/session.ts` stub reads this. Set it to any string (e.g., `clerk_user_dev_001`). Throws clearly if unset. **NOT in Production** — production refuses to run the stub at all (W-015). |
| Set Twilio env vars (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`) in Vercel | Before C4 routes go live | Twilio call lifecycle + webhook signature verification. **Sensitive, Production + Preview only.** Add to `env.ts` when wired. |
| Set ElevenLabs env vars (`ELEVENLABS_API_KEY`, `ELEVENLABS_OLIVIA_VOICE_ID`) | Before any voice TTS feature goes live | Used by `/api/olivia/voice` + `/api/olivia/call/audio` for ElevenLabs audio generation. **Sensitive, Production + Preview only.** |
| Set `RESEND_API_KEY` (optional) | Before email features go live | `/api/olivia/email` and `/api/olivia/conversations/[id]/email` use Resend. Graceful skip + console warning if missing. **Sensitive, Production + Preview only.** |
| Set `NEXT_PUBLIC_GOOGLE_MAPS_KEY` + `NEXT_PUBLIC_MAPBOX_TOKEN` in Vercel | Whenever you want the `/map` route to actually render | Without keys, map page shows "API key required" message. NEXT_PUBLIC_* uses **All Environments** per `~/CLAUDE.md`. Map clicks 404 to `/directory/{id}` and `/videos/{id}` since Olivia Brain has no such routes — see W-008. |
| Set `OPENAI_API_KEY` if not already | Before running calendar memory features (C5+) | `lib/video/embeddings.ts` uses it for vector embeddings. Marked **Sensitive**, **Production + Preview only**. |
| Install `match_calendar_memory()` PostgreSQL function in Supabase | When calendar memory becomes a user-facing feature (likely C5/C6) | C2's `searchCalendarMemory()` calls it via raw SQL. Currently degrades to empty array + console warning. **W-014** in README. LTM reference body in `D:\London-Tech-Map\prisma\sql\`. |
| Set Google OAuth + Outlook OAuth keys (`GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`, `MICROSOFT_CALENDAR_CLIENT_ID`, `MICROSOFT_CALENDAR_CLIENT_SECRET`, `CALENDAR_ENCRYPTION_KEY`, `NEXT_PUBLIC_APP_URL`) | Before C5's calendar UI tries to OAuth | Calendar sync (`google-sync.ts` / `outlook-sync.ts` already ported in C2) needs these for OAuth flows. Not yet declared in `env.ts`. Add when C5 wires the API routes. **Sensitive, Production + Preview only.** |
| Set `TAVILY_API_KEY` | Before web_search tool is useful | C2's tools.ts has `web_search` that calls Tavily. Without the key, returns "Web search is not configured" gracefully. **Sensitive, Production + Preview only.** |

---

## MEMORIES YOU'LL FIND (auto-loaded, in `~/.claude/projects/C--Users-broke/memory/`)

These ARE the architectural decisions that took multiple painful conversations to lock. **Trust them — don't re-derive.**

| Memory | What it locks |
|--------|---------------|
| `feedback_world_class_standard` | 12-row standard table; no band-aids; root-cause every failure. |
| `feedback_gamma_is_partner` | Gamma is Olivia's presentation runtime. **Never** frame it as competition. Integrate via Gamma API + Gamma MCP. Closest peers for clueslondon are Pitch.com, Tome, Beautiful.ai, advisory firms. |
| `feedback_weakness_workflow` | Weaknesses → README + BUILD_SEQUENCE + memories. Doc-discipline rule: ALL architecture docs commit alongside code changes. |
| `reference_olivia_clues_product_truth` | Pointer to `00_PRODUCT_TRUTH.md`. Bicycle-wheel; clueslondon ship priority 1; cluesintelligence flagship priority 2. |
| `reference_olivia_ui_design_system` | Pointer to `01_UI_DESIGN_SYSTEM.md`. Aurum + Aether, LCH color space, Linear 3-input theming. |
| `reference_olivia_brain_enrichment_engine` | Pointers to `03_BRAIN_ENRICHMENT_ENGINE.md` + `04_CLUESINTELLIGENCE_UNIFICATION_PLAN.md`. |
| `reference_olivia_brain_docs` | Olivia Brain canonical doc set + read order. |
| `project_ltm_map_calendar_adaptive` | LTM map (24 files, Google Maps + Mapbox dual) + calendar (36 files + full `lib/calendar/`) port byte-for-byte; need adaptive primitives in Studio-Olivia (Track N + Calendar). |
| `project_olivia_surface_suppression` | When Olivia embeds in a host that already provides a surface (LTM has map + calendar), Olivia hides her own. Mechanism: tenant config `ui.suppressedSurfaces: string[]`. Lands Track I Session 24. |
| `project_ltm_types_no_speculative_generalization` | Don't refactor `DistrictWithStats`, `MapOrg`, `CalendarEntry`, etc. into generic abstractions speculatively. Wait for second non-LTM consumer (cluesintelligence Track L). Don't stub LTM-specific routes. Don't add LTM Prisma models. |

---

## RECENT COMMIT TRAIL (last 14)

```
<this docs commit>  docs: close Track Calendar C5 — UI + 18 routes done; W-013 + W-016 logged; resume at C6
cb678b7 feat(calendar): Track Calendar C5 — UI components + calendar API routes
2a69430 docs: refresh HANDOFF.md HEAD reference for fresh-conversation pickup
d5fe4c3 fix(map): move next/dynamic out of Server Component (Vercel build fix)
278a4f9 docs: close Track Calendar C4 — voice/email/call/sms/WhatsApp routes done
1657fe2 feat(calendar): Track Calendar C4 — voice/email/call/sms/WhatsApp routes
273b242 docs: close Track Calendar C3 — voice + olivia models + engine done
4291a39 feat(calendar): Track Calendar C3 — voice + olivia models + engine
95526a1 docs: close Track Calendar C2 — engine + queries done
948f6ed feat(calendar): Track Calendar C2 — engine + queries
58f98f2 docs: HANDOFF.md HEAD reference + SQL migration fold-in
52b4fad chore(db): add raw SQL migration for Track Calendar C1 foundation
9689797 docs: rewrite HANDOFF.md for post-Session-8 state — resume at Track Calendar C2
1986edf docs: close Track Calendar C1 — schema + embeddings + npm done; queries to C2
```

---

## STRATEGIC PRIORITY (locked 2026-05-03)

Founder direction: focus on **`clueslondon.com` (priority 1)** and **`cluesintelligence.com` (priority 2 — FLAGSHIP)**. Both ship targets. cluesxscore (priority 3) and white-label Olivia (priority 4) follow. Path 2 from the Sessions-to-Finish accounting was chosen (ship both flagships even if past 2026-06-02). ~60 sessions to finish priorities 1–4.

**Sessions 1–12 done. ~48 remaining.** Track Calendar (5 of 6 sessions done — C1 + C2 + C3 + C4 + C5; C6 next) does NOT block clueslondon ship — per surface suppression rule, clueslondon-prod tenant hides Olivia's calendar (LTM provides). Track Calendar makes calendar functional for cluesintelligence + standalone + future spokes.

---

## START SEQUENCE (next session)

```bash
cd "D:\Olivia Brain"
git status                                    # should be clean, on main, up to date with origin/main
git log --oneline -5                          # confirm HEAD is at the post-Session-11 docs commit
```

Then in Claude Code:
1. Read this file (`HANDOFF.md`).
2. Read `docs/SESSION_LOG_2026-05-02_GRAND_MASTER_PLAN.md` Part 19 for Session 12 details (the C5 port + the 6 deferred routes + the W-013 / W-016 weakness rationale).
3. Read `docs/BUILD_SEQUENCE.md` Track Calendar C6 row for the deliverable spec.
4. Read `docs/STUDIO_PORT_MANIFEST.md` §J (Map subsystem) for the §L template shape — C6 produces the equivalent inventory for Calendar.
5. Pull up the LTM source files in **read-only** mode: `D:\London-Tech-Map\src\app\calendar\` (page + client wrapper).
6. Begin C6 with the page-shell port (avoid the SSR hazard from Session 7 — `next/dynamic` must be in a client component, see commit `d5fe4c3`), then the 3 Vitest smoke tests, then STUDIO_PORT_MANIFEST §L.

**Standing rule reminder:** stop after C6's deliverable lands. Track Calendar closes at C6 — confirm with the user before starting Track C (Session 14). Update docs alongside the code commit per the doc-discipline rule.
