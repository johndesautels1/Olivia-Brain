/**
 * Quantara metamorphic — supplementary field catalog.
 *
 * # What this is
 *
 * 18 round-type-specific fields that mount on top of the canonical 56
 * when a matching `f23 — Target Round Type` is selected. Each round type
 * owns 3 supplementary fields covering the deal-specific signals investors
 * at that stage care about (term-sheet structure, board composition,
 * acquirer interest, etc.).
 *
 * # Why supplementary, not extending the canonical 56
 *
 * Founder direction 2026-05-07: keep the canonical 56-field invariant
 * stable so the "FIELD N/56" header chip, completeness math, and Q3 / Q4
 * cascades stay simple. Round-specific fields get their own block, their
 * own counter ("Round-specific signal: M/3"), and their own storage
 * namespace under `quantaraJson.supplementary[roundType]`.
 *
 * # Why these particular 18 fields
 *
 * Drawn from the LTM `TIER_SYSTEM.md` § "Capital Partner Matching" plus
 * the deal-protection schema in `D:\Deal_Doc_Engine`. Each field is a
 * signal an investor at that stage would expect to see — answers feed
 * Track P (Deal Protection Engine, Sessions P1–P7) when it lands.
 *
 * # Field-id stability
 *
 * Once shipped, a supplementary field id (`s1`..`s18`) is permanent.
 * Adding a 19th field uses `s19` even if a prior `s14` is later
 * deprecated. Renaming is forbidden — Composio auto-fill (Q5+ extension),
 * voice capture (Q7), and Track P consume these by id.
 */
import { z } from 'zod';

import {
  type SupplementaryFieldDefinition,
  QUANTARA_SUPPLEMENTARY_FIELD_COUNT,
  type SupplementaryFieldId,
} from './types';
import type { TargetRoundType } from '../types';

// ── Helper schemas (re-derived locally — keeps the file self-contained) ──

const NonNegativeNumber = z.number().nonnegative().finite();
const Pct0to100 = z.number().finite().min(0).max(100);
const ShortText = z.string().min(1).max(500);
const LongText = z.string().min(1).max(1000);

// ── Enum option lists ──────────────────────────────────────────────────

const LEAD_INVESTOR_STATUS_OPTIONS = [
  { value: 'no_commits', label: 'No commits yet' },
  { value: 'soft_commits', label: 'Soft commits in conversation' },
  { value: 'lead_identified', label: 'Lead identified, not yet committed' },
  { value: 'lead_committed', label: 'Lead committed' },
] as const;

const SERIES_A_LEAD_STATUS_OPTIONS = [
  { value: 'none', label: 'No lead investor yet' },
  { value: 'exploring', label: 'Exploring leads' },
  { value: 'term_sheet_received', label: 'Term sheet received' },
] as const;

const LIQ_PREF_OPTIONS = [
  { value: '1x_non_participating', label: '1x non-participating' },
  { value: '1x_participating', label: '1x participating' },
  { value: 'gt1x_non_participating', label: '> 1x non-participating' },
  { value: 'gt1x_participating', label: '> 1x participating' },
] as const;

const ANTI_DILUTION_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'wa_broad', label: 'Weighted average — broad-based' },
  { value: 'wa_narrow', label: 'Weighted average — narrow-based' },
  { value: 'full_ratchet', label: 'Full ratchet' },
] as const;

const TRANCHE_OPTIONS = [
  { value: 'single', label: 'Single tranche' },
  { value: 'multi_milestone', label: 'Multi-tranche, milestone-gated' },
] as const;

const IPO_READINESS_OPTIONS = [
  { value: 'audited_financials', label: 'Audited financials' },
  { value: 's1_prep', label: 'S-1 preparation underway' },
  { value: 'internal_controls', label: 'Internal controls (SOX)' },
  { value: 'investor_relations', label: 'Investor-relations function' },
] as const;

