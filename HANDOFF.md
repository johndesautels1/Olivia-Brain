# OLIVIA BRAIN — NEXT AGENT HANDOFF

**Updated:** 2026-05-03
**HEAD:** `d5fe4c3` on `main`
**State:** Track Calendar C4 closed + map build fix shipped. **Resume at Session 12 = Track Calendar C5 (calendar UI + 24 calendar API routes).**
**Working tree:** clean. All commits pushed to `origin/main`. **Vercel build green** (was failing pre-`d5fe4c3` — see commit message).

> The previous version of this file (dated 2026-05-03, post-Session-10 era) is preserved in git history. This file replaces it with the current post-Session-11 state. The session series captured here (Sessions 1–11) is documented in detail in `docs/SESSION_LOG_2026-05-02_GRAND_MASTER_PLAN.md` Parts 10–18.

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
- **Session 11** (commits `1657fe2` + this docs commit): **Track Calendar C4 voice/email/call/sms/WhatsApp routes shipped.** 19 of 21 LTM routes ported (call ×10, calls ×2, voice ×3, email/sms/whatsapp ×3, conversations/[id]/email ×1). 2 routes intentionally deferred: `voice/to-document` + `voice/to-package` (depend on Document/Package models not in Olivia Brain). **Auth: Option B chosen** — `lib/auth/session.ts` Clerk stub (`getAuthSession()` reads `STUB_USER_ID` env in dev/preview, throws in production). One-line swap when Clerk lands in Track F Session 18. Tracked as W-015. Supporting libs ported: `lib/twilio/client.ts` (coexists with pre-existing server.ts), `lib/elevenlabs/client.ts` (coexists with pre-existing voice/elevenlabs.ts), `lib/email/resend.ts` + `resend` npm installed. 4 routes had `prisma.userProfile.findUnique({ clerkUserId })` lookups dropped (userId IS Clerk user ID directly). **94/94 tests still passing. Typecheck clean.**

---

## WHERE TO RESUME — Session 12 = Track Calendar C5

**Spec:** `docs/BUILD_SEQUENCE.md` Track Calendar C5 row.

### C5 Deliverable (calendar UI + 24 calendar API routes)

Two halves:

**Half 1 — Calendar UI components (~15 files):**
- `components/calendar/CalendarView.tsx` (FullCalendar wrapper)
- `components/calendar/CalendarNotepad.tsx` (sophisticated note-taking surface — share modals wire to C4 routes for email/SMS/WhatsApp)
- `components/calendar/CalendarEntryModal.tsx`
- `components/calendar/CalendarSidebar.tsx`
- `components/calendar/CalendarToolbar.tsx`
- Sub-components: agenda rail, prep-task list, attendee list, recurrence editor, etc.
- Supporting hooks: `useDraggable`, `useMobileKeyboard`
- `OliviaConsentModal` (modal for Layer 2 GDPR consent — gates user-memory features)

**Half 2 — 24 calendar API routes** (per BUILD_SEQUENCE C5 row):
- `entries` (list/create/update/archive)
- `prep-tasks` (per-entry task CRUD)
- `sync ×6` (Google initiate, Google callback, Outlook initiate, Outlook callback, manual sync trigger, sync status)
- `attendees` (per-entry attendee CRUD)
- `analytics` (founder week + behavior stats)
- `journey` (Cristiano analysis hook — likely deferred since AnalysisResult model not in schema)
- `memory` (calendar memory chunks search)
- `nearby` (proximity cluster — degraded since proximity-cluster.ts only has haversineKm now)
- `notes` (CalendarNote CRUD)
- `olivia` (Olivia recommendations CRUD + parse natural language)
- `plan` (daily planning brief)
- `travel` (travel buffer insertion)
- `workflow` (calendar workflow generator — likely deferred since AnalysisResult not in schema)
- `cron ×2` (recommendation expiry cron + sync cron)
- `events ical/rsvp` (iCalendar export + RSVP capture — likely needs Event model not in schema; verify)
- `videos/calendar` (LTM-specific bridge — likely deferred)

**Exit criterion:** `<CalendarView>` and `<CalendarNotepad>` mount; share buttons hit C4 routes; smoke calls to entries/prep-tasks/notes/olivia/plan return proper responses.

### Steps for C5

