-- Sprint 4.3: Advanced Memory — Episodic Memory Layer
-- Stores coherent episodes (summarized conversation segments) for rich recall.
-- Episodes are ALWAYS private (client_id required). No public episodes.
-- Created at conversation end, not auto-detected during conversation.

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: episodes
-- ═══════════════════════════════════════════════════════════════════════════════

create table if not exists public.episodes (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  conversation_id uuid not null,
  title text not null,
  summary text not null,
  topics text[] not null default '{}',
  participants text[] not null default '{}',
  outcome text,
  turn_ids uuid[] not null default '{}',
  start_at timestamptz not null,
  end_at timestamptz not null,
  embedding vector(1536),
  linked_entity_ids uuid[] not null default '{}',
  parent_episode_id uuid references public.episodes(id) on delete set null,
  created_at timestamptz not null default now(),

  constraint episodes_client_id_not_empty check (length(trim(client_id)) > 0)
);

-- Client timeline queries (all episodes for a client, newest first)
create index if not exists episodes_client_id_idx
  on public.episodes (client_id, end_at desc);

-- Conversation lookup (all episodes from a specific conversation)
create index if not exists episodes_conversation_id_idx
  on public.episodes (conversation_id);

-- Semantic search over episode summaries
create index if not exists episodes_embedding_idx
  on public.episodes
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Parent episode lookup (find follow-up episodes)
create index if not exists episodes_parent_episode_id_idx
  on public.episodes (parent_episode_id)
  where parent_episode_id is not null;

-- Topic search via GIN index on the text array
create index if not exists episodes_topics_idx
  on public.episodes using gin (topics);

-- ═══════════════════════════════════════════════════════════════════════════════
-- RPC: Semantic search over episodes
-- Finds episodes matching a query, scoped to a specific client
-- ═══════════════════════════════════════════════════════════════════════════════

create or replace function match_episodes(
  query_embedding vector(1536),
  p_client_id text,
  p_topic text default null,
  p_start_after timestamptz default null,
  p_end_before timestamptz default null,
  match_threshold real default 0.5,
  match_count integer default 10
)
returns table (
  id uuid,
  client_id text,
  conversation_id uuid,
  title text,
  summary text,
  topics text[],
  participants text[],
  outcome text,
  turn_ids uuid[],
  start_at timestamptz,
  end_at timestamptz,
  linked_entity_ids uuid[],
  parent_episode_id uuid,
  created_at timestamptz,
  similarity real
)
language plpgsql
as $$
begin
  return query
  select
    e.id,
    e.client_id,
    e.conversation_id,
    e.title,
    e.summary,
    e.topics,
    e.participants,
    e.outcome,
    e.turn_ids,
    e.start_at,
    e.end_at,
    e.linked_entity_ids,
    e.parent_episode_id,
    e.created_at,
    1 - (e.embedding <=> query_embedding) as similarity
  from public.episodes e
  where
    e.embedding is not null
    and e.client_id = p_client_id
    and (p_topic is null or p_topic = any(e.topics))
    and (p_start_after is null or e.start_at >= p_start_after)
    and (p_end_before is null or e.end_at <= p_end_before)
    and 1 - (e.embedding <=> query_embedding) > match_threshold
  order by e.embedding <=> query_embedding
  limit match_count;
end;
$$;
