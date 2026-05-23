/**
 * cascade/orchestrator — coverage expansion.
 *
 * The existing `orchestrator.test.ts` covers the 4 exit points + the
 * breadcrumb-failure + progress-callback paths. This file fills the
 * remaining branches the prior suite skips:
 *
 *   - Phase 2 Tavily gap-fill: success / failure / not-configured
 *   - Phase 2 Companies House: success / failure / not-configured
 *   - onProviderData callback fires per provider with the data array
 *   - Mixed Phase 1: one provider succeeds, one fails (Promise.allSettled
 *     captures the partial)
 *   - Opus judge with manualReview > 0 → readyForInjection=false on a
 *     "complete" status (the reverse-readyForInjection invariant)
 *   - `lastCollectionDate` parameter threads through to getTaskPrompt
 *
 * Mocks mirror `orchestrator.test.ts` but use `vi.fn()`-based prompts
 * so we can spy on getTaskPrompt invocations. The existing test file
 * is not modified — these tests are additive.
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

/* getTaskPrompt becomes a spy so we can verify lastCollectionDate
 * threading. The other prompts helpers stay literals — they don't
 * vary per test. */
const getTaskPromptSpy = vi.fn(
  (taskId: string, lastCollectionDate?: string) =>
    `prompt for ${taskId}${lastCollectionDate ? ` since ${lastCollectionDate}` : ""}`,
);

vi.mock("../prompts", () => ({
  getTaskPrompt: (taskId: string, lastCollectionDate?: string) =>
    getTaskPromptSpy(taskId, lastCollectionDate),
  getPreMergedData: () => ({ items: [{ companyName: "Acme" }, { companyName: "Beta" }] }),
  getJudgePromptForBatch: () => "judge prompt",
}));

import prisma from "@/lib/db/client";
import { runCascade } from "../orchestrator";

