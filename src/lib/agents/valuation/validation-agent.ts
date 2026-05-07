import type {
  DocumentChunk,
  ExtractedValuationInput,
  FieldValidationResult,
  ValidatedInput,
  ValidationWarning,
  MetricEvidence,
  CompanyValuationInput,
} from '@/lib/valuation/types';
import type { LLMCallFn } from './financial-extractor';

// ═══════════════════════════════════════════════════════════════════════
// VALIDATION AGENT
// ═══════════════════════════════════════════════════════════════════════
//
// Purpose: Cross-check extracted numbers against source text.
// For each high-importance field, retrieve the source chunk and ask
// Claude Sonnet to verify the extraction is correct.
//
// Detects: contradictions, stale data (>12 months), missing dates,
// cap-table math mismatches, unsupported TAM claims, value mismatches.
//
// Output: ValidatedInput with per-field confidence adjusted up/down.
// ═══════════════════════════════════════════════════════════════════════

const VALIDATION_MODEL = 'claude-sonnet-4-6';

const MISMATCH_THRESHOLD_PCT = 10;

// ── High-importance fields to validate ───────────────────────────────

const HIGH_IMPORTANCE_FIELDS: string[] = [
  'annualRevenue',
  'arr',
  'growthYoYPct',
  'ebitda',
  'burnMonthly',
  'runwayMonths',
  'cashOnHand',
  'grossMarginPct',
  'capitalRaisedToDate',
  'lastRoundPreMoney',
  'lastRoundPostMoney',
  'netRevenueRetentionPct',
];

// ── Verification prompt ──────────────────────────────────────────────

function buildVerificationPrompt(
  fieldName: string,
  extractedValue: number,
  pageOrSlide: number | null,
  sourceText: string,
): string {
  return `The financial extractor says "${fieldName}" = ${extractedValue} from page/slide ${pageOrSlide ?? 'unknown'}.

Here is the source text from that page:

---
${sourceText}
---

Questions:
1. Is this extraction correct? (yes/no)
2. If no, what is the correct value based on the text? Return a number only.
3. Confidence in your verification (0.0 to 1.0).

Return JSON: { "correct": true/false, "verifiedValue": <number or null>, "confidence": <number>, "note": "<explanation>" }`;
}

const VERIFICATION_SYSTEM_PROMPT = `You are a financial data verification agent. Your job is to verify that extracted financial metrics match the source document text.

RULES:
1. Compare the extracted value against what the source text actually says.
2. If the value matches (within 5% for rounding), mark as correct.
3. If the value does NOT match, provide the correct value from the text.
4. If the source text does not contain this metric at all, return verifiedValue as null.
5. Do NOT perform calculations or estimates — verify only what is explicitly stated.
6. Return valid JSON only.`;

// ── LLM verification for a single field ──────────────────────────────

type VerificationResult = {
  correct: boolean;
  verifiedValue: number | null;
  confidence: number;
  note: string;
};

async function verifyField(
  fieldName: string,
  extractedValue: number,
  pageOrSlide: number | null,
  sourceChunk: DocumentChunk | null,
  llmCall: LLMCallFn,
): Promise<VerificationResult> {
  if (!sourceChunk) {
    return {
      correct: false,
      verifiedValue: null,
      confidence: 0.3,
      note: `No source chunk found for page ${pageOrSlide ?? 'unknown'}`,
    };
  }

  const userPrompt = buildVerificationPrompt(
    fieldName,
    extractedValue,
    pageOrSlide,
    sourceChunk.content,
  );

  const rawResponse = await llmCall({
    model: VALIDATION_MODEL,
    systemPrompt: VERIFICATION_SYSTEM_PROMPT,
    userPrompt,
    maxTokens: 512,
  });

  try {
    // Try fenced JSON first, then bare JSON object extraction
    const fenceMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
    const candidate = fenceMatch?.[1] ?? rawResponse;
    const objectMatch = candidate.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(objectMatch?.[0] ?? candidate) as VerificationResult;
    return {
      correct: parsed.correct ?? false,
      verifiedValue: typeof parsed.verifiedValue === 'number' ? parsed.verifiedValue : null,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      note: parsed.note ?? '',
    };
  } catch {
    return {
      correct: false,
      verifiedValue: null,
      confidence: 0.3,
      note: `Verification LLM returned invalid JSON: ${rawResponse.slice(0, 100)}`,
    };
  }
}

