-- Sprint 1.3: Memory & Personalization
-- Adds tenant isolation, TTL, and enhanced memory features

-- Add client_id (tenant) column for permission-aware indexing
alter table public.conversations
  add column if not exists client_id text;

alter table public.conversation_turns
  add column if not exists embedding vector(1536);

alter table public.conversation_turns
  add column if not exists expires_at timestamptz;

-- Create index for tenant isolation on conversations
create index if not exists conversations_client_id_idx
  on public.conversations (client_id, created_at desc);

-- Create index for semantic search on conversation turns
create index if not exists conversation_turns_embedding_idx
  on public.conversation_turns
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Create index for TTL cleanup
create index if not exists conversation_turns_expires_at_idx
  on public.conversation_turns (expires_at)
  where expires_at is not null;

-- Add client_id to knowledge_chunks for tenant isolation
alter table public.knowledge_chunks
  add column if not exists client_id text;

alter table public.knowledge_chunks
  add column if not exists expires_at timestamptz;

-- Create index for tenant-isolated knowledge retrieval
create index if not exists knowledge_chunks_client_id_idx
  on public.knowledge_chunks (client_id, created_at desc);

-- Create index for TTL cleanup on knowledge chunks
create index if not exists knowledge_chunks_expires_at_idx
  on public.knowledge_chunks (expires_at)
  where expires_at is not null;

-- Create mem0_memories table for cross-session personalization sync
create table if not exists public.mem0_memories (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  mem0_id text not null unique,
  memory_type text not null default 'general',
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  importance_score real not null default 0.5,
  last_accessed_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create indexes for mem0_memories
create index if not exists mem0_memories_client_id_idx
  on public.mem0_memories (client_id, importance_score desc);

create index if not exists mem0_memories_mem0_id_idx
  on public.mem0_memories (mem0_id);

create index if not exists mem0_memories_expires_at_idx
  on public.mem0_memories (expires_at)
  where expires_at is not null;

create index if not exists mem0_memories_last_accessed_idx
  on public.mem0_memories (last_accessed_at);

-- Create function for semantic search over conversation turns
create or replace function match_conversation_turns(
  query_embedding vector(1536),
  p_conversation_id uuid default null,
  p_client_id text default null,
  match_threshold real default 0.7,
  match_count integer default 5
)
returns table (
  id uuid,
  conversation_id uuid,
  role text,
  content text,
  created_at timestamptz,
  similarity real
)
language plpgsql
as $$
begin
  return query
  select
    ct.id,
    ct.conversation_id,
    ct.role,
    ct.content,
    ct.created_at,
    1 - (ct.embedding <=> query_embedding) as similarity
  from public.conversation_turns ct
  join public.conversations c on c.id = ct.conversation_id
  where
    ct.embedding is not null
    and (p_conversation_id is null or ct.conversation_id = p_conversation_id)
    and (p_client_id is null or c.client_id = p_client_id)
    and (ct.expires_at is null or ct.expires_at > now())
    and 1 - (ct.embedding <=> query_embedding) > match_threshold
  order by ct.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Create function for semantic search over knowledge chunks
create or replace function match_knowledge_chunks(
  query_embedding vector(1536),
  p_client_id text default null,
  match_threshold real default 0.7,
  match_count integer default 5
)
returns table (
  id uuid,
  source text,
  chunk_text text,
  metadata jsonb,
  similarity real
)
language plpgsql
as $$
begin
  return query
  select
    kc.id,
    kc.source,
    kc.chunk_text,
    kc.metadata,
    1 - (kc.embedding <=> query_embedding) as similarity
  from public.knowledge_chunks kc
  where
    kc.embedding is not null
    and (p_client_id is null or kc.client_id = p_client_id or kc.client_id is null)
    and (kc.expires_at is null or kc.expires_at > now())
    and 1 - (kc.embedding <=> query_embedding) > match_threshold
  order by kc.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Create function for TTL cleanup (call periodically via cron or trigger)
create or replace function cleanup_expired_memories()
returns integer
language plpgsql
as $$
declare
  deleted_count integer := 0;
  temp_count integer;
begin
  -- Clean expired conversation turns
  delete from public.conversation_turns
  where expires_at is not null and expires_at < now();
  get diagnostics temp_count = row_count;
  deleted_count := deleted_count + temp_count;

  -- Clean expired knowledge chunks
  delete from public.knowledge_chunks
  where expires_at is not null and expires_at < now();
  get diagnostics temp_count = row_count;
  deleted_count := deleted_count + temp_count;

  -- Clean expired mem0 memories
  delete from public.mem0_memories
  where expires_at is not null and expires_at < now();
  get diagnostics temp_count = row_count;
  deleted_count := deleted_count + temp_count;

  return deleted_count;
end;
$$;

-- Create function for forgetting rules (decay importance over time)
create or replace function decay_memory_importance(
  decay_factor real default 0.95,
  access_threshold_days integer default 30
)
returns integer
language plpgsql
as $$
declare
  updated_count integer;
begin
  update public.mem0_memories
  set
    importance_score = importance_score * decay_factor,
    updated_at = now()
  where
    last_accessed_at < now() - (access_threshold_days || ' days')::interval
    and importance_score > 0.1;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;
