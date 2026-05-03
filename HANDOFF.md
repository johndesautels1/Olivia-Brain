# OLIVIA BRAIN — NEXT AGENT HANDOFF

**Updated:** 2026-05-03
**HEAD:** `948f6ed` on `main` (will advance once this doc commit lands)
**State:** Track Calendar C2 closed. **Resume at Session 10 = Track Calendar C3 (voice + Olivia models + engine).**
**Working tree:** clean. All commits pushed to `origin/main`.

> The previous version of this file (dated 2026-05-03, post-Session-8 era) is preserved in git history. This file replaces it with the current post-Session-9 state. The session series captured here (Sessions 1–9) is documented in detail in `docs/SESSION_LOG_2026-05-02_GRAND_MASTER_PLAN.md` Parts 10–16.

---

## REPO LOCATIONS

| Repo | Path | Status |
|------|------|--------|
| **Olivia Brain (this — your working repo)** | `D:\Olivia Brain` | Current. HEAD `948f6ed`. |
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
- **Session 9** (commits `948f6ed` + this docs commit): **Track Calendar C2 calendar engine + queries shipped.** `src/lib/queries/calendar.ts` (1130 lines, all `userProfileId → userId` + LTM-domain selects stripped + `getMergedCalendarView` dropped). `src/lib/calendar/*` (16 of 19 files: 7 byte-for-byte, 6 with userId rename, 3 modified — olivia-guardrails minus DB call, proximity-cluster trimmed to haversineKm, index.ts barrel adjusted). 3 LTM files intentionally NOT ported (document-aware, founder-journey, workflow-generator) — defer to dependency tracks (Documents post-Clerk; AnalysisResult Track L). `src/lib/olivia/tools.ts` calendar slice ported with 2 tools (`get_user_calendar` adapted, `web_search` byte-for-byte); the other 22 LTM tools defer to C3/C4/Track L. **94/94 tests still passing. Typecheck clean.** New weakness W-014 logged (`match_calendar_memory()` SQL function not installed — graceful degradation in place).

---

## WHERE TO RESUME — Session 10 = Track Calendar C3

**Spec:** `docs/BUILD_SEQUENCE.md` Track Calendar C3 row.

### C3 Deliverable (voice + Olivia models + engine)

1. **Add 10 voice/olivia Prisma models** to `prisma/schema.prisma`:
   - `VoiceConversation`, `VoiceContact`, `VoiceActionItem`
   - `OliviaConversation`, `OliviaMessage`, `OliviaPresentation`
   - `OliviaConsent`, `OliviaGuardrail`, `OliviaUserMemory`
   - Apply same schema adaptations as C1: `cuid → UUID`, `userProfileId → userId`, LTM-domain FKs dropped (linkedOrg/linkedEvent/linkedPerson never appear here, but verify), camelCase field naming preserved for byte-for-byte port of LTM lib files.
   - Generate raw SQL migration (same Option A or Option B path as C1) so operator can apply via Supabase SQL Editor.
2. **Port voice/olivia lib files** (4 files, ~52 KB):
   - `D:\London-Tech-Map\src\lib\olivia\voice-conversation.ts`
   - `D:\London-Tech-Map\src\lib\olivia\voice-document.ts`
   - `D:\London-Tech-Map\src\lib\olivia\voice-memory.ts`
   - `D:\London-Tech-Map\src\lib\olivia\voice-prompts.ts`
3. **Port voice slice of `lib/olivia/tools.ts`**: extend the 2-tool C2 carve with the voice-related tools (`get_user_memory`, `save_user_memory`, possibly `dispatch_agent` if it has a voice angle). Now that OliviaUserMemory + OliviaConsent exist, the `getUserProfileId` / `hasLearningConsent` helpers from LTM tools.ts also port (adapted to use Clerk `userId` directly, no UserProfile lookup).
4. **Re-port `olivia-guardrails.ts` DB integration**: now that `OliviaGuardrail` model exists, restore the LTM `fetchGuardrails()` + `clearGuardrailsCache()` + `formatGuardrailsForPrompt()` functions and the merge logic in `buildGuardrailsPromptSection()`. LTM source unchanged (still at `D:\London-Tech-Map\src\lib\calendar\olivia-guardrails.ts`); just re-introduce what C2 dropped.
5. **Port `lib/olivia/knowledge-base.ts`** (31 KB) — page descriptions used by `get_page_content` tool.
6. **Port chat slice of `lib/olivia/chat.ts`** — thin wrapper around the cascade chat that's voice-aware.
7. **Verify**: `npm run typecheck` clean, `npm test` 94/94 still passing (no voice tests yet — those land in C5/C6).
8. **Commit + push** code as `feat(calendar): Track Calendar C3 — voice + olivia models + engine`.
9. **Doc updates** (per doc-discipline rule):
   - `BUILD_SEQUENCE.md` C3 row → ✅ with what shipped.
   - `SESSION_LOG_2026-05-02_GRAND_MASTER_PLAN.md` → append Part 17.
   - `HANDOFF.md` → re-point at Session 11 = Track Calendar C4.
   - Commit + push as `docs: close Track Calendar C3 — voice + olivia models + engine done`.

