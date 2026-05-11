/**
 * G1-107 Thought Leadership Ghostwriter — handler contract tests
 *
 * Mirrors G1-033 / G1-048 / G1-076 structure. Locks down:
 *   1. Pure parsers (isDraftedArticle, parseLlmJson).
 *   2. LLM-unavailable + parse-failed fallback paths.
 *   3. Happy path: sales-marketing mirror with marketing_doc /
 *      media / outreach shape; severity is always "info"
 *      (no warning-trigger flag for this handler).
 *   4. maxTokens cap: handler caps at 5000 even when context
 *      requests more, to keep generation under the 45s timeout.
 *   5. Empty articleMarkdown short-circuits document spawn.
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
  thoughtLeadershipGhostwriterHandler,
  isDraftedArticle,
  parseLlmJson,
} from "../g1-107-thought-leadership-ghostwriter";
import type { AgentRunContext } from "../../handlers";

const callLLMMock = callLLM as unknown as ReturnType<typeof vi.fn>;
const spawnMock = spawnDocumentFromAgent as unknown as ReturnType<typeof vi.fn>;
const resolveMock = resolveUserCompany as unknown as ReturnType<typeof vi.fn>;

const VALID_ARTICLE = {
  schemaVersion: "1",
  companyName: "Aether Labs",
  topic: "Why London's AI safety stack beats SF's",
  format: "essay",
  audience: "founders",
  articleTitle: "London's quiet edge in AI safety",
  articleHook:
    "Every founder I meet in SF assumes safety is a tax on speed. In London, we found out it isn't.",
  articleMarkdown:
    "## The view from Shoreditch\n\nWhen I started Aether Labs three years ago...\n",
  keyArguments: [
    "UK AISI gives founders a credible third party in the loop.",
    "EIS / SEIS means safety hiring is partially de-risked.",
    "Customer demand for explainable AI is higher in EU regulated buyers.",
  ],
  claimsToVerify: [
    "AISI evaluations completed (specific count).",
    "Percentage of EU regulated buyers who require explainability docs.",
  ],
  pullQuotes: [
    "Safety isn't a tax on speed. It's a moat.",
    "The buyers who pay full enterprise rates also read the system card.",
    "Compliance shipped fast is still compliance.",
  ],
  callToAction:
    "If you're building AI in the UK, we'd love to compare notes — email me directly.",
  distributionSuggestions: ["Sifted", "Substack", "LinkedIn", "FT Tech"],
  estimatedReadTimeMinutes: 4,
  notes:
    "Field-of-view essay; specific AISI engagement numbers redacted pending verification.",
};

const RESOLVED_BASE = {
  companyName: "Aether Labs",
  sector: "ai_ml",
  employeeCount: 24,
  headquartersLocation: "Shoreditch, London",
  arr: 7_900_000,
  totalRaised: 12_000_000,
  certifications: [],
  regulatoryBody: "ico",
  customerCount: null,
  source: "profile",
  profileMatched: true,
  ownerClerkUserId: "user_clerk_xyz",
};

function buildContext(overrides?: Partial<AgentRunContext>): AgentRunContext {
  return {
    agentId: "G1-107",
    agentDbId: "agentdb_4",
    runId: "run_ghostwriter107",
    agentName: "Thought Leadership Ghostwriter",
    groupCode: "1J",
    groupName: "Storytelling & Pitch",
    persona: "olivia",
    llmModel: "claude-sonnet-4-6",
    temperature: 0.6,
    maxTokens: 8_000, // intentionally above the 5000 cap to verify cap logic
    systemPrompt: null,
    configs: {},
    input: {
      userProfileId: "user_profile_abc",
      topic: "Why London's AI safety stack beats SF's",
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

// ─────────────────────────────────────────────
// Module surface
// ─────────────────────────────────────────────

describe("G1-107 · module surface", () => {
  it("exports the handler singleton with the correct agentId", () => {
    expect(thoughtLeadershipGhostwriterHandler.agentId).toBe("G1-107");
    expect(typeof thoughtLeadershipGhostwriterHandler.execute).toBe(
      "function",
    );
  });
});

// ─────────────────────────────────────────────
// isDraftedArticle
// ─────────────────────────────────────────────

describe("G1-107 · isDraftedArticle type guard", () => {
  it("accepts the canonical shape", () => {
    expect(isDraftedArticle(VALID_ARTICLE)).toBe(true);
  });

  it("rejects when estimatedReadTimeMinutes is missing or non-numeric", () => {
    expect(
      isDraftedArticle({
        ...VALID_ARTICLE,
        estimatedReadTimeMinutes: "five",
      }),
    ).toBe(false);
  });

  it("rejects when pullQuotes is not an array", () => {
    expect(isDraftedArticle({ ...VALID_ARTICLE, pullQuotes: "x" })).toBe(false);
  });

  it("rejects null + primitives", () => {
    expect(isDraftedArticle(null)).toBe(false);
    expect(isDraftedArticle(42)).toBe(false);
  });
});

// ─────────────────────────────────────────────
// parseLlmJson
// ─────────────────────────────────────────────

describe("G1-107 · parseLlmJson", () => {
  it("parses raw JSON", () => {
    expect(parseLlmJson(JSON.stringify(VALID_ARTICLE))).not.toBeNull();
  });

  it("parses JSON inside a ```json fence", () => {
    expect(
      parseLlmJson("```json\n" + JSON.stringify(VALID_ARTICLE) + "\n```"),
    ).not.toBeNull();
  });

  it("returns null on garbage", () => {
    expect(parseLlmJson("plain prose")).toBeNull();
  });
});

// ─────────────────────────────────────────────
// execute — LLM unavailable / parse fail
// ─────────────────────────────────────────────

describe("G1-107 · execute LLM-unavailable path", () => {
  it("returns alert briefing without document spawn", async () => {
    callLLMMock.mockResolvedValueOnce(null);
    const result = await thoughtLeadershipGhostwriterHandler.execute(
      buildContext(),
    );
    expect(spawnMock).not.toHaveBeenCalled();
    expect(result.outputData?.mode).toBe("llm_unavailable");
    expect(result.briefing?.severity).toBe("warning");
  });
});

describe("G1-107 · execute JSON-parse-failed path", () => {
  it("returns narrative weekly briefing with parseFailed=true", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: "I'd rather not return JSON today, thanks.",
      tokensUsed: 11,
      costUsd: 0.0001,
      provider: "openai",
      modelId: "gpt-4o",
      inputTokens: 7,
      outputTokens: 4,
      durationMs: 90,
      webSearchUsed: false,
    });
    const result = await thoughtLeadershipGhostwriterHandler.execute(
      buildContext(),
    );
    expect(spawnMock).not.toHaveBeenCalled();
    expect(result.outputData?.parseFailed).toBe(true);
    expect(result.briefing?.type).toBe("weekly");
  });
});

// ─────────────────────────────────────────────
// execute — maxTokens cap
// ─────────────────────────────────────────────

describe("G1-107 · maxTokens cap", () => {
  it("caps maxTokens at 5000 even when context requests more", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify(VALID_ARTICLE),
      tokensUsed: 2_500,
      costUsd: 0.025,
      provider: "anthropic",
      modelId: "claude-sonnet-4-6",
      inputTokens: 1_500,
      outputTokens: 1_000,
      durationMs: 5_000,
      webSearchUsed: false,
    });
    spawnMock.mockResolvedValueOnce({
      documentId: "doc_art_001",
      slug: "thought-leadership-londons-quiet-edge-ghostwriter",
      created: true,
    });

    await thoughtLeadershipGhostwriterHandler.execute(
      buildContext({ maxTokens: 8_000 }), // requests 8000
    );

    // callLLM was invoked with the capped value, not the requested 8000.
    expect(callLLMMock.mock.calls[0][0].maxTokens).toBe(5000);
  });

  it("passes through maxTokens when below the 5000 cap", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify(VALID_ARTICLE),
      tokensUsed: 2_500,
      costUsd: 0.025,
      provider: "anthropic",
      modelId: "claude-sonnet-4-6",
      inputTokens: 1_500,
      outputTokens: 1_000,
      durationMs: 5_000,
      webSearchUsed: false,
    });
    spawnMock.mockResolvedValueOnce({
      documentId: "doc_art_002",
      slug: "thought-leadership-londons-quiet-edge-ghostwriter",
      created: true,
    });

    await thoughtLeadershipGhostwriterHandler.execute(
      buildContext({ maxTokens: 3_000 }),
    );

    expect(callLLMMock.mock.calls[0][0].maxTokens).toBe(3000);
  });
});

// ─────────────────────────────────────────────
// execute — happy path
// ─────────────────────────────────────────────

describe("G1-107 · execute happy path", () => {
  it("spawns the document with sales-marketing shape", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify(VALID_ARTICLE),
      tokensUsed: 2_400,
      costUsd: 0.036,
      provider: "anthropic",
      modelId: "claude-sonnet-4-6",
      inputTokens: 1_200,
      outputTokens: 1_200,
      durationMs: 5_800,
      webSearchUsed: false,
    });
    spawnMock.mockResolvedValueOnce({
      documentId: "doc_art_001",
      slug: "thought-leadership-londons-quiet-edge-ghostwriter",
      created: true,
    });

    const result = await thoughtLeadershipGhostwriterHandler.execute(
      buildContext(),
    );

    expect(spawnMock).toHaveBeenCalledOnce();
    const spawnArgs = spawnMock.mock.calls[0][0];
    expect(spawnArgs).toMatchObject({
      userProfileId: "user_profile_abc",
      agentRunId: "run_ghostwriter107",
      agentId: "G1-107",
      collectionSlug: "sales-marketing",
      title: "Thought leadership — London's quiet edge in AI safety",
      documentType: "marketing_doc",
      audienceType: "media",
      purposeType: "outreach",
      confidentiality: "internal",
    });
    expect(spawnArgs.body).toContain("Shoreditch");
    expect(spawnArgs.summary).toContain("essay");

    expect(result.outputData).toMatchObject({
      ...VALID_ARTICLE,
      inputSource: "input+profile", // topic is an ext field, elevates profile -> input+profile
      provider: "anthropic",
      documentId: "doc_art_001",
    });
    expect(result.briefing?.severity).toBe("info");
    expect(result.briefing?.title).toContain("London's quiet edge");
  });

  it("does NOT spawn when userProfileId is absent", async () => {
    resolveMock.mockResolvedValueOnce({
      ...RESOLVED_BASE,
      source: "input",
      profileMatched: false,
      ownerClerkUserId: null,
    });
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify(VALID_ARTICLE),
      tokensUsed: 1_500,
      costUsd: 0.02,
      provider: "anthropic",
      modelId: "claude-sonnet-4-6",
      inputTokens: 800,
      outputTokens: 700,
      durationMs: 4_000,
      webSearchUsed: false,
    });

    const result = await thoughtLeadershipGhostwriterHandler.execute(
      buildContext({ input: { topic: "AI safety", companyName: "Aether" } }),
    );

    expect(spawnMock).not.toHaveBeenCalled();
    expect(result.outputData?.documentId).toBeUndefined();
  });

  it("does NOT spawn when articleMarkdown is empty", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify({ ...VALID_ARTICLE, articleMarkdown: "" }),
      tokensUsed: 800,
      costUsd: 0.01,
      provider: "anthropic",
      modelId: "claude-sonnet-4-6",
      inputTokens: 400,
      outputTokens: 400,
      durationMs: 2_500,
      webSearchUsed: false,
    });

    const result = await thoughtLeadershipGhostwriterHandler.execute(
      buildContext(),
    );

    expect(spawnMock).not.toHaveBeenCalled();
    expect(result.outputData?.documentId).toBeUndefined();
  });
});
