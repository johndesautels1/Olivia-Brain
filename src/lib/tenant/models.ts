/**
 * Tenant Model Overrides
 * Sprint 5.1 — Tenant Architecture (Item 4: Per-Tenant Model Routing)
 *
 * Manages per-tenant LLM model preferences and routing.
 * Allows tenants to customize which models handle different intents.
 *
 * Example use cases:
 * - Enterprise tenant prefers GPT-4o for all intents
 * - White-label tenant uses only Anthropic models
 * - Tenant has custom fine-tuned model for extraction
 */

import { getPrisma } from "@/lib/db";

import type {
  TenantModelOverride,
  SetModelOverrideInput,
  ModelIntent,
  ModelProvider,
  ModelSelection,
} from "./types";
import { getTenantContext } from "./context";

// ─── Model Override CRUD ──────────────────────────────────────────────────────

/**
 * Set a model override for a tenant.
 */
export async function setModelOverride(
  tenantId: string,
  input: SetModelOverrideInput
): Promise<TenantModelOverride> {
  const prisma = getPrisma();

  const override = await prisma.tenant_model_overrides.upsert({
    where: {
      tenant_id_intent_provider_model: {
        tenant_id: tenantId,
        intent: input.intent,
        provider: input.provider,
        model: input.model,
      },
    },
    create: {
      tenant_id: tenantId,
      intent: input.intent,
      provider: input.provider,
      model: input.model,
      temperature: input.temperature ?? 0.7,
      max_tokens: input.maxTokens ?? 4096,
      is_enabled: input.isEnabled ?? true,
      priority: input.priority ?? 0,
      fallback_model: input.fallbackModel ?? null,
    },
    update: {
      temperature: input.temperature ?? 0.7,
      max_tokens: input.maxTokens ?? 4096,
      is_enabled: input.isEnabled ?? true,
      priority: input.priority ?? 0,
      fallback_model: input.fallbackModel ?? null,
      updated_at: new Date(),
    },
  });

  return mapModelOverride(override);
}

/**
 * Get all model overrides for a tenant.
 */
export async function getModelOverrides(tenantId: string): Promise<TenantModelOverride[]> {
  const prisma = getPrisma();

  const overrides = await prisma.tenant_model_overrides.findMany({
    where: { tenant_id: tenantId },
    orderBy: [{ intent: "asc" }, { priority: "desc" }],
  });

  return overrides.map(mapModelOverride);
}

/**
 * Get model overrides for a specific intent.
 */
export async function getModelOverridesByIntent(
  tenantId: string,
  intent: ModelIntent
): Promise<TenantModelOverride[]> {
  const prisma = getPrisma();

  const overrides = await prisma.tenant_model_overrides.findMany({
    where: { tenant_id: tenantId, intent },
    orderBy: { priority: "desc" },
  });

  return overrides.map(mapModelOverride);
}

/**
 * Delete a model override.
 */
export async function deleteModelOverride(
  tenantId: string,
  intent: ModelIntent,
  provider: ModelProvider,
  model: string
): Promise<void> {
  const prisma = getPrisma();

  await prisma.tenant_model_overrides.delete({
    where: {
      tenant_id_intent_provider_model: {
        tenant_id: tenantId,
        intent,
        provider,
        model,
      },
    },
  });
}

// ─── Model Resolution ─────────────────────────────────────────────────────────

/**
 * Resolve the model to use for a given intent.
 * Checks tenant overrides first, then falls back to system defaults.
 */
export function resolveModel(intent: ModelIntent): ModelSelection {
  const ctx = getTenantContext();

  // If in tenant context, use tenant's model selection
  if (ctx?.models[intent]) {
    return ctx.models[intent];
  }

  // Fall back to system default
  return getSystemDefaultModel(intent);
}

/**
 * Get the model selection from tenant context (if available) or system default.
 */
export function getModelForIntent(intent: ModelIntent): {
  provider: ModelProvider;
  model: string;
  temperature: number;
  maxTokens: number;
} {
  const selection = resolveModel(intent);
  return {
    provider: selection.provider,
    model: selection.model,
    temperature: selection.temperature,
    maxTokens: selection.maxTokens,
  };
}

// ─── System Defaults ──────────────────────────────────────────────────────────

/**
 * System default model configurations per intent.
 * Used when no tenant override exists.
 */
const SYSTEM_DEFAULT_MODELS: Record<ModelIntent, ModelSelection> = {
  general: {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    temperature: 0.7,
    maxTokens: 4096,
    fallbackModel: "gpt-4o",
  },
  planning: {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    temperature: 0.5,
    maxTokens: 8192,
    fallbackModel: "gpt-4o",
  },
  research: {
    provider: "perplexity",
    model: "sonar-reasoning-pro",
    temperature: 0.3,
    maxTokens: 4096,
    fallbackModel: "claude-sonnet-4-20250514",
  },
  operations: {
    provider: "openai",
    model: "gpt-4o",
    temperature: 0.7,
    maxTokens: 4096,
    fallbackModel: "claude-sonnet-4-20250514",
  },
  math: {
    provider: "xai",
    model: "grok-2",
    temperature: 0.2,
    maxTokens: 4096,
    fallbackModel: "gpt-4o",
  },
  judge: {
    provider: "anthropic",
    model: "claude-opus-4-20250514",
    temperature: 0.3,
    maxTokens: 8192,
    fallbackModel: null, // Judge has no fallback — it's authoritative
  },
  questionnaire: {
    provider: "perplexity",
    model: "sonar-reasoning-pro",
    temperature: 0.5,
    maxTokens: 4096,
    fallbackModel: "claude-sonnet-4-20250514",
  },
  extraction: {
    provider: "google",
    model: "gemini-2.0-flash",
    temperature: 0.2,
    maxTokens: 32768,
    fallbackModel: "claude-sonnet-4-20250514",
  },
};

