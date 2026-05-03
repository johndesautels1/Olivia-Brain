# Olivia Brain — Bootstrap

> **READ `docs/00_PRODUCT_TRUTH.md` FIRST, BEFORE THIS FILE.** It is the eternal source of truth for the Olivia / CLUES product universe — bicycle-wheel architecture, priority order, and what each product actually is. This BOOTSTRAP file describes the implementation; `00_PRODUCT_TRUTH.md` describes what is being implemented. Any contradiction → `00_PRODUCT_TRUTH.md` wins.
>
> **Then read this file** — it loads in seconds, costs minimal tokens, sets up everything you need to know about the implementation.

---

## What Olivia Brain is

`D:\Olivia Brain` is the **implementation of Olivia herself** — the brain at the hub of the bicycle-wheel architecture defined in `00_PRODUCT_TRUTH.md`. Standalone Next.js 16 / React 19 / Prisma 7 service. Cascade + persona + memory + avatar + voice + calendar + calls + briefs all live here. The user-facing products (clueslondon.com, cluesintelligence.com, cluesxscore.com, etc.) consume this brain over a stable cross-app contract.

Surfaces this repo serves:

1. **`clueslondon.com`** (priority 1) — embedded Olivia + Studio. Every clueslondon data event passes through this brain.
2. **`cluesintelligence.com`** (priority 2, the FLAGSHIP) — relocation predictive analytics. The 6-LLM cascade + Tavily + Opus judge in this repo is what produces the top-3 cities / towns / neighborhoods verdict.
3. **`cluesxscore.com`** (priority 3) — 23 modular city-comparison mini-apps; `lifescore.com` is one of the 23.
4. **White-labeled Olivia** (priority 4) — third-party real-estate / relocation deployments via the gateway adapter.
5. **`clues-property-search`, `Heart-Recovery-Calendar`, London transit app** (priorities 5–7, future builds) — all spokes on the same wheel.

`olivia.com` is Olivia's own SaaS surface for the white-label product. It is NOT a user-facing chat app — the user-facing apps are the products listed above.

**Multi-million-dollar deliverable. 2026 world-class production code on every line. No band-aids. No symptom suppression.**

**Deadline:** 2026-06-02 (clueslondon-and-Olivia-core). Cluesintelligence + cluesxscore + white-label finish ~Session 60 (post-deadline by design — strategic priority decision 2026-05-03). **Today:** 2026-05-03 (sessions 1–6 complete; ~54 sessions remaining to finish priorities 1–4).

---

## The three sources

Three Olivia / Studio codebases must merge into this one repo:

| Source | Path | What's there |
|--------|------|--------------|
| **Olivia Brain** (this) | `D:\Olivia Brain` | Infrastructure-heavy standalone build. 9-model cascade, 250-agent registry, multi-tenant, white-label, compliance, 6-layer memory stack. |
| **LTM Olivia + Studio** | `D:\London-Tech-Map` | Live-runtime Olivia + Studio embedded inside LTM. **READ-ONLY from this repo** (see Constraints below). 27 Studio components + 18 doc block types + 10 Twilio call routes + 8 valuation agents + ~120 runnable agents. |
| **Studio Olivia prototypes** | `D:\Studio-Olivia` | 3 single-file React prototypes. `StudioOliviaGrandMaster (2).jsx` is the design north star for the UI rebuild. |

LTM contains **two** Studio implementations side-by-side: the original engine (Studio v1, `PreparationStudio.tsx`) and a wrapper attempt (Studio v2, the `StudioOlivia*` files). Together: ~22,700 LOC of Studio+Documents code. Full file-by-file inventory and per-file port plan in `STUDIO_PORT_MANIFEST.md`.

---

## Current state — sessions 1–6

HEAD: post-Session 6 wiring commit, after `009a629` (architecture-locking pass).

Shipped:
- **LiveAvatar pipeline end-to-end.** Server: session token + start endpoints, ElevenLabs PCM streaming. Browser: `OliviaVideoAvatar.tsx` + `OliviaProvider.tsx` ported from LTM. Smoke test: `/test-avatar`. Click Start → her face appears → type a message → she speaks. **Highest-risk item in the 30-day plan is behind us.**
- **Bridge contract operational.** `UniversalKnowledgeProvider` interface (LTM was already substantially built — `lib/bridge/types.ts`, `registry.ts`). Two concrete providers ship: `OliviaSelfProvider` (Supabase-backed self-data) and `LtmKnowledgeProvider` (LTM `/api/v1/organizations` + `/api/v1/districts` over Bearer auth). Both world-class hardened: `AbortSignal.timeout` on every call, `withTraceSpan` wrapping queries, JSDoc on every public symbol, graceful unconfigured-mode fallback.
- **Chat brain v2 (cascade-routed).** `POST /api/olivia/chat` runs the 6-model cascade via `runModelCascade` (Anthropic Sonnet 4.6 primary → GPT-5.4 → Gemini → Grok / Perplexity / Mistral as intent dictates). Intent is inferred from the user message via the shared `inferIntent` classifier in `src/lib/orchestration/intent.ts` (now used by both `/api/chat` and `/api/olivia/chat`). The route recalls 4 prior turns of context, persists user + assistant turns with intent + provider + model + attempt-trail metadata, and runs inside `withTraceSpan("olivia.chat.request")` with PII-free attributes. On total cascade failure the response carries `mode: "mock"` instead of 5xx — the avatar UI never goes blank.
- **Test infra wired.** Vitest 2.1.x + `vite-tsconfig-paths`. **94 tests passing.** `npm run typecheck` clean. `npm test` runs locally; CI integration is a follow-up (see `BUILD_SEQUENCE.md`).

