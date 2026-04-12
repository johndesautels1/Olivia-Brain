-- Sprint 4.3: Advanced Memory — Procedural Memory Layer
-- Stores learned procedures, workflows, and patterns.
-- Public procedures (client_id IS NULL) shared across all clients.
-- Private procedures (client_id = value) isolated to owning client.
-- Tracks success/failure counts to rank procedure effectiveness.

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: procedural_memories
-- ═══════════════════════════════════════════════════════════════════════════════

create table if not exists public.procedural_memories (
  id uuid primary key default gen_random_uuid(),
  client_id text,
  name text not null,
  description text not null,
  trigger text not null,
  steps jsonb not null default '[]',
  category text not null default 'workflow',
  success_count integer not null default 0,
  failure_count integer not null default 0,
  embedding vector(1536),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint procedural_memories_category_check check (
    category in ('workflow', 'tool_preference', 'communication_style', 'evaluation_pattern')
  ),

  constraint procedural_memories_counts_check check (
    success_count >= 0 and failure_count >= 0
  )
);

-- Client isolation + active filter
create index if not exists procedural_memories_client_active_idx
  on public.procedural_memories (client_id, is_active);

-- Category filter
create index if not exists procedural_memories_category_idx
  on public.procedural_memories (category);

-- Semantic search over trigger descriptions
create index if not exists procedural_memories_embedding_idx
  on public.procedural_memories
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Name lookup
create index if not exists procedural_memories_name_idx
  on public.procedural_memories (name);

-- ═══════════════════════════════════════════════════════════════════════════════
-- RPC: Semantic search over procedures
-- Returns procedures matching a situation query, scoped to public + client data
-- Only returns active procedures by default
-- ═══════════════════════════════════════════════════════════════════════════════

create or replace function match_procedural_memories(
  query_embedding vector(1536),
  p_client_id text default null,
  p_category text default null,
  p_include_inactive boolean default false,
  match_threshold real default 0.5,
  match_count integer default 10
)
returns table (
  id uuid,
  client_id text,
  name text,
  description text,
  trigger text,
  steps jsonb,
  category text,
  success_count integer,
  failure_count integer,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz,
  similarity real
)
language plpgsql
as $$
begin
  return query
  select
    pm.id,
    pm.client_id,
    pm.name,
    pm.description,
    pm.trigger,
    pm.steps,
    pm.category,
    pm.success_count,
    pm.failure_count,
    pm.is_active,
    pm.created_at,
    pm.updated_at,
    1 - (pm.embedding <=> query_embedding) as similarity
  from public.procedural_memories pm
  where
    pm.embedding is not null
    and (p_client_id is null or pm.client_id is null or pm.client_id = p_client_id)
    and (p_category is null or pm.category = p_category)
    and (p_include_inactive or pm.is_active = true)
    and 1 - (pm.embedding <=> query_embedding) > match_threshold
  order by pm.embedding <=> query_embedding
  limit match_count;
end;
$$;
