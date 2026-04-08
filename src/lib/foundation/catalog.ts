import type { IntegrationGroup, ProviderId } from "@/lib/foundation/types";

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
      "Email, CRM, search, telephony, durable execution, and avatar vendors are represented as first-class readiness surfaces so final-stack systems can be added without restructuring the app.",
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
    label: "Claude Sonnet 4.6",
    envKey: "ANTHROPIC_API_KEY",
    modelKey: "ANTHROPIC_MODEL_PRIMARY",
    defaultModel: "claude-sonnet-4-6",
    priority: 2,
    purpose: "Primary city evaluator, report generation, and agentic workflows.",
  },
  {
    id: "openai",
    label: "GPT-5.4 Pro",
    envKey: "OPENAI_API_KEY",
    modelKey: "OPENAI_MODEL_PRIMARY",
    defaultModel: "gpt-5.4-pro",
    priority: 3,
    purpose: "Secondary evaluator and multimodal execution support.",
  },
  {
    id: "google",
    label: "Gemini 3.1 Pro",
    envKey: "GOOGLE_GENERATIVE_AI_API_KEY",
    modelKey: "GOOGLE_MODEL_PRIMARY",
    defaultModel: "gemini-3.1-pro",
    priority: 1,
    purpose: "Biographical/paragraphical extraction, massive context, Google Search integration.",
  },
  {
    id: "xai",
    label: "Grok 4",
    envKey: "XAI_API_KEY",
    modelKey: "XAI_MODEL_PRIMARY",
    defaultModel: "grok-4",
    priority: 5,
    purpose: "Math/equations specialist and real-time X/Twitter data.",
  },
  {
    id: "perplexity",
    label: "Perplexity Sonar Reasoning Pro",
    envKey: "PERPLEXITY_API_KEY",
    modelKey: "PERPLEXITY_MODEL_PRIMARY",
    defaultModel: "sonar-reasoning-pro",
    priority: 6,
    purpose: "Module questionnaires, search-grounded reasoning, fact verification with citations.",
  },
  {
    id: "mistral",
    label: "Mistral Large",
    envKey: "MISTRAL_API_KEY",
    modelKey: "MISTRAL_MODEL_PRIMARY",
    defaultModel: "mistral-large-latest",
    priority: 7,
    purpose: "Multilingual reasoning for international clients.",
  },
  {
    id: "groq",
    label: "Groq LPU",
    envKey: "GROQ_API_KEY",
    modelKey: "GROQ_MODEL_PRIMARY",
    defaultModel: "llama-3.3-70b-versatile",
    priority: 4,
    purpose: "LPU inference for near-instant responses. Ultra-low latency fallback.",
  },
  {
    id: "tavily",
    label: "Tavily",
    envKey: "TAVILY_API_KEY",
    modelKey: "TAVILY_API_KEY", // Tavily uses API key directly, no model selection
    defaultModel: "tavily-search",
    priority: 8,
    purpose: "Web research MCP - real-time search with agent-friendly structured output.",
  },
  {
    id: "anthropic_judge",
    label: "Claude Opus 4.6 (Cristiano™ Judge)",
    envKey: "ANTHROPIC_API_KEY",
    modelKey: "ANTHROPIC_MODEL_JUDGE",
    defaultModel: "claude-opus-4-6",
    priority: 9,
    purpose: "THE JUDGE - Final verdict on city match, financial packages, LifeScore decisions. Unilateral only.",
  },
];

export type IntegrationCatalogEntry = {
  id: string;
  label: string;
  group: IntegrationGroup;
  requiredKeys: string[];
  optionalKeys?: string[];
  purpose: string;
};

