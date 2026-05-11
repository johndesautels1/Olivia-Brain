/**
 * G1-110 Podcast Booker — handler contract tests
 *
 * Mirrors G1-105 (matchmaker-style). Locks down:
 *   - Missing-founderBio early exit.
 *   - enableWebSearch=true passed to callLLM.
 *   - Happy path: sales-marketing mirror with podcast title;
 *     redFlags severity rule.
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
  podcastBookerHandler,
  isPodcastBookingPackage,
  parseLlmJson,
} from "../g1-110-podcast-booker";
import type { AgentRunContext } from "../../handlers";

const callLLMMock = callLLM as unknown as ReturnType<typeof vi.fn>;
const spawnMock = spawnDocumentFromAgent as unknown as ReturnType<typeof vi.fn>;
const resolveMock = resolveUserCompany as unknown as ReturnType<typeof vi.fn>;

const VALID_BOOKING = {
  schemaVersion: "1",
  companyName: "Aether Labs",
  founderName: "Dr Mira Patel",
  pitchAngle: "AI safety as the new moat for UK tech",
  desiredFormat: "interview",
  matches: [
    {
      podcast: "Sifted Audio",
      host: "Sifted team",
      audienceSizeSignal: "Large London-tech industry pod",
      recentEpisodeRelevance: "AISI's first year and what it means for UK AI startups.",
      whyMatch: "Aether's AISI engagement is exactly the angle Sifted has been pushing.",
      hooksTailored: [
        "What founders actually learned the day after their AISI audit.",
        "The AI safety stack that lets you sell into Lloyds.",
        "Why the next Index round is going to AI-safety-native companies.",
      ],
      contactHint: "audio@sifted.eu",
      confidence: 0.82,
    },
    {
      podcast: "EUVC",
      host: "Andreas Munk-Madsen",
      audienceSizeSignal: "Niche but high-credibility European VC audience",
      recentEpisodeRelevance: "EUVC has been covering AI-safety capitalisation in EU.",
      whyMatch: "Index-led round at Aether is on-beat for EUVC investor segments.",
      hooksTailored: [
        "Series A in London AI safety: what Index signed off on.",
        "The pre-Series A safety hires that pay back in diligence.",
        "Comparing US a16z safety theses vs UK Index theses.",
      ],
      contactHint: "LinkedIn /in/andreasmm",
      confidence: 0.75,
    },
  ],
  pitchDraftMarkdown:
    "Subject: <<HOOK>>\n\nHi <<HOST>>,\n\nDr Mira Patel here — founder of Aether Labs...",
  subjectLineOptions: [
    "Booking request: AI safety as the new UK moat — Dr Mira Patel",
    "Pitch: Aether Labs founder on AISI-grade differentiation",
    "Interview pitch: post-Series A UK AI safety POV",
  ],
  followUpStrategy:
    "Send pitch. If no reply in 5 business days, follow up once with a fresh hook angle.",
  bookingExpectations:
    "Typical UK tech pods: 2-4 week lead time, 30-45 min run-time, USB mic + quiet room.",
  redFlags: ["The hook leans on 'moat' framing which some hosts find tired."],
  notes: "Top 2 matches verified as actively publishing in the last 90 days.",
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
    agentId: "G1-110",
    agentDbId: "agentdb_7",
    runId: "run_podcastbook110",
    agentName: "Podcast Booker",
    groupCode: "1M",
    groupName: "Media & PR",
    persona: "olivia",
    llmModel: "sonar-pro",
    temperature: 0.3,
    maxTokens: 5_000,
    systemPrompt: null,
    configs: {},
    input: {
      userProfileId: "user_profile_abc",
      founderBio: "Dr Mira Patel, founder of Aether Labs. Ex-DeepMind safety researcher...",
      founderName: "Dr Mira Patel",
      pitchAngle: "AI safety as the new moat for UK tech",
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

describe("G1-110 · module surface", () => {
  it("exports handler with correct agentId", () => {
    expect(podcastBookerHandler.agentId).toBe("G1-110");
  });
});

describe("G1-110 · isPodcastBookingPackage guard", () => {
  it("accepts canonical shape", () => {
    expect(isPodcastBookingPackage(VALID_BOOKING)).toBe(true);
  });

  it("rejects match with missing inner fields", () => {
    expect(
      isPodcastBookingPackage({
        ...VALID_BOOKING,
        matches: [{ ...VALID_BOOKING.matches[0], hooksTailored: undefined }],
      }),
    ).toBe(false);
  });

  it("rejects when confidence is out of range", () => {
    expect(
      isPodcastBookingPackage({
        ...VALID_BOOKING,
        matches: [{ ...VALID_BOOKING.matches[0], confidence: 2 }],
      }),
    ).toBe(false);
  });

  it("rejects schemaVersion mismatch", () => {
    expect(isPodcastBookingPackage({ ...VALID_BOOKING, schemaVersion: "2" })).toBe(false);
  });
});

describe("G1-110 · parseLlmJson", () => {
  it("parses raw JSON", () => {
    expect(parseLlmJson(JSON.stringify(VALID_BOOKING))).not.toBeNull();
  });

  it("parses JSON inside a fence", () => {
    expect(
      parseLlmJson("```json\n" + JSON.stringify(VALID_BOOKING) + "\n```"),
    ).not.toBeNull();
  });

  it("returns null on garbage", () => {
    expect(parseLlmJson("not json")).toBeNull();
  });
});

describe("G1-110 · execute missing-founderBio", () => {
  it("short-circuits with mode=missing_founder_bio and no LLM call", async () => {
    const result = await podcastBookerHandler.execute(
      buildContext({ input: { userProfileId: "user_profile_abc" } }),
    );
    expect(callLLMMock).not.toHaveBeenCalled();
    expect(spawnMock).not.toHaveBeenCalled();
    expect(result.outputData?.mode).toBe("missing_founder_bio");
  });
});

describe("G1-110 · execute web-search opt-in", () => {
  it("passes enableWebSearch=true to callLLM", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify(VALID_BOOKING),
      tokensUsed: 1500,
      costUsd: 0.02,
      provider: "perplexity",
      modelId: "sonar-pro",
      inputTokens: 800,
      outputTokens: 700,
      durationMs: 4500,
      webSearchUsed: true,
    });
    spawnMock.mockResolvedValueOnce({
      documentId: "doc_pod_001",
      slug: "podcast-pitch-aether-labs-podcastbook",
      created: true,
    });
    const result = await podcastBookerHandler.execute(buildContext());
    expect(callLLMMock.mock.calls[0][0].enableWebSearch).toBe(true);
    expect(result.outputData?.webSearchUsed).toBe(true);
  });
});

describe("G1-110 · execute fallback paths", () => {
  it("returns alert on LLM unavailable", async () => {
    callLLMMock.mockResolvedValueOnce(null);
    const result = await podcastBookerHandler.execute(buildContext());
    expect(spawnMock).not.toHaveBeenCalled();
    expect(result.outputData?.mode).toBe("llm_unavailable");
  });

  it("returns narrative weekly on parse fail", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: "free form",
      tokensUsed: 8,
      costUsd: 0.0001,
      provider: "perplexity",
      modelId: "sonar-pro",
      inputTokens: 4,
      outputTokens: 4,
      durationMs: 80,
      webSearchUsed: true,
    });
    const result = await podcastBookerHandler.execute(buildContext());
    expect(spawnMock).not.toHaveBeenCalled();
    expect(result.outputData?.parseFailed).toBe(true);
  });
});

describe("G1-110 · execute happy path", () => {
  it("spawns sales-marketing mirror with redFlags > 0 → warning severity", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify(VALID_BOOKING),
      tokensUsed: 2400,
      costUsd: 0.036,
      provider: "perplexity",
      modelId: "sonar-pro",
      inputTokens: 1200,
      outputTokens: 1200,
      durationMs: 5500,
      webSearchUsed: true,
    });
    spawnMock.mockResolvedValueOnce({
      documentId: "doc_pod_001",
      slug: "podcast-pitch-aether-labs-podcastbook",
      created: true,
    });

    const result = await podcastBookerHandler.execute(buildContext());

    expect(spawnMock).toHaveBeenCalledOnce();
    const spawnArgs = spawnMock.mock.calls[0][0];
    expect(spawnArgs).toMatchObject({
      collectionSlug: "sales-marketing",
      documentType: "marketing_doc",
      audienceType: "media",
      purposeType: "outreach",
    });
    expect(spawnArgs.title).toContain("interview");
    expect(result.briefing?.severity).toBe("warning"); // redFlags > 0
    expect(result.outputData?.webSearchUsed).toBe(true);
  });

  it("flips severity to info when redFlags empty", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify({ ...VALID_BOOKING, redFlags: [] }),
      tokensUsed: 2000,
      costUsd: 0.03,
      provider: "perplexity",
      modelId: "sonar-pro",
      inputTokens: 1000,
      outputTokens: 1000,
      durationMs: 4500,
      webSearchUsed: true,
    });
    spawnMock.mockResolvedValueOnce({
      documentId: "doc_pod_002",
      slug: "podcast-pitch-aether-labs-podcastbook",
      created: true,
    });
    const result = await podcastBookerHandler.execute(buildContext());
    expect(result.briefing?.severity).toBe("info");
  });
});
