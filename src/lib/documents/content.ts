export type DocumentContentKind =
  | "empty"
  | "external_link"
  | "stored_file"
  | "block_json"
  | "rich_text";

export interface ResolveDocumentContentInput {
  formatType?: string | null;
  contentSourceType?: string | null;
  storagePathOrBody?: string | null;
}

export interface ResolveDocumentStudioAccessInput extends ResolveDocumentContentInput {
  isTemplate?: boolean | null;
  ownerUserId?: string | null;
  currentUserId?: string | null;
}

export interface ResolvedDocumentContent {
  kind: DocumentContentKind;
  content: string;
  formatType: string | null;
  contentSourceType: string | null;
  externalUrl: string | null;
  storagePath: string | null;
  isLegacyFallback: boolean;
}

export type DocumentStudioBlockedReason =
  | "not_structured_content"
  | "not_editable_document";

export interface ResolvedDocumentStudioAccess {
  canOpen: boolean;
  reason: DocumentStudioBlockedReason | null;
  content: ResolvedDocumentContent;
}

const STORED_FILE_FORMATS = new Set(["docx", "pptx", "pdf", "spreadsheet"]);

export function isBlockJsonDocumentContent(content: string | null | undefined): boolean {
  if (!content) return false;

  const trimmed = content.trim();
  if (!trimmed.startsWith("{")) return false;

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed?.blocks);
  } catch {
    return false;
  }
}

export function parseSingleLineHttpUrl(content: string | null | undefined): URL | null {
  if (!content) return null;

  const trimmed = content.trim();
  if (!trimmed || trimmed.includes("\n")) return null;

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export function resolveDocumentContent(input: ResolveDocumentContentInput): ResolvedDocumentContent {
  const content = input.storagePathOrBody ?? "";
  const trimmed = content.trim();
  const formatType = input.formatType ?? null;
  const contentSourceType = input.contentSourceType ?? null;

  if (!trimmed) {
    return {
      kind: "empty",
      content,
      formatType,
      contentSourceType,
      externalUrl: null,
      storagePath: null,
      isLegacyFallback: false,
    };
  }

  if (contentSourceType === "external_link") {
    return {
      kind: "external_link",
      content,
      formatType,
      contentSourceType,
      externalUrl: parseSingleLineHttpUrl(trimmed)?.toString() ?? null,
      storagePath: null,
      isLegacyFallback: false,
    };
  }

  if (contentSourceType === "stored_file") {
    return {
      kind: "stored_file",
      content,
      formatType,
      contentSourceType,
      externalUrl: null,
      storagePath: trimmed,
      isLegacyFallback: false,
    };
  }

  if (formatType === "block_json") {
    return {
      kind: "block_json",
      content,
      formatType,
      contentSourceType,
      externalUrl: null,
      storagePath: null,
      isLegacyFallback: false,
    };
  }

  if (formatType === "link") {
    return {
      kind: "external_link",
      content,
      formatType,
      contentSourceType,
      externalUrl: parseSingleLineHttpUrl(trimmed)?.toString() ?? null,
      storagePath: null,
      isLegacyFallback: true,
    };
  }

  if (formatType && STORED_FILE_FORMATS.has(formatType)) {
    return {
      kind: "stored_file",
      content,
      formatType,
      contentSourceType,
      externalUrl: null,
      storagePath: trimmed,
      isLegacyFallback: true,
    };
  }

  if (isBlockJsonDocumentContent(trimmed)) {
    return {
      kind: "block_json",
      content,
      formatType,
      contentSourceType,
      externalUrl: null,
      storagePath: null,
      isLegacyFallback: true,
    };
  }

  const legacyUrl = parseSingleLineHttpUrl(trimmed);
  if (legacyUrl) {
    return {
      kind: "external_link",
      content,
      formatType,
      contentSourceType,
      externalUrl: legacyUrl.toString(),
      storagePath: null,
      isLegacyFallback: true,
    };
  }

  return {
    kind: "rich_text",
    content,
    formatType,
    contentSourceType,
    externalUrl: null,
    storagePath: null,
    isLegacyFallback: false,
  };
}

export function resolveDocumentStudioAccess(
  input: ResolveDocumentStudioAccessInput,
): ResolvedDocumentStudioAccess {
  const content = resolveDocumentContent(input);
  const isPublicTemplate = input.isTemplate === true && !input.ownerUserId;
  const isOwnedByCurrentUser = Boolean(input.currentUserId && input.ownerUserId === input.currentUserId);
  const canEditOrFork = isPublicTemplate || isOwnedByCurrentUser;

  if (content.kind !== "block_json") {
    return {
      canOpen: false,
      reason: "not_structured_content",
      content,
    };
  }

  if (!canEditOrFork) {
    return {
      canOpen: false,
      reason: "not_editable_document",
      content,
    };
  }

  return {
    canOpen: true,
    reason: null,
    content,
  };
}

export function canOpenDocumentStudio(input: ResolveDocumentStudioAccessInput): boolean {
  return resolveDocumentStudioAccess(input).canOpen;
}

export function getDocumentExternalHostname(url: string | null | undefined): string {
  if (!url) return "external source";

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "external source";
  }
}

export function getDocumentStorageUrl(
  storagePath: string | null | undefined,
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
): string | null {
  if (!storagePath || !supabaseUrl) return null;

  const cleanBase = supabaseUrl.replace(/\/$/, "");
  const cleanPath = storagePath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `${cleanBase}/storage/v1/object/public/document-uploads/${cleanPath}`;
}

export function getDocumentFormatLabel(formatType: string | null | undefined): string {
  if (!formatType) return "Document";

  return formatType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
