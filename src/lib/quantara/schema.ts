/**
 * Quantara — 56-field founder-valuation intake schema (canonical).
 *
 * # Origin
 *
 * Field set mirrors `D:\London-Tech-Map\public\assets\founder-valuation-form.html`
 * (1762-LOC HTML mockup, never built into LTM React) and the field-list
 * documentation in `D:\London-Tech-Map\docs\TIER_SYSTEM.md`
 * § "56-FIELD VALUATION INTAKE FORM". OB is the canonical implementation
 * per the June-8-demo strategy in `docs/BUILD_SEQUENCE.md`.
 *
 * # What's here
 *
 * - 56 `QuantaraFieldDefinition` records keyed by form id (`f1`..`f56`).
 * - `QUANTARA_FIELDS` ordered list — display order matches the LTM form.
 * - `QUANTARA_FIELDS_BY_ID` lookup map.
 * - `QUANTARA_FIELDS_BY_KEY` lookup map keyed by `field_map_key`.
 * - `QuantaraValuesSchema` — composite Zod object validating an entire
 *   answer payload (every field optional; partial completion is a
 *   first-class state).
 *
 * # Conventions
 *
 * - **Field-map keys are immutable.** Never rename. To deprecate, mark
 *   with `// @deprecated` and add a successor with a new key.
 * - **Currency** values are GBP (the LTM form is London-pitched). Stored
 *   as plain numbers; the Aurum/Aether UI renders the £ symbol.
 * - **Percentages** are stored as 0-100 unless otherwise noted (matches
 *   the LTM form's `<input id="fN" value="...">` numeric values).
 * - **Self-assessed 1–10 scores** (Network Effects, Key Person, Reg Risk)
 *   stay as integers for simplicity; the engine bridge maps them to its
 *   0-1 scale where needed.
 * - **No raw hex / no UI styling lives here.** Display chrome is Q2.
 */
import { z } from 'zod';
import type { BuyerType } from '../valuation/types';
import {
  type QuantaraFieldDefinition,
  type QuantaraFieldId,
  type QuantaraFieldMapKey,
  QUANTARA_FIELD_COUNT,
} from './types';

// ── Helper schemas ─────────────────────────────────────────────────────

/**
 * Currency value (GBP). Non-negative. Use this for amounts that cannot be
 * negative (revenue, raised capital, market sizes).
 */
const CurrencyGbpSchema = z.number().nonnegative().finite();

/**
 * Currency value (GBP) that may be negative (e.g. EBITDA in early-stage
 * loss-making companies).
 */
const SignedCurrencyGbpSchema = z.number().finite();

/**
 * Percentage stored as a number (0..100 typical). Allows negative
 * (loss-making margins) and >100 (NRR, Expansion Revenue can both
 * legitimately exceed 100%).
 */
const PercentSchema = z.number().finite();

/**
 * Bounded percentage 0..100. Use where the field cannot legitimately
 * exceed 100 or go negative (Option Pool %, Churn %, Geographic share).
 */
const BoundedPercentSchema = z.number().finite().min(0).max(100);

/** Non-negative integer count (customers, contracts, MAU, etc.). */
const NonNegativeIntSchema = z.number().int().nonnegative();

/** Positive integer count (cap-table sanity: shares > 0). */
const PositiveIntSchema = z.number().int().positive();

/** Non-negative number (months, ratios, multiples). */
const NonNegativeNumberSchema = z.number().nonnegative().finite();

/** Self-assessed 1–10 integer score. */
const Score1to10Schema = z.number().int().min(1).max(10);

/**
 * Free-text string capped at 500 chars. Used for narrative descriptions
 * (proprietary dataset, regulatory approvals, geographic concentration).
 */
const ShortTextSchema = z.string().min(1).max(500);

/**
 * Free-text string capped at 1000 chars. Used for richer narrative
 * (previous exits with details).
 */
const LongTextSchema = z.string().min(1).max(1000);

/** Allowed values for `f21 — Last Round Type`. */
export const LastRoundTypeSchema = z.enum([
  'Pre-Seed',
  'Seed',
  'Series A',
  'Series B',
  'Series C+',
  'Bridge',
]);

