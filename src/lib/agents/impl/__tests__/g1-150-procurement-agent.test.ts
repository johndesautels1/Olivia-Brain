/**
 * G1-150 Procurement Agent — handler contract tests
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/agents/llm", () => ({ callLLM: vi.fn() }));
vi.mock("@/lib/agents/document-mirror", () => ({ spawnDocumentFromAgent: vi.fn() }));
vi.mock("@/lib/agents/resolve-company", () => ({ resolveUserCompany: vi.fn() }));

import { callLLM } from "@/lib/agents/llm";
import { spawnDocumentFromAgent } from "@/lib/agents/document-mirror";
import { resolveUserCompany } from "@/lib/agents/resolve-company";
import {
  procurementAgentHandler,
  isProcurementPackage,
  parseLlmJson,
} from "../g1-150-procurement-agent";
import type { AgentRunContext } from "../../handlers";

const callLLMMock = callLLM as unknown as ReturnType<typeof vi.fn>;
const spawnMock = spawnDocumentFromAgent as unknown as ReturnType<typeof vi.fn>;
const resolveMock = resolveUserCompany as unknown as ReturnType<typeof vi.fn>;

const VALID_PKG = {
  schemaVersion: "1",
  companyName: "Aether Labs",
  procurementNeed: "Need fractional CMO with fintech / AI experience",
  engagementType: "fractional",
  sowMarkdown:
    "## Scope\n\nA fractional CMO will lead Aether Labs' positioning + GTM motion...",
  vendorShortlist: [
    {
      vendor: "Jane Doe (fractional)",
      vendorType: "fractional CMO",
      location: "London",
      relevantExperience: "Ex-Cleo, ex-Monzo growth lead.",
      indicativeRangeGbp: "£800–£1,500 / day",
      contactHint: "LinkedIn /in/janedoe-cmo",
      fitScore: 0.88,
      pros: ["Fintech AI overlap", "Already on a 2-day-a-week model"],
      cons: ["Tight calendar in Q3"],
    },
    {
      vendor: "Adept & Co (boutique agency)",
      vendorType: "boutique agency",
      location: "London",
      relevantExperience: "Series A-C fintech / AI launches.",
      indicativeRangeGbp: "£25K–£45K / month retainer",
      contactHint: "press@adept.co",
      fitScore: 0.72,
      pros: ["Team capacity", "End-to-end ownership"],
      cons: ["Higher monthly burn"],
    },
    {
      vendor: "Carter Strategy",
      vendorType: "boutique consultancy",
      location: "London / remote",
      relevantExperience: "Founder positioning + analyst relations.",
      indicativeRangeGbp: "£15K project minimum",
      contactHint: "hello@carter.studio",
      fitScore: 0.68,
      pros: ["Sharp positioning work", "Analyst relations bench"],
      cons: ["Project-only, no retainer"],
    },
    {
      vendor: "Vanguard CMOs (collective)",
      vendorType: "fractional collective",
      location: "remote-UK",
      relevantExperience: "Stage-matched fractionals across AI / fintech.",
      indicativeRangeGbp: "£1,200–£2,000 / day",
      contactHint: "join@vanguardcmo.co",
      fitScore: 0.60,
      pros: ["Bench depth", "Match-to-stage"],
      cons: ["Variable quality across roster"],
    },
    {
      vendor: "Northstar Advisory",
      vendorType: "advisor",
      location: "London",
      relevantExperience: "Series A-B fintech AI advisory roles.",
      indicativeRangeGbp: "£3K–£8K / month + 0.25% equity",
      contactHint: "LinkedIn /company/northstar-advisory",
      fitScore: 0.55,
      pros: ["Equity alignment", "Network into FCA"],
      cons: ["Advisor only — won't ship work"],
    },
  ],
  selectionRubric: [
    { criterion: "Fintech / AI relevance", weight: 0.4, rationale: "Mandatory by need spec." },
    { criterion: "Speed to value", weight: 0.25, rationale: "ASAP start." },
    { criterion: "Cost fit", weight: 0.2, rationale: "Sub-£20K / month band." },
    { criterion: "Founder-time leverage", weight: 0.15, rationale: "CEO doesn't have bandwidth." },
  ],
  recommendedNextSteps: [
    "Book Jane Doe for a 30-min intro call.",
    "Get Adept & Co's pitch in writing.",
    "Sign mutual NDA before sharing roadmap.",
  ],
  redFlags: [],
  notes: "Rates reflect 2026 London-tech CMO market.",
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
    agentId: "G1-150",
    agentDbId: "agentdb_10",
    runId: "run_procure150",
    agentName: "Procurement Agent",
    groupCode: "1S",
    groupName: "Operations",
    persona: "olivia",
    llmModel: "sonar-pro",
    temperature: 0.3,
    maxTokens: 6_000,
    systemPrompt: null,
    configs: {},
    input: {
      userProfileId: "user_profile_abc",
      procurementNeed: "Need fractional CMO with fintech / AI experience",
      engagementType: "fractional",
    },
    triggeredBy: "manual",
    ...overrides,
  };
}

beforeEach(() => {
  callLLMMock.mockReset();
  spawnMock.mockReset();
  resolveMock.mockReset();
  resolveMock.mockResolvedValue(RESOLVED_BASE);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("G1-150 · module surface", () => {
  it("exports handler with agentId G1-150", () => {
    expect(procurementAgentHandler.agentId).toBe("G1-150");
  });
});

describe("G1-150 · isProcurementPackage guard", () => {
  it("accepts canonical", () => {
    expect(isProcurementPackage(VALID_PKG)).toBe(true);
  });

  it("rejects vendor with fitScore > 1", () => {
    expect(
      isProcurementPackage({
        ...VALID_PKG,
        vendorShortlist: [
          { ...VALID_PKG.vendorShortlist[0], fitScore: 1.5 },
          ...VALID_PKG.vendorShortlist.slice(1),
        ],
      }),
    ).toBe(false);
  });

  it("rejects rubric criterion with weight > 1", () => {
    expect(
      isProcurementPackage({
        ...VALID_PKG,
        selectionRubric: [{ criterion: "X", weight: 2, rationale: "bad" }],
      }),
    ).toBe(false);
  });
});

describe("G1-150 · parseLlmJson", () => {
  it("parses raw JSON", () => {
    expect(parseLlmJson(JSON.stringify(VALID_PKG))).not.toBeNull();
  });

  it("returns null on garbage", () => {
    expect(parseLlmJson("not json")).toBeNull();
  });
});

describe("G1-150 · execute missing-procurementNeed", () => {
  it("short-circuits with mode=missing_procurement_need", async () => {
    const result = await procurementAgentHandler.execute(
      buildContext({ input: { userProfileId: "user_profile_abc" } }),
    );
    expect(callLLMMock).not.toHaveBeenCalled();
    expect(result.outputData?.mode).toBe("missing_procurement_need");
  });
});

describe("G1-150 · execute web-search opt-in + happy path", () => {
  it("passes enableWebSearch=true and spawns licensing-commercial document", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify(VALID_PKG),
      tokensUsed: 2_500,
      costUsd: 0.038,
      provider: "perplexity",
      modelId: "sonar-pro",
      inputTokens: 1_200,
      outputTokens: 1_300,
      durationMs: 6_000,
      webSearchUsed: true,
    });
    spawnMock.mockResolvedValueOnce({
      documentId: "doc_sow_001",
      slug: "sow-aether-labs-procure",
      created: true,
    });

    const result = await procurementAgentHandler.execute(buildContext());

    expect(callLLMMock.mock.calls[0][0].enableWebSearch).toBe(true);
    expect(spawnMock.mock.calls[0][0]).toMatchObject({
      collectionSlug: "licensing-commercial",
      documentType: "proposal",
      audienceType: "internal",
      purposeType: "partnership",
    });
    expect(result.outputData?.rubricWeightSum).toBeCloseTo(1.0, 2);
    expect(result.outputData?.rubricWeightOff).toBe(false);
    expect(result.briefing?.severity).toBe("info");
    expect(result.outputData?.webSearchUsed).toBe(true);
  });

  it("warning when rubric weights are off", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify({
        ...VALID_PKG,
        selectionRubric: [
          { criterion: "X", weight: 0.4, rationale: "a" },
          { criterion: "Y", weight: 0.3, rationale: "b" },
        ], // sums to 0.7
      }),
      tokensUsed: 2_000,
      costUsd: 0.03,
      provider: "perplexity",
      modelId: "sonar-pro",
      inputTokens: 1_000,
      outputTokens: 1_000,
      durationMs: 4_500,
      webSearchUsed: true,
    });
    spawnMock.mockResolvedValueOnce({
      documentId: "doc_sow_002",
      slug: "sow-aether-labs-procure",
      created: true,
    });
    const result = await procurementAgentHandler.execute(buildContext());
    expect(result.outputData?.rubricWeightOff).toBe(true);
    expect(result.briefing?.severity).toBe("warning");
  });

  it("warning when redFlags > 0", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify({
        ...VALID_PKG,
        redFlags: ["Budget mismatch with stated rates"],
      }),
      tokensUsed: 2_000,
      costUsd: 0.03,
      provider: "perplexity",
      modelId: "sonar-pro",
      inputTokens: 1_000,
      outputTokens: 1_000,
      durationMs: 4_500,
      webSearchUsed: true,
    });
    spawnMock.mockResolvedValueOnce({
      documentId: "doc_sow_003",
      slug: "sow-aether-labs-procure",
      created: true,
    });
    const result = await procurementAgentHandler.execute(buildContext());
    expect(result.briefing?.severity).toBe("warning");
  });
});
