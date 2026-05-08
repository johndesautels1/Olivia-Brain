/**
 * Quantara Q7 — personas barrel export.
 *
 * Public surface for cascade-synthesised founder + company personas.
 * Consumers (the `/api/founder-intake/personas` route, the IntakeForm
 * persona panel, future Pitch Deck / Business Plan generators) import
 * from here so the underlying file structure stays free to evolve.
 */
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
  type CombinedPersonaPayload,
  FounderPersonaPayloadSchema,
  CompanyPersonaPayloadSchema,
  CombinedPersonaPayloadSchema,
} from './types';

export {
  type PersonaSynthesisContext,
  buildPersonaSynthesisPrompt,
  buildMockPersonaPayload,
} from './prompts';

export { synthesizePersonas } from './synthesize';
