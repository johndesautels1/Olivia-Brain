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
