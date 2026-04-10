/**
 * Unstructured.io API Adapter
 *
 * Free tier: 1,000 pages/month
 * Paid: Pay-as-you-go starting at $0.01/page
 * Docs: https://unstructured-io.github.io/unstructured/api.html
 *
 * Used for: Document parsing (PDFs, Word, HTML, images) for RAG ingestion
 * Coverage: Global
 *
 * Supported formats:
 * - PDF, DOCX, DOC, PPTX, PPT, XLSX, XLS
 * - HTML, XML, JSON, CSV, TSV
 * - TXT, RTF, MD, RST, ORG
 * - PNG, JPG, JPEG, TIFF, BMP, HEIC (with OCR)
 * - EML, MSG (emails)
 * - EPUB
 */

import { getServerEnv } from "@/lib/config/env";

const DEFAULT_TIMEOUT_MS = 120_000; // Long timeout for document processing
const UNSTRUCTURED_API_BASE = "https://api.unstructured.io/general/v0";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ElementType =
  | "Title"
  | "NarrativeText"
  | "ListItem"
  | "Table"
  | "Image"
  | "Header"
  | "Footer"
  | "PageBreak"
  | "Formula"
  | "FigureCaption"
  | "Address"
  | "EmailAddress"
  | "CodeSnippet"
  | "PageNumber"
  | "UncategorizedText";

export type Strategy = "auto" | "fast" | "hi_res" | "ocr_only";

export interface DocumentElement {
  type: ElementType;
  element_id: string;
  text: string;
  metadata: {
    filename?: string;
    filetype?: string;
    page_number?: number;
    languages?: string[];
    coordinates?: {
      points: [number, number][];
      system: string;
      layout_width: number;
      layout_height: number;
    };
    parent_id?: string;
    category_depth?: number;
    emphasized_text_contents?: string[];
    emphasized_text_tags?: string[];
    text_as_html?: string;
    link_urls?: string[];
    link_texts?: string[];
    sent_from?: string[];
    sent_to?: string[];
    subject?: string;
    detection_class_prob?: number;
  };
}

export interface PartitionOptions {
  strategy?: Strategy;
  hi_res_model_name?: string;
  languages?: string[];
  pdf_infer_table_structure?: boolean;
  skip_infer_table_types?: string[];
  include_page_breaks?: boolean;
  encoding?: string;
  ocr_languages?: string[];
  extract_image_block_types?: string[];
  extract_image_block_to_payload?: boolean;
  chunking_strategy?: "basic" | "by_title";
  max_characters?: number;
  new_after_n_chars?: number;
  combine_text_under_n_chars?: number;
  multipage_sections?: boolean;
  coordinates?: boolean;
  xml_keep_tags?: boolean;
}

export interface ChunkingOptions {
  strategy: "basic" | "by_title";
  max_characters?: number;
  new_after_n_chars?: number;
  combine_text_under_n_chars?: number;
  overlap?: number;
  overlap_all?: boolean;
  multipage_sections?: boolean;
}

export interface PartitionResult {
  elements: DocumentElement[];
  metadata: {
    filename: string;
    filetype: string;
    pageCount?: number;
    languages?: string[];
    processingTime?: number;
  };
}

