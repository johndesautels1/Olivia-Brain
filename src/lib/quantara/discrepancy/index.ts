/**
 * Quantara Q4 — discrepancy-detection barrel.
 *
 * Public surface for the field-validation cascade. The IntakeForm
 * (`src/components/quantara/IntakeForm.tsx`) consumes from here.
 */
export {
  type QuantaraDiscrepancyGap,
  type QuantaraDiscrepancyResult,
} from "./types";

export {
  QUANTARA_TO_TRUTH_FIELD,
  TRUTH_FIELD_TO_QUANTARA,
  isComparableField,
} from "./field-mapping";

export { detectDiscrepancies } from "./detect";