### Anticipated gotchas in C3

- **Voice file transitive deps**: `voice-conversation.ts` etc. likely import from `@/lib/twilio/client` (which lands in C4) and `@/lib/olivia/chat`. Be careful about circular dependencies. The voice files probably also reference `prisma.voiceConversation` and `prisma.oliviaConversation` heavily — same `userProfileId → userId` rename pattern as C2.
- **Memory model schema**: `OliviaUserMemory` likely keys on `(userId, category, factKey)` as a compound unique. C1's pattern of dropping `cuid` defaults and using `gen_random_uuid()` applies; verify the LTM source for any `@db.Decimal` or `@db.Text` annotations.
- **Knowledge-base.ts page paths**: hardcoded LTM page paths like `/districts/...` won't exist in Olivia Brain. Either (a) port verbatim and let `get_page_content` return "page not found" for routes that don't exist (graceful), or (b) trim to only Olivia Brain routes (`/test-avatar`, `/admin`, `/map`). Recommend (a) byte-for-byte for re-port simplicity in Track L cluesintelligence.
- **Chat slice carve**: `lib/olivia/chat.ts` may pull in deep cascade dependencies. Scope carefully — the `/api/olivia/chat` route already works in Olivia Brain (built in Sessions 4-6); if `lib/olivia/chat.ts` is just adapter sugar over the cascade, it might already be redundant. Read first, decide whether to port at all.

---

## OPERATOR ACTIONS NEEDED (you, not the agent)

| Action | When | Why |
|--------|------|-----|
| ~~**Apply C1 migration to DB**~~ | DONE 2026-05-03 (Option B — Supabase SQL Editor paste). Calendar tables exist in dev DB. | — |
| **Apply C3 migration to DB** — when C3 lands, expect a new SQL file `prisma/sql/02-add-voice-olivia-foundation.sql` (or similar) for the 10 voice/olivia models. Same Option A / Option B path as C1. | Before C3 engine code (or C4 routes) hit voice/olivia tables | Schema-in-code → DB tables. |
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
<this docs commit>  docs: close Track Calendar C2 — engine + queries done
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
faa8ab1 docs: visual manifestation stack + weakness backlog (Track N + O)
c109d0f feat(test-avatar): wire chat brain end-to-end — Session 6
```

---

## STRATEGIC PRIORITY (locked 2026-05-03)

Founder direction: focus on **`clueslondon.com` (priority 1)** and **`cluesintelligence.com` (priority 2 — FLAGSHIP)**. Both ship targets. cluesxscore (priority 3) and white-label Olivia (priority 4) follow. Path 2 from the Sessions-to-Finish accounting was chosen (ship both flagships even if past 2026-06-02). ~60 sessions to finish priorities 1–4.

**Sessions 1–9 done. ~51 remaining.** Track Calendar (currently mid-flight, C1 + C2 done, C3 next) does NOT block clueslondon ship — per surface suppression rule, clueslondon-prod tenant hides Olivia's calendar (LTM provides). Track Calendar makes calendar functional for cluesintelligence + standalone + future spokes.

---

## START SEQUENCE (next session)

```bash
cd "D:\Olivia Brain"
git status                                    # should be clean, on main, up to date with origin/main
git log --oneline -5                          # confirm HEAD is at the post-Session-9 docs commit
```

Then in Claude Code:
1. Read this file (`HANDOFF.md`).
2. Read `docs/SESSION_LOG_2026-05-02_GRAND_MASTER_PLAN.md` Part 16 for Session 9 details (decisions on the 3 deferred LTM modules + the olivia-guardrails / proximity-cluster trimmed-port pattern).
3. Read `docs/BUILD_SEQUENCE.md` Track Calendar C3 row for the deliverable spec.
4. Pull up the LTM source files in **read-only** mode: `D:\London-Tech-Map\src\lib\olivia\voice-conversation.ts`, `voice-document.ts`, `voice-memory.ts`, `voice-prompts.ts`, `knowledge-base.ts`, `chat.ts`. Plus the voice-tool slice of `D:\London-Tech-Map\src\lib\olivia\tools.ts` (handler functions for `get_user_memory`, `save_user_memory`, `getUserProfileId`, `hasLearningConsent`).
5. Read the LTM Prisma schema for the 10 voice/olivia models you're adding to Olivia Brain's schema: `D:\London-Tech-Map\prisma\schema.prisma` (search for `model VoiceConversation`, `model OliviaConversation`, etc.).
6. Begin C3 with the schema additions. Show the user the proposed model adaptations before writing (same pattern as C1 + C2).

**Standing rule reminder:** stop after C3's deliverable lands. Don't chain into C4 without the user's go-ahead. Update docs alongside the code commit per the doc-discipline rule.
