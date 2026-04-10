/**
 * Citation-First RAG System
 *
 * A RAG implementation that prioritizes source attribution and transparency.
 * Every piece of retrieved information is tagged with citations for fact-checking.
 *
 * Key principles:
 * 1. Every chunk carries source metadata
 * 2. Responses include inline citations
 * 3. Sources are ranked by credibility
 * 4. Conflicting information is flagged
 * 5. Provenance is fully traceable
 */

import { rerank, type RerankModel } from "../adapters/cohere-rerank";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CitedSource {
  /** Unique identifier for this source */
  id: string;
  /** Source type (web, document, database, etc.) */
  type: SourceType;
  /** URL or path to the source */
  url?: string;
  /** Title of the source */
  title: string;
  /** Author or publisher */
  author?: string;
  /** Publication date */
  publishedDate?: string;
  /** When this source was retrieved */
  retrievedAt: string;
  /** Credibility score (0-100) */
  credibilityScore: number;
  /** Domain/site credibility tier */
  credibilityTier: CredibilityTier;
}

export type SourceType =
  | "web"
  | "document"
  | "database"
  | "api"
  | "user_input"
  | "knowledge_base"
  | "external_service";

export type CredibilityTier =
  | "official"      // Government, official organizations
  | "authoritative" // Academic, established news, industry leaders
  | "reliable"      // Reputable sources with editorial standards
  | "community"     // User-generated content with moderation
  | "unverified";   // Unknown or unverified sources

export interface CitedChunk {
  /** Unique chunk identifier */
  id: string;
  /** The text content */
  content: string;
  /** Source this chunk came from */
  source: CitedSource;
  /** Position in source (page, section, etc.) */
  position?: {
    page?: number;
    section?: string;
    paragraph?: number;
    characterOffset?: number;
  };
  /** Semantic relevance score (set after retrieval) */
  relevanceScore?: number;
  /** Embedding vector (if computed) */
  embedding?: number[];
  /** Metadata for filtering */
  metadata?: Record<string, unknown>;
}

export interface CitedResponse {
  /** The generated response text with inline citations */
  text: string;
  /** Parsed citations referenced in the response */
  citations: Citation[];
  /** All sources used (may include unused sources) */
  sources: CitedSource[];
  /** Chunks that contributed to the response */
  chunks: CitedChunk[];
  /** Confidence in the response */
  confidence: ResponseConfidence;
  /** Any conflicting information detected */
  conflicts?: ConflictInfo[];
  /** Generation metadata */
  metadata: {
    totalChunksRetrieved: number;
    chunksUsed: number;
    avgRelevanceScore: number;
    avgCredibilityScore: number;
    generatedAt: string;
  };
}

export interface Citation {
  /** Citation marker (e.g., "[1]", "[Smith 2023]") */
  marker: string;
  /** Index in sources array */
  sourceIndex: number;
  /** The source being cited */
  source: CitedSource;
  /** Specific quote or claim being cited */
  claim?: string;
  /** Where in the response this citation appears */
  position: {
    start: number;
    end: number;
  };
}

export interface ResponseConfidence {
  /** Overall confidence score (0-100) */
  score: number;
  /** Confidence level */
  level: "high" | "medium" | "low" | "uncertain";
  /** Factors affecting confidence */
  factors: {
    sourceQuality: number;
    sourceAgreement: number;
    topicCoverage: number;
    recency: number;
  };
}

export interface ConflictInfo {
  /** What the conflict is about */
  topic: string;
  /** Different claims/values */
  claims: {
    value: string;
    source: CitedSource;
    confidence: number;
  }[];
  /** Recommended resolution */
  resolution?: string;
}

export interface RetrievalOptions {
  /** Maximum chunks to retrieve */
  maxChunks?: number;
  /** Minimum relevance score (0-1) */
  minRelevance?: number;
  /** Minimum source credibility (0-100) */
  minCredibility?: number;
  /** Filter by source types */
  sourceTypes?: SourceType[];
  /** Rerank model to use */
  rerankModel?: RerankModel;
  /** Include conflicting information */
  includeConflicts?: boolean;
  /** Recency bias (higher = prefer recent) */
  recencyWeight?: number;
}

export interface CitationStyle {
  /** How to format citation markers */
  markerStyle: "numeric" | "author_year" | "footnote";
  /** Where to place citations */
  placement: "inline" | "end" | "both";
  /** Include URLs in citations */
  includeUrls: boolean;
  /** Include access dates */
  includeAccessDates: boolean;
}

// ─── Citation-First RAG Pipeline ─────────────────────────────────────────────

export class CitationFirstRAG {
  private chunks: CitedChunk[] = [];
  private sources: Map<string, CitedSource> = new Map();

