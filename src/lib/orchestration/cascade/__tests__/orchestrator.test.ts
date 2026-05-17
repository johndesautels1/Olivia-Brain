/**
 * cascade/orchestrator — end-to-end flow tests with mocked providers + prisma.
 *
 * Covers the 4 exit points:
 *   1. No web-search providers configured -> error
 *   2. Opus not configured -> partial (unvalidated)
 *   3. All Opus batches fail -> partial (unvalidated)
 *   4. Happy path -> complete (validated)
 *
 * Also verifies the breadcrumb (recordCascadeEvent) is called on every exit.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CascadeProvider,
  CascadeResult,
  ProviderId,
} from "../types";

vi.mock("@/lib/db/client", () => ({
  default: {
    cascadeEvent: {
      create: vi.fn().mockResolvedValue({ id: "evt_test" }),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

const providerMap = new Map<ProviderId, CascadeProvider>();

vi.mock("../providers", () => ({
  createAllProviders: () => providerMap,
  getWebSearchProviders: (m: Map<ProviderId, CascadeProvider>) => {
    const ids: ProviderId[] = ["sonnet", "gpt", "gemini", "grok", "perplexity", "kimi"];
    return ids
      .map((id) => m.get(id))
      .filter((p): p is CascadeProvider => p !== undefined && p.isConfigured());
  },
}));

vi.mock("../prompts", () => ({
  getTaskPrompt: (taskId: string) => `prompt for ${taskId}`,
  getPreMergedData: () => ({ items: [{ companyName: "Acme" }, { companyName: "Beta" }] }),
  getJudgePromptForBatch: () => "judge prompt",
}));

import prisma from "@/lib/db/client";
import { runCascade } from "../orchestrator";

const p = prisma as unknown as {
  cascadeEvent: {
    create: ReturnType<typeof vi.fn>;
  };
};

function makeProvider(
  id: ProviderId,
  configured: boolean,
  result: Partial<CascadeResult<unknown>> = {},
): CascadeProvider {
  return {
    id,
    isConfigured: () => configured,
    execute: vi.fn().mockResolvedValue({
      taskId: "london_ai_ecosystem",
      provider: id,
      modelId: `${id}-model`,
      timestamp: new Date().toISOString(),
      executionTimeMs: 10,
      data: [],
      metadata: {
        totalResults: 0,
        sourcesCited: 0,
        avgConfidence: 0,
        geographicScope: "london",
        dateRange: "",
      },
      errors: [],
      ...result,
    }),
  };
}

beforeEach(() => {
  providerMap.clear();
  p.cascadeEvent.create.mockClear();
  p.cascadeEvent.create.mockResolvedValue({ id: "evt_test" });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("runCascade — exit points", () => {
  it("returns error when no web-search providers configured", async () => {
    // All providers unconfigured
    providerMap.set("sonnet", makeProvider("sonnet", false));
    providerMap.set("gpt", makeProvider("gpt", false));

    const result = await runCascade("london_ai_ecosystem");

    expect(result.status).toBe("error");
    expect(result.validated).toBeNull();
    expect(result.errors).toContain(
      "No websearch providers are configured. Set API keys in .env",
    );
    expect(p.cascadeEvent.create).toHaveBeenCalledTimes(1);
    expect(p.cascadeEvent.create.mock.calls[0][0].data.status).toBe("error");
  });

  it("returns partial when Opus is not configured (unvalidated dataset)", async () => {
    providerMap.set(
      "sonnet",
      makeProvider("sonnet", true, {
        data: [{ companyName: "Acme" }, { companyName: "Beta" }] as unknown[],
      }),
    );
    providerMap.set("opus", makeProvider("opus", false));

    const result = await runCascade("london_ai_ecosystem");

    expect(result.status).toBe("partial");
    expect(result.validated).not.toBeNull();
    expect(result.validated?.data.length).toBe(2);
    expect(result.validated?.confidenceReport.lowConfidence).toBe(2);
    expect(result.validated?.readyForInjection).toBe(false);
    expect(result.errors).toContain("Opus not configured — returning unvalidated results");
    expect(p.cascadeEvent.create).toHaveBeenCalledTimes(1);
    expect(p.cascadeEvent.create.mock.calls[0][0].data.status).toBe("partial");
  });

  it("returns partial when all Opus batches fail", async () => {
    providerMap.set(
      "sonnet",
      makeProvider("sonnet", true, {
        data: [{ companyName: "Acme" }] as unknown[],
      }),
    );
    const opus = makeProvider("opus", true);
    (opus.execute as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("opus boom"));
    providerMap.set("opus", opus);

    const result = await runCascade("london_ai_ecosystem");

    expect(result.status).toBe("partial");
    expect(result.validated).not.toBeNull();
    expect(result.errors.some((e) => e.includes("opus boom"))).toBe(true);
    expect(result.errors).toContain(
      "All Opus judge batches failed — returning unvalidated results",
    );
    expect(p.cascadeEvent.create).toHaveBeenCalledTimes(1);
  });

  it("returns complete on happy path (Opus validates)", async () => {
    providerMap.set(
      "sonnet",
      makeProvider("sonnet", true, {
        data: [{ companyName: "Acme" }, { companyName: "Beta" }] as unknown[],
      }),
    );
    providerMap.set(
      "opus",
      makeProvider("opus", true, {
        data: [
          {
            data: [{ companyName: "Acme", verified: true }],
            confidenceReport: {
              totalPoints: 1,
              highConfidence: 1,
              mediumConfidence: 0,
              lowConfidence: 0,
              manualReview: 0,
            },
            conflicts: [],
          },
        ] as unknown[],
      }),
    );

    const result = await runCascade("london_ai_ecosystem");

    expect(result.status).toBe("complete");
    expect(result.validated).not.toBeNull();
    expect(result.validated?.data.length).toBe(1);
    expect(result.validated?.confidenceReport.highConfidence).toBe(1);
    expect(result.validated?.readyForInjection).toBe(true);
    expect(p.cascadeEvent.create).toHaveBeenCalledTimes(1);
    expect(p.cascadeEvent.create.mock.calls[0][0].data.status).toBe("success");
  });

  it("breadcrumb failure does not crash the orchestrator", async () => {
    p.cascadeEvent.create.mockRejectedValueOnce(new Error("db down"));

    providerMap.set("sonnet", makeProvider("sonnet", false));

    // Should still return the error result, not throw
    const result = await runCascade("london_ai_ecosystem");
    expect(result.status).toBe("error");
  });

  it("progress callback fires across all phases", async () => {
    providerMap.set(
      "sonnet",
      makeProvider("sonnet", true, {
        data: [{ companyName: "Acme" }] as unknown[],
      }),
    );
    providerMap.set(
      "opus",
      makeProvider("opus", true, {
        data: [
          {
            data: [{ companyName: "Acme" }],
            confidenceReport: {
              totalPoints: 1,
              highConfidence: 1,
              mediumConfidence: 0,
              lowConfidence: 0,
              manualReview: 0,
            },
            conflicts: [],
          },
        ] as unknown[],
      }),
    );

    const progressEvents: number[] = [];
    await runCascade("london_ai_ecosystem", (p) => {
      progressEvents.push(p.currentPhase);
    });

    expect(progressEvents).toContain(1);
    expect(progressEvents).toContain(2);
    expect(progressEvents).toContain(3);
  });
});
