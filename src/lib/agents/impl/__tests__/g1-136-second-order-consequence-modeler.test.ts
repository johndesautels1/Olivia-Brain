/**
 * G1-136 Second-Order Consequence Modeler — contract tests
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/agents/llm", () => ({ callLLM: vi.fn() }));
vi.mock("@/lib/agents/resolve-company", () => ({ resolveUserCompany: vi.fn() }));

import { callLLM } from "@/lib/agents/llm";
import { resolveUserCompany } from "@/lib/agents/resolve-company";
import {
  secondOrderConsequenceModelerHandler,
  isConsequenceMap,
  parseLlmJson,
} from "../g1-136-second-order-consequence-modeler";
import type { AgentRunContext } from "../../handlers";

const callLLMMock = callLLM as unknown as ReturnType<typeof vi.fn>;
const resolveMock = resolveUserCompany as unknown as ReturnType<typeof vi.fn>;

const C = (overrides: Partial<Record<string, unknown>> = {}) => ({
  consequence: "Team takes 4 new hires.",
  domain: "team",
  likelihood: "likely",
  timeframeMonths: 6,
  magnitude: "material",
  isPositive: true,
  ...overrides,
});

const VALID_MAP = {
  schemaVersion: "1",
  companyName: "Aether Labs",
  decisionUnderConsideration: "Aggressively pursue a £6M Series A in Q3 2026.",
  timeHorizonMonths: 24,
  firstOrder: [
    C({ consequence: "Sign with Index Ventures", domain: "finance", magnitude: "large", isPositive: true }),
    C({ consequence: "Headcount expands by 12 in 6 months", domain: "team", magnitude: "material", isPositive: true }),
  ],
  secondOrder: [
    C({ consequence: "Burn rate doubles", domain: "finance", magnitude: "large", isPositive: false, triggeringIndex: 1 }),
    C({ consequence: "Founder pulled into ops mgmt", domain: "team", magnitude: "material", isPositive: false, triggeringIndex: 1 }),
  ],
  thirdOrder: [
    C({ consequence: "Net new feature velocity slows", domain: "product", magnitude: "material", isPositive: false, triggeringIndex: 1 }),
    C({ consequence: "Brand strengthens with Index logo", domain: "brand", magnitude: "material", isPositive: true, triggeringIndex: 0 }),
  ],
  cascadingChains: [
    {
      firstOrderIndex: 1,
      secondOrderIndex: 1,
      thirdOrderIndex: 0,
      narrativeDescription: "Hiring pace drags founder into ops; product velocity slows by month 12.",
      watchSignals: ["Founder spending > 60% of week on hiring", "Sprint velocity drop"],
      compounding: "amplifying",
    },
  ],
  compoundingRisks: ["Burn × velocity drop → cash runway shrinks faster than ARR catches up."],
  compoundingUpsides: ["Index logo × team brand → easier exec recruiting in months 4-12."],
  whatToWatch: [
    "Sprint velocity in weeks 8-16.",
    "Time-to-hire trend.",
    "Quarterly NRR after team expansion.",
  ],
  decisionMattersIf: [
    "ARR trajectory accelerates past £3M run-rate by month 12.",
    "Founder can hand off hiring by month 6.",
  ],
  assumptionsProbed: [
    "Assumption: hiring market for AI safety engineers stays open at 2026 H2 rates.",
    "Assumption: Index check-in cadence allows founder to stay heads-down on product.",
  ],
  notes: "Single-chain depth analysis; expand on second chain in future run.",
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
    agentId: "G1-136",
    agentDbId: "agentdb_12",
    runId: "run_consequence136",
    agentName: "Second Order Consequence Modeler",
    groupCode: "1U",
    groupName: "Decision Quality",
    persona: "olivia",
    llmModel: "claude-opus-4-7",
    temperature: 0.2,
    maxTokens: 8_000,
    systemPrompt: null,
    configs: {},
    input: {
      userProfileId: "user_profile_abc",
      decisionUnderConsideration: "Aggressively pursue a £6M Series A in Q3 2026.",
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

describe("G1-136 · module surface", () => {
  it("exports handler with correct agentId", () => {
    expect(secondOrderConsequenceModelerHandler.agentId).toBe("G1-136");
  });
});

describe("G1-136 · isConsequenceMap guard", () => {
  it("accepts canonical", () => {
    expect(isConsequenceMap(VALID_MAP)).toBe(true);
  });

  it("rejects when a consequence has unknown domain", () => {
    expect(
      isConsequenceMap({
        ...VALID_MAP,
        firstOrder: [{ ...VALID_MAP.firstOrder[0], domain: "fake" }],
      }),
    ).toBe(false);
  });

  it("rejects when a consequence has unknown magnitude", () => {
    expect(
      isConsequenceMap({
        ...VALID_MAP,
        firstOrder: [{ ...VALID_MAP.firstOrder[0], magnitude: "huge" }],
      }),
    ).toBe(false);
  });

  it("rejects when cascadingChains has invalid compounding value", () => {
    expect(
      isConsequenceMap({
        ...VALID_MAP,
        cascadingChains: [
          { ...VALID_MAP.cascadingChains[0], compounding: "bouncy" },
        ],
      }),
    ).toBe(false);
  });
});

describe("G1-136 · parseLlmJson", () => {
  it("parses raw JSON", () => {
    expect(parseLlmJson(JSON.stringify(VALID_MAP))).not.toBeNull();
  });

  it("returns null on garbage", () => {
    expect(parseLlmJson("plain prose")).toBeNull();
  });
});

describe("G1-136 · execute missing-decisionUnderConsideration", () => {
  it("short-circuits with mode=missing_decision_under_consideration", async () => {
    const result = await secondOrderConsequenceModelerHandler.execute(
      buildContext({ input: { userProfileId: "user_profile_abc" } }),
    );
    expect(callLLMMock).not.toHaveBeenCalled();
    expect(result.outputData?.mode).toBe("missing_decision_under_consideration");
  });
});

describe("G1-136 · execute severity matrix", () => {
  it("info when no large/company_defining negatives + no compounding risks", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify({
        ...VALID_MAP,
        firstOrder: [C({ magnitude: "small", isPositive: false })],
        secondOrder: [C({ magnitude: "small", isPositive: false, triggeringIndex: 0 })],
        thirdOrder: [C({ magnitude: "small", isPositive: false, triggeringIndex: 0 })],
        compoundingRisks: [],
      }),
      tokensUsed: 3_000,
      costUsd: 0.06,
      provider: "anthropic",
      modelId: "claude-opus-4-7",
      inputTokens: 1_500,
      outputTokens: 1_500,
      durationMs: 8_000,
      webSearchUsed: false,
    });
    const result = await secondOrderConsequenceModelerHandler.execute(buildContext());
    expect(result.briefing?.severity).toBe("info");
  });

  it("warning when compoundingRisks > 0", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify(VALID_MAP),
      tokensUsed: 3_000,
      costUsd: 0.06,
      provider: "anthropic",
      modelId: "claude-opus-4-7",
      inputTokens: 1_500,
      outputTokens: 1_500,
      durationMs: 8_000,
      webSearchUsed: false,
    });
    const result = await secondOrderConsequenceModelerHandler.execute(buildContext());
    expect(result.outputData?.hasLargeNegative).toBe(true);
    expect(result.briefing?.severity).toBe("warning");
  });

  it("CRITICAL when any company_defining negative", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify({
        ...VALID_MAP,
        thirdOrder: [
          C({
            consequence: "Cash runway hits zero before Series B.",
            domain: "finance",
            magnitude: "company_defining",
            isPositive: false,
            triggeringIndex: 0,
          }),
        ],
      }),
      tokensUsed: 3_000,
      costUsd: 0.06,
      provider: "anthropic",
      modelId: "claude-opus-4-7",
      inputTokens: 1_500,
      outputTokens: 1_500,
      durationMs: 8_000,
      webSearchUsed: false,
    });
    const result = await secondOrderConsequenceModelerHandler.execute(buildContext());
    expect(result.outputData?.hasCompanyDefiningNegative).toBe(true);
    expect(result.briefing?.severity).toBe("critical");
  });
});
