/**
 * Tenant Service
 * Sprint 5.1 — Tenant Architecture (Item 2: Tenant Isolation)
 *
 * Core CRUD operations for tenant management.
 * All operations are performed by the system or tenant admins.
 */

import { getPrisma } from "@/lib/db";

import type {
  Tenant,
  TenantMember,
  TenantConfig,
  TenantApiKey,
  CreateTenantInput,
  UpdateTenantInput,
  SetConfigInput,
  CreateApiKeyInput,
  CreateApiKeyResult,
  TenantTier,
  MemberRole,
  MemberStatus,
  TIER_LIMITS,
} from "./types";
import { generateApiKey, hashApiKey } from "./context";

// ─── Tenant CRUD ──────────────────────────────────────────────────────────────

/**
 * Create a new tenant.
 */
export async function createTenant(input: CreateTenantInput): Promise<Tenant> {
  const prisma = getPrisma();

  // Get tier limits for defaults
  const tier = input.tier ?? "starter";
  const limits = getTierLimits(tier);

  const tenant = await prisma.tenants.create({
    data: {
      slug: input.slug,
      name: input.name,
      tier,
      domain: input.domain ?? null,
      logo_url: input.logoUrl ?? null,
      primary_color: input.primaryColor ?? null,
      timezone: input.timezone ?? "UTC",
      locale: input.locale ?? "en-US",
      max_seats: limits.maxSeats,
      max_conversations_day: limits.maxConversationsDay,
      max_tokens_month: limits.maxTokensMonth,
      billing_email: input.billingEmail ?? null,
      metadata: input.metadata ?? {},
    },
  });

  return mapTenant(tenant);
}

/**
 * Get a tenant by ID.
 */
export async function getTenantById(id: string): Promise<Tenant | null> {
  const prisma = getPrisma();
  const tenant = await prisma.tenants.findUnique({ where: { id } });
  return tenant ? mapTenant(tenant) : null;
}

/**
 * Get a tenant by slug.
 */
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const prisma = getPrisma();
  const tenant = await prisma.tenants.findUnique({ where: { slug } });
  return tenant ? mapTenant(tenant) : null;
}

/**
 * Get a tenant by custom domain.
 */
export async function getTenantByDomain(domain: string): Promise<Tenant | null> {
  const prisma = getPrisma();
  const tenant = await prisma.tenants.findUnique({ where: { domain } });
  return tenant ? mapTenant(tenant) : null;
}

/**
 * Update a tenant.
 */
export async function updateTenant(id: string, input: UpdateTenantInput): Promise<Tenant> {
  const prisma = getPrisma();

  const tenant = await prisma.tenants.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.tier !== undefined && { tier: input.tier }),
      ...(input.domain !== undefined && { domain: input.domain }),
      ...(input.logoUrl !== undefined && { logo_url: input.logoUrl }),
      ...(input.primaryColor !== undefined && { primary_color: input.primaryColor }),
      ...(input.timezone !== undefined && { timezone: input.timezone }),
      ...(input.locale !== undefined && { locale: input.locale }),
      ...(input.maxSeats !== undefined && { max_seats: input.maxSeats }),
      ...(input.maxConversationsDay !== undefined && { max_conversations_day: input.maxConversationsDay }),
      ...(input.maxTokensMonth !== undefined && { max_tokens_month: input.maxTokensMonth }),
      ...(input.billingEmail !== undefined && { billing_email: input.billingEmail }),
      ...(input.metadata !== undefined && { metadata: input.metadata }),
      updated_at: new Date(),
    },
  });

  return mapTenant(tenant);
}

/**
 * List all tenants (admin use only).
 */
