/**
 * Jina AI Reader API Adapter
 *
 * Free tier: Available with rate limits
 * Paid: Higher rate limits and priority
 * Docs: https://jina.ai/reader/
 *
 * Used for: Converting URLs to clean LLM-ready text
 * Coverage: Global (any website)
 *
 * Features:
 * - URL to markdown/text conversion
 * - Search queries to structured results
 * - Grounding for fact-checking
 * - Clean output optimized for LLMs
 */

import { getServerEnv } from "@/lib/config/env";

const DEFAULT_TIMEOUT_MS = 30_000;
const JINA_READER_BASE = "https://r.jina.ai";
const JINA_SEARCH_BASE = "https://s.jina.ai";
const JINA_GROUND_BASE = "https://g.jina.ai";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ReaderOptions {
  /** Return response in JSON format */
  json?: boolean;
  /** Target specific CSS selector */
  targetSelector?: string;
  /** Wait for specific CSS selector to appear */
  waitForSelector?: string;
  /** Remove specific CSS selectors */
  removeSelector?: string;
  /** Include links in output */
  withLinks?: boolean;
  /** Include images in output */
  withImages?: boolean;
  /** Forward cookies to target */
  forwardCookies?: boolean;
  /** Custom headers to forward */
  headers?: Record<string, string>;
  /** Proxy country code */
  proxyCountry?: string;
  /** Don't use cache */
  noCache?: boolean;
  /** Use browser rendering */
  useBrowser?: boolean;
}

export interface ReaderResult {
  code: number;
  status: number;
  data: {
    title: string;
    description?: string;
    url: string;
    content: string;
    publishedTime?: string;
    usage?: {
      tokens: number;
    };
  };
}

export interface SearchOptions {
  /** Return response in JSON format */
  json?: boolean;
  /** Number of results to return */
  count?: number;
  /** Include images in results */
  withImages?: boolean;
}

export interface SearchResult {
  code: number;
  status: number;
  data: {
    query: string;
    results: {
      title: string;
      url: string;
      description?: string;
      content?: string;
    }[];
  };
}

export interface GroundOptions {
  /** Return response in JSON format */
  json?: boolean;
}

export interface GroundResult {
  code: number;
  status: number;
  data: {
    statement: string;
    factuality: number;
    result: boolean;
    reason: string;
    references: {
      url: string;
      keyQuote: string;
      isSupportive: boolean;
    }[];
  };
}

export class JinaReaderAdapterError extends Error {
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
    this.name = "JinaReaderAdapterError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

// ─── Configuration ───────────────────────────────────────────────────────────

function getJinaConfig() {
  const env = getServerEnv();
  return {
    apiKey: env.JINA_API_KEY,
  };
}

export function isJinaConfigured(): boolean {
  // Jina Reader works without API key (with rate limits)
  return true;
}

export function hasJinaApiKey(): boolean {
  const { apiKey } = getJinaConfig();
  return Boolean(apiKey);
}

// ─── Core Request Function ───────────────────────────────────────────────────

interface RequestConfig {
  headers?: Record<string, string>;
  timeoutMs?: number;
}

async function requestJina<T>(
  url: string,
  config: RequestConfig = {}
): Promise<T> {
  const { apiKey } = getJinaConfig();

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...config.headers,
  };

