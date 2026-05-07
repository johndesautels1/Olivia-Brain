/**
 * Composio dispatch wrapper — Track O Session O1.
 *
 * Sits between the model cascade (`@/lib/services/model-cascade`) and the
 * Composio SDK wrapper (`@/lib/services/composio`). Owns the tool catalog
 * the LLM is allowed to request, threads each request through the
 * confidence + approval-gate flow (`@/lib/tools/confidence-gate`), executes
 * via Composio when auto-approved, and emits a trace entry on the
 * `FoundationTrace.toolCalls` array.
 *
 * Reliability guarantees:
 * - Every external call carries `AbortSignal` via the Composio SDK's
 *   internal timeout (rule #7).
 * - Tool argument values are NOT logged into traces — only metadata
 *   (tool id, action, decision, risk, confidence, duration). Rule #8.
 * - When `COMPOSIO_API_KEY` is absent, dispatch returns a structured
 *   `not_configured` decision so the cascade can narrate the situation
 *   without crashing.
 *
 * Closes weakness W-001 (no agentic tool dispatch).
 */

import { tool, type Tool } from "ai";
import { z } from "zod";

import { getComposioService } from "@/lib/services/composio";
import {
  type ApprovalGateConfig,
  getApprovalGateService,
  type RiskLevel,
} from "./approval-gate";
import {
  calculateConfidence,
  evaluateHITLGate,
  type HITLDecision,
} from "./confidence-gate";
import type { ToolCallTrace } from "@/lib/foundation/types";

// ── Types ─────────────────────────────────────────────────────────────

export interface ToolDispatchContext {
  /** Composio entity id — typically the OB user id. */
  userId: string;
  /** Conversation that triggered the tool call. Threaded into approval
   *  records so the human reviewer has context. */
  conversationId: string;
  /** Optional tenant / client scoping. */
  clientId?: string;
}

export interface ToolDispatchInput {
  /** Tool id from the catalog (e.g. "gmail.send"). */
  toolName: string;
  /** Free-form payload — exact shape depends on the tool. NOT logged. */
  params: Record<string, unknown>;
  /** Optional confidence factor overrides. Sensible defaults are used
   *  when omitted (the cascade rarely supplies them). */
  confidenceFactors?: Parameters<typeof calculateConfidence>[0];
  /** For financial tools: amount in pence used by the gate's
   *  `maxAutoApproveAmount` check. */
  amount?: number;
}

export type ToolDispatchOutcome =
  | {
      decision: "auto_approved" | "executed";
      ok: boolean;
      data?: unknown;
      error?: string;
      trace: ToolCallTrace;
    }
  | {
      decision: "pending_approval";
      pendingApprovalId: string;
      message: string;
      trace: ToolCallTrace;
    }
  | {
      decision: "rejected";
      message: string;
      trace: ToolCallTrace;
    }
  | {
      decision: "not_configured";
      message: string;
      trace: ToolCallTrace;
    };

interface CatalogEntry {
  /** Logical tool id surfaced to the LLM (e.g. "gmail.send"). Stable. */
  id: string;
  /** Tuple form used by approval-gate.ts gate config lookups. */
  approvalGate: { tool: string; action: string };
  /** Composio action id passed to `executeAction()`. */
  composioAction: string;
  /** Description shown to the LLM when the tool is exposed via
   *  Vercel AI SDK. */
  description: string;
  /** Zod schema for the LLM-supplied arguments. AI SDK v6 calls this
   *  `inputSchema` (was `parameters` in v5). */
  inputSchema: z.ZodTypeAny;
  /** Default per-tool risk floor — used only when the approval-gate has
   *  no specific config registered. */
  defaultRisk: RiskLevel;
}

// ── Tool catalog ──────────────────────────────────────────────────────

/**
 * Tools the LLM is allowed to request via the cascade `tools:` array.
 *
 * The intentional starting set is the smallest viable surface for the O1
 * exit criterion: a Gmail follow-up reply. Future sessions extend the
 * catalog (calendar, slack, hubspot, etc.) — each entry must come paired
 * with a matching `DEFAULT_APPROVAL_GATES` row in `approval-gate.ts`.
 */