// ── Find the best chunk for a given page ─────────────────────────────

function findChunkForPage(
  chunks: DocumentChunk[],
  pageOrSlide: number | null,
): DocumentChunk | null {
  if (pageOrSlide === null) return chunks[0] ?? null;
  return chunks.find(c => c.pageOrSlide === pageOrSlide) ?? null;
}

// ── Deterministic validation checks ──────────────────────────────────

function runDeterministicChecks(
  input: CompanyValuationInput,
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // Stale data check: asOfDate > 12 months old
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const dateFields: [string, MetricEvidence][] = [
    ['annualRevenue', input.annualRevenue],
    ['arr', input.arr],
    ['ebitda', input.ebitda],
    ['cashOnHand', input.cashOnHand],
  ];

  for (const [fieldName, metric] of dateFields) {
    if (metric.asOfDate) {
      const asOf = new Date(metric.asOfDate);
      if (asOf < twelveMonthsAgo) {
        warnings.push({
          type: 'stale_data',
          field: fieldName,
          message: `${fieldName} data is from ${metric.asOfDate}, which is over 12 months old`,
          severity: 'high',
        });
      }
    }
  }

  // Cap table math: lastRoundPostMoney should ≈ lastRoundPreMoney + raise
  const preMoney = input.lastRoundPreMoney.value;
  const postMoney = input.lastRoundPostMoney.value;
  if (preMoney !== null && postMoney !== null && preMoney > 0 && postMoney > 0) {
    if (postMoney < preMoney) {
      warnings.push({
        type: 'cap_table_mismatch',
        field: 'lastRoundPostMoney',
        message: `Post-money (${postMoney}) is less than pre-money (${preMoney}) — this is mathematically impossible`,
        severity: 'high',
      });
    }
  }

  // Runway vs burn consistency
  const cash = input.cashOnHand.value;
  const burn = input.burnMonthly.value;
  const runway = input.runwayMonths.value;
  if (cash !== null && burn !== null && runway !== null && burn > 0 && runway > 0) {
    const impliedRunway = cash / burn;
    const runwayDiff = Math.abs(impliedRunway - runway) / runway;
    if (runwayDiff > 0.3) {
      warnings.push({
        type: 'contradiction',
        field: 'runwayMonths',
        message: `Stated runway (${runway}mo) doesn't match cash/burn calculation (${impliedRunway.toFixed(1)}mo) — ${(runwayDiff * 100).toFixed(0)}% discrepancy`,
        severity: 'medium',
      });
    }
  }

  // Unsupported TAM: if TAM > £100B, flag as needing justification
  const tam = input.tam.value;
  if (tam !== null && tam > 100_000_000_000) {
    warnings.push({
      type: 'unsupported_claim',
      field: 'tam',
      message: `TAM of £${(tam / 1_000_000_000).toFixed(0)}B is extremely large — requires strong third-party source validation`,
      severity: 'medium',
    });
  }

  // EBITDA margin consistency
  const revenue = input.annualRevenue.value ?? input.arr.value;
  const ebitda = input.ebitda.value;
  const ebitdaMargin = input.ebitdaMarginPct.value;
  if (revenue !== null && ebitda !== null && ebitdaMargin !== null && revenue > 0) {
    const impliedMargin = (ebitda / revenue) * 100;
    const marginDiff = Math.abs(impliedMargin - ebitdaMargin);
    if (marginDiff > 5) {
      warnings.push({
        type: 'contradiction',
        field: 'ebitdaMarginPct',
        message: `Stated EBITDA margin (${ebitdaMargin}%) doesn't match EBITDA/revenue calculation (${impliedMargin.toFixed(1)}%)`,
        severity: 'medium',
      });
    }
  }

  return warnings;
}

// ── Main validation function ─────────────────────────────────────────

/**
 * ValidationAgent: Cross-check extracted financial metrics against source
 * document chunks using Claude Sonnet verification.
 *
 * @param extraction - Output from FinancialExtractorAgent
 * @param chunks - Original document chunks
 * @param llmCall - LLM call function (injected for testability)
 * @returns ValidatedInput with adjusted per-field confidence
 */
