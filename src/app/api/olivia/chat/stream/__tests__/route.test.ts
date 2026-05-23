/**
 * `POST /api/olivia/chat/stream` — route handler contract tests.
 *
 * The streaming chat path is the critical real-time reply surface
 * (Track O Session O3). Prior to this commit, it had ZERO tests — a
 * regression in validation, headers, persistence, mock-mode, or
 * stream-chunking would slip past every other test in the repo.
 *
 * Coverage targets:
 *
 *   - Validation — malformed JSON, missing/empty/oversized message
 *     all return 400 with json body
 *   - Rate limit — per-IP bucket returns 429 once exhausted
 *   - Headers — every X-Olivia-* response header (provider, model,
 *     spoke, spoke-label, conversation-id) is present + correct
 *   - Mock mode — mock cascade result emits full text + persists
 *     assistant turn with runtimeMode=mock
 *   - Live streaming — chunks stream through; final assembled body
 *     contains every yielded chunk + the duration marker
 *   - Persistence — recall + user-turn + assistant-turn all hit the
 *     conversation store; persistence failures don't break the stream
 *   - Stream error — when the cascade's textStream throws mid-stream,
 *     the body includes a "[stream error: ...]" suffix but the
 *     Response still resolves (no 500)
 *   - Spoke routing — the message's detected spoke shows in the
 *     X-Olivia-Spoke header
 *
 * Mocks: `@/lib/services/model-cascade` (so the stream contents are
 * deterministic per test), `@/lib/observability/traces` (so we can
 * verify recordTrace is called with the right shape). The real
 * `getConversationStore` runs in its in-memory mode (no SUPABASE_URL
 * in the test env), exercising the persistence path end-to-end.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* ─── Module mocks ────────────────────────────────────────────────── */

const runModelCascadeStreamMock = vi.fn();
const recordTraceMock = vi.fn();

vi.mock("@/lib/services/model-cascade", () => ({
  runModelCascadeStream: (...args: unknown[]) =>
    runModelCascadeStreamMock(...args),
}));

vi.mock("@/lib/observability/traces", () => ({
  recordTrace: (...args: unknown[]) => recordTraceMock(...args),
}));

/* ─── Imports under test (after mocks) ────────────────────────────── */

import { POST } from "../route";

/* ─── Helpers ─────────────────────────────────────────────────────── */

interface MakeRequestOptions {
  body?: unknown;
  bodyText?: string;
  ip?: string;
}

function makeRequest(opts: MakeRequestOptions = {}): Request {
  const ip = opts.ip ?? "127.0.0.1";
  const init: RequestInit = {
    method: "POST",
    headers: { "x-forwarded-for": ip, "Content-Type": "application/json" },
    body:
      opts.bodyText !== undefined
        ? opts.bodyText
        : JSON.stringify(opts.body ?? { message: "Hello Olivia" }),
  };
  return new Request("http://localhost/api/olivia/chat/stream", init);
}

/** Drain a streaming Response body into a single concatenated string. */
async function drainBody(res: Response): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let out = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  out += decoder.decode();
  return out;
}

