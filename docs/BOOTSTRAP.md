# Olivia Brain — Bootstrap

> **Read this first when starting a new session.** Loads in seconds, costs minimal tokens, sets up everything you need to know.

---

## What Olivia Brain is

A standalone Next.js 16 / React 19 / Prisma 7 service that hosts **Olivia** — a real-human-looking video avatar AI executive agent — as a single product that:

1. **Runs as a SaaS** at `olivia.com`.
2. **Embeds inside the London Tech Map** (`clueslondon.com`) as a Web Component widget.
3. **Embeds inside Clues Intelligence** (a separate predictive analytics app) as Olivia's main face.
4. **Carries every worthwhile feature** from three pre-existing Olivia codebases.

Olivia is positioned as **the world's most advanced agentic vertical agent for relocation, real estate, and the London Tech Map vertical.** Multi-million-dollar deliverable. **2026 world-class production code on every line.** No band-aids. No symptom suppression.

**Deadline:** 2026-06-02. **Today:** 2026-05-02 (sessions 1–4 complete; ~25 sessions remaining).

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

## Current state — sessions 1–4

HEAD: post-`55b0045`, after Session 4's chat-brain landing.

Shipped:
- **LiveAvatar pipeline end-to-end.** Server: session token + start endpoints, ElevenLabs PCM streaming. Browser: `OliviaVideoAvatar.tsx` + `OliviaProvider.tsx` ported from LTM. Smoke test: `/test-avatar`. Click Start → her face appears → type a message → she speaks. **Highest-risk item in the 30-day plan is behind us.**
- **Bridge contract operational.** `UniversalKnowledgeProvider` interface (LTM was already substantially built — `lib/bridge/types.ts`, `registry.ts`). Two concrete providers ship: `OliviaSelfProvider` (Supabase-backed self-data) and `LtmKnowledgeProvider` (LTM `/api/v1/organizations` + `/api/v1/districts` over Bearer auth). Both world-class hardened: `AbortSignal.timeout` on every call, `withTraceSpan` wrapping queries, JSDoc on every public symbol, graceful unconfigured-mode fallback.
- **Chat brain v1 (single provider).** `POST /api/olivia/chat` calls Anthropic Sonnet 4.6 directly via `@ai-sdk/anthropic`, persists user + assistant turns to `conversations` + `conversation_turns` (Supabase with in-memory fallback via `getConversationStore`), wraps the whole handler in `withTraceSpan("olivia.chat.request", ...)`, applies a 30 s `AbortSignal.timeout` on the LLM call, returns a structured fallback reply when `ANTHROPIC_API_KEY` is unset or the call aborts, and is rate-limited per IP. Cascade extension lands in Session 5.
- **Test infra wired.** Vitest 2.1.x + `vite-tsconfig-paths`. **92 tests passing.** `npm run typecheck` clean. `npm test` runs locally; CI integration is a follow-up (see `BUILD_SEQUENCE.md`).

Not yet started: cascade extension of chat, Studio engine port, Studio UI rebuild, voice input, Clerk auth, cascade orchestrator port, agents consolidation, multi-tenant hardening, vertical adapters. The full plan is in `BUILD_SEQUENCE.md`.

---

## Doc reading order for new agents

**Always read first (every session):**
1. This file — `BOOTSTRAP.md`.
2. `BUILD_SEQUENCE.md` — what's done, what's next, what's blocking what.

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
| `docs/BOOTSTRAP.md` | This file. Session startup context. |
| `docs/BUILD_SEQUENCE.md` | Canonical session-by-session plan. |
| `docs/STUDIO_PORT_MANIFEST.md` | File-level port inventory across the three Studios. |
| `docs/MERGE_PLAN.md` | Bridge contract, persona model, deployment topology. |
| `docs/SESSION_LOG_2026-05-02_GRAND_MASTER_PLAN.md` | Architectural baseline + sessions 1–3 progress. |
| `docs/STUDIO_OLIVIA_DESIGN.md` | UI north star derived from the GrandMaster prototype. |
| `docs/HEYGEN_LTM_CONFIG.md` | LiveAvatar must-preserve contracts. |
| `docs/MERGE_INVENTORY.md` | 233-row capability matrix across the three sources. |

**Never create new session-handoff files, cleanup-summary files, or session-numbered documents.** All progress goes into the existing files. Updates in place.

---

## Architecture quick-reference

- **Stack.** Next 16.2 / React 19.2 / Prisma 7.7 / TS 6 / AI SDK 6.
- **Auth.** Pre-Clerk shim today (`Authorization: Bearer ${ADMIN_API_KEY}`). Clerk lands in Session 18.
- **DB.** Supabase Postgres via Prisma. RLS for user-scoped rows. `client_id` is the user identity.
- **Bridge.** Every cross-app data call goes through `knowledgeRegistry.routeQuery(domain, query)`. Two providers registered today: `olivia` (self) and `ltm` (London Tech Map v1 API).
- **Avatar.** LiveAvatar LITE mode + ElevenLabs PCM. Contracts pinned in `HEYGEN_LTM_CONFIG.md`. **Don't change them naively.**
- **Cascade.** 9-model fallback chain (Anthropic Sonnet 4.6 primary, Opus as Cristiano judge, GPT-5.4 secondary, Gemini 3.1, Grok 4 math, Perplexity Sonar, Tavily, Mistral, Companies House). Wired into `lib/services/model-cascade.ts`. Not yet routing real chat traffic — that's Session 4.
- **Tests.** Vitest. Run via `npm test`. **92 tests passing today.**
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
