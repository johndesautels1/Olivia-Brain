/**
 * Track P Session P4 — Investor Reputation seed loader.
 *
 * Idempotent upsert of `INVESTOR_SEED_DATA`. Re-running the loader is
 * safe — every entry is keyed by `name` (UNIQUE) and the loader
 * preserves operator edits (it only writes the seeded fields, not
 * `isActive` / `isArchived` / `notes` once a row exists).
 *
 * Used by:
 *   - `POST /api/admin/investors/seed` — admin endpoint to (re-)seed.
 *   - Local dev / migration scripts (call directly).
 */
import { Prisma } from '@prisma/client';

import prisma from '@/lib/db/client';

import { INVESTOR_SEED_DATA } from './investor-seed';
import { toInvestorSlug, type InvestorReputationWrite } from './investor-types';

function asJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return (value ?? Prisma.JsonNull) as Prisma.InputJsonValue | typeof Prisma.JsonNull;
}

export interface SeedSummary {
  /** Total seed rows attempted. */
  readonly attempted: number;
  /** Number of rows freshly created. */
  readonly created: number;
  /** Number of rows updated (already existed by name). */
  readonly updated: number;
}

/**
 * Apply the seed list to `investor_reputations`. Returns a summary of
 * what was created vs updated. Always resolves on the happy path.
 */
export async function applyInvestorSeed(): Promise<SeedSummary> {
  let created = 0;
  let updated = 0;

  for (const entry of INVESTOR_SEED_DATA) {
    const slug = toInvestorSlug(entry.name);
    const existing = await prisma.investorReputation.findUnique({
      where: { name: entry.name },
      select: { id: true },
    });

    if (existing) {
      await prisma.investorReputation.update({
        where: { name: entry.name },
        data: buildSeedUpdate(entry),
      });
      updated += 1;
    } else {
      await prisma.investorReputation.create({
        data: buildSeedCreate(entry, slug),
      });
      created += 1;
    }
  }

  return {
    attempted: INVESTOR_SEED_DATA.length,
    created,
    updated,
  };
}

function buildSeedCreate(
  entry: InvestorReputationWrite,
  slug: string,
): Prisma.InvestorReputationCreateInput {
  return {
    name: entry.name,
    slug,
    investorType: entry.investorType,
    geographicFocus: entry.geographicFocus ?? null,
    stageFocusJson: asJson(entry.stageFocus),
    sectorFocusJson: asJson(entry.sectorFocus),
    reputationScore: entry.reputationScore,
    reputationBand: entry.reputationBand,
    patternsJson: asJson(entry.patterns),
    notes: entry.notes ?? null,
    source: 'seed',
    isActive: true,
    isArchived: false,
  };
}

function buildSeedUpdate(
  entry: InvestorReputationWrite,
): Prisma.InvestorReputationUpdateInput {
  /* Update preserves admin edits to operational columns
     (`isActive`, `isArchived`, `notes`) — re-seeding only refreshes
     the canonical archetype data, not operator decisions. */
  return {
    investorType: entry.investorType,
    geographicFocus: entry.geographicFocus ?? null,
    stageFocusJson: asJson(entry.stageFocus),
    sectorFocusJson: asJson(entry.sectorFocus),
    reputationScore: entry.reputationScore,
    reputationBand: entry.reputationBand,
    patternsJson: asJson(entry.patterns),
  };
}