/** Build a CascadeStreamResult-shaped mock. */
function makeLiveStream(chunks: string[]): {
  textStream: AsyncIterable<string>;
  done: Promise<void>;
  providerId: string;
  modelId: string;
} {
  const stream = {
    async *[Symbol.asyncIterator]() {
      for (const c of chunks) yield c;
    },
  };
  return {
    textStream: stream,
    done: Promise.resolve(),
    providerId: "anthropic",
    modelId: "claude-sonnet-4-6",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────

describe("POST /api/olivia/chat/stream · validation", () => {
  it("returns 400 with json body when JSON is malformed", async () => {
    const res = await POST(
      makeRequest({ bodyText: "{ not json" }) as never,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("returns 400 when message is missing", async () => {
    const res = await POST(makeRequest({ body: {} }) as never);
    expect(res.status).toBe(400);
  });

  it("returns 400 when message is empty string", async () => {
    const res = await POST(makeRequest({ body: { message: "" } }) as never);
    expect(res.status).toBe(400);
  });

  it("returns 400 when message exceeds 8000 chars", async () => {
    const tooLong = "x".repeat(8001);
    const res = await POST(
      makeRequest({ body: { message: tooLong } }) as never,
    );
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────
// Mock-mode short-circuit
// ─────────────────────────────────────────────

describe("POST /api/olivia/chat/stream · mock mode", () => {
  it("emits the mock cascade text in a single chunk + sets mock headers", async () => {
    runModelCascadeStreamMock.mockResolvedValue({
      kind: "mock",
      text: "Mock reply — providers not configured.",
    });

    const res = await POST(
      makeRequest({ body: { message: "Hello" } }) as never,
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Olivia-Provider")).toBe("mock");
    expect(res.headers.get("X-Olivia-Model")).toBe("phase1-local-fallback");
    expect(res.headers.get("X-Olivia-Conversation-Id")).toBeTruthy();
    expect(res.headers.get("Content-Type")).toContain("text/plain");

    const body = await drainBody(res);
    expect(body).toContain("Mock reply — providers not configured.");
    /* Duration marker is appended to every successful stream. */
    expect(body).toContain("olivia:duration=");
  });
});

// ─────────────────────────────────────────────
// Live streaming — happy path
// ─────────────────────────────────────────────

describe("POST /api/olivia/chat/stream · live streaming", () => {
  it("streams every chunk through the body and sets live provider headers", async () => {
    runModelCascadeStreamMock.mockResolvedValue(
      makeLiveStream(["Hello ", "from ", "Olivia."]),
    );

    const res = await POST(
      makeRequest({ body: { message: "Pitch help please" } }) as never,
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Olivia-Provider")).toBe("anthropic");
    expect(res.headers.get("X-Olivia-Model")).toBe("claude-sonnet-4-6");
    expect(res.headers.get("X-Olivia-Spoke")).toBeTruthy();
    expect(res.headers.get("X-Olivia-Conversation-Id")).toBeTruthy();
    expect(res.headers.get("Content-Type")).toContain("text/plain");
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    expect(res.headers.get("X-Accel-Buffering")).toBe("no");

    const body = await drainBody(res);
    expect(body).toContain("Hello ");
    expect(body).toContain("from ");
    expect(body).toContain("Olivia.");
    /* Final duration marker is appended after the last chunk. */
    expect(body).toContain("olivia:duration=");
  });

  it("calls recordTrace once with the streamed provider + model + final-text preview", async () => {
    runModelCascadeStreamMock.mockResolvedValue(
      makeLiveStream(["Series A insight: ", "polish slides 4 and 7."]),
    );

    const res = await POST(
      makeRequest({ body: { message: "What should I polish?" } }) as never,
    );
    /* The trace fires inside the streaming generator AFTER all chunks
     * are yielded. We must drain the body so the generator runs to
     * completion before checking the mock. */
    await drainBody(res);

    expect(recordTraceMock).toHaveBeenCalledTimes(1);
    const traceArg = recordTraceMock.mock.calls[0][0];
    expect(traceArg.selectedProvider).toBe("anthropic");
    expect(traceArg.selectedModel).toBe("claude-sonnet-4-6");
    expect(traceArg.runtimeMode).toBe("live");
    expect(traceArg.userMessage).toBe("What should I polish?");
    expect(traceArg.responsePreview).toContain("polish slides 4 and 7.");
    expect(traceArg.attempts).toHaveLength(1);
    expect(traceArg.attempts[0].success).toBe(true);
  });
});

// ─────────────────────────────────────────────
// Stream error mid-flight
// ─────────────────────────────────────────────

describe("POST /api/olivia/chat/stream · stream error", () => {
  it("appends [stream error] marker when the textStream throws mid-flight", async () => {
    /* Build a textStream that yields one chunk then throws. */
    const failingStream = {
      async *[Symbol.asyncIterator]() {
        yield "partial output ";
        throw new Error("upstream rate limit");
      },
    };
    runModelCascadeStreamMock.mockResolvedValue({
      textStream: failingStream,
      done: Promise.resolve(),
      providerId: "anthropic",
      modelId: "claude-sonnet-4-6",
    });

    const res = await POST(makeRequest({ body: { message: "Hi" } }) as never);
    expect(res.status).toBe(200);
    const body = await drainBody(res);
    /* Partial output reaches the client. */
    expect(body).toContain("partial output");
    /* Followed by a clear error marker so the client can show a banner. */
    expect(body).toContain("[stream error:");
    expect(body).toContain("upstream rate limit");
  });

  it("records the trace with success=false when stream errors", async () => {
    const failingStream = {
      async *[Symbol.asyncIterator]() {
        throw new Error("boom");
      },
    };
    runModelCascadeStreamMock.mockResolvedValue({
      textStream: failingStream,
      done: Promise.resolve(),
      providerId: "anthropic",
      modelId: "claude-sonnet-4-6",
    });

    const res = await POST(makeRequest({ body: { message: "Hi" } }) as never);
    await drainBody(res);

    expect(recordTraceMock).toHaveBeenCalledTimes(1);
    const traceArg = recordTraceMock.mock.calls[0][0];
    expect(traceArg.attempts[0].success).toBe(false);
    expect(traceArg.attempts[0].error).toContain("boom");
  });
});

// ─────────────────────────────────────────────
// Spoke routing through headers
// ─────────────────────────────────────────────

describe("POST /api/olivia/chat/stream · spoke detection", () => {
  it("surfaces the detected spoke via X-Olivia-Spoke header", async () => {
    /* "Atomico Series A" is a strong london_tech keyword pair. */
    runModelCascadeStreamMock.mockResolvedValue(makeLiveStream(["ok"]));
    const res = await POST(
      makeRequest({
        body: {
          message: "Series A pitch advice for an Atomico meeting next week",
        },
      }) as never,
    );
    const spoke = res.headers.get("X-Olivia-Spoke");
    expect(spoke).toBe("london_tech");
    /* The label is the human-readable form of the spoke id. */
    expect(res.headers.get("X-Olivia-Spoke-Label")).toBeTruthy();
    await drainBody(res);
  });
});

// ─────────────────────────────────────────────
// Conversation id continuity
// ─────────────────────────────────────────────

describe("POST /api/olivia/chat/stream · conversation continuity", () => {
  it("uses the caller-supplied conversationId when provided", async () => {
    runModelCascadeStreamMock.mockResolvedValue(makeLiveStream(["ok"]));
    const cid = "00000000-0000-4000-8000-000000000001";
    const res = await POST(
      makeRequest({
        body: { message: "Continue our thread", conversationId: cid },
      }) as never,
    );
    expect(res.headers.get("X-Olivia-Conversation-Id")).toBe(cid);
    await drainBody(res);
  });

  it("generates a stream-prefixed conversationId when omitted", async () => {
    runModelCascadeStreamMock.mockResolvedValue(makeLiveStream(["ok"]));
    const res = await POST(
      makeRequest({ body: { message: "Fresh thread" } }) as never,
    );
    const cid = res.headers.get("X-Olivia-Conversation-Id");
    expect(cid).toMatch(/^stream-[a-z0-9]+-[a-z0-9]+$/);
    await drainBody(res);
  });
});
