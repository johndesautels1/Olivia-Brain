/**
 * `/api/olivia/voice/process` -- route handler contract tests.
 *
 * Coverage:
 *   POST handler
 *     - Auth: no userId         -> 403
 *     - Auth: wrong userId      -> 403
 *     - Validation: missing conversationId -> 400
 *     - Not found: prisma returns null     -> 404
 *     - No transcript: empty fullTranscript -> 400
 *     - Not suitable: isDocumentSuitable false -> 400 with reason
 *     - LLM failure: processDictation success=false -> 500 with error
 *     - Happy path: processDictation success
 *         + persists processed content + processedAt to extractedData
 *         + returns 200 with content + suitability
 *     - generatePresentation=true: returns presentationMarkdown
 *     - Unexpected throw: returns 500 with generic error string
 *
 *   GET handler
 *     - Auth: no userId  -> 403
 *     - Auth: wrong userId -> 403
 *     - Validation: missing conversationId -> 400
 *     - Not found: prisma returns null -> 404
 *     - hasProcessedContent=false when no extractedData
 *     - hasProcessedContent=true when documentContent is present
 *     - Unexpected throw: returns 500 with generic error string
 *
 * Mocks:
 *   - `@/lib/auth/session` getAuthSession         (per-test userId override)
 *   - `@/lib/db/client` default export prisma     (.voiceConversation.findUnique + .update)
 *   - `@/lib/olivia/voice-document`               (processDictation, generatePresentationContent, isDocumentSuitable)
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

// ─── Module mocks (hoisted) ──────────────────────────────────────────────────

vi.mock("@/lib/auth/session", () => ({
  getAuthSession: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  default: {
    voiceConversation: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/olivia/voice-document", () => ({
  processDictation: vi.fn(),
  generatePresentationContent: vi.fn(),
  isDocumentSuitable: vi.fn(),
}));

// ─── Imports under test ──────────────────────────────────────────────────────

import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/db/client";
import {
  generatePresentationContent,
  isDocumentSuitable,
  processDictation,
} from "@/lib/olivia/voice-document";

import { GET, POST } from "../route";

// ─── Typed mock handles ──────────────────────────────────────────────────────

const getAuthSessionMock = getAuthSession as unknown as Mock;
const findUniqueMock = (prisma.voiceConversation
  .findUnique as unknown) as Mock;
const updateMock = (prisma.voiceConversation.update as unknown) as Mock;
const processDictationMock = processDictation as unknown as Mock;
const generatePresentationContentMock = generatePresentationContent as unknown as Mock;
const isDocumentSuitableMock = isDocumentSuitable as unknown as Mock;

// ─── Test lifecycle ──────────────────────────────────────────────────────────

const ORIGINAL_ADMIN_USER_ID = process.env.ADMIN_USER_ID;
const ADMIN_USER = "admin-user-id-fixture";

beforeEach(() => {
  process.env.ADMIN_USER_ID = ADMIN_USER;
  // Default: authenticated admin. Tests that exercise auth-fail
  // paths override via getAuthSessionMock.mockResolvedValueOnce.
  getAuthSessionMock.mockReset();
  getAuthSessionMock.mockResolvedValue({ userId: ADMIN_USER });
  findUniqueMock.mockReset();
  updateMock.mockReset();
  processDictationMock.mockReset();
  generatePresentationContentMock.mockReset();
  isDocumentSuitableMock.mockReset();
  // Suppress route-level console.error noise (tests assert on response
  // shape, not on stdout). Each test can restore via vi.restoreAllMocks
  // if it needs to assert on a log call.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  if (ORIGINAL_ADMIN_USER_ID === undefined) {
    delete process.env.ADMIN_USER_ID;
  } else {
    process.env.ADMIN_USER_ID = ORIGINAL_ADMIN_USER_ID;
  }
  vi.restoreAllMocks();
});

// ─── Fixtures ────────────────────────────────────────────────────────────────

const VALID_DICTATION_CONTENT = {
  title: "Seed pitch",
  summary: "Three pilots signed.",
  fullContent: "# Pitch\n\nDetails.",
  sections: [],
  contentType: "pitch" as const,
  tone: "professional" as const,
  audience: "Seed investors",
  keyPoints: ["Three pilots"],
  actionItems: [],
  mentions: { people: [], companies: [], dates: [], amounts: [] },
  suggestedSlides: [],
  documentTypes: ["pitch-deck"],
};

function makeConversation(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: "conv_1",
    fullTranscript: "A".repeat(600), // long enough for suitability + processing
    conversationType: "dictation",
    durationSeconds: 240,
    status: "completed",
    extractedData: null,
    ...overrides,
  };
}

function postRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/olivia/voice/process", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest;
}

function getRequest(query: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/olivia/voice/process");
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  return new Request(url.toString(), { method: "GET" }) as unknown as
    import("next/server").NextRequest;
}

// ═════════════════════════════════════════════════════════════════════════════
// POST handler
// ═════════════════════════════════════════════════════════════════════════════

describe("POST /api/olivia/voice/process -- auth", () => {
  it("returns 403 when getAuthSession returns no userId", async () => {
    getAuthSessionMock.mockResolvedValueOnce({ userId: null });
    const res = await POST(postRequest({ conversationId: "conv_1" }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/admin/i);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("returns 403 when userId does not match ADMIN_USER_ID", async () => {
    getAuthSessionMock.mockResolvedValueOnce({ userId: "some-other-user" });
    const res = await POST(postRequest({ conversationId: "conv_1" }));
    expect(res.status).toBe(403);
  });

  it("returns 403 when ADMIN_USER_ID env var is unset (defensive)", async () => {
    delete process.env.ADMIN_USER_ID;
    const res = await POST(postRequest({ conversationId: "conv_1" }));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/olivia/voice/process -- validation + lookups", () => {
  it("returns 400 when conversationId is missing from the body", async () => {
    const res = await POST(postRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/conversationId is required/i);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("returns 404 when prisma cannot find the conversation", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    const res = await POST(postRequest({ conversationId: "conv_does_not_exist" }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/not found/i);
  });

  it("returns 400 when the conversation has no fullTranscript", async () => {
    findUniqueMock.mockResolvedValueOnce(makeConversation({ fullTranscript: null }));
    const res = await POST(postRequest({ conversationId: "conv_1" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/no transcript/i);
  });

  it("returns 400 with the suitability reason when isDocumentSuitable returns false", async () => {
    findUniqueMock.mockResolvedValueOnce(makeConversation());
    isDocumentSuitableMock.mockReturnValueOnce({
      suitable: false,
      reason: "Call too short",
    });
    const res = await POST(postRequest({ conversationId: "conv_1" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Not suitable for document generation: Call too short/i);
    expect(processDictationMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/olivia/voice/process -- LLM failure path", () => {
  it("returns 500 with processDictation's error string when success=false", async () => {
    findUniqueMock.mockResolvedValueOnce(makeConversation());
    isDocumentSuitableMock.mockReturnValueOnce({ suitable: true, reason: "ok" });
    processDictationMock.mockResolvedValueOnce({
      success: false,
      error: "ANTHROPIC_API_KEY not configured",
    });
    const res = await POST(postRequest({ conversationId: "conv_1" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("ANTHROPIC_API_KEY not configured");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("returns 500 with a generic fallback when processDictation returns success=true but content is missing", async () => {
    findUniqueMock.mockResolvedValueOnce(makeConversation());
    isDocumentSuitableMock.mockReturnValueOnce({ suitable: true, reason: "ok" });
    processDictationMock.mockResolvedValueOnce({ success: true /* no content */ });
    const res = await POST(postRequest({ conversationId: "conv_1" }));
    expect(res.status).toBe(500);
  });
});

