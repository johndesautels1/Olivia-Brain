/**
 * Gamma AI Presentation Integration
 *
 * Gamma is "The Cadillac" of report generation — AI-powered branded
 * presentations, documents, and web pages. Olivia uses Gamma for
 * client-facing deliverables: relocation reports, market analyses,
 * investment summaries, and pitch decks.
 *
 * Docs: https://gamma.app/developers
 * Auth: API key via header
 * Used for: Branded 50+ page reports, slide decks, visual deliverables
 */

import { getServerEnv } from "@/lib/config/env";

const DEFAULT_TIMEOUT_MS = 60_000; // Gamma generation can take time
const GAMMA_API_BASE = "https://api.gamma.app/v1";

// ─── Types ───────────────────────────────────────────────────────────────────

export type GammaOutputFormat = "presentation" | "document" | "webpage";
export type GammaExportFormat = "pdf" | "pptx" | "png" | "html";
export type GammaStatus = "pending" | "generating" | "complete" | "failed";

export interface GammaGenerateRequest {
  /** Title of the presentation/document */
  title: string;
  /** Detailed content outline — Gamma AI expands this into full slides */
  outline: string;
  /** Output format */
  format: GammaOutputFormat;
  /** Number of slides/pages (approximate) */
  targetPages?: number;
  /** Brand theme to apply */
  theme?: GammaTheme;
  /** Tone of the content */
  tone?: "professional" | "casual" | "formal" | "persuasive";
  /** Target audience description */
  audience?: string;
  /** Additional instructions for the AI */
  instructions?: string;
  /** Images to include (URLs) */
  imageUrls?: string[];
  /** Data tables to include */
  dataTables?: GammaDataTable[];
}

export interface GammaTheme {
  /** Primary brand color (hex) */
  primaryColor?: string;
  /** Secondary brand color (hex) */
  secondaryColor?: string;
  /** Logo URL */
  logoUrl?: string;
  /** Font family */
  fontFamily?: string;
  /** Template ID from Gamma library */
  templateId?: string;
}

export interface GammaDataTable {
  title: string;
  headers: string[];
  rows: string[][];
}

export interface GammaGenerateResponse {
  id: string;
  status: GammaStatus;
  title: string;
  format: GammaOutputFormat;
  url?: string;
  embedUrl?: string;
  createdAt: string;
}

export interface GammaExportResponse {
  id: string;
  exportFormat: GammaExportFormat;
  downloadUrl: string;
  fileSize: number;
  expiresAt: string;
}

export interface GammaPresentation {
  id: string;
  title: string;
  format: GammaOutputFormat;
  status: GammaStatus;
  url: string;
  embedUrl: string;
  pageCount: number;
  createdAt: string;
  updatedAt: string;
  thumbnailUrl?: string;
}

// ─── Error ───────────────────────────────────────────────────────────────────

export class GammaAdapterError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryable: boolean;

  constructor({
    code,
    message,
    status,
    retryable = false,
  }: {
    code: string;
    message: string;
    status: number;
    retryable?: boolean;
  }) {
    super(message);
    this.name = "GammaAdapterError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

// ─── Configuration ──────────────────────────────────────────────────────────

function getGammaConfig() {
  const env = getServerEnv();
  return { apiKey: env.GAMMA_API_KEY };
}

export function isGammaConfigured(): boolean {
  return Boolean(getGammaConfig().apiKey);
}

function assertConfigured() {
  const { apiKey } = getGammaConfig();
  if (!apiKey) {
    throw new GammaAdapterError({
      code: "GAMMA_NOT_CONFIGURED",
      message: "Gamma API key must be configured.",
      status: 503,
    });
  }
  return { apiKey };
}

// ─── Core Request Function ──────────────────────────────────────────────────

async function gammaRequest<T>(
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const { apiKey } = assertConfigured();

  const url = `${GAMMA_API_BASE}${path}`;

  const response = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new GammaAdapterError({
      code: `GAMMA_HTTP_${response.status}`,
      message: `Gamma API failed: HTTP ${response.status} ${response.statusText}`,
      status: response.status,
      retryable: response.status >= 500 || response.status === 429,
    });
  }

  return (await response.json()) as T;
}

// ─── Public API Functions ───────────────────────────────────────────────────

/**
 * Generate a new presentation/document using Gamma AI.
 * Returns immediately with a generation ID — poll getStatus() for completion.
 */
