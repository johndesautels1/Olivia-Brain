/**
 * `voice-document` -- unit tests covering the post-refactor surface
 * after Architecture Standards Law 3 cleanup (raw `fetch(...)` against
 * `api.anthropic.com/v1/messages` replaced with `callLLM`).
 *
 * Coverage:
 *   - `processDictation` happy path: callLLM resolves a valid JSON
 *     response, every required field present.
 *   - `processDictation` early returns: transcript-too-short.
 *   - `processDictation` callLLM-null path: ANTHROPIC_API_KEY missing.
 *   - `processDictation` callLLM-null path: wrapper returned null for
 *     any other reason (timeout / non-2xx / empty response).
 *   - `processDictation` JSON-extraction failure: callLLM returns text
 *     that does not contain a parseable JSON object.
 *   - `processDictation` missing-required-field failure: parseable
 *     JSON but lacks title / summary / fullContent.
 *   - Pure helpers (`buildDictationProcessingPrompt`,
 *     `buildPresentationPrompt`, `generatePresentationContent`,
 *     `generateDocumentOutline`, `isDocumentSuitable`) -- shape
 *     assertions so future edits don't silently break the contracts
 *     the calling routes depend on.
 *
 * Held to Apple / IBM / Microsoft / Google 2026 leading coding
 * practices per `~/CLAUDE.md` and
 * `docs/api-specs/_MASTER_REGISTER.md` section 10.4.
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest";

// Mock the callLLM module BEFORE importing the system under test so
// the SUT picks up the mock factory. vi.mock is hoisted.
vi.mock("@/lib/agents/llm", () => ({
  callLLM: vi.fn(),
}));

import { callLLM } from "@/lib/agents/llm";
import {
  buildDictationProcessingPrompt,
  buildPresentationPrompt,
  generateDocumentOutline,
  generatePresentationContent,
  isDocumentSuitable,
  processDictation,
  type DictationContent,
} from "@/lib/olivia/voice-document";

const callLLMMock = callLLM as unknown as Mock;

// ─── Fixtures ────────────────────────────────────────────────────────────────

const LONG_TRANSCRIPT =
  "We're raising a Seed round to build the relocation intelligence platform " +
  "for London tech founders. So far we've signed three pilot customers and " +
  "have a 12-month runway. Our north-star metric is district-match accuracy " +
  "and we're tracking at 87 percent across the 33 London districts.";

const VALID_LLM_JSON = JSON.stringify({
  title: "Seed round narrative",
  summary: "We're raising a Seed to build relocation intelligence.",
  fullContent: "# Seed pitch\n\nThree pilots signed, 12-month runway.",
  sections: [
    {
      name: "Problem",
      content: "London founders lack relocation intelligence.",
      order: 1,
    },
  ],
  contentType: "pitch",
  tone: "professional",
  audience: "Seed investors in London",
  keyPoints: ["Three pilots signed", "12-month runway"],
  actionItems: ["Schedule meetings with target investors"],
  mentions: {
    people: [],
    companies: [],
    dates: [],
    amounts: ["12-month runway", "87 percent"],
  },
  suggestedSlides: [
    {
      title: "The opportunity",
      bulletPoints: ["London tech is the world's most diverse ecosystem"],
      visualSuggestion: "Map of London districts",
    },
  ],
  documentTypes: ["pitch-deck", "executive-summary"],
});

function makeLLMResult(text: string) {
  return {
    text,
    tokensUsed: 1200,
    costUsd: 0.005,
    provider: "anthropic",
    modelId: "claude-sonnet-4-6",
    inputTokens: 800,
    outputTokens: 400,
    durationMs: 4321,
    webSearchUsed: false,
  };
}

// ─── Test lifecycle ──────────────────────────────────────────────────────────

const ORIGINAL_ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

beforeEach(() => {
  // Default-set the API key so the happy-path tests don't have to
  // re-set it; tests that exercise the missing-key branch override
  // explicitly via `delete process.env.ANTHROPIC_API_KEY`.
  process.env.ANTHROPIC_API_KEY = "sk-test-key-only-for-vitest";
  callLLMMock.mockReset();
});

afterEach(() => {
  if (ORIGINAL_ANTHROPIC_KEY === undefined) {
    delete process.env.ANTHROPIC_API_KEY;
  } else {
    process.env.ANTHROPIC_API_KEY = ORIGINAL_ANTHROPIC_KEY;
  }
});

// ─── processDictation -- callLLM-routed flow ─────────────────────────────────

describe("processDictation -- callLLM-routed flow", () => {
  it("returns the parsed DictationContent on a valid LLM JSON response", async () => {
    callLLMMock.mockResolvedValueOnce(makeLLMResult(VALID_LLM_JSON));

    const result = await processDictation(LONG_TRANSCRIPT, "dictation");

    expect(result.success).toBe(true);
    expect(result.content).toBeDefined();
    expect(result.content?.title).toBe("Seed round narrative");
    expect(result.content?.summary).toContain("relocation intelligence");
    expect(result.content?.contentType).toBe("pitch");
    expect(result.content?.suggestedSlides).toHaveLength(1);
  });

  it("forwards the canonical Anthropic model + max_tokens + timeout to callLLM", async () => {
    callLLMMock.mockResolvedValueOnce(makeLLMResult(VALID_LLM_JSON));

    await processDictation(LONG_TRANSCRIPT);

    expect(callLLMMock).toHaveBeenCalledTimes(1);
    const callArgs = callLLMMock.mock.calls[0][0];
    expect(callArgs.model).toBe("claude-sonnet-4-6");
    expect(callArgs.maxTokens).toBe(8192);
    expect(callArgs.timeoutMs).toBe(60_000);
    expect(callArgs.temperature).toBe(1.0);
    // Behavior-preserving: the prior raw fetch sent no system prompt.
    expect(callArgs.systemPrompt).toBe("");
    // The user prompt must contain the actual transcript text so we know
    // the prompt builder ran end-to-end through callLLM (not a stub).
    expect(callArgs.userPrompt).toContain(LONG_TRANSCRIPT);
  });

  it("does NOT enable web search (the wrapper default is off; document extraction never needs it)", async () => {
    callLLMMock.mockResolvedValueOnce(makeLLMResult(VALID_LLM_JSON));

    await processDictation(LONG_TRANSCRIPT);

    const callArgs = callLLMMock.mock.calls[0][0];
    // enableWebSearch is omitted (defaults to off in the wrapper); the
    // assertion accepts both forms because forward-compat with optional
    // truthy flags should not be a behavior-flag-test antipattern.
    expect(callArgs.enableWebSearch ?? false).toBe(false);
  });
});

// ─── processDictation -- early-return paths ─────────────────────────────────

describe("processDictation -- transcript validation", () => {
  it("rejects transcripts shorter than 50 characters without calling callLLM", async () => {
    const result = await processDictation("Too short to process");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/too short/i);
    expect(callLLMMock).not.toHaveBeenCalled();
  });

  it("rejects an empty transcript without calling callLLM", async () => {
    const result = await processDictation("");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/too short/i);
    expect(callLLMMock).not.toHaveBeenCalled();
  });

  it("rejects a whitespace-only transcript without calling callLLM", async () => {
    const result = await processDictation("   \n\t   ");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/too short/i);
    expect(callLLMMock).not.toHaveBeenCalled();
  });
});

// ─── processDictation -- error paths ─────────────────────────────────────────

describe("processDictation -- callLLM failure paths", () => {
  it("returns the specific 'not configured' error when ANTHROPIC_API_KEY is missing (preserved from pre-refactor)", async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const result = await processDictation(LONG_TRANSCRIPT);

    expect(result.success).toBe(false);
    expect(result.error).toBe("ANTHROPIC_API_KEY not configured");
    // The pre-flight check must short-circuit BEFORE the wrapper is
    // invoked -- avoids a confusing double-warning in production logs.
    expect(callLLMMock).not.toHaveBeenCalled();
  });

  it("returns a generic 'LLM call failed' error when callLLM returns null (timeout / non-2xx / empty response)", async () => {
    callLLMMock.mockResolvedValueOnce(null);

    const result = await processDictation(LONG_TRANSCRIPT);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/LLM call failed/i);
    expect(result.error).toMatch(/server logs/i);
  });

  it("returns a parse-failure error when callLLM resolves but the text contains no JSON object", async () => {
    callLLMMock.mockResolvedValueOnce(
      makeLLMResult("Sorry, I cannot help with that request."),
    );

    const result = await processDictation(LONG_TRANSCRIPT);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/parse/i);
  });

  it("returns a missing-field error when the JSON parses but lacks title / summary / fullContent", async () => {
    callLLMMock.mockResolvedValueOnce(
      makeLLMResult(
        JSON.stringify({
          // title intentionally absent
          summary: "Has a summary",
          fullContent: "Has full content",
        }),
      ),
    );

    const result = await processDictation(LONG_TRANSCRIPT);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/missing required fields/i);
  });

  it("strips ```json``` fences around an otherwise-valid JSON response (extractJson tolerance)", async () => {
    const fenced = "```json\n" + VALID_LLM_JSON + "\n```";
    callLLMMock.mockResolvedValueOnce(makeLLMResult(fenced));

    const result = await processDictation(LONG_TRANSCRIPT);

    expect(result.success).toBe(true);
    expect(result.content?.title).toBe("Seed round narrative");
  });
});

// ─── Pure helpers ────────────────────────────────────────────────────────────

describe("buildDictationProcessingPrompt", () => {
  it("embeds the transcript verbatim", () => {
    const prompt = buildDictationProcessingPrompt(LONG_TRANSCRIPT, "dictation");
    expect(prompt).toContain(LONG_TRANSCRIPT);
  });

  it("embeds the conversation type so the model can specialise its extraction", () => {
    const prompt = buildDictationProcessingPrompt(LONG_TRANSCRIPT, "investor-update");
    expect(prompt).toContain("investor-update");
  });

  it("includes the canonical JSON-shape contract the response must match", () => {
    const prompt = buildDictationProcessingPrompt(LONG_TRANSCRIPT, "dictation");
    expect(prompt).toContain("title");
    expect(prompt).toContain("summary");
    expect(prompt).toContain("suggestedSlides");
    expect(prompt).toContain("documentTypes");
  });
});

describe("buildPresentationPrompt", () => {
  it("embeds the title + summary + full content of the dictation", () => {
    const content = makeDictationContent();
    const prompt = buildPresentationPrompt(content);
    expect(prompt).toContain(content.title);
    expect(prompt).toContain(content.summary);
    expect(prompt).toContain(content.fullContent);
  });

  it("enumerates the keyPoints as a numbered list", () => {
    const content = makeDictationContent({
      keyPoints: ["First point", "Second point", "Third point"],
    });
    const prompt = buildPresentationPrompt(content);
    expect(prompt).toContain("1. First point");
    expect(prompt).toContain("2. Second point");
    expect(prompt).toContain("3. Third point");
  });
});

describe("generatePresentationContent", () => {
  it("formats suggestedSlides into a markdown deck with horizontal rules", async () => {
    const content = makeDictationContent({
      suggestedSlides: [
        {
          title: "Slide A",
          bulletPoints: ["A1", "A2"],
          visualSuggestion: "Chart A",
        },
        {
          title: "Slide B",
          bulletPoints: ["B1"],
        },
      ],
    });
    const md = await generatePresentationContent(content);
    expect(md).toContain("# " + content.title);
    expect(md).toContain("## Slide 1: Slide A");
    expect(md).toContain("- A1");
    expect(md).toContain("- A2");
    expect(md).toContain("*Visual: Chart A*");
    expect(md).toContain("---");
    expect(md).toContain("## Slide 2: Slide B");
  });

  it("falls back to sections (sorted by order) when no suggestedSlides exist", async () => {
    const content = makeDictationContent({
      suggestedSlides: [],
      sections: [
        { name: "Second", content: "Second content", order: 2 },
        { name: "First", content: "First content", order: 1 },
      ],
    });
    const md = await generatePresentationContent(content);
    const firstIdx = md.indexOf("First");
    const secondIdx = md.indexOf("Second");
    expect(firstIdx).toBeGreaterThan(-1);
    expect(secondIdx).toBeGreaterThan(firstIdx);
  });

  it("falls back to fullContent when neither slides nor sections exist", async () => {
    const content = makeDictationContent({
      suggestedSlides: [],
      sections: [],
      fullContent: "Just the content body",
    });
    const md = await generatePresentationContent(content);
    expect(md).toContain("Just the content body");
  });
});

describe("generateDocumentOutline", () => {
  it("projects only the outline fields (title, sections, keyPoints, actionItems)", () => {
    const content = makeDictationContent({
      sections: [
        { name: "Intro", content: "Hello", order: 1 },
        { name: "Body", content: "Detail", order: 2 },
      ],
      keyPoints: ["k1", "k2"],
      actionItems: ["a1"],
    });
    const outline = generateDocumentOutline(content);
    expect(outline.title).toBe(content.title);
    expect(outline.sections).toHaveLength(2);
    expect(outline.sections[0]).toEqual({ heading: "Intro", content: "Hello" });
    expect(outline.keyPoints).toEqual(["k1", "k2"]);
    expect(outline.actionItems).toEqual(["a1"]);
  });
});

describe("isDocumentSuitable", () => {
  it("returns suitable for any 'dictation' conversation type", () => {
    expect(isDocumentSuitable("dictation", 0, 0)).toEqual({
      suitable: true,
      reason: "Dictation content",
    });
  });

  it("returns NOT suitable for 'quick_action' regardless of length", () => {
    const result = isDocumentSuitable("quick_action", 600, 5000);
    expect(result.suitable).toBe(false);
    expect(result.reason).toMatch(/quick action/i);
  });

  it("returns NOT suitable when duration is below 60 seconds", () => {
    const result = isDocumentSuitable("general", 30, 5000);
    expect(result.suitable).toBe(false);
    expect(result.reason).toMatch(/too short/i);
  });

  it("returns NOT suitable when transcript is below 200 characters", () => {
    const result = isDocumentSuitable("general", 600, 150);
    expect(result.suitable).toBe(false);
    expect(result.reason).toMatch(/too short/i);
  });

  it("returns suitable for general conversations longer than 500 characters", () => {
    const result = isDocumentSuitable("general", 600, 700);
    expect(result.suitable).toBe(true);
    expect(result.reason).toMatch(/substantial/i);
  });

  it("returns NOT suitable for general conversations between 200 and 500 characters", () => {
    const result = isDocumentSuitable("general", 600, 350);
    expect(result.suitable).toBe(false);
    expect(result.reason).toMatch(/insufficient/i);
  });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeDictationContent(
  overrides: Partial<DictationContent> = {},
): DictationContent {
  return {
    title: "Default title",
    summary: "Default summary",
    fullContent: "Default full content",
    sections: [],
    contentType: "general",
    tone: "professional",
    audience: "Default audience",
    keyPoints: [],
    actionItems: [],
    mentions: { people: [], companies: [], dates: [], amounts: [] },
    suggestedSlides: [],
    documentTypes: [],
    ...overrides,
  };
}
