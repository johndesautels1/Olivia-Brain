# OLIVIA BRAIN — NEXT AGENT HANDOFF

**Updated:** 2026-05-03
**HEAD:** `1986edf` on `main`
**State:** Track Calendar C1 closed. **Resume at Session 9 = Track Calendar C2 (engine + queries port).**
**Working tree:** clean. Last 5 commits all pushed to `origin/main`.

> The previous version of this file (dated 2026-05-01, Phase 4.5 era) is preserved in git history. This file replaces it with the current post-pivot state. The session series captured here (Sessions 1–8) is documented in detail in `docs/SESSION_LOG_2026-05-02_GRAND_MASTER_PLAN.md` Parts 10–15.

---

## REPO LOCATIONS

| Repo | Path | Status |
|------|------|--------|
| **Olivia Brain (this — your working repo)** | `D:\Olivia Brain` | Current. HEAD `1986edf`. |
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

---

## WHERE TO RESUME — Session 9 = Track Calendar C2

**Spec:** `docs/BUILD_SEQUENCE.md` Track Calendar C2 row.

### C2 Deliverable (calendar engine + queries)

1. **Adapt + port `lib/queries/calendar.ts`** (LTM source: `D:\London-Tech-Map\src\lib\queries\calendar.ts`, 35 KB, 93 LTM-domain references). Mechanical:
   - `userProfileId` → `userId` rename (all occurrences).
   - Remove `linkedEvent` SELECT clause.
   - Remove `linkedOrg` SELECT clause.
   - Remove `linkedEventId`, `linkedOrgId`, `linkedPersonId` from select objects + `CalendarEntryWithDetails` interface.
   - Remove `attendees.linkedPersonId` from select.
   - Verify nothing else breaks against the C1 Prisma schema.
2. **Port `lib/calendar/*` byte-for-byte** (19 files, ~189 KB):
   - `olivia-engine.ts`, `olivia-prompts.ts`, `olivia-schemas.ts` (the Olivia voice-aware calendar AI core).
   - `calendar-judge.ts` (Cristiano Opus judge for calendar conflicts).
   - `calendar-memory.ts` (uses `lib/video/embeddings.ts` from C1).
   - `behavior-engine.ts` (self-learning from interactions).
   - `document-aware.ts`, `daily-brief.ts`, `event-categories.ts`, `founder-journey.ts`.
   - `google-sync.ts`, `outlook-sync.ts` (OAuth token sync).
   - `crypto.ts` (AES-256-GCM for OAuth tokens).
   - `proximity-cluster.ts`, `rrule-expand.ts`, `travel-buffer.ts`, `workflow-generator.ts`.
   - `olivia-guardrails.ts`, `index.ts`.
3. **Carve out the calendar slice of `lib/olivia/tools.ts`** (LTM source: 75 KB). Only the calendar-relevant tools — `OLIVIA_TOOLS` and `executeOliviaTool` calendar functions. The voice slice ports in C3.
4. **Verify**: `npm run typecheck` clean, `npm test` 94/94 still passing (no calendar tests yet — those land in C5/C6).
5. **Commit + push** code as `feat(calendar): Track Calendar C2 — engine + queries`.
6. **Doc updates** (per doc-discipline rule):
   - `BUILD_SEQUENCE.md` C2 row → ✅ with what shipped.
   - `SESSION_LOG_2026-05-02_GRAND_MASTER_PLAN.md` → append Part 16.
   - Commit + push as `docs: close Track Calendar C2 — engine + queries done`.

### Anticipated gotchas in C2

- **Tools.ts slice extraction**: 75 KB file — need to identify which exports are calendar-only vs. voice/chat. The full file imports from many `@/lib/...` — be careful about transitive deps (probably need `lib/olivia/voice-prompts.ts` for some tools — defer those tools to C3).
- **Google/Outlook sync**: `google-sync.ts` and `outlook-sync.ts` use OAuth flows. They probably reference NextAuth or Clerk for the auth context. Those don't exist in Olivia Brain yet (Clerk lands Track F Session 18). Workaround: add a stub `getAuthSession()` that throws "not yet wired" until Clerk lands. Track as **W-014** if not already.
- **`lib/calendar/calendar-memory.ts`**: uses `prisma.$queryRaw<...>` with `match_calendar_chunks()` SQL function (similar to the video-search pattern in `lib/video/embeddings.ts`). The SQL function won't exist in Olivia Brain's Supabase. Calls degrade to empty results gracefully if you copy LTM's pattern. Note in commit message.
- **camelCase preservation**: the queries file uses camelCase fields matching LTM. Olivia Brain's older models use snake_case. The mixed convention is documented in `prisma/schema.prisma` header (added in C1). Don't refactor either side.