1. **Read LTM source files in read-only mode**:
   - `D:\London-Tech-Map\src\components\calendar\` (15 files, ~638 KB total — verify per `project_ltm_map_calendar_adaptive` memory).
   - `D:\London-Tech-Map\src\app\api\calendar\` (24 routes — inventory the actual file count, port what's there).
2. **Apply Tailwind/styling caveat decision** (W-011 + W-012). Track Calendar UI ships structurally with degraded visual fidelity until Track C resolves design system. Add **W-013** to README backlog when C5 lands (reserved per existing BUILD_SEQUENCE note).
3. **Inventory which of the 24 routes need deferral** based on Olivia Brain's missing models. Likely candidates:
   - `journey` (AnalysisResult)
   - `workflow` (AnalysisResult + linkedOrgId)
   - `events ical/rsvp` (Event model)
   - `videos/calendar` (LTM-specific Video model)
   - `nearby` (Organization + Event models — may need to gracefully return empty)
4. **Port the 15 UI components** with `userProfileId → userId` rename + drop `linkedOrg`/`linkedEvent`/`linkedPerson` references.
5. **Port the API routes** that survive the dependency check, applying Option B Clerk stub pattern (`getAuthSession`).
6. **Verify**: `npm run typecheck` clean, `npm test` 94/94 still passing (smoke tests for components land in C6).
7. **Commit + push** code as `feat(calendar): Track Calendar C5 — UI components + calendar API routes`.
8. **Doc updates**:
   - `BUILD_SEQUENCE.md` C5 row → ✅ with what shipped.
   - `SESSION_LOG` → append Part 19.
   - `HANDOFF.md` → re-point at Session 13 = C6.
   - `README.md` → add **W-013** (calendar Tailwind/styling).

### Anticipated gotchas in C5

- **Tailwind classes inert.** W-011 + W-012 carry forward. Calendar UI files use Tailwind extensively (per LTM pattern). Olivia Brain has no Tailwind. Track structurally; visual fidelity in Track C.
- **CalendarNotepad share-modal wiring.** Modals open phone-input UI (react-international-phone, installed in C1) and call `/api/olivia/{email,sms,whatsapp}` (live post-C4). Verify response shapes match what the modals expect.
- **FullCalendar v6 API.** `@fullcalendar/{react,daygrid,timegrid,interaction,list,core}` already installed in C1. Verify the `EventInput` type and event-handler signatures haven't drifted from what LTM expects.
- **CalendarMemoryChunk pgvector search.** `match_calendar_memory()` SQL function is W-014. Routes calling it will return empty results gracefully.
- **`OliviaConsentModal` gates user-memory features.** Verify it persists to `OliviaConsent` model (consentType: "learning") via `/api/olivia/consent` route — that route may need to port if not already in scope.
- **Cron routes need Vercel cron config.** `vercel.json` declares cron schedules. Add the 2 cron paths from C5 when they land.
- **Auth dependency continues.** Use Option B `getAuthSession` stub for any route that needs userId. Same one-line-swap when Clerk lands.

### After C5: Session 13

- **C6** = `app/calendar/{page.tsx,CalendarPageClient.tsx}` + Vitest smoke tests for CalendarView, CalendarNotepad, CalendarEntryModal + STUDIO_PORT_MANIFEST §L (Calendar subsystem inventory + voice subsystem inventory) + mark all Track Calendar rows ✅. Closes Track Calendar.

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
<this docs commit>  docs: refresh HANDOFF.md HEAD reference for fresh-conversation pickup
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
49ed993 feat(calendar): Track Calendar C1 foundation — 14 Prisma models + 15 enums + embeddings + npm install
ecfb38b docs: add Track Calendar (6 sessions C1-C6) — calendar + voice + email/call/share
```

---

## STRATEGIC PRIORITY (locked 2026-05-03)

Founder direction: focus on **`clueslondon.com` (priority 1)** and **`cluesintelligence.com` (priority 2 — FLAGSHIP)**. Both ship targets. cluesxscore (priority 3) and white-label Olivia (priority 4) follow. Path 2 from the Sessions-to-Finish accounting was chosen (ship both flagships even if past 2026-06-02). ~60 sessions to finish priorities 1–4.

**Sessions 1–11 done. ~49 remaining.** Track Calendar (currently mid-flight, C1 + C2 + C3 + C4 done, C5 next) does NOT block clueslondon ship — per surface suppression rule, clueslondon-prod tenant hides Olivia's calendar (LTM provides). Track Calendar makes calendar functional for cluesintelligence + standalone + future spokes.

---

## START SEQUENCE (next session)

```bash
cd "D:\Olivia Brain"
git status                                    # should be clean, on main, up to date with origin/main
git log --oneline -5                          # confirm HEAD is at the post-Session-11 docs commit
```

Then in Claude Code:
1. Read this file (`HANDOFF.md`).
2. Read `docs/SESSION_LOG_2026-05-02_GRAND_MASTER_PLAN.md` Part 18 for Session 11 details (Option B Clerk auth strategy + 2 deferred routes + the 4 prisma.userProfile lookup drops).
3. Read `docs/BUILD_SEQUENCE.md` Track Calendar C5 row for the deliverable spec.
4. Pull up the LTM source files in **read-only** mode: `D:\London-Tech-Map\src\components\calendar\` directory tree (~15 files, ~638 KB) and `D:\London-Tech-Map\src\app\api\calendar\` directory tree (~24 routes — verify count).
5. **Inventory deferral candidates** before writing any code. Likely deferred (LTM-domain): `journey/route.ts`, `workflow/route.ts`, `events/ical/route.ts`, `events/rsvp/route.ts`, `videos/calendar/route.ts`. Verify against schema before deciding.
6. Begin C5 with the UI component port + the Tailwind/styling caveat (W-013). Show the user the deferral list before writing routes (same pattern as C1/C2/C3/C4).

**Standing rule reminder:** stop after C5's deliverable lands. Don't chain into C6 without the user's go-ahead. Update docs alongside the code commit per the doc-discipline rule.