Not yet started: Companies House + Kimi providers (scope-cut from Session 5; tracked in `API_INTEGRATION_BACKLOG.md`), Studio engine port, Studio UI rebuild, voice input, Clerk auth, cascade orchestrator port (LangGraph wrapping), agents consolidation, multi-tenant hardening, vertical adapters. The full plan is in `BUILD_SEQUENCE.md`.

---

## Doc reading order for new agents

**Always read first (every session, in this order):**
1. **`00_PRODUCT_TRUTH.md`** — eternal source of truth for the product universe. Non-negotiable.
2. **`01_UI_DESIGN_SYSTEM.md`** — universal dark-mode design language, color tokens, modular workspace architecture, multi-agent visualization, accessibility floor. Every UI conforms. Non-negotiable.
3. **`02_COMPETITIVE_FEATURE_MATRIX.md`** — synthesized competitive analysis (22 platforms across Gemini/Grok/Claude Desktop sources). What we steal, what we explicitly reject. Action queue smallest → largest.
4. **`03_BRAIN_ENRICHMENT_ENGINE.md`** — universal architectural primitive: how Olivia auto-enriches when any spoke app updates schema / data / knowledge. Bidirectional event pipeline, Prisma models, signing, idempotency.
5. **`04_CLUESINTELLIGENCE_UNIFICATION_PLAN.md`** — flagship plan: audit of Clues Main canonical docs + plan to fold the questionnaire-engine into the unified app. Subject to change as the team locks new questions / Bayesian / persona schema.
6. `BOOTSTRAP.md` — this file. Implementation context.
7. `BUILD_SEQUENCE.md` — what's done, what's next, what's blocking what.

**Read for the specific task:**
| Task | Doc |
|------|-----|
| Studio engine port (Sessions 7–8) | `STUDIO_PORT_MANIFEST.md` |
| Studio UI rebuild (Sessions 9–14) | `STUDIO_OLIVIA_DESIGN.md` + `STUDIO_PORT_MANIFEST.md` § E |
| Chat brain wiring (Sessions 4–6) | `MERGE_PLAN.md` § 4 Phase 2 |
| Cascade orchestrator (Sessions 19–20) | `MERGE_PLAN.md` § 4 Phase 2 + `lib/services/model-cascade.ts` |
| LiveAvatar work | `HEYGEN_LTM_CONFIG.md` (must-preserve contracts) |
| Architectural baseline | `SESSION_LOG_2026-05-02_GRAND_MASTER_PLAN.md` |
| Bridge providers | `lib/bridge/types.ts` + `lib/bridge/registry.ts` + `lib/bridge/providers/*` |

**Don't bulk-read:**
- The 95 KB `StudioOliviaGrandMaster (2).jsx` prototype — `STUDIO_OLIVIA_DESIGN.md` already encodes everything in 339 lines.
- `MERGE_INVENTORY.md` (233 rows) — it's a reference matrix, not a tutorial. Look up specific features as needed.

---

## Sacred files (NEVER delete)

| File | Purpose |
|------|---------|
| `docs/00_PRODUCT_TRUTH.md` | **Eternal source of truth.** Bicycle-wheel architecture, product hierarchy, Olivia's role across all surfaces. Read first every session. Non-negotiable. |
| `docs/01_UI_DESIGN_SYSTEM.md` | Universal dark-mode design language for every spoke. Tokens, primitives, modular workspace, accessibility floor. |
| `docs/02_COMPETITIVE_FEATURE_MATRIX.md` | Competitive analysis synthesis — what to steal, what to reject. |
| `docs/03_BRAIN_ENRICHMENT_ENGINE.md` | Auto-enrichment primitive — schema/data/knowledge events keep the brain in sync with every spoke. |
| `docs/04_CLUESINTELLIGENCE_UNIFICATION_PLAN.md` | Flagship audit + unification plan; subject to change as the team locks new questions / math / persona schema. |
| `docs/BOOTSTRAP.md` | This file. Session startup context. |
| `docs/BUILD_SEQUENCE.md` | Canonical session-by-session plan. |
| `docs/STUDIO_PORT_MANIFEST.md` | File-level port inventory across the three Studios. |
| `docs/MERGE_PLAN.md` | Bridge contract, persona model, deployment topology. |
| `docs/SESSION_LOG_2026-05-02_GRAND_MASTER_PLAN.md` | Architectural baseline + sessions 1–3 progress. |
| `docs/STUDIO_OLIVIA_DESIGN.md` | UI north star derived from the GrandMaster prototype. |
| `docs/HEYGEN_LTM_CONFIG.md` | LiveAvatar must-preserve contracts. |
| `docs/MERGE_INVENTORY.md` | 233-row capability matrix across the three sources. |
| `docs/API_INTEGRATION_BACKLOG.md` | 25-API integration backlog (UK companies, news, events, geo, AI, enrichment, social, gov data) with env-var status. |

