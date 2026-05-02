/**
 * LtmKnowledgeProvider — contract & integration tests
 *
 * Mirrors the OliviaSelfProvider suite (metadata, vocabulary, stub
 * surfaces, events, healthCheck, registry round-trip, unconfigured-path
 * coverage) and adds HTTP-shape tests that exercise the configured path
 * via a mock `fetch`. The mock fetch never touches the network — it
 * inspects the Request URL/headers and returns a Response constructed
 * from a literal LTM v1 wire-format payload. This proves the provider's
 * HTTP wiring end-to-end without any LTM contact.
 *
 * Live tests (against a real LTM instance) are deliberately not included
 * here; a separate `ltm.live.test.ts` gated on
 * `CLUES_LONDON_BASE_URL` + `CLUES_LONDON_V1_API_KEY` env presence will
 * land in a follow-up so it skips locally without configuration.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { knowledgeRegistry } from "../../index";
import type { AppEvent } from "../../types";
import { LtmKnowledgeError, LtmKnowledgeProvider, type FetchLike } from "../ltm";

const APP_ID = "ltm-london-tech-map";
const TEST_BASE_URL = "https://ltm.test.invalid";
const TEST_API_KEY = "test-api-key-123";

/** Helper: build a JSON Response. */
function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/* ─── Metadata ──────────────────────────────────────────────────────────── */

describe("LtmKnowledgeProvider · metadata", () => {
  it("declares the canonical identity", () => {
    const provider = new LtmKnowledgeProvider({ baseUrl: null, apiKey: null });
    expect(provider.metadata.appId).toBe(APP_ID);
    expect(provider.metadata.appName).toBe("London Tech Map");
    expect(provider.metadata.version).toBe("0.1.0");
    expect(provider.metadata.domain).toBe("ltm");
  });

  it("declares organisations and districts as read capabilities", () => {
    const provider = new LtmKnowledgeProvider({ baseUrl: null, apiKey: null });
    const ids = provider.metadata.capabilities.map((c) => c.id);
    expect(ids).toContain("ltm.organizations.list");
    expect(ids).toContain("ltm.districts.list");
  });

  it("isConfigured is false when either baseUrl or apiKey is null", () => {
    expect(
      new LtmKnowledgeProvider({ baseUrl: null, apiKey: TEST_API_KEY })
        .isConfigured,
    ).toBe(false);
    expect(
      new LtmKnowledgeProvider({ baseUrl: TEST_BASE_URL, apiKey: null })
        .isConfigured,
    ).toBe(false);
    expect(
      new LtmKnowledgeProvider({ baseUrl: null, apiKey: null }).isConfigured,
    ).toBe(false);
  });

  it("isConfigured is true when both baseUrl and apiKey are set", () => {
    const provider = new LtmKnowledgeProvider({
      baseUrl: TEST_BASE_URL,
      apiKey: TEST_API_KEY,
    });
    expect(provider.isConfigured).toBe(true);
  });
});

/* ─── Vocabulary ────────────────────────────────────────────────────────── */

describe("LtmKnowledgeProvider · vocabulary", () => {
  const provider = new LtmKnowledgeProvider({ baseUrl: null, apiKey: null });

  it("exposes the LTM domain terms", () => {
    const labels = provider.vocabulary.getTerms().map((t) => t.term.toLowerCase());
    for (const expected of [
      "organisation",
      "district",
      "borough",
      "sector",
      "fundingstage",
    ]) {
      expect(labels).toContain(expected);
    }
  });

  it("getTerms returns a fresh copy — caller mutation does not leak", () => {
    const a = provider.vocabulary.getTerms();
    const b = provider.vocabulary.getTerms();
    expect(a).not.toBe(b);
    a.length = 0;
    expect(provider.vocabulary.getTerms().length).toBeGreaterThan(0);
  });

  it("getExplanation finds a term by synonym (organization → organisation)", () => {
    expect(provider.vocabulary.getExplanation("organization")).toBeDefined();
    expect(provider.vocabulary.getExplanation("ORGANIZATION")).toBeDefined();
    expect(provider.vocabulary.getExplanation("startup")).toBeDefined();
  });

  it("getExplanation returns undefined for unknown terms", () => {
    expect(provider.vocabulary.getExplanation("phlogiston")).toBeUndefined();
  });

  it("getAliases lists synonyms for the canonical term", () => {
    expect(provider.vocabulary.getAliases("organisation")).toContain("startup");
    expect(provider.vocabulary.getAliases("district")).toContain("neighbourhood");
  });

  it("getAliases returns an empty array for a term with no synonyms", () => {
    expect(provider.vocabulary.getAliases("borough")).toEqual([]);
  });
});

/* ─── Stub surfaces ─────────────────────────────────────────────────────── */

