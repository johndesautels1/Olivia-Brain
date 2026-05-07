import type {
  ExtractedValuationInput,
  ValidatedInput,
  EvidenceMap,
  FieldProvenance,
  EvidenceRef,
  FieldValidationResult,
  MetricEvidence,
} from '@/lib/valuation/types';

// ═══════════════════════════════════════════════════════════════════════
// EVIDENCE MAPPER AGENT
// ═══════════════════════════════════════════════════════════════════════
//
// Purpose: Build the complete provenance chain (Opus idea) linking every
// extracted value to its documentary source.
//
// For each field:
//   fieldName → {
//     value,
//     extractedFrom: { documentId, documentName, pageOrSlide, exactQuote, confidence },
//     validatedBy: { agent, result, adjustedConfidence } | null
//   }
//
// This chain is stored in ValuationRun.inputSnapshot so any output number
// can be traced back to its source document and page.
// ═══════════════════════════════════════════════════════════════════════

// ── Metric field names that carry MetricEvidence ─────────────────────

const METRIC_EVIDENCE_FIELDS: string[] = [
  'annualRevenue',
  'arr',
  'grossMarginPct',
  'ebitda',
  'ebitdaMarginPct',
  'burnMonthly',
  'runwayMonths',
  'growthYoYPct',
  'netRevenueRetentionPct',
  'churnPct',
  'customerConcentrationTop3Pct',
  'cacPaybackMonths',
  'ltvToCac',
  'burnMultiple',
  'cashOnHand',
  'debt',
  'fullyDilutedShares',
  'optionPoolPct',
  'tam',
  'sam',
  'som',
  'marketGrowthPct',
  'capitalRaisedToDate',
  'lastRoundPreMoney',
  'lastRoundPostMoney',
  'capitalizedBuildCost',
  'replacementCost',
];

// ── Main mapping function ────────────────────────────────────────────

/**
 * EvidenceMapperAgent: Build the full provenance chain from extraction
 * evidence and validation results.
 *
 * @param extraction - Output from FinancialExtractorAgent
 * @param validation - Output from ValidationAgent (optional; null if validation was skipped)
 * @returns EvidenceMap linking every field to its source and validation status
 */
export function buildEvidenceMap(
  extraction: ExtractedValuationInput,
  validation: ValidatedInput | null,
): EvidenceMap {
  const evidenceMap: EvidenceMap = {};

  for (const fieldName of METRIC_EVIDENCE_FIELDS) {
    // Get the MetricEvidence from the extraction input
    const metric = (extraction.input as Record<string, unknown>)[fieldName] as MetricEvidence | undefined;
    if (!metric) continue;

    // Get the extraction evidence ref
    const evidenceRef: EvidenceRef | undefined = extraction.evidenceMap[fieldName];

    // Get the validation result for this field
    const validationResult: FieldValidationResult | undefined = validation
      ? validation.fieldValidations.find(fv => fv.field === fieldName)
      : undefined;

    const provenance: FieldProvenance = {
      value: metric.value,
      extractedFrom: {
        documentId: evidenceRef?.documentId ?? 'unknown',
        documentName: evidenceRef?.documentName ?? 'unknown',
        pageOrSlide: evidenceRef?.pageOrSlide ?? null,
        exactQuote: evidenceRef?.quote ?? null,
        confidence: evidenceRef?.confidence ?? metric.confidence,
      },
      validatedBy: validationResult
        ? {
            agent: 'ValidationAgent',
            result: validationResult.isMatch
              ? 'confirmed'
              : validationResult.verifiedValue !== null
                ? 'adjusted'
                : 'unverified',
            adjustedConfidence: validationResult.adjustedConfidence,
          }
        : null,
    };

    evidenceMap[fieldName] = provenance;
  }

  return evidenceMap;
}

// ── Summary helpers ──────────────────────────────────────────────────

/**
 * Generate a human-readable summary of the evidence map for audit purposes.
 */
export function summarizeEvidenceMap(evidenceMap: EvidenceMap): string {
  const lines: string[] = ['Evidence Provenance Summary', '=' .repeat(40)];

  let confirmed = 0;
  let adjusted = 0;
  let unverified = 0;
  let totalFields = 0;

  for (const [fieldName, provenance] of Object.entries(evidenceMap)) {
    if (provenance.value === null) continue;
    totalFields++;

    const source = provenance.extractedFrom;
    const validation = provenance.validatedBy;

    let status = 'extracted';
    if (validation) {
      status = validation.result;
      if (validation.result === 'confirmed') confirmed++;
      else if (validation.result === 'adjusted') adjusted++;
      else unverified++;
    } else {
      unverified++;
    }

    const pageRef = source.pageOrSlide !== null ? `p.${source.pageOrSlide}` : 'unknown page';
    const conf = (validation?.adjustedConfidence ?? source.confidence).toFixed(2);

    lines.push(`  ${fieldName}: ${provenance.value} [${status}] from ${source.documentName} ${pageRef} (conf: ${conf})`);
    if (source.exactQuote) {
      lines.push(`    Quote: "${source.exactQuote.slice(0, 100)}${source.exactQuote.length > 100 ? '...' : ''}"`);
    }
  }

  lines.push('');
  lines.push(`Total fields with values: ${totalFields}`);
  lines.push(`  Confirmed: ${confirmed}`);
  lines.push(`  Adjusted: ${adjusted}`);
  lines.push(`  Unverified: ${unverified}`);

  return lines.join('\n');
}

/**
 * Calculate an overall evidence quality score (0-1) from the evidence map.
 * Higher score = more fields confirmed with high confidence.
 */
export function calculateEvidenceQuality(evidenceMap: EvidenceMap): number {
  const entries = Object.values(evidenceMap).filter(p => p.value !== null);
  if (entries.length === 0) return 0;

  let totalScore = 0;

  for (const provenance of entries) {
    const confidence = provenance.validatedBy?.adjustedConfidence
      ?? provenance.extractedFrom.confidence;

    // Bonus for confirmed fields
    const validationBonus = provenance.validatedBy?.result === 'confirmed' ? 0.1 : 0;

    // Penalty for adjusted fields (mismatch detected)
    const adjustmentPenalty = provenance.validatedBy?.result === 'adjusted' ? 0.1 : 0;

    totalScore += Math.min(1, Math.max(0, confidence + validationBonus - adjustmentPenalty));
  }

  return totalScore / entries.length;
}
