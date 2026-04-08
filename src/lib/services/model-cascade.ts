import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { mistral } from "@ai-sdk/mistral";
import { openai } from "@ai-sdk/openai";
import { perplexity } from "@ai-sdk/perplexity";
import { xai } from "@ai-sdk/xai";
import { generateText, type LanguageModel } from "ai";

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

interface CascadeInput {
  conversationId: string;
  message: string;
  intent: RouteIntent;
  forceMock?: boolean;
  recalledContext: string[];
  integrationSnapshot: Record<string, StatusLevel>;
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
      }
    },
  }));
}

function providerOrderForIntent(intent: RouteIntent): ProviderId[] {
  switch (intent) {
    case "planning":
      return ["anthropic", "openai", "google", "mistral", "xai", "perplexity"];
    case "research":
      return ["perplexity", "google", "anthropic", "openai", "xai", "mistral"];
    case "operations":
      return ["anthropic", "openai", "google", "mistral", "perplexity", "xai"];
    default:
      return ["anthropic", "openai", "google", "xai", "mistral", "perplexity"];
  }
}

function buildSystemPrompt(intent: RouteIntent) {
  const intentBrief =
    intent === "planning"
      ? "You are operating as an architecture and implementation lead."
      : intent === "research"
        ? "You are operating as a research and synthesis lead."
        : intent === "operations"
          ? "You are operating as an operations lead for CRM, email, and workflow readiness."
          : "You are operating as the executive assistant brain for a modular AI platform.";

  return [
    "You are Olivia Brain, the Phase 1 orchestration layer for CLUES.",
    intentBrief,
    "Respond with concrete implementation guidance, not generic motivation.",
    "If a provider or integration is not configured, say so plainly and continue with the best available path.",
    "Stay aligned to Phase 1 only: app shell, model routing, memory, orchestration, integrations, and observability.",
  ].join(" ");
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
            system: buildSystemPrompt(input.intent),
            prompt: buildPrompt(input),
            temperature: 0.3,
            maxOutputTokens: 900,
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
