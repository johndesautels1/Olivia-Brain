# Knowledge Graph Persistence — Design Document

> **Sprint**: 4.3 — Advanced Memory (Item 1: Zep / Graphiti Knowledge Graph)
> **Created**: 2026-04-12
> **Status**: Implementation in progress

---

## Problem

The existing `KnowledgeGraph` class in `src/lib/rag/graph-rag.ts` (738 lines) stores all entities, relationships, and chunks in JavaScript `Map` objects. This means:

- Server restart = total amnesia
- Olivia cannot learn and retain knowledge across sessions
- No multi-hop reasoning over persistent data
- No ability to grow smarter over time

## Architecture Decisions

### 1. Hybrid Public/Private Knowledge

- **Public knowledge** (`client_id = NULL`): Cities, neighborhoods, market data, schools, general facts. Shared across all clients. Olivia gets smarter for everyone.
- **Private knowledge** (`client_id = 'abc123'`): Budgets, dealbreakers, preferences, personal details. Locked to one client only. Never shared.
- **Every query** pulls from both: `WHERE client_id IS NULL OR client_id = $clientId`
- **Rule**: Private knowledge must NEVER leak between clients. This is non-negotiable.

### 2. Lazy-Load on Demand (No Full Brain Load)

- Olivia does NOT load the entire graph into memory at startup
- She queries Supabase in real time, pulling only entities and relationships relevant to the current question
- Multi-hop traversal does one DB query per hop
- Builds a temporary in-memory subgraph for traversal, then releases it
- Scales to any graph size without memory pressure

### 3. Existing Code Preserved

- The existing `KnowledgeGraph` and `GraphRAG` classes in `graph-rag.ts` are NOT modified
- The new `GraphPersistenceService` is a separate service that reads/writes Supabase
- When traversal is needed, it hydrates a temporary `KnowledgeGraph` instance from DB results
- All existing traversal, BFS, path-finding logic is reused as-is

---

## Database Schema

### Table: `graph_entities`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid (PK) | Unique entity identifier |
| `name` | text | Display name ("Tampa", "John Smith") |
| `type` | text | Entity type (person, location, organization, concept, etc.) |
| `properties` | jsonb | Flexible extra data about this entity |
| `embedding` | vector(1536) | Semantic search vector (OpenAI text-embedding-3-small) |
| `chunk_ids` | text[] | Which text chunks reference this entity |
| `source` | text (nullable) | Where Olivia learned this (URL, doc, conversation) |
| `client_id` | text (nullable) | NULL = public, value = private to that client |
| `created_at` | timestamptz | Creation timestamp |
| `updated_at` | timestamptz | Last update timestamp |

**Indexes:**
- `name` (lowercase) — fuzzy name search
- `type` — filtered queries by entity type
- `embedding` — IVFFLAT cosine similarity search
- `client_id, created_at` — tenant-scoped queries

### Table: `graph_relationships`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid (PK) | Unique relationship identifier |
| `source_entity_id` | uuid (FK → graph_entities) | The "from" entity |
| `target_entity_id` | uuid (FK → graph_entities) | The "to" entity |
| `type` | text | Relationship type (located_in, works_for, part_of, etc.) |
| `label` | text (nullable) | Custom label if type is "custom" |
| `weight` | real | 0-1 strength score |
| `properties` | jsonb | Flexible extra data |
| `evidence` | text (nullable) | Text/source proving this relationship |
| `client_id` | text (nullable) | NULL = public, value = private |
| `created_at` | timestamptz | Creation timestamp |

**Indexes:**
- `source_entity_id` — outgoing relationship lookup
- `target_entity_id` — incoming relationship lookup
- `type` — filtered by relationship type
- `client_id, created_at` — tenant-scoped queries

**Foreign Keys:**
- `source_entity_id` → `graph_entities.id` (CASCADE delete)
- `target_entity_id` → `graph_entities.id` (CASCADE delete)

---

## Service: `GraphPersistenceService`

**File:** `src/lib/memory/graph-persistence.ts`

### Function 1: `saveEntity(entity, clientId?)`

- Upserts an entity to Supabase
- If `clientId` provided → private (only that client sees it)
- If no `clientId` → public (everyone benefits)
- Generates embedding for `name + type + key properties` via OpenAI
- If entity already exists (same ID), updates it (Olivia gets smarter, not duplicative)

### Function 2: `saveRelationship(relationship, clientId?)`

- Upserts a relationship between two entities
- Same public/private logic via `clientId`
- Validates both entities exist before saving
- Upserts by ID

### Function 3: `findEntities(query, clientId, options?)`

- Real-time brain pull
- Embeds the query text via OpenAI
- Searches `graph_entities` with cosine similarity
- Filters: `client_id IS NULL OR client_id = $clientId`
- Options: entity type filter, limit, similarity threshold
- Returns ranked entity list

### Function 4: `getNeighbors(entityId, clientId, options?)`

- Pulls direct connections from `graph_relationships`
- WHERE source or target = entityId
- Respects client isolation (public + this client only)
- Options: direction (out/in/both), relationship types, min weight
- Returns connected entities + relationships

### Function 5: `traverseFromDatabase(seedEntityIds, clientId, maxHops, options?)`

- Multi-hop reasoning via iterative DB queries
- Each hop: query relationships for current frontier, fetch connected entities
- Builds temporary in-memory `KnowledgeGraph` from results
- Runs existing BFS/traversal logic on the subgraph
- Returns entities, relationships, chunks

### Function 6: `deleteEntity(entityId)` / `deleteRelationship(relationshipId)`

- Removes from Supabase
- Entity deletion cascades to remove all connected relationships (via FK CASCADE)

### Function 7: `getStats(clientId?)`

- Count of entities by type, relationships by type
- Scoped to public + client's private data
- Used for admin dashboard and health checks

---

## Integration Points

- **Orchestration layer** (`phase1-graph.ts`): After entity extraction, call `saveEntity()` to persist
- **RAG pipeline** (`graph-rag.ts`): Use `traverseFromDatabase()` instead of in-memory-only traversal
- **Memory admin API** (`/api/admin/memory`): Add graph stats endpoint
- **Knowledge service** (`knowledge.ts`): Link knowledge chunks to graph entities

---

## Testing Strategy

- Unit tests for each function with mock Supabase client
- Integration tests verifying:
  - Public entities visible to all clients
  - Private entities visible only to owning client
  - Relationship cascade on entity delete
  - Multi-hop traversal produces correct subgraph
  - Embedding-based search returns semantically relevant results

---

## Files Created/Modified

| File | Action |
|------|--------|
| `supabase/migrations/20260412_graph_persistence.sql` | NEW — migration |
| `prisma/schema.prisma` | MODIFIED — add graph_entities, graph_relationships models |
| `src/lib/memory/graph-persistence.ts` | NEW — service |
| `src/lib/memory/index.ts` | MODIFIED — export new service |
| `docs/GRAPH_PERSISTENCE_DESIGN.md` | NEW — this document |