describe("LtmKnowledgeProvider · flows", () => {
  const provider = new LtmKnowledgeProvider({ baseUrl: null, apiKey: null });

  it("getFlows returns an empty list", () => {
    expect(provider.flows.getFlows()).toEqual([]);
  });

  it("advanceFlow rejects with an explanatory error", async () => {
    await expect(provider.flows.advanceFlow("u", "f", null)).rejects.toThrow(
      /does not expose flows/,
    );
  });
});

describe("LtmKnowledgeProvider · questions", () => {
  const provider = new LtmKnowledgeProvider({ baseUrl: null, apiKey: null });

  it("getNextQuestions resolves to an empty list", async () => {
    expect(await provider.questions.getNextQuestions("u")).toEqual([]);
  });

  it("submitAnswer reports failure with the question id echoed back", async () => {
    const result = await provider.questions.submitAnswer("u", "q-1", null);
    expect(result.success).toBe(false);
    expect(result.questionId).toBe("q-1");
    expect(result.error).toMatch(/does not expose questions/);
  });

  it("getProgress reports a complete-but-empty progress shape", async () => {
    const progress = await provider.questions.getProgress("u");
    expect(progress.totalQuestions).toBe(0);
    expect(progress.isComplete).toBe(true);
  });
});

describe("LtmKnowledgeProvider · actions", () => {
  const provider = new LtmKnowledgeProvider({ baseUrl: null, apiKey: null });

  it("getActions returns an empty list", () => {
    expect(provider.actions.getActions()).toEqual([]);
  });

  it("executeAction echoes the actionId in a failure result", async () => {
    const result = await provider.actions.executeAction("test.action", {});
    expect(result.success).toBe(false);
    expect(result.actionId).toBe("test.action");
    expect(result.error).toMatch(/does not expose actions/);
  });
});

describe("LtmKnowledgeProvider · outputs", () => {
  const provider = new LtmKnowledgeProvider({ baseUrl: null, apiKey: null });

  it("getOutputTypes returns an empty list", () => {
    expect(provider.outputs.getOutputTypes()).toEqual([]);
  });

  it("generateOutput echoes the typeId in a failure result", async () => {
    const result = await provider.outputs.generateOutput("u", "pdf");
    expect(result.success).toBe(false);
    expect(result.outputType).toBe("pdf");
    expect(result.error).toMatch(/does not generate outputs/);
  });
});

/* ─── Event bus ─────────────────────────────────────────────────────────── */

describe("LtmKnowledgeProvider · events", () => {
  const event: AppEvent = {
    type: "test.ltm.event",
    timestamp: new Date().toISOString(),
    data: { value: 1 },
  };

  it("publish fans out to subscribers", () => {
    const provider = new LtmKnowledgeProvider({ baseUrl: null, apiKey: null });
    const received: AppEvent[] = [];
    provider.events.subscribe(event.type, (e) => received.push(e as AppEvent));
    provider.publish(event);
    expect(received).toHaveLength(1);
    expect(received[0]).toEqual(event);
  });

  it("a subscriber that throws does not break the bus for siblings", () => {
    const provider = new LtmKnowledgeProvider({ baseUrl: null, apiKey: null });
    let sibling = 0;
    provider.events.subscribe(event.type, () => {
      throw new Error("intentional");
    });
    provider.events.subscribe(event.type, () => {
      sibling++;
    });
    expect(() => provider.publish(event)).not.toThrow();
    expect(sibling).toBe(1);
  });

  it("unsubscribe removes all callbacks for the topic", () => {
    const provider = new LtmKnowledgeProvider({ baseUrl: null, apiKey: null });
    let count = 0;
    provider.events.subscribe(event.type, () => count++);
    provider.events.unsubscribe(event.type);
    provider.publish(event);
    expect(count).toBe(0);
  });
});

/* ─── Healthcheck ───────────────────────────────────────────────────────── */

describe("LtmKnowledgeProvider · healthCheck", () => {
  it("returns true when unconfigured (degraded mode is healthy)", async () => {
    const provider = new LtmKnowledgeProvider({ baseUrl: null, apiKey: null });
    expect(await provider.healthCheck()).toBe(true);
  });

  it("returns true when /api/v1/districts responds 200", async () => {
    const fetchMock: FetchLike = async () =>
      jsonResponse({ data: [], total: 0 });
    const provider = new LtmKnowledgeProvider({
      baseUrl: TEST_BASE_URL,
      apiKey: TEST_API_KEY,
      fetch: fetchMock,
    });
    expect(await provider.healthCheck()).toBe(true);
  });

  it("returns false when /api/v1/districts responds non-2xx", async () => {
    const fetchMock: FetchLike = async () =>
      new Response("denied", { status: 403 });
    const provider = new LtmKnowledgeProvider({
      baseUrl: TEST_BASE_URL,
      apiKey: TEST_API_KEY,
      fetch: fetchMock,
    });
    expect(await provider.healthCheck()).toBe(false);
  });

  it("returns false when fetch throws (network error)", async () => {
    const fetchMock: FetchLike = async () => {
      throw new Error("ECONNREFUSED");
    };
    const provider = new LtmKnowledgeProvider({
      baseUrl: TEST_BASE_URL,
      apiKey: TEST_API_KEY,
      fetch: fetchMock,
    });
    expect(await provider.healthCheck()).toBe(false);
  });
});

