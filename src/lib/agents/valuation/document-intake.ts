import { randomUUID } from 'crypto';
import type { DocumentChunk, DocumentType, IntakeResult } from '@/lib/valuation/types';

// ═══════════════════════════════════════════════════════════════════════
// DOCUMENT INTAKE AGENT
// ═══════════════════════════════════════════════════════════════════════
//
// Purpose: Parse uploaded documents into structured markdown, chunk into
// sections with page/slide references, and prepare for embedding storage.
//
// Supports: PDF, PPTX, DOCX, CSV, XLSX
// Output: IntakeResult with DocumentChunk[] ready for embedding + DB storage
//
// NOTE: Actual file parsing (pdf-parse, mammoth, etc.) requires runtime
// dependencies. This agent defines the chunking/structuring logic and
// delegates raw parsing to pluggable parsers. In production, wire up
// Supabase Storage download + parser libraries.
// ═══════════════════════════════════════════════════════════════════════

/** Configuration for chunking behaviour */
const CHUNK_CONFIG = {
  maxChunkTokens: 512,
  overlapTokens: 64,
  approxCharsPerToken: 4,
} as const;

/** Rough token count from character length */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHUNK_CONFIG.approxCharsPerToken);
}

/** Detect document type from filename extension */
export function detectDocumentType(filename: string): DocumentType {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'pdf': return 'pdf';
    case 'pptx': case 'ppt': return 'pptx';
    case 'docx': case 'doc': return 'docx';
    case 'csv': return 'csv';
    case 'xlsx': case 'xls': return 'xlsx';
    default: return 'other';
  }
}

/**
 * Split a page/section of text into chunks respecting token limits.
 * Uses paragraph boundaries when possible, falls back to sentence splits.
 */
function chunkText(
  text: string,
  maxTokens: number = CHUNK_CONFIG.maxChunkTokens
): string[] {
  const maxChars = maxTokens * CHUNK_CONFIG.approxCharsPerToken;
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  const paragraphs = text.split(/\n\s*\n/);
  let current = '';

  for (const para of paragraphs) {
    if (current.length + para.length + 2 > maxChars) {
      if (current.length > 0) {
        chunks.push(current.trim());
        // Keep overlap from end of current chunk
        const overlapChars = CHUNK_CONFIG.overlapTokens * CHUNK_CONFIG.approxCharsPerToken;
        current = current.slice(-overlapChars) + '\n\n' + para;
      } else {
        // Single paragraph exceeds max — split by sentences
        const sentences = para.match(/[^.!?]+[.!?]+/g) ?? [para];
        for (const sentence of sentences) {
          if (current.length + sentence.length > maxChars && current.length > 0) {
            chunks.push(current.trim());
            const overlapChars = CHUNK_CONFIG.overlapTokens * CHUNK_CONFIG.approxCharsPerToken;
            current = current.slice(-overlapChars) + ' ' + sentence;
          } else {
            current += (current ? ' ' : '') + sentence;
          }
        }
      }
    } else {
      current += (current ? '\n\n' : '') + para;
    }
  }

  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }

  return chunks;
}

