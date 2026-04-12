# Sprint 4.3 Advanced Memory — Agent Handoff

> **Session Date**: 2026-04-12
> **Last Commit**: `c72a898` — Semantic Memory Layer
> **Status**: Items 1-3 COMPLETE, Items 4-6 PENDING
> **Next Action**: Build Procedural Memory Layer (Item 4) — design APPROVED, ready to code

---

## CRITICAL: READ THESE FILES FIRST

1. **`BATTLE_PLAN.md`** — Master build plan, 173 features, current sprint status
2. **`OLIVIA_BUILD_STATE.md`** — Which items are app-independent vs blocked
3. **`docs/GRAPH_PERSISTENCE_DESIGN.md`** — Design doc for Item 1
4. **This file** — Continuation point and approved designs

---

## ARCHITECTURE RULES (NON-NEGOTIABLE)

- **Olivia = the brain, not the warehouse.** She does NOT store proprietary data from other apps.
- **Public knowledge** (`client_id = NULL`) = shared across all clients. Olivia gets smarter for everyone.
- **Private knowledge** (`client_id = value`) = locked to one client. NEVER leaks. NEVER shared.
- **Lazy-load on demand** — no full brain load at startup. Query DB per request.
- **Dual implementation pattern** — every service has Supabase primary + NoOp fallback + singleton factory.
- **Discuss each function in detail before coding** — the user wants minute detail on every function before code is written.
- **Every commit must be pushed to GitHub immediately** — Vercel deploys from git.
- **No file stripping** — never delete, rename, or remove existing code.
- **Run `npm run build` after every change** — verify zero errors before committing.
- **One task at a time** — complete one item, commit, check in with user before starting next.

---

## COMPLETED THIS SESSION

### Item 1: Knowledge Graph Persistence ✅
- **Migration**: `supabase/migrations/20260412_graph_persistence.sql`
  - `graph_entities` table (pgvector embedding, client isolation, type/name indexes)
  - `graph_relationships` table (FK cascade, weight constraint, directional indexes)
  - `match_graph_entities()` RPC — semantic search with client isolation
  - `get_entity_neighbors()` RPC — directional neighbor lookup with joins
- **Prisma**: `graph_entities` and `graph_relationships` models with relations
- **Service**: `src/lib/memory/graph-persistence.ts` (440+ lines)
  - `saveEntity()` — upsert with auto-embedding
  - `saveRelationship()` — upsert with FK validation
  - `findEntities()` — semantic search (public + client-scoped)
  - `getNeighbors()` — one-hop via RPC
  - `traverseFromDatabase()` — multi-hop BFS with on-demand DB queries, builds temp KnowledgeGraph
  - `deleteEntity()` / `deleteRelationship()` — with cascade
  - `getStats()` — counts by type

### Item 2: Episodic Memory Layer ✅
- **Migration**: `supabase/migrations/20260412_episodic_memory.sql`
  - `episodes` table (always private, self-referential FK for chaining, GIN on topics)
  - `match_episodes()` RPC — semantic search with date/topic filters
- **Prisma**: `episodes` model with self-relation (`episode_chain`)
- **Service**: `src/lib/memory/episodic.ts` (~370 lines)
  - `createEpisode()` — takes turns, calls Sonnet to generate title/summary/topics/outcome, embeds summary
  - `findEpisodes()` — semantic search over summaries (client-scoped)
  - `getEpisode()` — fetch by ID
  - `linkEpisodes()` — chain follow-up to parent
  - `getEpisodeTimeline()` — chronological per client with topic/date filters
  - Uses `generateText` from AI SDK with `anthropic()` provider, `maxOutputTokens` (NOT maxTokens)

### Item 3: Semantic Memory Layer ✅
- **Migration**: `supabase/migrations/20260412_semantic_memory.sql`
  - `semantic_memories` table (5 categories, confidence scoring, superseded_by chain, GIN on entity_ids)
  - `match_semantic_memories()` RPC — search excluding superseded by default
  - `decay_semantic_memories()` RPC — confidence decay for stale facts
- **Prisma**: `semantic_memories` model with self-relation (`supersede_chain`)
- **Service**: `src/lib/memory/semantic.ts` (~300 lines)
  - `learnFact()` — store with contradiction detection (supersedes conflicting facts)
  - `recallFacts()` — semantic search, excludes superseded by default
  - `reinforceFact()` — asymptotic confidence boost (10% of gap to 1.0)
  - `getFactsForEntity()` — facts linked to a graph entity
  - `decayUnreinforcedFacts()` — confidence decay via RPC

---

## NEXT: Item 4 — Procedural Memory Layer (DESIGN APPROVED)

The user approved this design. Build it.

### Table: `procedural_memories`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid PK | Unique ID |
| `client_id` | text nullable | NULL = universal procedure, value = client-specific |
| `name` | text | Short name ("Flood Zone Risk Assessment") |
| `description` | text | What this procedure accomplishes |
| `trigger` | text | When to use it ("client asks about flood zones") |
| `steps` | jsonb | Ordered array of steps with tool/action references |
| `category` | text | workflow, tool_preference, communication_style, evaluation_pattern |
| `success_count` | integer | Times procedure produced good outcome |
| `failure_count` | integer | Times it failed or was overridden |
| `embedding` | vector(1536) | For "when should I use this?" matching |
| `is_active` | boolean | Whether currently in use |
| `created_at` | timestamptz | Timestamp |
| `updated_at` | timestamptz | Timestamp |

