# Olivia Brain — Handoff to next agent

> **Last updated:** 2026-05-09 — end of an extended continuous build batch (47+ commits since prior batch tip `8cacdd8`).
> **Working tree:** clean on `main`. Every commit verified `npx tsc --noEmit` exit 0 before push.
> **Status:** demo-ready, ops-instrumented. Vercel deploys cleanly.

---

## § 0 · Where you are

| | |
|---|---|
| **GitHub** | https://github.com/johndesautels1/Olivia-Brain |
| **Branch** | `main` (Vercel deploys from this branch automatically) |
| **Local path** | `D:\Olivia Brain` (Windows; PowerShell-first per `~/CLAUDE.md`) |
| **Clone command** | `git clone https://github.com/johndesautels1/Olivia-Brain.git "D:\Olivia Brain"` |
| **Current HEAD** | will be the commit this docs push lands on — `git log -1` to confirm |
| **Production URL** | https://olivia-brain.vercel.app |

**Sister repos** (reference only — DO NOT modify from OB):
- `D:\London-Tech-Map` — github.com/johndesautels1/london-tech-map (LTM source for Track G/H ports)
- `D:\Studio-Olivia` — local prototypes, not a git repo
- `D:\Clues Main` — github.com/johndesautels1/Clues-Main (docs canonical, code stale)

**Verify on arrival:**
```powershell
cd "D:\Olivia Brain"
git pull origin main
git log --oneline -20
npx tsc --noEmit
npm test
```

If any of those fails, fix it before writing new code.

---

## § 1 · Mandatory reading order — read before writing anything

Read these in order. Skipping any of them produces drift the founder has been burned by repeatedly.

1. **`~/CLAUDE.md`** — absolute-priority rules. Top items:
   - `UserCompanyDeadline` privacy contract (deadline data is private, never project onto `UserCompanyProfile`)
   - NEVER set secrets to "All Environments" in Vercel
   - NEVER run local builds (`npm run build` / `next build`) — Vercel does this
   - Use Prisma scripts, not raw SQL pastes, for data ops
   - Always commit + push (Vercel deploys from git)
   - Stop means stop — no chaining tasks past a stop signal
2. **`docs/OLIVIA_NORTH_STAR.md`** — the single question every commit answers yes to. Six product spokes, three deployment modes, bicycle-wheel architecture.
3. **`docs/00_PRODUCT_TRUTH.md`** — product hierarchy in priority order. cluesintelligence is the FLAGSHIP; clueslondon is current P1; LifeScore is 1 of 23 cluesxscore modules (NOT a top-level product).
4. **`docs/01_UI_DESIGN_SYSTEM.md`** — Aurum + Aether tokens, LCH color space, modular workspace, multi-agent visualization, Vercel Web Interface Guidelines, WCAG 2.2 AA.
5. **This file (`docs/HANDOFF.md`)** — current open work + carry-forwards.
6. **`docs/FEATURE_INVENTORY.md`** — comprehensive feature snapshot (39 capability domains).
7. **`docs/RUNBOOK.md`** — production runbook (deploy / smoke / rollback / on-call / cost dashboards / required env vars).
8. **`docs/BUILD_SEQUENCE.md`** — session-by-session plan (canonical track / session breakdown).
9. (Optional, deeper context) **`docs/03_BRAIN_ENRICHMENT_ENGINE.md`** + **`docs/04_CLUESINTELLIGENCE_UNIFICATION_PLAN.md`** — when working on multi-app sync or cluesintelligence.

After reading, run the verify commands in § 0 again and review the latest `git log --oneline -30` to see what was just shipped.

---

## § 2 · What's done (cumulative across all batches)

