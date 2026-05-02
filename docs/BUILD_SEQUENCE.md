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

## Done — Sessions 1–3 (status as of HEAD `e5d17d6`)

| # | Track | Outcome |
|---|---|---|
| 1 | LiveAvatar server-side | Session token + start endpoints, ElevenLabs PCM bridge, rate-limit + admin-key gate. |
| 2 | LiveAvatar browser port | `OliviaVideoAvatar.tsx` + `OliviaProvider.tsx` ported byte-for-byte from LTM. `/test-avatar` smoke page. |
| 3 | Bridge contract + first two providers | Vitest infra. `OliviaSelfProvider` (Supabase). `LtmKnowledgeProvider` (LTM `/api/v1/organizations` + `/api/v1/districts`). 76 passing tests, `tsc --noEmit` clean. |

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
| **4** | `/api/olivia/chat` route on Olivia Brain. Single-provider first (Anthropic Sonnet 4.6 via `@ai-sdk/anthropic`). Persistence to `conversations` + `conversation_turns`. AbortSignal+timeout + Langfuse trace. | `POST /api/olivia/chat { message }` returns a typed reply, persists turns, emits a Langfuse trace. Test against the unconfigured path (no API key) returns a clean fallback. |
| **5** | Cascade: extend `/api/olivia/chat` to use the existing 9-model cascade in `src/lib/services/`. Intent router → LangGraph node → fallback chain. Companies House + Kimi providers added per `MERGE_PLAN.md` Phase 2. | One chat call walks the cascade; second call from an unrelated session does not; failover from `claude-sonnet-4-6` → `gpt-5.4-pro` works in a forced-fault test. |
| **6** | Wire `OliviaProvider.sendMessage` to the new route. The `/test-avatar` smoke page now demonstrates a full conversation: type → cascade → reply → ElevenLabs → LiveAvatar lip-syncs. | Live demo: ask Olivia anything in the smoke page, she answers in voice + face. |

### Track B — Studio engine port (Sessions 7–8)

LTM has a working Studio. The job is **copy the engine** out of LTM into this repo. UI shell rewrite is Track C; this track only does engine + supporting components.

See `STUDIO_PORT_MANIFEST.md` for the full file-by-file plan.

| Session | Deliverable | Exit criterion |
|---------|-------------|----------------|
| **7** | Port `src/lib/studio/{types,entityModes,questionMapper}.ts` (3 files, 616 LOC) and `src/components/documents/*` (37 files, 6,172 LOC) from LTM into Olivia Brain at the equivalent paths. LTM stays untouched. | The 17 document block components render in isolation (Vitest snapshot). `mapBlocksToQuestions()` round-trips a document blueprint. |
| **8** | Port the Studio v1 engine pieces: `PreparationStudio.tsx` and the engine-side components (StudioAnswerEditor, StudioFormattingToolbar, PitchPolishModal, SuggestionChips, WhyThisPanel, DeepResearchPanel, ResearchHistory, EntityBriefCard, EntityPerspectiveModal, MicroReward, SkipNudgeModal, CompletionCeremony, DocumentTransition, PreSubmitCheck, CristianoReEvaluation, AnswerRibbon, StoryReview). Stripped of LTM-specific data dependencies — all data flows through bridge providers. | Mounting `<PreparationStudio>` at `/studio/[id]` renders the engine against a stub document. No runtime errors. Tests cover sequencer, save, navigation. |

### Track C — Studio UI rebuild (Sessions 9–14)

Replace Studio v1's "fucking hideous UI" (and the half-finished v2 wrapper) with the GrandMaster prototype shell. Engine stays. UI dies.

Reference: `STUDIO_OLIVIA_DESIGN.md` — every primitive, layout, state shape, interaction.

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
| **24** | Test 3 tenants: clueslondon-prod (embedded), tampa-brokerage (standalone), demo-acme (white-labeled). Per-tenant adapter overrides (one real adapter). Per-tenant model overrides. Entitlements (Free tier blocks `/api/avatar/generate`). Stripe billing wired into entitlements via webhook. |

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
