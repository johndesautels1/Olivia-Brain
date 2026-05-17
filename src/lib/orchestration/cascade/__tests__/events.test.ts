/**
 * cascade/events — read-only helpers over CascadeEvent.
 *
 * Track G Session 19 chunk 1. Locks down the 4 query functions agents
 * call to know what cascade data changed since their last run, without
 * coupling to cascade internals.
 *
 * Prisma is mocked at the module surface.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/client", () => ({
  default: {
    cascadeEvent: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import prisma from "@/lib/db/client";
import {
  getRecentCascadeEvents,
  getLatestCascadeEvent,
  getLatestSuccessfulEvent,
  getCascadeEventsSummary,
  recordCascadeEvent,
} from "../events";

const p = prisma as unknown as {
  cascadeEvent: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

beforeEach(() => {
  p.cascadeEvent.findMany.mockReset();
  p.cascadeEvent.findFirst.mockReset();
  p.cascadeEvent.create.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getRecentCascadeEvents", () => {
  it("filters by taskId and 'since' timestamp, ordered desc", async () => {
    const since = new Date("2026-05-01T00:00:00Z");
    p.cascadeEvent.findMany.mockResolvedValueOnce([
      { id: "e1", taskId: "london_funding_rounds", status: "success", itemCount: 12, skippedCount: 0, durationMs: 4200, errorMessage: null, completedAt: new Date("2026-05-10") },
    ]);
    const result = await getRecentCascadeEvents("london_funding_rounds", since);
    expect(result).toHaveLength(1);
    expect(result[0].itemCount).toBe(12);
    const args = p.cascadeEvent.findMany.mock.calls[0][0];
    expect(args.where).toEqual({
      taskId: "london_funding_rounds",
      completedAt: { gt: since },
    });
    expect(args.orderBy).toEqual({ completedAt: "desc" });
  });
});

describe("getLatestCascadeEvent", () => {
  it("returns the most recent event for a task regardless of status", async () => {
    p.cascadeEvent.findFirst.mockResolvedValueOnce({
      id: "e1",
      taskId: "london_funding_rounds",
      status: "partial",
      itemCount: 3,
      skippedCount: 1,
      durationMs: 8000,
      errorMessage: null,
      completedAt: new Date("2026-05-10"),
    });
    const result = await getLatestCascadeEvent("london_funding_rounds");
    expect(result?.status).toBe("partial");
    const args = p.cascadeEvent.findFirst.mock.calls[0][0];
    expect(args.where).toEqual({ taskId: "london_funding_rounds" });
    expect(args.orderBy).toEqual({ completedAt: "desc" });
  });

  it("returns null when no events exist for the task", async () => {
    p.cascadeEvent.findFirst.mockResolvedValueOnce(null);
    expect(await getLatestCascadeEvent("london_funding_rounds")).toBeNull();
  });
});

describe("getLatestSuccessfulEvent", () => {
  it("filters by status='success' and orders desc", async () => {
    p.cascadeEvent.findFirst.mockResolvedValueOnce({
      id: "e1",
      taskId: "london_funding_rounds",
      status: "success",
      itemCount: 15,
      skippedCount: 0,
      durationMs: 3500,
      errorMessage: null,
      completedAt: new Date("2026-05-09"),
    });
    await getLatestSuccessfulEvent("london_funding_rounds");
    const args = p.cascadeEvent.findFirst.mock.calls[0][0];
    expect(args.where).toEqual({ taskId: "london_funding_rounds", status: "success" });
  });
});

describe("getCascadeEventsSummary", () => {
  it("deduplicates to one event per taskId (latest wins)", async () => {
    p.cascadeEvent.findMany.mockResolvedValueOnce([
      { id: "e1", taskId: "london_funding_rounds", status: "success", itemCount: 12, skippedCount: 0, durationMs: 4200, errorMessage: null, completedAt: new Date("2026-05-10") },
      { id: "e2", taskId: "london_funding_rounds", status: "success", itemCount: 10, skippedCount: 0, durationMs: 4000, errorMessage: null, completedAt: new Date("2026-05-09") },
      { id: "e3", taskId: "london_ai_ecosystem", status: "success", itemCount: 7, skippedCount: 1, durationMs: 5500, errorMessage: null, completedAt: new Date("2026-05-08") },
    ]);
    const result = await getCascadeEventsSummary();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("e1");
    expect(result[1].id).toBe("e3");
  });

  it("caps the underlying query at 100 rows", async () => {
    p.cascadeEvent.findMany.mockResolvedValueOnce([]);
    await getCascadeEventsSummary();
    expect(p.cascadeEvent.findMany.mock.calls[0][0].take).toBe(100);
  });
});

describe("recordCascadeEvent", () => {
  it("writes a row with all fields populated", async () => {
    p.cascadeEvent.create.mockResolvedValueOnce({ id: "evt_1" });
    await recordCascadeEvent({
      taskId: "london_funding_rounds",
      status: "success",
      itemCount: 12,
      skippedCount: 3,
      durationMs: 4200,
      errorMessage: null,
      metadata: { providersAttempted: ["sonnet", "gpt"] },
    });
    const args = p.cascadeEvent.create.mock.calls[0][0];
    expect(args.data.taskId).toBe("london_funding_rounds");
    expect(args.data.status).toBe("success");
    expect(args.data.itemCount).toBe(12);
    expect(args.data.skippedCount).toBe(3);
    expect(args.data.durationMs).toBe(4200);
    expect(args.data.errorMessage).toBeNull();
    expect(args.data.metadata).toEqual({ providersAttempted: ["sonnet", "gpt"] });
  });

  it("defaults skippedCount to 0 when omitted", async () => {
    p.cascadeEvent.create.mockResolvedValueOnce({ id: "evt_2" });
    await recordCascadeEvent({
      taskId: "london_ai_ecosystem",
      status: "error",
      itemCount: 0,
      durationMs: 100,
      errorMessage: "boom",
    });
    expect(p.cascadeEvent.create.mock.calls[0][0].data.skippedCount).toBe(0);
  });
});