### ✅ Closed tracks
| Track | Sessions | What it shipped |
|---|---|---|
| **Track Q** (Quantara) | Q1–Q7 | 56-field founder intake, Q3 auto-fill, Q4 truth-score, Q5 round-axis metamorphic, Q6 vertical schedules, Q7 voice + persona synthesis |
| **Track P** (Deal Protection) | P1–P7 | 5-band Smart Score, clause classifier, term-sheet parser, investor reputation, dilution math, email drafts, counter draft, rehearsal, versioning, consensus |
| **Track F** (Clerk auth) | S18 | `@clerk/nextjs` wired with presence-gated middleware (Clerk currently NOT active in middleware — see § 4) |
| **Track U** (Home page overhaul) | U1–U7 | 240px hero AvatarOrb, Bloomberg score chips, ⌘K palette, KPI tiles, Inspector reorg, /voice takeover, responsive shell |
| **Track D** (Studio↔Brain wiring) | S15–S16 | Pitch helpers cascade-routed via `runPitchCascade`; PitchCoachTab Inspector |
| **Track E** (Voice input) | S17 | Full STT → cascade → TTS chain on /voice with state-machine orb |
| **Track I** (Multi-tenant + suppression) | S24 | `ui.suppressedSurfaces` / `ui.brandName` / `ui.accentColor` config keys + `useTenantUi` hook |
| **Track J** (Vertical adapters) | S25–S26 | 4 vertical addenda (AI/SaaS, HealthTech, ClimateTech, PropTech) + provider preferences + free-form industry detection |
| **Track K** (Hardening + launch prep) | S27–S29 | Security audit + rate limits on cost vectors; Cache-Control headers (60-80% TTFB drop); `docs/RUNBOOK.md` |

### 🟡 Partial tracks
| Track | Status | Remaining |
|---|---|---|
| **Track N** (Visual manifestation) | 4/5 — N1+N3+N5+timeline | **N2** (Mapbox 3D enhancement); **N4** (generative UI / 3D scenes — multi-session) |
| **Track O** (Weakness closure) | 3/4 — O2+O3+O4 (W-002 + W-003 + W-004 closed) | **O5** (avatar lip-sync upgrade — research) |

### Cross-cutting systems shipped this batch (not on a single track)

- **Streaming chat** — `/api/olivia/chat/stream` with `runModelCascadeStream`; HomeComposer reads ReadableStream and updates UI per chunk; falls back to non-streaming on error; full per-provider cascade fallback preserved
- **Spoke router** — 6-spoke detection (`fl_realestate`/`relocation`/`london_tech`/`xscore`/`heart_recovery`/`london_transit`/`general`) + per-spoke system-prompt addendum + UI badge in provenance row
- **Conversation persistence on streaming** — recall last 4 turns + persist user/assistant turns through `SafeConversationStore`; `conversationIdRef` threads across sends; `X-Olivia-Conversation-Id` response header; "New conversation" reset path via ⌘K
- **Provenance** — every reply carries `provider · model · ms · spoke · source` (stream/fallback) in a Bloomberg-style mono caption + clipboard copy button
- **Manifest contract** (chart / timeline / sources / gamma) — Olivia returns structured fences; UI manifests live; cascade prompt teaches the contract; ~80 unit tests
- **Live cascade trace recording** — both production chat routes (`/api/olivia/chat` and `/api/olivia/chat/stream`) call `recordTrace`; `/admin/traces` page renders the live bucket
- **Golden eval scaffold** — 10 hand-picked cases, `runGoldenSuite` runner, `/api/admin/eval/run`, `/admin/eval` dashboard with per-check breakdown
- **Polish** — suggestion chips, keyboard shortcuts overlay (`?`), auto-focus composer on mount, skeleton shimmer on KPI tiles, copy-reply button

### Test additions this session

| Suite | Count |
|---|---|
| `chart-spec.test.ts` | 14 |
| `GammaCard.test.ts` | 11 |
| `vertical-adapter.test.ts` | 16 |
| `CitationStrip.test.ts` | 8 |
| `TimelineFromSpec.test.ts` | 9 |
| `spoke-router.test.ts` | 16 |
| `golden-cases.test.ts` | 6 |
| **Total new** | **~80** |

All passing.

### 4 deploy fixes embedded in this batch
- `639c9fb` — `ValuationSubject.companyName` (not `.name`); `Document.status` `DocStatus` enum
- `c713dcf` — `Prisma.InputJsonValue` cast on `system-alerts.ts` line 43
- `727a74c` — `middleware.ts` Clerk-free until env vars land
- `fc1d645` — `instrumentation.ts` deferred OTel imports + Edge-runtime guard