function getSystemDefaultModel(intent: ModelIntent): ModelSelection {
  return SYSTEM_DEFAULT_MODELS[intent];
}

// ─── Model Registry ───────────────────────────────────────────────────────────

/**
 * Registry of all available models per provider.
 */
export const AVAILABLE_MODELS: Record<ModelProvider, ModelInfo[]> = {
  anthropic: [
    { id: "claude-opus-4-20250514", name: "Claude Opus 4", contextWindow: 200000, costPer1kInput: 0.015, costPer1kOutput: 0.075 },
    { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", contextWindow: 200000, costPer1kInput: 0.003, costPer1kOutput: 0.015 },
    { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", contextWindow: 200000, costPer1kInput: 0.0008, costPer1kOutput: 0.004 },
  ],
  openai: [
    { id: "gpt-4o", name: "GPT-4o", contextWindow: 128000, costPer1kInput: 0.005, costPer1kOutput: 0.015 },
    { id: "gpt-4o-mini", name: "GPT-4o Mini", contextWindow: 128000, costPer1kInput: 0.00015, costPer1kOutput: 0.0006 },
    { id: "o1", name: "o1", contextWindow: 200000, costPer1kInput: 0.015, costPer1kOutput: 0.06 },
    { id: "o1-mini", name: "o1-mini", contextWindow: 128000, costPer1kInput: 0.003, costPer1kOutput: 0.012 },
  ],
  google: [
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", contextWindow: 1000000, costPer1kInput: 0.0001, costPer1kOutput: 0.0004 },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", contextWindow: 2000000, costPer1kInput: 0.00125, costPer1kOutput: 0.005 },
  ],
  xai: [
    { id: "grok-2", name: "Grok 2", contextWindow: 131072, costPer1kInput: 0.002, costPer1kOutput: 0.01 },
    { id: "grok-2-mini", name: "Grok 2 Mini", contextWindow: 131072, costPer1kInput: 0.0002, costPer1kOutput: 0.001 },
  ],
  mistral: [
    { id: "mistral-large-latest", name: "Mistral Large", contextWindow: 128000, costPer1kInput: 0.002, costPer1kOutput: 0.006 },
    { id: "mistral-medium-latest", name: "Mistral Medium", contextWindow: 32000, costPer1kInput: 0.0027, costPer1kOutput: 0.0081 },
  ],
  perplexity: [
    { id: "sonar-reasoning-pro", name: "Sonar Reasoning Pro", contextWindow: 128000, costPer1kInput: 0.002, costPer1kOutput: 0.008 },
    { id: "sonar-pro", name: "Sonar Pro", contextWindow: 200000, costPer1kInput: 0.003, costPer1kOutput: 0.015 },
  ],
  groq: [
    { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", contextWindow: 128000, costPer1kInput: 0.00059, costPer1kOutput: 0.00079 },
    { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", contextWindow: 32768, costPer1kInput: 0.00024, costPer1kOutput: 0.00024 },
  ],
};

export interface ModelInfo {
  id: string;
  name: string;
  contextWindow: number;
  costPer1kInput: number;
  costPer1kOutput: number;
}

/**
 * Get available models for a provider.
 */
export function getAvailableModels(provider: ModelProvider): ModelInfo[] {
  return AVAILABLE_MODELS[provider] ?? [];
}

/**
 * Get all available providers.
 */
export function getAvailableProviders(): ModelProvider[] {
  return Object.keys(AVAILABLE_MODELS) as ModelProvider[];
}

/**
 * Validate that a model is valid for a provider.
 */
export function isValidModel(provider: ModelProvider, modelId: string): boolean {
  const models = AVAILABLE_MODELS[provider] ?? [];
  return models.some(m => m.id === modelId);
}

/**
 * Get model info by ID.
 */
export function getModelInfo(provider: ModelProvider, modelId: string): ModelInfo | null {
  const models = AVAILABLE_MODELS[provider] ?? [];
  return models.find(m => m.id === modelId) ?? null;
}

/**
 * Estimate cost for a given number of tokens.
 */
export function estimateCost(
  provider: ModelProvider,
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const info = getModelInfo(provider, modelId);
  if (!info) return 0;
  return (inputTokens / 1000) * info.costPer1kInput + (outputTokens / 1000) * info.costPer1kOutput;
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

function mapModelOverride(row: {
  id: string;
  tenant_id: string;
  intent: string;
  provider: string;
  model: string;
  temperature: number;
  max_tokens: number;
  is_enabled: boolean;
  priority: number;
  fallback_model: string | null;
  created_at: Date;
  updated_at: Date;
}): TenantModelOverride {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    intent: row.intent as ModelIntent,
    provider: row.provider as ModelProvider,
    model: row.model,
    temperature: row.temperature,
    maxTokens: row.max_tokens,
    isEnabled: row.is_enabled,
    priority: row.priority,
    fallbackModel: row.fallback_model,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
