/**
 * OLIVIA BRAIN 9-MODEL CASCADE ARCHITECTURE
 * ==========================================
 *
 * ACTUAL FIRING ORDER (from Championship Stack):
 * ① Gemini 3.1 Pro    - Biographical/paragraphical extraction, massive context
 * ② Sonnet 4.6        - Primary city evaluator, report generation
 * ③ GPT-5.4 Pro       - Secondary evaluator, multimodal execution
 * ④ Gemini 3.1 Pro    - Verification pass with Google Search integration
 * ⑤ Grok 4            - Math/equations specialist ONLY
 * ⑥ Perplexity Sonar  - Module questionnaires + citations, fact verification
 * ⑦ Tavily            - Web research MCP, real-time search
 * ⑧ Opus 4.6          - CRISTIANO™ THE JUDGE - Final verdict (unilateral only)
 *
 * Mistral is used for multilingual reasoning when international clients are detected.
 *
 * The cascade supports both:
 * - Fallback mode: Try providers in order until one succeeds
 * - Pipeline mode: Each model has a specific role in multi-stage evaluation
 */

import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { mistral } from "@ai-sdk/mistral";
import { openai } from "@ai-sdk/openai";
import { perplexity } from "@ai-sdk/perplexity";
import { xai } from "@ai-sdk/xai";
import { generateText, type LanguageModel, type Tool } from "ai";

import { getServerEnv } from "@/lib/config/env";
import { getFoundationStatus, getProviderStatuses } from "@/lib/foundation/status";
import type {
  ProviderAttempt,
  ProviderId,
  RouteIntent,
  RuntimeMode,
  StatusLevel,
} from "@/lib/foundation/types";
import { withTraceSpan } from "@/lib/observability/tracer";
import { getVerticalAddendum } from "@/lib/orchestration/vertical-adapter";
import type { VerticalId } from "@/lib/quantara/metamorphic/vertical-types";

interface CascadeInput {
  conversationId: string;
  message: string;
  intent: RouteIntent;
  forceMock?: boolean;
  recalledContext: string[];
  integrationSnapshot: Record<string, StatusLevel>;
  /** Optional Vercel AI SDK tool registry. When provided, `generateText`
   *  is called with `tools` + `toolChoice: "auto"` so the LLM can request
   *  tool calls; the SDK loops up to `maxSteps` times, executing each
   *  tool's `execute` callback and feeding results back for narration.
   *  Track O Session O1. INTERIM: when Track G S19-S20 ports LTM's
   *  `lib/cascade/` orchestrator, this hook moves there. */
  tools?: Record<string, Tool>;
  /** Track J — optional vertical context. When set, the system prompt
   *  picks up a vertical-specific addendum (AI/SaaS / HealthTech /
   *  ClimateTech / PropTech) and the provider order may be biased
   *  toward providers that handle that vertical's diligence patterns
   *  better (e.g. Perplexity for HealthTech regulatory citations). */
  vertical?: VerticalId;
}

interface CascadeResult {
  text: string;
  providerId: ProviderId | "mock";
  modelId: string;
  attempts: ProviderAttempt[];
  runtimeMode: RuntimeMode;
}

interface ProviderBinding {
  id: ProviderId;
  configured: boolean;
  modelId: string;
  createModel: () => LanguageModel;
}

function buildProviderBindings(): ProviderBinding[] {
  const env = getServerEnv();
  const statuses = getProviderStatuses();

  return statuses.map((status) => ({
    id: status.id,
    configured: status.configured,
    modelId: status.modelId,
    createModel: () => {
      switch (status.id) {
        case "anthropic":
          return anthropic(env.ANTHROPIC_MODEL_PRIMARY);
        case "anthropic_judge":
          // Cristiano™ - THE JUDGE (Opus 4.6)
          return anthropic(env.ANTHROPIC_MODEL_JUDGE);
        case "openai":
          return openai(env.OPENAI_MODEL_PRIMARY);
        case "google":
          return google(env.GOOGLE_MODEL_PRIMARY);
        case "xai":
          return xai(env.XAI_MODEL_PRIMARY);
        case "perplexity":
          return perplexity(env.PERPLEXITY_MODEL_PRIMARY);
        case "mistral":
          return mistral(env.MISTRAL_MODEL_PRIMARY);
        case "groq":
          // Groq LPU - ultra-low latency inference
          return groq(env.GROQ_MODEL_PRIMARY);
        case "tavily":
          // Tavily is a search API, not a text generation model
          // It will be handled separately in the pipeline
          return anthropic(env.ANTHROPIC_MODEL_PRIMARY); // Fallback for type safety
      }
    },
  }));
}

