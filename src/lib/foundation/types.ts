export type ProviderId =
  | "anthropic"
  | "anthropic_judge"
  | "openai"
  | "google"
  | "xai"
  | "perplexity"
  | "mistral"
  | "groq"
  | "tavily";

export type RouteIntent = "planning" | "research" | "operations" | "general" | "questionnaire" | "math" | "judge";
export type RuntimeMode = "mock" | "live";
export type StatusLevel = "configured" | "missing";
export type IntegrationGroup =
  | "platform"
  | "search"
  | "ops"
  | "telephony"
  | "avatar"
  | "execution"
  | "observability";

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
  group: IntegrationGroup;
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

/** Per-tool-dispatch entry on a FoundationTrace. Track O Session O1.
 *  Logs dispatch decisions (auto-approved / pending / rejected) without
 *  ever putting tool argument PII into the trace — only metadata. */
export interface ToolCallTrace {
  /** Stable tool id (e.g. "gmail.send", "calendar.create"). */
  toolName: string;
  /** Action verb portion of `toolName` ("send" / "create" / "read"). */
  actionName: string;
  /** Approval-gate decision after the confidence + risk evaluation. */
  decision: "auto_approved" | "pending_approval" | "executed" | "rejected" | "not_configured";
  /** Risk level the gate assigned. */
  riskLevel: "low" | "medium" | "high" | "critical";
  /** Confidence the dispatcher computed (0.0–1.0). */
  confidenceScore: number;
  /** Approval id when the dispatch parked for human review. */
  pendingApprovalId?: string;
  /** Whether the underlying Composio call succeeded (only meaningful when
   *  decision === "executed" or "auto_approved"). */
  success?: boolean;
  /** Wall-clock duration of the dispatch attempt in ms. */
  durationMs: number;
  /** Sanitized error name when dispatch failed (no PII). */
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
  /** Optional tool-dispatch trail for the turn. Empty / undefined means no
   *  tools fired. Track O Session O1. */
  toolCalls?: ToolCallTrace[];
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