export async function generate(
  request: GammaGenerateRequest
): Promise<GammaGenerateResponse> {
  const body: Record<string, unknown> = {
    title: request.title,
    outline: request.outline,
    format: request.format,
  };

  if (request.targetPages) body.targetPages = request.targetPages;
  if (request.tone) body.tone = request.tone;
  if (request.audience) body.audience = request.audience;
  if (request.instructions) body.instructions = request.instructions;
  if (request.imageUrls) body.imageUrls = request.imageUrls;
  if (request.dataTables) body.dataTables = request.dataTables;

  if (request.theme) {
    body.theme = {
      ...(request.theme.primaryColor && {
        primaryColor: request.theme.primaryColor,
      }),
      ...(request.theme.secondaryColor && {
        secondaryColor: request.theme.secondaryColor,
      }),
      ...(request.theme.logoUrl && { logoUrl: request.theme.logoUrl }),
      ...(request.theme.fontFamily && { fontFamily: request.theme.fontFamily }),
      ...(request.theme.templateId && {
        templateId: request.theme.templateId,
      }),
    };
  }

  return gammaRequest<GammaGenerateResponse>("POST", "/generate", body);
}

/**
 * Check the status of a generation job.
 */
export async function getStatus(
  generationId: string
): Promise<GammaGenerateResponse> {
  return gammaRequest<GammaGenerateResponse>(
    "GET",
    `/generate/${generationId}`
  );
}

/**
 * Poll until generation is complete (or failed).
 */
export async function waitForCompletion(
  generationId: string,
  options?: { pollIntervalMs?: number; maxWaitMs?: number }
): Promise<GammaGenerateResponse> {
  const pollInterval = options?.pollIntervalMs ?? 3_000;
  const maxWait = options?.maxWaitMs ?? 120_000;
  const deadline = Date.now() + maxWait;

  while (Date.now() < deadline) {
    const status = await getStatus(generationId);

    if (status.status === "complete") return status;
    if (status.status === "failed") {
      throw new GammaAdapterError({
        code: "GAMMA_GENERATION_FAILED",
        message: `Gamma generation ${generationId} failed.`,
        status: 500,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new GammaAdapterError({
    code: "GAMMA_GENERATION_TIMEOUT",
    message: `Gamma generation ${generationId} timed out after ${maxWait}ms.`,
    status: 408,
    retryable: true,
  });
}

/**
 * Export a completed presentation to PDF, PPTX, or PNG.
 */
export async function exportPresentation(
  presentationId: string,
  format: GammaExportFormat
): Promise<GammaExportResponse> {
  return gammaRequest<GammaExportResponse>(
    "POST",
    `/presentations/${presentationId}/export`,
    { format }
  );
}

/**
 * Get details of an existing presentation.
 */
export async function getPresentation(
  presentationId: string
): Promise<GammaPresentation> {
  return gammaRequest<GammaPresentation>(
    "GET",
    `/presentations/${presentationId}`
  );
}

/**
 * List recent presentations.
 */
export async function listPresentations(options?: {
  limit?: number;
  offset?: number;
}): Promise<{ presentations: GammaPresentation[]; total: number }> {
  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.offset) params.set("offset", String(options.offset));

  const query = params.toString();
  const path = `/presentations${query ? `?${query}` : ""}`;
  return gammaRequest<{ presentations: GammaPresentation[]; total: number }>(
    "GET",
    path
  );
}

// ─── CLUES Brand Theme ──────────────────────────────────────────────────────

/** Default CLUES Intelligence branding for Gamma presentations. */
export const CLUES_BRAND_THEME: GammaTheme = {
  primaryColor: "#1a1a2e",
  secondaryColor: "#e94560",
  fontFamily: "Inter",
};

/**
 * Generate a CLUES-branded presentation with default theme.
 */
export async function generateBranded(
  title: string,
  outline: string,
  options?: {
    format?: GammaOutputFormat;
    targetPages?: number;
    audience?: string;
    instructions?: string;
    dataTables?: GammaDataTable[];
  }
): Promise<GammaGenerateResponse> {
  return generate({
    title,
    outline,
    format: options?.format ?? "presentation",
    targetPages: options?.targetPages,
    audience: options?.audience,
    instructions: options?.instructions,
    dataTables: options?.dataTables,
    theme: CLUES_BRAND_THEME,
    tone: "professional",
  });
}