describe("POST /api/olivia/voice/process -- happy path", () => {
  it("returns 200 with content + suitability + persists to extractedData", async () => {
    findUniqueMock.mockResolvedValueOnce(makeConversation({
      extractedData: { somePriorField: "preserved" },
    }));
    isDocumentSuitableMock.mockReturnValueOnce({
      suitable: true,
      reason: "Substantial content available",
    });
    processDictationMock.mockResolvedValueOnce({
      success: true,
      content: VALID_DICTATION_CONTENT,
    });
    updateMock.mockResolvedValueOnce({});

    const res = await POST(postRequest({ conversationId: "conv_1" }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.content.title).toBe("Seed pitch");
    expect(body.suitability.suitable).toBe(true);
    expect(body.presentationMarkdown).toBeUndefined();

    // extractedData merge contract: prior fields preserved + processed
    // content + processedAt timestamp added.
    expect(updateMock).toHaveBeenCalledTimes(1);
    const updateArg = updateMock.mock.calls[0][0];
    expect(updateArg.where).toEqual({ id: "conv_1" });
    expect(updateArg.data.extractedData.somePriorField).toBe("preserved");
    expect(updateArg.data.extractedData.documentContent).toEqual(VALID_DICTATION_CONTENT);
    expect(typeof updateArg.data.extractedData.processedAt).toBe("string");
    // processedAt must be an ISO-8601 timestamp so downstream code can parse it.
    expect(updateArg.data.extractedData.processedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    );
  });

  it("returns 200 with presentationMarkdown when generatePresentation=true", async () => {
    findUniqueMock.mockResolvedValueOnce(makeConversation());
    isDocumentSuitableMock.mockReturnValueOnce({ suitable: true, reason: "ok" });
    processDictationMock.mockResolvedValueOnce({
      success: true,
      content: VALID_DICTATION_CONTENT,
    });
    updateMock.mockResolvedValueOnce({});
    generatePresentationContentMock.mockResolvedValueOnce(
      "# Seed pitch\n\n## Slide 1: Pilots\n\n- A\n- B",
    );

    const res = await POST(
      postRequest({ conversationId: "conv_1", generatePresentation: true }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.presentationMarkdown).toContain("Slide 1: Pilots");
    expect(generatePresentationContentMock).toHaveBeenCalledWith(
      VALID_DICTATION_CONTENT,
    );
  });

  it("seeds extractedData with the processed content when conversation had no prior extractedData", async () => {
    findUniqueMock.mockResolvedValueOnce(makeConversation({ extractedData: null }));
    isDocumentSuitableMock.mockReturnValueOnce({ suitable: true, reason: "ok" });
    processDictationMock.mockResolvedValueOnce({
      success: true,
      content: VALID_DICTATION_CONTENT,
    });
    updateMock.mockResolvedValueOnce({});

    await POST(postRequest({ conversationId: "conv_1" }));

    const updateArg = updateMock.mock.calls[0][0];
    expect(updateArg.data.extractedData.documentContent).toEqual(
      VALID_DICTATION_CONTENT,
    );
    expect(updateArg.data.extractedData.processedAt).toBeDefined();
  });
});

describe("POST /api/olivia/voice/process -- unexpected throw", () => {
  it("returns 500 with a generic error string when prisma.findUnique throws", async () => {
    findUniqueMock.mockRejectedValueOnce(new Error("Connection refused"));
    const res = await POST(postRequest({ conversationId: "conv_1" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    // The handler must NOT leak the raw error message (which may
    // contain credentials, internal hostnames, etc.) -- it returns a
    // generic string and logs the actual error to the server.
    expect(body.error).toBe("Failed to process voice content");
    expect(body.error).not.toContain("Connection refused");
  });

  it("returns 500 when prisma.update throws after a successful processDictation", async () => {
    findUniqueMock.mockResolvedValueOnce(makeConversation());
    isDocumentSuitableMock.mockReturnValueOnce({ suitable: true, reason: "ok" });
    processDictationMock.mockResolvedValueOnce({
      success: true,
      content: VALID_DICTATION_CONTENT,
    });
    updateMock.mockRejectedValueOnce(new Error("DB write failed"));
    const res = await POST(postRequest({ conversationId: "conv_1" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to process voice content");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GET handler
// ═════════════════════════════════════════════════════════════════════════════

describe("GET /api/olivia/voice/process -- auth", () => {
  it("returns 403 when getAuthSession returns no userId", async () => {
    getAuthSessionMock.mockResolvedValueOnce({ userId: null });
    const res = await GET(getRequest({ conversationId: "conv_1" }));
    expect(res.status).toBe(403);
  });

  it("returns 403 when userId does not match ADMIN_USER_ID", async () => {
    getAuthSessionMock.mockResolvedValueOnce({ userId: "some-other-user" });
    const res = await GET(getRequest({ conversationId: "conv_1" }));
    expect(res.status).toBe(403);
  });
});

describe("GET /api/olivia/voice/process -- validation + lookups", () => {
  it("returns 400 when conversationId is missing from the query string", async () => {
    const res = await GET(getRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/conversationId is required/i);
  });

  it("returns 404 when prisma cannot find the conversation", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    const res = await GET(getRequest({ conversationId: "conv_missing" }));
    expect(res.status).toBe(404);
  });
});

describe("GET /api/olivia/voice/process -- read paths", () => {
  it("returns hasProcessedContent=false when no extractedData is present", async () => {
    findUniqueMock.mockResolvedValueOnce(makeConversation({ extractedData: null }));
    isDocumentSuitableMock.mockReturnValueOnce({ suitable: true, reason: "ok" });

    const res = await GET(getRequest({ conversationId: "conv_1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.conversationId).toBe("conv_1");
    expect(body.hasProcessedContent).toBe(false);
    expect(body.content).toBeNull();
    expect(body.processedAt).toBeNull();
    expect(body.suitability.suitable).toBe(true);
  });

  it("returns hasProcessedContent=true with content + processedAt when documentContent is present", async () => {
    const processedAt = "2026-05-25T18:00:00.000Z";
    findUniqueMock.mockResolvedValueOnce(
      makeConversation({
        extractedData: {
          documentContent: VALID_DICTATION_CONTENT,
          processedAt,
        },
      }),
    );
    isDocumentSuitableMock.mockReturnValueOnce({ suitable: true, reason: "ok" });

    const res = await GET(getRequest({ conversationId: "conv_1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.hasProcessedContent).toBe(true);
    expect(body.content.title).toBe("Seed pitch");
    expect(body.processedAt).toBe(processedAt);
  });

  it("returns 500 with a generic error string when prisma.findUnique throws", async () => {
    findUniqueMock.mockRejectedValueOnce(new Error("DB blew up"));
    const res = await GET(getRequest({ conversationId: "conv_1" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to retrieve processed content");
    expect(body.error).not.toContain("DB blew up");
  });
});
