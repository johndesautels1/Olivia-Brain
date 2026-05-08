/**
 * Quantara metamorphic — barrel export.
 *
 * Public surface for Q5 (investor-class metamorphic UI) — section
 * reordering, per-field relevance tiers, and supplementary fields.
 * Q6 (vertical schedules) and Q7 (voice capture) consume from here.
 */
export {
  type SupplementaryFieldId,
  type SupplementaryControlKind,
  type SupplementaryFieldWeight,
  type SupplementaryFieldDefinition,
  type SupplementaryValuesForRound,
  type SupplementaryValues,
  type MetamorphicFieldShape,
  QUANTARA_SUPPLEMENTARY_FIELD_COUNT,
} from './types';

export {
  getInvestorClassesForRound,
  buyerClassesIntersect,
} from './round-buyer-mapping';

export {
  getSectionOrderForRound,
  isSectionPrimaryForRound,
  sectionRelevanceScore,
} from './section-order';

export {
  type FieldRelevanceTier,
  getFieldRelevanceTier,
  getAllFieldRelevanceTiers,
} from './field-relevance';

export {
  QUANTARA_SUPPLEMENTARY_FIELDS,
  QUANTARA_SUPPLEMENTARY_BY_ID,
  SupplementaryValuesSchema,
  buildSupplementaryValuesSchema,
  getSupplementaryFieldsForRound,
} from './supplementary';

export {
  QUANTARA_SUPPLEMENTARY_NAMESPACE,
  supplementaryToJson,
  supplementaryFromJson,
  readSupplementaryFromQuantaraJson,
  mergeSupplementaryIntoQuantaraJson,
} from './supplementary-mapping';

export {
  type VerticalId,
  type VerticalFieldId,
  type VerticalDescriptor,
  type VerticalFieldDefinition,
  type VerticalValuesForVertical,
  type VerticalValues,
  QUANTARA_VERTICAL_COUNT,
  QUANTARA_VERTICAL_FIELD_COUNT,
} from './vertical-types';

export {
  QUANTARA_VERTICALS,
  QUANTARA_VERTICAL_BY_ID,
  QUANTARA_VERTICAL_FIELDS,
  QUANTARA_VERTICAL_FIELDS_BY_ID,
  VerticalValuesSchema,
  buildVerticalValuesSchema,
  getVerticalFieldsForVertical,
} from './vertical-schedules';

export {
  QUANTARA_VERTICAL_NAMESPACE,
  verticalToJson,
  verticalFromJson,
  readVerticalFromQuantaraJson,
  mergeVerticalIntoQuantaraJson,
} from './vertical-mapping';
