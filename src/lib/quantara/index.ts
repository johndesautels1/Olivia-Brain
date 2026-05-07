/**
 * Quantara — barrel export.
 *
 * Public surface for the 56-field founder-valuation intake. Q2 (form
 * UI), Q3 (Composio auto-fill), Q4 (validation cascade), Q5 (metamorphic
 * UI), Q6 (vertical schedules), and Q7 (voice capture) all import from
 * here so the underlying file structure stays free to evolve.
 */
export {
  type QuantaraFieldDefinition,
  type QuantaraFieldId,
  type QuantaraFieldMapKey,
  type QuantaraFieldWeight,
  type QuantaraSection,
  type QuantaraSectionCode,
  type QuantaraSectionId,
  type QuantaraValues,
  type QuantaraValuationSubjectShape,
  type ParsedQuantaraValues,
  type LastRoundType,
  type TargetRoundType,
  QUANTARA_FIELD_COUNT,
  QUANTARA_FIELD_MAP_KEY_REGEX,
} from './types';

export {
  QUANTARA_SECTIONS,
  QUANTARA_SECTIONS_BY_ID,
} from './sections';

export {
  QUANTARA_FIELDS,
  QUANTARA_FIELDS_BY_ID,
  QUANTARA_FIELDS_BY_KEY,
  QuantaraValuesSchema,
  LastRoundTypeSchema,
  TargetRoundTypeSchema,
  type QuantaraValuesParsed,
} from './schema';

export {
  type QuantaraFieldDestination,
  QUANTARA_FIELD_DESTINATIONS,
  quantaraToValuationSubject,
  valuationSubjectToQuantara,
  mergeQuantaraIntoSubject,
} from './field-mapping';

export {
  type QuantaraDiscrepancyGap,
  type QuantaraDiscrepancyResult,
  QUANTARA_TO_TRUTH_FIELD,
  TRUTH_FIELD_TO_QUANTARA,
  isComparableField,
  detectDiscrepancies,
} from './discrepancy';
