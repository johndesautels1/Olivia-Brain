/**
 * Quantara Q7 — voice barrel export.
 *
 * Public surface for the voice-extraction pipeline (transcript →
 * cascade → field suggestions). Consumers: the
 * `/api/founder-intake/voice-extract` route + tests.
 */
export {
  type VoiceExtractionItem,
  type VoiceExtractionPayload,
  type VoiceExtractionResult,
  VoiceExtractionItemSchema,
  VoiceExtractionPayloadSchema,
} from './types';

export {
  buildVoiceExtractionPrompt,
  extractFromTranscript,
} from './extract';
