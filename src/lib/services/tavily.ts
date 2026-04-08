/**
 * TAVILY WEB RESEARCH SERVICE
 * ============================
 *
 * Tavily is position ⑦ in the 9-model cascade:
 * Web research MCP - real-time search with agent-friendly structured output.
 *
 * Use cases:
 * - Real-time web search for current information
 * - Fact verification and citation gathering
 * - Market research and news retrieval
 * - Evidence-grounded retrieval for RAG pipelines
 */

import { tavily } from "@tavily/core";
import { getServerEnv } from "@/lib/config/env";

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  publishedDate?: string;
}

export interface TavilyImage {
  url: string;
  description?: string;
}

export interface TavilySearchResponse {
  query: string;
  results: TavilySearchResult[];
  answer?: string;
  responseTime: number;
  images?: TavilyImage[];
}

export interface TavilySearchOptions {
  searchDepth?: "basic" | "advanced";
  maxResults?: number;
  includeAnswer?: boolean;
  includeImages?: boolean;
  includeDomains?: string[];
  excludeDomains?: string[];
}

let tavilyClient: ReturnType<typeof tavily> | null = null;

function getTavilyClient() {
  if (!tavilyClient) {
    const env = getServerEnv();
    if (!env.TAVILY_API_KEY) {
      throw new Error("TAVILY_API_KEY is not configured");
    }
    tavilyClient = tavily({ apiKey: env.TAVILY_API_KEY });
  }
  return tavilyClient;
}

/**
 * Check if Tavily is configured and available
 */
export function isTavilyConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.TAVILY_API_KEY);
}

/**
 * Perform a web search using Tavily
 *
 * @param query - The search query
 * @param options - Search options
 * @returns Search results with optional AI-generated answer
 */
export async function searchWeb(
  query: string,
  options: TavilySearchOptions = {}
): Promise<TavilySearchResponse> {
  const client = getTavilyClient();
  const startTime = Date.now();

  const {
    searchDepth = "basic",
    maxResults = 5,
    includeAnswer = true,
    includeImages = false,
    includeDomains,
    excludeDomains,
  } = options;

  const response = await client.search(query, {
    searchDepth,
    maxResults,
    includeAnswer,
    includeImages,
    includeDomains,
    excludeDomains,
  });

  return {
    query,
    results: response.results.map((result) => ({
      title: result.title,
      url: result.url,
      content: result.content,
      score: result.score,
      publishedDate: result.publishedDate,
    })),
    answer: response.answer,
    responseTime: Date.now() - startTime,
    images: response.images,
  };
}

/**
 * Search for real estate market information
 */
export async function searchRealEstateMarket(
  location: string,
  topic: string
): Promise<TavilySearchResponse> {
  const query = `${topic} real estate market ${location} 2026`;
  return searchWeb(query, {
    searchDepth: "advanced",
    maxResults: 8,
    includeAnswer: true,
    includeDomains: [
      "zillow.com",
      "redfin.com",
      "realtor.com",
      "nar.realtor",
      "census.gov",
    ],
  });
}

/**
 * Search for relocation and cost of living information
 */
export async function searchRelocationInfo(
  fromCity: string,
  toCity: string
): Promise<TavilySearchResponse> {
  const query = `relocating from ${fromCity} to ${toCity} cost of living comparison 2026`;
  return searchWeb(query, {
    searchDepth: "advanced",
    maxResults: 10,
    includeAnswer: true,
    includeDomains: [
      "numbeo.com",
      "nerdwallet.com",
      "bestplaces.net",
      "moveto.io",
    ],
  });
}

/**
 * Search for visa and immigration information
 */
export async function searchVisaInfo(
  nationality: string,
  destination: string
): Promise<TavilySearchResponse> {
  const query = `${nationality} citizen visa requirements ${destination} 2026`;
  return searchWeb(query, {
    searchDepth: "advanced",
    maxResults: 8,
    includeAnswer: true,
    includeDomains: [
      "gov.uk",
      "state.gov",
      "schengenvisainfo.com",
      "visaguide.world",
    ],
  });
}

/**
 * Search for current news and events
 */
export async function searchNews(
  topic: string,
  location?: string
): Promise<TavilySearchResponse> {
  const query = location ? `${topic} news ${location}` : `${topic} latest news`;
  return searchWeb(query, {
    searchDepth: "basic",
    maxResults: 6,
    includeAnswer: true,
    excludeDomains: ["pinterest.com", "facebook.com", "twitter.com"],
  });
}

/**
 * Extract content from a specific URL
 */
export async function extractFromUrl(url: string): Promise<{
  url: string;
  content: string;
  extractedAt: string;
}> {
  const client = getTavilyClient();
  const response = await client.extract([url]);

  return {
    url,
    content: response.results[0]?.rawContent || "",
    extractedAt: new Date().toISOString(),
  };
}

/**
 * Get a quick factual answer to a question
 */
export async function getQuickAnswer(question: string): Promise<{
  question: string;
  answer: string | null;
  sources: Array<{ title: string; url: string }>;
}> {
  const response = await searchWeb(question, {
    searchDepth: "basic",
    maxResults: 3,
    includeAnswer: true,
  });

  return {
    question,
    answer: response.answer || null,
    sources: response.results.map((r) => ({ title: r.title, url: r.url })),
  };
}