export class UnstructuredAdapterError extends Error {
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
    this.name = "UnstructuredAdapterError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

// ─── Configuration ───────────────────────────────────────────────────────────

function getUnstructuredConfig() {
  const env = getServerEnv();
  return {
    apiKey: env.UNSTRUCTURED_API_KEY,
  };
}

export function isUnstructuredConfigured(): boolean {
  const { apiKey } = getUnstructuredConfig();
  return Boolean(apiKey);
}

function assertConfigured() {
  const { apiKey } = getUnstructuredConfig();
  if (!apiKey) {
    throw new UnstructuredAdapterError({
      code: "UNSTRUCTURED_NOT_CONFIGURED",
      message: "Unstructured API key must be configured.",
      status: 503,
    });
  }
  return { apiKey };
}

// ─── Core Request Function ───────────────────────────────────────────────────

async function partitionDocument(
  file: File | Blob,
  filename: string,
  options: PartitionOptions = {}
): Promise<DocumentElement[]> {
  const { apiKey } = assertConfigured();

  const formData = new FormData();
  formData.append("files", file, filename);

  // Add options to form data
  if (options.strategy) formData.append("strategy", options.strategy);
  if (options.hi_res_model_name) formData.append("hi_res_model_name", options.hi_res_model_name);
  if (options.languages) formData.append("languages", options.languages.join(","));
  if (options.pdf_infer_table_structure !== undefined) {
    formData.append("pdf_infer_table_structure", String(options.pdf_infer_table_structure));
  }
  if (options.include_page_breaks !== undefined) {
    formData.append("include_page_breaks", String(options.include_page_breaks));
  }
  if (options.coordinates !== undefined) {
    formData.append("coordinates", String(options.coordinates));
  }
  if (options.chunking_strategy) {
    formData.append("chunking_strategy", options.chunking_strategy);
  }
  if (options.max_characters) {
    formData.append("max_characters", String(options.max_characters));
  }
  if (options.new_after_n_chars) {
    formData.append("new_after_n_chars", String(options.new_after_n_chars));
  }
  if (options.combine_text_under_n_chars) {
    formData.append("combine_text_under_n_chars", String(options.combine_text_under_n_chars));
  }
  if (options.ocr_languages) {
    formData.append("ocr_languages", options.ocr_languages.join(","));
  }

  const response = await fetch(`${UNSTRUCTURED_API_BASE}/partition`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "unstructured-api-key": apiKey,
    },
    body: formData,
    signal: AbortSignal.timeout(options.encoding ? 180_000 : DEFAULT_TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new UnstructuredAdapterError({
      code: "UNSTRUCTURED_REQUEST_FAILED",
      message: `Unstructured API request failed: ${errorText}`,
      status: response.status,
      retryable: response.status >= 500 || response.status === 429,
    });
  }

  return response.json() as Promise<DocumentElement[]>;
}

// ─── Public API Functions ────────────────────────────────────────────────────

/**
 * Parse a document file into structured elements
 */
export async function parseDocument(
  file: File | Blob,
  filename: string,
  options?: PartitionOptions
): Promise<PartitionResult> {
  const startTime = Date.now();

  const elements = await partitionDocument(file, filename, {
    strategy: "auto",
    pdf_infer_table_structure: true,
    include_page_breaks: true,
    ...options,
  });

  // Extract metadata from elements
  const pageNumbers = elements
    .map((e) => e.metadata.page_number)
    .filter((p): p is number => p !== undefined);

  const pageCount = pageNumbers.length > 0 ? Math.max(...pageNumbers) : undefined;

  const languages = [
    ...new Set(
      elements
        .flatMap((e) => e.metadata.languages ?? [])
        .filter(Boolean)
    ),
  ];

  const filetype = elements[0]?.metadata.filetype ?? getFileType(filename);

  return {
    elements,
    metadata: {
      filename,
      filetype,
      pageCount,
      languages: languages.length > 0 ? languages : undefined,
      processingTime: Date.now() - startTime,
    },
  };
}

/**
 * Parse a document from a URL
 */
export async function parseDocumentFromUrl(
  url: string,
  options?: PartitionOptions
): Promise<PartitionResult> {
  // Fetch the document
  const response = await fetch(url, {
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new UnstructuredAdapterError({
      code: "UNSTRUCTURED_FETCH_FAILED",
      message: `Failed to fetch document from URL: ${response.status}`,
      status: response.status,
    });
  }

  const blob = await response.blob();
  const filename = url.split("/").pop() ?? "document";

  return parseDocument(blob, filename, options);
}

/**
 * Parse a document from base64 string
 */
export async function parseDocumentFromBase64(
  base64: string,
  filename: string,
  mimeType: string,
  options?: PartitionOptions
): Promise<PartitionResult> {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });

  return parseDocument(blob, filename, options);
}

// ─── Convenience Functions ───────────────────────────────────────────────────

/**
 * Parse document and return as plain text for RAG
 */
export async function parseToText(
  file: File | Blob,
  filename: string
): Promise<{
  text: string;
  pageCount?: number;
  wordCount: number;
  filename: string;
  filetype: string;
}> {
  const result = await parseDocument(file, filename, {
    strategy: "auto",
    include_page_breaks: false,
  });

  const text = result.elements
    .filter((e) => e.text && e.type !== "PageBreak")
    .map((e) => e.text)
    .join("\n\n");

  return {
    text,
    pageCount: result.metadata.pageCount,
    wordCount: text.split(/\s+/).length,
    filename: result.metadata.filename,
    filetype: result.metadata.filetype,
  };
}

/**
 * Parse document into chunks for RAG ingestion
 */