  constructor(
    private options: {
      defaultCredibility?: number;
      citationStyle?: CitationStyle;
    } = {}
  ) {}

  /**
   * Add a source with its chunks to the knowledge base
   */
  addSource(source: CitedSource, chunks: Omit<CitedChunk, "source">[]): void {
    this.sources.set(source.id, source);

    for (const chunk of chunks) {
      this.chunks.push({
        ...chunk,
        source,
      });
    }
  }

  /**
   * Add a document as a source (splits into chunks)
   */
  addDocument(
    content: string,
    source: Omit<CitedSource, "id" | "retrievedAt">,
    options?: {
      chunkSize?: number;
      chunkOverlap?: number;
    }
  ): void {
    const fullSource: CitedSource = {
      ...source,
      id: generateSourceId(source),
      retrievedAt: new Date().toISOString(),
    };

    this.sources.set(fullSource.id, fullSource);

    const chunks = splitIntoChunks(content, options?.chunkSize ?? 500, options?.chunkOverlap ?? 50);

    for (let i = 0; i < chunks.length; i++) {
      this.chunks.push({
        id: `${fullSource.id}-chunk-${i}`,
        content: chunks[i],
        source: fullSource,
        position: { paragraph: i },
      });
    }
  }

  /**
   * Retrieve relevant chunks for a query
   */
  async retrieve(
    query: string,
    options?: RetrievalOptions
  ): Promise<CitedChunk[]> {
    const maxChunks = options?.maxChunks ?? 10;
    const minRelevance = options?.minRelevance ?? 0.3;
    const minCredibility = options?.minCredibility ?? 0;

    // Filter chunks by criteria
    let candidateChunks = this.chunks.filter((chunk) => {
      if (options?.sourceTypes && !options.sourceTypes.includes(chunk.source.type)) {
        return false;
      }
      if (chunk.source.credibilityScore < minCredibility) {
        return false;
      }
      return true;
    });

    if (candidateChunks.length === 0) {
      return [];
    }

    // Rerank chunks by relevance
    const texts = candidateChunks.map((c) => c.content);

    try {
      const rerankResponse = await rerank(query, texts, {
        model: options?.rerankModel ?? "rerank-english-v3.0",
        top_n: maxChunks * 2, // Get more than needed for filtering
        return_documents: false,
      });

      // Map back to chunks with scores
      const rankedChunks = rerankResponse.results
        .filter((r) => r.relevance_score >= minRelevance)
        .slice(0, maxChunks)
        .map((r) => ({
          ...candidateChunks[r.index],
          relevanceScore: r.relevance_score,
        }));

      // Apply recency weight if specified
      if (options?.recencyWeight && options.recencyWeight > 0) {
        return applyRecencyBias(rankedChunks, options.recencyWeight);
      }

      return rankedChunks;
    } catch (error) {
      // Fallback to simple keyword matching if rerank fails
      console.warn("Rerank failed, falling back to keyword matching:", error);
      return simpleKeywordMatch(query, candidateChunks, maxChunks);
    }
  }

  /**
   * Generate a response with citations
   */
  async generateWithCitations(
    query: string,
    chunks: CitedChunk[],
    generateFn: (context: string, query: string) => Promise<string>
  ): Promise<CitedResponse> {
    // Build context with source markers
    const context = buildContextWithMarkers(chunks);

    // Generate response
    const rawResponse = await generateFn(context, query);

    // Parse citations from response
    const { text, citations } = parseCitations(rawResponse, chunks);

    // Collect unique sources
    const usedSourceIds = new Set(citations.map((c) => c.source.id));
    const sources = chunks
      .map((c) => c.source)
      .filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i);

    // Calculate confidence
    const confidence = calculateConfidence(chunks, citations);

    // Detect conflicts
    const conflicts = detectConflicts(chunks);

    // Calculate metadata
    const avgRelevance = chunks.reduce((sum, c) => sum + (c.relevanceScore ?? 0), 0) / chunks.length;
    const avgCredibility = chunks.reduce((sum, c) => sum + c.source.credibilityScore, 0) / chunks.length;

