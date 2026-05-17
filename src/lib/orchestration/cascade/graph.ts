/* ═══════════════════════════════════════════════════════════════════════════
   Cascade Graph — Track G Session 20
   LangGraph 5-node state machine wrapping runCascade().

   Nodes:
     1. plan      — validate input, initialize attempt counter
     2. search    — invoke runCascade(taskId); increments attemptCount
     3. judge     — annotate the cascade result with a human-readable summary
                    (Phase 3 Opus judging already happens INSIDE runCascade —
                    this node interprets the judge's output, it does NOT re-judge)
     4. validate  — apply retry/escalate/accept rules based on confidence + status
     5. finalize  — materialize the output: ValidatedDataset (accept), null
                    (escalate), or loop back to search (retry)

   Edges:
     START -> plan -> search -> judge -> validate
     validate -> (conditional) -> search (retry) | finalize (accept/escalate)
     finalize -> END

   Compatible with migration 12 NOT applied: runCascade swallows breadcrumb
   failures, so the graph completes regardless of cascade_events table state.
   ═══════════════════════════════════════════════════════════════════════════ */

import { Annotation, StateGraph, START, END } from "@langchain/langgraph";

import { runCascade, type CascadeRunResult } from "./orchestrator";
import type { CascadeTaskId, ValidatedDataset } from "./types";

/** Graph decisions emitted by the validate node. */
export type CascadeDecision = "accept" | "retry" | "escalate";

/** Default retry/attempt budgets. Caller can override via input state. */
export const DEFAULT_MAX_ATTEMPTS = 2;
/** High-confidence ratio under which we retry (when retries remain). */
export const RETRY_CONFIDENCE_THRESHOLD = 0.5;

/** Graph state. All fields except taskId have defaults so callers only need
 * to supply the task they want to run. */
const CascadeGraphState = Annotation.Root({
  /** REQUIRED — which cascade task to execute. */
  taskId: Annotation<CascadeTaskId>(),

  /** Optional ISO date narrowing the search window passed to runCascade. */
  lastCollectionDate: Annotation<string | undefined>({
    default: () => undefined,
    reducer: (_a: string | undefined, b: string | undefined) => b,
  }),

  /** Incremented by the search node on every invocation. */
  attemptCount: Annotation<number>({
    default: () => 0,
    reducer: (_a: number, b: number) => b,
  }),

  /** Hard cap on retries. Default 2 (one initial + one retry). */
  maxAttempts: Annotation<number>({
    default: () => DEFAULT_MAX_ATTEMPTS,
    reducer: (_a: number, b: number) => b,
  }),

  /** Last cascade run result. Refreshed every search-node invocation. */
  cascadeResult: Annotation<CascadeRunResult<CascadeTaskId> | null>({
    default: () => null,
    reducer: (_a: CascadeRunResult<CascadeTaskId> | null, b: CascadeRunResult<CascadeTaskId> | null) => b,
  }),

  /** Decision set by the validate node. */
  decision: Annotation<CascadeDecision | null>({
    default: () => null,
    reducer: (_a: CascadeDecision | null, b: CascadeDecision | null) => b,
  }),

  /** Materialized output from the finalize node. null when escalated. */
  finalDataset: Annotation<ValidatedDataset<unknown> | null>({
    default: () => null,
    reducer: (_a: ValidatedDataset<unknown> | null, b: ValidatedDataset<unknown> | null) => b,
  }),

  /** Append-only audit trail of node decisions for debugging. */
  notes: Annotation<string[]>({
    default: () => [],
    reducer: (a: string[], b: string[]) => [...a, ...b],
  }),
});

export type CascadeGraphStateType = typeof CascadeGraphState.State;
export type CascadeGraphStateUpdate = typeof CascadeGraphState.Update;

/* ── Nodes ── */

async function planNode(state: CascadeGraphStateType): Promise<Partial<CascadeGraphStateUpdate>> {
  if (!state.taskId) {
    throw new Error("[cascade-graph] planNode: state.taskId is required");
  }
  return {
    notes: [`plan: taskId=${state.taskId}, maxAttempts=${state.maxAttempts}`],
  };
}

async function searchNode(state: CascadeGraphStateType): Promise<Partial<CascadeGraphStateUpdate>> {
  const nextAttempt = state.attemptCount + 1;
  const cascadeResult = await runCascade(state.taskId, undefined, undefined, state.lastCollectionDate);
  return {
    attemptCount: nextAttempt,
    cascadeResult,
    notes: [
      `search[${nextAttempt}/${state.maxAttempts}]: status=${cascadeResult.status}, ` +
        `providers=${cascadeResult.providerResults.size}, errors=${cascadeResult.errors.length}`,
    ],
  };
}

