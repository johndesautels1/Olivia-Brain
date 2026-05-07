import type {
  CompanyValuationInput,
  DocumentChunk,
  EvidenceRef,
  ExtractedValuationInput,
  ExtractionNote,
  MetricEvidence,
  MissingItem,
} from '@/lib/valuation/types';

// ═══════════════════════════════════════════════════════════════════════
// FINANCIAL EXTRACTOR AGENT
// ═══════════════════════════════════════════════════════════════════════
//
// Purpose: Extract typed financial metrics from document chunks using
// Claude Sonnet API with structured output.
//
// Principle: LLM does NOT do arithmetic — extraction only.
// For every metric, preserve evidence references (documentId, page, quote, confidence).
//
// The LLM returns a flat JSON of extracted fields. This agent maps them
// into CompanyValuationInput with full MetricEvidence provenance.
// ═══════════════════════════════════════════════════════════════════════

const EXTRACTION_MODEL = 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `You are an extraction engine for private-company valuation. Your job is to extract financial metrics from document text.

RULES:
1. Return ONLY fields that are explicitly stated or directly calculable from the provided text.
2. Do NOT invent, estimate, or infer missing numbers. If data is not present, return null.
3. For every metric you extract, provide:
   - value: the numeric value (in GBP unless stated otherwise)
   - pageOrSlide: the page/slide number where you found it
   - quote: the exact text snippet that contains or supports this number
   - confidence: your confidence that this extraction is correct (0.0 to 1.0)
4. Prefer conservative extraction when there is ambiguity.
5. Convert all currency values to GBP. If the source uses USD/EUR, note the conversion in extractionNotes.
6. Percentages should be stored as numbers (e.g., 25% → 25, not 0.25).
7. For fields you cannot find, add them to missingItems with importance and reason.

Return your response as a JSON object matching the ExtractionSchema exactly.`;

// ── Extraction response schema (what the LLM returns) ────────────────

export type ExtractedField = {
  value: number | null;
  pageOrSlide: number | null;
  quote: string | null;
  confidence: number;
};

export type LLMExtractionResponse = {
  companyName: string | null;
  sector: string | null;
  subsector: string | null;
  stage: string | null;
  businessModel: string | null;
  geography: string | null;

  // Core financials
  annualRevenue: ExtractedField;
  arr: ExtractedField;
  grossMarginPct: ExtractedField;
  ebitda: ExtractedField;
  ebitdaMarginPct: ExtractedField;
  burnMonthly: ExtractedField;
  runwayMonths: ExtractedField;
  growthYoYPct: ExtractedField;
  netRevenueRetentionPct: ExtractedField;
  churnPct: ExtractedField;
  customerConcentrationTop3Pct: ExtractedField;
  cacPaybackMonths: ExtractedField;
  ltvToCac: ExtractedField;
  burnMultiple: ExtractedField;

  // Cap structure
  cashOnHand: ExtractedField;
  debt: ExtractedField;
  fullyDilutedShares: ExtractedField;
  optionPoolPct: ExtractedField;

  // Market
  tam: ExtractedField;
  sam: ExtractedField;
  som: ExtractedField;
  marketGrowthPct: ExtractedField;

  // Funding
  capitalRaisedToDate: ExtractedField;
  lastRoundPreMoney: ExtractedField;
  lastRoundPostMoney: ExtractedField;

  // IP / build cost
  capitalizedBuildCost: ExtractedField;
  replacementCost: ExtractedField;
  patentsCount: ExtractedField;

  // Extraction metadata
  extractionNotes: { field: string; note: string; severity: 'info' | 'warning' | 'error' }[];
  missingItems: { field: string; importance: 'critical' | 'high' | 'medium' | 'low'; reason: string }[];
  warnings: string[];
};

// ── LLM call abstraction ─────────────────────────────────────────────

/**
 * Type for the LLM call function. In production, wire this to the
 * Anthropic SDK or the existing cascade provider.
 */
export type LLMCallFn = (params: {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
}) => Promise<string>;

// ── Field mapping helpers ────────────────────────────────────────────