export const TOOL_CATALOG: readonly CatalogEntry[] = Object.freeze([
  {
    id: "gmail.send",
    approvalGate: { tool: "email", action: "send" },
    composioAction: "GMAIL_SEND_EMAIL",
    description:
      "Send a new email via the user's connected Gmail account. Use for outbound replies and follow-ups. Always requires human approval before delivery.",
    inputSchema: z.object({
      to: z.string().email().describe("Recipient email address."),
      subject: z.string().min(1).max(998).describe("Email subject line."),
      body: z.string().min(1).describe("Email body in plain text or HTML."),
      cc: z.array(z.string().email()).optional(),
      bcc: z.array(z.string().email()).optional(),
    }),
    defaultRisk: "medium",
  },
  {
    id: "gmail.reply",
    approvalGate: { tool: "email", action: "reply" },
    composioAction: "GMAIL_REPLY_TO_THREAD",
    description:
      "Reply to an existing Gmail thread. Use when continuing a conversation rather than starting one. Requires human approval before delivery.",
    inputSchema: z.object({
      threadId: z.string().min(1).describe("Gmail thread id to reply to."),
      body: z.string().min(1).describe("Reply body."),
    }),
    defaultRisk: "medium",
  },
  {
    id: "calendar.read",
    approvalGate: { tool: "calendar", action: "read" },
    composioAction: "GOOGLECALENDAR_LIST_EVENTS",
    description:
      "Read upcoming events from the user's primary Google Calendar. Read-only; auto-approves on high confidence.",
    inputSchema: z.object({
      timeMin: z.string().datetime().optional(),
      timeMax: z.string().datetime().optional(),
      maxResults: z.number().int().min(1).max(50).default(10),
    }),
    defaultRisk: "low",
  },
] as const);

const CATALOG_INDEX: ReadonlyMap<string, CatalogEntry> = new Map(
  TOOL_CATALOG.map((entry) => [entry.id, entry]),
);

/** Resolve a catalog entry by tool id. Returns null for unknown ids. */
export function lookupCatalogEntry(toolName: string): CatalogEntry | null {
  return CATALOG_INDEX.get(toolName) ?? null;
}

// ── Default confidence factors ───────────────────────────────────────

/** Reasonable factor defaults when the cascade doesn't pass overrides.
 *  These err on the side of "review" — the dispatcher will park most
 *  tool calls for approval rather than auto-firing. */
const DEFAULT_CONFIDENCE_FACTORS: Parameters<typeof calculateConfidence>[0] = {
  intentClarity: 0.75,
  parameterCompleteness: 0.85,
  contextRelevance: 0.7,
  historicalSuccess: 0.7,
  userTrust: 0.7,
};

// ── Dispatch core ────────────────────────────────────────────────────

/**
 * Dispatch a tool call. Routes through the confidence + approval gate,
 * executes via Composio when auto-approved, and returns a structured
 * outcome plus a `ToolCallTrace` entry the cascade can append to its
 * `FoundationTrace.toolCalls` array.
 *
 * Never throws on remote failures — converts them into `decision: "executed", ok: false`.
 */
