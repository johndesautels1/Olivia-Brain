-- Sprint 1.4: Tool Integration
-- Adds pending_approvals table for HITL gates

create table if not exists public.pending_approvals (
  id uuid primary key default gen_random_uuid(),
  tool_name text not null,
  action_name text not null,
  params jsonb not null default '{}'::jsonb,
  risk_level text not null check (risk_level in ('low', 'medium', 'high', 'critical')),
  confidence_score real not null,
  reasoning text not null,
  requested_by text not null,
  client_id text,
  conversation_id text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'expired', 'auto_approved')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by text,
  resolution_note text
);

-- Indexes for pending_approvals
create index if not exists pending_approvals_status_idx
  on public.pending_approvals (status, expires_at desc)
  where status = 'pending';

create index if not exists pending_approvals_client_idx
  on public.pending_approvals (client_id, created_at desc)
  where client_id is not null;

create index if not exists pending_approvals_conversation_idx
  on public.pending_approvals (conversation_id, created_at desc)
  where conversation_id is not null;

-- Function to auto-expire old approvals
create or replace function expire_pending_approvals()
returns integer
language plpgsql
as $$
declare
  expired_count integer;
begin
  update public.pending_approvals
  set status = 'expired'
  where status = 'pending'
    and expires_at < now();

  get diagnostics expired_count = row_count;
  return expired_count;
end;
$$;

-- Tool execution logs for audit trail
create table if not exists public.tool_execution_logs (
  id uuid primary key default gen_random_uuid(),
  tool_name text not null,
  action_name text not null,
  params jsonb not null default '{}'::jsonb,
  result jsonb,
  success boolean not null,
  error_message text,
  confidence_score real,
  approval_id uuid references public.pending_approvals(id),
  executed_by text not null,
  client_id text,
  conversation_id text,
  duration_ms integer,
  created_at timestamptz not null default now()
);

-- Indexes for tool_execution_logs
create index if not exists tool_execution_logs_tool_idx
  on public.tool_execution_logs (tool_name, action_name, created_at desc);

create index if not exists tool_execution_logs_client_idx
  on public.tool_execution_logs (client_id, created_at desc)
  where client_id is not null;

create index if not exists tool_execution_logs_success_idx
  on public.tool_execution_logs (success, created_at desc);