export const INTEGRATION_CATALOG: IntegrationCatalogEntry[] = [
  {
    id: "supabase",
    label: "Supabase",
    group: "platform",
    requiredKeys: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    purpose: "Conversation storage, pgvector memory, and backend persistence.",
  },
  {
    id: "mem0",
    label: "Mem0",
    group: "platform",
    requiredKeys: ["MEM0_API_KEY"],
    purpose: "Cross-session personalization layer.",
  },
  {
    id: "composio",
    label: "Composio",
    group: "platform",
    requiredKeys: ["COMPOSIO_API_KEY"],
    purpose: "Future tool-use and integration execution layer.",
  },
  {
    id: "tavily",
    label: "Tavily",
    group: "search",
    requiredKeys: ["TAVILY_API_KEY"],
    purpose: "Search-grounded web retrieval for the model cascade.",
  },
  {
    id: "nylas",
    label: "Nylas",
    group: "ops",
    requiredKeys: ["NYLAS_API_KEY"],
    purpose: "Unified inbox and calendar workflows.",
  },
  {
    id: "resend",
    label: "Resend",
    group: "ops",
    requiredKeys: ["RESEND_API_KEY"],
    purpose: "Transactional email delivery.",
  },
  {
    id: "instantly",
    label: "Instantly.ai",
    group: "ops",
    requiredKeys: ["INSTANTLY_API_KEY"],
    purpose: "Outbound email sequencing.",
  },
  {
    id: "hubspot",
    label: "HubSpot",
    group: "ops",
    requiredKeys: ["HUBSPOT_ACCESS_TOKEN"],
    purpose: "CRM sync for leads, contacts, and pipeline state.",
  },
  {
    id: "clues_london_calendar",
    label: "CLUES London Calendar",
    group: "platform",
    requiredKeys: ["CLUES_LONDON_BASE_URL", "CLUES_LONDON_INTERNAL_API_KEY"],
    purpose:
      "Private server-to-server calendar adapter so Olivia can wrap the London calendar natively without duplicating the subsystem.",
  },
  {
    id: "twilio",
    label: "Twilio",
    group: "telephony",
    requiredKeys: ["TWILIO_ACCOUNT_SID", "TWILIO_PHONE_NUMBER"],
    optionalKeys: [
      "TWILIO_AUTH_TOKEN",
      "TWILIO_API_KEY",
      "TWILIO_API_SECRET",
      "TWILIO_MESSAGING_SERVICE_SID",
      "TWILIO_CONVERSATION_RELAY_URL",
      "TWILIO_STATUS_CALLBACK_URL",
      "TWILIO_RECORDING_CALLBACK_URL",
    ],
    purpose: "Canonical telephony backbone for numbers, SMS, SIP, and callbacks.",
  },
  {
    id: "livekit",
    label: "LiveKit",
    group: "avatar",
    requiredKeys: ["LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"],
    purpose: "Realtime browser transport for voice and avatar sessions.",
  },
  {
    id: "simli",
    label: "Simli",
    group: "avatar",
    requiredKeys: ["SIMLI_API_KEY"],
    purpose: "Primary realtime avatar runtime for Olivia.",
  },
  {
    id: "heygen",
    label: "HeyGen",
    group: "avatar",
    requiredKeys: ["HEYGEN_API_KEY"],
    purpose: "Fallback avatar and async branded video generation.",
  },
  {
    id: "did",
    label: "D-ID",
    group: "avatar",
    requiredKeys: ["DID_API_KEY"],
    purpose: "Fallback interactive avatar and async video surface.",
  },
  {
    id: "replicate",
    label: "Replicate",
    group: "avatar",
    requiredKeys: ["REPLICATE_API_TOKEN"],
    purpose: "Model-hosted avatar workflows such as SadTalker judge surfaces.",
  },
  {
    id: "elevenlabs",
    label: "ElevenLabs",
    group: "avatar",
    requiredKeys: ["ELEVENLABS_API_KEY"],
    purpose: "Persona voice synthesis for Olivia, Cristiano, and Emelia.",
  },
  {
    id: "trigger",
    label: "Trigger.dev",
    group: "execution",
    requiredKeys: ["TRIGGER_SECRET_KEY"],
    optionalKeys: ["TRIGGER_API_URL"],
    purpose: "Durable execution for long-running jobs and scheduled work.",
  },
  {
    id: "langfuse",
    label: "Langfuse",
    group: "observability",
    requiredKeys: ["LANGFUSE_PUBLIC_KEY", "LANGFUSE_SECRET_KEY"],
    optionalKeys: ["LANGFUSE_BASE_URL"],
    purpose: "Tracing and production observability export.",
  },
];
