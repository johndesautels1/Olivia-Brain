/**
 * OliviaSelfProvider — contract & integration tests
 *
 * Coverage:
 * - Metadata identity and capability declaration.
 * - Vocabulary lookup: case-insensitive, synonym-aware, miss-safe.
 * - Stub surfaces (flows, questions, actions, outputs) match contract.
 * - Event bus: subscribe, publish, unsubscribe, error isolation.
 * - Healthcheck: unconfigured-mode returns true.
 * - Data layer: unconfigured paths return clean structured failures
 *   (each intent + the unknown intent fall-through).
 * - Registry integration: register, lookup, route, unregister round-trip.
 *
 * Tests deliberately avoid hitting Supabase. They exercise the unconfigured
 * code path by passing `{ supabase: null }` to the constructor. A future
 * commit will add a separate file `olivia-self.live.test.ts` that runs
 * against a real test database via `SUPABASE_TEST_URL` /
 * `SUPABASE_TEST_SERVICE_ROLE_KEY`, gated by an env presence check so it
 * skips locally without configuration.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { knowledgeRegistry } from "../../index";
import type { AppEvent } from "../../types";
import { OliviaSelfProvider } from "../olivia-self";

const APP_ID = "olivia-brain";

/* ─── Metadata ──────────────────────────────────────────────────────────── */

describe("OliviaSelfProvider · metadata", () => {
  it("declares the canonical identity", () => {
    const provider = new OliviaSelfProvider({ supabase: null });
    expect(provider.metadata.appId).toBe(APP_ID);
    expect(provider.metadata.appName).toBe("Olivia Brain");
    expect(provider.metadata.version).toBe("0.1.0");
    expect(provider.metadata.domain).toBe("olivia");
  });

  it("declares at least three capabilities including reads and event publish", () => {
    const provider = new OliviaSelfProvider({ supabase: null });
    const ids = provider.metadata.capabilities.map((c) => c.id);
    expect(ids).toContain("olivia.conversations.read");
    expect(ids).toContain("olivia.memory.read");
    expect(ids).toContain("olivia.events.publish");
  });

  it("reports isDatabaseConfigured=false when constructed with supabase=null", () => {
    const provider = new OliviaSelfProvider({ supabase: null });
    expect(provider.isDatabaseConfigured).toBe(false);
  });
});

/* ─── Vocabulary ────────────────────────────────────────────────────────── */