    return {
      text,
      citations,
      sources,
      chunks,
      confidence,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      metadata: {
        totalChunksRetrieved: chunks.length,
        chunksUsed: usedSourceIds.size,
        avgRelevanceScore: Math.round(avgRelevance * 100) / 100,
        avgCredibilityScore: Math.round(avgCredibility),
        generatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Full RAG pipeline: retrieve + generate with citations
   */
  async query(
    query: string,
    generateFn: (context: string, query: string) => Promise<string>,
    options?: RetrievalOptions
  ): Promise<CitedResponse> {
    const chunks = await this.retrieve(query, options);

    if (chunks.length === 0) {
      return {
        text: "I couldn't find relevant information to answer your question.",
        citations: [],
        sources: [],
        chunks: [],
        confidence: {
          score: 0,
          level: "uncertain",
          factors: {
            sourceQuality: 0,
            sourceAgreement: 0,
            topicCoverage: 0,
            recency: 0,
          },
        },
        metadata: {
          totalChunksRetrieved: 0,
          chunksUsed: 0,
          avgRelevanceScore: 0,
          avgCredibilityScore: 0,
          generatedAt: new Date().toISOString(),
        },
      };
    }

    return this.generateWithCitations(query, chunks, generateFn);
  }

  /**
   * Get all sources
   */
  getSources(): CitedSource[] {
    return Array.from(this.sources.values());
  }

  /**
   * Get chunk count
   */
  getChunkCount(): number {
    return this.chunks.length;
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.chunks = [];
    this.sources.clear();
  }
}

// ─── Helper Functions ────────────────────────────────────────────────────────

function generateSourceId(source: Omit<CitedSource, "id" | "retrievedAt">): string {
  const base = `${source.type}-${source.title}`;
  const hash = base.split("").reduce((acc, char) => {
    return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
  }, 0);
  return `src-${Math.abs(hash).toString(36)}`;
}

function splitIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);

  let currentChunk = "";

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());

      // Keep overlap
      const words = currentChunk.split(/\s+/);
      const overlapWords = Math.floor(overlap / 5); // ~5 chars per word
      currentChunk = words.slice(-overlapWords).join(" ") + " " + sentence;
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

function buildContextWithMarkers(chunks: CitedChunk[]): string {
  return chunks
    .map((chunk, index) => {
      const sourceRef = `[${index + 1}]`;
      return `${sourceRef} ${chunk.content}\n(Source: ${chunk.source.title})`;
    })
    .join("\n\n");
}

function parseCitations(
  response: string,
  chunks: CitedChunk[]
): { text: string; citations: Citation[] } {
  const citations: Citation[] = [];
  const citationPattern = /\[(\d+)\]/g;

  let match;
  while ((match = citationPattern.exec(response)) !== null) {
    const index = parseInt(match[1], 10) - 1;
    if (index >= 0 && index < chunks.length) {
      citations.push({
        marker: match[0],
        sourceIndex: index,
        source: chunks[index].source,
        position: {
          start: match.index,
          end: match.index + match[0].length,
        },
      });
    }
  }

  return { text: response, citations };
}

function calculateConfidence(chunks: CitedChunk[], citations: Citation[]): ResponseConfidence {
  if (chunks.length === 0) {
    return {
      score: 0,
      level: "uncertain",
      factors: { sourceQuality: 0, sourceAgreement: 0, topicCoverage: 0, recency: 0 },
    };
  }

  // Source quality (credibility)
  const avgCredibility = chunks.reduce((sum, c) => sum + c.source.credibilityScore, 0) / chunks.length;
  const sourceQuality = avgCredibility / 100;

  // Source agreement (multiple sources saying similar things)
  const uniqueSources = new Set(chunks.map((c) => c.source.id)).size;
  const sourceAgreement = Math.min(uniqueSources / 3, 1); // Max at 3 sources

  // Topic coverage (relevance scores)
  const avgRelevance = chunks.reduce((sum, c) => sum + (c.relevanceScore ?? 0.5), 0) / chunks.length;
  const topicCoverage = avgRelevance;

  // Recency
  const now = new Date();
  const avgAge = chunks.reduce((sum, c) => {
    const published = c.source.publishedDate ? new Date(c.source.publishedDate) : now;
    const ageYears = (now.getTime() - published.getTime()) / (365 * 24 * 60 * 60 * 1000);
    return sum + Math.max(0, 1 - ageYears / 5); // Decay over 5 years
  }, 0) / chunks.length;
  const recency = avgAge;

  // Overall score
  const score = Math.round(
    (sourceQuality * 0.3 + sourceAgreement * 0.25 + topicCoverage * 0.3 + recency * 0.15) * 100
  );

  let level: ResponseConfidence["level"];
  if (score >= 75) level = "high";
  else if (score >= 50) level = "medium";
  else if (score >= 25) level = "low";
  else level = "uncertain";

  return {
    score,
    level,
    factors: {
      sourceQuality: Math.round(sourceQuality * 100),
      sourceAgreement: Math.round(sourceAgreement * 100),
      topicCoverage: Math.round(topicCoverage * 100),
      recency: Math.round(recency * 100),
    },
  };
}