/**
 * 9-MODEL CASCADE - PROVIDER ORDER BY INTENT
 *
 * The Championship Stack defines specific roles for each model:
 * - Gemini: Biographical/paragraphical extraction (first pass)
 * - Sonnet: Primary city evaluator, report generation
 * - GPT-5.4: Secondary evaluator
 * - Grok: Math/equations ONLY
 * - Perplexity: Questionnaires + citations
 * - Tavily: Web research (handled separately)
 * - Opus: THE JUDGE (final verdict)
 * - Mistral: Multilingual fallback
 */
function providerOrderForIntent(intent: RouteIntent): ProviderId[] {
  switch (intent) {
    // Questionnaire extraction starts with Gemini for paragraphical processing
    case "questionnaire":
      return ["google", "anthropic", "perplexity", "openai", "mistral", "xai"];

    // Math tasks go directly to Grok
    case "math":
      return ["xai", "openai", "google", "anthropic", "mistral", "perplexity"];

    // Research uses Perplexity for citations, then Gemini for context
    case "research":
      return ["perplexity", "google", "anthropic", "openai", "xai", "mistral"];

    // Planning uses Sonnet as primary, GPT as secondary
    case "planning":
      return ["anthropic", "openai", "google", "mistral", "xai", "perplexity"];

    // Operations: Sonnet → GPT → Gemini
    case "operations":
      return ["anthropic", "openai", "google", "mistral", "perplexity", "xai"];

    // Judge intent uses Opus (Cristiano™) - handled specially
    case "judge":
      return ["anthropic_judge", "anthropic", "openai", "google", "perplexity", "mistral"];

    // Default: 9-model cascade order
    // Gemini (extract) → Sonnet (evaluate) → GPT (secondary) → Grok (math) → Perplexity (citations)
    default:
      return ["google", "anthropic", "openai", "xai", "perplexity", "mistral"];
  }
}

function buildSystemPrompt(intent: RouteIntent, vertical?: VerticalId) {
  const intentBrief = (() => {
    switch (intent) {
      case "planning":
        return "You are operating as an architecture and implementation lead.";
      case "research":
        return "You are operating as a research and synthesis lead with citation-first retrieval.";
      case "operations":
        return "You are operating as an operations lead for CRM, email, and workflow readiness.";
      case "questionnaire":
        return "You are operating as the CLUES Questionnaire Engine, extracting biographical and preference data with Bayesian precision.";
      case "math":
        return "You are operating as the math and equations specialist. Focus exclusively on numerical calculations and quantitative analysis.";
      case "judge":
        return "You are Cristiano™, THE JUDGE. You provide final, authoritative verdicts on city match, financial packages, and LifeScore decisions. Your word is final. Be decisive.";
      default:
        return "You are operating as the executive assistant brain for a modular AI platform.";
    }
  })();

  /* Track J — vertical addendum (empty for "generic" / undefined). */
  const verticalAddendum =
    vertical && vertical !== "generic"
      ? getVerticalAddendum(vertical).systemPromptAddendum
      : "";

  return [
    "You are Olivia Brain, the intelligence and orchestration layer for the CLUES portfolio.",
    intentBrief,
    "Respond with concrete implementation guidance, not generic motivation.",
    "If a provider or integration is not configured, say so plainly and continue with the best available path.",
    "The avatar is the face, not the brain. Intelligence lives in this orchestration layer.",
    /* Track N N1+N3 manifest contract — when the response includes
       quantitative comparison (funding rounds, market sizes, valuation
       multiples, revenue trajectories, share splits, etc.) wrap it in
       a ```chart fence with a JSON spec; the UI renders it inline. */
    `When data is comparable across categories or across time, manifest it as a chart inline using a fenced \`\`\`chart code block containing JSON. The schema:`,
    `{ "type": "bar"|"line"|"area"|"pie", "title": string, "data": Array<{[x or name]: string, [seriesKey]: number}>, "x": string (bar/line/area), "value": string (pie), "name": string (pie), "series": [{"key": string, "label"?: string, "color"?: "aurum"|"aether"|"mint"|"sky"|"amber"|"coral"}] }`,
    "Use charts only when they clarify; never wrap qualitative answers in a chart. Format the rest of the answer as standard markdown (headings, lists, tables, blockquotes, fenced code). Inline backticks for short code/identifiers. Be concise.",
    /* Track N N5 — Gamma deck manifestation. When the response
       references or generates a Gamma deck, surface it as a preview
       card via a fenced ```gamma block. Bare URL or JSON object both
       work (`{ "url": string, "title"?: string, "summary"?: string,
       "slides"?: number }`). */
    "When you generate or reference a Gamma deck, surface the link as a fenced ```gamma block — either a bare URL or JSON `{ url, title?, summary?, slides? }`. The UI renders a preview card with an Open-in-Gamma action.",
    /* Track O O4 — citation-first RAG. When the response draws on
       web research, regulatory documents, or peer-reviewed sources,
       surface the source list as a `sources` fence so the UI can
       render a citation strip beneath the narrative. */
    "When citing external sources (Tavily research, Perplexity citations, regulatory documents, peer-reviewed studies), append a fenced ```sources block with a JSON array `[{ title: string, url: string, source?: string }]`. The UI renders a numbered citation strip; in-prose `[1]` / `[2]` references map to entries by position. Always include sources for factual claims sourced from web research.",
    verticalAddendum,
  ]
    .filter(Boolean)
    .join(" ");
}

