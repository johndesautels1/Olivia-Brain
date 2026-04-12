-- Sprint 4.4: Durable Execution — Action Budgets
-- Prevents runaway loops and cost overruns by capping actions per conversation.
-- One row per conversation per budget type. Atomic consume RPC for race safety.

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: action_budgets
-- ═══════════════════════════════════════════════════════════════════════════════

create table if not exists public.action_budgets (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  client_id text,
  budget_type text not null,
  max_allowed integer not null,
  consumed integer not null default 0,
  period text not null default 'conversation',
  reset_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint action_budgets_type_check check (
    budget_type in ('llm_call', 'tool_invocation', 'api_request', 'embedding', 'total_actions')
  ),

  constraint action_budgets_period_check check (
    period in ('conversation', 'hourly', 'daily')
  ),

  constraint action_budgets_positive_check check (
    max_allowed > 0 and consumed >= 0
  ),

  -- One budget per conversation per type — no duplicates
  constraint action_budgets_unique unique (conversation_id, budget_type)
);

-- Lookup all budgets for a conversation
create index if not exists action_budgets_conversation_idx
  on public.action_budgets (conversation_id);

-- Find budgets needing time-based reset
create index if not exists action_budgets_reset_idx
  on public.action_budgets (reset_at)
  where reset_at is not null;

-- Client-level budget overview
create index if not exists action_budgets_client_idx
  on public.action_budgets (client_id, created_at desc)
  where client_id is not null;

-- ═══════════════════════════════════════════════════════════════════════════════
-- RPC: Atomic consume — increment consumed and return whether allowed
-- Returns: allowed (boolean), consumed (new value), max_allowed, remaining
-- Race-condition safe: single atomic UPDATE + SELECT
-- ═══════════════════════════════════════════════════════════════════════════════

create or replace function consume_action_budget(
  p_conversation_id uuid,
  p_budget_type text,
  p_amount integer default 1
)
returns table (
  allowed boolean,
  consumed integer,
  max_allowed integer,
  remaining integer
)
language plpgsql
as $$
declare
  v_budget record;
begin
  -- Lock and fetch the budget row
  select ab.consumed as current_consumed, ab.max_allowed as current_max, ab.reset_at
  into v_budget
  from public.action_budgets ab
  where ab.conversation_id = p_conversation_id
    and ab.budget_type = p_budget_type
  for update;

  -- No budget row found — action is allowed (no limit configured)
  if not found then
    return query select true, 0, 0, 0;
    return;
  end if;

  -- Check if time-based reset is due
  if v_budget.reset_at is not null and v_budget.reset_at <= now() then
    update public.action_budgets ab
    set consumed = 0,
        reset_at = case
          when ab.period = 'hourly' then now() + interval '1 hour'
          when ab.period = 'daily' then now() + interval '1 day'
          else ab.reset_at
        end,
        updated_at = now()
    where ab.conversation_id = p_conversation_id
      and ab.budget_type = p_budget_type;

    v_budget.current_consumed := 0;
  end if;

  -- Check if action would exceed budget
  if v_budget.current_consumed + p_amount > v_budget.current_max then
    return query select
      false,
      v_budget.current_consumed,
      v_budget.current_max,
      v_budget.current_max - v_budget.current_consumed;
    return;
  end if;

  -- Consume the action
  update public.action_budgets ab
  set consumed = ab.consumed + p_amount,
      updated_at = now()
  where ab.conversation_id = p_conversation_id
    and ab.budget_type = p_budget_type;

  return query select
    true,
    v_budget.current_consumed + p_amount,
    v_budget.current_max,
    v_budget.current_max - (v_budget.current_consumed + p_amount);
end;
$$;
