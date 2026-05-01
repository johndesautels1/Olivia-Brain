/**
 * Consent Management
 * Sprint 5.3 — Compliance & Security (Items 2-3)
 *
 * Handles:
 * - Call Recording Consent Flows (Item 2)
 * - Consent-Based Memory Sync / GDPR (Item 3)
 *
 * Consent Types:
 * - RECORDING: Voice/video call recording
 * - MEMORY: AI learning from conversations
 * - ANALYTICS: Usage analytics and improvement
 * - MARKETING: Marketing communications
 * - DATA_SHARING: Third-party data sharing
 */

import { getPrisma } from "@/lib/db";
import { getTenantContext, requireCurrentTenantId } from "@/lib/tenant";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConsentType =
  | "recording"
  | "memory"
  | "analytics"
  | "marketing"
  | "data_sharing"
  | "biometric"
  | "location";

export type ConsentStatus = "granted" | "denied" | "withdrawn" | "expired" | "pending";

export interface ConsentRecord {
  id: string;
  clientId: string;
  tenantId: string | null;
  consentType: ConsentType;
  status: ConsentStatus;
  /** How consent was obtained */
  method: ConsentMethod;
  /** ISO timestamp when consent was given */
  grantedAt: Date | null;
  /** ISO timestamp when consent expires (if applicable) */
  expiresAt: Date | null;
  /** ISO timestamp when consent was withdrawn */
  withdrawnAt: Date | null;
  /** Version of privacy policy accepted */
  policyVersion: string;
  /** IP address at time of consent (for audit) */
  ipAddress: string | null;
  /** User agent at time of consent (for audit) */
  userAgent: string | null;
  /** Additional metadata */
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type ConsentMethod =
  | "explicit_click"      // User clicked consent button
  | "voice_confirmation"  // User verbally confirmed
  | "written_signature"   // Signed document
  | "api_request"         // Programmatic consent
  | "implied"             // Implied by continued use (not valid for GDPR)
  | "parental";           // Parental consent for minors

export interface ConsentRequest {
  clientId: string;
  consentType: ConsentType;
  method: ConsentMethod;
  policyVersion: string;
  expiresAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface ConsentCheckResult {
  hasConsent: boolean;
  status: ConsentStatus;
  record: ConsentRecord | null;
  reason: string;
}

// ─── Call Recording Consent ───────────────────────────────────────────────────

/**
 * Recording consent state machine.
 * Some jurisdictions require all-party consent (e.g., California).
 */
export interface RecordingConsentState {
  canRecord: boolean;
  allPartiesConsented: boolean;
  parties: RecordingPartyConsent[];
  jurisdiction: RecordingJurisdiction;
  warnings: string[];
}

export interface RecordingPartyConsent {
  participantId: string;
  name: string | null;
  consented: boolean;
  method: ConsentMethod | null;
  timestamp: Date | null;
}

export type RecordingJurisdiction = "one_party" | "all_party" | "unknown";

/**
 * Jurisdiction rules for call recording.
 */
const RECORDING_JURISDICTIONS: Record<string, RecordingJurisdiction> = {
  // All-party consent states (US)
  "US-CA": "all_party", // California
  "US-CT": "all_party", // Connecticut
  "US-FL": "all_party", // Florida
  "US-IL": "all_party", // Illinois
  "US-MD": "all_party", // Maryland
  "US-MA": "all_party", // Massachusetts
  "US-MI": "all_party", // Michigan (with exceptions)
  "US-MT": "all_party", // Montana
  "US-NH": "all_party", // New Hampshire
  "US-PA": "all_party", // Pennsylvania
  "US-WA": "all_party", // Washington
  // One-party consent (most US states)
  "US-DEFAULT": "one_party",
  // International
  "UK": "all_party", // UK requires informing all parties
  "EU": "all_party", // GDPR requires explicit consent
  "CA": "one_party", // Canada (federal) - one party
  "AU": "all_party", // Australia - all parties
};

/**
 * Check if recording is allowed based on participant consents.
 */
export function checkRecordingConsent(params: {
  participants: RecordingPartyConsent[];
  jurisdiction?: string;
}): RecordingConsentState {
  const { participants, jurisdiction } = params;

  // Determine jurisdiction type
  const jurisdictionType = jurisdiction
    ? (RECORDING_JURISDICTIONS[jurisdiction] ?? RECORDING_JURISDICTIONS["US-DEFAULT"])
    : "unknown";

  const allConsented = participants.every(p => p.consented);
  const anyConsented = participants.some(p => p.consented);

  const warnings: string[] = [];

  let canRecord = false;
  if (jurisdictionType === "one_party") {
    canRecord = anyConsented;
    if (!allConsented) {
      warnings.push("Not all parties have consented. Recording allowed under one-party consent rules.");
    }
  } else if (jurisdictionType === "all_party") {
    canRecord = allConsented;
    if (!allConsented) {
      warnings.push("All-party consent required. Cannot record until all participants consent.");
    }
  } else {
    // Unknown jurisdiction - require all-party to be safe
    canRecord = allConsented;
    warnings.push("Jurisdiction unknown. Requiring all-party consent for safety.");
  }

  return {
    canRecord,
    allPartiesConsented: allConsented,
    parties: participants,
    jurisdiction: jurisdictionType,
    warnings,
  };
}

/**
 * Generate the consent disclosure script for voice calls.
 */
export function getRecordingDisclosureScript(params: {
  agentName?: string;
  companyName?: string;
  jurisdiction?: string;
}): string {
  const { agentName = "Olivia", companyName = "CLUES Intelligence", jurisdiction } = params;

  const jurisdictionType = jurisdiction
    ? (RECORDING_JURISDICTIONS[jurisdiction] ?? "all_party")
    : "all_party";

  if (jurisdictionType === "all_party") {
    return `This call may be recorded for quality assurance and training purposes. By continuing this conversation, you consent to the recording. If you do not wish to be recorded, please let me know now and I will disable recording.`;
  }

  // One-party: Still good practice to disclose
  return `For your reference, this call may be recorded for quality assurance purposes.`;
}

// ─── GDPR Memory Consent ──────────────────────────────────────────────────────

/**
 * Memory consent controls what the AI can learn and remember.
 */
export interface MemoryConsentState {
  canLearn: boolean;
  canRemember: boolean;
  canShareAcrossSessions: boolean;
  retentionDays: number;
  restrictions: string[];
}

/**
 * Check memory consent and return allowed operations.
 */
export async function checkMemoryConsent(clientId: string): Promise<MemoryConsentState> {
  const consent = await getConsentStatus(clientId, "memory");

  if (!consent.hasConsent) {
    return {
      canLearn: false,
      canRemember: false,
      canShareAcrossSessions: false,
      retentionDays: 0,
      restrictions: ["No memory consent granted. Operating in stateless mode."],
    };
  }

  // Check for specific restrictions in metadata
  const metadata = consent.record?.metadata ?? {};
  const restrictions: string[] = [];

  const canLearn = metadata.allowLearning !== false;
  const canRemember = metadata.allowRemembering !== false;
  const canShare = metadata.allowCrossSession !== false;

  if (!canLearn) restrictions.push("Learning disabled by user preference");
  if (!canRemember) restrictions.push("Memory disabled by user preference");
  if (!canShare) restrictions.push("Cross-session memory disabled");

  // Determine retention based on tenant policy
  const ctx = getTenantContext();
  const region = ctx?.policies.dataResidency?.allowedRegions?.[0] ?? "us";
  const retentionDays = ["eu", "uk"].includes(region as string) ? 90 : 365;

  return {
    canLearn,
    canRemember,
    canShareAcrossSessions: canShare,
    retentionDays,
    restrictions,
  };
}

/**
 * Execute the "Right to be Forgotten" (GDPR Article 17).
 * Deletes all personal data for a client.
 */
export async function executeRightToBeForgotten(clientId: string): Promise<DeletionResult> {
  const prisma = getPrisma();
  const deletedItems: string[] = [];
  const errors: string[] = [];

  try {
    // Delete conversations and turns
    const convResult = await prisma.conversations.deleteMany({
      where: { client_id: clientId },
    });
    deletedItems.push(`${convResult.count} conversations`);

    // Delete memories
    const memResult = await prisma.mem0_memories.deleteMany({
      where: { client_id: clientId },
    });
    deletedItems.push(`${memResult.count} memories`);

    // Delete episodes
    const epResult = await prisma.episodes.deleteMany({
      where: { client_id: clientId },
    });
    deletedItems.push(`${epResult.count} episodes`);

    // Delete semantic memories
    const semResult = await prisma.semantic_memories.deleteMany({
      where: { client_id: clientId },
    });
    deletedItems.push(`${semResult.count} semantic memories`);

    // Delete knowledge chunks
    const chunkResult = await prisma.knowledge_chunks.deleteMany({
      where: { client_id: clientId },
    });
    deletedItems.push(`${chunkResult.count} knowledge chunks`);

    // Delete graph entities
    const entityResult = await prisma.graph_entities.deleteMany({
      where: { client_id: clientId },
    });
    deletedItems.push(`${entityResult.count} graph entities`);

    // Log the deletion for audit purposes (anonymized)
    await prisma.admin_audit_logs.create({
      data: {
        event_type: "gdpr_deletion",
        actor: "system",
        summary: `Right to be forgotten executed for client`,
        metadata: {
          clientIdHash: hashClientId(clientId),
          deletedItems,
          timestamp: new Date().toISOString(),
        },
      },
    });

  } catch (error) {
    errors.push(`Deletion error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  return {
    success: errors.length === 0,
    deletedItems,
    errors,
    completedAt: new Date(),
  };
}

export interface DeletionResult {
  success: boolean;
  deletedItems: string[];
  errors: string[];
  completedAt: Date;
}

function hashClientId(clientId: string): string {
  // Simple hash for audit logging (not reversible)
  let hash = 0;
  for (let i = 0; i < clientId.length; i++) {
    const char = clientId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `hashed_${Math.abs(hash).toString(16)}`;
}

// ─── Consent CRUD ─────────────────────────────────────────────────────────────

/**
 * Record a new consent.
 */
export async function recordConsent(request: ConsentRequest): Promise<ConsentRecord> {
  const prisma = getPrisma();
  const tenantId = getTenantContext()?.tenant.id ?? null;

  // Check if consent already exists
  const existing = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM consent_records
    WHERE client_id = ${request.clientId}
    AND tenant_id ${tenantId ? `= ${tenantId}` : 'IS NULL'}
    AND consent_type = ${request.consentType}
    LIMIT 1
  `.catch(() => []);

  if (existing.length > 0) {
    // Update existing consent
    return updateConsent(request.clientId, request.consentType, {
      status: "granted",
      method: request.method,
      policyVersion: request.policyVersion,
      expiresAt: request.expiresAt,
      metadata: request.metadata,
    });
  }

  // For now, store in metadata on a memory record or use in-memory
  // In production, this would be a dedicated consent_records table
  const record: ConsentRecord = {
    id: crypto.randomUUID(),
    clientId: request.clientId,
    tenantId,
    consentType: request.consentType,
    status: "granted",
    method: request.method,
    grantedAt: new Date(),
    expiresAt: request.expiresAt ?? null,
    withdrawnAt: null,
    policyVersion: request.policyVersion,
    ipAddress: request.ipAddress ?? null,
    userAgent: request.userAgent ?? null,
    metadata: request.metadata ?? {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Store consent (in production, use dedicated table)
  consentStore.set(`${request.clientId}:${request.consentType}`, record);

  return record;
}

/**
 * Withdraw consent.
 */
export async function withdrawConsent(
  clientId: string,
  consentType: ConsentType,
  reason?: string
): Promise<ConsentRecord> {
  const key = `${clientId}:${consentType}`;
  const existing = consentStore.get(key);

  if (!existing) {
    throw new Error(`No consent record found for ${consentType}`);
  }

  const updated: ConsentRecord = {
    ...existing,
    status: "withdrawn",
    withdrawnAt: new Date(),
    updatedAt: new Date(),
    metadata: {
      ...existing.metadata,
      withdrawalReason: reason,
    },
  };

  consentStore.set(key, updated);

  // If memory consent withdrawn, trigger data handling
  if (consentType === "memory") {
    // Mark for deletion or anonymization based on policy
    console.log(`Memory consent withdrawn for ${clientId}. Data handling required.`);
  }

  return updated;
}

/**
 * Update consent.
 */
export async function updateConsent(
  clientId: string,
  consentType: ConsentType,
  updates: {
    status?: ConsentStatus;
    method?: ConsentMethod;
    policyVersion?: string;
    expiresAt?: Date;
    metadata?: Record<string, unknown>;
  }
): Promise<ConsentRecord> {
  const key = `${clientId}:${consentType}`;
  const existing = consentStore.get(key);

  if (!existing) {
    throw new Error(`No consent record found for ${consentType}`);
  }

  const updated: ConsentRecord = {
    ...existing,
    ...(updates.status && { status: updates.status }),
    ...(updates.method && { method: updates.method }),
    ...(updates.policyVersion && { policyVersion: updates.policyVersion }),
    ...(updates.expiresAt !== undefined && { expiresAt: updates.expiresAt }),
    ...(updates.metadata && { metadata: { ...existing.metadata, ...updates.metadata } }),
    ...(updates.status === "granted" && { grantedAt: new Date() }),
    updatedAt: new Date(),
  };

  consentStore.set(key, updated);
  return updated;
}

/**
 * Get consent status.
 */
export async function getConsentStatus(
  clientId: string,
  consentType: ConsentType
): Promise<ConsentCheckResult> {
  const key = `${clientId}:${consentType}`;
  const record = consentStore.get(key);

  if (!record) {
    return {
      hasConsent: false,
      status: "pending",
      record: null,
      reason: "no_record",
    };
  }

  // Check if expired
  if (record.expiresAt && record.expiresAt < new Date()) {
    return {
      hasConsent: false,
      status: "expired",
      record,
      reason: "consent_expired",
    };
  }

  // Check if withdrawn
  if (record.status === "withdrawn") {
    return {
      hasConsent: false,
      status: "withdrawn",
      record,
      reason: "consent_withdrawn",
    };
  }

  return {
    hasConsent: record.status === "granted",
    status: record.status,
    record,
    reason: record.status === "granted" ? "consent_valid" : "consent_not_granted",
  };
}

/**
 * Get all consents for a client.
 */
export async function getAllConsents(clientId: string): Promise<ConsentRecord[]> {
  const records: ConsentRecord[] = [];
  for (const [key, record] of consentStore.entries()) {
    if (key.startsWith(`${clientId}:`)) {
      records.push(record);
    }
  }
  return records;
}

// In-memory store (in production, use database table)
const consentStore = new Map<string, ConsentRecord>();

// ─── Service Interface ────────────────────────────────────────────────────────

export interface ConsentService {
  // Recording consent
  checkRecordingConsent(params: { participants: RecordingPartyConsent[]; jurisdiction?: string }): RecordingConsentState;
  getRecordingDisclosure(params: { agentName?: string; companyName?: string; jurisdiction?: string }): string;
  // Memory consent
  checkMemoryConsent(clientId: string): Promise<MemoryConsentState>;
  executeRightToBeForgotten(clientId: string): Promise<DeletionResult>;
  // CRUD
  recordConsent(request: ConsentRequest): Promise<ConsentRecord>;
  withdrawConsent(clientId: string, consentType: ConsentType, reason?: string): Promise<ConsentRecord>;
  getConsentStatus(clientId: string, consentType: ConsentType): Promise<ConsentCheckResult>;
  getAllConsents(clientId: string): Promise<ConsentRecord[]>;
}

export function getConsentService(): ConsentService {
  return {
    checkRecordingConsent,
    getRecordingDisclosure: getRecordingDisclosureScript,
    checkMemoryConsent,
    executeRightToBeForgotten,
    recordConsent,
    withdrawConsent,
    getConsentStatus,
    getAllConsents,
  };
}
