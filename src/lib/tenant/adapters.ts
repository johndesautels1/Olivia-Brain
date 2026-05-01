/**
 * Tenant Adapter Overrides
 * Sprint 5.1 — Tenant Architecture (Item 3: Per-Tenant Adapter Selection)
 *
 * Manages which external service adapters each tenant uses.
 * Supports priority-based selection when multiple adapters are available.
 *
 * Example use cases:
 * - Tenant A uses HubSpot CRM, Tenant B uses Salesforce
 * - Tenant A uses Simli avatar, Tenant B uses HeyGen
 * - Tenant A uses Twilio voice, Tenant B uses Vapi
 */

import { getPrisma } from "@/lib/db";

import type {
  TenantAdapterOverride,
  SetAdapterOverrideInput,
  AdapterType,
} from "./types";
import { getTenantContext, requireCurrentTenantId } from "./context";

// ─── Adapter Override CRUD ────────────────────────────────────────────────────

/**
 * Set an adapter override for a tenant.
 * Creates or updates the override.
 */
export async function setAdapterOverride(
  tenantId: string,
  input: SetAdapterOverrideInput
): Promise<TenantAdapterOverride> {
  const prisma = getPrisma();

  const override = await prisma.tenant_adapter_overrides.upsert({
    where: {
      tenant_id_adapter_type_adapter_name: {
        tenant_id: tenantId,
        adapter_type: input.adapterType,
        adapter_name: input.adapterName,
      },
    },
    create: {
      tenant_id: tenantId,
      adapter_type: input.adapterType,
      adapter_name: input.adapterName,
      is_enabled: input.isEnabled ?? true,
      priority: input.priority ?? 0,
      config: input.config ?? {},
      credentials: input.credentials ?? {},
    },
    update: {
      is_enabled: input.isEnabled ?? true,
      priority: input.priority ?? 0,
      config: input.config ?? {},
      credentials: input.credentials ?? {},
      updated_at: new Date(),
    },
  });

  return mapAdapterOverride(override);
}

/**
 * Get a specific adapter override.
 */
export async function getAdapterOverride(
  tenantId: string,
  adapterType: AdapterType,
  adapterName: string
): Promise<TenantAdapterOverride | null> {
  const prisma = getPrisma();

  const override = await prisma.tenant_adapter_overrides.findUnique({
    where: {
      tenant_id_adapter_type_adapter_name: {
        tenant_id: tenantId,
        adapter_type: adapterType,
        adapter_name: adapterName,
      },
    },
  });

  return override ? mapAdapterOverride(override) : null;
}

/**
 * Get all adapter overrides for a tenant.
 */
export async function getAdapterOverrides(tenantId: string): Promise<TenantAdapterOverride[]> {
  const prisma = getPrisma();

  const overrides = await prisma.tenant_adapter_overrides.findMany({
    where: { tenant_id: tenantId },
    orderBy: [{ adapter_type: "asc" }, { priority: "desc" }],
  });

  return overrides.map(mapAdapterOverride);
}

/**
 * Get all adapter overrides for a specific type.
 */
export async function getAdapterOverridesByType(
  tenantId: string,
  adapterType: AdapterType
): Promise<TenantAdapterOverride[]> {
  const prisma = getPrisma();

  const overrides = await prisma.tenant_adapter_overrides.findMany({
    where: { tenant_id: tenantId, adapter_type: adapterType },
    orderBy: { priority: "desc" },
  });

  return overrides.map(mapAdapterOverride);
}

/**
 * Delete an adapter override.
 */
export async function deleteAdapterOverride(
  tenantId: string,
  adapterType: AdapterType,
  adapterName: string
): Promise<void> {
  const prisma = getPrisma();

  await prisma.tenant_adapter_overrides.delete({
    where: {
      tenant_id_adapter_type_adapter_name: {
        tenant_id: tenantId,
        adapter_type: adapterType,
        adapter_name: adapterName,
      },
    },
  });
}

// ─── Adapter Resolution ───────────────────────────────────────────────────────

/**
 * Get the preferred adapter for a type, respecting tenant overrides.
 * Falls back to system defaults if no override exists.
 */
export async function resolveAdapter(adapterType: AdapterType): Promise<ResolvedAdapter | null> {
  const ctx = getTenantContext();

  // If in tenant context, check for override
  if (ctx) {
    const selectedAdapter = ctx.adapters[adapterType];
    if (selectedAdapter) {
      // Get the full override details
      const override = await getAdapterOverride(ctx.tenant.id, adapterType, selectedAdapter);
      if (override) {
        return {
          name: override.adapterName,
          config: override.config,
          credentials: override.credentials,
          source: "tenant_override",
        };
      }
    }
  }

  // Fall back to system default
  const defaultAdapter = getSystemDefaultAdapter(adapterType);
  if (defaultAdapter) {
    return {
      name: defaultAdapter,
      config: {},
      credentials: {},
      source: "system_default",
    };
  }

  return null;
}

/**
 * Get the preferred adapter name for a type (quick check).
 */
export function getPreferredAdapterName(adapterType: AdapterType): string | null {
  const ctx = getTenantContext();

  // Check tenant context first
  if (ctx?.adapters[adapterType]) {
    return ctx.adapters[adapterType];
  }

  // Fall back to system default
  return getSystemDefaultAdapter(adapterType);
}

/**
 * Check if a specific adapter is enabled for the current tenant.
 */
