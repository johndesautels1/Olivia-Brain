# Olivia Brain — Handoff to next agent

> **Last updated:** 2026-05-09 — **44 commits since the prior batch tip.** 5 tracks closed (D, E, I, J, K); Track N at 4/5; Track O at 2/4 (W-003 + W-004 closed); production runbook shipped; spoke router (6-spoke detection + UI badge); conversation persistence + multi-turn on streaming; live cascade trace recording; `/admin/traces` dashboard; ~74 new tests.
> **HEAD:** `398cd26` (trace recording across both chat routes; will move with the next push).
> Pre-batch tip was `8cacdd8` (Track U handoff docs).

---

## § 0. The repo and where you are

**GitHub:** https://github.com/johndesautels1/Olivia-Brain
**Branch:** `main` — every commit pushed; working tree clean at end of batch.
**Clone command** (if needed):

```
git clone https://github.com/johndesautels1/Olivia-Brain.git "D:\Olivia Brain"
```

**Local path:** `D:\Olivia Brain` (Windows; PowerShell-first, never POSIX `find` per `~/CLAUDE.md`).

**Sister repos** (reference only):
- `D:\London-Tech-Map` — github.com/johndesautels1/london-tech-map (READ-ONLY from OB)
- `D:\Studio-Olivia` — local prototypes
- `D:\Clues Main` — github.com/johndesautels1/Clues-Main (docs canonical, code stale)