/** Safe default when LLM omits a field entirely from its JSON response */
const EMPTY_FIELD: ExtractedField = { value: null, pageOrSlide: null, quote: null, confidence: 0 };

/** Safely coerce an LLM-returned field — returns EMPTY_FIELD if undefined/null */
function safeField(field: ExtractedField | undefined | null): ExtractedField {
  if (!field || typeof field !== 'object') return EMPTY_FIELD;
  return {
    value: field.value ?? null,
    pageOrSlide: field.pageOrSlide ?? null,
    quote: field.quote ?? null,
    confidence: typeof field.confidence === 'number' ? field.confidence : 0,
  };
}

/** Map an ExtractedField to MetricEvidence with provenance */
function toMetricEvidence(
  field: ExtractedField | undefined | null,
  documentId: string,
  documentName: string,
): MetricEvidence {
  const f = safeField(field);
  return {
    value: f.value,
    confidence: f.confidence,
    refs: f.value !== null
      ? [{
          documentId,
          documentName,
          evidenceType: 'other' as const,
          pageOrSlide: f.pageOrSlide,
          quote: f.quote ?? undefined,
          confidence: f.confidence,
        }]
      : [],
  };
}

/** Build an EvidenceRef from an ExtractedField */
function toEvidenceRef(
  field: ExtractedField | undefined | null,
  documentId: string,
  documentName: string,
): EvidenceRef | null {
  const f = safeField(field);
  if (f.value === null) return null;
  return {
    documentId,
    documentName,
    evidenceType: 'other',
    pageOrSlide: f.pageOrSlide,
    quote: f.quote ?? undefined,
    confidence: f.confidence,
  };
}

// ── Critical fields for missing-item detection ───────────────────────

const CRITICAL_FIELDS: { field: string; importance: 'critical' | 'high' | 'medium' | 'low' }[] = [
  { field: 'annualRevenue', importance: 'critical' },
  { field: 'arr', importance: 'high' },
  { field: 'growthYoYPct', importance: 'critical' },
  { field: 'ebitda', importance: 'high' },
  { field: 'burnMonthly', importance: 'high' },
  { field: 'runwayMonths', importance: 'high' },
  { field: 'cashOnHand', importance: 'high' },
  { field: 'grossMarginPct', importance: 'medium' },
  { field: 'tam', importance: 'medium' },
  { field: 'capitalRaisedToDate', importance: 'medium' },
  { field: 'lastRoundPreMoney', importance: 'medium' },
  { field: 'netRevenueRetentionPct', importance: 'medium' },
  { field: 'churnPct', importance: 'medium' },
  { field: 'debt', importance: 'low' },
  { field: 'fullyDilutedShares', importance: 'low' },
];

// ── Main extraction function ─────────────────────────────────────────

/**
 * Build the user prompt from document chunks.
 * Groups chunks by page and includes page references.
 */
function buildExtractionPrompt(chunks: DocumentChunk[]): string {
  const parts: string[] = [
    'Extract all financial metrics from the following document text.',
    'Each chunk is labelled with its page/slide number.',
    '',
    '---BEGIN DOCUMENT---',
    '',
  ];

  for (const chunk of chunks) {
    const pageLabel = chunk.pageOrSlide !== null ? `[Page ${chunk.pageOrSlide}]` : '[Unknown page]';
    const sectionLabel = chunk.sectionTitle ? ` — ${chunk.sectionTitle}` : '';
    parts.push(`${pageLabel}${sectionLabel}`);
    parts.push(chunk.content);
    parts.push('');
  }

  parts.push('---END DOCUMENT---');
  parts.push('');
  parts.push('Return a JSON object with all extracted fields. Use null for any field not found in the text.');

  return parts.join('\n');
}

/**
 * FinancialExtractorAgent: Extract financial metrics from document chunks
 * via Claude Sonnet API call.
 *
 * @param chunks - Document chunks from DocumentIntakeAgent
 * @param companyId - Company identifier
 * @param documentId - Source document ID
 * @param documentName - Source document filename
 * @param llmCall - Function to call the LLM (injected for testability)
 * @returns ExtractedValuationInput with full provenance
 */