---

## OPERATOR ACTIONS NEEDED (you, not the agent)

| Action | When | Why |
|--------|------|-----|
| `cd "D:\Olivia Brain" && npx prisma migrate dev --name add_calendar_foundation` | Before C2 engine code starts hitting calendar tables | Schema is in code; tables not yet in dev DB. C2 engine will query them. |
| Set `NEXT_PUBLIC_GOOGLE_MAPS_KEY` + `NEXT_PUBLIC_MAPBOX_TOKEN` in Vercel | Whenever you want the `/map` route to actually render | Without keys, map page shows "API key required" message. NEXT_PUBLIC_* uses **All Environments** per `~/CLAUDE.md`. Map clicks 404 to `/directory/{id}` and `/videos/{id}` since Olivia Brain has no such routes — see W-008. |
| Set `OPENAI_API_KEY` if not already | Before running calendar memory features in C2 | `lib/video/embeddings.ts` uses it for vector embeddings. Marked **Sensitive**, **Production + Preview only**. |
| Set Google OAuth + Outlook OAuth keys | Before C2's google-sync.ts / outlook-sync.ts wires up | Calendar sync needs OAuth client credentials. Not yet declared in `env.ts`. Add when C2 lands. |

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

## RECENT COMMIT TRAIL (last 10)

```
1986edf docs: close Track Calendar C1 — schema + embeddings + npm done; queries to C2
49ed993 feat(calendar): Track Calendar C1 foundation — 14 Prisma models + 15 enums + embeddings + npm install
ecfb38b docs: add Track Calendar (6 sessions C1-C6) — calendar + voice + email/call/share
c86e24f docs: post-Session-7 audit — data-layer + styling deferrals
76c3fb0 docs: close Session 7 — map port done, documents deferred to Session 8
55ff466 feat(map): port LTM map subsystem byte-for-byte — Session 7
991f411 chore: pre-install recharts + lucide-react for Track N
faa8ab1 docs: visual manifestation stack + weakness backlog (Track N + O)
c109d0f feat(test-avatar): wire chat brain end-to-end — Session 6
009a629 docs: lock brain enrichment engine + cluesintelligence unification
```

---

## STRATEGIC PRIORITY (locked 2026-05-03)

Founder direction: focus on **`clueslondon.com` (priority 1)** and **`cluesintelligence.com` (priority 2 — FLAGSHIP)**. Both ship targets. cluesxscore (priority 3) and white-label Olivia (priority 4) follow. Path 2 from the Sessions-to-Finish accounting was chosen (ship both flagships even if past 2026-06-02). ~60 sessions to finish priorities 1–4.

**Sessions 1–8 done. ~52 remaining.** Track Calendar (currently mid-flight, C1 done, C2 next) does NOT block clueslondon ship — per surface suppression rule, clueslondon-prod tenant hides Olivia's calendar (LTM provides). Track Calendar makes calendar functional for cluesintelligence + standalone + future spokes.

---

## START SEQUENCE (next session)

```bash
cd "D:\Olivia Brain"
git status                                    # should be clean, on main, up to date with origin/main
git log --oneline -5                          # confirm HEAD is 1986edf
npx prisma migrate dev --name add_calendar_foundation   # OPERATOR — apply C1 schema to dev DB
```

Then in Claude Code:
1. Read this file (`HANDOFF.md`).
2. Read `docs/SESSION_LOG_2026-05-02_GRAND_MASTER_PLAN.md` Part 15 for Session 8 details.
3. Read `docs/BUILD_SEQUENCE.md` Track Calendar C2 row for the deliverable spec.
4. Read `STUDIO_PORT_MANIFEST.md` § J + § K for prior-port lessons (the entanglement gotchas).
5. Pull up the LTM source files in **read-only** mode: `D:\London-Tech-Map\src\lib\queries\calendar.ts` and `D:\London-Tech-Map\src\lib\calendar\*` and the calendar slice of `D:\London-Tech-Map\src\lib\olivia\tools.ts`.
6. Begin C2 with the adapted queries port. Show the user the proposed adaptation diff before writing.

**Standing rule reminder:** stop after C2's deliverable lands. Don't chain into C3 without the user's go-ahead. Update docs alongside the code commit per the doc-discipline rule.