/** Allowed values for `f23 — Target Round Type`. */
export const TargetRoundTypeSchema = z.enum([
  'Seed',
  'Series A',
  'Series B',
  'Series C',
  'Growth',
  'Strategic',
]);

// ── Investor-class relevance presets ───────────────────────────────────

/** Universally relevant — all five `BuyerType` values. */
const ALL_BUYERS: ReadonlyArray<BuyerType> = [
  'angel',
  'vc',
  'private_equity',
  'strategic_partner',
  'acquirer',
];

/** Early-stage-leaning (founders + early VCs care most). */
const EARLY_STAGE: ReadonlyArray<BuyerType> = ['angel', 'vc'];

/** Late-stage / control transactions. */
const LATE_AND_CONTROL: ReadonlyArray<BuyerType> = [
  'private_equity',
  'strategic_partner',
  'acquirer',
];

/** VC + late-stage strategic — typical for growth-driver fields. */
const GROWTH_AUDIENCE: ReadonlyArray<BuyerType> = [
  'vc',
  'private_equity',
  'strategic_partner',
];

// ── Field definitions ──────────────────────────────────────────────────

/**
 * The canonical 56 Quantara fields, in display order.
 *
 * Each entry is `QuantaraFieldDefinition<TValue>` where `TValue` is the
 * Zod-inferred runtime type. Adding a field requires:
 *   1. Increment the field id (`f57`+) and section's `fieldCount`.
 *   2. Update `QUANTARA_FIELD_COUNT` in `./types.ts`.
 *   3. Add the field-map key (`QUANT_<SECTION>_<NNN>`) — never reuse.
 *   4. Add a destination in `./field-mapping.ts`.
 *   5. Update tests in `./__tests__/`.
 */