const ACQUIRER_INTEREST_OPTIONS = [
  { value: 'outbound_exploratory', label: 'Outbound — exploratory' },
  { value: 'inbound_preliminary', label: 'Inbound — preliminary' },
  { value: 'inbound_term_sheet', label: 'Inbound — term sheet received' },
] as const;

const STRATEGIC_SYNERGY_OPTIONS = [
  { value: 'technology', label: 'Technology' },
  { value: 'market_access', label: 'Market access' },
  { value: 'team', label: 'Team' },
  { value: 'customer_base', label: 'Customer base' },
  { value: 'ip', label: 'IP' },
  { value: 'geographic', label: 'Geographic footprint' },
] as const;

// ── Helpers to derive Zod from the inline option lists ─────────────────

/**
 * Build a Zod enum schema from a readonly OPTIONS array. Zod v4's
 * `z.enum()` expects a literal tuple of strings; the cast through
 * `unknown` lets the runtime polymorphism work without losing the
 * `string` value-type guarantee at the schema boundary.
 */
function enumFrom(
  options: ReadonlyArray<{ value: string; label: string }>,
): z.ZodType<string> {
  const values = options.map((o) => o.value);
  return z.enum(values as unknown as readonly [string, ...string[]]);
}

function multiEnumFrom(
  options: ReadonlyArray<{ value: string; label: string }>,
): z.ZodType<string[]> {
  return z.array(enumFrom(options));
}

// ── The 18 supplementary fields ────────────────────────────────────────

/**
 * Canonical supplementary catalog. 3 fields per round type × 6 round
 * types = 18. Display order within each round type is the array order.
 */