/* ─── Data layer (unconfigured) ─────────────────────────────────────────── */

describe("LtmKnowledgeProvider · data.query (unconfigured)", () => {
  const provider = new LtmKnowledgeProvider({ baseUrl: null, apiKey: null });

  it("returns 'not configured' for organizations / districts / unknown intents", async () => {
    for (const q of [
      { query: "list London startups in fintech" },
      { query: "what districts are in London?" },
      { query: "tell me about quantum physics" },
    ]) {
      const result = await provider.data.query(q);
      expect(result.success).toBe(false);
      expect(result.summary).toMatch(/not configured/i);
    }
  });

  it("getUserData and getResults always return null", async () => {
    expect(await provider.data.getUserData("u")).toBeNull();
    expect(await provider.data.getResults("u")).toBeNull();
  });
});

/* ─── Data layer (configured, mock fetch) ───────────────────────────────── */

describe("LtmKnowledgeProvider · data.query (configured, mock fetch)", () => {
  it("queries /api/v1/organizations with a Bearer token and parses the wire shape", async () => {
    const calls: { url: string; headers: Headers }[] = [];
    const wirePayload = {
      data: [
        {
          id: "org_1",
          name: "Stripe London",
          slug: "stripe-london",
          orgType: "company",
          primarySector: "FinTech",
          descriptionShort: "Payments",
          website: "https://stripe.com",
          foundedYear: 2010,
          employeeRange: "1000+",
          fundingStage: "Public",
          isFeatured: true,
          district: { name: "Shoreditch", slug: "shoreditch" },
        },
      ],
      total: 1,
      limit: 25,
      offset: 0,
    };

    const fetchMock: FetchLike = async (input, init) => {
      calls.push({
        url: typeof input === "string" ? input : input.toString(),
        headers: new Headers(init?.headers),
      });
      return jsonResponse(wirePayload);
    };

    const provider = new LtmKnowledgeProvider({
      baseUrl: TEST_BASE_URL,
      apiKey: TEST_API_KEY,
      fetch: fetchMock,
    });

    const result = await provider.data.query({
      query: "list london fintech startups",
    });

    expect(result.success).toBe(true);
    expect(result.summary).toMatch(/Found 1 organisation/);
    expect(result.data).toEqual(wirePayload.data);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain("/api/v1/organizations");
    expect(calls[0].url).toContain("limit=25");
    expect(calls[0].headers.get("authorization")).toBe(
      `Bearer ${TEST_API_KEY}`,
    );
    expect(calls[0].headers.get("x-olivia-app-id")).toBe("olivia-brain");
    expect(calls[0].headers.get("x-olivia-trace-id")).toMatch(
      /^[0-9a-f-]{36}$/i,
    );
  });

  it("queries /api/v1/districts on a districts intent", async () => {
    const calls: string[] = [];
    const wirePayload = { data: [], total: 0 };
    const fetchMock: FetchLike = async (input) => {
      calls.push(typeof input === "string" ? input : input.toString());
      return jsonResponse(wirePayload);
    };
    const provider = new LtmKnowledgeProvider({
      baseUrl: TEST_BASE_URL,
      apiKey: TEST_API_KEY,
      fetch: fetchMock,
    });

    const result = await provider.data.query({
      query: "list districts in london",
    });

    expect(result.success).toBe(true);
    expect(calls[0]).toContain("/api/v1/districts");
  });

  it("converts a non-2xx response into success:false with the LTM error message", async () => {
    const fetchMock: FetchLike = async () =>
      jsonResponse({ error: "Invalid API key" }, 403);
    const provider = new LtmKnowledgeProvider({
      baseUrl: TEST_BASE_URL,
      apiKey: TEST_API_KEY,
      fetch: fetchMock,
    });

    const result = await provider.data.query({
      query: "list organisations",
    });
    expect(result.success).toBe(false);
    expect(result.summary).toMatch(/Invalid API key/);
  });

  it("converts a network error into success:false without throwing to the caller", async () => {
    const fetchMock: FetchLike = async () => {
      throw new Error("ECONNREFUSED");
    };
    const provider = new LtmKnowledgeProvider({
      baseUrl: TEST_BASE_URL,
      apiKey: TEST_API_KEY,
      fetch: fetchMock,
    });

    const result = await provider.data.query({
      query: "list organisations",
    });
    expect(result.success).toBe(false);
    expect(result.summary).toMatch(/threw/);
  });

  it("falls through to the unknown-intent message for queries it does not recognise", async () => {
    const fetchMock = vi.fn() as unknown as FetchLike;
    const provider = new LtmKnowledgeProvider({
      baseUrl: TEST_BASE_URL,
      apiKey: TEST_API_KEY,
      fetch: fetchMock,
    });

    const result = await provider.data.query({
      query: "explain general relativity",
    });
    expect(result.success).toBe(false);
    expect(result.summary).toMatch(/does not know how to answer/);
    // Importantly, it never made an HTTP request.
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

/* ─── Error class ───────────────────────────────────────────────────────── */

describe("LtmKnowledgeError", () => {
  it("preserves code, status, retryable on construction", () => {
    const e = new LtmKnowledgeError({
      code: "RATE_LIMITED",
      message: "60/min cap",
      status: 429,
      retryable: true,
    });
    expect(e.name).toBe("LtmKnowledgeError");
    expect(e.code).toBe("RATE_LIMITED");
    expect(e.status).toBe(429);
    expect(e.retryable).toBe(true);
    expect(e.message).toBe("60/min cap");
  });

  it("defaults retryable to false", () => {
    const e = new LtmKnowledgeError({
      code: "X",
      message: "y",
      status: 500,
    });
    expect(e.retryable).toBe(false);
  });
});

/* ─── Registry integration ──────────────────────────────────────────────── */

describe("LtmKnowledgeProvider · knowledgeRegistry integration", () => {
  let provider: LtmKnowledgeProvider;

  beforeEach(async () => {
    provider = new LtmKnowledgeProvider({ baseUrl: null, apiKey: null });
    await knowledgeRegistry.register(provider, { mode: "live" });
  });

  afterEach(async () => {
    await knowledgeRegistry.unregister(APP_ID);
  });

  it("registers and is lookup-able by appId and domain", () => {
    expect(knowledgeRegistry.getProvider(APP_ID)).toBe(provider);
    expect(knowledgeRegistry.getDomains()).toContain("ltm");
    expect(knowledgeRegistry.getProvidersForDomain("ltm")).toContain(provider);
  });

  it("getPrimaryProvider returns the registered instance", () => {
    expect(knowledgeRegistry.getPrimaryProvider("ltm")).toBe(provider);
  });

  it("routeQuery delegates to data.query", async () => {
    const result = await knowledgeRegistry.routeQuery("ltm", {
      query: "list organisations",
    });
    expect(result.success).toBe(false);
    expect(typeof result.summary).toBe("string");
    expect(result.summary.length).toBeGreaterThan(0);
  });

  it("checkHealth records the unconfigured-but-healthy state", async () => {
    await knowledgeRegistry.checkHealth();
    const status = knowledgeRegistry.getHealthStatus(APP_ID);
    expect(status.isHealthy).toBe(true);
    expect(status.lastCheck).toBeInstanceOf(Date);
  });
});

/* ─── Cross-provider integration ────────────────────────────────────────── */

describe("knowledgeRegistry · multi-provider routing", () => {
  // Verifies the registry can hold both OliviaSelfProvider and
  // LtmKnowledgeProvider concurrently and routes by domain correctly.
  // This is Phase 1's primary integration assertion.

  it("routes to the right provider based on domain", async () => {
    const { OliviaSelfProvider } = await import("../olivia-self");
    const oliviaProvider = new OliviaSelfProvider({ supabase: null });
    const ltmProvider = new LtmKnowledgeProvider({
      baseUrl: null,
      apiKey: null,
    });

    await knowledgeRegistry.register(oliviaProvider, { mode: "embedded" });
    await knowledgeRegistry.register(ltmProvider, { mode: "live" });

    try {
      expect(knowledgeRegistry.getPrimaryProvider("olivia")).toBe(
        oliviaProvider,
      );
      expect(knowledgeRegistry.getPrimaryProvider("ltm")).toBe(ltmProvider);

      const oliviaResult = await knowledgeRegistry.routeQuery("olivia", {
        query: "list my conversations",
      });
      const ltmResult = await knowledgeRegistry.routeQuery("ltm", {
        query: "list london organisations",
      });

      // Both unconfigured → both surface failure; the registry's "All
      // providers failed" wrapper is what we get back when the inner
      // success is false. We just assert the routing reached each.
      expect(oliviaResult.success).toBe(false);
      expect(ltmResult.success).toBe(false);
    } finally {
      await knowledgeRegistry.unregister("olivia-brain");
      await knowledgeRegistry.unregister(APP_ID);
    }
  });
});
