-- Sprint 4.3: Advanced Memory — Semantic Memory Layer
-- Stores distilled facts, preferences, insights, and constraints.
-- Public facts (client_id IS NULL) shared across all clients.
-- Private facts (client_id = value) isolated to owning client.
-- Supports contradiction detection via superseded_by chain.
-- Supports confidence reinforcement and decay.

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: semantic_memories
-- ═══════════════════════════════════════════════════════════════════════════════

create table if not exists public.semantic_memories (
  id uuid primary key default gen_random_uuid(),
  client_id text,
  content text not null,
  category text not null default 'fact',
  confidence real not null default 0.7,
  source_episode_ids uuid[] not null default '{}',
  entity_ids uuid[] not null default '{}',
  embedding vector(1536),
  superseded_by uuid references public.semantic_memories(id) on delete set null,
  last_reinforced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint semantic_memories_category_check check (
    category in ('preference', 'fact', 'insight', 'constraint', 'learned_skill')
  ),

  constraint semantic_memories_confidence_check check (
    confidence >= 0.0 and confidence <= 1.0
  )
);

-- Client isolation + confidence ranking (highest confidence first)
create index if not exists semantic_memories_client_confidence_idx
  on public.semantic_memories (client_id, confidence desc);

-- Category filter
create index if not exists semantic_memories_category_idx
  on public.semantic_memories (category);

-- Semantic search over fact content
create index if not exists semantic_memories_embedding_idx
  on public.semantic_memories
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Superseded chain lookup
create index if not exists semantic_memories_superseded_by_idx
  on public.semantic_memories (superseded_by)
  where superseded_by is not null;

-- Reinforcement decay targeting (stale facts)
create index if not exists semantic_memories_reinforced_idx
  on public.semantic_memories (last_reinforced_at);

-- Entity linkage via GIN on uuid array
create index if not exists semantic_memories_entity_ids_idx
  on public.semantic_memories using gin (entity_ids);

-- ═══════════════════════════════════════════════════════════════════════════════
-- RPC: Semantic search over facts
-- Returns facts matching a query, scoped to public + client data
-- Excludes superseded facts by default
-- ═══════════════════════════════════════════════════════════════════════════════

create or replace function match_semantic_memories(
  query_embedding vector(1536),
  p_client_id text default null,
  p_category text default null,
  p_include_superseded boolean default false,
  match_threshold real default 0.5,
  match_count integer default 10
)
returns table (
  id uuid,
  client_id text,
  content text,
  category text,
  confidence real,
  source_episode_ids uuid[],
  entity_ids uuid[],
  superseded_by uuid,
  last_reinforced_at timestamptz,
  created_at timestamptz,
  similarity real
)
language plpgsql
as $$
begin
  return query
  select
    sm.id,
    sm.client_id,
    sm.content,
    sm.category,
    sm.confidence,
    sm.source_episode_ids,
    sm.entity_ids,
    sm.superseded_by,
    sm.last_reinforced_at,
    sm.created_at,
    1 - (sm.embedding <=> query_embedding) as similarity
  from public.semantic_memories sm
  where
    sm.embedding is not null
    and (p_client_id is null or sm.client_id is null or sm.client_id = p_client_id)
    and (p_category is null or sm.category = p_category)
    and (p_include_superseded or sm.superseded_by is null)
    and 1 - (sm.embedding <=> query_embedding) > match_threshold
  order by sm.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- RPC: Decay unreinforced facts
-- Reduces confidence of facts not reinforced within threshold period
-- ═══════════════════════════════════════════════════════════════════════════════

create or replace function decay_semantic_memories(
  p_threshold_days integer default 60,
  p_decay_factor real default 0.9,
  p_min_confidence real default 0.1
)
returns integer
language plpgsql
as $$
declare
  updated_count integer;
begin
  update public.semantic_memories
  set confidence = confidence * p_decay_factor
  where
    last_reinforced_at < now() - (p_threshold_days || ' days')::interval
    and confidence > p_min_confidence
    and superseded_by is null;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;