export async function listTenants(options?: {
  status?: string;
  tier?: string;
  limit?: number;
  offset?: number;
}): Promise<{ tenants: Tenant[]; total: number }> {
  const prisma = getPrisma();
  const where = {
    ...(options?.status && { status: options.status }),
    ...(options?.tier && { tier: options.tier }),
  };

  const [tenants, total] = await Promise.all([
    prisma.tenants.findMany({
      where,
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
      orderBy: { created_at: "desc" },
    }),
    prisma.tenants.count({ where }),
  ]);

  return { tenants: tenants.map(mapTenant), total };
}

/**
 * Increment token usage for a tenant.
 */
export async function incrementTokenUsage(tenantId: string, tokens: number): Promise<void> {
  const prisma = getPrisma();
  await prisma.tenants.update({
    where: { id: tenantId },
    data: {
      tokens_used_month: { increment: tokens },
      updated_at: new Date(),
    },
  });
}

/**
 * Reset monthly token usage (called by cron at month start).
 */
export async function resetMonthlyTokenUsage(): Promise<number> {
  const prisma = getPrisma();
  const result = await prisma.tenants.updateMany({
    data: { tokens_used_month: 0, updated_at: new Date() },
  });
  return result.count;
}

// ─── Member Management ────────────────────────────────────────────────────────

/**
 * Add a member to a tenant.
 */
export async function addMember(
  tenantId: string,
  params: { userId: string; email: string; role?: MemberRole; invitedBy?: string }
): Promise<TenantMember> {
  const prisma = getPrisma();

  // Check seat limit
  const tenant = await prisma.tenants.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error(`Tenant not found: ${tenantId}`);

  const memberCount = await prisma.tenant_members.count({
    where: { tenant_id: tenantId, status: { in: ["active", "invited"] } },
  });

  if (memberCount >= tenant.max_seats) {
    throw new Error(`Seat limit reached (${memberCount}/${tenant.max_seats})`);
  }

  const member = await prisma.tenant_members.create({
    data: {
      tenant_id: tenantId,
      user_id: params.userId,
      email: params.email,
      role: params.role ?? "member",
      status: "invited",
      invited_by: params.invitedBy ?? null,
    },
  });

  return mapMember(member);
}

/**
 * Get a member by user ID within a tenant.
 */
export async function getMember(tenantId: string, userId: string): Promise<TenantMember | null> {
  const prisma = getPrisma();
  const member = await prisma.tenant_members.findUnique({
    where: { tenant_id_user_id: { tenant_id: tenantId, user_id: userId } },
  });
  return member ? mapMember(member) : null;
}

/**
 * Get a member by email within a tenant.
 */
export async function getMemberByEmail(tenantId: string, email: string): Promise<TenantMember | null> {
  const prisma = getPrisma();
  const member = await prisma.tenant_members.findUnique({
    where: { tenant_id_email: { tenant_id: tenantId, email } },
  });
  return member ? mapMember(member) : null;
}

/**
 * Update a member's role or status.
 */
export async function updateMember(
  tenantId: string,
  userId: string,
  params: { role?: MemberRole; status?: MemberStatus }
): Promise<TenantMember> {
  const prisma = getPrisma();

  const member = await prisma.tenant_members.update({
    where: { tenant_id_user_id: { tenant_id: tenantId, user_id: userId } },
    data: {
      ...(params.role && { role: params.role }),
      ...(params.status && { status: params.status }),
      ...(params.status === "active" && { joined_at: new Date() }),
      updated_at: new Date(),
    },
  });

  return mapMember(member);
}

/**
 * Remove a member from a tenant.
 */
export async function removeMember(tenantId: string, userId: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.tenant_members.delete({
    where: { tenant_id_user_id: { tenant_id: tenantId, user_id: userId } },
  });
}

/**
 * List members in a tenant.
 */
export async function listMembers(tenantId: string): Promise<TenantMember[]> {
  const prisma = getPrisma();
  const members = await prisma.tenant_members.findMany({
    where: { tenant_id: tenantId },
    orderBy: { created_at: "asc" },
  });
  return members.map(mapMember);
}

