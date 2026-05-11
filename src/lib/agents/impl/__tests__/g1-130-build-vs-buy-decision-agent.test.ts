/**
 * G1-130 Build-vs-Buy — handler contract tests
 *
 * New pattern wrinkles:
 *   1. Briefing-only (no document mirror, no spawnDocumentFromAgent
 *      call to assert).
 *   2. Three-level severity: info / warning / critical. First handler
 *      to use critical.
 *   3. Self-validation of LLM output: rubric weights must sum to 1.0
 *      ±0.05; all 6 options must be covered. Surfaces in outputData
 *      (rubricWeightSum, rubricWeightOff, allOptionsCovered,
 *      missingOptions) and bumps severity to warning when off.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/agents/llm", () => ({
  callLLM: vi.fn(),
}));
vi.mock("@/lib/agents/resolve-company", () => ({
  resolveUserCompany: vi.fn(),
}));

import { callLLM } from "@/lib/agents/llm";
import { resolveUserCompany } from "@/lib/agents/resolve-company";
import {
  buildVsBuyDecisionAgentHandler,
  isBuildBuyDecisionPackage,
  parseLlmJson,
} from "../g1-130-build-vs-buy-decision-agent";
import type { AgentRunContext } from "../../handlers";

const callLLMMock = callLLM as unknown as ReturnType<typeof vi.fn>;
const resolveMock = resolveUserCompany as unknown as ReturnType<typeof vi.fn>;

function buildOption(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    option: "buy_uk_saas",
    scoreOutOf100: 78,
    costRangeGbp: "£12–24K / year",
    timeToValueWeeks: 4,
    complianceFit: "advantage",
    talentLockIn: "low",
    riskProfile: "low",
    pros: ["Faster than build", "UK-resident data"],
    cons: ["Lock-in risk on rendering"],
    whenToPick: "When the founder has neither time nor regulatory headroom.",
    ...overrides,
  };
}

const VALID_PKG = {
  schemaVersion: "1",
  companyName: "Aether Labs",
  capabilityNeed:
    "We need a feature-flag system for the AI-safety review pipeline.",
  options: [
    buildOption({ option: "build_in_house", scoreOutOf100: 45, complianceFit: "neutral", talentLockIn: "high", riskProfile: "medium" }),
    buildOption({ option: "buy_uk_saas", scoreOutOf100: 82 }),
    buildOption({ option: "buy_us_saas", scoreOutOf100: 38, complianceFit: "extra_work", riskProfile: "medium" }),
    buildOption({ option: "open_source", scoreOutOf100: 58, complianceFit: "neutral", talentLockIn: "medium" }),
    buildOption({ option: "uk_consultancy", scoreOutOf100: 50, complianceFit: "neutral", talentLockIn: "low" }),
    buildOption({ option: "fractional", scoreOutOf100: 60, complianceFit: "neutral", talentLockIn: "low" }),
  ],
  recommendedOption: "buy_uk_saas",
  recommendationConfidence: 78,
  decisionRubric: [
    { criterion: "Time-to-value", weight: 0.35, rationale: "Founder said 4-week ship target." },
    { criterion: "UK compliance fit", weight: 0.30, rationale: "ICO + AISI on the constraint list." },
    { criterion: "Cost", weight: 0.20, rationale: "Sub-£25K budget." },
    { criterion: "Talent lock-in", weight: 0.15, rationale: "Small team; cannot afford domain debt." },
  ],
  complianceCheck:
    "UK SaaS keeps data resident; review the vendor's ICO DPA before signing.",
  redFlags: [],
  escapeHatchTriggers: [
    "Vendor 12-month renewal pricing rises > 30%.",
    "Internal usage scales 10× and per-user pricing dominates.",
    "ICO updates DPA standards mid-contract.",
  ],
  notes: "Indicative 2026 London rates.",
};

const RESOLVED_BASE = {
  companyName: "Aether Labs",
  sector: "ai_ml",
  employeeCount: 24,
  headquartersLocation: "Shoreditch, London",
  arr: 1_200_000,
  totalRaised: 4_500_000,
  certifications: [],
  regulatoryBody: "ico",
  customerCount: null,
  source: "profile",
  profileMatched: true,
  ownerClerkUserId: "user_clerk_xyz",
};

function buildContext(overrides?: Partial<AgentRunContext>): AgentRunContext {
  return {
    agentId: "G1-130",
    agentDbId: "agentdb_8",
    runId: "run_buildbuy130",
    agentName: "Build vs Buy Decision",
    groupCode: "1Q",
    groupName: "Engineering Strategy",
    persona: "olivia",
    llmModel: "claude-sonnet-4-6",
    temperature: 0.2,
    maxTokens: 6_000,
    systemPrompt: null,
    configs: {},
    input: {
      userProfileId: "user_profile_abc",
      capabilityNeed:
        "We need a feature-flag system for the AI-safety review pipeline.",
    },
    triggeredBy: "manual",
    ...overrides,
  };
}

beforeEach(() => {
  callLLMMock.mockReset();
  resolveMock.mockReset();
  resolveMock.mockResolvedValue(RESOLVED_BASE);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("G1-130 · module surface", () => {
  it("exports handler with correct agentId", () => {
    expect(buildVsBuyDecisionAgentHandler.agentId).toBe("G1-130");
  });
});

describe("G1-130 · isBuildBuyDecisionPackage guard", () => {
  it("accepts canonical shape", () => {
    expect(isBuildBuyDecisionPackage(VALID_PKG)).toBe(true);
  });

  it("rejects unknown option enum value", () => {
    expect(
      isBuildBuyDecisionPackage({
        ...VALID_PKG,
        options: [{ ...VALID_PKG.options[0], option: "bogus" }, ...VALID_PKG.options.slice(1)],
      }),
    ).toBe(false);
  });

  it("rejects recommendationConfidence outside [0, 100]", () => {
    expect(
      isBuildBuyDecisionPackage({ ...VALID_PKG, recommendationConfidence: 150 }),
    ).toBe(false);
  });

  it("rejects rubric weight outside [0, 1]", () => {
    expect(
      isBuildBuyDecisionPackage({
        ...VALID_PKG,
        decisionRubric: [
          { criterion: "X", weight: 2, rationale: "bad" },
        ],
      }),
    ).toBe(false);
  });
});

describe("G1-130 · parseLlmJson", () => {
  it("parses raw JSON", () => {
    expect(parseLlmJson(JSON.stringify(VALID_PKG))).not.toBeNull();
  });

  it("parses JSON in a fence", () => {
    expect(
      parseLlmJson("```json\n" + JSON.stringify(VALID_PKG) + "\n```"),
    ).not.toBeNull();
  });

  it("returns null on garbage", () => {
    expect(parseLlmJson("not json")).toBeNull();
  });
});

describe("G1-130 · execute missing-capabilityNeed", () => {
  it("short-circuits with mode=missing_capability_need and no LLM call", async () => {
    const result = await buildVsBuyDecisionAgentHandler.execute(
      buildContext({ input: { userProfileId: "user_profile_abc" } }),
    );
    expect(callLLMMock).not.toHaveBeenCalled();
    expect(result.outputData?.mode).toBe("missing_capability_need");
    expect(result.briefing?.severity).toBe("info");
  });
});

describe("G1-130 · execute fallback paths", () => {
  it("returns alert on LLM unavailable", async () => {
    callLLMMock.mockResolvedValueOnce(null);
    const result = await buildVsBuyDecisionAgentHandler.execute(buildContext());
    expect(result.outputData?.mode).toBe("llm_unavailable");
    expect(result.briefing?.severity).toBe("warning");
  });

  it("returns narrative weekly on parse fail", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: "free form",
      tokensUsed: 10,
      costUsd: 0.0001,
      provider: "anthropic",
      modelId: "claude-sonnet-4-6",
      inputTokens: 5,
      outputTokens: 5,
      durationMs: 100,
      webSearchUsed: false,
    });
    const result = await buildVsBuyDecisionAgentHandler.execute(buildContext());
    expect(result.outputData?.parseFailed).toBe(true);
  });
});

describe("G1-130 · execute happy path + self-validation", () => {
  it("returns info severity when rubric sums to 1.0 + all 6 options + no red flags", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify(VALID_PKG),
      tokensUsed: 2_400,
      costUsd: 0.036,
      provider: "anthropic",
      modelId: "claude-sonnet-4-6",
      inputTokens: 1_200,
      outputTokens: 1_200,
      durationMs: 5_500,
      webSearchUsed: false,
    });

    const result = await buildVsBuyDecisionAgentHandler.execute(buildContext());

    expect(result.briefing?.severity).toBe("info");
    expect(result.outputData?.rubricWeightSum).toBeCloseTo(1.0, 2);
    expect(result.outputData?.rubricWeightOff).toBe(false);
    expect(result.outputData?.allOptionsCovered).toBe(true);
    expect(result.outputData?.missingOptions).toEqual([]);
  });

  it("flips severity to warning when rubric weights drift > 0.05", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify({
        ...VALID_PKG,
        decisionRubric: [
          { criterion: "X", weight: 0.5, rationale: "a" },
          { criterion: "Y", weight: 0.2, rationale: "b" },
        ], // sums to 0.7, off by 0.3
      }),
      tokensUsed: 2_000,
      costUsd: 0.03,
      provider: "anthropic",
      modelId: "claude-sonnet-4-6",
      inputTokens: 1_000,
      outputTokens: 1_000,
      durationMs: 4_500,
      webSearchUsed: false,
    });

    const result = await buildVsBuyDecisionAgentHandler.execute(buildContext());

    expect(result.outputData?.rubricWeightOff).toBe(true);
    expect(result.briefing?.severity).toBe("warning");
  });

  it("flips severity to warning when not all 6 options covered", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify({
        ...VALID_PKG,
        options: VALID_PKG.options.slice(0, 4), // only 4 of 6
      }),
      tokensUsed: 2_000,
      costUsd: 0.03,
      provider: "anthropic",
      modelId: "claude-sonnet-4-6",
      inputTokens: 1_000,
      outputTokens: 1_000,
      durationMs: 4_500,
      webSearchUsed: false,
    });

    const result = await buildVsBuyDecisionAgentHandler.execute(buildContext());
    expect(result.outputData?.allOptionsCovered).toBe(false);
    expect(result.outputData?.missingOptions).toEqual(["uk_consultancy", "fractional"]);
    expect(result.briefing?.severity).toBe("warning");
  });

  it("escalates to CRITICAL when recommendedOption has complianceFit=blocks", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify({
        ...VALID_PKG,
        options: VALID_PKG.options.map((o) =>
          o.option === "buy_uk_saas" ? { ...o, complianceFit: "blocks" } : o,
        ),
      }),
      tokensUsed: 2_000,
      costUsd: 0.03,
      provider: "anthropic",
      modelId: "claude-sonnet-4-6",
      inputTokens: 1_000,
      outputTokens: 1_000,
      durationMs: 4_500,
      webSearchUsed: false,
    });

    const result = await buildVsBuyDecisionAgentHandler.execute(buildContext());
    expect(result.briefing?.severity).toBe("critical");
  });

  it("escalates to CRITICAL when 4+ options have complianceFit=blocks", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify({
        ...VALID_PKG,
        options: VALID_PKG.options.map((o, i) =>
          i < 4 ? { ...o, complianceFit: "blocks" } : o,
        ),
      }),
      tokensUsed: 2_000,
      costUsd: 0.03,
      provider: "anthropic",
      modelId: "claude-sonnet-4-6",
      inputTokens: 1_000,
      outputTokens: 1_000,
      durationMs: 4_500,
      webSearchUsed: false,
    });

    const result = await buildVsBuyDecisionAgentHandler.execute(buildContext());
    expect(result.briefing?.severity).toBe("critical");
  });
});
