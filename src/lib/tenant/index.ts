/**
 * Multi-Tenant Module
 * Sprint 5.1 — Tenant Architecture
 *
 * Complete multi-tenant infrastructure for Olivia Brain:
 * - Tenant identity and membership management
 * - Request-scoped tenant context (AsyncLocalStorage)
 * - Per-tenant adapter selection
 * - Per-tenant model routing
 * - Per-tenant policies (approval, rate limits, features, data residency)
 */

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  // Core
  Tenant,
  TenantMember,
  TenantConfig,
  TenantApiKey,
  TenantContext,
  // Inputs
  CreateTenantInput,
  UpdateTenantInput,
  SetConfigInput,
  CreateApiKeyInput,
  CreateApiKeyResult,
  // Adapters
  TenantAdapterOverride,
  SetAdapterOverrideInput,
  AdapterType,
  // Models
  TenantModelOverride,
  SetModelOverrideInput,
  ModelIntent,
  ModelProvider,
  ModelSelection,
  // Policies
  TenantPolicy,
  SetPolicyInput,
  PolicyType,
  LimitPeriod,
  DataRegion,
  // Enums
  TenantStatus,
  TenantTier,
  MemberRole,
  MemberStatus,
  ConfigValueType,
  ApiKeyScope,
} from "./types";

export { TIER_LIMITS } from "./types";

// ─── Context & Isolation ──────────────────────────────────────────────────────
export {
  // Context access
  getTenantContext,
  requireTenantContext,
  getCurrentTenantId,
  requireCurrentTenantId,
  // Context execution
  withTenantContext,
  withTenantContextSync,
  buildTenantContext,
  // Permission checks
  hasRole,
  hasFeature,
  requiresApproval,
  getAllowedRegions,
  // API key utilities
  generateApiKey,
  hashApiKey,
  verifyApiKey,
  // Isolation helpers
  tenantWhereClause,
  withTenantId,
  // Errors
  TenantContextError,
  TenantAccessDeniedError,
  TenantLimitExceededError,
} from "./context";

// ─── Tenant Service ───────────────────────────────────────────────────────────
export {
  // Tenant CRUD
  createTenant,
  getTenantById,
  getTenantBySlug,
  getTenantByDomain,
  updateTenant,
  listTenants,
  incrementTokenUsage,
  resetMonthlyTokenUsage,
  // Member management
  addMember,
  getMember,
  getMemberByEmail,
  updateMember,
  removeMember,
  listMembers,
  getTenantsByUserId,
  // Configuration
  setConfig,
  getConfig,
  getAllConfigs,
  deleteConfig,
  // API keys
  createApiKey,
  validateApiKey,
  listApiKeys,
  revokeApiKey,
} from "./service";

// ─── Adapter Overrides ────────────────────────────────────────────────────────
export {
  // CRUD
  setAdapterOverride,
  getAdapterOverride,
  getAdapterOverrides,
  getAdapterOverridesByType,
  deleteAdapterOverride,
  // Resolution
  resolveAdapter,
  getPreferredAdapterName,
  isAdapterEnabled,
  // Registry
  AVAILABLE_ADAPTERS,
  getAvailableAdapters,
  isValidAdapter,
} from "./adapters";

export type { AdapterInfo, ResolvedAdapter } from "./adapters";

// ─── Model Overrides ──────────────────────────────────────────────────────────
export {
  // CRUD
  setModelOverride,
  getModelOverrides,
  getModelOverridesByIntent,
  deleteModelOverride,
  // Resolution
  resolveModel,
  getModelForIntent,
  // Registry
  AVAILABLE_MODELS,
  getAvailableModels,
  getAvailableProviders,
  isValidModel,
  getModelInfo,
  estimateCost,
} from "./models";

export type { ModelInfo } from "./models";

// ─── Policies ─────────────────────────────────────────────────────────────────
export {
  // CRUD
  setPolicy,
  getPolicy,
  getPolicies,
  getPoliciesByType,
  deletePolicy,
  // Evaluation
  checkApprovalRequired,
  getApproversForAction,
  getRateLimitForAction,
  isFeatureEnabled,
  getEnabledFeatures,
  getAllowedDataRegions,
  isRegionAllowed,
  getPreferredRegion,
  // Templates
  POLICY_TEMPLATES,
  applyPolicyTemplate,
} from "./policies";

export type { ApprovalCheckResult, RateLimitInfo } from "./policies";
