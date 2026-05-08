/**
 * Quantara Q7 — persona synthesis type contracts.
 *
 * # What this is
 *
 * The Q7 cascade ingests a fully-completed Quantara intake (canonical 56
 * + Q5 supplementary + Q6 vertical schedule) and emits two coherent
 * persona records in a single synthesis call:
 *
 *   - **FounderPersonaPayload** — built from team / risk / projections /
 *     strategic + the active round-axis supplementary entries.
 *   - **CompanyPersonaPayload** — built from financials / market / IP /
 *     capital + the active vertical schedule.
 *
 * The two are emitted together so the company-persona's narrative
 * doesn't drift from the founder's archetype. Downstream consumers
 * (Pitch Deck Studio, Business Plan generator, Marketing — when those
 * tracks land) read these to anchor founder-narrative-driven content.
 *
 * # Why two records, not one combined
 *
 * Different consumers need different slices: a Pitch Deck slide
 * referencing "the founder's archetype" is a clean per-record join,
 * not a JSON dive. Splitting also lets BEE invalidate one without the
 * other (e.g. Q5 supplementary change → founder persona stale; Q6
 * vertical change → company persona stale).
 *
 * # Schema versioning
 *
 * `PERSONA_SCHEMA_VERSION` is bumped when a non-additive prompt /
 * payload change ships. Records carry their own version so
 * downstream consumers can either auto-upgrade or surface a
 * "regenerate to use new fields" hint.
 */
import { z } from 'zod';

/**
 * Stable schema version for the persona payload. Bumped on
 * non-additive changes (renaming / removing fields). Additive changes
 * (new optional fields) keep the same version.
 */
export const PERSONA_SCHEMA_VERSION = 1 as const;

// ── Founder persona ────────────────────────────────────────────────────

/** Founder archetype enum — bounded so downstream consumers can switch. */
export const FOUNDER_ARCHETYPE_VALUES = [
  'technical_visionary',
  'operator_ceo',
  'sales_first_founder',
  'domain_expert',
  'serial_entrepreneur',
  'first_time_founder',
] as const;
export type FounderArchetype = (typeof FOUNDER_ARCHETYPE_VALUES)[number];

export const RISK_TOLERANCE_VALUES = ['low', 'medium', 'high'] as const;
export type RiskTolerance = (typeof RISK_TOLERANCE_VALUES)[number];

export const FounderPersonaPayloadSchema = z.object({
  summary: z.string().min(20).max(2000),
  narrativeAngle: z.string().min(8).max(280),
  strengths: z.array(z.string().min(2).max(280)).min(2).max(8),
  workingStyle: z.string().min(8).max(500),
  archetype: z.enum(FOUNDER_ARCHETYPE_VALUES),
  riskTolerance: z.enum(RISK_TOLERANCE_VALUES),
  gaps: z.array(z.string().min(2).max(280)).min(0).max(6),
  openQuestions: z.array(z.string().min(2).max(280)).min(0).max(6),
});
export type FounderPersonaPayload = z.infer<typeof FounderPersonaPayloadSchema>;

// ── Company persona ────────────────────────────────────────────────────

export const CompanyPersonaPayloadSchema = z.object({
  summary: z.string().min(20).max(2000),
  positioning: z.string().min(8).max(500),
  tractionStory: z.string().min(20).max(1500),
  differentiators: z.array(z.string().min(2).max(280)).min(2).max(8),
  idealCustomer: z.string().min(4).max(280),
  defensibility: z.string().min(8).max(500),
  watchOuts: z.array(z.string().min(2).max(280)).min(0).max(6),
  openQuestions: z.array(z.string().min(2).max(280)).min(0).max(6),
});
export type CompanyPersonaPayload = z.infer<typeof CompanyPersonaPayloadSchema>;

// ── Combined synthesis result ──────────────────────────────────────────

export interface PersonaSynthesisAttempt {
  readonly providerId: string;
  readonly modelId: string;
  readonly success: boolean;
  readonly durationMs: number;
}

/**
 * Combined output of one Q7 synthesis call. Both personas plus the
 * cascade trail (which providers contributed) and the runtime mode.
 */
export interface PersonaSynthesisResult {
  readonly founder: FounderPersonaPayload;
  readonly company: CompanyPersonaPayload;
  readonly providerId: string;
  readonly modelId: string;
  readonly runtimeMode: 'live' | 'mock';
  readonly attempts: ReadonlyArray<PersonaSynthesisAttempt>;
  readonly schemaVersion: number;
}

/**
 * The combined Zod schema used to validate a cascade response. Used
 * by `synthesize.ts` to safe-parse the model's JSON output.
 */
export const CombinedPersonaPayloadSchema = z.object({
  founder: FounderPersonaPayloadSchema,
  company: CompanyPersonaPayloadSchema,
});
export type CombinedPersonaPayload = z.infer<typeof CombinedPersonaPayloadSchema>;
