create table if not exists public.integration_test_runs (
  id uuid primary key default gen_random_uuid(),
  integration_id text not null,
  action text not null,
  ok boolean not null,
  actor text not null,
  summary text not null,
  details jsonb not null default '[]'::jsonb,
  tested_at timestamptz not null default now(),
  duration_ms integer not null default 0
);

create index if not exists integration_test_runs_integration_id_idx
  on public.integration_test_runs (integration_id, tested_at desc);

create index if not exists integration_test_runs_tested_at_idx
  on public.integration_test_runs (tested_at desc);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  actor text not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_event_type_idx
  on public.admin_audit_logs (event_type, created_at desc);

create index if not exists admin_audit_logs_created_at_idx
  on public.admin_audit_logs (created_at desc);
