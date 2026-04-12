-- Sprint 4.3: Advanced Memory — Knowledge Graph Persistence
-- Adds persistent graph entity and relationship storage with hybrid public/private isolation
-- Public knowledge (client_id IS NULL) shared across all clients
-- Private knowledge (client_id = value) isolated to owning client only

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: graph_entities
-- ═══════════════════════════════════════════════════════════════════════════════

create table if not exists public.graph_entities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'concept',
  properties jsonb not null default '{}'::jsonb,
  embedding vector(1536),
  chunk_ids text[] not null default '{}',
  source text,
  client_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint graph_entities_type_check check (
    type in (
      'person', 'organization', 'location', 'event', 'concept',
      'product', 'date', 'metric', 'document', 'custom'
    )
  )
);

-- Lowercase name index for fuzzy search
create index if not exists graph_entities_name_idx
  on public.graph_entities (lower(name));

-- Type index for filtered queries
create index if not exists graph_entities_type_idx
  on public.graph_entities (type);

-- Embedding index for semantic similarity search
create index if not exists graph_entities_embedding_idx
  on public.graph_entities
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Client isolation index (public + private scoped queries)
create index if not exists graph_entities_client_id_idx
  on public.graph_entities (client_id, created_at desc);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: graph_relationships
-- ═══════════════════════════════════════════════════════════════════════════════

create table if not exists public.graph_relationships (
  id uuid primary key default gen_random_uuid(),
  source_entity_id uuid not null references public.graph_entities(id) on delete cascade,
  target_entity_id uuid not null references public.graph_entities(id) on delete cascade,
  type text not null default 'related_to',
  label text,
  weight real not null default 0.5,
  properties jsonb not null default '{}'::jsonb,
  evidence text,
  client_id text,
  created_at timestamptz not null default now(),

  constraint graph_relationships_type_check check (
    type in (
      'related_to', 'part_of', 'located_in', 'works_for', 'owns',
      'created_by', 'happened_at', 'causes', 'mentions',
      'similar_to', 'contradicts', 'supports', 'custom'
    )
  ),

  constraint graph_relationships_weight_check check (
    weight >= 0.0 and weight <= 1.0
  )
);

-- Source entity lookup (outgoing relationships)
create index if not exists graph_relationships_source_idx
  on public.graph_relationships (source_entity_id);

-- Target entity lookup (incoming relationships)
create index if not exists graph_relationships_target_idx
  on public.graph_relationships (target_entity_id);

-- Relationship type index
create index if not exists graph_relationships_type_idx
  on public.graph_relationships (type);

-- Client isolation index
create index if not exists graph_relationships_client_id_idx
  on public.graph_relationships (client_id, created_at desc);

-- ═══════════════════════════════════════════════════════════════════════════════
-- RPC: Semantic search over graph entities
-- Returns entities matching a query embedding, scoped to public + client data
-- ═══════════════════════════════════════════════════════════════════════════════

create or replace function match_graph_entities(
  query_embedding vector(1536),
  p_client_id text default null,
  p_entity_type text default null,
  match_threshold real default 0.6,
  match_count integer default 10
)
returns table (
  id uuid,
  name text,
  type text,
  properties jsonb,
  chunk_ids text[],
  source text,
  client_id text,
  created_at timestamptz,
  similarity real
)
language plpgsql
as $$
begin
  return query
  select
    ge.id,
    ge.name,
    ge.type,
    ge.properties,
    ge.chunk_ids,
    ge.source,
    ge.client_id,
    ge.created_at,
    1 - (ge.embedding <=> query_embedding) as similarity
  from public.graph_entities ge
  where
    ge.embedding is not null
    and (p_client_id is null or ge.client_id is null or ge.client_id = p_client_id)
    and (p_entity_type is null or ge.type = p_entity_type)
    and 1 - (ge.embedding <=> query_embedding) > match_threshold
  order by ge.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- RPC: Get neighbors of an entity (relationships + connected entities)
-- Respects client isolation: returns public + client-scoped relationships
-- ═══════════════════════════════════════════════════════════════════════════════

create or replace function get_entity_neighbors(
  p_entity_id uuid,
  p_client_id text default null,
  p_direction text default 'both',
  p_rel_type text default null,
  p_min_weight real default 0.0,
  p_limit integer default 50
)
returns table (
  relationship_id uuid,
  rel_type text,
  rel_weight real,
  rel_label text,
  rel_properties jsonb,
  rel_evidence text,
  neighbor_id uuid,
  neighbor_name text,
  neighbor_type text,
  neighbor_properties jsonb,
  direction text
)
language plpgsql
as $$
begin
  return query
  -- Outgoing relationships
  select
    gr.id as relationship_id,
    gr.type as rel_type,
    gr.weight as rel_weight,
    gr.label as rel_label,
    gr.properties as rel_properties,
    gr.evidence as rel_evidence,
    ge.id as neighbor_id,
    ge.name as neighbor_name,
    ge.type as neighbor_type,
    ge.properties as neighbor_properties,
    'outgoing'::text as direction
  from public.graph_relationships gr
  join public.graph_entities ge on ge.id = gr.target_entity_id
  where
    gr.source_entity_id = p_entity_id
    and (p_direction in ('both', 'out'))
    and (p_client_id is null or gr.client_id is null or gr.client_id = p_client_id)
    and (p_rel_type is null or gr.type = p_rel_type)
    and gr.weight >= p_min_weight

  union all

  -- Incoming relationships
  select
    gr.id as relationship_id,
    gr.type as rel_type,
    gr.weight as rel_weight,
    gr.label as rel_label,
    gr.properties as rel_properties,
    gr.evidence as rel_evidence,
    ge.id as neighbor_id,
    ge.name as neighbor_name,
    ge.type as neighbor_type,
    ge.properties as neighbor_properties,
    'incoming'::text as direction
  from public.graph_relationships gr
  join public.graph_entities ge on ge.id = gr.source_entity_id
  where
    gr.target_entity_id = p_entity_id
    and (p_direction in ('both', 'in'))
    and (p_client_id is null or gr.client_id is null or gr.client_id = p_client_id)
    and (p_rel_type is null or gr.type = p_rel_type)
    and gr.weight >= p_min_weight

  order by rel_weight desc
  limit p_limit;
end;
$$;