/**
 * Get all tenants a user belongs to.
 */
export async function getTenantsByUserId(userId: string): Promise<Array<{ tenant: Tenant; member: TenantMember }>> {
  const prisma = getPrisma();
  const memberships = await prisma.tenant_members.findMany({
    where: { user_id: userId, status: "active" },
    include: { tenant: true },
  });

  return memberships.map(m => ({
    tenant: mapTenant(m.tenant),
    member: mapMember(m),
  }));
}

// ─── Configuration ────────────────────────────────────────────────────────────

/**
 * Set a configuration value for a tenant.
 */
export async function setConfig(tenantId: string, input: SetConfigInput): Promise<TenantConfig> {
  const prisma = getPrisma();

  const config = await prisma.tenant_configs.upsert({
    where: { tenant_id_key: { tenant_id: tenantId, key: input.key } },
    create: {
      tenant_id: tenantId,
      key: input.key,
      value: input.value,
      value_type: input.valueType ?? "string",
      is_secret: input.isSecret ?? false,
      description: input.description ?? null,
    },
    update: {
      value: input.value,
      value_type: input.valueType ?? "string",
      is_secret: input.isSecret ?? false,
      description: input.description ?? null,
      updated_at: new Date(),
    },
  });

  return mapConfig(config);
}

/**
 * Get a configuration value.
 */
export async function getConfig(tenantId: string, key: string): Promise<TenantConfig | null> {
  const prisma = getPrisma();
  const config = await prisma.tenant_configs.findUnique({
    where: { tenant_id_key: { tenant_id: tenantId, key } },
  });
  return config ? mapConfig(config) : null;
}

/**
 * Get all configuration for a tenant.
 */
export async function getAllConfigs(tenantId: string): Promise<TenantConfig[]> {
  const prisma = getPrisma();
  const configs = await prisma.tenant_configs.findMany({
    where: { tenant_id: tenantId },
    orderBy: { key: "asc" },
  });
  return configs.map(mapConfig);
}

/**
 * Delete a configuration key.
 */
export async function deleteConfig(tenantId: string, key: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.tenant_configs.delete({
    where: { tenant_id_key: { tenant_id: tenantId, key } },
  });
}

// ─── API Keys ─────────────────────────────────────────────────────────────────

/**
 * Create a new API key for a tenant.
 */
export async function createApiKey(
  tenantId: string,
  createdBy: string,
  input: CreateApiKeyInput
): Promise<CreateApiKeyResult> {
  const prisma = getPrisma();

  const { key, hash, keyPrefix } = generateApiKey("sk_live");

  const apiKey = await prisma.tenant_api_keys.create({
    data: {
      tenant_id: tenantId,
      name: input.name,
      key_prefix: keyPrefix,
      key_hash: hash,
      scopes: input.scopes ?? ["read", "write"],
      rate_limit: input.rateLimit ?? 100,
      expires_at: input.expiresAt ?? null,
      created_by: createdBy,
    },
  });

  return {
    apiKey: mapApiKey(apiKey),
    secretKey: key, // Only returned once!
  };
}

/**
 * Validate an API key and return the associated tenant.
 */
export async function validateApiKey(key: string): Promise<{ tenant: Tenant; apiKey: TenantApiKey } | null> {
  const prisma = getPrisma();

  const hash = hashApiKey(key);
  const apiKey = await prisma.tenant_api_keys.findUnique({
    where: { key_hash: hash },
    include: { tenant: true },
  });

  if (!apiKey) return null;
  if (!apiKey.is_active) return null;
  if (apiKey.expires_at && apiKey.expires_at < new Date()) return null;

  // Update last used
  await prisma.tenant_api_keys.update({
    where: { id: apiKey.id },
    data: { last_used_at: new Date() },
  });

  return {
    tenant: mapTenant(apiKey.tenant),
    apiKey: mapApiKey(apiKey),
  };
}

