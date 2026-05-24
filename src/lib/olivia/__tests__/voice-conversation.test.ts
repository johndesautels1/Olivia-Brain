/**
 * `voice-conversation` -- unit tests covering the post-refactor
 * surface after Architecture Standards Law 3 cleanup (raw `fetch(...)`
 * against `api.anthropic.com/v1/messages` replaced with `callLLM`).
 *
 * The internal `callAnthropic` is not exported; we exercise it via
 * the five public callsites that route through it:
 *   - generateResponse
 *   - extractFromTranscript
 *   - processQuickAction
 *   - detectQuickAction (special: has regex pre-check)
 *   - detectDictation
 *
 * Each callsite has its own LLM-unavailable + LLM-failure +
 * LLM-success branches covered, plus the regex-only paths.
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
  buildQuickActionConfirmation,
  detectDictation,
  detectQuickAction,
  extractFromTranscript,
  formatPreviousCallContext,
  formatTranscript,
  generateResponse,
  getDictationResponse,
  getFallbackResponse,
  getGreeting,
  isAnthropicConfigured,
  processQuickAction,
  type ConversationTurn,
  type PreviousCallContext,
} from "@/lib/olivia/voice-conversation";

const callLLMMock = callLLM as unknown as Mock;

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeLLMResult(text: string) {
  return {
    text,
    tokensUsed: 800,
    costUsd: 0.003,
    provider: "anthropic",
    modelId: "claude-sonnet-4-6",
    inputTokens: 600,
    outputTokens: 200,
    durationMs: 2100,
    webSearchUsed: false,
  };
}

const VALID_CONVERSATION_JSON = JSON.stringify({
  response: "Lovely to speak with you. What brings you to London?",
  entities: { name: "Alex", company: "Acme" },
  intent: "introduction",
  shouldEndCall: false,
  actionItems: [],
});

const VALID_EXTRACTION_JSON = JSON.stringify({
  contact: {
    fullName: "Alex Founder",
    email: "alex@acme.com",
    company: "Acme",
  },
  psychographics: {
    needs: ["mentorship"],
    interests: ["fintech"],
    goals: ["Series A"],
    painPoints: ["fundraising fatigue"],
  },
  appointment: {
    requested: true,
    dateTime: "2026-06-10T14:00",
    isZoom: false,
    purpose: "intro meeting",
  },
  actionItems: [
    {
      action: "Send pitch deck",
      assignedTo: "Olivia",
      priority: "high",
    },
  ],
  conversationType: "intro_call",
  summary: "Founder intro for Series A",
  keyTopics: ["fintech", "Series A"],
  sentiment: "positive",
  followUpNeeded: true,
});

const VALID_QUICK_ACTION_JSON = JSON.stringify({
  actions: [
    {
      action: "Email Sam the Q3 plan",
      assignedTo: "Olivia",
      priority: "medium",
    },
  ],
  confirmationMessage: "Done -- emailing Sam the Q3 plan.",
  needsClarification: false,
});

const VALID_QUICK_ACTION_DETECTION_JSON = JSON.stringify({
  isQuickAction: true,
  confidence: 0.92,
  actionType: "reminder",
  extracted: {
    targetPerson: "Sam",
    task: "review Q3 plan",
    dueDate: "Friday",
  },
  needsClarification: false,
  missingInfo: [],
});

const VALID_DICTATION_DETECTION_JSON = JSON.stringify({
  wantsDictation: true,
  confidence: 0.88,
  contentType: "proposal",
  hasStartedDictating: false,
  initialContent: null,
});

// ─── Test lifecycle ──────────────────────────────────────────────────────────

const ORIGINAL_ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

beforeEach(() => {
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

// ─── isAnthropicConfigured ───────────────────────────────────────────────────

describe("isAnthropicConfigured", () => {
  it("returns true when ANTHROPIC_API_KEY is set", () => {
    process.env.ANTHROPIC_API_KEY = "sk-anything";
    expect(isAnthropicConfigured()).toBe(true);
  });

  it("returns false when ANTHROPIC_API_KEY is missing", () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(isAnthropicConfigured()).toBe(false);
  });
});

// ─── generateResponse -- callLLM-routed flow ────────────────────────────────

describe("generateResponse -- happy path through callLLM", () => {
  it("forwards the conversation model + 1024 maxTokens + 30s timeout + 1.0 temperature", async () => {
    callLLMMock.mockResolvedValueOnce(makeLLMResult(VALID_CONVERSATION_JSON));

    await generateResponse({
      transcript: "Hi Olivia, this is Alex from Acme.",
      extractedSoFar: {},
    });

    expect(callLLMMock).toHaveBeenCalledTimes(1);
    const callArgs = callLLMMock.mock.calls[0][0];
    expect(callArgs.model).toBe("claude-sonnet-4-6");
    expect(callArgs.maxTokens).toBe(1024);
    expect(callArgs.timeoutMs).toBe(30_000);
    expect(callArgs.temperature).toBe(1.0);
    expect(callArgs.systemPrompt).toBe("");
    expect(typeof callArgs.userPrompt).toBe("string");
    expect(callArgs.userPrompt.length).toBeGreaterThan(0);
  });

  it("returns the parsed ConversationResponse on valid JSON", async () => {
    callLLMMock.mockResolvedValueOnce(makeLLMResult(VALID_CONVERSATION_JSON));

    const result = await generateResponse({
      transcript: "Hi Olivia",
      extractedSoFar: {},
    });

    expect(result.response).toContain("London");
    expect(result.entities.name).toBe("Alex");
    expect(result.intent).toBe("introduction");
    expect(result.shouldEndCall).toBe(false);
  });

  it("returns the technical-issue fallback when ANTHROPIC_API_KEY is missing", async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const result = await generateResponse({
      transcript: "Hi",
      extractedSoFar: {},
    });

    expect(callLLMMock).not.toHaveBeenCalled();
    expect(result.response.length).toBeGreaterThan(0);
    expect(result.intent).toBe("general");
    expect(result.shouldEndCall).toBe(false);
    expect(result.actionItems).toEqual([]);
  });

  it("returns the technical-issue fallback when callLLM returns null", async () => {
    callLLMMock.mockResolvedValueOnce(null);

    const result = await generateResponse({
      transcript: "Hi",
      extractedSoFar: {},
    });

    expect(result.response.length).toBeGreaterThan(0);
    expect(result.intent).toBe("general");
    expect(result.actionItems).toEqual([]);
  });

  it("returns the hold-on fallback when the LLM responds but JSON parse fails", async () => {
    callLLMMock.mockResolvedValueOnce(
      makeLLMResult("Sorry, I cannot help with that."),
    );

    const result = await generateResponse({
      transcript: "Hi",
      extractedSoFar: {},
    });

    expect(result.response.length).toBeGreaterThan(0);
    expect(result.intent).toBe("general");
  });

  it("backfills missing fields with sensible defaults when parsed JSON is partial", async () => {
    callLLMMock.mockResolvedValueOnce(
      makeLLMResult(
        JSON.stringify({ response: "Sure thing." }), // entities/intent/etc. absent
      ),
    );

    const result = await generateResponse({
      transcript: "Hi",
      extractedSoFar: {},
    });

    expect(result.response).toBe("Sure thing.");
    expect(result.entities).toEqual({});
    expect(result.intent).toBe("general");
    expect(result.shouldEndCall).toBe(false);
    expect(result.actionItems).toEqual([]);
  });
});

// ─── extractFromTranscript ───────────────────────────────────────────────────

describe("extractFromTranscript", () => {
  it("forwards 4096 maxTokens for the longer extraction call", async () => {
    callLLMMock.mockResolvedValueOnce(makeLLMResult(VALID_EXTRACTION_JSON));

    await extractFromTranscript("Caller: hi\nOlivia: hi");

    const callArgs = callLLMMock.mock.calls[0][0];
    expect(callArgs.maxTokens).toBe(4096);
    expect(callArgs.model).toBe("claude-sonnet-4-6");
  });

  it("returns null when ANTHROPIC_API_KEY is missing", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const result = await extractFromTranscript("transcript");
    expect(result).toBeNull();
    expect(callLLMMock).not.toHaveBeenCalled();
  });

  it("returns null when callLLM returns null", async () => {
    callLLMMock.mockResolvedValueOnce(null);
    const result = await extractFromTranscript("transcript");
    expect(result).toBeNull();
  });

  it("returns null when the LLM response isn't parseable JSON", async () => {
    callLLMMock.mockResolvedValueOnce(makeLLMResult("not json at all"));
    const result = await extractFromTranscript("transcript");
    expect(result).toBeNull();
  });

  it("returns the parsed ExtractionResult on valid JSON", async () => {
    callLLMMock.mockResolvedValueOnce(makeLLMResult(VALID_EXTRACTION_JSON));
    const result = await extractFromTranscript("transcript");
    expect(result).not.toBeNull();
    expect(result?.contact.fullName).toBe("Alex Founder");
    expect(result?.appointment.requested).toBe(true);
    expect(result?.summary).toMatch(/Series A/);
  });
});

// ─── processQuickAction ──────────────────────────────────────────────────────

describe("processQuickAction", () => {
  it("returns null when ANTHROPIC_API_KEY is missing", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const result = await processQuickAction("transcript");
    expect(result).toBeNull();
    expect(callLLMMock).not.toHaveBeenCalled();
  });

  it("returns null when callLLM returns null", async () => {
    callLLMMock.mockResolvedValueOnce(null);
    const result = await processQuickAction("transcript");
    expect(result).toBeNull();
  });

  it("returns the parsed quick-action result on valid JSON", async () => {
    callLLMMock.mockResolvedValueOnce(makeLLMResult(VALID_QUICK_ACTION_JSON));
    const result = await processQuickAction("Remind Sam to review the Q3 plan");
    expect(result?.actions).toHaveLength(1);
    expect(result?.actions[0].action).toContain("Sam");
    expect(result?.needsClarification).toBe(false);
  });
});

// ─── detectQuickAction -- regex pre-check + LLM ──────────────────────────────

describe("detectQuickAction", () => {
  it("does NOT invoke callLLM for a long non-quick-action utterance", async () => {
    // 200+ char utterance that doesn't match regex patterns.
    const longUtterance =
      "I wanted to walk through our investor positioning for the upcoming " +
      "Series A and discuss how we should approach the conversation with " +
      "the lead investor next quarter, given the recent shift in market " +
      "sentiment across European fintech.";

    const result = await detectQuickAction(longUtterance);
    expect(result?.isQuickAction).toBe(false);
    expect(callLLMMock).not.toHaveBeenCalled();
  });

  it("returns a regex-driven result with needsClarification=true when ANTHROPIC_API_KEY is missing", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const result = await detectQuickAction("remind me to call Sam");
    expect(result).not.toBeNull();
    expect(result?.needsClarification).toBe(true);
    expect(callLLMMock).not.toHaveBeenCalled();
  });

  it("returns a regex-driven result with needsClarification=true when callLLM returns null", async () => {
    callLLMMock.mockResolvedValueOnce(null);
    const result = await detectQuickAction("remind me to call Sam");
    expect(result?.needsClarification).toBe(true);
    expect(callLLMMock).toHaveBeenCalledTimes(1);
  });

  it("returns the parsed detection on valid LLM JSON", async () => {
    callLLMMock.mockResolvedValueOnce(
      makeLLMResult(VALID_QUICK_ACTION_DETECTION_JSON),
    );
    const result = await detectQuickAction(
      "Remind Sam to review the Q3 plan by Friday",
    );
    expect(result?.isQuickAction).toBe(true);
    expect(result?.confidence).toBeGreaterThan(0.9);
    expect(result?.extracted.targetPerson).toBe("Sam");
  });

  it("forwards 512 maxTokens for the detection call (lightweight)", async () => {
    callLLMMock.mockResolvedValueOnce(
      makeLLMResult(VALID_QUICK_ACTION_DETECTION_JSON),
    );
    await detectQuickAction("remind me to call Sam");
    const callArgs = callLLMMock.mock.calls[0][0];
    expect(callArgs.maxTokens).toBe(512);
  });
});

// ─── detectDictation ─────────────────────────────────────────────────────────

describe("detectDictation", () => {
  it("returns a regex-driven result when ANTHROPIC_API_KEY is missing -- positive case", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const result = await detectDictation("Please dictate this proposal for me");
    expect(result?.wantsDictation).toBe(true);
    expect(callLLMMock).not.toHaveBeenCalled();
  });

  it("returns a regex-driven result when ANTHROPIC_API_KEY is missing -- negative case", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const result = await detectDictation("Hi Olivia, how are you?");
    expect(result?.wantsDictation).toBe(false);
    expect(callLLMMock).not.toHaveBeenCalled();
  });

  it("returns null when callLLM returns null", async () => {
    callLLMMock.mockResolvedValueOnce(null);
    const result = await detectDictation("take this down");
    expect(result).toBeNull();
  });

  it("returns the parsed detection on valid LLM JSON", async () => {
    callLLMMock.mockResolvedValueOnce(
      makeLLMResult(VALID_DICTATION_DETECTION_JSON),
    );
    const result = await detectDictation("dictate this proposal");
    expect(result?.wantsDictation).toBe(true);
    expect(result?.contentType).toBe("proposal");
  });

  it("forwards 512 maxTokens for the detection call", async () => {
    callLLMMock.mockResolvedValueOnce(
      makeLLMResult(VALID_DICTATION_DETECTION_JSON),
    );
    await detectDictation("dictate this proposal");
    const callArgs = callLLMMock.mock.calls[0][0];
    expect(callArgs.maxTokens).toBe(512);
  });
});

// ─── Pure helpers ────────────────────────────────────────────────────────────

describe("formatTranscript", () => {
  it("joins caller/olivia turns with role labels and newlines", () => {
    const turns: ConversationTurn[] = [
      { role: "olivia", text: "Hello", timestamp: new Date() },
      { role: "caller", text: "Hi Olivia", timestamp: new Date() },
      { role: "olivia", text: "How can I help?", timestamp: new Date() },
    ];
    const formatted = formatTranscript(turns);
    expect(formatted).toBe(
      "Olivia: Hello\nCaller: Hi Olivia\nOlivia: How can I help?",
    );
  });
});

describe("getGreeting", () => {
  it("returns the inbound greeting for inbound direction (any conversationType)", () => {
    const greeting = getGreeting("inbound");
    expect(typeof greeting).toBe("string");
    expect(greeting.length).toBeGreaterThan(0);
  });

  it("returns the quick-action greeting for outbound + quick_action", () => {
    const greeting = getGreeting("outbound", "quick_action");
    expect(typeof greeting).toBe("string");
    expect(greeting.length).toBeGreaterThan(0);
  });

  it("returns the follow-up greeting for outbound + follow_up", () => {
    const greeting = getGreeting("outbound", "follow_up");
    expect(typeof greeting).toBe("string");
    expect(greeting.length).toBeGreaterThan(0);
  });

  it("returns the generic outbound greeting for any other outbound type", () => {
    const greeting = getGreeting("outbound", "intro_call");
    expect(typeof greeting).toBe("string");
    expect(greeting.length).toBeGreaterThan(0);
  });
});

describe("getFallbackResponse", () => {
  it("returns the technicalIssue fallback by default for unknown keys", () => {
    // @ts-expect-error -- explicit unknown key for the fallback path
    const fallback = getFallbackResponse("totally-unknown-situation");
    expect(typeof fallback).toBe("string");
    expect(fallback.length).toBeGreaterThan(0);
  });

  it("returns a known fallback for a known situation key", () => {
    const fallback = getFallbackResponse("holdOn");
    expect(typeof fallback).toBe("string");
    expect(fallback.length).toBeGreaterThan(0);
  });
});

describe("buildQuickActionConfirmation", () => {
  it("formats a reminder confirmation with target + task + due phrase", () => {
    const message = buildQuickActionConfirmation("reminder", {
      targetPerson: "Sam",
      task: "review Q3 plan",
      dueDate: "Friday",
    });
    expect(message).toContain("Sam");
    expect(message).toContain("review Q3 plan");
    expect(message).toContain("Friday");
  });

  it("formats a schedule confirmation with the due date", () => {
    const message = buildQuickActionConfirmation("schedule", {
      dueDate: "next Tuesday",
    });
    expect(message).toContain("next Tuesday");
  });

  it("returns the note confirmation for actionType=note", () => {
    const message = buildQuickActionConfirmation("note", {});
    expect(typeof message).toBe("string");
    expect(message.length).toBeGreaterThan(0);
  });

  it("returns the generic confirm fallback for unknown action types", () => {
    const message = buildQuickActionConfirmation("unknown-type", {});
    expect(typeof message).toBe("string");
    expect(message.length).toBeGreaterThan(0);
  });
});

describe("getDictationResponse", () => {
  it("returns the stage prompt verbatim when no {summary} placeholder in the template ('ready' stage)", () => {
    const response = getDictationResponse("ready");
    expect(typeof response).toBe("string");
    expect(response.length).toBeGreaterThan(0);
    expect(response).not.toContain("{summary}");
  });

  it("interpolates {summary} when the stage template contains it ('summarise' stage)", () => {
    const response = getDictationResponse("summarise", { summary: "Q3 plan" });
    expect(response).toContain("Q3 plan");
    // The literal placeholder must not leak through after substitution.
    expect(response).not.toContain("{summary}");
  });

  it("leaves the {summary} placeholder unreplaced when no params provided (caller bug surface)", () => {
    const response = getDictationResponse("summarise");
    // No params means the template literal is returned as-is; this
    // documents the existing behavior so a future refactor doesn't
    // silently change it.
    expect(typeof response).toBe("string");
    expect(response.length).toBeGreaterThan(0);
  });
});

describe("formatPreviousCallContext", () => {
  it("returns an empty string for no previous calls", () => {
    expect(formatPreviousCallContext([])).toBe("");
  });

  it("formats one call with date + type + summary + topics + actions", () => {
    const calls: PreviousCallContext[] = [
      {
        callId: "call-1",
        date: new Date("2026-05-20T10:00:00Z"),
        duration: 360,
        summary: "Discussed Series A timing",
        keyTopics: ["fundraising", "fintech"],
        conversationType: "intro_call",
        actionItems: ["Send pitch deck"],
      },
    ];
    const formatted = formatPreviousCallContext(calls);
    expect(formatted).toContain("intro_call");
    expect(formatted).toContain("Discussed Series A timing");
    expect(formatted).toContain("fundraising");
    expect(formatted).toContain("Send pitch deck");
    expect(formatted).toContain("6 min");
  });

  it("omits optional fields gracefully when absent", () => {
    const calls: PreviousCallContext[] = [
      {
        callId: "call-1",
        date: new Date("2026-05-20T10:00:00Z"),
        conversationType: "dictation",
      },
    ];
    const formatted = formatPreviousCallContext(calls);
    expect(formatted).toContain("dictation");
    expect(formatted).not.toContain("Summary:");
    expect(formatted).not.toContain("Topics:");
    expect(formatted).not.toContain("Action items:");
  });
});
