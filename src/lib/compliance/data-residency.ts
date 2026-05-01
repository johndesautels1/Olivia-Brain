/**
 * Data Residency Routing
 * Sprint 5.3 — Compliance & Security (Item 1)
 *
 * Routes data storage and processing to appropriate geographic regions
 * based on tenant policies and regulatory requirements.
 *
 * Supported Regions:
 * - US: United States (default)
 * - EU: European Union (GDPR)
 * - UK: United Kingdom (UK GDPR post-Brexit)
 * - AP: Asia Pacific (various regulations)
 *
 * Use Cases:
 * - GDPR compliance: EU citizen data must stay in EU
 * - UK data protection: Post-Brexit UK GDPR compliance
 * - Enterprise requirements: Data sovereignty policies
 */

import { getTenantContext } from "@/lib/tenant";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DataRegion = "us" | "eu" | "uk" | "ap";

export interface RegionConfig {
  id: DataRegion;
  name: string;
  /** Supabase project URL for this region */
  supabaseUrl: string;
  /** Storage bucket endpoint */
  storageEndpoint: string;
  /** LLM API endpoint (for region-specific routing) */
  llmEndpoint: string | null;
  /** Countries that map to this region (ISO 3166-1 alpha-2) */
  countries: string[];
  /** Regulatory frameworks applicable */
  regulations: string[];
}

export interface ResidencyCheckResult {
  allowed: boolean;
  selectedRegion: DataRegion;
  reason: string;
  alternativeRegions: DataRegion[];
}

export interface DataRoutingDecision {
  region: DataRegion;
  storageEndpoint: string;
  llmEndpoint: string | null;
  requiresEncryption: boolean;
  retentionDays: number;
  auditRequired: boolean;
}

// ─── Region Configuration ─────────────────────────────────────────────────────

/**
 * Region configurations with endpoints and regulatory info.
 * In production, these would come from environment variables.
 */
export const REGION_CONFIGS: Record<DataRegion, RegionConfig> = {
  us: {
    id: "us",
    name: "United States",
    supabaseUrl: process.env.SUPABASE_URL_US ?? process.env.SUPABASE_URL ?? "",
    storageEndpoint: process.env.STORAGE_ENDPOINT_US ?? "",
    llmEndpoint: null, // US is default, no special routing
    countries: ["US", "CA", "MX", "BR", "AR", "CL", "CO", "PE"],
    regulations: ["CCPA", "HIPAA", "SOC2"],
  },
  eu: {
    id: "eu",
    name: "European Union",
    supabaseUrl: process.env.SUPABASE_URL_EU ?? process.env.SUPABASE_URL ?? "",
    storageEndpoint: process.env.STORAGE_ENDPOINT_EU ?? "",
    llmEndpoint: process.env.LLM_ENDPOINT_EU ?? null,
    countries: [
      "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
      "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
      "PL", "PT", "RO", "SK", "SI", "ES", "SE",
      // EEA
      "IS", "LI", "NO",
      // Adequacy decisions
      "CH", "IL", "JP", "KR", "NZ",
    ],
    regulations: ["GDPR", "ePrivacy", "AI_Act"],
  },
  uk: {
    id: "uk",
    name: "United Kingdom",
    supabaseUrl: process.env.SUPABASE_URL_UK ?? process.env.SUPABASE_URL ?? "",
    storageEndpoint: process.env.STORAGE_ENDPOINT_UK ?? "",
    llmEndpoint: process.env.LLM_ENDPOINT_UK ?? null,
    countries: ["GB", "IM", "JE", "GG"],
    regulations: ["UK_GDPR", "DPA_2018"],
  },
  ap: {
    id: "ap",
    name: "Asia Pacific",
    supabaseUrl: process.env.SUPABASE_URL_AP ?? process.env.SUPABASE_URL ?? "",
    storageEndpoint: process.env.STORAGE_ENDPOINT_AP ?? "",
    llmEndpoint: process.env.LLM_ENDPOINT_AP ?? null,
    countries: [
      "AU", "NZ", "SG", "HK", "TW", "MY", "TH", "ID", "PH", "VN",
      "IN", "JP", "KR", "CN",
    ],
    regulations: ["PDPA_SG", "Privacy_Act_AU", "APPI_JP", "PIPA_KR"],
  },
};

// ─── Region Resolution ────────────────────────────────────────────────────────

/**
 * Determine the appropriate data region for a user based on:
 * 1. Tenant policy (if in tenant context)
 * 2. User's country code
 * 3. Explicit preference
 */