### Functions (5):

1. **`learnProcedure(name, trigger, steps, options?)`** — Store a new procedure
2. **`findProcedures(situationQuery, clientId?)`** — Semantic search over triggers
3. **`recordOutcome(procedureId, success)`** — Track success/failure counts
4. **`getProceduresByCategory(category, clientId?)`** — List by type
5. **`deactivateProcedure(procedureId)`** — Soft-deactivate (is_active = false)

### Patterns to follow:
- Same dual-implementation pattern (Supabase + NoOp)
- Same singleton factory (`getProceduralMemoryService()`)
- Same embedding via `getEmbeddingsService()`
- Same RPC function for semantic search (`match_procedural_memories`)
- Public/private isolation via client_id
- Wire exports in `src/lib/memory/index.ts`
- Add Prisma model to `prisma/schema.prisma`
- Run `npm run build` before commit
- Use `maxOutputTokens` NOT `maxTokens` with AI SDK

---

## REMAINING AFTER Item 4

### Item 5: Event-Sourced Conversation Ledger
- Not yet designed. Needs discussion with user.
- Concept: upgrade `conversation_turns` from flat append log to true event sourcing with event types, replay capability, projections
- Current `conversation_turns` table exists and works — this enhances it

### Item 6: Snapshot-Resume State
- Not yet designed. Needs discussion with user.
- Concept: serialize full journey state to DB so a client can disconnect for weeks and resume exactly where they left off
- Current sessions are stateless between restarts

---

## KEY FILE MAP

### Memory Services (what you'll be editing)
| File | Purpose |
|------|---------|
| `src/lib/memory/index.ts` | Module exports — ADD new service exports here |
| `src/lib/memory/graph-persistence.ts` | Knowledge graph persistence (Item 1) |
| `src/lib/memory/episodic.ts` | Episodic memory (Item 2) |
| `src/lib/memory/semantic.ts` | Semantic memory (Item 3) |
| `src/lib/memory/store.ts` | Conversation store (existing) |
| `src/lib/memory/embeddings.ts` | Embedding service (existing) |
| `src/lib/memory/knowledge.ts` | Knowledge chunks (existing) |
| `src/lib/memory/mem0.ts` | Mem0 integration (existing) |
| `src/lib/memory/ttl.ts` | TTL/decay service (existing) |
| `src/lib/memory/semantic-search.ts` | Semantic search (existing) |

### Schema & Migrations
| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | All Prisma models — ADD new models here |
| `supabase/migrations/20260412_graph_persistence.sql` | Graph tables (Item 1) |
| `supabase/migrations/20260412_episodic_memory.sql` | Episodes table (Item 2) |
| `supabase/migrations/20260412_semantic_memory.sql` | Semantic memories (Item 3) |

### Existing Infrastructure
| File | Purpose |
|------|---------|
| `src/lib/rag/graph-rag.ts` | In-memory KnowledgeGraph class (738 lines, DO NOT MODIFY) |
| `src/lib/services/model-cascade.ts` | 9-model cascade |
| `src/lib/config/env.ts` | Environment config (Zod schema) |
| `src/lib/orchestration/phase1-graph.ts` | LangGraph workflow |

### Reference Docs
| File | Purpose |
|------|---------|
| `BATTLE_PLAN.md` | Master build plan |
| `OLIVIA_BUILD_STATE.md` | Independent vs blocked items |
| `UNIVERSAL_ARCHITECTURE_ANALYSIS.md` | 3-layer architecture |
| `docs/olivia-core-architecture.md` | Multi-app integration patterns |
| `docs/GRAPH_PERSISTENCE_DESIGN.md` | Item 1 design doc |

---

## LLM CALL PATTERN (for reference)

```typescript
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { getServerEnv } from "@/lib/config/env";

const env = getServerEnv();
const result = await generateText({
  model: anthropic(env.ANTHROPIC_MODEL_PRIMARY), // Sonnet 4.6
  system: "system prompt here",
  prompt: "user prompt here",
  temperature: 0.2,
  maxOutputTokens: 500, // NOT maxTokens
});
const text = result.text;
```

---

## GIT HISTORY THIS SESSION

```
f3b7a82 — Add graph persistence migration and Prisma models
d7b83f9 — Add GraphPersistenceService — persistent knowledge graph
67fd914 — Add knowledge graph persistence design document
e29b323 — Add Episodic Memory Layer — LLM-summarized conversation episodes
c72a898 — Add Semantic Memory Layer — distilled facts with contradiction detection
4a5dada — Add OLIVIA_BUILD_STATE.md — independent vs blocked task reference
09dc78a — Fix TypeScript error: add explicit type annotation to 'prev' variable
8be5b32 — Fix TypeScript error: guard against undefined in crawl data filter
```
