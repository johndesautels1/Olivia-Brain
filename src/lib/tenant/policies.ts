/**
 * Tenant Policies
 * Sprint 5.1 — Tenant Architecture (Item 5: Per-Tenant Policy/Approval Rules)
 *
 * Manages per-tenant approval rules, rate limits, feature access, and data residency.
 *
 * Policy Types:
 * - approval_rule: Actions requiring human approval based on confidence
 * - rate_limit: API/action rate limiting per tenant
 * - feature_access: Feature flag overrides
 * - data_residency: Geographic data storage restrictions
 */

import { getPrisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

import type {
  TenantPolicy,
  SetPolicyInput,
  PolicyType,
  LimitPeriod,
  DataRegion,
} from "./types";
import { getTenantContext, requireTenantContext } from "./context";

// ─── Policy CRUD ──────────────────────────────────────────────────────────────

/**
 * Set a policy for a tenant.
 */
export async function setPolicy(
  tenantId: string,
  input: SetPolicyInput
): Promise<TenantPolicy> {
  const prisma = getPrisma();

  const policy = await prisma.tenant_policies.upsert({
    where: {
      tenant_id_policy_type_policy_name: {
        tenant_id: tenantId,
        policy_type: input.policyType,
        policy_name: input.policyName,
      },
    },
    create: {
      tenant_id: tenantId,
      policy_type: input.policyType,
      policy_name: input.policyName,
      is_enabled: input.isEnabled ?? true,
      config: (input.config ?? {}) as Prisma.InputJsonValue,
      approval_threshold: input.approvalThreshold ?? null,
      approvers: input.approvers ?? [],
      limit_value: input.limitValue ?? null,
      limit_period: input.limitPeriod ?? null,
      features: input.features ?? [],
      allowed_regions: input.allowedRegions ?? [],
    },
    update: {
      is_enabled: input.isEnabled ?? true,
      config: (input.config ?? {}) as Prisma.InputJsonValue,
      approval_threshold: input.approvalThreshold ?? null,
      approvers: input.approvers ?? [],
      limit_value: input.limitValue ?? null,
      limit_period: input.limitPeriod ?? null,
      features: input.features ?? [],
      allowed_regions: input.allowedRegions ?? [],
      updated_at: new Date(),
    },
  });

  return mapPolicy(policy);
}

/**
 * Get a specific policy.
 */
export async function getPolicy(
  tenantId: string,
  policyType: PolicyType,
  policyName: string
): Promise<TenantPolicy | null> {
  const prisma = getPrisma();

  const policy = await prisma.tenant_policies.findUnique({
    where: {
      tenant_id_policy_type_policy_name: {
        tenant_id: tenantId,
        policy_type: policyType,
        policy_name: policyName,
      },
    },
  });

  return policy ? mapPolicy(policy) : null;
}

/**
 * Get all policies for a tenant.
 */
export async function getPolicies(tenantId: string): Promise<TenantPolicy[]> {
  const prisma = getPrisma();

  const policies = await prisma.tenant_policies.findMany({
    where: { tenant_id: tenantId },
    orderBy: [{ policy_type: "asc" }, { policy_name: "asc" }],
  });

  return policies.map(mapPolicy);
}

/**
 * Get policies by type.
 */
export async function getPoliciesByType(
  tenantId: string,
  policyType: PolicyType
): Promise<TenantPolicy[]> {
  const prisma = getPrisma();

  const policies = await prisma.tenant_policies.findMany({
    where: { tenant_id: tenantId, policy_type: policyType },
    orderBy: { policy_name: "asc" },
  });

  return policies.map(mapPolicy);
}

/**
 * Delete a policy.
 */
export async function deletePolicy(
  tenantId: string,
  policyType: PolicyType,
  policyName: string
): Promise<void> {
  const prisma = getPrisma();

  await prisma.tenant_policies.delete({
    where: {
      tenant_id_policy_type_policy_name: {
        tenant_id: tenantId,
        policy_type: policyType,
        policy_name: policyName,
      },
    },
  });
}

// ─── Approval Rule Evaluation ─────────────────────────────────────────────────

/**
 * Check if an action requires approval based on tenant policies.
 */
export function checkApprovalRequired(
  actionType: string,
  confidenceScore: number
): ApprovalCheckResult {
  const ctx = getTenantContext();
  if (!ctx) {
    return { required: false, reason: "no_tenant_context" };
  }

  for (const rule of ctx.policies.approvalRules) {
    const config = rule.config as ApprovalRuleConfig;
    const actionTypes = config.actionTypes ?? ["*"];

    // Check if this rule applies to the action type
    if (!actionTypes.includes("*") && !actionTypes.includes(actionType)) {
      continue;
    }

    // Check confidence threshold
    if (rule.approvalThreshold !== null && confidenceScore < rule.approvalThreshold) {
      return {
        required: true,
        reason: "below_confidence_threshold",
        policy: rule,
        approvers: rule.approvers,
        threshold: rule.approvalThreshold,
        actualScore: confidenceScore,
      };
    }

    // Check specific action rules
    if (config.alwaysRequireApproval?.includes(actionType)) {
      return {
        required: true,
        reason: "always_required",
        policy: rule,
        approvers: rule.approvers,
      };
    }
  }

  return { required: false, reason: "no_matching_rule" };
}

export interface ApprovalCheckResult {
  required: boolean;
  reason: string;
  policy?: TenantPolicy;
  approvers?: string[];
  threshold?: number;
  actualScore?: number;
}

interface ApprovalRuleConfig {
  actionTypes?: string[];
  alwaysRequireApproval?: string[];
  skipApprovalFor?: string[];
}

/**
 * Get all approvers for a specific action type.
 */
export function getApproversForAction(actionType: string): string[] {
  const ctx = getTenantContext();
  if (!ctx) return [];

  const approvers = new Set<string>();

  for (const rule of ctx.policies.approvalRules) {
    const config = rule.config as ApprovalRuleConfig;
    const actionTypes = config.actionTypes ?? ["*"];

    if (actionTypes.includes("*") || actionTypes.includes(actionType)) {
      for (const approver of rule.approvers) {
        approvers.add(approver);
      }
    }
  }

  return Array.from(approvers);
}

// ─── Rate Limit Evaluation ────────────────────────────────────────────────────

/**
 * Check if an action is within rate limits.
 * This is a check only — actual tracking happens in the rate limiter service.
 */
export function getRateLimitForAction(actionType: string): RateLimitInfo | null {
  const ctx = getTenantContext();
  if (!ctx) return null;

  for (const limit of ctx.policies.rateLimits) {
    const config = limit.config as RateLimitConfig;
    const actionTypes = config.actionTypes ?? ["*"];

    if (actionTypes.includes("*") || actionTypes.includes(actionType)) {
      if (limit.limitValue !== null && limit.limitPeriod !== null) {
        return {
          maxRequests: limit.limitValue,
          period: limit.limitPeriod,
          policy: limit,
        };
      }
    }
  }

  // Return system defaults if no tenant policy
  return getDefaultRateLimit(actionType);
}

export interface RateLimitInfo {
  maxRequests: number;
  period: LimitPeriod;
  policy?: TenantPolicy;
}

interface RateLimitConfig {
  actionTypes?: string[];
}

function getDefaultRateLimit(actionType: string): RateLimitInfo {
  // Default rate limits by action type
  const defaults: Record<string, RateLimitInfo> = {
    llm_call: { maxRequests: 100, period: "minute" },
    api_request: { maxRequests: 1000, period: "minute" },
    email_send: { maxRequests: 100, period: "hour" },
    report_generation: { maxRequests: 10, period: "hour" },
    avatar_generation: { maxRequests: 50, period: "hour" },
    "*": { maxRequests: 1000, period: "minute" },
  };

  return defaults[actionType] ?? defaults["*"];
}

// ─── Feature Access Evaluation ────────────────────────────────────────────────

/**
 * Check if a feature is enabled for the current tenant.
 */
export function isFeatureEnabled(featureKey: string): boolean {
  const ctx = getTenantContext();
  if (!ctx) return true; // No tenant context = system mode

  // Check tier-based features first
  if (isTierFeature(ctx.tenant.tier, featureKey)) {
    return true;
  }

  // Check policy-based feature grants
  for (const policy of ctx.policies.featureAccess) {
    if (policy.features.includes(featureKey)) {
      return policy.isEnabled;
    }
  }

  return false;
}

/**
 * Get all enabled features for the current tenant.
 */
export function getEnabledFeatures(): string[] {
  const ctx = getTenantContext();
  if (!ctx) return []; // Return empty in system mode

  const features = new Set<string>();

  // Add tier features
  const tierFeatures = getTierFeatures(ctx.tenant.tier);
  for (const f of tierFeatures) {
    features.add(f);
  }

  // Add policy-granted features
  for (const policy of ctx.policies.featureAccess) {
    if (policy.isEnabled) {
      for (const f of policy.features) {
        features.add(f);
      }
    }
  }

  return Array.from(features);
}

function isTierFeature(tier: string, feature: string): boolean {
  const tierFeatures = getTierFeatures(tier);
  return tierFeatures.includes(feature);
}

function getTierFeatures(tier: string): string[] {
  const tiers: Record<string, string[]> = {
    starter: ["chat", "basic_reports"],
    professional: ["chat", "basic_reports", "voice", "custom_branding", "api_access"],
    enterprise: ["chat", "basic_reports", "voice", "custom_branding", "api_access", "sso", "audit_logs", "custom_models", "dedicated_support"],
    white_label: ["chat", "basic_reports", "voice", "custom_branding", "api_access", "sso", "audit_logs", "custom_models", "dedicated_support", "white_label", "custom_domain", "reseller"],
  };
  return tiers[tier] ?? [];
}

// ─── Data Residency Evaluation ────────────────────────────────────────────────

/**
 * Get allowed data regions for the current tenant.
 */
export function getAllowedDataRegions(): DataRegion[] {
  const ctx = getTenantContext();
  if (!ctx) return ["us", "eu", "uk", "ap"]; // System mode = all regions

  const policy = ctx.policies.dataResidency;
  if (!policy || policy.allowedRegions.length === 0) {
    return ["us", "eu", "uk", "ap"]; // Default = all regions
  }

  return policy.allowedRegions as DataRegion[];
}

/**
 * Check if a specific region is allowed.
 */
export function isRegionAllowed(region: DataRegion): boolean {
  const allowed = getAllowedDataRegions();
  return allowed.includes(region);
}

/**
 * Get the preferred region for the current tenant.
 * Returns the first allowed region.
 */
export function getPreferredRegion(): DataRegion {
  const allowed = getAllowedDataRegions();
  return allowed[0] ?? "us";
}

// ─── Policy Templates ─────────────────────────────────────────────────────────

/**
 * Pre-built policy templates for common configurations.
 */
export const POLICY_TEMPLATES: Record<string, SetPolicyInput[]> = {
  enterprise_security: [
    {
      policyType: "approval_rule",
      policyName: "high_risk_actions",
      config: { actionTypes: ["email_send", "external_api_call", "data_export"] },
      approvalThreshold: 0.85,
      approvers: [],
    },
    {
      policyType: "rate_limit",
      policyName: "api_calls",
      limitValue: 5000,
      limitPeriod: "minute",
      config: { actionTypes: ["*"] },
    },
    {
      policyType: "feature_access",
      policyName: "security_features",
      features: ["audit_logs", "sso", "ip_allowlist"],
    },
  ],
  gdpr_compliant: [
    {
      policyType: "data_residency",
      policyName: "eu_only",
      allowedRegions: ["eu", "uk"],
      config: { enforceStrictCompliance: true },
    },
    {
      policyType: "approval_rule",
      policyName: "data_export",
      config: { actionTypes: ["data_export", "report_generation"] },
      approvalThreshold: 0.95,
      approvers: [],
    },
  ],
  startup_friendly: [
    {
      policyType: "rate_limit",
      policyName: "generous_limits",
      limitValue: 10000,
      limitPeriod: "hour",
      config: { actionTypes: ["*"] },
    },
    {
      policyType: "feature_access",
      policyName: "all_features",
      features: ["chat", "voice", "reports", "api_access"],
    },
  ],
};

/**
 * Apply a policy template to a tenant.
 */
export async function applyPolicyTemplate(
  tenantId: string,
  templateName: string
): Promise<TenantPolicy[]> {
  const template = POLICY_TEMPLATES[templateName];
  if (!template) {
    throw new Error(`Unknown policy template: ${templateName}`);
  }

  const policies: TenantPolicy[] = [];
  for (const input of template) {
    const policy = await setPolicy(tenantId, input);
    policies.push(policy);
  }

  return policies;
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

function mapPolicy(row: {
  id: string;
  tenant_id: string;
  policy_type: string;
  policy_name: string;
  is_enabled: boolean;
  config: unknown;
  approval_threshold: number | null;
  approvers: string[];
  limit_value: number | null;
  limit_period: string | null;
  features: string[];
  allowed_regions: string[];
  created_at: Date;
  updated_at: Date;
}): TenantPolicy {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    policyType: row.policy_type as PolicyType,
    policyName: row.policy_name,
    isEnabled: row.is_enabled,
    config: row.config as Record<string, unknown>,
    approvalThreshold: row.approval_threshold,
    approvers: row.approvers,
    limitValue: row.limit_value,
    limitPeriod: row.limit_period as LimitPeriod | null,
    features: row.features,
    allowedRegions: row.allowed_regions as DataRegion[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
