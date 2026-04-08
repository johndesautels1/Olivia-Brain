import { getServerEnv } from "@/lib/config/env";
import {
  INTEGRATION_CATALOG,
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

export function getIntegrationStatuses(): IntegrationStatus[] {
  const env = getServerEnv();

  return INTEGRATION_CATALOG.map((integration) => {
    const configured = integration.keys.every((key) =>
      Boolean(env[key as keyof typeof env]),
    );

    return {
      id: integration.id,
      label: integration.label,
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

  if (
    !integrations.find((integration) => integration.id === "hubspot")?.configured
  ) {
    recommendedNextActions.push(
      "Connect HubSpot before Phase 1 leaves the foundation stage so lead state is authoritative.",
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