/**
 * List API keys for a tenant (without hashes).
 */
export async function listApiKeys(tenantId: string): Promise<TenantApiKey[]> {
  const prisma = getPrisma();
  const keys = await prisma.tenant_api_keys.findMany({
    where: { tenant_id: tenantId },
    orderBy: { created_at: "desc" },
  });
  return keys.map(mapApiKey);
}

/**
 * Revoke an API key.
 */
export async function revokeApiKey(tenantId: string, keyId: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.tenant_api_keys.update({
    where: { id: keyId, tenant_id: tenantId },
    data: { is_active: false },
  });
}

// ─── Tier Limits Helper ───────────────────────────────────────────────────────

function getTierLimits(tier: TenantTier): {
  maxSeats: number;
  maxConversationsDay: number;
  maxTokensMonth: number;
} {
  const limits: Record<TenantTier, { maxSeats: number; maxConversationsDay: number; maxTokensMonth: number }> = {
    starter: { maxSeats: 3, maxConversationsDay: 50, maxTokensMonth: 500_000 },
    professional: { maxSeats: 10, maxConversationsDay: 500, maxTokensMonth: 2_000_000 },
    enterprise: { maxSeats: 100, maxConversationsDay: 5000, maxTokensMonth: 20_000_000 },
    white_label: { maxSeats: 1000, maxConversationsDay: 50000, maxTokensMonth: 100_000_000 },
  };
  return limits[tier];
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapTenant(row: {
  id: string;
  slug: string;
  name: string;
  status: string;
  tier: string;
  domain: string | null;
  logo_url: string | null;
  primary_color: string | null;
  timezone: string;
  locale: string;
  max_seats: number;
  max_conversations_day: number;
  max_tokens_month: number;
  tokens_used_month: number;
  stripe_customer_id: string | null;
  billing_email: string | null;
  trial_ends_at: Date | null;
  metadata: unknown;
  created_at: Date;
  updated_at: Date;
}): Tenant {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status as Tenant["status"],
    tier: row.tier as Tenant["tier"],
    domain: row.domain,
    logoUrl: row.logo_url,
    primaryColor: row.primary_color,
    timezone: row.timezone,
    locale: row.locale,
    maxSeats: row.max_seats,
    maxConversationsDay: row.max_conversations_day,
    maxTokensMonth: row.max_tokens_month,
    tokensUsedMonth: row.tokens_used_month,
    stripeCustomerId: row.stripe_customer_id,
    billingEmail: row.billing_email,
    trialEndsAt: row.trial_ends_at,
    metadata: row.metadata as Record<string, unknown>,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMember(row: {
  id: string;
  tenant_id: string;
  user_id: string;
  email: string;
  role: string;
  status: string;
  invited_by: string | null;
  joined_at: Date | null;
  last_active: Date | null;
  created_at: Date;
  updated_at: Date;
}): TenantMember {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    email: row.email,
    role: row.role as MemberRole,
    status: row.status as MemberStatus,
    invitedBy: row.invited_by,
    joinedAt: row.joined_at,
    lastActive: row.last_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapConfig(row: {
  id: string;
  tenant_id: string;
  key: string;
  value: string;
  value_type: string;
  is_secret: boolean;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}): TenantConfig {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    key: row.key,
    value: row.value,
    valueType: row.value_type as TenantConfig["valueType"],
    isSecret: row.is_secret,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapApiKey(row: {
  id: string;
  tenant_id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit: number;
  last_used_at: Date | null;
  expires_at: Date | null;
  is_active: boolean;
  created_by: string;
  created_at: Date;
}): TenantApiKey {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    keyPrefix: row.key_prefix,
    scopes: row.scopes as TenantApiKey["scopes"],
    rateLimit: row.rate_limit,
    lastUsedAt: row.last_used_at,
    expiresAt: row.expires_at,
    isActive: row.is_active,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}
