import { randomUUID } from 'crypto';

import { getFoundationStatus } from '@/lib/foundation/status';
import type { RouteIntent, StatusLevel } from '@/lib/foundation/types';
import { runModelCascade } from '@/lib/services/model-cascade';

import type { LLMCallFn } from './financial-extractor';

// ═══════════════════════════════════════════════════════════════════════
// LLM ADAPTER — Bridges valuation agents to OB's 9-provider cascade
// ═══════════════════════════════════════════════════════════════════════
//
// All valuation agents accept an `LLMCallFn` parameter for testability and
// provider flexibility. This adapter implements `LLMCallFn` by routing
// through `runModelCascade`, so valuation work inherits the full fallback
// chain (Anthropic Sonnet → Opus judge → GPT-5.4 → Gemini → Grok →
// Perplexity → Tavily → Mistral) and the same Langfuse/OTel tracing that
// the chat surface uses.
//
// `LLMCallFn` carries `model`, `systemPrompt`, `userPrompt`, `maxTokens`.
// The cascade picks its own model via intent routing, so `model` and
// `maxTokens` are advisory only here. We concatenate system + user into
// the cascade's single `message` field.
//
// Default intent is `judge` because valuation outputs (truth scoring,
// validation, evidence mapping) are high-stakes — Cristiano (Opus) is
// the right primary for those. Callers needing a cheaper path (e.g. bulk
// extraction) can pass a different `RouteIntent` to `createCascadeLLMCall`.
// ═══════════════════════════════════════════════════════════════════════

function buildIntegrationSnapshot(): Record<string, StatusLevel> {
  const status = getFoundationStatus();
  return Object.fromEntries(
    status.integrations.map((i) => [i.id, i.status]),
  ) as Record<string, StatusLevel>;
}

export function createCascadeLLMCall(
  intent: RouteIntent = 'judge',
): LLMCallFn {
  return async ({ systemPrompt, userPrompt }) => {
    const result = await runModelCascade({
      conversationId: randomUUID(),
      message: `${systemPrompt}\n\n---\n\n${userPrompt}`,
      intent,
      recalledContext: [],
      integrationSnapshot: buildIntegrationSnapshot(),
    });

    if (result.runtimeMode === 'mock') {
      throw new Error(
        'Cascade returned mock-mode — no LLM provider is configured. ' +
          'Set ANTHROPIC_API_KEY (or another provider key) in your environment.',
      );
    }

    return result.text;
  };
}
