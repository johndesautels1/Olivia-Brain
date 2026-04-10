/**
 * Firecrawl API Adapter
 *
 * Free tier: 500 credits/month
 * Paid: Pay-as-you-go starting at $0.001/page
 * Docs: https://docs.firecrawl.dev/
 *
 * Used for: Web crawling, scraping, and structured extraction for RAG
 * Coverage: Global (any website)
 *
 * Features:
 * - Scrape single pages to markdown/HTML
 * - Crawl entire websites
 * - Extract structured data with LLM
 * - Map website structure
 */

import { getServerEnv } from "@/lib/config/env";

const DEFAULT_TIMEOUT_MS = 60_000; // Longer timeout for crawling
const FIRECRAWL_API_BASE = "https://api.firecrawl.dev/v1";

// ─── Types ───────────────────────────────────────────────────────────────────

export type OutputFormat = "markdown" | "html" | "rawHtml" | "links" | "screenshot";

export interface ScrapeOptions {
  formats?: OutputFormat[];
  onlyMainContent?: boolean;
  includeTags?: string[];
  excludeTags?: string[];
  headers?: Record<string, string>;
  waitFor?: number;
  timeout?: number;
  actions?: PageAction[];
}

export interface PageAction {
  type: "wait" | "click" | "write" | "press" | "scroll" | "screenshot";
  selector?: string;
  milliseconds?: number;
  text?: string;
  key?: string;
  direction?: "up" | "down";
  amount?: number;
}

export interface ScrapeResult {
  success: boolean;
  data?: {
    markdown?: string;
    html?: string;
    rawHtml?: string;
    links?: string[];
    screenshot?: string;
    metadata: {
      title?: string;
      description?: string;
      language?: string;
      sourceURL: string;
      statusCode?: number;
      error?: string;
    };
  };
  error?: string;
}

export interface CrawlOptions {
  excludePaths?: string[];
  includePaths?: string[];
  maxDepth?: number;
  limit?: number;
  allowBackwardLinks?: boolean;
  allowExternalLinks?: boolean;
  ignoreSitemap?: boolean;
  scrapeOptions?: ScrapeOptions;
}

export interface CrawlResponse {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

export interface CrawlStatusResponse {
  success: boolean;
  status: "scraping" | "completed" | "failed" | "cancelled";
  total?: number;
  completed?: number;
  creditsUsed?: number;
  expiresAt?: string;
  data?: ScrapeResult["data"][];
  error?: string;
}

export interface MapOptions {
  search?: string;
  ignoreSitemap?: boolean;
  includeSubdomains?: boolean;
  limit?: number;
}

export interface MapResult {
  success: boolean;
  links?: string[];
  error?: string;
}

export interface ExtractOptions {
  schema: Record<string, unknown>;
  systemPrompt?: string;
  prompt?: string;
}

export interface ExtractResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

export class FirecrawlAdapterError extends Error {
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
    this.name = "FirecrawlAdapterError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

// ─── Configuration ───────────────────────────────────────────────────────────

function getFirecrawlConfig() {
  const env = getServerEnv();
  return {
    apiKey: env.FIRECRAWL_API_KEY,
  };
}

export function isFirecrawlConfigured(): boolean {
  const { apiKey } = getFirecrawlConfig();
  return Boolean(apiKey);
}

function assertConfigured() {
  const { apiKey } = getFirecrawlConfig();
  if (!apiKey) {
    throw new FirecrawlAdapterError({
      code: "FIRECRAWL_NOT_CONFIGURED",
      message: "Firecrawl API key must be configured.",
      status: 503,
    });
  }
  return { apiKey };
}

// ─── Core Request Function ───────────────────────────────────────────────────

interface RequestOptions {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  timeoutMs?: number;
}

async function requestFirecrawl<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { apiKey } = assertConfigured();

