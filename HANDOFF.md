# OLIVIA BRAIN — NEXT AGENT HANDOFF

**Updated:** 2026-05-03
**HEAD:** `4291a39` on `main` (will advance once this doc commit lands)
**State:** Track Calendar C3 closed. **Resume at Session 11 = Track Calendar C4 (21 voice/email/call/sms/WhatsApp API routes).**
**Working tree:** clean. All commits pushed to `origin/main`.

> The previous version of this file (dated 2026-05-03, post-Session-9 era) is preserved in git history. This file replaces it with the current post-Session-10 state. The session series captured here (Sessions 1–10) is documented in detail in `docs/SESSION_LOG_2026-05-02_GRAND_MASTER_PLAN.md` Parts 10–17.

---

## REPO LOCATIONS

| Repo | Path | Status |
|------|------|--------|
| **Olivia Brain (this — your working repo)** | `D:\Olivia Brain` | Current. HEAD `4291a39`. |
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
- **Session 10** (commits `4291a39` + this docs commit): **Track Calendar C3 voice + olivia models + engine shipped.** 9 voice/olivia Prisma models added to schema.prisma (OliviaConversation, OliviaMessage, OliviaPresentation, OliviaConsent, OliviaGuardrail, OliviaUserMemory, VoiceConversation, VoiceContact, VoiceActionItem) with same C1/C2 adaptations + the deferred `voiceConversations` reverse relation on CalendarEntry wired. SQL migration generated via `prisma migrate diff` at `prisma/sql/02-add-voice-olivia-foundation.sql` (10.5 KB). 4 voice lib files ported (3 byte-for-byte: voice-conversation/document/prompts; 1 with userId rename: voice-memory). `tools.ts` extended with `get_user_memory` + `save_user_memory` tools + `hasLearningConsent` helper (now 4 tools). `olivia-guardrails.ts` DB integration restored (OliviaGuardrail model now exists). `chat.ts` slim slice ported (createConversation / getConversationHistory / getConversationMessages only — `processOliviaMessage` deferred per HANDOFF gotcha analysis). **`knowledge-base.ts` NOT ported** — no in-scope C3 consumer; deferred to future track. **94/94 tests still passing. Typecheck clean.**

---

## WHERE TO RESUME — Session 11 = Track Calendar C4

**Spec:** `docs/BUILD_SEQUENCE.md` Track Calendar C4 row.

### C4 Deliverable (21 voice/email/call/sms/WhatsApp API routes)

Port LTM's 21 API routes for voice + email + call + SMS + WhatsApp. Group by purpose:

1. **Twilio call lifecycle** (`/api/olivia/call/*` — 9 routes):
   - `call/route.ts`, `audio/route.ts`, `extract/route.ts`, `gather/route.ts`, `inbound/route.ts`, `outbound/route.ts`, `recording/route.ts`, `reminder/route.ts`, `status/route.ts`, `twiml/route.ts` (this is actually 10 — verify against LTM).
2. **Call CRUD** (`/api/olivia/calls{,/[id]}` — 2 routes): list + detail.
3. **Voice processing** (`/api/olivia/voice/*` — 5 routes):
   - `voice/route.ts`, `voice/presentation/route.ts`, `voice/process/route.ts`, `voice/to-document/route.ts`, `voice/to-package/route.ts`.
4. **Channel routes** (3 routes):
   - `/api/olivia/email/route.ts`, `/api/olivia/sms/route.ts`, `/api/olivia/whatsapp/route.ts`.
5. **Conversation email** (1 route):
   - `/api/olivia/conversations/[id]/email/route.ts`.

**Exit criterion:** all 21 routes return proper responses on smoke calls. Twilio webhook signature verification matches LTM.

### Steps for C4

1. **Read LTM source files in read-only mode**: `D:\London-Tech-Map\src\app\api\olivia\` directory tree. Inventory the actual route file count (BUILD_SEQUENCE C4 row says "21" but verify against LTM — port what's actually there, not what the row claims).
2. **Port `lib/twilio/client.ts`** if not already present in Olivia Brain. The voice files (already ported in C3) reference Twilio bindings via dynamic import (`getTwilioModule`); the actual Twilio SDK wrapper needs to ship in C4 so routes can call it. Likely lives at `D:\London-Tech-Map\src\lib\twilio\client.ts`.
3. **Port routes** with adaptations:
   - `userProfileId → userId` everywhere (from C1/C2/C3 pattern).
   - Strip any `linkedOrg` / `linkedEvent` / `linkedPerson` / `Document` / `Package` / `AnalysisResult` includes that LTM routes might reference (those models don't exist in Olivia Brain).
   - Auth: LTM probably uses Clerk `auth()` from `@clerk/nextjs/server`. Olivia Brain doesn't have Clerk wired yet (that lands Track F Session 18). Decision needed: (a) add Clerk dependency now (pulling Session 18 forward for these routes), or (b) stub the auth context per-route.
4. **Verify**: `npm run typecheck` clean, `npm test` 94/94 still passing (no API route tests yet — those land in C6).
5. **Commit + push** code as `feat(calendar): Track Calendar C4 — voice/email/call/sms/WhatsApp routes`.
6. **Doc updates**:
   - `BUILD_SEQUENCE.md` C4 row → ✅ with what shipped.
   - `SESSION_LOG` → append Part 18.
   - `HANDOFF.md` → re-point at Session 12 = C5.

### Anticipated gotchas in C4

- **Clerk auth dependency.** This is the FIRST C-track session that needs auth context inside API routes. Track F Session 18 wires Clerk; if pulling forward isn't desirable, build a per-route auth-resolution helper that returns a stub userId until Clerk lands. **Decision before any route ports** — don't band-aid case-by-case.
- **Twilio webhook signature verification.** LTM uses `twilio.validateRequest(authToken, signature, url, params)`. Olivia Brain's `env.ts` doesn't yet declare Twilio env vars — add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` (Sensitive, Production + Preview only).
- **TwiML response generation.** Twilio's `twiml.VoiceResponse` is a class with `.say()`, `.gather()`, `.record()`, etc. methods. Returns XML. Routes return `new Response(xml, { headers: { 'Content-Type': 'text/xml' } })`. Verify the Twilio SDK version Olivia Brain has (or installs) supports the TwiML builder API used by LTM.
- **WhatsApp / SMS sender helpers.** LTM probably has `lib/twilio/whatsapp.ts` and `lib/twilio/sms.ts` wrappers. Inventory before porting routes.
- **Email sender.** LTM uses Resend or similar. Olivia Brain may not have email infra yet — check `lib/email/*` if it exists.