function detectConflicts(chunks: CitedChunk[]): ConflictInfo[] {
  // Simple conflict detection based on contradictory keywords
  // In a real implementation, this would use semantic analysis
  const conflicts: ConflictInfo[] = [];

  // Group chunks by potential topics (simplified)
  // A more sophisticated version would use clustering

  return conflicts;
}

function applyRecencyBias(chunks: CitedChunk[], weight: number): CitedChunk[] {
  const now = new Date();

  return chunks
    .map((chunk) => {
      const published = chunk.source.publishedDate ? new Date(chunk.source.publishedDate) : now;
      const ageYears = (now.getTime() - published.getTime()) / (365 * 24 * 60 * 60 * 1000);
      const recencyBoost = Math.max(0, 1 - ageYears / 5) * weight;

      return {
        ...chunk,
        relevanceScore: (chunk.relevanceScore ?? 0) + recencyBoost,
      };
    })
    .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
}

function simpleKeywordMatch(query: string, chunks: CitedChunk[], maxChunks: number): CitedChunk[] {
  const queryWords = query.toLowerCase().split(/\s+/);

  return chunks
    .map((chunk) => {
      const contentLower = chunk.content.toLowerCase();
      const matchCount = queryWords.filter((word) => contentLower.includes(word)).length;
      const score = matchCount / queryWords.length;

      return { ...chunk, relevanceScore: score };
    })
    .filter((c) => c.relevanceScore > 0)
    .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
    .slice(0, maxChunks);
}

// ─── Credibility Assessment ─────────────────────────────────────────────────

/**
 * Assess credibility of a source based on domain
 */
export function assessCredibility(url: string): { score: number; tier: CredibilityTier } {
  try {
    const domain = new URL(url).hostname.toLowerCase();

    // Official sources
    if (domain.endsWith(".gov") || domain.endsWith(".gov.uk") || domain.endsWith(".europa.eu")) {
      return { score: 95, tier: "official" };
    }

    // Academic/Educational
    if (domain.endsWith(".edu") || domain.endsWith(".ac.uk") || domain.includes("university")) {
      return { score: 90, tier: "authoritative" };
    }

    // Major news organizations
    const majorNews = [
      "reuters.com", "apnews.com", "bbc.com", "bbc.co.uk", "nytimes.com",
      "wsj.com", "theguardian.com", "ft.com", "economist.com",
    ];
    if (majorNews.some((n) => domain.includes(n))) {
      return { score: 85, tier: "authoritative" };
    }

    // Industry authorities
    const industry = [
      "nih.gov", "cdc.gov", "who.int", "nature.com", "sciencedirect.com",
      "ieee.org", "acm.org", "arxiv.org",
    ];
    if (industry.some((i) => domain.includes(i))) {
      return { score: 90, tier: "authoritative" };
    }

    // Reliable sources
    const reliable = [
      "wikipedia.org", "britannica.com", "investopedia.com",
      "healthline.com", "webmd.com", "mayoclinic.org",
    ];
    if (reliable.some((r) => domain.includes(r))) {
      return { score: 70, tier: "reliable" };
    }

    // Community/User-generated
    const community = [
      "reddit.com", "quora.com", "stackoverflow.com", "medium.com",
      "substack.com", "wordpress.com", "blogspot.com",
    ];
    if (community.some((c) => domain.includes(c))) {
      return { score: 50, tier: "community" };
    }

    // Default: unverified
    return { score: 40, tier: "unverified" };
  } catch {
    return { score: 30, tier: "unverified" };
  }
}

/**
 * Format citations in a specific style
 */
export function formatCitations(
  citations: Citation[],
  style: CitationStyle = { markerStyle: "numeric", placement: "inline", includeUrls: true, includeAccessDates: true }
): string {
  if (citations.length === 0) return "";

  const uniqueSources = citations
    .map((c) => c.source)
    .filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i);

  return uniqueSources
    .map((source, index) => {
      let citation = "";

      if (style.markerStyle === "numeric") {
        citation = `[${index + 1}] `;
      } else if (style.markerStyle === "author_year") {
        const year = source.publishedDate ? new Date(source.publishedDate).getFullYear() : "n.d.";
        citation = `(${source.author ?? source.title}, ${year}) `;
      }

      citation += source.title;

      if (source.author) {
        citation += `. ${source.author}`;
      }

      if (source.publishedDate) {
        citation += `. ${new Date(source.publishedDate).toLocaleDateString()}`;
      }

      if (style.includeUrls && source.url) {
        citation += `. ${source.url}`;
      }

      if (style.includeAccessDates) {
        citation += `. Accessed ${new Date(source.retrievedAt).toLocaleDateString()}`;
      }

      return citation;
    })
    .join("\n");
}