/** Extract a section title from the first line of a chunk if it looks like a heading */
function extractSectionTitle(text: string): string | null {
  const firstLine = text.split('\n')[0]?.trim() ?? '';
  // Markdown heading or ALL CAPS short line
  if (/^#{1,4}\s+/.test(firstLine)) {
    return firstLine.replace(/^#+\s*/, '');
  }
  if (firstLine.length < 80 && firstLine === firstLine.toUpperCase() && firstLine.length > 3) {
    return firstLine;
  }
  return null;
}

// ── Page-aware input structure ───────────────────────────────────────

export type ParsedPage = {
  pageNumber: number;
  content: string;
};

export type ParsedDocument = {
  filename: string;
  pages: ParsedPage[];
  metadata?: Record<string, string>;
  /** URL to the original source (web article, external document, etc.) — null for uploaded files */
  sourceUrl?: string;
};

// ── Main intake function ─────────────────────────────────────────────

/**
 * DocumentIntakeAgent: Transform a parsed document into chunked, structured
 * DocumentChunk records ready for embedding generation and DB storage.
 *
 * @param parsed - Pre-parsed document (pages of text). In production, call
 *   a parser (pdf-parse, mammoth, csv-parse) before passing here.
 * @param companyId - The company this document belongs to.
 * @param documentId - Optional pre-assigned document ID (auto-generated if omitted).
 * @returns IntakeResult with all chunks.
 */
export function runDocumentIntake(
  parsed: ParsedDocument,
  companyId: string,
  documentId?: string,
): IntakeResult {
  const docId = documentId ?? randomUUID();
  const docType = detectDocumentType(parsed.filename);
  const warnings: string[] = [];
  const allChunks: DocumentChunk[] = [];
  let chunkIndex = 0;

  if (parsed.pages.length === 0) {
    warnings.push('Document has no extractable pages/content');
  }

  for (const page of parsed.pages) {
    if (!page.content.trim()) {
      warnings.push(`Page ${page.pageNumber} is empty or contains no extractable text`);
      continue;
    }

    const textChunks = chunkText(page.content);

    for (const chunkText of textChunks) {
      const chunk: DocumentChunk = {
        chunkId: randomUUID(),
        documentId: docId,
        documentName: parsed.filename,
        companyId,
        content: chunkText,
        pageOrSlide: page.pageNumber,
        sectionTitle: extractSectionTitle(chunkText),
        chunkIndex,
        tokenCount: estimateTokens(chunkText),
        embedding: null, // Populated by embedding step
        sourceUrl: parsed.sourceUrl ?? null,
      };
      allChunks.push(chunk);
      chunkIndex++;
    }
  }

  // Warn if document is very short
  if (allChunks.length === 1 && allChunks[0].tokenCount < 50) {
    warnings.push('Document appears to have very little content — extraction quality may be low');
  }

  // Warn if document is very large
  if (allChunks.length > 200) {
    warnings.push(`Document produced ${allChunks.length} chunks — consider splitting into separate documents`);
  }

  return {
    documentId: docId,
    documentName: parsed.filename,
    documentType: docType,
    companyId,
    chunks: allChunks,
    totalPages: parsed.pages.length,
    totalChunks: allChunks.length,
    warnings,
  };
}

// ── Embedding placeholder ────────────────────────────────────────────

/**
 * Generate embeddings for all chunks in an IntakeResult.
 * In production, this calls Claude or OpenAI embedding API.
 * Returns the same IntakeResult with embeddings populated.
 *
 * @param intake - Result from runDocumentIntake
 * @param embedFn - Async function that takes text and returns embedding vector
 */
export async function attachEmbeddings(
  intake: IntakeResult,
  embedFn: (text: string) => Promise<number[]>,
): Promise<IntakeResult> {
  const chunksWithEmbeddings: DocumentChunk[] = [];

  for (const chunk of intake.chunks) {
    const embedding = await embedFn(chunk.content);
    chunksWithEmbeddings.push({ ...chunk, embedding });
  }

  return {
    ...intake,
    chunks: chunksWithEmbeddings,
  };
}

// ── CSV / tabular helper ─────────────────────────────────────────────

/**
 * Convert CSV text into a single ParsedDocument.
 * Each logical group of rows becomes a "page" for chunking purposes.
 */
export function csvToParsedDocument(
  filename: string,
  csvText: string,
  rowsPerPage: number = 50,
): ParsedDocument {
  const lines = csvText.split('\n');
  const header = lines[0] ?? '';
  const dataLines = lines.slice(1).filter(l => l.trim());
  const pages: ParsedPage[] = [];

  for (let i = 0; i < dataLines.length; i += rowsPerPage) {
    const pageRows = dataLines.slice(i, i + rowsPerPage);
    pages.push({
      pageNumber: Math.floor(i / rowsPerPage) + 1,
      content: header + '\n' + pageRows.join('\n'),
    });
  }

  return { filename, pages };
}
