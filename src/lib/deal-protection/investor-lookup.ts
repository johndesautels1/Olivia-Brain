/**
 * Track P Session P4 — Investor Reputation lookup helper.
 *
 * Maps parser-extracted investor names → matched `InvestorReputation`
 * records via the deterministic slug computed by `toInvestorSlug`.
 * Returns the full `InvestorReputationLookup` shape including the
 * unmatched-name list (for the UI's "submit a reputation entry"
 * prompt) and the precomputed reputation tilt.
 *
 * Deliberately tolerant of an empty / missing table — a deployment
 * without the seed loaded returns `{ matched: [], averageReputationScore: null,
 * reputationTilt: 0 }` and the analyzer continues uninfluenced.
 */
import prisma from '@/lib/db/client';

/**
 * Local Decimal alias — Prisma's runtime Decimal exposes `toNumber()`
 * but the type isn't reliably re-exported across versions / adapters.
 * Declaring the structural minimum here avoids importing from
 * `@prisma/client/runtime/library` (which isn't a stable surface).
 */
interface PrismaDecimalLike {
  toNumber(): number;
}

import { computeReputationTilt } from './investor-score-impact';
import {
  toInvestorSlug,
  type InvestorReputationLookup,
  type InvestorReputationRecord,
  type InvestorReputationSource,
  type InvestorType,
} from './investor-types';
import type { SmartBand } from './types';

/**
 * Look up active reputation records by parser-extracted names.
 * De-duplicates input names, returns at most one record per unique
 * slug, and computes the reputation tilt for the matched set.
 *
 * Never throws on the happy path — a Prisma-level failure is logged
 * and treated as "no matches" so the analyzer continues without a tilt.
 */
export async function lookupInvestorReputations(
  names: ReadonlyArray<string>,
): Promise<InvestorReputationLookup> {
  if (names.length === 0) {
    return {
      extractedNames: [],
      matched: [],
      unmatchedNames: [],
      averageReputationScore: null,
      reputationTilt: 0,
    };
  }

  /* Build slug → original-name map so we can report unmatched names
     exactly as the parser extracted them (preserving founder casing). */
  const slugToName = new Map<string, string>();
  for (const raw of names) {
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    const slug = toInvestorSlug(trimmed);
    if (slug.length === 0) continue;
    if (!slugToName.has(slug)) {
      slugToName.set(slug, trimmed);
    }
  }
  const slugs = Array.from(slugToName.keys());
  if (slugs.length === 0) {
    return {
      extractedNames: names,
      matched: [],
      unmatchedNames: [],
      averageReputationScore: null,
      reputationTilt: 0,
    };
  }

  let rows: PrismaInvestorReputationRow[] = [];
  try {
    rows = (await prisma.investorReputation.findMany({
      where: {
        slug: { in: slugs },
        isActive: true,
        isArchived: false,
      },
    })) as PrismaInvestorReputationRow[];
  } catch (err) {
    /* Reputation lookup is non-blocking — the analyzer still runs
       even if the table doesn't exist yet. Surface for ops via console. */
    console.warn(
      '[deal-protection/investor-lookup] Reputation lookup failed; continuing without tilt.',
      err instanceof Error ? err.message : err,
    );
    return {
      extractedNames: names,
      matched: [],
      unmatchedNames: Array.from(slugToName.values()),
      averageReputationScore: null,
      reputationTilt: 0,
    };
  }

  const matchedSlugs = new Set(rows.map((r) => r.slug));
  const matched = rows.map(toRecord);
  const unmatchedNames: string[] = [];
  for (const [slug, name] of slugToName) {
    if (!matchedSlugs.has(slug)) unmatchedNames.push(name);
  }

  const matchedScores = matched.map((m) => m.reputationScore);
  const averageReputationScore =
    matchedScores.length === 0
      ? null
      : matchedScores.reduce((acc, n) => acc + n, 0) / matchedScores.length;
  const reputationTilt = computeReputationTilt(matchedScores);

  return {
    extractedNames: names,
    matched,
    unmatchedNames,
    averageReputationScore,
    reputationTilt,
  };
}

/**
 * Convert a raw Prisma row to the `InvestorReputationRecord` shape
 * the API returns. Coerces `Decimal` → `number` and JSON columns →
 * `string[]` (matching the `InvestorReputationWrite` input shape).
 */
export function toRecord(row: PrismaInvestorReputationRow): InvestorReputationRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    investorType: row.investorType as InvestorType,
    geographicFocus: row.geographicFocus,
    stageFocus: jsonAsStringArray(row.stageFocusJson),
    sectorFocus: jsonAsStringArray(row.sectorFocusJson),
    reputationScore: decimalToNumber(row.reputationScore),
    reputationBand: row.reputationBand as SmartBand,
    patterns: jsonAsStringArray(row.patternsJson),
    notes: row.notes,
    source: row.source as InvestorReputationSource,
    isActive: row.isActive,
    isArchived: row.isArchived,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────
// Internals
// ─────────────────────────────────────────────────────────────────────

/**
 * Mirror of the Prisma-generated `InvestorReputation` row shape.
 * Declared here (instead of importing the generated type) so this
 * file can be unit-tested without instantiating Prisma.
 */
export interface PrismaInvestorReputationRow {
  id: string;
  name: string;
  slug: string;
  investorType: string;
  geographicFocus: string | null;
  stageFocusJson: unknown;
  sectorFocusJson: unknown;
  reputationScore: PrismaDecimalLike | number;
  reputationBand: string;
  patternsJson: unknown;
  notes: string | null;
  source: string;
  isActive: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function jsonAsStringArray(raw: unknown): ReadonlyArray<string> | undefined {
  if (raw == null) return undefined;
  if (!Array.isArray(raw)) return undefined;
  return raw.filter((v) => typeof v === 'string');
}

function decimalToNumber(raw: PrismaDecimalLike | number): number {
  if (typeof raw === 'number') return raw;
  const fn = (raw as { toNumber?: () => number }).toNumber;
  return typeof fn === 'function' ? fn.call(raw) : Number(raw);
}
