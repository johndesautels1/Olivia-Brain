/* ═══════════════════════════════════════════════════════════════════════════
   Provider Registry — creates and exports all cascade providers
   ═══════════════════════════════════════════════════════════════════════════ */

export { createAnthropicProvider } from "./anthropic";
export { createOpenAIProvider } from "./openai";
export { createGoogleProvider } from "./google";
export { createXAIProvider } from "./xai";
export { createPerplexityProvider } from "./perplexity";
export { createTavilyProvider } from "./tavily";
export { createCompaniesHouseProvider } from "./companies-house";
export { createKimiProvider } from "./kimi";

import type { CascadeProvider, ProviderId } from "../types";
import { createAnthropicProvider } from "./anthropic";
import { createOpenAIProvider } from "./openai";
import { createGoogleProvider } from "./google";
import { createXAIProvider } from "./xai";
import { createPerplexityProvider } from "./perplexity";
import { createKimiProvider } from "./kimi";
import { createTavilyProvider } from "./tavily";
import { createCompaniesHouseProvider } from "./companies-house";

/** Instantiate all providers */
export function createAllProviders(): Map<ProviderId, CascadeProvider> {
  const providers = new Map<ProviderId, CascadeProvider>();

  providers.set("sonnet", createAnthropicProvider("sonnet"));
  providers.set("opus", createAnthropicProvider("opus"));
  providers.set("gpt", createOpenAIProvider());
  providers.set("gemini", createGoogleProvider());
  providers.set("grok", createXAIProvider());
  providers.set("perplexity", createPerplexityProvider());
  providers.set("kimi", createKimiProvider());
  providers.set("tavily", createTavilyProvider());
  providers.set("companies_house", createCompaniesHouseProvider());

  return providers;
}

/** Get only the websearch providers (Phase 1) */
export function getWebSearchProviders(
  providers: Map<ProviderId, CascadeProvider>,
): CascadeProvider[] {
  const webSearchIds: ProviderId[] = [
    "sonnet",
    "gpt",
    "gemini",
    "grok",
    "perplexity",
    "kimi",
  ];
  return webSearchIds
    .map((id) => providers.get(id))
    .filter((p): p is CascadeProvider => p !== undefined && p.isConfigured());
}

/** Check which providers are configured */
export function getProviderStatus(): Record<ProviderId, boolean> {
  const providers = createAllProviders();
  const status: Record<string, boolean> = {};
  for (const [id, provider] of providers) {
    status[id] = provider.isConfigured();
  }
  return status as Record<ProviderId, boolean>;
}
