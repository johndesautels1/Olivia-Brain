/**
 * PII Detection and Redaction
 * Implements Presidio-style patterns for detecting and redacting PII
 */

export type PIIType =
  | "EMAIL"
  | "PHONE"
  | "SSN"
  | "CREDIT_CARD"
  | "IP_ADDRESS"
  | "DATE_OF_BIRTH"
  | "ADDRESS"
  | "NAME"
  | "PASSPORT"
  | "DRIVERS_LICENSE";

export interface PIIMatch {
  type: PIIType;
  value: string;
  start: number;
  end: number;
  confidence: number;
}

export interface RedactionResult {
  original: string;
  redacted: string;
  matches: PIIMatch[];
  redactionCount: number;
}

// PII detection patterns (Presidio-style)
const PII_PATTERNS: Record<PIIType, RegExp> = {
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
  PHONE: /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g,
  SSN: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
  CREDIT_CARD: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  IP_ADDRESS: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  DATE_OF_BIRTH: /\b(?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12]\d|3[01])[-/](?:19|20)\d{2}\b/g,
  ADDRESS: /\b\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct|circle|cir)\b[,.]?\s*(?:[a-z]+[,.]?\s*)?(?:[a-z]{2}\s*)?\d{5}(?:-\d{4})?\b/gi,
  NAME: /\b(?:Mr\.|Mrs\.|Ms\.|Dr\.)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g,
  PASSPORT: /\b[A-Z]{1,2}\d{6,9}\b/g,
  DRIVERS_LICENSE: /\b[A-Z]{1,2}\d{5,8}\b/g,
};

// Confidence scores for each pattern type
const PII_CONFIDENCE: Record<PIIType, number> = {
  EMAIL: 0.95,
  PHONE: 0.85,
  SSN: 0.95,
  CREDIT_CARD: 0.95,
  IP_ADDRESS: 0.80,
  DATE_OF_BIRTH: 0.70,
  ADDRESS: 0.75,
  NAME: 0.60,
  PASSPORT: 0.80,
  DRIVERS_LICENSE: 0.75,
};

// Redaction placeholders
const REDACTION_PLACEHOLDERS: Record<PIIType, string> = {
  EMAIL: "[EMAIL REDACTED]",
  PHONE: "[PHONE REDACTED]",
  SSN: "[SSN REDACTED]",
  CREDIT_CARD: "[CARD REDACTED]",
  IP_ADDRESS: "[IP REDACTED]",
  DATE_OF_BIRTH: "[DOB REDACTED]",
  ADDRESS: "[ADDRESS REDACTED]",
  NAME: "[NAME REDACTED]",
  PASSPORT: "[PASSPORT REDACTED]",
  DRIVERS_LICENSE: "[LICENSE REDACTED]",
};

export interface PIIRedactorConfig {
  enabledTypes?: PIIType[];
  minimumConfidence?: number;
  preservePartial?: boolean; // Keep last 4 digits for some types
}

const DEFAULT_CONFIG: PIIRedactorConfig = {
  enabledTypes: ["EMAIL", "PHONE", "SSN", "CREDIT_CARD"],
  minimumConfidence: 0.7,
  preservePartial: false,
};

export function detectPII(
  text: string,
  config: PIIRedactorConfig = DEFAULT_CONFIG
): PIIMatch[] {
  const matches: PIIMatch[] = [];
  const enabledTypes = config.enabledTypes ?? DEFAULT_CONFIG.enabledTypes!;
  const minConfidence = config.minimumConfidence ?? DEFAULT_CONFIG.minimumConfidence!;

  for (const type of enabledTypes) {
    const pattern = PII_PATTERNS[type];
    const confidence = PII_CONFIDENCE[type];

    if (confidence < minConfidence) {
      continue;
    }

    let match;
    // Reset regex state
    pattern.lastIndex = 0;

    while ((match = pattern.exec(text)) !== null) {
      matches.push({
        type,
        value: match[0],
        start: match.index,
        end: match.index + match[0].length,
        confidence,
      });
    }
  }

  // Sort by position
  return matches.sort((a, b) => a.start - b.start);
}

export function redactPII(
  text: string,
  config: PIIRedactorConfig = DEFAULT_CONFIG
): RedactionResult {
  const matches = detectPII(text, config);

  if (matches.length === 0) {
    return {
      original: text,
      redacted: text,
      matches: [],
      redactionCount: 0,
    };
  }

  let redacted = text;
  let offset = 0;

  for (const match of matches) {
    const placeholder = config.preservePartial && match.value.length > 4
      ? `${REDACTION_PLACEHOLDERS[match.type].slice(0, -1)}...${match.value.slice(-4)}]`
      : REDACTION_PLACEHOLDERS[match.type];

    const start = match.start + offset;
    const end = match.end + offset;

    redacted = redacted.slice(0, start) + placeholder + redacted.slice(end);
    offset += placeholder.length - match.value.length;
  }

  return {
    original: text,
    redacted,
    matches,
    redactionCount: matches.length,
  };
}

export function redactBeforeLogging<T extends Record<string, unknown>>(
  data: T,
  fieldsToRedact: string[] = ["message", "content", "text", "body", "input", "output"]
): T {
  const result = { ...data };

  for (const field of fieldsToRedact) {
    if (typeof result[field] === "string") {
      const redactionResult = redactPII(result[field] as string);
      (result as Record<string, unknown>)[field] = redactionResult.redacted;
    }
  }

  return result;
}

// Singleton service
export interface PIIRedactorService {
  detect(text: string): PIIMatch[];
  redact(text: string): RedactionResult;
  redactObject<T extends Record<string, unknown>>(obj: T, fields?: string[]): T;
}

class PIIRedactorServiceImpl implements PIIRedactorService {
  private config: PIIRedactorConfig;

  constructor(config?: PIIRedactorConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  detect(text: string): PIIMatch[] {
    return detectPII(text, this.config);
  }

  redact(text: string): RedactionResult {
    return redactPII(text, this.config);
  }

  redactObject<T extends Record<string, unknown>>(obj: T, fields?: string[]): T {
    return redactBeforeLogging(obj, fields);
  }
}

let piiRedactorService: PIIRedactorService | undefined;

export function getPIIRedactorService(config?: PIIRedactorConfig): PIIRedactorService {
  if (!piiRedactorService) {
    piiRedactorService = new PIIRedactorServiceImpl(config);
  }
  return piiRedactorService;
}