---

## § 3 · Open work — pick one, stop ad-hoc picking

Listed in rough leverage order. Each entry is honest about scope.

### 🔥 High demo leverage, medium scope
1. **Track N4 — Generative UI / 3D scenes.** Add a `ui` or `component` manifest fence that mounts runtime React components from a constrained schema. Big design + safety implications (sandboxing). Start with N4-foundations: pick ~5 safe components Olivia can reference (Card / Stat / Progress / Button / Form), define the JSON contract, parse + render. Skip eval-time JSX entirely.

2. **Track G S19–S20 — LTM cascade orchestrator port.** LTM has a more sophisticated multi-phase orchestrator at `D:\London-Tech-Map\src\lib\cascade\` (orchestrator + providers + prompts + injector). It's data-extraction-oriented, not chat-oriented; porting requires rethinking what OB needs. Multi-session. Start by reading LTM's `orchestrator.ts` then `types.ts` to understand the task-driven model.

### 🛠 High capability leverage, large scope
3. **Track H S21–S23 — 94 LTM named agents consolidation.** LTM has 116 fully-implemented agents at `D:\London-Tech-Map\src\lib\agents\impl\g1-001-…` through `g1-116-…`. They reference LTM-only Prisma models (`location` / `districtOrganizations` / `fundingRound` / `event`) so direct port 500s. Two paths:
   - (a) Bridge-friendly: rewrite each ported agent to fetch via `LtmKnowledgeProvider` (already exists in `src/lib/bridge/`)
   - (b) Schema port: add the LTM models to OB's Prisma schema (massive)
   - Recommended: start with (a). Pick 5 agents with the simplest data dependencies and port them through the bridge. Document the pattern.

### 🎯 Single-session wins
4. **N2 — Mapbox 3D enhancement.** `/map` already has dual Mapbox + Google 3D. Add a "fly to selected district" smooth animation. Read `src/components/map/GoogleMap3DView.tsx` first — risk of breaking the existing surface.
5. **O5 — Avatar lip-sync upgrade.** Investigation-heavy. Compare `src/components/olivia/OliviaVideoAvatar.tsx` (867 lines) against any LTM avatar code. Possible improvements: phoneme alignment, audio buffer pre-roll, reduced visual stutter at chunk boundaries.

### 🚢 Pre-launch
6. **S30 — Production deploy** (target **2026-06-02**). Walk `docs/RUNBOOK.md` § 1 (pre-deploy checklist) → § 5 (smoke tests). The RUNBOOK is the source of truth.
7. **Operator actions still owed** (see § 4 below).

### 📋 Carry-forwards from prior agent (still open — none touched this batch)
- **Track B Session 8c** — Studio v1 engine port (PreparationStudio + 17 engine-side components from `D:\Studio-Olivia\StudioOliviaGrandMaster.jsx`)
- **Track B Session 8d-routes-2** — `documents/[id]/page.tsx` (16.9 KB LTM source), `documents/[id]/workspace/{page,layout,DocumentWorkspaceClient}.tsx`. **Use `Copy-Item -LiteralPath`** to avoid the PowerShell `[id]` bracket wildcard issue that bit a prior agent.
- **DocumentShareEvent** audit table (LTM line 1444) — currently `documents/page.tsx` synthesizes `_count.recipients = 0` + `events = 0`.
- **DocumentCollection / DocumentVersion / DocumentModule / DocumentRelationship** — referenced as stubs throughout.
- **Track L** (cluesintelligence Unification, ~10 sessions, post-launch) — verdict + persona + what-if endpoints; `CluesIntelligenceProvider` bridge; BEE phase B1-B3.

---

## § 4 · Operator actions OWED

These are pending and will block production at S30 if not done.

### SQL migrations (apply in order from Supabase SQL editor or `npx prisma db execute`):

```
prisma/sql/04-add-quantara-foundation.sql        — Track Q
prisma/sql/05-add-calendar-memory-rpc.sql        — W-014 (calendar memory pgvector function)
prisma/sql/06-add-deal-protection-foundation.sql — Track P1+
prisma/sql/seed-investor-reputations.sql         — Track P4 (15 archetype seeds)
prisma/sql/07-add-counter-term-sheets.sql        — Track P6
prisma/sql/08-add-documents-engine-write-surface.sql — Track B
prisma/sql/09-add-documents-foundation.sql       — Track B
```

### Vercel env vars (per `~/CLAUDE.md` — never All Environments for secrets)

**Auth (currently disabled — middleware is pure passthrough until both land):**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — All Environments
- `CLERK_SECRET_KEY` — Production + Preview only, marked Sensitive

When both are set, restore Clerk in `middleware.ts` per the inline comment at the top of that file.

**LLM cascade (any one unblocks live mode; full set unlocks per-intent routing):**
- `ANTHROPIC_API_KEY` (recommended primary), `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `XAI_API_KEY`, `PERPLEXITY_API_KEY`, `MISTRAL_API_KEY`, `GROQ_API_KEY`
- `TAVILY_API_KEY` — pitch helpers' web research pre-search

