/**
 * Track P Session P4 — Investor Reputation type contracts.
 *
 * `InvestorReputation` rows live in `investor_reputations` (P1
 * migration 06). P4 ships the seed loader + admin CRUD + smart-score
 * integration; this file is the shared type surface used by the
 * route handlers, the lookup helper, the score-impact module, the
 * seed loader, and the admin UI.
 */
import { z } from 'zod';

import { SMART_BANDS_ORDERED, type SmartBand } from './types';

/** Discrete investor type. Stable; do not rename. */
export type InvestorType =
  | 'angel'
  | 'vc'
  | 'private_equity'
  | 'strategic'
  | 'family_office'
  | 'other';

export const INVESTOR_TYPES_ORDERED: ReadonlyArray<InvestorType> = Object.freeze([
  'angel',
  'vc',
  'private_equity',
  'strategic',
  'family_office',
  'other',
]);

/** Source provenance — where this row originated. */
export type InvestorReputationSource =
  | 'seed' // P4 initial seed
  | 'admin' // admin-created via CRUD
  | 'founder_submitted'; // public submission, awaiting moderation

export const INVESTOR_REPUTATION_SOURCES_ORDERED: ReadonlyArray<InvestorReputationSource> =
  Object.freeze(['seed', 'admin', 'founder_submitted']);

/** Slug helper — used both at write time and at lookup time. Case-insensitive, stable. */
export function toInvestorSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Zod shape for `InvestorReputation` write payloads. Used by:
 *   - admin CRUD POST/PATCH body validation
 *   - founder-submission POST body validation
 *   - seed loader payload validation
 *
 * Distinct from the Prisma row shape — accepts strings + arrays the
 * orchestrator coerces into the `Json` columns.
 */
export const InvestorReputationWriteSchema = z.object({
  name: z.string().min(2).max(80),
  investorType: z.enum(
    INVESTOR_TYPES_ORDERED as unknown as readonly [InvestorType, ...InvestorType[]],
  ),
  geographicFocus: z.string().min(2).max(120).optional(),
  stageFocus: z.array(z.string().min(2).max(40)).max(10).optional(),
  sectorFocus: z.array(z.string().min(2).max(40)).max(20).optional(),
  reputationScore: z.number().min(0).max(100),
  reputationBand: z.enum(
    SMART_BANDS_ORDERED as unknown as readonly [SmartBand, ...SmartBand[]],
  ),
  patterns: z.array(z.string().min(2).max(80)).max(20).optional(),
  notes: z.string().max(2000).optional(),
});

export type InvestorReputationWrite = z.infer<typeof InvestorReputationWriteSchema>;

/** Patch shape — every field optional except `name` is forbidden. */
export const InvestorReputationPatchSchema =
  InvestorReputationWriteSchema.omit({ name: true })
    .partial()
    .extend({
      isActive: z.boolean().optional(),
      isArchived: z.boolean().optional(),
    });

export type InvestorReputationPatch = z.infer<typeof InvestorReputationPatchSchema>;

/** Read shape — what the API returns to clients (Prisma Decimal coerced to number). */
export interface InvestorReputationRecord {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly investorType: InvestorType;
  readonly geographicFocus?: string | null;
  readonly stageFocus?: ReadonlyArray<string>;
  readonly sectorFocus?: ReadonlyArray<string>;
  readonly reputationScore: number;
  readonly reputationBand: SmartBand;
  readonly patterns?: ReadonlyArray<string>;
  readonly notes?: string | null;
  readonly source: InvestorReputationSource;
  readonly isActive: boolean;
  readonly isArchived: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Lookup result attached to a `DealRiskReport`. Surfaces matched
 * investors (with their reputation snapshot) AND a list of names the
 * parser extracted but the DB had no record for — useful for the UI
 * to show a "submit reputation for these investors?" prompt.
 */
export interface InvestorReputationLookup {
  /** Original parser-extracted investor names. */
  readonly extractedNames: ReadonlyArray<string>;
  /** Matched records (one per matched name). */
  readonly matched: ReadonlyArray<InvestorReputationRecord>;
  /** Names that didn't match any active record. */
  readonly unmatchedNames: ReadonlyArray<string>;
  /** Average reputation score across matched records — null when no matches. */
  readonly averageReputationScore: number | null;
  /** Reputation tilt (-REPUTATION_TILT_MAX … +REPUTATION_TILT_MAX). 0 when no matches. */
  readonly reputationTilt: number;
}