export async function parseToChunks(
  file: File | Blob,
  filename: string,
  options?: {
    maxChunkSize?: number;
    chunkOverlap?: number;
    byTitle?: boolean;
  }
): Promise<{
  chunks: {
    text: string;
    pageNumber?: number;
    elementType: ElementType;
    index: number;
  }[];
  metadata: PartitionResult["metadata"];
}> {
  const result = await parseDocument(file, filename, {
    strategy: "auto",
    chunking_strategy: options?.byTitle ? "by_title" : "basic",
    max_characters: options?.maxChunkSize ?? 1000,
    new_after_n_chars: options?.maxChunkSize ? Math.floor(options.maxChunkSize * 0.8) : 800,
    combine_text_under_n_chars: 100,
  });

  const chunks = result.elements
    .filter((e) => e.text && e.type !== "PageBreak")
    .map((e, index) => ({
      text: e.text,
      pageNumber: e.metadata.page_number,
      elementType: e.type,
      index,
    }));

  return {
    chunks,
    metadata: result.metadata,
  };
}

/**
 * Extract tables from a document
 */
export async function extractTables(
  file: File | Blob,
  filename: string
): Promise<{
  tables: {
    html: string;
    text: string;
    pageNumber?: number;
  }[];
  tableCount: number;
}> {
  const result = await parseDocument(file, filename, {
    strategy: "hi_res",
    pdf_infer_table_structure: true,
  });

  const tables = result.elements
    .filter((e) => e.type === "Table")
    .map((e) => ({
      html: e.metadata.text_as_html ?? "",
      text: e.text,
      pageNumber: e.metadata.page_number,
    }));

  return {
    tables,
    tableCount: tables.length,
  };
}

/**
 * Extract text with OCR from images
 */
export async function extractTextFromImage(
  file: File | Blob,
  filename: string,
  languages?: string[]
): Promise<{
  text: string;
  confidence?: number;
  wordCount: number;
}> {
  const result = await parseDocument(file, filename, {
    strategy: "ocr_only",
    ocr_languages: languages ?? ["eng"],
  });

  const text = result.elements
    .filter((e) => e.text)
    .map((e) => e.text)
    .join("\n");

  const avgConfidence = result.elements
    .map((e) => e.metadata.detection_class_prob)
    .filter((p): p is number => p !== undefined);

  return {
    text,
    confidence: avgConfidence.length > 0
      ? avgConfidence.reduce((a, b) => a + b, 0) / avgConfidence.length
      : undefined,
    wordCount: text.split(/\s+/).length,
  };
}

/**
 * Parse email file (EML, MSG)
 */
export async function parseEmail(
  file: File | Blob,
  filename: string
): Promise<{
  from: string[];
  to: string[];
  subject?: string;
  body: string;
  attachments: string[];
}> {
  const result = await parseDocument(file, filename);

  const emailElements = result.elements;

  // Extract email metadata
  const from = emailElements
    .flatMap((e) => e.metadata.sent_from ?? [])
    .filter(Boolean);

  const to = emailElements
    .flatMap((e) => e.metadata.sent_to ?? [])
    .filter(Boolean);

  const subject = emailElements
    .find((e) => e.metadata.subject)?.metadata.subject;

  const body = emailElements
    .filter((e) => e.type === "NarrativeText" || e.type === "ListItem")
    .map((e) => e.text)
    .join("\n");

  const attachments = emailElements
    .filter((e) => e.metadata.filename && e.metadata.filename !== filename)
    .map((e) => e.metadata.filename!)
    .filter((v, i, a) => a.indexOf(v) === i);

  return { from, to, subject, body, attachments };
}

// ─── Utility Functions ───────────────────────────────────────────────────────

function getFileType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ppt: "application/vnd.ms-powerpoint",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xls: "application/vnd.ms-excel",
    html: "text/html",
    htm: "text/html",
    txt: "text/plain",
    md: "text/markdown",
    json: "application/json",
    xml: "application/xml",
    csv: "text/csv",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    tiff: "image/tiff",
    eml: "message/rfc822",
    msg: "application/vnd.ms-outlook",
    epub: "application/epub+zip",
  };
  return mimeTypes[ext ?? ""] ?? "application/octet-stream";
}

/**
 * Supported file extensions
 */
export const SUPPORTED_EXTENSIONS = [
  // Documents
  "pdf", "docx", "doc", "pptx", "ppt", "xlsx", "xls",
  // Web/Text
  "html", "htm", "xml", "json", "csv", "tsv", "txt", "rtf", "md", "rst", "org",
  // Images (OCR)
  "png", "jpg", "jpeg", "tiff", "bmp", "heic",
  // Email
  "eml", "msg",
  // eBook
  "epub",
] as const;

export type SupportedExtension = typeof SUPPORTED_EXTENSIONS[number];

export function isSupportedFile(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(ext as SupportedExtension);
}
