# Sprint 4.4 Durable Execution — Agent Handoff

> **Session Date**: 2026-04-13
> **Last Commit**: (see below — QStash commit pending)
> **Status**: Items 1-3 COMPLETE, Items 4-5 PENDING
> **Next Action**: Build Trigger.dev long-running jobs (Item 4) — needs design discussion

---

## CRITICAL: READ THESE FILES FIRST

1. **`BATTLE_PLAN.md`** — Master build plan, Sprint 4.3 marked COMPLETE, Sprint 4.4 in progress
2. **`OLIVIA_BUILD_STATE.md`** — Which items are app-independent vs blocked
3. **`docs/SPRINT_43_HANDOFF.md`** — Previous sprint handoff (all 6 items done)
4. **This file** — Continuation point

---

## ARCHITECTURE RULES (NON-NEGOTIABLE)

- Same rules as Sprint 4.3 handoff — read that file
- New: `src/lib/execution/` = Sprint 4.4 durable execution module
- Inngest functions use dynamic imports inside steps (required for tree-shaking)
- QStash needs `QSTASH_TOKEN` in Vercel env vars
- Inngest needs `INNGEST_SIGNING_KEY` + `INNGEST_EVENT_KEY` in Vercel env vars

---

## COMPLETED THIS SESSION (Sprint 4.3 → 4.4)

### Sprint 4.3 — ALL 6 ITEMS COMPLETE
1. Knowledge Graph Persistence — `d7b83f9`
2. Episodic Memory Layer — `e29b323`
3. Semantic Memory Layer — `c72a898`
4. Procedural Memory Layer — `8eb5787`
5. Event-Sourced Conversation Ledger — `f5626ee`
6. Snapshot-Resume State — `8d9a6be`

### Sprint 4.4 — Items 1-3 COMPLETE

#### Item 1: Action Budgets ✅ — `c0ad16d`
- **Migration**: `supabase/migrations/20260412_action_budgets.sql`
  - `action_budgets` table (5 budget types, 3 periods, unique per conversation+type)
  - `consume_action_budget()` RPC — atomic increment with race-condition safety, auto time-reset
- **Prisma**: `action_budgets` model with FK to conversations
- **Service**: `src/lib/execution/action-budgets.ts`
  - `initializeBudgets()` — create from configurable defaults
  - `consumeAction()` — atomic consume via RPC, also decrements total_actions
  - `checkBudget()` — read-only pre-flight check
  - `getBudgetStatus()` — all budgets for a conversation
  - `resetBudgets()` — reset consumed to 0
- **Defaults**: 50 LLM calls, 30 tool invocations, 100 API requests, 40 embeddings, 200 total per conversation

#### Item 2: Inngest Event-Driven Functions ✅ — `a5e207a`
- **Client**: `src/lib/execution/inngest-client.ts`
  - 6 typed events: `conversation.ended`, `episode.created`, `memory.maintenance`, `procedure.completed`, `data.crawl.requested`, `budget.exhausted`
- **Functions**: `src/lib/execution/inngest-functions.ts`
  - `processConversationEnd` — 3-step pipeline: episode → facts → snapshot (retries: 3, concurrency: 5)
  - `runMemoryMaintenance` — decay stale facts + log results (concurrency: 1)
  - `handleProcedureCompleted` — record outcome → log event → auto-deactivate failing procedures
  - `handleBudgetExhausted` — log exhaustion to conversation ledger
- **API Route**: `src/app/api/inngest/route.ts` — serves all functions (GET/POST/PUT)

#### Item 3: Upstash QStash Serverless Queue ✅ — (commit pending)
- **Service**: `src/lib/execution/queue.ts`
  - `enqueue()` — one-time fire-and-forget message with delay/retries/dedup
  - `createSchedule()` — recurring cron schedule
  - `removeSchedule()` — delete a schedule
  - `listSchedules()` — list all active schedules
- **Singleton factory** with NoOp fallback if QSTASH_TOKEN not set

---

## REMAINING: Items 4-5