  // Add API key if available (for higher rate limits)
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const response = await fetch(url, {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(config.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new JinaReaderAdapterError({
      code: "JINA_REQUEST_FAILED",
      message: text || `Jina API request failed with HTTP ${response.status}`,
      status: response.status,
      retryable: response.status >= 500 || response.status === 429,
    });
  }

  // Check if response is JSON
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return response.json() as Promise<T>;
  }

  // Return as wrapped text
  const text = await response.text();
  return { content: text } as T;
}

// ─── Public API Functions ────────────────────────────────────────────────────

/**
 * Read a URL and convert to clean text/markdown
 */
export async function readUrl(
  url: string,
  options?: ReaderOptions
): Promise<ReaderResult> {
  const headers: Record<string, string> = {};

  if (options?.json !== false) {
    headers.Accept = "application/json";
  }
  if (options?.targetSelector) {
    headers["X-Target-Selector"] = options.targetSelector;
  }
  if (options?.waitForSelector) {
    headers["X-Wait-For-Selector"] = options.waitForSelector;
  }
  if (options?.removeSelector) {
    headers["X-Remove-Selector"] = options.removeSelector;
  }
  if (options?.withLinks) {
    headers["X-With-Links-Summary"] = "true";
  }
  if (options?.withImages) {
    headers["X-With-Images-Summary"] = "true";
  }
  if (options?.forwardCookies) {
    headers["X-Set-Cookie"] = "*";
  }
  if (options?.proxyCountry) {
    headers["X-Proxy-Url"] = `country-${options.proxyCountry}`;
  }
  if (options?.noCache) {
    headers["X-No-Cache"] = "true";
  }
  if (options?.useBrowser) {
    headers["X-Engine"] = "browser";
  }

  // Forward custom headers
  if (options?.headers) {
    for (const [key, value] of Object.entries(options.headers)) {
      headers[`X-Fwd-${key}`] = value;
    }
  }

  const readerUrl = `${JINA_READER_BASE}/${url}`;

  return requestJina<ReaderResult>(readerUrl, { headers });
}

/**
 * Search the web and get structured results
 */
export async function search(
  query: string,
  options?: SearchOptions
): Promise<SearchResult> {
  const headers: Record<string, string> = {};

  if (options?.json !== false) {
    headers.Accept = "application/json";
  }
  if (options?.count) {
    headers["X-Count"] = String(options.count);
  }
  if (options?.withImages) {
    headers["X-With-Images"] = "true";
  }

  const searchUrl = `${JINA_SEARCH_BASE}/${encodeURIComponent(query)}`;

  return requestJina<SearchResult>(searchUrl, { headers });
}

/**
 * Ground a statement with factual references
 */
export async function ground(
  statement: string,
  options?: GroundOptions
): Promise<GroundResult> {
  const headers: Record<string, string> = {};

  if (options?.json !== false) {
    headers.Accept = "application/json";
  }

  const groundUrl = `${JINA_GROUND_BASE}/${encodeURIComponent(statement)}`;

  return requestJina<GroundResult>(groundUrl, { headers });
}

// ─── Convenience Functions ───────────────────────────────────────────────────

/**
 * Read URL and return clean text for RAG
 */
export async function readForRAG(
  url: string
): Promise<{
  content: string;
  title: string;
  description: string;
  url: string;
  wordCount: number;
  tokenCount?: number;
}> {
  const result = await readUrl(url, {
    json: true,
    withLinks: true,
  });

  const content = result.data.content;

  return {
    content,
    title: result.data.title,
    description: result.data.description ?? "",
    url: result.data.url,
    wordCount: content.split(/\s+/).length,
    tokenCount: result.data.usage?.tokens,
  };
}

/**
 * Read multiple URLs in parallel
 */
export async function readMultipleUrls(
  urls: string[],
  options?: ReaderOptions & { concurrency?: number }
): Promise<{
  successful: ReaderResult[];
  failed: { url: string; error: string }[];
}> {
  const concurrency = options?.concurrency ?? 5;
  const successful: ReaderResult[] = [];
  const failed: { url: string; error: string }[] = [];

  // Process in batches
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);

    const results = await Promise.allSettled(
      batch.map((url) => readUrl(url, options))
    );

    results.forEach((result, index) => {
      const url = batch[index];
      if (result.status === "fulfilled") {
        successful.push(result.value);
      } else {
        failed.push({
          url,
          error: result.reason?.message ?? "Unknown error",
        });
      }
    });
  }

  return { successful, failed };
}

/**
 * Search and read top results
 */
