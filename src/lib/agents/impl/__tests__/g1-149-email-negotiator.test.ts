/**
 * G1-149 Email Negotiator — handler contract tests
 *
 * Locks down:
 *   - Missing inboundEmail early exit.
 *   - Audience/purpose routing matrix (7 request types → distinct
 *     audienceType + purposeType pairs).
 *   - Stance=ignore skips document spawn.
 *   - Three-level severity: info / warning / critical.
 *     * critical when escalateToFounder=true OR redFlags>1.
 *     * warning when redFlags=1 OR sender-leverage on engaging stance.
 *     * info otherwise.
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
  emailNegotiatorHandler,
  isNegotiationPackage,
  parseLlmJson,
  routeAudienceAndPurpose,
} from "../g1-149-email-negotiator";
import type { AgentRunContext } from "../../handlers";

const callLLMMock = callLLM as unknown as ReturnType<typeof vi.fn>;
const spawnMock = spawnDocumentFromAgent as unknown as ReturnType<typeof vi.fn>;
const resolveMock = resolveUserCompany as unknown as ReturnType<typeof vi.fn>;

const VALID_PKG = {
  schemaVersion: "1",
  companyName: "Aether Labs",
  senderSummary:
    "Strategic partner at Lloyds is asking about an AI safety pilot.",
  detectedRequestType: "partnership",
  assessment: {
    detectedIntent:
      "Lloyds wants a 90-day paid pilot scoping AI safety governance.",
    leverage: "balanced",
    urgency: "medium",
    senderHooks: ["Lloyds regulatory pressure", "Existing AI working group"],
    founderRedLines: ["No exclusivity in first 90 days"],
    founderHooks: ["ICO-aligned safety stack", "AISI engagement track record"],
  },
  recommendedStance: "negotiate",
  draftReplyMarkdown:
    "Hi [Sender],\n\nThanks for reaching out — happy to scope a 90-day paid pilot...",
  negotiationLeverPoints: [
    "Pilot fee floor of £25K (not free POC).",
    "Right to publish anonymised case study post-pilot.",
    "No exclusivity in the first 90 days.",
  ],
  counterOfferStructure:
    "90-day paid pilot, £25K, mutual NDA, weekly review checkpoint, no exclusivity.",
  followUpStrategy:
    "Send pitch. If no reply in 5 working days, follow up with the regulatory deadline angle.",
  redFlags: [],
  escalateToFounder: false,
  escalationReason: "",
  notes: "Founder playbook respected; no red lines breached.",
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
    agentId: "G1-149",
    agentDbId: "agentdb_9",
    runId: "run_emailneg149",
    agentName: "Email Negotiator",
    groupCode: "1R",
    groupName: "Communications",
    persona: "olivia",
    llmModel: "claude-sonnet-4-6",
    temperature: 0.3,
    maxTokens: 6_000,
    systemPrompt: null,
    configs: {},
    input: {
      userProfileId: "user_profile_abc",
      inboundEmail:
        "Hi -- I'm Sarah at Lloyds. We'd love to scope an AI safety pilot with Aether...",
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

describe("G1-149 · module surface", () => {
  it("exports handler with correct agentId", () => {
    expect(emailNegotiatorHandler.agentId).toBe("G1-149");
  });
});

describe("G1-149 · routeAudienceAndPurpose matrix", () => {
  const cases: Array<{
    requestType:
      | "partnership"
      | "investment"
      | "acquisition"
      | "vendor_offer"
      | "customer_inbound"
      | "media_request"
      | "other";
    expected: { audienceType: string; purposeType: string };
  }> = [
    { requestType: "investment", expected: { audienceType: "investor", purposeType: "fundraising" } },
    { requestType: "acquisition", expected: { audienceType: "acquirer", purposeType: "acquisition" } },
    { requestType: "partnership", expected: { audienceType: "strategic_partner", purposeType: "partnership" } },
    { requestType: "vendor_offer", expected: { audienceType: "internal", purposeType: "outreach" } },
    { requestType: "customer_inbound", expected: { audienceType: "enterprise_client", purposeType: "outreach" } },
    { requestType: "media_request", expected: { audienceType: "media", purposeType: "outreach" } },
    { requestType: "other", expected: { audienceType: "internal", purposeType: "outreach" } },
  ];
  for (const { requestType, expected } of cases) {
    it(`${requestType} → ${expected.audienceType} / ${expected.purposeType}`, () => {
      expect(routeAudienceAndPurpose(requestType)).toEqual(expected);
    });
  }
});

describe("G1-149 · isNegotiationPackage guard", () => {
  it("accepts canonical shape", () => {
    expect(isNegotiationPackage(VALID_PKG)).toBe(true);
  });

  it("rejects unknown stance", () => {
    expect(
      isNegotiationPackage({ ...VALID_PKG, recommendedStance: "shrug" }),
    ).toBe(false);
  });

  it("rejects when assessment is missing leverage", () => {
    expect(
      isNegotiationPackage({
        ...VALID_PKG,
        assessment: { ...VALID_PKG.assessment, leverage: undefined },
      }),
    ).toBe(false);
  });

  it("accepts null counterOfferStructure", () => {
    expect(
      isNegotiationPackage({ ...VALID_PKG, counterOfferStructure: null }),
    ).toBe(true);
  });
});

describe("G1-149 · parseLlmJson", () => {
  it("parses raw JSON", () => {
    expect(parseLlmJson(JSON.stringify(VALID_PKG))).not.toBeNull();
  });

  it("returns null on garbage", () => {
    expect(parseLlmJson("plain prose")).toBeNull();
  });
});

describe("G1-149 · execute missing-inboundEmail", () => {
  it("short-circuits with mode=missing_inbound_email", async () => {
    const result = await emailNegotiatorHandler.execute(
      buildContext({ input: { userProfileId: "user_profile_abc" } }),
    );
    expect(callLLMMock).not.toHaveBeenCalled();
    expect(result.outputData?.mode).toBe("missing_inbound_email");
  });
});

describe("G1-149 · execute happy path + severity", () => {
  it("info severity, balanced leverage, no red flags, negotiate stance, partnership audienceType", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify(VALID_PKG),
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
      documentId: "doc_email_001",
      slug: "email-reply-aether-labs-emailneg",
      created: true,
    });

    const result = await emailNegotiatorHandler.execute(buildContext());

    expect(spawnMock).toHaveBeenCalledOnce();
    expect(spawnMock.mock.calls[0][0]).toMatchObject({
      collectionSlug: "sales-marketing",
      audienceType: "strategic_partner",
      purposeType: "partnership",
    });
    expect(result.briefing?.severity).toBe("info");
  });

  it("CRITICAL when escalateToFounder is true", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify({
        ...VALID_PKG,
        escalateToFounder: true,
        escalationReason: "Pre-existing relationship with sender's board.",
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
    spawnMock.mockResolvedValueOnce({
      documentId: "doc_email_002",
      slug: "email-reply-aether-labs-emailneg",
      created: true,
    });
    const result = await emailNegotiatorHandler.execute(buildContext());
    expect(result.briefing?.severity).toBe("critical");
  });

  it("CRITICAL when redFlags > 1", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify({
        ...VALID_PKG,
        redFlags: ["Impersonation signal", "Off-platform crypto ask"],
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
    spawnMock.mockResolvedValueOnce({
      documentId: "doc_email_003",
      slug: "email-reply-aether-labs-emailneg",
      created: true,
    });
    const result = await emailNegotiatorHandler.execute(buildContext());
    expect(result.briefing?.severity).toBe("critical");
  });

  it("warning when sender-leverage on a non-trivial stance", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify({
        ...VALID_PKG,
        recommendedStance: "engage_warm",
        assessment: { ...VALID_PKG.assessment, leverage: "sender" },
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
    spawnMock.mockResolvedValueOnce({
      documentId: "doc_email_004",
      slug: "email-reply-aether-labs-emailneg",
      created: true,
    });
    const result = await emailNegotiatorHandler.execute(buildContext());
    expect(result.briefing?.severity).toBe("warning");
  });

  it("skips document spawn when stance=ignore", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify({
        ...VALID_PKG,
        recommendedStance: "ignore",
      }),
      tokensUsed: 1_500,
      costUsd: 0.02,
      provider: "anthropic",
      modelId: "claude-sonnet-4-6",
      inputTokens: 800,
      outputTokens: 700,
      durationMs: 4_000,
      webSearchUsed: false,
    });
    const result = await emailNegotiatorHandler.execute(buildContext());
    expect(spawnMock).not.toHaveBeenCalled();
    expect(result.outputData?.documentId).toBeUndefined();
  });
});