export const QUANTARA_SUPPLEMENTARY_FIELDS: ReadonlyArray<SupplementaryFieldDefinition> =
  Object.freeze([
    // ── Seed (3) ───────────────────────────────────────────────────────
    {
      id: 's1',
      roundType: 'Seed',
      subkey: 'leadInvestorStatus',
      label: 'Lead Investor Status',
      description: 'How committed are your potential lead investors today?',
      weight: 3,
      control: 'select-enum',
      options: LEAD_INVESTOR_STATUS_OPTIONS,
      schema: enumFrom(LEAD_INVESTOR_STATUS_OPTIONS),
    },
    {
      id: 's2',
      roundType: 'Seed',
      subkey: 'convertibleSafeTermsText',
      label: 'Convertible / SAFE Terms',
      description:
        'Cap, discount, MFN, pro-rata. Free text — Olivia parses key terms in Track P.',
      hint: 'e.g. £8M cap, 20% discount, MFN, pro-rata to lead',
      weight: 2,
      control: 'long-text',
      schema: LongText,
    },
    {
      id: 's3',
      roundType: 'Seed',
      subkey: 'founderPersonalRunwayMonths',
      label: 'Founder Personal Capital Runway',
      description: 'Months of personal runway you can self-fund if the round delays.',
      hint: 'Signal of founder commitment to seed investors',
      weight: 1,
      control: 'integer',
      unitLabel: 'months',
      schema: NonNegativeNumber,
    },

    // ── Series A (3) ───────────────────────────────────────────────────
    {
      id: 's4',
      roundType: 'Series A',
      subkey: 'leadInvestorIdentified',
      label: 'Lead Investor Identified',
      description: 'Where are you in lead-investor discovery?',
      weight: 3,
      control: 'select-enum',
      options: SERIES_A_LEAD_STATUS_OPTIONS,
      schema: enumFrom(SERIES_A_LEAD_STATUS_OPTIONS),
    },
    {
      id: 's5',
      roundType: 'Series A',
      subkey: 'boardSeatComposition',
      label: 'Board Seat Composition',
      description:
        'Current and target board structure: founder / investor / independent split.',
      hint: 'e.g. 2 founder, 1 investor, 1 independent',
      weight: 2,
      control: 'text',
      schema: ShortText,
    },
    {
      id: 's6',
      roundType: 'Series A',
      subkey: 'liquidationPreference',
      label: 'Liquidation Preference (asked or offered)',
      description: 'Standard Series A is 1x non-participating.',
      weight: 3,
      control: 'select-enum',
      options: LIQ_PREF_OPTIONS,
      schema: enumFrom(LIQ_PREF_OPTIONS),
    },

    // ── Series B (3) ───────────────────────────────────────────────────
    {
      id: 's7',
      roundType: 'Series B',
      subkey: 'antiDilutionProvision',
      label: 'Anti-Dilution Provision',
      description: 'Founder-friendly default is broad-based weighted average or none.',
      weight: 3,
      control: 'select-enum',
      options: ANTI_DILUTION_OPTIONS,
      schema: enumFrom(ANTI_DILUTION_OPTIONS),
    },
    {
      id: 's8',
      roundType: 'Series B',
      subkey: 'proRataParticipationPct',
      label: 'Pro-Rata Rights — Existing Investors',
      description:
        'Percentage of this round earmarked for existing investors exercising pro-rata.',
      weight: 2,
      control: 'percent',
      unitLabel: '%',
      step: 0.5,
      schema: Pct0to100,
    },
    {
      id: 's9',
      roundType: 'Series B',
      subkey: 'trancheStructure',
      label: 'Tranche Structure',
      description: 'Single tranche on close, or milestone-gated tranches?',
      weight: 2,
      control: 'select-enum',
      options: TRANCHE_OPTIONS,
      schema: enumFrom(TRANCHE_OPTIONS),
    },

    // ── Series C (3) ───────────────────────────────────────────────────
    {
      id: 's10',
      roundType: 'Series C',
      subkey: 'strategicMixPct',
      label: 'Strategic vs Financial Investor Mix',
      description: 'Percentage of this round expected to come from strategic investors.',
      weight: 2,
      control: 'percent',
      unitLabel: '% strategic',
      step: 0.5,
      schema: Pct0to100,
    },
    {
      id: 's11',
      roundType: 'Series C',
      subkey: 'ipoReadinessIndicators',
      label: 'IPO Readiness Indicators',
      description: 'Which readiness milestones are in place today?',
      weight: 3,
      control: 'multi-select-enum',
      options: IPO_READINESS_OPTIONS,
      schema: multiEnumFrom(IPO_READINESS_OPTIONS),
    },
    {
      id: 's12',
      roundType: 'Series C',
      subkey: 'existingInvestorReUpRatePct',
      label: 'Existing Investor Re-Up Rate',
      description:
        'Percentage of existing capital re-investing — strong signal for crossover funds.',
      weight: 2,
      control: 'percent',
      unitLabel: '%',
      step: 0.5,
      schema: Pct0to100,
    },

    // ── Growth (3) ─────────────────────────────────────────────────────
    {
      id: 's13',
      roundType: 'Growth',
      subkey: 'pikDividendTermsText',
      label: 'PIK / Dividend Terms',
      description: 'Cumulative %, payment-in-kind structure, conversion triggers.',
      hint: 'e.g. 8% cumulative PIK, paid at exit',
      weight: 2,
      control: 'long-text',
      schema: LongText,
    },
    {
      id: 's14',
      roundType: 'Growth',
      subkey: 'debtComponentPct',
      label: 'Debt Component',
      description: 'Percentage of round structured as debt vs preferred equity.',
      weight: 2,
      control: 'percent',
      unitLabel: '% debt',
      step: 0.5,
      schema: Pct0to100,
    },
    {
      id: 's15',
      roundType: 'Growth',
      subkey: 'secondarySaleWindowPct',
      label: 'Secondary Sale Window',
      description:
        'Percentage of round earmarked for founder / employee secondary liquidity.',
      weight: 1,
      control: 'percent',
      unitLabel: '%',
      step: 0.5,
      schema: Pct0to100,
    },

    // ── Strategic (3) ──────────────────────────────────────────────────
    {
      id: 's16',
      roundType: 'Strategic',
      subkey: 'acquirerInterestLevel',
      label: 'Acquirer Interest Level',
      description: 'Where are you in the strategic conversation today?',
      weight: 3,
      control: 'select-enum',
      options: ACQUIRER_INTEREST_OPTIONS,
      schema: enumFrom(ACQUIRER_INTEREST_OPTIONS),
    },
    {
      id: 's17',
      roundType: 'Strategic',
      subkey: 'earnoutHoldbackPct',
      label: 'Earnout / Holdback Structure',
      description: 'Percentage of consideration deferred against post-close milestones.',
      weight: 2,
      control: 'percent',
      unitLabel: '% deferred',
      step: 0.5,
      schema: Pct0to100,
    },
    {
      id: 's18',
      roundType: 'Strategic',
      subkey: 'strategicSynergyAreas',
      label: 'Strategic Synergy Areas',
      description: 'Where does the strategic see synergy with your business?',
      weight: 2,
      control: 'multi-select-enum',
      options: STRATEGIC_SYNERGY_OPTIONS,
      schema: multiEnumFrom(STRATEGIC_SYNERGY_OPTIONS),
    },
  ]);

