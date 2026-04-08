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
  APP_AI_MODE: z.enum(["auto", "mock", "live"]).default("auto"),

  SUPABASE_URL: optionalUrl,
  SUPABASE_SERVICE_ROLE_KEY: optionalSecret,

  ANTHROPIC_API_KEY: optionalSecret,
  ANTHROPIC_MODEL_PRIMARY: z.string().default("claude-sonnet-4-6"),
  ANTHROPIC_MODEL_JUDGE: z.string().default("claude-opus-4-6"),

  OPENAI_API_KEY: optionalSecret,
  OPENAI_MODEL_PRIMARY: z.string().default("gpt-4o"),
  OPENAI_MODEL_REASONING: z.string().default("gpt-5"),

  GOOGLE_GENERATIVE_AI_API_KEY: optionalSecret,
  GOOGLE_MODEL_PRIMARY: z.string().default("gemini-2.5-pro"),

  XAI_API_KEY: optionalSecret,
  XAI_MODEL_PRIMARY: z.string().default("grok-4"),

  PERPLEXITY_API_KEY: optionalSecret,
  PERPLEXITY_MODEL_PRIMARY: z.string().default("sonar-reasoning-pro"),

  MISTRAL_API_KEY: optionalSecret,
  MISTRAL_MODEL_PRIMARY: z.string().default("mistral-large-latest"),

  MEM0_API_KEY: optionalSecret,
  COMPOSIO_API_KEY: optionalSecret,
  NYLAS_API_KEY: optionalSecret,
  RESEND_API_KEY: optionalSecret,
  INSTANTLY_API_KEY: optionalSecret,
  HUBSPOT_ACCESS_TOKEN: optionalSecret,

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
