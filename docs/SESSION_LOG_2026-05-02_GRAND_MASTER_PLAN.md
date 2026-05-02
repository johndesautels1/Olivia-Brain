# Session Log — 2026-05-02 — Grand Master Olivia Plan

> **Compression firewall.** This document captures the full architectural session from 2026-05-02 so future sessions can pick up without re-deriving anything.
>
> **Read this in conjunction with:**
> - `docs/STUDIO_OLIVIA_DESIGN.md` (339 lines — UI north star from the GrandMaster prototype)
> - `docs/MERGE_INVENTORY.md` (233-row capability matrix + per-category deep dive)
> - `docs/MERGE_PLAN.md` (architecture, dual-mode plan, 8 migration phases, bridge contract, risk register, open questions)
> - `docs/HEYGEN_LTM_CONFIG.md` (LTM's actual avatar/voice integration — must-preserve contracts)

---

## Part 1 — Build Crisis & Cleanup (Morning)

**Crisis:** Vercel builds had been failing for ~12 hours. The cause traced back to Claude Opus 4.5 racing through 35 commits in ~19 hours on Fri May 1 → Sat May 2 morning, adding ~16,000 LOC across 12 feature sprints (Personas, SMART Scoring, Tenant, White-label, Compliance, Pitch Intelligence, Studio-Olivia integration, Multi-tenant schema, etc.) with a 54% fix-to-feature commit ratio. The breaking commit was `9f2c49b` ("fix: add DATABASE_URL and DIRECT_URL to prisma datasource") which re-added `url`/`directUrl` to `schema.prisma`'s `datasource` block — illegal in Prisma 7.

**Resolution sequence:**

1. Initial diagnosis: identified Prisma 7 dropped `url`/`directUrl` from `datasource`, must move to `prisma.config.ts`.
2. First three patches (mine, this morning) papered over symptoms one at a time — exactly the push-and-pray cycle the user called out.
3. Pause-and-audit: discovered Prisma 7 also requires `@prisma/adapter-pg` (binary engine dropped) and `/admin/page.tsx` queries DB at prerender time without `dynamic = "force-dynamic"`.
4. **Surgical reset:** force-reset main to commit `96978a3`, cherry-picked 7 keepers (Personas Sprint 4.1, SMART Scoring full+partial, admin_emails, db helper, prisma config standardisation, BATTLE_PLAN doc), dropped 14 commits (11 4.5 band-aids + my 3 morning patches).
5. Re-applied the band-aid logic properly in **one** consolidated commit `d40e979`:
   - Added `@prisma/adapter-pg` for Prisma 7 client constructor
   - Added `dynamic = "force-dynamic"` on `/admin/page.tsx`, `/api/admin/toggles/route.ts`, `/api/admin/agents/[agentId]/route.ts`
   - Re-applied Zod v4 fix, Prisma JSON casts, removed duplicate exports, scoring algorithm fixes

**Final HEAD shape:** 7 feature commits + 1 consolidated build-fix commit. 79,898 LOC src/. **Build is green.** Zero feature LOC lost.

---

## Part 2 — Three Olivia Codebases Discovered

The user revealed there are **three Olivia codebases** that need to merge into one "Grand Master Olivia":

| Source | Path | LOC | Role |
|---|---|---|---|
| **Olivia Brain** (this) | `D:\Olivia Brain` | 79,898 in src/ | Infrastructure-heavy standalone build. 9-model cascade, 119 agents, multi-tenant, white-label, compliance, memory stack |
| **LTM Olivia + Studio** | `D:\London-Tech-Map\src` (~70K Olivia-relevant LOC of 330K total) | `lib/agents` 27,650 · `components/studio` 11,565 · `lib/cascade` 5,707 · `app/api/olivia` 5,653 · `lib/olivia` 4,687 · `components/olivia` 4,096 · `components/documents` 6,172 · `app/documents` 1,736 · `app/api/documents` 847 · `lib/studio` 616 · `lib/documents` 216 · `app/api/calendar/olivia` 582 · `app/olivia` 551 | Live-runtime Olivia + Studio embedded inside the LTM app. Has the live tools/UI that work today. |
| **Studio Olivia prototypes** | `D:\Studio-Olivia` | 3 single-file JSX prototypes ~260 KB total (~5K logical LOC normally formatted): `ClaudeDesktopVersionStudioOlivia.jsx` · `GrokVersionStudioOlivia.tsx` · **`StudioOliviaGrandMaster (2).jsx`** | Design north star (especially the GrandMaster file). LLM-generated UI mockups, not production wiring. |

**Build progress before this session:** 149/202 items complete (~74%) per `HANDOFF.md`. Phase 1, 2, 4.5 complete. Phase 3 at 44/52, Phase 4 at 24/54, Phase 5 not started.

**LTM at full build-out target:** 400K LOC.

**Vision (user-stated):** Olivia is the master brain. She must:
- Run **standalone** as a SaaS product at `olivia.com`
- **Embed** inside London Tech Map (400K LOC, currently 330K)
- **Embed** inside Clues Intelligence (a separate "global predictive analytics multi-LLM cascade" app being built, where Olivia is the *main face*)
- Carry **every worthwhile feature** from all three sources, deduped
- Be **fully backwards-compatible** when she replaces LTM-embedded Olivia (cannot break the live LTM integration)
- Studio is "the interactive touchable face of Olivia" — uploads, edits, analysis, playback. Knowledge captured in Studio must auto-backpush into the rest of LTM.

---

## Part 3 — Architectural Decisions Locked This Session

User answered architectural questions one-at-a-time (their preferred format due to UI scrollback limits).

### Decisions confirmed

| # | Question | Answer | Rationale |
|---|---|---|---|
| **Pre-Q** | LTM Prisma upgrade timing | **Defer indefinitely — LTM stays on Prisma 5 / Next 14**. Olivia ships at Prisma 7 / Next 16; bridge handles boundary | "LTM must keep prism" |
| **Pre-Q** | Olivia's identity | **Real human-looking video avatar** via vendor (originally said HeyGen — corrected to LiveAvatar in Q5 research) | "olivia is a real human looking avatar... that must be who she is across the codebase" |
| **Q1** | How does Olivia ship to host apps? | **(b) Separate web service + HTTP bridge** — Olivia is her own deployed Next.js app at `olivia.com`. LTM/Clues call her over HTTPS | Only option that genuinely delivers both standalone + embedded as first-class outcomes |
| **Q2** | Where does Olivia's data live? | **(a) Olivia owns her own database** (separate Postgres/Supabase project). She calls host APIs for domain data via the Bridge | Multi-host vision (LTM + Clues + future apps) makes shared-DB impossible — Olivia would be welded to one host's schema |
| **Q3** | How does Olivia's UI render in host apps? | **(b) Web Component** — `<olivia-chat>` and `<olivia-avatar>` custom elements loaded from `olivia.com/embed.js`. Studio opens as full-bleed iframe modal that "feels native" by preserving host chrome | Single deployment, framework-agnostic, version-once-update-everywhere. iframe modal for Studio because of its complexity (uploads/playback/drag-drop benefit from iframe isolation) |
| **Q4** | How does the user identity flow from host to Olivia? | **(d) Clerk for everyone** — Olivia, LTM, Clues all use Clerk with shared organization. Single user identity across all surfaces | Tight Clerk vendor lock-in accepted in exchange for simplest mental model. LTM already uses Clerk (Row 35 of inventory matrix) |
| **Q5** | Voice + avatar real-time pipeline shape | **PENDING** — was about to recommend (c) hybrid; user paused to make sure we don't break LTM's existing setup. Research now done (Part 4); answer should still be **(c) hybrid** but the implementation must replicate LTM's exact contracts |

---

## Part 4 — Critical LiveAvatar Discovery (Q5 Research)

**The user said "HeyGen Live Avatar." It is not HeyGen. The vendor is `LiveAvatar` (`api.liveavatar.com`).** The `@heygen/liveavatar-web-sdk` package in LTM's `package.json` is a relic from a vendor rebrand; the live code uses LiveKit + LiveAvatar's own WebSocket protocol directly. (HeyGen-proper is still used by LTM for two unrelated pipelines: Cristiano analysis result videos via `/v3/videos`, and a probably-orphaned legacy talking-photo route at `/api/olivia/video`.)

### LTM's actual architecture (must-preserve contracts)

**Pattern: (c) Hybrid.** Server-mediated key issuance + browser↔vendor direct media/control streams.

```
┌────────────────────────────────────────────────────────────────────────┐
│  LTM PAGE (browser)                                                    │
│  ┌─────────────┐    ┌──────────────────┐   ┌────────────────────────┐  │
│  │  React UI   │ ─▶ │  /api/olivia/    │ ─▶ │ liveavatar.com         │  │
│  │  Olivia     │    │  liveavatar      │   │ /v1/sessions/token     │  │
│  │  Provider   │    │  (server-only    │   │ /v1/sessions/start     │  │
│  └─────────────┘    │   API key)       │   └────────────────────────┘  │
│         │           └──────────────────┘                ▲              │
│         │                  │                            │              │
│         │   returns: { livekitUrl, livekitToken,        │              │
│         │              wsUrl, sessionId, avatarId }     │              │
│         ▼                                               │              │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────┐  │
│  │  LiveKit Client                 │  │  WebSocket (control)        │  │
│  │  WebRTC → LiveKit Cloud         │  │  → wss://liveavatar...      │  │
│  │  (downlink: avatar video+audio) │  │  Outbound: agent.speak,     │  │
│  └─────────────────────────────────┘  │            agent.interrupt, │  │
│                                       │            session.keep_    │  │
│                                       │            alive (every 4m) │  │
│                                       │  Inbound:  state_updated,   │  │
│                                       │            speak_started,   │  │
│                                       │            speak_ended      │  │
│                                       └─────────────────────────────┘  │
│         ▲                                                              │
│         │ For each Olivia reply:                                       │
│         │                                                              │
│         ▼                                                              │
│  ┌──────────────────┐    ┌────────────────────────────────────────┐    │
│  │ /api/olivia/     │ ─▶ │ ElevenLabs                             │    │
│  │ tts (server)     │    │ /text-to-speech/{voice}/stream         │    │
│  │ buffers PCM into │    │ ?output_format=pcm_24000               │    │
│  │ single base64    │    │ voice: rVk0ZvRulp6xrYJkGztP            │    │
│  │ blob ≤1 MB       │    │ model: eleven_multilingual_v2          │    │
│  │                  │    │ voice_settings: {stability: 0.5,       │    │
│  │ returns base64   │    │   similarity_boost: 0.75,              │    │
│  │ to browser       │    │   style: 0.3,                          │    │
│  └──────────────────┘    │   use_speaker_boost: true}             │    │
│         │                └────────────────────────────────────────┘    │
│         │ browser forwards as one `agent.speak` WebSocket frame        │
│         ▼ to LiveAvatar; LiveAvatar lip-syncs into LiveKit room        │
└────────────────────────────────────────────────────────────────────────┘
```

### Non-negotiable contracts (Olivia Brain must preserve exactly)

1. **Mode: `LITE`** on session token creation. Switching to FULL hands TTS+LLM to LiveAvatar and breaks everything.
2. **Audio format: PCM 16-bit, 24,000 Hz, base64, ≤1 MB per WebSocket frame**, ~1s chunks recommended.
3. **Avatar ID:** `a9870a4c-20a2-4f2a-993f-b004c00068c7` (`LIVEAVATAR_OLIVIA_AVATAR_ID` — LiveAvatar-side resource, not HeyGen).
4. **ElevenLabs voice ID:** `rVk0ZvRulp6xrYJkGztP`, model `eleven_multilingual_v2`, settings `{stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true}`.
5. **LiveKit Room flags:** `{adaptiveStream: true, dynacast: true}`.
6. **Keep-alive cadence:** every 4 minutes via `{type: "session.keep_alive", event_id}` over the WebSocket. LiveAvatar idle-timeouts at 5 min.
7. **WebSocket message taxonomy is fixed** — outbound: `agent.speak`, `agent.speak_end`, `agent.interrupt`, `agent.start_listening`, `agent.stop_listening`, `session.keep_alive`. Inbound: `session.state_updated`, `agent.speak_started`, `agent.speak_ended`.
8. **System prompt persona:** British, authoritative, never-fabricate, with live Prisma stats interpolated.

### Three most fragile parts (would break if Olivia changes naively)

1. **The single-shot audio buffer.** LTM concatenates the entire ElevenLabs PCM stream server-side and ships as ONE `agent.speak` message. Works only because Olivia replies fit under the 1 MB / ~10s cap. Longer monologues or different format silently break lip sync.
2. **No explicit session stop on Olivia path.** `OliviaVideoAvatar` closes WS and disconnects Room but never calls `/v1/sessions/stop` — credits leak until 5-minute idle timeout. Naive "fix" without handling already-closed cases will throw on every disconnect.
3. **WebSocket failure is silent.** If `wsRef` fails to open but LiveKit succeeds, user sees the avatar but every reply produces no speech and no error — speak path no-ops on a null ref. Easy to break by changing connection ordering.

**Implication for Q5:** the answer is locked at **(c) hybrid**, but the implementation must clone LTM's exact contracts above. Olivia Brain's existing avatar abstraction layer (Simli/HeyGen/D-ID/SadTalker — Row 17 of matrix) must add LiveAvatar as the **primary** provider, with the others as fallbacks. The `liveavatar.ts` wrapper, server-side `/api/olivia/liveavatar` route, and ElevenLabs PCM buffering all need to be ported byte-for-byte from LTM into Olivia Brain.

---

## Part 5 — Most-Worth-Keeping Unique Features (per source)

### Olivia Brain (this) — keep all 3
- `lib/bridge/registry.ts` Universal Knowledge Provider — already designed for the dual-deployment merge with embedded/live/hybrid modes, TTL cache, health checks, priority routing per domain. **KEY ASSET.**
- Multi-tenant + white-label runtime (12 files in `tenant/` and `white-label/`) — SaaS-shippable day one.
- 6-layer memory stack (episodic + semantic + procedural + graph + journey + Mem0) — no other source has even started.

### LTM Olivia + Studio — keep all 3
- The entire Studio shell + 17 document blocks + question engine with Bayesian priors and cross-doc consistency flags — three solid weeks of UI work already done.
- The 10-subroute Twilio call pipeline (`/api/olivia/call/{twiml,audio,inbound,outbound,recording,extract,gather,status,reminder}`) — battle-tested with real numbers.
- The valuation suite — TruthScore, DCF Mirror, Evidence Mapper, Validation, Pre-Mortem, Method Selection, Acquisition Mirror — 8 specialised LTM agents with no Brain equivalent.

### Studio Prototype — keep all 3
- AvatarOrb visual identity (orange→purple→pink gradient) — system-status indicator, NOT Olivia herself (her real face is the LiveAvatar video stream).
- Score chips header HUD (CLR / IMP / MOT / ALL recomputed live) — Bloomberg-terminal feel for the homepage.
- Library / DeckDetailModal / Apply-archetype interaction flow with consensus dots, scoring reasons, and slide regeneration.

---

## Part 6 — Migration Phases (from MERGE_PLAN.md)

### Phase 1 (Weeks 1-2) — Bridge contract + 2 providers
Ship `OliviaSelfProvider` (reads Brain's DB) and `LtmKnowledgeProvider` (wraps LTM's Prisma over HTTPS). Proven by integration test — same NL query returns identical shapes from both. **This unblocks everything else** because every downstream consolidation depends on knowing how Olivia talks to her data layer.

### Phase 2 (Weeks 3-5) — Backend consolidation
Port LTM's 15 cascade prompts + cascade events bus + injector into Brain's LangGraph. Add Companies House + Kimi providers. Migrate `lib/olivia/{chat,knowledge-base,tools,voice-*}.ts` and the 10-subroute Twilio pipeline into Brain. Port LiveAvatar wrapper + ElevenLabs PCM pipeline (per Part 4 contracts). After Phase 2, Brain alone serves every existing LTM-Olivia API surface — that's the cutover point where Studio UI rebuild can safely begin.

### Phases 3-8 — see `MERGE_PLAN.md`

---

## Part 7 — Open Questions Remaining

### Answered
- ~~LTM Prisma upgrade timing~~ → defer indefinitely
- ~~Q1 host shipping mechanism~~ → (b) separate service
- ~~Q2 database location~~ → (a) Olivia's own DB
- ~~Q3 UI embedding~~ → (b) Web Component + iframe for Studio
- ~~Q4 user auth~~ → (d) Clerk for everyone
- Q5 voice/avatar pipeline → **(c) hybrid** (de facto locked by LTM contract preservation requirement)

### Pending
- **Q6** — Persona axes UX for Studio left-aside picker. Brain has 3 branded execs (Olivia/Cristiano/Emelia) + 5 investor personas (Angel/Seed VC/Series A/Strategic/Buyout). LTM has 6 entity-mode personas (VC/Accelerator/Acquirer/Angel/Corporate/General). Options: (a) two pickers (orthogonal axes), (b) one merged 11-option picker, (c) entity mode auto-selects investor persona. Recommendation: (a).
- **Q7** — Database split or shared in dev/staging. Recommendation: separate in production, Prisma multi-schema in dev for fast iteration.
- **7 more open questions** — see `MERGE_PLAN.md § 7`

---

## Part 8 — User Statements Captured (Verbatim or Near-Verbatim)

These are the user's own words from the session — preserved because they encode product/brand intent that is harder to re-derive than technical detail:

- **On the original architecture**: "we originally designed olivia as a standalone in that app when it was a simple app then realized olivia needed to have advanced document preparation abilities and many different knowledges for the tech industry and to have a field by field ability to fill out any of 56 buisness template forms or build custom forms and build business plans or pitch decks etc."
- **On Studio's UI history**: "We build a ton and I mean a ton of features into the first olivia-studio in london-tech-map but the ui was the most horrible disaster in the world. I then spent days more trying to have claude build another ui on top of it and claude wrapped that so then we had two versions of studio and still stand alone olivia chat."
- **On Olivia Brain's isolation problem**: "Meanwhile I was building a freestanding olivia-this app to eventually be the master brain of all my apps but this app i never shared those apps with and i have no way of knowing how far the codes diverge."
- **On the Studio gap**: "It is also paramount to understand that that app blends studio and olivia into one ui page environment but this app was built without Studio which i cannot emphasize how important studio is it is the interactive touchable face of olivia where data documents powerpoints can be uploaded shared written changed analysized played back and all that knowledge has to automatically backpush into all other components of london-tech-map but olivia brain this app also has to completely stand alone it is a monumental feat"
- **On the goal**: "at the end of the day we need one grand master unified studio olivia-olivia brain that works stand alone or in london tech map and has all and i mean all the features of all 3 that are worth having"
- **On scale**: "There are a ton of features in this app olivia brain i mean shit is is an encyclopedia and in my studio olivia studio in that app A TON."
- **On Olivia's identity**: "olivia is a real human looking avatar we run from heygen live avatar that must be who she is across the codebase" — *NB: vendor is actually LiveAvatar, not HeyGen — see Part 4*
- **On LTM ↔ Clues coupling**: "this is hard because everything in ltm relies on olivia but we are also building a massive app cluesintelligence that is a global predictive anaylics multi llm cascade app that uses olivia as its main face"
- **On preserving LTM avatar wiring**: "study carefully the olivia configuration on their live avatar it was a bitch to configure but I cannot walk it back our entire london tech map is integrated with that heygen architecture which is itself involved we must own what ever that is"

---

## Part 9 — Where We Are at Session End

- **Build green** on `main` at HEAD `d40e979` (consolidated build-fix commit on top of 7 cherry-picked features).
- **4 architectural decisions locked**, Q5 effectively locked at (c) by the LiveAvatar research.
- **4 strategic docs persisted** under `docs/` for compression resilience.
- **Next concrete step:** Phase 1 of `MERGE_PLAN.md` — Bridge contract + `OliviaSelfProvider` + `LtmKnowledgeProvider`. But first, the user wanted to see the GrandMaster prototype rendered as Olivia Brain's homepage so they can finally see the design they're building toward (Step 2 of our agreed plan).

Suggested **next session start**:
1. Read `docs/SESSION_LOG_2026-05-02_GRAND_MASTER_PLAN.md` (this file)
2. Read `docs/STUDIO_OLIVIA_DESIGN.md`
3. Read `docs/HEYGEN_LTM_CONFIG.md` for must-preserve LiveAvatar contracts
4. Decide with the user whether to **(A) stand up the GrandMaster UI shell as `/`** (so the designer can finally see the design), or **(B) start Phase 1 Bridge contract** (so the merge backbone is in place first). My recommendation remains (A) — visible UI first, then backbone behind it.

---

## Part 10 — Sessions 1–3 progress (appended 2026-05-02)

After this session-1 architectural baseline was captured, three implementation sessions ran on the same day. Status as of HEAD `e5d17d6`.

### Session 1 — LiveAvatar server-side
- `src/lib/liveavatar/{types,client,websocket,index}.ts` — LiveAvatar SDK client, types pinned to LTM's contracts.
- `src/lib/olivia/liveavatar.ts` — `createSessionToken()` + `startSession()` + `createAndStartSession()` against `api.liveavatar.com/v1`.
- `src/lib/rate-limit.ts` — in-memory bucket + `requireAdminKey` Bearer-token gate.
- `src/app/api/olivia/liveavatar/route.ts` + `src/app/api/olivia/liveavatar/speak/route.ts` — session create endpoint and ElevenLabs PCM streaming endpoint.
- Build green. Commit `d564151`.

### Session 2 — LiveAvatar browser port + smoke test
- `src/components/olivia/OliviaVideoAvatar.tsx` (684 LOC) + `OliviaProvider.tsx` (506 LOC) ported byte-for-byte from LTM. New `adminKey` prop forwards as Bearer auth on the two fetches (Clerk replaces this in Session 18). Inline-style fallbacks added for the Tailwind classnames so visuals work without Tailwind.
- `src/app/test-avatar/page.tsx` — proof-of-life: click Start → her face appears → type a message → she speaks. Initially shipped with a Suspense wrapper + `force-dynamic` band-aid to satisfy Next 16's prerender pass on `useSearchParams`. **User correctly rejected the wrapper** as exactly the kind of band-aid the standard forbids; replaced with a plain `URLSearchParams` read. Lesson recorded in memory.
- README — Protected Repo Boundaries section expanded into explicit copy-only LTM rules.
- Commits `647caa8` → `0034be5` → `90bef0b`.

### Session 3 — Bridge providers + test infrastructure
- `src/lib/bridge/types.ts` + `registry.ts` already existed at session start (the "KEY ASSET" referenced in Part 5). MERGE_PLAN's "finalise types.ts" step was moot.
- **`OliviaSelfProvider`** (`src/lib/bridge/providers/olivia-self.ts`, 446 LOC + 36 tests). Reads conversations, semantic memories, episodes from Supabase. World-class hardened: `AbortSignal.timeout` on every Supabase call, `withTraceSpan` wrapping `data.query`, JSDoc on every public symbol, graceful unconfigured-mode (vocabulary still served), constructor injection for tests. Internal `runWithTimeout` + `runCountWithTimeout` helpers, one `classifyFailure` helper to avoid duplication. Earlier `as unknown as` cast was removed as a band-aid.
- **`LtmKnowledgeProvider`** (`src/lib/bridge/providers/ltm.ts`, ~580 LOC + 40 tests). Wraps LTM's public `GET /api/v1/organizations` and `GET /api/v1/districts` over `Authorization: Bearer ${CLUES_LONDON_V1_API_KEY}`. Same world-class bar. Tests use a mock `fetch` to prove HTTP wiring end-to-end without LTM contact (URL, Bearer header, x-olivia-app-id, x-olivia-trace-id, JSON parsing).
- New env var `CLUES_LONDON_V1_API_KEY` — distinct from the existing `CLUES_LONDON_INTERNAL_API_KEY` used by the calendar adapter.
- **Vitest 2.1.x** + `vite-tsconfig-paths` wired. `vitest.config.mts` (renamed from `.ts` because `vite-tsconfig-paths` is ESM-only). Dependency drift bug from a missed `npm install` after a `package.json` edit fixed in `dd7a440`; new standing rule: lockfile in same commit as `package.json`. Always.
- 76 tests passing. `npm run typecheck` clean.
- Commits `9e00548` → `f8eae11` → `dd7a440` → `07c16a2` → `018c19a` → `e5d17d6`.

### Lessons captured into permanent memory

- **World-class 2026 standard is now applied to every repo** (not just Olivia Brain). Memory file: `feedback_world_class_standard.md`. The Suspense band-aid in Session 2 prompted the rule; the user later widened it to LTM and any future repo.
- **`package.json` and `package-lock.json` ship together** — learned the hard way when Vercel rejected `f8eae11` with "Missing: vitest from lock file". Standing rule.
- **Verify before claiming done** — I wrote 30+ Vitest assertions in Session 3 but didn't run them initially. The user's "ok" approval was followed by my actually running `npm test` and finding (a) a JSDoc terminator collision in `vitest.config.ts` and (b) an ESM-only `vite-tsconfig-paths` loader issue. Both real bugs caught only because I ran the tests.

### Documentation written this day

- `docs/BOOTSTRAP.md` — fast-context startup doc (this is the file new agents read first).
- `docs/BUILD_SEQUENCE.md` — canonical session-by-session plan for sessions 4 → launch.
- `docs/STUDIO_PORT_MANIFEST.md` — file-level port inventory across all three Studio sources, recharacterising the Studio scope from "build" to "port engine + rebuild UI".
- `docs/MERGE_PLAN.md` Phase 3 updated to reflect the recharacterised Studio scope.

### Where session 4 picks up

Per `BUILD_SEQUENCE.md` Track A: chat brain end-to-end. `/api/olivia/chat` route on Olivia Brain, single-provider first (Anthropic Sonnet 4.6), persisted to `conversations` + `conversation_turns`, AbortSignal+timeout, Langfuse trace. After that lands, Sessions 5–6 widen to the cascade and wire `OliviaProvider.sendMessage` so the smoke page demonstrates a real conversation in voice + face.

**Build status at session-3 close: green. Test status: 76/76 passing. Typecheck: clean. Vercel: deploying from main.**