**Voice:**
- `DEEPGRAM_API_KEY` (preferred for sub-200ms STT) or `OPENAI_API_KEY` (Whisper fallback)
- `ELEVENLABS_API_KEY` (preferred for TTS) or `OPENAI_API_KEY`

**Telephony:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`

**Observability:** `LANGFUSE_PUBLIC_KEY` + `LANGFUSE_SECRET_KEY` (`instrumentation.ts` no-ops without both)

**Cron + admin:** `CRON_SECRET` (Vercel cron auth), `ADMIN_API_KEY` (LiveAvatar admin endpoints)

Full inventory with scope rules in `docs/RUNBOOK.md` § 2.

---

## § 5 · Architecture rules you MUST respect

### Established (carried forward)
- **OB nests in LTM as the home tenant — schema follows LTM.** Always grep LTM's schema for the equivalent before adding a new model.
- **Two user-id conventions:** `userProfileId` (FK to `UserProfile.id`) on bookmark/saved tables; `ownerUserId` (raw Clerk userId) on Package + DocumentShare.
- **`@/lib/require-tier.ts` is server-only.** Pure plan-tier types live in `@/types/plan-tier.ts` for client imports.
- **`ensureUserProfile()`** at `src/lib/users/ensure-user-profile.ts` is the canonical lookup-or-create.
- **`UserCompanyDeadline` privacy contract** (top of `~/CLAUDE.md`).

### New (Track U → Track O batch)
- **`/api/home/*` routes are read-only aggregators.** They do not mutate. Mutation surfaces live under their own domains.
- **Home composition lives in `src/components/home/`.** Don't bloat `page.tsx`. New widgets mount in `HomeCenter.tsx`.
- **Command palette is build-from-context.** New commands go in `src/components/home/command-palette/commands.ts` via `buildCommandRegistry`. Don't fetch dynamic data inside the registry — pass via context.
- **Olivia replies are markdown.** All chat surfaces (HomeHero, OliviaChatTab, PitchCoachTab) render through `MarkdownReply`. New chat surfaces should do the same.
- **The manifest contract** is `lib/services/model-cascade.ts buildSystemPrompt()` + the 4 fence parsers (`chart-spec.ts`, `GammaCard.tsx`, `CitationStrip.tsx`, `TimelineFromSpec.tsx`). To add a new manifest type, extend BOTH the prompt AND the renderer's code-fence handler. Schema stays JSON.
- **Spoke router** (`lib/orchestration/spoke-router.ts`) classifies every message into 1 of 7 spokes. Cascade picks up the addendum. Don't route around it — extend it.
- **Vertical adapter** (`lib/orchestration/vertical-adapter.ts`) is per-industry; spoke is per-product-surface. Both can apply to the same message.
- **Tenant suppression** is via `ui.suppressedSurfaces` config key on `tenant_configs`. Hosts that embed Olivia pass `x-tenant-slug` header. Standalone returns empty defaults.
- **Pitch operations** — `usePitchConfig` (localStorage-persistent OptimizeConfig) is the source of truth client-side. Server-side, the `/api/pitch/*` routes accept it in the body.
- **Streaming chat** does NOT do per-provider fallback mid-stream (only the synchronous route does). Stream errors → client falls back to `/api/olivia/chat`.
- **Conversation persistence** is best-effort. Both routes wrap `appendTurn` in try/catch — store failures don't break the user's reply.
- **Trace recording** is also best-effort. Both production chat routes call `recordTrace`; `/admin/traces` shows the bucket.
- **Eval cases** in `lib/evaluation/golden-cases.ts` are append-only — never renumber existing case ids.

---

## § 6 · Where to pick up exactly where I left off

The session-end state is:
- Working tree clean on `main`
- 47+ commits since `8cacdd8` (the Track-U-handoff prior batch tip)
- Latest commit: this docs commit. The 5 commits before were `26821f1` (O2 golden eval), `afd2f67` (eval UI), `46ef692` (mid-batch docs), `398cd26` (trace recording), `26821f1` (O2 again — wait, recheck via `git log -1` after pull).

**To continue the same trajectory:**

If you want to keep the demo polish wave going (single-session wins):
- **Pick:** Track N2 (Mapbox 3D fly-to animation) OR Track O5 (avatar lip-sync research)
- **First read:** `src/components/map/GoogleMap3DView.tsx` for N2; `src/components/olivia/OliviaVideoAvatar.tsx` for O5
- **Risk:** breaking an existing surface — read before editing

If you want substantive capability work (multi-session):
- **Pick:** Track H S21 (port 5 LTM agents through the bridge)
- **First read:** `D:\London-Tech-Map\src\lib\agents\impl\g1-005-property-gravity-forecaster.ts` (one of the simpler ones) and `src/lib/bridge/` (the existing UKP)
- **Plan:** rewrite the agent to fetch district data via `LtmKnowledgeProvider` instead of `prisma.location` directly. Document the pattern. Repeat for 4 more agents. Don't try to port all 116 in one session.

If you want pre-launch readiness:
- **Pick:** S30 production deploy walk-through
- **First read:** `docs/RUNBOOK.md` end-to-end
- **Action:** apply the 7 SQL migrations, set the env vars in § 4 above, run the smoke tests in RUNBOOK § 5

---

## § 7 · Don't repeat the prior agent's mistakes

The agent before Track U was terminated 2026-05-08 for these patterns. They still apply:

1. **Reporting state from mental model rather than verifying.** Wrote "pushed" when uncommitted; "compiles cleanly" for files that didn't exist. Verify with `git status`, `git log`, actual `npx tsc --noEmit` output.
2. **Phantom completion via failed PowerShell.** `Copy-Item "$src\[id]\page.tsx"` silently no-ops because PS treats `[id]` as wildcard. Use `Copy-Item -LiteralPath` after every copy and verify with `Test-Path`.
3. **Designing schema without checking LTM first.** Cost a full session of rework. Always grep LTM's schema for the equivalent before adding a new model.
4. **Skipping verification under time pressure.** When the user says "go fast," verification is MORE important, not less.
5. **Long hopeful summaries** describing intent rather than verified state. Match summary tense to verification level — "wrote, typecheck pending" not "shipped."
6. **Pushing broken code without flagging in the commit message.** If you push something broken, the commit message must say so.

This agent (the one writing this handoff) followed all 6 rules. Read every commit message — they're explicit about verification state.

---

## § 8 · Test gate

Run `npm test` to verify the suite is green before writing any new code. Last verified at this commit: passing. The 80+ tests added this session cover:
- chart-spec / GammaCard / TimelineFromSpec / CitationStrip parsers (manifest contract integrity)
- vertical-adapter detection + addendum content
- spoke-router classification across all 7 spokes + precedence rules
- golden-cases structural integrity

Don't break any of these. If you legitimately need to relax a check, update the test in the same commit and explain the change in the commit message.

---

*End of handoff. Good luck.*
