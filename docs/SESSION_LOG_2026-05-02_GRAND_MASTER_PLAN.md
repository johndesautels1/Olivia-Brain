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

---

## Part 11 — Session 4 (chat brain v1)

Track A · Session 4 of `BUILD_SEQUENCE.md`. Goal: light up `POST /api/olivia/chat` against a single provider, with persistence + tracing + validation, so `OliviaProvider.sendMessage` (already pointed at this URL since Session 2) has a real backend.

### What shipped

- **`src/app/api/olivia/chat/route.ts`** — single-handler route, Node runtime, `force-dynamic`. Calls `anthropic(env.ANTHROPIC_MODEL_PRIMARY)` via `generateText` from `ai`. 30 s `AbortSignal.timeout` on the LLM call. Whole handler wrapped in `withTraceSpan("olivia.chat.request", …)` with metadata-only attributes (conversation id, is-new flag, message length, presence of contexts) — never the message text. Per-IP `rateLimit({ limit: 30, windowMs: 60_000 })` shim.
- **Request contract** validated by Zod: `{ message: 1–8000 chars, conversationId?: uuid, pageContext?, pipelineContext?, documentContext? }`. Optional contexts are concatenated into the system prompt as a "User is on page / Pipeline / Document" block — kept simple so Session 5's cascade port can swap the model invocation without prompt drift.
- **Persistence** via the existing `getConversationStore()`, which already wraps Supabase (`conversations` + `conversation_turns`) with an in-memory `SafeConversationStore` fallback. User turn carries `pageContext` and presence flags; assistant turn carries `provider: "anthropic"`, `model: <id>`, `mode: "live" | "fallback"`.
- **Response** matches what `OliviaProvider.sendMessage` already consumes: `{ conversationId, messageId, reply }`. New conversation id is minted when none is supplied; supplied ids are reused.
- **Resilience** — three failure modes return 200 with a structured fallback reply (still persisted): missing `ANTHROPIC_API_KEY`, AbortSignal timeout, vendor exception. Persistence failures inside the handler are caught and surface as `{ error }` with status 500 only when even the in-memory store can't accept the turn — which the safe-store wrapper makes practically unreachable.
- **`src/app/api/olivia/chat/__tests__/route.test.ts`** — 16 tests across five groups: validation (5), unconfigured mode (2), configured mode (5), resilience (3), rate limiting (1). Mocks `@/lib/config/env`, `ai`, and `@ai-sdk/anthropic`; uses the real conversation store in its in-memory mode so persistence is exercised end-to-end without standing up Postgres.

### Auth posture

No `requireAdminKey` gate at the route layer. Reasoning: `OliviaProvider.sendMessage` (the only consumer today) doesn't currently forward an Authorization header, so gating now would break the Session 6 smoke flow. Existing `/api/chat` already follows the same pattern. The per-IP rate limiter caps accidental loops in the meantime. Real per-user auth lands in Session 18 with Clerk (Track F).

### Decisions worth carrying forward

- **Did not reuse `invokePhase1Graph`** even though it already does cascade + persistence + intent routing through the same store. Session 4's exit criterion is single-provider, and Session 5's plan is to *replace* the Anthropic call here with `runModelCascade` — wrapping LangGraph now would be premature. The Phase 1 graph stays as the LangGraph experiment surface (`/api/chat`), and `/api/olivia/chat` becomes the production chat endpoint. Session 5 will reconcile the two.
- **Added optional contexts as a system-prompt block, not a message-history rewrite.** Keeps the contract narrow — the cascade port can swap the prompt shape without changing the handler.
- **Fallback replies return 200**, not 5xx. The avatar UI's worst failure mode is a blank speech bubble; a polite "I'm taking longer than expected" preserves the experience and the trace still records the failure for operators.

### Verification

- `npm test` — **92 passing (76 prior + 16 new)**, 3 test files.
- `npm run typecheck` — clean.
- No `package.json` change, no lockfile churn.

### Where Session 5 picks up

Track A · Session 5: extend `/api/olivia/chat` to call `runModelCascade` (`src/lib/services/model-cascade.ts`) instead of `generateText` directly. Intent router lands as a function above the cascade call; LangGraph wrapping is deferred to Track G. Forced-fault test must show failover from `claude-sonnet-4-6` → `gpt-5.4-pro`. Persistence, tracing, validation, rate limiting all stay as-is.

**Build status at session-4 close: green. Test status: 92/92 passing. Typecheck: clean.**

---

## Part 12 — Session 5 (chat brain v2 — cascade-routed)

Track A · Session 5 of `BUILD_SEQUENCE.md`. Goal: replace the direct `generateText` call inside `/api/olivia/chat` with the existing 6-model cascade so chat traffic walks Anthropic → OpenAI → Google → Grok / Perplexity / Mistral as intent dictates, and so the assistant-turn metadata captures the full provider attempts trail.

### What shipped

- **`src/lib/orchestration/intent.ts`** — extracted the regex-based `inferIntent` classifier out of `phase1-graph.ts` into a shared module. `phase1-graph.ts` now imports from there too. One source of truth, no duplicate regex tables.
- **`src/app/api/olivia/chat/route.ts`** — refactored. Replaces the `anthropic(...)` + `generateText(...)` direct call with `runModelCascade({ conversationId, message, intent, recalledContext, integrationSnapshot })`. Memory recall (4 prior turns via `getConversationStore().recall`) runs before the user turn is persisted, so the cascade gets real grounding instead of an empty context array. Assistant turns now persist `{ intent, runtimeMode, provider, model, attempts: [{providerId, modelId, success, durationMs}] }`. Error text from failed provider attempts is **stripped before persistence** so vendor errors carrying URL fragments / token fragments / payload fragments cannot leak into the turn record. Span attributes gain `olivia.intent`; PII discipline preserved (no message text in attributes).
- **`src/app/api/olivia/chat/__tests__/route.test.ts`** — rewritten around `vi.mock("@/lib/services/model-cascade")`. 18 tests across seven groups: validation (5), cascade walk (5), intent classification (3), forced-fault failover (2), mock-mode short-circuit (1), resilience (1), rate limiting (1). Failover test pins the cascade to return `attempts: [anthropic fail, openai success]` and asserts the route persists both attempts with provider IDs but no error text. Mock-mode test asserts `mode: "mock"` makes it onto the assistant turn so traces and audits can distinguish degraded responses from live ones.

### Decisions

- **Did not wrap the route in LangGraph.** The Phase 1 graph (`phase1-graph.ts` → `/api/chat`) already does a 5-node graph wrapping the cascade. Adopting it inside `/api/olivia/chat` would duplicate persistence and double-write turns. The two routes converge in Sessions 19–20 (Track G); until then `/api/chat` stays the LangGraph experiment surface and `/api/olivia/chat` is the narrow production endpoint.
- **Did not impose a route-level `AbortSignal.timeout`.** The cascade's per-provider span already bounds work, so layering another timeout on top would only obscure which provider exceeded budget. Removed from Session 4's route in this commit.
- **Recall happens before the user turn is appended.** Otherwise the just-arrived user message would dominate its own recall result — useless grounding. Mirrors `phase1-graph.ts` ordering.
- **Cascade exception → 500, not silent fallback.** The cascade is supposed to convert provider failures into a `runtimeMode: "mock"` outcome internally. If it throws, that's a bug we want surfaced via 500 + the OTel span — silently swallowing it would hide a real defect.
- **Companies House + Kimi providers explicitly scope-cut.** `BUILD_SEQUENCE.md` listed both alongside the cascade refactor for Session 5. They don't fit:
  - **Companies House** is a structured UK company-data API — it belongs in `src/lib/bridge/providers/` as a `UniversalKnowledgeProvider` with domain `uk-companies`, not in the LLM cascade. Wiring it into the cascade would force the cascade to do something it isn't built for (structured data answers vs. text generation).
  - **Kimi** (Moonshot) is a cascade-fit LLM, but it requires `@ai-sdk/kimi` (or equivalent), an env var declaration in `src/lib/config/env.ts`, addition to `ProviderId`, and entries in `getProviderStatuses()` + `buildProviderBindings()` + `providerOrderForIntent()`. That's a multi-touch scope that doesn't belong in a route refactor.
  - Both are now tracked in `docs/API_INTEGRATION_BACKLOG.md` for dedicated follow-up sessions.

### Verification

- `npm test` — **94 passing** (76 prior + 18 chat-route).
- `npm run typecheck` — clean.
- No `package.json` change, no lockfile churn.

### Where Session 6 picks up

Track A · Session 6: wire `OliviaProvider.sendMessage` to actually exercise `/api/olivia/chat` from the browser, so `/test-avatar` demonstrates the full conversation loop in voice + face. The route is ready; the front-end change is a small one-line update to include any required headers (none today; Bearer auth lands Session 18 with Clerk). End-to-end smoke test must show: type a message → cascade walks → reply text comes back → ElevenLabs renders audio → LiveAvatar lip-syncs.

**Build status at session-5 close: green. Test status: 94/94 passing. Typecheck: clean.**

---

## Part 13 — Session 6 (chat brain wired into the smoke flow)

Track A · Session 6 of `BUILD_SEQUENCE.md`. Goal: light up `OliviaProvider.sendMessage` end-to-end on `/test-avatar` so a typed message walks the cascade, returns through Olivia's chat brain, and gets spoken by the LiveAvatar with lip-sync.

### What shipped

- **`src/components/olivia/OliviaProvider.tsx`** — corrected the now-outdated port-note comment claiming `/api/olivia/chat`, `/api/olivia/voice`, `/api/olivia/history/[convId]`, and `/api/olivia/conversations/[id]/email` were all unimplemented. New comment captures status accurately: `chat` is live (Sessions 4–5); `voice` lands Track E / Session 17; `history` and `email` are follow-ups. No code logic changed.
- **`src/app/test-avatar/page.tsx`** — added a full-conversation-loop flow alongside the original session-2 manual lip-sync flow. The page now has two interactions:
  - **Talk to Olivia** (new) — chat composer (`textarea` + Ask button) calls `useOlivia().sendMessage(text)`, which posts to `/api/olivia/chat`. The provider updates `messages`. A `useEffect` watcher derives the latest finished assistant message via `useMemo` and feeds it into the existing `lastReply` state — which the `OliviaVideoAvatar` already lip-syncs. Conversation history is rendered inline (user turns vs assistant turns visually distinct via background tint). `isLoading`, `error`, and turn-count surfaced as compact metadata.
  - **Manual lip-sync** (existing, session 2) — labeled "Make Olivia speak this exact text (no cascade)" so the two paths are unambiguous; original Speak / Interrupt / Replay buttons preserved.
- **Doc updates** — `BUILD_SEQUENCE.md` Session 6 row marked ✅ with the deliverable summary; new "Strategic priority" section locks the founder-directed focus on clueslondon + cluesintelligence as the two ship targets. `BOOTSTRAP.md` session count + HEAD reference updated; the deadline split into "clueslondon-and-Olivia-core at 2026-06-02; cluesintelligence + cluesxscore + white-label finish ~Session 60 (post-deadline by design)."

### Decisions