export function resolveDataRegion(params: {
  countryCode?: string;
  preferredRegion?: DataRegion;
  dataType?: DataType;
}): ResidencyCheckResult {
  const { countryCode, preferredRegion, dataType = "general" } = params;

  // Check tenant context for allowed regions
  const ctx = getTenantContext();
  const allowedRegions = ctx?.policies.dataResidency?.allowedRegions as DataRegion[] ?? ["us", "eu", "uk", "ap"];

  // If explicit preference and it's allowed, use it
  if (preferredRegion && allowedRegions.includes(preferredRegion)) {
    return {
      allowed: true,
      selectedRegion: preferredRegion,
      reason: "explicit_preference",
      alternativeRegions: allowedRegions.filter(r => r !== preferredRegion),
    };
  }

  // Determine region from country code
  if (countryCode) {
    const regionFromCountry = getRegionForCountry(countryCode);
    if (regionFromCountry && allowedRegions.includes(regionFromCountry)) {
      return {
        allowed: true,
        selectedRegion: regionFromCountry,
        reason: "country_mapping",
        alternativeRegions: allowedRegions.filter(r => r !== regionFromCountry),
      };
    }

    // Country mapped to a region not allowed by tenant
    if (regionFromCountry && !allowedRegions.includes(regionFromCountry)) {
      // Fall back to first allowed region
      const fallback = allowedRegions[0] ?? "us";
      return {
        allowed: false,
        selectedRegion: fallback,
        reason: `country_region_not_allowed:${regionFromCountry}`,
        alternativeRegions: allowedRegions,
      };
    }
  }

  // Default to first allowed region (or US)
  const defaultRegion = allowedRegions[0] ?? "us";
  return {
    allowed: true,
    selectedRegion: defaultRegion,
    reason: "default",
    alternativeRegions: allowedRegions.filter(r => r !== defaultRegion),
  };
}

/**
 * Get the region for a country code.
 */
export function getRegionForCountry(countryCode: string): DataRegion | null {
  const upperCode = countryCode.toUpperCase();
  for (const [region, config] of Object.entries(REGION_CONFIGS)) {
    if (config.countries.includes(upperCode)) {
      return region as DataRegion;
    }
  }
  return null;
}

/**
 * Check if a specific region is allowed for the current tenant.
 */
export function isRegionAllowed(region: DataRegion): boolean {
  const ctx = getTenantContext();
  if (!ctx) return true; // No tenant = system mode, all allowed

  const allowed = ctx.policies.dataResidency?.allowedRegions as DataRegion[] ?? ["us", "eu", "uk", "ap"];
  return allowed.includes(region);
}

// ─── Data Routing Decisions ───────────────────────────────────────────────────

export type DataType = "general" | "pii" | "financial" | "health" | "biometric" | "conversation";

/**
 * Get complete routing decision for data storage.
 */
export function getDataRoutingDecision(params: {
  countryCode?: string;
  preferredRegion?: DataRegion;
  dataType: DataType;
}): DataRoutingDecision {
  const { countryCode, preferredRegion, dataType } = params;

  const residency = resolveDataRegion({ countryCode, preferredRegion, dataType });
  const regionConfig = REGION_CONFIGS[residency.selectedRegion];

  // Determine encryption and retention based on data type and region
  const requiresEncryption = getEncryptionRequirement(dataType, residency.selectedRegion);
  const retentionDays = getRetentionDays(dataType, residency.selectedRegion);
  const auditRequired = getAuditRequirement(dataType, residency.selectedRegion);

  return {
    region: residency.selectedRegion,
    storageEndpoint: regionConfig.storageEndpoint,
    llmEndpoint: regionConfig.llmEndpoint,
    requiresEncryption,
    retentionDays,
    auditRequired,
  };
}

function getEncryptionRequirement(dataType: DataType, region: DataRegion): boolean {
  // All PII, financial, health, biometric data requires encryption
  if (["pii", "financial", "health", "biometric"].includes(dataType)) {
    return true;
  }
  // EU/UK requires encryption for all personal data
  if (["eu", "uk"].includes(region)) {
    return true;
  }
  return false;
}

function getRetentionDays(dataType: DataType, region: DataRegion): number {
  // GDPR/UK GDPR: Data minimization principle
  if (["eu", "uk"].includes(region)) {
    switch (dataType) {
      case "conversation": return 90;
      case "pii": return 365;
      case "financial": return 2555; // 7 years
      case "health": return 3650; // 10 years
      default: return 365;
    }
  }

  // US: Generally longer retention
  switch (dataType) {
    case "conversation": return 365;
    case "pii": return 730; // 2 years
    case "financial": return 2555; // 7 years
    case "health": return 3650; // 10 years
    default: return 730;
  }
}

