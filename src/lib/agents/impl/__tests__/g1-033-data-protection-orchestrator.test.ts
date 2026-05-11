/**
 * G1-033 Data Protection Orchestrator — handler contract tests
 *
 * Locks down four behaviours:
 *   1. Pure parsers (isDpiaDocument, parseLlmJson) accept/reject the
 *      canonical shape and degrade cleanly on fences + malformed input.
 *   2. LLM-unavailable path returns an alert briefing without touching
 *      the document mirror.
 *   3. JSON-parse-failed path returns a narrative-only weekly briefing
 *      with parseFailed=true and no document spawn.
 *   4. Happy path with userProfileId triggers spawnDocumentFromAgent;
 *      without it, no spawn happens.
 *
 * Dependencies are mocked at the source module's import paths:
 *   - @/lib/agents/llm           -> callLLM mocked
 *   - @/lib/agents/document-mirror -> spawnDocumentFromAgent mocked
 *   - @/lib/agents/resolve-company -> resolveUserCompany mocked
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
  dataProtectionOrchestratorHandler,
  isDpiaDocument,
  parseLlmJson,
} from "../g1-033-data-protection-orchestrator";
import type { AgentRunContext } from "../../handlers";

const callLLMMock = callLLM as unknown as ReturnType<typeof vi.fn>;
const spawnMock = spawnDocumentFromAgent as unknown as ReturnType<typeof vi.fn>;
const resolveMock = resolveUserCompany as unknown as ReturnType<typeof vi.fn>;

const VALID_DPIA = {
  schemaVersion: "1",
  companyName: "Aether Labs",
  assessmentDateLabel: "DPIA — November 2026",
  assessment: {
    dpiaRequired: true,
    reason:
      "Article 35 triggered by large-scale processing of behavioural analytics plus innovative ML.",
    applicableHighRiskCriteria: [
      "processing on a large scale",
      "innovative tech",
      "evaluation/scoring",
    ],
    legalBasisGuidance:
      "Article 6(1)(f) legitimate interests for core analytics; Article 9 NOT required.",
  },
  dpiaMarkdown: "## Description of processing\n\nFull DPIA body here.",
  dataMappingChecklist: ["contact data", "behavioural analytics", "device IDs"],
  recommendedSafeguards: [
    "Encryption at rest + in transit",
    "RBAC + audit logs",
    "Annual sub-processor audit",
  ],
  nextActions: [
    "Appoint DPO (Founder + outside counsel)",
    "Publish updated privacy notice",
  ],
  reviewCadenceNote: "Re-review annually or on any new processing activity.",
  notes: "techStack not asserted — risk class derived from sector + scale.",
};

const RESOLVED_COMPANY = {
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
    agentId: "G1-033",
    agentDbId: "agentdb_1",
    runId: "run_0123456789abcdef",
    agentName: "Data Protection Orchestrator",
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
  resolveMock.mockResolvedValue(RESOLVED_COMPANY);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─────────────────────────────────────────────
// Module surface
// ─────────────────────────────────────────────

describe("G1-033 · module surface", () => {
  it("exports the handler singleton with the correct agentId", () => {
    expect(dataProtectionOrchestratorHandler.agentId).toBe("G1-033");
    expect(typeof dataProtectionOrchestratorHandler.execute).toBe("function");
  });
});

// ─────────────────────────────────────────────
// isDpiaDocument
// ─────────────────────────────────────────────

describe("G1-033 · isDpiaDocument type guard", () => {
  it("accepts the canonical shape", () => {
    expect(isDpiaDocument(VALID_DPIA)).toBe(true);
  });

  it("rejects null + non-object inputs", () => {
    expect(isDpiaDocument(null)).toBe(false);
    expect(isDpiaDocument("string")).toBe(false);
    expect(isDpiaDocument(42)).toBe(false);
  });

  it("rejects when schemaVersion mismatches", () => {
    expect(isDpiaDocument({ ...VALID_DPIA, schemaVersion: "2" })).toBe(false);
  });

  it("rejects when assessment.applicableHighRiskCriteria is missing", () => {
    const bad = {
      ...VALID_DPIA,
      assessment: {
        ...VALID_DPIA.assessment,
        applicableHighRiskCriteria: undefined,
      },
    };
    expect(isDpiaDocument(bad)).toBe(false);
  });

  it("rejects when dpiaMarkdown is missing", () => {
    const { dpiaMarkdown, ...rest } = VALID_DPIA;
    void dpiaMarkdown;
    expect(isDpiaDocument(rest)).toBe(false);
  });
});

// ─────────────────────────────────────────────
// parseLlmJson
// ─────────────────────────────────────────────

describe("G1-033 · parseLlmJson", () => {
  it("parses a raw JSON object", () => {
    const parsed = parseLlmJson(JSON.stringify(VALID_DPIA));
    expect(parsed).not.toBeNull();
    expect(parsed!.companyName).toBe("Aether Labs");
  });

  it("parses JSON wrapped in a ```json fence", () => {
    const wrapped =
      "Here is the DPIA:\n\n```json\n" +
      JSON.stringify(VALID_DPIA) +
      "\n```\n";
    const parsed = parseLlmJson(wrapped);
    expect(parsed).not.toBeNull();
    expect(parsed!.assessment.dpiaRequired).toBe(true);
  });

  it("returns null on completely invalid JSON", () => {
    expect(parseLlmJson("not json at all")).toBeNull();
  });

  it("returns null when JSON parses but shape is wrong", () => {
    expect(parseLlmJson(JSON.stringify({ schemaVersion: "1" }))).toBeNull();
  });
});

// ─────────────────────────────────────────────
// execute — LLM unavailable
// ─────────────────────────────────────────────

describe("G1-033 · execute LLM-unavailable path", () => {
  it("returns an alert briefing without touching the document mirror", async () => {
    callLLMMock.mockResolvedValueOnce(null);

    const result = await dataProtectionOrchestratorHandler.execute(
      buildContext(),
    );

    expect(spawnMock).not.toHaveBeenCalled();
    expect(result.outputData?.mode).toBe("llm_unavailable");
    expect(result.outputData?.companyName).toBe("Aether Labs");
    expect(result.outputData?.inputSource).toBe("profile");
    expect(result.briefing?.type).toBe("alert");
    expect(result.briefing?.severity).toBe("warning");
    expect(result.briefing?.title).toContain("DPIA unavailable");
    expect(result.costUsd).toBe(0);
    expect(result.tokensUsed).toBe(0);
  });
});

// ─────────────────────────────────────────────
// execute — parse failed
// ─────────────────────────────────────────────

describe("G1-033 · execute JSON-parse-failed path", () => {
  it("returns a weekly narrative-only briefing with parseFailed=true", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: "Sorry I will not respond in JSON today.",
      tokensUsed: 12,
      costUsd: 0.0001,
      provider: "openai",
      modelId: "gpt-4o",
      inputTokens: 8,
      outputTokens: 4,
      durationMs: 120,
      webSearchUsed: false,
    });

    const result = await dataProtectionOrchestratorHandler.execute(
      buildContext(),
    );

    expect(spawnMock).not.toHaveBeenCalled();
    expect(result.outputData?.parseFailed).toBe(true);
    expect(result.outputData?.narrative).toContain("Sorry");
    expect(result.outputData?.provider).toBe("openai");
    expect(result.briefing?.type).toBe("weekly");
    expect(result.briefing?.severity).toBe("info");
    expect(result.costUsd).toBe(0.0001);
    expect(result.tokensUsed).toBe(12);
  });
});

// ─────────────────────────────────────────────
// execute — happy path
// ─────────────────────────────────────────────

describe("G1-033 · execute happy path", () => {
  it("spawns the document when userProfileId is supplied", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify(VALID_DPIA),
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
      documentId: "doc_dpia_001",
      slug: "dpia-aether-labs-456789abcdef",
      created: true,
    });

    const result = await dataProtectionOrchestratorHandler.execute(
      buildContext(),
    );

    expect(spawnMock).toHaveBeenCalledOnce();
    const spawnArgs = spawnMock.mock.calls[0][0];
    expect(spawnArgs).toMatchObject({
      userProfileId: "user_profile_abc",
      agentRunId: "run_0123456789abcdef",
      agentId: "G1-033",
      collectionSlug: "legal-compliance",
      title: "DPIA — Aether Labs",
      documentType: "legal_agreement",
      audienceType: "internal",
      purposeType: "diligence",
      confidentiality: "internal",
    });
    expect(spawnArgs.body).toContain("Description of processing");

    expect(result.outputData).toMatchObject({
      ...VALID_DPIA,
      inputSource: "profile",
      provider: "anthropic",
      modelId: "claude-sonnet-4-6",
      documentId: "doc_dpia_001",
      documentSlug: "dpia-aether-labs-456789abcdef",
      documentCreatedThisRun: true,
    });
    expect(result.briefing?.type).toBe("weekly");
    expect(result.briefing?.severity).toBe("warning"); // dpiaRequired=true
    expect(result.briefing?.title).toContain("required");
    expect(result.learnings?.[0]?.title).toContain("DPIA outcome");
    expect(result.costUsd).toBe(0.0225);
    expect(result.tokensUsed).toBe(1500);
  });

  it("does NOT spawn a document when userProfileId is absent", async () => {
    resolveMock.mockResolvedValueOnce({
      ...RESOLVED_COMPANY,
      source: "input",
      profileMatched: false,
      ownerClerkUserId: null,
    });
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify({
        ...VALID_DPIA,
        assessment: { ...VALID_DPIA.assessment, dpiaRequired: false },
      }),
      tokensUsed: 1_000,
      costUsd: 0.0,
      provider: "anthropic",
      modelId: "claude-sonnet-4-6",
      inputTokens: 500,
      outputTokens: 500,
      durationMs: 3_000,
      webSearchUsed: false,
    });

    const result = await dataProtectionOrchestratorHandler.execute(
      buildContext({
        input: { companyName: "Aether Labs", sector: "ai_ml" }, // no userProfileId
      }),
    );

    expect(spawnMock).not.toHaveBeenCalled();
    expect(result.outputData?.documentId).toBeUndefined();
    expect(result.outputData?.inputSource).toBe("input");
    expect(result.briefing?.severity).toBe("info"); // dpiaRequired=false
    expect(result.briefing?.title).toContain("voluntary");
  });
});
