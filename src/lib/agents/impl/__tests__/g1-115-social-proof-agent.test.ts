/**
 * G1-115 Social Proof Agent — handler contract tests
 *
 * New pattern wrinkles this handler exercises:
 *   1. Numeric-threshold severity (legitimacyScore < 50 → warning).
 *   2. Conditional audienceType / purposeType derivation from
 *      targetUseContext (investor_deck → investor / fundraising;
 *      enterprise_pitch → enterprise_client / partnership; press_kit
 *      → media / outreach; website → investor / outreach).
 *   3. Deep proofCategories validation (enum category + enum
 *      strengthLabel + non-empty rationale).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/agents/llm", () => ({
  callLLM: vi.fn(),
}));
vi.mock("@/lib/agents/document-mirror", () => ({
  spawnDocumentFromAgent: vi.fn(),
}));
vi.mock("@/lib/agents/resolve-company", () => ({
  resolveUserCompany: vi.fn(),
}));

import { callLLM } from "@/lib/agents/llm";
import { spawnDocumentFromAgent } from "@/lib/agents/document-mirror";
import { resolveUserCompany } from "@/lib/agents/resolve-company";
import {
  socialProofAgentHandler,
  isProofPackage,
  parseLlmJson,
} from "../g1-115-social-proof-agent";
import type { AgentRunContext } from "../../handlers";

const callLLMMock = callLLM as unknown as ReturnType<typeof vi.fn>;
const spawnMock = spawnDocumentFromAgent as unknown as ReturnType<typeof vi.fn>;
const resolveMock = resolveUserCompany as unknown as ReturnType<typeof vi.fn>;

const VALID_PROOF = {
  schemaVersion: "1",
  companyName: "Aether Labs",
  targetUseContext: "investor_deck",
  proofCategories: [
    {
      category: "customer_logos",
      items: ["NHS Digital", "Lloyds Banking Group"],
      strengthLabel: "moderate",
      rationale: "Two named enterprise customers; logo rights confirmed.",
    },
    {
      category: "regulator_alignments",
      items: ["ICO registered", "AISI engagement in progress"],
      strengthLabel: "strong",
      rationale: "Material regulator signals for an AI safety story.",
    },
    {
      category: "press_mentions",
      items: [],
      strengthLabel: "missing",
      rationale: "No press mentions logged; major gap for an investor deck.",
    },
  ],
  recommendedSlideMarkdown:
    "## Proof Points\n\n- NHS Digital + Lloyds — enterprise references\n- ICO registered + AISI engagement\n",
  gapAnalysis: [
    "No press mentions — pitch Sifted or FT Tech this quarter.",
    "No investor logos beyond seed — name Index/Atomico in conversations.",
    "Team credentials slide missing PhD/ex-FAANG names.",
  ],
  legitimacyScore: 62,
  nextActions: [
    "Acquire one Tier-1 press mention by Q3.",
    "Add team credentials slide with last-role logos.",
    "Confirm NHS Digital logo permission in writing.",
  ],
  notes: "Score weighted toward investor-deck context (investor logos + traction matter most).",
};

const RESOLVED_BASE = {
  companyName: "Aether Labs",
  sector: "ai_ml",
  employeeCount: 24,
  headquartersLocation: "Shoreditch, London",
  arr: 1_200_000,
  totalRaised: 4_500_000,
  certifications: ["SOC2"],
  regulatoryBody: "ico",
  customerCount: 480,
  source: "profile",
  profileMatched: true,
  ownerClerkUserId: "user_clerk_xyz",
};

function buildContext(overrides?: Partial<AgentRunContext>): AgentRunContext {
  return {
    agentId: "G1-115",
    agentDbId: "agentdb_6",
    runId: "run_socialproof115",
    agentName: "Social Proof Agent",
    groupCode: "1L",
    groupName: "Storytelling & Pitch",
    persona: "olivia",
    llmModel: "claude-sonnet-4-6",
    temperature: 0.3,
    maxTokens: 5_000,
    systemPrompt: null,
    configs: {},
    input: {
      userProfileId: "user_profile_abc",
      targetUseContext: "investor_deck",
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

describe("G1-115 · module surface", () => {
  it("exports handler with correct agentId", () => {
    expect(socialProofAgentHandler.agentId).toBe("G1-115");
    expect(typeof socialProofAgentHandler.execute).toBe("function");
  });
});

describe("G1-115 · isProofPackage type guard", () => {
  it("accepts canonical shape", () => {
    expect(isProofPackage(VALID_PROOF)).toBe(true);
  });

  it("rejects when a proofCategory has an unknown category enum value", () => {
    expect(
      isProofPackage({
        ...VALID_PROOF,
        proofCategories: [
          { ...VALID_PROOF.proofCategories[0], category: "made_up_category" },
        ],
      }),
    ).toBe(false);
  });

  it("rejects when strengthLabel is not one of the four valid values", () => {
    expect(
      isProofPackage({
        ...VALID_PROOF,
        proofCategories: [
          { ...VALID_PROOF.proofCategories[0], strengthLabel: "amazing" },
        ],
      }),
    ).toBe(false);
  });

  it("rejects legitimacyScore outside [0, 100]", () => {
    expect(isProofPackage({ ...VALID_PROOF, legitimacyScore: 150 })).toBe(false);
    expect(isProofPackage({ ...VALID_PROOF, legitimacyScore: -5 })).toBe(false);
  });
});

describe("G1-115 · parseLlmJson", () => {
  it("parses raw JSON", () => {
    expect(parseLlmJson(JSON.stringify(VALID_PROOF))).not.toBeNull();
  });

  it("parses JSON in a ```json fence", () => {
    expect(
      parseLlmJson("```json\n" + JSON.stringify(VALID_PROOF) + "\n```"),
    ).not.toBeNull();
  });

  it("returns null on garbage", () => {
    expect(parseLlmJson("not json")).toBeNull();
  });
});

describe("G1-115 · execute LLM-unavailable + parse-failed", () => {
  it("returns alert briefing on LLM unavailable", async () => {
    callLLMMock.mockResolvedValueOnce(null);
    const result = await socialProofAgentHandler.execute(buildContext());
    expect(spawnMock).not.toHaveBeenCalled();
    expect(result.outputData?.mode).toBe("llm_unavailable");
    expect(result.briefing?.severity).toBe("warning");
  });

  it("returns narrative weekly on parse fail", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: "free-form text",
      tokensUsed: 10,
      costUsd: 0.0001,
      provider: "anthropic",
      modelId: "claude-sonnet-4-6",
      inputTokens: 5,
      outputTokens: 5,
      durationMs: 100,
      webSearchUsed: false,
    });
    const result = await socialProofAgentHandler.execute(buildContext());
    expect(spawnMock).not.toHaveBeenCalled();
    expect(result.outputData?.parseFailed).toBe(true);
  });
});

describe("G1-115 · execute happy path (investor_deck)", () => {
  it("spawns with investor / fundraising shape; legitimacyScore 62 → info severity", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify(VALID_PROOF),
      tokensUsed: 2_000,
      costUsd: 0.03,
      provider: "anthropic",
      modelId: "claude-sonnet-4-6",
      inputTokens: 1_000,
      outputTokens: 1_000,
      durationMs: 4_500,
      webSearchUsed: false,
    });
    spawnMock.mockResolvedValueOnce({
      documentId: "doc_proof_001",
      slug: "social-proof-package-aether-labs-socialproof",
      created: true,
    });

    const result = await socialProofAgentHandler.execute(buildContext());

    expect(spawnMock).toHaveBeenCalledOnce();
    const spawnArgs = spawnMock.mock.calls[0][0];
    expect(spawnArgs).toMatchObject({
      collectionSlug: "sales-marketing",
      documentType: "marketing_doc",
      audienceType: "investor",
      purposeType: "fundraising",
    });
    expect(result.briefing?.severity).toBe("info"); // 62 >= 50
  });

  it("flips severity to warning when legitimacyScore < 50", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify({ ...VALID_PROOF, legitimacyScore: 35 }),
      tokensUsed: 2_000,
      costUsd: 0.03,
      provider: "anthropic",
      modelId: "claude-sonnet-4-6",
      inputTokens: 1_000,
      outputTokens: 1_000,
      durationMs: 4_500,
      webSearchUsed: false,
    });
    spawnMock.mockResolvedValueOnce({
      documentId: "doc_proof_002",
      slug: "social-proof-package-aether-labs-socialproof",
      created: true,
    });
    const result = await socialProofAgentHandler.execute(buildContext());
    expect(result.briefing?.severity).toBe("warning");
  });
});

describe("G1-115 · audience/purpose derivation per targetUseContext", () => {
  async function runWithContext(
    targetUseContext: "investor_deck" | "enterprise_pitch" | "press_kit" | "website",
  ) {
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify({ ...VALID_PROOF, targetUseContext }),
      tokensUsed: 2_000,
      costUsd: 0.03,
      provider: "anthropic",
      modelId: "claude-sonnet-4-6",
      inputTokens: 1_000,
      outputTokens: 1_000,
      durationMs: 4_500,
      webSearchUsed: false,
    });
    spawnMock.mockResolvedValueOnce({
      documentId: "doc_proof",
      slug: "social-proof-package-aether-labs-socialproof",
      created: true,
    });
    await socialProofAgentHandler.execute(
      buildContext({
        input: { userProfileId: "user_profile_abc", targetUseContext },
      }),
    );
    return spawnMock.mock.calls[0][0];
  }

  it("investor_deck → investor / fundraising", async () => {
    const args = await runWithContext("investor_deck");
    expect(args.audienceType).toBe("investor");
    expect(args.purposeType).toBe("fundraising");
  });

  it("enterprise_pitch → enterprise_client / partnership", async () => {
    const args = await runWithContext("enterprise_pitch");
    expect(args.audienceType).toBe("enterprise_client");
    expect(args.purposeType).toBe("partnership");
  });

  it("press_kit → media / outreach", async () => {
    const args = await runWithContext("press_kit");
    expect(args.audienceType).toBe("media");
    expect(args.purposeType).toBe("outreach");
  });

  it("website → investor / outreach (default-investor fallback)", async () => {
    const args = await runWithContext("website");
    expect(args.audienceType).toBe("investor");
    expect(args.purposeType).toBe("outreach");
  });
});