const p = prisma as unknown as {
  cascadeEvent: { create: ReturnType<typeof vi.fn> };
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

/** Build an opus provider that returns a judged envelope with the
 *  supplied confidence report. */
function makeOpusJudge(
  configured: boolean,
  judged: Array<{
    data: unknown[];
    confidenceReport: {
      totalPoints: number;
      highConfidence: number;
      mediumConfidence: number;
      lowConfidence: number;
      manualReview: number;
    };
    conflicts: unknown[];
  }>,
): CascadeProvider {
  return makeProvider("opus", configured, { data: judged as unknown[] });
}

beforeEach(() => {
  providerMap.clear();
  p.cascadeEvent.create.mockClear();
  p.cascadeEvent.create.mockResolvedValue({ id: "evt_test" });
  getTaskPromptSpy.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────
// Phase 2 — Tavily gap-fill
// ─────────────────────────────────────────────

describe("runCascade — Phase 2 Tavily", () => {
  it("invokes Tavily when configured + records its data in providerResults", async () => {
    providerMap.set("sonnet", makeProvider("sonnet", true));
    providerMap.set(
      "tavily",
      makeProvider("tavily", true, {
        data: [{ companyName: "FromTavily" }] as unknown[],
      }),
    );
    providerMap.set(
      "opus",
      makeOpusJudge(true, [
        {
          data: [{ companyName: "FromTavily", verified: true }],
          confidenceReport: { totalPoints: 1, highConfidence: 1, mediumConfidence: 0, lowConfidence: 0, manualReview: 0 },
          conflicts: [],
        },
      ]),
    );

    const result = await runCascade("london_ai_ecosystem");

    expect(result.status).toBe("complete");
    /* Tavily's data is captured in providerResults. */
    expect(result.providerResults.get("tavily")).toBeDefined();
    expect(result.providerResults.get("tavily")?.data).toEqual([{ companyName: "FromTavily" }]);
  });

  it("captures the error + continues the cascade when Tavily throws", async () => {
    providerMap.set("sonnet", makeProvider("sonnet", true));
    const tavily = makeProvider("tavily", true);
    (tavily.execute as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("tavily 500"),
    );
    providerMap.set("tavily", tavily);
    providerMap.set(
      "opus",
      makeOpusJudge(true, [
        {
          data: [{ companyName: "X" }],
          confidenceReport: { totalPoints: 1, highConfidence: 1, mediumConfidence: 0, lowConfidence: 0, manualReview: 0 },
          conflicts: [],
        },
      ]),
    );

    const result = await runCascade("london_ai_ecosystem");

    /* The cascade still completes — Tavily failure doesn't block
     * Phase 3 judging. The error is captured in result.errors. */
    expect(result.status).toBe("complete");
    expect(result.errors.some((e) => e.includes("Tavily failed"))).toBe(true);
    expect(result.errors.some((e) => e.includes("tavily 500"))).toBe(true);
  });

  it("skips Tavily silently when not configured", async () => {
    providerMap.set("sonnet", makeProvider("sonnet", true));
    providerMap.set("tavily", makeProvider("tavily", false));
    providerMap.set(
      "opus",
      makeOpusJudge(true, [
        {
          data: [{ companyName: "X" }],
          confidenceReport: { totalPoints: 1, highConfidence: 1, mediumConfidence: 0, lowConfidence: 0, manualReview: 0 },
          conflicts: [],
        },
      ]),
    );

    const result = await runCascade("london_ai_ecosystem");

    expect(result.status).toBe("complete");
    /* No Tavily data because we never called it. */
    expect(result.providerResults.has("tavily")).toBe(false);
    /* No errors because skipping is intentional. */
    expect(result.errors.some((e) => e.includes("Tavily failed"))).toBe(false);
  });
});

// ─────────────────────────────────────────────
// Phase 2 — Companies House
// ─────────────────────────────────────────────

describe("runCascade — Phase 2 Companies House", () => {
  it("invokes Companies House when configured + records its data", async () => {
    providerMap.set("sonnet", makeProvider("sonnet", true));
    providerMap.set(
      "companies_house",
      makeProvider("companies_house", true, {
        data: [{ companyName: "FromCH" }] as unknown[],
      }),
    );
    providerMap.set(
      "opus",
      makeOpusJudge(true, [
        {
          data: [{ companyName: "FromCH", verified: true }],
          confidenceReport: { totalPoints: 1, highConfidence: 1, mediumConfidence: 0, lowConfidence: 0, manualReview: 0 },
          conflicts: [],
        },
      ]),
    );

    const result = await runCascade("london_ai_ecosystem");

    expect(result.status).toBe("complete");
    expect(result.providerResults.get("companies_house")).toBeDefined();
    expect(result.providerResults.get("companies_house")?.data).toEqual([
      { companyName: "FromCH" },
    ]);
  });

  it("captures the error + continues when Companies House throws", async () => {
    providerMap.set("sonnet", makeProvider("sonnet", true));
    const ch = makeProvider("companies_house", true);
    (ch.execute as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("ch unavailable"),
    );
    providerMap.set("companies_house", ch);
    providerMap.set(
      "opus",
      makeOpusJudge(true, [
        {
          data: [{ companyName: "X" }],
          confidenceReport: { totalPoints: 1, highConfidence: 1, mediumConfidence: 0, lowConfidence: 0, manualReview: 0 },
          conflicts: [],
        },
      ]),
    );

    const result = await runCascade("london_ai_ecosystem");

    expect(result.status).toBe("complete");
    expect(result.errors.some((e) => e.includes("Companies House failed"))).toBe(true);
    expect(result.errors.some((e) => e.includes("ch unavailable"))).toBe(true);
  });
});

// ─────────────────────────────────────────────
// onProviderData callback
// ─────────────────────────────────────────────

describe("runCascade — onProviderData callback", () => {
  it("fires once per Phase 1 provider with the data array", async () => {
    providerMap.set(
      "sonnet",
      makeProvider("sonnet", true, {
        data: [{ companyName: "A" }] as unknown[],
      }),
    );
    providerMap.set(
      "gpt",
      makeProvider("gpt", true, {
        data: [{ companyName: "B" }, { companyName: "C" }] as unknown[],
      }),
    );
    providerMap.set(
      "opus",
      makeOpusJudge(true, [
        {
          data: [{ companyName: "A" }],
          confidenceReport: { totalPoints: 1, highConfidence: 1, mediumConfidence: 0, lowConfidence: 0, manualReview: 0 },
          conflicts: [],
        },
      ]),
    );

    const calls: { provider: string; count: number }[] = [];
    await runCascade(
      "london_ai_ecosystem",
      undefined,
      (providerId, data) => {
        calls.push({ provider: providerId, count: data.length });
      },
    );

    /* Both Phase 1 providers should have triggered the callback. */
    const sonnetCall = calls.find((c) => c.provider === "sonnet");
    const gptCall = calls.find((c) => c.provider === "gpt");
    expect(sonnetCall?.count).toBe(1);
    expect(gptCall?.count).toBe(2);
  });

  it("fires for Tavily + Companies House in Phase 2 too", async () => {
    providerMap.set("sonnet", makeProvider("sonnet", true));
    providerMap.set(
      "tavily",
      makeProvider("tavily", true, {
        data: [{ x: 1 }] as unknown[],
      }),
    );
    providerMap.set(
      "companies_house",
      makeProvider("companies_house", true, {
        data: [{ y: 2 }, { y: 3 }] as unknown[],
      }),
    );
    providerMap.set(
      "opus",
      makeOpusJudge(true, [
        {
          data: [],
          confidenceReport: { totalPoints: 0, highConfidence: 0, mediumConfidence: 0, lowConfidence: 0, manualReview: 0 },
          conflicts: [],
        },
      ]),
    );

    const calls: string[] = [];
    await runCascade("london_ai_ecosystem", undefined, (providerId) => {
      calls.push(providerId);
    });

    expect(calls).toContain("tavily");
    expect(calls).toContain("companies_house");
  });
});

// ─────────────────────────────────────────────
// Mixed Phase 1 — partial provider failure
// ─────────────────────────────────────────────

describe("runCascade — mixed Phase 1", () => {
  it("captures both the surviving + failing Phase 1 providers via Promise.allSettled", async () => {
    /* sonnet succeeds; gpt fails — the cascade should NOT abort,
     * and the resulting providerResults reflects only the success. */
    providerMap.set(
      "sonnet",
      makeProvider("sonnet", true, {
        data: [{ companyName: "Survived" }] as unknown[],
      }),
    );
    const gpt = makeProvider("gpt", true);
    (gpt.execute as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("gpt timeout"),
    );
    providerMap.set("gpt", gpt);
    providerMap.set(
      "opus",
      makeOpusJudge(true, [
        {
          data: [{ companyName: "Survived" }],
          confidenceReport: { totalPoints: 1, highConfidence: 1, mediumConfidence: 0, lowConfidence: 0, manualReview: 0 },
          conflicts: [],
        },
      ]),
    );

    const result = await runCascade("london_ai_ecosystem");

    /* Sonnet's data survives. */
    expect(result.providerResults.has("sonnet")).toBe(true);
    /* gpt is absent from providerResults because its execute() threw. */
    expect(result.providerResults.has("gpt")).toBe(false);
    /* The error is captured. */
    expect(result.errors.some((e) => e.includes("gpt timeout"))).toBe(true);
    /* Status is "complete" because Opus judged successfully — Phase 1
     * partial failure does not downgrade the overall status when
     * judging succeeds. */
    expect(result.status).toBe("complete");
  });
});

// ─────────────────────────────────────────────
// readyForInjection invariant
// ─────────────────────────────────────────────

describe("runCascade — readyForInjection invariant", () => {
  it("sets readyForInjection=false when Opus reports manualReview > 0", async () => {
    providerMap.set("sonnet", makeProvider("sonnet", true));
    providerMap.set(
      "opus",
      makeOpusJudge(true, [
        {
          data: [{ companyName: "X" }, { companyName: "Y" }],
          confidenceReport: {
            totalPoints: 2,
            highConfidence: 1,
            mediumConfidence: 0,
            lowConfidence: 0,
            manualReview: 1, // ← drives readyForInjection=false
          },
          conflicts: [],
        },
      ]),
    );

    const result = await runCascade("london_ai_ecosystem");

    expect(result.status).toBe("complete");
    expect(result.validated?.confidenceReport.manualReview).toBe(1);
    expect(result.validated?.readyForInjection).toBe(false);
  });

  it("sets readyForInjection=true when Opus reports manualReview=0", async () => {
    providerMap.set("sonnet", makeProvider("sonnet", true));
    providerMap.set(
      "opus",
      makeOpusJudge(true, [
        {
          data: [{ companyName: "X" }],
          confidenceReport: {
            totalPoints: 1,
            highConfidence: 1,
            mediumConfidence: 0,
            lowConfidence: 0,
            manualReview: 0,
          },
          conflicts: [],
        },
      ]),
    );

    const result = await runCascade("london_ai_ecosystem");

    expect(result.status).toBe("complete");
    expect(result.validated?.readyForInjection).toBe(true);
  });
});

// ─────────────────────────────────────────────
// lastCollectionDate threading
// ─────────────────────────────────────────────

describe("runCascade — lastCollectionDate threading", () => {
  it("passes lastCollectionDate through to getTaskPrompt", async () => {
    providerMap.set("sonnet", makeProvider("sonnet", true));
    providerMap.set(
      "opus",
      makeOpusJudge(true, [
        {
          data: [],
          confidenceReport: { totalPoints: 0, highConfidence: 0, mediumConfidence: 0, lowConfidence: 0, manualReview: 0 },
          conflicts: [],
        },
      ]),
    );

    await runCascade(
      "london_ai_ecosystem",
      undefined,
      undefined,
      "2026-05-01T00:00:00Z",
    );

    /* getTaskPrompt should have been called once at the cascade entry
     * with both the taskId AND the lastCollectionDate argument. */
    expect(getTaskPromptSpy).toHaveBeenCalled();
    const firstCall = getTaskPromptSpy.mock.calls[0];
    expect(firstCall[0]).toBe("london_ai_ecosystem");
    expect(firstCall[1]).toBe("2026-05-01T00:00:00Z");
  });

  it("calls getTaskPrompt with undefined lastCollectionDate when not provided", async () => {
    providerMap.set("sonnet", makeProvider("sonnet", true));
    providerMap.set(
      "opus",
      makeOpusJudge(true, [
        {
          data: [],
          confidenceReport: { totalPoints: 0, highConfidence: 0, mediumConfidence: 0, lowConfidence: 0, manualReview: 0 },
          conflicts: [],
        },
      ]),
    );

    await runCascade("london_ai_ecosystem");

    expect(getTaskPromptSpy).toHaveBeenCalled();
    const firstCall = getTaskPromptSpy.mock.calls[0];
    expect(firstCall[1]).toBeUndefined();
  });
});