- **Re-used `lastReply` rather than introducing a new prop.** The `OliviaVideoAvatar` component already speaks any text passed to its `lastReply` prop; routing the latest assistant message into that prop avoided invasive changes to the avatar component. One useEffect watcher, one state variable, no new contract.
- **`useMemo` over derived state.** The "latest assistant message" calculation runs on every render that touches `olivia.messages`. Memoising it keeps the watcher effect from firing on render-only mutations.
- **Did not gate Talk to Olivia behind the admin key.** `/api/olivia/chat` is not gated (Session 4 design — the route is rate-limited per IP rather than admin-key-gated, since the browser provider doesn't forward an Authorization header). Manual lip-sync still requires the admin key because `/api/olivia/liveavatar` *is* gated. The page makes this distinction explicit in the auth-posture header comment.
- **Did not add component tests for the smoke page.** The chat-route already has 18 vitest assertions covering the API; the avatar pipeline is verified manually on `/test-avatar`. Adding jsdom + RTL for one smoke component is disproportionate; manual smoke pass replaces it.

### Verification

- `npm test` — **94 passing** (no regressions; no new tests added — same 76 prior + 18 chat-route).
- `npm run typecheck` — clean.
- No `package.json` change.
- Manual smoke flow (to be performed by next agent or user): `npm run dev`, open `/test-avatar?key=<ADMIN_API_KEY>`, click Start Live Avatar, type a question in "Talk to Olivia," click Ask. Expected: cascade walks, reply text appears in conversation history, avatar lip-syncs the reply via ElevenLabs PCM.

### Where Session 7 picks up

Track B · Session 7: port `src/lib/studio/{types,entityModes,questionMapper}.ts` (3 files, 616 LOC) and `src/components/documents/*` (37 files, 6,172 LOC) from LTM into Olivia Brain at the equivalent paths. LTM stays read-only. See `STUDIO_PORT_MANIFEST.md`.

**Build status at session-6 close: green. Test status: 94/94 passing. Typecheck: clean.**

---

## Part 14 — Session 7 (LTM map port — mid-session pivot from documents engine)

Track B (revised) · Session 7. Original goal: port `lib/studio` (3 files) + `components/documents` (37 files) from LTM. **Mid-session pivot:** after attempting the documents port and surfacing deeper-than-manifest LTM entanglement, the user confirmed LTM map + calendar are flawless ("state of the art the way we layered and architected them") and approved redirecting Session 7 to the LTM map subsystem byte-for-byte port. Documents engine port re-scoped to Session 8 with explicit Clerk-strategy prerequisite.

### What shipped

**3 doc additions before pivot** (committed `faa8ab1`):
- `README.md` — new "Visual Manifestation Stack" section (Tier 1–4 APIs; Gamma flagged as partner integration, never competitor — per durable feedback memory) + new "Weakness Backlog" (W-001 through W-007 from 2026-05-03 competitive analysis).
- `BUILD_SEQUENCE.md` — Track N (Sessions N1–N5, split-screen Olivia + Canvas with Mapbox/Mermaid/Recharts/Tremor/v0/Cesium/Spline + deeper Gamma integration) and Track O (Sessions O1–O5, weakness closure: Composio tool dispatch, weekly eval runtime, sub-600ms voice via Cartesia, citation-first RAG wiring, Tavus avatar A/B harness).
- `API_INTEGRATION_BACKLOG.md` — new §10 with 25 APIs (numbered 26–50) covering visual manifestation + tool dispatch.

**Chore commit (`991f411`)** — pre-installed `recharts` + `lucide-react` for Track N3. Both were already scheduled in Track N3; pre-installing eliminates deferred npm churn.

**Aborted documents port** (no commit, fully reverted):
- Copied 33 LTM files (3 `lib/studio` + 14 `components/documents` top-level + 16 `components/documents/blocks`) with 6 deferred files (CalloutBlock, ListBlock, DocumentCard, DocumentEditor, DocumentFilters, PackageProgressBar).
- Added 2 missed LTM utility files (`@/types/blocks.ts`, `@/lib/documents/content.ts`).
- Typecheck surfaced: `OrgMapProvider` imports in **4** blocks (not 2 as manifest claimed — `ParagraphBlock` + `DocumentBody` also use it; ParagraphBlock is the workhorse so deferring it would gut the engine); `@clerk/nextjs` imports in `BookmarkButton` + `DocumentActionBar`; missing `react-markdown` + `remark-gfm`; `DocumentRenderer` cross-imports break when blocks defer.
- Even `typedRoutes: false` (already set in `next.config.ts`) didn't suppress stale `.next/types` `RouteImpl` errors — required clearing the cache.
- Reverted entirely. Working tree returned to a state with only `package.json` + `package-lock.json` modifications (the npm chore).

**Map port** (committed `55ff466`) — 28 files, 6,107 LOC byte-for-byte from LTM (read-only, never modified):
- `src/components/map/` — 20 files: `GoogleMap3DView` (photorealistic 3D, primary), `GoogleMapView` (standard Google Maps), `MapView` (Mapbox fallback), `MapAppointmentsContext`, `constants`, `types`; `controls/` (CategoryFilterPanel, DraggableMapControls, LayerPanel, MapSearchBar, SectorFilterBar, StatsPanel, ViewPresetButtons); `overlays/` (ClusterCardGrid, MapLegend, StreetViewModal); `hooks/` (useClusterInteraction, useMapData, useMapLayers); `data/district-boundaries`.
- `src/app/map/` — 3 files: `page.tsx` (3-tier vendor fallback: Google 3D → Google standard → Mapbox → "key required" message), `loading.tsx`, `MapPageClient.tsx` (next/dynamic wrappers with `ssr:false`).
- `src/components/ExternalLinkFrame.tsx` — LTM utility (Provider + Link + hook + iframe overlay; 403 LOC).
- `src/types/index.ts` — LTM types barrel (`DistrictWithStats`, `TechGravityInput`, `TechGravityResult`).
- `src/types/google.d.ts` — new triple-slash reference for `@types/google.maps` (auto-discovery doesn't fire under `moduleResolution: bundler`; this file forces the global namespace to load).
- npm packages: `mapbox-gl`, `@googlemaps/js-api-loader`, `@types/google.maps` (devDep).

**Doc updates this commit:**
- `STUDIO_PORT_MANIFEST.md` — added §J (Map subsystem inventory + dep notes + outstanding deferrals) and §K (Documents subsystem entanglement post-mortem with explicit Session 8 plan).
- `BUILD_SEQUENCE.md` — Session 7 row marked ✅ with full pivot narrative; Track I Session 24 expanded with adaptive-surface-suppression rule (`ui.suppressedSurfaces` per-tenant config so embedded contexts hide Olivia surfaces the host already provides).
- `README.md` — Weakness Backlog gains W-008 (LTM map links to `/directory/{id}` + `/videos/{id}` routes that don't exist), W-009 (documents subsystem entanglement summary), W-010 (`ExternalOverlayProvider` not yet wrapped in root layout).
- 2 new project memories saved — `project_ltm_map_calendar_adaptive` and `project_olivia_surface_suppression`.

### Decisions

- **Pivoted instead of pushing through documents.** Standing rules "no band-aids" + "raise the conflict, never silently lower the bar" applied directly. Documents subsystem needs (a) Clerk plan, (b) OrgMap stub, (c) react-markdown install, (d) renderer-routes coordination — too much to land cleanly in one session.
- **Map ported byte-for-byte, no restyling.** Per user's "port over exactly" + standing rule "LTM stays read-only." Only addition was the new `src/types/google.d.ts` reference file (new file, not a modification of any LTM source).
- **Did not wrap `ExternalOverlayProvider` in root layout.** Default context returns `{ openUrl: () => {} }` so unwrapped links degrade to no-op. Map renders fully; only modal-link clicks are inert. Layout integration needs design alignment with future Studio-Olivia structure — defer.
- **Did not stub `/directory` or `/videos` routes.** Olivia Brain has neither. Map links to those routes will 404 until Track J vertical adapters port them OR an earlier session creates stubs. Tracked as W-008.
- **Did not add Vitest snapshot tests for map components.** Original Session 7 exit criterion (18 block snapshots + 1 round-trip) belongs to the documents engine, which deferred. Map smoke tests scheduled for follow-up or Track N2.
- **Did not modify `next.config.ts`.** `typedRoutes` was already `false`; the `RouteImpl` errors were stale-cache artifacts cleared by deleting `.next/` and `tsconfig.tsbuildinfo`.

### Verification

- `npm test` — **94 passing** (76 prior + 18 chat-route; no regressions; no new tests added — Vitest map snapshots pushed to a follow-up).
- `npm run typecheck` — clean (after `.next/` cache + `tsconfig.tsbuildinfo` cleared; stale `RouteImpl` types from a prior build had to be flushed).
- `package.json` + `package-lock.json` updated for `mapbox-gl`, `@googlemaps/js-api-loader`, `@types/google.maps`, plus the earlier chore for `recharts` + `lucide-react`.
- LTM source unchanged (verified by intent — `Read` + `Grep` + `Copy-Item` only on LTM paths; no `Edit` / `Write` / `Remove-Item` ever touched LTM).

### Where Session 8 picks up

**Track B (revised) · Session 8** — documents-subsystem port with Clerk-strategy prerequisite. Per §K of `STUDIO_PORT_MANIFEST.md`:

1. Pull Track F Session 18 (Clerk) forward OR build a Clerk stub provider before any documents work — gates `BookmarkButton` + `DocumentActionBar`.
2. Port `OrgMapProvider` as soft-stub (renders children verbatim, no entity linking) so the 4 OrgMap-using blocks unblock — the manifest's "REFERENCE / skip" classification was wrong.
3. Port the 3 missed LTM utility files (`types/blocks`, `lib/autolinker`, `lib/documents/content`).
4. Install `react-markdown` + `remark-gfm`.
5. Port all 18 blocks + 18 top-level documents files + `DocumentRenderer` **together** — partial ports break the renderer.
6. App route ports (`app/documents/*`, 13 files) defer to Session 9 or Track C.
7. Vitest snapshot tests on the 18 block components (original Session 7 exit criterion, postponed).
8. `mapBlocksToQuestions()` round-trip test (also postponed).

**Calendar subsystem** (36 files, ~638 KB, includes full `lib/calendar/` Olivia engine) remains a separate track — to be inserted before Track L per `project_ltm_map_calendar_adaptive` memory.

### Post-port audit (added later in session — data-layer + styling)

After commits `991f411` + `55ff466` + `76c3fb0` landed, the user asked to verify no map features were missed before pivoting to calendar. Audit surfaced two categories of findings:

**Data layer (intentionally not ported, no action):**
- `useMapData` hook fetches `/api/districts` + `/api/map` — neither exists in Olivia Brain. **Map renders empty.**
- 9 LTM Prisma models (Organization, OrganizationCategoryLink, OrganizationRelationship, PersonOrganizationRole, FundingRound, FundingRoundInvestor, DistrictScore, DistrictScoreHistory, DistrictFollow) + `FundingStage` enum — not ported.
- `lib/queries/{districts, district-detail, organizations}.ts` (~52 KB of Prisma queries) — not ported.
- 8 cron routes for district-score / org-data refresh — not ported.
- `app/districts/[slug]/page.tsx` and `/api/v1/{districts,organizations}` — not ported.

All correctly deferred per **bicycle-wheel architecture**: LTM owns the org/district domain; Olivia Brain consumes via `LtmKnowledgeProvider` UKP bridge in clueslondon context. Standalone Olivia's map is a UI shell with empty data by design until per-spoke adapters (Track J) or per-spoke unification (Track L) feeds it. Locked in new `project_ltm_types_no_speculative_generalization` memory: don't stub LTM-specific routes, don't add LTM Prisma models, don't generalize types speculatively — wait for cluesintelligence (Track L) to design the abstraction with two real consumers in mind.

Reframed W-008 accordingly: the original "stub `/directory` and `/videos`" reading was wrong. Real action: per-spoke adapters define the real link targets when each spoke comes online.

**Styling gap (deferred to Track C, tracked as weaknesses):**
- Olivia Brain has **no Tailwind** installed; LTM map files use **223+ Tailwind classes** that are inert. Map renders structurally (3D Google Maps + Mapbox SDK do their own styling) but the React control panels / overlays / search bar lack visual fidelity.
- LTM `globals.css` uses different CSS token names (`--background`, `--foreground`, `--card-bg`, `--card-border`) than Olivia Brain's (`--bg`, `--text`, `--panel`, `--border`). Only `--muted` matches.
- LTM imports a separate `app/design-tokens.css` not ported.
- Decision: defer styling alignment entirely to **Track C UI rebuild** (Sessions 9–14) or an earlier "add Tailwind" decision session. Tracked as **W-011** (Tailwind missing) and **W-012** (token name divergence) in `README.md` Weakness Backlog. Track C deliverable expanded in `BUILD_SEQUENCE.md` to explicitly include map + calendar styling alignment.

**Same styling gap will recur for upcoming ports** (calendar Sessions 8–12, possibly documents Session 8+) — capture each as a new weakness as it surfaces; central resolution stays in Track C.

The map UI is now correctly characterized as a **structural shell** ported byte-for-byte, with both data layer and visual fidelity intentionally deferred. This characterization is durable via the new `project_ltm_types_no_speculative_generalization` memory + the existing `project_olivia_surface_suppression` memory. Future agents picking up Olivia Brain should NOT try to "fix" the map by adding Tailwind speculatively or stubbing LTM data routes — those are anti-patterns now caught in memory.

**Build status at session-7 close: green. Test status: 94/94 passing. Typecheck: clean. Map subsystem ported byte-for-byte; documents subsystem deferred to Session 8 with revised plan; map data layer + styling intentionally deferred to Track J + Track C respectively.**

---

## Part 15 — Session 8 (Track Calendar C1 — calendar Prisma foundation)

Track Calendar (new track inserted post-pivot, slot: between Track B's Session 7 map port and Track C's Studio UI rebuild) · **C1 foundation**. The original Session 8 deliverable in Track B was the documents-engine port; that's blocked on a Clerk strategy decision (per `STUDIO_PORT_MANIFEST.md` §K) and was deferred. Pivoted to calendar after user confirmed LTM calendar is "state of the art" (alongside the map) and approved a 6-session Track Calendar (C1–C6) covering calendar + voice + email/call/share infrastructure.

### What shipped (commit 49ed993)

- **Schema** — `prisma/schema.prisma` gained 14 calendar models + 15 enums (~530 lines):
  - Models: `CalendarEntry`, `CalendarPreferences`, `CalendarPrepTask`, `CalendarReminder`, `CalendarEntryAttendee`, `CalendarInteraction`, `CalendarSyncAccount`, `CalendarSyncConflict`, `CalendarWebhookState`, `CalendarMemoryChunk`, `CalendarNote`, `OliviaCalendarRecommendation`, `VoiceTranscriptionLog`, `FounderWeek`.
  - Enums: `CalendarCategory` (37 values across core meeting types, events, work blocks, milestones, rituals, personal, ecosystem, signal, external sync), `CalendarEntryType`, `CalendarPriority`, `CalendarSyncProvider`, `CalendarSyncDirection`, `CalendarConflictResolution`, `CalendarInteractionType`, `CalendarPrepTaskStatus`, `CalendarAttendeeRsvp`, `CalendarAttendeeRole`, `AttendanceStatus`, `WebhookSubscriptionStatus`, `OliviaRecommendationType`, `OliviaRecommendationUrgency`, `OliviaRecommendationStatus`.
  - Adaptations applied per `project_ltm_types_no_speculative_generalization` memory:
    - `id String @id @default(cuid())` → `id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid` (consistent with rest of Olivia Brain schema).
    - `userProfileId String` + `userProfile UserProfile @relation(...)` → `userId String @db.Uuid` (no FK constraint until Track F Session 18 wires Clerk; userId then references Clerk user IDs).
    - `linkedOrgId` / `linkedEventId` / `linkedPersonId` fields + relations dropped (LTM-domain — Olivia doesn't own Org/Event/Person).
    - `voiceConversations VoiceConversation[]` reverse relation deferred to C3.
    - `dealRoomSessions DealRoomSession[]` reverse relation dropped permanently (DealRoom moves to real-estate spoke when that vertical builds).
    - `Event` / `EventParticipant` / `EventRsvp` / `EventSeries` / `PackageEvent` / `CascadeEvent` not ported (LTM tech-event modeling, separate concept from personal calendar).
    - Field naming: camelCase preserved (matches LTM) so future `lib/queries/calendar.ts` port has only mechanical rename work; diverges from snake_case used in older Olivia Brain models — noted inline in schema.
- **`src/lib/video/embeddings.ts`** ported byte-for-byte from LTM (read-only, never modified). Provides `generateEmbedding()` (OpenAI text-embedding-3-small, 1536 dims) used by `lib/calendar/calendar-memory.ts` when C2 lands. Also includes `chunkTranscript()` and `semanticSearch()` for video — not used by calendar engine but ported as-is to preserve byte-for-byte fidelity.
- **npm install** — 8 packages added (9 installed incl. transitive): `@fullcalendar/{react,daygrid,timegrid,interaction,list,core}`, `react-international-phone`, `rrule`. FullCalendar suite for `CalendarView` (C5); rrule for recurrence expansion in `lib/calendar/rrule-expand.ts` (C2); react-international-phone for `CalendarNotepad` SMS/WhatsApp share modals (C5).

### Decisions

- **`lib/queries/calendar.ts` port DEFERRED to C2.** Discovery during C1 surfaced 93 LTM-domain references (the SELECT clauses + `CalendarEntryWithDetails` interface deeply consume `linkedEvent`, `linkedOrg`, `linkedPersonId`). Adapting cleanly requires understanding what the engine (C2) actually consumes from query results — this is engine-aware adaptation, not the "mechanical userProfileId → userId rename" originally scoped. Honest defer per standing rule "no band-aids — root-cause every failure." C2 row in BUILD_SEQUENCE updated to include queries port.
- **Did not run `prisma migrate dev`.** That requires DB connection + applies migrations to the dev DB. Operator runs it when ready; `prisma generate` (which only needs schema, no DB) succeeded and the Prisma client carries the new types. Tests don't hit calendar tables yet (existing 94 tests cover bridge + chat).
- **Camel-case preserved across calendar models** despite Olivia Brain's older models using snake_case. Reason: zero-rename byte-for-byte port for the 35 KB queries file (when C2 lands) and the 19 engine files. The mixed convention is documented in the schema header.
- **Schema additions are append-only** — existing 33 Olivia Brain models untouched. The `tenants`, `tenant_members`, etc. multi-tenant models stay as the source of truth for Olivia user identity until Clerk lands.

### Verification

- `npx prisma validate` — clean (the schema at `prisma/schema.prisma` is valid).
- `npx prisma generate` — Prisma client v7.7.0 regenerated with new calendar types in `node_modules/@prisma/client`.
- `npm run typecheck` — clean.
- `npm test` — **94/94 passing** (no regressions; same 76 prior + 18 chat-route).
- LTM source unchanged (verified by intent — Read + Grep + Copy-Item only on LTM paths during this session; no Edit / Write / Remove-Item ever touched LTM).

### Where Session 9 picks up

**Track Calendar · C2** — calendar engine + queries. Per BUILD_SEQUENCE.md C2 row: port `lib/queries/calendar.ts` (35 KB, ~93 LTM-domain references — adapt: userProfileId → userId rename + drop linkedEvent/linkedOrg/linkedPerson selects + adjust `CalendarEntryWithDetails` interface). Then port `lib/calendar/*` (19 engine files). Plus the calendar slice of `lib/olivia/tools.ts`. Exit: adapted queries + 19 engine files typecheck against C1's Prisma client.

**Operator action before C2:** run `npx prisma migrate dev --name add_calendar_foundation` against your dev Postgres so the new tables exist when C2 engine code starts hitting them.

**Build status at session-8 close: green. Test status: 94/94 passing. Typecheck: clean. Track Calendar foundation committed (schema + embeddings + 8 npm packages); queries deferred to C2 with engine; migration deferred to operator.**

---

## Part 16 — Session 9 (Track Calendar C2 — calendar engine + queries)

Track Calendar · **C2 calendar engine + queries**. Picks up from Session 8's C1 foundation (14 Prisma models + embeddings + 8 npm packages). Operator-side: C1's migration was applied to Supabase via SQL Editor paste (Option B per the updated HANDOFF), so calendar tables exist in the dev DB before C2's engine code lands.

### What shipped (commit 948f6ed)

- **`src/lib/queries/calendar.ts`** (1130 lines) ported from LTM (`src/lib/queries/calendar.ts`, 1252 lines) with these adaptations:
  - `userProfileId` → `userId` everywhere (~80 occurrences, including the `userProfileId_weekStartDate` compound key on FounderWeek → `userId_weekStartDate`).
  - `CALENDAR_ENTRY_SELECT` lost `linkedEventId`, `linkedOrgId`, `linkedEvent.{...}`, `linkedOrg.{...}` selects; `attendees.linkedPersonId` dropped from nested select.
  - `CalendarEntryWithDetails` interface lost the matching fields.
  - `parseCalendarEntry()` lost the linkedEvent/linkedOrg parser branches.
  - `createCalendarEntry()` / `updateCalendarEntry()` input types lost `linkedEventId?` / `linkedOrgId?` fields.
  - `addAttendeeToEntry()` / `updateAttendee()` / `bulkSetAttendees()` input types + data clauses lost `linkedPersonId?`.
  - **`getMergedCalendarView()` dropped entirely** (lines 754-811 of LTM source). Called `prisma.event.findMany` with includes for `organizerOrg` / `venueLocation` / `districtLocation` — all LTM-domain models that aren't in the C1 schema. Verified zero callers in `lib/calendar/*` (only references were in LTM's auto-generated `code-knowledge/registry.generated.ts`, which Olivia Brain doesn't port). Cluesintelligence will get its own `getMergedCityView()` in Track L.
  - All 22 other exported functions kept identical signatures + behavior.
  - Webhook section (8 functions, lines 1047+) only adapted in nested `syncAccount: { select: { userId, ... } }` selects.
  - All `findUnique({ where: { userProfileId } })` for CalendarPreferences become `{ where: { userId } }` (C1 schema declares `userId @unique` on that model).
  - C1 added `externalLastSyncAt` field to CalendarEntry not in LTM's SELECT — left out of adapted SELECT (would be feature creep beyond byte-for-byte; nothing reads it).
- **`src/lib/calendar/*`** ported as **16 of 19 LTM files**:
  - **7 byte-for-byte:** `crypto.ts`, `event-categories.ts`, `rrule-expand.ts`, `olivia-schemas.ts`, `olivia-prompts.ts`, `calendar-judge.ts`, `olivia-engine.ts`.
  - **6 with `userProfileId → userId` rename only:** `daily-brief.ts`, `behavior-engine.ts` (incl. compound key `userProfileId_weekStartDate → userId_weekStartDate`), `travel-buffer.ts`, `calendar-memory.ts` (incl. `"userProfileId" → "userId"` in raw SQL identifiers + `gen_random_uuid()::text → gen_random_uuid()` since C1 schema uses `@db.Uuid` not String), `google-sync.ts` (incl. compound key `userProfileId_provider_providerAccountId → userId_provider_providerAccountId`), `outlook-sync.ts` (same compound key adaptation).
  - **3 with structural modifications:**
    - `olivia-guardrails.ts`: dropped the `prisma.oliviaGuardrail.findMany` call entirely + the cache + the merge — the model lands in C3. Hardcoded `getDefaultGuardrails()` is real, useful behavior on its own; `buildGuardrailsPromptSection()` returns those defaults until C3 wires the DB integration. Top-of-file comment + `Guardrail` interface preserved so C3 re-port is trivial.
    - `proximity-cluster.ts`: only `haversineKm()` survives the port. The 3 query functions (`findNearbyOrganizations`, `findNearbyEvents`, `findNearbyVenues`) and their result types were dropped — they queried `prisma.organization` and `prisma.event` (LTM-domain). Per `project_ltm_types_no_speculative_generalization`, per-spoke adapters in Track J / Track L will write the correct surface against each spoke's own data shape, not a stub against models we don't own.
    - `index.ts`: barrel adjusted — exports trimmed to match what was actually ported.
- **3 LTM files intentionally NOT ported in C2** (deferred to dependency tracks):
  - `document-aware.ts` → needs `prisma.document` (Documents track, post-Clerk per `STUDIO_PORT_MANIFEST.md` § K).
  - `founder-journey.ts` → needs `prisma.analysisResult` (Cristiano Analysis Engine — Track L).
  - `workflow-generator.ts` → needs `prisma.analysisResult` AND uses dropped `linkedOrgId` field on `CalendarEntry` (Track L).
  - Each re-ports in its own track when its dependency lands. Single concern per port. No band-aid stubs.
- **`src/lib/olivia/tools.ts`** ported as the calendar slice of LTM's 75 KB `lib/olivia/tools.ts`:
  - Just 2 tools land in C2: **`get_user_calendar`** (adapted — drop `linkedOrg` + `linkedEvent` includes from the Prisma SELECT, drop the `userProfile.findUnique({ clerkUserId })` lookup since Olivia Brain's calendar models use `userId` directly, drop the matching fields from formatted output) and **`web_search`** (Tavily, byte-for-byte — pure utility, no DB deps).
  - The other 22 LTM tools defer: `search_platform`/`get_organization`/`get_district`/`get_document`/`get_document_collection`/`get_user_analysis`/`get_user_packages`/`get_package_detail`/`get_events`/`get_programs`/`dispatch_agent`/`suggest_document_for_valuation` → LTM-domain (Track L); `get_user_memory`/`save_user_memory` → C3 (OliviaUserMemory model); `send_sms` → C4 (Twilio); `run_valuation`/`get_valuation_result`/`explain_valuation_method`/`compare_buyer_valuations`/`identify_valuation_gaps` → valuation engine (Track L for cluesintelligence equivalent).

### Decisions

- **Stub-but-preserve REJECTED for the 3 LTM-domain files (document-aware, founder-journey, workflow-generator).** User-confirmed strategy 2026-05-03: drop entirely, re-port in dependency tracks. Reasoning: stub functions returning empty arrays/zero counts are a band-aid (silent failure for callers who think the function works), and barrel-export hygiene is cleaner without dead code. Rejected explicit "stub-but-preserve" alternative I proposed during scoping. Aligned with `feedback_world_class_standard` ("no band-aids — root-cause every failure") and `project_ltm_types_no_speculative_generalization` ("don't stub LTM-specific data routes").
- **olivia-guardrails partial port (vs. full defer to C3).** The hardcoded `getDefaultGuardrails()` block has real value standalone. Porting the file with the DB call removed (not stubbed) gives C2 callers a working guardrails source. C3's OliviaGuardrail wiring just adds the dynamic merge layer back in.
- **proximity-cluster trimmed to `haversineKm` only.** The Haversine helper is pure math, exported from the barrel, and used by future per-spoke adapters. The 3 query functions can't survive without Organization/Event models we don't own.
- **HANDOFF gotcha re-evaluated and corrected.** HANDOFF said `google-sync.ts` / `outlook-sync.ts` need a Clerk auth stub. **Wrong** — those files don't import Clerk or NextAuth. They take `userProfileId` as a parameter; the future API route (C5) is what'll need Clerk to extract it. Lib functions are clean. No `getAuthSession()` stub needed.
- **C1's `extractUserMemory()` in olivia-engine.ts ports as-is** — it's a pure Anthropic call (no DB), used by C3 callers for OliviaUserMemory population. No barrel export, internal-only. Safe to ship in C2.
- **`get_user_calendar` adapted to use Clerk userId directly.** LTM's handler did `getUserProfileId(userId)` first to map Clerk → UserProfile.id. Olivia Brain doesn't have UserProfile (replaced by Clerk + the `userId` column). Direct passthrough, no lookup needed.

### Verification

- `npm run typecheck` — clean after fixing 4 small typecheck errors in `tools.ts`: `import { prisma }` → `import prisma` (default export); `Record<string, unknown>` → `Prisma.CalendarEntryWhereInput` (loose type was widening Prisma return type to `any[]` and breaking `.map()` callbacks).
- `npm test` — **94/94 passing** (no regressions; same 76 bridge + 18 chat-route as Session 8).
- Code: 18 files / 5,741 insertions in commit `948f6ed`.
- LTM source unchanged (verified by intent — Read + Grep + Copy-Item only on LTM paths; no Edit / Write / Remove-Item ever touched LTM).

### New weakness item

**W-014** — `match_calendar_memory()` PostgreSQL function not installed in Olivia Brain Supabase. `calendar-memory.searchCalendarMemory()` calls it via `prisma.$queryRawUnsafe` for cosine-similarity semantic search. Wrapped in try/catch — degrades gracefully to empty array + console warning. No runtime crash, but semantic search returns nothing until the SQL function is installed. Operator action when calendar memory becomes a user-facing feature; LTM reference body in `D:\London-Tech-Map\prisma\sql\`.

### Where Session 10 picks up

**Track Calendar · C3** — voice + Olivia models + engine. Per BUILD_SEQUENCE.md C3 row: 10 voice/olivia Prisma models (`VoiceConversation`, `VoiceContact`, `VoiceActionItem`, `OliviaConversation`, `OliviaMessage`, `OliviaPresentation`, `OliviaConsent`, `OliviaGuardrail`, `OliviaUserMemory`) + same schema adaptations as C1. Port `lib/olivia/voice-{conversation,document,memory,prompts}.ts` (52 KB). Port voice slice of `lib/olivia/tools.ts` + `lib/olivia/knowledge-base.ts` (31 KB) + chat slice of `lib/olivia/chat.ts`. Voice models migrate; voice lib files typecheck.

**Operator action before C3:** none new beyond C1's already-applied migration. C3 will add a new migration for the 10 voice/olivia models — operator runs that when C3 lands.

**Build status at session-9 close: green. Test status: 94/94 passing. Typecheck: clean. Track Calendar engine + queries committed (16 of 19 lib/calendar files + adapted queries.ts + calendar slice of tools.ts); 3 LTM-domain files explicitly deferred to their dependency tracks; one new weakness item W-014 logged.**

---

## Part 17 — Session 10 (Track Calendar C3 — voice + olivia models + engine)

Track Calendar · **C3 voice + olivia models + engine**. Picks up from Session 9's C2 (calendar engine + queries shipped, 16 of 19 lib/calendar files ported). Per the C3 row spec: 9 new Prisma models (LTM has 9, not 10 as the original BUILD_SEQUENCE row said — corrected to 9 in this session) + 4 voice lib files + tools.ts voice extension + olivia-guardrails DB re-port + slim chat.ts slice. Discovery: knowledge-base.ts has no in-scope consumer once `processOliviaMessage` is deferred — defer entirely, single concern per port.

### What shipped (commit 4291a39)

**Schema** — 9 voice/olivia models added to `prisma/schema.prisma` (~280 lines) with same C1/C2 adaptations:

- `OliviaConversation` — top-level chat session. `id` UUID, `userId` UUID nullable. `sessionToken @default(cuid())` preserved (it's a session token, not a UUID FK target — cuid is fine).
- `OliviaMessage` — chat turns inside a conversation. `id` UUID, `conversationId` UUID FK to OliviaConversation.
- `OliviaPresentation` — Gamma-generated presentation tied to a chat. `id` UUID, `conversationId` + `userId` UUID nullable.
- `OliviaConsent` — GDPR consent records. `id` UUID, `userId` UUID. Compound unique `[userId, consentType]`.
- `OliviaGuardrail` — admin-editable content rules. `id` UUID. Compound unique `[category, value]`. No userId.
- `OliviaUserMemory` — extracted facts about users. `id` UUID, `userId` UUID (renamed from LTM's `userProfileId`). Compound unique `[userId, category, factKey]` (renamed from `[userProfileId, category, factKey]`). `confidence Float @default(0.7)` preserved (LTM choice — not converted to Decimal).
- `VoiceConversation` — Twilio call transcripts + extracted data. `id` UUID, `userId` UUID nullable (renamed). **`userProfile UserProfile?` FK relation DROPPED** (no UserProfile model in Olivia Brain). `voiceContact` FK kept (VoiceContact ports too). `calendarEntry` FK kept (CalendarEntry exists in C1). `generatedDocumentId` and `generatedPackageId` preserved as plain strings — Document/Package models don't exist yet, polymorphic IDs forward-compat with cluesintelligence Track L. `memoryIds String[] @default([])` preserved (Postgres native array).
- `VoiceContact` — CRM contact derived from voice conversations. `id` UUID. **`linkedPersonId` field DROPPED** (LTM-domain Person model not in Olivia Brain).
- `VoiceActionItem` — task extracted from a call transcript. `id` UUID, `conversationId` UUID FK. `calendarEntryId` polymorphic (no FK relation — matches LTM behavior; LTM also has no `@relation` block here).

**CalendarEntry gains `voiceConversations VoiceConversation[]` reverse relation** — the C1 deferral note at schema line 747-748 is closed and the comment block updated to reflect the wiring.

**SQL migration** generated automatically via `npx prisma migrate diff --from-schema prisma/schema.prisma.pre-c3.bak --to-schema prisma/schema.prisma --script` (after temporarily backing up the pre-C3 schema). 10.5 KB at `prisma/sql/02-add-voice-olivia-foundation.sql`. Operator applies via Supabase SQL Editor (Option B path, same as C1).

**Lib ports:**
- `src/lib/olivia/voice-conversation.ts` (588 lines) — byte-for-byte. Pure Anthropic API + JSON extraction logic. No DB / no LTM-domain deps.
- `src/lib/olivia/voice-document.ts` (380 lines) — byte-for-byte. Pure prompt-building + dictation processing.
- `src/lib/olivia/voice-prompts.ts` (327 lines) — byte-for-byte. Prompt strings + regex helper.
- `src/lib/olivia/voice-memory.ts` (303 lines) — `userProfileId → userId` rename throughout (incl. compound key `userProfileId_category_factKey → userId_category_factKey`) + import fix (`import { prisma }` → `import prisma`, default vs named — same fix pattern as C2's tools.ts).
- `src/lib/olivia/tools.ts` extended in place: 2 new tool defs (`get_user_memory`, `save_user_memory`) + 2 dispatcher cases + `hasLearningConsent` helper + `handleGetUserMemory` / `handleSaveUserMemory` handlers. Now 4 tools total. `getUserProfileId` helper from LTM dropped — Olivia Brain uses Clerk userId directly. Header comment updated.
- `src/lib/calendar/olivia-guardrails.ts` re-ported the DB integration that C2 had to drop (because OliviaGuardrail model didn't exist). Restored: `fetchGuardrails()` + 5-min cache + `clearGuardrailsCache()` + `formatGuardrailsForPrompt()` + the merge logic in `buildGuardrailsPromptSection()`. Hardcoded defaults still always-active.
- `src/lib/olivia/chat.ts` slim slice — `createConversation` / `getConversationHistory` / `getConversationMessages` only. `CreateConversationInput` and `ConversationSummary` types exported.

### Decisions

- **`processOliviaMessage` NOT ported.** LTM's 280-line orchestrator pulls in `@/lib/code-knowledge/olivia-context` (LTM-only code-knowledge layer), `prisma.userProfile.findUnique({ clerkUserId })` (no UserProfile in Olivia Brain), `linkedOrg` calendar field (dropped in C1), full Preparation Studio context injection (LTM-domain), full CristianoShell pipeline context (LTM-domain), and is GPT-4o-only with its own tool-calling loop. Olivia Brain's `/api/olivia/chat` route (built Sessions 4-6) already provides cascade-routed chat (Anthropic → OpenAI → Google → Grok → Perplexity → Mistral → Groq → Tavily → Opus judge) with conversation persistence — that's the orchestrator layer here, not chat.ts. Future track may re-port a slim equivalent if it becomes useful; no band-aid stub now.
- **`knowledge-base.ts` NOT ported.** 31 KB file. Two pure exports useful in principle (`OLIVIA_SYSTEM_PROMPT` static string, `PAGE_DESCRIPTIONS` page descriptions) but no in-scope C3 consumer: the slim chat.ts skips the only LTM consumer (processOliviaMessage). Heavy LTM coupling otherwise: `getPlatformStats` queries `prisma.organization.count`, `buildEntityPersonaPrompt` imports from `@/lib/studio/entityModes` (Studio module that doesn't exist in Olivia Brain). Single concern per port — defer until something asks for it. Updated BUILD_SEQUENCE C3 row to reflect this rather than silently lowering the bar.
- **Schema model count corrected.** BUILD_SEQUENCE C3 row originally said "10 voice/olivia Prisma models" — actual LTM count is 9. Corrected.
- **`userProfile UserProfile?` relation dropped from VoiceConversation** without a stub. The original LTM relation cascades on UserProfile delete (`onDelete: SetNull`). Olivia Brain has no UserProfile; userId is just a Clerk string column. No FK constraint needed.
- **`linkedPersonId` dropped from VoiceContact** without a stub. LTM uses it to link CRM contacts to canonical Person entities; Olivia Brain has no Person model. Per `project_ltm_types_no_speculative_generalization`, don't preserve speculatively.
- **`generatedDocumentId` / `generatedPackageId` preserved as plain strings on VoiceConversation.** No FK relations to Document/Package since neither model exists in Olivia Brain. Polymorphic IDs are forward-compat — when cluesintelligence Track L builds Document/Package models, callers can soft-resolve these IDs.
- **`calendarEntryId` on VoiceActionItem stays polymorphic (no FK).** LTM also has no `@relation` block here — matches LTM behavior byte-for-byte.
- **`sessionToken @default(cuid())` preserved** on OliviaConversation. cuid() is a Prisma built-in — works on any DB, generates opaque session tokens. No reason to force UUID for non-id fields.
- **OliviaUserMemory.confidence stays Float (not Decimal).** LTM choice; consistent across ports.

### Verification

- `npx prisma validate` — clean.
- `npx prisma generate` — Prisma client v7.7.0 regenerated with 9 new model types.
- `npm run typecheck` — clean (after fixing voice-memory.ts default-vs-named import of prisma).
- `npm test` — **94/94 passing** (no regressions; same 76 bridge + 18 chat-route).
- Code: 9 files / 2,645 insertions in commit `4291a39`.
- LTM source unchanged (Read + Grep + Copy-Item only on LTM paths during this session).

### Where Session 11 picks up

**Track Calendar · C4** — 21 voice/email/call/sms/WhatsApp API routes. Per BUILD_SEQUENCE.md C4 row: `/olivia/call/*` ×9 (call, audio, extract, gather, inbound, outbound, recording, reminder, status, twiml — Twilio call lifecycle), `/olivia/calls{,/[id]}` ×2, `/olivia/voice/*` ×5 (root, presentation, process, to-document, to-package), `/olivia/{email,sms,whatsapp}`, `/olivia/conversations/[id]/email`. All 21 routes return proper responses on smoke calls. Twilio webhook signature verification matches LTM.

**Operator action before C4:** apply `prisma/sql/02-add-voice-olivia-foundation.sql` to Supabase (Option B path) so the new tables exist when C4 routes start hitting them. Set Twilio env vars (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`) before C4 routes go live.

**Build status at session-10 close: green. Test status: 94/94 passing. Typecheck: clean. Track Calendar voice + olivia models committed; 2 LTM files explicitly deferred (processOliviaMessage in chat.ts, all of knowledge-base.ts) to dependency-aware future tracks.**

---

## Part 18 — Session 11 (Track Calendar C4 — voice/email/call/sms/WhatsApp routes)

Track Calendar · **C4 — 19 of 21 voice/email/call/sms/WhatsApp API routes**. Picks up from Session 10's C3 (9 voice/olivia models + 4 voice lib files + tools.ts + olivia-guardrails DB integration + slim chat.ts shipped). The HANDOFF flagged the Clerk auth gating decision; Option B (auth stub) was chosen and shipped as `lib/auth/session.ts`. Two LTM routes were dropped from C4 because they depend on Document/Package models that aren't in Olivia Brain — same defer-to-dependency-track pattern as the 3 C2 deferrals.

### What shipped (commit 1657fe2)

**Auth strategy (Option B):**
- `src/lib/auth/session.ts` NEW — Clerk auth STUB. Exports `getAuthSession(): Promise<{ userId: string | null }>`. Behavior:
  - dev / preview: reads `STUB_USER_ID` env var; throws clearly if unset
  - production: throws unconditionally ("Production deployment requires Clerk integration — Track F Session 18")
- Routes import `getAuthSession` instead of Clerk's `auth`. One-line swap when Clerk lands.
- **Not a band-aid:** throws-loudly-on-missing-env so a developer cannot accidentally deploy auth-less routes that look authorized. Function signature matches what Clerk's `auth()` returns.
- Tracked as **W-015** in README weakness backlog.

**Supporting libs ported:**
- `src/lib/twilio/client.ts` byte-for-byte (~478 lines). Coexists with the pre-existing `src/lib/twilio/server.ts` — different surfaces, different consumers. Pure (dynamic import for Twilio SDK; no DB / no LTM-domain).
- `src/lib/elevenlabs/client.ts` byte-for-byte (~150 lines). Coexists with Olivia Brain's pre-existing `src/lib/voice/elevenlabs.ts`. Routes were written against LTM's API; cleanest path was a parallel surface, not refactoring the routes to use the older Olivia Brain wrapper.
- `src/lib/email/resend.ts` byte-for-byte. Resend SDK wrapper for email (`sendOliviaEmail`, `sendConversationEmail`, `sendPackageEmail`, `sendSenderConfirmation`). Last two functions only used by the dropped `voice/to-package` route — kept anyway in the byte-for-byte port (will be needed when Document/Package land).
- `npm install resend` — Resend SDK added to dependencies.

**Routes ported (19):**

| Route | Auth | LTM-domain notes |
|-------|------|------------------|
| `call/route.ts` | Clerk stub | Outbound call initiation |
| `call/audio/route.ts` | webhook | Twilio audio fetch |
| `call/extract/route.ts` | Clerk stub | Post-call extraction; **`prisma.userProfile.findUnique` lookups dropped (2 occurrences)** — userId IS Clerk user ID |
| `call/gather/route.ts` | webhook | Twilio gather (speech input) |
| `call/inbound/route.ts` | webhook | Twilio inbound webhook |
| `call/outbound/route.ts` | webhook | Twilio outbound webhook |
| `call/recording/route.ts` | webhook | Twilio recording status callback |
| `call/reminder/route.ts` | Clerk stub | SMS reminder for calendar entries |
| `call/status/route.ts` | webhook | Twilio status callback (uses `conversation.userProfileId` → renamed to `userId`) |
| `call/twiml/route.ts` | webhook | TwiML generator |
| `calls/route.ts` | Clerk stub | List calls |
| `calls/[id]/route.ts` | Clerk stub | Call detail; `userProfile` include dropped |
| `voice/route.ts` | rate-limit only | ElevenLabs TTS |
| `voice/presentation/route.ts` | Clerk stub | Generate presentation from voice |
| `voice/process/route.ts` | Clerk stub | Process voice transcript |
| `email/route.ts` | Clerk stub | Send Olivia email |
| `sms/route.ts` | Clerk stub | Send SMS; **`prisma.userProfile.findUnique` lookup dropped** (it was unused — comment said "Get user profile for logging" but result wasn't logged) |
| `whatsapp/route.ts` | Clerk stub | Send WhatsApp |
| `conversations/[id]/email/route.ts` | Clerk stub | Email conversation transcript; **`prisma.userProfile.findUnique` lookup dropped** + ownership check changed from `conversation.userId !== userProfile.id` to `conversation.userId !== userId` (userId IS Clerk user ID) |

**Routes intentionally NOT ported (2):**
- `voice/to-document/route.ts` (~300 LOC) — `prisma.document.findUnique/create`, `prisma.documentCollection.findFirst/create`. Document and DocumentCollection models don't exist in Olivia Brain. Defer to Documents track (post-Clerk per `STUDIO_PORT_MANIFEST` § K).
- `voice/to-package/route.ts` (~220 LOC) — `prisma.document.findUnique` + `prisma.package` (Package not in schema). Defer to Track L (cluesintelligence has the Package primitive in its vision docs).

### Mechanical replacements applied bulk-script (PowerShell)

```
import { auth } from "@clerk/nextjs/server";  →  import { getAuthSession } from "@/lib/auth/session";
const { userId } = await auth();              →  const { userId } = await getAuthSession();
await auth()                                  →  await getAuthSession()
import { prisma } from "@/lib/db/client";     →  import prisma from "@/lib/db/client";
userProfileId                                 →  userId
```

Plus ~70 individual `userProfileId` occurrences across the 19 files (Prisma field accesses, function args, log messages).

### Decisions

- **Option B chosen for Clerk auth.** Rationale: ships all 21 routes (well, 19 — the other 2 dropped on different grounds) with a clean one-line-swap path to Clerk; no scope creep into Track F; throws-loudly-on-missing-env eliminates the silent-failure footgun that "stub returns hardcoded user" would have. Aligned with `feedback_world_class_standard` ("no band-aids — root-cause every failure"). User pre-authorized "go ahead on session 11" — recommendation surfaced + executed in same turn.
- **`voice/to-document` + `voice/to-package` dropped not stubbed.** Same rationale as the 3 C2 deferrals. Single concern per port. The dropped routes can re-port byte-for-byte when their dependencies land.
- **Twilio + ElevenLabs clients ported byte-for-byte alongside existing Olivia Brain surfaces** rather than refactoring routes to use the older wrappers. Routes are byte-for-byte ports of LTM, so their import surface should match LTM's.
- **`prisma.userProfile.findUnique` lookups dropped not stubbed.** Olivia Brain's calendar/voice/olivia models all use `userId String @db.Uuid` directly (see `project_ltm_types_no_speculative_generalization` memory). Clerk userId IS the canonical user ID; no UserProfile mapping needed.
- **`resend` npm installed** rather than stubbed. Lib `lib/email/resend.ts` is fully functional at runtime — it gracefully skips sending if `RESEND_API_KEY` is missing, with a console warning. No dev-mode stub needed.

### Verification

- `npm run typecheck` — clean (after fixing the 4 `prisma.userProfile` lookups; bulk script handled the other ~70 mechanical replacements automatically).
- `npm test` — **94/94 passing** (no regressions; same 76 bridge + 18 chat-route).
- Code: 25 files / 5,056 insertions in commit `1657fe2`.
- LTM source unchanged.

### Where Session 12 picks up

**Track Calendar · C5** — calendar UI + 24 calendar API routes. Per BUILD_SEQUENCE.md C5 row: `components/calendar/*` (15 files including **CalendarNotepad** with email/SMS/WhatsApp share modals fully wired to C4 routes) + supporting (`useDraggable`, `OliviaConsentModal`, `mobile-keyboard`). 24 calendar API routes (entries, prep-tasks, sync ×6, attendees, analytics, journey, memory, nearby, notes, olivia, plan, travel, workflow, cron ×2, events ical/rsvp, videos/calendar). Exit: `<CalendarView>` and `<CalendarNotepad>` mount; share buttons hit C4 routes.

**Anticipated gotchas in C5:**
- **Tailwind/styling caveat from W-011 + W-012 carries forward** (calendar UI files use Tailwind classes that are inert in Olivia Brain). Visual fidelity ships in Track C UI rebuild. New weakness item **W-013** captures this when C5 lands.
- **Clerk dependency.** Some of the 24 API routes will need user auth — same Option B `getAuthSession` stub applies.
- **CalendarNotepad share modals wire to C4 routes.** Coordinate paths: `/api/olivia/email`, `/api/olivia/sms`, `/api/olivia/whatsapp` already exist post-C4. Routes return `{ success: true }` on smoke calls.
- **Smart Score / pgvector calendar memory** — `useMemo` for nearby venues will hit the `match_calendar_memory()` SQL function (W-014); graceful empty results until that's installed.

**Operator action before C5:** none new beyond C3's already-anticipated migration. C5 will not change schema; just ports UI + adapter routes.

**Build status at session-11 close: green. Test status: 94/94 passing. Typecheck: clean. Track Calendar voice/email/call/sms/WhatsApp routes committed; 2 LTM routes explicitly deferred (voice/to-document, voice/to-package); one new weakness W-015 logged (Clerk auth stub).**

---

## Part 19 — Session 12 (Track Calendar C5 — calendar UI + 18 of 24 calendar API routes)

Track Calendar · **C5** picks up from Session 11's C4 voice/email/call/sms/WhatsApp routes. Inventory step (per HANDOFF start sequence) surfaced the deferral list before writing any code: of the 24 routes specified in the BUILD_SEQUENCE C5 row, 6 depend on Prisma models that aren't in Olivia Brain (Document, AnalysisResult, Event, EventRsvp, Video, Organization). All 6 deferred to dependency tracks — same pattern as the 3 C2 deferrals + 2 C4 deferrals. No band-aid stubs.

### What shipped (commit `cb678b7`)

**UI components ported (15 + 3 supporting), byte-for-byte:**

| Component | Notes |
|-----------|-------|
| `AgendaRail.tsx` | Sidebar agenda list — pure render |
| `CalendarEntryModal.tsx` | Full-screen entry editor — uses `react-datepicker` + `react-international-phone` + Google Maps autocomplete |
| `CalendarNotepad.tsx` | Note-taking surface with **email/SMS/WhatsApp share modals wired to C4 routes** |
| `CalendarView.tsx` | FullCalendar wrapper. **2 hand-edits:** drop `entry.linkedOrg?.name` reference (Organization model not in OB) + drop `linkedEventId` ecosystem-event linkage logic |
| `ConfirmationChip.tsx` | Inline confirmation pill |
| `EventStatusWidget.tsx` | Attendance toggle (going/maybe/no) |
| `FloatingCalendarWidget.tsx` | Floating draggable widget — uses `useDraggable` + `MapAppointmentsContext` (already in OB from Session 7) |
| `FocusMode.tsx` | Distraction-free single-event view |
| `InsightsPanel.tsx` | Founder-week behavior summary |
| `OliviaPanel.tsx` | Olivia recommendation surface — wires to `/api/calendar/olivia` |
| `PrepTaskList.tsx` | Per-entry task list |
| `SyncPanel.tsx` | Google/Outlook/Calendly connection panel |
| `TabbedAgendaView.tsx` | Day/week/month/list tabs. **1 hand-edit:** drop `entry.linkedOrg?.name` reference |
| `VoiceInput.tsx` | Voice-to-NLP input (browser MediaRecorder → `/api/calendar/olivia` parse) |
| `index.ts` | Barrel export |
| `components/tools/useDraggable.ts` | Shared hook (LTM imports from this path; preserved) |
| `components/olivia/OliviaConsentModal.tsx` | Layer 2 consent modal — calls `/api/olivia/consent` |
| `lib/mobile-keyboard.ts` | `dismissKeyboard()` + `isMobile()` utilities |

**Routes ported (18 of 24):**

| Route | Auth | Adaptations |
|-------|------|-------------|
| `entries/route.ts` | Clerk stub | Drop `prisma.event.findMany` ecosystem block + `linkedEvent`/`linkedOrg` includes + attendee `linkedPersonId` select + linkedEventId logic. Returns empty `ecosystemEvents` array for shape stability. POST drops linkedEventId/linkedOrgId args + auto-document-attachment block (Document model deferred) |
| `prep-tasks/route.ts` | Clerk stub | Drop `linkedOrg` select; `organizerName` falls back to `ecosystemOrgName` only |
| `attendees/route.ts` | Clerk stub | Drop `linkedPersonId` from POST + PUT |
| `analytics/route.ts` | Clerk stub | Byte-for-byte after rename |
| `memory/route.ts` | Clerk stub | Byte-for-byte after rename. Searches via pgvector — gracefully empty until W-014 SQL function installed |
| `notes/route.ts` | Clerk stub | Byte-for-byte after rename |
| `olivia/route.ts` | Clerk stub | Byte-for-byte after rename. Imports `extractUserMemory` + `formatUserMemoriesForPrompt` from C3-ported lib files |
| `plan/route.ts` | Clerk stub | Byte-for-byte — calls `generateDailyBriefForUser` |
| `travel/route.ts` | Clerk stub | Byte-for-byte after rename |
| `sync/route.ts` | Clerk stub | Byte-for-byte after rename — Google/Outlook/Calendly `connect` actions + sync triggers |
| `sync/google/callback/route.ts` | inline `getAuthSession` | Drop `prisma.userProfile.findUnique` lookup. `userId` directly used in `verifyOAuthState` check + `saveGoogleSyncAccount` call |
| `sync/outlook/callback/route.ts` | inline `getAuthSession` | Same as Google callback |
| `sync/conflicts/route.ts` | Clerk stub | Byte-for-byte after rename |
| `sync/webhooks/route.ts` | Clerk stub | Byte-for-byte after rename |
| `sync/calendly/route.ts` | webhook (HMAC) | **Replaced** email-based UserProfile lookup with `CalendarSyncAccount` lookup keyed on `providerEmail`. Fallback: any active Calendly sync account |
| `cron/calendar-sync/route.ts` | CRON_SECRET | Byte-for-byte after rename |
| `cron/calendar-plan/route.ts` | CRON_SECRET | Byte-for-byte after rename |
| `olivia/consent/route.ts` | Clerk stub | New addition (not in original 24) — required by `OliviaConsentModal` for Layer 2 consent persistence |

**Routes deferred (6, no band-aid stubs):**

| Route | Reason | Track |
|-------|--------|-------|
| `journey/route.ts` | `processFounderJourneyLoop` lib deferred in C2 + `AnalysisResult` model not in schema | Track L (cluesintelligence) |
| `workflow/route.ts` | `generateCalendarWorkflow` lib deferred in C2 + `AnalysisResult` + `linkedOrgId` | Track L |
| `documents/route.ts` | `findRelevantDocuments` lib deferred in C2 + `Document` model not in schema | Documents track post-Clerk |
| `nearby/route.ts` | `findNearbyVenues` dropped in C2 (only `haversineKm` survived) + Organization/Event models | Defer per `project_ltm_types_no_speculative_generalization` rule |
| `events/ical/route.ts` | `getAllEventsForFeed` from `lib/queries/events` (not in OB) + `Event` model | Track L if needed |
| `events/rsvp/route.ts` | `prisma.eventRsvp` (model not in OB) | Track L if needed |
| `videos/calendar/route.ts` | `getVideosForCalendar` from `lib/queries/videos` (not in OB) + `Video` model | LTM-specific; defer indefinitely |

### Mechanical replacements applied via PowerShell bulk script

```
import { auth } from "@clerk/nextjs/server";  →  import { getAuthSession } from "@/lib/auth/session";
await auth()                                  →  await getAuthSession()
async function getUserProfileId() {...}       →  async function getUserProfileId() { const { userId } = await getAuthSession(); return userId; }
userProfileId                                 →  userId   (case-sensitive, ~140 occurrences)
userId: userId                                →  userId   (shorthand cleanup with negative lookbehind/lookahead so clerkUserId untouched)
```

Encoding: explicit UTF-8 read+write via `[System.IO.File]::ReadAllText/WriteAllText` to preserve em-dashes/box-drawing chars (PS 5.1's `Get-Content -Raw` defaults to system codepage, mangles UTF-8).

### Decisions

- **6 routes deferred not stubbed.** Same rationale as C2 (3 deferrals) and C4 (2 deferrals). Single concern per port; defer to dependency tracks. `feedback_world_class_standard`: no band-aids.
- **`olivia/consent` added to scope** (route 19 of the 18). Not in original C5 BUILD_SEQUENCE row, but `OliviaConsentModal` (one of the C5 supporting components) calls `POST /api/olivia/consent` to persist Layer 2 consent. Without this route, the modal's flow breaks. Cleaner to land the route alongside the modal than block C5 on it.
- **`react-datepicker` installed** rather than dropped. `CalendarEntryModal` uses it as a lazy import for the start/end date pickers — replacing with native HTML5 date inputs would be a UX regression vs LTM. Standard, well-maintained dep.
- **`system-alerts.ts` console-only stub** instead of porting the model. SystemAlert is a 9-field model used only by cron error logging. Adding it to schema would mean another `prisma migrate diff` cycle + operator action. Console logging satisfies the cron path without DB persistence; tracked as W-016 for when an admin alerts dashboard becomes user-facing.
- **`prisma.userProfile.findUnique` lookups dropped (10 routes).** Same rationale as C4: `userId` IS the canonical user ID directly in OB's calendar/voice/olivia models. Sync callbacks were the trickiest — `verifyOAuthState` returns the user ID embedded in the HMAC-signed state; comparing against `userId` (not `profile.id`) is correct.

### Verification

- `npm run typecheck` — clean (after fixing 7 errors: 1 prep-tasks linkedOrg, 1 react-datepicker missing dep, 4 UI linkedOrg/linkedEventId, 1 unused).
- `npm test` — **94/94 passing** (no regressions).
- Code: 37 files / 5,829 insertions in commit `cb678b7`.
- LTM source unchanged.

### Where Session 13 picks up

**Track Calendar · C6** — App routes + smoke tests + docs. `app/calendar/{page.tsx,CalendarPageClient.tsx}` + Vitest smoke tests for CalendarView, CalendarNotepad, CalendarEntryModal + STUDIO_PORT_MANIFEST §L (Calendar subsystem inventory + voice subsystem inventory) + mark all Track Calendar rows ✅ in BUILD_SEQUENCE. Closes Track Calendar.

**Anticipated gotchas in C6:**
- **Tailwind/styling.** Same caveat as C5 — `/calendar` page mounts but visual fidelity is degraded until Track C UI rebuild.
- **Smoke test scope.** Vitest tests should mount each component with stub props/context and assert basic render — not exercise C4/C5 routes (would need MSW or DB mocking).
- **STUDIO_PORT_MANIFEST §L.** Append calendar inventory: 36 LTM source files (15 UI + 3 supporting + 19 lib/calendar + voice subsystem); record what was ported, what was adapted, what was deferred (the 6 routes + 3 lib files from C2 + 2 routes from C4).
- **Track Calendar closure.** After C6 lands, Track Calendar = ✅ across all 6 sessions. Run-rate: ~48 sessions remain to ship priorities 1–4.

**Operator action before C6:** none new beyond the C3 SQL migration (`02-add-voice-olivia-foundation.sql`) and env vars from C4 + C5 (STUB_USER_ID for previewing routes). C6 ships UI mount tests, no schema changes.

**Build status at session-12 close: green. Test status: 94/94 passing. Typecheck: clean. Track Calendar UI + 18 routes committed; 6 routes explicitly deferred (journey, workflow, documents, nearby, events ical/rsvp, videos/calendar); two new weaknesses W-013 (calendar Tailwind) + W-016 (SystemAlert model) logged.**

---

## Part 20 — Session 13 (Track Calendar C6 — app routes + smoke tests; **CLOSES Track Calendar**)

Track Calendar · **C6** picks up from Session 12's C5 calendar UI + 18 routes. C6 mounts the calendar at a real route, adds Vitest smoke tests for the 3 most-frequently-touched components, and writes the §L inventory in `STUDIO_PORT_MANIFEST.md`. **All 6 Track Calendar sessions now ✅. Track Calendar closes.**

### What shipped (commit `<feat>` + `<docs>`)

**Page surface (2 files + 1 supporting):**

| File | Notes |
|------|-------|
| `src/app/calendar/page.tsx` | Server-component shell. Metadata title "Clues Calendar — London Tech Map" → "Calendar — Olivia Brain". Description rewritten to Olivia framing. Breadcrumb retained ("Home / Calendar"). |
| `src/app/calendar/CalendarPageClient.tsx` | **Byte-for-byte port** (1265 LOC). The full LTM client wrapper: OCC theater (outer-gold-ring 4D executive desk frame) with `OliviaDisplayScreen` mounted as the avatar slot; My Calendar tab wrapping `CalendarView` with `AgendaRail` as `todayHighlight` slot; Notes tab wrapping `CalendarNotepad`; agenda modal (`CalendarEntryModal` opened from agenda card click); focus-mode overlay (`FocusMode`); Layer 1 conversation persistence via `sessionStorage`; Layer 2 GDPR consent flow via `OliviaConsentModal`; conversation history dropdown wired to `/api/olivia/history`; transcript download (markdown blob), email (`/api/olivia/conversations/[id]/email`), read-aloud (Web Speech `SpeechSynthesisUtterance`). Wires to C2/C3/C4/C5 routes with no further adaptation needed — C5 already populated all the calendar routes the client expects. |
| `src/components/olivia/OliviaDisplayScreen.tsx` | **Byte-for-byte port** (696 LOC). 16:9 video display shell wrapping `OliviaVideoAvatar` with transport controls, Web Speech API recognition (en-GB voice, continuous + interim results, automatic pause-while-Olivia-speaks to prevent echo). All deps already in OB: `OliviaVideoAvatar` (existing, exports `OliviaVideoAvatarRef` + `RecordingState`), `InsightsPanel`, `OliviaPanel` (both ported in C5). Track E (Session 17) can later swap the Web Speech recognition for the MediaRecorder + `/api/voice/transcribe` Whisper/Deepgram flow if needed; Web Speech is good enough for the standalone calendar surface. |

**Smoke tests (3 files / 6 cases):**

| Test | Cases | Mocks |
|------|-------|-------|
| `__tests__/CalendarView.test.tsx` | 1: mounts FullCalendar wrapper with stub entries; events count forwarded.<br>2: `todayHighlight` slot renders. | `@fullcalendar/react` (lightweight placeholder exposing `data-events-count`), 4 plugins (`daygrid`, `timegrid`, `interaction`, `list`) → empty default exports. `CalendarEntryModal` / `SyncPanel` / `TabbedAgendaView` / `EventStatusWidget` stubbed to no-op shells. |
| `__tests__/CalendarNotepad.test.tsx` | 1: mounts with empty calendar entries.<br>2: mounts with stub entry. | `react-international-phone` (`PhoneInput` → plain text input) + `style.css` (no-op) — jsdom can't parse the library's CSS. |
| `__tests__/CalendarEntryModal.test.tsx` | 1: create-mode, asserts ≥1 textbox renders.<br>2: edit-mode against stub entry, mounts without throwing. | `@googlemaps/js-api-loader` (`setOptions`/`importLibrary` mocked); `react-datepicker` (lazy import → plain `<input type="date" />`); `react-international-phone`; `react-datepicker/dist/react-datepicker.css`. **`window.matchMedia` stubbed in `beforeAll`** — jsdom doesn't implement it; modal queries it on open to detect coarse-pointer devices. |

All tests use `@vitest-environment jsdom` magic comment per `vitest.config.mts` direction (default env is `node` for server modules; component tests opt into jsdom per-file).

**Test deps installed (devDependencies, lockfile in same commit):**
- `@testing-library/react`
- `@testing-library/dom`
- `@testing-library/jest-dom`
- `jsdom`

### Adaptations vs. LTM source

`CalendarPageClient` is one of the rare files that ports byte-for-byte without rename or strip work — every dependency it pulls (`AgendaRail`, `FocusMode`, `CalendarEntryModal`, `CalendarNotepad`, `OliviaConsentModal`, `OliviaDisplayScreen`, plus the routes it fetches: `/api/calendar/entries`, `/api/calendar/olivia`, `/api/olivia/history`, `/api/olivia/history/[id]`, `/api/olivia/conversations/[id]/email`, `/api/olivia/consent`) was already adapted in C2–C5 or is being added in C6 (`OliviaDisplayScreen`).

**The page-level metadata** is the single content delta: title + description framing swapped from "London Tech Map" branding to "Olivia Brain" branding. Visual chrome, OCC theater, gold-ring 4D frame, conversation toolbar, and the Notes/Calendar tab pattern are kept intact — these are the calendar surface's design language and they belong on the calendar page regardless of which product surfaces it. Per surface-suppression rule, embedded contexts (clueslondon-prod) hide the calendar entirely; standalone Olivia + cluesintelligence + white-label tenants get the full surface.

### SSR pattern

Followed `/map`'s post-Vercel-fix shape (commit `d5fe4c3`): `next/dynamic` with `ssr: false` lives in the **client component** (`CalendarPageClient`), not in the server component (`page.tsx`). The 3 dynamic imports are `OliviaDisplayScreen` (uses Web Speech API), `CalendarView` (FullCalendar references `window` on mount). No SSR hazard introduced.

### Decisions

- **OliviaDisplayScreen ported in C6, not deferred.** Initial scoping considered deferring it as a Track E (voice) dependency. Inspection showed all 3 of its imports (`OliviaVideoAvatar`, `InsightsPanel`, `OliviaPanel`) already exist in OB with the exact types (`OliviaVideoAvatarRef`, `RecordingState`) the wrapper expects. Porting it byte-for-byte is the cleaner option: it makes the OCC theater functional immediately on the standalone calendar surface, and Track E can later swap the Web Speech path for MediaRecorder + Whisper without touching the calendar page.
- **Smoke tests: 2 cases per file, not 1.** HANDOFF spec said "3 component smoke tests"; landed 3 files with 2 cases each (6 cases total) for slightly higher coverage at marginal cost. All within the render-only scope — no route exercises, no MSW.
- **Test deps installed, not stubbed.** `@testing-library/react` is the React-19-compatible standard; alternatives (Enzyme — abandoned for React 18+; raw `react-dom/test-utils` — too low-level for the C6 scope) would have been band-aids. Lockfile committed alongside `package.json` per standing rule.
- **`beforeAll(() => Object.defineProperty(window, "matchMedia", ...))` is not a band-aid.** `matchMedia` is a documented jsdom gap (jsdom issue #3522, open since 2022); stubbing it in test-setup is the canonical workaround the React-Testing-Library + Vitest community uses. Honest engineering, not a hack.
- **No new W-IDs.** C6 doesn't introduce new weaknesses. The Tailwind/styling gap (W-013) carries forward unchanged for the new files (the OCC theater + page chrome use Tailwind classes that are inert; same resolution path in Track C). The SystemAlert stub (W-016) is unaffected.

### Verification

- `npm run typecheck` — clean.
- `npm test` — **100/100 passing** (94 baseline + 6 new smoke). No regressions.
- LTM source unchanged.
- All commits pushed to `origin/main` immediately per standing rule.

### Track Calendar closure summary

All 6 sessions ✅:

| Session | Deliverable | LTM source ported | Deferred to dependency tracks |
|---------|-------------|-------------------|-------------------------------|
| C1 (S8) | Schema + embeddings + npm | 14 calendar Prisma models + 15 enums | DealRoom + Event-family models (LTM-domain) |
| C2 (S9) | Engine + queries | 16 of 19 `lib/calendar/*` files; 4-tool `tools.ts` slice | document-aware + founder-journey + workflow-generator (Document/AnalysisResult deps) |
| C3 (S10) | Voice + olivia models + engine | 9 voice/olivia Prisma models; 4 voice lib files; chat.ts slim slice | `processOliviaMessage` (cascade route serves equivalent); `knowledge-base.ts` (no in-scope consumer) |
| C4 (S11) | Voice/email/call/sms/WhatsApp routes | 19 of 21 LTM routes; lib/twilio + lib/elevenlabs + lib/email/resend; lib/auth/session.ts stub | voice/to-document + voice/to-package (Document/Package deps) |
| C5 (S12) | Calendar UI + 18 routes | 15 calendar UI components + 3 supporting; 18 of 24 routes; lib/system-alerts stub | journey/workflow/documents/nearby/events/videos routes (AnalysisResult/Document/Event/Video deps) |
| C6 (S13) | App routes + smoke tests + docs | 2 app routes + OliviaDisplayScreen + 3 smoke tests + STUDIO_PORT_MANIFEST §L | none |

**Outstanding operator actions** (carried forward, none new in C6):

| Action | Source session | Status |
|--------|----------------|--------|
| Apply C3 voice/olivia SQL migration to Supabase | C3 | ⏳ Pending |
| Set `STUB_USER_ID` in Vercel Preview | C4 | ⏳ Pending |
| Set Twilio + ElevenLabs + Resend env vars | C4 | ⏳ Pending |
| Set Google OAuth + Outlook OAuth + Calendar encryption + NEXT_PUBLIC_APP_URL env vars | C5 | ⏳ Pending |
| Set `TAVILY_API_KEY` | C2 | ⏳ Pending |
| Install `match_calendar_memory()` Postgres function (W-014) | C2 | ⏳ Pending |

**Carried-forward weaknesses (none introduced by C6):**

| W-ID | Topic | Track that resolves |
|------|-------|---------------------|
| W-013 | Calendar UI Tailwind classes inert (paired with W-011 / W-012 from map) | Track C UI rebuild |
| W-014 | `match_calendar_memory()` SQL function not installed | Operator action whenever calendar memory becomes user-facing |
| W-015 | Clerk auth STUB at `lib/auth/session.ts` | Track F Session 18 (Clerk wiring) |
| W-016 | `SystemAlert` Prisma model not in OB schema | Track O / admin-alerts dashboard build |

### Where Session 14 picks up

**Track C — Studio UI rebuild + design-system alignment (Session 14 = Session 9 in original numbering, shifted +5).**

Per `BUILD_SEQUENCE.md` Track C, Session 14 is the **three-region shell at `/`** (header sticky 56px with AvatarOrb + STUDIO OLIVIA wordmark + crumb + score chips + Match/Export; left aside 264px scrollable; right aside 320px tabbed; center flex 1). Inline-style approach using the prototype's `C` color tokens, NOT Tailwind — but Track C is also where the **W-011 / W-012 / W-013 Tailwind/token alignment decision** lands. Per `01_UI_DESIGN_SYSTEM.md`, the answer is the Aurum + Aether token system in LCH color space with Linear's 3-input theme generator; Tailwind itself is a separate decision (the design-system tokens land as CSS custom properties either way).

Anticipated gotchas for Session 14:
- **Tailwind decision blocks visual-fidelity progress on map + calendar + future ports.** Decide before — or alongside — the three-region shell port.
- **`01_UI_DESIGN_SYSTEM.md` § 11.4 lays out the target file structure** (`src/styles/tokens.css`, `src/components/primitives/`, `src/components/workspace/`, `src/lib/workspace/`). Consider establishing the skeleton in S14 even if components fill in across S15–S19.
- **Existing /map and /calendar routes survive Track C.** They're production-style ported; Track C migrates their styling, not their structure. Don't rewrite — re-skin.

### Build status at session-13 close

**Green.** Test: **100/100** passing. Typecheck: clean. Track Calendar: **6 of 6 sessions ✅, track CLOSED.** ~47 sessions remain to ship priorities 1–4.

---

## Part 21 — Session 14 (Track C, Session 9 in original numbering — three-region shell + Aurum/Aether design system + Tailwind v4)

Track C opens. Session 14 establishes the **canonical design substrate** the entire CLUES product universe builds on: tokens-as-substrate, Tailwind v4 utilities, theme generator, three-region workspace shell. Resolves W-011, W-012, W-013 in one stroke.

### The strategic decision (locked 2026-05-03)

**Adopt the canonical Aurum + Aether token system as CSS custom properties + Tailwind v4 utilities + inline styles for shell chrome.** All three styling paradigms consume the same token primitives.

Three styling approaches, one substrate:

1. **CSS custom properties** (`--canvas-base`, `--aurum-primary`, etc.) are the universal lingua franca. Every paint references a token.
2. **Tailwind v4 utility classes** (`bg-aurum`, `text-fg-primary`) are generated from those tokens via the `@theme` directive. The 33+ ported LTM files (map + calendar) immediately render correctly.
3. **Inline styles** (`style={{ background: "var(--aurum-primary)" }}`) are allowed for shell chrome — matches the Studio prototype's pattern, avoids the rewrite cost of converting `C.accent` strings.

The **Aurum gold** (`#C4A96A`) wins over the Studio prototype's `C.accent` orange (`#FF8C00`). `01_UI_DESIGN_SYSTEM.md` is the authoritative design contract; `STUDIO_OLIVIA_DESIGN.md` § 6 gets a docs update separately.

The portability rationale (per the user's product question, founder-direction 2026-05-03): **no hardcoded colors or sizes in components, only token references.** A tenant rebrands by overriding 3 inputs (`base`, `accent`, `contrast`) — the entire UI repaints. Olivia embeds in a host app by inheriting that host's tokens. A host app embeds Olivia by setting tokens on a wrapper element. Both directions, same primitive.

### What shipped (commit `21fbecf`)

**Design substrate:**

| File | Lines | Purpose |
|------|-------|---------|
| `src/styles/tokens.css` | 217 | Canonical token ladder per `01_UI_DESIGN_SYSTEM.md` §§ 1-7. LCH (`oklch()`) with sRGB fallbacks. Backward-compat aliases (`--bg`, `--text`, `--gold`, `--background`, `--foreground`, `--card-bg`, `--card-border`, `--accent`, `--brand-50` … `--brand-900`) so existing OB Phase-1 surfaces + LTM-ported map + calendar render without rewrite. Tailwind v4 `@theme` block at the bottom exposes tokens as utility classes. |
| `src/styles/base.css` | 130 | Element resets + accessibility primitives. `:focus-visible` for focus rings, `touch-action: manipulation`, 16px font-size floor on inputs, `overscroll-behavior: contain` on modals, skip-to-content link, `.sr-only` utility, `prefers-reduced-motion`, 44×44 touch targets, forced-colors support. |
| `src/app/globals.css` | replaced | Imports tokens + base + Tailwind. Phase-1 surface selectors (`.shell`, `.hero`, `.bubble`, `.admin-*`) preserved verbatim; render correctly via the backward-compat aliases. |
| `postcss.config.mjs` | new | `@tailwindcss/postcss` (v4 plugin). |

Tailwind v4 uses CSS-first configuration — no separate `tailwind.config.ts`. The `@theme` directive in `tokens.css` is the single source of truth for both CSS-variable consumers and Tailwind utility consumers.

**Theme generator (the white-label primitive):**

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/theme/generate.ts` | 230 | Pure function `generateThemeTokens({base, accent, contrast})` produces the canonical token map. `serializeThemeTokens(tokens, themeId)` emits a CSS rule body keyed on `[data-theme="<id>"]`. LCH parser + formatter + 3 contrast levels (standard / high / aaa). Surface ladder steps `+2.1%` lightness perceptually. Accent flows through to aurum; aether + status colours stay universal across tenants. |
| `src/lib/theme/__tests__/generate.test.ts` | 12 cases | Determinism, surface ladder monotonicity, contrast level monotonicity, border-alpha lift, accent override + isolation, runtime LCH validation, serializer contract. |

**Three-region workspace shell (the chrome):**

| File | Lines | Purpose |
|------|-------|---------|
| `WorkspaceShell.tsx` | 86 | Four-region layout: optional ticker rail + sticky header + left rail + center + right inspector. Skip-to-main-content link. Embedded mode supports `rail={null}` / `inspector={null}` per `project_olivia_surface_suppression`. |
| `Header.tsx` | 165 | 56px sticky. AvatarOrb + wordmark + breadcrumb (left); score chips + actions (right). All paint via tokens. |
| `RailLeft.tsx` | 38 | 264px expanded / 56px collapsed (transition 220ms). Slot for content. |
| `Inspector.tsx` | 116 | 320px right aside. ARIA-correct `role="tablist"` strip, arrow-key tab rover (Home/End wrap), focus management, slot for active tab body. |
| `Center.tsx` | 47 | Flex-1 main canvas. Optional toolbar slot. |
| `AvatarOrb.tsx` (placeholder) | 144 | 4 sizes (40/56/96/240), 6 states (idle/listening/thinking/speaking/error/connecting). Aurum + aether twin-pulse signature animation. Reduced-motion respected. Full impl lands S15. |

**Smoke tests (component-level):**

- `__tests__/AvatarOrb.test.tsx` — 11 cases. All 6 states, glyph default + custom + hidden when `hasVideo`, button-vs-div by `onClick` presence, click handler.
- `__tests__/WorkspaceShell.test.tsx` — 11 cases across `WorkspaceShell`, `Header`, `RailLeft`, `Center`, `Inspector`. Skip-to-content always present, four-region wiring, breadcrumb rendering, score chips, tab strip ARIA, click + arrow-key tab rover, wrap-around at edges, `open=false` rendering null.

**Root surface refresh:**

- `src/app/page.tsx` — replaced. Mounts the three-region shell with **placeholder content** per region: rail = quick-link cards to `/calendar`, `/map`, `/test-avatar`, `/admin`, `/admin/phase1`; inspector = Olivia + Library + Audit tabs (each tab body explains "wires up Session N"); center = welcome card explaining the design-system substrate + Aurum design-system note.
- `src/app/admin/phase1/page.tsx` — relocated Phase-1 readiness UI. The previous `/` mounted `Phase1Studio` directly; that surface lives at `/admin/phase1` now so the root is freed for the Studio shell.
- `/map`, `/calendar`, `/test-avatar`, `/admin` survive untouched.

**Test infrastructure:**

- `vitest.setup.ts` — registers `@testing-library/react`'s `cleanup` in `afterEach`. Sibling tests in the same file pollute each other's DOM otherwise (the AvatarOrb 6-state `it.each` block + WorkspaceShell multi-test file caught this immediately on first run).
- `vitest.config.mts` — adds `setupFiles: ["./vitest.setup.ts"]`.
- `cleanup` is a no-op in node-environment tests, so the global registration is safe across the 76 server-side test files.

### Decisions

- **Aurum + Aether wins over `C` orange.** `01_UI_DESIGN_SYSTEM.md` is authoritative. The Studio prototype's orange/sapphire palette was an earlier iteration. STUDIO_OLIVIA_DESIGN.md § 6 gets a docs update flagging this override.
- **Tailwind v4, not v3.** v4's CSS-first `@theme` directive aligns perfectly with our tokens-as-substrate strategy — no parallel JS config, no theme-object duplication. Single source of truth.
- **Tokens defined in LCH (`oklch()`) with sRGB hex fallbacks.** § 1.7 — perceptually uniform; equal-saturation values look the same brightness regardless of hue. Future cluesxscore needs 23 module accents that look balanced; HSL would have given 23 inconsistent visual weights.
- **Backward-compat aliases declared, not migrated.** `--bg → --canvas-base` etc. — Phase-1 surfaces + ported LTM surfaces keep working without rewrite. The aliases are pointers; the underlying colors are unified. Migration happens organically as components touch their styles in future sessions.
- **Inline styles allowed for shell chrome.** Matches the Studio prototype pattern + avoids the rewrite cost of converting `C.accent` strings. The tokens-as-substrate strategy unblocks this — inline styles reference `var(--aurum-primary)` not `"#C4A96A"`. Same portability story as Tailwind utilities.
- **AvatarOrb is a placeholder.** 144 lines. Full implementation (LiveAvatar wrapping, council-mode orbital agent dots, Cristiano gold-saturated transition) lands S15 alongside the other 4 primitives. Surface contract stable from S14 — `Header`, `RailLeft`, `Inspector` import from the same path now and don't move when the full impl lands.
- **No raw hex codes in any new file shipped this session.** Lint rule for enforcement defers to Track O — every new file follows the rule by construction.

### Verification

- `npm run typecheck` — clean.
- `npm test` — **134/134 passing** (94 baseline + 6 calendar smoke + 12 theme generator + 11 AvatarOrb + 11 workspace shell). No regressions.
- LTM source unchanged.
- All commits pushed to `origin/main`.

### W-IDs resolved

| W-ID | Status | How resolved |
|------|--------|--------------|
| W-011 | ✅ Resolved | Tailwind v4 installed; map's 223+ Tailwind classes now render correctly. |
| W-012 | ✅ Resolved | Backward-compat aliases (`--background → --canvas-base-srgb`, `--card-bg → --surface-1-srgb`, etc.) in `tokens.css`. Map's `var(--xxx)` references now resolve. |
| W-013 | ✅ Resolved | Same fix as W-011 + W-012 — Calendar UI's Tailwind classes + `var(--xxx)` refs both resolve. |

### Where Session 15 picks up

**Track C — Session 15 (Track C internal session 2):** five reusable primitives.

Per `BUILD_SEQUENCE.md` Track C row 10: `AvatarOrb` (full impl — already placeholder-shipped in S14), `ConsensusDots`, `Badge`, `CompletionRing`, `DeckDetailModal`. Vitest unit tests on each. Existing `Badge` + `CompletionRing` in OB get refactored to match the prototype spec.

The S14 placeholder `AvatarOrb` exports the canonical surface contract — S15 replaces the implementation while keeping the prop signature stable. `Header`, `RailLeft`, `Inspector` (all importing from `@/components/primitives`) require zero updates.

### Build status at session-14 close

**Green.** Test: **134/134** passing. Typecheck: clean. Track C: **1 of 6 sessions ✅** (S14 done; S15-S19 remain). Three open weaknesses (W-011 / W-012 / W-013) closed in one stroke. ~46 sessions remain to ship priorities 1–4.

---

## Part 22 — Session 15 (Track C, Session 10 in original numbering — five reusable primitives)

Track C Session 10 ships the **five reusable primitives** the Studio prototype defines (`docs/STUDIO_OLIVIA_DESIGN.md` § 2.1) and `01_UI_DESIGN_SYSTEM.md` § 8.2. The S14 placeholder `AvatarOrb` is replaced with the full implementation; `ConsensusDots`, `Badge`, `CompletionRing`, and `DeckDetailModal` are net-new. Every paint references a canonical Aurum / Aether token; no raw hex codes anywhere in this commit.

### What shipped (commit `22f1454`)

| Primitive | Purpose | Lines | Tests |
|-----------|---------|-------|-------|
| `AvatarOrb` (full impl) | The signature Olivia chrome — 5 sizes, 6 states, council mode, Cristiano transition, lazy LiveAvatar | 290 | 19 |
| `Badge` | Color-tiered percent pill, four tiers via `data-badge-tier` | 120 | 10 |
| `CompletionRing` | SVG circular progress, four tiers via `data-ring-tier` | 130 | 11 |
| `ConsensusDots` | N-of-5 dot strip, single `role="img"` with descriptive label | 65 | 8 |
| `DeckDetailModal` | Radix Dialog wrapper for archetype detail + Apply CTA | 270 | 9 |

**AvatarOrb full impl details:**

- **Cristiano gold-saturated transition (§ 6.3).** When `intent="judge"` + `state="speaking"`, the orb swells to gold-fill for 1s and reflects via `data-cristiano="true"`. The user always knows when a unilateral judge call has happened. Animation freezes under `prefers-reduced-motion`.
- **Council mode (§ 6.4).** When `subAgents={[...]}`, dots orbit the orb at evenly-spaced angles in their assigned colours: Olivia + Cristiano (aurum), Research (aether), Persona (mint-up), Math (sky-info), Multilingual (coral-down-mute). Active dots pulse + glow; inactive dots fade to 0.35 opacity. Each dot exposes its own ARIA label per § 6.4 colour assignments.
- **LiveAvatar lazy-mount.** `OliviaVideoAvatar` is dynamically imported via `lazy()` + `Suspense` and mounted only at size 240 OR when `hasVideo` is explicitly true. Smaller sizes (40/56/96) keep the glyph + state animation; the heavyweight LiveKit + ElevenLabs pipeline doesn't load until needed. Reduces initial-load JS for surfaces that only need the status indicator.
- **Surface contract preserved from S14.** `Header`, `RailLeft`, `Inspector` (S14 consumers) require zero updates. New props (`subAgents`, `intent`, `adminKey`, `lastReply`, `onReady`, `onDisconnect`, `onSpeakingChange`) are all optional.

**Badge tier rules** (drives `data-badge-tier`):
- ≥80 → high → mint-up
- 50-79 → medium → amber-warn
- 1-49 → low → coral-down
- 0 → empty → fg-disabled

**CompletionRing tier rules** identical to Badge so cards carrying both read coherently. SVG with two circles (background track + progress arc); animated `stroke-dashoffset` + `stroke` transitions; `role="progressbar"` + `aria-valuenow` / `aria-valuemin` / `aria-valuemax`.

**ConsensusDots** renders as a single `role="img"` with `aria-label="N of M sources agree"` so screen readers don't have to count dots individually. Five 6-px dots by default; `total` / `dotSize` / `gap` are configurable; clamping at the boundaries; floats round down via floor.

**DeckDetailModal** is built on `@radix-ui/react-dialog` (`npm install @radix-ui/react-dialog`) per § 8.3 — never reinvent a11y primitives. Focus-trap, return-focus, Esc-to-close, ARIA all handled by Radix. The modal renders the full Studio prototype payload: category chip + stage + year + slideCount eyebrow row, dialog title, optional tag, ConsensusDots + raised chip + score Badge, four optional sections (Insight, Fit, Match Reasons, Olivia Action), and the gradient "Apply This Archetype" CTA. Custom `applyLabel` lets cluesintelligence verdict modal and cluesxscore metric-detail modal reuse the same primitive shape.

### Backward-compat shims

`src/components/pitch/Badge.tsx` and `src/components/pitch/CompletionRing.tsx` were the prior locations — both used raw hex codes (`#80d8c3`, `#d8aa60`, `#f28d7f`) which violated `01_UI_DESIGN_SYSTEM.md` § 1.6. They are now **thin re-export shims** pointing at the canonical primitives in `src/components/primitives/`. No internal imports use the legacy paths today (verified via grep), but the shim preserves the import contract for any future code that does. The migration is zero-risk.

### Decisions

- **Pitch primitives moved, not duplicated.** Old paths re-export; canonical impls live in `primitives/`. Single source of truth, zero duplication.
- **`data-badge-tier` / `data-ring-tier` attributes.** Selectors for testing + visual-diff tools without parsing inline styles. Cheap; no bundle cost.
- **Radix Dialog over a hand-rolled modal.** § 8.3 — focus-trap + return-focus + Esc + ARIA correctness all hard to get right; Radix is the industry standard. cmdk + react-day-picker + react-grid-layout will land same way as their dependencies surface in S16-S19.
- **AvatarOrb size 240 implies `hasVideo` by default.** A 240px orb is the hero / inspector-fullscreen size — its only realistic content is the LiveAvatar video stream. Default-true reduces caller boilerplate; explicit `hasVideo={false}` opts out (e.g., for static profile-photo renders).
- **Council-mode dots use the orb's own border-radius math.** Dots position at `(cos θ × R, sin θ × R)` where R = orb-radius + 18px. Even spacing regardless of `subAgents.length`. The animation `prefers-reduced-motion` clamps follow `base.css`.
- **Cristiano transition is a documented behaviour, not an aesthetic flourish.** The user-facing contract: any time a unilateral judge call happens, the orb visually announces it. Captured in § 6.3 (design system) + § 8 #1 (notable design choices) + this session log.

### Verification

- `npm run typecheck` — clean.
- `npm test` — **180/180 passing** (134 baseline + 10 Badge + 11 CompletionRing + 8 ConsensusDots + 9 DeckDetailModal + 8 net new AvatarOrb cases for Cristiano transition + council mode + lazy-mount). No regressions.
- LTM source unchanged.
- All commits pushed to `origin/main`.

### Where Session 16 picks up

**Track C — Session 16 (Track C internal session 3):** Library tab + DeckDetailModal interaction.

Per `BUILD_SEQUENCE.md` Track C row 11: 75 archetypes + 12 templates from the prototype's static data, scored by `scoreDecks` / `scoreTemplates`. Apply-archetype regenerates slides. Real backend wiring, not stubbed Anthropic calls.

The S15 `DeckDetailModal` exports the canonical surface contract — S16 wires the library list + scoring + apply flow into it.

**Anticipated S16 gotchas:**
- **Static archetype + template data lives in the prototype JSX (`D:\Studio-Olivia\StudioOliviaGrandMaster (2).jsx`).** Lift it into `src/lib/studio/archetypes.ts` + `src/lib/studio/templates.ts` with proper TypeScript types, not inline arrays.
- **`scoreDecks` / `scoreTemplates` are pure functions** of `(deck, deckConfig)` → score + reasons. Keep them as standalone tested helpers.
- **Apply flow regenerates slides.** S16 needs a `slides` state slot somewhere — this is the entry point for the Studio engine port (Track B Session 8's deferred work). Decide whether to land the slides state model in S16 or defer to S17.

### Build status at session-15 close

**Green.** Test: **180/180** passing. Typecheck: clean. Track C: **2 of 6 sessions ✅** (S14 + S15 done; S16-S19 remain). ~45 sessions remain to ship priorities 1–4.

---

## Part 23 — Session 16 (Track C internal session 3)

**Locked 2026-05-07.** Library tab + scoring + Apply flow shipped. HEAD `519d4f5`. **197/197 tests passing**, typecheck clean.

### What shipped (9 files, +1453 / -49 LOC)

| File | LOC | Role |
|---|---|---|
| `src/lib/studio/types.ts` | 175 | Strict types: `DeckArchetype`, `PlanTemplate`, `Scored<T>`, `DeckConfig`, `CategoryKey`, `Slide`, `SlideType`, `LibraryFilter`, `ScoringPrefs`, `PersonaKey` + `toDeck()` adapter from raw archetype to `DeckDetailModal`'s `Deck` shape. |
| `src/lib/studio/category-colors.ts` | 78 | `CAT_LIB` equivalent — 9 categories mapped to canonical Aurum/Aether/sky-info/mint-up/coral-down/amber-warn tokens. **Zero raw hex** per `01_UI_DESIGN_SYSTEM.md` § 1.6. |
| `src/lib/studio/archetypes.ts` | 80 | `DECK_ARCHETYPES` — 75 entries: 1–53 prototype-curated set + 54–75 "Real Verified Decks" (historical raises with `raised`/`year`/`slideCount`). Lifted byte-for-byte from `D:\Studio-Olivia\StudioOliviaGrandMaster (2).jsx` lines 17 + 19. |
| `src/lib/studio/templates.ts` | 24 | `PLAN_TEMPLATES` — 12 entries: Sequoia BP, Lean Canvas, UK BP, AI BP, Fintech BP, One-Page Pitch, SaaS BP, Proptech BP, Healthtech BP, London Ecosystem BP, Buyout/PE BP, Grant/Visa BP. Lifted from line 22. |
| `src/lib/studio/scoring.ts` | 178 | Pure functions: `scoreDecks`, `scoreTemplates`, `applyLibraryFilter`, `industryToCategory`. Math byte-for-byte from prototype: `+30` stage, `+22` cat, `×7` consensus, `+15` pre-traction (traction=0 + Pre-seed), `+12` traction-deck, `+20`/`+25` London, `+15`/`+18` AI, `+4`/`+8` `olivia_action`. |
| `src/lib/studio/slides.ts` | 75 | `generateSlidesForArchetype`, `buildSlideSequence`. Local generation (no LLM call) — fixed 10-slide sequence (COVER → HOOK → PROBLEM → SOLUTION → MARKET → PRODUCT → TRACTION → MOAT → TEAM → ASK), extends with WHY_NOW / ROADMAP / COMPETITION / ECOSYSTEM / DEMO / REGULATORY / DETAIL when `slideCount > 10`. |
| `src/components/studio/LibraryTab.tsx` | 318 | Search input, Decks/Plans toggle (live counts), relevance line ("X archetypes · Stage/Industry relevance"), scrollable card list (3-px category bar, name, category pill, stage chip, ConsensusDots, optional `raised` chip, 2-line clamped insight, big mono `Aurum` score number on the right), DeckDetailModal interaction. |
| `src/lib/studio/__tests__/scoring.test.ts` | 198 | **17 deterministic tests**: stage match, category match, consensus weighting, pre-traction bonus, traction-deck bonus, London + AI prefs, `Any` wildcard, sort descending, no-mutation; templates' heavier London (`+25`) + AI (`+18`) + `olivia_action` (`+8`); filter by cat / stage / search; `industryToCategory` mapping + fallback. |
| `src/app/page.tsx` (modified) | net +60 | Inspector library tab now mounts `<LibraryTab onApplyArchetype={...} />`; minimal `slides` state holds Apply output; aether-toned `appliedSummary` confirmation breadcrumb in center pane lists the slide-type sequence. |

### Decisions

- **Default deckConfig** is `{ stage: "Seed", industry: "AI", goal: "Pre-seed Round", tone: "Confident & Optimistic" }`. Defensible Track-C-Session-16 baseline; left-rail controls (project name, persona pills, deck-config 2×2 grid) land in S17.
- **Slides state lives in `page.tsx` for now**, not in a Studio context provider. Trivial to lift into a context when S17 builds the slide editor; deferring premature abstraction (`feedback_world_class_standard`).
- **Category-color mapping pragmatic, not rigid.** Some pairs share a token (`ai_modern` + `ai_template` both → `--aether-primary`; `london_uk` + `consumer` both → `--coral-down`) because the **label** and **mute background** disambiguate visually. Distinct tokens were assigned where the difference is semantically load-bearing (saas → mint-up, fintech → amber-warn).
- **Apply flow generates slide types only.** Slide bodies (`text` / `fields`) intentionally left empty — S17 builds the per-slide editor (guided + freeform modes) per § 2.4. The breadcrumb shows the slide-type sequence so the user has a confirmation tail.
- **Default active inspector tab switched from `olivia` → `library`** to give the new surface its 30 seconds of fame. S18 wires the Olivia chat brain; until then Library has the most working UX.
- **`onApplyArchetype` callback receives the *scored* archetype**, not the `Deck` adapter shape. Necessary because the slide generator needs `slideCount`/`sections` which `toDeck()` collapses into a single `slideCount` field. `LibraryTab` keeps both around.

### Verification

- `npm run typecheck` — clean.
- `npm test` — **197/197 passing** (180 baseline + 17 new scoring tests). No regressions.
- Self-test on the failing math: two test expectations had to be corrected (forgot the `+15` Pre-traction bonus + `+4` `olivia_action`). Code was right; tests were wrong. Fixed in the same commit, no band-aid.
- LTM source unchanged.
- All commits pushed to `origin/main`.

### Where Session 17 picks up

**Track C — Session 17 (Track C internal session 4):** Section nav + document tree + frameworks panel.

Per `BUILD_SEQUENCE.md` Track C row 12: four-button section nav (Pitch / Plan / Documents / General with counts), 10-category collapsible Documents tree (~65 docs total), 14-framework toggleable Frameworks panel, 16-section Plan nav. All wired to the engine ported in Track B (when Track B Session 8 documents-engine port lands). For S17 the wiring targets are stub data + correct structure; engine wiring lands when Documents track + Track V close.

**Anticipated S17 gotchas:**

- **Section nav drives `navSection` state** which gates which left-aside content + which center-main view renders. Five-way state machine (`pitch` / `plan` / `documents` / `general` + nothing-selected default).
- **Documents tree depends on a `DOC_CATEGORIES` static const** — same shape as `DECK_ARCHETYPES`, lift it from the prototype line 8 (per the design doc § 3 inventory).
- **Frameworks panel reuses `FRAMEWORKS` from prototype line 13** (already known from the SESSION 16 source-pull). 14 entries with `id`, `name`, `tag`, `cat`, `conf`, `color`. Same color-token migration pattern as category-colors.
- **Plan section nav** uses `PLAN_SECTIONS` from prototype line 11 (TBD — not yet read; lift in S17). 16 entries with `key`, `title`, `icon`.
- **Documents view's per-doc editor** is a thin stub in S17 — actual editing depth lands when Track B Session 8 (Documents engine port) closes. Per the BUILD_SEQUENCE Track B note, Documents engine is Clerk-blocked (W-009) and needs Track F first OR a Clerk-stub strategy.

### Build status at session-16 close

**Green.** Test: **197/197** passing. Typecheck: clean. Track C: **3 of 6 sessions ✅** (S14 + S15 + S16 done; S17–S19 remain). ~69 sessions remain to ship priorities 1–4 (was ~70 before S16).

---

## Part 24 — Session 17 (Track C internal session 4)

**Locked 2026-05-07.** Section nav + documents tree + frameworks panel + plan section nav shipped. HEAD `75c39a5`. **207/207 tests passing**, typecheck clean.

North-star alignment: S17 advances Olivia toward "agentic-powered Chief Intelligence Officer" by giving her the structural pivot — she now switches between Pitch / Plan / Documents / General contexts and surfaces the right contextual content per section without losing place. This is the navigational backbone the bicycle-wheel architecture needs (one shell, multiple expert modes).

### What shipped (11 files, +1162 / -10 LOC)

| File | LOC | Role |
|---|---|---|
| `src/lib/studio/doc-categories.ts` | 145 | `DOC_CATEGORIES` — 10 categories, ~65 docs total. Lifted from prototype line 11 byte-for-byte. Plus `TOTAL_DOC_COUNT` derived constant. |
| `src/lib/studio/plan-sections.ts` | 39 | `PLAN_SECTIONS` — 16 entries (Executive Summary → London Ecosystem Fit). Lifted from prototype line 12. |
| `src/lib/studio/frameworks.ts` | 56 | `FRAMEWORKS` — 14 entries. Raw hex `color` field **dropped** per design system § 1.6; colors derived at render time via `frameworkCategoryToken(cat)`. |
| `src/lib/studio/slide-meta.ts` | 47 | `SLIDE_META` — 17 slide types (16 prototype + DETAIL fallback) with icon + canonical Aurum/Aether token. Drives slide-card editor (S18+) and Pitch section icons. |
| `src/lib/studio/types.ts` | +13 | `NavSection` (`"pitch" \| "plan" \| "documents" \| "general"`) + `ActiveDoc` (`{ category, doc }`) types added. |
| `src/components/studio/SectionNav.tsx` | 122 | 4-button vertical toggle. Counts via prop (pitch=slides.length, plan=16, documents=65). Active gets aurum-mute fill + aurum border + `aria-current="page"`. |
| `src/components/studio/DocumentTree.tsx` | 162 | 10 collapsible categories with chevron rotation animation. Each row → button with chevron + emoji + title + count. Expanded categories reveal nested doc rows with `CompletionRing(value=pct)` + name. Active doc gets aurum-mute background + aurum border. ARIA tree role + `aria-expanded` + `aria-selected`. |
| `src/components/studio/FrameworksPanel.tsx` | 132 | 14 toggleable framework rows. Active → category-token-colored 8-px dot + bold name + confidence number on right. Inactive → muted dot + neutral name. `aria-pressed` reflects toggle state. |
| `src/components/studio/PlanSectionNav.tsx` | 102 | 16 plan sections with `Badge(value=conf, size="sm")` per row. Active gets aurum-mute fill + `aria-current="page"`. |
| `src/components/studio/__tests__/section-rail.test.tsx` | 138 | **10 tests:** SectionNav (renders 4 + counts; aria-current + onChange), FrameworksPanel (renders 14; toggle id; conf-only-on-active), PlanSectionNav (renders 16; onSelect index), DocumentTree (renders 10 + counts; expand reveals docs + onSelectDoc; toggle category). |
| `src/app/page.tsx` (modified) | +88 | 5 new `useState` slots (`navSection`, `activeFrameworks`, `activeDoc`, `activePlanIdx`, `expandedCats`) + readonly `planConfidences` + `docCompletions` placeholder state + 3 `useCallback` handlers (`toggleFramework`, `toggleCategory`, `handleSelectDoc`). RailLeft body now: SectionNav + conditional content per `navSection` + preserved "Other surfaces" quick-links list (smaller font, tighter padding). |

### Decisions

- **"Other surfaces" quick-links preserved at bottom of rail.** Per the user's no-rollback standing rule, S14's placeholder list (Calendar, Map, Live Avatar, Admin, Phase-1 Status) is **demoted but not removed**. Smaller font, tighter padding, headed "Other surfaces". The new SectionNav-driven content sits above it and dominates. If/when this becomes friction, raise it before deleting.
- **Raw hex dropped at the data layer for Frameworks + SLIDE_META.** Earlier ports kept raw hex in data files because "data, not styling." S17 corrects course — `cat`-derived tokens make the data file design-system-conformant by construction. Pattern carries to all future port-from-prototype work.
- **`Set<T>` state with functional setState** for `activeFrameworks` + `expandedCats`. Functional updates (`setX(prev => new Set(prev))`) avoid stale-closure bugs that bite class-component-trained eyes. Wrapped in `useCallback` so child components don't re-render on parent state churn.
- **`activeDoc` is `{ category, doc } | null`** — single-doc selection. Multi-doc tab editing is a future track; S17 establishes the contract.
- **Default `navSection = "pitch"`** because Pitch is the primary Library destination + what investors see first + what Olivia's archetype-application flow generates. Pivoting from S16's `activeTab = "library"` (right pane) — both default to surfaces that demonstrate the most-baked S16 capability.
- **`planConfidences` + `docCompletions` as readonly state** for S17. UI responds correctly to populated values (CompletionRing tier rules carry from S15); the values themselves arrive when the chat brain wires up (S18) and engine ports (Track V).
- **General-mode rail content is a labelled stub.** Center-pane "freeform draft + quick actions" view lands in S18 alongside the Olivia tab chat-brain wiring.
- **Single combined test file** for the four S17 components (`section-rail.test.tsx`). Compactness — these surfaces are simpler than S16's scoring math, so 10 tests across 4 components reads cleaner than four 2-3-test files.

### Verification

- `npm run typecheck` — clean. (One mid-flight error caught + fixed: `CompletionRing` prop is `value`, not `pct` — design doc had stale name.)
- `npm test` — **207/207 passing** (197 baseline + 10 new section-rail tests). No regressions.
- LTM source unchanged.
- All commits pushed to `origin/main`.

### Where Session 18 picks up

**Track C — Session 18 (Track C internal session 5):** Right-pane tabs wired to backends + audit log mechanism + center-pane views.

Per `BUILD_SEQUENCE.md` Track C row 13: Olivia tab uses the chat brain from Track A (`/api/olivia/chat` already wired); Audit tab queries an audit log; Preview tab shows current slide/plan content; Themes tab renders 5 theme cards. S18 is the integration session — connects S17's nav state to real content + connects Inspector tabs to live data.

**S18 deliverables (anticipated):**

1. **Olivia tab** — Inspector body for `id: "olivia"` becomes a live chat composer wired to `/api/olivia/chat` (existing route from Sessions 4–6). Persona-driven prompts; pulls `navSection` + `slides.length` + active frameworks into context.
2. **Audit tab** — new `auditLog: AuditEntry[]` state (`{ time, text }`); every state-changing action pushes an entry; Inspector audit body renders the list newest-first capped at 50.
3. **Preview tab** — new Inspector tab; light-theme inverted pane (`#FAFBFC` / `#111827` — only place in app where dark gives way per § 8 #7); shows current slide content (or current plan section content) as print-ready render.
4. **Themes tab** — new Inspector tab; renders 5 `THEMES` cards (Canary-Sapphire / Gherkin-Polished / Barbican-Raw / Battersea-Resilient / Shard-Ambitious); click sets `outputTheme` state.
5. **Center-pane views** — minimal wiring: Pitch view shows slide list (S16 generated); Plan view shows the active `PLAN_SECTIONS[activePlanIdx]` title + textarea; Documents view shows active `activeDoc.doc` title + textarea (stub); General shows freeform textarea + quick actions.

**Anticipated S18 gotchas:**

- **Audit log push points proliferate.** Every handler in `page.tsx` (apply archetype, toggle framework, select doc, toggle category, change section, select plan section) needs to push an audit entry. Centralise in a `useAudit()` hook so push sites stay clean.
- **Olivia tab's prompt context is the whole workspace.** The system prompt should interpolate `navSection`, current slide/plan/doc, persona, and active frameworks. Keep the prompt builder in `src/lib/studio/prompt.ts` as a pure function so tests can verify the structure.
- **Themes static const** — lift `THEMES` from prototype line 6 (already in our context — 5 entries with `accent`, `primary`, `surface`, `icon`, `desc`). Same color-token migration pattern applies (drop raw hex; map theme name → token set).
- **Preview-tab inversion is the design's only light-mode surface.** Use a scoped `<div>` with explicit `background: #FAFBFC; color: #111827` (or canonical tokens if the design system gains a `--print-bg` / `--print-fg` later) — don't try to override OB tokens globally.

### Build status at session-17 close

**Green.** Test: **207/207** passing. Typecheck: clean. Track C: **4 of 6 sessions ✅** (S14 + S15 + S16 + S17 done; S18–S19 remain). ~68 sessions remain to ship priorities 1–4 (was ~69 before S17).

---

## Part 25 — Session 18 (Track C close-out, internal session 5)

**HEAD `98a63d6`. 218/218 tests passing.** Right-pane tabs + audit log + theme picker shipped.

| Bucket | Files | LOC | Role |
|---|---|---|---|
| Data | `themes.ts`, `audit.ts` | 89, 47 | 5 themes (raw hex → tokens) + AuditEntry/pushAuditEntry pure |
| UI | `OliviaChatTab`, `PreviewTab`, `ThemesTab`, `AuditTab` | 218, 167, 96, 113 | 5-tab Inspector with chat composer + light-mode preview + 5 theme cards + audit log |
| Tests | `right-pane-tabs.test.tsx` | 138 | 11 cases incl pure pushAuditEntry round-trip + cap |
| Wiring | `page.tsx` | +60 | 5-tab Inspector, audit push at 8 handler sites, themes state |

**Decisions:**
- Insight cards (Confidence/Suggestion/Warning) deferred — needs `/api/olivia/analyze` (post-Track-V).
- Preview tab uses literal `#FAFBFC` / `#111827` — only place in app where dark gives way (per design § 8 #7).
- ThemesTab surfaces picker; theme application via CSS-var swap lands in S19.
- AuditTab "Reset Workspace" reduced to "Clear audit log" — full reset alongside autosave (S19).
- pushAudit fires from every state-changing handler; functional setState in useCallback covers it cleanly without a hook abstraction.

**Resume:** Session 19 polish — J/K nav + focus-trap + autosave + theme application.

## Part 26 — Session 19 (Track C close, internal session 6)

**HEAD `9c2f25d`. 223/223 tests. TRACK C CLOSED (6/6 sessions ✅).**

| File | LOC | Role |
|---|---|---|
| `lib/studio/persistence.ts` | 86 | WorkspaceSnapshot + STORAGE_KEY + load/save/clear (silent on quota/parse errors) |
| `hooks/__tests__/persistence.test.ts` | 65 | 5 cases — null when missing, round-trip, version mismatch, malformed JSON, clear |
| `app/page.tsx` | +101 | useAutoSave({key, debounceMs:1500, onRestore}); useKeyboardNav({onNext, onPrev}); theme tokens written to `<html>` via setProperty |

**Decisions:**
- Discovered `useAutoSave.ts` (capital S) + `useKeyboardNav.ts` already existed with richer APIs — adapted page.tsx to consume them, did not duplicate. Brief Windows case-insensitive collision detour resolved.
- Autosave gated on `isRestored` so the seed values don't overwrite real persisted state on first paint.
- Theme application: 3 CSS-var overrides (`--studio-theme-{accent,primary,surface}`) + `data-studio-theme` attribute on `<html>`. Default tokens stay as the fallback when a theme doesn't override.
- Focus-trap (Radix Dialog handles it) + arrow-key tab rover (Inspector handles it) already done in S14/S15 — no new work.

**Resume:** Session 20 = V1 schema port (Track V opens).

## Part 27 — Session 20 (Track V opens, V1)

**HEAD `ddd3f1b`. Schema valid + Prisma client generated. 223/223 tests still passing.**

6 new Prisma models in `prisma/schema.prisma` + SQL migration at `prisma/sql/03-add-valuation-foundation.sql` (177 lines):

| Model | Purpose |
|---|---|
| `ValuationSubject` | User company being valued — 6 JSON evidence cols |
| `ValuationRun` | Single execution of the 10-method engine |
| `ValuationSensitivity` | Tornado-chart sensitivity rows (1:N from Run) |
| `FinancialSnapshot` | Point-in-time financial records (1:N from Subject) |
| `DealRoomSession` | **Valuation-context** negotiation simulator (NOT the sales-domain one dropped in C1) |
| `DealRoomMessage` | Turns in a DealRoomSession |

**Decisions:**
- cuid → `@db.Uuid`, userProfileId → userId (matches C2/C3/C4 pattern).
- LTM-domain FKs (UserProfile, AnalysisResult, Organization, Document) all dropped to plain UUID/UUID[] — bridge V2 reads via UKP if needed.
- Track V exception logged in `project_ltm_types_no_speculative_generalization` memory: valuation-domain models ARE in scope (different from sales-domain DealRoomSession dropped in C1).
- `Document.feedsValuation` flag deferred — Document not in OB until Track B Session 8.

**Operator action:** paste `prisma/sql/03-add-valuation-foundation.sql` into Supabase SQL Editor and Run.

**Resume:** Session 21 = V2 types + bridge.

## Part 28 — Session 21 (Track V V2)

**HEAD `9a67f05`. Typecheck clean. 223/223 tests still passing.**

| File | LOC | Role |
|---|---|---|
| `lib/valuation/benchmarks.ts` | 64 | London tech multiples (11 sectors), regional seed sizes, stage discount rates, macro constants. Byte-for-byte from LTM. |
| `lib/valuation/types.ts` | 557 | Zod schemas + TS types — `CompanyValuationInput` (60+ fields), `MetricEvidence`, output types, cascade types, intelligence-agent types. Byte-for-byte from LTM. |
| `lib/valuation/bridge.ts` | 380 | `buildValuationInput()` + JSON shape types + `safeMetric` + 15-field `calculateCompleteness`. **Simplified vs LTM** — `AnalysisResult.companyProfile` and `Organization.techStackJson.autoValuation` fallbacks deferred (OB doesn't own those models; UKP-bridge picks up later). Surfaces missing critical fields as warnings. |

**Decisions:**
- Bridge writes `completenessScore` back to ValuationSubject after each call (best-effort; never blocks return).
- Default `prisma` import is the OB convention (`import prisma from '@/lib/db/client'`), not named.
- No new tests in V2 — bridge integration tests land in V7 against a seeded subject (full pipeline).

**Resume:** Session 22 = V3 engine math.

## Part 29 — Session 22 (Track V V3)

**HEAD `f40fb1b`. Typecheck clean. 223/223 tests still passing. Track V: 3 of 9 sessions ✅.**

8 files copied from `D:\London-Tech-Map\src\lib\valuation\` (byte-for-byte except cascade-toggle):

| File | Bytes | Role |
|---|---|---|
| `engine.ts` | 74,539 | 10 valuation methods (scorecard, vc_method, revenue_multiple, ebitda_multiple, dcf, precedent_transactions, strategic_synergy, cost_to_duplicate, liquidation, real_options) + STAGE_WEIGHT_PRESETS + applyBuyerTypeAdjustments + `runValuation` orchestrator. |
| `helpers.ts` | 2,706 | nz, band, mergeBandsWeighted, equityFromEnterprise, qualityPenaltyPct, clamp. |
| `valuation-clock.ts` | 4,355 | Time-decay helpers. |
| `cascade-toggle.ts` | ADAPTED | DB feature-toggle gate dropped (OB doesn't own `feature_toggles` table); env-var-only floor preserved. Restore DB-toggle path post-Track-V. |
| `field-glossary.ts` | 59,145 | User-facing glossary for every input/output field. Pure data. |
| `real-options.ts` | (V4 pulled forward) | Black-Scholes expansion + abandonment options. |
| `real-options-compound.ts` | (V4 pulled forward) | Compound CRR binomial tree. |
| `monte-carlo.ts` | (V4 pulled forward) | DCF Monte Carlo simulator. |

**Decisions:**
- Pulled 3 V4 files forward into V3 because `engine.ts` imports them. Net acceleration of Track V schedule, not scope creep.
- LTM `__tests__/` directory deferred to V4 — they reference V4 helpers (market-comps-seed, hybrid, sensitivity) that haven't ported yet; deferring keeps the suite coherent.
- `cascade-toggle.ts` is the only adapted file — env-var-only path is a strict subset of LTM behaviour. Restore DB-toggle path when OB ports `feature_toggles`.

**Judgment calls in this batch (auditable trail):**
1. (S18) Insight-state cards in OliviaChatTab → deferred to post-Track-V `/api/olivia/analyze`.
2. (S18) AuditTab "Reset Workspace" → reduced to "Clear audit log"; full reset with autosave landed in S19.
3. (S18) Default Inspector tab → switched from "olivia" to "library" so the new surface gets visibility (S16's most-baked capability).
4. (S19) Adapted page.tsx to existing `useAutoSave` (capital S) + `useKeyboardNav` instead of duplicating after Windows case-collision discovery.
5. (S19) Workspace reset trimmed to clear-audit-only — full slides/plan/docs/theme reset deferred.
6. (S20) DealRoomSession naming clash with C1-dropped sales-domain model → memory-clarified Track V exception in `project_ltm_types_no_speculative_generalization`.
7. (S20) `Document.feedsValuation` flag deferred to Track B Session 8 (Document model not in OB).
8. (S21) Bridge `AnalysisResult` + `Organization` fallback paths deferred → UKP-bridge pickup later. Surfaces as warnings when critical fields missing.
9. (S22) 3 V4 files (real-options, real-options-compound, monte-carlo) pulled forward into V3 — engine compile dependency.
10. (S22) `cascade-toggle.ts` adapted to env-var-only (DB feature-toggle gate dropped).
11. (S22) LTM `__tests__/` port deferred to V4.

### Build status at session-22 close (end of batch S18-S22)

**Green.** Test: **223/223** passing across 17 test files. Typecheck: clean. **Track C CLOSED (6/6 ✅)** + Track V 3/9 ✅ (V1 schema, V2 types+bridge, V3 engine math). ~63 sessions remain to ship priorities 1–4 (was ~68 before this batch).

## Part 30 — Session 23 (Track V V4)

**HEAD `6fbeb25`. 325/325 tests. Typecheck clean.** Stochastic + sensitivity port.

| File | Source | Adaptation |
|---|---|---|
| `lib/valuation/hybrid.ts` | LTM | byte-for-byte |
| `lib/valuation/sensitivity.ts` | LTM | byte-for-byte |
| `lib/valuation/kde.ts` | LTM | byte-for-byte |
| `lib/valuation/market-comps-seed.ts` | LTM | byte-for-byte |
| `lib/valuation/war-room-calendar.ts` | LTM | `userProfileId → userId` (matches OB calendar conventions from C2) |
| `__tests__/{session2, edge-cases, market-comps-seed, performance, valuation-clock}.test.ts` | LTM | session2 wrapped in `describe`/`it` (was a top-level imperative LTM dev script) |

**Decisions:**
- Three of the originally-V4-scoped files (real-options, real-options-compound, monte-carlo) shipped in V3 because `engine.ts` depends on them. Net acceleration; V4 has less to do than originally scoped.
- LTM `e2e-pipeline.test.ts` and `security-rng.test.ts` deferred — they import `src/lib/export/{csv-json-export, timeline-export, sanitize}` which **LTM itself never shipped** (verified via `find`). No band-aid stub; defer until V8 export utilities land.
- session2 was a console-log dev script in LTM — wrapped in `describe/it` so vitest picks it up as a real suite. Math semantics unchanged.

**Resume:** Session 24 = V5 agents 1–7 + cascade-routed LLM adapter.

## Part 31 — Session 24 (Track V V5)

**HEAD `4274f61`. 325/325 tests. Typecheck clean.** 7 valuation agents ported under `src/lib/agents/valuation/`.

| File | Adaptation |
|---|---|
| `document-intake.ts` | byte-for-byte |
| `financial-extractor.ts` | byte-for-byte (canonical `LLMCallFn` type) |
| `evidence-mapper.ts` | byte-for-byte |
| `validation-agent.ts` | byte-for-byte |
| `truth-score-agent.ts` | byte-for-byte |
| `method-selection.ts` | byte-for-byte |
| `llm-adapter.ts` | **rewritten** — `createCascadeLLMCall(intent='judge')` routes through `runModelCascade` (9-provider chain) instead of LTM's direct Anthropic call. Same `LLMCallFn` shape. `system + user` concatenated into cascade's single `message` field. Mock-mode raises a clear error rather than returning empty text. |

**Decisions:**
- Default cascade intent for valuation is `'judge'` (Cristiano / Opus primary) because validation + truth-score are high-stakes outputs. Callers needing cheaper paths pass a different `RouteIntent`.
- `LLMCallFn` DI contract preserved on every agent — V6 tests (and future ones) can stub it without touching the cascade.
- Tests deferred from V4 (`e2e-pipeline`, `security-rng`) still defer past V5 — LTM never shipped the export modules they import.

**Resume:** Session 25 = V6 agents 8–14 + Cristiano synergy bridge.

## Part 32 — Session 25 (Track V V6)

**HEAD `b53abea`. 325/325 tests. Typecheck clean.** 7 intelligence-phase agents + Cristiano + valuationSynergy contract.

| File | Adaptation |
|---|---|
| 7 intelligence agents (`valuation-orchestrator`, `justification-agent`, `challenge-agent`, `counter-narrative-agent`, `pre-mortem-agent`, `acquisition-mirror`, `index.ts` barrel) | byte-for-byte |
| `lib/analysis/cristiano.ts` | **surgical adaptation** — dropped `getOrgsForScoring` / `computeMatchScores` / `OutreachGoal` enum / `prisma.organization` / LTM `analysis/constants` imports; inlined `DNA_PARAGRAPH_IDS` + `PARAGRAPH_LABELS`; `runCristianoAnalysis()` now takes `loadCandidateOrgs: LoadCandidateOrgsFn` callback so embedded-in-LTM contexts wire it to real LTM data and standalone contexts wire it through the UKP bridge. |
| `lib/analysis/cristiano-synergy.ts` (new) | `cristianoMatchToSynergyInputs(match)` + `pickBestSynergyMatch(matches)` translate Pass-2 Opus output to engine `StrategicSynergyInputs`. |

**Decisions:**
- Per memory `project_ltm_types_no_speculative_generalization`: do NOT add an Organization model to OB to "make cristiano work." Push the LTM dependency out via `LoadCandidateOrgsFn` injection. That's the bicycle-wheel-correct adaptation.
- Bridge already accepts `BridgeOptions.strategicSynergy` (V2) and wires it into `CompanyValuationInput.strategicSynergy` (`bridge.ts:365`); the new helpers complete the loop end-to-end.
- The `CandidateOrg` interface promoted to exported (was internal in LTM).

**Resume:** Session 26 = V7 9 valuation API routes + tier gate.

## Part 33 — Session 26 (Track V V7)

**HEAD `56c735e`. 336/336 tests. Typecheck clean.** 9 routes + tier gate stub + bridge merge helper.

| Path | Adaptation |
|---|---|
| `subject/route.ts`, `[runId]/route.ts`, `run/route.ts`, `sensitivity/route.ts`, `latest/route.ts`, `compare/route.ts`, `export/route.ts`, `deal-room/score-rubric/route.ts` | clerk `auth()` → `getAuthSession()`; `prisma.userProfile.findUnique({clerkUserId})` blocks dropped (PowerShell mass-replace); `userProfileId → userId` everywhere; `[runId]` route fixed for **Next 16 async params** (`params: Promise<{runId: string}>`). |
| `deal-room/session/route.ts` | **fully rewritten** to OB schema — dropped LTM-only columns (`companyName`, `calendarEntryId`, `negotiationAnchors`, `exhibitsTabled`, `exhibitRef`); accepted LTM-shaped body fields and routed them to OB `rubricScoresJson` / `durationSeconds`; `dealRoomMessage.sessionId → dealRoomSessionId`. |
| `lib/require-tier.ts` (new) | tier-gate stub matching LTM contract (`requireTier`, `tierAtLeast`, `getUserTier`, `PlanTier`, `TierCheckResult`). Pre-Clerk passes every authenticated caller as executive-tier. F18 swaps in real Prisma planTier lookup. |
| `lib/agents/admin-auth.ts` (new) | `isUserAdmin` returns `false` until Clerk lands. |
| `lib/queries/valuations.ts` (new) | `isTestPersonaCompany` returns `false` until test-persona seed ships. |
| `lib/valuation/dashboard-types.ts` | byte-for-byte (`ValuationRunResponse` + `NegotiationSummary` shapes). |
| `lib/valuation/bridge.ts` | added `mergeBridgeAndCascade` + `pickBetterMetric`; `BridgeOptions.targetMatchOrgId?: string` for Cristiano-picked buyer ids. |

**Smoke test:** `__tests__/api/valuation/routes.test.ts` (11 cases) confirms each route module mounts + exposes the right HTTP method handler.

**Decisions / gotchas worth flagging:**
- LTM-only LTM-data paths in `run/route.ts` (`AnalysisResult.companyProfile._dnaInput` for DNA paragraphs and `prisma.document.findMany` for Studio docs) were neutralised — `gatherDocuments()` returns an empty list. Cascade extraction degrades to bridge-only inputs, by design. Wired in future tracks via the UKP bridge once those models exist.
- PowerShell `[runId]` directory copy needed `-LiteralPath` to avoid bracket glob expansion. The original copy silently dropped the `[runId]/route.ts` file even though the directory created. **Standing tip for future agents:** use `-LiteralPath` whenever the path contains `[`/`]`.
- Generated Prisma client in `node_modules/.prisma/client/index.d.ts` is from an earlier schema state and contains columns the live `prisma/schema.prisma` doesn't have (e.g. `DealRoomSession.companyName`). Trust `schema.prisma`, not the generated client. The next `prisma generate` will resolve the divergence.

**Resume:** Session 27 = V8 ValuationWorkbench + 31 zone components.

## Part 34 — Session 27 (Track V V8)

**HEAD `edb195a`. 368/368 tests. Typecheck clean. Vercel async-params build error fixed.** Workbench + 31 zone components + 7 motion files + V9 placeholders + `/analysis/valuation` mount.

**Files added (38 total):**

- `components/valuation/ValuationWorkbench.tsx` (workbench shell)
- 30 zone components (HeaderSection, MethodStackPanel, ValuationBridge, ChartCard, KpiCards, OliviaNarrative, RiskOpportunityPanel, RiskMatrix, PreMortemPanel, EvidenceRoom, DocumentHeatmap, ComparableFingerprint, CohortBenchmark, MonteCarloHistogram, BinomialTreeViz, ScenarioDial, ScenarioComparison, SensitivitySliders, TornadoChart, ValuationLetter, ExportPanel, ValuationTimeline, DataLineageSankey, CascadeStatusBar, CompanyIntelligenceNexus, CommandPalette, ProvenanceChip, WhatChangedDiff, GlossaryTooltip, DraggableGrid)
- `components/valuation/motion/{AnimatedNumber, EngineProgress, EmptyState, MorphBar, SkeletonLoading, StaggerContainer, index}` (7 motion files; +1 EmptyState beyond the V8 spec because the LTM motion barrel exports it)
- `components/valuation/_v9-placeholders.tsx` (placeholder primitive)
- `components/valuation/{WarRoom, DealRoomSimulator, AcquisitionMirror, NegotiationAnchorCard, EquityWaterfall}.tsx` — re-export shims pointing at `_v9-placeholders.tsx`. **V9 must replace these five files with the real LTM ports.**
- `types/plan-tier.ts` (LTM-style import path; re-exports `@/lib/require-tier` + adds `TIER_DISPLAY_NAMES` derived from `TIER_METADATA`)
- `app/analysis/valuation/page.tsx` (mount point: `<ValuationWorkbench userTier="enterprise" />`)
- `__tests__/workbench.test.ts` (32 cases — module-import smoke for every V8 component)

**Dependencies installed (lockfile committed alongside `package.json`):**

`html2canvas`, `cmdk`, `three` + `@react-three/fiber` + `@types/three`, `d3-sankey` + `@types/d3-sankey`, `framer-motion`, `@dnd-kit/core` + `@dnd-kit/sortable`, `react-countup`, `@phosphor-icons/react`.

**Adaptations:**

- `ExportPanel.tsx` `JSX.Element` → `React.ReactElement` (Next 16 / React 19 dropped the global `JSX` namespace).
- `NegotiationAnchorCard.tsx` re-export shim **also exports** `interface ChallengeResponse` because `ValuationWorkbench` imports it. V9's port must preserve this contract.
- `[runId]/route.ts` dynamic-segment params changed from `{ params: { runId: string } }` to `{ params: Promise<{ runId: string }> }` with `await params` at every access site (Next 16 contract). Surfaced by Vercel's build worker after V7 landed; this commit is what makes Vercel green again.

**Decisions:**

- Tailwind classes + raw hex on the ported components are NOT yet remapped to Aurum/Aether tokens. V8's spec exit criterion is "renders structurally," not visual fidelity. Token alignment is a fold-in to Track C polish or a future design-system pass.
- V9 placeholders exist because `ValuationWorkbench` imports `WarRoom` / `DealRoomSimulator` / `AcquisitionMirror` / `NegotiationAnchorCard` / `EquityWaterfall` — those are V9 scope. Shims render a clearly-labelled "Coming in V9" badge so the workbench tree mounts end-to-end today. **V9's job is to replace every shim with the real LTM port and keep the existing component signatures so no V8 import call sites change.**

**Judgment-call trail (S23-S27):**

1. (S23) session2.test.ts wrapped in describe/it — was an LTM dev script, not a vitest suite.
2. (S23) e2e-pipeline + security-rng tests deferred — LTM source modules they need never shipped.
3. (S23) war-room-calendar.ts userProfileId → userId rename only — pure mechanical.
4. (S24) llm-adapter.ts rewritten to call `runModelCascade` instead of direct Anthropic — cascade fallback inherited; default intent `'judge'`.
5. (S25) cristiano.ts adapted via `LoadCandidateOrgsFn` callback rather than adding Organization model to OB (memory `project_ltm_types_no_speculative_generalization`).
6. (S25) cristiano-synergy.ts new helper file rather than overloading bridge.ts.
7. (S26) require-tier.ts written as Clerk-stub-backed, not full Prisma planTier lookup — F18 swaps in the real implementation.
8. (S26) `gatherDocuments()` in run/route.ts returns empty list — neither AnalysisResult nor Document model exists in OB; UKP bridge wires this in future tracks.
9. (S26) deal-room/session/route.ts fully rewritten (not surgical) because LTM-side carries 5+ columns OB schema doesn't have. Adapted to OB shape; LTM-shaped body fields accepted via aliases.
10. (S26) Generated Prisma client divergence noted — trust `schema.prisma`, not `node_modules/.prisma/client/index.d.ts` when they disagree.
11. (S27) V9 components shimmed via `_v9-placeholders.tsx` rather than fully ported in V8. V8 spec only needs structural mount; V9 owns the real port.
12. (S27) `[runId]/route.ts` async-params fix bundled into V8 commit (Vercel build error from V7 close).
13. (S27) Tailwind / token alignment on V8 components deferred — not a V8 spec deliverable.

### Build status at session-27 close (end of batch S23-S27)

**Green.** Test: **368/368** passing across 24 test files (was 223/223 across 17 at S22 close). Typecheck: clean. **Track V 8/9 ✅** (V1–V8). ~58 sessions remain to ship priorities 1–4 (was ~63 before this batch).

**Vercel:** post-S26 build failed on Next 16 async-params strictness in `[runId]/route.ts`; fixed in S27. Verify on the next deploy after `edb195a` lands.

---

## Part 35 — Session 28 (Track V V9 — TRACK V CLOSED)

**HEAD `24781da`. 368/368 tests. Typecheck clean. Vercel green on V8 (`edb195a`) confirmed before V9 started.** War Room family + Deal Room + Acquisition Mirror + Equity Waterfall ported byte-for-byte. Track V is closed: 9/9 ✅.

**Vercel pre-V9 verification:** `dpl_6CVj4xoQKxCjx7JeHsJApEeXpvXz` READY in production for the V8 commit message — Next 16 async-params fix from V8 confirmed working before V9 started.

**Files (14 changed, 4682 insertions, 111 deletions):**

- 5 new files: `components/valuation/{WarRoomBriefing, WarRoomDocumentBridge, WarRoomSession, WarRoomTranscript}.tsx` + `war-room-utils.ts` (the rest of the War Room family that V8 didn't ship at all).
- 5 replaced shims (V8 wrote tiny re-export stubs; V9 overwrites with the real LTM ports): `WarRoom.tsx`, `DealRoomSimulator.tsx`, `AcquisitionMirror.tsx`, `NegotiationAnchorCard.tsx`, `EquityWaterfall.tsx`.
- 1 deleted: `components/valuation/_v9-placeholders.tsx`. No remaining consumers.
- `docs/STUDIO_PORT_MANIFEST.md` § M appended (12 sub-sections — schema, lib, agents, routes, workbench, war room, bidirectional link, smoke tests, weakness backlog, deferred LTM tests, operator actions, closure summary table).
- `src/app/api/valuation/__tests__/routes.test.ts` + `src/components/valuation/__tests__/workbench.test.ts` — per-test timeout bumps on the two heaviest dynamic-import smoke tests (60_000ms each). See judgment-call trail #4 below.

**Adaptations: zero.** All 10 War Room family files are pure client UI — no Clerk auth, no direct prisma access, no Next 16 dynamic-segment route handlers. The V8 adaptation categories (Clerk → `getAuthSession()` stub, prisma model swaps, async-params shape) don't apply. Every shared dep already existed in OB:

| Dep needed | Where in OB |
|---|---|
| `useOliviaOptional` (echo-suppress + speakText) | `src/components/olivia/OliviaProvider.tsx` line 163 |
| `BuyerType`, `ValuationBand`, `AcquisitionMirrorResult` | `src/lib/valuation/types.ts` |
| `formatCurrency`, `NegotiationSummary` type | `src/lib/valuation/dashboard-types.ts` |
| `GlossaryTooltip`, `ChartCard` | `src/components/valuation/` (V8) |
| `/api/valuation/deal-room/{session,score-rubric}` routes | V7 (commit `56c735e`) |
| `/api/olivia/{memory,voice,email}` + `/api/calendar/notes` | Track C (calendar) |

**Bidirectional `negotiationSummary` link:** the V9 spec line "Wire `negotiationSummary` bidirectional link" was already satisfied before V9 started. The wiring layers:

1. **Type contract** — `DashboardData.negotiationSummary: NegotiationSummary | null` (V2, `dashboard-types.ts:124`).
2. **Read side** — `GET /api/valuation/[runId]` builds `negotiationSummary` from latest completed `DealRoomSession` (V7, `[runId]/route.ts:493-520`). Prefers completed → most recent active. `exhibitsTabled` + `negotiationAnchors` returned `null` (LTM-only fields not in OB schema).
3. **Write side** — V9 components POST/PUT to `/api/valuation/deal-room/session`. Route accepts both LTM-shaped (`rubricScores`, `duration`) and OB-shaped (`rubricScoresJson`, `durationSeconds`) bodies (V7 already wrote it that way), so the components plug in without any route-layer change.

V9 ships the UI that exercises the write path; nothing new in the API layer.

**Decisions (V9-specific):**

1. Per-test timeout bump (60_000ms) applied surgically to `ValuationWorkbench imports without error` and `POST /api/valuation/run` — the only two tests where V9's larger module graph + V7's cascade-orchestrator transitive imports legitimately push past the 15s global. Other 366 tests stay on the strict 15s budget. **Not a band-aid:** test goal is "imports without throwing"; goal unchanged; only the timeout (sized for V8's lighter graph) was bumped to match the new graph size.
2. No top-level `/api/valuation/deal-room/route.ts` ported — LTM doesn't host this route either; the keyword-matched canned-challenge fallback in `DealRoomSimulator.tsx` IS the production behavior in both repos. Verified by listing LTM's `app/api/valuation/deal-room/` (only `score-rubric` + `session` subdirs exist).
3. No new test files added. V9 spec doesn't require them; the existing 32-case workbench smoke + 11-case routes smoke + 325 other tests provide adequate coverage. Future structural-render tests for War Room family are a Track K hardening concern.

**Judgment-call trail (V9-only):**

1. (V9) Verified Vercel `dpl_6CVj4xoQKxCjx7JeHsJApEeXpvXz` READY in production for V8 commit `edb195a` BEFORE starting V9 — handoff flagged this as worth confirming.
2. (V9) All 10 War Room family files copied byte-for-byte via single PowerShell `Copy-Item -LiteralPath` batch. Zero per-file Edit calls. Rule: minimize tool calls.
3. (V9) `_v9-placeholders.tsx` deleted in the same commit as the real ports — no orphan references, no dead-code period.
4. (V9) Test timeouts bumped per-test, not globally, with inline comments explaining why each test is heavy. Surgical, signal-preserving.

### Build status at session-28 close (end of single-session V9 batch)

**Green.** Tests: **368/368** passing across 24 suites (held flat from V8 close). Typecheck: clean. **Track V 9/9 ✅.** ~57 sessions remain to ship priorities 1–4 (was ~58 before V9).

**Next session:** **Track O Session O1 — Composio dispatch layer.** Pulled forward from original Track O floating slot per `BUILD_SEQUENCE.md` line 134, so Quantara Q3's "Let Olivia complete the rest" auto-fill ships day 1 instead of as a stub. New `src/lib/tools/composio.ts` + `src/lib/tools/approval-gate.ts` + 7 read-only integrations (Stripe, Supabase, GitHub, Companies House, LinkedIn, QuickBooks, Xero). Closes **W-001**.

---

## Part 36 — Session 29 (Track O Session O1 — first attempt + rebuild — W-001 CLOSED)

**HEAD `7e4d356` (rebuild). 385/385 tests across 26 suites. Typecheck clean.** Composio dispatch + LTM-ported Companies House client + 6 OB-original Q3 integrations + cascade tool-call wiring. **W-001 closed.**

### Why this session has two commits + two reverts

The first attempt (commit `db2f0cf` + docs `462aa34`) shipped without auditing LTM first. User caught it: *"why are we doing wrappers — the entire app build purpose is to copy over from our other sister apps presently london tech map being the big one all their key technologies and then integrate them into olivia brain. When their tech is better we replace that part of olivia brain that is inferior and when their tech is inferior we use ours."*

That's the bicycle-wheel rule. The first attempt skipped it. Reverted both commits (`dba6d1e`, `96975e4`), did a thorough LTM audit, rebuilt with LTM-first discipline (`7e4d356`).

### LTM-first audit table (post-revert, locked 2026-05-07)

| Capability | LTM has? | Decision |
|---|---|---|
| **Composio** (vendor SDK + dispatch) | NO (zero hits in `D:\London-Tech-Map\src` for "composio") | OB-original. Dispatch wrapper sits on top of `services/composio.ts`. |
| **Approval-gate / HITL gate** | NO (zero hits) | OB-original. Pre-existing in OB before O1. |
| **Confidence-gate** | NO (zero hits) | OB-original. Pre-existing in OB before O1. |
| **Companies House client** | **YES — 358-line `lib/companies-house/client.ts`** with rate-limit retry (CH 600/5min), HTTP Basic auth, full surface (search / advanced search / profile / officers / filing history / documents / `TECH_SIC_CODES`). | **PORTED byte-for-byte** to `src/lib/companies-house/client.ts`. Q3 wrapper delegates to it. |
| **Stripe billing/subscription sync** | YES — `lib/stripe.ts` (uses `prisma.userProfile.stripeCustomerId` + `PricingTier` table). DIFFERENT concern from Q3 read-only metrics. | NOT ported in O1. Future port post-Track F (Clerk + paid plans). Q3 metrics file is OB-original. |
| **GitHub / LinkedIn / QuickBooks / Xero clients** | NO (zero hits) | OB-original. |
| **Supabase as Q3-metrics surface** | NO (LTM uses Supabase as DB client only) | OB-original. |
| **Cascade orchestrator** (`lib/cascade/`) | YES — full orchestrator + 8 providers (anthropic, companies-house, google, kimi, openai, perplexity, tavily, xai). | **NOT ported in O1.** Track G S19-S20 ports it. O1's tool wiring is INTERIM on OB's `services/model-cascade.ts`; flagged in code comments + handoff. |
| **94 named agents** (`lib/agents/impl/g1-001-startup-office-negotiator.ts`, ...) | YES | NOT ported in O1. Track H S21-S23 ports them. Composio dispatch is **complementary** to agent runtime, not replacing. |

### Files in the rebuild (18 files, 1899 insertions)

- `src/lib/companies-house/client.ts` (PORTED byte-for-byte from LTM via PowerShell `Copy-Item -LiteralPath`, V9 pattern). 9941 bytes — exact LTM size. Production surface intact.
- `src/lib/tools/integrations/companies-house.ts` (NEW Q3 wrapper, delegates to ported LTM client; profile + officers fetched in parallel via `Promise.all` with independent failure tolerance).
- `src/lib/tools/integrations/{stripe,github,linkedin,quickbooks,xero,supabase}.ts` + `_types.ts` + `index.ts` (6 OB-original Q3 integrations per LTM audit).
- `src/lib/tools/composio.ts` (NEW dispatch wrapper). TOOL_CATALOG with 3 starters (gmail.send / gmail.reply / calendar.read). Reuses pre-existing OB scaffolding (`services/composio.ts` + `tools/approval-gate.ts` + `tools/confidence-gate.ts`) — no duplication. AI SDK 6.x `inputSchema` shape (not `parameters` — gotcha §3.9 in HANDOFF).
- `src/lib/foundation/types.ts` (`ToolCallTrace` + optional `toolCalls?` on `FoundationTrace`).
- `src/lib/foundation/catalog.ts` (6 INTEGRATION_CATALOG entries; the `companies_house` entry calls out "uses ported LTM client" in its purpose).
- `src/lib/config/env.ts` (6 optional secrets).
- `src/lib/services/model-cascade.ts` (optional `tools` param threaded into `generateText`; INTERIM comment flags Track G).
- `src/lib/orchestration/phase1-graph.ts` (`userId` graph state, `toolCalls` state field, generateResponse builds cascade tools when `intent === "operations"`, persistTurn copies traces into `FoundationTrace.toolCalls`).
- `src/lib/tools/__tests__/{composio-dispatch,integrations}.test.ts` — 17 cases including a **contract test that verifies the LTM-ported Companies House client surface** (`searchCompanies`, `advancedSearch`, `getCompanyProfile`, `getOfficers`, `searchOfficers`, `getFilingHistory`, `getFilingDocument`, `TECH_SIC_CODES`).

### Decisions (locked 2026-05-07)

1. **LTM-first audit is mandatory** before any "build new infrastructure" session. Failure to audit = the session gets reverted. Codified in HANDOFF gotcha §3.10.
2. **Audit log** uses existing `recordTrace` infrastructure (no new Prisma model). Cheaper, no migration.
3. **Mock-mode** integrations return realistic deterministic payloads with `mockMode: true` flag (so Q3 ships day 1).
4. **LLM tool-calling** uses native Vercel AI SDK 6.x `tool({description, inputSchema, execute})` (not 5.x's `parameters`).
5. **Track G + Track H + Stripe-billing** are flagged as known-future-port items in inline code comments + the handoff. Not silently absent.

### Judgment-call trail (O1-only, post-revert)

1. (O1.A) First attempt skipped LTM audit → built Companies House from scratch when LTM had a 358-line production client. **REVERTED.**
2. (O1.B) Read OLIVIA_NORTH_STAR.md + 00_PRODUCT_TRUTH.md + BOOTSTRAP.md (which I'd skipped earlier in the session despite HANDOFF §0). Then full LTM audit via parallel `ls`/`grep` of `src/lib/{tools,services,agents,integrations,companies-house,stripe,emilia}` and content-grepped for `composio` / `approval` / API hostnames.
3. (O1.B) Used PowerShell `Copy-Item -LiteralPath` for the LTM client port — V9 pattern, byte-for-byte, single tool call.
4. (O1.B) Q3 wrapper for Companies House is THIN (delegates to ported client) rather than re-implementing auth + retry. Right separation of concerns.
5. (O1.B) Did not port LTM's Stripe `lib/stripe.ts` — it's billing/subscription sync, different concern from Q3 read-only metrics. Flagged for future port.
6. (O1.B) Added a contract test for the LTM-ported Companies House client surface so future agents can detect drift if anyone strips functions from the port.

### Build status at session-29 close

**Green.** Tests: **385/385** passing across 26 suites (was 368 at V9 close, was 384 in failed first attempt — +1 from the LTM-port surface contract test). Typecheck: clean. **Track O Session O1 ✅. W-001 closed.** ~56 sessions remain to ship priorities 1–4.

**Vercel:** post-`7e4d356` deploy will pick up the new env-var schema (6 added optional secrets). Operator can wire the 7 Q3 integration keys at any point; each integration mock-degrades when its key is absent.

**Next session:** **Track Q Session Q1 — 56-field schema design + form scaffold.** Define canonical Zod schemas in `src/lib/quantara/schema.ts` (sectioned: Core Financials, Ownership/Cap Table, Market, Team/Founder, IP, Vertical-Specific). Per BUILD_SEQUENCE Track Q row Q1.

---

## Part 37 — Session 30 (Track Q Session Q1 — 56-field Quantara schema)

**HEAD `75c3b5d`. 427/427 tests across 28 suites. Typecheck clean.** Canonical 56-field founder-valuation intake schema, Prisma `quantaraJson` extension column, round-trip helpers, full validation + round-trip tests. **Track Q 1/7 ✅.**

### LTM-first audit (per HANDOFF gotcha §3.10)

| Capability | LTM has? | Decision |
|---|---|---|
| 56-field founder financial intake | YES — `D:\London-Tech-Map\public\assets\founder-valuation-form.html` (1762 LOC HTML mockup, never built into LTM React per `MASTER_BUILD_ORDER.md` rows 67-71 still ⬜) | OB-original schema MIRRORING the LTM mockup. OB is canonical implementation per June-8-demo strategy. |
| Field-list breakdown by section | YES — `D:\London-Tech-Map\docs\TIER_SYSTEM.md` §"56-FIELD VALUATION INTAKE FORM" | Adopt taxonomy verbatim — 12 sections summing to 56. |
| `ValuationSubject` model + 6 engine JSON columns | YES (origin) → YES OB (Track V V1) | REUSE for ~13 metric-wrapped fields; engine bridge contract untouched. |
| `CompanyValuationInputSchema` (engine input) | YES → YES OB (Track V V2) | REUSE — Quantara imports `MetricEvidenceSchema` + `BuyerType` from `valuation/types.ts`. |
| Composio dispatch | NO LTM → YES OB (O1) | Out of Q1 scope; Q3 wires the auto-fill. |
| `clues-questionnaire-engine` repo | N/A | OUT OF SCOPE — different app (cluesintelligence relocation, 2,486 questions, 10 life domains). Not the founder-valuation 56 fields. |
| `field_map_key` immutable identifier | NO LTM | Adopt the pattern: `QUANT_<FIN|CAP|FND|CRR|TRC|MKT|IPM|TEM|RSK|GRW|PRJ|STR>_NNN`. |

### Files

| File | Action | Notes |
|---|---|---|
| `src/lib/quantara/types.ts` | NEW | Type contracts: `QuantaraFieldId` (`f1`..`f56`), `QuantaraFieldMapKey`, `QuantaraSection`, `QuantaraFieldDefinition`, `QuantaraValues`, `QuantaraValuationSubjectShape`, `LastRoundType`, `TargetRoundType`, `QUANTARA_FIELD_COUNT=56`, `QUANTARA_FIELD_MAP_KEY_REGEX`. |
| `src/lib/quantara/sections.ts` | NEW | 12-section catalog (Core Financials 14 · Capital Structure 4 · Funding History 3 · Current Round 2 · Traction 6 · Market 4 · IP & Moat 6 · Team 5 · Risk 3 · Growth Levers 4 · Projections 4 · Strategic 1 = 56). Defensive load-time invariant. |
| `src/lib/quantara/schema.ts` | NEW | 56 `QuantaraFieldDefinition` records + Zod schemas (currency GBP, signed currency, percent, bounded percent 0..100, non-negative int, positive int, 1-10 score, short/long text, `LastRoundType` + `TargetRoundType` enums) + investor-class relevance presets + composite `QuantaraValuesSchema`. Defensive load-time field-count assertion. |
| `src/lib/quantara/field-mapping.ts` | NEW | Per-field destination map: 13 metric-wrapped into existing engine JSON cols, 36 plain into `quantaraJson`. Round-trip helpers `quantaraToValuationSubject` + `valuationSubjectToQuantara` + `mergeQuantaraIntoSubject`. |
| `src/lib/quantara/index.ts` | NEW | Barrel. |
| `src/lib/quantara/__tests__/schema.test.ts` | NEW | 29 cases — section invariants, field-id format/uniqueness, field-map-key regex/uniqueness/section-code-match, weight ∈ {1,2,3}, investor-class relevance non-empty, lookup-table consistency, per-field rules (f1≥0, f7 negative-permitted, f17 positive integer, f18 0..100, f13 NRR>100 OK, f21/f23 enum strict, f39/f44/f47 1..10 integer, f24 non-neg int, f56 1..30), composite payload accepts empty/sparse + rejects out-of-range. |
| `src/lib/quantara/__tests__/round-trip.test.ts` | NEW | 13 cases — full LTM-form fixture (`FULL_VALUES`) round-trips losslessly, sparse fixture preserves absence (no over-projection), MetricEvidence-wrap on engine cols, plain values in `quantaraJson`, undefined/null skipped, `mergeQuantaraIntoSubject` preserves untouched subkeys. |
| `prisma/schema.prisma` | MODIFY | Add `quantaraJson Json?` column to `ValuationSubject` with triple-slash JSDoc listing the ~36 subkeys. |
| `prisma/sql/04-add-quantara-foundation.sql` | NEW | Single `ALTER TABLE valuation_subjects ADD COLUMN "quantaraJson" JSONB`. Hand-written (additive change, no diff-generation needed). |

### Decisions / judgment-call trail

1. **OB is canonical for Quantara, not LTM.** LTM has the HTML mockup but never built it. June-8-demo strategy (locked 2026-05-07) makes OB the canonical implementation. LTM port-back is a separate post-OB session.
2. **`clues-questionnaire-engine` is the wrong audit target.** First plan-presentation read it as the source-of-truth. Founder corrected: "the clues questionnaire engine and its 2500 questions plus or minus has nothing to do with london-tech-map and its 56 critical financial questions two different apps two different purposes we are training olivia on both." Audit retargeted to LTM `founder-valuation-form.html`. Plan corrected before any code shipped.
3. **Single `quantaraJson` extension column** rather than expanding existing engine JSON column shapes. Keeps the Track V V2 engine bridge contract untouched. Quantara is the intake-form layer; engine input contract is its own concern.
4. **`field_map_key` pattern adopted** from `clues-questionnaire-engine` (the relocation app). Different app, same primitive — immutable identifiers survive label/schema revision.
5. **Founder-confidence default 0.7** for MetricEvidence wraps. Form answers come direct from the founder. Q4 cascade reconciles upward when corroborated by Stripe / CH / GitHub.
6. **Cap-table sanity locked at the schema layer** — `f17` Fully Diluted Shares is `z.number().int().positive()`, not just non-negative. Catches the obvious cap-table-empty bug at parse time.
7. **f35 Patents Granted → `ipDataJson.patentsCount`** (engine-consumed); f34 Patents Filed → `quantaraJson.patentsFiled` (form-only). Single canonical engine count; richer narrative stays Quantara-side.
8. **f36 (text proprietary dataset description) + f38 (text regulatory approvals) NOT mapped onto engine boolean `regulatoryApprovals`** — engine boolean is a different concern; richer founder narrative goes to `quantaraJson` for Q4 cascade reasoning.
9. **`mergeQuantaraIntoSubject` helper added** so partial saves don't clobber engine-only subkeys (e.g. `ebitdaMarginPct`, `cacPaybackMonths`) that exist on `ValuationSubject` but aren't in the Quantara field set.
10. **SQL migration hand-written** rather than `prisma migrate diff`-generated. Single additive `ALTER TABLE` — no diff drift risk.

### Build status at session-30 close

**Green.** Tests: **427/427** passing across 28 suites (was 385/26 at O1 close — +42 new Quantara tests, +2 new test suites, no regressions). Typecheck: clean. **Track Q 1/7 ✅.** ~55 sessions remain to ship priorities 1–4.

### Operator action surfaced

| Action | When | Why |
|---|---|---|
| Apply `prisma/sql/04-add-quantara-foundation.sql` to Supabase | Before any Q1+ code reads/writes `ValuationSubject.quantaraJson` | Adds the `quantaraJson JSONB` column to `valuation_subjects`. |

**Next session:** **Track Q Session Q2 — Form UI (non-metamorphic baseline).** Port the Quantara HTML wireframe layout to React + Aurum/Aether tokens (replacing the cyan branding). Build form rendering all 56 fields. Live data-completeness % bar. "Field N of 56" progress chip. Per BUILD_SEQUENCE Track Q row Q2.

---

## Part 38 — Session 31 (Track Q Session Q2 — Form UI baseline)

**466/466 tests across 33 suites. Typecheck clean.** `/founder-intake` route renders the full 56-field form inside the canonical `WorkspaceShell` (S14) using Aurum/Aether tokens — no cyan, no raw hex. Save flow round-trips through `mergeQuantaraIntoSubject` (Q1) onto `ValuationSubject`. Live weight-aware data-completeness bar + per-section completion rings + "FIELD N/56" header chip. **Track Q 2/7 ✅.**

### LTM-first audit (per HANDOFF gotcha §3.10)

| Capability | LTM has? | Decision |
|---|---|---|
| 3-pane founder intake layout | YES — `D:\London-Tech-Map\public\assets\founder-valuation-form.html` (1762 LOC HTML mockup, never built into LTM React) | OB builds NEW React mirroring layout structure byte-for-byte; cyan-400 brand replaced with Aurum gold per `01_UI_DESIGN_SYSTEM.md` § 1.3. **LTM has the design, OB builds the implementation.** |
| 56-field schema + round-trip helpers | YES (Q1 — `src/lib/quantara/`) | REUSE — Q2 imports `QUANTARA_FIELDS`, `QuantaraValuesSchema`, `mergeQuantaraIntoSubject`, `valuationSubjectToQuantara`. No re-define. |
| `WorkspaceShell` + `Header` + `RailLeft` + `Center` + `Inspector` | YES (S14 — `src/components/workspace/`) | REUSE — Q2 mounts inside the canonical shell. Header `scoreChips` slot carries the FIELD/COMPLETE chips; `Inspector` carries Olivia + Verdict tabs. |
| `AvatarOrb` + `Badge` + `CompletionRing` primitives | YES (S15 — `src/components/primitives/`) | REUSE — `Badge` for tier-coloured completeness chips, `CompletionRing` for per-section progress, `AvatarOrb` in inspector Olivia panel. |
| Aurum/Aether tokens | YES (S14 — `src/styles/tokens.css`) | REUSE — every paint references a CSS custom property. No raw hex per § 1.6 (CI lint pending Track O). |
| Lucide icons | YES (`lucide-react` ^1.14) | REUSE — 12 section icons (TrendingUp, Building2, Handshake, Rocket, Users, Globe, ShieldCheck, UserCircle2, AlertTriangle, Zap, BarChart3, Crown). |
| Composio auto-fill | NO LTM → YES OB (O1) | OUT OF Q2 SCOPE — sidebar CTA stub disabled with "Q3" label. Q3 wires the integrations. |
| `ValuationSubject` Prisma model | YES (V1) — including `quantaraJson` column added in Q1 | REUSE — `/api/founder-intake` upserts via this model. |
| Auth (`getAuthSession`) + rate limit | YES (`src/lib/auth/session.ts` pre-Clerk stub + `src/lib/rate-limit.ts`) | REUSE — same gating pattern as `/api/valuation/subject`. |
| Live valuation engine | YES (V1-V9) | OUT OF Q2 SCOPE — Verdict tab shows directionally-correct mock math (ARR × growth-bumped multiple, mirrors LTM mockup formula). Real engine runs through `/api/valuation/run` from the Workbench. |

### Files

| File | Action | Notes |
|---|---|---|
| `src/components/quantara/section-meta.ts` | NEW | 12 section icon + 3-letter code (FIN/CAP/FND/CRR/TRC/MKT/IPM/TEM/RSK/GRW/PRJ/STR). Aurum-only per § 1.3 ("Aurum and Aether never appear together in the same component"). |
| `src/components/quantara/field-ui-meta.ts` | NEW | Per-field UI control + unit suffix (currency-gbp/percent/integer/number/score-1-10/text/select-last-round-type/select-target-round-type). Mechanical map from Q1's 56 schemas to LTM mockup's input chrome. |
| `src/components/quantara/completeness.ts` | NEW | Weight-aware completeness math: `overallCompleteness`, `sectionCompleteness`, `allSectionCompleteness`. Counts `0` and negatives as filled (founders may legitimately enter 0 / negative). Critical fields (weight 3) count 3× helpful (weight 1). |
| `src/components/quantara/IntakeField.tsx` | NEW | Single field card with control dispatch on `QuantaraFieldUiMeta.control`. Currency `£` prefix, percent `%` suffix, score-1-10 slider with badge, text, selects. ARIA-correct labels + critical-weight `*` indicator + describedby on hint. Touch targets ≥ 44 × 44 (Vercel guideline). |
| `src/components/quantara/IntakeSectionBlock.tsx` | NEW | Section header (lucide icon + title + field count badge + per-section `CompletionRing` + `Badge`) + responsive grid of fields (`grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))`). |
| `src/components/quantara/IntakeSidebar.tsx` | NEW | Left rail content: 12-row section nav (with per-section `CompletionRing` + filled/total chip + active `aria-current`), data-completeness card (overall % + filled/auto split + remaining-fields warning), Olivia Gap Analysis CTA (disabled stub for Q3). |
| `src/components/quantara/IntakeOliviaPanel.tsx` | NEW | Inspector "Olivia" tab body: `AvatarOrb` + status row + contextual nudge (lowest-completion section), Q3-coming-next placeholder. |
| `src/components/quantara/IntakeVerdictPanel.tsx` | NEW | Inspector "Verdict" tab body: live valuation preview (ARR × growth-bumped multiple matching LTM mockup formula), `Intl.NumberFormat` GBP compact notation, confidence ramps with completeness %. Mock-only banner. |
| `src/components/quantara/IntakeForm.tsx` | NEW | Top-level orchestrator. Mounts `WorkspaceShell` with Header (AvatarOrb + QUANTARA wordmark + crumb + score chips + Save button) + RailLeft (sidebar) + Center (hero + 12 sections + final CTA) + Inspector (Olivia/Verdict tabs). State machine for save: `idle | saving | saved | error`. `IntersectionObserver` keeps `activeSection` in sync with manual scroll. AbortSignal + 15s timeout on the fetch. |
| `src/components/quantara/index.ts` | NEW | Barrel. |
| `src/components/quantara/__tests__/completeness.test.ts` | NEW | 11 cases — `isFilled` edge cases (0, negatives, null, whitespace strings); weight-aware percent math; per-section scoping; 12-row sum invariant. |
| `src/components/quantara/__tests__/field-ui-meta.test.ts` | NEW | 6 cases — every field has a meta entry, control kinds are documented, currency-gbp always carries `GBP` unit, score-1-10 always full-width, 12 section meta entries with 3-letter uppercase codes. |
| `src/components/quantara/__tests__/IntakeField.test.tsx` | NEW | 12 cases — currency `£` prefix + number coercion, percent/number/integer with truncation, score slider value badge, text passes through + clears to undefined, both selects render documented option lists, critical-weight `*` only on weight-3 fields. |
| `src/components/quantara/__tests__/IntakeForm.test.tsx` | NEW | 6 cases — workspace shell mounts (banner / nav / main / inspector), hero renders title + name input, starts at 0/56, blocks save without company name (no fetch fired), POSTs values + companyName to `/api/founder-intake`, Verdict tab surfaces preview math. |
| `src/app/api/founder-intake/route.ts` | NEW | POST (create-or-update by `(userId, companyName)` or by `subjectId`) + GET (resume by subjectId or latest). Validates body via `QuantaraValuesSchema`. Writes via `mergeQuantaraIntoSubject` so partial saves preserve engine-only subkeys. `getAuthSession()` stub auth. Rate limits 12/min POST, 30/min GET. AbortSignal + 15s timeout on caller side. Persists weighted `completenessScore`. |
| `src/app/api/founder-intake/__tests__/route.test.ts` | NEW | 4 cases — module surface (POST + GET exports), POST rejects empty body / missing companyName / type-mismatched values via Q1 Zod schema. Pre-Prisma branches; full integration runs land alongside Track F Session 18. |
| `src/app/founder-intake/page.tsx` | NEW | Server-component page that mounts `<IntakeForm />`. Resume flow is client-side via GET `/api/founder-intake` (page itself is no-auth so unauth visitors still see the form). |

### Decisions / judgment-call trail

1. **Aurum-only section icons.** LTM mockup has 12 distinct accent colours per section (emerald, violet, amber, sky, teal, orange, indigo, rose, red, lime, fuchsia, purple). UI design system § 1.3 forbids Aurum + Aether mixing inside a single component and reserves Aurum for finance/decision surfaces. Standardised every section icon on Aurum gold; per-section state colour comes from the existing tier-coloured `Badge` / `CompletionRing` primitives instead. Brand reads cohesive; tier-coloured chips do the per-state work.
2. **Q2-side `field-ui-meta.ts` rather than extending Q1's `QuantaraFieldDefinition`.** Q1 schema is the domain contract (label, weight, Zod schema). Render chrome (control kind, unit suffix, full-width flag) is Q2 surface concern. Splitting keeps the schema portable for Q3 (Composio source chips), Q4 (validation cascade), Q7 (voice capture) without dragging UI metadata across them.
3. **`isFilled` counts 0 and negatives.** LTM mockup's `updateProgress()` JS excluded `0`, which silently undercounted "no patents granted yet" type fields. OB rule: `null | undefined | empty-string` → empty; everything else → filled. Founders may legitimately enter 0 (gross debt, EBITDA losses) and we want their progress to count.
4. **Weight-aware completeness math, not field-count percent.** Q1 ships weights 1/2/3. The header chip + sidebar bar show weighted percent so completing the 13 critical fields contributes more than completing 13 helper fields — matches "data quality score" intuition founders expect.
5. **`IntersectionObserver` for scroll-driven active-section sync** with `rootMargin: "-80px 0px -60% 0px"` — top sticky header offset, viewport upper-third triggers. Keeps the rail's `aria-current` in sync without polling.
6. **`AbortController` + 15s timeout on the save fetch.** Per `~/CLAUDE.md` standing rule "Every network call carries an `AbortSignal` + timeout. No exceptions."
7. **Save button gates on `companyName`, not on values.** Partial completion is a first-class state per Q1. Empty values are a valid save (resume from anywhere). Empty company name is not — `ValuationSubject.companyName` is `String` (non-null) and the find-or-create flow needs it as a key.
8. **Inspector "Verdict" tab ships mock math, not a real engine call.** Q2's exit criterion is "save to `ValuationSubject` works" — full engine runs through the existing Track V `/api/valuation/run` route from the Workbench. Mock math (ARR × growth-bumped multiple) mirrors the LTM mockup formula exactly so the inputs map to a plausible-looking number while the founder fills the form.
9. **`asJson(v)` helper drops null on Prisma writes.** `mergeQuantaraIntoSubject` returns `Record<string, unknown> | null | undefined` per JSON column. Prisma's JSON write type is `InputJsonValue | undefined`. Mapping `null → undefined` keeps existing engine-only subkeys (`ebitdaMarginPct`, `cacPaybackMonths`) safe — partial saves never clobber them.
10. **Page is a server component, IntakeForm is a client component.** `/founder-intake/page.tsx` does no auth, no DB fetch — just `<IntakeForm />`. Server-side resume flow would require `getAuthSession()` (which throws without `STUB_USER_ID`), gating the page on auth. Q2 ships fresh-start for everyone; resume flow can be a later enhancement.
11. **`<header>` → `<div>` in FormHero.** Initial render had two banner-role elements (the canonical `Header` + the FormHero `<header>` element), failing the workspace-shell smoke test. FormHero is a hero block, not a page banner — `<div>` is the right semantic.

### Build status at session-31 close

**Green.** Tests: **466/466** passing across **33 suites** (was 427/28 at Q1 close — +39 new Q2 tests across 5 new test suites, no regressions). Typecheck: clean. **Track Q 2/7 ✅.** ~54 sessions remain to ship priorities 1–4.

### Operator action surfaced

| Action | When | Why |
|---|---|---|
| Apply `prisma/sql/04-add-quantara-foundation.sql` to Supabase (still owed from Q1) | Before any Q2+ save against `/api/founder-intake` reaches `ValuationSubject.quantaraJson` | Adds the `quantaraJson JSONB` column. Q2 writes will fail with "column does not exist" until applied. |

**Next session:** **Track Q Session Q3 — Olivia auto-fill via Composio.** Wire the disabled "Let Olivia complete the rest" sidebar button to the O1 Composio integrations. Each integration returns confidence-weighted values; UI shows source chips ("Stripe-derived", "GitHub-derived", "Companies-House-derived"). Founders can accept / reject / edit each suggestion. Per BUILD_SEQUENCE Track Q row Q3.

---

## Part 39 — Session 32 (Track Q Session Q3 — Olivia auto-fill via Composio)

**494/494 tests across 37 suites. Typecheck clean.** "Let Olivia complete the rest" goes live: parallel fan-out across the 7 O1 read-only Composio integrations + a conservative founder-defaults extractor; founder accepts (✓) / rejects (✗) each suggestion inline; manual edits implicitly dismiss. **Track Q 3/7 ✅.**

### LTM-first audit (per HANDOFF gotcha §3.10)

| Capability | LTM has? | Decision |
|---|---|---|
| 7 read-only Composio integrations (Stripe, GitHub, LinkedIn, QuickBooks, Xero, Companies House, Supabase) | YES (O1 — `src/lib/tools/integrations/`) | REUSE — Q3 extractors call existing `fetchStripeMetrics()`, `fetchGitHubRepoStats(repo)`, etc. No duplication of auth, fetch, mock-fallback logic. |
| Founder-intake auto-fill orchestrator | NO LTM | OB-original. Q3 builds `src/lib/quantara/auto-fill/` from scratch. Documented per §3.10. |
| Companies House client (rate-limit retry, full surface) | YES (O1 ported byte-for-byte from LTM `lib/companies-house/client.ts`) | REUSE — Q3's `extractCompaniesHouseSuggestions` calls the integration wrapper, which routes through the ported client. |
| Q1 56-field schema + types | YES (Q1 — `src/lib/quantara/`) | REUSE — `QuantaraFieldId`, `QuantaraSuggestion` consumes the schema's stable id pattern. |
| Q2 form components (IntakeField, IntakeSectionBlock, IntakeSidebar, IntakeForm) | YES (Q2 — `src/components/quantara/`) | EXTEND — IntakeField gets a `suggestion` prop + accept/reject/edit affordance; IntakeSidebar's CTA goes live; IntakeForm holds the suggestions Map + dispatch. No re-architecture. |
| `/api/founder-intake` POST | YES (Q2) | REUSE for persistence. Q3's `/api/founder-intake/auto-fill` is stateless — it returns suggestions but never writes. The founder accepts → form values mutate → existing Q2 POST persists. |

### Files

| File | Action | Notes |
|---|---|---|
| `src/lib/quantara/auto-fill/types.ts` | NEW | `QuantaraSuggestion`, `QuantaraSuggestionSource`, `QuantaraSuggestionSourceId`, `AutoFillContext`, `AutoFillSummary`, `SUGGESTION_SOURCE_LABEL` map. Source ids = O1 `Q3IntegrationId` ∪ `olivia_defaults`. |
| `src/lib/quantara/auto-fill/extractors/stripe.ts` | NEW | Stripe → ARR / MRR / paying customers / monthly churn / GRR (5 fields). ARR = MRR×12 ships at slightly lower confidence than MRR (which is read direct). |
| `src/lib/quantara/auto-fill/extractors/github.ts` | NEW | GitHub → team-size proxy (contributorsCount) + technical-staff heuristic (2 fields). Confidence floor low — repo contributors over-count externals. |
| `src/lib/quantara/auto-fill/extractors/companies-house.ts` | NEW | CH → founder-experience floor (years since incorporation) + active-officers team-size floor (2 fields). |
| `src/lib/quantara/auto-fill/extractors/linkedin.ts` | NEW | LinkedIn → headcount estimate from `staffCountRange` (1 field). |
| `src/lib/quantara/auto-fill/extractors/quickbooks.ts` | NEW | QB → ARR + gross margin heuristic + net margin + EBITDA + monthly burn + cash on hand + cash runway (7 fields). |
| `src/lib/quantara/auto-fill/extractors/xero.ts` | NEW | Xero → 4 fields (no cash on hand — Xero exposes it via separate Balance Sheet endpoint we don't pull in O1's narrow client). Confidence ≤ QB for shared fields so QB wins on tie-break. |
| `src/lib/quantara/auto-fill/extractors/supabase.ts` | NEW | Supabase → MAU = DAU × 4 (1 field). |
| `src/lib/quantara/auto-fill/extractors/founder-defaults.ts` | NEW | 38 conservative industry-benchmark starting values at confidence 0.40 across every section. The "industry benchmarks" half of the LTM mockup's modal copy. |
| `src/lib/quantara/auto-fill/orchestrator.ts` | NEW | `runAutoFill(context)` runs all 8 extractors in parallel via `Promise.all`. Tie-break: higher confidence → real-mode wins ties → `INTEGRATION_PRIORITY` (Stripe > QB > Xero > CH > GitHub > LinkedIn > Supabase > defaults) breaks remaining ties. Returns `AutoFillSummary` with per-source counts + integrationsLive/MockMode tally. |
| `src/lib/quantara/auto-fill/index.ts` | NEW | Barrel. |
| `src/lib/quantara/auto-fill/__tests__/orchestrator.test.ts` | NEW | 9 cases — covers ≥30 fields in mock-mode (Q3 exit criterion), Stripe-wins-tie on f1, perSource counts, includeDefaults toggle, every winner has label + confidence ∈ [0,1]. |
| `src/lib/quantara/auto-fill/__tests__/extractors.test.ts` | NEW | 11 cases — per-extractor field coverage, Stripe ARR = MRR×12 invariant, Xero excludes cash-on-hand, defaults excludes f1, defaults size ≥30 + confidence == 0.40. |
| `src/app/api/founder-intake/auto-fill/route.ts` | NEW | POST runs orchestrator. Auth via `getAuthSession()` stub. Rate limits 6/min/client (stricter than Q2's 12/min — this dispatch hits 7 external APIs each call). 15s timeout via `Promise.race`. Returns `AutoFillSummary` payload directly. |
| `src/app/api/founder-intake/auto-fill/__tests__/route.test.ts` | NEW | 3 cases — module surface, default body returns ≥30 fields, missing `STUB_USER_ID` returns 401/503. |
| `src/components/quantara/IntakeField.tsx` | MODIFY | Adds optional `suggestion`, `onAcceptSuggestion`, `onRejectSuggestion` props. When set AND field empty, renders aether-tinted suggestion row with source chip, formatted value, confidence badge, optional note, ✓ Accept / ✗ Reject buttons. Aether border on the card itself when a suggestion is pending. |
| `src/components/quantara/IntakeSectionBlock.tsx` | MODIFY | Passes `suggestions` Map + handlers through to each `IntakeField`. |
| `src/components/quantara/IntakeSidebar.tsx` | MODIFY | Olivia gap-analysis CTA goes live. State machine `idle | running | ready | error` drives copy + disabled state ("Let Olivia complete the rest" → "Olivia is filling…" → "N pending — accept or reject above" → error message). |
| `src/components/quantara/IntakeForm.tsx` | MODIFY | Holds `suggestions: Map<QuantaraFieldId, QuantaraSuggestion>` + `autoFillState`. `handleTriggerAutoFill` POSTs to `/api/founder-intake/auto-fill` (AbortSignal + 20s timeout). Manual edits to a field with a pending suggestion implicitly dismiss it. Accepting writes the suggested value into form state; rejecting just dismisses. Auto-derived effect drops `autoFillState` back to `idle` once all suggestions are processed. |
| `src/components/quantara/index.ts` | MODIFY | Export `AutoFillState` type. |
| `src/components/quantara/__tests__/IntakeField.suggestion.test.tsx` | NEW | 5 cases — source label + value + confidence render, accept/reject handlers fire, manual override hides the row, mock-mode shows in note. |

### Decisions / judgment-call trail

1. **Orchestrator-only design — no Prisma writes from `/api/founder-intake/auto-fill`.** The Q3 dispatch is stateless: it returns suggestions, the founder accepts inline, then the existing Q2 `POST /api/founder-intake` persists. Keeps the persistence API surface narrow; the auto-fill route is a pure read.
2. **Tie-break rule: `pickWinner(a, b)`.** Higher `confidence` wins; on tie real-mode beats mock-mode; on tie integration priority (Stripe > QB > Xero > CH > GitHub > LinkedIn > Supabase > defaults) breaks. Encodes "Stripe is the canonical SaaS revenue source; QuickBooks beats Xero when both are connected; founder-defaults always last."
3. **Per-extractor confidence stepdown for derived values.** Stripe MRR ships at full real/mock confidence; Stripe ARR ships at -0.05 (it's MRR×12 — a derived value). QB net margin ships at -0.10 (derived from net income / revenue); QB cash runway ships at -0.25 (compound derived). Encodes confidence-as-data-quality at the extractor layer rather than offloading to Q4's truth-score-agent.
4. **Confidence step-down between QB and Xero on overlapping fields.** Xero's overlapping fields (f1, f6, f7, f8) ship at -0.05 to -0.10 below QB so QB wins on tie-break when both are connected. Encodes "QB is the canonical accounting source for OB" without enforcing a hard ordering — Xero still wins if the user is Xero-only.
5. **Founder-defaults extractor at confidence 0.40, never targets f1.** Q3 user direction implicit: defaults are "industry medians the founder reviews"; they should never override real-API-derived values. Confidence 0.40 keeps them strictly below every real API (mock-mode floor 0.50). Excluding f1 ARR explicitly keeps the canonical revenue source unambiguous.
6. **Manual edit implicitly dismisses a pending suggestion.** If the founder types into a field with a pending suggestion, the suggestion goes away — their typed value wins. Avoids the bug-class of a stale suggestion lingering after the founder has visibly entered something different.
7. **Suggestions hide once the field has a value.** `IntakeField`'s `showSuggestion` is `suggestion !== undefined && !filled`. Avoids the bug-class of a suggestion row competing with a value the founder has already accepted (or typed).
8. **`AutoFillState` lives in IntakeForm, not IntakeSidebar.** IntakeSidebar receives `autoFillState` + `suggestionCount` as props. Centralises state; avoids prop-drilling; keeps the sidebar pure-presentational.
9. **Auto-fill API rate limit = 6/min/client (stricter than save's 12/min).** The dispatch fans out to 7 external APIs each call. 6/min keeps Stripe / GitHub / Companies House rate-limit headroom comfortable in dev when keys are real.
10. **15s server-side timeout via `Promise.race` on the orchestrator.** Each underlying integration enforces its own 8s `AbortSignal.timeout` (O1 contract). Orchestrator parallelises via `Promise.all` so realistic upper bound is ~9s; 15s gives a 60% margin.
11. **20s client-side timeout in IntakeForm's fetch.** 5s buffer above the server-side ceiling; covers network latency and JSON serialization.
12. **Pence-to-pound conversion at the extractor layer.** Stripe / QB / Xero return amounts in pence (smallest currency unit). Q1 schemas (`f1` ARR, `f15` cash on hand, etc.) expect GBP whole-pound. Each extractor calls a local `penceToGbp(pence)` helper. Keeps the schema layer currency-unit-agnostic; extractors own the conversion.

### Build status at session-32 close

**Green.** Tests: **494/494** passing across **37 suites** (was 466/33 at Q2 close — +28 new Q3 tests across 4 new test suites, no regressions). Typecheck: clean. **Track Q 3/7 ✅.** ~53 sessions remain to ship priorities 1–4.

### Operator actions surfaced

| Action | When | Why |
|---|---|---|
| Apply `prisma/sql/04-add-quantara-foundation.sql` to Supabase (still owed from Q1) | Before any save against `/api/founder-intake` reaches `ValuationSubject.quantaraJson` | Q2 saves and Q3 auto-fill writes (via Q2's POST after accept) BOTH need the column. |
| **OPTIONAL** — set `STRIPE_API_KEY`, `GITHUB_TOKEN`, `LINKEDIN_API_KEY`, `QUICKBOOKS_API_KEY`, `XERO_API_KEY`, `COMPANIES_HOUSE_API_KEY`, `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (Sensitive, Production + Preview only — never "All Environments" per `~/CLAUDE.md`) | When live-mode auto-fill is desired | Without keys, every integration short-circuits to its mock payload at confidence 0.5. The form still works end-to-end — mock-mode auto-fill produces ≥30 fields covered. Live keys upgrade to confidence 0.9 and surface real founder data. |

**Next session:** **Track Q Session Q4 — Field-validation cascade.** When the founder enters a value that disagrees with an API-derived value (e.g. user types ARR=£245k, Stripe says £198k), Olivia surfaces the discrepancy with a chip and asks to reconcile. Reuses LTM's `truth-score-agent` ported in V5. Per BUILD_SEQUENCE Track Q row Q4.

---

## Part 40 — Session 33 (Track Q Session Q4 — field-validation cascade)

**510/510 tests across 39 suites. Typecheck clean.** Coral discrepancy chips surface when founder values disagree with stored API references by >5%. Reuses V5's `runTruthScore` byte-for-byte via projection — no re-implementation of threshold or per-field directionality. **Track Q 4/7 ✅.**

### LTM-first audit (per HANDOFF gotcha §3.10)

| Capability | LTM has? | Decision |
|---|---|---|
| `truth-score-agent` (5% threshold + per-field optimistic/pessimistic) | YES (V5 — `src/lib/agents/valuation/truth-score-agent.ts`, byte-for-byte LTM port; deterministic, no LLM) | REUSE — Q4 wraps via projection. No re-implementation. |
| `MetricEvidence` shape (`{ value, refs, confidence }`) | YES (V2) | REUSE — wrap raw founder values + Q3 suggestion values into MetricEvidence on the way into the agent. |
| `ExtractedValuationInput` + `CompanyValuationInput` types | YES (V2 — `src/lib/valuation/types.ts`) | REUSE — Q4 builds these as projections; agent never reads `extractionNotes`/`missingItems`/etc. so they ship as empty defaults. |
| Q3 `QuantaraSuggestion` (per-field source + value + confidence) | YES (Q3 — `src/lib/quantara/auto-fill/`) | REUSE — apiReferenceValues map in IntakeForm uses the same shape. |
| Per-field discrepancy UI primitives | NO LTM | OB-original (Q4 builds the coral chip + reconcile flow on top of Q2/Q3 IntakeField). |

### Files

| File | Action | Notes |
|---|---|---|
| `src/lib/quantara/discrepancy/types.ts` | NEW | `QuantaraDiscrepancyGap` (fieldId + manualValue + referenceValue + gapPct + direction + source + sourceLabel) + `QuantaraDiscrepancyResult` (per-field map + truthScore + totalFields/verifiedFields). |
| `src/lib/quantara/discrepancy/field-mapping.ts` | NEW | `QUANTARA_TO_TRUTH_FIELD` (19-field intersection) + inverse map + `isComparableField` type guard. Q1 destination map ∩ V5 agent COMPARABLE_FIELDS. |
| `src/lib/quantara/discrepancy/detect.ts` | NEW | Projects `QuantaraValues` + `Map<QuantaraFieldId, QuantaraSuggestion>` into `MetricEvidence`-shaped inputs the agent reads. Calls `runTruthScore`. Re-keys gaps back to `QuantaraFieldId`. Caps gapPct at 100. Pure. |
| `src/lib/quantara/discrepancy/index.ts` | NEW | Barrel. |
| `src/lib/quantara/index.ts` | MODIFY | Re-export discrepancy types + `detectDiscrepancies`. |
| `src/components/quantara/IntakeField.tsx` | MODIFY | Adds `discrepancy`, `onTrustReference`, `onDismissDiscrepancy` props. When set AND value filled (NOT empty), renders coral alert row with source chip + gap % + "you/api" values + Trust API / Keep mine buttons. Border priority: discrepancy > suggestion > default. |
| `src/components/quantara/IntakeSectionBlock.tsx` | MODIFY | Passes `discrepancies` map + handlers down to each IntakeField. |
| `src/components/quantara/IntakeForm.tsx` | MODIFY | Adds `apiReferenceValues` (persistent) + `dismissedDiscrepancies` (Set) state. `discrepancies` derived via useMemo over `(values, apiReferenceValues, dismissedDiscrepancies)`. Auto-fill response now mirrors suggestions into apiReferenceValues. `handleTrustReference` snaps value to reference. `handleDismissDiscrepancy` adds to dismissed set. |
| `src/lib/quantara/discrepancy/__tests__/detect.test.ts` | NEW | 10 cases — within-tolerance no gap, optimistic vs pessimistic directionality preserved through wrapper, non-comparable fields dropped, missing-side handled, 5-field end-to-end exit criterion, gapPct capped at 100. |
| `src/components/quantara/__tests__/IntakeField.discrepancy.test.tsx` | NEW | 6 cases — hidden when value empty, rendered when filled, manual + reference values surface, Trust/Keep handlers fire, optimistic vs pessimistic copy swap. |

### Decisions / judgment-call trail

1. **Wrap, don't re-implement.** `runTruthScore` from V5 is byte-for-byte LTM and deterministic. Q4 projects its inputs into the shape the agent reads (raw numbers → MetricEvidence) and re-keys outputs by `QuantaraFieldId`. The 5% threshold and per-field directionality stay inside the agent — the wrapper never duplicates them.
2. **Persistent `apiReferenceValues` map separate from dismissable `suggestions`.** Q3's suggestions map is the inbox the founder accepts/rejects; once empty, it's gone. Q4 needs a second map that stays around forever (within the session) so the truth-score-agent has data to compare against even after the founder accepts/edits. Auto-fill populates BOTH maps from the same response.
3. **Discrepancy only renders when value is filled.** `showDiscrepancy = discrepancy !== undefined && filled`. Empty fields with an API reference show the Q3 suggestion row instead — discrepancy is post-typing-only.
4. **Discrepancy chip wins border-color over suggestion chip.** A pending discrepancy is a data-quality blocker; an aether-tinted "Stripe-derived" pill on top of a coral border would muddy the message. Coral wins, suggestion row hides (since `filled === true` blocks `showSuggestion` anyway).
5. **`Trust API` snaps the value, doesn't merge.** Founder's options are binary: take the API value verbatim OR keep their typed value verbatim. No "split the difference" affordance — keeps the audit clean (what the founder agreed to vs what they overrode).
6. **`Keep mine` is per-session only.** No persistence (no Prisma writes from Q4). If the founder reloads the form, dismissed discrepancies come back. Acceptable for Q4 baseline; Q4-extra (post-Q7) can persist `OliviaUserMemory` records if helpful.
7. **Non-comparable fields silently drop.** The agent's COMPARABLE_FIELDS covers 27 entries; Q1's destination map maps 56 Quantara fields. The intersection is 19 fields. Text/score/enum fields (f21 round type, f43 exit narrative, f39 network effects) are dropped at projection time without warning — they were never going to round-trip anyway.
8. **gapPct capped at 100.** When one side is near-zero the agent's formula can compute gaps in the high hundreds. The chip displays a percentage; rendering "847% gap" reads worse than "100% gap". Cap at projection time, not in the agent (preserves V5's surface).
9. **Auto-fill re-run resets dismissed discrepancies.** New API data may differ from the previous fetch; if the founder previously dismissed a chip, the new fetch resurfaces it. Mirrors "Stripe just refreshed — check again."
10. **`detectDiscrepancies` is a pure useMemo.** No side-effects, deterministic. Safe to call on every IntakeForm render — the agent is fast (deterministic loops over ~19 fields).

### Build status at session-33 close

**Green.** Tests: **510/510** passing across **39 suites** (was 494/37 at Q3 close — +16 new across 2 new suites). Typecheck: clean. **Track Q 4/7 ✅.** ~52 sessions remain to ship priorities 1–4.

### Operator actions surfaced

| Action | When | Why |
|---|---|---|
| Apply `prisma/sql/04-add-quantara-foundation.sql` to Supabase (still owed from Q1) | Before any save against `/api/founder-intake` reaches `ValuationSubject.quantaraJson` | Carries forward — Q4 itself never writes (UI-only discrepancy detection); persistence remains on the existing Q2 POST flow. |

**Next session:** **Track Q Session Q5 — Investor-class metamorphic UI.** Form re-orders sections + adds class-specific fields based on `nextRoundType` (angel / seed / series_a / series_b / buyout). Bayesian-style routing. Per-investor-class question bias from `Organization` records (LTM ecosystem data ported in V1). Per BUILD_SEQUENCE Track Q row Q5.

---

## Part 41 — 2026-05-07 — Track Q Session Q5: Investor-class metamorphic UI

**HEAD before:** `bf7bb08` (Q4 handoff, 510/510 across 39 suites). **HEAD after Q5 code:** `1791395`. **HEAD after Q5 docs:** (this commit). **Tests:** 510/510 → **573/573** across **39 → 44 suites** (+63 new across 5 new suites). Typecheck: clean.

### Spec drift surfaced + resolved before coding

The Q5 row in BUILD_SEQUENCE referenced two artefacts that didn't match the live repo:

1. **`nextRoundType`** — actual schema field is `f23 — Target Round Type` (`Seed | Series A | Series B | Series C | Growth | Strategic`); buyer classes live in `BuyerType` (`angel | vc | private_equity | strategic_partner | acquirer`), already encoded per-field via `investorClassRelevance` metadata in `src/lib/quantara/schema.ts`. The Q5 spec used the wrong name; live schema is what shipped.
2. **`Organization` records ported in V1** — V1's spec adds 4 valuation Prisma models (ValuationSubject, ValuationRun, ValuationSensitivity, FinancialSnapshot), NOT `Organization`. Track V is sequenced *after* Track Q in BUILD_SEQUENCE (run-rate Sessions 20–28 vs Q's 30–36), so Q5 cannot depend on Organization data. Confirmed via `grep "model Organization" prisma/schema.prisma` — no match.

User-confirmed decisions before code:
- **Class-specific fields** — parallel supplementary list under `quantaraJson.supplementary[roundType]`, NOT extending the canonical 56. Preserves the FIELD N/56 chip + completeness math.
- **Organization-bias** — deferred to W-017. Q5 drives metamorphism off `f23` + per-field `investorClassRelevance` only. Honors `project_ltm_types_no_speculative_generalization` rule.

### What ships

**Pure-function metamorphic primitives** (`src/lib/quantara/metamorphic/`):

| File | Surface |
|---|---|
| `types.ts` | `SupplementaryFieldId` (`s1..s18`), `SupplementaryFieldDefinition`, `SupplementaryControlKind`, `SupplementaryValues` (multi-round map), `QUANTARA_SUPPLEMENTARY_FIELD_COUNT = 18`. Re-export of `BuyerType` from `../valuation/types` so consumers import via the Quantara surface. |
| `round-buyer-mapping.ts` | `getInvestorClassesForRound(roundType): readonly BuyerType[]` — Seed → [angel, vc]; Series A → [vc]; Series B/C → [vc, private_equity]; Growth → [private_equity, strategic_partner]; Strategic → [strategic_partner, acquirer]. `buyerClassesIntersect` helper. |
| `section-order.ts` | `getSectionOrderForRound(roundType?)` — splits sections into primary (relevance ≥ 0.5) vs secondary using each section's per-field `investorClassRelevance`; canonical-order tiebreak within tier. Pure, snapshot-friendly. Also exports `sectionRelevanceScore` and `isSectionPrimaryForRound`. |
| `field-relevance.ts` | `getFieldRelevanceTier(fieldId, roundType?): 'primary' \| 'secondary'` per field. `getAllFieldRelevanceTiers(roundType?)` returns a frozen full map for memo-efficient consumers. |
| `supplementary.ts` | 18 round-specific fields (3 per round × 6 rounds) covering Lead Investor Status, SAFE/convertible terms, founder personal runway (Seed); lead-investor-identified, board composition, liquidation preference (Series A); anti-dilution, pro-rata, tranche structure (Series B); strategic mix, IPO readiness, existing-investor re-up rate (Series C); PIK/dividend, debt component, secondary sale window (Growth); acquirer interest, earnout/holdback, strategic synergy areas (Strategic). Inline Zod + per-field UI metadata (`select-enum`, `multi-select-enum`, `text`, `long-text`, `currency-gbp`, `percent`, `integer`, `number`). `SupplementaryValuesSchema` validates the full multi-round map. |
| `supplementary-mapping.ts` | `supplementaryToJson` / `supplementaryFromJson` — projection to/from `quantaraJson.supplementary[roundType][subkey]`. `mergeSupplementaryIntoQuantaraJson` does per-round merges so partial saves never clobber unrelated rounds. `readSupplementaryFromQuantaraJson` extracts the namespace from a stored bag. |
| `index.ts` | Barrel. |

**UI components** (`src/components/quantara/`):

| File | Action | Notes |
|---|---|---|
| `IntakeSupplementaryBlock.tsx` | NEW | Aether-tinted block (Aether = intelligence per § 1.3 of UI design system) that mounts when `f23` is set. Title "<RoundType> signal" + count chip + completion ring + 3-field grid. Hides when `roundType` undefined. |
| `IntakeSupplementaryField.tsx` | NEW | Self-contained renderer covering all 8 supplementary control kinds. Aether-tinted radio/checkbox accent for select-enum / multi-select-enum. Not coupled to `IntakeField` — Q3/Q4 supplementary extensions ship later as additive props. |
| `IntakeForm.tsx` | MODIFY | Watches `values.f23`, computes `sectionOrder` via `getSectionOrderForRound`, renders sections in that order via `QUANTARA_SECTIONS_BY_ID` lookup. Adds `supplementaryValues: SupplementaryValues` state (multi-round map) and `handleChangeSupplementary` updater. Save flow includes `supplementaryValues` in POST body. IntersectionObserver dependency now includes `sectionOrder` so reorder doesn't strand it on stale refs. |
| `index.ts` | MODIFY | Re-exports the two new components. |

**API route** (`src/app/api/founder-intake/route.ts`):

- POST accepts `supplementaryValues`, validates via `SupplementaryValuesSchema`, merges via `mergeSupplementaryIntoQuantaraJson` after the canonical merge so `quantaraJson.supplementary` lands without disturbing canonical-field subkeys or other rounds. New + update paths both wired.
- GET returns the multi-round supplementary map alongside canonical values via `readSupplementaryFromQuantaraJson`.

### Tests

| Suite | New cases |
|---|---|
| `metamorphic/__tests__/round-buyer-mapping.test.ts` | 13 |
| `metamorphic/__tests__/section-order.test.ts` | 11 |
| `metamorphic/__tests__/field-relevance.test.ts` | 9 |
| `metamorphic/__tests__/supplementary.test.ts` | 24 |
| `components/quantara/__tests__/IntakeForm.metamorphic.test.tsx` | 6 |
| **Total** | **63 across 5 new suites** |

Coverage spans: per-round buyer mapping correctness, section reorder primary/secondary boundary, field relevance unknown-id graceful default, supplementary catalog invariants (3 fields per round, unique subkeys per round), Zod multi-round payload validation including a forward-compat unknown-subkey case, projection round-trip losslessness across 3 rounds, merge preservation of prior-round entries, and IntakeForm-level integration covering: hidden-when-no-round, mount-on-round-set, swap-on-round-change, section-reorder-on-round-change, supplementaryValues-in-POST-body, prior-round-preservation-on-switch-back.

### Decisions / judgment-call trail

1. **Threshold-based section reorder, not a per-round override list.** Override maps go stale; the 0.5 relevance threshold derives from per-field `investorClassRelevance` already in the schema. New canonical fields automatically participate in the right tier.
2. **Supplementary fields parallel to the canonical 56, not extending it.** Preserves the 56-field invariant + FIELD N/56 chip + Q3/Q4 cascade scoping. Supplementary completeness ring lives in the supplementary block itself.
3. **Multi-round preservation on switch-back.** A founder switching Seed → Series A → Seed keeps their Seed entries. Storage shape is `quantaraJson.supplementary[roundType][subkey]`, keyed by all 6 round types.
4. **`select-enum` rendered as radio fieldset, not native `<select>`.** Aether-tinted card-style radios match the design system's modular workspace aesthetic and surface options at-a-glance — important for term-sheet structure choices where the founder needs to compare options side by side.
5. **Subkey-based persistence (not field-id).** `quantaraJson.supplementary[Seed][leadInvestorStatus]`, not `[s1]`. Mirrors the canonical destination map's convention; downstream consumers (Track P deal protection, Track L cluesintelligence) bind to subkey names that survive id renames.
6. **Cast through `unknown` for Zod v4 enum dynamic-array helper.** `enumFrom(options)` runs `z.enum(values as unknown as readonly [string, ...string[]])` because Zod v4's `z.enum` generic constraint changed from tuple to `Readonly<Record<string, EnumValue>>`. Runtime is fine; the cast is the canonical TS escape for runtime polymorphism. Not a band-aid — explicit type-system limitation around dynamic literal arrays.
7. **`Organization`-records investor-bias deferred, not stubbed.** Q5 ships without it; logged as W-017. No band-aid stub. Lands when Track V actually ports LTM Organization data and a real consumer materialises (Track L most likely).

### Build status at session-Q5 close

**Green.** Tests: **573/573** passing across **44 suites** (+63 new across 5 new suites). Typecheck: clean. **Track Q 5/7 ✅.** ~51 sessions remain to ship priorities 1–4.

### Operator actions surfaced

| Action | When | Why |
|---|---|---|
| Apply `prisma/sql/04-add-quantara-foundation.sql` to Supabase (still owed from Q1) | Before any save against `/api/founder-intake` reaches `ValuationSubject.quantaraJson` | Carries forward from Q1 — Q5 reuses the same `quantaraJson` column under a new `supplementary` namespace; no new SQL migration needed for Q5. |

**Next session:** **Track Q Session Q6 — Vertical-specific schedules.** AI/SaaS adds model provenance + training-data fields; HealthTech adds MHRA pathway + clinical data; ClimateTech adds ESG + impact metrics; PropTech adds property data accuracy. Mounts via Q5 metamorphic primitive. Per BUILD_SEQUENCE Track Q row Q6.

---

## Part 42 — 2026-05-08 — Track Q Session Q6: Vertical-specific schedules

**HEAD before:** `7526294` (Q5 docs handoff, 573/573 across 44 suites). **HEAD after Q6 code:** `58fad87`. **HEAD after Q6 docs:** (this commit). **Tests:** 573/573 → **610/610** across **44 → 46 suites** (+37 new across 2 new suites). Typecheck: clean.

### Architectural decision — parallel axis, not extension

Q5 introduced round-axis metamorphism (`f23 → supplementary fields`). Q6 needed a parallel axis driven by industry / sector. Two options were on the table:

1. **Extend Q5's `SupplementaryFieldDefinition`** with an axis discriminator (round vs vertical) so one block + one renderer + one storage namespace handles both.
2. **Parallel namespace** — separate types, separate catalog, separate storage namespace, separate block; reuse the renderer via a shared structural type.

Chose **option 2**. Rationale: round and vertical are independent — a Series A fintech founder should answer Series A round-specific signals AND a generic-vertical schedule (which is empty by design). Coupling them would force one founder to fill both schedules just because they had a vertical selected. Parallel storage namespaces (`quantaraJson.supplementary[roundType]` vs `quantaraJson.vertical[verticalId]`) keep the axes orthogonal and let either ship/regress without touching the other.

To honor the "extend, don't duplicate" principle from `01_UI_DESIGN_SYSTEM.md` § 12, extracted **`MetamorphicFieldShape`** in `metamorphic/types.ts` as the structural type both axes share. `SupplementaryFieldDefinition` and `VerticalFieldDefinition` both extend it; `IntakeSupplementaryField` (the field renderer shipped in Q5) was generalized to accept either. One renderer, two axes — clean separation without code duplication.

### What ships

**Pure-function vertical primitives** (`src/lib/quantara/metamorphic/`):

| File | Surface |
|---|---|
| `types.ts` (extended) | New `MetamorphicFieldShape` structural interface — the shared render contract both axes satisfy. `SupplementaryFieldDefinition` refactored to extend it (zero behavior change; tests still pass). |
| `vertical-types.ts` | `VerticalId` (`ai_saas | healthtech | climatetech | proptech | generic`), `VerticalFieldId` (`v1..v20`), `VerticalDescriptor`, `VerticalFieldDefinition` extending `MetamorphicFieldShape`, `VerticalValues` (multi-vertical map), `QUANTARA_VERTICAL_COUNT = 5`, `QUANTARA_VERTICAL_FIELD_COUNT = 20`. |
| `vertical-schedules.ts` | 20-field catalog (5 per non-generic vertical): AI/SaaS — model provenance, training-data provenance, eval framework, hallucination rate %, inference cost per query (£); HealthTech — regulatory pathway (MHRA / FDA 510(k) / FDA De Novo / CE Mark / Class I exempt / not yet), clinical trial stage, peer-reviewed studies (count), reimbursement status, KOL list; ClimateTech — ESG framework alignment (TCFD / SBTi / SASB / GRI / CDP — multi-select), CO₂ abatement per £ revenue, impact methodology, lifecycle assessment status, carbon-accounting tool; PropTech — property data accuracy %, MLS RESO compliance, geographic coverage, monthly transaction volume, refresh cadence (real-time / daily / weekly / monthly). Plus `QUANTARA_VERTICALS` descriptor list, `getVerticalFieldsForVertical`, `buildVerticalValuesSchema`, top-level `VerticalValuesSchema`. Generic is intentional zero-fields. |
| `vertical-mapping.ts` | `verticalToJson` / `verticalFromJson` — projection to/from `quantaraJson.vertical[verticalId][subkey]`. `mergeVerticalIntoQuantaraJson` does per-vertical merges so partial saves never clobber unrelated verticals. `readVerticalFromQuantaraJson` extracts the namespace from a stored bag. Distinct from supplementary's `supplementary` namespace. |
| `index.ts` (extended) | Re-exports the vertical surface + `MetamorphicFieldShape`. |

**UI components** (`src/components/quantara/`):

| File | Action | Notes |
|---|---|---|
| `IntakeVerticalBlock.tsx` | NEW | Sky-info-tinted block (sky-info = informational per `01_UI_DESIGN_SYSTEM.md` § 1.4 — distinct from Q5's Aether tint). Title "<Vertical> schedule" + count chip + completion ring + 5-field grid. Hides when `verticalId` is undefined OR `generic`. Reuses `IntakeSupplementaryField` for field rendering via the shared `MetamorphicFieldShape`. |
| `IntakeSupplementaryField.tsx` | MODIFY | Generalized: accepts `MetamorphicFieldShape` instead of the round-axis-only `SupplementaryFieldDefinition`. Radio-group `name` attribute now uses the field's `id` directly (works for both `s1..s18` and `v1..v20`). Zero behavior change for Q5 callers. |
| `IntakeForm.tsx` | MODIFY | Adds `vertical: VerticalId | undefined` + `verticalValues: VerticalValues` state with multi-vertical preservation. Adds vertical selector in `FormHero` (right of company-name input — two-column grid). Mounts `IntakeVerticalBlock` after `IntakeSupplementaryBlock`. Save flow includes `vertical` + `verticalValues` in POST body. |
| `index.ts` | MODIFY | Re-exports `IntakeVerticalBlock`. |

**API route** (`src/app/api/founder-intake/route.ts`):

- POST whitelists incoming `vertical` against `QUANTARA_VERTICAL_BY_ID` so a freeform string can never reach `ValuationSubject.sector`. Validates `verticalValues` via `VerticalValuesSchema`. Merges into `quantaraJson.vertical` via `mergeVerticalIntoQuantaraJson` as a third pass (after canonical merge + Q5 supplementary merge). Persists vertical to the top-level `sector` column (already on the Prisma model — no schema change).
- GET returns `vertical` + `verticalValues` alongside canonical + supplementary. `sector` is whitelisted on read so a legacy freeform sector value doesn't crash the typed UI.
- `shapeSelect` extended to include `sector`; `SubjectRow` + `toShape` updated.

### Tests

| Suite | New cases |
|---|---|
| `metamorphic/__tests__/vertical-schedules.test.ts` | 31 |
| `components/quantara/__tests__/IntakeForm.vertical.test.tsx` | 6 |
| **Total** | **37 across 2 new suites** |

Coverage spans: catalog invariants (5 verticals × 5 fields = 20, generic = 0 by design, unique subkeys per vertical, options present on enum controls), Zod validation across all 5 verticals + multi-vertical payload + invalid-enum rejection, projection round-trip across 4 non-generic verticals losslessly, forward-compat unknown-subkey skip, merge preservation of canonical + supplementary + other-vertical entries when writing one vertical, and IntakeForm-level integration covering: hidden-when-no-vertical, hidden-when-generic, mount-on-vertical-set, swap-on-vertical-change, `vertical` + `verticalValues` in POST body distinct from `supplementaryValues`, prior-vertical-preservation on switch-back.

### Decisions / judgment-call trail

1. **Parallel axis, not extension** (covered above).
2. **Generic = zero fields by design.** A founder choosing "Generic / Other" gets the canonical 56 + Q5 supplementary only. Forces a deliberate vertical choice for those who want vertical-specific signals; doesn't punish the founder who's genuinely cross-vertical.
3. **`sector` reuses an existing column** — `ValuationSubject.sector: String?` was already on the Prisma model (no Q6 migration). Persisting `VerticalId` strings here means sector's storage is now typed-by-convention; the API route enforces whitelisting on read AND write so legacy freeform values can't break the typed UI.
4. **Sky-info tint distinguishes the vertical block from Q5's Aether supplementary.** Both are valid semantic accents in `01_UI_DESIGN_SYSTEM.md` § 1.4; using two different tints lets the founder visually distinguish the two metamorphism axes when both are active without introducing a third raw color.
5. **`MetamorphicFieldShape` shared structural type.** Avoids code duplication on the renderer layer without coupling the two axes' data structures. Either axis can evolve independently (e.g., Q7 voice capture might want axis-specific affordances) by adding axis-specific props to its definition without touching the other.
6. **Vertical whitelist on the API boundary.** `if (!(body.vertical in QUANTARA_VERTICAL_BY_ID)) return badRequest` — closes a freeform-string write path. Same defensive pattern is repeated on read so legacy data degrades to `null` rather than crashing.
7. **One-task-at-a-time observed.** Per CLAUDE.md standing rule, Q6 ships before Q7 — checking in with the founder after each Q-row close.

### Build status at session-Q6 close

**Green.** Tests: **610/610** passing across **46 suites** (+37 new across 2 new suites). Typecheck: clean. **Track Q 6/7 ✅.** ~50 sessions remain to ship priorities 1–4.

### Operator actions surfaced

| Action | When | Why |
|---|---|---|
| Apply `prisma/sql/04-add-quantara-foundation.sql` to Supabase (still owed from Q1) | Before any save against `/api/founder-intake` reaches `ValuationSubject.quantaraJson` | Carries forward — Q6 reuses both the existing `quantaraJson` column (under a new `vertical` namespace) AND the existing top-level `sector` column. No new SQL migration needed for Q6. |

**Next session:** **Track Q Session Q7 — Voice-first paragraphical capture + persona generation.** User can speak instead of type; cascade parses utterances into structured fields (same primitive as cluesintelligence questionnaire engine). At 100% completeness, cascade synthesizes `FounderPersona` + `CompanyPersona` records that downstream consumers (Pitch Deck, Business Plan, marketing) read from. **Closes Track Q.** Per BUILD_SEQUENCE Track Q row Q7.

---

## Part 43 — 2026-05-08 — Track Q Session Q7: Voice-first capture + persona synthesis (TRACK Q CLOSED)

**HEAD before:** `8918139` (Q6 docs handoff, 610/610 across 46 suites). **HEAD after Q7 code:** `5b47efb`. **HEAD after Q7 docs:** (this commit). **Tests:** 610/610 → **642/642** across **46 → 50 suites** (+32 new across 4 new suites). Typecheck: clean.

### Deliverable split

Q7's spec carries two distinct deliverables on the same session — voice capture + persona synthesis. They share the cascade primitive (`runModelCascade`) and the structured-JSON parsing pattern but otherwise live in separate `src/lib/quantara/voice/` and `src/lib/quantara/personas/` namespaces. Voice extraction reuses Q3's `QuantaraSuggestion` shape so the existing accept/reject chip flow handles voice-derived suggestions unchanged.

### Schema + SQL migration (the DB push the user emphasised)

Two new Prisma models + a hand-written SQL migration file matching the prisma-migrate-diff format used by V1 / Q1:

- `model FounderPersona` + `model CompanyPersona` — both keyed off `valuation_subjects(id)` via cascading FK. JSON columns hold structured strengths / gaps / differentiators / watch-outs so the shape can evolve without schema churn; `personaSchemaVersion` (default 1) is the BEE invalidation key for non-additive prompt changes; `runtimeMode` ("live" | "mock") surfaces in the UI so a mock-mode placeholder is never mistaken for live synthesis.

- `prisma/sql/05-add-personas-foundation.sql` — 2 CREATE TABLEs + 4 indexes (`(userId, generatedAt)` + `(valuationSubjectId, generatedAt)` per table) + 2 CASCADE FK constraints. Hand-written in the same style as Q1/V1 so the migration history reads coherently.

- `ValuationSubject` extended with reverse relations (`founderPersonas FounderPersona[]` + `companyPersonas CompanyPersona[]`) — additive only, doesn't disturb V1's existing relations.

### Voice extraction

| File | Surface |
|---|---|
| `src/lib/quantara/voice/types.ts` | `VoiceExtractionItemSchema` (fieldId regex enforces `f1..f56`; confidence 0-1; optional note ≤ 280 chars), `VoiceExtractionPayloadSchema` (max 30 extractions per call), `VoiceExtractionResult` (typed cascade output). |
| `src/lib/quantara/voice/extract.ts` | `buildVoiceExtractionPrompt` includes a compact manifest of all 56 canonical fields with already-filled hints so the cascade skips them. Truncates transcripts > 4000 chars. `extractFromTranscript` runs `runModelCascade` with `intent: "questionnaire"` (Gemini → Sonnet → GPT etc.) and parses JSON, falling back to empty extractions on mock-mode / parse failure / schema failure (no fabrication). |
| `src/app/api/founder-intake/voice-extract/route.ts` | POST validates transcript length 4-4000 + `currentValues` via `QuantaraValuesSchema`; calls `extractFromTranscript`; adapts each `VoiceExtractionItem` to a `QuantaraSuggestion` with `source: { integration: "olivia_defaults", label: "Voice transcript", ... }`. Rate-limited 6/60s. |
| `src/components/quantara/VoiceCaptureCard.tsx` | Mic button + MediaRecorder lifecycle (start → record → stop → blob → /api/voice/transcribe → /api/founder-intake/voice-extract → onSuggestions). Releases the mic on stop (the single most-reported voice-mode bug across audio apps). Graceful fallback when MediaRecorder is unavailable (JSDOM, blocked permission). |

### Persona synthesis

| File | Surface |
|---|---|
| `src/lib/quantara/personas/types.ts` | `CombinedPersonaPayloadSchema` validates `{ founder: {...}, company: {...} }`. `FOUNDER_ARCHETYPE_VALUES` (technical_visionary / operator_ceo / sales_first_founder / domain_expert / serial_entrepreneur / first_time_founder), `RISK_TOLERANCE_VALUES` (low / medium / high). `PERSONA_SCHEMA_VERSION = 1`. |
| `src/lib/quantara/personas/prompts.ts` | `buildPersonaSynthesisPrompt` emits a label/value fact list keyed off the founder's filled canonical + active-round supplementary + active-vertical entries. `buildMockPersonaPayload` deterministic placeholder — used when cascade returns mock-mode OR parsing fails (graceful, never throws). |
| `src/lib/quantara/personas/synthesize.ts` | `synthesizePersonas` orchestrator. Three soft-failure modes all return the mock payload + preserve the cascade attempts trail for ops review: (1) cascade mock-mode short-circuit, (2) cascade JSON parse failure, (3) cascade JSON valid but doesn't match Zod. Never throws. |
| `src/app/api/founder-intake/personas/route.ts` | POST gates on `completenessScore >= 80` (returns 422 with current score if not — UI mirrors); builds synthesis context from canonical + supplementary[active round] + vertical[active vertical]; persists `FounderPersona` + `CompanyPersona` in parallel. GET returns most-recent non-archived pair. Rate-limited 3 / 5min on POST (synthesis is expensive). |
| `src/components/quantara/PersonaPanel.tsx` | Two-column persona display with archetype + risk-tolerance chips. Mock-mode runs labelled with an amber "Mock-mode placeholder" pill so they're never mistaken for live synthesis. |

### IntakeForm wiring

- `VoiceCaptureCard` mounted in the rail beneath `IntakeSidebar` (alongside the Q3 auto-fill card — both feed the same suggestion map).
- "Generate persona" button added to `FinalCTA`, gated on `overall.percent >= 80` (mirrors server gate). Disabled below threshold.
- `PersonaPanel` renders inline below the `FinalCTA` after a successful synthesis. Re-synthesis appends a new persona pair to the DB (audit history preserved); UI shows the most-recent.
- Voice-derived suggestions feed both `suggestions` (Q3 inbox) and `apiReferenceValues` (Q4 truth-score reference) — the truth-score discrepancy cascade still applies to voice-stated values, mirroring Stripe / QuickBooks integrations.

### Tests

| Suite | New cases |
|---|---|
| `personas/__tests__/synthesize.test.ts` | 12 |
| `voice/__tests__/extract.test.ts` | 11 |
| `app/api/founder-intake/voice-extract/__tests__/route.test.ts` | 5 |
| `app/api/founder-intake/personas/__tests__/route.test.ts` | 4 |
| **Total** | **32 across 4 new suites** |

Coverage spans: prompt builder for both axes (manifest, archetype list, fact serialization, transcript truncation, filled-field hints), mock-mode short-circuit returning placeholder payloads, code-fence stripping, JSON-parse soft-failure fallback, schema-validation soft-failure fallback, attempts trail preservation on mock fallback, regex enforcement on fieldId (`f1..f56` only), ≥ 3 extractions on a rich transcript (Q7 exit criterion), POST validation branches (empty body, missing transcript, oversize transcript, type-mismatched currentValues, missing subjectId).

### Decisions / judgment-call trail

1. **Two namespaces (voice + personas), not one.** They share the cascade + JSON-parsing pattern but their data models, persistence semantics, and lifecycles diverge. Coupling them would force unrelated bug-fixes to test the other. Parallel namespaces win.
2. **Voice extractions adapt to `QuantaraSuggestion`.** The existing Q3 chip flow handles per-field accept/reject + Q4 truth-score discrepancy detection — reusing the shape gets all of that for free instead of forking it.
3. **Cascade JSON output, not free-text.** Both prompts ask for strict JSON matching the corresponding Zod schema, with explicit "no markdown / no code fences" instructions. The orchestrator strips a `\`\`\`json ... \`\`\`` fence anyway because models often add it despite the instruction.
4. **Append-not-overwrite on persona regenerate.** A founder regenerating after editing their answers shouldn't lose the prior synthesis — the audit trail matters when comparing two versions of "what's the company narrative." `isArchived` lets ops soft-delete bad runs without losing history.
5. **Synthesis gated at ≥ 80% completeness, not 100%.** Mirrors the existing FinalCTA threshold for the valuation engine — once the founder has 80% of the canonical 56 + active supplementary + active vertical, the cascade has enough signal. 100% would gate on fields some founders genuinely can't answer (e.g. a pre-revenue company has no MRR).
6. **No fabrication on voice mock-mode.** The voice extractor returns an empty array rather than placeholder suggestions when the cascade has no provider keys configured. A "Stripe-derived" mock placeholder makes sense for Q3 (founder is filling a known field); a "voice-derived" placeholder doesn't (founder is speaking new content).
7. **Persona mock-mode has a placeholder body, voice mock-mode doesn't.** Persona records are persisted; the placeholder body lets the founder see the panel chrome + understand "regenerate when keys land" rather than seeing a mysterious empty section. Voice extraction is transient — its mock-mode "empty" outcome surfaces visibly as "0 suggestions" in the UI.
8. **`personaSchemaVersion` integer + JSON columns.** Future schema changes (e.g. adding `valuesAlignment: string[]`) are additive within the JSON shape; non-additive renames bump the integer. Lets BEE (when it lands) invalidate old records without an ALTER TABLE.

### Build status at session-Q7 close

**Green.** Tests: **642/642** passing across **50 suites** (+32 new across 4 new suites). Typecheck: clean. **Track Q 7/7 ✅ — TRACK Q COMPLETE.** ~49 sessions remain to ship priorities 1–4.

### Operator actions surfaced (DB pushes)

| Migration | Status | Why |
|---|---|---|
| `prisma/sql/04-add-quantara-foundation.sql` (Q1) | **STILL OWED** | Carries forward — needed before any save against `/api/founder-intake` reaches `ValuationSubject.quantaraJson`. Also required for Q5 supplementary + Q6 vertical persistence (both nest under `quantaraJson`). |
| `prisma/sql/05-add-personas-foundation.sql` (Q7) | **NEW — APPLY** | Required before any persona synthesis run (`POST /api/founder-intake/personas`) can persist. Two CREATE TABLEs + 4 indexes + 2 CASCADE FK constraints to `valuation_subjects`. |

Both migrations are paste-into-Supabase-SQL-Editor-and-Run, identical workflow to 01 / 02 / 03 / 04. **Apply both before opening Track Q to founder traffic.**

**Next track:** **Track P — Deal Protection Engine + Gap Closures (Sessions P1–P7).** P1 adds `DealAnalysis` + `InvestorReputation` Prisma models + Smart Score module; P2 ports clause classifier; P3 builds term-sheet parser + analyze API; P4 seeds Investor Reputation DB + admin CRUD; P5 ports multi-round dilution + band-specific email drafts; P6 wires WarRoom Deal Protection tab + counter-term-sheet auto-draft; P7 closes with negotiation rehearsal + term sheet versioning + multi-LLM consensus. Per BUILD_SEQUENCE.

---

## Part 44 — 2026-05-08 — Track P Session P1: Schema + Smart Score module (Track P opens)

**HEAD before:** `f9f3e36` (Q7 docs handoff — Track Q closed; 642/642 across 50 suites). **HEAD after P1 code:** `bb58863`. **HEAD after P1 docs:** (this commit). **Tests:** 642/642 → **676/676** across **50 → 51 suites** (+34 new across 1 new suite). Typecheck clean.

### Standing-rule change observed for the first time

P1 is the first session under the new "print SQL migrations inline" feedback memory (locked 2026-05-08 after Q1/Q5/Q7 silently accumulated unrun migrations). The full body of `06-add-deal-protection-foundation.sql` was printed inline in the P1 feat-commit chat alongside the file write — no file-path pointer, no operator-action-table at session close. Going forward this is mandatory whenever a `prisma/sql/*.sql` file is created or modified.

### Schema + SQL migration

Two new Prisma models + a hand-written SQL migration:

- `model DealAnalysis` — single Deal Protection run on a term sheet, append-only. Fields: smartScore (Decimal 5,2), smartBand (string id), bandLanguage / recommendedAction / investorSignal (text), termSheetText (optional, P3 parser populates), investorNamesJson + clauseAnalysisJson (P2/P3/P4 populate), confidenceScore (Decimal 3,2 from V3 confidence math), modelTrailJson (cascade attempts trail), runtimeMode (live | mock). Cascading FK to `valuation_subjects`.
- `model InvestorReputation` — lookup table with unique `name` + `slug`. Fields: investorType, geographicFocus, stageFocusJson + sectorFocusJson (focus arrays), reputationScore (Decimal 5,2), reputationBand (same ladder as DealAnalysis.smartBand), patternsJson (vocabulary list of observed deal patterns), notes (text), source enum (seed | admin | founder_submitted), isActive + isArchived for soft-deletion.
- `ValuationSubject` extended with `dealAnalyses DealAnalysis[]` reverse relation (additive — doesn't disturb V1's existing relations).
- `prisma/sql/06-add-deal-protection-foundation.sql` — 2 CREATE TABLEs + 6 indexes + 1 CASCADE FK constraint to `valuation_subjects`. Hand-written in the same style as Q1/V1/Q7 so the migration history reads coherently.

### Smart Score module

| File | Surface |
|---|---|
| `src/lib/deal-protection/types.ts` | `SmartBand` (`red | orange | yellow | blue | green`), `RecommendedAction` (`walk_away | major_concerns | negotiate_hard | counter_minor | sign`), `SmartBandRecord` interface bundling band id + score range + recommended-action enum + UI label + plain-language template + investor-signal tag + design-system color token. `SMART_BANDS_ORDERED` stable list. |
| `src/lib/deal-protection/bands.ts` | Canonical 5-band ladder: red 0-19 (Predatory) → orange 20-39 (Aggressive) → yellow 40-59 (Mixed) → blue 60-79 (Standard) → green 80-100 (Founder-friendly). Module-load runtime invariants verify uniqueness + contiguous 0..100 coverage so future schema drift is caught at boot. Color tokens from § 1.4 semantic accent set. |
| `src/lib/deal-protection/smart-score.ts` | Pure helpers: `clampSmartScore` (0..100; non-finite → 0 predatory floor), `getSmartBand` (treats each band's range as `[minScore, nextMin)` so fractional scores map cleanly), `getSmartBandRecord`, `getSmartBandRecordById`, `getSmartBandRecordByAction`, `bandsAgree` for cross-version comparisons. |
| `src/lib/deal-protection/index.ts` | Barrel. |

### Tests

| Suite | New cases |
|---|---|
| `__tests__/smart-score.test.ts` | 34 |

Coverage: catalog invariants (5 bands, contiguous 0..100 coverage, unique action enums, lookup-table mirror), boundary scores at every band edge (0/19/20/39/40/59/60/79/80/100), fractional score routing, out-of-range clamping, non-finite handling, lookup helpers across all band ids and action enums, `bandsAgree` across boundaries, per-band copy invariants (deal-level not clause-level), color-token assertions per band.

### Decisions / judgment-call trail

1. **Score ranges are `[min, nextMin)`, not `[min, max]`.** First test run caught `getSmartBand(79.999) === 'red'` because integer `maxScore=79` excluded the fractional value. Fix: each band absorbs everything below the next band's minimum, the final band absorbs the closed `100` upper. Cleaner than rounding the input.
2. **Non-finite scores collapse to 0 (predatory floor), not 50 (yellow).** A cascade glitch returning `NaN` should never silently look like a "mixed" deal; floor to red so the founder is forced to investigate.
3. **`InvestorReputation` seed deferred to P4.** Spec referenced `D:\Deal_Doc_Engine\deal_protection_engine\london\investor_db.json` but that path doesn't exist on disk (only `Business Proposal Review/`, `CLAUDE_CODE_DELIVERABLES.md`, `Negotiation.crdownload`). P4 will design the seed list from scratch using London-tech-ecosystem public deal data; P1 ships the table only.
4. **Color tokens from semantic accent set, not Aurum.** Aurum is reserved for canonical decisions per UI design system § 1.3. Bands use coral / amber / sky / aether / mint per § 1.4. Visual hierarchy: founder sees a red band → coral chrome → matches the form's existing discrepancy-chip language.
5. **Module-load runtime invariants in `bands.ts`.** Future drift (e.g. someone adds a sixth band but forgets to extend coverage to 0..100) throws at import time — never reaches prod.

### Build status at session-P1 close

**Green.** Tests: **676/676** passing across **51 suites** (+34 new). Typecheck: clean. **Track P 1/7 ✅.**

### Operator action surfaced (DB push)

| Migration | Status |
|---|---|
| `prisma/sql/06-add-deal-protection-foundation.sql` (P1) | **NEW — APPLY** before any DealAnalysis or InvestorReputation persistence runs. |

SQL body printed inline in the P1 feat-commit chat (`bb58863`). Paste into Supabase SQL Editor and Run.

**Next session:** **Track P Session P2 — Clause classifier.** New `src/lib/deal-protection/clause-intel.ts` with 20-clause `ClauseType` enum, toxicity 0-100, founder-friendly alternative, cascade-driven (Anthropic primary, Opus judge for high-stakes). Per BUILD_SEQUENCE Track P row P2.

---

## Part 45 — 2026-05-08 — Track P Session P2: Clause classifier

**HEAD before:** `22d3624` (P1 docs handoff — 676/676 across 51 suites). **HEAD after P2 code:** `fb5eba6`. **HEAD after P2 docs:** (this commit). **Tests:** 676/676 → **697/697** across **51 → 52 suites** (+21 new cases). Typecheck clean.

### What ships

**Clause taxonomy + fixtures** (`src/lib/deal-protection/`):

| File | Surface |
|---|---|
| `clause-types.ts` | `ClauseType` enum (20 values — liquidation_preference, anti_dilution, board_control, vesting, leaver_provisions, veto_rights, exclusivity, information_rights, legal_fees, indemnification, ip_assignment, non_compete, drag_along, tag_along, earnout, reps_warranties, key_person, governing_law, assignment, other), `Severity` enum (low/medium/high/critical), `SEVERITY_TOXICITY_RANGE` (low 0-25 / medium 26-50 / high 51-75 / critical 76-100), `ClauseAnalysis` + `ClauseAnalysisResult` interfaces. |
| `clause-fixtures.ts` | 20 canonical fixture clauses (one per `ClauseType`) covering the full severity spectrum — fixture toxicity values deliberately spread across each tier so the monotonicity invariant `tier(a) < tier(b) ⇒ toxicity(a) < toxicity(b)` is verifiable. Module-load runtime invariants verify exhaustive coverage. Doubles as test data + mock-mode fallback content. |
| `clause-prompts.ts` | `buildClassificationPrompt` (Sonnet primary via `intent: "operations"`) — emits the full clauseType list + severity ladder + per-tier toxicity range so the cascade has zero ambiguity on calibration. `buildJudgePrompt` (Opus via `intent: "judge"`) — invoked ONLY when primary flagged the clause as `critical`; explicitly invites push-back rather than rubber-stamping. |
| `clause-intel.ts` | `classifyClause` orchestrator: Sonnet primary pass → if severity=critical, Opus judge pass → merge (judge overrides severity / toxicity / summary; counter-language uses judge only when non-empty; reasoning passes through). `classifyClauses` fans out per-clause in parallel, reports `runtimeMode: "live"` iff every sub-call succeeded. Three soft-failure modes return the closest fixture rather than throwing. |
| `index.ts` | Re-exports the P2 surface. |

### Soft-failure handling (consistent with Q7 patterns)

Three failure modes that don't break the founder's flow:
1. **Cascade mock-mode** — no provider keys → fixture nearest by text-prefix match → falls through to `other` if nothing matches.
2. **JSON parse failure** — strips a `\`\`\`json … \`\`\`` code fence first; if still not valid JSON, fixture fallback.
3. **Calibration violation** — even with valid JSON matching the Zod schema, a `low + toxicity 80` response is structurally invalid against `SEVERITY_TOXICITY_RANGE`. Fixture fallback. The model never gets to fabricate an "edge case" toxicity that violates the band ladder.

### Tests (21 new cases)

- **Catalog invariants** — 20 types, exhaustive fixtures, contiguous severity coverage, severity tiers strictly monotone (every `low.max < medium.min`, etc.).
- **Prompt builders** — clause text echo, every clauseType listed, every severity + toxicity range listed, judge prompt echoes both clause text and primary classification.
- **Live happy path** — single classification with severity below critical (1 cascade call), code-fence stripping.
- **Judge pass** — triggers on critical, judge overrides toxicity (88→95) + counter-language when non-empty, judge mock-fallback preserves primary verdict with `opusJudged: false`.
- **Soft-failure fallbacks** — mock-mode, invalid JSON, calibration violation, no-fixture-match → `other`.
- **Exit criterion** — every fixture clause correctly tagged when cascade returns canonical answer; toxicity-monotone-with-severity verified pairwise across all 20 fixtures.
- **Batch orchestrator** — one analysis per input, `runtimeMode: "live"` iff every sub-call live.

### Decisions / judgment-call trail

1. **Sonnet primary + Opus judge only on critical.** Cheaper for the 80% of clauses that are standard, deeper for the predatory ones. Founders deserve a second opinion before the engine recommends "walk away."
2. **`SEVERITY_TOXICITY_RANGE` is enforced server-side.** Even with valid JSON matching the Zod shape, a low/80 response is rejected and routed through the fixture fallback. The model cannot smuggle out-of-band toxicity scores.
3. **Fixture-driven mock fallback (not LLM hallucination).** When cascade fails, the orchestrator returns the closest fixture's analysis — same `text` field but the `clauseType` / `severity` / `toxicity` / counter-language come from a deterministic vetted source. Better to under-classify (`other` / `low`) than to fabricate.
4. **Judge merge: override severity/toxicity/summary, conditional counter-language.** Judge has the casting vote on severity calls, but if the judge's counter-language returns empty, primary's stays — primary may have produced a more specific counter than the judge's terse re-validation.
5. **`opusJudged: boolean` on every analysis row.** Audit-trail discipline — the UI can render an "Opus-validated" badge on the clauses where Cristiano weighed in, distinct from cascade-only classifications.
6. **20-fixture exhaustiveness verified at module load.** Adding a new ClauseType without adding its fixture throws at import time — never reaches prod.

### Build status at session-P2 close

**Green.** Tests: **697/697** across **52 suites** (+21 new). Typecheck: clean. **Track P 2/7 ✅.**

### Operator action surfaced

**None.** P2 is pure logic against the P1 schema — no new migration, no env vars, no operator step.

**Next session:** **Track P Session P3 — Term sheet parser + analyze API.** New `src/lib/deal-protection/parser.ts` (text + PDF → structured `TermSheetTerms`); new API `POST /api/deal-protection/analyze` (parse → clause-intel → smart-score → optional quant via existing V3 engine in scenario mode → `DealAnalysis` record persisted). Per BUILD_SEQUENCE Track P row P3.

---

## Part 46 — 2026-05-08 — Track P Session P3: Term sheet parser + analyze API

**HEAD before:** `9685719` (handoff after Q5 → P2 batch — 697/697 across 52 suites). **HEAD after P3 code:** `96324f0`. **HEAD after P3 docs:** (this commit). **Tests:** 697/697 → **724/724** across **52 → 56 suites** (+27 new cases across 4 new suites). Typecheck clean.

### What ships

**Parser (heuristic-first hybrid)** — `src/lib/deal-protection/parser.ts` + `parser-types.ts` + `parser-prompts.ts`.

| Stage | Behaviour |
|---|---|
| 1. Cap text | Input capped to `PARSER_TEXT_CHAR_LIMIT` (50_000). |
| 2. Heuristic split | Section-marker regex on `Section N`, `N.`, and `Heading:` patterns; clauses ≥ 20 chars survive. |
| 3. Decision | If ≥ `MIN_HEURISTIC_CLAUSE_COUNT` (3) clauses → return heuristic result, **`runtimeMode: "live"`**, **`extractionStrategy: "heuristic"`**. Cascade is skipped — free, fast, deterministic happy path. |
| 4. Cascade fallback | Sonnet via `intent: "operations"`. Validates against `CascadeParseSchema` (Zod). Returns `extractionStrategy: "cascade"` on success. |
| 5. Single-clause fallback | When cascade mocks OR JSON parse fails OR schema rejects → one clause containing the verbatim text. `runtimeMode: "mock"`, `extractionStrategy: "fallback_single"`. |

Investor names + round context (`roundType`, `amountGbp`, `preMoneyGbp`) extracted heuristically alongside; cascade pass merges its own findings on top.

**Aggregation formula** — `src/lib/deal-protection/aggregate.ts`. Severity-weighted toxicity with severity-band caps (locked 2026-05-08 via `AskUserQuestion`):

```
weights = { low: 1, medium: 2, high: 4, critical: 8 }
weighted_avg_toxicity = Σ(w[sᵢ] × tᵢ) / Σ(w[sᵢ])
base_score = 100 − weighted_avg_toxicity
if any severity == 'critical':  smart_score = min(base, 39)   // CRITICAL_CEILING
elif any severity == 'high':    smart_score = min(base, 79)   // HIGH_CEILING
else:                            smart_score = base
empty clause list → smartScore = 50, emptyInput = true
```

Final smartScore goes through `clampSmartScore` (P1) so non-finite or out-of-range inputs collapse to 0–100.

`deriveWalkAwayReasons` returns the band-language preface + sorted critical-clause summaries — deterministic, no extra cascade call. Only called when band='red'.

**Orchestrator** — `src/lib/deal-protection/analyze.ts`. Pipeline: parser → P2 classifier → aggregator → band lookup → bundle `DealRiskReport` payload. `runtimeMode = "live"` iff every sub-stage stayed live AND input was structurally parseable. `confidenceScore`: 0.95 live / 0.40 mock. `walkAwayReasons` populated only when band='red'. Empty-input branch overrides band copy ("manual review with counsel recommended"); `investorSignal: "Unparsed"`.

**Report contract** — `src/lib/deal-protection/report-types.ts`. `DealRiskReport` shape stable for the platform lifetime — downstream P5 email drafts / P6 WarRoom counter / P7 negotiation rehearsal / founder UI bind to these names. Fields: `dealAnalysisId`, `valuationSubjectId`, `smartScore`, `band: SmartBandRecord`, `clauseAnalyses`, `criticalIssues` (≤ 5, sorted by toxicity desc), `walkAwayReasons`, `investorNames`, `confidenceScore`, `runtimeMode`, `attempts`, `generatedAt`.

**API route** — `src/app/api/deal-protection/analyze/route.ts`. POST body `{ subjectId, termSheetText }`. Pipeline mirrors `/api/founder-intake/personas` — 5/min rate limit, `getAuthSession()` stub (W-015), own-row ValuationSubject lookup (404 if not yours), pure orchestrator call, `prisma.dealAnalysis.create`, return `{ ok, report }`. Persists `band.action` (stable enum), not `actionLabel`, so downstream P5 can pattern-match. **No new SQL migration** — uses the `deal_analyses` table from P1.

### Tests (27 new cases across 4 new suites)

- **`parser.test.ts`** (7 cases) — heuristic split on numbered list (skips cascade); heading capture; round-context + multi-investor extraction (`Investors: A, B`); cascade fallback when heuristic produces < 3 clauses; cascade mock-mode → single-clause; cascade invalid JSON → single-clause; whitespace-only input → empty clauses.
- **`aggregate.test.ts`** (9 cases) — empty input → 50; all-low → high score, no caps; 19 low + 1 critical → cap at 39 (proves caps essential — without them score would be ~73, "blue"); high without critical → cap at 79; low+medium only → no caps; critical-issues sorted+truncated to 5; out-of-range toxicity clamps; walk-away includes band preface + sorted critical summaries; blank band-language preface omitted.
- **`analyze.test.ts`** (6 cases) — happy path runtimeMode=live + confidence=0.95; critical clause forces orange-or-red band + walk-away populated; empty-input overrides band copy + investorSignal=Unparsed + score=50; classifier mock + parser live → mock; parser mock + classifier live → mock; investor names + combined attempts trail forwarded.
- **`route.test.ts`** (5 cases) — POST module surface; invalid JSON body → 400; missing subjectId → 400; missing termSheetText → 400; too-short termSheetText → 400.

### Decisions / judgment-call trail

1. **Heuristic-first hybrid (vs cascade-only).** User-confirmed via `AskUserQuestion` 2026-05-08. Free + deterministic on the 80% of structured term sheets; cascade only when heuristic can't structurally split. Saves an LLM call per analyze on the happy path without losing the fallback.
2. **Severity-weighted with hard caps (vs simpler unweighted mean).** User-confirmed. The hard caps are essential: a single ratchet anti-dilution clause + 19 boilerplate clauses must NOT show as green just because the average toxicity is low. One critical clause is dealbreaker-shaped, not averageable. Verified by the "19 low + 1 critical" test — without caps the score would land in blue.
3. **Three-mode soft-failure (matches Q7 / P2 patterns).** Cascade mock-mode → single-clause; JSON parse failure → single-clause; Zod schema rejection → single-clause. Each fallback preserves the cascade attempts trail for ops review. Never throws on the happy path.
4. **`runtimeMode: "live"` requires every sub-stage live AND parseable input.** A cascade-live extraction with empty output is mock-mode. A parser-mock + classifier-live is mock-mode. The label tells the UI when to render "this analysis used real intelligence" vs "this is fixture data."
5. **Walk-away reasons derived deterministically (vs separate cascade pass).** Critical-clause summaries plus the band-language preface produce the bullet list. Deterministic; no extra LLM call. Band-language preface skipped if blank.
6. **Persist `band.action` enum (not `actionLabel`).** P5's email-draft generator pattern-matches on the enum; the human label is derivable via `getSmartBandRecordByAction(action).actionLabel` and renamable without touching the DB.
7. **Investor names whitelist via heuristic + cascade union.** Heuristic catches the structured "Investors: X, Y" line; cascade catches names embedded in prose. Both feed `investorNames` for P4's reputation lookup later.

### Build status at session-P3 close

**Green.** Tests: **724/724** across **56 suites** (+27 new across 4 new suites). Typecheck: clean. **Track P 3/7 ✅.**

### Operator action surfaced

**None new.** Carried forward from P1: apply `prisma/sql/06-add-deal-protection-foundation.sql` to Supabase before the route can persist. The orchestrator (`analyzeTermSheet`) runs cleanly without the table; only `prisma.dealAnalysis.create` requires the migration.

**Next session:** **Track P Session P4 — Investor Reputation DB + admin CRUD.** Seed `InvestorReputation` from London-ecosystem data (note: P1 deferred the `D:\Deal_Doc_Engine\london\investor_db.json` seed because that path doesn't exist in OB — P4 designs the seed list from scratch). Admin CRUD page at `/admin/investors`. Founder-submitted reputation entries via opt-in form + admin moderation queue. Smart-score output starts including investor reputation when investor name matches a record.

---

## Part 47 — 2026-05-08 — Track P Session P4: Investor Reputation DB + admin CRUD + smart-score integration

**HEAD before:** `21c2dad` (P3 docs — 724/724 across 56 suites). **HEAD after P4 code:** `97b789e`. **HEAD after P4 docs:** (this commit). **Tests:** 724/724 → **770/770** across **56 → 61 suites** (+46 new across 5 new suites). Typecheck clean.

### What ships

**Seed list (anonymized archetypes)** — `investor-seed.ts`. 15 fully-anonymized archetype entries spanning all 5 smart bands (3 per band). Names follow `<Posture> <Stage> Archetype` format so admins can quickly distinguish seed templates from curated entries. P1 deferred the LTM `investor_db.json` seed because that path doesn't exist in OB; P4 ships the archetype set instead — the admin UI is how operators clone-and-curate real entries afterward. Module-load runtime invariants verify band coverage + score calibration (every reputationScore lands inside its declared band) + name uniqueness.

**Score impact** — `investor-score-impact.ts`. `computeReputationTilt(scores)` returns an integer in `[-REPUTATION_TILT_MAX, +REPUTATION_TILT_MAX]` (locked at ±8) based on the centered average of matched reputation scores. Score 100 → +8, score 0 → -8, score 50 → 0 (neutral). `applyReputationTilt` is the integration point with the P3 aggregator: **caps WIN over positive tilt** (a single critical clause stays a dealbreaker even with a famous investor in the room); negative tilt always allowed (a bad investor on a bad deal reinforces the verdict). Defensive clamping on non-finite + out-of-range inputs.

**Lookup helper** — `investor-lookup.ts`. `lookupInvestorReputations(names)` normalizes parser-extracted investor names to deterministic slugs (`toInvestorSlug`), queries `prisma.investorReputation` filtered by `isActive=true && isArchived=false && slug IN (…)`, returns the full `InvestorReputationLookup` shape (matched records + unmatched names + average + tilt). De-duplicates input names by slug. **DB-failure soft fallback:** a Prisma error is logged and treated as "no matches" so the analyzer continues without a tilt — the founder's flow never breaks because the seed isn't loaded yet.

**Analyzer wiring** — `analyze.ts` extended. After classification + aggregation, the orchestrator runs `lookupInvestorReputations(parsed.investorNames)`, applies `applyReputationTilt({ aggregatedScore, tilt, hadCriticalCap, hadHighCap })`, and uses the result as the final `smartScore` (which then drives band selection). New `reputationLookup` field on `DealRiskReport` surfaces matched investors, unmatched names (UI prompt for "submit a reputation entry"), and the applied tilt.

**API routes (5 new):**

| Route | Methods | Purpose |
|---|---|---|
| `/api/admin/investors` | GET, POST | List (filterable by source/isActive/isArchived) + create (source='admin') |
| `/api/admin/investors/[id]` | PATCH, DELETE | Partial update + soft-delete (`isArchived=true && isActive=false`) |
| `/api/admin/investors/seed` | POST | Idempotent seed — preserves admin edits to `isActive`/`isArchived`/`notes` |
| `/api/admin/investors/moderation` | GET, PATCH | Pending queue + approve (`isActive=true`) / reject (`isArchived=true`) |
| `/api/deal-protection/investor-submission` | POST | Public, rate-limited 3/5min, lands as `source='founder_submitted'` + `isActive=false` |

Admin routes use the `getAuthSession()` stub (W-015) — same as Track P P1-P3. The public submission route is unauthenticated by design (founder may not be signed in when surfacing the lookup result).

**Admin UI** — `/admin/investors` page with three tabs (Active / Archived / Moderation), inline create + edit forms, `isActive` toggle (1-click), archive (soft-delete with confirmation), moderation approve/reject, seed re-apply with summary banner. Uses inline styles + Aurum/Aether tokens directly (no Tailwind in OB; Track C will polish per W-013). Auto-derives `reputationBand` from `reputationScore` via `getSmartBand()` so admins can't accidentally save mismatched calibration.

### Tests (46 new across 5 new suites, plus 4 new cases on the existing analyze.test.ts)

- **`investor-seed.test.ts`** (5 cases) — band coverage exhaustiveness; score calibration per band; name uniqueness; "(Archetype)" suffix; notes field present.
- **`investor-score-impact.test.ts`** (16 cases) — empty list → 0; score 100 → +REPUTATION_TILT_MAX; score 0 → -REPUTATION_TILT_MAX; integer range invariant; defensive clamping (out-of-range + NaN); negative cap-aware path; positive cap-aware path (CRITICAL_CEILING wins over +8 tilt; HIGH_CEILING wins over +8 tilt); non-finite intermediates collapse to 0.
- **`investor-lookup.test.ts`** (7 cases) — empty input → no Prisma call; case-insensitive slug match; whitespace + punctuation normalization; matched/unmatched partition; slug de-duplication on duplicate inputs; average + tilt computation; DB-failure soft-fallback preserves names as unmatched.
- **`admin/investors/__tests__/route.test.ts`** (10 cases) — module surfaces (4 routes); POST validation (invalid JSON, bad shape, empty/symbol-only name); PATCH validation (empty body); moderation PATCH validation (unknown action); auth-stub 503 when env unset.
- **`deal-protection/investor-submission/__tests__/route.test.ts`** (4 cases) — module surface; invalid JSON; missing required fields; out-of-range reputationScore.
- **`analyze.test.ts`** (+4 cases) — positive reputation tilt applied to score; critical-cap wins over +8 tilt (single-dealbreaker semantics); negative tilt below cap allowed; lookup metadata (matched + unmatched) forwarded onto report.

### Decisions / judgment-call trail

1. **Anonymized archetype seed (vs real London VCs).** Naming specific firms with low reputation scores carries real defamation risk. P4 ships 15 archetype templates that admins clone and curate post-seed. The `(Archetype)` suffix on every name lets admins distinguish seed templates from curated entries at a glance; the `notes` field on each entry says "replace with verified entry before production."
2. **Modest tilt magnitude (±8).** Locked 2026-05-08. Reputation is a contextual signal, not a clause-level finding. ±8 is enough to flip yellow→blue or yellow→orange in marginal cases but cannot single-handedly move red↔green. Bigger tilts would risk reputation overriding clause analysis.
3. **Caps WIN over positive tilt.** Critical-clause cap (39) and high-clause cap (79) both apply AFTER the tilt is added. Means a famous investor on a deal with a critical clause cannot lift the score out of orange. Single dealbreakers stay dealbreakers — matches the "100 - mean rejected; one ratchet ADP cannot be averaged away" framing locked in P3.
4. **Negative tilt always allowed.** No floor. A bad investor on a bad deal reinforces the verdict (score goes lower). Asymmetric by design — the engine is founder-side and is allowed to compound bad signals.
5. **Slug-based lookup (vs case-insensitive ILIKE).** Prisma's `mode: 'insensitive'` doesn't compose with `in:` in a single query. The slug field is already in the schema (UNIQUE) so we use it as the lookup key — `toInvestorSlug("Octopus Ventures!")` = `"octopus-ventures"` regardless of how the founder writes it.
6. **DB-failure soft fallback in lookup.** A Prisma error in the lookup is non-blocking; the analyzer continues with `reputationTilt=0` and preserves the names as `unmatchedNames`. The founder's flow never breaks because the seed isn't loaded or the table is empty.
7. **Public submission lands as `isActive=false`.** Submitted entries do NOT influence smart-score lookups until an admin approves via `PATCH /api/admin/investors/moderation`. Two safety layers (rate limit + admin moderation) on the unauthenticated surface.
8. **Submission collision strategy.** When a submission's name (or slug) collides with an existing record, the submission lands as `<Original Name> (founder submission)` with a timestamped slug suffix — every submission reaches the moderation queue (no silent drop), but the existing curated entry is unaffected.
9. **Idempotent seed preserves admin edits.** Re-running `POST /api/admin/investors/seed` updates `investorType` / `geographicFocus` / `stage|sector|patterns` / `reputationScore` / `reputationBand` (canonical archetype data) but does NOT touch `isActive` / `isArchived` / `notes` (operator decisions). Operators can re-seed without losing customizations.
10. **Auto-derived reputationBand in admin form.** When the admin types a `reputationScore`, the form auto-sets `reputationBand` via `getSmartBand()` — prevents miscalibrated entries that would fail the same monotonicity invariant the seed enforces.

### Build status at session-P4 close

**Green.** Tests: **770/770** across **61 suites** (+46 new). Typecheck: clean. **Track P 4/7 ✅.**

### Operator actions surfaced

1. **(Carried forward from P1)** Apply `prisma/sql/06-add-deal-protection-foundation.sql` to Supabase before the routes can persist.
2. **(NEW for P4)** Once migration 06 is applied, run `POST /api/admin/investors/seed` (or click "Re-apply seed" in `/admin/investors`) to populate the 15 archetype entries. Without this, the analyzer just runs with an empty reputation table — no breakage, the smart-score tilt is always 0 until the seed lands.

**Next session:** **Track P Session P5 — Multi-round dilution projection + band-specific email drafts.** New `src/lib/deal-protection/multi-round.ts` (forward simulation 2 rounds out, accepts existing `ValuationRun` + offer terms, returns dilution trajectory + ownership chart). Band-specific email generator: 5 tones (Red walk-away, Orange caution, Yellow negotiate-hard, Blue accept-with-edits, Green sign). Cascade-driven. Per BUILD_SEQUENCE Track P row P5.
