/**
 * Quantara Q4 — field-mapping bridge.
 *
 * Maps `QuantaraFieldId` → V5 truth-score-agent's flat field name (the
 * subkey LTM uses inside its JSON columns: `arr`, `cashOnHand`, `tam`,
 * etc.). Inverse map exists for re-keying agent output back to
 * Quantara field ids.
 *
 * Only Quantara fields whose engine subkey appears in the agent's
 * `COMPARABLE_FIELDS` array land here. Non-comparable fields (text,
 * scores, enums, qualitatives) are skipped — Q4 only checks numeric
 * fields the founder might typo.
 */
import type { QuantaraFieldId } from "@/lib/quantara";

/**
 * Fwd map: `QuantaraFieldId` → truth-score-agent field name.
 * Sourced from `src/lib/quantara/field-mapping.ts` (the engine-mapped
 * fields with `wrap: 'metric'`) intersected with the agent's
 * `COMPARABLE_FIELDS` constant in `src/lib/agents/valuation/truth-score-agent.ts`.
 */
export const QUANTARA_TO_TRUTH_FIELD: Readonly<
  Partial<Record<QuantaraFieldId, string>>
> = Object.freeze({
  f1: "arr",
  f3: "growthYoYPct",
  f5: "grossMarginPct",
  f7: "ebitda",
  f8: "burnMonthly",
  f9: "runwayMonths",
  f12: "ltvToCac",
  f13: "netRevenueRetentionPct",
  f15: "cashOnHand",
  f16: "debt",
  f17: "fullyDilutedShares",
  f18: "optionPoolPct",
  f19: "capitalRaisedToDate",
  f20: "lastRoundPreMoney",
  f27: "churnPct",
  f30: "tam",
  f31: "sam",
  f32: "som",
  f33: "marketGrowthPct",
});

/**
 * Inverse map: truth-score-agent field name → `QuantaraFieldId`.
 * Lazy-built to avoid manual key duplication.
 */
export const TRUTH_FIELD_TO_QUANTARA: Readonly<Record<string, QuantaraFieldId>> =
  Object.freeze(
    Object.fromEntries(
      Object.entries(QUANTARA_TO_TRUTH_FIELD).map(([qid, agentField]) => [
        agentField,
        qid as QuantaraFieldId,
      ]),
    ) as Record<string, QuantaraFieldId>,
  );

/**
 * Whether a Quantara field can be discrepancy-checked. Q4 only
 * surfaces chips on fields the V5 agent compares — text/select/score
 * fields stay out of scope.
 */
export function isComparableField(
  fieldId: QuantaraFieldId,
): fieldId is keyof typeof QUANTARA_TO_TRUTH_FIELD {
  return fieldId in QUANTARA_TO_TRUTH_FIELD;
}