export async function runFinancialExtraction(
  chunks: DocumentChunk[],
  companyId: string,
  documentId: string,
  documentName: string,
  llmCall: LLMCallFn,
): Promise<ExtractedValuationInput> {
  const userPrompt = buildExtractionPrompt(chunks);

  const rawResponse = await llmCall({
    model: EXTRACTION_MODEL,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    maxTokens: 8192,
  });

  // Parse LLM response — extract JSON from potential markdown fencing
  let parsed: LLMExtractionResponse;
  try {
    // Strip markdown fences if present
    const fenceMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = fenceMatch ? fenceMatch[1] : rawResponse;
    // Try to extract the outermost JSON object if surrounded by text
    const objectMatch = (jsonStr ?? rawResponse).match(/\{[\s\S]*\}/);
    const candidate = objectMatch ? objectMatch[0] : (jsonStr ?? rawResponse);
    let obj = JSON.parse(candidate);
    // Unwrap if LLM nested inside extractedMetrics or similar wrapper
    if (obj.extractedMetrics && typeof obj.extractedMetrics === "object") {
      obj = obj.extractedMetrics;
    }
    parsed = obj as LLMExtractionResponse;
  } catch {
    throw new Error(`Financial extraction failed: LLM returned invalid JSON. Raw: ${rawResponse.slice(0, 300)}`);
  }

  // Map extracted fields to MetricEvidence (null-safe — LLM may omit fields)
  const me = (field: ExtractedField | undefined | null) => toMetricEvidence(field, documentId, documentName);

  // Build evidence map
  const evidenceMap: Record<string, EvidenceRef> = {};
  const metricFields: [string, ExtractedField | undefined][] = [
    ['annualRevenue', parsed.annualRevenue],
    ['arr', parsed.arr],
    ['grossMarginPct', parsed.grossMarginPct],
    ['ebitda', parsed.ebitda],
    ['ebitdaMarginPct', parsed.ebitdaMarginPct],
    ['burnMonthly', parsed.burnMonthly],
    ['runwayMonths', parsed.runwayMonths],
    ['growthYoYPct', parsed.growthYoYPct],
    ['netRevenueRetentionPct', parsed.netRevenueRetentionPct],
    ['churnPct', parsed.churnPct],
    ['customerConcentrationTop3Pct', parsed.customerConcentrationTop3Pct],
    ['cacPaybackMonths', parsed.cacPaybackMonths],
    ['ltvToCac', parsed.ltvToCac],
    ['burnMultiple', parsed.burnMultiple],
    ['cashOnHand', parsed.cashOnHand],
    ['debt', parsed.debt],
    ['fullyDilutedShares', parsed.fullyDilutedShares],
    ['optionPoolPct', parsed.optionPoolPct],
    ['tam', parsed.tam],
    ['sam', parsed.sam],
    ['som', parsed.som],
    ['marketGrowthPct', parsed.marketGrowthPct],
    ['capitalRaisedToDate', parsed.capitalRaisedToDate],
    ['lastRoundPreMoney', parsed.lastRoundPreMoney],
    ['lastRoundPostMoney', parsed.lastRoundPostMoney],
    ['capitalizedBuildCost', parsed.capitalizedBuildCost],
    ['replacementCost', parsed.replacementCost],
  ];

  for (const [fieldName, field] of metricFields) {
    const ref = toEvidenceRef(field, documentId, documentName);
    if (ref) {
      evidenceMap[fieldName] = ref;
    }
  }

  // Detect missing critical fields that the LLM didn't find
  const additionalMissing: MissingItem[] = [];
  for (const { field, importance } of CRITICAL_FIELDS) {
    const extractedField = metricFields.find(([name]) => name === field);
    if (extractedField && safeField(extractedField[1]).value === null) {
      const alreadyReported = parsed.missingItems?.some(m => m.field === field);
      if (!alreadyReported) {
        additionalMissing.push({
          field,
          importance,
          reason: 'Not found in document text',
        });
      }
    }
  }

  // Build the CompanyValuationInput with safe defaults for non-extracted fields
  const input: CompanyValuationInput = {
    companyName: parsed.companyName ?? 'Unknown Company',
    companyId,
    sector: parsed.sector ?? 'other',
    subsector: parsed.subsector ?? undefined,
    geography: parsed.geography ?? 'London',
    stage: validateStage(parsed.stage) ?? 'early_revenue',
    businessModel: validateBusinessModel(parsed.businessModel) ?? 'saas',

    annualRevenue: me(parsed.annualRevenue),
    arr: me(parsed.arr),
    grossMarginPct: me(parsed.grossMarginPct),
    ebitda: me(parsed.ebitda),
    ebitdaMarginPct: me(parsed.ebitdaMarginPct),
    burnMonthly: me(parsed.burnMonthly),
    runwayMonths: me(parsed.runwayMonths),
    growthYoYPct: me(parsed.growthYoYPct),
    netRevenueRetentionPct: me(parsed.netRevenueRetentionPct),
    churnPct: me(parsed.churnPct),
    customerConcentrationTop3Pct: me(parsed.customerConcentrationTop3Pct),
    cacPaybackMonths: me(parsed.cacPaybackMonths),
    ltvToCac: me(parsed.ltvToCac),
    burnMultiple: me(parsed.burnMultiple),

    cashOnHand: me(parsed.cashOnHand),
    debt: me(parsed.debt),
    fullyDilutedShares: me(parsed.fullyDilutedShares),
    optionPoolPct: me(parsed.optionPoolPct),

    tam: me(parsed.tam),
    sam: me(parsed.sam),
    som: me(parsed.som),
    marketGrowthPct: me(parsed.marketGrowthPct),

    capitalRaisedToDate: me(parsed.capitalRaisedToDate),
    lastRoundPreMoney: me(parsed.lastRoundPreMoney),
    lastRoundPostMoney: me(parsed.lastRoundPostMoney),

    founderDependencyRisk: 0.5,
    legalRisk: 0.2,
    ipStrength: 0.5,
    productMaturity: 0.5,
    goToMarketMaturity: 0.5,
    londonStrategicFit: 0.5,
    managementStrength: 0.5,
    founderReputationScore: 0.5,
    competitionIntensityScore: 0.5,

    capitalizedBuildCost: me(parsed.capitalizedBuildCost),
    replacementCost: me(parsed.replacementCost),
    patentsCount: parsed.patentsCount?.value ?? 0,
    proprietaryDataScore: 0.3,
    trademarksCount: 0,
    regulatoryApprovals: false,

    volatility: 0.45,
    timeToExit: 3,

    marketBenchmarks: {
      revenueMultipleLow: null,
      revenueMultipleBase: null,
      revenueMultipleHigh: null,
      ebitdaMultipleLow: null,
      ebitdaMultipleBase: null,
      ebitdaMultipleHigh: null,
      discountRatePct: null,
      terminalGrowthPct: null,
      targetInvestorReturnPct: null,
    },
  };

  const allNotes: ExtractionNote[] = parsed.extractionNotes ?? [];
  const allMissing: MissingItem[] = [...(parsed.missingItems ?? []), ...additionalMissing];
  const allWarnings: string[] = parsed.warnings ?? [];

  return {
    input,
    extractionNotes: allNotes,
    missingItems: allMissing,
    warnings: allWarnings,
    evidenceMap,
    extractedAt: new Date().toISOString(),
    modelUsed: EXTRACTION_MODEL,
  };
}

// ── Stage / business model validation ────────────────────────────────

const VALID_STAGES = ['idea', 'pre_revenue', 'mvp', 'early_revenue', 'growth', 'scaleup', 'mature'];
const VALID_MODELS = ['saas', 'marketplace', 'services', 'deeptech', 'fintech', 'ecommerce', 'media', 'hardware', 'other'];

function validateStage(s: string | null): CompanyValuationInput['stage'] | null {
  if (s && VALID_STAGES.includes(s)) return s as CompanyValuationInput['stage'];
  return null;
}

function validateBusinessModel(m: string | null): CompanyValuationInput['businessModel'] | null {
  if (m && VALID_MODELS.includes(m)) return m as CompanyValuationInput['businessModel'];
  return null;
}
