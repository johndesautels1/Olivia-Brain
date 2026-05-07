/**
 * Quantara Q4 — discrepancy detection.
 *
 * Wraps V5's `runTruthScore` for the 19 Quantara fields whose engine
 * subkey overlaps with the agent's `COMPARABLE_FIELDS`. Founder's
 * typed values arrive as `QuantaraValues`; API references arrive as
 * `Map<QuantaraFieldId, QuantaraSuggestion>` (kept persistently in
 * IntakeForm, separate from the dismissable suggestions inbox).
 *
 * # No re-implementation
 *
 * The 5% match threshold and per-field directionality (optimistic /
 * pessimistic) come from the agent. We project our two maps into
 * shapes the agent accepts (`ExtractedValuationInput` / `Company
 * ValuationInput`), call `runTruthScore`, then re-key the result back
 * to `QuantaraFieldId` so the UI binds without leaking truth-score's
 * internal field names.
 *
 * # Pure
 *
 * No Prisma writes. No LLM calls (agent is deterministic). Safe to
 * call in a `useMemo` on every IntakeForm render.
 */
import type { QuantaraFieldId, QuantaraValues } from "@/lib/quantara";
import { runTruthScore } from "@/lib/agents/valuation/truth-score-agent";
import type {
  CompanyValuationInput,
  ExtractedValuationInput,
  MetricEvidence,
} from "@/lib/valuation/types";

import type { QuantaraSuggestion } from "../auto-fill";
import { SUGGESTION_SOURCE_LABEL } from "../auto-fill";
import {
  QUANTARA_TO_TRUTH_FIELD,
  TRUTH_FIELD_TO_QUANTARA,
  isComparableField,
} from "./field-mapping";
import type {
  QuantaraDiscrepancyGap,
  QuantaraDiscrepancyResult,
} from "./types";

/** Wrap a raw number as a MetricEvidence the agent can consume. */
function asMetric(value: number, confidence: number): MetricEvidence {
  return { value, refs: [], confidence };
}

/**
 * Project `QuantaraValues` into a flat `Record<truthAgentFieldName,
 * MetricEvidence>` matching the shape `runTruthScore` reads from.
 * Only fields with a `QUANTARA_TO_TRUTH_FIELD` mapping AND a valid
 * numeric value land in the projection; everything else is dropped
 * silently (consistent with the agent's "skip if either side missing"
 * rule).
 */
function projectValuesToTruthInput(
  values: QuantaraValues,
  defaultConfidence: number,
): Record<string, MetricEvidence> {
  const out: Record<string, MetricEvidence> = {};
  for (const [fieldId, raw] of Object.entries(values) as Array<
    [QuantaraFieldId, unknown]
  >) {
    if (!isComparableField(fieldId)) continue;
    if (typeof raw !== "number" || !Number.isFinite(raw)) continue;
    const agentField = QUANTARA_TO_TRUTH_FIELD[fieldId];
    if (!agentField) continue;
    out[agentField] = asMetric(raw, defaultConfidence);
  }
  return out;
}

/**
 * Same projection from a `Map<QuantaraFieldId, QuantaraSuggestion>`,
 * preserving each suggestion's confidence so the agent's truth-score
 * weighting reflects per-source quality (Stripe live = 0.9, mock-mode
 * = 0.5, defaults = 0.4).
 */
function projectSuggestionsToTruthInput(
  apiReferenceValues: ReadonlyMap<QuantaraFieldId, QuantaraSuggestion>,
): Record<string, MetricEvidence> {
  const out: Record<string, MetricEvidence> = {};
  for (const [fieldId, suggestion] of apiReferenceValues) {
    if (!isComparableField(fieldId)) continue;
    const agentField = QUANTARA_TO_TRUTH_FIELD[fieldId];
    if (!agentField) continue;
    if (typeof suggestion.value !== "number" || !Number.isFinite(suggestion.value)) {
      continue;
    }
    out[agentField] = asMetric(suggestion.value, suggestion.confidence);
  }
  return out;
}

/**
 * Run the V5 truth-score-agent against `(values, apiReferenceValues)`
 * and re-key the result into a `QuantaraFieldId`-addressable map for
 * IntakeForm consumption.
 *
 * Returns an empty result (zero gaps, truthScore 100) when there are
 * no overlapping comparable fields — the UI surfaces nothing.
 */
export function detectDiscrepancies(
  values: QuantaraValues,
  apiReferenceValues: ReadonlyMap<QuantaraFieldId, QuantaraSuggestion>,
): QuantaraDiscrepancyResult {
  const manualInput = projectValuesToTruthInput(
    values,
    /* founder confidence */ 0.7,
  ) as unknown as CompanyValuationInput;
  const extractionInput = projectSuggestionsToTruthInput(
    apiReferenceValues,
  ) as unknown as Record<string, MetricEvidence>;

  const extraction: ExtractedValuationInput = {
    input: extractionInput as unknown as CompanyValuationInput,
    /* The truth-score-agent only reads `extraction.input` — these
       remaining fields exist on `ExtractedValuationInput` for the full
       cascade contract. Supply empty defaults to keep typecheck clean
       without leaking fake source quotes. */
    extractionNotes: [],
    missingItems: [],
    warnings: [],
    evidenceMap: {},
    extractedAt: new Date().toISOString(),
    modelUsed: "quantara_discrepancy_q4",
  };

  const result = runTruthScore(extraction, manualInput);
  const gaps = new Map<QuantaraFieldId, QuantaraDiscrepancyGap>();

  for (const gap of result.gaps) {
    if (gap.direction === "match") continue;
    const quantaraId = TRUTH_FIELD_TO_QUANTARA[gap.field];
    if (!quantaraId) continue;
    const suggestion = apiReferenceValues.get(quantaraId);
    if (!suggestion) continue;
    gaps.set(quantaraId, {
      fieldId: quantaraId,
      manualValue: gap.manualValue,
      referenceValue: gap.documentValue,
      /* Cap at 100 — gaps where one side is ~zero can compute to 100% by
         construction in the agent, but values >100 are noise. */
      gapPct: Math.min(100, gap.gapPct),
      direction: gap.direction,
      source: suggestion.source.integration,
      sourceLabel:
        SUGGESTION_SOURCE_LABEL[suggestion.source.integration] ??
        suggestion.source.label,
    });
  }

  return {
    gaps,
    truthScore: result.truthScore,
    totalFields: result.totalFields,
    verifiedFields: result.verifiedFields,
  };
}
