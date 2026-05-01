/**
 * Multi-Tenant Type Definitions
 * Sprint 5.1 — Tenant Architecture
 *
 * Type system for the multi-tenant architecture supporting:
 * - Tenant identity and membership
 * - Per-tenant configuration
 * - Per-tenant adapter selection
 * - Per-tenant model routing
 * - Per-tenant policies
 */

// ─── Tenant Core Types ────────────────────────────────────────────────────────

export type TenantStatus = "active" | "suspended" | "trial" | "churned";
export type TenantTier = "starter" | "professional" | "enterprise" | "white_label";
export type MemberRole = "owner" | "admin" | "member" | "viewer" | "api_only";
export type MemberStatus = "active" | "invited" | "suspended";

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  status: TenantStatus;
  tier: TenantTier;
  domain: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  timezone: string;
  locale: string;
  // Limits
  maxSeats: number;
  maxConversationsDay: number;
  maxTokensMonth: number;
  tokensUsedMonth: number;
  // Billing
  stripeCustomerId: string | null;
  billingEmail: string | null;
  trialEndsAt: Date | null;
  // Metadata
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantMember {
  id: string;
  tenantId: string;
  userId: string;
  email: string;
  role: MemberRole;
  status: MemberStatus;
  invitedBy: string | null;
  joinedAt: Date | null;
  lastActive: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTenantInput {
  slug: string;
  name: string;
  tier?: TenantTier;
  domain?: string;
  logoUrl?: string;
  primaryColor?: string;
  timezone?: string;
  locale?: string;
  billingEmail?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateTenantInput {
  name?: string;
  status?: TenantStatus;
  tier?: TenantTier;
  domain?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  timezone?: string;
  locale?: string;
  maxSeats?: number;
  maxConversationsDay?: number;
  maxTokensMonth?: number;
  billingEmail?: string | null;
  metadata?: Record<string, unknown>;
}

// ─── Tenant Configuration Types ───────────────────────────────────────────────

export type ConfigValueType = "string" | "number" | "boolean" | "json";

export interface TenantConfig {
  id: string;
  tenantId: string;
  key: string;
  value: string;
  valueType: ConfigValueType;
  isSecret: boolean;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SetConfigInput {
  key: string;
  value: string;
  valueType?: ConfigValueType;
  isSecret?: boolean;
  description?: string;
}

// ─── Adapter Override Types ───────────────────────────────────────────────────

export type AdapterType = "calendar" | "crm" | "email" | "voice" | "avatar" | "realtime" | "search" | "storage";

export interface TenantAdapterOverride {
  id: string;
  tenantId: string;
  adapterType: AdapterType;
  adapterName: string;
  isEnabled: boolean;
  priority: number;
  config: Record<string, unknown>;
  credentials: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SetAdapterOverrideInput {
  adapterType: AdapterType;
  adapterName: string;
  isEnabled?: boolean;
  priority?: number;
  config?: Record<string, unknown>;
  credentials?: Record<string, unknown>;
}

// ─── Model Override Types ─────────────────────────────────────────────────────

export type ModelIntent = "general" | "planning" | "research" | "operations" | "math" | "judge" | "questionnaire" | "extraction";
export type ModelProvider = "anthropic" | "openai" | "google" | "xai" | "mistral" | "perplexity" | "groq";

export interface TenantModelOverride {
  id: string;
  tenantId: string;
  intent: ModelIntent;
  provider: ModelProvider;
  model: string;
  temperature: number;
  maxTokens: number;
  isEnabled: boolean;
  priority: number;
  fallbackModel: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SetModelOverrideInput {
  intent: ModelIntent;
  provider: ModelProvider;
  model: string;
  temperature?: number;
  maxTokens?: number;
  isEnabled?: boolean;
  priority?: number;
  fallbackModel?: string;
}

// ─── Policy Types ─────────────────────────────────────────────────────────────

export type PolicyType = "approval_rule" | "rate_limit" | "feature_access" | "data_residency";
export type LimitPeriod = "minute" | "hour" | "day" | "month";
export type DataRegion = "us" | "eu" | "uk" | "ap";

export interface TenantPolicy {
  id: string;
  tenantId: string;
  policyType: PolicyType;
  policyName: string;
  isEnabled: boolean;
  config: Record<string, unknown>;
  // Approval rules
  approvalThreshold: number | null;
  approvers: string[];
  // Rate limits
  limitValue: number | null;
  limitPeriod: LimitPeriod | null;
  // Feature access
  features: string[];
  // Data residency
  allowedRegions: DataRegion[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SetPolicyInput {
  policyType: PolicyType;
  policyName: string;
  isEnabled?: boolean;
  config?: Record<string, unknown>;
  approvalThreshold?: number;
  approvers?: string[];
  limitValue?: number;
  limitPeriod?: LimitPeriod;
  features?: string[];
  allowedRegions?: DataRegion[];
}

// ─── API Key Types ────────────────────────────────────────────────────────────

export type ApiKeyScope = "read" | "write" | "admin" | "billing";

export interface TenantApiKey {
  id: string;
  tenantId: string;
  name: string;
  keyPrefix: string;
  scopes: ApiKeyScope[];
  rateLimit: number;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
}

export interface CreateApiKeyInput {
  name: string;
  scopes?: ApiKeyScope[];
  rateLimit?: number;
  expiresAt?: Date;
}

export interface CreateApiKeyResult {
  apiKey: TenantApiKey;
  /** The full API key — only returned once at creation time */
  secretKey: string;
}

// ─── Tenant Context Types ─────────────────────────────────────────────────────

export interface TenantContext {
  tenant: Tenant;
  member: TenantMember | null;
  /** Resolved configuration (defaults + overrides) */
  config: Record<string, unknown>;
  /** Active adapter selections per type */
  adapters: Record<AdapterType, string | null>;
  /** Active model selections per intent */
  models: Record<ModelIntent, ModelSelection>;
  /** Active policies */
  policies: {
    approvalRules: TenantPolicy[];
    rateLimits: TenantPolicy[];
    featureAccess: TenantPolicy[];
    dataResidency: TenantPolicy | null;
  };
}

export interface ModelSelection {
  provider: ModelProvider;
  model: string;
  temperature: number;
  maxTokens: number;
  fallbackModel: string | null;
}

// ─── Tier Limits ──────────────────────────────────────────────────────────────

export const TIER_LIMITS: Record<TenantTier, {
  maxSeats: number;
  maxConversationsDay: number;
  maxTokensMonth: number;
  features: string[];
}> = {
  starter: {
    maxSeats: 3,
    maxConversationsDay: 50,
    maxTokensMonth: 500_000,
    features: ["chat", "basic_reports"],
  },
  professional: {
    maxSeats: 10,
    maxConversationsDay: 500,
    maxTokensMonth: 2_000_000,
    features: ["chat", "basic_reports", "voice", "custom_branding", "api_access"],
  },
  enterprise: {
    maxSeats: 100,
    maxConversationsDay: 5000,
    maxTokensMonth: 20_000_000,
    features: ["chat", "basic_reports", "voice", "custom_branding", "api_access", "sso", "audit_logs", "custom_models", "dedicated_support"],
  },
  white_label: {
    maxSeats: 1000,
    maxConversationsDay: 50000,
    maxTokensMonth: 100_000_000,
    features: ["chat", "basic_reports", "voice", "custom_branding", "api_access", "sso", "audit_logs", "custom_models", "dedicated_support", "white_label", "custom_domain", "reseller"],
  },
};
