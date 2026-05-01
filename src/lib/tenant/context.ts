/**
 * Tenant Context & Isolation
 * Sprint 5.1 — Tenant Architecture (Item 2: Tenant Isolation)
 *
 * Provides request-scoped tenant context using AsyncLocalStorage.
 * All database queries automatically filter by tenant when context is active.
 *
 * Usage:
 * ```typescript
 * // In middleware or API route
 * await withTenantContext(tenantId, async () => {
 *   // All queries here are automatically scoped to this tenant
 *   const conversations = await getConversations(); // Returns only tenant's data
 * });
 *
 * // Get current context anywhere
 * const ctx = getTenantContext();
 * if (ctx) {
 *   console.log(`Operating as tenant: ${ctx.tenant.name}`);
 * }
 * ```
 */

import { AsyncLocalStorage } from "async_hooks";
import { createHash, randomBytes } from "crypto";

import type {
  Tenant,
  TenantMember,
  TenantContext,
  TenantTier,
  MemberRole,
  AdapterType,
  ModelIntent,
  ModelSelection,
  TenantPolicy,
  TIER_LIMITS,
} from "./types";

// ─── Async Local Storage for Request-Scoped Context ───────────────────────────

const tenantStorage = new AsyncLocalStorage<TenantContext>();

/**
 * Get the current tenant context.
 * Returns null if not inside a tenant-scoped execution.
 */
export function getTenantContext(): TenantContext | null {
  return tenantStorage.getStore() ?? null;
}

/**
 * Get the current tenant context or throw.
 * Use when tenant context is required.
 */
export function requireTenantContext(): TenantContext {
  const ctx = getTenantContext();
  if (!ctx) {
    throw new TenantContextError("No tenant context available. Wrap call in withTenantContext().");
  }
  return ctx;
}

/**
 * Get the current tenant ID or null.
 * Convenience method for simple isolation checks.
 */
export function getCurrentTenantId(): string | null {
  return getTenantContext()?.tenant.id ?? null;
}

/**
 * Get the current tenant ID or throw.
 */
export function requireCurrentTenantId(): string {
  const id = getCurrentTenantId();
  if (!id) {
    throw new TenantContextError("No tenant context available.");
  }
  return id;
}

/**
 * Execute a function within a tenant context.
 * All code executed within the callback has access to the tenant context.
 */
export async function withTenantContext<T>(
  context: TenantContext,
  fn: () => Promise<T>
): Promise<T> {
  return tenantStorage.run(context, fn);
}

/**
 * Execute a function within a tenant context (sync version).
 */
export function withTenantContextSync<T>(
  context: TenantContext,
  fn: () => T
): T {
  return tenantStorage.run(context, fn);
}

// ─── Tenant Context Builder ───────────────────────────────────────────────────

/**
 * Build a full tenant context from database records.
 * This is called by middleware after resolving the tenant.
 */
export function buildTenantContext(params: {
  tenant: Tenant;
  member: TenantMember | null;
  configs: Array<{ key: string; value: string; valueType: string }>;
  adapterOverrides: Array<{ adapterType: AdapterType; adapterName: string; priority: number; isEnabled: boolean }>;
  modelOverrides: Array<{
    intent: ModelIntent;
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;
    priority: number;
    isEnabled: boolean;
    fallbackModel: string | null;
  }>;
  policies: TenantPolicy[];
}): TenantContext {
  const { tenant, member, configs, adapterOverrides, modelOverrides, policies } = params;

  // Build config map with type coercion
  const configMap: Record<string, unknown> = {};
  for (const c of configs) {
    configMap[c.key] = coerceConfigValue(c.value, c.valueType);
  }

  // Build adapter selections (highest priority enabled adapter per type)
  const adapters: Record<AdapterType, string | null> = {
    calendar: null,
    crm: null,
    email: null,
    voice: null,
    avatar: null,
    realtime: null,
    search: null,
    storage: null,
  };
  for (const ao of adapterOverrides.filter(a => a.isEnabled).sort((a, b) => b.priority - a.priority)) {
    if (adapters[ao.adapterType] === null) {
      adapters[ao.adapterType] = ao.adapterName;
    }
  }

  // Build model selections (highest priority enabled model per intent)
  const defaultModelSelection: ModelSelection = {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    temperature: 0.7,
    maxTokens: 4096,
    fallbackModel: null,
  };

  const models: Record<ModelIntent, ModelSelection> = {
    general: { ...defaultModelSelection },
    planning: { ...defaultModelSelection },
    research: { ...defaultModelSelection, provider: "perplexity", model: "sonar-reasoning-pro" },
    operations: { ...defaultModelSelection, provider: "openai", model: "gpt-4o" },
    math: { ...defaultModelSelection, provider: "xai", model: "grok-2" },
    judge: { ...defaultModelSelection, model: "claude-opus-4-20250514", temperature: 0.3 },
    questionnaire: { ...defaultModelSelection, provider: "perplexity", model: "sonar-reasoning-pro" },
    extraction: { ...defaultModelSelection, provider: "google", model: "gemini-2.0-flash" },
  };

  for (const mo of modelOverrides.filter(m => m.isEnabled).sort((a, b) => b.priority - a.priority)) {
    if (mo.intent in models) {
      models[mo.intent as ModelIntent] = {
        provider: mo.provider as ModelSelection["provider"],
        model: mo.model,
        temperature: mo.temperature,
        maxTokens: mo.maxTokens,
        fallbackModel: mo.fallbackModel,
      };
    }
  }

  // Group policies by type
  const approvalRules = policies.filter(p => p.policyType === "approval_rule" && p.isEnabled);
  const rateLimits = policies.filter(p => p.policyType === "rate_limit" && p.isEnabled);
  const featureAccess = policies.filter(p => p.policyType === "feature_access" && p.isEnabled);
  const dataResidency = policies.find(p => p.policyType === "data_residency" && p.isEnabled) ?? null;

  return {
    tenant,
    member,
    config: configMap,
    adapters,
    models,
    policies: {
      approvalRules,
      rateLimits,
      featureAccess,
      dataResidency,
    },
  };
}