function buildPrompt(input: CascadeInput) {
  const readiness = getFoundationStatus();
  const configuredIntegrations = readiness.integrations
    .filter((integration) => integration.configured)
    .map((integration) => integration.label);

  return [
    `Conversation ID: ${input.conversationId}`,
    `User request: ${input.message}`,
    input.recalledContext.length > 0
      ? `Recalled context:\n${input.recalledContext.map((item) => `- ${item}`).join("\n")}`
      : "Recalled context:\n- No prior context available yet.",
    configuredIntegrations.length > 0
      ? `Configured Phase 1 integrations:\n${configuredIntegrations.map((item) => `- ${item}`).join("\n")}`
      : "Configured Phase 1 integrations:\n- None yet. The foundation is still running with unconfigured external adapters.",
  ].join("\n\n");
}

function buildMockResponse(input: CascadeInput, attempts: ProviderAttempt[]): CascadeResult {
  const configuredProviders = getProviderStatuses().filter((provider) => provider.configured);
  const configuredProviderLabels = configuredProviders.map((provider) => provider.label);

  const sections = [
    `Phase 1 foundation is responding in mock mode for a ${input.intent} request.`,
    configuredProviderLabels.length > 0
      ? `Live provider keys exist for ${configuredProviderLabels.join(", ")}, but the request fell back to mock mode so the app can stay usable during setup.`
      : "No live model provider keys are configured yet, so the application is using a deterministic fallback instead of external LLM calls.",
    input.recalledContext.length > 0
      ? `Memory recall surfaced ${input.recalledContext.length} relevant prior turns, so the persistence path is already active.`
      : "No prior conversation context was available, which is expected for a new thread or an empty memory store.",
    `Your request was: "${input.message}"`,
  ];

  return {
    text: sections.join("\n\n"),
    providerId: "mock",
    modelId: "phase1-local-fallback",
    attempts,
    runtimeMode: "mock",
  };
}

export async function runModelCascade(input: CascadeInput): Promise<CascadeResult> {
  const foundationStatus = getFoundationStatus();
  const providers = buildProviderBindings();
  const orderedProviders = providerOrderForIntent(input.intent)
    .map((id) => providers.find((provider) => provider.id === id))
    .filter((provider): provider is ProviderBinding => Boolean(provider));
  const runtimeMode: RuntimeMode =
    input.forceMock || foundationStatus.runtimeMode === "mock" ? "mock" : "live";

  if (runtimeMode === "mock") {
    return buildMockResponse(input, []);
  }

  const attempts: ProviderAttempt[] = [];

  for (const provider of orderedProviders) {
    if (!provider.configured) {
      continue;
    }

    const startedAt = Date.now();

    try {
      const result = await withTraceSpan(
        "olivia.provider_call",
        {
          "olivia.provider": provider.id,
          "olivia.model": provider.modelId,
          "olivia.intent": input.intent,
        },
        async () =>
          generateText({
            model: provider.createModel(),
            system: buildSystemPrompt(input.intent, input.vertical),
            prompt: buildPrompt(input),
            temperature: 0.3,
            maxOutputTokens: 900,
            ...(input.tools ? { tools: input.tools, toolChoice: "auto", maxSteps: 3 } : {}),
          }),
      );

      attempts.push({
        providerId: provider.id,
        modelId: provider.modelId,
        success: true,
        durationMs: Date.now() - startedAt,
      });

      return {
        text: result.text,
        providerId: provider.id,
        modelId: provider.modelId,
        attempts,
        runtimeMode: "live",
      };
    } catch (error) {
      attempts.push({
        providerId: provider.id,
        modelId: provider.modelId,
        success: false,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "Unknown provider error",
      });
    }
  }

  return buildMockResponse(input, attempts);
}
