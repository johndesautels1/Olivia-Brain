/**
 * Action Budget Service
 * Sprint 4.4 — Durable Execution (Item 1: Action Budgets)
 *
 * Prevents runaway loops and cost overruns by capping how many actions
 * (LLM calls, tool invocations, API requests, embeddings) a single
 * conversation can consume. Each conversation gets a set of budgets
 * initialized from configurable defaults.
 *
 * - Atomic consume via RPC (race-condition safe)
 * - Time-based budgets auto-reset (hourly, daily)
 * - Per-conversation isolation
 * - Configurable defaults per budget type
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/config/env";

// ─── Types ───────────────────────────────────────────────────────────────────

export type BudgetType =
  | "llm_call"
  | "tool_invocation"
  | "api_request"
  | "embedding"
  | "total_actions";

export type BudgetPeriod = "conversation" | "hourly" | "daily";

export interface BudgetEntry {
  id: string;
  conversationId: string;
  clientId: string | null;
  budgetType: BudgetType;
  maxAllowed: number;
  consumed: number;
  period: BudgetPeriod;
  resetAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConsumeResult {
  /** Whether the action was allowed */
  allowed: boolean;
  /** Current consumed count (after this action if allowed) */
  consumed: number;
  /** Maximum allowed for this budget */
  maxAllowed: number;
  /** Remaining actions available */
  remaining: number;
}

export interface BudgetDefault {
  budgetType: BudgetType;
  maxAllowed: number;
  period: BudgetPeriod;
}

export interface InitializeBudgetsOptions {
  /** Which conversation to create budgets for */
  conversationId: string;
  /** Client ID (optional) */
  clientId?: string;
  /** Custom budget overrides. If omitted, uses DEFAULT_BUDGETS. */
  overrides?: BudgetDefault[];
}

// ─── Default Budget Configuration ────────────────────────────────────────────

/**
 * Default budgets applied to every conversation.
 * These can be overridden per-conversation at initialization time.
 */
export const DEFAULT_BUDGETS: BudgetDefault[] = [
  { budgetType: "llm_call", maxAllowed: 50, period: "conversation" },
  { budgetType: "tool_invocation", maxAllowed: 30, period: "conversation" },
  { budgetType: "api_request", maxAllowed: 100, period: "conversation" },
  { budgetType: "embedding", maxAllowed: 40, period: "conversation" },
  { budgetType: "total_actions", maxAllowed: 200, period: "conversation" },
];

// ─── Service Interface ───────────────────────────────────────────────────────

export interface ActionBudgetService {
  initializeBudgets(options: InitializeBudgetsOptions): Promise<BudgetEntry[]>;
  consumeAction(
    conversationId: string,
    budgetType: BudgetType,
    amount?: number
  ): Promise<ConsumeResult>;
  checkBudget(
    conversationId: string,
    budgetType: BudgetType
  ): Promise<ConsumeResult>;
  getBudgetStatus(conversationId: string): Promise<BudgetEntry[]>;
  resetBudgets(
    conversationId: string,
    budgetType?: BudgetType
  ): Promise<void>;
}

// ─── Supabase Implementation ─────────────────────────────────────────────────

class SupabaseActionBudgetService implements ActionBudgetService {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Initialize budget entries for a conversation.
   * Uses DEFAULT_BUDGETS unless overrides are provided.
   * Skips creation for budget types that already exist (idempotent).
   */
  async initializeBudgets(
    options: InitializeBudgetsOptions
  ): Promise<BudgetEntry[]> {
    const {
      conversationId,
      clientId,
      overrides,
    } = options;

    const budgets = overrides ?? DEFAULT_BUDGETS;
    const now = new Date();

    const rows = budgets.map((b) => ({
      conversation_id: conversationId,
      client_id: clientId ?? null,
      budget_type: b.budgetType,
      max_allowed: b.maxAllowed,
      consumed: 0,
      period: b.period,
      reset_at: this.computeResetAt(b.period, now),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    }));

    const { data, error } = await this.supabase
      .from("action_budgets")
      .upsert(rows, {
        onConflict: "conversation_id,budget_type",
        ignoreDuplicates: true,
      })
      .select("*");

    if (error) {
      throw new Error(
        `[ActionBudgets] Failed to initialize budgets: ${error.message}`
      );
    }

    return (data ?? []).map(this.rowToBudgetEntry);
  }

  /**
   * Atomically consume an action against a budget.
   * Uses the consume_action_budget RPC for race-condition safety.
   * Also consumes against total_actions if budgetType is not total_actions.
   */
  async consumeAction(
    conversationId: string,
    budgetType: BudgetType,
    amount: number = 1
  ): Promise<ConsumeResult> {
    // Consume the specific budget type
    const { data, error } = await this.supabase.rpc(
      "consume_action_budget",
      {
        p_conversation_id: conversationId,
        p_budget_type: budgetType,
        p_amount: amount,
      }
    );

    if (error) {
      throw new Error(
        `[ActionBudgets] Consume failed: ${error.message}`
      );
    }

    const row = Array.isArray(data) ? data[0] : data;
    const result: ConsumeResult = {
      allowed: row?.allowed ?? true,
      consumed: row?.consumed ?? 0,
      maxAllowed: row?.max_allowed ?? 0,
      remaining: row?.remaining ?? 0,
    };

    // If allowed and this isn't already total_actions, also consume total_actions
    if (result.allowed && budgetType !== "total_actions") {
      const totalResult = await this.supabase.rpc(
        "consume_action_budget",
        {
          p_conversation_id: conversationId,
          p_budget_type: "total_actions",
          p_amount: amount,
        }
      );

      // If total_actions is denied, the action is denied
      if (!totalResult.error) {
        const totalRow = Array.isArray(totalResult.data)
          ? totalResult.data[0]
          : totalResult.data;
        if (totalRow && !totalRow.allowed) {
          return {
            allowed: false,
            consumed: totalRow.consumed ?? 0,
            maxAllowed: totalRow.max_allowed ?? 0,
            remaining: 0,
          };
        }
      }
    }

    return result;
  }

