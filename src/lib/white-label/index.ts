/**
 * White-Label System
 * Sprint 5.2 — Complete White-Label Infrastructure
 *
 * Enables full white-labeling of Olivia for enterprise tenants:
 * - Branding Packs (colors, typography, logos, voice)
 * - Custom Personas (replace Olivia, Cristiano, Emelia)
 * - Custom Prompt Packs (onboarding, analysis, reports)
 * - Entitlements System (features, quotas, tiers)
 * - Deployment Configuration (domains, SSL, CDN)
 */

// ─── Branding Pack System ─────────────────────────────────────────────────────
export {
  // Resolution
  getActiveBranding,
  getBrandColors,
  getBrandTypography,
  getBrandLogos,
  getVoiceProfile,
  // CSS Generation
  getBrandingCssVariables,
  generateBrandingCss,
  // CRUD
  saveBrandingPack,
  getBrandingPack,
  deleteBrandingPack,
  // Service
  getBrandingService,
  // Defaults
  DEFAULT_COLORS,
  DEFAULT_TYPOGRAPHY,
  DEFAULT_VOICE_PROFILE,
  // Types
  type BrandingPack,
  type BrandColors,
  type BrandTypography,
  type BrandLogos,
  type VoiceProfile,
  type EmailTemplateSet,
  type EmailTemplate,
  type BrandingService,
} from "./branding";

// ─── Custom Persona Configuration ─────────────────────────────────────────────
export {
  // Resolution
  getPersona,
  getPrimaryPersona,
  getJudgePersona,
  getSupportPersona,
  getTenantPersonas,
  // CRUD
  savePersona,
  deletePersona,
  // System Prompt
  generatePersonaSystemPrompt,
  // Service
  getPersonaService,
  // Defaults
  DEFAULT_OLIVIA,
  DEFAULT_CRISTIANO,
  DEFAULT_EMELIA,
  // Types
  type PersonaRole,
  type TenantPersona,
  type PersonalityTraits,
  type AvatarConfig,
  type VoiceConfig,
  type LLMConfig,
  type BehaviorConfig,
  type PersonaService,
} from "./personas";

// ─── Custom Prompt Packs ──────────────────────────────────────────────────────
export {
  // Resolution
  getPromptTemplate,
  getPromptsByCategory,
  renderPrompt,
  // CRUD
  savePromptPack,
  getPromptPacks,
  deletePromptPack,
  // Service
  getPromptService,
  // Defaults
  DEFAULT_ONBOARDING_PACK,
  DEFAULT_ANALYSIS_PACK,
  DEFAULT_REPORTS_PACK,
  DEFAULT_COMPLIANCE_PACK,
  // Types
  type PromptPack,
  type PromptCategory,
  type PromptTemplate,
  type PromptService,
} from "./prompts";

// ─── Entitlements System ──────────────────────────────────────────────────────
export {
  // Feature Checking
  hasFeature,
  checkFeatureAccess,
  checkUsageLimit,
  getRemainingQuota,
  getUsageStats,
  // Usage Tracking
  recordUsage,
  getUsageHistory,
  resetBillingPeriod,
  // Entitlements CRUD
  getTenantEntitlements,
  saveEntitlements,
  changeTier,
  startTrial,
  cancelSubscription,
  deleteEntitlements,
  // Service
  getEntitlementsService,
  // Tier Definitions
  TIER_ENTITLEMENTS,
  // Types
  type SubscriptionTier,
  type Feature,
  type UsageMetric,
  type TierEntitlements,
  type TenantEntitlements,
  type EntitlementCheck,
  type UsageRecord,
  type EntitlementsService,
} from "./entitlements";

// ─── Deployment Configuration ─────────────────────────────────────────────────
export {
  // Resolution
  getDeployment,
  getDeploymentByTenant,
  getDeploymentByDomain,
  getAllDeployments,
  // Domain Management
  addDomain,
  removeDomain,
  verifyDomain,
  // SSL
  uploadCustomCertificate,
  // Deployment CRUD
  saveDeployment,
  provisionDeployment,
  suspendDeployment,
  reactivateDeployment,
  terminateDeployment,
  deleteDeployment,
  // Health & Monitoring
  checkDeploymentHealth,
  getDeploymentMetrics,
  // Service
  getDeploymentService,
  // Defaults
  DEFAULT_SSL_CONFIG,
  DEFAULT_CDN_CONFIG,
  DEFAULT_ENVIRONMENT_CONFIG,
  // Types
  type DeploymentStatus,
  type DeploymentEnvironment,
  type SSLStatus,
  type CDNProvider,
  type TenantDeployment,
  type DomainConfig,
  type SSLConfig,
  type CertificateInfo,
  type CustomCertificate,
  type CDNConfig,
  type CacheRule,
  type EnvironmentConfig,
  type AccessRestriction,
  type DeploymentMetadata,
  type DomainVerificationResult,
  type DeploymentService,
} from "./deployment";

// ─── Unified White-Label Service ──────────────────────────────────────────────

import { getBrandingService, type BrandingService } from "./branding";
import { getPersonaService, type PersonaService } from "./personas";
import { getPromptService, type PromptService } from "./prompts";
import { getEntitlementsService, type EntitlementsService } from "./entitlements";
import { getDeploymentService, type DeploymentService } from "./deployment";

export interface WhiteLabelService {
  branding: BrandingService;
  personas: PersonaService;
  prompts: PromptService;
  entitlements: EntitlementsService;
  deployment: DeploymentService;
}

/**
 * Get the unified white-label service with all subsystems.
 */
export function getWhiteLabelService(): WhiteLabelService {
  return {
    branding: getBrandingService(),
    personas: getPersonaService(),
    prompts: getPromptService(),
    entitlements: getEntitlementsService(),
    deployment: getDeploymentService(),
  };
}