export async function dispatchTool(
  input: ToolDispatchInput,
  context: ToolDispatchContext,
): Promise<ToolDispatchOutcome> {
  const startedAt = Date.now();
  const entry = lookupCatalogEntry(input.toolName);

  if (!entry) {
    return {
      decision: "rejected",
      message: `Unknown tool: ${input.toolName}`,
      trace: {
        toolName: input.toolName,
        actionName: "unknown",
        decision: "rejected",
        riskLevel: "high",
        confidenceScore: 0,
        durationMs: Date.now() - startedAt,
        error: "unknown_tool",
      },
    };
  }

  const composio = getComposioService();
  if (!composio.isConfigured()) {
    return {
      decision: "not_configured",
      message: "COMPOSIO_API_KEY not configured. Tool dispatch unavailable.",
      trace: {
        toolName: entry.id,
        actionName: entry.approvalGate.action,
        decision: "not_configured",
        riskLevel: entry.defaultRisk,
        confidenceScore: 0,
        durationMs: Date.now() - startedAt,
        error: "composio_not_configured",
      },
    };
  }

  const approvalService = getApprovalGateService();
  const gateConfig: ApprovalGateConfig | null = approvalService.getGateConfig(
    entry.approvalGate.tool,
    entry.approvalGate.action,
  );

  const factors = input.confidenceFactors ?? DEFAULT_CONFIDENCE_FACTORS;
  const decision: HITLDecision = await evaluateHITLGate(
    entry.approvalGate.tool,
    entry.approvalGate.action,
    input.params,
    factors,
    {
      requestedBy: context.userId,
      clientId: context.clientId,
      conversationId: context.conversationId,
      amount: input.amount,
    },
  );

  const riskLevel: RiskLevel =
    gateConfig?.riskLevel ?? decision.confidence.riskLevel;

  if (decision.requiresHumanReview) {
    return {
      decision: "pending_approval",
      pendingApprovalId: decision.pendingApprovalId ?? "",
      message: decision.message,
      trace: {
        toolName: entry.id,
        actionName: entry.approvalGate.action,
        decision: "pending_approval",
        riskLevel,
        confidenceScore: decision.confidence.score,
        pendingApprovalId: decision.pendingApprovalId,
        durationMs: Date.now() - startedAt,
      },
    };
  }

  // Auto-approved — execute via Composio.
  const result = await composio.executeAction(
    entry.composioAction,
    input.params,
    context.userId,
  );

  return {
    decision: "auto_approved",
    ok: result.success,
    data: result.data,
    error: result.error,
    trace: {
      toolName: entry.id,
      actionName: entry.approvalGate.action,
      decision: result.success ? "auto_approved" : "executed",
      riskLevel,
      confidenceScore: decision.confidence.score,
      success: result.success,
      durationMs: Date.now() - startedAt,
      error: result.success ? undefined : result.error,
    },
  };
}

// ── Vercel AI SDK adapter ────────────────────────────────────────────

/**
 * Build a `Record<string, Tool>` shaped for `generateText({ tools })` plus
 * a side-channel that captures the per-call `ToolCallTrace`. The Vercel AI
 * SDK's `result.toolResults` only carries what the `execute` callback
 * returns — it doesn't surface internal dispatch metadata — so the trace
 * collector closes over the tool registry and the graph reads it back
 * after `generateText` resolves.
 *
 * Each tool's `execute` callback wraps `dispatchTool` with the supplied
 * context, pushes the resulting `trace` to the collector, and returns a
 * JSON-serialisable summary the LLM can narrate from.
 */
export function buildCascadeTools(context: ToolDispatchContext): {
  tools: Record<string, Tool>;
  getTraces: () => ToolCallTrace[];
} {
  const traces: ToolCallTrace[] = [];
  const out: Record<string, Tool> = {};

  for (const entry of TOOL_CATALOG) {
    out[entry.id] = tool({
      description: entry.description,
      inputSchema: entry.inputSchema,
      execute: async (input) => {
        const outcome = await dispatchTool(
          { toolName: entry.id, params: input as Record<string, unknown> },
          context,
        );
        traces.push(outcome.trace);

        if (outcome.decision === "pending_approval") {
          return {
            decision: "pending_approval",
            pendingApprovalId: outcome.pendingApprovalId,
            message: outcome.message,
          };
        }
        if (outcome.decision === "rejected" || outcome.decision === "not_configured") {
          return { decision: outcome.decision, message: outcome.message };
        }
        return {
          decision: outcome.decision,
          ok: outcome.ok,
          data: outcome.data,
          error: outcome.error,
        };
      },
    });
  }

  return {
    tools: out,
    getTraces: () => traces.slice(),
  };
}
