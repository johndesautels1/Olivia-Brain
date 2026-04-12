-- Sprint 4.3: Advanced Memory — Event-Sourced Conversation Ledger
-- Structured event log layered on top of conversation_turns.
-- Every meaningful thing that happens in a conversation gets a typed event.
-- Supports replay (rebuild state from events), projections (aggregate counts),
-- and correction chains (parent_event_id links retries/edits to originals).
-- Does NOT replace conversation_turns — additive only.

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: conversation_events
-- ═══════════════════════════════════════════════════════════════════════════════

create table if not exists public.conversation_events (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  client_id text,
  event_type text not null,
  sequence_num integer not null,
  payload jsonb not null default '{}',
  actor text not null,
  parent_event_id uuid references public.conversation_events(id) on delete set null,
  created_at timestamptz not null default now(),

  constraint conversation_events_type_check check (
    event_type in (
      'message_sent',
      'tool_invoked',
      'tool_result',
      'intent_detected',
      'strategy_changed',
      'error_occurred',
      'feedback_received',
      'memory_recalled',
      'memory_stored',
      'session_started',
      'session_ended'
    )
  ),

  constraint conversation_events_actor_check check (
    actor in ('user', 'olivia', 'system')
  ),

  -- Unique sequence per conversation — guarantees strict ordering
  constraint conversation_events_sequence_unique unique (conversation_id, sequence_num)
);

-- Primary replay index: events in order within a conversation
create index if not exists conversation_events_replay_idx
  on public.conversation_events (conversation_id, sequence_num asc);

-- Filter by event type within a conversation
create index if not exists conversation_events_type_idx
  on public.conversation_events (conversation_id, event_type);

-- Client isolation
create index if not exists conversation_events_client_idx
  on public.conversation_events (client_id, created_at desc)
  where client_id is not null;

-- Correction/retry chain lookup
create index if not exists conversation_events_parent_idx
  on public.conversation_events (parent_event_id)
  where parent_event_id is not null;

-- ═══════════════════════════════════════════════════════════════════════════════
-- RPC: Replay conversation events
-- Returns events in sequence order with optional type filter and offset
-- ═══════════════════════════════════════════════════════════════════════════════

create or replace function get_conversation_events(
  p_conversation_id uuid,
  p_event_types text[] default null,
  p_after_sequence integer default 0,
  p_limit integer default 1000
)
returns table (
  id uuid,
  conversation_id uuid,
  client_id text,
  event_type text,
  sequence_num integer,
  payload jsonb,
  actor text,
  parent_event_id uuid,
  created_at timestamptz
)
language plpgsql
as $$
begin
  return query
  select
    ce.id,
    ce.conversation_id,
    ce.client_id,
    ce.event_type,
    ce.sequence_num,
    ce.payload,
    ce.actor,
    ce.parent_event_id,
    ce.created_at
  from public.conversation_events ce
  where
    ce.conversation_id = p_conversation_id
    and ce.sequence_num > p_after_sequence
    and (p_event_types is null or ce.event_type = any(p_event_types))
  order by ce.sequence_num asc
  limit p_limit;
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- RPC: Get event counts by type for a conversation (projection)
-- ═══════════════════════════════════════════════════════════════════════════════

create or replace function get_conversation_event_counts(
  p_conversation_id uuid
)
returns table (
  event_type text,
  event_count bigint
)
language plpgsql
as $$
begin
  return query
  select
    ce.event_type,
    count(*) as event_count
  from public.conversation_events ce
  where ce.conversation_id = p_conversation_id
  group by ce.event_type
  order by event_count desc;
end;
$$;