export async function searchAndRead(
  query: string,
  options?: {
    count?: number;
    readContent?: boolean;
  }
): Promise<{
  query: string;
  results: {
    title: string;
    url: string;
    description?: string;
    content?: string;
    wordCount?: number;
  }[];
}> {
  const searchResults = await search(query, {
    count: options?.count ?? 5,
  });

  if (!options?.readContent) {
    return {
      query,
      results: searchResults.data.results,
    };
  }

  // Read full content for each result
  const resultsWithContent = await Promise.all(
    searchResults.data.results.map(async (result) => {
      try {
        const readResult = await readUrl(result.url, { json: true });
        return {
          ...result,
          content: readResult.data.content,
          wordCount: readResult.data.content.split(/\s+/).length,
        };
      } catch {
        return {
          ...result,
          content: result.description,
          wordCount: result.description?.split(/\s+/).length,
        };
      }
    })
  );

  return {
    query,
    results: resultsWithContent,
  };
}

/**
 * Fact-check a statement
 */
export async function factCheck(
  statement: string
): Promise<{
  statement: string;
  isTrue: boolean;
  confidence: number;
  reasoning: string;
  sources: {
    url: string;
    quote: string;
    supports: boolean;
  }[];
}> {
  const result = await ground(statement, { json: true });

  return {
    statement: result.data.statement,
    isTrue: result.data.result,
    confidence: result.data.factuality,
    reasoning: result.data.reason,
    sources: result.data.references.map((ref) => ({
      url: ref.url,
      quote: ref.keyQuote,
      supports: ref.isSupportive,
    })),
  };
}

/**
 * Extract article content with metadata
 */
export async function extractArticle(
  url: string
): Promise<{
  title: string;
  content: string;
  publishedDate?: string;
  author?: string;
  description?: string;
  url: string;
  wordCount: number;
  readingTimeMinutes: number;
}> {
  const result = await readUrl(url, {
    json: true,
    withLinks: false,
    withImages: false,
  });

  const content = result.data.content;
  const wordCount = content.split(/\s+/).length;
  const readingTimeMinutes = Math.ceil(wordCount / 200); // ~200 words per minute

  // Try to extract author from content
  const authorMatch = content.match(/(?:by|author[:\s]+)([^,\n]+)/i);
  const author = authorMatch?.[1]?.trim();

  return {
    title: result.data.title,
    content,
    publishedDate: result.data.publishedTime,
    author,
    description: result.data.description,
    url: result.data.url,
    wordCount,
    readingTimeMinutes,
  };
}

/**
 * Read URL with specific content extraction
 */
export async function extractContent(
  url: string,
  selector: string
): Promise<{
  content: string;
  url: string;
  selector: string;
}> {
  const result = await readUrl(url, {
    json: true,
    targetSelector: selector,
  });

  return {
    content: result.data.content,
    url: result.data.url,
    selector,
  };
}

// ─── URL Utilities ───────────────────────────────────────────────────────────

/**
 * Check if a URL is likely readable
 */
export function isReadableUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Skip common non-content URLs
    const skipPatterns = [
      /\.(jpg|jpeg|png|gif|svg|ico|webp)$/i,
      /\.(mp3|mp4|wav|avi|mov|webm)$/i,
      /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i,
      /\.(zip|rar|tar|gz|7z)$/i,
      /\.(css|js|json|xml)$/i,
    ];

    const path = parsed.pathname;
    for (const pattern of skipPatterns) {
      if (pattern.test(path)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Get domain from URL
 */
export function getDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url;
  }
}

/**
 * Clean and normalize URL
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // Remove tracking parameters
    const trackingParams = [
      "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
      "fbclid", "gclid", "ref", "source",
    ];

    trackingParams.forEach((param) => {
      parsed.searchParams.delete(param);
    });

    // Remove trailing slash
    let normalized = parsed.toString();
    if (normalized.endsWith("/") && parsed.pathname !== "/") {
      normalized = normalized.slice(0, -1);
    }

    return normalized;
  } catch {
    return url;
  }
}
