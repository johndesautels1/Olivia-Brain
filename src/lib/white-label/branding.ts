/**
 * Branding Pack System
 * Sprint 5.2 — White-Label System (Item 1)
 *
 * Manages tenant-specific branding including:
 * - Colors, logos, typography
 * - Email templates
 * - Voice/tone guidelines
 * - Custom CSS variables
 */

import { getTenantContext } from "@/lib/tenant";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BrandingPack {
  id: string;
  tenantId: string;
  name: string;
  isActive: boolean;
  // Visual Identity
  colors: BrandColors;
  typography: BrandTypography;
  logos: BrandLogos;
  // Voice & Tone
  voiceProfile: VoiceProfile;
  // Templates
  emailTemplates: EmailTemplateSet;
  // Custom CSS
  customCss: string | null;
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface BrandColors {
  primary: string;        // Main brand color
  secondary: string;      // Accent color
  accent: string;         // Highlight color
  background: string;     // Page background
  surface: string;        // Card/component background
  text: string;           // Primary text
  textMuted: string;      // Secondary text
  border: string;         // Border color
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface BrandTypography {
  fontFamily: string;
  fontFamilyHeading: string;
  fontFamilyMono: string;
  baseFontSize: string;
  headingWeight: number;
  bodyWeight: number;
}

export interface BrandLogos {
  primary: string | null;      // Main logo URL
  icon: string | null;         // Square icon/favicon
  wordmark: string | null;     // Text-only logo
  darkMode: string | null;     // Logo for dark backgrounds
  email: string | null;        // Logo for email headers
}

export interface VoiceProfile {
  agentName: string;           // "Olivia" or custom
  companyName: string;
  greeting: string;
  signOff: string;
  tone: "professional" | "friendly" | "formal" | "casual";
  personality: string[];       // ["warm", "helpful", "decisive"]
  forbiddenPhrases: string[];  // Phrases to never use
  preferredPhrases: string[];  // Branded phrases
}

export interface EmailTemplateSet {
  welcome: EmailTemplate | null;
  reportDelivery: EmailTemplate | null;
  appointmentConfirmation: EmailTemplate | null;
  followUp: EmailTemplate | null;
  custom: Record<string, EmailTemplate>;
}

export interface EmailTemplate {
  subject: string;
  htmlBody: string;
  textBody: string;
  variables: string[];  // Available merge fields
}

// ─── Default Branding ─────────────────────────────────────────────────────────

export const DEFAULT_COLORS: BrandColors = {
  primary: "#6366f1",      // Indigo
  secondary: "#8b5cf6",    // Purple
  accent: "#f59e0b",       // Amber
  background: "#0f172a",   // Slate 900
  surface: "#1e293b",      // Slate 800
  text: "#f8fafc",         // Slate 50
  textMuted: "#94a3b8",    // Slate 400
  border: "#334155",       // Slate 700
  success: "#22c55e",
  warning: "#f59e0b",
  error: "#ef4444",
  info: "#3b82f6",
};

export const DEFAULT_TYPOGRAPHY: BrandTypography = {
  fontFamily: "'Inter', system-ui, sans-serif",
  fontFamilyHeading: "'Inter', system-ui, sans-serif",
  fontFamilyMono: "'JetBrains Mono', monospace",
  baseFontSize: "16px",
  headingWeight: 600,
  bodyWeight: 400,
};

export const DEFAULT_VOICE_PROFILE: VoiceProfile = {
  agentName: "Olivia",
  companyName: "CLUES Intelligence",
  greeting: "Hello! I'm Olivia, your AI relocation advisor.",
  signOff: "Best regards,\nOlivia",
  tone: "professional",
  personality: ["warm", "helpful", "knowledgeable", "decisive"],
  forbiddenPhrases: [],
  preferredPhrases: [],
};

// ─── Branding Resolution ──────────────────────────────────────────────────────

/**
 * Get the active branding pack for the current tenant.
 */
export function getActiveBranding(): BrandingPack {
  const ctx = getTenantContext();

  if (ctx) {
    const tenantBranding = brandingRegistry.get(ctx.tenant.id);
    if (tenantBranding?.isActive) {
      return tenantBranding;
    }

    // Build from tenant config
    return buildBrandingFromTenant(ctx.tenant);
  }

  // Return default branding
  return getDefaultBranding();
}

/**
 * Get specific branding element.
 */
export function getBrandColors(): BrandColors {
  return getActiveBranding().colors;
}

export function getBrandTypography(): BrandTypography {
  return getActiveBranding().typography;
}

export function getBrandLogos(): BrandLogos {
  return getActiveBranding().logos;
}

export function getVoiceProfile(): VoiceProfile {
  return getActiveBranding().voiceProfile;
}

/**
 * Get CSS variables for the active branding.
 */
export function getBrandingCssVariables(): Record<string, string> {
  const branding = getActiveBranding();
  const { colors, typography } = branding;

  return {
    "--brand-primary": colors.primary,
    "--brand-secondary": colors.secondary,
    "--brand-accent": colors.accent,
    "--brand-background": colors.background,
    "--brand-surface": colors.surface,
    "--brand-text": colors.text,
    "--brand-text-muted": colors.textMuted,
    "--brand-border": colors.border,
    "--brand-success": colors.success,
    "--brand-warning": colors.warning,
    "--brand-error": colors.error,
    "--brand-info": colors.info,
    "--font-family": typography.fontFamily,
    "--font-family-heading": typography.fontFamilyHeading,
    "--font-family-mono": typography.fontFamilyMono,
    "--font-size-base": typography.baseFontSize,
    "--font-weight-heading": typography.headingWeight.toString(),
    "--font-weight-body": typography.bodyWeight.toString(),
  };
}

/**
 * Generate CSS string from branding.
 */
export function generateBrandingCss(): string {
  const vars = getBrandingCssVariables();
  const branding = getActiveBranding();

  let css = `:root {\n`;
  for (const [key, value] of Object.entries(vars)) {
    css += `  ${key}: ${value};\n`;
  }
  css += `}\n`;

  if (branding.customCss) {
    css += `\n/* Custom CSS */\n${branding.customCss}\n`;
  }

  return css;
}

// ─── Branding CRUD ────────────────────────────────────────────────────────────

/**
 * Create or update a branding pack.
 */
export async function saveBrandingPack(
  tenantId: string,
  input: Partial<Omit<BrandingPack, "id" | "tenantId" | "createdAt" | "updatedAt">>
): Promise<BrandingPack> {
  const existing = brandingRegistry.get(tenantId);

  const pack: BrandingPack = {
    id: existing?.id ?? crypto.randomUUID(),
    tenantId,
    name: input.name ?? existing?.name ?? "Default",
    isActive: input.isActive ?? existing?.isActive ?? true,
    colors: { ...DEFAULT_COLORS, ...existing?.colors, ...input.colors },
    typography: { ...DEFAULT_TYPOGRAPHY, ...existing?.typography, ...input.typography },
    logos: { primary: null, icon: null, wordmark: null, darkMode: null, email: null, ...existing?.logos, ...input.logos },
    voiceProfile: { ...DEFAULT_VOICE_PROFILE, ...existing?.voiceProfile, ...input.voiceProfile },
    emailTemplates: { welcome: null, reportDelivery: null, appointmentConfirmation: null, followUp: null, custom: {}, ...existing?.emailTemplates, ...input.emailTemplates },
    customCss: input.customCss ?? existing?.customCss ?? null,
    createdAt: existing?.createdAt ?? new Date(),
    updatedAt: new Date(),
  };

  brandingRegistry.set(tenantId, pack);
  return pack;
}

/**
 * Get branding pack for a tenant.
 */
export async function getBrandingPack(tenantId: string): Promise<BrandingPack | null> {
  return brandingRegistry.get(tenantId) ?? null;
}

/**
 * Delete branding pack.
 */
export async function deleteBrandingPack(tenantId: string): Promise<void> {
  brandingRegistry.delete(tenantId);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDefaultBranding(): BrandingPack {
  return {
    id: "default",
    tenantId: "system",
    name: "CLUES Default",
    isActive: true,
    colors: DEFAULT_COLORS,
    typography: DEFAULT_TYPOGRAPHY,
    logos: {
      primary: null,
      icon: null,
      wordmark: null,
      darkMode: null,
      email: null,
    },
    voiceProfile: DEFAULT_VOICE_PROFILE,
    emailTemplates: {
      welcome: null,
      reportDelivery: null,
      appointmentConfirmation: null,
      followUp: null,
      custom: {},
    },
    customCss: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function buildBrandingFromTenant(tenant: { id: string; name: string; logoUrl: string | null; primaryColor: string | null }): BrandingPack {
  return {
    id: `tenant_${tenant.id}`,
    tenantId: tenant.id,
    name: tenant.name,
    isActive: true,
    colors: {
      ...DEFAULT_COLORS,
      ...(tenant.primaryColor && { primary: tenant.primaryColor }),
    },
    typography: DEFAULT_TYPOGRAPHY,
    logos: {
      primary: tenant.logoUrl,
      icon: null,
      wordmark: null,
      darkMode: null,
      email: tenant.logoUrl,
    },
    voiceProfile: {
      ...DEFAULT_VOICE_PROFILE,
      companyName: tenant.name,
    },
    emailTemplates: {
      welcome: null,
      reportDelivery: null,
      appointmentConfirmation: null,
      followUp: null,
      custom: {},
    },
    customCss: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// In-memory registry (production: database)
const brandingRegistry = new Map<string, BrandingPack>();

// ─── Service Interface ────────────────────────────────────────────────────────

export interface BrandingService {
  getActive(): BrandingPack;
  getColors(): BrandColors;
  getTypography(): BrandTypography;
  getLogos(): BrandLogos;
  getVoice(): VoiceProfile;
  getCssVariables(): Record<string, string>;
  generateCss(): string;
  save(tenantId: string, input: Partial<BrandingPack>): Promise<BrandingPack>;
  get(tenantId: string): Promise<BrandingPack | null>;
  delete(tenantId: string): Promise<void>;
}

export function getBrandingService(): BrandingService {
  return {
    getActive: getActiveBranding,
    getColors: getBrandColors,
    getTypography: getBrandTypography,
    getLogos: getBrandLogos,
    getVoice: getVoiceProfile,
    getCssVariables: getBrandingCssVariables,
    generateCss: generateBrandingCss,
    save: saveBrandingPack,
    get: getBrandingPack,
    delete: deleteBrandingPack,
  };
}