**Never create new session-handoff files, cleanup-summary files, or session-numbered documents.** All progress goes into the existing files. Updates in place.

---

## Architecture quick-reference

- **Stack.** Next 16.2 / React 19.2 / Prisma 7.7 / TS 6 / AI SDK 6.
- **Auth.** Pre-Clerk shim today (`Authorization: Bearer ${ADMIN_API_KEY}`). Clerk lands in Session 18.
- **DB.** Supabase Postgres via Prisma. RLS for user-scoped rows. `client_id` is the user identity.
- **Bridge.** Every cross-app data call goes through `knowledgeRegistry.routeQuery(domain, query)`. Two providers registered today: `olivia` (self) and `ltm` (London Tech Map v1 API).
- **Avatar.** LiveAvatar LITE mode + ElevenLabs PCM. Contracts pinned in `HEYGEN_LTM_CONFIG.md`. **Don't change them naively.**
- **Cascade.** 9-model fallback chain (Anthropic Sonnet 4.6 primary, Opus as Cristiano judge, GPT-5.4 secondary, Gemini 3.1, Grok 4 math, Perplexity Sonar, Tavily, Mistral, Companies House). Wired into `lib/services/model-cascade.ts`. Not yet routing real chat traffic — that's Session 4.
- **Tests.** Vitest. Run via `npm test`. **94 tests passing today.**
- **Memory layers.** Six: episodic, semantic, procedural, graph, journey, Mem0. All Prisma-backed.
- **Observability.** Langfuse + OTel via `lib/observability/{langfuse,tracer}.ts`. Every meaningful op gets a span.

---

## Constraints — non-negotiable

1. **LTM is read-only from this repo.** Never delete, rename, edit, move, or alter any file in `D:\London-Tech-Map`. We copy components OUT of LTM into this repo. LTM's live integration must keep working at all times. (See `README.md` § Protected Repo Boundaries.)
2. **No band-aids.** No `force-dynamic` flags as a workaround. No `// hack` comments. No `@ts-ignore`. No Suspense wrappers used to suppress an underlying issue. Find the root cause; remove the cause.
3. **Verify before claiming done.** Every commit: `npm test` must pass, `npm run typecheck` must pass clean. "Hope" is not a delivery method.
4. **`package.json` and `package-lock.json` ship together.** Always run `npm install` before committing a `package.json` edit. This was learned the hard way in Session 3.
5. **Commit + push together.** Local commits do nothing — Vercel deploys from git.
6. **One concern per commit.** No mixed-concern bundles.
7. **Every network call carries an `AbortSignal` + timeout.** No exceptions.
8. **PII never enters spans, traces, or logs.** Only metadata.
9. **JSDoc on every exported symbol.** Class headers describe reliability guarantees.
10. **One task at a time.** After each session's deliverable, stop. Check in with the user. Wait for the go-ahead.

---

## Quick commands

```bash
# Install deps (run after any package.json edit)
cd "D:/Olivia Brain" && npm install

# Run the full test suite
cd "D:/Olivia Brain" && npm test

# Watch mode for local TDD
cd "D:/Olivia Brain" && npm run test:watch

# Coverage report
cd "D:/Olivia Brain" && npm run test:coverage

# Typecheck (no emit)
cd "D:/Olivia Brain" && npm run typecheck

# Lint
cd "D:/Olivia Brain" && npm run lint

# Dev server
cd "D:/Olivia Brain" && npm run dev
```

**Don't run `npm run build` locally.** Vercel builds from git. Local builds waste minutes per commit and provide zero value. (See `~/CLAUDE.md` for the full reasoning.)

---

## What success looks like at June 2

- Olivia answers any question end-to-end in voice + face on `olivia.com`.
- Studio renders the GrandMaster UI on top of the LTM-derived engine; users can build pitch decks + business plans + 18 document types.
- Olivia embeds in LTM via Web Component (LTM-side adoption is a separate workstream).
- Patronus eval clean across all three personas.
- 90 %+ test coverage on the bridge layer; 70 %+ overall.
- No band-aids in the codebase.
- Production observability dashboards green.
