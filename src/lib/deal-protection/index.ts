/**
 * Track P — Deal Protection barrel export.
 *
 * Public surface for the Deal Protection engine. P1 ships smart-band
 * primitives + types only; P2 adds the clause classifier, P3 the
 * term-sheet parser + analyze API, P4 the investor reputation surface,
 * P5–P7 the multi-round dilution / WarRoom / negotiation rehearsal
 * extensions.
 */
export {
  type SmartBand,
  type SmartBandRecord,
  type RecommendedAction,
  SMART_BANDS_ORDERED,
} from './types';

export {
  SMART_BANDS,
  SMART_BANDS_BY_ID,
  SMART_BANDS_BY_ACTION,
} from './bands';

export {
  clampSmartScore,
  getSmartBand,
  getSmartBandRecord,
  getSmartBandRecordById,
  getSmartBandRecordByAction,
  bandsAgree,
} from './smart-score';
