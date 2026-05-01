/**
 * Multi-Market Knowledge Versioning
 * Sprint 5.3 — Compliance & Security (Item 5)
 *
 * Manages market-specific knowledge versions to ensure Olivia
 * provides accurate, up-to-date information for each jurisdiction.
 *
 * Use Cases:
 * - Real estate laws vary by state/country
 * - Tax regulations change annually
 * - Immigration rules differ by citizenship
 * - Professional licensing requirements vary
 */

import { getPrisma } from "@/lib/db";
import { getTenantContext } from "@/lib/tenant";

// ─── Types ────────────────────────────────────────────────────────────────────

export type KnowledgeDomain =
  | "real_estate"
  | "tax"
  | "immigration"
  | "employment"
  | "banking"
  | "healthcare"
  | "education"
  | "business_formation";

export type MarketScope =
  | "global"
  | "country"
  | "state"
  | "city";

export interface KnowledgeVersion {
  id: string;
  domain: KnowledgeDomain;
  marketCode: string; // "US", "US-CA", "US-CA-LA", "GB", "GB-ENG", etc.
  marketScope: MarketScope;
  version: string; // Semantic version: "2024.1.0"
  effectiveDate: Date;
  expirationDate: Date | null;
  /** Content hash for change detection */
  contentHash: string;
  /** Source authority (legislation, regulator, etc.) */
  sourceAuthority: string;
  /** URL to authoritative source */
  sourceUrl: string | null;
  /** Human-readable changelog */
  changelog: string;
  /** Is this the current active version? */
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeRule {
  id: string;
  versionId: string;
  ruleCode: string; // Unique rule identifier
  title: string;
  description: string;
  /** Rule type for filtering */
  ruleType: RuleType;
  /** Conditions that trigger this rule (JSON Logic format) */
  conditions: Record<string, unknown>;
  /** The actual rule content/requirement */
  content: string;
  /** Consequences of non-compliance */
  consequences: string | null;
  /** Exceptions to this rule */
  exceptions: string | null;
  /** Cross-references to other rules */
  relatedRules: string[];
  /** Confidence in rule accuracy (0-1) */
  confidence: number;
  /** Last verified date */
  lastVerified: Date;
  metadata: Record<string, unknown>;
}

export type RuleType =
  | "requirement"
  | "prohibition"
  | "disclosure"
  | "timeline"
  | "fee"
  | "document"
  | "threshold"
  | "exemption";

// ─── Market Code Utilities ────────────────────────────────────────────────────

/**
 * Parse a market code into its components.
 * Examples: "US" -> country only, "US-CA" -> country + state, "US-CA-LA" -> country + state + city
 */
export function parseMarketCode(marketCode: string): MarketCodeComponents {
  const parts = marketCode.split("-");
  return {
    country: parts[0] ?? null,
    state: parts[1] ?? null,
    city: parts[2] ?? null,
    full: marketCode,
    scope: parts.length === 1 ? "country" : parts.length === 2 ? "state" : "city",
  };
}

export interface MarketCodeComponents {
  country: string | null;
  state: string | null;
  city: string | null;
  full: string;
  scope: MarketScope;
}

/**
 * Build a market code from components.
 */
export function buildMarketCode(params: {
  country: string;
  state?: string;
  city?: string;
}): string {
  let code = params.country.toUpperCase();
  if (params.state) {
    code += `-${params.state.toUpperCase()}`;
    if (params.city) {
      code += `-${params.city.toUpperCase()}`;
    }
  }
  return code;
}

/**
 * Get all applicable market codes for a location (from specific to general).
 * Example: "US-CA-LA" -> ["US-CA-LA", "US-CA", "US", "global"]
 */
export function getMarketCodeHierarchy(marketCode: string): string[] {
  const parts = marketCode.split("-");
  const hierarchy: string[] = [];

  for (let i = parts.length; i > 0; i--) {
    hierarchy.push(parts.slice(0, i).join("-"));
  }

  hierarchy.push("global");
  return hierarchy;
}

// ─── Knowledge Version Resolution ─────────────────────────────────────────────

/**
 * Get the active knowledge version for a domain and market.
 * Walks up the hierarchy if no specific version exists.
 */
export async function resolveKnowledgeVersion(
  domain: KnowledgeDomain,
  marketCode: string
): Promise<KnowledgeVersion | null> {
  const hierarchy = getMarketCodeHierarchy(marketCode);

  for (const market of hierarchy) {
    const version = await getActiveVersion(domain, market);
    if (version) {
      return version;
    }
  }

  return null;
}

/**
 * Get the active version for an exact domain + market combination.
 */
async function getActiveVersion(
  domain: KnowledgeDomain,
  marketCode: string
): Promise<KnowledgeVersion | null> {
  // In production, this queries the database
  // For now, check in-memory registry
  const key = `${domain}:${marketCode}`;
  const version = knowledgeVersionRegistry.get(key);

  if (version?.isActive) {
    // Check if expired
    if (version.expirationDate && version.expirationDate < new Date()) {
      return null;
    }
    return version;
  }

  return null;
}

/**
 * Get all active versions for a domain across all markets.
 */
export async function getActiveVersionsForDomain(domain: KnowledgeDomain): Promise<KnowledgeVersion[]> {
  const versions: KnowledgeVersion[] = [];

  for (const [key, version] of knowledgeVersionRegistry.entries()) {
    if (key.startsWith(`${domain}:`) && version.isActive) {
      if (!version.expirationDate || version.expirationDate >= new Date()) {
        versions.push(version);
      }
    }
  }

  return versions;
}

// ─── Knowledge Rules ──────────────────────────────────────────────────────────

/**
 * Get applicable rules for a domain, market, and context.
 */
export async function getApplicableRules(params: {
  domain: KnowledgeDomain;
  marketCode: string;
  ruleType?: RuleType;
  context?: Record<string, unknown>;
}): Promise<KnowledgeRule[]> {
  const { domain, marketCode, ruleType, context } = params;

  // Get the active version
  const version = await resolveKnowledgeVersion(domain, marketCode);
  if (!version) {
    return [];
  }

  // Get rules for this version
  let rules = getRulesForVersion(version.id);

  // Filter by type if specified
  if (ruleType) {
    rules = rules.filter(r => r.ruleType === ruleType);
  }

  // Filter by conditions if context provided
  if (context) {
    rules = rules.filter(r => evaluateRuleConditions(r.conditions, context));
  }

  return rules;
}

/**
 * Evaluate rule conditions against context.
 * Uses simplified JSON Logic-style evaluation.
 */
function evaluateRuleConditions(
  conditions: Record<string, unknown>,
  context: Record<string, unknown>
): boolean {
  // If no conditions, rule always applies
  if (Object.keys(conditions).length === 0) {
    return true;
  }

  // Simple condition evaluation
  for (const [key, expected] of Object.entries(conditions)) {
    const actual = context[key];

    // Handle operators
    if (typeof expected === "object" && expected !== null) {
      const op = expected as Record<string, unknown>;
      if ("$gt" in op && typeof actual === "number") {
        if (!(actual > (op.$gt as number))) return false;
      }
      if ("$gte" in op && typeof actual === "number") {
        if (!(actual >= (op.$gte as number))) return false;
      }
      if ("$lt" in op && typeof actual === "number") {
        if (!(actual < (op.$lt as number))) return false;
      }
      if ("$lte" in op && typeof actual === "number") {
        if (!(actual <= (op.$lte as number))) return false;
      }
      if ("$in" in op && Array.isArray(op.$in)) {
        if (!op.$in.includes(actual)) return false;
      }
      if ("$nin" in op && Array.isArray(op.$nin)) {
        if (op.$nin.includes(actual)) return false;
      }
    } else {
      // Direct equality
      if (actual !== expected) return false;
    }
  }

  return true;
}

function getRulesForVersion(versionId: string): KnowledgeRule[] {
  return knowledgeRulesRegistry.get(versionId) ?? [];
}

// ─── Version Lifecycle ────────────────────────────────────────────────────────

/**
 * Register a new knowledge version.
 */
export async function registerKnowledgeVersion(params: {
  domain: KnowledgeDomain;
  marketCode: string;
  version: string;
  effectiveDate: Date;
  expirationDate?: Date;
  sourceAuthority: string;
  sourceUrl?: string;
  changelog: string;
  content: string;
  metadata?: Record<string, unknown>;
}): Promise<KnowledgeVersion> {
  const contentHash = hashContent(params.content);

  const newVersion: KnowledgeVersion = {
    id: crypto.randomUUID(),
    domain: params.domain,
    marketCode: params.marketCode,
    marketScope: parseMarketCode(params.marketCode).scope,
    version: params.version,
    effectiveDate: params.effectiveDate,
    expirationDate: params.expirationDate ?? null,
    contentHash,
    sourceAuthority: params.sourceAuthority,
    sourceUrl: params.sourceUrl ?? null,
    changelog: params.changelog,
    isActive: true,
    metadata: params.metadata ?? {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Deactivate previous version
  const key = `${params.domain}:${params.marketCode}`;
  const existing = knowledgeVersionRegistry.get(key);
  if (existing) {
    existing.isActive = false;
    existing.updatedAt = new Date();
  }

  // Register new version
  knowledgeVersionRegistry.set(key, newVersion);

  return newVersion;
}

/**
 * Add rules to a knowledge version.
 */
export async function addKnowledgeRules(
  versionId: string,
  rules: Omit<KnowledgeRule, "id" | "versionId">[]
): Promise<KnowledgeRule[]> {
  const newRules: KnowledgeRule[] = rules.map(r => ({
    ...r,
    id: crypto.randomUUID(),
    versionId,
  }));

  const existing = knowledgeRulesRegistry.get(versionId) ?? [];
  knowledgeRulesRegistry.set(versionId, [...existing, ...newRules]);

  return newRules;
}

/**
 * Expire a knowledge version.
 */
export async function expireKnowledgeVersion(
  domain: KnowledgeDomain,
  marketCode: string
): Promise<void> {
  const key = `${domain}:${marketCode}`;
  const version = knowledgeVersionRegistry.get(key);
  if (version) {
    version.isActive = false;
    version.expirationDate = new Date();
    version.updatedAt = new Date();
  }
}

// ─── Change Detection ─────────────────────────────────────────────────────────

/**
 * Check if content has changed since last version.
 */
export async function hasContentChanged(
  domain: KnowledgeDomain,
  marketCode: string,
  newContent: string
): Promise<boolean> {
  const current = await resolveKnowledgeVersion(domain, marketCode);
  if (!current) return true;

  const newHash = hashContent(newContent);
  return newHash !== current.contentHash;
}

/**
 * Get versions that are expiring soon.
 */
export async function getExpiringVersions(withinDays: number = 30): Promise<KnowledgeVersion[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + withinDays);

  const expiring: KnowledgeVersion[] = [];

  for (const version of knowledgeVersionRegistry.values()) {
    if (version.isActive && version.expirationDate && version.expirationDate <= cutoff) {
      expiring.push(version);
    }
  }

  return expiring;
}

function hashContent(content: string): string {
  // Simple hash for change detection
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

// ─── Pre-loaded Knowledge ─────────────────────────────────────────────────────

/**
 * Initialize with built-in knowledge versions.
 */
export async function initializeBuiltInKnowledge(): Promise<void> {
  // US Real Estate (Federal)
  await registerKnowledgeVersion({
    domain: "real_estate",
    marketCode: "US",
    version: "2024.1.0",
    effectiveDate: new Date("2024-01-01"),
    sourceAuthority: "Consumer Financial Protection Bureau",
    sourceUrl: "https://www.consumerfinance.gov/rules-policy/regulations/",
    changelog: "RESPA, TILA, Fair Housing Act baseline rules",
    content: "Federal real estate regulations including RESPA, TILA, Fair Housing Act",
  });

  // US-CA Real Estate (California)
  await registerKnowledgeVersion({
    domain: "real_estate",
    marketCode: "US-CA",
    version: "2024.1.0",
    effectiveDate: new Date("2024-01-01"),
    sourceAuthority: "California Department of Real Estate",
    sourceUrl: "https://www.dre.ca.gov/",
    changelog: "California-specific disclosure requirements, agency law, licensing",
    content: "California real estate regulations",
  });

  // Add rules for California real estate
  const caVersion = await resolveKnowledgeVersion("real_estate", "US-CA");
  if (caVersion) {
    await addKnowledgeRules(caVersion.id, [
      {
        ruleCode: "CA-TDS",
        title: "Transfer Disclosure Statement Required",
        description: "Seller must provide Transfer Disclosure Statement (TDS) for 1-4 unit residential properties",
        ruleType: "disclosure",
        conditions: { propertyType: { $in: ["single_family", "condo", "townhouse", "duplex", "triplex", "fourplex"] } },
        content: "California Civil Code Section 1102 requires sellers of residential property (1-4 units) to complete and deliver a Transfer Disclosure Statement to prospective buyers.",
        consequences: "Failure to provide TDS may allow buyer to rescind the contract.",
        exceptions: "Exempt: REO/bank-owned, court-ordered sales, certain fiduciary sales",
        relatedRules: ["CA-NHD", "CA-SPQ"],
        confidence: 0.95,
        lastVerified: new Date(),
        metadata: {},
      },
      {
        ruleCode: "CA-NHD",
        title: "Natural Hazard Disclosure Required",
        description: "Seller must disclose if property is in mapped natural hazard zones",
        ruleType: "disclosure",
        conditions: {},
        content: "California law requires disclosure if property is located in: flood zone, very high fire hazard severity zone, earthquake fault zone, seismic hazard zone, or other mapped hazard areas.",
        consequences: "Buyer may rescind if material hazards not disclosed.",
        exceptions: null,
        relatedRules: ["CA-TDS"],
        confidence: 0.95,
        lastVerified: new Date(),
        metadata: {},
      },
    ]);
  }

  // UK Real Estate
  await registerKnowledgeVersion({
    domain: "real_estate",
    marketCode: "GB",
    version: "2024.1.0",
    effectiveDate: new Date("2024-01-01"),
    sourceAuthority: "HM Land Registry / The Property Ombudsman",
    sourceUrl: "https://www.gov.uk/browse/housing-local-services/buying-selling-property",
    changelog: "UK conveyancing rules, EPC requirements, leasehold reform",
    content: "UK real estate regulations including EPC, leasehold, stamp duty",
  });

  // UK Immigration
  await registerKnowledgeVersion({
    domain: "immigration",
    marketCode: "GB",
    version: "2024.2.0",
    effectiveDate: new Date("2024-04-01"),
    sourceAuthority: "UK Visas and Immigration",
    sourceUrl: "https://www.gov.uk/browse/visas-immigration",
    changelog: "Updated salary thresholds for Skilled Worker visa (April 2024)",
    content: "UK immigration rules including points-based system, skilled worker, family visas",
  });
}

// ─── In-Memory Registry ───────────────────────────────────────────────────────

// In production, these would be database tables
const knowledgeVersionRegistry = new Map<string, KnowledgeVersion>();
const knowledgeRulesRegistry = new Map<string, KnowledgeRule[]>();

// ─── Service Interface ────────────────────────────────────────────────────────

export interface KnowledgeVersioningService {
  resolveVersion(domain: KnowledgeDomain, marketCode: string): Promise<KnowledgeVersion | null>;
  getApplicableRules(params: { domain: KnowledgeDomain; marketCode: string; ruleType?: RuleType; context?: Record<string, unknown> }): Promise<KnowledgeRule[]>;
  registerVersion(params: Parameters<typeof registerKnowledgeVersion>[0]): Promise<KnowledgeVersion>;
  addRules(versionId: string, rules: Omit<KnowledgeRule, "id" | "versionId">[]): Promise<KnowledgeRule[]>;
  hasChanged(domain: KnowledgeDomain, marketCode: string, content: string): Promise<boolean>;
  getExpiring(withinDays?: number): Promise<KnowledgeVersion[]>;
  initialize(): Promise<void>;
}

export function getKnowledgeVersioningService(): KnowledgeVersioningService {
  return {
    resolveVersion: resolveKnowledgeVersion,
    getApplicableRules,
    registerVersion: registerKnowledgeVersion,
    addRules: addKnowledgeRules,
    hasChanged: hasContentChanged,
    getExpiring: getExpiringVersions,
    initialize: initializeBuiltInKnowledge,
  };
}