async function judgeNode(state: CascadeGraphStateType): Promise<Partial<CascadeGraphStateUpdate>> {
  const r = state.cascadeResult;
  if (!r) {
    return { notes: ["judge: no cascade result available"] };
  }
  const v = r.validated;
  const summary = v
    ? `judge: ${v.data.length} items | ` +
      `high=${v.confidenceReport.highConfidence} ` +
      `med=${v.confidenceReport.mediumConfidence} ` +
      `low=${v.confidenceReport.lowConfidence} ` +
      `review=${v.confidenceReport.manualReview} | ` +
      `readyForInjection=${v.readyForInjection}`
    : `judge: status=${r.status}, no validated dataset`;
  return { notes: [summary] };
}

async function validateNode(state: CascadeGraphStateType): Promise<Partial<CascadeGraphStateUpdate>> {
  const r = state.cascadeResult;
  const canRetry = state.attemptCount < state.maxAttempts;

  if (!r) {
    return {
      decision: "escalate",
      notes: ["validate: no cascade result -> escalate"],
    };
  }

  // Hard escalation: any manual-review item means a human must look.
  const manualReview = r.validated?.confidenceReport.manualReview ?? 0;
  if (manualReview > 0) {
    return {
      decision: "escalate",
      notes: [`validate: ${manualReview} items need manual review -> escalate`],
    };
  }

  // Error status: retry if budget allows, otherwise escalate.
  if (r.status === "error") {
    if (canRetry) {
      return {
        decision: "retry",
        notes: [`validate: status=error, retries remain (${state.attemptCount}/${state.maxAttempts}) -> retry`],
      };
    }
    return {
      decision: "escalate",
      notes: [`validate: status=error, no retries remain -> escalate`],
    };
  }

  // Partial: retry only if confidence ratio is low AND budget allows.
  if (r.status === "partial" && r.validated && canRetry) {
    const total = r.validated.confidenceReport.totalPoints;
    const high = r.validated.confidenceReport.highConfidence;
    const ratio = total > 0 ? high / total : 0;
    if (ratio < RETRY_CONFIDENCE_THRESHOLD) {
      return {
        decision: "retry",
        notes: [
          `validate: status=partial, high-confidence ratio ${ratio.toFixed(2)} ` +
            `< ${RETRY_CONFIDENCE_THRESHOLD} -> retry`,
        ],
      };
    }
  }

  return {
    decision: "accept",
    notes: [`validate: status=${r.status} -> accept`],
  };
}

async function finalizeNode(state: CascadeGraphStateType): Promise<Partial<CascadeGraphStateUpdate>> {
  if (state.decision === "accept") {
    return {
      finalDataset: state.cascadeResult?.validated ?? null,
      notes: [
        `finalize: accept, ${state.cascadeResult?.validated?.data.length ?? 0} items materialized`,
      ],
    };
  }
  if (state.decision === "escalate") {
    return {
      finalDataset: null,
      notes: ["finalize: escalate, no dataset materialized (human review required)"],
    };
  }
  // Decision === retry should have routed back to search before reaching here.
  return {
    finalDataset: null,
    notes: [`finalize: unexpected decision=${state.decision}, returning null`],
  };
}

/* ── Conditional routing ── */

function routeAfterValidate(state: CascadeGraphStateType): "search" | "finalize" {
  return state.decision === "retry" ? "search" : "finalize";
}

/* ── Compiled graph ── */

/**
 * Build + compile the cascade graph. Returns a runnable.
 *
 * Usage:
 *   const graph = buildCascadeGraph();
 *   const result = await graph.invoke({ taskId: "london_funding_rounds" });
 *   // result.finalDataset is the ValidatedDataset (or null when escalated)
 *   // result.notes is the audit trail
 *
 * The graph is stateless across invocations; reuse the compiled instance.
 */
export function buildCascadeGraph() {
  return new StateGraph(CascadeGraphState)
    .addNode("plan", planNode)
    .addNode("search", searchNode)
    .addNode("judge", judgeNode)
    .addNode("validate", validateNode)
    .addNode("finalize", finalizeNode)
    .addEdge(START, "plan")
    .addEdge("plan", "search")
    .addEdge("search", "judge")
    .addEdge("judge", "validate")
    .addConditionalEdges("validate", routeAfterValidate, {
      search: "search",
      finalize: "finalize",
    })
    .addEdge("finalize", END)
    .compile();
}

/**
 * Convenience invoker — builds the graph and runs it once.
 *
 * Returns the final state, including:
 *   - finalDataset: ValidatedDataset<unknown> | null
 *   - decision:     "accept" | "escalate"  (retry resolves before exit)
 *   - notes:        string[] audit trail
 *   - cascadeResult: the last CascadeRunResult (most recent attempt)
 *   - attemptCount: how many times the search node ran
 */
export async function runCascadeGraph(input: {
  taskId: CascadeTaskId;
  lastCollectionDate?: string;
  maxAttempts?: number;
}): Promise<CascadeGraphStateType> {
  const graph = buildCascadeGraph();
  return graph.invoke({
    taskId: input.taskId,
    lastCollectionDate: input.lastCollectionDate,
    maxAttempts: input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
  }) as Promise<CascadeGraphStateType>;
}