export const QUANTARA_FIELDS: ReadonlyArray<QuantaraFieldDefinition> = [
  // ═════════════════════════════════════════════════════════════════════
  // § 1 — Core Financials (14 fields)
  // ═════════════════════════════════════════════════════════════════════
  {
    id: 'f1',
    fieldMapKey: 'QUANT_FIN_001' satisfies QuantaraFieldMapKey,
    section: 'core_financials',
    label: 'Annual Recurring Revenue (ARR)',
    description: 'Current run-rate annual recurring revenue in GBP.',
    hint: 'Current run-rate',
    weight: 3,
    investorClassRelevance: ALL_BUYERS,
    schema: CurrencyGbpSchema,
  },
  {
    id: 'f2',
    fieldMapKey: 'QUANT_FIN_002' satisfies QuantaraFieldMapKey,
    section: 'core_financials',
    label: 'Monthly Recurring Revenue (MRR)',
    description: 'Current monthly recurring revenue in GBP.',
    hint: 'ARR ÷ 12 (auto-suggested)',
    weight: 2,
    investorClassRelevance: ALL_BUYERS,
    schema: CurrencyGbpSchema,
  },
  {
    id: 'f3',
    fieldMapKey: 'QUANT_FIN_003' satisfies QuantaraFieldMapKey,
    section: 'core_financials',
    label: 'Revenue Growth Rate YoY',
    description: 'Year-over-year revenue growth as a percentage.',
    hint: 'Last 12 months',
    weight: 3,
    investorClassRelevance: ALL_BUYERS,
    schema: PercentSchema,
  },
  {
    id: 'f4',
    fieldMapKey: 'QUANT_FIN_004' satisfies QuantaraFieldMapKey,
    section: 'core_financials',
    label: 'Revenue Growth Rate MoM',
    description: 'Month-over-month revenue growth (3-month average).',
    hint: 'Last 3 months average',
    weight: 2,
    investorClassRelevance: EARLY_STAGE,
    schema: PercentSchema,
  },
  {
    id: 'f5',
    fieldMapKey: 'QUANT_FIN_005' satisfies QuantaraFieldMapKey,
    section: 'core_financials',
    label: 'Gross Margin',
    description: 'Gross margin as a percentage (after COGS).',
    hint: 'After COGS',
    weight: 3,
    investorClassRelevance: ALL_BUYERS,
    schema: PercentSchema,
  },
  {
    id: 'f6',
    fieldMapKey: 'QUANT_FIN_006' satisfies QuantaraFieldMapKey,
    section: 'core_financials',
    label: 'Net Margin',
    description: 'Net margin as a percentage (after all operating expenses).',
    hint: 'After all operating expenses',
    weight: 2,
    investorClassRelevance: LATE_AND_CONTROL,
    schema: PercentSchema,
  },
  {
    id: 'f7',
    fieldMapKey: 'QUANT_FIN_007' satisfies QuantaraFieldMapKey,
    section: 'core_financials',
    label: 'EBITDA',
    description: 'Trailing-12-month EBITDA in GBP. Negative is permitted for early-stage.',
    hint: 'Last 12 months',
    weight: 3,
    investorClassRelevance: ALL_BUYERS,
    schema: SignedCurrencyGbpSchema,
  },
  {
    id: 'f8',
    fieldMapKey: 'QUANT_FIN_008' satisfies QuantaraFieldMapKey,
    section: 'core_financials',
    label: 'Monthly Burn Rate',
    description: 'Cash outflow per month in GBP.',
    hint: 'Cash outflow per month',
    weight: 3,
    investorClassRelevance: EARLY_STAGE,
    schema: CurrencyGbpSchema,
  },
  {
    id: 'f9',
    fieldMapKey: 'QUANT_FIN_009' satisfies QuantaraFieldMapKey,
    section: 'core_financials',
    label: 'Cash Runway (months)',
    description: 'Months of operating runway at current burn rate.',
    hint: 'At current burn rate',
    weight: 3,
    investorClassRelevance: EARLY_STAGE,
    schema: NonNegativeNumberSchema,
  },
  {
    id: 'f10',
    fieldMapKey: 'QUANT_FIN_010' satisfies QuantaraFieldMapKey,
    section: 'core_financials',
    label: 'Customer Acquisition Cost (CAC)',
    description: 'Fully loaded customer acquisition cost in GBP.',
    hint: 'Fully loaded',
    weight: 2,
    investorClassRelevance: ALL_BUYERS,
    schema: CurrencyGbpSchema,
  },
  {
    id: 'f11',
    fieldMapKey: 'QUANT_FIN_011' satisfies QuantaraFieldMapKey,
    section: 'core_financials',
    label: 'Lifetime Value (LTV)',
    description: 'Gross LTV per customer in GBP.',
    hint: 'Gross LTV per customer',
    weight: 2,
    investorClassRelevance: ALL_BUYERS,
    schema: CurrencyGbpSchema,
  },
  {
    id: 'f12',
    fieldMapKey: 'QUANT_FIN_012' satisfies QuantaraFieldMapKey,
    section: 'core_financials',
    label: 'LTV:CAC Ratio',
    description: 'Lifetime value to acquisition cost ratio.',
    hint: 'Healthy SaaS targets ≥ 3:1',
    weight: 3,
    investorClassRelevance: ALL_BUYERS,
    schema: NonNegativeNumberSchema,
  },
  {
    id: 'f13',
    fieldMapKey: 'QUANT_FIN_013' satisfies QuantaraFieldMapKey,
    section: 'core_financials',
    label: 'Net Revenue Retention',
    description: 'NRR as a percentage (expansion + retention).',
    hint: 'NRR (expansion + retention)',
    weight: 3,
    investorClassRelevance: ALL_BUYERS,
    schema: PercentSchema,
  },
  {
    id: 'f14',
    fieldMapKey: 'QUANT_FIN_014' satisfies QuantaraFieldMapKey,
    section: 'core_financials',
    label: 'Gross Revenue Retention',
    description: 'GRR as a percentage (churn only, excludes expansion).',
    hint: 'GRR (churn only)',
    weight: 2,
    investorClassRelevance: ALL_BUYERS,
    schema: BoundedPercentSchema,
  },

  // ═════════════════════════════════════════════════════════════════════
  // § 2 — Capital Structure (4 fields)
  // ═════════════════════════════════════════════════════════════════════
  {
    id: 'f15',
    fieldMapKey: 'QUANT_CAP_001' satisfies QuantaraFieldMapKey,
    section: 'capital_structure',
    label: 'Cash on Hand',
    description: 'Cash on hand in GBP.',
    weight: 3,
    investorClassRelevance: ALL_BUYERS,
    schema: CurrencyGbpSchema,
  },
  {
    id: 'f16',
    fieldMapKey: 'QUANT_CAP_002' satisfies QuantaraFieldMapKey,
    section: 'capital_structure',
    label: 'Total Debt',
    description: 'Total outstanding debt in GBP.',
    weight: 3,
    investorClassRelevance: ALL_BUYERS,
    schema: CurrencyGbpSchema,
  },
  {
    id: 'f17',
    fieldMapKey: 'QUANT_CAP_003' satisfies QuantaraFieldMapKey,
    section: 'capital_structure',
    label: 'Shares Outstanding (fully diluted)',
    description: 'Total fully-diluted shares outstanding.',
    hint: 'Cap-table sanity: must be > 0',
    weight: 3,
    investorClassRelevance: ALL_BUYERS,
    // Cap-table sanity: positive integer.
    schema: PositiveIntSchema,
  },
  {
    id: 'f18',
    fieldMapKey: 'QUANT_CAP_004' satisfies QuantaraFieldMapKey,
    section: 'capital_structure',
    label: 'Option Pool (unallocated %)',
    description: 'Unallocated option pool as a percentage of fully-diluted shares.',
    weight: 2,
    investorClassRelevance: ALL_BUYERS,
    schema: BoundedPercentSchema,
  },

  // ═════════════════════════════════════════════════════════════════════
  // § 3 — Funding History (3 fields)
  // ═════════════════════════════════════════════════════════════════════
  {
    id: 'f19',
    fieldMapKey: 'QUANT_FND_001' satisfies QuantaraFieldMapKey,
    section: 'funding_history',
    label: 'Total Funding Raised to Date',
    description: 'Cumulative funding raised across all rounds in GBP.',
    weight: 2,
    investorClassRelevance: ALL_BUYERS,
    schema: CurrencyGbpSchema,
  },
  {
    id: 'f20',
    fieldMapKey: 'QUANT_FND_002' satisfies QuantaraFieldMapKey,
    section: 'funding_history',
    label: 'Last Round Valuation (pre-money)',
    description: 'Pre-money valuation of the most recent round in GBP.',
    weight: 3,
    investorClassRelevance: ALL_BUYERS,
    schema: CurrencyGbpSchema,
  },
  {
    id: 'f21',
    fieldMapKey: 'QUANT_FND_003' satisfies QuantaraFieldMapKey,
    section: 'funding_history',
    label: 'Last Round Type',
    description: 'Stage of the most recent funding round.',
    weight: 2,
    investorClassRelevance: ALL_BUYERS,
    schema: LastRoundTypeSchema,
  },

  // ═════════════════════════════════════════════════════════════════════
  // § 4 — Current Round (2 fields)
  // ═════════════════════════════════════════════════════════════════════
  {
    id: 'f22',
    fieldMapKey: 'QUANT_CRR_001' satisfies QuantaraFieldMapKey,
    section: 'current_round',
    label: 'Target Raise Amount',
    description: 'Capital being raised in this round in GBP.',
    weight: 3,
    investorClassRelevance: ALL_BUYERS,
    schema: CurrencyGbpSchema,
  },
  {
    id: 'f23',
    fieldMapKey: 'QUANT_CRR_002' satisfies QuantaraFieldMapKey,
    section: 'current_round',
    label: 'Target Round Type',
    description: 'Stage of the round being raised. Drives Q5 metamorphic UI.',
    weight: 3,
    investorClassRelevance: ALL_BUYERS,
    schema: TargetRoundTypeSchema,
  },

  // ═════════════════════════════════════════════════════════════════════
  // § 5 — Traction (6 fields)
  // ═════════════════════════════════════════════════════════════════════
  {
    id: 'f24',
    fieldMapKey: 'QUANT_TRC_001' satisfies QuantaraFieldMapKey,
    section: 'traction',
    label: 'Number of Paying Customers',
    description: 'Total paying customer count.',
    weight: 3,
    investorClassRelevance: ALL_BUYERS,
    schema: NonNegativeIntSchema,
  },
  {
    id: 'f25',
    fieldMapKey: 'QUANT_TRC_002' satisfies QuantaraFieldMapKey,
    section: 'traction',
    label: 'Pipeline Value',
    description: 'Total value of the qualified sales pipeline in GBP.',
    weight: 2,
    investorClassRelevance: GROWTH_AUDIENCE,
    schema: CurrencyGbpSchema,
  },
  {
    id: 'f26',
    fieldMapKey: 'QUANT_TRC_003' satisfies QuantaraFieldMapKey,
    section: 'traction',
    label: 'Monthly Active Users',
    description: 'Distinct monthly active users.',
    weight: 2,
    investorClassRelevance: ALL_BUYERS,
    schema: NonNegativeIntSchema,
  },
  {
    id: 'f27',
    fieldMapKey: 'QUANT_TRC_004' satisfies QuantaraFieldMapKey,
    section: 'traction',
    label: 'Churn Rate (monthly)',
    description: 'Monthly churn percentage.',
    weight: 3,
    investorClassRelevance: ALL_BUYERS,
    schema: BoundedPercentSchema,
  },
  {
    id: 'f28',
    fieldMapKey: 'QUANT_TRC_005' satisfies QuantaraFieldMapKey,
    section: 'traction',
    label: 'Number of Enterprise Contracts',
    description: 'Active enterprise contract count.',
    weight: 2,
    investorClassRelevance: GROWTH_AUDIENCE,
    schema: NonNegativeIntSchema,
  },
  {
    id: 'f29',
    fieldMapKey: 'QUANT_TRC_006' satisfies QuantaraFieldMapKey,
    section: 'traction',
    label: 'Average Contract Value (ACV)',
    description: 'Average annual contract value in GBP.',
    weight: 2,
    investorClassRelevance: GROWTH_AUDIENCE,
    schema: CurrencyGbpSchema,
  },

  // ═════════════════════════════════════════════════════════════════════
  // § 6 — Market (4 fields)
  // ═════════════════════════════════════════════════════════════════════
  {
    id: 'f30',
    fieldMapKey: 'QUANT_MKT_001' satisfies QuantaraFieldMapKey,
    section: 'market',
    label: 'Market Size (TAM)',
    description: 'Total Addressable Market in GBP.',
    hint: 'Total Addressable Market',
    weight: 3,
    investorClassRelevance: ALL_BUYERS,
    schema: CurrencyGbpSchema,
  },
  {
    id: 'f31',
    fieldMapKey: 'QUANT_MKT_002' satisfies QuantaraFieldMapKey,
    section: 'market',
    label: 'Serviceable Market (SAM)',
    description: 'Serviceable Available Market in GBP.',
    weight: 2,
    investorClassRelevance: ALL_BUYERS,
    schema: CurrencyGbpSchema,
  },
  {
    id: 'f32',
    fieldMapKey: 'QUANT_MKT_003' satisfies QuantaraFieldMapKey,
    section: 'market',
    label: 'Serviceable Obtainable Market (SOM)',
    description: 'Serviceable Obtainable Market in GBP.',
    weight: 2,
    investorClassRelevance: ALL_BUYERS,
    schema: CurrencyGbpSchema,
  },
  {
    id: 'f33',
    fieldMapKey: 'QUANT_MKT_004' satisfies QuantaraFieldMapKey,
    section: 'market',
    label: 'Market Growth Rate',
    description: 'Compound annual market growth rate as a percentage.',
    hint: 'CAGR 2025-2030',
    weight: 2,
    investorClassRelevance: ALL_BUYERS,
    schema: PercentSchema,
  },

  // ═════════════════════════════════════════════════════════════════════
  // § 7 — IP & Moat (6 fields)
  // ═════════════════════════════════════════════════════════════════════
  {
    id: 'f34',
    fieldMapKey: 'QUANT_IPM_001' satisfies QuantaraFieldMapKey,
    section: 'ip_moat',
    label: 'Number of Patents Filed',
    description: 'Patent applications filed (granted + pending).',
    weight: 1,
    investorClassRelevance: LATE_AND_CONTROL,
    schema: NonNegativeIntSchema,
  },
  {
    id: 'f35',
    fieldMapKey: 'QUANT_IPM_002' satisfies QuantaraFieldMapKey,
    section: 'ip_moat',
    label: 'Number of Patents Granted',
    description: 'Patents granted (must be ≤ filed; cross-field check in Q4).',
    weight: 2,
    investorClassRelevance: LATE_AND_CONTROL,
    schema: NonNegativeIntSchema,
  },
  {
    id: 'f36',
    fieldMapKey: 'QUANT_IPM_003' satisfies QuantaraFieldMapKey,
    section: 'ip_moat',
    label: 'Proprietary Dataset Size',
    description: 'Free-text description of unique data assets.',
    hint: 'Describe your unique data assets',
    weight: 1,
    investorClassRelevance: GROWTH_AUDIENCE,
    schema: ShortTextSchema,
  },
  {
    id: 'f37',
    fieldMapKey: 'QUANT_IPM_004' satisfies QuantaraFieldMapKey,
    section: 'ip_moat',
    label: 'Open Source Dependency %',
    description: 'Percentage of the codebase / stack that is open source.',
    weight: 1,
    investorClassRelevance: LATE_AND_CONTROL,
    schema: BoundedPercentSchema,
  },
  {
    id: 'f38',
    fieldMapKey: 'QUANT_IPM_005' satisfies QuantaraFieldMapKey,
    section: 'ip_moat',
    label: 'Key Regulatory Approvals',
    description: 'Comma-separated regulatory certifications and approvals.',
    hint: 'e.g. FDA, GDPR, FCA',
    weight: 2,
    investorClassRelevance: LATE_AND_CONTROL,
    schema: ShortTextSchema,
  },
  {
    id: 'f39',
    fieldMapKey: 'QUANT_IPM_006' satisfies QuantaraFieldMapKey,
    section: 'ip_moat',
    label: 'Network Effects Score (self-assessed)',
    description: 'Self-assessed network-effects strength on a 1–10 scale.',
    hint: 'How strong are your network effects?',
    weight: 2,
    investorClassRelevance: GROWTH_AUDIENCE,
    schema: Score1to10Schema,
  },

  // ═════════════════════════════════════════════════════════════════════
  // § 8 — Team (5 fields)
  // ═════════════════════════════════════════════════════════════════════
  {
    id: 'f40',
    fieldMapKey: 'QUANT_TEM_001' satisfies QuantaraFieldMapKey,
    section: 'team',
    label: 'Team Size (full-time)',
    description: 'Full-time team headcount.',
    weight: 2,
    investorClassRelevance: ALL_BUYERS,
    schema: NonNegativeIntSchema,
  },
  {
    id: 'f41',
    fieldMapKey: 'QUANT_TEM_002' satisfies QuantaraFieldMapKey,
    section: 'team',
    label: 'Technical Staff %',
    description: 'Percentage of team in engineering / product / data roles.',
    weight: 1,
    investorClassRelevance: EARLY_STAGE,
    schema: BoundedPercentSchema,
  },
  {
    id: 'f42',
    fieldMapKey: 'QUANT_TEM_003' satisfies QuantaraFieldMapKey,
    section: 'team',
    label: 'Founder Domain Experience (years)',
    description: 'Years of relevant domain experience for the lead founder.',
    weight: 3,
    investorClassRelevance: EARLY_STAGE,
    schema: NonNegativeNumberSchema,
  },
  {
    id: 'f43',
    fieldMapKey: 'QUANT_TEM_004' satisfies QuantaraFieldMapKey,
    section: 'team',
    label: 'Previous Exits (Y/N + details)',
    description: 'Founder/team prior exits with deal-size context.',
    weight: 2,
    investorClassRelevance: ALL_BUYERS,
    schema: LongTextSchema,
  },
  {
    id: 'f44',
    fieldMapKey: 'QUANT_TEM_005' satisfies QuantaraFieldMapKey,
    section: 'team',
    label: 'Key Person Dependency Risk',
    description: 'Self-assessed key-person risk on a 1–10 scale (lower is better).',
    hint: 'Lower is better (1 = no key person risk)',
    weight: 2,
    investorClassRelevance: LATE_AND_CONTROL,
    schema: Score1to10Schema,
  },

  // ═════════════════════════════════════════════════════════════════════
  // § 9 — Risk Factors (3 fields)
  // ═════════════════════════════════════════════════════════════════════
  {
    id: 'f45',
    fieldMapKey: 'QUANT_RSK_001' satisfies QuantaraFieldMapKey,
    section: 'risk',
    label: 'Revenue Concentration (top client %)',
    description: 'Revenue share from the single largest customer.',
    hint: 'Top customer revenue share',
    weight: 2,
    investorClassRelevance: ALL_BUYERS,
    schema: BoundedPercentSchema,
  },
  {
    id: 'f46',
    fieldMapKey: 'QUANT_RSK_002' satisfies QuantaraFieldMapKey,
    section: 'risk',
    label: 'Geographic Concentration',
    description: 'Free-text breakdown of revenue by geography.',
    hint: 'e.g. UK 58%, Germany 22%, US 14%',
    weight: 1,
    investorClassRelevance: LATE_AND_CONTROL,
    schema: ShortTextSchema,
  },
  {
    id: 'f47',
    fieldMapKey: 'QUANT_RSK_003' satisfies QuantaraFieldMapKey,
    section: 'risk',
    label: 'Regulatory Risk Level',
    description: 'Self-assessed regulatory exposure on a 1–10 scale.',
    hint: '1 = negligible regulatory risk, 10 = high exposure',
    weight: 2,
    investorClassRelevance: LATE_AND_CONTROL,
    schema: Score1to10Schema,
  },

  // ═════════════════════════════════════════════════════════════════════
  // § 10 — Growth Levers (4 fields)
  // ═════════════════════════════════════════════════════════════════════
  {
    id: 'f48',
    fieldMapKey: 'QUANT_GRW_001' satisfies QuantaraFieldMapKey,
    section: 'growth_levers',
    label: 'Expansion Revenue %',
    description: 'Percentage of revenue from existing customers (upsell + cross-sell).',
    hint: '% of revenue from existing customers',
    weight: 2,
    investorClassRelevance: GROWTH_AUDIENCE,
    schema: PercentSchema,
  },
  {
    id: 'f49',
    fieldMapKey: 'QUANT_GRW_002' satisfies QuantaraFieldMapKey,
    section: 'growth_levers',
    label: 'Viral Coefficient',
    description: 'K-factor: average users invited per user.',
    hint: 'K-factor (users invited per user)',
    weight: 1,
    investorClassRelevance: EARLY_STAGE,
    schema: NonNegativeNumberSchema,
  },
  {
    id: 'f50',
    fieldMapKey: 'QUANT_GRW_003' satisfies QuantaraFieldMapKey,
    section: 'growth_levers',
    label: 'Sales Cycle Length (days)',
    description: 'Average sales-cycle length in days.',
    weight: 1,
    investorClassRelevance: GROWTH_AUDIENCE,
    schema: NonNegativeIntSchema,
  },
  {
    id: 'f51',
    fieldMapKey: 'QUANT_GRW_004' satisfies QuantaraFieldMapKey,
    section: 'growth_levers',
    label: 'R&D Spend % of Revenue',
    description: 'Research & development spend as a percentage of revenue.',
    weight: 1,
    investorClassRelevance: LATE_AND_CONTROL,
    schema: PercentSchema,
  },

  // ═════════════════════════════════════════════════════════════════════
  // § 11 — Projections (4 fields)
  // ═════════════════════════════════════════════════════════════════════
  {
    id: 'f52',
    fieldMapKey: 'QUANT_PRJ_001' satisfies QuantaraFieldMapKey,
    section: 'projections',
    label: 'Projected Revenue Year+1',
    description: 'Projected revenue 12 months from now in GBP.',
    weight: 3,
    investorClassRelevance: ALL_BUYERS,
    schema: CurrencyGbpSchema,
  },
  {
    id: 'f53',
    fieldMapKey: 'QUANT_PRJ_002' satisfies QuantaraFieldMapKey,
    section: 'projections',
    label: 'Projected Revenue Year+2',
    description: 'Projected revenue 24 months from now in GBP.',
    weight: 2,
    investorClassRelevance: ALL_BUYERS,
    schema: CurrencyGbpSchema,
  },
  {
    id: 'f54',
    fieldMapKey: 'QUANT_PRJ_003' satisfies QuantaraFieldMapKey,
    section: 'projections',
    label: 'Projected Revenue Year+3',
    description: 'Projected revenue 36 months from now in GBP.',
    weight: 2,
    investorClassRelevance: ALL_BUYERS,
    schema: CurrencyGbpSchema,
  },
  {
    id: 'f55',
    fieldMapKey: 'QUANT_PRJ_004' satisfies QuantaraFieldMapKey,
    section: 'projections',
    label: 'Path to Profitability (months)',
    description: 'Months to operating profitability from today.',
    hint: 'from today',
    weight: 3,
    investorClassRelevance: GROWTH_AUDIENCE,
    schema: NonNegativeIntSchema,
  },

  // ═════════════════════════════════════════════════════════════════════
  // § 12 — Strategic (1 field)
  // ═════════════════════════════════════════════════════════════════════
  {
    id: 'f56',
    fieldMapKey: 'QUANT_STR_001' satisfies QuantaraFieldMapKey,
    section: 'strategic',
    label: 'Target Exit Timeline (years)',
    description: 'Target exit horizon in years from today.',
    hint: 'Typical targets: 4-7 years for Series A companies',
    weight: 1,
    investorClassRelevance: ALL_BUYERS,
    schema: z.number().int().min(1).max(30),
  },
];