function getAuditRequirement(dataType: DataType, region: DataRegion): boolean {
  // All sensitive data types require audit
  if (["pii", "financial", "health", "biometric"].includes(dataType)) {
    return true;
  }
  // EU/UK requires audit trail for personal data processing
  if (["eu", "uk"].includes(region)) {
    return true;
  }
  return false;
}

// ─── Cross-Border Transfer Checks ─────────────────────────────────────────────

export interface TransferCheckResult {
  allowed: boolean;
  mechanism: string | null;
  requirements: string[];
  warnings: string[];
}

/**
 * Check if data transfer between regions is allowed.
 */
export function checkCrossBorderTransfer(
  sourceRegion: DataRegion,
  targetRegion: DataRegion,
  dataType: DataType
): TransferCheckResult {
  // Same region = always allowed
  if (sourceRegion === targetRegion) {
    return {
      allowed: true,
      mechanism: "same_region",
      requirements: [],
      warnings: [],
    };
  }

  // EU/UK transfers require specific mechanisms
  if (sourceRegion === "eu" || sourceRegion === "uk") {
    return checkEUOutboundTransfer(sourceRegion, targetRegion, dataType);
  }

  // Other transfers generally allowed with basic requirements
  return {
    allowed: true,
    mechanism: "standard_contractual_clauses",
    requirements: ["Data Processing Agreement required"],
    warnings: [],
  };
}

function checkEUOutboundTransfer(
  sourceRegion: DataRegion,
  targetRegion: DataRegion,
  dataType: DataType
): TransferCheckResult {
  // EU to UK: Adequacy decision exists
  if (sourceRegion === "eu" && targetRegion === "uk") {
    return {
      allowed: true,
      mechanism: "adequacy_decision",
      requirements: [],
      warnings: ["UK adequacy decision subject to periodic review"],
    };
  }

  // UK to EU: Free flow under UK GDPR
  if (sourceRegion === "uk" && targetRegion === "eu") {
    return {
      allowed: true,
      mechanism: "uk_gdpr_free_flow",
      requirements: [],
      warnings: [],
    };
  }

  // EU/UK to US: Requires additional safeguards
  if (targetRegion === "us") {
    return {
      allowed: true,
      mechanism: "standard_contractual_clauses",
      requirements: [
        "Standard Contractual Clauses (SCCs) required",
        "Transfer Impact Assessment required",
        "Supplementary measures may be needed",
      ],
      warnings: [
        "US surveillance laws may apply",
        "Consider data minimization before transfer",
      ],
    };
  }

  // EU/UK to AP: Varies by country
  if (targetRegion === "ap") {
    return {
      allowed: true,
      mechanism: "standard_contractual_clauses",
      requirements: [
        "Standard Contractual Clauses (SCCs) required",
        "Country-specific assessment required",
      ],
      warnings: [
        "Verify adequacy status of specific destination country",
      ],
    };
  }

  return {
    allowed: true,
    mechanism: "standard_contractual_clauses",
    requirements: ["Standard Contractual Clauses required"],
    warnings: [],
  };
}

// ─── Service Interface ────────────────────────────────────────────────────────

export interface DataResidencyService {
  resolveRegion(params: { countryCode?: string; preferredRegion?: DataRegion; dataType?: DataType }): ResidencyCheckResult;
  getRoutingDecision(params: { countryCode?: string; preferredRegion?: DataRegion; dataType: DataType }): DataRoutingDecision;
  checkTransfer(source: DataRegion, target: DataRegion, dataType: DataType): TransferCheckResult;
  getRegionConfig(region: DataRegion): RegionConfig;
  getAllowedRegions(): DataRegion[];
}

/**
 * Get the data residency service instance.
 */
export function getDataResidencyService(): DataResidencyService {
  return {
    resolveRegion: resolveDataRegion,
    getRoutingDecision: getDataRoutingDecision,
    checkTransfer: checkCrossBorderTransfer,
    getRegionConfig: (region) => REGION_CONFIGS[region],
    getAllowedRegions: () => {
      const ctx = getTenantContext();
      return (ctx?.policies.dataResidency?.allowedRegions as DataRegion[]) ?? ["us", "eu", "uk", "ap"];
    },
  };
}
