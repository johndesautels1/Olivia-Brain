/**
 * Track P Session P4 — Investor Reputation seed list.
 *
 * P1 deferred the original seed (LTM `investor_db.json` doesn't exist
 * in OB). P4 ships ~15 fully-anonymized archetype entries spanning all
 * five smart bands. Admins curate real London-ecosystem entries via
 * `/admin/investors` after the seed lands.
 *
 * # Why archetypes only
 *
 * Naming specific firms with low reputation scores carries real
 * defamation risk. The seed is a starting set of TEMPLATES the admin
 * can clone and rename — every record has a `notes` field that says
 * exactly that. Real-world reputation data is operator-curated.
 *
 * # Idempotency
 *
 * The seed loader uses `name`-keyed upsert so re-running the seed is
 * safe. Admins can also delete seed rows (soft-delete via
 * `isArchived`) without affecting the seed function.
 */
import type { InvestorReputationWrite } from './investor-types';

type InvestorSeedRecord = InvestorReputationWrite;

const SEED_NOTE =
  'Anonymized archetype seeded by P4 — replace with a verified real-world entry before going to production.';

/**
 * Fully-anonymized archetypes spanning all 5 smart bands. 15 entries:
 * 3 per band. Names follow `<Posture> <Stage> Archetype` so admins
 * can quickly recognize templates vs curated entries.
 */
export const INVESTOR_SEED_DATA: ReadonlyArray<InvestorSeedRecord> = Object.freeze([
  // ── Green band (80-100) — founder-friendly ────────────────────────
  {
    name: 'Founder-Friendly Seed Fund (Archetype)',
    investorType: 'vc',
    geographicFocus: 'UK + EU',
    stageFocus: ['seed', 'series_a'],
    sectorFocus: ['general'],
    reputationScore: 92,
    reputationBand: 'green',
    patterns: ['standard_1x_liq_pref', 'broad_based_anti_dilution', 'minimal_veto'],
    notes: SEED_NOTE,
  },
  {
    name: 'Long-Horizon Family Office (Archetype)',
    investorType: 'family_office',
    geographicFocus: 'Global',
    stageFocus: ['series_a', 'series_b'],
    sectorFocus: ['general'],
    reputationScore: 88,
    reputationBand: 'green',
    patterns: ['standard_terms', 'patient_capital'],
    notes: SEED_NOTE,
  },
  {
    name: 'Active-Founder Angel Syndicate (Archetype)',
    investorType: 'angel',
    geographicFocus: 'London',
    stageFocus: ['pre_seed', 'seed'],
    sectorFocus: ['general'],
    reputationScore: 84,
    reputationBand: 'green',
    patterns: ['founder_friendly_safes', 'no_pro_rata_demands'],
    notes: SEED_NOTE,
  },
  // ── Blue band (60-79) — standard / market norms ────────────────────
  {
    name: 'Tier-1 Series A Lead (Archetype)',
    investorType: 'vc',
    geographicFocus: 'UK + EU + US',
    stageFocus: ['series_a', 'series_b'],
    sectorFocus: ['general'],
    reputationScore: 72,
    reputationBand: 'blue',
    patterns: ['standard_1x_liq_pref', 'pro_rata_rights', 'one_board_seat'],
    notes: SEED_NOTE,
  },
  {
    name: 'Generalist Series B Co-Lead (Archetype)',
    investorType: 'vc',
    geographicFocus: 'UK + EU',
    stageFocus: ['series_b', 'series_c'],
    sectorFocus: ['general'],
    reputationScore: 68,
    reputationBand: 'blue',
    patterns: ['standard_terms', 'follow_on_friendly'],
    notes: SEED_NOTE,
  },
  {
    name: 'Strategic Corporate VC — Hands-Off (Archetype)',
    investorType: 'strategic',
    geographicFocus: 'Global',
    stageFocus: ['series_a', 'series_b', 'series_c'],
    sectorFocus: ['general'],
    reputationScore: 62,
    reputationBand: 'blue',
    patterns: ['observer_seat', 'limited_veto'],
    notes: SEED_NOTE,
  },
  // ── Yellow band (40-59) — mixed ────────────────────────────────────
  {
    name: 'Mid-Market Series B Lead (Archetype)',
    investorType: 'vc',
    geographicFocus: 'UK + EU',
    stageFocus: ['series_b'],
    sectorFocus: ['general'],
    reputationScore: 52,
    reputationBand: 'yellow',
    patterns: ['1x_participating_liq_pref', 'broader_veto', 'two_board_seats'],
    notes: SEED_NOTE,
  },
  {
    name: 'Strategic Corporate VC — Hands-On (Archetype)',
    investorType: 'strategic',
    geographicFocus: 'Global',
    stageFocus: ['series_b', 'series_c'],
    sectorFocus: ['general'],
    reputationScore: 48,
    reputationBand: 'yellow',
    patterns: ['ip_first_refusal', 'commercial_tie_in'],
    notes: SEED_NOTE,
  },
  {
    name: 'Late-Stage Crossover Investor (Archetype)',
    investorType: 'vc',
    geographicFocus: 'Global',
    stageFocus: ['series_c', 'growth'],
    sectorFocus: ['general'],
    reputationScore: 44,
    reputationBand: 'yellow',
    patterns: ['ratchet_protection', 'mfn_clause'],
    notes: SEED_NOTE,
  },
  // ── Orange band (20-39) — aggressive ───────────────────────────────
  {
    name: 'Aggressive Growth Equity (Archetype)',
    investorType: 'private_equity',
    geographicFocus: 'Global',
    stageFocus: ['growth'],
    sectorFocus: ['general'],
    reputationScore: 32,
    reputationBand: 'orange',
    patterns: ['2x_liq_pref', 'aggressive_anti_dilution', 'multiple_veto_rights'],
    notes: SEED_NOTE,
  },
  {
    name: 'Tranched Series A Lead (Archetype)',
    investorType: 'vc',
    geographicFocus: 'UK + EU',
    stageFocus: ['series_a'],
    sectorFocus: ['general'],
    reputationScore: 28,
    reputationBand: 'orange',
    patterns: ['multi_tranche_milestone_gated', 'founder_share_repurchase'],
    notes: SEED_NOTE,
  },
  {
    name: 'Aggressive Buyout — Mid-Market (Archetype)',
    investorType: 'private_equity',
    geographicFocus: 'UK',
    stageFocus: ['strategic'],
    sectorFocus: ['general'],
    reputationScore: 24,
    reputationBand: 'orange',
    patterns: ['large_earnout', 'long_non_compete', 'aggressive_indemnity'],
    notes: SEED_NOTE,
  },
  // ── Red band (0-19) — predatory ────────────────────────────────────
  {
    name: 'Predatory Buyout — High-Leverage (Archetype)',
    investorType: 'private_equity',
    geographicFocus: 'Global',
    stageFocus: ['strategic'],
    sectorFocus: ['general'],
    reputationScore: 14,
    reputationBand: 'red',
    patterns: ['full_ratchet', 'punitive_bad_leaver', 'personal_indemnity'],
    notes: SEED_NOTE,
  },
  {
    name: 'Distressed-Debt Acquirer (Archetype)',
    investorType: 'private_equity',
    geographicFocus: 'Global',
    stageFocus: ['strategic'],
    sectorFocus: ['general'],
    reputationScore: 8,
    reputationBand: 'red',
    patterns: ['full_ratchet', 'investor_put_at_cost', 'global_non_compete'],
    notes: SEED_NOTE,
  },
  {
    name: 'Predatory Strategic Acquirer (Archetype)',
    investorType: 'strategic',
    geographicFocus: 'Global',
    stageFocus: ['strategic'],
    sectorFocus: ['general'],
    reputationScore: 4,
    reputationBand: 'red',
    patterns: ['par_value_repurchase', 'broad_ip_assignment', '24m_global_non_compete'],
    notes: SEED_NOTE,
  },
]);

