import type { ProviderId } from "@/lib/foundation/types";

export const PHASE_ONE_PILLARS = [
  {
    title: "App Stack",
    detail:
      "Single Vercel-ready React + TypeScript application with server routes, a frontend shell, and a clean split between UI, orchestration, memory, and integration adapters.",
  },
  {
    title: "Core Brain",
    detail:
      "Model cascade with Anthropic, OpenAI, Google, xAI, Perplexity, and Mistral adapters behind one typed router. Runtime falls back to deterministic mock mode when keys are absent.",
  },
  {
    title: "Memory",
    detail:
      "Conversation memory runs against Supabase when configured and falls back to in-memory storage locally. Supabase migrations include pgvector-ready knowledge tables.",
  },
  {
    title: "Orchestration",
    detail:
      "LangGraph drives the request flow: hydrate runtime, recall context, classify intent, generate response, and persist turns plus traces.",
  },
  {
    title: "Integrations",
    detail:
      "Email, CRM, Composio, and observability are represented as first-class readiness surfaces so production keys can be added without restructuring the app.",
  },
];

export const PROVIDER_CATALOG: Array<{
  id: ProviderId;
  label: string;
  envKey: string;
  modelKey: string;
  defaultModel: string;
  priority: number;
  purpose: string;
}> = [
  {
    id: "anthropic",
    label: "Claude",
    envKey: "ANTHROPIC_API_KEY",
    modelKey: "ANTHROPIC_MODEL_PRIMARY",
    defaultModel: "claude-sonnet-4-6",
    priority: 1,
    purpose: "Primary planning, synthesis, and executive reasoning.",
  },
  {
    id: "openai",
    label: "OpenAI",
    envKey: "OPENAI_API_KEY",
    modelKey: "OPENAI_MODEL_PRIMARY",
    defaultModel: "gpt-4o",
    priority: 2,
    purpose: "General-purpose multimodal and execution support.",
  },
  {
    id: "google",
    label: "Google",
    envKey: "GOOGLE_GENERATIVE_AI_API_KEY",
    modelKey: "GOOGLE_MODEL_PRIMARY",
    defaultModel: "gemini-2.5-pro",
    priority: 3,
    purpose: "Large-context synthesis and research fallback.",
  },
  {
    id: "xai",
    label: "xAI",
    envKey: "XAI_API_KEY",
    modelKey: "XAI_MODEL_PRIMARY",
    defaultModel: "grok-4",
    priority: 4,
    purpose: "Alternative reasoning and rapid second opinion.",
  },
  {
    id: "perplexity",
    label: "Perplexity",
    envKey: "PERPLEXITY_API_KEY",
    modelKey: "PERPLEXITY_MODEL_PRIMARY",
    defaultModel: "sonar-reasoning-pro",
    priority: 5,
    purpose: "Research-oriented responses and search-grounded backup.",
  },
  {
    id: "mistral",
    label: "Mistral",
    envKey: "MISTRAL_API_KEY",
    modelKey: "MISTRAL_MODEL_PRIMARY",
    defaultModel: "mistral-large-latest",
    priority: 6,
    purpose: "Multilingual and cost-aware fallback.",
  },
];

export const INTEGRATION_CATALOG = [
  {
    id: "supabase",
    label: "Supabase",
    keys: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    purpose: "Conversation storage, pgvector memory, and backend persistence.",
  },
  {
    id: "mem0",
    label: "Mem0",
    keys: ["MEM0_API_KEY"],
    purpose: "Cross-session personalization layer.",
  },
  {
    id: "composio",
    label: "Composio",
    keys: ["COMPOSIO_API_KEY"],
    purpose: "Future tool-use and integration execution layer.",
  },
  {
    id: "nylas",
    label: "Nylas",
    keys: ["NYLAS_API_KEY"],
    purpose: "Unified inbox and calendar workflows.",
  },
  {
    id: "resend",
    label: "Resend",
    keys: ["RESEND_API_KEY"],
    purpose: "Transactional email delivery.",
  },
  {
    id: "instantly",
    label: "Instantly.ai",
    keys: ["INSTANTLY_API_KEY"],
    purpose: "Outbound email sequencing.",
  },
  {
    id: "hubspot",
    label: "HubSpot",
    keys: ["HUBSPOT_ACCESS_TOKEN"],
    purpose: "CRM sync for leads, contacts, and pipeline state.",
  },
  {
    id: "langfuse",
    label: "Langfuse",
    keys: ["LANGFUSE_PUBLIC_KEY", "LANGFUSE_SECRET_KEY"],
    purpose: "Tracing and production observability export.",
  },
];