export async function runValidation(
  extraction: ExtractedValuationInput,
  chunks: DocumentChunk[],
  llmCall: LLMCallFn,
): Promise<ValidatedInput> {
  const fieldValidations: FieldValidationResult[] = [];
  const warnings: ValidationWarning[] = [];

  // Clone the input so we can adjust confidence without mutating
  const validatedInputData: CompanyValuationInput = JSON.parse(
    JSON.stringify(extraction.input)
  ) as CompanyValuationInput;

  // LLM-based verification for high-importance fields — run in parallel
  const verificationJobs = HIGH_IMPORTANCE_FIELDS
    .map(fieldName => {
      const evidenceRef = extraction.evidenceMap[fieldName];
      if (!evidenceRef) return null;
      const metric = (extraction.input as unknown as Record<string, MetricEvidence>)[fieldName] as MetricEvidence | undefined;
      if (!metric || metric.value === null) return null;
      const sourceChunk = findChunkForPage(chunks, evidenceRef.pageOrSlide ?? null);
      return { fieldName, metric, evidenceRef, sourceChunk };
    })
    .filter((job): job is NonNullable<typeof job> => job !== null);

  const settled = await Promise.allSettled(
    verificationJobs.map(async ({ fieldName, metric, evidenceRef, sourceChunk }) => {
      const verification = await verifyField(
        fieldName,
        metric.value!,
        evidenceRef.pageOrSlide ?? null,
        sourceChunk,
        llmCall,
      );
      return { fieldName, metric, verification };
    }),
  );

  const verificationResults = settled
    .filter((s): s is PromiseFulfilledResult<{ fieldName: string; metric: MetricEvidence; verification: VerificationResult }> => s.status === 'fulfilled')
    .map(s => s.value);

  for (const { fieldName, metric, verification } of verificationResults) {
    let adjustedConfidence = metric.confidence;
    let isMatch = true;
    let mismatchPct: number | null = null;

    if (verification.correct) {
      // Boost confidence for verified fields
      adjustedConfidence = Math.min(1, metric.confidence + 0.1);
    } else if (verification.verifiedValue !== null) {
      // Calculate mismatch
      const diff = Math.abs(metric.value! - verification.verifiedValue);
      const base = Math.max(Math.abs(metric.value!), Math.abs(verification.verifiedValue));
      mismatchPct = base > 0 ? (diff / base) * 100 : 0;

      if (mismatchPct > MISMATCH_THRESHOLD_PCT) {
        isMatch = false;
        adjustedConfidence = Math.max(0.1, metric.confidence - 0.2);
        warnings.push({
          type: 'value_mismatch',
          field: fieldName,
          message: `Extracted ${fieldName} = ${metric.value}, but verification says ${verification.verifiedValue} (${mismatchPct.toFixed(1)}% mismatch). ${verification.note}`,
          severity: mismatchPct > 30 ? 'high' : 'medium',
        });
      }
    } else {
      // LLM couldn't find the value in source — reduce confidence
      adjustedConfidence = Math.max(0.15, metric.confidence - 0.15);
    }

    // Update the validated input's confidence
    const validatedMetric = (validatedInputData as unknown as Record<string, MetricEvidence>)[fieldName] as MetricEvidence | undefined;
    if (validatedMetric) {
      validatedMetric.confidence = adjustedConfidence;
    }

    fieldValidations.push({
      field: fieldName,
      extractedValue: metric.value!,
      verifiedValue: verification.verifiedValue,
      isMatch,
      mismatchPct,
      originalConfidence: metric.confidence,
      adjustedConfidence,
      verificationNote: verification.note,
    });
  }

  // Deterministic validation checks (no LLM needed)
  const deterministicWarnings = runDeterministicChecks(validatedInputData);
  warnings.push(...deterministicWarnings);

  // Calculate overall confidence as weighted average of validated fields
  const overallConfidence = fieldValidations.length > 0
    ? fieldValidations.reduce((sum, fv) => sum + fv.adjustedConfidence, 0) / fieldValidations.length
    : extraction.input.annualRevenue.confidence;

  return {
    input: validatedInputData,
    fieldValidations,
    warnings,
    overallConfidence,
    validatedAt: new Date().toISOString(),
  };
}
