export type ProviderId =
  | "anthropic"
  | "openai"
  | "google"
  | "xai"
  | "perplexity"
  | "mistral";

export type RouteIntent = "planning" | "research" | "operations" | "general";
export type RuntimeMode = "mock" | "live";
export type StatusLevel = "configured" | "missing";

export interface ProviderStatus {
  id: ProviderId;
  label: string;
  modelId: string;
  configured: boolean;
  priority: number;
  purpose: string;
}

export interface IntegrationStatus {
  id: string;
  label: string;
  configured: boolean;
  status: StatusLevel;
  purpose: string;
}

export interface FoundationStatus {
  generatedAt: string;
  runtimeMode: RuntimeMode;
  appName: string;
  providers: ProviderStatus[];
  integrations: IntegrationStatus[];
  memory: {
    backend: "supabase" | "in-memory";
    vectorReady: boolean;
    personalizationReady: boolean;
  };
  observability: {
    backend: "langfuse" | "local-trace-store";
    ragasReady: boolean;
  };
  recommendedNextActions: string[];
}

export interface ProviderAttempt {
  providerId: ProviderId | "mock";
  modelId: string;
  success: boolean;
  durationMs: number;
  error?: string;
}

export interface FoundationTrace {
  id: string;
  createdAt: string;
  conversationId: string;
  intent: RouteIntent;
  runtimeMode: RuntimeMode;
  selectedProvider: ProviderId | "mock";
  selectedModel: string;
  attempts: ProviderAttempt[];
  recalledContext: string[];
  integrationSnapshot: Record<string, StatusLevel>;
  userMessage: string;
  responsePreview: string;
}

export interface ChatResponsePayload {
  conversationId: string;
  response: string;
  intent: RouteIntent;
  runtimeMode: RuntimeMode;
  provider: ProviderId | "mock";
  model: string;
  attempts: ProviderAttempt[];
  recalledContext: string[];
  traceId: string;
}
