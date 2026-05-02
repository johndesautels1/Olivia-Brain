import { z } from "zod";

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

const optionalSecret = z.preprocess(emptyToUndefined, z.string().optional());
const optionalUrl = z.preprocess(
  emptyToUndefined,
  z.string().url().optional(),
);

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_NAME: z.string().default("Olivia Brain"),
  NEXT_PUBLIC_APP_URL: optionalUrl,
  ADMIN_API_KEY: optionalSecret,
  APP_AI_MODE: z.enum(["auto", "mock", "live"]).default("auto"),

  SUPABASE_URL: optionalUrl,
  SUPABASE_SERVICE_ROLE_KEY: optionalSecret,

  ANTHROPIC_API_KEY: optionalSecret,
  ANTHROPIC_MODEL_PRIMARY: z.string().default("claude-sonnet-4-6"),
  ANTHROPIC_MODEL_JUDGE: z.string().default("claude-opus-4-6"),

  OPENAI_API_KEY: optionalSecret,
  OPENAI_MODEL_PRIMARY: z.string().default("gpt-5.4-pro"),
  OPENAI_MODEL_REASONING: z.string().default("gpt-5.4-pro"),

  GOOGLE_GENERATIVE_AI_API_KEY: optionalSecret,
  GOOGLE_MODEL_PRIMARY: z.string().default("gemini-3.1-pro"),

  XAI_API_KEY: optionalSecret,
  XAI_MODEL_PRIMARY: z.string().default("grok-4"),

  PERPLEXITY_API_KEY: optionalSecret,
  PERPLEXITY_MODEL_PRIMARY: z.string().default("sonar-reasoning-pro"),

  MISTRAL_API_KEY: optionalSecret,
  MISTRAL_MODEL_PRIMARY: z.string().default("mistral-large-latest"),

  GROQ_API_KEY: optionalSecret,
  GROQ_MODEL_PRIMARY: z.string().default("llama-3.3-70b-versatile"),

  TAVILY_API_KEY: optionalSecret,
  MEM0_API_KEY: optionalSecret,

  // Relocation Data Layer APIs (Sprint 3.4)
  GOOGLE_PLACES_API_KEY: optionalSecret,
  WALKSCORE_API_KEY: optionalSecret,
  OPEN_EXCHANGE_RATES_APP_ID: optionalSecret,
  TRAVEL_BUDDY_API_KEY: optionalSecret,
  CRIMEOMETER_API_KEY: optionalSecret,
  SCHOOLDIGGER_API_KEY: optionalSecret,
  SCHOOLDIGGER_APP_ID: optionalSecret,

  // Environmental Data Layer APIs (Sprint 3.5)
  AIRNOW_API_KEY: optionalSecret,
  HOWLOUD_API_KEY: optionalSecret,
  OPENWEATHERMAP_API_KEY: optionalSecret,

  // Report Generation (Sprint 3.7)
  GAMMA_API_KEY: optionalSecret,

  // Real Estate Data Layer APIs (Sprint 3.3)
  MLS_RESO_BASE_URL: optionalUrl,
  MLS_RESO_BEARER_TOKEN: optionalSecret,
  MLS_RESO_API_KEY: optionalSecret,
  BRIDGE_API_KEY: optionalSecret,
  HOUSECANARY_API_KEY: optionalSecret,
  HOUSECANARY_API_SECRET: optionalSecret,
  BATCHDATA_API_KEY: optionalSecret,
  PROPERTYRADAR_API_TOKEN: optionalSecret,
  PLUNK_API_KEY: optionalSecret,
  RENTCAST_API_KEY: optionalSecret,
  REGRID_API_KEY: optionalSecret,

  // RAG Pipeline APIs (Sprint 3.6)
  FIRECRAWL_API_KEY: optionalSecret,
  UNSTRUCTURED_API_KEY: optionalSecret,
  COHERE_API_KEY: optionalSecret,
  JINA_API_KEY: optionalSecret,
  COMPOSIO_API_KEY: optionalSecret,
  NYLAS_API_KEY: optionalSecret,
  RESEND_API_KEY: optionalSecret,
  INSTANTLY_API_KEY: optionalSecret,
  HUBSPOT_ACCESS_TOKEN: optionalSecret,
  CLUES_LONDON_BASE_URL: optionalUrl,
  CLUES_LONDON_INTERNAL_API_KEY: optionalSecret,

  TWILIO_ACCOUNT_SID: optionalSecret,
  TWILIO_AUTH_TOKEN: optionalSecret,
  TWILIO_API_KEY: optionalSecret,
  TWILIO_API_SECRET: optionalSecret,
  TWILIO_PHONE_NUMBER: optionalSecret,
  TWILIO_MESSAGING_SERVICE_SID: optionalSecret,
  TWILIO_CONVERSATION_RELAY_URL: optionalUrl,
  TWILIO_STATUS_CALLBACK_URL: optionalUrl,
  TWILIO_RECORDING_CALLBACK_URL: optionalUrl,

  LIVEKIT_API_KEY: optionalSecret,
  LIVEKIT_API_SECRET: optionalSecret,
  VAPI_API_KEY: optionalSecret,
  RETELL_API_KEY: optionalSecret,

  SIMLI_API_KEY: optionalSecret,
  HEYGEN_API_KEY: optionalSecret,
  DID_API_KEY: optionalSecret,
  REPLICATE_API_TOKEN: optionalSecret,

  // LiveAvatar streaming (separate vendor from HeyGen async render).
  // See docs/HEYGEN_LTM_CONFIG.md for must-preserve contracts.
  LIVEAVATAR_API_KEY: optionalSecret,
  LIVEAVATAR_OLIVIA_AVATAR_ID: optionalSecret,

  ELEVENLABS_API_KEY: optionalSecret,
  // LTM-pinned voice ID for the LiveAvatar path. Distinct from ELEVENLABS_VOICE_OLIVIA
  // (which the multi-provider voice abstraction uses).
  ELEVENLABS_OLIVIA_VOICE_ID: z.string().default("rVk0ZvRulp6xrYJkGztP"),
  ELEVENLABS_VOICE_OLIVIA: z.string().default("21m00Tcm4TlvDq8ikWAM"),
  ELEVENLABS_VOICE_CRISTIANO: z.string().default("yoZ06aMxZJJ28mfd3POQ"),
  ELEVENLABS_VOICE_EMELIA: z.string().default("EXAVITQu4vr4xnSDxMaL"),

  DEEPGRAM_API_KEY: optionalSecret,

  OPENAI_TTS_MODEL: z.string().default("tts-1-hd"),
  OPENAI_TTS_VOICE: z.string().default("nova"),
  OPENAI_WHISPER_MODEL: z.string().default("whisper-1"),

  TRIGGER_SECRET_KEY: optionalSecret,
  TRIGGER_API_URL: optionalUrl,

  // Temporal (Sprint 4.4 — Crash-Proof Workflows)
  TEMPORAL_ADDRESS: optionalSecret,
  TEMPORAL_NAMESPACE: optionalSecret,

  // Evaluation & Observability (Sprint 4.5)
  BRAINTRUST_API_KEY: optionalSecret,
  PATRONUS_API_KEY: optionalSecret,
  CLEANLAB_API_KEY: optionalSecret,

  // CLUES Product Integration (Sprint 4.6)
  CLUES_INTELLIGENCE_API_KEY: optionalSecret,
  CLUES_INTELLIGENCE_BASE_URL: optionalUrl,
  CLUES_LIFESCORE_INTERNAL_API_KEY: optionalSecret,
  CLUES_LIFESCORE_BASE_URL: optionalUrl,
  STAY_OR_SELL_API_KEY: optionalSecret,
  STAY_OR_SELL_BASE_URL: optionalUrl,
  BROKERAGE_BASE_URL: optionalUrl,
  BROKERAGE_INTERNAL_API_KEY: optionalSecret,

  LANGFUSE_PUBLIC_KEY: optionalSecret,
  LANGFUSE_SECRET_KEY: optionalSecret,
  LANGFUSE_BASE_URL: z.string().url().default("https://cloud.langfuse.com"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | undefined;

export function getServerEnv() {
  if (!cachedEnv) {
    cachedEnv = serverEnvSchema.parse(process.env);
  }

  return cachedEnv;
}