### Item 4: Trigger.dev — Long-Running Jobs
- Not yet designed. Needs discussion with user.
- Concept: dispatch jobs that run outside Vercel's timeout limits
- Use cases: report generation, bulk data extraction, multi-step research
- Needs `TRIGGER_DEV_API_KEY` + `TRIGGER_DEV_API_URL` env vars
- Consider: job definitions, status polling, callback webhooks

### Item 5: Temporal — Crash-Proof Workflows
- Not yet designed. Needs discussion with user.
- Concept: multi-step workflows with checkpointing and replay
- Heaviest lift — requires Temporal server or Temporal Cloud account
- Use cases: city evaluation pipelines, client onboarding sequences
- Consider: whether this overlaps enough with Inngest step functions to skip

---

## KEY FILE MAP

### Execution Services (Sprint 4.4)
| File | Purpose |
|------|---------|
| `src/lib/execution/index.ts` | Module exports — all execution services |
| `src/lib/execution/action-budgets.ts` | Action budget enforcement |
| `src/lib/execution/inngest-client.ts` | Inngest client + typed event catalog |
| `src/lib/execution/inngest-functions.ts` | 4 durable step functions |
| `src/lib/execution/queue.ts` | QStash fire-and-forget queue |
| `src/app/api/inngest/route.ts` | Inngest serve endpoint |

### Memory Services (Sprint 4.3)
| File | Purpose |
|------|---------|
| `src/lib/memory/index.ts` | Module exports — all memory services |
| `src/lib/memory/graph-persistence.ts` | Knowledge graph persistence |
| `src/lib/memory/episodic.ts` | Episodic memory |
| `src/lib/memory/semantic.ts` | Semantic memory |
| `src/lib/memory/procedural.ts` | Procedural memory |
| `src/lib/memory/conversation-ledger.ts` | Event-sourced conversation ledger |
| `src/lib/memory/journey-snapshot.ts` | Journey snapshot-resume |

### Schema & Migrations (all new this session)
| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | All models (7 new models added this session) |
| `supabase/migrations/20260412_graph_persistence.sql` | Graph tables |
| `supabase/migrations/20260412_episodic_memory.sql` | Episodes table |
| `supabase/migrations/20260412_semantic_memory.sql` | Semantic memories |
| `supabase/migrations/20260412_procedural_memory.sql` | Procedural memories |
| `supabase/migrations/20260412_conversation_events.sql` | Conversation events |
| `supabase/migrations/20260412_journey_snapshots.sql` | Journey snapshots |
| `supabase/migrations/20260412_action_budgets.sql` | Action budgets |

---

## GIT HISTORY THIS SESSION

```
8be5b32 — Fix TypeScript error: guard against undefined in crawl data filter
09dc78a — Fix TypeScript error: add explicit type annotation to 'prev' variable
4a5dada — Add OLIVIA_BUILD_STATE.md
f3b7a82 — Add graph persistence migration and Prisma models
d7b83f9 — Add GraphPersistenceService — persistent knowledge graph
67fd914 — Add knowledge graph persistence design document
e29b323 — Add Episodic Memory Layer
c72a898 — Add Semantic Memory Layer
a47cca0 — Add Sprint 4.3 handoff document
8eb5787 — Add Procedural Memory Layer
f5626ee — Add Event-Sourced Conversation Ledger
8d9a6be — Add Snapshot-Resume State
be3c2e8 — Mark Sprint 4.3 complete in battle plan
c0ad16d — Add Action Budgets
a5e207a — Add Inngest event-driven functions
(pending) — Add Upstash QStash serverless queue
```

---

## SUMMARY FOR NEXT AGENT

Tell the next agent:
"Read D:\Olivia Brain\docs\SPRINT_44_HANDOFF.md first. Sprint 4.3 (6 items) and Sprint 4.4 Items 1-3 are done. Item 4 (Trigger.dev) needs design discussion, then Item 5 (Temporal) needs discussion. After that, update the battle plan to mark Sprint 4.4 complete."
