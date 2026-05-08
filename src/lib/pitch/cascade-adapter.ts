/**
 * `cascade-adapter` — Track D Session 15.
 *
 * Re-points the four pitch helpers (`optimizeSlide`, `draftPlanSection`,
 * `analyzeContent`, `askOlivia`) at the OB 9-model cascade.
 *
 * Before this adapter, each helper hit `https://api.anthropic.com/v1/messages`
 * directly with hardcoded Sonnet 4.6 — no fallback, no Langfuse traces, no
 * provenance. This adapter delegates to `runModelCascade` so:
 *
 *   - All 9 providers are available with intent-keyed ordering
 *   - Mock-mode degraded path keeps the UI alive when nothing's configured
 *   - Langfuse + OTel traces fire automatically
 *   - Web research moves from Anthropic's native `web_search_20250305`
 *     tool to Tavily (cascade position ⑦) via a pre-search step injected
 *     as `<web_research>` blocks in the user prompt
 *
 * Returns the assembled prompt's text response plus the cascade's
 * full provenance (provider/model/attempts/runtime).
 */

import { getQuickAnswer, isTavilyConfigured } from "@/lib/services/tavily";
import { runModelCascade } from "@/lib/services/model-cascade";
import type {
  ProviderAttempt,
  ProviderId,
  RouteIntent,
  RuntimeMode,
} from "@/lib/foundation/types";
import {
  detectVerticalFromIndustry,
} from "@/lib/orchestration/vertical-adapter";
import type { VerticalId } from "@/lib/quantara/metamorphic/vertical-types";

export interface PitchCascadeInput {
  /** XML-tagged system framing. */
  systemPrompt: string;
  /** XML-tagged user prompt. */
  userPrompt: string;
  /** Cascade intent — drives provider order. Most pitch ops want
   *  `"presentation"` (favors Sonnet primary); set `"research"` when
   *  fact-finding matters. */
  intent: RouteIntent;
  /** Optional conversation id — used by the cascade for trace
   *  correlation. Pass through when one is available; otherwise the
   *  adapter mints a `pitch-${nanoid}`-style synthetic id. */
  conversationId?: string;
  /** When true + Tavily is configured, runs `getQuickAnswer(searchQuery)`
   *  before the LLM call and injects the result as `<web_research>` in
   *  the user prompt. Replaces Anthropic's native `web_search_20250305`. */
  useWebResearch?: boolean;
  /** The query to send to Tavily. Required when `useWebResearch` is true. */
  searchQuery?: string;
  /** Track J — explicit vertical override; otherwise the adapter
   *  attempts to detect from `industry`. Pass to bypass detection. */
  vertical?: VerticalId;
  /** Track J — free-form industry string used to auto-detect vertical
   *  (e.g. "AI / SaaS" → ai_saas). Cheap regex; not LLM-driven. */
  industry?: string;
}

export interface PitchCascadeResult {
  text: string;
  providerId: ProviderId | "mock";
  modelId: string;
  attempts: ProviderAttempt[];
  runtimeMode: RuntimeMode;
  /** Tavily research summary (if `useWebResearch` was on and Tavily fired). */
  researchSummary?: string;
}

function syntheticConversationId(): string {
  /* Cheap unique-enough id; the cascade only uses it for span attributes. */
  return `pitch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function runPitchCascade(
  input: PitchCascadeInput,
): Promise<PitchCascadeResult> {
  const conversationId = input.conversationId ?? syntheticConversationId();

  /* Pre-search via Tavily (replaces Anthropic native web_search). */
  let researchBlock = "";
  let researchSummary: string | undefined;
  if (input.useWebResearch && input.searchQuery && isTavilyConfigured()) {
    try {
      const research = await getQuickAnswer(input.searchQuery);
      if (research.answer) {
        researchSummary = research.answer;
        const sources = research.sources
          .slice(0, 3)
          .map((s) => `- ${s.title} — ${s.url}`)
          .join("\n");
        researchBlock = `\n\n<web_research>\n${research.answer}${sources ? `\n\nSources:\n${sources}` : ""}\n</web_research>`;
      }
    } catch {
      /* Research is best-effort; never blocks the LLM call. */
    }
  }

  /* Compose the cascade message: system framing + (optional) research +
   * the prompt itself. The cascade interface takes a single `message`
   * field; we collapse system + user into one structured prompt so the
   * existing intent-keyed routing still applies. */
  const composedMessage = [
    `<system>\n${input.systemPrompt}\n</system>`,
    `<user>\n${input.userPrompt}${researchBlock}\n</user>`,
  ].join("\n\n");

  /* Track J — vertical resolution. Explicit takes precedence over
   * detection; either feeds the cascade for system-prompt augmentation. */
  const vertical: VerticalId | undefined =
    input.vertical ?? detectVerticalFromIndustry(input.industry) ?? undefined;

  const result = await runModelCascade({
    conversationId,
    message: composedMessage,
    intent: input.intent,
    recalledContext: [],
    integrationSnapshot: {},
    vertical,
  });

  return {
    text: result.text,
    providerId: result.providerId,
    modelId: result.modelId,
    attempts: result.attempts,
    runtimeMode: result.runtimeMode,
    researchSummary,
  };
}