### After C4: Sessions 12 and 13

- **C5** = calendar UI (15 components) + 24 calendar API routes.
- **C6** = `app/calendar/{page.tsx,CalendarPageClient.tsx}` + Vitest smoke tests + STUDIO_PORT_MANIFEST §L (Calendar subsystem inventory).

---

## OPERATOR ACTIONS NEEDED (you, not the agent)

| Action | When | Why |
|--------|------|-----|
| ~~**Apply C1 migration to DB**~~ | DONE 2026-05-03 (Option B — Supabase SQL Editor paste). Calendar tables exist in dev DB. | — |
| **Apply C3 migration to DB** — paste contents of `prisma/sql/02-add-voice-olivia-foundation.sql` into Supabase SQL Editor and Run (Option B path, identical workflow to C1). | Before C4 routes start hitting voice/olivia tables | Schema-in-code → DB tables. 9 new tables: olivia_conversations, olivia_messages, olivia_presentations, olivia_consents, olivia_guardrails, olivia_user_memories, voice_conversations, voice_contacts, voice_action_items. |
| Set Twilio env vars (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`) in Vercel | Before C4 routes go live | Twilio call lifecycle + webhook signature verification. **Sensitive, Production + Preview only.** Add to `env.ts` when wired. |
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
<this docs commit>  docs: close Track Calendar C3 — voice + olivia models + engine done
4291a39 feat(calendar): Track Calendar C3 — voice + olivia models + engine
95526a1 docs: close Track Calendar C2 — engine + queries done
948f6ed feat(calendar): Track Calendar C2 — engine + queries
58f98f2 docs: HANDOFF.md HEAD reference + SQL migration fold-in
52b4fad chore(db): add raw SQL migration for Track Calendar C1 foundation
9689797 docs: rewrite HANDOFF.md for post-Session-8 state — resume at Track Calendar C2
1986edf docs: close Track Calendar C1 — schema + embeddings + npm done; queries to C2
49ed993 feat(calendar): Track Calendar C1 foundation — 14 Prisma models + 15 enums + embeddings + npm install
ecfb38b docs: add Track Calendar (6 sessions C1-C6) — calendar + voice + email/call/share
c86e24f docs: post-Session-7 audit — data-layer + styling deferrals
76c3fb0 docs: close Session 7 — map port done, documents deferred to Session 8
55ff466 feat(map): port LTM map subsystem byte-for-byte — Session 7
991f411 chore: pre-install recharts + lucide-react for Track N
```

---

## STRATEGIC PRIORITY (locked 2026-05-03)

Founder direction: focus on **`clueslondon.com` (priority 1)** and **`cluesintelligence.com` (priority 2 — FLAGSHIP)**. Both ship targets. cluesxscore (priority 3) and white-label Olivia (priority 4) follow. Path 2 from the Sessions-to-Finish accounting was chosen (ship both flagships even if past 2026-06-02). ~60 sessions to finish priorities 1–4.

**Sessions 1–10 done. ~50 remaining.** Track Calendar (currently mid-flight, C1 + C2 + C3 done, C4 next) does NOT block clueslondon ship — per surface suppression rule, clueslondon-prod tenant hides Olivia's calendar (LTM provides). Track Calendar makes calendar functional for cluesintelligence + standalone + future spokes.

---

## START SEQUENCE (next session)

```bash
cd "D:\Olivia Brain"
git status                                    # should be clean, on main, up to date with origin/main
git log --oneline -5                          # confirm HEAD is at the post-Session-10 docs commit
```

Then in Claude Code:
1. Read this file (`HANDOFF.md`).
2. Read `docs/SESSION_LOG_2026-05-02_GRAND_MASTER_PLAN.md` Part 17 for Session 10 details (decisions on processOliviaMessage / knowledge-base deferrals + the schema-model-count correction from 10 to 9).
3. Read `docs/BUILD_SEQUENCE.md` Track Calendar C4 row for the deliverable spec.
4. **Make the Clerk decision before touching any route file.** This is the first C-track session that needs auth context inside API routes. Either pull Track F Session 18 forward (install Clerk now) or write a `getAuthSession()` helper that returns a stub userId. Whichever path the user picks, document it.
5. Pull up the LTM source files in **read-only** mode: inventory `D:\London-Tech-Map\src\app\api\olivia\` directory tree (call/, calls/, voice/, email/route.ts, sms/route.ts, whatsapp/route.ts, conversations/[id]/email/route.ts). Also read `D:\London-Tech-Map\src\lib\twilio\client.ts` if it exists.
6. Begin C4 with the Twilio client + first batch of routes. Show the user the proposed adaptation diff for at least the first route before writing (same pattern as C1/C2/C3).

**Standing rule reminder:** stop after C4's deliverable lands. Don't chain into C5 without the user's go-ahead. Update docs alongside the code commit per the doc-discipline rule.