  const url = `${FIRECRAWL_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    method: options.method ?? "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new FirecrawlAdapterError({
      code: "FIRECRAWL_REQUEST_FAILED",
      message: payload?.error ?? `Firecrawl API request failed with HTTP ${response.status}`,
      status: response.status,
      retryable: response.status >= 500 || response.status === 429,
    });
  }

  return payload as T;
}

// ─── Public API Functions ────────────────────────────────────────────────────

/**
 * Scrape a single URL to markdown/HTML
 */
export async function scrapeUrl(
  url: string,
  options?: ScrapeOptions
): Promise<ScrapeResult> {
  return requestFirecrawl<ScrapeResult>("/scrape", {
    body: {
      url,
      formats: options?.formats ?? ["markdown"],
      onlyMainContent: options?.onlyMainContent ?? true,
      includeTags: options?.includeTags,
      excludeTags: options?.excludeTags,
      headers: options?.headers,
      waitFor: options?.waitFor,
      timeout: options?.timeout,
      actions: options?.actions,
    },
  });
}

/**
 * Start crawling a website (async)
 */
export async function startCrawl(
  url: string,
  options?: CrawlOptions
): Promise<CrawlResponse> {
  return requestFirecrawl<CrawlResponse>("/crawl", {
    body: {
      url,
      excludePaths: options?.excludePaths,
      includePaths: options?.includePaths,
      maxDepth: options?.maxDepth ?? 2,
      limit: options?.limit ?? 100,
      allowBackwardLinks: options?.allowBackwardLinks ?? false,
      allowExternalLinks: options?.allowExternalLinks ?? false,
      ignoreSitemap: options?.ignoreSitemap ?? false,
      scrapeOptions: options?.scrapeOptions ?? {
        formats: ["markdown"],
        onlyMainContent: true,
      },
    },
  });
}

/**
 * Check crawl status and get results
 */
export async function getCrawlStatus(crawlId: string): Promise<CrawlStatusResponse> {
  return requestFirecrawl<CrawlStatusResponse>(`/crawl/${crawlId}`, {
    method: "GET",
  });
}

/**
 * Cancel a running crawl
 */
export async function cancelCrawl(crawlId: string): Promise<{ success: boolean }> {
  return requestFirecrawl<{ success: boolean }>(`/crawl/${crawlId}`, {
    method: "DELETE",
  });
}

/**
 * Map a website's structure (get all URLs)
 */
export async function mapWebsite(
  url: string,
  options?: MapOptions
): Promise<MapResult> {
  return requestFirecrawl<MapResult>("/map", {
    body: {
      url,
      search: options?.search,
      ignoreSitemap: options?.ignoreSitemap ?? false,
      includeSubdomains: options?.includeSubdomains ?? false,
      limit: options?.limit ?? 5000,
    },
  });
}

/**
 * Extract structured data from a URL using LLM
 */
export async function extractData(
  url: string,
  options: ExtractOptions
): Promise<ExtractResult> {
  return requestFirecrawl<ExtractResult>("/scrape", {
    body: {
      url,
      formats: ["extract"],
      extract: {
        schema: options.schema,
        systemPrompt: options.systemPrompt,
        prompt: options.prompt,
      },
    },
  });
}

// ─── Convenience Functions ───────────────────────────────────────────────────

/**
 * Scrape URL and return clean markdown for RAG
 */
export async function scrapeForRAG(
  url: string
): Promise<{
  markdown: string;
  title: string;
  description: string;
  sourceUrl: string;
  wordCount: number;
}> {
  const result = await scrapeUrl(url, {
    formats: ["markdown"],
    onlyMainContent: true,
  });

  if (!result.success || !result.data?.markdown) {
    throw new FirecrawlAdapterError({
      code: "FIRECRAWL_SCRAPE_FAILED",
      message: result.error ?? "Failed to scrape URL",
      status: 400,
    });
  }

  const markdown = result.data.markdown;
  const wordCount = markdown.split(/\s+/).length;

  return {
    markdown,
    title: result.data.metadata.title ?? "",
    description: result.data.metadata.description ?? "",
    sourceUrl: result.data.metadata.sourceURL,
    wordCount,
  };
}

/**
 * Crawl a website and collect all pages for RAG indexing
 */
export async function crawlForRAG(
  url: string,
  options?: {
    maxPages?: number;
    maxDepth?: number;
    includePaths?: string[];
    excludePaths?: string[];
    pollIntervalMs?: number;
    maxWaitMs?: number;
  }
): Promise<{
  pages: {
    url: string;
    title: string;
    markdown: string;
    wordCount: number;
  }[];
  totalPages: number;
  creditsUsed: number;
}> {
  // Start crawl
  const crawlResponse = await startCrawl(url, {
    limit: options?.maxPages ?? 50,
    maxDepth: options?.maxDepth ?? 2,
    includePaths: options?.includePaths,
    excludePaths: options?.excludePaths,
    scrapeOptions: {
      formats: ["markdown"],
      onlyMainContent: true,
    },
  });

  if (!crawlResponse.success || !crawlResponse.id) {
    throw new FirecrawlAdapterError({
      code: "FIRECRAWL_CRAWL_FAILED",
      message: crawlResponse.error ?? "Failed to start crawl",
      status: 400,
    });
  }

  // Poll for completion
  const pollInterval = options?.pollIntervalMs ?? 5000;
  const maxWait = options?.maxWaitMs ?? 300000; // 5 minutes
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    const status = await getCrawlStatus(crawlResponse.id);

    if (status.status === "completed") {
      const pages = (status.data ?? [])
        .filter((d) => d.markdown)
        .map((d) => ({
          url: d.metadata.sourceURL,
          title: d.metadata.title ?? "",
          markdown: d.markdown!,
          wordCount: d.markdown!.split(/\s+/).length,
        }));

      return {
        pages,
        totalPages: status.total ?? pages.length,
        creditsUsed: status.creditsUsed ?? pages.length,
      };
    }

    if (status.status === "failed" || status.status === "cancelled") {
      throw new FirecrawlAdapterError({
        code: "FIRECRAWL_CRAWL_FAILED",
        message: status.error ?? `Crawl ${status.status}`,
        status: 400,
      });
    }

    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  // Timeout - cancel crawl
  await cancelCrawl(crawlResponse.id);
  throw new FirecrawlAdapterError({
    code: "FIRECRAWL_CRAWL_TIMEOUT",
    message: "Crawl timed out",
    status: 408,
    retryable: true,
  });
}

/**
 * Extract structured data from a webpage (company info, product details, etc.)
 */
export async function extractStructuredData<T extends Record<string, unknown>>(
  url: string,
  schema: Record<string, unknown>,
  prompt?: string
): Promise<T> {
  const result = await extractData(url, {
    schema,
    prompt,
  });

  if (!result.success || !result.data) {
    throw new FirecrawlAdapterError({
      code: "FIRECRAWL_EXTRACT_FAILED",
      message: result.error ?? "Failed to extract data",
      status: 400,
    });
  }

  return result.data as T;
}

/**
 * Get all URLs from a website for analysis
 */
export async function getAllUrls(
  url: string,
  options?: {
    search?: string;
    limit?: number;
    includeSubdomains?: boolean;
  }
): Promise<string[]> {
  const result = await mapWebsite(url, {
    search: options?.search,
    limit: options?.limit ?? 1000,
    includeSubdomains: options?.includeSubdomains ?? false,
  });

  if (!result.success) {
    throw new FirecrawlAdapterError({
      code: "FIRECRAWL_MAP_FAILED",
      message: result.error ?? "Failed to map website",
      status: 400,
    });
  }

  return result.links ?? [];
}

// ─── Schema Helpers ──────────────────────────────────────────────────────────

/**
 * Common extraction schemas for real estate/relocation use cases
 */
export const EXTRACTION_SCHEMAS = {
  companyInfo: {
    type: "object",
    properties: {
      name: { type: "string", description: "Company name" },
      description: { type: "string", description: "Company description" },
      address: { type: "string", description: "Physical address" },
      phone: { type: "string", description: "Phone number" },
      email: { type: "string", description: "Email address" },
      website: { type: "string", description: "Website URL" },
      services: { type: "array", items: { type: "string" }, description: "Services offered" },
    },
    required: ["name"],
  },

  propertyListing: {
    type: "object",
    properties: {
      address: { type: "string", description: "Property address" },
      price: { type: "number", description: "Listing price" },
      bedrooms: { type: "number", description: "Number of bedrooms" },
      bathrooms: { type: "number", description: "Number of bathrooms" },
      sqft: { type: "number", description: "Square footage" },
      description: { type: "string", description: "Property description" },
      features: { type: "array", items: { type: "string" }, description: "Property features" },
      agent: { type: "string", description: "Listing agent name" },
      agentPhone: { type: "string", description: "Agent phone number" },
    },
    required: ["address"],
  },

  articleContent: {
    type: "object",
    properties: {
      title: { type: "string", description: "Article title" },
      author: { type: "string", description: "Author name" },
      publishedDate: { type: "string", description: "Publication date" },
      summary: { type: "string", description: "Article summary" },
      mainPoints: { type: "array", items: { type: "string" }, description: "Key points" },
      citations: { type: "array", items: { type: "string" }, description: "Sources cited" },
    },
    required: ["title"],
  },
} as const;
