/**
 * G1-141 Confidence Score Decision Engine — contract tests
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/agents/llm", () => ({ callLLM: vi.fn() }));
vi.mock("@/lib/agents/resolve-company", () => ({ resolveUserCompany: vi.fn() }));

import { callLLM } from "@/lib/agents/llm";
import { resolveUserCompany } from "@/lib/agents/resolve-company";
import {
  confidenceScoreDecisionEngineHandler,
  isDecisionAssessment,
  parseLlmJson,
} from "../g1-141-confidence-score-decision-engine";
import type { AgentRunContext } from "../../handlers";

const callLLMMock = callLLM as unknown as ReturnType<typeof vi.fn>;
const resolveMock = resolveUserCompany as unknown as ReturnType<typeof vi.fn>;

const VALID_ASSESS = {
  schemaVersion: "1",
  companyName: "Aether Labs",
  decisionDescription: "Should we sign 2-year lease in Shoreditch vs flexible WeWork?",
  decisionType: "office_move",
  options: [
    {
      option: "2-year lease in Shoreditch",
      confidenceScore: 65,
      keyFactorsFor: ["Cheaper per-seat at scale", "Brand signal to investors"],
      keyFactorsAgainst: ["Locks burn", "Headcount uncertainty"],
      unknowns: ["Will we hit Series B in 12 months?"],
      expectedValueRange: "Saves £80–120K over 2 years if team scales as planned",
      timeToReverseWeeks: 36,
    },
    {
      option: "WeWork flex",
      confidenceScore: 78,
      keyFactorsFor: ["Reversible in 30 days", "Right-sized to current team"],
      keyFactorsAgainst: ["Pricier per seat", "Weaker investor optics"],
      unknowns: ["WeWork's UK pricing for 2027"],
      expectedValueRange: "Predictable monthly burn, no upside",
      timeToReverseWeeks: 4,
    },
  ],
  recommendedOption: "WeWork flex",
  recommendationConfidence: 72,
  decisionFraming: "Reversibility vs cost — does the £80K hypothetical justify the 36-week unwind risk?",
  preconditionsToCheck: [
    "Confirm hiring plan for next 12 months.",
    "Verify Shoreditch market rates (last quote was 18 months old).",
    "Check landlord break-clause options.",
  ],
  redFlags: [],
  whatChangesTheAnswer: [
    "Series B closes — lease becomes cheap.",
    "Headcount plan halves — flex becomes obvious.",
  ],
  notes: "Lease maths sensitive to Series B timing.",
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
    agentId: "G1-141",
    agentDbId: "agentdb_11",
    runId: "run_decision141",
    agentName: "Confidence Score Decision Engine",
    groupCode: "1T",
    groupName: "Decision Quality",
    persona: "olivia",
    llmModel: "claude-sonnet-4-6",
    temperature: 0.2,
    maxTokens: 6_000,
    systemPrompt: null,
    configs: {},
    input: {
      userProfileId: "user_profile_abc",
      decisionDescription: "Should we sign 2-year lease in Shoreditch vs flexible WeWork?",
      decisionType: "office_move",
      reversibility: "medium",
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

describe("G1-141 · module surface", () => {
  it("exports handler with correct agentId", () => {
    expect(confidenceScoreDecisionEngineHandler.agentId).toBe("G1-141");
  });
});

describe("G1-141 · isDecisionAssessment guard", () => {
  it("accepts canonical", () => {
    expect(isDecisionAssessment(VALID_ASSESS)).toBe(true);
  });

  it("rejects when option has confidenceScore > 100", () => {
    expect(
      isDecisionAssessment({
        ...VALID_ASSESS,
        options: [{ ...VALID_ASSESS.options[0], confidenceScore: 150 }],
      }),
    ).toBe(false);
  });

  it("rejects when recommendationConfidence out of range", () => {
    expect(
      isDecisionAssessment({ ...VALID_ASSESS, recommendationConfidence: 150 }),
    ).toBe(false);
  });

  it("rejects negative timeToReverseWeeks", () => {
    expect(
      isDecisionAssessment({
        ...VALID_ASSESS,
        options: [{ ...VALID_ASSESS.options[0], timeToReverseWeeks: -1 }],
      }),
    ).toBe(false);
  });
});

describe("G1-141 · parseLlmJson", () => {
  it("parses raw JSON", () => {
    expect(parseLlmJson(JSON.stringify(VALID_ASSESS))).not.toBeNull();
  });

  it("returns null on garbage", () => {
    expect(parseLlmJson("plain text")).toBeNull();
  });
});

describe("G1-141 · execute missing-decisionDescription", () => {
  it("short-circuits with mode=missing_decision_description", async () => {
    const result = await confidenceScoreDecisionEngineHandler.execute(
      buildContext({ input: { userProfileId: "user_profile_abc" } }),
    );
    expect(callLLMMock).not.toHaveBeenCalled();
    expect(result.outputData?.mode).toBe("missing_decision_description");
  });
});

describe("G1-141 · execute severity matrix", () => {
  it("info when high confidence + low reversibility risk + no red flags", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify({ ...VALID_ASSESS, recommendationConfidence: 85, redFlags: [] }),
      tokensUsed: 2_000,
      costUsd: 0.03,
      provider: "anthropic",
      modelId: "claude-sonnet-4-6",
      inputTokens: 1_000,
      outputTokens: 1_000,
      durationMs: 4_500,
      webSearchUsed: false,
    });
    const result = await confidenceScoreDecisionEngineHandler.execute(buildContext());
    expect(result.briefing?.severity).toBe("info");
  });

  it("warning when confidence is moderate (60-79)", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify({ ...VALID_ASSESS, recommendationConfidence: 72 }),
      tokensUsed: 2_000,
      costUsd: 0.03,
      provider: "anthropic",
      modelId: "claude-sonnet-4-6",
      inputTokens: 1_000,
      outputTokens: 1_000,
      durationMs: 4_500,
      webSearchUsed: false,
    });
    const result = await confidenceScoreDecisionEngineHandler.execute(buildContext());
    expect(result.briefing?.severity).toBe("warning");
  });

  it("CRITICAL when low confidence on hard-to-reverse decision", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify({
        ...VALID_ASSESS,
        recommendationConfidence: 45,
        recommendedOption: "2-year lease in Shoreditch", // timeToReverseWeeks=36 >= 26
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
    const result = await confidenceScoreDecisionEngineHandler.execute(buildContext());
    expect(result.outputData?.recIsHardToReverse).toBe(true);
    expect(result.briefing?.severity).toBe("critical");
  });

  it("CRITICAL when low confidence + reversibility='hard' input flag", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify({
        ...VALID_ASSESS,
        recommendationConfidence: 50,
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
    const result = await confidenceScoreDecisionEngineHandler.execute(
      buildContext({
        input: {
          userProfileId: "user_profile_abc",
          decisionDescription:
            "Should we acquire CompetitorX for an all-stock deal that locks in the team for 4 years.",
          reversibility: "hard",
        },
      }),
    );
    expect(result.briefing?.severity).toBe("critical");
  });
});
