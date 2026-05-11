/**
 * G1-105 Journalist Matchmaker — handler contract tests
 *
 * Mirrors G1-076 structure (announcementText-required early exit
 * + sales-marketing mirror + redFlags severity). Adds one new
 * assertion class: callLLM is invoked with `enableWebSearch: true`,
 * since journalist beats shift weekly and the search-grounded path
 * is what keeps the matches honest. First ported handler that
 * exercises the search opt-in.
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
  journalistMatchmakerHandler,
  isPitchPackage,
  parseLlmJson,
} from "../g1-105-journalist-matchmaker";
import type { AgentRunContext } from "../../handlers";

const callLLMMock = callLLM as unknown as ReturnType<typeof vi.fn>;
const spawnMock = spawnDocumentFromAgent as unknown as ReturnType<typeof vi.fn>;
const resolveMock = resolveUserCompany as unknown as ReturnType<typeof vi.fn>;

const VALID_PITCH = {
  schemaVersion: "1",
  companyName: "Aether Labs",
  announcementSummary:
    "Aether Labs closes £4.5M Series A led by Index, joining the cohort of London AI safety startups raising on a UK regulator narrative.",
  announcementType: "funding_round",
  matches: [
    {
      journalist: "Eleanor Quinn",
      outlet: "Sifted",
      beat: "London AI startups",
      recentRelevantStories: [
        "Sifted, 2026-04-12: How AISI is reshaping who gets funded",
      ],
      whyMatch:
        "Eleanor has been tracking AISI-eligibility funding rounds; Aether fits the beat squarely.",
      contactHint: "press@sifted.eu or LinkedIn /in/eleanorquinn-sifted",
      confidence: 0.85,
    },
    {
      journalist: "Tom Rutter",
      outlet: "FT Tech",
      beat: "AI policy + venture",
      recentRelevantStories: [
        "FT Alphaville, 2026-04-22: AISI vs the open-source frontier",
      ],
      whyMatch:
        "Tom is paying attention to UK AI safety capitalisation; Series A from Index is on-beat.",
      contactHint: "tom.rutter@ft.com",
      confidence: 0.78,
    },
  ],
  pitchDraftMarkdown:
    "Subject: Aether Labs closes £4.5M Series A with Index — UK AI safety angle\n\nHi [Journalist],\n\n...",
  subjectLineOptions: [
    "Aether Labs raises £4.5M Series A with Index — UK AI safety angle",
    "Index leads Aether Labs' £4.5M Series A in London AI safety",
    "London AI safety: Aether Labs closes £4.5M with Index",
  ],
  followUpStrategy:
    "Send pitch 48h before the press release embargo. Follow up 24h after if no reply, then again 1 week post-launch.",
  redFlags: [
    "Round size is small for a 'Series A' frame; some journalists may push back.",
  ],
  embargoNote:
    "Embargo 2026-05-20 06:00 BST. Pitch up to 72h before; do not break embargo.",
  notes:
    "Top 2 matches verified via recent bylines. Watch for journalist desk-changes — re-verify before sending.",
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
    agentId: "G1-105",
    agentDbId: "agentdb_5",
    runId: "run_journomatch105",
    agentName: "Journalist Matchmaker",
    groupCode: "1K",
    groupName: "Media & PR",
    persona: "olivia",
    llmModel: "sonar-pro",
    temperature: 0.3,
    maxTokens: 5_000,
    systemPrompt: null,
    configs: {},
    input: {
      userProfileId: "user_profile_abc",
      announcementText:
        "Aether Labs has closed a £4.5M Series A led by Index Ventures, joining the cohort of London AI safety startups...",
      announcementType: "funding_round",
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

describe("G1-105 · module surface", () => {
  it("exports the handler singleton with the correct agentId", () => {
    expect(journalistMatchmakerHandler.agentId).toBe("G1-105");
    expect(typeof journalistMatchmakerHandler.execute).toBe("function");
  });
});

// ─────────────────────────────────────────────
// isPitchPackage
// ─────────────────────────────────────────────

describe("G1-105 · isPitchPackage type guard", () => {
  it("accepts the canonical shape", () => {
    expect(isPitchPackage(VALID_PITCH)).toBe(true);
  });

  it("rejects when a match entry is missing required inner fields", () => {
    expect(
      isPitchPackage({
        ...VALID_PITCH,
        matches: [{ ...VALID_PITCH.matches[0], confidence: undefined }],
      }),
    ).toBe(false);
  });

  it("rejects when a match confidence is out of [0, 1]", () => {
    expect(
      isPitchPackage({
        ...VALID_PITCH,
        matches: [{ ...VALID_PITCH.matches[0], confidence: 1.5 }],
      }),
    ).toBe(false);
  });

  it("rejects when schemaVersion mismatches", () => {
    expect(isPitchPackage({ ...VALID_PITCH, schemaVersion: "2" })).toBe(false);
  });
});

// ─────────────────────────────────────────────
// parseLlmJson
// ─────────────────────────────────────────────

describe("G1-105 · parseLlmJson", () => {
  it("parses raw JSON", () => {
    expect(parseLlmJson(JSON.stringify(VALID_PITCH))).not.toBeNull();
  });

  it("parses JSON inside a ```json fence", () => {
    expect(
      parseLlmJson("```json\n" + JSON.stringify(VALID_PITCH) + "\n```"),
    ).not.toBeNull();
  });

  it("returns null on garbage", () => {
    expect(parseLlmJson("plain text")).toBeNull();
  });
});

// ─────────────────────────────────────────────
// execute — missing announcementText
// ─────────────────────────────────────────────

describe("G1-105 · execute missing-announcementText path", () => {
  it("short-circuits with mode=missing_announcement_text and no LLM call", async () => {
    const result = await journalistMatchmakerHandler.execute(
      buildContext({
        input: { userProfileId: "user_profile_abc" },
      }),
    );

    expect(callLLMMock).not.toHaveBeenCalled();
    expect(spawnMock).not.toHaveBeenCalled();
    expect(result.outputData?.mode).toBe("missing_announcement_text");
    expect(result.briefing?.type).toBe("alert");
    expect(result.costUsd).toBe(0);
  });
});

// ─────────────────────────────────────────────
// execute — search opt-in
// ─────────────────────────────────────────────

describe("G1-105 · execute opts into web search", () => {
  it("passes enableWebSearch=true to callLLM", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify(VALID_PITCH),
      tokensUsed: 1_500,
      costUsd: 0.02,
      provider: "perplexity",
      modelId: "sonar-pro",
      inputTokens: 800,
      outputTokens: 700,
      durationMs: 4_500,
      webSearchUsed: true,
    });
    spawnMock.mockResolvedValueOnce({
      documentId: "doc_pitch_001",
      slug: "journalist-pitch-aether-labs-journomatch",
      created: true,
    });

    const result = await journalistMatchmakerHandler.execute(buildContext());

    const llmArgs = callLLMMock.mock.calls[0][0];
    expect(llmArgs.enableWebSearch).toBe(true);
    expect(result.outputData?.webSearchUsed).toBe(true);
  });
});

// ─────────────────────────────────────────────
// execute — LLM unavailable / parse fail
// ─────────────────────────────────────────────

describe("G1-105 · execute LLM-unavailable path", () => {
  it("returns alert briefing without document spawn", async () => {
    callLLMMock.mockResolvedValueOnce(null);
    const result = await journalistMatchmakerHandler.execute(buildContext());
    expect(spawnMock).not.toHaveBeenCalled();
    expect(result.outputData?.mode).toBe("llm_unavailable");
    expect(result.briefing?.severity).toBe("warning");
  });
});

describe("G1-105 · execute JSON-parse-failed path", () => {
  it("returns narrative weekly briefing with parseFailed=true", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: "free-form prose",
      tokensUsed: 8,
      costUsd: 0.0001,
      provider: "perplexity",
      modelId: "sonar-pro",
      inputTokens: 4,
      outputTokens: 4,
      durationMs: 80,
      webSearchUsed: true,
    });
    const result = await journalistMatchmakerHandler.execute(buildContext());
    expect(spawnMock).not.toHaveBeenCalled();
    expect(result.outputData?.parseFailed).toBe(true);
  });
});

// ─────────────────────────────────────────────
// execute — happy path
// ─────────────────────────────────────────────

describe("G1-105 · execute happy path", () => {
  it("spawns the document with sales-marketing shape and warning severity (redFlags > 0)", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify(VALID_PITCH),
      tokensUsed: 2_200,
      costUsd: 0.033,
      provider: "perplexity",
      modelId: "sonar-pro",
      inputTokens: 1_100,
      outputTokens: 1_100,
      durationMs: 5_400,
      webSearchUsed: true,
    });
    spawnMock.mockResolvedValueOnce({
      documentId: "doc_pitch_001",
      slug: "journalist-pitch-aether-labs-journomatch",
      created: true,
    });

    const result = await journalistMatchmakerHandler.execute(buildContext());

    expect(spawnMock).toHaveBeenCalledOnce();
    const spawnArgs = spawnMock.mock.calls[0][0];
    expect(spawnArgs).toMatchObject({
      userProfileId: "user_profile_abc",
      agentRunId: "run_journomatch105",
      agentId: "G1-105",
      collectionSlug: "sales-marketing",
      documentType: "marketing_doc",
      audienceType: "media",
      purposeType: "outreach",
      confidentiality: "internal",
    });
    expect(spawnArgs.title).toContain("funding round");
    expect(spawnArgs.summary).toContain("journalist matches");

    expect(result.briefing?.severity).toBe("warning"); // redFlags > 0
    expect(result.outputData).toMatchObject({
      ...VALID_PITCH,
      inputSource: "input+profile",
      provider: "perplexity",
      webSearchUsed: true,
      documentId: "doc_pitch_001",
    });
  });

  it("flips severity to info when redFlags is empty", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify({ ...VALID_PITCH, redFlags: [] }),
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
      documentId: "doc_pitch_002",
      slug: "journalist-pitch-aether-labs-journomatch",
      created: true,
    });
    const result = await journalistMatchmakerHandler.execute(buildContext());
    expect(result.briefing?.severity).toBe("info");
  });

  it("does NOT spawn when userProfileId is absent", async () => {
    resolveMock.mockResolvedValueOnce({
      ...RESOLVED_BASE,
      source: "input",
      profileMatched: false,
      ownerClerkUserId: null,
    });
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify(VALID_PITCH),
      tokensUsed: 1_500,
      costUsd: 0.02,
      provider: "perplexity",
      modelId: "sonar-pro",
      inputTokens: 800,
      outputTokens: 700,
      durationMs: 4_000,
      webSearchUsed: true,
    });

    const result = await journalistMatchmakerHandler.execute(
      buildContext({
        input: {
          companyName: "Aether Labs",
          announcementText:
            "Aether Labs has closed a £4.5M Series A led by Index Ventures...",
          announcementType: "funding_round",
        },
      }),
    );

    expect(spawnMock).not.toHaveBeenCalled();
    expect(result.outputData?.documentId).toBeUndefined();
  });
});
