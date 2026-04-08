import { getServerEnv } from "@/lib/config/env";
import {
  INTEGRATION_CATALOG,
  type IntegrationCatalogEntry,
  PROVIDER_CATALOG,
} from "@/lib/foundation/catalog";
import type {
  FoundationStatus,
  IntegrationStatus,
  ProviderStatus,
} from "@/lib/foundation/types";

export function getProviderStatuses(): ProviderStatus[] {
  const env = getServerEnv();

  return PROVIDER_CATALOG.map((provider) => {
    const apiKey = env[provider.envKey as keyof typeof env];
    const modelId = env[provider.modelKey as keyof typeof env];

    return {
      id: provider.id,
      label: provider.label,
      configured: Boolean(apiKey),
      modelId:
        typeof modelId === "string" && modelId.length > 0
          ? modelId
          : provider.defaultModel,
      priority: provider.priority,
      purpose: provider.purpose,
    };
  });
}

export function isEnvKeyConfigured(
  env: ReturnType<typeof getServerEnv>,
  key: string,
) {
  return Boolean(env[key as keyof typeof env]);
}

export function isIntegrationConfigured(
  integration: IntegrationCatalogEntry,
  env: ReturnType<typeof getServerEnv>,
) {
  if (integration.id === "twilio") {
    const hasBase =
      isEnvKeyConfigured(env, "TWILIO_ACCOUNT_SID") &&
      isEnvKeyConfigured(env, "TWILIO_PHONE_NUMBER");
    const hasAuth =
      isEnvKeyConfigured(env, "TWILIO_AUTH_TOKEN") ||
      (isEnvKeyConfigured(env, "TWILIO_API_KEY") &&
        isEnvKeyConfigured(env, "TWILIO_API_SECRET"));

    return hasBase && hasAuth;
  }

  return integration.requiredKeys.every((key) => isEnvKeyConfigured(env, key));
}

export function getIntegrationStatuses(): IntegrationStatus[] {
  const env = getServerEnv();

  return INTEGRATION_CATALOG.map((integration) => {
    const configured = isIntegrationConfigured(integration, env);

    return {
      id: integration.id,
      label: integration.label,
      group: integration.group,
      configured,
      status: configured ? "configured" : "missing",
      purpose: integration.purpose,
    };
  });
}

export function getFoundationStatus(): FoundationStatus {
  const env = getServerEnv();
  const providers = getProviderStatuses();
  const integrations = getIntegrationStatuses();

  const configuredProviders = providers.filter((provider) => provider.configured);
  const runtimeMode =
    env.APP_AI_MODE === "mock" || configuredProviders.length === 0 ? "mock" : "live";
  const supabaseConfigured = integrations.find(
    (integration) => integration.id === "supabase",
  )?.configured;
  const langfuseConfigured = integrations.find(
    (integration) => integration.id === "langfuse",
  )?.configured;
  const tavilyConfigured = integrations.find(
    (integration) => integration.id === "tavily",
  )?.configured;
  const twilioConfigured = integrations.find(
    (integration) => integration.id === "twilio",
  )?.configured;
  const triggerConfigured = integrations.find(
    (integration) => integration.id === "trigger",
  )?.configured;
  const avatarConfigured = integrations.some(
    (integration) =>
      integration.group === "avatar" && integration.configured,
  );

  const recommendedNextActions: string[] = [];

  if (!supabaseConfigured) {
    recommendedNextActions.push(
      "Configure Supabase to move memory and traces from in-memory mode into durable storage.",
    );
  }

  if (configuredProviders.length === 0) {
    recommendedNextActions.push(
      "Add at least one live model provider key to switch Olivia Brain out of mock mode.",
    );
  }

  if (!langfuseConfigured) {
    recommendedNextActions.push(
      "Wire Langfuse keys to export traces beyond the local development store.",
    );
  }

  if (!tavilyConfigured) {
    recommendedNextActions.push(
      "Add Tavily before research-heavy workflows land so search-grounded retrieval is part of the stack, not a later patch.",
    );
  }

  if (
    !integrations.find((integration) => integration.id === "hubspot")?.configured
  ) {
    recommendedNextActions.push(
      "Connect HubSpot before Phase 1 leaves the foundation stage so lead state is authoritative.",
    );
  }

  if (
    !integrations.find((integration) => integration.id === "clues_london_calendar")
      ?.configured
  ) {
    recommendedNextActions.push(
      "Connect the CLUES London calendar adapter so Olivia can present the in-house calendar as a native surface instead of forking that subsystem.",
    );
  }

  if (!twilioConfigured) {
    recommendedNextActions.push(
      "Add Twilio before Phase 2 so telephony remains the canonical carrier layer instead of becoming an afterthought.",
    );
  }

  if (!triggerConfigured) {
    recommendedNextActions.push(
      "Add Trigger.dev before long-running jobs and report generation work begin to avoid bolting durable execution on later.",
    );
  }

  if (!avatarConfigured) {
    recommendedNextActions.push(
      "Configure the first avatar vendor set, with Simli primary and HeyGen or D-ID fallback, before voice-and-avatar implementation starts.",
    );
  }

  return {
    generatedAt: new Date().toISOString(),
    runtimeMode,
    appName: env.NEXT_PUBLIC_APP_NAME,
    providers,
    integrations,
    memory: {
      backend: supabaseConfigured ? "supabase" : "in-memory",
      vectorReady: Boolean(supabaseConfigured),
      personalizationReady: Boolean(
        integrations.find((integration) => integration.id === "mem0")?.configured,
      ),
    },
    observability: {
      backend: langfuseConfigured ? "langfuse" : "local-trace-store",
      ragasReady: false,
    },
    recommendedNextActions,
  };
}