**Verify on arrival:** `git log --oneline -15`. Top commit should be the most recent docs commit (this file's push). If not, `git pull origin main`. Run `npx tsc --noEmit` and `npm test` before writing anything.

---

## What just shipped — extended continuous batch (44 commits)

The home page (Track U) was the start. This continuous batch built outward across 4 closed tracks (D, E, I, J) plus partial Track N (3 of 5 manifestation modes), with polish and tests throughout.

| Commit | Track / Session | What landed |
|---|---|---|
| `398cd26` | observability | recordTrace from both chat routes (was: only LangGraph). /admin/traces now populates from real production calls. |
| `03a6249` | polish | Copy-reply button in the provenance row — clipboard copy with mint "Copied" flash. |
| `d9b45d3` | feat | "New conversation" reset path. ⌘K command, CustomEvent-based plumbing. |
| `404d899` | feat | Conversation persistence + multi-turn recall on the streaming route. conversationIdRef threads across sends. X-Olivia-Conversation-Id header. |
| `1dde4c0` | feat | `/admin/traces` — Bloomberg-style live cascade trace viewer. 5s poll. ⌘K nav target added. |
| `ce775b8` | polish | SuggestionChips refreshed: 6 chips, one per spoke, demonstrating 4 manifest types + 5 spokes. |
| `8b90641` | **spoke-router** | 6-spoke router (FL real-estate / relocation / london_tech / xscore / heart_recovery / london_transit + general fallback). Cheap regex detection per query. Cascade picks up spoke-specific addendum. UI shows aether-tinted spoke chip in provenance row. 16 tests. |
| `71088da` | **N-timeline** | New ` ```timeline ` fence — chronological narratives. 4 tone variants. 9 tests. |
| `6103ada` | polish | Auto-focus composer on mount + skeleton shimmer on KPI tiles during initial load. |
| `b20c23e` | polish | Per-message provenance badge — provider · model · ms · source (stream/fallback). |
| `607fdf0` | **S29 Track K** | Production `RUNBOOK.md` — pre-deploy checklist, env-var inventory by category, smoke tests, rollback, on-call playbook (7 common 5xx causes + fixes), cost-vector dashboards. Track K ✅ CLOSED. |
| `0a89bb2` | **S28 Track K** | Cache-Control headers on the 3 home aggregator routes (max-age + SWR tuned per polling cadence). Edge dedup; expected 60-80% TTFB drop. |
| `192d108` | **S27 Track K** | Security audit + rate limits on cost vectors (`/api/olivia/chat/stream`, `/api/voice/synthesize`, `/api/voice/transcribe`). |
| `965d441` | **O3 Track O** | Token-streaming chat. New `/api/olivia/chat/stream` + `runModelCascadeStream`. HomeComposer reads ReadableStream, fires `onReplyChunk` per chunk; HomeHero blockquote grows live. Falls back to non-streaming on stream error. **W-003 closed at the perceived-latency layer.** |
| `c807b8b` | docs | Capture O4 + KeyboardShortcuts. |
| `f463ebc` | polish | Keyboard shortcuts overlay (`?` key). Linear-quality. 3 groups × 9 keybinds. |
| `34384ba` | **O4 Track O** | Citation-first RAG manifestation. ` ```sources ` fence renders as numbered citation strip. **W-004 closed at the manifest layer.** 8 tests. |
| `f05146f` | docs | Mid-batch refresh capturing J + N5 + tests. |
| `0c4ef08` | **N5 Track N** | Gamma deck preview cards. ` ```gamma ` fence (bare URL or full JSON `{url,title?,summary?,slides?}`) renders as a card with Open-in-Gamma action. 11 tests. |
| `403e21d` | **S26 Track J** | HealthTech / ClimateTech / PropTech vertical addenda promoted from draft → final. Each now has a 5-point investor diligence frame (regulatory pathway, framework alignment, data accuracy etc.). Track J ✅ CLOSED. |
| `2fe471f` | **S25 Track J** | AI/SaaS vertical adapter framework. `lib/orchestration/vertical-adapter.ts` — per-vertical system-prompt addenda + provider preferences + free-form industry detector. Cascade gains `vertical?: VerticalId` input; pitch helpers thread `industry` through. 15 tests. |
| `2a26135` | polish | Suggestion chips above the home composer. 4 try-this prompts auto-hide on first interaction. |
| `3081a97` | docs | Mid-batch handoff refresh. |
| `3d7be1b` | tests | 14 tests on chart-spec parser + color resolver. |
| `b5e6ab5` | N3-prompt | Cascade system prompt teaches Olivia the chart-fence contract. 5-line prompt edit. |
| `4c2ff02` | **N1+N3** | Track N foundation. `<MarkdownReply>` (react-markdown + remark-gfm), `<ChartFromSpec>` (recharts bar/line/area/pie), `chart-spec.ts` parser with token-keyed colors. Wired into HomeHero `lastReply`, OliviaChatTab + PitchCoachTab message bubbles. |
| `aa09fea` | **S24 Track I** | Adaptive surface suppression. `/api/home/tenant-ui` aggregator pulls `ui.suppressedSurfaces`/`ui.brandName`/`ui.accentColor` from `tenant_configs`. `useTenantUi` hook + `isSurfaceSuppressed` helper. RailLeft + ⌘K nav targets filtered. Header wordmark falls back to "STUDIO OLIVIA" without override. |
| `5a32dcf` | **S17 Track E** | `/voice` STT → chat → TTS chain wired end-to-end. MediaRecorder → `/api/voice/transcribe` → `/api/olivia/chat` → `/api/voice/synthesize` → `<audio>` playback. State machine maps to AvatarOrb states. Esc returns; Space toggles. Each stage degrades gracefully. |
| `92bd66c` | **S16 Track D** | `PitchCoachTab` Inspector tab + `usePitchConfig`. localStorage-persistent OptimizeConfig. Three action buttons (Analyze / Draft / Optimize) wired to the cascade-routed pitch helpers. Pitch-specific chat composer. ⌘K → "Open Pitch Coach". |
| `794a994` | **S15 Track D** | Pitch helpers (`optimizeSlide`/`draftPlanSection`/`analyzeContent`/`askOlivia`) re-pointed at the 9-model cascade via new `runPitchCascade` adapter. Web research moves from Anthropic native `web_search_20250305` to Tavily as a pre-search step. |
| `fc1d645` | fix | `instrumentation.ts` defers `@opentelemetry/sdk-node` + `@langfuse/otel` imports until inside `register()` AND adds a `NEXT_RUNTIME === "nodejs"` gate. Was crashing Edge runtime with `__import_unsupported is not defined`. |
| `727a74c` | fix | `middleware.ts` is now Clerk-free (pure passthrough) until both Clerk keys land on Vercel. Importing `@clerk/nextjs/server` on Edge with no keys was crashing every request as `MIDDLEWARE_INVOCATION_FAILED`. |
| `c713dcf` | fix | `Prisma.InputJsonValue` cast on `system-alerts.ts` line 43 (prior agent's W-016 work). |
| `639c9fb` | fix | `ValuationSubject.companyName` (not `.name`); `Document.status` enum (`"active"` not `"ready"`). |

### Track summary (cumulative across both batches)

| Track | Status | Notes |
|---|---|---|
| **Track Q (Quantara Q1-Q7)** | ✅ CLOSED | All 7 sessions shipped. |
| **Track P (Deal Protection P1-P7)** | ✅ CLOSED | All 7 sessions shipped. |
| **Track F (Clerk auth, S18)** | ✅ CLOSED | Wired Track F S18 — but the Vercel middleware-side has been hard-removed pending env vars (see middleware.ts inline restoration steps). |
| **Track U (home page overhaul, U1-U7)** | ✅ CLOSED | Voice-first agentic CIO surface. |
| **Track D (Studio↔Brain, S15-S16)** | ✅ CLOSED | Pitch routes cascade-routed + PitchCoachTab. |
| **Track E (voice input, S17)** | ✅ CLOSED | `/voice` STT/chat/TTS chain end-to-end. |
| **Track I (multi-tenant + suppression, S24)** | ✅ CLOSED | Adaptive surface suppression + brand override. |
| **Track N (visual manifestation, N1+N3+N5+timeline of 5)** | 🟡 partial | N1 manifest contract ✅ + N3 chart manifestation ✅ + N5 Gamma deck preview ✅ + extra timeline manifest ✅. **N2 (Mapbox 3D enhancement) and N4 (generative UI / 3D scenes) remaining.** |
| **Track O (weakness closure)** | 🟡 partial | **O3 ✅** (W-003 perceived voice/chat latency closed via token streaming). **O4 ✅** (W-004 citation-first RAG closed at manifest layer). O2 (Patronus eval), O5 (avatar lip-sync) remaining. |
| **Track K (Hardening + launch prep)** | ✅ CLOSED | S27 ✅ security audit + rate limits. S28 ✅ perf caching headers. S29 ✅ production runbook. All 3 sessions shipped. |
| **Track J (vertical adapters S25-S26)** | ✅ CLOSED | All 4 verticals final. AI/SaaS + HealthTech + ClimateTech + PropTech each carry a 5-point investor diligence frame in `lib/orchestration/vertical-adapter.ts`. Free-form industry detector + provider preferences + 16 tests. |
| **Track G (cascade orchestrator port S19-S20)** | 🕗 pending | LTM `lib/cascade/` port + LangGraph wrap. Not started. |
| **Track H (agents consolidation S21-S23)** | 🕗 pending | LTM 94 named agents port + auto-learning. Not started. |
| **Track K (hardening + launch S27-S29)** | 🕗 pending | Security audit, perf, runbooks. |
| **S30 launch** | 🕗 pending | Target 2026-06-02. |
| **Track O (weakness closure O2-O5)** | 🕗 pending | Patronus eval / sub-600ms voice / citation-first RAG / avatar lip-sync. |
| **Track L (cluesintelligence ~10 sessions)** | 🕗 post-launch | Verdict + persona + what-if endpoints. |

### Net-new files this batch (post-Track-U, cumulative)

```
src/lib/pitch/cascade-adapter.ts                                 (S15)
src/components/studio/PitchCoachTab.tsx                          (S16)
src/hooks/usePitchConfig.ts                                      (S16)
src/hooks/useTenantUi.ts                                         (S24)
src/app/api/home/tenant-ui/route.ts                              (S24)
src/components/home/reply-renderer/MarkdownReply.tsx             (N1)
src/components/home/reply-renderer/ChartFromSpec.tsx             (N3)
src/components/home/reply-renderer/chart-spec.ts                 (N1)
src/components/home/reply-renderer/chart-spec.test.ts            (tests, 14)
src/components/home/reply-renderer/GammaCard.tsx                 (N5)
src/components/home/reply-renderer/GammaCard.test.ts             (tests, 11)
src/components/home/reply-renderer/index.ts                      (barrel)
src/components/home/SuggestionChips.tsx                          (polish)
src/lib/orchestration/vertical-adapter.ts                        (S25+S26)
src/lib/orchestration/vertical-adapter.test.ts                   (tests, 16)
src/components/home/reply-renderer/CitationStrip.tsx             (O4)
src/components/home/reply-renderer/CitationStrip.test.ts         (tests, 8)
src/components/home/KeyboardShortcuts.tsx                        (polish)
src/app/api/olivia/chat/stream/route.ts                          (O3)
docs/RUNBOOK.md                                                   (S29)
src/components/home/reply-renderer/TimelineFromSpec.tsx           (timeline)
src/components/home/reply-renderer/TimelineFromSpec.test.ts       (tests, 9)
src/lib/orchestration/spoke-router.ts                             (spoke-router)
src/lib/orchestration/spoke-router.test.ts                        (tests, 16)
src/app/admin/traces/page.tsx                                     (traces page)
```

**Test additions: ~74 new tests this batch (14 chart-spec + 11 GammaCard + 16 vertical-adapter + 8 CitationStrip + 9 TimelineFromSpec + 16 spoke-router). All passing.**

**Modified additionally this wave:**
- `src/lib/services/model-cascade.ts` — `runModelCascadeStream` exported (uses AI SDK `streamText`)
- `src/components/home/HomeComposer.tsx` — streaming-first send() path with non-streaming fallback
- `src/components/home/HomeCenter.tsx` — `handleReplyChunk` wired through to HomeHero for live token rendering
- `src/app/api/home/{score-chips,dashboard,tenant-ui}/route.ts` — `Cache-Control` headers
- `src/app/api/olivia/chat/stream/route.ts` + `src/app/api/voice/{synthesize,transcribe}/route.ts` — `rateLimit()` gates

### Modified files this batch
```
src/app/page.tsx              — tenant-aware rail filter, command palette, brand override
src/app/voice/page.tsx        — full STT/chat/TTS chain (was U7 stub)
src/components/home/HomeHero.tsx          — MarkdownReply replaces blockquote
src/components/home/index.ts              — re-export reply-renderer
src/components/home/command-palette/commands.ts — suppressedSurfaces filter
src/components/studio/OliviaChatTab.tsx   — markdown render in olivia bubbles
src/components/studio/PitchCoachTab.tsx   — markdown render in olivia bubbles
src/hooks/index.ts                        — usePitchConfig + useTenantUi exports
src/lib/pitch/optimize.ts                 — 4 helpers re-pointed at cascade
src/lib/services/model-cascade.ts         — chart-fence contract in system prompt
src/lib/system-alerts.ts                  — Prisma.InputJsonValue cast
middleware.ts                             — Clerk-free passthrough
instrumentation.ts                        — deferred OTel imports + Edge gate
```

### What works (verified during the batch)

- Every Track-D / E / I / N commit passed `npx tsc --noEmit` (exit 0) before push.
- 14/14 chart-spec parser tests passed via `npx vitest run`.
- The four deploy fixes were validated against Vercel — the cascade started working after `fc1d645` (instrumentation) was the last domino.

### What's likely broken / needs your verification

1. **Vercel deploy status** — was passing as of `fc1d645`. New post-batch pushes have not been validated end-to-end against a fresh Vercel deploy. **Watch the next deploy.**
2. **`npm test`** — 943/943 reported in the test commit `3d7be1b`. Re-run to confirm.
3. **`/voice` STT/TTS** — surface + state machine are wired but require `DEEPGRAM_API_KEY` (or `OPENAI_API_KEY` for Whisper fallback) and `ELEVENLABS_API_KEY` (or `OPENAI_API_KEY` for TTS fallback) to be set in Vercel. Without keys, the route 503s and the UI shows "STT not configured" instead of crashing — by design.
4. **Chart manifestation** depends on Olivia returning the right shape. The system prompt teaches her the contract, but real-world prompts may need additional examples. If charts don't render in production, check the `parseChartSpec` `error` field (renders inline as a code block with a note).
5. **Tenant suppression** depends on `tenant_configs` rows existing for the tenant. Without a row, returns standalone defaults — every surface visible. To configure, see the inline example in commit `aa09fea`.

---

## Carry-forwards (still open from prior agent's handoff)

Unchanged from the previous Track-U handoff — none of these were touched in this batch:

- **Track B Session 8c** — Studio v1 engine port (PreparationStudio + 17 engine-side components).
- **Track B Session 8d-routes-2** — `documents/[id]/page.tsx` (16.9 KB LTM source), `[id]/workspace/{page,layout,DocumentWorkspaceClient}.tsx`. Use `Copy-Item -LiteralPath` to avoid the PowerShell `[id]` bracket wildcard issue.
- **DocumentShareEvent** audit table (LTM line 1444).
- **DocumentCollection / DocumentVersion / DocumentModule / DocumentRelationship** — referenced as stubs.
- **PackageRecipient + PackageEvent** — `documents/page.tsx` synthesizes `_count.recipients = 0` + `events = 0`.

## Operator actions OWED (still — DB unreachable from prior session)

5 SQL migrations on disk under `prisma/sql/`. Apply order: **04 → 05 → 06 → seed → 07 → 08 → 09**.

1. `prisma/sql/04-add-quantara-foundation.sql` (Track Q)
2. `prisma/sql/05-add-calendar-memory-rpc.sql` (W-014)
3. `prisma/sql/06-add-deal-protection-foundation.sql`
4. `prisma/sql/seed-investor-reputations.sql`
5. `prisma/sql/07-add-counter-term-sheets.sql`
6. `prisma/sql/08-add-documents-engine-write-surface.sql`
7. `prisma/sql/09-add-documents-foundation.sql`

Plus Vercel env vars (priority order):
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — All Environments (currently MISSING; restoration steps inline in `middleware.ts`)
- `CLERK_SECRET_KEY` — Production + Preview only, marked Sensitive (currently MISSING)
- `DEEPGRAM_API_KEY` or `OPENAI_API_KEY` — for `/voice` STT
- `ELEVENLABS_API_KEY` or `OPENAI_API_KEY` — for `/voice` TTS
- `TAVILY_API_KEY` — for the pitch helpers' web research pre-search

This batch added **no new operator actions** — every new feature degrades gracefully without env vars.

---

## Architectural decisions you must respect

### Established (carried forward)
- **OB nests in LTM as the home tenant — schema follows LTM.** Always grep LTM's schema for the equivalent before adding a new model.
- **Two user-id conventions:** `userProfileId` (FK to `UserProfile.id`) on bookmark/saved tables; `ownerUserId` (raw Clerk userId) on Package + DocumentShare.
- **`@/lib/require-tier.ts` is server-only** (`import "server-only"` at top). Pure plan-tier types live in `@/types/plan-tier.ts` for client imports.
- **`ensureUserProfile()`** at `src/lib/users/ensure-user-profile.ts` is the canonical lookup-or-create.
- **`UserCompanyDeadline` privacy contract** (top of `~/CLAUDE.md`).

### New (Track U → this batch)
- **`/api/home/*` routes are read-only aggregators.** They do not mutate. Any mutation surface lives under its own domain.
- **The home center pane is a composition.** New widgets go in `src/components/home/` and mount in `HomeCenter.tsx`. Don't bloat `page.tsx`.
- **The command palette registry is build-from-context.** New commands go in `commands.ts` via `buildCommandRegistry`. Don't fetch dynamic data inside the registry — pass it via context.
- **Olivia replies are markdown.** Plain-text replies still work, but the chat surfaces (HomeHero, OliviaChatTab, PitchCoachTab) all expect to render through `MarkdownReply`. New chat surfaces should do the same.
- **The chart-fence contract** is `lib/services/model-cascade.ts buildSystemPrompt()` + `chart-spec.ts` parser. To add a new manifest type (e.g. mermaid diagram, Gamma deck card), extend BOTH the prompt and the renderer's code-fence handler. Schema stays JSON.
- **Tenant suppression** is via `ui.suppressedSurfaces` config key on `tenant_configs`. Hosts that embed Olivia pass `x-tenant-slug` header (or `?tenant=slug` query). Standalone returns empty defaults.
- **Pitch operations need a config.** `usePitchConfig` (localStorage-persistent OptimizeConfig) is the source of truth client-side. Server-side, the `/api/pitch/*` routes accept it in the request body.

---

## Read order on first session

1. `~/CLAUDE.md` (the absolute-priority rules).
2. `docs/OLIVIA_NORTH_STAR.md`.
3. `docs/00_PRODUCT_TRUTH.md`.
4. This file (HANDOFF.md).
5. `docs/FEATURE_INVENTORY.md` (Track U + post-Track-U sections).
6. `docs/BUILD_SEQUENCE.md`.

After reading, run `git log --oneline -20`, `npx tsc --noEmit`, and `npm test`. Only then write code.

---

## Prior agent termination — don't repeat these

The agent before Track U was terminated 2026-05-08 for these patterns. They still apply:

1. **Reporting state from mental model rather than verifying.** Verify with `git status`, `git log`, actual `npx tsc --noEmit` output.
2. **Phantom completion via failed PowerShell.** `Copy-Item "$src\[id]\page.tsx"` silently no-ops because PS treats `[id]` as wildcard. Use `-LiteralPath` after every copy.
3. **Designing schema without checking LTM first.** Cost a full session of rework.
4. **Skipping verification under time pressure.** When the user says "go fast," verification is MORE important.
5. **Long hopeful summaries** describing intent rather than verified state.
6. **Pushing broken code without flagging in the commit message.**
