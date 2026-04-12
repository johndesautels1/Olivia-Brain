-- Sprint 4.3: Advanced Memory — Snapshot-Resume State
-- Point-in-time serialization of journey state for instant resume.
-- Always private (client_id required). Linked to active procedures and
-- conversation events for seamless continuation after disconnection.

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: journey_snapshots
-- ═══════════════════════════════════════════════════════════════════════════════

create table if not exists public.journey_snapshots (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  client_id text not null,
  snapshot_type text not null default 'auto',
  active_procedure_id uuid references public.procedural_memories(id) on delete set null,
  procedure_step_index integer not null default 0,
  collected_data jsonb not null default '{}',
  pending_questions jsonb not null default '[]',
  context_summary text not null,
  sentiment text,
  last_event_sequence integer not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),

  constraint journey_snapshots_type_check check (
    snapshot_type in ('auto', 'checkpoint')
  ),

  constraint journey_snapshots_step_check check (
    procedure_step_index >= 0
  )
);

-- Latest snapshot per conversation (primary resume query)
create index if not exists journey_snapshots_conversation_idx
  on public.journey_snapshots (conversation_id, created_at desc);

-- All snapshots for a client, newest first
create index if not exists journey_snapshots_client_idx
  on public.journey_snapshots (client_id, created_at desc);

-- Find snapshots using a specific procedure
create index if not exists journey_snapshots_procedure_idx
  on public.journey_snapshots (active_procedure_id)
  where active_procedure_id is not null;
