/**
 * cascade/providers — registry contract tests.
 *
 * Verifies all 9 providers are registered, getWebSearchProviders filters
 * to the 6 LLM web-search providers, and getProviderStatus surfaces
 * configuration state without requiring real API keys.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createAllProviders,
  getWebSearchProviders,
  getProviderStatus,
} from "../providers";

const ALL_KEYS = [
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "GOOGLE_AI_API_KEY",
  "XAI_API_KEY",
  "PERPLEXITY_API_KEY",
  "MOONSHOT_API_KEY",
  "TAVILY_API_KEY",
  "COMPANIES_HOUSE_API_KEY",
];

const snapshot: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ALL_KEYS) {
    snapshot[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of ALL_KEYS) {
    if (snapshot[k] === undefined) delete process.env[k];
    else process.env[k] = snapshot[k];
  }
});

describe("cascade/providers — registry", () => {
  it("createAllProviders registers all 9 providers", () => {
    const providers = createAllProviders();
    expect(providers.size).toBe(9);
    expect([...providers.keys()].sort()).toEqual(
      [
        "companies_house",
        "gemini",
        "gpt",
        "grok",
        "kimi",
        "opus",
        "perplexity",
        "sonnet",
        "tavily",
      ].sort(),
    );
  });

  it("every registered provider exposes the CascadeProvider contract", () => {
    const providers = createAllProviders();
    for (const [id, p] of providers) {
      expect(p.id).toBe(id);
      expect(typeof p.isConfigured).toBe("function");
      expect(typeof p.execute).toBe("function");
    }
  });

  it("isConfigured returns false when env vars are absent", () => {
    const providers = createAllProviders();
    for (const [, p] of providers) {
      expect(p.isConfigured()).toBe(false);
    }
  });

  it("getWebSearchProviders returns empty list when no keys set", () => {
    const providers = createAllProviders();
    expect(getWebSearchProviders(providers)).toEqual([]);
  });

  it("getWebSearchProviders returns only the 6 LLM web-search providers", () => {
    process.env.ANTHROPIC_API_KEY = "x";
    process.env.OPENAI_API_KEY = "x";
    process.env.GOOGLE_AI_API_KEY = "x";
    process.env.XAI_API_KEY = "x";
    process.env.PERPLEXITY_API_KEY = "x";
    process.env.MOONSHOT_API_KEY = "x";
    process.env.TAVILY_API_KEY = "x";
    process.env.COMPANIES_HOUSE_API_KEY = "x";

    const providers = createAllProviders();
    const ws = getWebSearchProviders(providers);
    const ids = ws.map((p) => p.id).sort();
    // Opus is the judge — excluded. Tavily + Companies House are Phase 2.
    expect(ids).toEqual(["gemini", "gpt", "grok", "kimi", "perplexity", "sonnet"]);
  });

  it("getProviderStatus surfaces configuration per provider", () => {
    process.env.ANTHROPIC_API_KEY = "x";
    const status = getProviderStatus();
    expect(status.sonnet).toBe(true);
    expect(status.opus).toBe(true); // same key
    expect(status.gpt).toBe(false);
    expect(status.tavily).toBe(false);
  });
});