describe("OliviaSelfProvider · vocabulary", () => {
  const provider = new OliviaSelfProvider({ supabase: null });

  it("exposes the seven core domain terms", () => {
    const labels = provider.vocabulary.getTerms().map((t) => t.term.toLowerCase());
    for (const expected of [
      "olivia",
      "conversation",
      "episode",
      "semantic memory",
      "procedural memory",
      "client",
      "persona",
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

  it("getExplanation is case-insensitive on canonical terms", () => {
    expect(provider.vocabulary.getExplanation("Olivia")).toBeDefined();
    expect(provider.vocabulary.getExplanation("OLIVIA")).toBeDefined();
    expect(provider.vocabulary.getExplanation("olivia")).toBeDefined();
  });

  it("getExplanation finds a term by synonym", () => {
    // 'Olivia' has synonym 'the assistant'.
    expect(provider.vocabulary.getExplanation("the assistant")).toBeDefined();
  });

  it("getExplanation returns undefined for unknown terms", () => {
    expect(provider.vocabulary.getExplanation("phlogiston")).toBeUndefined();
  });

  it("getAliases lists synonyms for the canonical term", () => {
    const aliases = provider.vocabulary.getAliases("Olivia");
    expect(aliases).toContain("the assistant");
    expect(aliases).toContain("Olivia Brain");
  });

  it("getAliases returns an empty array for a term with no synonyms", () => {
    expect(provider.vocabulary.getAliases("episode")).toEqual([]);
  });

  it("getAliases does not search by synonym — only by canonical name", () => {
    // 'the assistant' is a synonym of 'Olivia'; getAliases on the synonym
    // returns []. This is intentional per the JSDoc contract.
    expect(provider.vocabulary.getAliases("the assistant")).toEqual([]);
  });
});

/* ─── Stub surfaces ─────────────────────────────────────────────────────── */

describe("OliviaSelfProvider · flows", () => {
  const provider = new OliviaSelfProvider({ supabase: null });

  it("getFlows returns an empty list", () => {
    expect(provider.flows.getFlows()).toEqual([]);
  });

  it("getFlowState resolves to null", async () => {
    expect(await provider.flows.getFlowState("u", "f")).toBeNull();
  });

  it("advanceFlow rejects with an explanatory error", async () => {
    await expect(provider.flows.advanceFlow("u", "f", null)).rejects.toThrow(
      /does not expose flows/,
    );
  });
});

describe("OliviaSelfProvider · questions", () => {
  const provider = new OliviaSelfProvider({ supabase: null });

  it("getNextQuestions resolves to an empty list", async () => {
    expect(await provider.questions.getNextQuestions("u")).toEqual([]);
  });

  it("submitAnswer reports failure with the question id echoed back", async () => {
    const result = await provider.questions.submitAnswer("u", "q-42", null);
    expect(result.success).toBe(false);
    expect(result.questionId).toBe("q-42");
    expect(result.error).toMatch(/does not expose questions/);
  });

  it("getProgress reports a complete-but-empty progress shape", async () => {
    const progress = await provider.questions.getProgress("u");
    expect(progress.totalQuestions).toBe(0);
    expect(progress.answeredCount).toBe(0);
    expect(progress.percentage).toBe(0);
    expect(progress.isComplete).toBe(true);
  });
});

describe("OliviaSelfProvider · actions", () => {
  const provider = new OliviaSelfProvider({ supabase: null });

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

describe("OliviaSelfProvider · outputs", () => {
  const provider = new OliviaSelfProvider({ supabase: null });

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

describe("OliviaSelfProvider · events", () => {
  const event: AppEvent = {
    type: "test.event",
    timestamp: new Date().toISOString(),
    data: { value: 42 },
  };

  it("publish fans out to a single subscriber", () => {
    const provider = new OliviaSelfProvider({ supabase: null });
    const received: AppEvent[] = [];
    provider.events.subscribe(event.type, (e) => received.push(e as AppEvent));
    provider.publish(event);
    expect(received).toHaveLength(1);
    expect(received[0]).toEqual(event);
  });

  it("publish fans out to multiple subscribers in registration order", () => {
    const provider = new OliviaSelfProvider({ supabase: null });
    const order: number[] = [];
    provider.events.subscribe(event.type, () => order.push(1));
    provider.events.subscribe(event.type, () => order.push(2));
    provider.events.subscribe(event.type, () => order.push(3));
    provider.publish(event);
    expect(order).toEqual([1, 2, 3]);
  });

  it("publish to a topic with no subscribers is a no-op", () => {
    const provider = new OliviaSelfProvider({ supabase: null });
    expect(() => provider.publish({ ...event, type: "untouched" })).not.toThrow();
  });

  it("unsubscribe removes all callbacks for the topic", () => {
    const provider = new OliviaSelfProvider({ supabase: null });
    let count = 0;
    provider.events.subscribe(event.type, () => count++);
    provider.events.subscribe(event.type, () => count++);
    provider.events.unsubscribe(event.type);
    provider.publish(event);
    expect(count).toBe(0);
  });

  it("a subscriber that throws does not break the bus for siblings", () => {
    const provider = new OliviaSelfProvider({ supabase: null });
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
});

/* ─── Healthcheck ───────────────────────────────────────────────────────── */

describe("OliviaSelfProvider · healthCheck", () => {
  it("returns true when the DB is unconfigured (degraded mode is healthy)", async () => {
    const provider = new OliviaSelfProvider({ supabase: null });
    expect(await provider.healthCheck()).toBe(true);
  });
});

/* ─── Data layer (unconfigured) ─────────────────────────────────────────── */

describe("OliviaSelfProvider · data.query (unconfigured)", () => {
  const provider = new OliviaSelfProvider({ supabase: null });

  it("returns success:false with a 'not configured' summary for any intent", async () => {
    const cases = [
      { query: "list my conversations" },
      { query: "what do you remember about me?" },
      { query: "what episodes have we had?" },
      { query: "tell me about quantum physics" }, // unknown intent
    ];
    for (const q of cases) {
      const result = await provider.data.query(q);
      expect(result.success).toBe(false);
      expect(result.summary).toMatch(/not configured/i);
    }
  });

  it("getUserData returns null when DB is unconfigured", async () => {
    expect(await provider.data.getUserData("user-1")).toBeNull();
  });

  it("getResults always returns null", async () => {
    expect(await provider.data.getResults("user-1")).toBeNull();
  });
});

/* ─── Registry integration ──────────────────────────────────────────────── */

describe("OliviaSelfProvider · knowledgeRegistry integration", () => {
  // The registry is a process-wide singleton. Each test registers a fresh
  // provider and unregisters at the end so we never leak between tests.
  let provider: OliviaSelfProvider;

  beforeEach(async () => {
    provider = new OliviaSelfProvider({ supabase: null });
    await knowledgeRegistry.register(provider, { mode: "embedded" });
  });

  afterEach(async () => {
    await knowledgeRegistry.unregister(APP_ID);
  });

  it("register makes the provider lookup-able by appId", () => {
    expect(knowledgeRegistry.getProvider(APP_ID)).toBe(provider);
  });

  it("indexes the provider under its declared domain", () => {
    expect(knowledgeRegistry.getDomains()).toContain("olivia");
    expect(knowledgeRegistry.getProvidersForDomain("olivia")).toContain(
      provider,
    );
  });

  it("getPrimaryProvider returns the registered instance", () => {
    expect(knowledgeRegistry.getPrimaryProvider("olivia")).toBe(provider);
  });

  it("routeQuery delegates to the provider's data.query", async () => {
    const result = await knowledgeRegistry.routeQuery("olivia", {
      query: "list my conversations",
    });
    // Unconfigured path → success:false with explanatory summary.
    // Note: the registry treats success:false as a fallback signal, but
    // with no fallback provider it returns "All providers failed for
    // domain: olivia" rather than the inner summary. Either is valid;
    // we just assert success:false and a non-empty summary.
    expect(result.success).toBe(false);
    expect(typeof result.summary).toBe("string");
    expect(result.summary.length).toBeGreaterThan(0);
  });

  it("getHealthStatus reflects the unconfigured-but-healthy state", async () => {
    // checkHealth runs each provider's healthCheck; unconfigured = true.
    await knowledgeRegistry.checkHealth();
    const status = knowledgeRegistry.getHealthStatus(APP_ID);
    expect(status.isHealthy).toBe(true);
    expect(status.lastCheck).toBeInstanceOf(Date);
  });

  it("unregister removes the provider from all indices", async () => {
    await knowledgeRegistry.unregister(APP_ID);
    expect(knowledgeRegistry.getProvider(APP_ID)).toBeNull();
    expect(knowledgeRegistry.getProvidersForDomain("olivia")).not.toContain(
      provider,
    );
    // Re-register so the afterEach unregister doesn't fail. Ugly but the
    // alternative is letting afterEach silently no-op which is worse.
    await knowledgeRegistry.register(provider, { mode: "embedded" });
  });
});