// ── Defensive runtime invariants ───────────────────────────────────────

if (QUANTARA_SUPPLEMENTARY_FIELDS.length !== QUANTARA_SUPPLEMENTARY_FIELD_COUNT) {
  throw new Error(
    `Quantara supplementary field count drift: array has ` +
      `${QUANTARA_SUPPLEMENTARY_FIELDS.length}, expected ` +
      `${QUANTARA_SUPPLEMENTARY_FIELD_COUNT}.`,
  );
}

// ── Lookup tables ──────────────────────────────────────────────────────

/** Lookup a supplementary field by id. */
export const QUANTARA_SUPPLEMENTARY_BY_ID: Readonly<
  Record<SupplementaryFieldId, SupplementaryFieldDefinition>
> = Object.freeze(
  Object.fromEntries(
    QUANTARA_SUPPLEMENTARY_FIELDS.map((f) => [f.id, f] as const),
  ) as Record<SupplementaryFieldId, SupplementaryFieldDefinition>,
);

/** Get all supplementary fields owned by a given round type, in order. */
export function getSupplementaryFieldsForRound(
  roundType: TargetRoundType,
): ReadonlyArray<SupplementaryFieldDefinition> {
  return QUANTARA_SUPPLEMENTARY_FIELDS.filter((f) => f.roundType === roundType);
}

// ── Per-round Zod schema ───────────────────────────────────────────────

/**
 * Composite Zod schema validating the supplementary values for one round
 * type. Every field optional — partial completion is a first-class state
 * (matches the canonical schema's policy in `../schema.ts`).
 */
export function buildSupplementaryValuesSchema(
  roundType: TargetRoundType,
): z.ZodObject<Record<string, z.ZodOptional<z.ZodType>>> {
  const fields = getSupplementaryFieldsForRound(roundType);
  const shape = Object.fromEntries(
    fields.map((f) => [f.id, f.schema.optional()] as const),
  );
  return z.object(shape);
}

/**
 * Schema validating the full multi-round supplementary values map. Each
 * round type's slot is optional; within a slot, every field is optional.
 */
export const SupplementaryValuesSchema = z.object({
  Seed: buildSupplementaryValuesSchema('Seed').optional(),
  'Series A': buildSupplementaryValuesSchema('Series A').optional(),
  'Series B': buildSupplementaryValuesSchema('Series B').optional(),
  'Series C': buildSupplementaryValuesSchema('Series C').optional(),
  Growth: buildSupplementaryValuesSchema('Growth').optional(),
  Strategic: buildSupplementaryValuesSchema('Strategic').optional(),
});
