/**
 * White-Label Deployment Configuration
 * Sprint 5.2 — White-Label System (Item 5)
 *
 * Manages tenant-specific deployment settings:
 * - Custom domain configuration
 * - Deployment environments
 * - Infrastructure settings
 * - SSL/TLS certificates
 * - CDN and edge configuration
 */

import { getTenantContext } from "@/lib/tenant";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DeploymentStatus =
  | "pending"
  | "provisioning"
  | "active"
  | "suspended"
  | "deprovisioning"
  | "terminated";

export type DeploymentEnvironment = "production" | "staging" | "preview";

export type SSLStatus = "pending" | "issuing" | "active" | "expiring" | "expired" | "failed";

export type CDNProvider = "cloudflare" | "fastly" | "akamai" | "aws_cloudfront" | "vercel" | "none";

export interface TenantDeployment {
  id: string;
  tenantId: string;
  status: DeploymentStatus;
  /** Primary custom domain */
  primaryDomain: string | null;
  /** Additional custom domains */
  additionalDomains: DomainConfig[];
  /** SSL/TLS configuration */
  ssl: SSLConfig;
  /** CDN configuration */
  cdn: CDNConfig;
  /** Environment-specific settings */
  environments: Record<DeploymentEnvironment, EnvironmentConfig>;
  /** Infrastructure region */
  region: string;
  /** Deployment metadata */
  metadata: DeploymentMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface DomainConfig {
  domain: string;
  isVerified: boolean;
  verificationCode: string;
  verificationMethod: "dns_txt" | "dns_cname" | "http_file";
  ssl: SSLStatus;
  isPrimary: boolean;
  redirectToWww: boolean;
  environment: DeploymentEnvironment;
  addedAt: Date;
}

export interface SSLConfig {
  provider: "letsencrypt" | "cloudflare" | "custom" | "none";
  autoRenew: boolean;
  certificate: CertificateInfo | null;
  customCertificate: CustomCertificate | null;
  forceHttps: boolean;
  hstsEnabled: boolean;
  hstsMaxAge: number;
  hstsIncludeSubdomains: boolean;
}

export interface CertificateInfo {
  issuer: string;
  subject: string;
  validFrom: Date;
  validUntil: Date;
  fingerprint: string;
  status: SSLStatus;
}

export interface CustomCertificate {
  certificatePem: string;
  privateKeyRef: string; // Reference to secret store, never store directly
  chainPem: string | null;
  uploadedAt: Date;
}

export interface CDNConfig {
  provider: CDNProvider;
  enabled: boolean;
  /** Edge caching rules */
  cacheRules: CacheRule[];
  /** Custom headers */
  customHeaders: Record<string, string>;
  /** Minification settings */
  minifyHtml: boolean;
  minifyCss: boolean;
  minifyJs: boolean;
  /** Image optimization */
  imageOptimization: boolean;
  /** Brotli compression */
  brotliCompression: boolean;
  /** Web Application Firewall */
  wafEnabled: boolean;
  wafRulesets: string[];
}

export interface CacheRule {
  path: string;
  ttl: number; // seconds
  cacheControl: string;
  bypassCookie: string | null;
}

export interface EnvironmentConfig {
  isActive: boolean;
  url: string | null;
  customDomain: string | null;
  /** Environment-specific variables */
  envVars: Record<string, string>;
  /** Feature flags for this environment */
  featureFlags: Record<string, boolean>;
  /** Access restrictions */
  accessRestrictions: AccessRestriction[];
  lastDeployed: Date | null;
}

export interface AccessRestriction {
  type: "ip_whitelist" | "basic_auth" | "oauth" | "none";
  config: Record<string, unknown>;
}

export interface DeploymentMetadata {
  provisionedAt: Date | null;
  lastHealthCheck: Date | null;
  healthStatus: "healthy" | "degraded" | "unhealthy" | "unknown";
  uptime: number; // percentage
  avgResponseTime: number; // ms
  errorRate: number; // percentage
  bandwidthUsedGb: number;
  requestsTotal: number;
}

export interface DomainVerificationResult {
  domain: string;
  isVerified: boolean;
  verificationMethod: "dns_txt" | "dns_cname" | "http_file";
  expectedValue: string;
  actualValue: string | null;
  error: string | null;
}

// ─── Default Configuration ────────────────────────────────────────────────────

export const DEFAULT_SSL_CONFIG: SSLConfig = {
  provider: "letsencrypt",
  autoRenew: true,
  certificate: null,
  customCertificate: null,
  forceHttps: true,
  hstsEnabled: true,
  hstsMaxAge: 31536000, // 1 year
  hstsIncludeSubdomains: true,
};

export const DEFAULT_CDN_CONFIG: CDNConfig = {
  provider: "vercel",
  enabled: true,
  cacheRules: [
    { path: "/static/*", ttl: 86400, cacheControl: "public, max-age=86400", bypassCookie: null },
    { path: "/api/*", ttl: 0, cacheControl: "no-store", bypassCookie: null },
    { path: "/_next/static/*", ttl: 31536000, cacheControl: "public, max-age=31536000, immutable", bypassCookie: null },
  ],
  customHeaders: {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "X-XSS-Protection": "1; mode=block",
  },
  minifyHtml: true,
  minifyCss: true,
  minifyJs: true,
  imageOptimization: true,
  brotliCompression: true,
  wafEnabled: false,
  wafRulesets: [],
};

export const DEFAULT_ENVIRONMENT_CONFIG: EnvironmentConfig = {
  isActive: false,
  url: null,
  customDomain: null,
  envVars: {},
  featureFlags: {},
  accessRestrictions: [],
  lastDeployed: null,
};

// ─── Deployment Resolution ────────────────────────────────────────────────────

/**
 * Get deployment configuration for current tenant.
 */
export function getDeployment(): TenantDeployment {
  const ctx = getTenantContext();

  if (ctx) {
    const deployment = deploymentRegistry.get(ctx.tenant.id);
    if (deployment) return deployment;
  }

  return getDefaultDeployment();
}

/**
 * Get deployment by tenant ID.
 */
export async function getDeploymentByTenant(tenantId: string): Promise<TenantDeployment | null> {
  return deploymentRegistry.get(tenantId) ?? null;
}

/**
 * Get all deployments (admin).
 */
export async function getAllDeployments(): Promise<TenantDeployment[]> {
  return Array.from(deploymentRegistry.values());
}

/**
 * Get deployment by domain.
 */
export function getDeploymentByDomain(domain: string): TenantDeployment | null {
  for (const deployment of deploymentRegistry.values()) {
    if (deployment.primaryDomain === domain) return deployment;
    if (deployment.additionalDomains.some((d) => d.domain === domain)) return deployment;
  }
  return null;
}

// ─── Domain Management ────────────────────────────────────────────────────────

/**
 * Add a custom domain to a tenant deployment.
 */
export async function addDomain(
  tenantId: string,
  domain: string,
  options: { isPrimary?: boolean; environment?: DeploymentEnvironment; redirectToWww?: boolean } = {}
): Promise<DomainConfig> {
  const deployment = deploymentRegistry.get(tenantId);
  if (!deployment) {
    throw new Error("Deployment not found");
  }

  // Check if domain already exists
  if (deployment.additionalDomains.some((d) => d.domain === domain) || deployment.primaryDomain === domain) {
    throw new Error("Domain already configured");
  }

  const verificationCode = generateVerificationCode();

  const domainConfig: DomainConfig = {
    domain,
    isVerified: false,
    verificationCode,
    verificationMethod: "dns_txt",
    ssl: "pending",
    isPrimary: options.isPrimary ?? false,
    redirectToWww: options.redirectToWww ?? false,
    environment: options.environment ?? "production",
    addedAt: new Date(),
  };

  if (domainConfig.isPrimary) {
    // Move current primary to additional
    if (deployment.primaryDomain) {
      const currentPrimary = deployment.additionalDomains.find((d) => d.isPrimary);
      if (currentPrimary) currentPrimary.isPrimary = false;
    }
    deployment.primaryDomain = domain;
  }

  deployment.additionalDomains.push(domainConfig);
  deployment.updatedAt = new Date();

  return domainConfig;
}

/**
 * Remove a custom domain.
 */
export async function removeDomain(tenantId: string, domain: string): Promise<void> {
  const deployment = deploymentRegistry.get(tenantId);
  if (!deployment) return;

  deployment.additionalDomains = deployment.additionalDomains.filter((d) => d.domain !== domain);

  if (deployment.primaryDomain === domain) {
    deployment.primaryDomain = null;
    // Promote another domain to primary if available
    const newPrimary = deployment.additionalDomains.find((d) => d.environment === "production");
    if (newPrimary) {
      newPrimary.isPrimary = true;
      deployment.primaryDomain = newPrimary.domain;
    }
  }

  deployment.updatedAt = new Date();
}

/**
 * Verify domain ownership.
 */
export async function verifyDomain(tenantId: string, domain: string): Promise<DomainVerificationResult> {
  const deployment = deploymentRegistry.get(tenantId);
  if (!deployment) {
    return {
      domain,
      isVerified: false,
      verificationMethod: "dns_txt",
      expectedValue: "",
      actualValue: null,
      error: "Deployment not found",
    };
  }

  const domainConfig = deployment.additionalDomains.find((d) => d.domain === domain);
  if (!domainConfig) {
    return {
      domain,
      isVerified: false,
      verificationMethod: "dns_txt",
      expectedValue: "",
      actualValue: null,
      error: "Domain not found in deployment",
    };
  }

  // In production, this would query DNS
  // For now, simulate verification
  const expectedValue = `olivia-verify=${domainConfig.verificationCode}`;

  // Simulated DNS lookup (production: use DNS resolver)
  const verified = await simulateDnsVerification(domain, expectedValue);

  if (verified) {
    domainConfig.isVerified = true;
    domainConfig.ssl = "issuing";
    deployment.updatedAt = new Date();

    // Trigger SSL certificate issuance (async)
    issueSSLCertificate(tenantId, domain).catch(console.error);
  }

  return {
    domain,
    isVerified: verified,
    verificationMethod: domainConfig.verificationMethod,
    expectedValue,
    actualValue: verified ? expectedValue : null,
    error: verified ? null : "DNS TXT record not found or does not match",
  };
}

// ─── SSL Management ───────────────────────────────────────────────────────────

/**
 * Issue SSL certificate for a domain.
 */
async function issueSSLCertificate(tenantId: string, domain: string): Promise<void> {
  const deployment = deploymentRegistry.get(tenantId);
  if (!deployment) return;

  const domainConfig = deployment.additionalDomains.find((d) => d.domain === domain);
  if (!domainConfig || !domainConfig.isVerified) return;

  // Simulate certificate issuance (production: use ACME/Let's Encrypt)
  await new Promise((resolve) => setTimeout(resolve, 1000));

  domainConfig.ssl = "active";

  if (!deployment.ssl.certificate) {
    deployment.ssl.certificate = {
      issuer: "Let's Encrypt Authority X3",
      subject: domain,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      fingerprint: generateFingerprint(),
      status: "active",
    };
  }

  deployment.updatedAt = new Date();
}

/**
 * Upload custom SSL certificate.
 */
export async function uploadCustomCertificate(
  tenantId: string,
  certificate: { certificatePem: string; privateKeyRef: string; chainPem?: string }
): Promise<void> {
  const deployment = deploymentRegistry.get(tenantId);
  if (!deployment) {
    throw new Error("Deployment not found");
  }

  deployment.ssl.provider = "custom";
  deployment.ssl.customCertificate = {
    certificatePem: certificate.certificatePem,
    privateKeyRef: certificate.privateKeyRef,
    chainPem: certificate.chainPem ?? null,
    uploadedAt: new Date(),
  };

  // Parse certificate to extract info (simplified)
  deployment.ssl.certificate = {
    issuer: "Custom",
    subject: deployment.primaryDomain ?? "unknown",
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    fingerprint: generateFingerprint(),
    status: "active",
  };

  deployment.updatedAt = new Date();
}

// ─── Deployment CRUD ──────────────────────────────────────────────────────────

/**
 * Create or update tenant deployment.
 */
export async function saveDeployment(
  tenantId: string,
  input: Partial<Omit<TenantDeployment, "id" | "tenantId" | "createdAt" | "updatedAt">>
): Promise<TenantDeployment> {
  const existing = deploymentRegistry.get(tenantId);
  const now = new Date();

  const deployment: TenantDeployment = {
    id: existing?.id ?? crypto.randomUUID(),
    tenantId,
    status: input.status ?? existing?.status ?? "pending",
    primaryDomain: input.primaryDomain ?? existing?.primaryDomain ?? null,
    additionalDomains: input.additionalDomains ?? existing?.additionalDomains ?? [],
    ssl: { ...DEFAULT_SSL_CONFIG, ...existing?.ssl, ...input.ssl },
    cdn: { ...DEFAULT_CDN_CONFIG, ...existing?.cdn, ...input.cdn },
    environments: {
      production: { ...DEFAULT_ENVIRONMENT_CONFIG, ...existing?.environments?.production, ...input.environments?.production },
      staging: { ...DEFAULT_ENVIRONMENT_CONFIG, ...existing?.environments?.staging, ...input.environments?.staging },
      preview: { ...DEFAULT_ENVIRONMENT_CONFIG, ...existing?.environments?.preview, ...input.environments?.preview },
    },
    region: input.region ?? existing?.region ?? "us-east-1",
    metadata: {
      provisionedAt: existing?.metadata?.provisionedAt ?? null,
      lastHealthCheck: existing?.metadata?.lastHealthCheck ?? null,
      healthStatus: existing?.metadata?.healthStatus ?? "unknown",
      uptime: existing?.metadata?.uptime ?? 0,
      avgResponseTime: existing?.metadata?.avgResponseTime ?? 0,
      errorRate: existing?.metadata?.errorRate ?? 0,
      bandwidthUsedGb: existing?.metadata?.bandwidthUsedGb ?? 0,
      requestsTotal: existing?.metadata?.requestsTotal ?? 0,
      ...input.metadata,
    },
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  deploymentRegistry.set(tenantId, deployment);
  return deployment;
}

/**
 * Provision a new tenant deployment.
 */
export async function provisionDeployment(tenantId: string, region: string = "us-east-1"): Promise<TenantDeployment> {
  const deployment = await saveDeployment(tenantId, {
    status: "provisioning",
    region,
    environments: {
      production: { ...DEFAULT_ENVIRONMENT_CONFIG, isActive: true },
      staging: { ...DEFAULT_ENVIRONMENT_CONFIG, isActive: false },
      preview: { ...DEFAULT_ENVIRONMENT_CONFIG, isActive: false },
    },
  });

  // Simulate provisioning (production: trigger actual infrastructure)
  setTimeout(async () => {
    const d = deploymentRegistry.get(tenantId);
    if (d) {
      d.status = "active";
      d.metadata.provisionedAt = new Date();
      d.metadata.healthStatus = "healthy";
      d.updatedAt = new Date();
    }
  }, 5000);

  return deployment;
}

/**
 * Suspend a deployment.
 */
export async function suspendDeployment(tenantId: string, reason?: string): Promise<void> {
  const deployment = deploymentRegistry.get(tenantId);
  if (!deployment) return;

  deployment.status = "suspended";
  deployment.metadata.healthStatus = "unhealthy";
  deployment.updatedAt = new Date();
}

/**
 * Reactivate a suspended deployment.
 */
export async function reactivateDeployment(tenantId: string): Promise<void> {
  const deployment = deploymentRegistry.get(tenantId);
  if (!deployment || deployment.status !== "suspended") return;

  deployment.status = "active";
  deployment.metadata.healthStatus = "healthy";
  deployment.updatedAt = new Date();
}

/**
 * Terminate a deployment.
 */
export async function terminateDeployment(tenantId: string): Promise<void> {
  const deployment = deploymentRegistry.get(tenantId);
  if (!deployment) return;

  deployment.status = "deprovisioning";
  deployment.updatedAt = new Date();

  // Simulate deprovisioning
  setTimeout(() => {
    const d = deploymentRegistry.get(tenantId);
    if (d) {
      d.status = "terminated";
      d.updatedAt = new Date();
    }
  }, 3000);
}

/**
 * Delete a deployment completely.
 */
export async function deleteDeployment(tenantId: string): Promise<void> {
  deploymentRegistry.delete(tenantId);
}

// ─── Health & Monitoring ──────────────────────────────────────────────────────

/**
 * Run health check on a deployment.
 */
export async function checkDeploymentHealth(tenantId: string): Promise<DeploymentMetadata> {
  const deployment = deploymentRegistry.get(tenantId);
  if (!deployment) {
    throw new Error("Deployment not found");
  }

  // Simulate health check (production: actual HTTP checks)
  const metadata: DeploymentMetadata = {
    ...deployment.metadata,
    lastHealthCheck: new Date(),
    healthStatus: deployment.status === "active" ? "healthy" : "unhealthy",
    uptime: deployment.status === "active" ? 99.9 : 0,
    avgResponseTime: Math.random() * 100 + 50, // 50-150ms
    errorRate: Math.random() * 0.1, // 0-0.1%
  };

  deployment.metadata = metadata;
  deployment.updatedAt = new Date();

  return metadata;
}

/**
 * Get deployment metrics.
 */
export async function getDeploymentMetrics(
  tenantId: string,
  _startDate: Date,
  _endDate: Date
): Promise<{
  requests: number;
  bandwidth: number;
  errors: number;
  avgLatency: number;
  uniqueVisitors: number;
}> {
  const deployment = deploymentRegistry.get(tenantId);
  if (!deployment) {
    throw new Error("Deployment not found");
  }

  // Simulated metrics (production: pull from CDN/monitoring service)
  return {
    requests: deployment.metadata.requestsTotal,
    bandwidth: deployment.metadata.bandwidthUsedGb,
    errors: Math.floor(deployment.metadata.requestsTotal * (deployment.metadata.errorRate / 100)),
    avgLatency: deployment.metadata.avgResponseTime,
    uniqueVisitors: Math.floor(deployment.metadata.requestsTotal / 5),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDefaultDeployment(): TenantDeployment {
  const now = new Date();
  return {
    id: "default",
    tenantId: "system",
    status: "active",
    primaryDomain: null,
    additionalDomains: [],
    ssl: DEFAULT_SSL_CONFIG,
    cdn: DEFAULT_CDN_CONFIG,
    environments: {
      production: { ...DEFAULT_ENVIRONMENT_CONFIG, isActive: true },
      staging: DEFAULT_ENVIRONMENT_CONFIG,
      preview: DEFAULT_ENVIRONMENT_CONFIG,
    },
    region: "us-east-1",
    metadata: {
      provisionedAt: now,
      lastHealthCheck: now,
      healthStatus: "healthy",
      uptime: 100,
      avgResponseTime: 50,
      errorRate: 0,
      bandwidthUsedGb: 0,
      requestsTotal: 0,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function generateVerificationCode(): string {
  return crypto.randomUUID().replace(/-/g, "").substring(0, 32);
}

function generateFingerprint(): string {
  return Array.from({ length: 20 }, () =>
    Math.floor(Math.random() * 256).toString(16).padStart(2, "0")
  ).join(":").toUpperCase();
}

async function simulateDnsVerification(_domain: string, _expectedValue: string): Promise<boolean> {
  // In production, use DNS resolver to check TXT records
  // Simulate 50% success rate for testing
  return Math.random() > 0.5;
}

// In-memory storage (production: database)
const deploymentRegistry = new Map<string, TenantDeployment>();

// ─── Service Interface ────────────────────────────────────────────────────────

export interface DeploymentService {
  get(): TenantDeployment;
  getByTenant(tenantId: string): Promise<TenantDeployment | null>;
  getByDomain(domain: string): TenantDeployment | null;
  getAll(): Promise<TenantDeployment[]>;
  save(tenantId: string, input: Partial<TenantDeployment>): Promise<TenantDeployment>;
  provision(tenantId: string, region?: string): Promise<TenantDeployment>;
  suspend(tenantId: string, reason?: string): Promise<void>;
  reactivate(tenantId: string): Promise<void>;
  terminate(tenantId: string): Promise<void>;
  delete(tenantId: string): Promise<void>;
  addDomain(tenantId: string, domain: string, options?: { isPrimary?: boolean; environment?: DeploymentEnvironment }): Promise<DomainConfig>;
  removeDomain(tenantId: string, domain: string): Promise<void>;
  verifyDomain(tenantId: string, domain: string): Promise<DomainVerificationResult>;
  uploadCertificate(tenantId: string, cert: { certificatePem: string; privateKeyRef: string; chainPem?: string }): Promise<void>;
  checkHealth(tenantId: string): Promise<DeploymentMetadata>;
  getMetrics(tenantId: string, start: Date, end: Date): Promise<{ requests: number; bandwidth: number; errors: number; avgLatency: number; uniqueVisitors: number }>;
}

export function getDeploymentService(): DeploymentService {
  return {
    get: getDeployment,
    getByTenant: getDeploymentByTenant,
    getByDomain: getDeploymentByDomain,
    getAll: getAllDeployments,
    save: saveDeployment,
    provision: provisionDeployment,
    suspend: suspendDeployment,
    reactivate: reactivateDeployment,
    terminate: terminateDeployment,
    delete: deleteDeployment,
    addDomain,
    removeDomain,
    verifyDomain,
    uploadCertificate: uploadCustomCertificate,
    checkHealth: checkDeploymentHealth,
    getMetrics: getDeploymentMetrics,
  };
}