export async function isAdapterEnabled(
  adapterType: AdapterType,
  adapterName: string
): Promise<boolean> {
  const ctx = getTenantContext();
  if (!ctx) return true; // No tenant context = system mode, all adapters available

  const override = await getAdapterOverride(ctx.tenant.id, adapterType, adapterName);
  return override?.isEnabled ?? false;
}

// ─── System Defaults ──────────────────────────────────────────────────────────

/**
 * System default adapters used when no tenant override exists.
 */
const SYSTEM_DEFAULT_ADAPTERS: Partial<Record<AdapterType, string>> = {
  calendar: "london_calendar",
  crm: "hubspot",
  email: "resend",
  voice: "elevenlabs",
  avatar: "simli",
  realtime: "livekit",
  search: "tavily",
  storage: "supabase",
};

function getSystemDefaultAdapter(adapterType: AdapterType): string | null {
  return SYSTEM_DEFAULT_ADAPTERS[adapterType] ?? null;
}

// ─── Adapter Registry ─────────────────────────────────────────────────────────

/**
 * Registry of all available adapters per type.
 * Used for validation and UI dropdowns.
 */
export const AVAILABLE_ADAPTERS: Record<AdapterType, AdapterInfo[]> = {
  calendar: [
    { name: "london_calendar", displayName: "London Calendar", description: "CLUES London Tech Map calendar" },
    { name: "nylas", displayName: "Nylas", description: "Universal calendar API" },
    { name: "google_calendar", displayName: "Google Calendar", description: "Google Calendar API" },
    { name: "outlook", displayName: "Outlook", description: "Microsoft Outlook/365" },
  ],
  crm: [
    { name: "hubspot", displayName: "HubSpot", description: "HubSpot CRM" },
    { name: "salesforce", displayName: "Salesforce", description: "Salesforce CRM" },
    { name: "pipedrive", displayName: "Pipedrive", description: "Pipedrive CRM" },
    { name: "close", displayName: "Close", description: "Close CRM" },
  ],
  email: [
    { name: "resend", displayName: "Resend", description: "Transactional email" },
    { name: "sendgrid", displayName: "SendGrid", description: "Twilio SendGrid" },
    { name: "postmark", displayName: "Postmark", description: "Postmark email" },
    { name: "instantly", displayName: "Instantly.ai", description: "Cold outreach sequences" },
  ],
  voice: [
    { name: "elevenlabs", displayName: "ElevenLabs", description: "High-quality TTS" },
    { name: "openai_tts", displayName: "OpenAI TTS", description: "OpenAI text-to-speech" },
    { name: "deepgram", displayName: "Deepgram", description: "Fast STT" },
    { name: "whisper", displayName: "Whisper", description: "OpenAI Whisper STT" },
  ],
  avatar: [
    { name: "simli", displayName: "Simli", description: "Primary Olivia avatar" },
    { name: "heygen", displayName: "HeyGen", description: "HeyGen avatars" },
    { name: "d_id", displayName: "D-ID", description: "D-ID interactive avatars" },
    { name: "sadtalker", displayName: "SadTalker", description: "Replicate SadTalker (Cristiano)" },
  ],
  realtime: [
    { name: "livekit", displayName: "LiveKit", description: "WebRTC infrastructure" },
    { name: "twilio_relay", displayName: "Twilio ConversationRelay", description: "Twilio voice" },
    { name: "vapi", displayName: "Vapi", description: "Voice AI platform" },
    { name: "retell", displayName: "Retell AI", description: "Voice agents" },
  ],
  search: [
    { name: "tavily", displayName: "Tavily", description: "AI search API" },
    { name: "perplexity", displayName: "Perplexity", description: "Perplexity search" },
    { name: "serper", displayName: "Serper", description: "Google search API" },
    { name: "firecrawl", displayName: "Firecrawl", description: "Web crawling" },
  ],
  storage: [
    { name: "supabase", displayName: "Supabase", description: "Supabase Storage" },
    { name: "s3", displayName: "AWS S3", description: "Amazon S3" },
    { name: "cloudflare_r2", displayName: "Cloudflare R2", description: "Cloudflare R2" },
    { name: "uploadthing", displayName: "UploadThing", description: "UploadThing" },
  ],
};

export interface AdapterInfo {
  name: string;
  displayName: string;
  description: string;
}

export interface ResolvedAdapter {
  name: string;
  config: Record<string, unknown>;
  credentials: Record<string, unknown>;
  source: "tenant_override" | "system_default";
}

/**
 * Get available adapters for a type.
 */
export function getAvailableAdapters(adapterType: AdapterType): AdapterInfo[] {
  return AVAILABLE_ADAPTERS[adapterType] ?? [];
}

/**
 * Validate that an adapter name is valid for its type.
 */
export function isValidAdapter(adapterType: AdapterType, adapterName: string): boolean {
  const available = AVAILABLE_ADAPTERS[adapterType] ?? [];
  return available.some(a => a.name === adapterName);
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

function mapAdapterOverride(row: {
  id: string;
  tenant_id: string;
  adapter_type: string;
  adapter_name: string;
  is_enabled: boolean;
  priority: number;
  config: unknown;
  credentials: unknown;
  created_at: Date;
  updated_at: Date;
}): TenantAdapterOverride {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    adapterType: row.adapter_type as AdapterType,
    adapterName: row.adapter_name,
    isEnabled: row.is_enabled,
    priority: row.priority,
    config: row.config as Record<string, unknown>,
    credentials: row.credentials as Record<string, unknown>,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