// ── Defensive runtime invariants ────────────────────────────────────────

if (QUANTARA_FIELDS.length !== QUANTARA_FIELD_COUNT) {
  throw new Error(
    `Quantara field count drift: array has ${QUANTARA_FIELDS.length}, expected ${QUANTARA_FIELD_COUNT}. ` +
      'Update QUANTARA_FIELDS or QUANTARA_FIELD_COUNT to keep them aligned.',
  );
}

// ── Lookup tables ──────────────────────────────────────────────────────

/** Lookup a field definition by `QuantaraFieldId`. */
export const QUANTARA_FIELDS_BY_ID: Readonly<
  Record<QuantaraFieldId, QuantaraFieldDefinition>
> = Object.freeze(
  Object.fromEntries(
    QUANTARA_FIELDS.map((f) => [f.id, f] as const),
  ) as Record<QuantaraFieldId, QuantaraFieldDefinition>,
);

/** Lookup a field definition by its immutable `fieldMapKey`. */
export const QUANTARA_FIELDS_BY_KEY: Readonly<
  Record<QuantaraFieldMapKey, QuantaraFieldDefinition>
> = Object.freeze(
  Object.fromEntries(
    QUANTARA_FIELDS.map((f) => [f.fieldMapKey, f] as const),
  ) as Record<QuantaraFieldMapKey, QuantaraFieldDefinition>,
);

// ── Composite payload schema ───────────────────────────────────────────

/**
 * Composite Zod schema validating an entire `QuantaraValues` payload.
 * Every field is `.optional()` because partial completion is a
 * first-class state — Q3 auto-fill, Q4 cascade, and Q7 voice capture all
 * write subsets.
 *
 * Use `.parse(input)` / `.safeParse(input)` to validate at API
 * boundaries. Cross-field invariants (e.g. patentsGranted ≤ patentsFiled)
 * are intentionally not enforced here; those land in Q4 (validation
 * cascade) where they can be surfaced as discrepancy chips with source
 * attribution.
 */
export const QuantaraValuesSchema = z.object(
  Object.fromEntries(
    QUANTARA_FIELDS.map(
      (f) => [f.id, f.schema.optional()] as const,
    ),
  ) as Record<QuantaraFieldId, z.ZodOptional<z.ZodType>>,
);

/** Inferred type — same shape as `QuantaraValues` but parsed/typed. */
export type QuantaraValuesParsed = z.infer<typeof QuantaraValuesSchema>;
