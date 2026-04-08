create extension if not exists pgcrypto;
create extension if not exists vector;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  title text,
  metadata jsonb not null default '{}'::jsonb,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_turns (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists conversation_turns_conversation_id_idx
  on public.conversation_turns (conversation_id, created_at desc);

create table if not exists public.foundation_traces (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  intent text not null,
  runtime_mode text not null,
  selected_provider text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists foundation_traces_conversation_id_idx
  on public.foundation_traces (conversation_id, created_at desc);

create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  chunk_index integer not null default 0,
  chunk_text text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index if not exists knowledge_chunks_text_search_idx
  on public.knowledge_chunks
  using gin (to_tsvector('english', chunk_text));

create index if not exists knowledge_chunks_embedding_idx
  on public.knowledge_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
