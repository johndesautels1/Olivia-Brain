/**
 * Entitlements System
 * Sprint 5.2 — White-Label System (Item 4)
 *
 * Manages tenant entitlements and feature access:
 * - Feature flags per tier
 * - Usage quotas and limits
 * - Entitlement checking at runtime
 * - Usage tracking and enforcement
 */

import { getTenantContext } from "@/lib/tenant";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SubscriptionTier = "free" | "starter" | "professional" | "enterprise" | "custom";

export type Feature =
  // Core Features
  | "assessments"
  | "city_matching"
  | "reports"
  | "video_avatar"
  | "voice_synthesis"
  // Advanced Features
  | "multi_language"
  | "custom_branding"
  | "custom_personas"
  | "custom_prompts"
  | "api_access"
  // Premium Features
  | "white_label"
  | "dedicated_support"
  | "sla_guarantee"
  | "custom_integrations"
  | "data_export"
  // Compliance Features
  | "gdpr_tools"
  | "audit_logs"
  | "data_residency"
  | "sso";

export type UsageMetric =
  | "assessments_per_month"
  | "reports_per_month"
  | "video_minutes_per_month"
  | "voice_minutes_per_month"
  | "api_calls_per_month"
  | "storage_gb"
  | "team_members"
  | "clients_active";

export interface TierEntitlements {
  tier: SubscriptionTier;
  name: string;
  description: string;
  /** Features included in this tier */
  features: Feature[];
  /** Usage limits for this tier */
  limits: Record<UsageMetric, number>;
  /** Price per month (USD) */
  priceMonthly: number;
  /** Price per year (USD) */
  priceYearly: number;
}

