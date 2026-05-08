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

export {
  type SupplementaryFieldId,
  type SupplementaryControlKind,
  type SupplementaryFieldWeight,
  type SupplementaryFieldDefinition,
  type SupplementaryValuesForRound,
  type SupplementaryValues,
  type MetamorphicFieldShape,
  type FieldRelevanceTier,
  QUANTARA_SUPPLEMENTARY_FIELD_COUNT,
  QUANTARA_SUPPLEMENTARY_FIELDS,
  QUANTARA_SUPPLEMENTARY_BY_ID,
  QUANTARA_SUPPLEMENTARY_NAMESPACE,
  SupplementaryValuesSchema,
  buildSupplementaryValuesSchema,
  getInvestorClassesForRound,
  buyerClassesIntersect,
  getSectionOrderForRound,
  isSectionPrimaryForRound,
  sectionRelevanceScore,
  getFieldRelevanceTier,
  getAllFieldRelevanceTiers,
  getSupplementaryFieldsForRound,
  supplementaryToJson,
  supplementaryFromJson,
  readSupplementaryFromQuantaraJson,
  mergeSupplementaryIntoQuantaraJson,
  type VerticalId,
  type VerticalFieldId,
  type VerticalDescriptor,
  type VerticalFieldDefinition,
  type VerticalValuesForVertical,
  type VerticalValues,
  QUANTARA_VERTICAL_COUNT,
  QUANTARA_VERTICAL_FIELD_COUNT,
  QUANTARA_VERTICALS,
  QUANTARA_VERTICAL_BY_ID,
  QUANTARA_VERTICAL_FIELDS,
  QUANTARA_VERTICAL_FIELDS_BY_ID,
  VerticalValuesSchema,
  buildVerticalValuesSchema,
  getVerticalFieldsForVertical,
  QUANTARA_VERTICAL_NAMESPACE,
  verticalToJson,
  verticalFromJson,
  readVerticalFromQuantaraJson,
  mergeVerticalIntoQuantaraJson,
} from './metamorphic';

export {
  PERSONA_SCHEMA_VERSION,
  FOUNDER_ARCHETYPE_VALUES,
  RISK_TOLERANCE_VALUES,
  type FounderArchetype,
  type RiskTolerance,
  type FounderPersonaPayload,
  type CompanyPersonaPayload,
  type PersonaSynthesisAttempt,
  type PersonaSynthesisResult,
  type PersonaSynthesisContext,
  type CombinedPersonaPayload,
  FounderPersonaPayloadSchema,
  CompanyPersonaPayloadSchema,
  CombinedPersonaPayloadSchema,
  buildPersonaSynthesisPrompt,
  buildMockPersonaPayload,
  synthesizePersonas,
} from './personas';

export {
  type VoiceExtractionItem,
  type VoiceExtractionPayload,
  type VoiceExtractionResult,
  VoiceExtractionItemSchema,
  VoiceExtractionPayloadSchema,
  buildVoiceExtractionPrompt,
  extractFromTranscript,
} from './voice';