  /**
   * Read-only check — does the budget have capacity for an action?
   * Does NOT consume. Useful for pre-flight checks.
   */
  async checkBudget(
    conversationId: string,
    budgetType: BudgetType
  ): Promise<ConsumeResult> {
    const { data, error } = await this.supabase
      .from("action_budgets")
      .select("consumed, max_allowed")
      .eq("conversation_id", conversationId)
      .eq("budget_type", budgetType)
      .maybeSingle();

    if (error) {
      throw new Error(
        `[ActionBudgets] Check failed: ${error.message}`
      );
    }

    // No budget row = no limit = allowed
    if (!data) {
      return { allowed: true, consumed: 0, maxAllowed: 0, remaining: 0 };
    }

    const consumed = data.consumed as number;
    const maxAllowed = data.max_allowed as number;
    const remaining = maxAllowed - consumed;

    return {
      allowed: remaining > 0,
      consumed,
      maxAllowed,
      remaining,
    };
  }

  /**
   * Get all budget entries for a conversation.
   * Returns current consumption status for each budget type.
   */
  async getBudgetStatus(conversationId: string): Promise<BudgetEntry[]> {
    const { data, error } = await this.supabase
      .from("action_budgets")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("budget_type");

    if (error) {
      throw new Error(
        `[ActionBudgets] Status lookup failed: ${error.message}`
      );
    }

    return (data ?? []).map(this.rowToBudgetEntry);
  }

  /**
   * Reset consumed count to 0 for a conversation.
   * If budgetType is provided, resets only that type.
   * If omitted, resets all budgets for the conversation.
   */
  async resetBudgets(
    conversationId: string,
    budgetType?: BudgetType
  ): Promise<void> {
    let query = this.supabase
      .from("action_budgets")
      .update({
        consumed: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("conversation_id", conversationId);

    if (budgetType) {
      query = query.eq("budget_type", budgetType);
    }

    const { error } = await query;

    if (error) {
      throw new Error(
        `[ActionBudgets] Reset failed: ${error.message}`
      );
    }
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Compute the initial reset_at timestamp based on period.
   * conversation = null (never auto-resets)
   * hourly = 1 hour from now
   * daily = 1 day from now
   */
  private computeResetAt(
    period: BudgetPeriod,
    now: Date
  ): string | null {
    switch (period) {
      case "hourly":
        return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
      case "daily":
        return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      default:
        return null;
    }
  }

  /**
   * Convert a Supabase row to a BudgetEntry object.
   */
  private rowToBudgetEntry(row: Record<string, unknown>): BudgetEntry {
    return {
      id: row.id as string,
      conversationId: row.conversation_id as string,
      clientId: (row.client_id as string) ?? null,
      budgetType: row.budget_type as BudgetType,
      maxAllowed: row.max_allowed as number,
      consumed: row.consumed as number,
      period: row.period as BudgetPeriod,
      resetAt: (row.reset_at as string) ?? null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}

// ─── NoOp Fallback ───────────────────────────────────────────────────────────

class NoOpActionBudgetService implements ActionBudgetService {
  async initializeBudgets(
    options: InitializeBudgetsOptions
  ): Promise<BudgetEntry[]> {
    console.warn(
      "[ActionBudgets] No Supabase configured — budgets not persisted"
    );
    return (options.overrides ?? DEFAULT_BUDGETS).map((b) => ({
      id: "noop",
      conversationId: options.conversationId,
      clientId: options.clientId ?? null,
      budgetType: b.budgetType,
      maxAllowed: b.maxAllowed,
      consumed: 0,
      period: b.period,
      resetAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  }

  async consumeAction(): Promise<ConsumeResult> {
    // NoOp always allows — no budget enforcement without DB
    return { allowed: true, consumed: 0, maxAllowed: 0, remaining: 0 };
  }

  async checkBudget(): Promise<ConsumeResult> {
    return { allowed: true, consumed: 0, maxAllowed: 0, remaining: 0 };
  }

  async getBudgetStatus(): Promise<BudgetEntry[]> {
    console.warn(
      "[ActionBudgets] No Supabase configured — returning empty"
    );
    return [];
  }

  async resetBudgets(): Promise<void> {
    console.warn(
      "[ActionBudgets] No Supabase configured — reset skipped"
    );
  }
}

// ─── Singleton Factory ───────────────────────────────────────────────────────

let actionBudgetService: ActionBudgetService | undefined;

/**
 * Get the action budget service singleton.
 * Returns Supabase-backed service if configured, otherwise NoOp fallback.
 */
export function getActionBudgetService(): ActionBudgetService {
  if (!actionBudgetService) {
    const env = getServerEnv();

    if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      actionBudgetService = new SupabaseActionBudgetService(
        env.SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY
      );
    } else {
      actionBudgetService = new NoOpActionBudgetService();
    }
  }

  return actionBudgetService;
}
