/**
 * G1-076 Pitch Deck London Filter — handler contract tests
 *
 * Mirrors G1-033 / G1-048 structure. Locks down:
 *   1. Pure parsers (isFilteredDeck, parseLlmJson) accept canonical
 *      shape, reject keyChanges entries with the wrong inner shape.
 *   2. Missing-deckText early exit returns alert briefing with
 *      mode="missing_deck_text", no LLM call, no spawn.
 *   3. LLM-unavailable + JSON-parse-failed fallback paths.
 *   4. Happy path with userProfileId triggers pitch-decks mirror
 *      with investor_deck / investor / fundraising shape; severity
 *      tracks redFlags presence.
 *   5. Empty rewrittenDeckMarkdown short-circuits document spawn.
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
  pitchDeckLondonFilterHandler,
  isFilteredDeck,
  parseLlmJson,
} from "../g1-076-pitch-deck-london-filter";
import type { AgentRunContext } from "../../handlers";

const callLLMMock = callLLM as unknown as ReturnType<typeof vi.fn>;
const spawnMock = spawnDocumentFromAgent as unknown as ReturnType<typeof vi.fn>;
const resolveMock = resolveUserCompany as unknown as ReturnType<typeof vi.fn>;

const VALID_FILTERED_DECK = {
  schemaVersion: "1",
  companyName: "Aether Labs",
  targetAudience: "vc",
  targetSection: "all",
  originalDeckSummary:
    "US-centric Series A pitch claiming $10M ARR and TAM-only sizing.",
  rewrittenDeckMarkdown:
    "## Problem\n\nUK enterprises spend ...\n\n## Solution\n\n...\n",
  keyChanges: [
    {
      original: "We're crushing it with $10M ARR",
      rewritten:
        "Meaningful traction: £7.9M ARR with a credible path to category leadership",
      why: "Softened US hyperbole and converted USD to GBP per FX guidance.",
    },
    {
      original: "Backed by Y Combinator alumni",
      rewritten: "Backed by Entrepreneur First and Founders Factory alumni",
      why: "Replaced US accelerator with London equivalents the UK ecosystem recognises.",
    },
  ],
  toneNotes: [
    "softened growth claim",
    "added FCA registration line",
    "removed superlatives",
  ],
  ukSpecificAdditions: [
    "EIS / SEIS eligibility flagged",
    "Patent Box mentioned for IP-heavy product",
    "FCA register reference added",
  ],
  redFlags: [
    "Original deck quotes total US TAM only; UK / EU breakdown required.",
    "No mention of GDPR posture despite handling PII at scale.",
  ],
  recommendedNextSteps: [
    "Add a UK regulator alignment slide.",
    "Replace US-only logo wall with London + EU customers.",
    "Add a single slide showing GDPR posture.",
  ],
  notes: "FX rate applied 1 USD = 0.79 GBP per system guidance.",
};

const RESOLVED_BASE = {
  companyName: "Aether Labs",
  sector: "ai_ml",
  employeeCount: 24,
  headquartersLocation: "Shoreditch, London",
  arr: 7_900_000,
  totalRaised: 12_000_000,
  certifications: ["SOC2"],
  regulatoryBody: "ico",
  customerCount: null,
  source: "profile",
  profileMatched: true,
  ownerClerkUserId: "user_clerk_xyz",
};

function buildContext(overrides?: Partial<AgentRunContext>): AgentRunContext {
  return {
    agentId: "G1-076",
    agentDbId: "agentdb_3",
    runId: "run_pitchdecklondon076",
    agentName: "Pitch Deck London Filter",
    groupCode: "1G",
    groupName: "Storytelling & Pitch",
    persona: "olivia",
    llmModel: "claude-sonnet-4-6",
    temperature: 0.4,
    maxTokens: 6_000,
    systemPrompt: null,
    configs: {},
    input: {
      userProfileId: "user_profile_abc",
      deckText: "Original US-flavoured pitch deck content...",
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

describe("G1-076 · module surface", () => {
  it("exports the handler singleton with the correct agentId", () => {
    expect(pitchDeckLondonFilterHandler.agentId).toBe("G1-076");
    expect(typeof pitchDeckLondonFilterHandler.execute).toBe("function");
  });
});

// ─────────────────────────────────────────────
// isFilteredDeck
// ─────────────────────────────────────────────

describe("G1-076 · isFilteredDeck type guard", () => {
  it("accepts the canonical shape", () => {
    expect(isFilteredDeck(VALID_FILTERED_DECK)).toBe(true);
  });

  it("rejects when keyChanges entries are missing inner fields", () => {
    expect(
      isFilteredDeck({
        ...VALID_FILTERED_DECK,
        keyChanges: [{ original: "x", rewritten: "y" }], // missing `why`
      }),
    ).toBe(false);
  });

  it("rejects when schemaVersion mismatches", () => {
    expect(
      isFilteredDeck({ ...VALID_FILTERED_DECK, schemaVersion: "2" }),
    ).toBe(false);
  });

  it("rejects null + primitives", () => {
    expect(isFilteredDeck(null)).toBe(false);
    expect(isFilteredDeck("string")).toBe(false);
  });
});

// ─────────────────────────────────────────────
// parseLlmJson
// ─────────────────────────────────────────────

describe("G1-076 · parseLlmJson", () => {
  it("parses raw JSON object", () => {
    expect(parseLlmJson(JSON.stringify(VALID_FILTERED_DECK))).not.toBeNull();
  });

  it("parses JSON inside a ```json fence", () => {
    const wrapped =
      "Here you go:\n\n```json\n" + JSON.stringify(VALID_FILTERED_DECK) + "\n```";
    expect(parseLlmJson(wrapped)).not.toBeNull();
  });

  it("returns null on garbage", () => {
    expect(parseLlmJson("not json")).toBeNull();
  });
});

// ─────────────────────────────────────────────
// execute — missing deckText
// ─────────────────────────────────────────────

describe("G1-076 · execute missing-deckText path", () => {
  it("short-circuits with mode=missing_deck_text and no LLM call", async () => {
    const result = await pitchDeckLondonFilterHandler.execute(
      buildContext({
        input: { userProfileId: "user_profile_abc" }, // no deckText
      }),
    );

    expect(callLLMMock).not.toHaveBeenCalled();
    expect(spawnMock).not.toHaveBeenCalled();
    expect(result.outputData?.mode).toBe("missing_deck_text");
    expect(result.briefing?.type).toBe("alert");
    expect(result.briefing?.severity).toBe("info");
    expect(result.costUsd).toBe(0);
  });
});

// ─────────────────────────────────────────────
// execute — LLM unavailable / parse fail
// ─────────────────────────────────────────────

describe("G1-076 · execute LLM-unavailable path", () => {
  it("returns alert briefing without document spawn", async () => {
    callLLMMock.mockResolvedValueOnce(null);
    const result = await pitchDeckLondonFilterHandler.execute(buildContext());
    expect(spawnMock).not.toHaveBeenCalled();
    expect(result.outputData?.mode).toBe("llm_unavailable");
    expect(result.briefing?.severity).toBe("warning");
  });
});

describe("G1-076 · execute JSON-parse-failed path", () => {
  it("returns narrative weekly briefing with parseFailed=true", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: "Sorry, free-form only.",
      tokensUsed: 8,
      costUsd: 0.0001,
      provider: "openai",
      modelId: "gpt-4o",
      inputTokens: 4,
      outputTokens: 4,
      durationMs: 80,
      webSearchUsed: false,
    });
    const result = await pitchDeckLondonFilterHandler.execute(buildContext());
    expect(spawnMock).not.toHaveBeenCalled();
    expect(result.outputData?.parseFailed).toBe(true);
    expect(result.briefing?.type).toBe("weekly");
  });
});

// ─────────────────────────────────────────────
// execute — happy path
// ─────────────────────────────────────────────

describe("G1-076 · execute happy path", () => {
  it("spawns the document with pitch-decks shape and warning severity (redFlags > 0)", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify(VALID_FILTERED_DECK),
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
      documentId: "doc_deck_001",
      slug: "pitch-deck-uk-filtered-aether-labs-pitchdeck",
      created: true,
    });

    const result = await pitchDeckLondonFilterHandler.execute(buildContext());

    expect(spawnMock).toHaveBeenCalledOnce();
    const spawnArgs = spawnMock.mock.calls[0][0];
    expect(spawnArgs).toMatchObject({
      userProfileId: "user_profile_abc",
      agentRunId: "run_pitchdecklondon076",
      agentId: "G1-076",
      collectionSlug: "pitch-decks",
      title: "Pitch Deck (UK-filtered) — Aether Labs",
      documentType: "investor_deck",
      audienceType: "investor",
      purposeType: "fundraising",
      confidentiality: "internal",
    });
    expect(spawnArgs.body).toContain("Problem");
    expect(spawnArgs.summary).toContain("full deck");

    expect(result.outputData).toMatchObject({
      ...VALID_FILTERED_DECK,
      // deckText is a G076 ext field, so profile → input+profile elevation.
      inputSource: "input+profile",
      provider: "anthropic",
      documentId: "doc_deck_001",
    });
    expect(result.briefing?.severity).toBe("warning"); // redFlags.length > 0
    expect(result.learnings?.[0]?.title).toContain("Pitch UK-fit");
  });

  it("flips severity to info when redFlags is empty", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify({ ...VALID_FILTERED_DECK, redFlags: [] }),
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
      documentId: "doc_deck_002",
      slug: "pitch-deck-uk-filtered-aether-labs-pitchdeck",
      created: true,
    });
    const result = await pitchDeckLondonFilterHandler.execute(buildContext());
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
      text: JSON.stringify(VALID_FILTERED_DECK),
      tokensUsed: 1_500,
      costUsd: 0.02,
      provider: "anthropic",
      modelId: "claude-sonnet-4-6",
      inputTokens: 800,
      outputTokens: 700,
      durationMs: 4_000,
      webSearchUsed: false,
    });

    const result = await pitchDeckLondonFilterHandler.execute(
      buildContext({
        input: {
          companyName: "Aether Labs",
          deckText: "deck content",
        },
      }),
    );

    expect(spawnMock).not.toHaveBeenCalled();
    expect(result.outputData?.documentId).toBeUndefined();
    expect(result.outputData?.inputSource).toBe("input");
  });

  it("does NOT spawn when rewrittenDeckMarkdown is empty", async () => {
    callLLMMock.mockResolvedValueOnce({
      text: JSON.stringify({
        ...VALID_FILTERED_DECK,
        rewrittenDeckMarkdown: "",
      }),
      tokensUsed: 800,
      costUsd: 0.01,
      provider: "anthropic",
      modelId: "claude-sonnet-4-6",
      inputTokens: 400,
      outputTokens: 400,
      durationMs: 2_500,
      webSearchUsed: false,
    });

    const result = await pitchDeckLondonFilterHandler.execute(buildContext());

    expect(spawnMock).not.toHaveBeenCalled();
    expect(result.outputData?.documentId).toBeUndefined();
  });
});