export interface TenantEntitlements {
  id: string;
  tenantId: string;
  tier: SubscriptionTier;
  /** Feature overrides (add or remove from tier defaults) */
  featureOverrides: {
    add: Feature[];
    remove: Feature[];
  };
  /** Limit overrides (custom limits beyond tier) */
  limitOverrides: Partial<Record<UsageMetric, number>>;
  /** Current usage this billing period */
  currentUsage: Record<UsageMetric, number>;
  /** Billing period start */
  billingPeriodStart: Date;
  /** Billing period end */
  billingPeriodEnd: Date;
  /** Is currently active (paid) */
  isActive: boolean;
  /** Trial expiry (null if not on trial) */
  trialEndsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EntitlementCheck {
  allowed: boolean;
  reason: string | null;
  /** Remaining quota (null if unlimited or not applicable) */
  remaining: number | null;
  /** Upgrade tier if denied due to tier */
  suggestedUpgrade: SubscriptionTier | null;
}

export interface UsageRecord {
  id: string;
  tenantId: string;
  metric: UsageMetric;
  value: number;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

// ─── Tier Definitions ─────────────────────────────────────────────────────────

export const TIER_ENTITLEMENTS: Record<SubscriptionTier, TierEntitlements> = {
  free: {
    tier: "free",
    name: "Free",
    description: "Try Olivia with limited features",
    features: ["assessments", "city_matching"],
    limits: {
      assessments_per_month: 3,
      reports_per_month: 1,
      video_minutes_per_month: 10,
      voice_minutes_per_month: 30,
      api_calls_per_month: 100,
      storage_gb: 1,
      team_members: 1,
      clients_active: 5,
    },
    priceMonthly: 0,
    priceYearly: 0,
  },
  starter: {
    tier: "starter",
    name: "Starter",
    description: "For individual advisors getting started",
    features: [
      "assessments",
      "city_matching",
      "reports",
      "video_avatar",
      "voice_synthesis",
    ],
    limits: {
      assessments_per_month: 25,
      reports_per_month: 15,
      video_minutes_per_month: 120,
      voice_minutes_per_month: 300,
      api_calls_per_month: 1000,
      storage_gb: 10,
      team_members: 2,
      clients_active: 50,
    },
    priceMonthly: 99,
    priceYearly: 990,
  },
  professional: {
    tier: "professional",
    name: "Professional",
    description: "For growing advisory practices",
    features: [
      "assessments",
      "city_matching",
      "reports",
      "video_avatar",
      "voice_synthesis",
      "multi_language",
      "custom_branding",
      "custom_personas",
      "custom_prompts",
      "api_access",
      "gdpr_tools",
      "audit_logs",
    ],
    limits: {
      assessments_per_month: 100,
      reports_per_month: 75,
      video_minutes_per_month: 500,
      voice_minutes_per_month: 1500,
      api_calls_per_month: 10000,
      storage_gb: 50,
      team_members: 10,
      clients_active: 250,
    },
    priceMonthly: 299,
    priceYearly: 2990,
  },
  enterprise: {
    tier: "enterprise",
    name: "Enterprise",
    description: "For large organizations with custom needs",
    features: [
      "assessments",
      "city_matching",
      "reports",
      "video_avatar",
      "voice_synthesis",
      "multi_language",
      "custom_branding",
      "custom_personas",
      "custom_prompts",
      "api_access",
      "white_label",
      "dedicated_support",
      "sla_guarantee",
      "custom_integrations",
      "data_export",
      "gdpr_tools",
      "audit_logs",
      "data_residency",
      "sso",
    ],
    limits: {
      assessments_per_month: -1, // unlimited
      reports_per_month: -1,
      video_minutes_per_month: 5000,
      voice_minutes_per_month: 15000,
      api_calls_per_month: -1,
      storage_gb: 500,
      team_members: -1,
      clients_active: -1,
    },
    priceMonthly: 999,
    priceYearly: 9990,
  },
  custom: {
    tier: "custom",
    name: "Custom",
    description: "Tailored package for specific requirements",
    features: [], // Defined per-tenant
    limits: {
      assessments_per_month: 0,
      reports_per_month: 0,
      video_minutes_per_month: 0,
      voice_minutes_per_month: 0,
      api_calls_per_month: 0,
      storage_gb: 0,
      team_members: 0,
      clients_active: 0,
    },
    priceMonthly: 0, // Custom pricing
    priceYearly: 0,
  },
};

// ─── Entitlement Checking ─────────────────────────────────────────────────────

/**
 * Check if a feature is available for the current tenant.
 */
export function hasFeature(feature: Feature): boolean {
  const entitlements = getTenantEntitlements();
  return checkFeatureAccess(entitlements, feature).allowed;
}

/**
 * Check feature access with detailed result.
 */
export function checkFeatureAccess(
  entitlements: TenantEntitlements,
  feature: Feature
): EntitlementCheck {
  // Check if subscription is active
  if (!entitlements.isActive) {
    // Allow if still in trial
    if (entitlements.trialEndsAt && entitlements.trialEndsAt > new Date()) {
      // Continue to feature check
    } else {
      return {
        allowed: false,
        reason: "Subscription is not active",
        remaining: null,
        suggestedUpgrade: null,
      };
    }
  }

  // Check if explicitly removed
  if (entitlements.featureOverrides.remove.includes(feature)) {
    return {
      allowed: false,
      reason: "Feature has been disabled for this account",
      remaining: null,
      suggestedUpgrade: null,
    };
  }

  // Check if explicitly added
  if (entitlements.featureOverrides.add.includes(feature)) {
    return {
      allowed: true,
      reason: null,
      remaining: null,
      suggestedUpgrade: null,
    };
  }

  // Check tier features
  const tierConfig = TIER_ENTITLEMENTS[entitlements.tier];
  if (tierConfig.features.includes(feature)) {
    return {
      allowed: true,
      reason: null,
      remaining: null,
      suggestedUpgrade: null,
    };
  }

  // Find upgrade tier that includes this feature
  const tiers: SubscriptionTier[] = ["starter", "professional", "enterprise"];
  const suggestedUpgrade = tiers.find((tier) =>
    TIER_ENTITLEMENTS[tier].features.includes(feature)
  );

  return {
    allowed: false,
    reason: `Feature "${feature}" is not included in ${tierConfig.name} tier`,
    remaining: null,
    suggestedUpgrade: suggestedUpgrade ?? null,
  };
}

/**
 * Check if usage is within limits.
 */
export function checkUsageLimit(
  metric: UsageMetric,
  incrementBy: number = 1
): EntitlementCheck {
  const entitlements = getTenantEntitlements();
  return checkUsageLimitInternal(entitlements, metric, incrementBy);
}

function checkUsageLimitInternal(
  entitlements: TenantEntitlements,
  metric: UsageMetric,
  incrementBy: number
): EntitlementCheck {
  // Check subscription active
  if (!entitlements.isActive) {
    if (!(entitlements.trialEndsAt && entitlements.trialEndsAt > new Date())) {
      return {
        allowed: false,
        reason: "Subscription is not active",
        remaining: null,
        suggestedUpgrade: null,
      };
    }
  }

  // Get limit (override or tier default)
  const tierConfig = TIER_ENTITLEMENTS[entitlements.tier];
  const limit = entitlements.limitOverrides[metric] ?? tierConfig.limits[metric];

  // -1 means unlimited
  if (limit === -1) {
    return {
      allowed: true,
      reason: null,
      remaining: null,
      suggestedUpgrade: null,
    };
  }

  // Check current usage
  const currentUsage = entitlements.currentUsage[metric] ?? 0;
  const newUsage = currentUsage + incrementBy;

  if (newUsage > limit) {
    const remaining = Math.max(0, limit - currentUsage);

    // Find upgrade tier with higher limit
    const tiers: SubscriptionTier[] = ["starter", "professional", "enterprise"];
    const currentTierIndex = tiers.indexOf(entitlements.tier);
    const suggestedUpgrade = tiers.slice(currentTierIndex + 1).find(
      (tier) => TIER_ENTITLEMENTS[tier].limits[metric] > limit
    );

    return {
      allowed: false,
      reason: `Usage limit reached: ${currentUsage}/${limit} ${metric.replace(/_/g, " ")}`,
      remaining,
      suggestedUpgrade: suggestedUpgrade ?? null,
    };
  }

  return {
    allowed: true,
    reason: null,
    remaining: limit - newUsage,
    suggestedUpgrade: null,
  };
}

/**
 * Get remaining quota for a metric.
 */
export function getRemainingQuota(metric: UsageMetric): number | null {
  const entitlements = getTenantEntitlements();
  const tierConfig = TIER_ENTITLEMENTS[entitlements.tier];
  const limit = entitlements.limitOverrides[metric] ?? tierConfig.limits[metric];

  if (limit === -1) return null; // unlimited

  const currentUsage = entitlements.currentUsage[metric] ?? 0;
  return Math.max(0, limit - currentUsage);
}

/**
 * Get all usage stats for current tenant.
 */
export function getUsageStats(): Record<UsageMetric, { used: number; limit: number; remaining: number | null }> {
  const entitlements = getTenantEntitlements();
  const tierConfig = TIER_ENTITLEMENTS[entitlements.tier];
  const stats: Record<string, { used: number; limit: number; remaining: number | null }> = {};

  const metrics: UsageMetric[] = [
    "assessments_per_month",
    "reports_per_month",
    "video_minutes_per_month",
    "voice_minutes_per_month",
    "api_calls_per_month",
    "storage_gb",
    "team_members",
    "clients_active",
  ];

  for (const metric of metrics) {
    const limit = entitlements.limitOverrides[metric] ?? tierConfig.limits[metric];
    const used = entitlements.currentUsage[metric] ?? 0;
    stats[metric] = {
      used,
      limit,
      remaining: limit === -1 ? null : Math.max(0, limit - used),
    };
  }

  return stats as Record<UsageMetric, { used: number; limit: number; remaining: number | null }>;
}

// ─── Usage Tracking ───────────────────────────────────────────────────────────

/**
 * Record usage increment.
 */
export async function recordUsage(
  tenantId: string,
  metric: UsageMetric,
  value: number = 1,
  metadata: Record<string, unknown> = {}
): Promise<UsageRecord> {
  const record: UsageRecord = {
    id: crypto.randomUUID(),
    tenantId,
    metric,
    value,
    timestamp: new Date(),
    metadata,
  };

  usageRecords.push(record);

  // Update current usage in entitlements
  const entitlements = entitlementsRegistry.get(tenantId);
  if (entitlements) {
    const current = entitlements.currentUsage[metric] ?? 0;
    entitlements.currentUsage[metric] = current + value;
    entitlements.updatedAt = new Date();
  }

  return record;
}

/**
 * Get usage history for a tenant.
 */
export async function getUsageHistory(
  tenantId: string,
  metric?: UsageMetric,
  startDate?: Date,
  endDate?: Date
): Promise<UsageRecord[]> {
  return usageRecords.filter((record) => {
    if (record.tenantId !== tenantId) return false;
    if (metric && record.metric !== metric) return false;
    if (startDate && record.timestamp < startDate) return false;
    if (endDate && record.timestamp > endDate) return false;
    return true;
  });
}

/**
 * Reset usage for a new billing period.
 */
export async function resetBillingPeriod(
  tenantId: string,
  newPeriodStart: Date,
  newPeriodEnd: Date
): Promise<void> {
  const entitlements = entitlementsRegistry.get(tenantId);
  if (!entitlements) return;

  // Reset monthly metrics (keep storage and team members as they're cumulative)
  entitlements.currentUsage = {
    assessments_per_month: 0,
    reports_per_month: 0,
    video_minutes_per_month: 0,
    voice_minutes_per_month: 0,
    api_calls_per_month: 0,
    storage_gb: entitlements.currentUsage.storage_gb ?? 0,
    team_members: entitlements.currentUsage.team_members ?? 0,
    clients_active: entitlements.currentUsage.clients_active ?? 0,
  };

  entitlements.billingPeriodStart = newPeriodStart;
  entitlements.billingPeriodEnd = newPeriodEnd;
  entitlements.updatedAt = new Date();
}

// ─── Entitlements CRUD ────────────────────────────────────────────────────────

/**
 * Get or create entitlements for a tenant.
 */
export function getTenantEntitlements(): TenantEntitlements {
  const ctx = getTenantContext();

  if (ctx) {
    const existing = entitlementsRegistry.get(ctx.tenant.id);
    if (existing) return existing;
  }

  // Return default free tier entitlements
  return getDefaultEntitlements();
}

/**
 * Create or update tenant entitlements.
 */
export async function saveEntitlements(
  tenantId: string,
  input: Partial<Omit<TenantEntitlements, "id" | "tenantId" | "createdAt" | "updatedAt">>
): Promise<TenantEntitlements> {
  const existing = entitlementsRegistry.get(tenantId);

  const now = new Date();
  const periodStart = input.billingPeriodStart ?? existing?.billingPeriodStart ?? now;
  const periodEnd = input.billingPeriodEnd ?? existing?.billingPeriodEnd ?? new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

  const entitlements: TenantEntitlements = {
    id: existing?.id ?? crypto.randomUUID(),
    tenantId,
    tier: input.tier ?? existing?.tier ?? "free",
    featureOverrides: {
      add: input.featureOverrides?.add ?? existing?.featureOverrides?.add ?? [],
      remove: input.featureOverrides?.remove ?? existing?.featureOverrides?.remove ?? [],
    },
    limitOverrides: { ...existing?.limitOverrides, ...input.limitOverrides },
    currentUsage: { ...getEmptyUsage(), ...existing?.currentUsage, ...input.currentUsage },
    billingPeriodStart: periodStart,
    billingPeriodEnd: periodEnd,
    isActive: input.isActive ?? existing?.isActive ?? true,
    trialEndsAt: input.trialEndsAt ?? existing?.trialEndsAt ?? null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  entitlementsRegistry.set(tenantId, entitlements);
  return entitlements;
}

/**
 * Upgrade or downgrade a tenant's tier.
 */
export async function changeTier(
  tenantId: string,
  newTier: SubscriptionTier
): Promise<TenantEntitlements> {
  const existing = entitlementsRegistry.get(tenantId);
  if (!existing) {
    return saveEntitlements(tenantId, { tier: newTier });
  }

  existing.tier = newTier;
  existing.updatedAt = new Date();
  return existing;
}

/**
 * Start a trial for a tenant.
 */
export async function startTrial(
  tenantId: string,
  tier: SubscriptionTier,
  trialDays: number = 14
): Promise<TenantEntitlements> {
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

  return saveEntitlements(tenantId, {
    tier,
    isActive: true,
    trialEndsAt,
  });
}

/**
 * Cancel a tenant's subscription.
 */
export async function cancelSubscription(tenantId: string): Promise<void> {
  const entitlements = entitlementsRegistry.get(tenantId);
  if (entitlements) {
    entitlements.isActive = false;
    entitlements.updatedAt = new Date();
  }
}

/**
 * Delete entitlements for a tenant.
 */
export async function deleteEntitlements(tenantId: string): Promise<void> {
  entitlementsRegistry.delete(tenantId);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDefaultEntitlements(): TenantEntitlements {
  const now = new Date();
  return {
    id: "default",
    tenantId: "system",
    tier: "free",
    featureOverrides: { add: [], remove: [] },
    limitOverrides: {},
    currentUsage: getEmptyUsage(),
    billingPeriodStart: now,
    billingPeriodEnd: new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()),
    isActive: true,
    trialEndsAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

function getEmptyUsage(): Record<UsageMetric, number> {
  return {
    assessments_per_month: 0,
    reports_per_month: 0,
    video_minutes_per_month: 0,
    voice_minutes_per_month: 0,
    api_calls_per_month: 0,
    storage_gb: 0,
    team_members: 0,
    clients_active: 0,
  };
}

// In-memory storage (production: database)
const entitlementsRegistry = new Map<string, TenantEntitlements>();
const usageRecords: UsageRecord[] = [];

// ─── Service Interface ────────────────────────────────────────────────────────

export interface EntitlementsService {
  hasFeature(feature: Feature): boolean;
  checkFeature(feature: Feature): EntitlementCheck;
  checkUsage(metric: UsageMetric, incrementBy?: number): EntitlementCheck;
  getRemainingQuota(metric: UsageMetric): number | null;
  getUsageStats(): Record<UsageMetric, { used: number; limit: number; remaining: number | null }>;
  recordUsage(tenantId: string, metric: UsageMetric, value?: number, metadata?: Record<string, unknown>): Promise<UsageRecord>;
  getUsageHistory(tenantId: string, metric?: UsageMetric, startDate?: Date, endDate?: Date): Promise<UsageRecord[]>;
  resetBillingPeriod(tenantId: string, start: Date, end: Date): Promise<void>;
  getEntitlements(): TenantEntitlements;
  saveEntitlements(tenantId: string, input: Partial<TenantEntitlements>): Promise<TenantEntitlements>;
  changeTier(tenantId: string, tier: SubscriptionTier): Promise<TenantEntitlements>;
  startTrial(tenantId: string, tier: SubscriptionTier, days?: number): Promise<TenantEntitlements>;
  cancelSubscription(tenantId: string): Promise<void>;
  deleteEntitlements(tenantId: string): Promise<void>;
  getTierConfig(tier: SubscriptionTier): TierEntitlements;
}

export function getEntitlementsService(): EntitlementsService {
  return {
    hasFeature,
    checkFeature: (feature) => checkFeatureAccess(getTenantEntitlements(), feature),
    checkUsage: checkUsageLimit,
    getRemainingQuota,
    getUsageStats,
    recordUsage,
    getUsageHistory,
    resetBillingPeriod,
    getEntitlements: getTenantEntitlements,
    saveEntitlements,
    changeTier,
    startTrial,
    cancelSubscription,
    deleteEntitlements,
    getTierConfig: (tier) => TIER_ENTITLEMENTS[tier],
  };
}
