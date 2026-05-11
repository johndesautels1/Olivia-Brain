/**
 * G1-048 Modern Slavery Statement Generator — handler contract tests
 *
 * Mirrors G1-033's test structure (the canonical pattern). Locks down:
 *   1. Pure parsers (isStatement, parseLlmJson) accept/reject the
 *      canonical shape, handle fences, degrade cleanly on malformed.
 *   2. Threshold state derivation: turnover >= £36M → above-threshold;
 *      < £36M → below-threshold; null → turnover-not-provided.
 *   3. LLM-unavailable path returns alert briefing, no document spawn.
 *   4. JSON-parse-failed path returns narrative-only weekly briefing,
 *      parseFailed=true, no document spawn.
 *   5. Happy path with userProfileId triggers spawnDocumentFromAgent;
 *      without it, no spawn.
 *   6. ARR-from-profile is used as turnover proxy when explicit
 *      turnoverGbp not supplied.
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
  modernSlaveryStatementGeneratorHandler,
  isStatement,
  parseLlmJson,
} from "../g1-048-modern-slavery-statement-generator";
import type { AgentRunContext } from "../../handlers";

const callLLMMock = callLLM as unknown as ReturnType<typeof vi.fn>;
const spawnMock = spawnDocumentFromAgent as unknown as ReturnType<typeof vi.fn>;
const resolveMock = resolveUserCompany as unknown as ReturnType<typeof vi.fn>;

const VALID_STATEMENT = {
  companyName: "Aether Labs",
  financialYearReference: "FY ending 31 March 2026",
  requirementCheck: {
    legallyRequired: false,
    reason:
      "Turnover £1.2M sits below the s.54 £36M statutory threshold; statement is voluntary.",
    publicationDeadlineNote:
      "No statutory deadline; recommended within 6 months of FY end.",
  },
  statementMarkdown:
    "## 1. Organisational structure & supply chains\n\nAether Labs is a 24-person AI company...",
  recommendedKpis: [
    "Number of supplier ESG audits completed",
    "Training completion rate (target 100%)",
    "Reports surfaced via whistleblowing channel",
    "Sub-processor list reviewed quarterly",
  ],
  signOffGuidance:
    "Statement should be approved at board level and signed by a director per s.54(6).",
  notes:
    "Below the £36M threshold; publication is voluntary but recommended as an enterprise-buyer-readiness signal.",
};

// Base resolved-company shape returned by the (mocked) resolveUserCompany.
const RESOLVED_BASE = {
  companyName: "Aether Labs",
  sector: "ai_ml",
  employeeCount: 24,
  headquartersLocation: "Shoreditch, London",
  arr: 1_200_000,
  totalRaised: 4_500_000,
  certifications: [],
  regulatoryBody: null,
  customerCount: null,
  source: "profile",
  profileMatched: true,
  ownerClerkUserId: "user_clerk_xyz",
};

function buildContext(overrides?: Partial<AgentRunContext>): AgentRunContext {
  return {
    agentId: "G1-048",
    agentDbId: "agentdb_2",
    runId: "run_modernslavery0048",
    agentName: "Modern Slavery Statement Generator",
    groupCode: "1F",
    groupName: "Legal & Compliance",
    persona: "olivia",
    llmModel: "claude-sonnet-4-6",
    temperature: 0.2,
    maxTokens: 4_000,
    systemPrompt: null,
    configs: {},
    input: { userProfileId: "user_profile_abc" },
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

// ─────────────────────────────────────────────
// Module surface
// ─────────────────────────────────────────────

describe("G1-048 · module surface", () => {
  it("exports the handler singleton with the correct agentId", () => {
    expect(modernSlaveryStatementGeneratorHandler.agentId).toBe("G1-048");
    expect(typeof modernSlaveryStatementGeneratorHandler.execute).toBe(
      "function",
    );
  });
});

// ─────────────────────────────────────────────
// isStatement
// ─────────────────────────────────────────────

describe("G1-048 · isStatement type guard", () => {
  it("accepts the canonical shape", () => {
    expect(isStatement(VALID_STATEMENT)).toBe(true);
  });

  it("rejects null + non-object inputs", () => {
    expect(isStatement(null)).toBe(false);
    expect(isStatement("string")).toBe(false);
    expect(isStatement(42)).toBe(false);
  });

  it("rejects when requirementCheck is missing", () => {
    const { requirementCheck, ...rest } = VALID_STATEMENT;
    void requirementCheck;
    expect(isStatement(rest)).toBe(false);
  });

  it("rejects when recommendedKpis is not an array", () => {
    expect(
      isStatement({ ...VALID_STATEMENT, recommendedKpis: "kpis" }),
    ).toBe(false);
  });
});

// ─────────────────────────────────────────────
// parseLlmJson
// ─────────────────────────────────────────────

describe("G1-048 · parseLlmJson", () => {
  it("parses a raw JSON object", () => {
    expect(parseLlmJson(JSON.stringify(VALID_STATEMENT))).not.toBeNull();
  });

  it("parses JSON wrapped in a ```json fence", () => {
    const wrapped = "Preamble:\n\n```json\n" + JSON.stringify(VALID_STATEMENT) + "\n```";
    const parsed = parseLlmJson(wrapped);
    expect(parsed).not.toBeNull();
    expect(parsed!.companyName).toBe("Aether Labs");
  });

  it("returns null on completely invalid JSON", () => {
    expect(parseLlmJson("not json at all")).toBeNull();
  });

  it("returns null when JSON parses but shape is wrong", () => {
    expect(
      parseLlmJson(JSON.stringify({ companyName: "X" })),
    ).toBeNull();
  });
});

// ─────────────────────────────────────────────
// execute — LLM unavailable
// ─────────────────────────────────────────────

describe("G1-048 · execute LLM-unavailable path", () => {
  it("returns an alert briefing without touching the document mirror", async () => {
    callLLMMock.mockResolvedValueOnce(null);

    const result = await modernSlaveryStatementGeneratorHandler.execute(
      buildContext(),
    );

    expect(spawnMock).not.toHaveBeenCalled();
    expect(result.outputData?.mode).toBe("llm_unavailable");
    expect(result.outputData?.inputSource).toBe("profile");
    expect(result.briefing?.type).toBe("alert");
    expect(result.briefing?.severity).toBe("warning");
    expect(result.briefing?.title).toContain("unavailable");
    expect(result.costUsd).toBe(0);
    expect(result.tokensUsed).toBe(0);
  });
});

// ─────────────────────────────────────────────
// execute — parse failed
// ─────────────────────────────────────────────

describe("G1-048 · execute JSON-parse-failed path", () => {
  it("returns a weekly narrative-only briefing with parseFailed=true", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: "Sorry, plain text only today.",
      tokensUsed: 10,
      costUsd: 0.0001,
      provider: "openai",
      modelId: "gpt-4o",
      inputTokens: 6,
      outputTokens: 4,
      durationMs: 100,
      webSearchUsed: false,
    });

    const result = await modernSlaveryStatementGeneratorHandler.execute(
      buildContext(),
    );

    expect(spawnMock).not.toHaveBeenCalled();
    expect(result.outputData?.parseFailed).toBe(true);
    expect(result.outputData?.narrative).toContain("Sorry");
    expect(result.briefing?.type).toBe("weekly");
    expect(result.briefing?.severity).toBe("info");
    expect(result.costUsd).toBe(0.0001);
  });
});

// ─────────────────────────────────────────────
// execute — happy path + threshold derivation
// ─────────────────────────────────────────────

describe("G1-048 · execute happy path", () => {
  it("spawns the document with the canonical legal-compliance shape", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify(VALID_STATEMENT),
      tokensUsed: 1_500,
      costUsd: 0.0225,
      provider: "anthropic",
      modelId: "claude-sonnet-4-6",
      inputTokens: 800,
      outputTokens: 700,
      durationMs: 4_200,
      webSearchUsed: false,
    });
    spawnMock.mockResolvedValueOnce({
      documentId: "doc_mss_001",
      slug: "modern-slavery-statement-aether-labs-modernslavery",
      created: true,
    });

    const result = await modernSlaveryStatementGeneratorHandler.execute(
      buildContext(),
    );

    expect(spawnMock).toHaveBeenCalledOnce();
    const spawnArgs = spawnMock.mock.calls[0][0];
    expect(spawnArgs).toMatchObject({
      userProfileId: "user_profile_abc",
      agentRunId: "run_modernslavery0048",
      agentId: "G1-048",
      collectionSlug: "legal-compliance",
      title: "Modern Slavery Statement — Aether Labs",
      documentType: "legal_agreement",
      audienceType: "internal",
      purposeType: "diligence",
      confidentiality: "internal",
    });
    expect(spawnArgs.body).toContain("Organisational structure");
    expect(spawnArgs.summary).toContain("voluntary");

    expect(result.outputData).toMatchObject({
      ...VALID_STATEMENT,
      inputSource: "profile",
      thresholdState: "below-threshold", // ARR £1.2M < £36M
      provider: "anthropic",
      documentId: "doc_mss_001",
    });
    expect(result.briefing?.type).toBe("weekly");
    expect(result.briefing?.severity).toBe("info"); // !legallyRequired
    expect(result.briefing?.title).toContain("voluntary");
    expect(result.costUsd).toBe(0.0225);
  });

  it("does NOT spawn a document when userProfileId is absent", async () => {
    resolveMock.mockResolvedValueOnce({
      ...RESOLVED_BASE,
      source: "input",
      profileMatched: false,
      ownerClerkUserId: null,
      arr: null,
    });
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify(VALID_STATEMENT),
      tokensUsed: 800,
      costUsd: 0.01,
      provider: "anthropic",
      modelId: "claude-sonnet-4-6",
      inputTokens: 400,
      outputTokens: 400,
      durationMs: 2_500,
      webSearchUsed: false,
    });

    const result = await modernSlaveryStatementGeneratorHandler.execute(
      buildContext({
        input: { companyName: "Aether Labs" }, // no userProfileId
      }),
    );

    expect(spawnMock).not.toHaveBeenCalled();
    expect(result.outputData?.documentId).toBeUndefined();
    expect(result.outputData?.thresholdState).toBe("turnover-not-provided");
  });

  it("flips severity to warning + thresholdState=above-threshold when statement is legally required", async () => {
    resolveMock.mockResolvedValueOnce({
      ...RESOLVED_BASE,
      arr: 50_000_000, // £50M > £36M threshold
    });
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify({
        ...VALID_STATEMENT,
        requirementCheck: {
          ...VALID_STATEMENT.requirementCheck,
          legallyRequired: true,
          reason:
            "Turnover £50M exceeds the s.54 £36M statutory threshold; a statement is mandatory.",
        },
      }),
      tokensUsed: 1_500,
      costUsd: 0.0225,
      provider: "anthropic",
      modelId: "claude-sonnet-4-6",
      inputTokens: 800,
      outputTokens: 700,
      durationMs: 4_200,
      webSearchUsed: false,
    });
    spawnMock.mockResolvedValueOnce({
      documentId: "doc_mss_002",
      slug: "modern-slavery-statement-aether-labs-modernslavery",
      created: true,
    });

    const result = await modernSlaveryStatementGeneratorHandler.execute(
      buildContext(),
    );

    expect(result.outputData?.thresholdState).toBe("above-threshold");
    expect(result.briefing?.severity).toBe("warning");
    expect(result.briefing?.title).toContain("required");
  });
});

// ─────────────────────────────────────────────
// Explicit turnover overrides profile ARR
// ─────────────────────────────────────────────

describe("G1-048 · explicit turnover overrides ARR proxy", () => {
  it("uses explicit turnoverGbp from input instead of profile ARR", async () => {
    resolveMock.mockResolvedValueOnce({
      ...RESOLVED_BASE,
      arr: 1_200_000, // would otherwise drive below-threshold
    });
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify({
        ...VALID_STATEMENT,
        requirementCheck: {
          ...VALID_STATEMENT.requirementCheck,
          legallyRequired: true,
          reason: "Turnover £40M exceeds the s.54 £36M threshold.",
        },
      }),
      tokensUsed: 1_000,
      costUsd: 0.01,
      provider: "anthropic",
      modelId: "claude-sonnet-4-6",
      inputTokens: 500,
      outputTokens: 500,
      durationMs: 2_500,
      webSearchUsed: false,
    });
    spawnMock.mockResolvedValueOnce({
      documentId: "doc_mss_003",
      slug: "modern-slavery-statement-aether-labs-modernslavery",
      created: true,
    });

    const result = await modernSlaveryStatementGeneratorHandler.execute(
      buildContext({
        input: {
          userProfileId: "user_profile_abc",
          turnoverGbp: 40_000_000, // explicit £40M overrides £1.2M ARR
        },
      }),
    );

    expect(result.outputData?.thresholdState).toBe("above-threshold");
    expect(result.outputData?.inputSource).toBe("input+profile");
  });
});
