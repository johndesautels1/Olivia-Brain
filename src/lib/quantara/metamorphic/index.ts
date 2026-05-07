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