function coerceConfigValue(value: string, valueType: string): unknown {
  switch (valueType) {
    case "number":
      return parseFloat(value);
    case "boolean":
      return value === "true" || value === "1";
    case "json":
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    default:
      return value;
  }
}

// ─── Permission Checks ────────────────────────────────────────────────────────

/**
 * Check if the current member has a specific role or higher.
 */
export function hasRole(requiredRole: MemberRole): boolean {
  const ctx = getTenantContext();
  if (!ctx?.member) return false;

  const roleHierarchy: MemberRole[] = ["viewer", "member", "admin", "owner"];
  const memberRoleIndex = roleHierarchy.indexOf(ctx.member.role);
  const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);

  return memberRoleIndex >= requiredRoleIndex;
}

/**
 * Check if the current tenant has access to a specific feature.
 */
export function hasFeature(feature: string): boolean {
  const ctx = getTenantContext();
  if (!ctx) return false;

  // Check tier-based features
  const tierFeatures = getTierFeatures(ctx.tenant.tier);
  if (tierFeatures.includes(feature)) return true;

  // Check policy-based feature grants
  for (const policy of ctx.policies.featureAccess) {
    if (policy.features.includes(feature)) return true;
  }

  return false;
}

function getTierFeatures(tier: TenantTier): string[] {
  const tierLimits: Record<TenantTier, string[]> = {
    starter: ["chat", "basic_reports"],
    professional: ["chat", "basic_reports", "voice", "custom_branding", "api_access"],
    enterprise: ["chat", "basic_reports", "voice", "custom_branding", "api_access", "sso", "audit_logs", "custom_models", "dedicated_support"],
    white_label: ["chat", "basic_reports", "voice", "custom_branding", "api_access", "sso", "audit_logs", "custom_models", "dedicated_support", "white_label", "custom_domain", "reseller"],
  };
  return tierLimits[tier] ?? [];
}

/**
 * Check if an action requires approval based on tenant policies.
 */
export function requiresApproval(actionType: string, confidenceScore: number): boolean {
  const ctx = getTenantContext();
  if (!ctx) return false;

  for (const rule of ctx.policies.approvalRules) {
    const actionTypes = (rule.config as { actionTypes?: string[] }).actionTypes ?? [];
    if (actionTypes.includes(actionType) || actionTypes.includes("*")) {
      if (rule.approvalThreshold !== null && confidenceScore < rule.approvalThreshold) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get the allowed data regions for the current tenant.
 */
export function getAllowedRegions(): string[] {
  const ctx = getTenantContext();
  if (!ctx?.policies.dataResidency) return ["us", "eu", "uk", "ap"]; // Default: all regions
  return ctx.policies.dataResidency.allowedRegions;
}

// ─── API Key Utilities ────────────────────────────────────────────────────────

/**
 * Generate a new API key.
 * Returns the full key (to show user once) and the hash (to store).
 */
export function generateApiKey(prefix: string = "sk_live"): { key: string; hash: string; keyPrefix: string } {
  const randomPart = randomBytes(24).toString("base64url");
  const key = `${prefix}_${randomPart}`;
  const hash = hashApiKey(key);
  return { key, hash, keyPrefix: key.substring(0, 12) };
}

/**
 * Hash an API key for storage.
 */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Verify an API key against a stored hash.
 */
export function verifyApiKey(key: string, storedHash: string): boolean {
  const keyHash = hashApiKey(key);
  // Constant-time comparison to prevent timing attacks
  if (keyHash.length !== storedHash.length) return false;
  let result = 0;
  for (let i = 0; i < keyHash.length; i++) {
    result |= keyHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return result === 0;
}

// ─── Isolation Helpers ────────────────────────────────────────────────────────

/**
 * Build a WHERE clause for tenant isolation.
 * Use in raw queries when Prisma doesn't support the pattern.
 */
export function tenantWhereClause(columnName: string = "tenant_id"): string {
  const tenantId = getCurrentTenantId();
  if (!tenantId) {
    throw new TenantContextError("Cannot build tenant WHERE clause without context.");
  }
  return `${columnName} = '${tenantId}'`;
}

/**
 * Add tenant_id to an object for insertion.
 */
export function withTenantId<T extends Record<string, unknown>>(data: T): T & { tenant_id: string } {
  const tenantId = requireCurrentTenantId();
  return { ...data, tenant_id: tenantId };
}

// ─── Error Types ──────────────────────────────────────────────────────────────

export class TenantContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantContextError";
  }
}

export class TenantAccessDeniedError extends Error {
  constructor(message: string = "Access denied") {
    super(message);
    this.name = "TenantAccessDeniedError";
  }
}

export class TenantLimitExceededError extends Error {
  public readonly limitType: string;
  public readonly current: number;
  public readonly max: number;

  constructor(limitType: string, current: number, max: number) {
    super(`Tenant limit exceeded: ${limitType} (${current}/${max})`);
    this.name = "TenantLimitExceededError";
    this.limitType = limitType;
    this.current = current;
    this.max = max;
  }
}