// ── Defensive runtime invariants ───────────────────────────────────────

if (INVESTOR_SEED_DATA.length === 0) {
  throw new Error('INVESTOR_SEED_DATA must not be empty.');
}

/* Verify every band gets at least one seed entry — guards against
   future drift where someone trims a band off and the smart-score
   integration tests still pass against a partial seed. */
{
  const bandsCovered = new Set(INVESTOR_SEED_DATA.map((r) => r.reputationBand));
  for (const band of ['red', 'orange', 'yellow', 'blue', 'green'] as const) {
    if (!bandsCovered.has(band)) {
      throw new Error(`INVESTOR_SEED_DATA missing entry for band '${band}'.`);
    }
  }
}

/* Verify reputationScore lands inside the declared band. Mirrors the
   P2 calibration check on clause severity↔toxicity ranges. */
{
  const SMART_BAND_RANGE: Record<string, { min: number; max: number }> = {
    red: { min: 0, max: 19 },
    orange: { min: 20, max: 39 },
    yellow: { min: 40, max: 59 },
    blue: { min: 60, max: 79 },
    green: { min: 80, max: 100 },
  };
  for (const r of INVESTOR_SEED_DATA) {
    const range = SMART_BAND_RANGE[r.reputationBand];
    if (r.reputationScore < range.min || r.reputationScore > range.max) {
      throw new Error(
        `INVESTOR_SEED_DATA entry '${r.name}' has reputationScore=${r.reputationScore} outside band '${r.reputationBand}' (${range.min}-${range.max}).`,
      );
    }
  }
}

/* Verify name uniqueness — `investor_reputations.name` is a UNIQUE
   index in the schema, so duplicate names would fail at upsert time
   (or, worse, silently re-target the same row twice). */
{
  const seen = new Set<string>();
  for (const r of INVESTOR_SEED_DATA) {
    if (seen.has(r.name)) {
      throw new Error(`INVESTOR_SEED_DATA has duplicate name '${r.name}'.`);
    }
    seen.add(r.name);
  }
}
