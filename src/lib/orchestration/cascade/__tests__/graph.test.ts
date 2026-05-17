/**
 * cascade/graph — LangGraph 5-node state machine tests.
 *
 * Mocks runCascade to drive the graph through each decision branch:
 *   - accept    (status=complete, no manual review)
 *   - escalate  (status=error after max retries)
 *   - escalate  (manualReview > 0)
 *   - retry+accept (first attempt partial+low confidence, second succeeds)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CascadeRunResult } from "../orchestrator";
import type { ValidatedDataset } from "../types";

const runCascadeMock = vi.fn();

vi.mock("../orchestrator", () => ({
  runCascade: (...args: unknown[]) => runCascadeMock(...args),
}));

import { runCascadeGraph, buildCascadeGraph } from "../graph";

function makeResult(
  status: "complete" | "partial" | "error",
  opts: {
    items?: number;
    high?: number;
    medium?: number;
    low?: number;
    review?: number;
    errors?: string[];
  } = {},
): CascadeRunResult<"london_funding_rounds"> {
  const items = opts.items ?? 0;
  const high = opts.high ?? 0;
  const medium = opts.medium ?? 0;
  const low = opts.low ?? 0;
  const review = opts.review ?? 0;

  const validated: ValidatedDataset<unknown> | null =
    status === "error" && items === 0
      ? null
      : {
          taskId: "london_funding_rounds",
          judge: "opus",
          timestamp: new Date().toISOString(),
          data: Array.from({ length: items }, (_, i) => ({ idx: i })),
          confidenceReport: {
            totalPoints: items,
            highConfidence: high,
            mediumConfidence: medium,
            lowConfidence: low,
            manualReview: review,
          },
          conflicts: [],
          readyForInjection: review === 0,
        };

  return {
    status,
    validated: validated as ValidatedDataset<unknown>,
    providerResults: new Map(),
    progress: [],
    errors: opts.errors ?? [],
  } as unknown as CascadeRunResult<"london_funding_rounds">;
}

beforeEach(() => {
  runCascadeMock.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("cascade graph — happy path", () => {
  it("accepts on first attempt when cascade returns complete + high confidence", async () => {
    runCascadeMock.mockResolvedValueOnce(makeResult("complete", { items: 10, high: 10 }));

    const result = await runCascadeGraph({ taskId: "london_funding_rounds" });

    expect(result.decision).toBe("accept");
    expect(result.finalDataset).not.toBeNull();
    expect(result.finalDataset?.data.length).toBe(10);
    expect(result.attemptCount).toBe(1);
    expect(runCascadeMock).toHaveBeenCalledTimes(1);
    expect(result.notes.some((n) => n.startsWith("plan:"))).toBe(true);
    expect(result.notes.some((n) => n.startsWith("finalize: accept"))).toBe(true);
  });
});

describe("cascade graph — escalation", () => {
  it("escalates when manual review items present (no retry)", async () => {
    runCascadeMock.mockResolvedValueOnce(
      makeResult("complete", { items: 5, high: 3, review: 2 }),
    );

    const result = await runCascadeGraph({ taskId: "london_funding_rounds" });

    expect(result.decision).toBe("escalate");
    expect(result.finalDataset).toBeNull();
    expect(result.attemptCount).toBe(1);
    expect(runCascadeMock).toHaveBeenCalledTimes(1);
    expect(result.notes.some((n) => n.includes("manual review"))).toBe(true);
  });

  it("escalates after max retries when status stays error", async () => {
    runCascadeMock
      .mockResolvedValueOnce(makeResult("error", { errors: ["boom"] }))
      .mockResolvedValueOnce(makeResult("error", { errors: ["boom again"] }));

    const result = await runCascadeGraph({ taskId: "london_funding_rounds", maxAttempts: 2 });

    expect(result.decision).toBe("escalate");
    expect(result.finalDataset).toBeNull();
    expect(result.attemptCount).toBe(2);
    expect(runCascadeMock).toHaveBeenCalledTimes(2);
  });
});

describe("cascade graph — retry then accept", () => {
  it("retries on partial+low confidence, accepts on second attempt", async () => {
    runCascadeMock
      .mockResolvedValueOnce(
        makeResult("partial", { items: 10, high: 2, low: 8 }), // ratio 0.2 -> retry
      )
      .mockResolvedValueOnce(
        makeResult("complete", { items: 10, high: 10 }), // accept
      );

    const result = await runCascadeGraph({ taskId: "london_funding_rounds", maxAttempts: 2 });

    expect(result.decision).toBe("accept");
    expect(result.finalDataset?.data.length).toBe(10);
    expect(result.attemptCount).toBe(2);
    expect(runCascadeMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry on partial when high-confidence ratio meets threshold", async () => {
    runCascadeMock.mockResolvedValueOnce(
      makeResult("partial", { items: 10, high: 6, low: 4 }), // ratio 0.6 -> accept
    );

    const result = await runCascadeGraph({ taskId: "london_funding_rounds" });

    expect(result.decision).toBe("accept");
    expect(result.attemptCount).toBe(1);
    expect(runCascadeMock).toHaveBeenCalledTimes(1);
  });
});

describe("cascade graph — wiring", () => {
  it("passes lastCollectionDate through to runCascade", async () => {
    runCascadeMock.mockResolvedValueOnce(makeResult("complete", { items: 1, high: 1 }));

    await runCascadeGraph({
      taskId: "london_funding_rounds",
      lastCollectionDate: "2026-05-01",
    });

    const callArgs = runCascadeMock.mock.calls[0];
    expect(callArgs[0]).toBe("london_funding_rounds");
    expect(callArgs[3]).toBe("2026-05-01");
  });

  it("buildCascadeGraph returns a reusable compiled instance", async () => {
    runCascadeMock
      .mockResolvedValueOnce(makeResult("complete", { items: 1, high: 1 }))
      .mockResolvedValueOnce(makeResult("complete", { items: 2, high: 2 }));

    const graph = buildCascadeGraph();
    const r1 = await graph.invoke({ taskId: "london_funding_rounds" });
    const r2 = await graph.invoke({ taskId: "london_ai_ecosystem" });

    expect(r1.finalDataset?.data.length).toBe(1);
    expect(r2.finalDataset?.data.length).toBe(2);
    expect(runCascadeMock).toHaveBeenCalledTimes(2);
  });
});
